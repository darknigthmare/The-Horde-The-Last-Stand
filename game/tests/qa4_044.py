from pathlib import Path
import re,json,sys,math
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
tiny='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',tiny,html)
rows=[];errors=[]
def ck(tester,name,ok,detail=None):
 rows.append({'tester':tester,'test':name,'ok':bool(ok),'detail':detail}); print(('OK ' if ok else 'FAIL ')+f'[{tester}] '+name,flush=True)
def page(browser,w=1440,h=900):
 p=browser.new_page(viewport={'width':w,'height':h});p.set_default_timeout(3500);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank?test=1');p.set_content(light,wait_until='domcontentloaded',timeout=15000);p.wait_for_timeout(100);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,reducedFlashes:true})');return p
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 # QA1 — fonctionnel / campagnes / simulation
 p=page(b); routes=[('Campagne','__DL.startNew("campaign")','campaign'),('Nord','__DL.startNorth()','north'),('Métro','__DL.startMetro()','metro'),('ARGO-17','__DL.startAir()','air'),('Autoroute','__DL.startHighway()','highway'),('Eaux Noires','__DL.startWater()','water'),('Ascension','__DL.startTower()','tower'),('Zone Noire','__DL.startDark()','dark')]
 for label,fn,mode in routes:
  d=p.evaluate('''({fn,mode})=>{try{__DL.showMenu();eval(fn);__DL.start();__DL.stopLoop();__DL.setScreenAim(720,430);for(let i=0;i<36&&__DL.snapshot().phase==='combat';i++){__DL.advance(.12);if(i%3===0)__DL.fire();if(i%11===0)__DL.reload();if(i%17===0)__DL.grenade();if(i%19===0)__DL.rotatePriority();}const s=__DL.snapshot(),bad=[];const finite=v=>Number.isFinite(Number(v));for(const k of ['cash','health','wall','wallMax'])if(!finite(s.run?.[k]))bad.push(k);for(const [id,a] of Object.entries(s.run?.weapons||{}))if(!finite(a.mag)||!finite(a.reserve)||a.mag<0||a.reserve<0)bad.push(id+' ammo');if((s.run?.inventory||[]).some(x=>!finite(x)||x<0))bad.push('inventaire');return{ok:s.phase==='combat'&&s.run?.mode===mode&&!bad.length,bad,phase:s.phase,mode:s.run?.mode,enemies:s.enemies?.length||0};}catch(e){return{ok:false,error:String(e)}}}''',{'fn':fn,'mode':mode})
  ck('QA1 FONCTIONNEL',label+' démarre et reste cohérent',d['ok'],d)
 p.close()
 # QA2 — UX/menu/camp/dialogues
 p=page(b);ck('QA2 UX','Titre et couche QA 0.44',p.title().endswith('0.44.0') and p.evaluate('DL44UI.version')=='0.44.0')
 p.locator('[data-page="options"]').click(); about=p.locator('#aboutGame');ck('QA2 UX','À propos reste en 0.44 après navigation',about.inner_text().strip()=='À PROPOS · 0.44.0',about.inner_text())
 about.click();ck('QA2 UX','À propos affiche la build actuelle','0.44.0' in p.locator('#dialogBody').inner_text());p.keyboard.press('Escape');p.wait_for_timeout(30);ck('QA2 UX','Échap ferme À propos',p.locator('#menuScreen').is_visible() and p.evaluate('__DL.snapshot().phase')=='menu')
 p.evaluate('__DL.startNew("campaign")');ck('QA2 UX','Camp en lecture essentielle',not p.locator('#shopBody .dl43-deep').first.is_visible() if p.locator('#shopBody .dl43-deep').count() else True)
 p.locator('#dl43DetailsBtn').click();ck('QA2 UX','Détails réouvrables',p.locator('#shell').get_attribute('class').find('dl43-details-open')>=0)
 p.locator('#dl43IntelBtn').click();ck('QA2 UX','Renseignements en tiroir',p.locator('#intelPanel').get_attribute('aria-hidden')=='false');p.keyboard.press('Escape');ck('QA2 UX','Échap ferme seulement le tiroir',p.locator('#intelPanel').get_attribute('aria-hidden')=='true' and p.evaluate('__DL.snapshot().phase')=='camp');p.close()
 # QA3 — combat/HUD/spatial/accessibilité
 p=page(b);p.evaluate('__DL.startNew("campaign");__DL.start();__DL.stopLoop();__DL.refresh()')
 ck('QA3 COMBAT','Deux groupes d’actions seulement',p.locator('#actions .dl43-action-group').count()==2)
 ck('QA3 COMBAT','Pause possède un nom accessible',p.locator('#pauseBtn').get_attribute('aria-label')=='Pause')
 ck('QA3 COMBAT','Audio expose son état',p.locator('#soundBtn').get_attribute('aria-pressed') in ['true','false'])
 views={}
 for v in ['right','left','front','rear']:
  d=p.evaluate('''v=>{__DL.readState().wave.fronts.view=v;__DL.render();return{view:__DL.currentView(),gun:__DL.dl403.state().gunPasses,player:__DL.dl403.state().playerPasses,rear:__DL.dl410.state().lastRearPlayer};}''',v);views[v]=d
 ck('QA3 COMBAT','Vues latérales montrent le survivant',views['right']['player']==1 and views['left']['player']==1,views)
 ck('QA3 COMBAT','Vue avant garde une arme FPS unique',views['front']['gun']==1,views['front'])
 ck('QA3 COMBAT','Vue arrière garde le survivant distant sans arme FPS',views['rear']['gun']==0 and views['rear']['rear'] is not None,views['rear'])
 # Objective: repeated compaction must retain full tooltip.
 d=p.evaluate('''()=>{const o=document.getElementById('objective');o.textContent='SITE DE TEST · 7/40 · 01:24 · CONTRAT LONG';DL44UI.decorate();const a={text:o.textContent,title:o.title,full:o.dataset.dl43Full};DL44UI.decorate();DL44UI.decorate();const b={text:o.textContent,title:o.title,full:o.dataset.dl43Full};return{a,b};}''')
 ck('QA3 COMBAT','Objectif compact ne détruit plus le texte complet',d['b']['title']=='SITE DE TEST · 7/40 · 01:24 · CONTRAT LONG' and d['b']['full']==d['b']['title'],d)
 p.close()
 # QA4 — extrêmes/sauvegardes/responsive
 p=page(b);p.evaluate('__DL.startNew("campaign")');exported=p.evaluate('JSON.parse(__DL.exportText())');valid=p.evaluate('(x)=>__DL.validateSave(x)',exported);ck('QA4 EXTRÊMES','Export/validation schéma courant',isinstance(valid,dict) and valid.get('version')==12,valid.get('version') if isinstance(valid,dict) else None)
 corrupt=json.loads(json.dumps(exported));corrupt['version']=999; rejected=p.evaluate('(x)=>{try{__DL.validateSave(x);return false}catch(e){return true}}',corrupt);ck('QA4 EXTRÊMES','Sauvegarde incompatible refusée',rejected)
 p.close()
 for w,h in [(1920,1080),(1280,720),(896,414),(414,896)]:
  p=page(b,w,h);p.evaluate('__DL.startNew("campaign");__DL.start();__DL.stopLoop();__DL.refresh()');d=p.evaluate('''()=>({sw:document.documentElement.scrollWidth,vw:innerWidth,combat:!!document.querySelector('#combatBar')?.offsetParent,buttons:[...document.querySelectorAll('#combatBar button')].filter(x=>x.offsetParent).every(x=>{const r=x.getBoundingClientRect();return r.width>=30&&r.height>=30&&r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})})''');ck('QA4 EXTRÊMES',f'HUD jouable {w}×{h}',d['sw']<=d['vw']+2 and d['combat'] and d['buttons'],d);p.close()
 b.close()
ck('QA4 EXTRÊMES','Aucune erreur JavaScript',not errors,errors)
out={'version':'0.44.0','passed':sum(x['ok'] for x in rows),'total':len(rows),'failed':[x for x in rows if not x['ok']],'errors':errors,'checks':rows}
(R/'rapports/QA4_0_44_0.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({k:out[k] for k in ['passed','total','errors']},ensure_ascii=False));sys.exit(1 if out['failed'] else 0)
