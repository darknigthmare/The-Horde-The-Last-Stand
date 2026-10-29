#!/usr/bin/env node
'use strict';

// Production UI regression: no ?test=1 and no engine test API. Gamepad input is
// an emulated navigator.getGamepads device; touch uses Chromium's input stack.
// This does not certify a physical controller, touchscreen or mobile browser.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
let playwright;
try{playwright=require('playwright');}
catch(error){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw error;playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}
const root=path.resolve(__dirname,'..');
function option(name,fallback){const at=process.argv.indexOf(name);return at<0?fallback:process.argv[at+1];}
const gameDir=path.resolve(option('--game-dir',path.join(root,'game')));
const game=path.join(gameDir,'JOUER_DERNIERE_LIGNE.html');
const out=path.resolve(option('--out',path.join(root,'artifacts','input-0442')));
const checks=[],errors=[],observations=[];
let browser;
function check(name,ok,details=null){checks.push({name,ok:!!ok,details});console.log(`${ok?'PASS':'FAIL'} ${name}`);}
const phase=p=>p.locator('#shell').getAttribute('data-phase');
const waitPhase=(p,value)=>p.waitForFunction(expected=>document.getElementById('shell')?.dataset.phase===expected,value);
const ammo=p=>p.locator('#ammo').evaluate(e=>Number(e.textContent.match(/^\s*(\d+)/)?.[1]));
const waitAmmoLess=(p,before)=>p.waitForFunction(value=>Number(document.getElementById('ammo').textContent.match(/^\s*(\d+)/)?.[1])<value,before,{timeout:4000});
// A shot already processed before pointerup can reach the throttled HUD on the
// next frame. Sample its settled value, then require that firing stays stopped.
async function settleHUD(p){await p.waitForTimeout(120);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}

async function openPage(label,options={}){
 const context=await browser.newContext({viewport:{width:1440,height:900},...options});
 await context.setOffline(true);
 await context.addInitScript(()=>{
  const pad={id:'Regression standard controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
  window.__inputFixture={pad,connected:false};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__inputFixture.connected?[pad]:[]});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push({label,message:error.message}));
 await page.goto(pathToFileURL(game).href,{waitUntil:'load',timeout:60000});
 await page.locator('#dl42Boot').waitFor({state:'detached'});
 await page.locator('#menuScreen').waitFor({state:'visible'});
 check(`${label}: production has no game test API`,await page.evaluate(()=>typeof window.__DL==='undefined'));
 observations.push({label,title:await page.title(),viewport:page.viewportSize()});
 return{context,page};
}
async function openBindings(p){
 await p.locator('[data-page="options"]').click();await p.locator('#settingsBtn').click();
 const fold=p.locator('details').filter({has:p.locator('#v21ControlSettings')});
 if(await fold.count()&&!await fold.evaluate(e=>e.open))await fold.locator('summary').click();
 await p.locator('[data-v21-bind="reload"]').waitFor({state:'visible'});
}
const bindingLabels=p=>p.locator('#v21BindingList').evaluate(e=>Object.fromEntries([...e.querySelectorAll('[data-v21-bind]')].map(b=>[b.dataset.v21Bind,b.textContent.trim()])));
const focusedBinding=p=>p.evaluate(()=>document.activeElement?.dataset?.v21Bind||null);
async function bind(p,action,code){await p.locator(`[data-v21-bind="${action}"]`).click();await p.keyboard.press(code);}
async function startCombat(p){
 await p.locator('[data-page="campaigns"]').click();await p.locator('#newCampaign').click();
 const training=p.getByRole('button',{name:'COMMENCER SANS FORMATION',exact:true});if(await training.isVisible())await training.click();
 await p.locator('#campScreen').waitFor({state:'visible'});await p.locator('#startWaveBtn').click();
 if(await p.locator('#v18CinemaSkip').isVisible())await p.locator('#v18CinemaSkip').click();await waitPhase(p,'combat');
}
async function resume(p){await p.getByRole('button',{name:'REPRENDRE',exact:true}).click();await waitPhase(p,'combat');}
async function connect(p,connected){
 await p.evaluate(value=>{const f=window.__inputFixture;f.connected=value;f.pad.connected=value;const event=new Event(value?'gamepadconnected':'gamepaddisconnected');Object.defineProperty(event,'gamepad',{value:f.pad});window.dispatchEvent(event);},connected);
 await p.waitForTimeout(250);
}
async function button(p,index,pressed){await p.evaluate(({index,pressed})=>{const f=window.__inputFixture;f.pad.buttons[index]={pressed,touched:pressed,value:pressed?1:0};f.pad.timestamp=performance.now();},{index,pressed});}
async function legend(p){return p.locator('#shell').evaluate(e=>({mode:e.dataset.input,legend:e.dataset.dl42Input,padClass:e.classList.contains('gamepad-connected'),keyboardShown:[...e.querySelectorAll('#dl42ControlLegend [data-kb]')].every(x=>!x.hidden),padShown:[...e.querySelectorAll('#dl42ControlLegend [data-pad]')].every(x=>!x.hidden)}));}

async function keyboard(){
 const{context,page:p}=await openPage('keyboard');
 try{
  await openBindings(p);const defaults=await bindingLabels(p);
  await p.locator('[data-v21-bind="reload"]').click();
  check('rebind keeps focus on its replacement button',await focusedBinding(p)==='reload',{focus:await focusedBinding(p)});
  await p.keyboard.press('Escape');const afterEscape=await phase(p);
  check('Escape cancels capture without leaving Settings',afterEscape==='settings',{phase:afterEscape});
  await p.keyboard.press('KeyY');
  if(await phase(p)!=='settings')await openBindings(p);
  let labels=await bindingLabels(p);
  check('the key after Escape cannot silently change a binding',labels.reload===defaults.reload,{before:defaults.reload,after:labels.reload});
  await bind(p,'reload','KeyR');

  await p.locator('[data-v21-bind="reload"]').click();await p.keyboard.press('Tab');
  labels=await bindingLabels(p);
  check('Tab cancels capture and advances keyboard focus',labels.reload===defaults.reload&&await focusedBinding(p)==='grenade',{label:labels.reload,focus:await focusedBinding(p)});
  // Keep the comparison running when the old build is still capturing Tab.
  if(labels.reload.includes('APPUYEZ'))await p.keyboard.press('KeyR');

  await p.locator('[data-v21-bind="reload"]').click();await p.locator('#leaveSettings').click();await p.keyboard.press('KeyU');
  await openBindings(p);labels=await bindingLabels(p);
  check('leaving Settings discards a pending binding capture',labels.reload===defaults.reload,{before:defaults.reload,after:labels.reload});
  await bind(p,'reload','KeyR');
  await bind(p,'reload','KeyG');labels=await bindingLabels(p);
  check('conflicting binding swaps the two existing actions',labels.reload===defaults.grenade&&labels.grenade===defaults.reload,{reload:labels.reload,grenade:labels.grenade});
  check('completed rebind preserves keyboard focus',await focusedBinding(p)==='reload',{focus:await focusedBinding(p)});
  await p.reload({waitUntil:'load'});await p.locator('#dl42Boot').waitFor({state:'detached'});await openBindings(p);labels=await bindingLabels(p);
  check('rebound controls persist after a production reload',labels.reload===defaults.grenade&&labels.grenade===defaults.reload,{reload:labels.reload,grenade:labels.grenade});
  await p.locator('#v21ResetBindings').click();labels=await bindingLabels(p);
  check('reset restores every original keyboard action',JSON.stringify(labels)===JSON.stringify(defaults));
  await p.locator('#leaveSettings').focus();await p.keyboard.press('Tab');
  const wrap=await p.evaluate(()=>({inside:!!document.activeElement.closest('#dialogBody'),id:document.activeElement.id}));
  check('Tab stays in the modal after its last control',wrap.inside&&wrap.id!=='leaveSettings',wrap);
  await p.keyboard.press('Shift+Tab');
  check('Shift+Tab returns to the last modal control',await p.evaluate(()=>document.activeElement.id==='leaveSettings'));
  await p.keyboard.press('Escape');
  check('Escape closes Settings after capture is finished',await phase(p)==='menu');
  check('closing the modal restores its opener focus',await p.evaluate(()=>document.activeElement.id==='settingsBtn'),await p.evaluate(()=>document.activeElement.id));
 }finally{await context.close();}
}

async function gamepad(){
 const{context,page:p}=await openPage('gamepad');
 try{
  await startCombat(p);await connect(p,true);let state=await legend(p);
  check('a connected active gamepad displays its prompts',state.mode==='gamepad'&&state.legend==='gamepad'&&state.padShown,state);
  await p.keyboard.press('KeyZ');await p.waitForTimeout(250);state=await legend(p);
  check('keyboard input replaces idle gamepad prompts',state.mode==='keyboard'&&state.legend==='keyboard'&&state.keyboardShown&&!state.padClass,state);
  await p.keyboard.press('KeyP');await waitPhase(p,'paused');await button(p,15,true);await p.waitForTimeout(250);state=await legend(p);
  check('a gamepad menu action selects gamepad prompts',state.mode==='gamepad'&&state.legend==='gamepad',state);
  await button(p,15,false);await button(p,1,true);await waitPhase(p,'combat');await p.waitForTimeout(250);state=await legend(p);
  check('gamepad Back resumes without selecting keyboard prompts',state.mode==='gamepad'&&state.legend==='gamepad',state);
  await button(p,1,false);
  let before=await ammo(p);await button(p,7,true);await waitAmmoLess(p,before);
  check('a fresh trigger press fires in combat',await ammo(p)<before);
  await p.locator('#pauseBtn').click();await waitPhase(p,'paused');const paused=await ammo(p);await p.waitForTimeout(250);
  check('pause stops a held trigger',await ammo(p)===paused,{before:paused,after:await ammo(p)});
  await resume(p);before=await ammo(p);await p.waitForTimeout(650);
  check('a trigger held through pause cannot fire on resume',await ammo(p)===before,{before,after:await ammo(p)});
  await button(p,7,false);await p.waitForTimeout(150);before=await ammo(p);await button(p,7,true);await waitAmmoLess(p,before);
  check('releasing then pressing the trigger rearms fire',await ammo(p)<before);
  await button(p,7,false);await p.waitForTimeout(150);await p.locator('#reloadBtn').click();
  await p.waitForFunction(()=>Number(document.getElementById('ammo').textContent.match(/^\s*(\d+)/)?.[1])===12,null,{timeout:5000});
  before=await ammo(p);await button(p,7,true);await waitAmmoLess(p,before);
  await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await waitPhase(p,'paused');
  check('the production blur handler pauses combat',await phase(p)==='paused');
  await resume(p);before=await ammo(p);await p.waitForTimeout(650);
  check('a trigger held through blur cannot fire on resume',await ammo(p)===before,{before,after:await ammo(p)});
  await connect(p,false);before=await ammo(p);await p.waitForTimeout(350);state=await legend(p);
  check('disconnecting stops fire and removes gamepad prompts',await ammo(p)===before&&!state.padClass&&state.mode!=='gamepad'&&state.legend!=='gamepad',{before,after:await ammo(p),...state});
  // Connect while the trigger is still held: reconnecting must not be a shot.
  before=await ammo(p);await connect(p,true);await p.waitForTimeout(350);
  check('connecting a held trigger requires a release',await ammo(p)===before,{before,after:await ammo(p)});
  await button(p,7,false);await p.waitForTimeout(150);before=await ammo(p);await button(p,7,true);await waitAmmoLess(p,before);
  check('fire works after a reconnect and fresh trigger press',await ammo(p)<before);
  await button(p,7,false);await p.locator('#pauseBtn').click();
 }finally{await context.close();}
}

async function touch(){
 const{context,page:p}=await openPage('touch',{viewport:{width:960,height:540},hasTouch:true,isMobile:true});
 try{
  await startCombat(p);const cdp=await context.newCDPSession(p);
  const bounds=await p.locator('#game').boundingBox();
  const one={id:1,x:Math.round(bounds.x+bounds.width*.48),y:Math.round(bounds.y+bounds.height*.52),radiusX:3,radiusY:3,force:1};
  const two={...one,id:2,x:one.x+50};
  const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  let before=await ammo(p);await send('touchStart',[one]);await waitAmmoLess(p,before);
  check('a held primary touch fires',await ammo(p)<before);
  // For a partial touchEnd Chromium expects the point being released. An empty
  // list ends every touch; passing the primary point would release its aim.
  await send('touchStart',[one,two]);await send('touchEnd',[two]);before=await ammo(p);await waitAmmoLess(p,before);
  check('releasing a second touch preserves primary fire',await ammo(p)<before);
  const reload=await p.locator('#reloadBtn').boundingBox();const fingerReload={...two,x:Math.round(reload.x+reload.width/2),y:Math.round(reload.y+reload.height/2)};
  const beforeReload=await ammo(p);await send('touchStart',[one,fingerReload]);await send('touchEnd',[fingerReload]);
  await p.waitForFunction(value=>Number(document.getElementById('ammo').textContent.match(/^\s*(\d+)/)?.[1])>value,beforeReload,{timeout:5000});
  const reloaded=await ammo(p);
  check('a second finger activates Reload during primary aim',reloaded>beforeReload,{before:beforeReload,after:reloaded});
  await waitAmmoLess(p,reloaded);
  check('continuous touch resumes fire after that reload',await ammo(p)<reloaded);
  await send('touchEnd',[]);await settleHUD(p);before=await ammo(p);await p.waitForTimeout(500);
  check('releasing primary touch stops fire',await ammo(p)===before,{before,after:await ammo(p)});
  await send('touchStart',[one]);await waitAmmoLess(p,before);await send('touchCancel',[]);await settleHUD(p);before=await ammo(p);await p.waitForTimeout(500);
  check('touch cancellation stops fire',await ammo(p)===before,{before,after:await ammo(p)});
  await p.locator('#pauseBtn').click();
 }finally{await context.close();}
}

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 browser=await playwright.chromium.launch({headless:true,...(process.env.HORDE_BROWSER_EXECUTABLE?{executablePath:process.env.HORDE_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const browserVersion=browser.version();
 try{
  for(const[name,run]of[['keyboard',keyboard],['gamepad',gamepad],['touch',touch]]){
   try{await run();}catch(error){errors.push({scenario:name,message:error.stack||error.message});check(`${name}: scenario completed`,false,error.message);}
  }
  check('no browser JavaScript exceptions or scenario errors',errors.length===0,errors);
 }finally{
  await browser.close();
  const report={at:new Date().toISOString(),game,sha256:crypto.createHash('sha256').update(fs.readFileSync(game)).digest('hex'),browser:browserVersion,transport:'file://, offline',testAPI:false,inputEmulation:{keyboard:'Playwright keyboard events',gamepad:'navigator.getGamepads fixture and connection events',touch:'Chromium CDP Input.dispatchTouchEvent; 960×540, hasTouch/isMobile',blur:'synthetic window blur event through the production listener'},physicalHardwareTested:false,observations,checks,errors,passed:checks.filter(c=>c.ok).length,total:checks.length};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`${report.passed}/${report.total} checks passed; report: ${path.join(out,'report.json')}`);
  if(report.passed!==report.total)process.exitCode=1;
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
