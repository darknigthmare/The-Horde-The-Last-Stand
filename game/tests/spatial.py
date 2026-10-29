"""0.41.0 actual browser engine: human scale, front-only reflected viewmodel,
rear countershot survivor, anchored hands, visual launch points, and stable ballistics.
No mock game functions. Only raster URIs replaced in this fast matrix.
"""
from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
T='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
def light(path):return re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',T,path.read_text())
checks=[];errors=[]
def ck(n,v,d=None):checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def load(b,path=R/'JOUER_DERNIERE_LIGNE.html'):
 p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(6000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank?test=1');p.set_content(light(path),wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(150);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,activeReload:false,sound:false,motion:false,reducedFlashes:true})');return p
PRACTICE='''([id,view])=>{__DL.showMenu();__DL.showPractice(id);__DL.beginPractice({gun:id,enemy:'walker',view,distance:'near',motion:'still',group:1});__DL.stopLoop();__DL.render();}'''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=load(b);old=load(b,R/'base/0.40.7.html')
 ck('Base 0.40.7 et build 0.41.0 séparées',p.evaluate('__DL.dl408.version')=='0.40.8' and old.evaluate('typeof __DL.dl408')=='undefined')
 p.evaluate('__DL.startNew("campaign")');p.evaluate("()=>{__DL.readState().run.allies={shooter:{active:true},engineer:{active:true}};__DL.start();__DL.clearEnemies();}")
 scales=[]
 # Intercept the real forwarded drawImage calls, including canvas matrix and opacity.
 for mode in ['campaign','metro','air','highway','water','tower','dark']:
  p.evaluate('''m=>{__DL.showMenu();__DL.startNew(m);const r=__DL.readState().run;r.cash=99999;r.allies={shooter:{active:true},engineer:{active:true}};__DL.start();__DL.clearEnemies();}''',mode)
  rows=p.evaluate('''()=>{const rows=[],P=CanvasRenderingContext2D.prototype,orig=P.drawImage;let buf=[];
    P.drawImage=function(...a){if(a.length===5&&Math.abs(a[3]-a[4])<1e-7&&a[3]>30&&a[3]<151&&this.canvas.id==='game'){const t=this.getTransform();buf.push({height:a[4],alpha:this.globalAlpha,det:t.a*t.d-t.b*t.c,anchor:[t.e,t.f]});}return orig.apply(this,a)};
    try{for(const view of ['right','left','front','rear'])for(const mode of ['quality','balanced','performance']){__DL.readState().wave.fronts.view=view;__DL.setSettings({performanceMode:mode});buf=[];__DL.render();const state=__DL.dl408.state(),scale=__DL.v20PerfState().renderScale;rows.push({view,mode,scale,actor:state.actor,crew:state.crew,actual:buf,gun:__DL.dl403.state().gunPasses,hands:state.handPasses,grips:state.gripPasses});}return rows;}finally{P.drawImage=orig;}}''')
  for r in rows:r['family']=mode
  scales.extend(rows)
  side=[r for r in rows if r['actor']];ck('Échelle humaine et pieds sur le poste — '+mode,all(r['actor']['height']==146 and r['actor']['height']/r['actor']['crewHeight']<1.06 and r['actor']['feet']==(566 if mode=='metro' else 644) and all(c['feet']==r['actor']['feet'] for c in r['crew']) for r in side),{'cases':len(side)})
  ck('Sprites réellement opaques à trois résolutions — '+mode,all(len(r['actual'])>=3 and all(abs(x['alpha']-1)<1e-7 for x in r['actual']) for r in side),{'cases':len(side),'minDraws':min(len(r['actual']) for r in side)})
  ck('Modèle FPS seulement en vue avant — '+mode,all((r['gun'],r['hands'],r['grips'])==((1,1,1) if r['view']=='front' else (0,0,0)) for r in rows))
 # 45 weapons, four aim corners plus central normal aim, front FPS view, three resolutions. Rear deliberately has no viewmodel.
 p.evaluate(PRACTICE,['assault','front'])
 poses=p.evaluate('''()=>{const out=[],r=__DL.readState().run;
 for(const view of ['front'])for(const perf of ['quality','balanced','performance'])for(const w of __DL.getDefs().WEAPONS)for(const [x,y]of [[160,210],[720,400],[1200,770],[1420,790],[920,450]]){
  __DL.readState().wave.fronts.view=view;__DL.setSettings({performanceMode:perf});r.weapons[w.id]??={mag:w.mag,reserve:300,level:0};r.activeId=w.id;__DL.setTimers({reload:0,cooldown:0});DL35Weapon.state.kick=0;DL35Weapon.state.side=0;__DL.setScreenAim(x,y);__DL.render();const p=DL35Weapon.state.lastPose,h=__DL.dl408.state().hands,tip=__DL.dl408.point(p,p.profile.length,0),bottom=__DL.dl408.point(p,80,30),top=__DL.dl408.point(p,80,-30),right=__DL.dl408.point(p,h.rightLocal.x,h.rightLocal.y);
  out.push({id:w.id,view,perf,parity:p.parity,tipError:Math.hypot(tip.x-p.muzzleX,tip.y-p.muzzleY),undersideDown:bottom.y>top.y,originsOffscreen:h.leftOrigin.y>=875&&h.rightOrigin.y>=885,gripError:Math.hypot(right.x-h.right.x,right.y-h.right.y),range:Math.hypot(p.targetX-p.muzzleX,p.targetY-p.muzzleY),finite:[tip.x,tip.y,h.left.x,h.left.y,h.right.x,h.right.y].every(Number.isFinite)});
 }return out;}''')
 ck('675 poses avant : canon, grip et main dans le même repère',len(poses)==675 and all(r['tipError']<1e-7 and r['gripError']<1e-7 and r['finite'] for r in poses),{'cases':len(poses)})
 ck('675 poses avant : dessous du boîtier toujours en bas',all(r['undersideDown'] and r['parity']==-1 for r in poses),{'bad':[r for r in poses if not r['undersideDown']]})
 ck('Les avant-bras entrent depuis hors écran',all(r['originsOffscreen'] and r['range']>=29.9999 for r in poses))
 # Rear countershot must stay viewmodel-free.
 p.evaluate(PRACTICE,['assault','rear']);rear=p.evaluate('''()=>{__DL.render();return{gun:__DL.dl403.state().gunPasses,hands:__DL.dl408.state().handPasses,rear:__DL.dl411.state().rearPlayerPasses};}''')
 ck('Contrechamp : aucun rig FPS, survivant distant rendu',rear['gun']==0 and rear['hands']==0 and rear['rear']>=1,rear)
 # Actual draw transforms on receiver and attachment rendering.
 frame=p.evaluate('''()=>{const P=CanvasRenderingContext2D.prototype,orig={},rows=[],r=__DL.readState().run;let found=[];
 for(const method of ['roundRect','fillRect','moveTo']){orig[method]=P[method];P[method]=function(...a){const p=DL35Weapon.state.lastPose,t=this.getTransform(),s=__DL.v20PerfState().renderScale;if(this.canvas.id==='game'&&p&&Math.abs(t.e-p.anchorX*s)<.001&&Math.abs(t.f-p.anchorY*s)<.001&&Math.abs(t.a-Math.cos(p.angle)*s)<1e-5)found.push((t.a*t.d-t.b*t.c)/(s*s));return orig[method].apply(this,a);};}
 try {for(const v of ['front'])for(const mode of ['quality','balanced','performance'])for(const w of __DL.getDefs().WEAPONS){__DL.readState().wave.fronts.view=v;__DL.setSettings({performanceMode:mode});r.activeId=w.id;__DL.setTimers({reload:0,cooldown:0});__DL.setScreenAim(650,420);found=[];__DL.render();rows.push({id:w.id,v,mode,count:found.length,ok:found.length>0&&found.every(x=>Math.abs(x+1)<1e-7)});}return rows;}finally{for(const method in orig)P[method]=orig[method];}}''')
 ck('135 rendus avant de boîtier : matrice de dessin corrigée',len(frame)==135 and all(r['ok'] for r in frame),{'bad':[r for r in frame if not r['ok']]})
 # All native mechanisms at multiple fractions, hand remains on the real moving feed path.
 reloads=[]
 for view in ['front']:
  for id in ['pistol','revolver','assault','lmg','sniper','pump','lever','double','launcher','harpoon','flamer']:
   p.evaluate(PRACTICE,[id,view]);rows=p.evaluate('''()=>{const r=__DL.readState().run,inv=r.weapons[r.activeId];inv.mag=0;inv.reserve=300;__DL.reload();const out=[];for(const t of [.14,.3,.5,.7,.86]){__DL.setReloadProgress(t);__DL.render();const s=__DL.dl408.state(),p=DL35Weapon.state.lastPose,h=s.hands;out.push({kind:h.kind,t,grip:h.rightLocal,hand:h.left,origin:h.leftOrigin,gun:__DL.dl403.state().gunPasses,feed:__DL.dl404.state().feedDraws,contactError:h.contact?Math.hypot(h.left.x-h.contact.x,h.left.y-h.contact.y):null});}return out;}''')
   for r in rows:r.update(id=id,view=view)
   reloads+=rows
 ck('55 poses de recharge avant : main droite fixée à la poignée',len(reloads)==55 and all(r['grip']==next(x for x in reloads if x['id']==r['id'] and x['view']==r['view'])['grip'] for r in reloads))
 ck('55 poses avant : main gauche suit alimentation, chambre ou garde-main',all(r['contactError'] is not None and r['contactError']<1e-7 and r['feed']==1 and r['gun']==1 for r in reloads),{'bad':[r for r in reloads if r['contactError'] is None or r['contactError']>1e-7]})
 # A moving aim must not retroactively change a grenade's launch origin.
 p.evaluate(PRACTICE,['launcher','front'])
 flight=p.evaluate('''()=>{const s=__DL.readState();__DL.setScreenAim(640,370);__DL.fire();const pr=__DL.getEffects().projectiles.find(x=>x.kind==='grenade');pr.t=.14;const a=__DL.dl408.depthThrown(pr),launch=JSON.stringify(pr.dl408Launch);__DL.setScreenAim(1320,660);__DL.render();const c=__DL.dl408.depthThrown(pr);return{a,c,launch,after:JSON.stringify(pr.dl408Launch),target:[pr.tx,pr.ty]};}''')
 ck('Lanceur : déplacer la visée ne déplace pas le projectile déjà parti',flight['a']==flight['c'] and flight['launch']==flight['after'],flight)
 p.evaluate(PRACTICE,['assault','rear']);throw=p.evaluate('''()=>{__DL.readState().run.inventory[0]=2;__DL.setScreenAim(650,400);__DL.grenade();const pr=__DL.getEffects().projectiles.find(x=>x.kind==='grenade');pr.t=.1;const a=__DL.dl408.depthThrown(pr);__DL.setScreenAim(1280,250);__DL.render();return{a,b:__DL.dl408.depthThrown(pr)};}''')
 ck('Grenade à main : origine de trajectoire conservée en contrechamp',throw['a']==throw['b'],throw)
 # Actual shooter in each camera: fired tracer follows the drawn body, not its former position.
 allies=[]
 for view in ['right','left','front','rear']:
  p.evaluate('''v=>{__DL.showMenu();__DL.startNew('campaign');const r=__DL.readState().run;r.allies={shooter:{active:true}};r.cash=99999;__DL.start();__DL.clearEnemies();__DL.readState().wave.fronts.view=v;const z=__DL.spawn('walker');z.x=780;z.lane=0;z.feet=494;z.hp=z.maxHp=10000;__DL.readState().wave.allyTimers.shooter=0;__DL.step(.05);__DL.render();}''',view)
  a=p.evaluate('''()=>{const tr=__DL.getEffects().tracers.find(t=>t.actorId==='shooter'),m=__DL.dl408.crewMuzzle('shooter'),v=__DL.currentView();return{view:v,exists:!!tr,origin:tr?__DL.worldScreen(tr.x,tr.y,tr.y):null,m,damage:__DL.readState().enemies[0].hp};}''');allies.append(a)
 ck('Tir allié : émetteur identifié dans les quatre vues',all(r['exists'] for r in allies),allies)
 ck('Tir allié de profil raccordé au corps déplacé',all(abs(r['origin']['x']-r['m']['x'])<1e-6 and abs(r['origin']['y']-r['m']['y'])<1e-6 for r in allies if r['view'] in ['left','right']))
 # Real ballistic outcome baseline/new, same seeded shots; effects may change only their positions.
 shotfn='''()=>{const s=__DL.readState(),id=s.run.activeId,z=s.enemies.find(e=>!e.dead),q=__DL.projectedEnemy(z),inv=s.run.weapons[id];z.hp=z.maxHp=100000;z.stun=20;__DL.setScreenAim(q.x,q.body);__DL.setTimers({cooldown:0,reload:0});__DL.setBallisticSeed(19373);const ammo=inv.mag;__DL.fire();__DL.advance(1.35);return {spent:ammo-inv.mag,hp:z.hp,mag:inv.mag,reserve:inv.reserve,kills:s.wave.kills,shots:s.wave.shots,hits:s.wave.hits};}'''
 outcomes=[]
 for view in ['right','left','front','rear']:
  for id in ['pistol','revolver','assault','pump','sniper','lmg','launcher','harpoon','flamer']:
   pair=[]
   for pg in [old,p]:pg.evaluate(PRACTICE,[id,view]);pair.append(pg.evaluate(shotfn));pg.evaluate('__DL.leavePractice()')
   outcomes.append({'id':id,'view':view,'same':pair[0]==pair[1],'before':pair[0],'after':pair[1]})
  group=[r for r in outcomes if r['view']==view];ck('Échantillon balistique identique à 0.40.7 — '+view,all(r['same'] for r in group),{'cases':len(group),'bad':[r for r in group if not r['same']]})
 p.close();old.close();b.close()
ck('Aucune erreur JavaScript sur les nouveaux parcours',not errors,errors)
out={'version':'0.41.0','passed':sum(c['ok'] for c in checks),'total':len(checks),'errors':errors,'checks':checks,'failed':[c for c in checks if not c['ok']],'actorCases':scales,'poseCases':poses,'frameCases':frame,'reloadCases':reloads,'shotComparisons':outcomes,'method':'Vrais moteurs 0.40.7 et 0.41.0, URI raster réduites seulement. Transforms Canvas observés sans remplacer le dessin.'}
(R/'rapports/SPATIAL_QA.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({k:out[k] for k in ['passed','total','errors']}));sys.exit(1 if out['failed'] else 0)
