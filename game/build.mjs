import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),read=p=>fs.readFileSync(path.join(root,p),'utf8');let h=read('base/0.40.7.html');const patches=[];
function swap(a,b,name){const count=h.split(a).length-1;if(count!==1)throw Error(name+': expected 1, got '+count);h=h.replace(a,b);patches.push(name);}
function block(begin,end,newText,name){const start=h.indexOf(begin),stop=h.indexOf(end,start);if(start<0||stop<0||h.indexOf(begin,start+1)>=0)throw Error(name+': invalid block');swap(h.slice(start,stop),newText,name);}
block('function poseFor(x,y,id=run?.activeId||\'pistol\'){','\nfunction pathPoly(',`function poseFor(x,y,id=run?.activeId||'pistol'){return dl408PoseFor(x,y,id,profileFor(id),V35);}\n`,'FPS pose uses stable right-shoulder origin');
block('function drawHands(p){','\nfunction drawWeapon(p){','function drawHands(p){return dl408DrawHands(p);}\n','Continuous forearms and anatomical grips');
swap('const q=p.profile,L=q.length,Wd=q.width,f=q.family,id=p.id;\n ctx.save();ctx.translate(p.anchorX,p.anchorY);ctx.rotate(p.angle);','const q=p.profile,L=q.length,Wd=q.width,f=q.family,id=p.id;\n ctx.save();dl408WeaponFrame(p);','Weapon keeps top above barrel');
swap("ctx.save();ctx.translate(p.anchorX,p.anchorY);ctx.rotate(p.angle);ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=7;ctx.shadowOffsetY=4;","ctx.save();dl408WeaponFrame(p);ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=7;ctx.shadowOffsetY=4;",'Attachments share reflected weapon frame');
swap("ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.translate(p.anchorX,p.anchorY);ctx.rotate(p.angle);","ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';dl408WeaponFrame(p);",'Reload mechanisms share weapon frame');
swap("ctx.save();ctx.translate(p.anchorX,p.anchorY);ctx.rotate(p.angle);const q=p.profile;ctx.strokeStyle='#c19d5c';","ctx.save();dl408WeaponFrame(p);const q=p.profile;ctx.strokeStyle='#c19d5c';",'Conversion mark follows weapon underside');
swap("if(!dl404MovingFeed())rounded(receiverX+receiverLen*.18,Wd*.38,58,34,4,'#5e624d','#a99b6a');","/* Static feed drawn once by dl408FixedFurniture. */",'Remove duplicated static belt box');
swap("if(!dl404MovingFeed())rounded(receiverX+8,Wd*.39,38,43,5,'#706743','#9b8d61');","/* Static service canister drawn once by dl408FixedFurniture. */",'Remove duplicated static canister');
block(' // Magazine / grip.\n', ' // Special recognisable details.',' // Fixed trigger grip and seated feed use separate anchors.\n dl408FixedFurniture(p);\n','Separate magazine socket from trigger grip');
swap("const x=Math.max(42,q.stock*.72),col=attachmentPalette(mag);","const x=dl408Feed(p).x-23,col=attachmentPalette(mag);",'Mounted magazine uses feed socket');
swap("const x=Math.max(44,q.stock*.72)+23,y=w*.46+drop;","const x=dl408Feed(p).x,y=w*.46+drop;",'Moving magazine uses same feed socket');
swap("}else{const x=q.stock+28,y=w*.5+drop;dl404Box(","}else{const x=dl408Feed(p).x,y=w*.5+drop;dl404Box(",'Service reload shares fixed canister socket');
// Tag the real ally responsible for each emitted effect. Environmental arcs are not actors.
function tagTrace(literal,actor,name){swap('tracers.push('+literal+');','tracers.push(dl408AllyTrace('+actor+','+literal+'));',name);}
tagTrace("{x:1290,y:363,tx:z.x,ty:z.feet-45*z.size,life:.1,ally:true}","s.id",'Legacy ally source follows figure');
tagTrace("{x:1290,y:363,tx:z.x,ty:z.feet-frontBody(z)*z.size,life:.1,ally:true}","s.id",'Shooter and sniper traces follow visible ally');
tagTrace("{x:1260,y:380,tx:z.x,ty:z.feet-frontBody(z)*z.size,life:.12,ally:true}","'interruptor'",'Interrupter effect follows ally');
tagTrace("{x:1240,y:400,tx:t.x,ty:t.feet-frontBody(t)*t.size,life:.1,ally:true}","'northGunner'",'Northern gunner effect follows ally');
// Metro and air use the same old hard-coded source. Scope the substitution to their actual tick function.
for(const [name,id,next] of [['tickMetroAllies','metroCover','\n'],['tickAirAllies','airGunner','\n']]){
 const start=h.indexOf('function '+name+'('),literal="tracers.push({x:1240,y:400,tx:z.x,ty:z.feet-frontBody(z)*z.size,life:.1,ally:true});",where=h.indexOf(literal,start);
 if(start<0||where<start||where>start+1800)throw Error('Ally location missing '+name);
 const a=h.slice(start,where+literal.length),b=a.replace(literal,"tracers.push(dl408AllyTrace('"+id+"',{x:1240,y:400,tx:z.x,ty:z.feet-frontBody(z)*z.size,life:.1,ally:true}));");swap(a,b,id+' traced from mounted source');
}
tagTrace("{x:1235,y:402,tx:z.x,ty:z.feet-frontBody(z)*z.size,life:.1,ally:true}","'roadGunner'",'Road gunner effect follows ally');
tagTrace("{x:1230,y:402,tx:z.x,ty:z.feet-frontBody(z)*z.size,life:.1,ally:true}","'waterGunner'",'Naval gunner effect follows ally');
swap("projectiles.push({kind:'grenade',x:1240,y:360,startX:1240,startY:360,tx:z.x,ty:z.feet-30*z.size,t:0,duration:.65,dmg:105,radius:115,ground:z.feet,support:true});","projectiles.push(dl408AllyProjectile('grenadier',{kind:'grenade',x:1240,y:360,startX:1240,startY:360,tx:z.x,ty:z.feet-30*z.size,t:0,duration:.65,dmg:105,radius:115,ground:z.feet,support:true}));",'Support grenades retain actual launch origin');
swap("v24Blit('prop-carriage',1180,287,260,136);","v24Blit('prop-carriage',1168,279,550,287);",'Last carriage art shares deck and human scale');

const oldRearFigure=` // The player is visibly in the defended post, firing toward the camera.
 ellipse(720,y-46,8,10,'#c4b58d');rect(707,y-37,27,32,'#718779');line(715,y-7,712,y+7,'#21383d',7);line(729,y-7,733,y+7,'#21383d',7);rect(716,y-28,9,20,'#13282f');
 if(flash>0){ellipse(720,y-12,13,8,'#f0cb83');ellipse(720,y-12,6,3,'#fff1bc');}
`;
swap(oldRearFigure,'','Remove duplicated procedural survivor from rear post');
const marker='\n\n})();\n</script>\n\n<script>\n/* DL_V34_GEOMETRY_CORE */';
swap(marker,'\n\n'+read('src/spatial.js')+marker,'Native spatial presentation and tests');
h=h.replace(/<title>[\s\S]*?<\/title>/,'<title>Dernière Ligne — QA intégrale 0.44.0</title>');
h=h.replace('</head>',`<style id="dl42-ui-style">${read('src/ui_v42.css')}</style>\n<style id="dl44-ui-style">${read('src/ui_v44.css')}</style>\n</head>`);
h=h.replace('</body>',`<script id="dl42-ui-script">${read('src/ui_v42.js')}</script>\n<script id="dl44-ui-script">${read('src/ui_v44.js')}</script>\n</body>`);
fs.mkdirSync(path.join(root,'rapports'),{recursive:true});fs.writeFileSync(path.join(root,'JOUER_DERNIERE_LIGNE.html'),h);fs.writeFileSync(path.join(root,'rapports/PATCHES_0_44_0.json'),JSON.stringify({version:'0.44.0',patches:[...patches,'Poste de commandement UI','QA intégrale et stabilisation'],bytes:Buffer.byteLength(h)},null,2));console.log(JSON.stringify({version:'0.44.0',patches:patches.length+2,bytes:Buffer.byteLength(h)}));
