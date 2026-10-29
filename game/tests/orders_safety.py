"""Read-only preparation, transactions, pause status and input isolation in the
actual game document. Stock and targets are arranged solely to reproduce edges.
"""
from pathlib import Path
import re,json,sys,os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
h=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',(R/'JOUER_DERNIERE_LIGNE.html').read_text())
checks=[];errors=[]
def ck(n,v,d=None):checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def boot(b,w=1440,ht=900):
 p=b.new_page(viewport={'width':w,'height':ht});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank?test=1');p.set_content(h,wait_until='domcontentloaded',timeout=25000);p.wait_for_timeout(100);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false})');return p
def camp(p,mode='campaign'):
 p.evaluate('''mode=>{__DL.startNew(mode);const r=__DL.readState().run;r.cash=1000;r.allies={shooter:{active:true},medic:{active:true}};r.weapons.rifle={mag:4,reserve:30,level:0};r.loadout=['rifle','pistol'];r.activeId='rifle';r.inventory=[2,1,1];r.health=87;r.wall=120;__DL.setTab('readiness');}''',mode)
def stamp(p):return p.evaluate('JSON.stringify({run:__DL.readState().run,data:__DL.getData()})')
def proof(p):return p.evaluate('JSON.stringify({run:__DL.readState().run,wave:__DL.readState().wave,enemies:__DL.readState().enemies,runtime:__DL.getRuntime()})')
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 p=boot(b);camp(p);initial=stamp(p)
 p.evaluate('for(let i=0;i<30;i++){__DL.dl407.offers();__DL.dl407.order();__DL.dl407.crew("airGunner");}');ck('Trente lectures ne changent ni run ni profil',stamp(p)==initial)
 for mutation in ['__DL.readState().run.weapons.rifle.mag--','__DL.readState().run.allies.shooter.active=false','__DL.readState().run.loadout=["pistol",null]','__DL.getData().meta.doctrines.marksman=1']:
  camp(p);p.evaluate('__DL.dl407.open();__DL.dl407.pick(["health"])');p.evaluate(mutation);before=stamp(p)
  ck('Préparation périmée refusée · '+mutation,not p.evaluate('__DL.dl407.quote().valid') and not p.evaluate('__DL.dl407.apply()') and stamp(p)==before)
  p.evaluate('__DL.dl407.close()')
 # Cash exactly cost + active fee preserves it; one credit less fails without any row applied.
 for gap in [-1,0]:
  camp(p);p.evaluate('(gap)=>{const r=__DL.readState().run;r.cash=146+gap;}',gap);original=stamp(p);p.evaluate('__DL.dl407.open();__DL.dl407.pick(["health"])');q=p.evaluate('__DL.dl407.quote()');a=p.evaluate('__DL.dl407.apply()')
  ck('Solde protégée au crédit près · '+str(gap),(a and p.evaluate('__DL.readState().run.cash')==120) if gap==0 else (not a and stamp(p)==original),q)
  if gap<0:p.evaluate('__DL.dl407.close()')
 # Free loading is explicit and transfers reserve even with no paid offer.
 camp(p);p.evaluate('__DL.dl407.open();__DL.dl407.pick([],true)');before=p.evaluate('__DL.snapshot().run');ok=p.evaluate('__DL.dl407.apply()');after=p.evaluate('__DL.snapshot().run')
 ck('Chargement gratuit explicite sans aucun achat',ok and after['cash']==before['cash'] and after['totalSpent']==before['totalSpent'] and after['weapons']['rifle']['mag']+after['weapons']['rifle']['reserve']==34)
 # Weekly noMeds / noAllies respected by offer/quote, not recreated rules.
 camp(p);p.evaluate('__DL.readState().run.v21Challenge={rule:"noMeds"}');ck('Défi sans soins ne propose pas de trousse',not p.evaluate('__DL.dl407.offers().some(o=>o.id==="supply:2")'))
 p.evaluate('__DL.readState().run.v21Challenge={rule:"noAllies"};__DL.dl407.open()');ck('Défi sans alliés garde les frais à zéro',p.evaluate('__DL.dl407.quote().fee')==0);p.evaluate('__DL.dl407.close()');p.close()
 # Review identity is route-bound; replacing run must not affect replacement preparation.
 p=boot(b);camp(p);p.evaluate('__DL.dl407.open();__DL.dl407.pick(["health"]);__DL.startNew("water")');r=stamp(p)
 ck('Ancien devis incapable de toucher une nouvelle route',not p.evaluate('__DL.dl407.apply()') and stamp(p)==r);p.close()
 # all nine persistent checkpoints coexist and survive read-only use and successful transaction
 p=boot(b)
 for mode in ['campaign','north','metro','air','highway','water','tower','dark']:p.evaluate('(m)=>__DL.startNew(m)',mode)
 op=p.evaluate('__DL.getDefs().QUICK_OPS[0].id');p.evaluate('(id)=>__DL.startOperation(id)',op);p.evaluate('__DL.showMenu();__DL.resumeSave()')
 # restore dark through actual checkpoint action, then transact
 p.evaluate('__DL.startNew("dark");__DL.readState().run.health=90;__DL.readState().run.cash=10000;__DL.setTab("readiness")');before=p.evaluate('__DL.validateSave(JSON.parse(__DL.exportText()))')
 p.evaluate('__DL.dl407.open();__DL.dl407.pick(["health"]);__DL.dl407.apply()');after=p.evaluate('__DL.validateSave(JSON.parse(__DL.exportText()))')
 keys=['save','reserve','northReserve','metroReserve','airReserve','highwayReserve','waterReserve','towerReserve','darkReserve']
 ck('Neuf préparations exportées et validées',sum(after.get(k) is not None for k in keys)==9,[after.get(k,{}).get('mode') if after.get(k) else None for k in keys])
 # Compare all other slots by whole content; slot locations stable during own transaction.
 ck('Révision ne fusionne pas les huit autres préparations',all(before.get(k)==after.get(k) for k in keys if before.get(k,{}).get('mode')!='dark'),[k for k in keys if before.get(k)!=after.get(k)])
 p.close()
 # Native stock recovery after defeat includes purchase once and no extra resupply.
 p=boot(b);camp(p);p.evaluate('__DL.dl407.open();__DL.dl407.pick(["health","supply:1"],true);__DL.dl407.apply()');startstock=p.evaluate('__DL.snapshot().run');p.evaluate('__DL.start();__DL.stopLoop();__DL.readState().run.inventory[1]=0;__DL.readState().run.weapons.rifle.mag=0;__DL.readState().run.weapons.rifle.reserve=0;__DL.endRun(false)')
 # use native retry button, inspect id to avoid guessing unresolvable property
 buttons=p.locator('#dialogBody button').evaluate_all('(bs)=>bs.map(b=>({id:b.id,text:b.textContent}))')
 retry=p.locator('#retrySame')
 if retry.count():retry.click()
 else:
  match=[x for x in buttons if 'PRÉPARATION' in x['text'].upper() or 'RÉESSAYER' in x['text'].upper() or 'REJOUER' in x['text'].upper()]
  if match and match[0]['id']:p.locator('#'+match[0]['id']).click()
 state=p.evaluate('__DL.snapshot()');ck('Défaite reprend le stock préparé sans nouvelle livraison',state['phase']=='camp' and state['run']['weapons']['rifle']==startstock['weapons']['rifle'] and state['run']['inventory']==startstock['inventory'] and state['run']['cash']==startstock['cash'],{'phase':state['phase'],'buttons':buttons,'cash':state['run']['cash'],'before':startstock['cash']});p.close()
 # Pause status is strictly read-only including combat timers and unseen enemies.
 for mode in ['campaign','north','metro','air','highway','water','tower','dark']:
  p=boot(b);camp(p,mode);p.evaluate('''()=>{const r=__DL.readState().run;r.allies={airGunner:{active:true},towerTech:{active:true}};r.cash=5000;__DL.start();__DL.stopLoop();__DL.readState().wave.spawnTimer=10000;__DL.advance(.12);__DL.clearEnemies();const z=__DL.spawn(mode==='dark'?'darkWanderer':'walker');z.x=500;z.lane=0;z.feet=494;__DL.pause();}'''.replace("mode==='dark'",'true' if mode=='dark' else 'false'))
  if mode=='dark':p.evaluate('__DL.readState().wave.dark.flare=[0,0];__DL.readState().wave.dark.battery=[0,0];__DL.readState().wave.dark.flash=0;__DL.dl401.damage(1,100)')
  original=proof(p);p.locator('#dl407-post-status').click();s=p.evaluate('__DL.dl407.status()');p.evaluate('__DL.advance(10)');ck('Situation du poste : tous les timers figés · '+mode,proof(p)==original and p.evaluate('__DL.snapshot().phase')=='postStatus',s)
  if mode=='dark':ck('Situation ne compte pas la silhouette cachée',s['seen']==[0,0],s['seen'])
  p.keyboard.press('Escape');ck('Un retour rejoint la pause et non le combat · '+mode,p.evaluate('__DL.snapshot().phase')=='paused' and p.locator('#resumeGame').is_visible())
  p.locator('#resumeGame').click();p.evaluate('__DL.stopLoop()');ck('Reprise active après la situation · '+mode,p.evaluate('__DL.snapshot().phase')=='combat')
  p.close()
 # Native power state on ordinary blackout is identical while paused.
 p=boot(b);camp(p);nights=p.evaluate('''()=>{const r=__DL.readState().run,res=[];for(let i=1;i<=24;i++){r.night=i;if(__DL.conditionFor().name.includes('Coupure'))res.push(i);}return res;}''')
 p.evaluate('(n)=>{const r=__DL.readState().run;r.night=n;r.lastSettled=n-1;r.equipment.generator=1;r.fuel=100;__DL.start();__DL.stopLoop();__DL.readState().wave.time=19;__DL.readState().wave.spawnTimer=10000;}',nights[0] if nights else 4)
 combat=p.evaluate('__DL.powerOnline()');p.evaluate('__DL.pause();__DL.dl407.openStatus()');status=p.evaluate('__DL.dl407.status()');ck('Coupure électrique toujours signalée pendant la pause',status['online']==combat and not combat,{'nights':nights,'online':combat,'status':status['online']});p.close()
 # Buttons rendered entirely within page + native dialog at three sizes; no CSS removal of elements.
 for width,height in [(1440,900),(896,414),(414,896)]:
  p=boot(b,width,height);camp(p,'dark');p.locator('#dl407-review').click();p.locator('#dl407-load').check();p.locator('#dl407-pick-health').check();p.wait_for_timeout(40)
  layout=p.evaluate('''()=>{const els=[document.documentElement,document.getElementById('dialogBody'),document.querySelector('.dl407-review'),document.querySelector('.dl407-review-grid')];return els.map(e=>({name:e.className||e.tagName,width:e.clientWidth,scroll:e.scrollWidth}));}''')
  ck(f'Devis sans débordement interne {width}×{height}',all(x['scroll']<=x['width']+2 for x in layout),layout)
  focus=p.evaluate('document.activeElement.id');ck(f'Contrôle sélectionné conserve le focus {width}×{height}',focus=='dl407-pick-health',focus)
  p.locator('#dl407-review-close').click();p.evaluate('__DL.start();__DL.stopLoop();__DL.pause()');p.locator('#dl407-post-status').click();p.wait_for_timeout(30)
  layout=p.evaluate('''()=>[document.documentElement,document.getElementById('dialogBody'),document.querySelector('.dl407-status')].map(e=>({name:e.className||e.tagName,width:e.clientWidth,scroll:e.scrollWidth}))''')
  ck(f'Situation du poste lisible {width}×{height}',all(x['scroll']<=x['width']+2 for x in layout),layout)
  p.locator('#dl407-status-back').click();p.close()
 b.close()
ck('Aucune erreur JavaScript',not errors,errors)
r={'version':'0.40.7','passed':sum(c['ok'] for c in checks),'total':len(checks),'checks':checks,'errors':errors,'method':'Moteur réel Chromium, cibles/stocks arrangés, images réduites seulement. Pause, transactions et reprise avec commandes natives.'};(R/'rapports/ORDERS_SAFETY_QA.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps({'passed':r['passed'],'total':r['total'],'errors':errors}));sys.exit(0 if r['passed']==r['total'] else 1)
