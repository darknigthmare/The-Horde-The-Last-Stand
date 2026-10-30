/* 0.40.8 — À bonne échelle. Native presentation only. */
const DL408={version:'0.40.8',lastActor:null,lastCrew:[],handPasses:0,gripPasses:0,lastHands:null,frame:0};
// World combat coordinates remain unchanged. Actor footprints are authored at each post.
function dl408ActorPlan(view=currentView()){
 const site=siteFor(),id=site.id,metro=id.startsWith('metro'),side=view==='right'||view==='left';
 const feet=metro?566:644,base={site:id,view,side,family:metro?'metro':v32Family()||'land',deck:feet,x:metro?1138:1160,feet,height:146,crewHeight:139,crewFeet:feet,crewX:[1260,1360]};
 if(view==='front'){base.crewX=[236,1210];base.crewFeet=686;base.crewHeight=120;}
 if(view==='rear'){const post=depthGround(1080,557,view);base.crewX=[post.x-142*post.scale,post.x+142*post.scale];base.crewFeet=post.y+3;base.crewHeight=139*post.scale;}
 return base;
}
function dl408PlayerArt(){return 'v26-player-'+(reload>0?'reload':repairTimer>0?'crouch':flash>0?'shoot1':'idle');}
// Coordinates in the restored 320×320 sprite, not in a bounding rectangle of the screen.
const DL408_ART_MUZZLE={idle:[261,103],shoot1:[267,103],reload:[268,122],crouch:[263,154]};
function dl408SideMuzzle(view=currentView()){
 const p=dl408ActorPlan(view),key=dl408PlayerArt().replace('v26-player-',''),a=DL408_ART_MUZZLE[key]||DL408_ART_MUZZLE.idle,r=p.height/320;
 const x=p.x-(a[0]-160)*r,y=p.feet+(a[1]-302)*r;
 return {x:view==='left'?W-x:x,y,worldX:x,worldY:y};
}
// A proper perpendicular frame: local +X points down the barrel, local +Y is the underside.
// The old full rotation put magazines and palms ABOVE the receiver when aiming left.
function dl408WeaponFrame(p){ctx.translate(p.anchorX,p.anchorY);ctx.rotate(p.angle);ctx.scale(1,-1);}
function dl408Point(p,x,y){const c=Math.cos(p.angle),s=Math.sin(p.angle);return{x:p.anchorX+c*x+s*y,y:p.anchorY+s*x-c*y};}
function dl408PoseFor(x,y,id,profile,state){
 const q=profile,view=currentView(),rp=reload>0&&reloadTotal>0?clamp(1-reload/reloadTotal,0,1):0,arc=rp>0?Math.sin(rp*Math.PI):0,repairDrop=repairTimer>0?118:0;
 // The right shoulder always stays behind/below the aim. No roll flip across the centre.
 const baseX=Math.max(W*(view==='rear'?.716:.731),x+84),baseY=Math.max(H-70+repairDrop-arc*40,y+108);
 let dir=Math.atan2(y-baseY,x-baseX),dx=Math.cos(dir),dy=Math.sin(dir);
 const kick=state.kick*(18+q.recoil*12),side=state.side*5;
 let ax=baseX-dx*kick-dy*side,ay=baseY-dy*kick+dx*side;
 const gap=Math.hypot(x-ax,y-ay),minimum=q.length+30;
 if(gap<minimum){ax-=dx*(minimum-gap);ay-=dy*(minimum-gap);}
 const angle=Math.atan2(y-ay,x-ax)-arc*.16,mx=ax+Math.cos(angle)*q.length,my=ay+Math.sin(angle)*q.length;
 const out={id,family:q.family,profile:q,view,targetX:x,targetY:y,anchorX:ax,anchorY:ay,angle,muzzleX:mx,muzzleY:my,reloadPct:rp,reloadArc:arc,repairDrop,parity:-1};state.lastPose=out;return out;
}
function dl408Feed(p){const q=p.profile,f=q.family,rx=f==='handgun'?0:q.stock*.62,rl=q.length-q.barrel-rx+3;
 const x=f==='handgun'?33:f==='machine'?rx+rl*.42:f==='tool'?rx+33:rx+rl*.58;
 return{x,y:q.width*.46,rx,rl,gripX:f==='handgun'?30:rx+10,gripY:q.width*1.03};
}
function dl408Box(x,y,w,h,fill='#4e635e'){ctx.fillStyle=fill;ctx.strokeStyle='#89978b';ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.fill();ctx.stroke();}
function dl408FixedFurniture(p){const q=p.profile,fd=dl408Feed(p),w=q.width,id=p.id,kind=dl404Mechanism(id),handgun=q.family==='handgun';
 // The trigger grip remains in the right hand throughout every reload.
 const x=fd.gripX;polygon([[x-13,w*.46],[x+13,w*.46],[x+9,w*1.50],[x-16,w*1.44]],'#233438');
 for(let i=0;i<3;i++)line(x-12,w*(.77+i*.17),x+9,w*(.80+i*.17),'#56685e',1.2);
 if(dl404MovingFeed()||kind==='cylinder'||kind==='break'||kind==='tube'||kind==='breech'||kind==='spool')return;
 if(handgun)return; // The seated pistol magazine is inside its grip.
 const conf=DL36Gunsmith.config(id,false),mag=conf.active?.magazine||'';
 if(kind==='canister'){dl408Box(fd.x-16,fd.y,32,50,'#827151');rect(fd.x-12,fd.y+10,24,5,'#c5a768');return;}
 const drum=/drum/.test(mag)||id==='drumgun';if(drum){ellipse(fd.x,fd.y+22,24,23,'#67735a');ellipse(fd.x,fd.y+22,13,13,'#314642');}
 else dl408Box(fd.x-13,fd.y,kind==='belt'?45:26,w*(/extended/.test(mag)?1.65:1.28),'#657363');
 if(kind==='belt')for(let j=0;j<5;j++)rect(fd.x-12+j*7,fd.y-15,4,14,'#b69b65');
}
function dl408HandPlan(p){const q=p.profile,w=q.width,L=q.length,fd=dl408Feed(p),kind=dl404Mechanism(p.id),t=p.reloadPct;
 const right={x:fd.gripX,y:fd.gripY};let left=q.family==='handgun'?{x:right.x-16,y:right.y+5}:{x:L-q.barrel*.70,y:w*.39};
 let role='garde-main',contact=null;
 if(t>0&&data.settings.v37DetailedReload!==false){
  const open=Math.sin(Math.PI*clamp(t/.88,0,1)),out=clamp(t/.28,0,1),into=clamp((t-.46)/.34,0,1),drop=t<.42?out*88:(1-into)*88;
  if(['magazine','belt','bolt'].includes(kind)){contact={x:fd.x,y:fd.y+drop+w*.75};role='alimentation';}
  else if(kind==='cylinder'){contact={x:40,y:open*31+16};role='barillet';}
  else if(kind==='break'){const angle=dl404BreakAngle(),pivot=L-q.barrel,u=Math.min(48,q.barrel*.45);contact={x:pivot+Math.cos(angle)*u-Math.sin(angle)*w*.18,y:Math.sin(angle)*u+Math.cos(angle)*w*.18};role='bascule';}
  else if(kind==='tube'){const pr=clamp((t-.12)/.70,0,1);contact=t<.60?{x:q.stock*.75+29-25+pr*28,y:w*.8-pr*17+13}:{x:L-q.barrel*.65-35*Math.sin(Math.PI*clamp((t-.58)/.42,0,1)),y:w*.5};role=t<.6?'cartouche':'pompe';}
  else if(kind==='breech'){contact={x:L-q.barrel*.5+9,y:w*.25+58*(1-into)+8};role='chambre';}
  else if(kind==='spool'){contact={x:q.stock+29,y:w*.5+20};role='câble';}
  else {contact={x:fd.x,y:w*.5+drop+28};role='cartouche de service';}
  const blend=Math.min(clamp(t/.12,0,1),clamp((1-t)/.10,0,1));left={x:left.x+(contact.x-left.x)*blend,y:left.y+(contact.y-left.y)*blend};
 }
 const r=dl408Point(p,right.x,right.y),l=dl408Point(p,left.x,left.y);
 return {right:r,left:l,rightLocal:right,leftLocal:left,contact:contact?dl408Point(p,contact.x,contact.y):null,role,kind,
 rightOrigin:{x:Math.max(W*.89,r.x+90),y:Math.max(H+75,r.y+85)},leftOrigin:{x:Math.min(W*.62,l.x-60),y:Math.max(H+65,l.y+100)}};
}
function dl408Sleeve(origin,hand,right){const dx=hand.x-origin.x,dy=hand.y-origin.y,d=Math.max(1,Math.hypot(dx,dy)),nx=-dy/d,ny=dx/d,cx=origin.x+dx*.58+(right?18:-12),cy=origin.y+dy*.62;
 ctx.fillStyle=right?'#354943':'#3f5148';ctx.strokeStyle='#697967';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(origin.x+nx*25,origin.y+ny*25);ctx.quadraticCurveTo(cx+nx*18,cy+ny*18,hand.x+nx*11,hand.y+ny*11);ctx.lineTo(hand.x-nx*11,hand.y-ny*11);ctx.quadraticCurveTo(cx-nx*18,cy-ny*18,origin.x-nx*25,origin.y-ny*25);ctx.closePath();ctx.fill();ctx.stroke();
 const cuff={x:hand.x-dx/d*18,y:hand.y-dy/d*18};line(cuff.x+nx*12,cuff.y+ny*12,cuff.x-nx*12,cuff.y-ny*12,'#21332e',6);
}
function dl408Glove(p,local,right,front=false){ctx.save();dl408WeaponFrame(p);ctx.translate(local.x,local.y);ctx.fillStyle=right?'#34392f':'#42483b';ctx.strokeStyle='#616954';ctx.lineWidth=1.1;
 if(!front){ctx.beginPath();ctx.ellipse(0,0,right?12:13,10,.15,0,Math.PI*2);ctx.fill();ctx.stroke();}
 else{for(let i=0;i<3;i++){ctx.beginPath();ctx.roundRect(-9+i*6,-8,5,12,2);ctx.fill();ctx.stroke();}line(-9,4,-16,-1,'#59624f',4);}
 ctx.restore();}
function dl408DrawHands(p){const h=dl408HandPlan(p);DL408.handPasses++;DL408.lastHands=h;ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';dl408Sleeve(h.leftOrigin,h.left,false);dl408Sleeve(h.rightOrigin,h.right,true);dl408Glove(p,h.leftLocal,false);dl408Glove(p,h.rightLocal,true);ctx.restore();}
function dl408DrawGrips(){const p=window.DL35Weapon?.state?.lastPose;if(!p||p.id!==run?.activeId)return;const h=dl408HandPlan(p);dl408Glove(p,h.rightLocal,true,true);dl408Glove(p,h.leftLocal,false,true);DL408.gripPasses++;}
function dl408FallbackFigure(x,feet,h,flip){ctx.save();ctx.translate(x,feet);ctx.scale(flip?-1:1,1);const s=h/146;ctx.scale(s,s);ellipse(0,-119,11,14,'#a89b7b');rect(-13,-133,27,8,'#3c5146');polygon([[-18,-102],[17,-102],[20,-57],[-17,-57]],'#435b4b');line(-9,-58,-14,-3,'#283c33',13);line(11,-58,17,-3,'#2f4339',13);line(-14,-3,-22,-2,'#10251f',6);line(17,-3,9,-2,'#10251f',6);line(4,-90,28,-81,'#79856b',9);line(28,-81,49,-90,'#71866b',8);line(18,-87,58,-91,'#233b3d',6);ctx.restore();}
drawPlayer=function(){if(!run||isDepth())return;DL403.playerPasses++;const p=dl408ActorPlan();DL408.lastActor=p;ellipse(p.x,p.feet,28,6,'#051014b0');if(!v26ActorsEnabled()||!dl403Figure(dl408PlayerArt(),p.x,p.feet,p.height,true))dl408FallbackFigure(p.x,p.feet,p.height,true);};
v20DrawCrewPresence=function(){if(!run||!wave||!['combat','paused'].includes(phase))return;const crew=activeAllies().slice(0,2),p=dl408ActorPlan(),view=currentView();DL408.lastCrew=[];crew.forEach((a,i)=>{
 let x=p.crewX[i],y=p.crewFeet,h=p.crewHeight,flip=true;
 if(p.side){if(view==='left')x=W-x;flip=view!=='left';}else flip=view==='rear'?x<W/2:x>W/2;
 ellipse(x,y,Math.max(5,h*.18),Math.max(2,h*.035),'#051014b0');const asset=v26AllyAsset(a);if(!v26ActorsEnabled()||!dl403Figure(asset,x,y,h,flip))dl408FallbackFigure(x,y,h,flip);
 label(a.name.split('·')[0].trim().toUpperCase(),x,y-h-6,view==='rear'?7:9,'#d5e1d4','center');DL403.crewPasses++;DL408.lastCrew.push({id:a.id,x,feet:y,height:h,flip,asset});
 });};
// Crew share the rendered floor plane; muzzle tags distinguish bodies from turrets and chain arcs.
function dl408CrewMuzzle(actorId,view=currentView()){
 const crew=activeAllies().slice(0,2),index=crew.findIndex(a=>a.id===actorId);if(index<0)return null;
 const a=crew[index],p=dl408ActorPlan(view),id=v26AllyAsset(a);let x=p.crewX[index],flip=true;
 if(p.side){if(view==='left')x=W-x;flip=view!=='left';}else flip=view==='rear'?x<W/2:x>W/2;
 const local=id.includes('malik')?[271,46]:id.includes('ines')?[264,75]:id.includes('marius')?[277,86]:id.includes('youssef')?[281,65]:[281,63],r=p.crewHeight/320;
 return{x:x+(flip?-1:1)*(local[0]-160)*r,y:p.crewFeet+(local[1]-302)*r,scale:1};
}
function dl408AllyTrace(actorId,t){t.actorId=actorId;const m=dl408CrewMuzzle(actorId);if(m&&!isDepth()){t.x=currentView()==='left'?W-m.x:m.x;t.y=m.y;}return t;}
function dl408AllyProjectile(actorId,p){p.actorId=actorId;const m=dl408CrewMuzzle(actorId);if(m){p.dl408Launch={view:currentView(),x:m.x,y:m.y};if(!isDepth()){p.startX=p.x=currentView()==='left'?W-m.x:m.x;p.startY=p.y=m.y;}}return p;}
const dl408SupportMuzzlePrior=depthSupportMuzzle;
depthSupportMuzzle=function(t){return (t.actorId&&dl408CrewMuzzle(t.actorId))||dl408SupportMuzzlePrior(t);};
const dl408CarriagePrior=v19DrawMetroCarriage;
v19DrawMetroCarriage=function(){dl408CarriagePrior();
 // One continuous raised deck joins the rear platform to the last carriage.
 rect(1167,567,273,13,'#32484a');line(1167,566,1440,566,'#9aa69b',6);
 for(let x=1185;x<1430;x+=32)line(x,574,x+18,574,'#64766d',2);
};

// The rendered launch origin is independent of range/dispersion calculations.
// Changing actor size must not strengthen a weapon or move any hitbox.
const dl408ScreenMuzzlePrior=v20ScreenMuzzle;
v20ScreenMuzzle=function(){return isDepth()?depthMuzzle():dl408SideMuzzle();};
function dl408CorrectLaunches(before){const view=currentView(),side=!isDepth(),m=side?dl408SideMuzzle():depthMuzzle(),x=side?m.worldX:m.x,y=side?m.worldY:m.y;
 if(side)for(let i=before.traces;i<tracers.length;i++){const t=tracers[i];if(!t.ally&&!t.screen){t.x=x;t.y=y;}}
 for(let i=before.projectiles;i<projectiles.length;i++){const p=projectiles[i];if(p.kind!=='grenade'||p.support)continue;p.dl408Launch={view,x:m.x,y:m.y};if(side){p.startX=p.x=x;p.startY=p.y=y;}}
 if(side)for(let i=before.effects;i<v26Effects.length;i++){const e=v26Effects[i];if(e.screen&&(e.name==='muzzle1'||e.name==='muzzle2')){e.x=m.x;e.y=m.y;}else if(e.name==='tracer'&&e.screen){const c=screenCursor(),a=Math.atan2(c.y-m.y,c.x-m.x),d=Math.min(360,Math.hypot(c.x-m.x,c.y-m.y));e.x=m.x+Math.cos(a)*d*.5;e.y=m.y+Math.sin(a)*d*.5;e.rotation=a;}}
}
const dl408FirePrior=fireGun;
fireGun=function(){const before={traces:tracers.length,projectiles:projectiles.length,effects:v26Effects.length};const out=dl408FirePrior();dl408CorrectLaunches(before);return out;};
const dl408GrenadePrior=grenade;
grenade=function(){const before={traces:tracers.length,projectiles:projectiles.length,effects:v26Effects.length};const out=dl408GrenadePrior();dl408CorrectLaunches(before);return out;};
const dl408ThrownPrior=depthThrownScreen;
depthThrownScreen=function(p){const launch=p.dl408Launch;if(!launch||launch.view!==currentView())return dl408ThrownPrior(p);const k=clamp(p.t/p.duration,0,1),b=worldScreen(p.tx,p.ty,p.ground??(p.ty<530?494:620));return{x:launch.x+(b.x-launch.x)*k,y:launch.y+(b.y-launch.y)*k-Math.sin(k*Math.PI)*90,scale:1+(b.scale-1)*k};};
const dl408GunPassPrior=dl403DrawGunOnce;
dl403DrawGunOnce=function(){const out=dl408GunPassPrior();if(run&&currentView()==='front'&&['combat','paused'].includes(phase))dl408DrawGrips();return out;};
const dl408ScenePrior=drawScene;
drawScene=function(){DL408.frame++;DL408.handPasses=0;DL408.gripPasses=0;DL408.lastHands=null;DL408.lastActor=null;DL408.lastCrew=[];return dl408ScenePrior();};
function dl408Version(){document.title='Dernière Ligne — À bonne échelle 0.40.8';const tag=document.querySelector('.version-tag');if(tag)tag.textContent='0.40.8 · À BONNE ÉCHELLE';if($('aboutGame')){$('aboutGame').textContent='À PROPOS · 0.40.8';$('aboutGame').onclick=dl408About;}const f=document.querySelector('.menu-footer');if(f)f.innerHTML='DERNIÈRE LIGNE — ZÉRO REPLI<br>0.40.8 · À bonne échelle';}
function dl408About(){clearCombatInput();phase='about';showScreen('dialogScreen');$('dialogBody').innerHTML='<div class="eyebrow">DERNIÈRE LIGNE · 0.40.8</div><h2>À BONNE ÉCHELLE</h2><p>Le survivant et les défenseurs sont ancrés aux sols des postes. En profondeur, l’arme garde son dessus et son dessous ; les mains viennent du bas de l’écran et suivent les poignées ou la pièce manipulée.</p><div class="notice">Contenu de la 0.40.7 conservé : 45 armes, 73 accessoires, 16 conversions, 24 plans, six presets, devis de préparation et six circuits électriques.</div><p>Les animations restent procédurales et les sprites de profil partagent des poses. Les règles de combat, les stocks et le schéma 12 ne sont pas modifiés par cette correction de présentation.</p><div class="buttons"><button id="dl408-about-back" class="primary">RETOUR</button></div>';$('dl408-about-back').onclick=showMenu;decorateDialog();}
const dl408InstallPrior=dl403InstallMenu;dl403InstallMenu=function(){const out=dl408InstallPrior();dl408Version();return out;};
const dl408MenuPagePrior=dl403MenuPage;dl403MenuPage=function(...args){const out=dl408MenuPagePrior(...args);dl408Version();return out;};
queueMicrotask(()=>{dl408Version();if(window.__DL)Object.assign(window.__DL,{fire:()=>fireGun(),grenade:()=>grenade(),render:()=>drawScene(),dl408:{version:DL408.version,plan:dl408ActorPlan,sideMuzzle:dl408SideMuzzle,point:dl408Point,hands:dl408HandPlan,feed:dl408Feed,state:()=>({frame:DL408.frame,actor:DL408.lastActor,crew:DL408.lastCrew,hands:DL408.lastHands,handPasses:DL408.handPasses,gripPasses:DL408.gripPasses}),depthThrown:depthThrownScreen,crewMuzzle:dl408CrewMuzzle}});});


/* 0.40.9 — Largeur des voies en profondeur. */
const DL409={version:'0.40.9'};
function dl409DepthSeed(z){
 const raw=((z?.id||0)*97+String(z?.type||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)*13)%1000;
 return raw/999*2-1;
}
function dl409DepthSpread(z,scale,view=currentView()){
 if(view!=='front'&&view!=='rear')return 0;
 const seed=Number.isFinite(z?.dl409Spread)?z.dl409Spread:(z.dl409Spread=dl409DepthSeed(z));
 const laneBias=z?.lane===0?-18:18;
 const width=(z?.lane===0?118:134)*clamp((scale||1)*1.15,.42,1.28);
 return laneBias+seed*width;
}
const dl409ProjectedEnemyPrior=projectedEnemy;
projectedEnemy=function(z,view=currentView()){
 const p=dl409ProjectedEnemyPrior(z,view);
 if(view==='front'||view==='rear')p.x+=dl409DepthSpread(z,p.scale,view);
 return p;
};

const dl409DrawDepthGunPrior=drawDepthGun;
drawDepthGun=function(){
 if(currentView()==='rear')return;
 return dl409DrawDepthGunPrior();
};
const dl409GunPassPrior2=dl403DrawGunOnce;
dl403DrawGunOnce=function(){
 const out=dl409GunPassPrior2();
 if(currentView()==='rear')return out;
 return out;
};

function dl409Version(){
 document.title='Dernière Ligne — Profondeur cohérente 0.40.9';
 const tag=document.querySelector('.version-tag');
 if(tag)tag.textContent='0.40.9 · PROFONDEUR COHÉRENTE';
 if($('aboutGame')){$('aboutGame').textContent='À PROPOS · 0.40.9';$('aboutGame').onclick=dl409About;}
 const f=document.querySelector('.menu-footer');
 if(f)f.innerHTML='DERNIÈRE LIGNE — ZÉRO REPLI<br>0.40.9 · Profondeur cohérente';
}
function dl409About(){clearCombatInput();phase='about';showScreen('dialogScreen');$('dialogBody').innerHTML='<div class="eyebrow">DERNIÈRE LIGNE · 0.40.9</div><h2>PROFONDEUR COHÉRENTE</h2><p>La vue arrière ne montre plus une arme de premier plan. En profondeur, les ennemis ne suivent plus deux filets rigides : chaque voie occupe désormais une bande entière, plus large et plus naturelle selon la distance.</p><div class="notice">Contenu conservé : armurerie avancée, conversions, plans, préparation, circuits de Zone Noire et les corrections de la 0.40.8 sur l’échelle des personnages et les mains FPS.</div><p>La simulation de combat reste identique : dégâts, portée logique, économie, cadence et collision de base ne sont pas rééquilibrés par cette passe visuelle.</p><div class="buttons"><button id="dl409-about-back" class="primary">RETOUR</button></div>';$('dl409-about-back').onclick=showMenu;decorateDialog();}
const dl409InstallPrior=dl403InstallMenu;dl403InstallMenu=function(){const out=dl409InstallPrior();dl409Version();return out;};
const dl409MenuPrior=dl403MenuPage;dl403MenuPage=function(...args){const out=dl409MenuPrior(...args);dl409Version();return out;};
queueMicrotask(()=>{dl409Version();if(window.__DL){window.__DL.dl409={version:DL409.version,spread:(z,scale,view)=>dl409DepthSpread(z,scale,view)};}});

/* 0.40.10 — Contrechamp jouable et bandes de horde. */
const DL410={version:'0.40.10',rearPlayerDraws:0,rearGunSkips:0,tracerCorrections:0,lastRearPlayer:null};
function dl410Seed(z){
 const id=Number(z?.id)||0,word=String(z?.type||'');let h=(id*2654435761)>>>0;
 for(let i=0;i<word.length;i++)h=Math.imul(h^word.charCodeAt(i),16777619)>>>0;
 return ((h%2001)/1000)-1;
}
function dl410DepthOffset(z,p,view=currentView()){
 if(!z||!p||(view!=='front'&&view!=='rear'))return 0;
 const seed=Number.isFinite(z.dl410Spread)?z.dl410Spread:(z.dl410Spread=dl410Seed(z));
 const depth=clamp((p.feet-242)/(H-242),0,1),half=82+620*Math.pow(depth,.96);
 const laneBias=(z.lane===0?-1:1)*half*.11;
 return clamp(laneBias+seed*half*.78,-half*.90,half*.90);
}
const dl410ProjectedPrior=projectedEnemy;
projectedEnemy=function(z,view=currentView()){
 const p=dl410ProjectedPrior(z,view);
 if(view==='front'||view==='rear')p.x=clamp(720+dl410DepthOffset(z,p,view),42,W-42);
 return p;
};
function dl410RearPlayerPlan(){const post=depthGround(1080,557,'rear'),h=154*post.scale;return{x:post.x,feet:post.y+3,height:h,scale:post.scale,flip:false};}
function dl410DrawRearPlayer(){
 if(!run||currentView()!=='rear'||!['combat','paused'].includes(phase))return false;
 const p=dl410RearPlayerPlan(),art=dl408PlayerArt();ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 ellipse(p.x,p.feet,Math.max(5,23*p.scale),Math.max(2,5*p.scale),'#051014b0');
 if(!v26ActorsEnabled()||!dl403Figure(art,p.x,p.feet,p.height,p.flip))dl408FallbackFigure(p.x,p.feet,p.height,p.flip);
 if(flash>0){const m=dl410RearMuzzle();ellipse(m.x,m.y,Math.max(2,5*p.scale),Math.max(1,3*p.scale),'#ffe3a6cc');}
 ctx.restore();DL410.rearPlayerDraws++;DL403.playerPasses++;DL410.lastRearPlayer=p;return true;
}
function dl410RearMuzzle(){const p=dl410RearPlayerPlan(),r=p.height/320,a=DL408_ART_MUZZLE[dl408PlayerArt().replace('v26-player-','')]||DL408_ART_MUZZLE.idle;return{x:p.x+(a[0]-160)*r,y:p.feet+(a[1]-302)*r};}
const dl410DepthMuzzlePrior=depthMuzzle;
depthMuzzle=function(){return currentView()==='rear'?dl410RearMuzzle():dl410DepthMuzzlePrior();};
const dl410GunPassPrior=dl403DrawGunOnce;
dl403DrawGunOnce=function(){if(currentView()==='rear'){DL410.rearGunSkips++;dl410DrawRearPlayer();return;}return dl410GunPassPrior();};
const dl410DepthGunPrior=drawDepthGun;
drawDepthGun=function(){if(currentView()==='rear')return;return dl410DepthGunPrior();};
const dl410FirePrior=fireGun;
fireGun=function(){
 const before=tracers.length,fxBefore=v26Effects.length,depth=isDepth(),cursor=depth?screenCursor():null;
 let worldAim=null;if(depth){try{worldAim=worldScreen(aim.x,aim.y,inferFeet(aim.x,aim.y));}catch(_){}}
 const out=dl410FirePrior();
 if(depth&&cursor){
  for(let i=before;i<tracers.length;i++){const t=tracers[i];if(!t||t.ally||!t.screen)continue;const dx=worldAim&&Number.isFinite(Number(t.tx-worldAim.x))?t.tx-worldAim.x:0,dy=worldAim&&Number.isFinite(Number(t.ty-worldAim.y))?t.ty-worldAim.y:0;t.tx=clamp(cursor.x+dx,0,W);t.ty=clamp(cursor.y+dy,0,H);const m=depthMuzzle();t.x=m.x;t.y=m.y;DL410.tracerCorrections++;}
  const m=depthMuzzle();for(let i=fxBefore;i<v26Effects.length;i++){const e=v26Effects[i];if(!e?.screen)continue;if(e.name==='muzzle1'||e.name==='muzzle2'){e.x=m.x;e.y=m.y;}else if(e.name==='tracer'){const a=Math.atan2(cursor.y-m.y,cursor.x-m.x),d=Math.min(380,Math.hypot(cursor.x-m.x,cursor.y-m.y));e.x=m.x+Math.cos(a)*d*.5;e.y=m.y+Math.sin(a)*d*.5;e.rotation=a;}}
 }
 return out;
};
function dl410Version(){document.title='Dernière Ligne — Contrechamp large 0.40.10';const tag=document.querySelector('.version-tag');if(tag)tag.textContent='0.40.10 · CONTRECHAMP LARGE';if($('aboutGame')){$('aboutGame').textContent='À PROPOS · 0.40.10';$('aboutGame').onclick=dl410About;}const f=document.querySelector('.menu-footer');if(f)f.innerHTML='DERNIÈRE LIGNE — ZÉRO REPLI<br>0.40.10 · Contrechamp large';}
function dl410About(){clearCombatInput();phase='about';showScreen('dialogScreen');$('dialogBody').innerHTML='<div class="eyebrow">DERNIÈRE LIGNE · 0.40.10</div><h2>CONTRECHAMP LARGE</h2><p>Le contrechamp arrière montre désormais le survivant près du poste au lieu d’une arme FPS au premier plan. Les hordes occupent des bandes de profondeur largement réparties, tout en conservant les deux voies logiques utilisées par les pièges et les objectifs.</p><div class="notice">Le hit-test et les tirs du joueur suivent les positions projetées. Les ennemis lointains convergent naturellement vers le point de fuite ; les contacts proches utilisent presque toute la largeur disponible.</div><p>Les dégâts, vitesses, prix, quantités de zombies, stocks et sauvegardes ne sont pas rééquilibrés par cette passe.</p><div class="buttons"><button id="dl410-about-back" class="primary">RETOUR</button></div>';$('dl410-about-back').onclick=showMenu;decorateDialog();}
const dl410InstallPrior=dl403InstallMenu;dl403InstallMenu=function(){const out=dl410InstallPrior();dl410Version();return out;};
const dl410MenuPrior=dl403MenuPage;dl403MenuPage=function(...args){const out=dl410MenuPrior(...args);dl410Version();return out;};
queueMicrotask(()=>{dl410Version();if(window.__DL)Object.assign(window.__DL,{projectedEnemy,dl410:{version:DL410.version,state:()=>({...DL410}),rearPlayer:dl410RearPlayerPlan,rearMuzzle:dl410RearMuzzle,offset:(z,p,v)=>dl410DepthOffset(z,p,v),projected:(z,v)=>projectedEnemy(z,v)}});});

/* 0.41.0 — Fronts vivants. Cohérence intégrale des vues en profondeur. */
const DL411={version:'0.41.0',rearPlayerPasses:0,wideProjectionPasses:0,effectReanchors:0,projectileLocks:0,allyTraceLocks:0};
function dl411Hash01(z){
 let h=((Number(z?.id)||1)*2654435761)>>>0;const s=String(z?.type||'walker');
 for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),2246822519)>>>0;h^=h>>>13;}
 h=Math.imul(h^(h>>>16),3266489917)>>>0;return (h>>>0)/4294967295;
}
function dl411Corridor(z,view=currentView(),projection=null){
 // A frame uses one depth/scale for a given x; the corridor edges only change feet.
 const p=projection||depthGround(z.x,z.feet,view),a=720+(426-557)*3.0*p.scale,b=720+(688-557)*3.0*p.scale,left=Math.min(a,b),right=Math.max(a,b),width=Math.max(24,right-left);
 const margin=clamp((14+6*(z.size||1))*p.scale,3,Math.max(4,width*.09)),innerL=left+margin,innerR=right-margin,center=(innerL+innerR)/2,overlap=(innerR-innerL)*.24;
 const lane=Number(z.lane)||0,lo=lane===0?innerL:center-overlap,hi=lane===0?center+overlap:innerR;
 return {left,right,innerL,innerR,lo,hi,width,scale:p.scale,center};
}
function dl411ProjectedX(z,view=currentView(),projection=null){
 if(view!=='front'&&view!=='rear')return dl410ProjectedPrior(z,view).x;
 const c=dl411Corridor(z,view,projection),u=dl411Hash01(z),phase=(u+((Number(z.id)||0)*.618033988749895))%1;
 const sway=Math.sin((z.step||0)*.34+u*Math.PI*2)*Math.min(12,(c.hi-c.lo)*.035);
 return clamp(c.lo+(c.hi-c.lo)*phase+sway,c.innerL,c.innerR);
}
const dl411ProjectedPrior=projectedEnemy;
projectedEnemy=function(z,view=currentView()){
 // 0.41 owns the final horizontal position; earlier 0.40.9/0.40.10 offsets were overwritten.
 const p=dl409ProjectedEnemyPrior(z,view);
 if(view==='front'||view==='rear'){p.x=dl411ProjectedX(z,view,p);DL411.wideProjectionPasses++;}
 return p;
};
function dl411VisualFeet(z,view=currentView()){
 if(!z||(view!=='front'&&view!=='rear'))return z?.feet??557;
 const p=projectedEnemy(z,view),scale=Math.max(.001,p.scale);return clamp(557+(p.x-720)/(3*scale),426,688);
}
function dl411WorldVisualPoint(z,worldY,view=currentView()){
 if(!z||(view!=='front'&&view!=='rear'))return worldScreen(z?.x||0,worldY,z?.feet,view);
 const vf=dl411VisualFeet(z,view),shift=vf-z.feet;return worldScreen(z.x,worldY+shift,vf,view);
}
function dl411FindWorldTarget(x,y){
 let best=null,score=Infinity;
 for(const z of enemies){const by=z.feet-frontBody(z)*z.size,hy=z.feet-frontHead(z)*z.size,d=Math.abs(z.x-x)*2+Math.min(Math.abs(by-y),Math.abs(hy-y));if(d<score){score=d;best=z;}}
 return score<95?best:null;
}
// All supporting fire now terminates on the same visible body that was actually hit.
const dl411AllyTracePrior=dl408AllyTrace;
dl408AllyTrace=function(actorId,t){
 const out=dl411AllyTracePrior(actorId,t);if(!isDepth())return out;
 const z=dl411FindWorldTarget(out.tx,out.ty),m=dl408CrewMuzzle(actorId);
 if(z&&m){const q=dl411WorldVisualPoint(z,out.ty);out.screen=true;out.x=m.x;out.y=m.y;out.tx=q.x;out.ty=q.y;out.dl411TargetId=z.id;DL411.allyTraceLocks++;}
 return out;
};
// Hits, damage labels and corpses keep the lateral footprint of the rendered enemy instead of snapping back to a hidden rail.
const dl411HitPrior=hitZombie;
hitZombie=function(z,damage,head=false,source='player'){
 const p0=particles.length,f0=floating.length,c0=corpses.length,out=dl411HitPrior(z,damage,head,source);
 if(z&&isDepth()){
  const vf=dl411VisualFeet(z),shift=vf-z.feet;
  for(let i=p0;i<particles.length;i++){const p=particles[i];p.ground=vf;p.y+=shift;p.dl411TargetId=z.id;DL411.effectReanchors++;}
  for(let i=f0;i<floating.length;i++){const f=floating[i];f.ground=vf;f.y+=shift;f.dl411TargetId=z.id;DL411.effectReanchors++;}
  for(let i=c0;i<corpses.length;i++){const c=corpses[i];if(Math.abs(c.x-z.x)<2){c.y=vf;c.dl411TargetId=z.id;DL411.effectReanchors++;}}
 }
 return out;
};
function dl411TagThrown(from,cursor){
 if(!cursor||!isDepth())return;for(let i=from;i<projectiles.length;i++){const p=projectiles[i];if(p?.kind==='grenade'&&!p.support){p.dl411TargetScreen={view:currentView(),x:cursor.x,y:cursor.y};DL411.projectileLocks++;}}
}
const dl411FirePrior=fireGun;
fireGun=function(){const start=projectiles.length,c=isDepth()?{...screenCursor()}:null,out=dl411FirePrior();dl411TagThrown(start,c);return out;};
const dl411GrenadePrior=grenade;
grenade=function(){const start=projectiles.length,c=isDepth()?{...screenCursor()}:null,out=dl411GrenadePrior();dl411TagThrown(start,c);return out;};
const dl411ThrownPrior=depthThrownScreen;
depthThrownScreen=function(p){
 const t=p?.dl411TargetScreen,l=p?.dl408Launch;if(!t||!l||t.view!==currentView())return dl411ThrownPrior(p);
 const k=clamp(p.t/p.duration,0,1),logical=worldScreen(p.tx,p.ty,p.ground??(p.ty<530?494:620));
 return{x:l.x+(t.x-l.x)*k,y:l.y+(t.y-l.y)*k-Math.sin(k*Math.PI)*90,scale:1+(logical.scale-1)*k};
};
// One and only one rear-view survivor. The old procedural figure in drawDistantPost is removed at build time.
const dl411RearDrawPrior=dl410DrawRearPlayer;
dl410DrawRearPlayer=function(){const before=DL403.playerPasses,out=dl411RearDrawPrior();if(out&&DL403.playerPasses>before)DL411.rearPlayerPasses++;return out;};
function dl411Version(){document.title='Dernière Ligne — Fronts vivants 0.41.0';const tag=document.querySelector('.version-tag');if(tag)tag.textContent='0.41.0 · FRONTS VIVANTS';if($('aboutGame')){$('aboutGame').textContent='À PROPOS · 0.41.0';$('aboutGame').onclick=dl411About;}const f=document.querySelector('.menu-footer');if(f)f.innerHTML='DERNIÈRE LIGNE — ZÉRO REPLI<br>0.41.0 · Fronts vivants';}
function dl411About(){clearCombatInput();phase='about';showScreen('dialogScreen');$('dialogBody').innerHTML='<div class="eyebrow">DERNIÈRE LIGNE · 0.41.0</div><h2>FRONTS VIVANTS</h2><p>Les vues de profondeur utilisent désormais une largeur de terrain cohérente : les deux voies restent des règles tactiques, mais les silhouettes occupent réellement le corridor et convergent avec la perspective.</p><div class="notice">Le contrechamp ne contient plus qu’un seul survivant distant et aucune arme FPS. Traceurs alliés, impacts, nombres de dégâts, cadavres et projectiles lancés restent raccordés aux positions visibles.</div><p>Cette passe ne modifie ni les dégâts, ni les prix, ni les stocks, ni le nombre de vagues. Les sauvegardes du schéma 12 restent compatibles.</p><div class="buttons"><button id="dl411-about-back" class="primary">RETOUR</button></div>';$('dl411-about-back').onclick=showMenu;decorateDialog();}
const dl411InstallPrior=dl403InstallMenu;dl403InstallMenu=function(){const out=dl411InstallPrior();dl411Version();return out;};
const dl411MenuPrior=dl403MenuPage;dl403MenuPage=function(...args){const out=dl411MenuPrior(...args);dl411Version();return out;};
queueMicrotask(()=>{dl411Version();if(window.__DL)Object.assign(window.__DL,{fire:()=>fireGun(),grenade:()=>grenade(),hit:(...a)=>hitZombie(...a),projectedEnemy,dl411:{version:DL411.version,state:()=>({...DL411}),corridor:(z,v)=>dl411Corridor(z,v),projected:(z,v)=>projectedEnemy(z,v),visualFeet:(z,v)=>dl411VisualFeet(z,v),worldPoint:(z,y,v)=>dl411WorldVisualPoint(z,y,v),thrown:p=>depthThrownScreen(p)}});});
