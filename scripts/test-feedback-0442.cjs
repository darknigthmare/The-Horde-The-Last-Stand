#!/usr/bin/env node
'use strict';
// Real Web Audio nodes and signal observations. No subjective listening claim.
// --html permits running the same checks against a previous delivered HTML.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
let playwright;try{playwright=require('playwright');}catch(error){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw error;playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}
const root=path.resolve(__dirname,'..');
const option=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const html=path.resolve(option('--html',path.join(root,'game/JOUER_DERNIERE_LIGNE.html')));
const out=path.resolve(option('--out',path.join(root,'artifacts/feedback-0442')));
const checks=[],errors=[];let browser;
function check(name,ok,detail=null){checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);}
function observeAudio(){
 const edges=[],legacy=new Set(),sources=new Set(),contexts=new Set(),automations=new WeakMap();
 const connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect;
 AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(!edges.some(e=>e.source===this&&e.destination===destination))edges.push({source:this,destination});contexts.add(this.context);if(destination===this.context.destination&&this instanceof GainNode)legacy.add(this);return result;};
 AudioNode.prototype.disconnect=function(...args){const result=disconnect.apply(this,args);for(let i=edges.length-1;i>=0;i--)if(edges[i].source===this&&(!args.length||edges[i].destination===args[0]))edges.splice(i,1);return result;};
 for(const prototype of [OscillatorNode.prototype,AudioBufferSourceNode.prototype]){const start=prototype.start;prototype.start=function(...args){const result=start.apply(this,args);sources.add(this);this.addEventListener('ended',()=>sources.delete(this),{once:true});return result;};}
 for(const method of ['setValueAtTime','setTargetAtTime','linearRampToValueAtTime']){const prior=AudioParam.prototype[method];AudioParam.prototype[method]=function(...args){const result=prior.apply(this,args);automations.set(this,(automations.get(this)||0)+1);return result;};}
 const analyzers=new Map();
 function outputEdges(){return edges.filter(e=>e.destination===e.source.context.destination);}
 function graph(){
  const outputs=outputEdges(),comp=outputs.find(e=>e.source instanceof DynamicsCompressorNode)?.source;
  const master=edges.find(e=>e.destination===comp&&e.source instanceof GainNode)?.source;
  const buses=edges.filter(e=>e.destination===master&&e.source instanceof GainNode).map(e=>e.source);
  const engine=edges.find(e=>e.destination===buses[1]&&e.source instanceof GainNode&&!legacy.has(e.source)&&edges.some(p=>p.destination===e.source&&p.source instanceof OscillatorNode&&p.source.type==='sawtooth'))?.source;
  return{contexts:contexts.size,activeSources:sources.size,outputs:outputs.map(e=>e.source.constructor.name),master:master?.gain.value??null,masterAutomations:master?automations.get(master.gain)||0:0,sfx:buses[0]?.gain.value??null,ambience:buses[1]?.gain.value??null,music:buses[2]?.gain.value??null,engineThroughAmbience:engine?.gain.value??null,legacy:[...legacy].map(node=>({gain:node.gain.value,routedToAmbience:edges.some(e=>e.source===node&&e.destination===buses[1]),direct:edges.some(e=>e.source===node&&e.destination===node.context.destination)}))};
 }
 function sample(){
  return outputEdges().map(({source})=>{let analyser=analyzers.get(source);if(!analyser){analyser=source.context.createAnalyser();analyser.fftSize=2048;connect.call(source,analyser);analyzers.set(source,analyser);}const values=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(values);return{source:source.constructor.name,rms:Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)/values.length)};});
 }
 window.__feedbackAudioObservation={graph,sample};
}
// Observe native Canvas calls and the pixels they actually composite. The game
// still uses its original images, renderer, particles and damage functions.
function observeCanvas(){
 const proto=CanvasRenderingContext2D.prototype,gradients=new WeakMap(),paths=new WeakMap();
 const state={records:null,sizes:new Map()};
 const radial=proto.createRadialGradient;
 proto.createRadialGradient=function(...args){const gradient=radial.apply(this,args);gradients.set(gradient,{args,stops:[]});return gradient;};
 const stop=CanvasGradient.prototype.addColorStop;
 CanvasGradient.prototype.addColorStop=function(offset,color){const result=stop.call(this,offset,color);gradients.get(this)?.stops.push({offset,color});return result;};
 const begin=proto.beginPath,ellipse=proto.ellipse;
 proto.beginPath=function(...args){paths.delete(this);return begin.apply(this,args);};
 proto.ellipse=function(x,y,rx,ry,...args){paths.set(this,[x-rx,y-ry,rx*2,ry*2]);return ellipse.call(this,x,y,rx,ry,...args);};
 function bounds(ctx,box){
  if(!box)return null;const [x,y,w,h]=box,t=ctx.getTransform(),corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>[t.a*a+t.c*b+t.e,t.b*a+t.d*b+t.f]);
  const left=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),top=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1]))));
  const right=Math.min(ctx.canvas.width,Math.ceil(Math.max(...corners.map(p=>p[0])))),bottom=Math.min(ctx.canvas.height,Math.ceil(Math.max(...corners.map(p=>p[1]))));
  return right>left&&bottom>top?[left,top,right-left,bottom-top]:null;
 }
 function draw(ctx,kind,native,args,box=null,extra={}){
  const region=bounds(ctx,box),before=region?ctx.getImageData(...region).data:null,alpha=ctx.globalAlpha;
  const result=native.apply(ctx,args),record={kind,alpha,...extra};
  if(region){const after=ctx.getImageData(...region).data;let rgbDelta=0,changedPixels=0;for(let i=0;i<after.length;i+=4){const delta=Math.abs(after[i]-before[i])+Math.abs(after[i+1]-before[i+1])+Math.abs(after[i+2]-before[i+2]);rgbDelta+=delta;if(delta)changedPixels++;}record.pixels={region,rgbDelta,changedPixels};}
  state.records.push(record);return result;
 }
 const image=proto.drawImage;
 proto.drawImage=function(...args){const size=args[3],name=state.sizes.get(size);if(state.records&&this.canvas.id==='game'&&name&&args.length===5&&args[1]===-size/2&&args[2]===-size/2&&args[4]===size)return draw(this,'sprite:'+name,image,args,args.slice(1));return image.apply(this,args);};
 for(const method of ['fill','fillRect','stroke']){
  const native=proto[method];proto[method]=function(...args){
   if(!state.records||this.canvas.id!=='game')return native.apply(this,args);
   const style=method==='stroke'?this.strokeStyle:this.fillStyle,g=gradients.get(style),color=typeof style==='string'?style.replaceAll(' ',''):'';
   if(g?.stops.some(s=>s.color==='#fffbd3')){const [,,,x,y,r]=g.args;return draw(this,'fps-muzzle',native,args,[x-r,y-r,2*r,2*r]);}
   const vignette=g?.stops.find(s=>/^rgba\((150,24,18|220,144,55),/.test(s.color));
   if(vignette)return draw(this,'vignette',native,args,method==='fillRect'?args:null,{gradientAlpha:Number(vignette.color.match(/,([\d.]+)\)$/)[1])});
   if(method==='fill'&&(color==='#ffe3a6cc'||color==='rgba(255,227,166,0.8)'))return draw(this,'rear-muzzle',native,args,paths.get(this));
   if(method==='fillRect'&&color==='#e8aa65')return draw(this,'spark',native,args);
   if(method==='stroke'&&color==='#e8c794')return draw(this,'ring',native,args);
   if(method==='stroke'&&['#dbe8d8','#f2d889'].includes(color))return draw(this,'impact-marker',native,args);
   return native.apply(this,args);
  };
 }
 window.__feedbackCanvasObservation={begin:targets=>{state.records=[];state.sizes=new Map(targets||[]);},end:()=>{const records=state.records;state.records=null;return records;}};
}

async function checkVisualFeedback(context){
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(observeCanvas);
 await page.goto(pathToFileURL(html).href+'?test=1',{waitUntil:'load',timeout:60000});
 await page.evaluate(()=>{__DL.stopLoop();__DL.setSettings({sound:false,cinematics:false,motion:false,cameraImpact:false,performanceMode:'quality',artImages:true,artEffectsV26:true,reducedFlashes:false});__DL.startNew('campaign');__DL.start();__DL.stopLoop();__DL.clearEnemies();});
 await page.waitForFunction(()=>__DL.v24ArtStatus().settled,{},{timeout:20000});
 const sprites=await page.evaluate(()=>{
  const names=['muzzle1','muzzle2','sparks','explosion','blood','smoke','tracer','debris'],targets=names.map((name,i)=>[161+i,name]);
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');__DL.render();
  names.forEach((name,i)=>__DL.v26PushEffect(name,210+(i%4)*340,230+Math.floor(i/4)*260,161+i,.25,true,0));
  function frame(reduced){__DL.setSettings({reducedFlashes:reduced});__feedbackCanvasObservation.begin(targets);const random=Math.random;let seed=1747;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);try{__DL.render();return{records:__feedbackCanvasObservation.end(),pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data,png:canvas.toDataURL('image/png')};}finally{Math.random=random;}}
  const normal=frame(false),reduced=frame(true),restored=frame(false);let changed=0;for(let i=0;i<normal.pixels.length;i++)if(normal.pixels[i]!==restored.pixels[i])changed++;
  return{normal:normal.records,reduced:reduced.records,restoredChangedChannels:changed,images:{'flashes-sprites-normal.png':normal.png,'flashes-sprites-reduced.png':reduced.png}};
 });
 for(const [name,url] of Object.entries(sprites.images))fs.writeFileSync(path.join(out,name),Buffer.from(url.split(',')[1],'base64'));delete sprites.images;
 const bright=['muzzle1','muzzle2','sparks','explosion'];
 for(const name of bright){const a=sprites.normal.find(r=>r.kind==='sprite:'+name),b=sprites.reduced.find(r=>r.kind==='sprite:'+name),ratio=b?.pixels.rgbDelta/a?.pixels.rgbDelta;check(`${name}: reduced flashes attenuate actual sprite pixels`,a?.alpha===1&&b?.alpha===.25&&a.pixels.changedPixels>0&&b.pixels.changedPixels>0&&ratio>.1&&ratio<.4,{normal:a,reduced:b,pixelDeltaRatio:ratio});}
 const retained=['blood','smoke','tracer','debris'].map(name=>({name,normal:sprites.normal.find(r=>r.kind==='sprite:'+name),reduced:sprites.reduced.find(r=>r.kind==='sprite:'+name)}));
 check('Blood, smoke, tracer and debris sprites retain their opacity and pixel contribution',retained.every(r=>r.normal?.alpha===r.reduced?.alpha&&r.normal?.pixels.rgbDelta>0&&r.normal?.pixels.rgbDelta===r.reduced?.pixels.rgbDelta),retained);
 check('Restoring normal flashes restores the exact frozen Canvas frame',sprites.restoredChangedChannels===0,{changedChannels:sprites.restoredChangedChannels});
 const cases=await page.evaluate(()=>{
  const output=[],canvas=document.getElementById('game');
  const signature=()=>{const {run,wave,enemies}=__DL.readState();return JSON.stringify({health:run.health,wall:run.wall,ammo:run.weapons.pistol.mag,cash:run.cash,time:wave.time,enemies:enemies.map(z=>({id:z.id,x:z.x,feet:z.feet,hp:z.hp,dead:z.dead,stun:z.stun,hit:z.hit}))});};
  function setup(view,reduced){
   __DL.showMenu();__DL.setSettings({reducedFlashes:reduced,artEffectsV26:false,sound:false,motion:false,cameraImpact:false});__DL.startNew('campaign');__DL.start();__DL.stopLoop();__DL.clearEnemies();
   const {run,wave}=__DL.readState();wave.fronts.view=view;run.activeId='pistol';run.weapons.pistol.mag=8;__DL.setTimers({cooldown:0,reload:0});__DL.setBallisticSeed(1747);
   const z=__DL.spawn('walker');Object.assign(z,{id:1234,x:550,feet:620,lane:1,size:1,hp:1000,maxHp:1000,step:0});
   const initial=z.hp;__DL.hit(z,20,false,'player');const afterHit=z.hp;__DL.explosion(z.x,z.feet-40,120,30,false);const afterBlast=z.hp;
   const p=__DL.projectedEnemy(z);__DL.setScreenAim(p.x,p.body);__DL.fire();
   for(const p of __DL.getEffects().particles){p.life=p.max*.5;p.x+=p.vx*.08;p.y+=p.vy*.08;}
   return{hit:initial-afterHit,blast:afterHit-afterBlast,shot:afterBlast-z.hp,ammo:run.weapons.pistol.mag,hp:z.hp};
  }
  function frame(reduced){__DL.setSettings({reducedFlashes:reduced});const before=signature();__feedbackCanvasObservation.begin();__DL.render();const records=__feedbackCanvasObservation.end();return{records,simulationUnchanged:before===signature(),png:canvas.toDataURL('image/png')};}
  for(const view of ['right','left','front','rear']){
   const prior=Math.random;let seed=6127;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
   try{const normalRules=setup(view,false),normal=frame(false),reduced=frame(true);seed=6127;const reducedRules=setup(view,true);output.push({view,normalRules,reducedRules,normal,reduced});}finally{Math.random=prior;}
  }
  return output;
 });
 const group=(frame,kind)=>frame.records.filter(r=>r.kind===kind),quarter=(a,b,key='alpha')=>a.length>0&&a.length===b.length&&a.every((r,i)=>Math.abs(b[i][key]-r[key]*.25)<1e-9);
 for(const c of cases){
  for(const mode of ['normal','reduced']){fs.writeFileSync(path.join(out,`flashes-${c.view}-${mode}.png`),Buffer.from(c[mode].png.split(',')[1],'base64'));delete c[mode].png;}
  const particle={normalSparks:group(c.normal,'spark'),reducedSparks:group(c.reduced,'spark'),normalRings:group(c.normal,'ring'),reducedRings:group(c.reduced,'ring')};
  check(`${c.view}: procedural explosion sparks and rings respect reduced flashes`,quarter(particle.normalSparks,particle.reducedSparks)&&quarter(particle.normalRings,particle.reducedRings),particle);
  const a=group(c.normal,'vignette'),b=group(c.reduced,'vignette');check(`${c.view}: blast vignette dims its actual Canvas pixel contribution`,quarter(a,b,'gradientAlpha')&&a.every((r,i)=>r.pixels.rgbDelta>0&&b[i].pixels.rgbDelta>0&&b[i].pixels.rgbDelta<r.pixels.rgbDelta*.5),{normal:a,reduced:b});
  const markers=group(c.normal,'impact-marker'),reducedMarkers=group(c.reduced,'impact-marker');
  check(`${c.view}: damage, ammunition, hit markers and simulation survive the comfort setting`,JSON.stringify(c.normalRules)===JSON.stringify(c.reducedRules)&&c.normalRules.hit>0&&c.normalRules.blast>0&&c.normalRules.ammo===7&&c.normal.simulationUnchanged&&c.reduced.simulationUnchanged&&markers.length>0&&JSON.stringify(markers)===JSON.stringify(reducedMarkers),{normalRules:c.normalRules,reducedRules:c.reducedRules,renderUnchanged:c.normal.simulationUnchanged&&c.reduced.simulationUnchanged,markers,reducedMarkers});
  if(c.view==='front'||c.view==='rear'){const kind=c.view==='front'?'fps-muzzle':'rear-muzzle',normal=group(c.normal,kind),reduced=group(c.reduced,kind);check(`${c.view}: procedural muzzle flash dims while remaining visible`,quarter(normal,reduced)&&normal.every((r,i)=>r.pixels.rgbDelta>0&&reduced[i].pixels.rgbDelta>0&&reduced[i].pixels.rgbDelta<r.pixels.rgbDelta*.5),{normal,reduced});}
 }
 await page.close();
}
const capture=page=>page.evaluate(()=>({graph:__feedbackAudioObservation.graph(),signals:__feedbackAudioObservation.sample(),audio:__DL.getAudioState(),phase:__DL.snapshot().phase,soundButton:{pressed:document.getElementById('soundBtn').getAttribute('aria-pressed'),title:document.getElementById('soundBtn').title},waveTime:__DL.readState().wave?.time}));
const silent=reading=>reading.signals.length>0&&reading.signals.every(s=>s.rms<1e-7);
async function slider(page,id,toMaximum){
 await page.evaluate(()=>{__DL.stopLoop();if(__DL.snapshot().phase==='combat')__DL.pause();__DL.showSettings('paused');});
 const input=page.locator('#'+id);await input.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 await input.focus();await input.press(toMaximum?'End':'Home');
 await page.locator('#leaveSettings').click();
 await page.getByRole('button',{name:'REPRENDRE',exact:true}).click();
 await page.evaluate(()=>{__DL.stopLoop();__DL.refresh();});
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});let failure=null,browserVersion=null;
 const started=new Date().toISOString();
 try{
  browser=await playwright.chromium.launch({...(process.env.HORDE_BROWSER_EXECUTABLE?{executablePath:process.env.HORDE_BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:900}});await context.setOffline(true);
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(observeAudio);
  await page.goto(pathToFileURL(html).href+'?test=1',{waitUntil:'load',timeout:60000});
  await page.evaluate(()=>{__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,performanceMode:'quality',masterVolume:.82,sfxVolume:.88,ambienceVolume:.42,musicVolume:.26});__DL.startHighway();__DL.start();__DL.stopLoop();__DL.refresh();});
  await page.locator('#soundBtn').click();await page.evaluate(()=>{__DL.refresh();__feedbackAudioObservation.sample();__DL.stopLoop();__DL.startLoop();});
  await page.waitForTimeout(750);const on=await capture(page);
  check('Audio graph runs and synthesizes a measurable signal',on.audio.context==='running'&&on.signals.some(s=>s.rms>1e-5),on);
  check('Audio button exposes its actual enabled state',on.soundButton.pressed==='true'&&on.soundButton.title==='Audio activé',on.soundButton);
  check('Highway motor passes through the unified mixer',on.graph.outputs.length===1&&on.graph.outputs[0]==='DynamicsCompressorNode'&&on.graph.legacy.every(h=>h.routedToAmbience&&!h.direct),on.graph);
  await page.locator('#soundBtn').click();const muteAt=(await capture(page)).waveTime;
  await page.waitForTimeout(450);const off=await capture(page);
  check('HUD AUDIO OFF reaches true master zero during an active game loop',!off.audio.enabled&&off.graph.master===0,off);
  check('Audio button exposes its actual muted state',off.soundButton.pressed==='false'&&off.soundButton.title==='Audio désactivé',off.soundButton);
  check('HUD AUDIO OFF silences the real output signal',silent(off),off.signals);
  check('Muting audio leaves the combat simulation advancing',off.waveTime>muteAt+.15,{before:muteAt,after:off.waveTime});
  await page.evaluate(()=>{const b=document.getElementById('soundBtn');b.click();b.click();b.click();});await page.waitForTimeout(600);const restored=await capture(page);
  check('Rapid off/on toggles restore the configured master level',restored.audio.enabled&&Math.abs(restored.graph.master-.82)<.01&&restored.signals.some(s=>s.rms>1e-5),restored);
  const automationCount=restored.graph.masterAutomations;await page.waitForTimeout(450);const stable=await capture(page);
  check('Unchanged master level does not restart audio automation',stable.graph.masterAutomations===automationCount,{before:automationCount,after:stable.graph.masterAutomations});
  await page.evaluate(()=>{const b=document.getElementById('soundBtn');b.click();b.click();b.click();});await page.waitForTimeout(250);const rapidOff=await capture(page);
  check('Rapid toggles ending OFF leave no delayed unmute',!rapidOff.audio.enabled&&rapidOff.graph.master===0&&silent(rapidOff),rapidOff);
  await page.locator('#soundBtn').click();await slider(page,'masterVolume',false);await page.waitForTimeout(700);const masterZero=await capture(page);
  check('General volume slider zero silences highway ambience',masterZero.audio.settings.masterVolume===0&&masterZero.graph.master===0&&silent(masterZero),masterZero);
  await slider(page,'masterVolume',true);await slider(page,'sfxVolume',false);await slider(page,'musicVolume',false);await slider(page,'ambienceVolume',false);
  await page.waitForTimeout(700);const ambienceZero=await capture(page);
  check('Ambience slider zero controls route motors as well as procedural wind',ambienceZero.audio.enabled&&ambienceZero.graph.ambience===0&&silent(ambienceZero),ambienceZero);
  check('SFX and music sliders also reach exact zero',ambienceZero.graph.sfx===0&&ambienceZero.graph.music===0,ambienceZero.graph);
  await slider(page,'ambienceVolume',true);await page.waitForTimeout(700);const ambienceRestored=await capture(page);
  check('Ambience resumes at the selected volume without resetting other sliders',ambienceRestored.graph.ambience>.99&&ambienceRestored.graph.sfx===0&&ambienceRestored.graph.music===0&&ambienceRestored.signals.some(s=>s.rms>1e-5),ambienceRestored);
  const routes=[['metro','startMetro'],['air','startAir'],['highway','startHighway'],['water','startWater'],['tower','startTower'],['dark','startDark']];
  for(const [name,start] of routes){
   await page.evaluate(start=>{__DL.stopLoop();__DL.showMenu();__DL[start]();__DL.start();__DL.stopLoop();__DL.refresh();__feedbackAudioObservation.sample();},start);
   // The unified scene updater is throttled to 120 ms. Re-evaluate after that
   // interval while the combat simulation stays frozen for the audio sample.
   await page.waitForTimeout(150);await page.evaluate(()=>__DL.refresh());
   await page.waitForTimeout(850);const reading=await capture(page);
   check(`${name}: route ambience uses the mixer`,reading.graph.outputs.length===1&&reading.graph.legacy.every(h=>h.routedToAmbience&&!h.direct),reading.graph);
   check(`${name}: previous route motors fade out and the current ambience is active`,reading.graph.legacy.filter(h=>h.gain>.002).length===(name==='air'?0:1)&&(name!=='air'||(reading.audio.scene==='air'&&reading.graph.engineThroughAmbience>.04&&reading.signals.some(s=>s.rms>1e-5))),{scene:reading.audio.scene,engineThroughAmbience:reading.graph.engineThroughAmbience,legacy:reading.graph.legacy,signals:reading.signals});
  }
  const firstCycle=await capture(page);
  await page.evaluate(()=>{__DL.showMenu();__DL.refresh();});await page.waitForTimeout(1000);const menu=await capture(page);
  check('Returning to menu silences every route-specific motor',menu.phase==='menu'&&menu.graph.legacy.every(h=>h.gain<.0005),menu.graph);
  for(const [,start] of routes)await page.evaluate(start=>{__DL.showMenu();__DL[start]();__DL.start();__DL.stopLoop();__DL.refresh();},start);
  await page.waitForTimeout(1100);const secondCycle=await capture(page);
  // ARGO already uses the unified engine; its obsolete airHum is deliberately
  // disabled in the delivered base. Six routes share five legacy motor nodes.
  check('Six routes reuse one AudioContext and the same five legacy motors',firstCycle.graph.contexts===1&&secondCycle.graph.contexts===1&&firstCycle.graph.legacy.length===5&&secondCycle.graph.legacy.length===5,{first:firstCycle.graph,second:secondCycle.graph});
  check('Persistent audio sources stay at twelve after repeated route changes',firstCycle.graph.activeSources===12&&secondCycle.graph.activeSources===12,{before:firstCycle.graph.activeSources,after:secondCycle.graph.activeSources});
  await page.evaluate(()=>{__DL.pause();__DL.refresh();});await page.waitForTimeout(900);const paused=await capture(page);
  check('Pause fades the route motors and preserves chosen mixer levels',paused.phase==='paused'&&paused.graph.legacy.every(h=>h.gain<.0005)&&paused.audio.settings.ambienceVolume===1&&paused.audio.settings.musicVolume===0,paused);
  const movement=await page.evaluate(()=>{
   __DL.unpause();__DL.stopLoop();__DL.setSettings({sound:false,motion:false,cameraImpact:true});__DL.clearEnemies();const r=__DL.readState().run;r.activeId='pistol';r.weapons.pistol.mag=8;__DL.setTimers({cooldown:0,reload:0});__DL.fire();
   const afterShot=r.weapons.pistol.mag,beforeRender=JSON.stringify({run:r,waveTime:__DL.readState().wave.time});__DL.render();const disabled=document.getElementById('game').style.transform;
   __DL.setSettings({motion:true});__DL.render();const enabled=document.getElementById('game').style.transform;
   __DL.setSettings({cameraImpact:false});__DL.render();const cameraDisabled=document.getElementById('game').style.transform;
   return{afterShot,disabled,enabled,cameraDisabled,simulationUnchanged:beforeRender===JSON.stringify({run:r,waveTime:__DL.readState().wave.time})};
  });
  check('Motion OFF suppresses the later CSS recoil transform',movement.disabled==='',movement);
  check('Motion ON retains existing recoil and the separate camera-impact switch works',movement.enabled!==''&&movement.cameraDisabled==='',movement);
  check('Feedback preferences leave ammunition and simulation rules intact',movement.afterShot===7&&movement.simulationUnchanged,movement);
  await page.close();await checkVisualFeedback(context);
  check('No uncaught JavaScript errors',errors.length===0,errors);
 }catch(error){failure=error.stack||String(error);console.error(failure);}
 finally{
  if(browser)await browser.close();
  const report={started,finished:new Date().toISOString(),html,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),browser:browserVersion,viewport:[1440,900],protocol:'file:',offline:true,originalImages:true,testAPI:true,inputMethods:['Test API for reproducible route and combat setup','Production AUDIO button','Production range inputs driven with Home/End keys','Native Canvas calls and pixel readback around the actual effect draw'],passed:checks.filter(c=>c.ok).length,total:checks.length,checks,errors,failure,limitations:['WebAudio gains, connections and actual synthesized sample signals measured in headless Chromium.','No subjective listening or loudness certification on headphones/speakers.','Short repeated-route lifecycle coverage; not a multi-hour physical-device endurance test.','Reduced-flash checks measure opacity and composite RGB change in frozen rendered scenes, not display luminance, frequency thresholds or photosensitivity certification.']};
  fs.writeFileSync(path.join(out,'feedback.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total,failure,report:path.join(out,'feedback.json')}));process.exitCode=failure||checks.some(c=>!c.ok)?1:0;
 }
})();
