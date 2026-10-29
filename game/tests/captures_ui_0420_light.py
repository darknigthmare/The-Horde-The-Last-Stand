from pathlib import Path
import re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
tiny='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',tiny,s)
out=R/'previews'/'0420'; out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    p=b.new_page(viewport={'width':1440,'height':900})
    p.goto('about:blank?test=1')
    p.set_content(light,wait_until='domcontentloaded',timeout=30000)
    p.wait_for_timeout(180)
    p.screenshot(path=str(out/'menu-ui-light.png'))
    p.evaluate("""()=>{if(window.__DL?.stopLoop)__DL.stopLoop(); __DL.startNew('campaign'); if(window.__DL?.stopLoop)__DL.stopLoop();}""")
    p.wait_for_timeout(150)
    p.screenshot(path=str(out/'camp-ui-light.png'))
    b.close()
print(out)
