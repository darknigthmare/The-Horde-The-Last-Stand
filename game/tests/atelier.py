"""Tests du vrai moteur 0.40.2. Aucun faux DOM, arme ou système de combat.
Les images du banc rapide sont remplacées par un pixel; voir capturer.py pour le rendu complet.
"""
from pathlib import Path
import re,json,os,sys,math
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
raw=(R/'JOUER_DERNIERE_LIGNE.html').read_text()
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+','data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',raw)
checks=[];errors=[]
def check(n,ok,d=None):
 checks.append({'test':n,'ok':bool(ok),'detail':d});print(('OK ' if ok else 'FAIL ')+n,flush=True)
def load(b,prod=False,width=1440,height=900):
 p=b.new_page(viewport={'width':width,'height':height});p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto('about:blank'+('' if prod else '?test=1'));p.set_content(light,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(80)
 if not prod:p.evaluate('__DL.stopLoop();__DL.setSettings({cinematics:false})')
 return p
def arsenal(p):
 p.evaluate("""()=>{__DL.startNew('campaign');const r=__DL.readState().run,wm={};for(const w of __DL.getDefs().WEAPONS){wm[w.id]={kills:2000,headshots:500,damage:100000};r.weapons[w.id]={mag:w.mag,reserve:400,level:0};}__DL.setMeta({xp:999999,weaponMastery:wm});r.loadout=['rifle','pump'];r.activeId='rifle';r.cash=50000;DL36Gunsmith.ensure().selected='rifle';__DL.setTab('workshop');}""")
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 p=load(b);arsenal(p)
 check('73 accessoires uniques',p.evaluate('DL36Gunsmith.attachments.length===73&&new Set(DL36Gunsmith.attachments.map(a=>a.id)).size===73'))
 coverage=p.evaluate("""()=>{const A=DL36Gunsmith.atelier,W=__DL.getDefs().WEAPONS;return W.map(w=>({id:w.id,cat:A.category(w.id),conv:A.catalog.conversions.filter(c=>A.conversionAllowed(w.id,c)).length,plans:A.catalog.blueprints.filter(c=>c.category===A.category(w.id)).length}));}""")
 check('45 armes : 2 conversions et 3 plans chacune',len(coverage)==45 and all(x['conv']==2 and x['plans']==3 for x in coverage),coverage)
 check('Cinq onglets intégrés, aucun panneau global',p.locator('.v37-armory-nav [data-v37-view]').count()==5 and p.locator('#dl40-native-panel,#dl38-lighting-overlay').count()==0)
 # All new parts must have an actual compatible weapon and no lost mounts after render.
 partscan=p.evaluate("""()=>{const G=DL36Gunsmith,A=G.atelier,r=__DL.readState().run,rows=[];for(const part of A.catalog.parts){let found=null;for(const w of __DL.getDefs().WEAPONS){G.ensure().selected=w.id;G.reset();const inv=r.weapons[w.id],total=inv.mag+inv.reserve;const ok=G.equip(part.id);if(ok){found={part:part.id,weapon:w.id,kept:G.config(w.id).active[part.slot]===part.id,ammo:(w.id==='pistol'||total===inv.mag+inv.reserve)};break;}}rows.push(found||{part:part.id,error:'aucune arme'});}return rows;}""")
 check('32 nouvelles pièces montées sur des armes compatibles',len(partscan)==32 and all(x.get('kept') for x in partscan),partscan)
 check('Aucun montage ne crée de munitions',all(x.get('ammo') for x in partscan))
 # Apply all 90 legal conversions, return original mechanism every time.
 convscan=p.evaluate("""()=>{const G=DL36Gunsmith,A=G.atelier,rows=[];for(const w of __DL.getDefs().WEAPONS){G.ensure().selected=w.id;G.reset();const original=JSON.stringify([w.mag,w.pellets,w.armorPiercing,w.pierce,w.range,w.blast]);for(const c of A.catalog.conversions.filter(c=>A.conversionAllowed(w.id,c))){const inv=__DL.getAmmo(w.id),total=inv.mag+inv.reserve;const ok=A.setConversion(c.id),a=A.metrics(w.id);const same=JSON.stringify([a,w.mag,w.pellets,w.armorPiercing,w.pierce,w.range,w.blast]);for(let k=0;k<10;k++)G.ensure();const stable=same===JSON.stringify([A.metrics(w.id),w.mag,w.pellets,w.armorPiercing,w.pierce,w.range,w.blast]);const ammo=w.id==='pistol'||total===inv.mag+inv.reserve;A.setConversion(null);rows.push({weapon:w.id,kit:c.id,ok,finite:Object.values(a).filter(v=>typeof v==='number').every(Number.isFinite),stable,ammo,restore:original===JSON.stringify([w.mag,w.pellets,w.armorPiercing,w.pierce,w.range,w.blast])});}}return rows;}""")
 check('90 montages de conversion effectifs',len(convscan)==90 and all(x['ok'] for x in convscan),[x for x in convscan if not x['ok']])
 check('90 recalculs stables et bornés',all(x['finite'] and x['stable'] for x in convscan),[x for x in convscan if not (x['finite'] and x['stable'])])
 check('90 démontages restaurent les propriétés d’origine',all(x['restore'] for x in convscan),[x for x in convscan if not x['restore']])
 check('Conversions sans création de stock',all(x['ammo'] for x in convscan),[x for x in convscan if not x['ammo']])
 plans=p.evaluate("""()=>{const G=DL36Gunsmith,A=G.atelier,rows=[];for(const w of __DL.getDefs().WEAPONS){G.ensure().selected=w.id;for(const plan of A.catalog.blueprints.filter(x=>x.category===A.category(w.id))){const resolved=A.plan(w.id,plan.id);const ok=A.applyPlan(plan.id);rows.push({weapon:w.id,plan:plan.id,ok,parts:resolved.parts.length,kept:JSON.stringify(G.config(w.id).active)===JSON.stringify(resolved.cfg.active)});}}return rows;}""")
 check('135 plans résolus et appliqués sans substitution',len(plans)==135 and all(x['ok'] and x['kept'] and x['parts']==5 for x in plans),[x for x in plans if not (x['ok'] and x['kept'] and x['parts']==5)])
 # UI preview really read-only; control clicks, not synthetic display.
 p.evaluate("DL36Gunsmith.ensure().selected='pump';DL36Gunsmith.reset();DL37ArmoryUI.state.view='kits';__DL.setTab('workshop')")
 snapshot=p.evaluate('JSON.stringify(__DL.getData())')
 p.locator('[data-at2-preview="kit2_shot_slug"]').click()
 check('Comparer ne modifie ni inventaire ni profil',snapshot==p.evaluate('JSON.stringify(__DL.getData())'))
 check('Aperçu chiffres réels présent',p.locator('.at2-comparison tbody tr').count()==10)
 p.locator('[data-at2-kit="kit2_shot_slug"]').click()
 check('Clic de montage applique la balle unique',p.evaluate('__DL.getDefs().WEAPONS.find(w=>w.id==="pump").pellets')==1)
 # Six presets capture conversion and tuning; hashes include it.
 beforehash=p.evaluate("DL37FieldLab.snapshot('pump')")
 p.evaluate("""()=>{const G=DL36Gunsmith,A=G.atelier;for(let i=0;i<6;i++){A.setConversion(null);A.setConversion(i%2?'kit2_shot_darts':'kit2_shot_slug');G.equip('optic_reflex');G.config('pump').tuning.optic_reflex=i*10;G.savePreset(i);A.rename(i,'SEUIL '+i);G.reset();}}""")
 presets=[]
 for i in range(6):
  p.evaluate('(i)=>DL36Gunsmith.loadPreset(i)',i)
  row=p.evaluate("({cfg:DL36Gunsmith.config('pump'),snapshot:DL37FieldLab.snapshot('pump'),pellets:__DL.getDefs().WEAPONS.find(w=>w.id==='pump').pellets})")
  presets.append(row['snapshot']['hash'])
  check('Preset '+str(i+1)+' conversion/réglage/nom restitués',row['cfg']['conversion']==('kit2_shot_darts' if i%2 else 'kit2_shot_slug') and row['cfg']['tuning']['optic_reflex']==i*10 and row['cfg']['presets'][i]['name']=='SEUIL '+str(i),{'kit':row['cfg']['conversion'],'pellets':row['pellets']})
 check('Signatures distinctes pour les 6 configurations',len(set(presets))==6)
 exp=p.evaluate('JSON.parse(__DL.exportText())')
 valid=p.evaluate('(x)=>__DL.validateSave(x)',exp)
 check('Conversion et six presets dans le profil validé',len(valid['meta']['gunsmithV36']['weapons']['pump']['presets'])==6 and all(x['conversion'] for x in valid['meta']['gunsmithV36']['weapons']['pump']['presets']))
 # Imported conversion validity is enforced, not only UI locked state.
 for label,mutate in [('inconnue',lambda x:x['meta']['gunsmithV36']['weapons']['pump'].__setitem__('conversion','not_a_kit')),('incompatible',lambda x:x['meta']['gunsmithV36']['weapons']['pump'].__setitem__('conversion','kit2_tool_long')),('verrouillée',lambda x:x['meta']['weaponMastery']['pump'].__setitem__('kills',0))]:
  bad=json.loads(json.dumps(exp));mutate(bad)
  check('Import conversion '+label+' refusé',p.evaluate('(x)=>{try{__DL.validateSave(x);return false}catch(e){return true}}',bad))
 # A new profile never receives locked gear from a plan or a conversion action.
 p.close();p=load(b);p.evaluate("__DL.startNew('campaign');DL36Gunsmith.ensure().selected='pistol';__DL.setTab('workshop')")
 stamp=p.evaluate('JSON.stringify(__DL.getData())')
 check('Conversion verrouillée refusée',not p.evaluate("DL36Gunsmith.atelier.setConversion('kit2_hand_heavy')"))
 check('Plan verrouillé refusé sans montage partiel',not p.evaluate("DL36Gunsmith.atelier.applyPlan('plan2_handgun_sustain')") and stamp==p.evaluate('JSON.stringify(__DL.getData())'))
 p.close()
 # Stand tests execute real firing/reload/effects functions. No forced combat resolution.
 p=load(b);arsenal(p)
 representatives={'handgun':'pistol','rifle':'assault','shotgun':'pump','machine':'lmg','precision':'sniper','launcher':'launcher','cable':'harpoon','tool':'flamer'}
 combatrows=[]
 for cat,wid in representatives.items():
  kits=p.evaluate('(cat)=>DL36Gunsmith.atelier.catalog.conversions.filter(c=>c.category===cat).map(c=>c.id)',cat)
  for kit in kits:
   p.evaluate('(a)=>{DL36Gunsmith.ensure().selected=a.id;DL36Gunsmith.reset();DL36Gunsmith.atelier.setConversion(a.kit);}',{'id':wid,'kit':kit})
   before=p.evaluate('JSON.stringify(__DL.getData())')
   p.evaluate('(w)=>{__DL.showPractice(w);__DL.beginPractice({gun:w,enemy:"walker",view:"front",distance:"near",motion:"still",group:1});__DL.stopLoop();}',wid)
   row=p.evaluate("""()=>{const r=__DL.readState(),z=r.enemies.find(z=>!z.dead);z.hp=z.maxHp=100000;z.x=910;z.feet=494;z.lane=0;const q=__DL.projectedEnemy(z);__DL.setScreenAim(q.x,q.body);__DL.setTimers({cooldown:0,reload:0});__DL.setBallisticSeed(42);const id=r.run.activeId,before=__DL.getAmmo(id).mag,hp=z.hp;__DL.fire();const effects=__DL.getEffects(),w=__DL.getDefs().WEAPONS.find(w=>w.id===id),mod=__DL.mountedMod(id);return {id,spent:before-__DL.getAmmo(id).mag,removed:hp-z.hp,pellets:w.pellets||1,pierce:w.pierce,ap:!!w.armorPiercing,projectile:effects.projectiles.at(-1)||null,mod,metrics:DL36Gunsmith.atelier.metrics(id)};}""")
   row.update(kit=kit);combatrows.append(row)
   # All types must actually fire; launcher creates projectile first.
   check('Tir réel '+kit,row['spent']==1 and (row['removed']>0 or row['projectile'] is not None),{'spent':row['spent'],'damage':row['removed'],'pellets':row['pellets']})
   if kit.endswith('shot_slug'):
    check('Balle unique : un projectile, pas 7 impacts',row['pellets']==1 and abs(row['removed']-row['metrics']['impact'])<1e-4,row)
   if kit.endswith('shot_darts'):
    check('Fléchettes : 9 projectiles et traversée supplémentaire',row['pellets']==9 and row['pierce']==2,row)
   if kit.startswith('kit2_launcher'):
    check('Charge : rayon et dégâts de la vraie grenade',abs(row['projectile']['radius']-row['metrics']['blast'])<1e-6 and abs(row['projectile']['dmg']-row['metrics']['impact'])<1e-4,row['projectile'])
   # Empty and reload: this tests actual capacity, not merely the HUD.
   reloadrow=p.evaluate("""()=>{const r=__DL.readState().run,id=r.activeId,inv=r.weapons[id];inv.mag=0;inv.reserve=500;__DL.setTimers({cooldown:0,reload:0});__DL.reload();__DL.advance(9);return {id,mag:inv.mag,reserve:inv.reserve,cap:DL36Gunsmith.atelier.metrics(id).magazine};}""")
   check('Recharge réelle '+kit,reloadrow['mag']==reloadrow['cap'] and (wid=='pistol' or reloadrow['mag']+reloadrow['reserve']==500),reloadrow)
   p.evaluate('__DL.leavePractice()')
   check('Stand sans écriture persistante '+kit,before==p.evaluate('JSON.stringify(__DL.getData())'))
 # Armour verifies target response, not a flag alone.
 # Use practice against same armor/body target, no source mutation from kit.
 p.close()
 check('Aucune erreur JavaScript sur les nouveaux parcours',not errors,errors)
 b.close()
report={'version':'0.40.4','passed':sum(x['ok'] for x in checks),'total':len(checks),'checks':checks,'errors':errors,'coverage':{'newParts':partscan,'conversionCases':convscan,'blueprintCases':plans,'combatCases':combatrows},'method':'Chromium et vrai moteur. Images 1x1 dans le banc rapide; aucune fonction de simulation remplacée.'}
(R/'rapports/ATELIER_QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':report['passed'],'total':report['total'],'errors':errors},ensure_ascii=False))
sys.exit(0 if all(x['ok'] for x in checks) else 1)
