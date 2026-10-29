from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
tiny='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',tiny,s)
checks=[];errors=[]
def ck(n,v,d=None):checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);p=b.new_page(viewport={'width':1440,'height':900});p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank?test=1');p.set_content(light,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(120);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false});__DL.startNew("campaign");__DL.start();__DL.stopLoop();__DL.readState().wave.fronts.view="rear";__DL.clearEnemies();__DL.render()')
 before=p.evaluate('DL35Weapon.state.draws');p.evaluate('__DL.render()');after=p.evaluate('DL35Weapon.state.draws');st=p.evaluate('__DL.dl410.state()');m=p.evaluate('__DL.dl410.rearMuzzle()');pl=p.evaluate('__DL.dl410.rearPlayer()')
 ck('Vue arrière sans arme FPS',after==before,(before,after));ck('Joueur distant visible',st['rearPlayerDraws']>0 and pl['feet']<520,pl);ck('Muzzle arrière distant',m['y']<520,m)
 ids=[]
 for i in range(24):ids.append(p.evaluate('(i)=>{const z=__DL.spawn("walker");z.lane=0;z.feet=494;z.x=240;z.id=500+i;return z.id}',i))
 xs=p.evaluate('ids=>ids.map(id=>{const z=__DL.readState().enemies.find(e=>e.id===id);return __DL.dl410.projected(z,"rear").x})',ids);ck('Voie répartie sur large bande',max(xs)-min(xs)>500,(min(xs),max(xs)))
 p.evaluate('__DL.clearEnemies()');a=[];bb=[]
 for i in range(20):a.append(p.evaluate('(i)=>{const z=__DL.spawn("walker");z.lane=0;z.feet=494;z.x=260;z.id=700+i;return z.id}',i));bb.append(p.evaluate('(i)=>{const z=__DL.spawn("walker");z.lane=1;z.feet=620;z.x=260;z.id=900+i;return z.id}',i))
 spans=p.evaluate('([a,b])=>{const es=__DL.readState().enemies,xs=arr=>arr.map(id=>__DL.dl410.projected(es.find(e=>e.id===id),"rear").x);return{a:xs(a),b:xs(b)}}',[a,bb]);amin,amax=min(spans['a']),max(spans['a']);bmin,bmax=min(spans['b']),max(spans['b']);ck('Bandes A/B se recouvrent',max(amin,bmin)<min(amax,bmax),(amin,amax,bmin,bmax))
 tid=a[5];hit=p.evaluate('id=>{const z=__DL.readState().enemies.find(e=>e.id===id),q=__DL.dl410.projected(z,"rear"),hs=__DL.screenHit(q.x,q.body);return hs.some(h=>h?.z?.id===id)}',tid);ck('Hit-test suit projection',hit)
 p.evaluate('__DL.readState().wave.fronts.view="front";__DL.clearEnemies();__DL.render()');f0=p.evaluate('DL35Weapon.state.draws');p.evaluate('__DL.render()');f1=p.evaluate('DL35Weapon.state.draws');ck('Front conserve arme FPS',f1>f0,(f0,f1))
 p.evaluate('__DL.readState().wave.fronts.view="rear";let r=__DL.readState().run;r.activeId="pistol";r.weapons.pistol.mag=9;__DL.setScreenAim(720,440);__DL.setTimers({cooldown:0,reload:0});');n=p.evaluate('__DL.getEffects().tracers.length');p.evaluate('__DL.fire()');tr=p.evaluate('(n)=>__DL.getEffects().tracers.slice(n).find(t=>t.screen&&!t.ally)||null',n);rm=p.evaluate('__DL.dl410.rearMuzzle()');ck('Traceur part du joueur distant',tr is not None and abs(tr['x']-rm['x'])<3 and abs(tr['y']-rm['y'])<3,(tr,rm));ck('Aucune erreur JS',not errors,errors);b.close()
res={'passed':sum(c['ok'] for c in checks),'total':len(checks),'errors':errors,'checks':checks};(R/'rapports/DEPTH_0410_QA.json').write_text(json.dumps(res,ensure_ascii=False,indent=2));print(json.dumps(res,ensure_ascii=False));sys.exit(0 if res['passed']==res['total'] and not errors else 1)
