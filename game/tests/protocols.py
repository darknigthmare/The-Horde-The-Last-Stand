"""Controlled A/B drills in the real engine. Only embedded image URI payloads
are reduced. Target HP, AI, shot/reload handlers and damage remain native."""
from pathlib import Path
import re,json,os,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',(R/'JOUER_DERNIERE_LIGNE.html').read_text())
checks=[];errors=[];cases=[];weapon_cases=[]
def ck(n,v,d=None):
 checks.append({'test':n,'ok':bool(v),'detail':d});print(('OK ' if v else 'FAIL ')+n,flush=True)
def boot(b,prod=False,w=1440,h=900):
 p=b.new_page(viewport={'width':w,'height':h});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(light,wait_until='domcontentloaded',timeout=25000);p.wait_for_timeout(90)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,activeReload:false})')
 return p
def setup(p,wid='pump',unlock=True):
 p.evaluate('''({id,unlock})=>{__DL.startNew('campaign');const r=__DL.readState().run,wm={};for(const w of __DL.getDefs().WEAPONS){r.weapons[w.id]={mag:w.mag,reserve:100,level:1};wm[w.id]={kills:2000,headshots:500,damage:100000};}if(unlock)__DL.setMeta({xp:999999,weaponMastery:wm});r.cash=30000;r.activeId=id;r.loadout=[id,'pistol'];DL36Gunsmith.ensure().selected=id;DL36Gunsmith.reset();__DL.setTab('workshop');}''',{'id':wid,'unlock':unlock})
def stamp(p):return p.evaluate('JSON.stringify({data:__DL.getData(),run:__DL.readState().run})')
def start(p,mode):
 ok=p.evaluate('(m)=>__DL.dl405.try(m)',mode);p.locator('#practiceBegin').click();p.evaluate('__DL.stopLoop()');return ok
PLAY='''(seconds)=>{let elapsed=0,maxLive=0;while(elapsed<seconds&&__DL.snapshot().phase==='combat'){
 const st=__DL.readState(),z=st.enemies.filter(z=>!z.dead&&__DL.targetVisible(z)).sort((a,b)=>b.x-a.x)[0];
 if(z){const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.fire();}
 const dt=Math.min(.05,seconds-elapsed);__DL.step(dt);elapsed+=dt;maxLive=Math.max(maxLive,st.enemies.filter(z=>!z.dead).length);
 }return {phase:__DL.snapshot().phase,report:__DL.dl406.state().runner,maxLive,snapshot:__DL.practiceSnapshot()};}'''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=boot(b);setup(p);initial=stamp(p)
 ck('0.40.6 chargée',p.evaluate('__DL.dl406.version')=='0.40.6')
 p.locator('#dl405-open').click();ck('Conditions communes dans le dialogue natif',p.locator('.dl406-conditions').count()==1 and p.evaluate('__DL.snapshot().phase')=='workshopDraft')
 ck('Stand libre conservé par défaut',p.evaluate('__DL.dl406.conditions().protocol')=='free')
 protocols=p.evaluate('__DL.dl406.protocols()');ck('Six exercices sur les vrais ennemis',len(protocols)==6 and p.evaluate('__DL.dl406.protocols().every(p=>!!__DL.getDefs().ENEMIES[p.enemy])'))
 ck('Choix des conditions sans modifier le profil',p.evaluate('__DL.dl406.set({protocol:"protection",view:"front",seed:9081})') and stamp(p)==initial)
 p.evaluate('__DL.dl405.kit("kit2_shot_slug")')
 p.locator('.dl406-conditions summary').click();p.locator('#dl406-pair').click()
 ck('Parcours A dans la préparation réelle',p.evaluate('__DL.snapshot().phase')=='practiceSetup' and p.evaluate('__DL.dl406.state().pair.phase')=='a')
 ck('Six contrôles natifs fixés',all(p.locator('#'+x).is_disabled() for x in ['practiceGun','practiceEnemy','practiceView','practiceDistance','practiceMotion','practiceGroup']))
 ck('Autre arme refusée même par entrée directe',p.evaluate('__DL.beginPractice({gun:"pistol",enemy:"walker",view:"right",distance:"near",motion:"still",group:1})') is False and p.evaluate('__DL.snapshot().phase')=='practiceSetup')
 p.locator('#practiceBegin').click();p.evaluate('__DL.stopLoop()');r=p.evaluate('__DL.dl406.state().runner')
 ck('Premier passage créé par le moteur',r['offered']==1 and r['events'][0]['targets'][0]['type']=='armored' and r['events'][0]['targets'][0]['hp']==p.evaluate('__DL.getDefs().ENEMIES.armored.hp'),r['events'][0])
 ck('Lot réel de 300 cartouches',p.evaluate('__DL.getAmmo("pump").mag+__DL.getAmmo("pump").reserve')==300)
 ck('Consommables absents dans cette copie seule',p.evaluate('JSON.stringify(__DL.readState().run.inventory)')=='[0,0,0]' and p.evaluate('__DL.readState().run.lures')==0)
 p.locator('#pistolBtn').click(force=True)
 ck('Le bouton secours ne change pas cette arme',p.evaluate('__DL.readState().run.activeId')=='pump')
 old=p.evaluate('__DL.dl406.state().runner.offered');ck('Ajout manuel de cibles refusé',p.evaluate('__DL.spawnPracticeGroup()') is False and p.evaluate('__DL.dl406.state().runner.offered')==old)
 p.evaluate('__DL.advance(7.2);__DL.pause()');before=p.evaluate('__DL.dl406.state().runner.elapsed');p.evaluate('__DL.advance(6)')
 ck('Pause fige le chronomètre',p.evaluate('__DL.dl406.state().runner.elapsed')==before and p.evaluate('__DL.snapshot().phase')=='paused')
 p.locator('#resumeGame').click();p.evaluate('__DL.stopLoop();__DL.advance(40)')
 r=p.evaluate('__DL.dl406.state().runner');ck('Arrêt exact à 30 secondes',r['elapsed']==30 and r['completed'] and p.evaluate('__DL.snapshot().phase')=='practiceEnd',r)
 ck('Six passages avec alternance des voies',[(e['at'],e['targets'][0]['lane']) for e in r['events']]==[(i*5,i%2) for i in range(6)])
 p.locator('#practiceLeave').click()
 ck('Retour au bilan A sans mutation',p.evaluate('__DL.snapshot().phase')=='workshopDraft' and stamp(p)==initial)
 ck('Passage B proposé explicitement',p.locator('#dl406-next').is_visible() and p.evaluate('__DL.dl406.state().pair.phase')=='await-b')
 p.locator('#dl406-next').click();p.locator('#practiceBegin').click();p.evaluate('__DL.stopLoop();__DL.advance(30.1)');r2=p.evaluate('__DL.dl406.state().runner');p.locator('#practiceLeave').click()
 ck('Mêmes arrivées réelles pour A et B',r['events']==r2['events'])
 ck('Comparaison prête et profil inchangé',p.evaluate('__DL.dl406.status().ready') and stamp(p)==initial)
 payload=p.evaluate('__DL.dl406.exportData()')
 ck('Export limité aux essais et à leur montage',payload['format']=='DL-TRAINING-1' and 'data' not in payload and set(payload['results'])=={'a','b'} and 'weapons' not in payload)
 with p.expect_download(timeout=5000) as info:p.locator('#dl406-export').click()
 dl=info.value;tmp=R/'rapports/EXEMPLE_BILAN.json';dl.save_as(tmp)
 exp=json.loads(tmp.read_text());ck('Vrai fichier JSON exporté',exp['format']=='DL-TRAINING-1' and exp['weapon']['id']=='pump')
 p.evaluate('__DL.dl406.set({seed:9082})');ck('Nouvelle série invalide l’ancienne comparaison',not p.evaluate('__DL.dl406.status().ready'))
 p.evaluate('__DL.dl405.close()');ck('Fermeture sans changement des stocks et presets',stamp(p)==initial and p.evaluate('__DL.dl406.state().runner') is None and not p.evaluate('__DL.dl406.state().randomParked'))
 p.close()
 for protocol in protocols:
  for view in ['right','left','front','rear']:
   p=boot(b);setup(p,'assault');original=stamp(p);p.locator('#dl405-open').click();p.evaluate('(o)=>__DL.dl406.set(o)',{'protocol':protocol['id'],'view':view,'seed':7819})
   rows=[]
   for mode in ['a','b']:
    opened=start(p,mode);row=p.evaluate(PLAY,30.1);row['opened']=opened;p.evaluate('__DL.leavePractice()');row['restored']=stamp(p)==original;rows.append(row)
   case={'protocol':protocol['id'],'view':view,'rows':rows};cases.append(case)
   equal=rows[0]['report']['events']==rows[1]['report']['events']
   ck('Séquence réelle '+protocol['id']+' · '+view,all(x['opened'] and x['restored'] and x['report']['elapsed']<=30 and x['maxLive']<=8 and x['report']['shots']>0 and x['report']['ammoLeft']+x['report']['shots']==300 for x in rows) and equal,case)
   p.evaluate('__DL.dl405.close()');p.close()
 p=boot(b);setup(p);weapons=p.evaluate('__DL.getDefs().WEAPONS.map(w=>w.id)');p.close()
 for wid in weapons:
  p=boot(b);setup(p,wid);original=stamp(p);p.locator('#dl405-open').click();p.evaluate('__DL.dl406.set({protocol:"grouping",view:"front",seed:5151})')
  kit=p.evaluate('(id)=>DL36Gunsmith.atelier.catalog.conversions.find(c=>DL36Gunsmith.atelier.conversionAllowed(id,c))?.id',wid);p.evaluate('(k)=>__DL.dl405.kit(k)',kit);rows=[]
  for mode in ['a','b']:
   start(p,mode);r=p.evaluate(PLAY,5.2);p.evaluate('__DL.leavePractice()');r['restored']=stamp(p)==original;rows.append(r)
  case={'weapon':wid,'kit':kit,'rows':rows};weapon_cases.append(case)
  ck('Arme réelle A/B · '+wid,all(r['restored'] and r['report']['shots']>0 and r['report']['ammoLeft']+r['report']['shots']==300 and r['report']['damage']>=0 for r in rows),case)
  ck('Essai court signalé incomplet · '+wid,not p.evaluate('__DL.dl406.status().ready'))
  p.evaluate('__DL.dl405.close()');p.close()
 b.close()
ck('Aucune erreur JavaScript',not errors,errors)
r={'version':'0.40.6','passed':sum(x['ok'] for x in checks),'total':len(checks),'checks':checks,'errors':errors,'timedCases':cases,'weaponCases':weapon_cases,'method':'Moteur réel dans Chromium, images seulement réduites. Tirs natifs et cibles à PV natifs dans les séquences; ni élimination ni victoire forcée.'}
(R/'rapports/PROTOCOLS_QA.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps({'passed':r['passed'],'total':r['total'],'errors':errors}));sys.exit(0 if r['passed']==r['total'] else 1)
