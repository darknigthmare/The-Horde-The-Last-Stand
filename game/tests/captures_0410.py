from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
out=R/'previews/0410'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);p=b.new_page(viewport={'width':1440,'height':900});p.goto('about:blank?test=1');p.set_content(html,wait_until='domcontentloaded',timeout=60000);p.wait_for_timeout(1000);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,reducedFlashes:true});__DL.startNew("campaign");__DL.start();__DL.stopLoop()')
 for view,name in [('front','front-large-horde.png'),('rear','rear-countershot.png')]:
  p.evaluate('''v=>{__DL.readState().wave.fronts.view=v;__DL.clearEnemies();for(let i=0;i<28;i++){const z=__DL.spawn(i%7===0?'runner':'walker');z.lane=i%2;z.feet=z.lane?620:494;z.x=190+(i%7)*70;z.id=2000+i;}__DL.setScreenAim(720,430);__DL.render();}''',view);p.locator('#game').screenshot(path=str(out/name))
 b.close()
print(out)
