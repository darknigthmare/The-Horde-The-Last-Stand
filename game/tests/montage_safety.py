from pathlib import Path
import re,json,sys,os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',(R/'JOUER_DERNIERE_LIGNE.html').read_text())
checks=[];err=[]
def ck(n,v,d=None):checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def stamp(p):return p.evaluate('JSON.stringify({data:__DL.getData(),run:__DL.readState().run})')
def load(b):
 p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(6000);p.on('pageerror',lambda e:err.append(str(e)));p.goto('about:blank?test=1');p.set_content(light,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(70);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false})')
 p.evaluate("""()=>{__DL.startNew('campaign');const r=__DL.readState().run,wm={};for(const w of __DL.getDefs().WEAPONS){r.weapons[w.id]={mag:w.mag,reserve:600,level:2};wm[w.id]={kills:2000,headshots:500,damage:100000};}__DL.setMeta({xp:999999,weaponMastery:wm,doctrines:{marksman:3,loader:2}});r.loadout=['rifle','pump'];r.activeId='rifle';DL36Gunsmith.ensure().selected='rifle';__DL.setTab('workshop');}""");return p
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);p=load(b)
 # Do not mutate profile while inspecting all native configurations and conversions.
 before=stamp(p)
 rows=p.evaluate("""()=>{const G=DL36Gunsmith,W=__DL.getDefs().WEAPONS,rows=[];for(const w of W){const cfg=G.config(w.id,false);for(const c of [null,...G.atelier.catalog.conversions.filter(c=>G.atelier.conversionAllowed(w.id,c))]){const proposal={active:{},tuning:{},conversion:c?.id||null};const i=G.workbench.inspect(w.id,proposal);rows.push({id:w.id,kit:c?.id||null,ready:i.valid&&i.ready,finite:Object.values(i.metrics).filter(v=>typeof v==='number').every(Number.isFinite)});}}return rows;}""")
 ck('135 inspections sans changement de profil ou stock',len(rows)==135 and all(x['ready'] and x['finite'] for x in rows) and stamp(p)==before,rows)
 invalid=p.evaluate("""()=>{const B=DL36Gunsmith.workbench;return [B.inspect('unknown',{active:{},tuning:{}}),B.inspect('rifle',{active:{optic:'not_a_part'},tuning:{}}),B.inspect('rifle',{active:{optic:'optic_reflex'},tuning:{optic_reflex:Infinity}}),B.inspect('rifle',{active:{},tuning:{optic_reflex:40}}),B.inspect('rifle',{active:{},conversion:'kit2_tool_long'})].map(i=>i.valid);} """)
 ck('Identifiants, compatibilités et réglages invalides refusés',invalid==[False]*5,invalid)
 # UI focus remains on the actual clicked piece after DOM replacement.
 p.locator('#dl405-open').click();p.locator('[data-d5-part="optic_reflex"]').click();p.wait_for_timeout(20)
 ck('Focus conservé sur la pièce simulée',p.evaluate('document.activeElement?.dataset.d5Part')=='optic_reflex')
 p.locator('#dl405-tuning').focus();p.evaluate('__DL.dl404.resetPad();__DL.dl404.padMenu(Array.from({length:16},(_,i)=>i===15),[0,0],900)');p.wait_for_timeout(20)
 ck('Croix droite manette règle la simulation et conserve le focus',p.locator('#dl405-tuning').input_value()=='5' and p.evaluate('document.activeElement.id')=='dl405-tuning')
 # Cancel before launching the practice clone.
 orig=stamp(p);p.locator('#dl405-try-b').click();p.locator('#practiceLeave').click()
 ck('Retour depuis préparation du stand sans essai',p.evaluate('__DL.snapshot().phase')=='workshopDraft' and stamp(p)==orig)
 # Real sample has the same selected upgrades/doctrines as the armory comparison.
 p.evaluate('__DL.dl405.try("b")');p.evaluate('__DL.beginPractice({gun:"rifle",enemy:"walker",view:"front",distance:"near",motion:"still",group:1});__DL.stopLoop()')
 info=p.evaluate("""()=>{const z=__DL.readState().enemies.find(x=>!x.dead);z.hp=z.maxHp=50000;z.x=950;z.lane=0;z.feet=494;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});__DL.setBallisticSeed(49);const hp=z.hp;__DL.fire();return {damage:hp-z.hp,expected:__DL.dl405.info().metrics.impact,level:__DL.readState().run.weapons.rifle.level,doctrine:__DL.getData().meta.doctrines};}""")
 ck('Tir au stand cohérent avec amélioration et doctrine sélectionnées',abs(info['damage']-info['expected'])<.0001 and info['level']==2 and info['doctrine']=={'marksman':3,'loader':2},info)
 # Pause and configure/restart the real practice.
 p.evaluate('__DL.pause()');seconds=p.evaluate('__DL.practiceSnapshot().seconds');p.evaluate('__DL.advance(2)')
 ck('Pause de l’essai fige la simulation',p.evaluate('__DL.practiceSnapshot().seconds')==seconds)
 p.locator('#practiceChange').click();ck('Arme non substituable dans un essai A/B',p.locator('#practiceGun').is_disabled() and p.locator('#practiceGun').input_value()=='rifle')
 p.locator('#practiceBegin').click();p.evaluate('__DL.stopLoop();__DL.endRun(false)')
 ck('Défaite au stand ouvre son vrai bilan',p.evaluate('__DL.snapshot().phase')=='practiceEnd')
 p.locator('#practiceLeave').click();ck('Défaite puis retour ne touche pas la campagne',p.evaluate('__DL.snapshot().phase')=='workshopDraft' and stamp(p)==orig)
 p.evaluate('__DL.dl405.close()');p.close()
 # Reserve saturation: shrinking a magazine must be refused, not lose ammunition.
 p=load(b);p.evaluate('DL36Gunsmith.ensure().selected="rifle";DL36Gunsmith.reset();__DL.getAmmo("rifle").mag=weaponCap=__DL.getDefs().WEAPONS.find(w=>w.id==="rifle").mag;__DL.getAmmo("rifle").reserve=10000000;__DL.setTab("workshop")')
 orig=stamp(p);p.locator('#dl405-open').click();p.evaluate('__DL.dl405.part("at2_mag_low")') if p.evaluate('DL36Gunsmith.attachments.some(a=>a.id==="at2_mag_low")') else None
 # Discover a legal native part that actually lowers capacity, not a fabricated fixture.
 candidate=p.evaluate("""()=>{const G=DL36Gunsmith,m=G.atelier.metrics('rifle').magazine;return G.workbench.parts('rifle').find(a=>G.workbench.inspect('rifle',{active:{[a.slot]:a.id},tuning:{},conversion:null}).metrics.magazine<m)?.id||null;}""")
 ck('Cas de chargeur réduit existant dans le catalogue',candidate is not None,candidate)
 if candidate:
  p.evaluate('(a)=>__DL.dl405.part(a)',candidate)
  info=p.evaluate('__DL.dl405.info()')
  ck('Réserve pleine : application bloquée plutôt que stock perdu',info['stockSafe']==False and p.locator('#dl405-apply').is_disabled() and p.evaluate('__DL.dl405.apply()')==False and stamp(p)==orig,info['stockWarning'])
 p.evaluate('__DL.dl405.close()');p.close()
 # Origin snapshot change cancels commit, changing global menu cannot leave a phantom draft.
 p=load(b);p.locator('#dl405-open').click();p.evaluate('__DL.dl405.part("optic_reflex");__DL.dl405.try("b")');p.evaluate('__DL.showMenu()')
 ck('Retour au menu nettoie les essais et le montage temporaire',p.evaluate('__DL.dl405.state().draft') is None and p.evaluate('__DL.dl405.state().trial') is None and p.locator('.dl405-layout:visible').count()==0)
 p.close()
 # Campaign radio must not leak into the real stand, while legitimate practice warnings still work.
 p=load(b);orig=stamp(p);p.evaluate('__DL.showPractice("rifle");__DL.beginPractice({gun:"rifle",enemy:"walker",view:"front",distance:"near",motion:"still",group:3});__DL.stopLoop();__DL.advance(.2)')
 radio=p.evaluate('({progress:__DL.readState().wave.v18StoryCues?.progress||0,text:document.getElementById("toastStack").innerText})')
 ck('Le stand ne diffuse pas les transmissions de la campagne',radio['progress']==0 and not any(x in radio['text'] for x in ['Le convoi roule','prochain groupe','balise derrière']),radio)
 p.evaluate('__DL.spawnPracticeGroup();__DL.spawnPracticeGroup()');p.wait_for_timeout(25)
 ck('Les avertissements utiles du stand restent présents',p.locator('#toastStack [data-practice="1"]').count()>=1 and 'Dégagez la cour' in p.locator('#toastStack').inner_text())
 p.evaluate('__DL.leavePractice()');p.wait_for_timeout(20)
 ck('Les notifications temporaires du stand ne recouvrent pas le retour',p.locator('#toastStack [data-practice="1"]').count()==0 and 'Dégagez la cour' not in p.locator('#toastStack').inner_text() and stamp(p)==orig)
 p.evaluate('__DL.start();__DL.stopLoop();__DL.spawn("walker");__DL.readState().wave.spawned=__DL.readState().wave.total;__DL.advance(.1)')
 radio=p.evaluate('({phase:__DL.snapshot().phase,progress:__DL.readState().wave.v18StoryCues?.progress||0,text:document.getElementById("toastStack").innerText})')
 ck('Les transmissions du convoi restent actives en mission',radio['phase']=='combat' and radio['progress']>0,radio)
 p.close();b.close()
ck('Aucune erreur JavaScript',not err,err)
r={'version':'0.40.5','passed':sum(c['ok'] for c in checks),'total':len(checks),'checks':checks,'errors':err}
(R/'rapports/MONTAGE_SAFETY_QA.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps({'passed':r['passed'],'total':r['total'],'errors':err},ensure_ascii=False));sys.exit(0 if r['passed']==r['total'] else 1)
