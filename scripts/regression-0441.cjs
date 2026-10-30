#!/usr/bin/env node
'use strict';

// Integration coverage of the shipped HTML, with the original images.
// Controlled combat uses the opt-in API; profile transfer uses production UI only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
let playwright;
try { playwright = require('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
}
const root = path.resolve(__dirname, '..');
const arg = (name, fallback) => { const i=process.argv.indexOf(name); return i<0?fallback:process.argv[i+1]; };
const game = path.resolve(arg('--game', path.join(root, 'game/JOUER_DERNIERE_LIGNE.html')));
const out = path.resolve(arg('--out', path.join(root, 'artifacts/regression-0441')));
const checks=[], errors=[], consoleErrors=[];
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function check(name, ok, details=null) {
  checks.push({name,ok:!!ok,details});
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if (!ok) throw new Error(name);
}
let browser;
async function makePage(test) {
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  await context.setOffline(true);
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});
  await page.goto(pathToFileURL(game).href+(test?'?test=1':''),{waitUntil:'load',timeout:60000});
  await page.locator('#menuScreen').waitFor({state:'visible'});
  await page.locator('#dl42Boot').waitFor({state:'detached'});
  if(test) {
    await page.evaluate(()=>{__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false});});
    await page.waitForFunction(()=>__DL.v24ArtStatus().settled);
  }
  return {context,page};
}
async function mechanics() {
  const {context,page}=await makePage(true);
  try {
    const art=await page.evaluate(()=>__DL.v24ArtStatus());
    check('Original image catalogue finishes loading without missing assets',art.settled&&art.loaded===art.total&&!art.failures.length,art);
    const routes=[['campaign','startNew'],['north','startNorth'],['metro','startMetro'],['air','startAir'],['highway','startHighway'],['water','startWater'],['tower','startTower'],['dark','startDark']];
    for(const [mode,start] of routes) {
      const started=await page.evaluate(({mode,start})=>{
        __DL.showMenu(); __DL[start](...(start==='startNew'?['campaign']:[]));
        __DL.start(); __DL.stopLoop();
        return {phase:__DL.snapshot().phase,mode:__DL.snapshot().run?.mode};
      },{mode,start});
      check(`${mode}: route enters combat`,started.phase==='combat'&&started.mode===mode,started);
      const battle=await page.evaluate(()=>{
        __DL.setScreenAim(720,430);
        for(let i=0;i<120&&__DL.snapshot().phase==='combat';i++) {
          if(i%4===0)__DL.fire();
          if(i===45)__DL.reload();
          __DL.step(.05);
        }
        const {run,wave,phase,enemies}=__DL.snapshot();
        const bad=[];
        for(const k of ['cash','health','wall','wallMax'])if(!Number.isFinite(run[k])||run[k]<0)bad.push(k);
        for(const [id,a] of Object.entries(run.weapons))if(!Number.isFinite(a.mag)||!Number.isFinite(a.reserve)||a.mag<0||a.reserve<0)bad.push(id);
        if(run.inventory.some(n=>!Number.isFinite(n)||n<0))bad.push('inventory');
        return {phase,bad,time:wave.time,spawned:wave.spawned,alive:enemies.filter(e=>!e.dead).length};
      });
      check(`${mode}: six seconds of real simulation keep resources finite`,battle.phase==='combat'&&!battle.bad.length&&battle.time>=5.9,battle);
      const views=await page.evaluate(()=>{
        const results=[];
        for(const view of ['right','left','front','rear']){
          __DL.readState().wave.fronts.view=view;__DL.render();
          const state=__DL.dl403.state();
          results.push({view:__DL.currentView(),gun:state.gunPasses,player:state.playerPasses,rear:!!__DL.dl410.state().lastRearPlayer});
        }
        return results;
      });
      check(`${mode}: four views preserve the correct survivor and FPS weapon`,views[0].player===1&&views[1].player===1&&views[2].gun===1&&views[3].gun===0&&views[3].rear,views);
      const pause=await page.evaluate(()=>{
        __DL.pause();const before=__DL.snapshot();__DL.advance(2);const after=__DL.snapshot();__DL.unpause();
        return {phase:before.phase,time:after.wave.time-before.wave.time,cash:after.run.cash-before.run.cash,health:after.run.health-before.run.health};
      });
      check(`${mode}: pause freezes the combat and economy`,pause.phase==='paused'&&pause.time===0&&pause.cash===0&&pause.health===0,pause);
      const transition=await page.evaluate(()=>{
        const before=__DL.snapshot().run.night;
        // Journey routes also require arrival, beyond killing every contact.
        const wave=__DL.readState().wave;
        const journey=['metro','air','highway','water'].map(k=>wave[k]).find(v=>v&&Number.isFinite(v.target));
        let arrivalGuarded=null;
        if(journey){
          __DL.completeWave();arrivalGuarded=__DL.snapshot().phase==='combat'&&__DL.snapshot().run.night===before;
          journey.distance=journey.target;
          __DL.getMetroEchoes().length=0;__DL.getMetroRetreats().length=0;
        }
        __DL.completeWave();
        const current=__DL.snapshot();
        const exported=JSON.parse(__DL.exportText()),validated=__DL.validateSave(exported);
        const family=__DL.checkpointFamily(current.run),saved=__DL.checkpointFor(family);
        __DL.showMenu();const resumed=__DL.resumeCheckpoint(family);const after=__DL.snapshot();
        return {before,night:after.run.night,mode:after.run.mode,phase:after.phase,version:validated.version,resumed,savedNight:saved?.night,arrivalGuarded};
      });
      if(transition.arrivalGuarded!==null)check(`${mode}: clearing contacts cannot finish the journey before arrival`,transition.arrivalGuarded);
      check(`${mode}: controlled wave completion saves and resumes the next preparation`,transition.night===transition.before+1&&transition.savedNight===transition.night&&transition.mode===mode&&transition.phase==='camp'&&transition.version===12&&transition.resumed,transition);
    }
    // Gunsmith conservation and six genuine preset slots.
    await page.evaluate(()=>{
      __DL.showMenu();__DL.startNew('campaign');
      __DL.setMeta({xp:999999,weaponMastery:{rifle:{kills:500,headshots:100,damage:50000}}});
      __DL.setRun({cash:20000});const run=__DL.readState().run;
      run.weapons.rifle={mag:20,reserve:120,level:0};run.loadout=['rifle',null];run.activeId='rifle';
      DL36Gunsmith.ensure().selected='rifle';__DL.setTab('workshop');
    });
    const gunsmith=await page.evaluate(()=>{
      const ids=DL36Gunsmith.attachments.map(a=>a.id);
      const parts=['optic_reflex','muzzle_comp','barrel_long','mag_extended',ids.find(id=>id.startsWith('grip_'))];
      const total=()=>{const a=__DL.getAmmo('rifle');return a.mag+a.reserve;};
      const before=total();for(const id of parts)DL36Gunsmith.equip(id);
      const count=Object.keys(DL36Gunsmith.config('rifle').active).length;
      const sixth=DL36Gunsmith.equip(ids.find(id=>id.startsWith('stock_')));
      const stats=JSON.stringify(DL36Gunsmith.stats('rifle'));for(let i=0;i<30;i++)DL36Gunsmith.ensure();
      const stable=stats===JSON.stringify(DL36Gunsmith.stats('rifle'));
      for(let i=0;i<6;i++){DL36Gunsmith.config('rifle').tuning.optic_reflex=i*10;DL36Gunsmith.savePreset(i);}
      const presets=[];for(let i=0;i<6;i++){DL36Gunsmith.loadPreset(i);presets.push(DL36Gunsmith.config('rifle').tuning.optic_reflex);}
      DL36Gunsmith.reset();
      return {before,after:total(),count,sixth,stable,presets,stored:__DL.validateSave(JSON.parse(__DL.exportText())).meta.gunsmithV36.weapons.rifle.presets.length};
    });
    check('Gunsmith respects five-part limit and conserves ammunition',gunsmith.count===5&&!gunsmith.sixth&&gunsmith.before===gunsmith.after,gunsmith);
    check('Gunsmith recalculation is stable and all six presets survive serialization',gunsmith.stable&&gunsmith.presets.every((v,i)=>v===i*10)&&gunsmith.stored===6,gunsmith);
    // Dark route: hidden enemies, native fuse controls, and save validation.
    await page.evaluate(()=>{__DL.showMenu();__DL.startDark();__DL.start();__DL.stopLoop();__DL.dl401.tickDark(0);__DL.dl401.damage(1,100);__DL.clearEnemies();});
    const visibility=await page.evaluate(()=>{
      for(const x of [175,500,875]){const z=__DL.spawn('darkWanderer');z.lane=0;z.x=x;z.feet=486;z.dark={revealed:0,mark:0};}
      return ['right','left','front','rear'].map(view=>{__DL.readState().wave.fronts.view=view;__DL.render();return {view,visible:__DL.readState().enemies.map(z=>__DL.targetVisible(z))};});
    });
    check('Darkness hides only the broken circuit in all four views',visibility.every(v=>JSON.stringify(v.visible)==='[true,false,true]'),visibility);
    const fuseBefore=await page.evaluate(()=>{__DL.dl401.select(1);__DL.setRun({wall:111});__DL.refresh();return __DL.snapshot().run.dark.fuses;});
    await page.keyboard.press('q');
    const repaired=await page.evaluate(()=>__DL.snapshot().run);
    check('Native Q repairs the circuit using one fuse and leaves the barricade unchanged',repaired.dark.circuits.every(v=>v===100)&&repaired.dark.fuses===fuseBefore-1&&repaired.wall===111);
    const rejected=await page.evaluate(()=>{
      __DL.setPhase('camp');__DL.saveCamp();const original=JSON.parse(__DL.exportText());
      const future=structuredClone(original);future.version=999;
      const invalid=structuredClone(original);const dark=Object.values(invalid).find(v=>v&&typeof v==='object'&&v.mode==='dark');dark.dark.circuits=[100,0];
      const before=__DL.exportText();const results=[future,invalid].map(value=>{try{__DL.validateSave(value);return false;}catch{return true;}});
      return {results,unchanged:before===__DL.exportText()};
    });
    check('Future or malformed profiles are rejected without changing the live profile',rejected.results.every(Boolean)&&rejected.unchanged,rejected);
    // Focus safety uses the browser's event path and the real input state.
    await page.evaluate(()=>{__DL.showMenu();__DL.startNew('campaign');__DL.start();__DL.stopLoop();__DL.setHeld(true);window.dispatchEvent(new Event('blur'));});
    const input=await page.evaluate(()=>({phase:__DL.snapshot().phase,...__DL.getInput()}));
    check('Losing focus pauses and releases combat input',input.phase==='paused'&&!input.shootHeld&&input.aimPointerId===null,input);
    await page.evaluate(()=>__DL.unpause());
    check('Resuming does not fire without a new press',!await page.evaluate(()=>__DL.getInput().shootHeld));
  } finally {await context.close();}
}
async function productionTransfer() {
  const {context,page}=await makePage(false);
  try {
    check('Profile transfer runs without the test API',await page.evaluate(()=>typeof __DL==='undefined'));
    await page.locator('[data-page="campaigns"]').click();await page.locator('#newCampaign').click();
    const skip=page.getByRole('button',{name:'COMMENCER SANS FORMATION',exact:true});if(await skip.isVisible())await skip.click();
    await page.locator('#campScreen').waitFor({state:'visible'});
    await page.locator('#backMenu').click();
    await page.locator('[data-page="options"]').click();await page.locator('#saveManagerBtn').click();
    const downloadPromise=page.waitForEvent('download');await page.locator('#exportSave').click();const download=await downloadPromise;
    const exportedPath=path.join(out,'exported-test-profile.json');await download.saveAs(exportedPath);
    const exported=JSON.parse(fs.readFileSync(exportedPath,'utf8'));
    check('Production export creates a valid schema-12 preparation',exported.version===12&&exported.save?.mode==='campaign'&&exported.save.night===1);
    const original=await page.evaluate(()=>localStorage.getItem('derniere-ligne-v12'));
    await page.locator('#savePaste').fill('{broken');await page.locator('#importPaste').click();
    check('Invalid JSON shows an error and preserves the stored preparation',await page.locator('#saveError').isVisible()&&original===await page.evaluate(()=>localStorage.getItem('derniere-ligne-v12')));
    await page.locator('#savePaste').fill(JSON.stringify(exported));await page.locator('#importPaste').click();
    await page.locator('#cancelImport').click();
    check('Cancelling a validated import preserves the stored profile',original===await page.evaluate(()=>localStorage.getItem('derniere-ligne-v12')));
    const legacyPath=path.join(root,'scripts/fixtures/profile-0.44.0.json');
    const legacy=JSON.parse(fs.readFileSync(legacyPath,'utf8'));
    await page.locator('#saveFile').setInputFiles(legacyPath);
    await page.locator('#confirmImport').click();
    await page.locator('#menuScreen').waitFor({state:'visible'});
    await page.reload({waitUntil:'load'});await page.locator('#dl42Boot').waitFor({state:'detached'});
    const stored=await page.evaluate(()=>({current:JSON.parse(localStorage.getItem('derniere-ligne-v12')),backup:JSON.parse(localStorage.getItem('derniere-ligne-v12-backup'))}));
    check('Confirmed file import survives reload and retains a backup',stored.current.version===12&&stored.current.save?.cash===legacy.save.cash&&stored.current.save?.night===legacy.save.night&&stored.backup?.save?.mode==='campaign');
    const preparations=profile=>Object.values(profile).filter(v=>v&&typeof v==='object'&&typeof v.mode==='string').map(r=>({mode:r.mode,night:r.night,cash:r.cash,weapons:r.weapons,loadout:r.loadout})).sort((a,b)=>a.mode.localeCompare(b.mode));
    check('The original 0.44.0 profile retains eight independent routes and ammunition reserves',preparations(legacy).length===8&&JSON.stringify(preparations(stored.current))===JSON.stringify(preparations(legacy)),preparations(stored.current));
    await page.locator('[data-page="resume"]').click();await page.locator('#continueBtn').click();
    await page.locator('#campScreen').waitFor({state:'visible'});
    check('Imported preparation resumes through the production Continue button',await page.locator('#startWaveBtn').isVisible());
  } finally {await context.close();}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});let failure=null;const started=new Date().toISOString();let browserVersion;
  try {
    browser=await playwright.chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HORDE_BROWSER_EXECUTABLE?{executablePath:process.env.HORDE_BROWSER_EXECUTABLE}:{})});
    browserVersion=browser.version();await mechanics();await productionTransfer();
    check('No uncaught JavaScript errors',!errors.length,errors);check('No browser console errors',!consoleErrors.length,consoleErrors);
  } catch(error){failure=error.stack||String(error);console.error(failure);}
  finally {
    if(browser)await browser.close();
    const report={started,finished:new Date().toISOString(),browser:browserVersion,gameSha256:digest(game),testScriptSha256:digest(__filename),originalImages:true,protocol:'file:',offline:true,passed:checks.filter(c=>c.ok).length,total:checks.length,checks,errors,consoleErrors,error:failure,limitations:['Controlled combat and forced wave completion exercise transitions, not campaign balance or a naturally won campaign.','Headless desktop Chromium; physical phones, controllers and audio listening remain separate checks.']};
    fs.writeFileSync(path.join(out,'regression-0441.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,total:report.total,error:!!failure}));process.exitCode=failure?1:0;
  }
})();
