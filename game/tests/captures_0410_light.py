from pathlib import Path
import re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
tiny='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',tiny,s)
out=R/'previews'/'0410-final';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1440,'height':900});p.goto('about:blank?test=1');p.set_content(light,wait_until='domcontentloaded',timeout=30000);p.wait_for_timeout(120)
 p.evaluate('''()=>{__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,reducedFlashes:true,artActorsV26:false,artBossesV26:false,artEffectsV26:false,damageNumbers:true});__DL.startNew("campaign");__DL.start();__DL.stopLoop();document.querySelector('#toast')?.classList.remove('visible');document.querySelector('#profileWarning')?.classList.add('hidden');}''')
 for view,name in [('front','front-large-horde.png'),('rear','rear-countershot.png')]:
  p.evaluate('''v=>{__DL.readState().wave.fronts.view=v;__DL.clearEnemies();for(let i=0;i<34;i++){const z=__DL.spawn(i%8===0?'runner':i%11===0?'armored':'walker');z.lane=i%2;z.x=180+(i%9)*90;z.feet=z.lane?620:494;z.id=6200+i;}__DL.setScreenAim(v==='rear'?1060:720,450);__DL.render();document.querySelector('#toast')?.classList.remove('visible');document.querySelector('#profileWarning')?.classList.add('hidden');}''',view)
  p.locator('#game').screenshot(path=str(out/name))
 # Hit feedback capture on a very offset target.
 p.evaluate('''()=>{__DL.readState().wave.fronts.view='rear';__DL.clearEnemies();for(let i=0;i<14;i++){const z=__DL.spawn(i%3?'walker':'runner');z.lane=i%2;z.x=520+i*24;z.feet=z.lane?620:494;z.id=7100+i;}const z=__DL.readState().enemies[5],q=__DL.dl411.projected(z,'rear');__DL.setScreenAim(q.x,q.body);__DL.hit(z,12,false,'player');__DL.render();document.querySelector('#toast')?.classList.remove('visible');document.querySelector('#profileWarning')?.classList.add('hidden');}''')
 p.locator('#game').screenshot(path=str(out/'rear-impact-aligned.png'))
 b.close()
print(out)
