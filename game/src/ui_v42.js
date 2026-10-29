/* DERNIERE LIGNE 0.42.0 — POSTE DE COMMANDEMENT UI */
(()=>{
'use strict';
const VERSION='0.42.0';
const $id=id=>document.getElementById(id);
const shell=$id('shell');
if(!shell||shell.dataset.dl42Installed==='1')return;
shell.dataset.dl42Installed='1';shell.classList.add('dl42-ui');

function safe(fn){try{return fn();}catch(e){console.warn('[DL42 UI]',e);}}
function addChrome(){
 const testMode=/[?&]test=1(?:&|$)/.test(location.search);
 if(!testMode&&!$id('dl42Boot')){
  const boot=document.createElement('div');boot.id='dl42Boot';boot.innerHTML='<div class="dl42-boot-core"><div class="dl42-boot-kicker">CONVOI // TERMINAL DE DEFENSE</div><div class="dl42-boot-title">DERNIERE<br>LIGNE</div><div class="dl42-boot-sub">ZERO REPLI</div><div class="dl42-boot-line"><i></i></div><div class="dl42-boot-state">POSTE 07 · SYNCHRONISATION LOCALE · 0.42.0</div></div>';shell.appendChild(boot);
  let hidden=false;const close=()=>{if(hidden)return;hidden=true;boot.classList.add('hide');setTimeout(()=>boot.remove(),650)};setTimeout(close,1150);window.addEventListener('pointerdown',close,{once:true,capture:true});window.addEventListener('keydown',close,{once:true,capture:true});
 }
 if(!$id('dl42SceneWipe')){const e=document.createElement('div');e.id='dl42SceneWipe';shell.appendChild(e);}
 if(!$id('dl42TopStamp')){const e=document.createElement('div');e.id='dl42TopStamp';e.innerHTML='<i class="dl42-live-dot"></i><span>POSTE 07</span><span>//</span><span>RESEAU LOCAL</span><span>//</span><span>0.42.0</span>';shell.appendChild(e);}
 if(!$id('dl42ControlLegend')){const e=document.createElement('div');e.id='dl42ControlLegend';e.innerHTML='<span data-kb><kbd>↑↓←→</kbd>NAVIGUER</span><span data-kb><kbd>ENTRÉE</kbd>VALIDER</span><span data-kb><kbd>ÉCHAP</kbd>RETOUR</span><span data-pad hidden><kbd>LS</kbd>NAVIGUER</span><span data-pad hidden><kbd>A</kbd>VALIDER</span><span data-pad hidden><kbd>B</kbd>RETOUR</span><span><kbd>F10</kbd>PLEIN ÉCRAN</span>';shell.appendChild(e);}
 if(!$id('dl42TacticalLine')){const e=document.createElement('div');e.id='dl42TacticalLine';e.innerHTML='<span id="dl42Route">POSTE</span><span>•</span><b id="dl42View">VUE AVANT</b><span>•</span><span id="dl42Contacts">CONTACTS 0</span>';shell.appendChild(e);}
}
function sceneFlash(){const e=$id('dl42SceneWipe');if(!e)return;e.classList.remove('flash');void e.offsetWidth;e.classList.add('flash');}
function fullscreenLabel(){const on=!!document.fullscreenElement;for(const id of ['dl42FullscreenBtn','dl42FullscreenMenu']){const b=$id(id);if(!b)continue;b.setAttribute('aria-pressed',String(on));if(id==='dl42FullscreenBtn')b.textContent=on?'⤢':'⛶';else b.textContent=on?'QUITTER LE PLEIN ÉCRAN':'PLEIN ÉCRAN';}}
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else{try{await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(_){await document.documentElement.requestFullscreen();}}}catch(_){/* Browser may require a direct gesture. */}fullscreenLabel();}
function ensureFullscreenControls(){
 const end=document.querySelector('#hud .hud-end');if(end&&!$id('dl42FullscreenBtn')){const b=document.createElement('button');b.id='dl42FullscreenBtn';b.className='icon';b.type='button';b.title='Plein écran (F10)';b.setAttribute('aria-label','Basculer le plein écran');b.textContent='⛶';b.onclick=toggleFullscreen;end.insertBefore(b,end.firstChild);}
 const systems=$id('systemButtons');if(systems&&!$id('dl42FullscreenMenu')){const b=document.createElement('button');b.id='dl42FullscreenMenu';b.type='button';b.className='menu-tile';b.textContent='PLEIN ÉCRAN';b.onclick=toggleFullscreen;systems.appendChild(b);}
 fullscreenLabel();
}
function versionPass(){
 document.title='Dernière Ligne — Poste de commandement 0.42.0';
 const tag=document.querySelector('.version-tag');if(tag)tag.textContent='0.42.0 // POSTE DE COMMANDEMENT';
 const foot=document.querySelector('.menu-footer');if(foot)foot.innerHTML='LA ROUTE RESTE OUVERTE TANT QUE VOUS TENEZ.<br>Version 0.42.0 · Interface de terrain';
 const desc=document.querySelector('#menuScreen .menu-desc');if(desc&&!desc.dataset.dl42){desc.dataset.dl42='1';desc.innerHTML='Un poste. Une barricade. Aucun repli.<br>Préparez la défense, choisissez votre route et tenez jusqu’au convoi.';}
}
function showDL42About(){
 safe(()=>{if(typeof clearCombatInput==='function')clearCombatInput();});
 if(typeof showScreen==='function')showScreen('dialogScreen');
 const body=$id('dialogBody');if(!body)return;
 body.innerHTML='<div class="eyebrow">DERNIÈRE LIGNE · 0.42.0</div><h2>POSTE DE COMMANDEMENT</h2><p>Cette version unifie l’accueil, la préparation, le combat et les écrans système sous une même interface de terrain.</p><div class="notice"><strong>Gameplay conservé.</strong> 45 armes, six presets, Armurier, campagnes, Zone Noire et sauvegardes schéma 12 restent compatibles.</div><p>F10 bascule le plein écran. La légende de commandes suit automatiquement le clavier ou la manette détectée. Aucune donnée n’est envoyée en ligne.</p><div class="buttons"><button id="dl42-about-back" class="primary">RETOUR AU POSTE</button></div>';
 const back=$id('dl42-about-back');if(back)back.onclick=()=>{if(typeof showMenu==='function')showMenu();};
}
function aboutPass(){const b=$id('aboutGame');if(b&&!b.dataset.dl42About){b.dataset.dl42About='1';b.onclick=showDL42About;}}
function inputLegend(){
 const pad=shell.classList.contains('gamepad-connected');shell.dataset.dl42Input=pad?'gamepad':'keyboard';
 const legend=$id('dl42ControlLegend');if(!legend)return;legend.querySelectorAll('[data-kb]').forEach(e=>e.hidden=pad);legend.querySelectorAll('[data-pad]').forEach(e=>e.hidden=!pad);
}
function combatLine(){
 if(shell.dataset.phase!=='combat')return;
 safe(()=>{const v=typeof currentView==='function'?currentView():'front';const labels={front:'VUE AVANT',rear:'CONTRECHAMP',left:'FLANC GAUCHE',right:'FLANC DROIT'};$id('dl42View').textContent=labels[v]||String(v).toUpperCase();});
 safe(()=>{const site=typeof siteFor==='function'?siteFor():null;$id('dl42Route').textContent=(site?.name||'POSTE').toUpperCase();});
 safe(()=>{const count=(typeof zombies!=='undefined'&&Array.isArray(zombies))?zombies.filter(z=>z&&!z.dead).length:0;$id('dl42Contacts').textContent='CONTACTS '+count;});
}
function focusPass(){
 document.querySelectorAll('.dl42-focus-ring').forEach(e=>e.classList.remove('dl42-focus-ring'));
 const a=document.activeElement;if(a&&shell.contains(a)&&/^(BUTTON|SELECT|INPUT)$/.test(a.tagName))a.classList.add('dl42-focus-ring');
}
function decorate(){addChrome();ensureFullscreenControls();versionPass();aboutPass();inputLegend();focusPass();
 document.querySelectorAll('#shopBody .card').forEach(c=>{if(!c.dataset.dl42)c.dataset.dl42='card';});
 document.querySelectorAll('.dialog').forEach(d=>d.dataset.dl42='briefing');
}

// Hook the real scene router after all previous versions have installed their own wrappers.
if(typeof showScreen==='function'){
 const prior=showScreen;
 showScreen=function(id){const before=shell.dataset.phase||'';const out=prior(id);const after=shell.dataset.phase||'';if(before!==after||id)sceneFlash();queueMicrotask(decorate);return out;};
}
if(typeof renderCamp==='function'){
 const prior=renderCamp;
 renderCamp=function(){const out=prior();queueMicrotask(decorate);return out;};
}
if(typeof showMenu==='function'){
 const prior=showMenu;
 showMenu=function(){const out=prior();queueMicrotask(decorate);return out;};
}

// Native fullscreen and game-like navigation polish.
window.addEventListener('keydown',e=>{if(e.code==='F10'){e.preventDefault();toggleFullscreen();}},true);
document.addEventListener('fullscreenchange',fullscreenLabel);
document.addEventListener('focusin',focusPass,true);document.addEventListener('focusout',()=>queueMicrotask(focusPass),true);
document.addEventListener('pointerdown',()=>{shell.dataset.dl42Input='mouse';},true);
window.addEventListener('gamepadconnected',()=>setTimeout(inputLegend,50));window.addEventListener('gamepaddisconnected',()=>setTimeout(inputLegend,50));

// Keep combat chrome synchronized with the real HUD update without touching combat values.
if(typeof updateHUD==='function'){const priorHUD42=updateHUD;updateHUD=function(){const out=priorHUD42();combatLine();const chip=$id('v36-combat-build');if(chip&&chip.textContent.trim()==='CONFIGURATION D’ORIGINE')chip.textContent='MONTAGE · ORIGINE';return out;};}

// Keep the shell current without touching gameplay cadence.
let lastPhase='';setInterval(()=>{const p=shell.dataset.phase||'';if(p!==lastPhase){lastPhase=p;decorate();}inputLegend();combatLine();},180);

addChrome();decorate();combatLine();
window.DL42UI={version:VERSION,toggleFullscreen,decorate,combatLine,sceneFlash};
})();
