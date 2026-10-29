"""Actual game screenshots with original embedded art. Memory Storage is solely
for about:blank capture; game states explicitly arranged, no UI substitutes.
"""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];O=R/'previews';O.mkdir(exist_ok=True);os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY']='1'
report={'version':'0.40.7','method':'HTML final avec 252 ressources originales. Profils/cas arrangés pour montrer les fonctions, moteur et boutons réels. Captures about:blank avec Storage en mémoire propre au banc ; aucune CSS ne masque un contrôle.','errors':[],'captures':[]}
def boot(b,path):
 p=b.new_page(viewport={'width':1600,'height':1000});p.set_default_timeout(15000);p.on('pageerror',lambda e:report['errors'].append(str(e)));p.goto('about:blank?test=1');p.evaluate('''()=>{const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}},configurable:true});}''')
 h=path.read_text();p.evaluate('document.open()')
 for i in range(0,len(h),500000):p.evaluate('(s)=>document.write(s)',h[i:i+500000])
 p.evaluate('document.close()');p.wait_for_function('__DL.v24ArtStatus().settled',timeout=45000);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,reducedFlashes:true})');p.wait_for_timeout(700);return p
def camp(p,mode='campaign'):
 p.evaluate('''mode=>{__DL.startNew(mode);const r=__DL.readState().run;r.cash=1450;r.allies={airGunner:{active:true},airObserver:{active:true}};r.weapons.rifle={mag:2,reserve:38,level:0};r.weapons.pump={mag:4,reserve:26,level:0};r.loadout=['rifle','pump'];r.activeId='rifle';r.inventory=[1,1,1];r.wall=135;r.health=76;r.equipment={generator:1,turret:1,spotlight:1,pulse:1};r.fuel=9;r.turretAmmo=0;__DL.setTab('readiness');}''',mode);p.wait_for_timeout(850)
def shot(p,n,canvas=False):
 p.evaluate('__DL.refresh();__DL.render()');p.wait_for_timeout(450);(p.locator('#game') if canvas else p).screenshot(path=str(O/(n+'.png')),timeout=20000);report['captures'].append({'file':n+'.png','phase':p.evaluate('__DL.snapshot().phase'),'viewport':p.viewport_size,'originalArt':True});print(n,flush=True)
PLAY='''t=>{let time=0;while(time<t&&__DL.snapshot().phase==='combat'){const s=__DL.readState(),z=s.enemies.filter(z=>!z.dead&&__DL.targetVisible(z)).sort((a,b)=>b.x-a.x)[0];if(z){const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.fire();}__DL.step(.05);time+=.05;}}'''
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 p=boot(b,R/'base/0.40.6.html');camp(p);shot(p,'avant-preparation');p.close()
 p=boot(b,R/'JOUER_DERNIERE_LIGNE.html');report['art']=p.evaluate('__DL.v24ArtStatus()');shot(p,'accueil');camp(p);shot(p,'preparation')
 p.locator('#dl407-review').click();p.evaluate('__DL.dl407.pick(["health","ammo:rifle","ammo:pump","supply:1","fuel","turret"],true)');shot(p,'devis');report['quote']=p.evaluate('__DL.dl407.quote()');p.locator('#dl407-apply').click();p.wait_for_timeout(2200)
 p.locator('.dl407-section summary').filter(has_text='Défenseurs et fouille').click();p.locator('.dl407-crew').scroll_into_view_if_needed();shot(p,'defenseurs')
 p.evaluate('__DL.readState().run.turretAmmo=0;__DL.start();__DL.stopLoop();__DL.readState().wave.fronts.view="front";__DL.advance(4)');p.evaluate(PLAY,7);shot(p,'couverture-en-combat',True);p.evaluate('__DL.pause()');p.locator('#dl407-post-status').click();p.wait_for_timeout(4200);shot(p,'situation-poste');report['post']=p.evaluate('__DL.dl407.status()');p.locator('#dl407-status-back').click();p.evaluate('__DL.showMenu()')
 camp(p,'dark');p.evaluate('''()=>{const r=__DL.readState().run;r.allies={darkTech:{active:true},towerGuard:{active:true}};r.dark.circuits=[100,0,100,76,100,0];r.dark.fuses=0;__DL.setTab('readiness')}''');p.wait_for_timeout(600);shot(p,'preparation-zone-noire')
 p.locator('#dl407-review').click();p.evaluate('__DL.dl407.pick(["circuit:0","fuse"])');shot(p,'circuits-devis');p.locator('#dl407-apply').click();p.wait_for_timeout(2000)
 for w,h,n in [(896,414,'devis-paysage'),(414,896,'devis-portrait')]:
  p.set_viewport_size({'width':w,'height':h});p.locator('#dl407-review').click();p.evaluate('__DL.dl407.pick(["health","ammo:rifle"],true)');p.locator('.dl407-review h2').scroll_into_view_if_needed();p.wait_for_timeout(4200);shot(p,n);p.locator('#dl407-review-close').click()
 p.set_viewport_size({'width':414,'height':896});p.evaluate('__DL.start();__DL.stopLoop();__DL.advance(.1);__DL.pause()');p.locator('#dl407-post-status').click();shot(p,'situation-portrait');report['artFinal']=p.evaluate('__DL.v24ArtStatus()');p.close();b.close()
(R/'rapports/CAPTURES_0407.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'art':report['art'],'errors':report['errors'],'captures':len(report['captures'])}),flush=True)
