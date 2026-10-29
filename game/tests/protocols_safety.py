"""Safety, loss, finite ammo, cancellation, real production and responsive controls.
Original engine, image payloads alone reduced. Failure/saturation tests explicitly
arrange a training state; they are not presented as human balancing evidence.
"""
from pathlib import Path
import re,json,os,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',(R/'JOUER_DERNIERE_LIGNE.html').read_text())
checks=[];errors=[]
def ck(n,v,d=None):
 checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def boot(b,w=1440,h=900,prod=False):
 p=b.new_page(viewport={'width':w,'height':h});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(light,wait_until='domcontentloaded',timeout=25000);p.wait_for_timeout(90)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,activeReload:false})')
 return p
def setup(p,wid='pistol',unlocked=True):
 p.evaluate('''({id,unlocked})=>{__DL.startNew('campaign');const r=__DL.readState().run;for(const w of __DL.getDefs().WEAPONS)r.weapons[w.id]={mag:w.mag,reserve:111,level:1};if(unlocked)__DL.setMeta({xp:999999,weaponMastery:Object.fromEntries(__DL.getDefs().WEAPONS.map(w=>[w.id,{kills:2000,headshots:500,damage:100000}]))});r.cash=8000;r.activeId=id;r.loadout=[id,'pistol'];DL36Gunsmith.ensure().selected=id;DL36Gunsmith.reset();__DL.setTab('workshop');}''',{'id':wid,'unlocked':unlocked})
def stamp(p):return p.evaluate('JSON.stringify({data:__DL.getData(),run:__DL.readState().run})')
def draft(p,protocol='grouping',view='front'):
 p.locator('#dl405-open').click();p.evaluate('(o)=>__DL.dl406.set(o)',{'protocol':protocol,'view':view,'seed':6012})
def launch(p,mode='a'):
 p.evaluate('(m)=>__DL.dl405.try(m)',mode);p.locator('#practiceBegin').click();p.evaluate('__DL.stopLoop()')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=boot(b);setup(p);original=stamp(p);draft(p)
 vals=p.evaluate('''()=>[__DL.dl406.set({protocol:'invented'}),__DL.dl406.set({view:'north'}),__DL.dl406.set({seed:NaN}),__DL.dl406.set({seed:0}),__DL.dl406.set({seed:1000000}),__DL.dl406.set({seed:2.3})]''')
 ck('Conditions malformées refusées sans changer le profil',vals==[False]*6 and stamp(p)==original,vals)
 p.evaluate('__DL.dl405.try("a")');p.locator('#practiceLeave').click()
 ck('Annuler la préparation restaure aussi le hasard du moteur',stamp(p)==original and not p.evaluate('__DL.dl406.state().randomParked') and p.evaluate('__DL.snapshot().phase')=='workshopDraft')
 launch(p)
 # Deliberately reduce only the temporary lot to probe the native pistol reload branch.
 probe=p.evaluate('''()=>{const a=__DL.getAmmo('pistol');a.mag=0;a.reserve=5;__DL.reload();__DL.advance(3);return {mag:a.mag,reserve:a.reserve,phase:__DL.snapshot().phase};}''')
 ck('Pistolet contrôlé : recharge depuis le stock réel',probe['mag']==5 and probe['reserve']==0,probe)
 empty=p.evaluate('''()=>{const a=__DL.getAmmo('pistol');a.mag=0;a.reserve=0;__DL.setTimers({cooldown:0,reload:0});__DL.reload();__DL.fire();__DL.advance(3);return {mag:a.mag,reserve:a.reserve,reload:__DL.getRuntime().reload,shots:__DL.practiceSnapshot().shots};}''')
 ck('Pistolet contrôlé : aucune cartouche créée après épuisement',empty['mag']==0 and empty['reserve']==0 and empty['reload']==0 and empty['shots']==0,empty)
 p.evaluate('__DL.leavePractice()');ck('Sonde de stock temporaire sans conséquence campagne',stamp(p)==original)
 p.evaluate('__DL.dl405.close();__DL.showPractice("pistol");__DL.beginPractice({gun:"pistol",enemy:"walker",view:"front",distance:"near",motion:"still",group:1});__DL.stopLoop();__DL.getAmmo("pistol").mag=0;__DL.getAmmo("pistol").reserve=0;__DL.reload();__DL.advance(3)')
 ck('Pistolet du stand libre toujours rechargé sans limite',p.evaluate('__DL.getAmmo("pistol").mag')==p.evaluate('__DL.getDefs().WEAPONS.find(w=>w.id==="pistol").mag'))
 p.evaluate('__DL.leavePractice()');ck('Stand libre restaure le profil initial',stamp(p)==original)
 p.evaluate('__DL.start();__DL.stopLoop();__DL.getAmmo("pistol").mag=0;__DL.getAmmo("pistol").reserve=0;__DL.reload();__DL.advance(3)')
 ck('Pistolet de campagne garde sa réserve infinie',p.evaluate('__DL.getAmmo("pistol").mag')==p.evaluate('__DL.getDefs().WEAPONS.find(w=>w.id==="pistol").mag'))
 p.close()
 # Default cinematics enabled in the original profile must not open a prologue in either practice path.
 for timed in [False,True]:
  p=boot(b);setup(p,'rifle');p.evaluate('__DL.setSettings({cinematics:true});__DL.setMeta({storySeen:[]})');original=stamp(p)
  if timed:draft(p);launch(p)
  else:p.evaluate('__DL.showPractice("rifle");__DL.beginPractice({gun:"rifle",enemy:"walker",view:"front",distance:"near",motion:"still",group:1});__DL.stopLoop()')
  ck('Cinématiques actives : vrai stand '+('contrôlé' if timed else 'libre')+' lancé',p.evaluate('__DL.snapshot().phase')=='combat' and not p.locator('#v18Cinematic').is_visible())
  p.evaluate('__DL.leavePractice()')
  ck('Cinématiques et journal originaux préservés · '+str(timed),stamp(p)==original and p.evaluate('__DL.getData().settings.cinematics') is True and p.evaluate('__DL.getData().meta.storySeen.length')==0)
  if timed:p.evaluate('__DL.dl405.close()')
  ck('Chapitre initial encore inédit · '+str(timed),p.evaluate('(()=>{const c=__DL.v18ChapterForRun();return !!c&&!__DL.getData().meta.storySeen.includes(c.key)})()'))
  p.close()
 # Saturation through real undriven moving enemies, no kills or state rewrites.
 p=boot(b);setup(p,'rifle');original=stamp(p);draft(p,'swarm');launch(p);p.evaluate('__DL.advance(30.2)');r=p.evaluate('__DL.dl406.state().runner')
 ck('Cour pleine signalée dans le bilan',r['skipped']>0 and r['offered']+r['skipped']==r['passages']*3,r)
 ck('Aucune cible en excès au plafond de huit',p.evaluate('__DL.readState().enemies.filter(z=>!z.dead).length')<=8)
 p.locator('#practiceLeave').click();ck('Saturation sans perte de sauvegarde',stamp(p)==original)
 launch(p,'b');p.evaluate('__DL.advance(30.2)');p.locator('#practiceLeave').click()
 ck('Programme incomplet non présenté comme comparaison certifiée',not p.evaluate('__DL.dl406.status().ready'))
 p.evaluate('__DL.dl405.close()');p.close()
 # Exercise post loss via the real enemy attack against a weakened temporary post.
 p=boot(b);setup(p,'rifle');original=stamp(p);draft(p,'rush');launch(p)
 p.evaluate('''()=>{const r=__DL.readState().run;r.wall=1;r.health=1;for(const z of __DL.readState().enemies){z.x=1018;z.attack=0;}__DL.advance(2);}''')
 r=p.evaluate('__DL.dl406.state().runner');ck('Défaite réelle : bilan arrêté avant 30 secondes',p.evaluate('__DL.snapshot().phase')=='practiceEnd' and r['reason']=='post' and not r['completed'] and r['elapsed']<30,r)
 p.locator('#practiceRestart').click();p.evaluate('__DL.stopLoop()');r=p.evaluate('__DL.dl406.state().runner')
 ck('Rejouer réinitialise lot, passages et horloge',r['elapsed']==0 and r['ammoLeft']==300 and r['passages']==1 and r['reason']=='manual',r)
 p.evaluate('__DL.advance(1.3);__DL.pause()');p.locator('#practiceChange').click()
 ck('Reconfiguration depuis pause conserve les conditions',p.evaluate('__DL.snapshot().phase')=='practiceSetup' and p.locator('#practiceEnemy').is_disabled() and p.locator('#practiceEnemy').input_value()=='runner')
 p.locator('#practiceBegin').click();p.evaluate('__DL.stopLoop()');ck('Nouvel essai après pause repart de zéro',p.evaluate('__DL.dl406.state().runner.elapsed')==0)
 p.evaluate('__DL.leavePractice()');ck('Défaite, reprise et pause restaurent la campagne intacte',stamp(p)==original)
 p.evaluate('__DL.dl405.close()');p.close()
 # Locked draft, changed personal upgrade and doctrine must not enter a mixed comparison.
 p=boot(b);setup(p,'rifle',False);draft(p);p.evaluate('__DL.dl405.kit("kit2_rifle_marks")')
 # Resolve actual locked conversion from catalog, not a invented ID.
 locked=p.evaluate('''()=>DL36Gunsmith.atelier.catalog.conversions.find(c=>DL36Gunsmith.atelier.conversionAllowed('rifle',c)&&!DL36Gunsmith.workbench.inspect('rifle',{active:{},tuning:{},conversion:c.id}).ready)?.id''')
 ck('Conversion verrouillée réelle disponible pour le test',bool(locked),locked)
 if locked:
  p.evaluate('(id)=>__DL.dl405.kit(id)',locked);orig=stamp(p)
  ck('B et parcours refusés pour une pièce verrouillée',p.evaluate('__DL.dl405.try("b")') is False and p.evaluate('__DL.dl406.pair()') is False and stamp(p)==orig)
 p.evaluate('__DL.dl405.close()');p.close()
 for field in ['level','doctrine']:
  p=boot(b);setup(p,'rifle');draft(p)
  p.evaluate('''(field)=>{if(field==='level')__DL.getAmmo('rifle').level++;else{const d=__DL.getData().meta.doctrines;d.marksman=(d.marksman||0)+1;}}''',field)
  ck('Instantané personnel invalide le montage · '+field,p.evaluate('__DL.dl405.try("a")') is False and p.evaluate('__DL.dl405.try("b")') is False and p.evaluate('__DL.dl405.apply()') is False)
  p.evaluate('__DL.dl405.close()');p.close()
 # Free comparisons with different run durations must say so.
 p=boot(b);setup(p,'rifle');original=stamp(p);p.locator('#dl405-open').click()
 for mode,duration in [('a',1),('b',4)]:
  launch(p,mode);p.evaluate('(s)=>__DL.advance(s)',duration);p.evaluate('__DL.leavePractice()')
 ck('Stand libre : durées différentes explicitement signalées',not p.evaluate('__DL.dl406.status().ready') and 'Durées différentes' in p.evaluate('__DL.dl406.status().text'))
 ck('Essais libres sans mutation',stamp(p)==original);p.close()
 # Exit during an actual running drill cannot leave a temporary profile or an overlay.
 p=boot(b);setup(p,'rifle');original=stamp(p);draft(p);launch(p);p.evaluate('__DL.advance(2);__DL.showMenu()');st=p.evaluate('__DL.dl406.state()')
 ck('Retour menu nettoie programme, hasard et brouillon',st['runner'] is None and not st['randomParked'] and p.evaluate('__DL.dl405.state().trial') is None and p.evaluate('__DL.dl405.state().draft') is None and not p.locator('#dl406-timer').count())
 # Save-only compare: showMenu may change current run checkpoint display; its data must remain the real one.
 ck('Retour menu garde le bon stock de campagne',p.evaluate('__DL.getData().save?.weapons?.rifle?.reserve')==111 or p.evaluate('__DL.readState().run.weapons.rifle.reserve')==111)
 p.close()
 # Responsive UI: actual fixed/dialog sizes plus unfolded preview, native end screen and results.
 for w,h in [(1440,900),(896,414),(414,896)]:
  p=boot(b,w,h);setup(p,'rifle');draft(p,'protection');p.locator('.dl406-conditions summary').click()
  sizes=p.evaluate('''()=>{const els=[document.documentElement,document.querySelector('#dialogBody'),document.querySelector('.dl406-conditions'),document.querySelector('.dl405-layout'),document.querySelector('.dl406-preview')];return els.map(e=>({name:e.id||e.className,cw:e.clientWidth,sw:e.scrollWidth,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));}''')
  ck(f'{w}×{h} : dialogue et grille sans débordement',all(e['sw']<=e['cw']+2 for e in sizes),sizes)
  frames=p.evaluate('''()=>{const f=document.querySelector('.dl406-preview figure').getBoundingClientRect(),i=document.querySelector('.dl406-preview img'),r=i.getBoundingClientRect();return {fit:getComputedStyle(i).objectFit,inside:r.left>=f.left&&r.right<=f.right&&r.top>=f.top&&r.bottom<=f.bottom};}''')
  ck(f'{w}×{h} : portrait ennemi entier',frames['fit']=='contain' and frames['inside'],frames)
  p.locator('#dl406-protocol').focus();p.evaluate('__DL.dl406.set({protocol:"grouping"})');ck(f'{w}×{h} : focus conservé sur les conditions',p.evaluate('document.activeElement.id')=='dl406-protocol')
  launch(p);p.evaluate('__DL.advance(1);__DL.refresh();__DL.render()')
  hud=p.evaluate('''()=>{const e=document.querySelector('#practiceBar'),r=e.getBoundingClientRect();return {cw:e.clientWidth,sw:e.scrollWidth,left:r.left,right:r.right,top:r.top,bottom:r.bottom,iw:innerWidth,ih:innerHeight};}''')
  ck(f'{w}×{h} : barre de temps dans le terrain',hud['sw']<=hud['cw']+2 and hud['left']>=-2 and hud['right']<=w+2 and hud['top']>=-2 and hud['bottom']<=h+2,hud)
  p.evaluate('__DL.advance(29.1)');end=p.evaluate('''()=>{const e=document.querySelector('#dialogBody'),r=e.getBoundingClientRect();return {cw:e.clientWidth,sw:e.scrollWidth,left:r.left,right:r.right};}''')
  ck(f'{w}×{h} : bilan natif sans largeur masquée',end['sw']<=end['cw']+2 and end['right']<=w+2,end)
  p.locator('#practiceLeave').click();p.evaluate('__DL.dl405.close()');p.close()
 # No opt-in API; navigate and launch the first pistol drill with real UI handlers only.
 p=boot(b,prod=True);p.locator('[data-page="campaigns"]').click();p.locator('#newCampaign').click();p.wait_for_timeout(100)
 if p.get_by_role('button',name='COMMENCER SANS FORMATION',exact=True).is_visible():p.get_by_role('button',name='COMMENCER SANS FORMATION',exact=True).click()
 p.locator('[data-campgroup="equipment"]').click()
 p.locator('[data-tab="workshop"]').click();p.locator('#dl405-open').click();p.locator('.dl406-conditions summary').click();p.locator('#dl406-protocol').select_option('grouping');p.locator('#dl406-pair').click();p.locator('#practiceBegin').click();p.wait_for_timeout(300)
 ck('Production : parcours clics jusqu’au chronomètre',p.locator('#dl406-timer').is_visible() and p.evaluate('typeof window.__DL')=='undefined')
 p.locator('#practiceExit').click();ck('Production : retour au bilan sans outil développeur',p.locator('.dl405-results').is_visible() and p.locator('#dl406-next').is_visible())
 p.locator('#dl405-discard').click();p.locator('#startWaveBtn').click();p.wait_for_timeout(100)
 ck('Production : introduction du convoi conservée après le stand',p.locator('#v18Cinematic').is_visible())
 p.close();b.close()
ck('Aucune erreur JavaScript',not errors,errors)
r={'version':'0.40.6','passed':sum(x['ok'] for x in checks),'total':len(checks),'checks':checks,'errors':errors,'method':'Moteur réel, uniquement URI images réduites. Épuisement, post faible et origine modifiée sont des états de QA explicitement arrangés.'}
(R/'rapports/PROTOCOLS_SAFETY_QA.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps({'passed':r['passed'],'total':r['total'],'errors':errors}));sys.exit(0 if r['passed']==r['total'] else 1)
