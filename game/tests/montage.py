"""Banc Chromium du vrai moteur : montage à blanc et stand A/B.
Les images seulement sont remplacées par un pixel pour les matrices rapides.
"""
from pathlib import Path
import os,re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',(R/'JOUER_DERNIERE_LIGNE.html').read_text())
checks=[];errors=[];cases=[]
def ck(n,v,d=None):
 checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def page(b,w=1440,h=900,prod=False):
 p=b.new_page(viewport={'width':w,'height':h});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(light,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(100)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false})')
 return p
def setup(p,unlocked=True):
 p.evaluate("""()=>{__DL.startNew('campaign');const r=__DL.readState().run;for(const w of __DL.getDefs().WEAPONS)r.weapons[w.id]={mag:w.mag,reserve:100,level:1};r.cash=30000;r.loadout=['pump','rifle'];r.activeId='pump';DL36Gunsmith.ensure().selected='pump';__DL.setTab('workshop');}""")
 if unlocked:p.evaluate("""()=>{const wm={};for(const w of __DL.getDefs().WEAPONS)wm[w.id]={kills:2000,headshots:500,damage:100000};__DL.setMeta({xp:999999,weaponMastery:wm});__DL.setTab('workshop');}""")
def stamp(p):return p.evaluate('JSON.stringify({data:__DL.getData(),run:__DL.readState().run})')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=page(b);setup(p)
 ck('Version 0.40.5 chargée',p.evaluate('__DL.dl405.version')=='0.40.5')
 ck('Commande dans le vrai Armurier',p.locator('#dl405-open').count()==1)
 before=stamp(p);p.locator('#dl405-open').click()
 ck('Fenêtre native avec 8 emplacements',p.evaluate('__DL.snapshot().phase')=='workshopDraft' and p.locator('[data-d5-slot]').count()==8)
 ck('Ouverture ne modifie ni profil ni inventaire',stamp(p)==before)
 p.locator('[data-d5-part="optic_reflex"]').click()
 ck('Prévisualisation de pièce sans montage',stamp(p)==before and p.evaluate('__DL.dl405.state().draft.cfg.active.optic')=='optic_reflex')
 p.locator('[data-d5-mode="kits"]').click();p.locator('[data-d5-kit="kit2_shot_slug"]').click()
 ck('Conversion prévisualisée sans changer la vraie gerbe',stamp(p)==before and p.evaluate('__DL.getDefs().WEAPONS.find(w=>w.id==="pump").pellets')>1)
 ck('Le comparateur montre le projectile unique prévu',p.evaluate('__DL.dl405.info().metrics.projectiles')==1 and p.locator('.dl405-compare tbody tr').count()==12)
 p.evaluate('__DL.dl405.tune("optic_reflex",60)')
 ck('Réglage isolé',stamp(p)==before and p.evaluate('__DL.dl405.state().draft.cfg.tuning.optic_reflex')==60)
 p.locator('[data-d5-mode="presets"]').click()
 ck('Six presets consultables, aucun emplacement écrasé',p.locator('[data-d5-preset]').count()==6 and stamp(p)==before)
 p.locator('#dl405-discard').click();p.wait_for_timeout(30)
 ck('Annulation restitue l’Armurier sans effet',p.evaluate('__DL.snapshot().phase')=='camp' and stamp(p)==before)
 # Apply one proposed plan; it must keep personal ammo total and all preset slots.
 p.locator('#dl405-open').click();p.locator('[data-d5-mode="plans"]').click()
 first=p.locator('[data-d5-plan]').first
 ck('Trois plans natifs proposés',p.locator('[data-d5-plan]').count()==3)
 first.click();d=p.evaluate('__DL.dl405.state().draft.cfg')
 ck('Plan comparé sans mutation',stamp(p)==before and len(d['active'])==5)
 ammo=p.evaluate('({...__DL.getAmmo("pump")})');pres=p.evaluate('JSON.stringify(DL36Gunsmith.config("pump").presets)')
 p.locator('#dl405-apply').click();p.wait_for_timeout(30)
 after=p.evaluate('({ammo:__DL.getAmmo("pump"),cfg:DL36Gunsmith.config("pump"),phase:__DL.snapshot().phase})')
 ck('Validation applique le montage complet au camp',after['phase']=='camp' and after['cfg']['active']==d['active'] and after['cfg']['conversion']==d['conversion'])
 ck('Validation conserve le total de cartouches',after['ammo']['mag']+after['ammo']['reserve']==ammo['mag']+ammo['reserve'])
 ck('Validation ne remplace aucun preset',p.evaluate('JSON.stringify(DL36Gunsmith.config("pump").presets)')==pres)
 ck('Profil monté exportable et validé',p.evaluate('()=>{try{return !!__DL.validateSave(JSON.parse(__DL.exportText()))}catch(e){return String(e)}}') is True)
 # Six-part limit and stale-config guard.
 p.locator('#dl405-open').click();info=p.evaluate('__DL.dl405.info()');slot=next(s for s in ['muzzle','barrel','optic','underbarrel','stock','magazine','grip','ammo'] if s not in info['cfg']['active'])
 p.locator(f'[data-d5-slot="{slot}"]').click();candidate=p.locator('[data-d5-part]').first.get_attribute('data-d5-part')
 ck('Sixième pièce réellement refusée',p.evaluate('(id)=>__DL.dl405.part(id)',candidate) is False and len(p.evaluate('__DL.dl405.state().draft.cfg.active'))==5)
 # Simulate a real conflicting change via the active config to exercise identity checks, not substitute a fake engine.
 p.evaluate('delete DL36Gunsmith.config("pump").active.optic;')
 ck('Montage modifié ailleurs : commit refusé',p.evaluate('__DL.dl405.apply()') is False)
 p.evaluate('__DL.dl405.close()');p.close()
 # Low mastery previews are allowed, but neither commit nor the sandbox can unlock them.
 p=page(b);setup(p,False);original=stamp(p);p.locator('#dl405-open').click();p.evaluate('__DL.dl405.kit("kit2_shot_slug")')
 ck('Comparaison verrouillée disponible sans débloquer',p.evaluate('__DL.dl405.info().valid') and not p.evaluate('__DL.dl405.info().ready') and stamp(p)==original)
 ck('Essai B et application verrouillés',p.locator('#dl405-apply').is_disabled() and p.locator('#dl405-try-b').is_disabled() and p.evaluate('__DL.dl405.try("b")') is False and p.evaluate('__DL.dl405.apply()') is False)
 ck('Échec des actions verrouillées conserve le profil',stamp(p)==original)
 p.evaluate('__DL.dl405.close()');p.close()
 # Actual practice A/B, launcher, progressive loaders, cable/foam and every perspective.
 for wid,kit in [('pump','kit2_shot_slug'),('launcher','kit2_launcher_focus'),('flamer','kit2_tool_long'),('netgun','kit2_cable_fast'),('revolver','kit2_hand_heavy')]:
  for view in ['right','left','front','rear']:
   p=page(b);setup(p);p.evaluate('(w)=>{DL36Gunsmith.ensure().selected=w;__DL.readState().run.activeId=w;__DL.readState().run.loadout=[w,"pistol"];DL36Gunsmith.reset();__DL.setTab("workshop");}',wid)
   original=stamp(p);p.locator('#dl405-open').click();p.evaluate('(k)=>__DL.dl405.kit(k)',kit)
   modes=[]
   for mode in ['a','b']:
    ok=p.evaluate('(m)=>__DL.dl405.try(m)',mode)
    cfg={'gun':wid,'enemy':'walker','view':view,'distance':'near','motion':'still','group':1}
    begun=p.evaluate('(c)=>__DL.beginPractice(c)',cfg)
    row=p.evaluate("""()=>{__DL.stopLoop();const st=__DL.readState(),id=st.run.activeId,z=st.enemies.find(z=>!z.dead);z.hp=z.maxHp=100000;z.x=910;z.lane=0;z.feet=494;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});__DL.setBallisticSeed(42);const ammo=__DL.getAmmo(id).mag,hp=z.hp;__DL.fire();__DL.advance(.8);return {phase:st.phase,kit:DL36Gunsmith.config(id).conversion,spent:ammo-__DL.getAmmo(id).mag,damage:hp-z.hp,level:st.run.weapons[id].level,projectiles:__DL.getDefs().WEAPONS.find(w=>w.id===id).pellets||1,snapshot:__DL.practiceSnapshot()};}""")
    p.evaluate('__DL.leavePractice()');p.wait_for_timeout(20)
    modes.append({**row,'mode':mode,'begun':begun,'opened':ok,'back':p.evaluate('__DL.snapshot().phase')=='workshopDraft','noMutation':stamp(p)==original})
   case={'weapon':wid,'view':view,'modes':modes};cases.append(case)
   ck(wid+' A/B réel · '+view,all(r['opened'] and r['begun'] and r['back'] and r['noMutation'] and r['spent']==1 and r['level']==1 for r in modes) and modes[0]['kit'] is None and modes[1]['kit']==kit,case)
   ck(wid+' deux bilans reliés aux bons montages · '+view,set(p.evaluate('__DL.dl405.state().draft.results').keys())=={'a','b'})
   p.evaluate('__DL.dl405.close()');ck(wid+' fermeture après A/B sans mutation · '+view,stamp(p)==original)
   p.close()
 # No draft shortcuts / panel in the production menu; actual click entry point.
 p=page(b,prod=True);ck('Production sans __DL',p.evaluate('typeof __DL')=='undefined')
 p.locator('[data-page="campaigns"]').click();p.locator('#newCampaign').click();p.wait_for_timeout(40)
 skip=p.get_by_role('button',name='COMMENCER SANS FORMATION',exact=True)
 if skip.is_visible():skip.click()
 p.locator('[data-campgroup="equipment"]').click();p.locator('[data-tab="workshop"]').click();p.locator('#dl405-open').click()
 ck('Production : montage à blanc par commandes réelles',p.locator('.dl405-layout').is_visible())
 p.keyboard.press('Escape');ck('Échap retrouve l’Armurier',p.locator('#dl405-open').is_visible())
 p.close()
 for w,h in [(1440,900),(896,414),(414,896)]:
  p=page(b,w,h);setup(p);p.locator('#dl405-open').click()
  for mode in ['parts','kits','plans','presets']:
   p.locator('[data-d5-mode="'+mode+'"]').click();sizes=p.evaluate('(()=>{const d=document.getElementById("dialogBody"),g=document.querySelector(".dl405-layout");return {vw:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth,dw:d.clientWidth,ds:d.scrollWidth,gw:g.clientWidth,gs:g.scrollWidth}})()')
   ck(f'Montage {mode} sans débordement à {w}×{h}',sizes['sw']<=sizes['vw']+2 and sizes['bw']<=sizes['vw']+2 and sizes['ds']<=sizes['dw']+2 and sizes['gs']<=sizes['gw']+2,sizes)
  p.close()
 b.close()
ck('Aucune erreur JavaScript',not errors,errors)
report={'version':'0.40.5','passed':sum(c['ok'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'actualPracticeCases':cases,'method':'Chromium. Moteur réel, images réduites à un pixel dans la matrice. Les cibles sont arrangées ; aucun résultat de playtest humain revendiqué.'}
(R/'rapports/MONTAGE_QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'total':report['total'],'errors':errors},ensure_ascii=False));sys.exit(0 if report['passed']==report['total'] else 1)
