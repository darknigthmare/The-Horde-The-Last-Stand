"""Full embedded art and actual native render, arranged scenes; no fake game canvas.
Storage shim only in this capture environment (about:blank). No asset replacement.
Transient announcement/toast visibility removed identically in before/after captures.
"""
from pathlib import Path
from io import BytesIO
import json,os,time
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];O=R/'previews/0408';O.mkdir(parents=True,exist_ok=True)
os.environ['PW_TEST_SCREENSHOT_NO_FONTS_READY']='1';errors=[]
def boot(b,path):
 p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(14000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank?test=1')
 p.evaluate('''()=>{const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}},configurable:true});}''')
 h=path.read_text();p.evaluate('document.open()')
 for i in range(0,len(h),500000):p.evaluate('(s)=>document.write(s)',h[i:i+500000])
 p.evaluate('document.close()');p.wait_for_function('__DL.v24ArtStatus().settled',timeout=40000);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,activeReload:false,reducedFlashes:true,motion:false,artCreatures:true})');return p
SETUP='''({family,night=1,view='front',gun='assault',reload=0,aim=[650,430]})=>{
 __DL.showMenu();const modes={main:'campaign',relief:'campaign',north:'north',metro:'metro',air:'air',highway:'highway',water:'water',tower:'tower',dark:'dark'};__DL.startNew(modes[family]||family);const r=__DL.readState().run;if(family==='relief')r.mode='relief';r.night=night;r.lastSettled=night-1;r.cash=99999;
 r.allies={shooter:{active:true},engineer:{active:true}};const wm={};for(const w of __DL.getDefs().WEAPONS){r.weapons[w.id]??={mag:w.mag,reserve:300,level:0};wm[w.id]={kills:1000,headshots:250,damage:100000};}__DL.setMeta({xp:999999,weaponMastery:wm});r.loadout=[gun,null];r.activeId=gun;
 __DL.start();__DL.stopLoop();__DL.clearEnemies();__DL.readState().wave.fronts.view=view;
 const defs=__DL.getDefs(),roster=__DL.buildWave(night);for(const [x,lane] of [[680,0],[940,1]]){const type=family==='main'?'walker':roster.find(t=>!defs.BOSS_RULES?.[t])||'walker';const z=__DL.spawn(type);z.x=x;z.lane=lane;z.feet=lane?620:494;z.step=0;z.hit=0;}
 if(reload){r.weapons[gun].mag=0;__DL.reload();__DL.setReloadProgress(reload);}
 if(family==='dark'&&__DL.getLightState){__DL.setLightCircuit('A2',0);}
 __DL.setScreenAim(...aim);document.querySelector('#bigAnnouncement').classList.remove('visible');document.querySelector('#toast').classList.remove('visible');__DL.render();return {site:__DL.siteFor().id,view:__DL.currentView(),phase:__DL.snapshot().phase,pose:DL35Weapon.state.lastPose};}'''
# Get actual method signature for dark no assumption needed; leave circuits original if helper absent.
SETUP=SETUP.replace("if(family==='dark'&&__DL.getLightState){__DL.setLightCircuit('A2',0);}","")
cases=[('profil','main',1,'right','assault',0),('profil-inverse','main',1,'left','assault',0),('fps','main',1,'front','assault',0),('contrechamp','main',1,'rear','assault',0),('recharge','main',1,'front','assault',.6),('metro','metro',1,'right','assault',0),('autoroute','highway',7,'left','assault',0),('navire','water',5,'right','deckCarbine',0),('avion','air',1,'front','airDoorGun',0),('palier','tower',4,'right','towerCarbine',0),('ombre','dark',4,'front','pump',0),('pistolet','main',1,'front','pistol',0),('barillet','main',1,'front','revolver',.45),('bascule','main',1,'front','double',.55),('reservoir','main',1,'front','flamer',.55),('bande','main',1,'front','lmg',.5),('tube','main',1,'front','lever',.42),('chambre','main',1,'front','launcher',.64),('cable','main',1,'front','harpoon',.48),('visee-basse','main',1,'front','assault',0)]
records=[];art={};gallery=[]
def snap(p,path):
 raw=p.locator('#game').screenshot(type='png');im=Image.open(BytesIO(raw)).convert('RGB');im.save(path,format='WEBP',quality=87);return im
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for version,file in [('avant',R/'base/0.40.7.html'),('apres',R/'JOUER_DERNIERE_LIGNE.html')]:
  p=boot(b,file);art[version]=p.evaluate('__DL.v24ArtStatus()');print(version,art[version]['loaded'],art[version]['total'],flush=True)
  for name,family,night,view,gun,reload in cases:
   config=dict(family=family,night=night,view=view,gun=gun,reload=reload,aim=[1200,745] if name=='visee-basse' else [650,430]);q=p.evaluate(SETUP,config);target=O/f'{version}-{name}.webp';snap(p,target);records.append({'version':version,'name':name,'settings':config,'scene':q,'file':str(target.relative_to(R))});print(version,name,flush=True)
  if version=='apres':
   # Frozen real-mode gallery for all 37 authored locations in all four views.
   sceneData=json.loads((R/'rapports/VISUEL_QA.json').read_text())['sceneCases'];unique={}
   for row in sceneData:unique.setdefault((row['site'],row['view']),row)
   D=O/'terrains';D.mkdir(exist_ok=True)
   for (site,view),row in unique.items():
    q=p.evaluate(SETUP,dict(family=row['family'],night=row['stage'],view=view,gun='assault'));f=D/f'{site}-{view}.webp';snap(p,f);gallery.append({'site':site,'view':view,'family':row['family'],'file':str(f.relative_to(R))})
   # Full production menu without __DL is checked by regression; this is the native render/menu.
   p.evaluate('__DL.showMenu();__DL.dl403.page("home")');p.screenshot(path=str(O/'menu.png'))
  p.close()
 b.close()
# Thumbnail contact sheets for visual QA. These are exact crops/scales of actual screenshots.
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(fontpath,14)
for view in ['right','left','front','rear']:
 rows=[g for g in gallery if g['view']==view];cols=4;tw,th=432,270;canvas=Image.new('RGB',(cols*tw,((len(rows)+cols-1)//cols)*(th+25)),(10,16,19));d=ImageDraw.Draw(canvas)
 for i,g in enumerate(rows):
  x,y=(i%cols)*tw,(i//cols)*(th+25);im=Image.open(R/g['file']).resize((tw,th));canvas.paste(im,(x,y+25));d.text((x+8,y+5),g['site']+' / '+view,fill=(224,202,155),font=font)
 canvas.save(O/f'contact-{view}.jpg',quality=88)
out={'version':'0.40.8','art':art,'cases':records,'gallery':gallery,'errors':errors,'method':'Moteur réel, images intégrales. Scènes arrangées identiques avant/après ; notifications fugitives masquées. localStorage en mémoire dans about:blank uniquement pour captures. Aucun rendu de jeu factice.'}
(R/'rapports/CAPTURES_0408.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print('FIN',len(records),len(gallery),errors,flush=True)
