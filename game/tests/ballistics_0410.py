from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
T='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
def light(path): return re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',T,path.read_text())
def load(b,path):
 p=b.new_page(viewport={'width':960,'height':600}); p.set_default_timeout(10000); p.goto('about:blank?test=1'); p.set_content(light(path),wait_until='domcontentloaded',timeout=30000); p.wait_for_timeout(100); p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,activeReload:false,sound:false,motion:false,reducedFlashes:true})'); return p
RUN_JS=r'''()=>{
 const result=[];
 const views=['right','left','front','rear'];
 const weapons=__DL.getDefs().WEAPONS.map(w=>w.id);
 for(const view of views) for(const id of weapons){
   __DL.showMenu(); __DL.showPractice(id); __DL.beginPractice({gun:id,enemy:'walker',view,distance:'near',motion:'still',group:1}); __DL.stopLoop();
   const s=__DL.readState(), z=s.enemies.find(e=>!e.dead), q=__DL.projectedEnemy(z), inv=s.run.weapons[id];
   z.hp=z.maxHp=100000; z.stun=20; __DL.setScreenAim(q.x,q.body); __DL.setTimers({cooldown:0,reload:0}); __DL.setBallisticSeed(19373);
   const ammo=inv.mag; __DL.fire(); __DL.advance(1.35);
   result.push({id,view,spent:ammo-inv.mag,hp:z.hp,mag:inv.mag,reserve:inv.reserve,kills:s.wave.kills,shots:s.wave.shots,hits:s.wave.hits});
   __DL.leavePractice();
 }
 return result;
}'''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 old=load(b,R/'base/0.40.7.html'); new=load(b,R/'JOUER_DERNIERE_LIGNE.html')
 a=old.evaluate(RUN_JS); c=new.evaluate(RUN_JS)
 old.close(); new.close(); b.close()
key=lambda x:(x['view'],x['id'])
A={key(x):x for x in a}; C={key(x):x for x in c}; fields=['spent','hp','mag','reserve','kills','shots','hits']
bad=[]
for k in sorted(A):
 if any(A[k][f]!=C[k][f] for f in fields): bad.append({'key':k,'before':A[k],'after':C[k]})
checks=[]
for view in ['right','left','front','rear']:
 total=sum(1 for k in A if k[0]==view); fail=sum(1 for x in bad if x['key'][0]==view); ok=total==45 and fail==0; checks.append({'view':view,'ok':ok,'cases':total,'failed':fail}); print(('OK ' if ok else 'FAIL ')+f'Balistique stable — {view}: {total-fail}/{total}',flush=True)
out={'version':'0.41.0','passed':sum(x['ok'] for x in checks),'total':len(checks),'cases':len(A),'checks':checks,'bad':bad}
(R/'rapports/BALLISTICS_0410_QA.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'passed':out['passed'],'total':out['total'],'cases':out['cases'],'bad':len(bad)},ensure_ascii=False))
sys.exit(0 if not bad and len(A)==180 else 1)
