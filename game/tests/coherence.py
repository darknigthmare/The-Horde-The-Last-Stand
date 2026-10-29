from pathlib import Path
import re,json,sys,os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
text=(R/'JOUER_DERNIERE_LIGNE.html').read_text();light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',text)
checks=[];errs=[]
def ck(n,v,d=None):checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def load(b,w=1440,h=900,prod=False):
 p=b.new_page(viewport={'width':w,'height':h});p.set_default_timeout(5000);p.on('pageerror',lambda e:errs.append(str(e)));p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(light,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(80)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false})')
 return p
def setup(p):
 p.evaluate("""()=>{__DL.startNew('campaign');let r=__DL.readState().run,wm={};for(const w of __DL.getDefs().WEAPONS){r.weapons[w.id]={mag:w.mag,reserve:600,level:0};wm[w.id]={kills:1000,headshots:250,damage:100000};}__DL.setMeta({xp:999999,weaponMastery:wm});r.loadout=['sniper','pump'];r.activeId='sniper';r.cash=99999;DL36Gunsmith.ensure().selected='sniper';__DL.setTab('workshop');}""")
def practice(p,w,kit,view='front',enemy='walker'):
 p.evaluate('(a)=>{DL36Gunsmith.ensure().selected=a.w;DL36Gunsmith.reset();if(a.kit)DL36Gunsmith.atelier.setConversion(a.kit);__DL.showPractice(a.w);__DL.beginPractice({gun:a.w,enemy:a.enemy,view:a.view,distance:"near",motion:"still",group:1});__DL.stopLoop();}',dict(w=w,kit=kit,view=view,enemy=enemy))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=load(b);setup(p)
 # Standard armor damage before/after, in all four views with the same canonical target.
 for v in ['right','left','front','rear']:
  vals=[]
  for kit in [None,'kit2_precision_ap']:
   practice(p,'sniper',kit,v,'armored')
   row=p.evaluate("""()=>{const z=__DL.readState().enemies.find(z=>!z.dead);z.hp=z.maxHp=100000;z.x=920;z.feet=494;z.lane=0;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});__DL.setBallisticSeed(84);const hp=z.hp;__DL.fire();const m=DL36Gunsmith.atelier.metrics('sniper');return {damage:hp-z.hp,impact:m.impact,ap:m.armorPiercing};}""");vals.append(row);p.evaluate('__DL.leavePractice()')
  ck('Armure standard réellement percée — '+v,abs(vals[0]['damage']-vals[0]['impact']*.43)<1e-4 and abs(vals[1]['damage']-vals[1]['impact'])<1e-4,vals)
 # Flamethrower reach at a target just outside the original 460 unit cone.
 vals=[]
 for kit in [None,'kit2_tool_long']:
  practice(p,'flamer',kit,'front')
  row=p.evaluate("""()=>{const z=__DL.readState().enemies.find(z=>!z.dead);z.hp=z.maxHp=100000;z.x=640;z.feet=494;z.lane=0;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});const hp=z.hp;__DL.fire();return {damage:hp-z.hp,range:__DL.getDefs().WEAPONS.find(w=>w.id==='flamer').range};}""");vals.append(row);p.evaluate('__DL.leavePractice()')
 ck('Buse longue : le cône atteint réellement une cible au-delà de 460',vals[0]['damage']==0 and vals[1]['damage']>0 and vals[1]['range']>vals[0]['range'],vals)
 # Both native control payloads remain operational after their kit changes.
 for wid,kit in [('netgun','kit2_cable_fast'),('foamgun','kit2_tool_tank')]:
  practice(p,wid,kit)
  r=p.evaluate("""()=>{const st=__DL.readState(),z=st.enemies.find(e=>!e.dead);z.hp=z.maxHp=10000;z.x=900;z.lane=0;z.feet=494;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});__DL.fire();const pr=__DL.getEffects().projectiles.at(-1);__DL.advance(.5);return {payload:pr?.payload,damage:10000-z.hp,stun:z.stun||0,slow:__DL.enemyStatusSlow(z),effects:__DL.getEffects()};}""")
  if wid=='netgun':ck('Lance-filets : immobilisation native conservée',r['payload']=='net' and r['stun']>0,r)
  else:ck('Mousse : ralentissement sans dégâts conservé',r['payload']=='foam' and r['damage']==0 and r['slow']<1,r)
  p.evaluate('__DL.leavePractice()')
 # Scene game (not stand): delayed launcher projectile credits its owner after switching to pistol.
 p.evaluate("DL36Gunsmith.ensure().selected='launcher';DL36Gunsmith.reset();DL36Gunsmith.atelier.setConversion('kit2_launcher_focus');__DL.readState().run.loadout=['launcher','sniper'];__DL.readState().run.activeId='launcher';__DL.start();__DL.stopLoop();__DL.clearEnemies();__DL.v37EnsureMetrics()")
 expected=p.evaluate("DL37FieldLab.snapshot('launcher')")
 r=p.evaluate("""()=>{const z=__DL.spawn('walker');z.x=900;z.lane=0;z.feet=494;z.hp=30;z.maxHp=30;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});const master=__DL.getData().meta.weaponMastery.launcher.kills;__DL.fire();const pr=__DL.getEffects().projectiles.at(-1);document.getElementById('pistolBtn').click();__DL.advance(.6);return {active:__DL.readState().run.activeId,projectile:pr,metrics:__DL.getV21Metrics().byWeapon,masterDelta:__DL.getData().meta.weaponMastery.launcher.kills-master};}""")
 ck('Explosion attribuée au lanceur après changement d’arme',r['active']=='pistol' and r['metrics'].get('launcher',{}).get('kills')==1 and r['masterDelta']==1,r)
 ck('Le pistolet ne reçoit pas le crédit de l’explosion',r['metrics'].get('pistol',{}).get('damage',0)==0,r['metrics'])
 p.evaluate('__DL.completeWave()')
 s=p.evaluate('__DL.getData().meta.v21Playtests.at(-1)')
 ck('Rapport après action contient la conversion utilisée',s.get('builds',{}).get('launcher',{}).get('conversion')=='kit2_launcher_focus',s.get('builds'))
 ck('Signature de mission identique au montage initial',s.get('builds',{}).get('launcher',{}).get('hash')==expected['hash'])
 saved=p.evaluate('JSON.parse(__DL.exportText())');valid=p.evaluate('(x)=>__DL.validateSave(x)',saved)
 ck('La conversion survit à la validation des rapports',valid['meta']['v21Playtests'][-1].get('builds',{}).get('launcher',{}).get('conversion')=='kit2_launcher_focus')
 # All preset comparisons, not just reload, must include the new mechanism.
 p.evaluate("DL36Gunsmith.ensure().selected='pump';DL36Gunsmith.reset();DL36Gunsmith.atelier.setConversion('kit2_shot_slug');DL36Gunsmith.savePreset(5)")
 pc=p.evaluate("({now:DL37FieldLab.snapshot('pump'),preset:DL37FieldLab.presetSnapshot('pump',5)})")
 ck('Comparateur de presets inclut le mécanisme',pc['now']['hash']==pc['preset']['hash'] and pc['preset']['conversion']=='kit2_shot_slug',pc)
 # Legacy JSON with no conversion fields: preserves configurations, no free kit.
 old=json.loads(json.dumps(saved))
 for cfg in old['meta']['gunsmithV36']['weapons'].values():
  cfg.pop('conversion',None)
  for pre in cfg.get('presets',[]):
   if pre:pre.pop('conversion',None)
 out=p.evaluate('(x)=>__DL.validateSave(x)',old)
 ck('Profil antérieur sans conversions accepté sans cadeau',all(x.get('conversion') is None for x in out['meta']['gunsmithV36']['weapons'].values()))
 # Native quick handling improvements are not hidden by the historical .18-second floor.
 p.evaluate("DL36Gunsmith.ensure().selected='assault';DL36Gunsmith.reset();DL36Gunsmith.atelier.setConversion('kit2_rifle_short');__DL.readState().run.loadout=['assault','sniper'];__DL.readState().run.activeId='sniper';__DL.start();__DL.stopLoop()")
 p.locator('#slot1Btn').click()
 cool=p.evaluate('({cd:__DL.dl402.timers().cooldown,rate:DL36Gunsmith.aggregate("assault").switch,active:__DL.readState().run.activeId})')
 ck('Transition rapide effectivement inférieure à 0,18 s',cool['active']=='assault' and cool['cd'] is not None and cool['cd']<.18 and abs(cool['cd']-.18/cool['rate'])<1e-6,cool)
 p.close()
 # Actual native production UI, no test API.
 p=load(b,prod=True)
 ck('Production sans API de test',p.evaluate('typeof __DL')=='undefined')
 p.locator('[data-page="campaigns"]').click();p.locator('#newCampaign').click();p.wait_for_timeout(50)
 if p.get_by_role('button',name='COMMENCER SANS FORMATION',exact=True).is_visible():p.get_by_role('button',name='COMMENCER SANS FORMATION',exact=True).click()
 p.locator('[data-campgroup="equipment"]').click();p.locator('[data-tab="workshop"]').click();p.locator('[data-v37-view="kits"]').click()
 ck('Conversions accessibles avec la souris en production',p.locator('.at2-kit').count()==2)
 p.locator('[data-at2-preview]').first.click()
 ck('Comparaison accessible sans déblocage ni API de test',p.locator('.at2-comparison').count()==1 and p.locator('[data-at2-kit]:not([disabled])').count()==0)
 p.close()
 for width,height in [(1440,900),(896,414),(414,896)]:
  p=load(b,width,height);setup(p)
  for view,sel,n in [('build','.v36-part',None),('kits','.at2-kit',2),('plans','.at2-plan',3),('presets','.v37-preset-card',6)]:
   p.locator(f'[data-v37-view="{view}"]').click();p.wait_for_timeout(35)
   size=p.evaluate('({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
   ck(f'{view} utilisable à {width}×{height}',size['scroll']<=size['w']+2 and (n is None or p.locator(sel).count()==n),size)
  p.close()
 b.close()
ck('Aucune erreur JavaScript dans cette passe',not errs,errs)
r={'version':'0.40.4','passed':sum(c['ok'] for c in checks),'total':len(checks),'checks':checks,'errors':errs}
(R/'rapports/COHERENCE_QA.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
print(json.dumps({'passed':r['passed'],'total':r['total'],'errors':errs},ensure_ascii=False));sys.exit(0 if r['passed']==r['total'] else 1)
