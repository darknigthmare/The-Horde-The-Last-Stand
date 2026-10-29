"""Native 0.40.7 transactions, campaign preparation and shared specialist pools.
Images only reduced for browser speed. Run/target states arranged explicitly.
No substitute simulation and no assertions based merely on source string presence.
"""
from pathlib import Path
import re,json,sys,os
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
h=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',(R/'JOUER_DERNIERE_LIGNE.html').read_text())
checks=[];errors=[];matrix=[]
def ck(n,v,d=None):
 checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def boot(b,prod=False,width=1440,height=900):
 p=b.new_page(viewport={'width':width,'height':height});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)));p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(h,wait_until='domcontentloaded',timeout=25000);p.wait_for_timeout(100)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false})')
 return p
def setup(p,mode='campaign',aid=None):
 p.evaluate('''({mode,aid})=>{__DL.startNew(mode);const r=__DL.readState().run;r.cash=25000;r.weapons.rifle={mag:3,reserve:41,level:0};r.loadout=['rifle','pistol'];r.activeId='rifle';r.allies=aid?{[aid]:{active:true}}:{};r.wall=113;r.health=71;r.inventory=[1,1,1];r.equipment={generator:1,turret:1,spotlight:0,pulse:0};r.fuel=75;r.turretAmmo=20;__DL.setTab('readiness');}''',{'mode':mode,'aid':aid})
def stamp(p):return p.evaluate('JSON.stringify({run:__DL.readState().run,data:__DL.getData()})')
def start(p):
 p.evaluate('__DL.start();__DL.stopLoop();__DL.readState().wave.spawnTimer=10000;__DL.readState().run.equipment={generator:0,turret:0,spotlight:0,pulse:0};__DL.clearEnemies()')

def run_report():
 rr={'version':'0.40.7','passed':sum(x['ok'] for x in checks),'total':len(checks),'checks':checks,'errors':errors,'crewCases':matrix,'method':'Vrai HTML dans Chromium ; seuls les URI raster sont réduits. Budgets, placements et chronomètre de QA arrangés ; calculs d’achat, sauvegarde, IA et dégâts natifs.'}
 (R/'rapports/ORDERS_QA.json').write_text(json.dumps(rr,ensure_ascii=False,indent=2));print(json.dumps({'passed':rr['passed'],'total':rr['total'],'errors':errors}),flush=True);return rr
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  p=boot(b);setup(p,'campaign','shooter');ck('Version 0.40.7 et vraie préparation',p.evaluate('__DL.dl407.version')=='0.40.7' and p.locator('#dl407-review').count()==1)
  original=stamp(p);offers=p.evaluate('__DL.dl407.offers()');p.locator('#dl407-review').click()
  ck('Devis sans mutation ni sélection implicite',stamp(p)==original and p.evaluate('__DL.dl407.quote().rows.length')==0 and not p.evaluate('__DL.dl407.quote().ready'))
  ck('Tarifs natifs de réparation/soins',next(o for o in offers if o['id']=='wall')['cost']==(340-113)*2 and next(o for o in offers if o['id']=='health')['cost']==58,offers)
  expected=p.evaluate('__DL.equippedSupplyPlan()')
  ck('Munitions au même tarif que le ravitaillement natif',all(next(o for o in offers if o['id']=='ammo:'+row['id'])['cost']==row['cost'] for row in expected['items']))
  ck('Sélection inconnue ou répétée refusée',not p.evaluate('__DL.dl407.pick(["ghost"])') and not p.evaluate('__DL.dl407.pick(["health","health"])'))
  p.evaluate('__DL.dl407.pick(["wall","health","ammo:rifle","supply:0","fuel","turret","local"],true)');q=p.evaluate('__DL.dl407.quote()');before=p.evaluate('__DL.snapshot().run')
  ck('Devis réserve explicitement les frais',q['fee']==65 and q['after']==before['cash']-q['cost']-65 and q['ready'],q)
  ck('Sélection ne prélève pas les ressources',stamp(p)==original)
  p.locator('#dl407-apply').click();after=p.evaluate('__DL.snapshot().run');ammo=next(o['amount'] for o in q['rows'] if o['kind']=='ammo')
  ck('Une seule dépense groupée',after['cash']==before['cash']-q['cost'] and after['totalSpent']==before['totalSpent']+q['cost'] and p.evaluate('__DL.dl407.state().open') is False)
  ck('Réparations exactes sans dépassement',after['wall']==after['wallMax'] and after['health']==100)
  ck('Chargement après livraison sans munitions créées',after['weapons']['rifle']['mag']+after['weapons']['rifle']['reserve']==44+ammo and after['weapons']['rifle']['mag']==p.evaluate('DL36Gunsmith.atelier.metrics("rifle").magazine'))
  ck('Seuls les consommables sélectionnés changent',after['inventory']==[2,1,1] and after['lures']==before['lures'])
  ck('Dispositifs distincts et remplis du bon lot',after['fuel']==175 and after['turretAmmo']==120 and after['localCharge'])
  ck('Frais non prélevés avant le départ',after['cash']>=65 and p.evaluate('__DL.snapshot().phase')=='camp')
  saved=p.evaluate('__DL.validateSave(JSON.parse(__DL.exportText()))');ck('Transaction présente dans le profil schéma 12',saved['version']==12 and saved['save']['cash']==after['cash'])
  p.evaluate('__DL.start();__DL.stopLoop()');ck('Le vrai départ prélève les frais une seule fois',p.evaluate('__DL.readState().run.cash')==after['cash']-65);p.close()
  # Every route uses its real object; no global profile mutation on review/cancel.
  for mode in ['campaign','north','metro','air','highway','water','tower','dark']:
   p=boot(b);setup(p,mode,'shooter');origin=stamp(p);offers=p.evaluate('__DL.dl407.offers()');p.evaluate('__DL.dl407.open()')
   ck('Consultation et annulation intactes · '+mode,p.evaluate('__DL.dl407.quote().valid') and stamp(p)==origin)
   p.keyboard.press('Escape');ck('Retour exact au camp · '+mode,p.evaluate('__DL.snapshot().phase')=='camp' and stamp(p)==origin and p.locator('#dl407-review').count()==1)
   p.evaluate('__DL.dl407.open();__DL.dl407.pick(["health"]);__DL.readState().run.cash=20')
   mutated=stamp(p);ck('Devis périmé refusé · '+mode,not p.evaluate('__DL.dl407.apply()') and stamp(p)==mutated)
   p.evaluate('__DL.dl407.close()');p.close()
  # one lot partial reserve, native cap 2500 (discovered through offer; use underlying limit from source is 9999? do not assume)
  p=boot(b);setup(p);p.evaluate('__DL.readState().run.weapons.rifle.reserve=9999998;__DL.readState().run.fuel=297.5;__DL.readState().run.turretAmmo=999;__DL.readState().run.inventory=[5,5,5];__DL.readState().run.lures=5');offs=p.evaluate('__DL.dl407.offers()')
  ck('Lots partiels carburant et tourelle',next(o for o in offs if o['id']=='fuel')['amount']==2.5 and next(o for o in offs if o['id']=='fuel')['cost']==2 and next(o for o in offs if o['id']=='turret')['amount']==1,offs)
  ck('Dernières cartouches au plafond facturées au prorata',next(o for o in offs if o['id']=='ammo:rifle')['amount']==2 and next(o for o in offs if o['id']=='ammo:rifle')['cost']==8)
  ck('Stocks pleins sans ligne d’achat superflue',not any(o['id'].startswith('supply:') or o['id']=='lure' for o in offs))
  p.evaluate('__DL.dl407.open();__DL.dl407.pick(["fuel","turret","ammo:rifle"])');p.evaluate('__DL.dl407.apply()');ck('Bornes réelles conservées après lot partiel',p.evaluate('__DL.readState().run.fuel')==300 and p.evaluate('__DL.readState().run.turretAmmo')==1000 and p.evaluate('__DL.readState().run.weapons.rifle.reserve')==10000000);p.close()
  # Group repair circuits vs player barricade, all native six circuits preserved
  p=boot(b);setup(p,'dark');p.evaluate('''()=>{const r=__DL.readState().run;r.dark.circuits=[80,0,60,90,85,99];r.dark.fuses=2;__DL.setTab('readiness')}''');before=p.evaluate('__DL.snapshot().run');p.evaluate('__DL.dl407.open();__DL.dl407.pick(["circuit:0","fuse"])');q=p.evaluate('__DL.dl407.quote()');p.evaluate('__DL.dl407.apply()');after=p.evaluate('__DL.snapshot().run')
  ck('Révision voie A ne touche ni voie B ni barricade',q['cost']==160 and after['dark']['circuits']==[100,100,100,90,85,99] and after['wall']==before['wall'] and after['dark']['fuses']==3)
  ck('Six circuits révisés exportables',p.evaluate('__DL.validateSave(JSON.parse(__DL.exportText())).version')==12);p.close()
  # Native specialist behavior on home front and foreign fronts in all four perspectives.
  crew=[('airGunner','air','airCrew','shots',50),('airEngineer','air','airCrew','repairs',3),('airObserver','air','airCrew','marks',6),('roadGunner','highway','highwayCrew','shots',48),('roadMechanic','highway','highwayCrew','repairs',3),('waterGunner','water','waterCrew','shots',44),('waterMechanic','water','waterCrew','repairs',3),('towerGuard','tower','towerCrew','shots',42),('towerTech','tower','towerCrew','repairs',3)]
  for aid,home,pool,field,total in crew:
   for mode in [home,'campaign']:
    p=boot(b);setup(p,mode,aid);start(p)
    rows=[]
    for view in ['right','left','front','rear']:
     row=p.evaluate('''({aid,pool,field,total,view})=>{const s=__DL.readState();s.wave.fronts.view=view;__DL.clearEnemies();__DL.step(.01);const c=s.wave[pool];c[field]=total;c.shotTimer=c.markTimer=c.repairCooldown=0;s.run.health=100;s.run.wall=100;const z=__DL.spawn('walker');z.x=470;z.lane=0;z.feet=494;const hp=z.hp,wall=s.run.wall;__DL.step(.05);return {value:c[field],expected:total-1,damage:hp-z.hp,repair:s.run.wall-wall,mark:z.air?.mark||0,pool:__DL.dl407.crew(aid),phase:__DL.snapshot().phase};}''',dict(aid=aid,pool=pool,field=field,total=total,view=view))
     rows.append(row)
    valid=all(x['value']==x['expected'] and (x['damage']>0 if field=='shots' else x['repair']>0 if field=='repairs' else x['mark']>0) for x in rows)
    matrix.append({'ally':aid,'route':mode,'views':rows});ck('Spécialiste réel, une action par vue · '+aid+' · '+mode,valid,rows)
    # Exhausted pool never refills spontaneously. Hold spawn timer, no target modded weapon logic.
    exhausted=p.evaluate('''({pool,field})=>{const s=__DL.readState();s.wave[pool][field]=0;__DL.clearEnemies();const z=__DL.spawn('walker');z.x=400;const hp=z.hp;s.run.wall=100;__DL.advance(2);return {value:s.wave[pool][field],damage:hp-z.hp,wall:s.run.wall};}''',dict(pool=pool,field=field))
    ck('Réserve épuisée non recréée · '+aid+' · '+mode,exhausted['value']==0 and (exhausted['damage']==0 if field=='shots' else exhausted['wall']==100 if field=='repairs' else True),exhausted)
    p.close()
  # All special types recognized, including all native boss rules.
  p=boot(b);setup(p);start(p)
  specials=p.evaluate('__DL.getDefs().BOSS_RULES?Object.keys(__DL.getDefs().BOSS_RULES):[]')+['roadSpitter','waterSpitter','towerAlarm','darkSpitter','waterHowler','waterBulwark','northCable']
  targets=[]
  for eid in specials:
   d=p.evaluate('''(type)=>{__DL.clearEnemies();__DL.setPriority('auto');const a=__DL.spawn('walker');a.x=840;a.lane=0;const b=__DL.spawn(type);b.x=250;b.lane=0;return {special:__DL.chooseTarget(true)?.type,normal:__DL.chooseTarget(false)?.type};}''',eid);targets.append({'id':eid,**d})
  ck('Tous les boss et nouveaux spéciaux prioritaires',all(x['special']==x['id'] and x['normal']=='walker' for x in targets),targets)
  r=p.evaluate('''()=>{__DL.clearEnemies();const z=__DL.spawn('waterHowler');z.x=900;z.lane=1;const w=__DL.spawn('walker');w.x=400;w.lane=0;__DL.setPriority('high');return __DL.chooseTarget(true)?.type;}''');ck('Priorité manuelle de voie respectée avant le type',r=='walker');p.close()
  # Lina's mark uses actual hit chain: no ally bonus; bounded to six seconds on land as well as air.
  p=boot(b);setup(p);start(p)
  for source in ['player','ally']:
   vals=p.evaluate('''(source)=>{const out=[];for(const marked of [false,true]){__DL.clearEnemies();const z=__DL.spawn('walker');z.x=400;const hp=z.hp;if(marked)z.air={mark:6};__DL.hit(z,10,false,source);out.push(hp-z.hp);}return out;}''',source)
   ck('Marquage bonus réservé au joueur · '+source,abs(vals[1]-vals[0]*(1.18 if source=='player' else 1))<.0001,vals)
  mark=p.evaluate('''()=>{__DL.clearEnemies();const z=__DL.spawn('walker');z.x=400;z.air={mark:6};__DL.advance(6.1);return z.air.mark;}''')
  ck('Marquage expire aussi sur un infecté terrestre',mark==0,mark);p.close()
  # Sana respects hidden target in Zone Noire instead of shooting from memory.
  p=boot(b);setup(p,'dark','towerGuard');start(p)
  z=p.evaluate('''()=>{const s=__DL.readState();s.wave.dark.battery=[0,0];s.wave.dark.flare=[0,0];s.wave.dark.flash=0;__DL.dl401.damage(1,100);const z=__DL.spawn('darkWanderer');z.x=500;z.lane=0;z.feet=494;__DL.step(.01);s.wave.towerCrew.shotTimer=0;const before=s.wave.towerCrew.shots;__DL.step(.05);return {lit:__DL.targetVisible(z),used:before-s.wave.towerCrew.shots};}''')
  ck('Sana ne consomme pas ses tirs sur un ennemi caché',not z['lit'] and z['used']==0,z);p.close()
  # All twelve nights each route plus 24 + relief: preparedness view itself is read-only.
  p=boot(b);routes=[('campaign',1,24),('relief',25,36),('north',1,16),('metro',1,12),('air',1,12),('highway',1,12),('water',1,12),('tower',1,12),('dark',1,12)];pages=[]
  for mode,lo,hi in routes:
   if mode=='relief':p.evaluate('__DL.startNew("campaign");__DL.readState().run.mode="relief"')
   else:p.evaluate('(m)=>__DL.startNew(m)',mode)
   arr=[]
   for n in range(lo,hi+1):
    r=p.evaluate('''n=>{__DL.readState().run.night=n;__DL.readState().run.lastSettled=n-1;__DL.setTab('readiness');const a=JSON.stringify(__DL.readState().run),b=document.getElementById('shopBody').textContent;for(let i=0;i<3;i++){__DL.dl407.offers();__DL.dl407.order();}return {night:n,unchanged:a===JSON.stringify(__DL.readState().run),name:__DL.missionFor().name,valid:!b.includes('undefined')&&!b.includes('NaN'),review:!!document.getElementById('dl407-review')};}''',n);arr.append(r)
   pages+=arr;ck('Préparation de toutes les étapes · '+mode,all(x['unchanged'] and x['valid'] and x['review'] for x in arr),arr)
  ck('124 étapes de préparation parcourues',len(pages)==124,len(pages));p.close()
  p=boot(b,prod=True);ck('Build de production sans API de test',p.evaluate('typeof __DL')=='undefined');p.close();b.close()
 ck('Aucune erreur JavaScript dans la matrice',not errors,errors)
except Exception as e:
 errors.append(type(e).__name__+': '+str(e));ck('Suite complète exécutée',False,errors);run_report();raise
r=run_report();sys.exit(0 if r['passed']==r['total'] else 1)
