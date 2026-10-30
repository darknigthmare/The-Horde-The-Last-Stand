'use strict';
// Isolated A/B against the imported release. Does not modify the shipped HTML.
// node scripts/benchmark-projection-0441.cjs --out artifacts/performance-0441
// --correctness-only runs geometry and pixel checks without timing measurements (CI).
// Requires Git history (checkout fetch-depth: 0), Playwright and Chromium.
// HORDE_BROWSER_EXECUTABLE selects an installed browser.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
let playwright;
try{playwright=require('playwright');}catch(error){if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw error;playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));}
const {chromium}=playwright;
const root=path.resolve(__dirname,'..');
const baseline='f7a3c3cf53e9a9fb6056033db8e84a3bacffee68';
const correctnessOnly=process.argv.includes('--correctness-only');
const outAt=process.argv.indexOf('--out');
const out=path.resolve(outAt<0?path.join(root,'artifacts','performance-0441'):process.argv[outAt+1]);
const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'horde-projection-0441-'));
const fixture=path.join(fixtureRoot,'projection.html');
const readBaseline=file=>execFileSync('git',['show',`${baseline}:${file}`],{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024});
const html=readBaseline('game/JOUER_DERNIERE_LIGNE.html');
const old=readBaseline('game/src/spatial.js'),candidate=fs.readFileSync(path.join(root,'game/src/spatial.js'),'utf8');
fs.mkdirSync(out,{recursive:true});
function between(a,b){const start=old.indexOf(a),end=old.indexOf(b,start);if(start<0||end<start)throw Error('Missing historical projection anchor');return old.slice(start,end);}
const legacy=between('function dl411Corridor(','const dl411ProjectedPrior=projectedEnemy;').replaceAll('dl411Corridor','dl441LegacyCorridor').replaceAll('dl411ProjectedX','dl441LegacyProjectedX');
const hook=`\n${legacy}\nconst dl441Candidate=projectedEnemy;\nprojectedEnemy=function(z,view=currentView()){if(!window.__hordeBaseline)return dl441Candidate(z,view);const p=dl411ProjectedPrior(z,view);if(view==='front'||view==='rear'){p.x=dl441LegacyProjectedX(z,view);DL411.wideProjectionPasses++;}return p;};\n`;
if(!html.includes(old))throw Error('baseline source missing in html');
const fixtureHTML=html.replace(old,candidate+hook).replace('</head>',`<base href="${pathToFileURL(path.join(root,'game')+path.sep).href}"></head>`);
fs.writeFileSync(fixture,fixtureHTML);
function median(xs){const s=[...xs].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
(async()=>{
const browser=await chromium.launch({...(process.env.HORDE_BROWSER_EXECUTABLE?{executablePath:process.env.HORDE_BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
const context=await browser.newContext({viewport:{width:1440,height:900}});await context.setOffline(true);
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(pathToFileURL(fixture).href+'?test=1',{waitUntil:'load',timeout:60000});
await page.evaluate(()=>{__DL.stopLoop();__DL.setSettings({cinematics:false,sound:false,performanceMode:'quality',motion:false});});
const geometry=await page.evaluate(()=>{
 const routes=[['campaign',()=>__DL.startNew('campaign')],['north',()=>__DL.startNorth()],['metro',()=>__DL.startMetro()],['air',()=>__DL.startAir()],['highway',()=>__DL.startHighway()],['water',()=>__DL.startWater()],['tower',()=>__DL.startTower()],['dark',()=>__DL.startDark()]];
 const types=Object.keys(__DL.getDefs().ENEMIES),views=['right','left','front','rear'],positions=[-80,0,120,240,550,1040,1120],differences=[];let cases=0;
 for(const [route,start] of routes){__DL.showMenu();start();__DL.start();__DL.stopLoop();for(const view of views){__DL.readState().wave.fronts.view=view;for(let ti=0;ti<types.length;ti++)for(const x of positions)for(const lane of [0,1])for(const collapsed of [false,true]){
 const z={id:4000+ti,type:types[ti],x,feet:lane?620:494,lane,size:[.6,1,2][ti%3],step:ti*.37,engagement:{collapsed}};
 window.__hordeBaseline=true;const a=__DL.dl411.projected(z,view);window.__hordeBaseline=false;const b=__DL.dl411.projected(z,view);cases++;
 if(JSON.stringify(a)!==JSON.stringify(b)&&differences.length<10)differences.push({route,view,x,type:types[ti],lane,collapsed,a,b});
 }}}
 return{routes:routes.map(x=>x[0]),types:types.length,views,positions,cases,differences};
});
await page.evaluate(()=>{__DL.showMenu();__DL.startNew('campaign');__DL.start();__DL.stopLoop();__DL.clearEnemies();for(let i=0;i<96;i++){const z=__DL.spawn(i%9===0?'runner':'walker');Object.assign(z,{id:4000+i,lane:i%2,x:180+(i*83)%870,feet:i%2?620:494,step:i*.17});}});
await page.waitForTimeout(1000);
const pixels=await page.evaluate(()=>{const out=[];for(const view of ['right','left','front','rear']){
 __DL.readState().wave.fronts.view=view;
 const frame=baseline=>{window.__hordeBaseline=baseline;const saved=Math.random;let seed=1747;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);try{__DL.render();const c=document.getElementById('game');return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}finally{Math.random=saved;}};
 frame(true);const a=frame(true),b=frame(false);let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;out.push({view,channelValues:a.length,changed});
 }return out;});
const projectionRuns=[],renderRuns=[];
if(!correctnessOnly){
for(const view of ['front','rear','right','left'])for(let round=0;round<7;round++){
 const r={view,round};for(const baseline of (round%2?[true,false]:[false,true])){
  r[baseline?'before':'after']=await page.evaluate(({view,baseline})=>{__DL.readState().wave.fronts.view=view;window.__hordeBaseline=baseline;const enemies=__DL.readState().enemies;let sum=0;for(let k=0;k<40;k++)for(const z of enemies)sum+=__DL.dl411.projected(z,view).x;const start=performance.now();for(let k=0;k<150;k++)for(const z of enemies)sum+=__DL.dl411.projected(z,view).x;window.__benchSink=sum;return(performance.now()-start)/(150*enemies.length)*1000;},{view,baseline});
 }projectionRuns.push(r);
}
for(const view of ['front','rear','right'])for(let round=0;round<5;round++){
 const r={view,round};for(const baseline of (round%2?[true,false]:[false,true])){
  r[baseline?'before':'after']=await page.evaluate(async({view,baseline})=>{__DL.readState().wave.fronts.view=view;window.__hordeBaseline=baseline;const values=[];for(let i=0;i<36;i++){await new Promise(requestAnimationFrame);const start=performance.now();__DL.render();if(i>=6)values.push(performance.now()-start);}return values;},{view,baseline});
 }renderRuns.push(r);
}
}
const result={mode:correctnessOnly?'correctness-only':'correctness-and-performance',browser:browser.version(),viewport:[1440,900],enemies:96,originalImages:true,testAPI:true,baseline,protocol:'file:',offline:true,fixture:'Historical production HTML with current spatial.js and an A/B switch only in the temporary fixture',baselineHTMLSha256:crypto.createHash('sha256').update(html).digest('hex'),candidateSourceSha256:crypto.createHash('sha256').update(candidate).digest('hex'),geometry,pixels,projectionRuns,renderRuns,
projectionSummary:correctnessOnly?[]:['front','rear','right','left'].map(view=>{const r=projectionRuns.filter(x=>x.view===view);return{view,beforeMicroseconds:median(r.map(x=>x.before)),afterMicroseconds:median(r.map(x=>x.after))};}),
renderSummary:correctnessOnly?[]:['front','rear','right'].map(view=>{const r=renderRuns.filter(x=>x.view===view);return{view,beforeMs:median(r.flatMap(x=>x.before)),afterMs:median(r.flatMap(x=>x.after))};}),errors,limitations:correctnessOnly?['Timing measurements were skipped.','Comparative fixture exposes opt-in test API and uses a toggle absent from the production HTML.']:['CPU timings in headless browser; not FPS or physical device certification.','RAF-paced rendering of a frozen 96-enemy scene; no combat simulation, HUD layout or GPU completion timing.','Comparative fixture exposes opt-in test API and uses a toggle absent from the production HTML.']};
fs.writeFileSync(path.join(out,correctnessOnly?'projection-correctness.json':'projection-performance.json'),JSON.stringify(result,null,2)+'\n');
process.exitCode=geometry.differences.length||pixels.some(p=>p.changed)||errors.length?1:0;console.log(JSON.stringify({geometry,pixels,projectionSummary:result.projectionSummary,renderSummary:result.renderSummary,errors},null,2));
}finally{await browser.close();fs.rmSync(fixtureRoot,{recursive:true,force:true});}
})().catch(error=>{fs.rmSync(fixtureRoot,{recursive:true,force:true});console.error(error);process.exitCode=1;});
