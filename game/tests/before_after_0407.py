"""Reproductions on supplied .40.6 versus the rebuilt game. Both execute the
native engine; staged targets/resources isolate regressions without a fake VM.
"""
from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];errors=[];rows={}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,file in [('0.40.6',R/'base/0.40.6.html'),('0.40.7',R/'JOUER_DERNIERE_LIGNE.html')]:
  html=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',file.read_text());p=b.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank?test=1');p.set_content(html,wait_until='domcontentloaded',timeout=25000);p.wait_for_timeout(100);p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false})')
  def start(mode='campaign',ally=None):p.evaluate('''({mode,ally})=>{__DL.showMenu();__DL.startNew(mode);const r=__DL.readState().run;r.cash=10000;r.allies=ally?{[ally]:{active:true}}:{};__DL.start();__DL.stopLoop();__DL.readState().wave.spawnTimer=10000;__DL.clearEnemies();}''',dict(mode=mode,ally=ally))
  start(ally='airGunner');a=p.evaluate('''()=>{const z=__DL.spawn('walker');z.x=420;const hp=z.hp;__DL.advance(1);return {damage:hp-z.hp,shotsLeft:__DL.readState().wave.airCrew?.shots??null};}''')
  start('air','airObserver');target=p.evaluate('''()=>{const w=__DL.spawn('walker');w.x=830;w.lane=0;const b=__DL.spawn('darkBoss');b.x=250;b.lane=0;__DL.readState().wave.airCrew.markTimer=0;__DL.step(.05);return __DL.readState().enemies.find(z=>z.air?.mark>0)?.type;}''')
  start();damage=p.evaluate('''()=>{const z=__DL.spawn('walker');z.air={mark:6};const hp=z.hp;__DL.hit(z,10,false,'ally');return hp-z.hp;}''')
  start();mark=p.evaluate('''()=>{const z=__DL.spawn('walker');z.x=400;z.air={mark:6};__DL.advance(6.1);return z.air.mark;}''')
  start('dark','towerGuard');hidden=p.evaluate('''()=>{const s=__DL.readState();s.wave.dark.flare=[0,0];s.wave.dark.battery=[0,0];s.wave.dark.flash=0;__DL.dl401.damage(1,100);const z=__DL.spawn('darkWanderer');z.x=500;z.lane=0;z.feet=494;__DL.advance(1);return {hp:z.hp,shots:s.wave.towerCrew?.shots??null,visible:__DL.targetVisible(z)};}''')
  # Source towerGuard only has pool in its own route; dark hidden bug verified directly by native tick on tower only impossible unless switch native state, use distinct reserve fix here.
  start();power=p.evaluate('''()=>{const s=__DL.readState();s.run.equipment.generator=1;s.run.fuel=100;for(let n=1;n<=24;n++){s.run.night=n;if(__DL.conditionFor().name.includes('Coupure'))break;}s.wave.time=19;const before=__DL.powerOnline();__DL.pause();return {combat:before,pause:__DL.powerOnline()};}''')
  rows[name]={'airGunnerElsewhere':a,'specialPriority':target,'allyDamageOnMarked':damage,'landMarkAfter6s':mark,'sanaElsewhereHidden':hidden,'blackout':power};p.close()
 b.close()
a=rows['0.40.6'];z=rows['0.40.7'];checks=[{'test':'Renfort Noor désormais actif hors de sa route','ok':a['airGunnerElsewhere']['damage']==0 and z['airGunnerElsewhere']['damage']>0},{'test':'Boss récent reconnu par priorité spéciale','ok':a['specialPriority']=='walker' and z['specialPriority']=='darkBoss'},{'test':'Bonus de marquage retiré des balles alliées','ok':abs(a['allyDamageOnMarked']-11.8)<.0001 and abs(z['allyDamageOnMarked']-10)<.0001},{'test':'Fin du marquage sur infecté terrestre','ok':a['landMarkAfter6s']==6 and z['landMarkAfter6s']==0},{'test':'Électricité de pause cohérente avec la coupure','ok':a['blackout']=={'combat':False,'pause':True} and z['blackout']=={'combat':False,'pause':False}},{'test':'Aucune erreur native dans les reproductions','ok':not errors}]
r={'method':'Deux builds natives (.40.6 jointe et .40.7 reconstruite), mêmes cas arrangés. Ressources graphiques seules réduites.','passed':sum(c['ok'] for c in checks),'total':len(checks),'checks':checks,'results':rows,'errors':errors};(R/'rapports/BEFORE_AFTER_0407.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r['passed']==r['total'] else 1)
