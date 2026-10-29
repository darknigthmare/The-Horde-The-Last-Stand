from pathlib import Path
import re,json,sys,math
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
tiny='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',tiny,s)
checks=[];errors=[]
def ck(group,name,v,d=None):
    checks.append({'qa':group,'test':name,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+group+' · '+name,flush=True)
# Static guard: the obsolete procedural survivor must really be gone from the built file.
ck('QA1 contrechamp','ancien survivant procédural absent',"The player is visibly in the defended post" not in s and "ellipse(720,y-46,8,10" not in s)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    p=b.new_page(viewport={'width':1440,'height':900});p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto('about:blank?test=1');p.set_content(light,wait_until='domcontentloaded',timeout=30000);p.wait_for_timeout(150)
    p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,reducedFlashes:true,damageNumbers:true});__DL.startNew("campaign");__DL.start();__DL.stopLoop();')
    # QA1: rear countershot owns no FPS rig and owns exactly one tracked survivor pass.
    p.evaluate('__DL.readState().wave.fronts.view="rear";__DL.clearEnemies();__DL.render()')
    before=p.evaluate('DL35Weapon.state.draws');p.evaluate('__DL.render()');after=p.evaluate('DL35Weapon.state.draws')
    st=p.evaluate('__DL.dl411.state()');passes=p.evaluate('__DL.dl403.state().playerPasses')
    ck('QA1 contrechamp','aucun rendu arme FPS arrière',after==before,(before,after));ck('QA1 contrechamp','un seul passage joueur arrière',passes==1,passes);ck('QA1 contrechamp','survivant arrière effectivement rendu',st['rearPlayerPasses']>0,st)
    # QA2: broad, perspective-bound frontage on both depth views.
    for view in ('front','rear'):
        p.evaluate('__DL.readState().wave.fronts.view="'+view+'";__DL.clearEnemies()')
        ids=[]
        for i in range(48):
            ids.append(p.evaluate('(i)=>{const z=__DL.spawn(i%9===0?"runner":"walker");z.lane=i%2;z.x=760;z.feet=z.lane?620:494;z.id=4000+i;return z.id}',i))
        info=p.evaluate('ids=>{const es=__DL.readState().enemies;let xs=[],bad=0,by=[[],[]],range=[0,0],full=0;for(const id of ids){const z=es.find(e=>e.id===id),q=__DL.dl411.projected(z,__DL.currentView()),c=__DL.dl411.corridor(z,__DL.currentView());xs.push(q.x);by[z.lane].push(q.x);range[z.lane]=c.hi-c.lo;full=c.innerR-c.innerL;if(q.x<c.innerL-.1||q.x>c.innerR+.1)bad++;}return{xs,by,bad,range,full}}',ids)
        span=max(info['xs'])-min(info['xs']);span0=max(info['by'][0])-min(info['by'][0]);span1=max(info['by'][1])-min(info['by'][1]);over=max(min(info['by'][0]),min(info['by'][1]))<min(max(info['by'][0]),max(info['by'][1]))
        total_ratio=span/max(1,info['full']);lane_ratios=(span0/max(1,info['range'][0]),span1/max(1,info['range'][1]))
        ck('QA2 largeur',view+' · corridor largement occupé',total_ratio>.72,(span,info['full'],total_ratio));ck('QA2 largeur',view+' · deux bandes réellement exploitées',min(lane_ratios)>.62,(span0,span1,info['range'],lane_ratios));ck('QA2 largeur',view+' · bandes se recouvrent sans sortir du terrain',over and info['bad']==0,(over,info['bad']))
    # QA3: screen hit and feedback remain attached to a widely offset target.
    p.evaluate('__DL.readState().wave.fronts.view="rear";__DL.clearEnemies();const z=__DL.spawn("walker");z.lane=0;z.x=700;z.feet=494;z.id=8888;')
    q=p.evaluate('()=>{const z=__DL.readState().enemies[0];return __DL.dl411.projected(z,"rear")}')
    hit=p.evaluate('q=>__DL.screenHit(q.x,q.body).some(h=>h.z?.id===8888)',q);ck('QA3 impacts','hit-test suit la silhouette élargie',hit,q)
    beforefx=p.evaluate('__DL.getEffects().particles.length');p.evaluate('__DL.hit(__DL.readState().enemies[0],7,false,"player")')
    fx=p.evaluate('(n)=>{const a=__DL.getEffects().particles.slice(n);const z=__DL.readState().enemies[0],q=__DL.dl411.projected(z,"rear");return {points:a.map(v=>__DL.worldScreen(v.x,v.y,v.ground,"rear")),qx:q.x}}',beforefx)
    avg=sum(v['x'] for v in fx['points'])/max(1,len(fx['points']));ck('QA3 impacts','particules raccordées à la position visible',len(fx['points'])>0 and abs(avg-fx['qx'])<28,(avg,fx['qx']))
    # Ally fire must also end at the visible target, not at the hidden lane centre.
    p.evaluate('''()=>{const r=__DL.readState().run;r.allies.shooter={active:true};const w=__DL.readState().wave;w.allyTimers.shooter=0;const z=__DL.readState().enemies[0];z.dead=false;z.hp=z.maxHp=500;z.x=820;}''')
    tr0=p.evaluate('__DL.getEffects().tracers.length');p.evaluate('__DL.step(.06)')
    ali=p.evaluate('(n)=>__DL.getEffects().tracers.slice(n).find(t=>t.ally)||null',tr0)
    target=p.evaluate('()=>{const z=__DL.readState().enemies[0];return __DL.dl411.worldPoint(z,z.feet-45*z.size,"rear")}')
    ck('QA3 impacts','trace allié en coordonnées écran',ali is not None and ali.get('screen') is True,ali);ck('QA3 impacts','trace allié termine sur le corps visible',ali is not None and abs(ali['tx']-target['x'])<5 and abs(ali['ty']-target['y'])<5,(ali,target))
    # Player grenade and launcher-like thrown projectiles lock their visual destination to the reticle.
    p.evaluate('__DL.readState().run.inventory[0]=3;__DL.setScreenAim(1075,510);')
    pr0=p.evaluate('__DL.getEffects().projectiles.length');p.evaluate('__DL.grenade()')
    proj=p.evaluate('(n)=>__DL.getEffects().projectiles.slice(n).find(x=>x.kind==="grenade"&&!x.support)||null',pr0)
    ck('QA3 impacts','grenade mémorise le réticule profondeur',proj is not None and proj.get('dl411TargetScreen',{}).get('x')==1075,proj.get('dl411TargetScreen') if proj else None)
    if proj:
        end=p.evaluate('(p)=>{p.t=p.duration;return __DL.dl411.thrown(p)}',proj)
        ck('QA3 impacts','grenade termine visuellement au réticule',abs(end['x']-1075)<1 and abs(end['y']-510)<1,end)
    # QA4: transition stress across all views, pause and repeat renders.
    counts=[]
    for view in ('front','rear','left','right','rear','front'):
        data=p.evaluate('''v=>{__DL.readState().wave.fronts.view=v;__DL.setPhase("combat");__DL.render();__DL.render();const st=__DL.dl403.state();return{view:v,gun:st.gunPasses,player:st.playerPasses,draws:DL35Weapon.state.draws}}''',view);counts.append(data)
    rear_ok=all(x['gun']==0 for x in counts if x['view']=='rear');front_ok=all(x['gun']==1 for x in counts if x['view']=='front')
    ck('QA4 transitions','aucun rig ne revient après plusieurs bascules arrière',rear_ok,counts);ck('QA4 transitions','rig avant reste unique après bascules',front_ok,counts)
    p.evaluate('__DL.readState().wave.fronts.view="rear";__DL.pause();__DL.render();__DL.unpause();__DL.render()')
    ck('QA4 transitions','pause/reprise sans erreur',not errors,errors)
    b.close()
ck('QA4 transitions','aucune erreur JavaScript',not errors,errors)
res={'version':'0.41.0','passed':sum(c['ok'] for c in checks),'total':len(checks),'errors':errors,'checks':checks}
(R/'rapports/FRONTS_0410_QA.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
print(json.dumps({'passed':res['passed'],'total':res['total'],'errors':errors},ensure_ascii=False));sys.exit(0 if res['passed']==res['total'] and not errors else 1)
