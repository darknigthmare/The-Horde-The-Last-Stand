"""Real 0.40.3 engine: UI, image boxes, scene passes, authored 124 campaign stages.
Fast suite substitutes only image URIs. Full-image pixel/capture suite is separate.
"""
from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
h=(R/'JOUER_DERNIERE_LIGNE.html').read_text();h=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',h)
results=[];errs=[];scenes=[];imageRows=[]
def ck(n,c,d=None):results.append({'test':n,'ok':bool(c),'detail':d});print(('OK ' if c else 'FAIL ')+n,flush=True)
def load(b,width=1440,height=900,prod=False):
 p=b.new_page(viewport={'width':width,'height':height});p.on('pageerror',lambda e:errs.append(str(e)));p.set_default_timeout(4500);p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(h,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(100)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,reducedFlashes:true})')
 return p
with sync_playwright() as w:
 b=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 p=load(b)
 home=p.evaluate("()=>[...document.querySelectorAll('#menuScreen .menu-command button')].filter(e=>e.offsetParent).map(e=>e.id)")
 ck('Accueil limité aux deux actions de départ',home==['dl403-play','dl403-training'],home)
 for group,expected in [('campaigns',9),('modes',5),('dossiers',5),('options',4)]:
  p.locator(f'[data-page="{group}"]').click();p.wait_for_timeout(40)
  n=p.locator('#routeButtons .route-card:visible').count() if group=='campaigns' else p.locator(f'#menuScreen [data-dl403-section="{group}"]:visible').count()
  ck(f'Sous-menu {group}: actions isolées',n==expected,{'actual':n,'expected':expected})
  p.keyboard.press('Escape');ck('Échap revient accueil depuis '+group,p.evaluate('__DL.dl403.state().page')=='home')
 p.locator('[data-page="dossiers"]').click();p.locator('#fieldGuideBtn').click()
 ck('Manuel natif accessible dans Dossiers',p.locator('#dialogScreen').is_visible())
 p.evaluate('__DL.showMenu()');ck('Retour conserve le sous-menu courant',p.evaluate('__DL.dl403.state().page')=='dossiers')
 p.locator('[data-page="options"]').click();p.locator('#aboutGame').click();ck('À propos nouvelle version', 'À BONNE ÉCHELLE' in p.locator('#dialogBody').inner_text())
 p.evaluate('__DL.showMenu();__DL.startNew("campaign")');p.locator('[data-campgroup="equipment"]').click()
 ck('Groupe équipement affiche atelier et arsenal',p.locator('[data-tab="workshop"]').is_visible() and p.locator('[data-tab="arsenal"]').is_visible() and not p.locator('[data-tab="codex"]').is_visible())
 p.locator('[data-campgroup="team"]').click();ck('Groupe équipe donne accès aux alliés',p.locator('[data-tab="support"]').is_visible() and not p.locator('[data-tab="workshop"]').is_visible())
 p.locator('[data-campgroup="archives"]').click();ck('Groupe dossiers sans arsenal',p.locator('[data-tab="codex"]').is_visible() and not p.locator('[data-tab="arsenal"]').is_visible())
 p.evaluate('__DL.showMenu()');p.locator('[data-page="resume"]').click();ck('Préparation native visible dans Reprendre',p.locator('#continueBtn').is_visible())
 # Real DOM image box measurements across every camp/family and several native submenus.
 starts={'main':"__DL.startNew('campaign')",'north':'__DL.startNorth()','metro':'__DL.startMetro()','air':'__DL.startAir()','highway':'__DL.startHighway()','water':'__DL.startWater()','tower':'__DL.startTower()','dark':'__DL.startDark()'}
 for fam,start in starts.items():
  p.evaluate('__DL.showMenu();'+start)
  for tab in ['traps','support','personnel','base','training','workshop']:
   p.evaluate('(t)=>__DL.setTab(t)',tab);p.wait_for_timeout(20)
   row=p.evaluate('''()=>({count:document.querySelectorAll('#shopBody .v28-card-art>img').length,bad:[...document.querySelectorAll('#shopBody .v28-card-art>img')].filter(i=>{const a=i.getBoundingClientRect(),q=i.parentElement.getBoundingClientRect(),s=getComputedStyle(i);return a.height>q.height+.2||a.width>q.width+.2||a.top<q.top-.2||a.bottom>q.bottom+.2||s.objectFit!=='contain';}).map(x=>x.dataset.v28Art),scroll:document.documentElement.scrollWidth<=innerWidth+2})''')
   imageRows.append({'family':fam,'tab':tab,**row})
 ck('Cadres d’images contrôlés dans 48 contextes',len(imageRows)==48 and all(not r['bad'] and r['scroll'] for r in imageRows),{'imageBoxes':sum(r['count'] for r in imageRows),'bad':[r for r in imageRows if r['bad'] or not r['scroll']]})
 # 124 authored stages; render each in all four cameras without changing canonical enemies.
 routes=[('main',starts['main'],1,24),('relief',starts['main'],25,36),('north',starts['north'],1,16),('metro',starts['metro'],1,12),('air',starts['air'],1,12),('highway',starts['highway'],1,12),('water',starts['water'],1,12),('tower',starts['tower'],1,12),('dark',starts['dark'],1,12)]
 for fam,start,first,last in routes:
  p.evaluate('__DL.showMenu();'+start)
  if fam=='relief':p.evaluate('__DL.setRun({mode:"relief"})')
  familyRows=[]
  for n in range(first,last+1):
   p.evaluate('(n)=>{__DL.setPhase("camp");__DL.setRun({night:n,lastSettled:n-1,cash:100000,health:100,wall:999,wallMax:999});__DL.start();__DL.clearEnemies();}',n)
   for view in ['right','left','front','rear']:
    d=p.evaluate('''(v)=>{__DL.readState().wave.fronts.view=v;__DL.setScreenAim(720,410);__DL.render();const a=__DL.dl403.state(),plan=__DL.dl403.plan();return {view:__DL.currentView(),site:__DL.siteFor().id,phase:__DL.snapshot().phase,gun:a.gunPasses,player:a.playerPasses,crew:a.crewPasses,plan,can:[document.querySelector('#game').width,document.querySelector('#game').height]};}''',view)
    d.update(family=fam,stage=n);familyRows.append(d);scenes.append(d)
  ck(f'{fam}: perspectives et passe d’arme uniques',all(r['phase']=='combat' and r['gun']==(1 if r['view'] in ['front','rear'] else 0) and r['player']==(0 if r['view'] in ['front','rear'] else 1) and r['crew']<=2 and r['can'][0]>0 for r in familyRows),{'renders':len(familyRows),'sites':sorted(set(r['site'] for r in familyRows))})
 defined=set(x['id'] for x in p.evaluate('__DL.getDefs().SITES'));seen=set(x['site'] for x in scenes)
 ck('Les 37 décors ont tous été rendus dans les 4 vues',seen==defined and len(set((r['site'],r['view']) for r in scenes))==148,{'count':len(seen),'missing':sorted(defined-seen),'renders':len(scenes)})
 # Reduced-flash setting on its actual element.
 p.evaluate('__DL.setSettings({reducedFlashes:true});__DL.refresh();document.querySelector("#shell").classList.add("deployment-pulse")')
 ck('Option flashes réduits respectée par le départ',p.evaluate('getComputedStyle(document.querySelector("#shell"),"::after").display')=='none')
 p.close()
 # Menu and groups remain reachable in small portrait/landscape, not hidden behind older media CSS.
 for width,height in [(1920,1080),(1280,720),(896,414),(414,896)]:
  p=load(b,width,height)
  for group in ['home','campaigns','modes','dossiers','options','resume']:
   p.locator(f'[data-page="{group}"]').click();p.wait_for_timeout(30)
   sz=p.evaluate('''()=>({sw:document.documentElement.scrollWidth,vw:innerWidth,nav:!!document.querySelector('#dl403-hubNav').offsetParent,cmd:!!document.querySelector('.menu-command').offsetParent})''')
   ck(f'{width}x{height}: navigation {group}',sz['nav'] and sz['cmd'] and sz['sw']<=sz['vw']+2,sz)
  p.evaluate('__DL.startNew("campaign")')
  for group in ['mission','equipment','team','archives']:
   p.locator(f'[data-campgroup="{group}"]').click()
   ck(f'{width}x{height}: groupe camp {group}',p.locator(f'[data-campgroup="{group}"]').get_attribute('aria-pressed')=='true')
  p.close()
 b.close()
ck('Aucune erreur JavaScript pendant l’audit visuel',not errs,errs)
out={'version':'0.40.5','passed':sum(x['ok'] for x in results),'total':len(results),'failed':[x for x in results if not x['ok']],'checks':results,'sceneCases':scenes,'imageCases':imageRows,'errors':errs,'method':'Moteur complet, URI raster réduites pour la matrice rapide. Les 124 étapes sont arrangées par leur état de préparation et ne sont pas déclarées gagnées.'}
(R/'rapports/VISUEL_QA.json').write_text(json.dumps(out,indent=2,ensure_ascii=False));print(json.dumps({k:out[k] for k in ['passed','total','errors']}));sys.exit(1 if out['failed'] else 0)
