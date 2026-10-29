"""0.40.4 native engine: geometric endpoint, reload cycles, actual input and UI.
No mock game functions. Fast matrix only replaces raster URIs.
"""
from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
h=(R/'JOUER_DERNIERE_LIGNE.html').read_text();h=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',h)
checks=[];errors=[];reload_cases=[];pose_cases=[]
def ck(n,v,d=None):checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def load(b,width=1440,height=900,prod=False):
 p=b.new_page(viewport={'width':width,'height':height});p.set_default_timeout(4500);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(h,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(130)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,activeReload:false,sound:false})')
 return p
def setup(p):
 p.evaluate('''()=>{__DL.startNew('campaign');const r=__DL.readState().run,wm={};for(const w of __DL.getDefs().WEAPONS){r.weapons[w.id]={mag:w.mag,reserve:600,level:0};wm[w.id]={kills:1000,headshots:250,damage:100000};}__DL.setMeta({xp:999999,weaponMastery:wm});r.loadout=['assault','pump'];r.activeId='assault';r.cash=99999;DL36Gunsmith.ensure().selected='assault';__DL.setTab('workshop');}''')
def practice(p,w,view='front'):
 p.evaluate('(a)=>{__DL.showMenu();__DL.showPractice(a.w);__DL.beginPractice({gun:a.w,enemy:"walker",view:a.v,distance:"near",motion:"still",group:1});__DL.stopLoop();__DL.render();}',{'w':w,'v':view})
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=load(b);setup(p)
 matrix=p.evaluate('__DL.dl404.matrix()');ck('45 armes reliées aux familles natives',len(matrix)==45 and all(x['family'] not in ['heavy',None] for x in matrix),matrix)
 ck('Neuf mécanismes différenciés',len(set(x['kind'] for x in matrix))==9,sorted(set(x['kind'] for x in matrix)))
 # Actual 45 weapon definitions, two perspectives, two recoil levels and four aiming edges.
 for view in ['front','rear']:
  practice(p,'assault',view)
  rows=p.evaluate('''()=>{const out=[];for(const w of __DL.getDefs().WEAPONS)for(const recoil of [0,1.6])for(const [x,y]of [[160,210],[720,390],[1200,775],[1420,770]]){
    DL35Weapon.state.kick=recoil;DL35Weapon.state.side=.45;const p=DL35Weapon.poseFor(x,y,w.id),dx=Math.cos(p.angle),dy=Math.sin(p.angle),gap=Math.hypot(x-p.muzzleX,y-p.muzzleY);
    out.push({weapon:w.id,recoil,x,y,tip:Math.hypot(p.muzzleX-(p.anchorX+dx*p.profile.length),p.muzzleY-(p.anchorY+dy*p.profile.length)),offAxis:Math.abs((x-p.muzzleX)*dy-(y-p.muzzleY)*dx),forward:(x-p.muzzleX)*dx+(y-p.muzzleY)*dy,gap});}return out;}''')
  pose_cases.extend([{'view':view,**x} for x in rows]);ck('Axe et bouche identiques au modèle — '+view,all(r['tip']<1e-7 and r['offAxis']<1e-7 and r['forward']>=27 for r in rows),{'cases':len(rows),'maxOffAxis':max(r['offAxis'] for r in rows)})
  p.evaluate('__DL.leavePractice()')
 # Every weapon starts a reload. Capacity/conservation from actual timer. Four subposes per reload.
 for view in ['front','rear']:
  for w in matrix:
   practice(p,w['id'],view)
   result=p.evaluate('''()=>{const r=__DL.readState().run,id=r.activeId,inv=r.weapons[id],def=__DL.getDefs().WEAPONS.find(w=>w.id===id);inv.mag=0;inv.reserve=600;__DL.setTimers({reload:0,cooldown:0});__DL.reload();const total=__DL.getRuntime().reloadTotal;const frames=[];for(const fraction of [.16,.36,.6,.84]){__DL.setReloadProgress(fraction);__DL.render();frames.push({feed:__DL.dl404.state().feedDraws,kind:__DL.dl404.state().mechanism,gun:__DL.dl403.state().gunPasses,pose:DL35Weapon.state.lastPose?.id});}__DL.advance(total+.25);return {id,total,mag:inv.mag,reserve:inv.reserve,cap:def.mag,progressive:!!def.progressive,frames};}''')
   result['view']=view;reload_cases.append(result);p.evaluate('__DL.leavePractice()')
  group=[r for r in reload_cases if r['view']==view]
  ck('Recharge réelle et pose unique des 45 armes — '+view,all(r['total']>0 and r['mag']>0 and all(f['feed']==1 and f['gun']==1 and f['pose']==r['id'] for f in r['frames']) for r in group),{'cases':len(group),'bad':[r for r in group if not all(f['feed']==1 and f['gun']==1 for f in r['frames'])]})
  ck('Recharge ne crée pas de munitions — '+view,all(r['id']=='pistol' or r['mag']+r['reserve']==600 for r in group))
 # Real firing for all 45 weapons, all four POV; native traces (or projectiles) and ammo.
 shots=[]
 for view in ['right','left','front','rear']:
  for w in matrix:
   practice(p,w['id'],view)
   r=p.evaluate('''()=>{const s=__DL.readState(),id=s.run.activeId,z=s.enemies.find(z=>!z.dead),q=__DL.projectedEnemy(z),inv=s.run.weapons[id];z.hp=z.maxHp=1e6;__DL.setScreenAim(q.x,q.body);__DL.setTimers({reload:0,cooldown:0});const before=inv.mag,particlesBefore=__DL.getEffects().particles.length,flameBefore=s.wave.flameTicks||0;__DL.fire();const fx=__DL.getEffects(),tr=fx.tracers.at(-1),pose=DL35Weapon.state.lastPose;return{id,spent:before-inv.mag,effect:fx.tracers.length+fx.projectiles.length,flame:(s.wave.flameTicks||0)-flameBefore,particles:fx.particles.length-particlesBefore,err:tr?.screen?Math.hypot(tr.x-pose.muzzleX,tr.y-pose.muzzleY):0};}''');r['view']=view;shots.append(r);p.evaluate('__DL.leavePractice()')
  rr=[s for s in shots if s['view']==view];ck('Tirs réels et départ des traceurs — '+view,all(s['spent']==1 and (s['effect']>0 or (s['id']=='flamer' and s['flame']==1 and s['particles']>=6)) and s['err']<1e-6 for s in rr),{'cases':len(rr),'bad':[s for s in rr if s['spent']!=1 or not(s['effect']>0 or (s['id']=='flamer' and s['flame']==1 and s['particles']>=6)) or s['err']>=1e-6]})
 # Record actual forwarded Canvas calls at the native weapon transform, not a mock geometry.
 paint=[]
 practice(p,'assault')
 paint=p.evaluate('''()=>{const rows=[],P=CanvasRenderingContext2D.prototype,original={};let drawing=[],collect=false;
 const match=(ctx)=>{const p=DL35Weapon.state.lastPose;if(!collect||!p||ctx.canvas.id!=='game')return false;const t=ctx.getTransform(),s=__DL.v20PerfState().renderScale;return Math.abs(t.e-p.anchorX*s)<.0001&&Math.abs(t.f-p.anchorY*s)<.0001&&Math.abs(t.a-Math.cos(p.angle)*s)<.0001;};
 for(const key of ['roundRect','fillRect','ellipse','moveTo','lineTo']){original[key]=P[key];P[key]=function(...a){if(match(this)){let end=key==='roundRect'||key==='fillRect'?a[0]+a[2]:key==='ellipse'?a[0]+a[2]:a[0];if(Number.isFinite(end))drawing.push(end);}return original[key].apply(this,a);};}
 try {const r=__DL.readState().run;for(const view of ['front','rear'])for(const mode of ['quality','balanced','performance'])for(const w of __DL.getDefs().WEAPONS){__DL.readState().wave.fronts.view=view;__DL.setSettings({performanceMode:mode});r.weapons[w.id]??={mag:w.mag,reserve:200,level:0};r.activeId=w.id;__DL.setTimers({reload:0,cooldown:0});DL35Weapon.state.kick=0;__DL.setScreenAim(720,400);drawing=[];collect=true;__DL.render();collect=false;const p=DL35Weapon.state.lastPose,s=__DL.v20PerfState().renderScale;rows.push({id:w.id,view,mode,scale:s,tip:p.profile.length,paintTip:Math.max(...drawing),gun:__DL.dl403.state().gunPasses,canvas:document.getElementById('game').width});}return rows;
 }finally{collect=false;for(const key in original)P[key]=original[key];}}''')
 for mode in ['quality','balanced','performance']:
  group=[x for x in paint if x['mode']==mode];ck('Canon dessiné et bouche identiques à l’échelle '+mode,all(abs(x['tip']-x['paintTip'])<1e-4 and x['gun']==1 for x in group),{'cases':len(group),'bad':[x for x in group if abs(x['tip']-x['paintTip'])>=1e-4 or x['gun']!=1]})
 p.evaluate('__DL.leavePractice();__DL.setSettings({performanceMode:"quality"})')
 # Detailed reload off uses the static source model; re-enabling restores one moving feed.
 practice(p,'double')
 toggles=p.evaluate('''()=>{const r=__DL.readState().run;r.weapons.double.mag=0;r.weapons.double.reserve=10;__DL.reload();__DL.setReloadProgress(.55);__DL.setSettings({v37DetailedReload:false});__DL.render();const off=__DL.dl404.state().feedDraws;__DL.setSettings({v37DetailedReload:true});__DL.render();return {off,on:__DL.dl404.state().feedDraws};}''')
 ck('Option recharge détaillée : zéro ou une manipulation',toggles=={'off':0,'on':1},toggles);p.evaluate('__DL.leavePractice()')
 # Tube reload: advancing the actual clock repeats the mechanism/cue sequence for each cartridge.
 practice(p,'lever')
 stages=p.evaluate('''()=>{const r=__DL.readState().run,i=r.weapons.lever;i.mag=0;i.reserve=2;__DL.setTimers({reload:0,cooldown:0});__DL.reload();const t=__DL.getRuntime().reloadTotal;__DL.advance(t+.1);const a={mag:i.mag,reserve:i.reserve,p:DL37Combat.state.progress,serial:DL37Combat.state.serial};__DL.advance(t+.15);const b={mag:i.mag,reserve:i.reserve,p:DL37Combat.state.progress,serial:DL37Combat.state.serial,reload:__DL.getRuntime().reload,cues:DL37Combat.info().cues};return {a,b};}''')
 ck('Deux insertions progressives, deux cycles distincts',stages['a']['mag']==1 and stages['a']['reserve']==1 and stages['a']['p']<.5 and stages['b']['mag']==2 and stages['b']['reserve']==0 and stages['b']['reload']==0,stages)
 ck('Cinq repères sonores complets au dernier cycle',stages['b']['cues']==['release','extract','insert','charge','settle'],stages['b']['cues'])
 p.evaluate('__DL.leavePractice()')
 # Pause must not advance visual or simulation state, even through the raw QA step entry.
 practice(p,'assault');pause=p.evaluate('''()=>{const r=__DL.readState().run;r.weapons.assault.mag=2;__DL.reload();__DL.advance(.3);DL35Weapon.state.kick=1;DL35Weapon.state.lastWeapon=r.activeId;const capture=()=>({kick:DL35Weapon.state.kick,reload:__DL.getRuntime().reload,ammo:r.weapons.assault.mag,progress:DL37Combat.state.progress});__DL.setPhase('paused');const a=capture();__DL.step(.25);__DL.render();const b=capture();return {a,b};}''')
 ck('Pause fige les timers et le recul',pause['a']==pause['b'],pause);p.evaluate('__DL.setPhase("combat");__DL.leavePractice()')
 # Native menu back: only one transition per gamepad B.
 p.evaluate('__DL.showMenu();__DL.dl403.page("dossiers");');p.locator('#fieldGuideBtn').click();p.evaluate('__DL.dl404.padBack()');p.wait_for_timeout(50)
 ck('Retour manette depuis Manuel conserve Dossiers',p.evaluate('__DL.snapshot().phase')=='menu' and p.evaluate('__DL.dl403.state().page')=='dossiers')
 p.evaluate('__DL.dl404.padBack()');ck('Deuxième Retour mène à Accueil',p.evaluate('__DL.dl403.state().page')=='home')
 # Select control via D-pad, not a dead focus trap.
 p.evaluate('__DL.dl403.page("campaigns")');p.locator('#dl403-conditions summary').click();p.locator('#difficultySelect').focus()
 change=p.evaluate('''()=>{const el=document.getElementById('difficultySelect');el.selectedIndex=0;__DL.dl404.resetPad();const a=el.value;const buttons=Array(16).fill(false);buttons[15]=true;__DL.dl404.padMenu(buttons,[0,0],1000);return {a,b:el.value,index:el.selectedIndex};}''')
 ck('Croix droite change la difficulté dans le menu',change['index']==1 and change['a']!=change['b'],change)
 # Group restores the last actual tab, not the first tab in the group.
 setup(p);p.evaluate('__DL.setTab("workshop")');p.locator('[data-campgroup="team"]').click();p.locator('[data-campgroup="equipment"]').click();p.wait_for_timeout(50)
 ck('Retour Équipement retrouve l’Armurier',p.locator('#dl404-handling').count()==1)
 # Rerendering via mount retains keyboard focus.
 p.locator('[data-gs-slot="muzzle"]').click();target=p.locator('[data-gs-equip]:not([disabled])').first;aid=target.get_attribute('data-gs-equip');target.click();p.wait_for_timeout(50)
 ck('Focus conservé sur la pièce montée',p.evaluate('document.activeElement.dataset.gsEquip')==aid,aid)
 before=p.evaluate('__DL.exportText()');p.locator('#dl404-handling').click();p.wait_for_timeout(40)
 ck('Fiche de manipulation dans le dialogue natif',p.evaluate('__DL.snapshot().phase')=='weaponHandling' and p.locator('.dl404-metric-grid article').count()==3)
 p.evaluate('__DL.dl404.padBack()');p.wait_for_timeout(40);ck('Retour fiche retrouve son bouton',p.evaluate('__DL.snapshot().phase')=='camp' and p.evaluate('document.activeElement.id')=='dl404-handling')
 after=p.evaluate('__DL.exportText()');ck('Fiche consultative ne modifie pas le profil',before==after)
 p.locator('#dl404-handling').click();p.locator('#dl404-to-range').click();ck('Accès réel au stand depuis la fiche',p.evaluate('__DL.snapshot().phase')=='practiceSetup')
 p.close()
 for width,height in [(896,414),(414,896)]:
  p=load(b,width,height);setup(p);p.locator('#dl404-handling').click();sz=p.evaluate('''()=>({sw:document.documentElement.scrollWidth,w:innerWidth,count:document.querySelectorAll('.dl404-metric-grid article').length,buttons:[...document.querySelectorAll('#dialogBody button')].map(b=>({id:b.id,w:b.getBoundingClientRect().width}))})''');ck(f'{width}×{height}: fiche sans débordement',sz['sw']<=sz['w']+2 and sz['count']==3 and all(b['w']>50 for b in sz['buttons']),sz)
  p.locator('#dl404-handling-back').click();ck(f'{width}×{height}: retour Armurier utilisable',p.locator('#dl404-handling').is_visible());p.close()
 p=load(b,prod=True);ck('Aucune API de test en production',p.evaluate('typeof window.__DL')=='undefined');ck('Accueil sans fiche ni arme ajoutée',p.locator('#dl404-handling').count()==0 and p.locator('#dl-v34-geometry-layer').count()==0);p.close();b.close()
ck('Aucune erreur JavaScript dans la matrice',not errors,errors)
out={'version':'0.40.4','passed':sum(c['ok'] for c in checks),'total':len(checks),'checks':checks,'failed':[c for c in checks if not c['ok']],'errors':errors,'poseCases':pose_cases,'reloadCases':reload_cases,'shotCases':shots,'paintCases':paint}
(R/'rapports/GESTES_QA.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({k:out[k] for k in ['passed','total','errors']}));sys.exit(1 if out['failed'] else 0)
