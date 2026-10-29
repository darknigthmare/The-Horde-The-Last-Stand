/* DERNIERE LIGNE 0.44.0 — QA INTÉGRALE
   Progressive disclosure / compact HUD. Presentation only. */
(()=>{
'use strict';
const VERSION='0.44.0';
const $=id=>document.getElementById(id),shell=$('shell');
if(!shell||shell.dataset.dl44Installed==='1')return;
shell.dataset.dl44Installed='1';shell.classList.add('dl43-ui');
let detailsOpen=false,intelOpen=false,decorating=false;
const tabCopy={
 readiness:['PRÉPARATION','Les points à vérifier avant de partir.'],operation:['MISSION','Objectif, décision du jour et contrat.'],approaches:['APPROCHES','Entrées, caméra et lecture du terrain.'],arsenal:['ARSENAL','Choisissez vos armes sans perdre le fil de la nuit.'],workshop:['ARMURIER','Montage, conversions et essais.'],convoy:['CONVOI','État de la route et ressources mobiles.'],traps:['DÉFENSES','Pièges et dispositifs de terrain.'],personnel:['PERSONNEL','Affectations et spécialistes.'],support:['ALLIÉS','Soutiens recrutés pour la prochaine défense.'],base:['STOCKS','Réserves, consommables et état du poste.'],projects:['PROJETS','Améliorations à moyen terme.'],equipment:['INSTALLATIONS','Équipements permanents du poste.'],training:['DOCTRINES','Progression et spécialisations.'],codex:['DOSSIERS','Archives et renseignements.'],report:['BILAN','Résultats et historique récent.'],metro:['LIGNE M','Préparation spécifique de la rame.'],air:['ARGO-17','Préparation spécifique du vol.'],north:['VALCENDRE','Préparation spécifique du Nord.'],water:['EAUX NOIRES','Préparation de la flottille.'],highway:['AUTOROUTE','Préparation du convoi mobile.']
};
function safe(fn){try{return fn();}catch(e){console.warn('[DL43 UI]',e);}}
function versionPass(){
 if(document.title!=='Dernière Ligne — QA intégrale 0.44.0')document.title='Dernière Ligne — QA intégrale 0.44.0';
 const tag=document.querySelector('.version-tag');if(tag&&tag.textContent!=='0.44.0 // QA INTÉGRALE')tag.textContent='0.44.0 // QA INTÉGRALE';
 const foot=document.querySelector('.menu-footer'),footHTML='QA INTÉGRALE · 4 PROFILS · AUCUN SYSTÈME RETIRÉ.<br>Version 0.44.0 · Poste stabilisé';if(foot&&foot.innerHTML!==footHTML)foot.innerHTML=footHTML;
 const stamp=$('dl42TopStamp');if(stamp){const s=stamp.querySelectorAll('span');if(s.length&&s[s.length-1].textContent!=='0.44.0')s[s.length-1].textContent='0.44.0';}
}
function ensureCampTools(){
 const heading=document.querySelector('#campScreen .camp-heading');if(!heading)return;
 let tools=$('dl43CampTools');
 if(!tools){tools=document.createElement('div');tools.id='dl43CampTools';tools.innerHTML='<button id="dl43DetailsBtn" type="button" aria-pressed="false" title="Afficher les explications et données secondaires"><b>≡</b><span>DÉTAILS</span></button><button id="dl43IntelBtn" type="button" aria-pressed="false" title="Ouvrir les renseignements de la nuit"><b>◎</b><span>RENSEIGNEMENTS</span></button>';heading.appendChild(tools);
  $('dl43DetailsBtn').onclick=()=>{detailsOpen=!detailsOpen;applyDensity();};
  $('dl43IntelBtn').onclick=()=>{intelOpen=!intelOpen;applyIntel();};
 }
 applyDensity();applyIntel();
}
function applyDensity(){
 shell.classList.toggle('dl43-details-open',detailsOpen);
 const b=$('dl43DetailsBtn');if(b){b.setAttribute('aria-pressed',String(detailsOpen));b.querySelector('span').textContent=detailsOpen?'ESSENTIEL':'DÉTAILS';b.title=detailsOpen?'Revenir à la lecture essentielle':'Afficher les explications et données secondaires';}
}
function applyIntel(){
 shell.classList.toggle('dl43-intel-open',intelOpen);
 const b=$('dl43IntelBtn');if(b){b.setAttribute('aria-pressed',String(intelOpen));b.querySelector('span').textContent=intelOpen?'FERMER':'RENSEIGNEMENTS';}
 const p=$('intelPanel');if(p){
  p.setAttribute('aria-hidden',String(!intelOpen));
  // The legacy UI can rewrite .intel styles while camp content refreshes. Pin the
  // open state inline so the drawer cannot visually fall back to the old column.
  if(intelOpen){p.style.setProperty('transform','none','important');p.style.setProperty('opacity','1','important');p.style.setProperty('visibility','visible','important');}
  else{p.style.removeProperty('transform');p.style.removeProperty('opacity');p.style.removeProperty('visibility');}
 }
}
function campBand(){
 const root=$('shopBody');if(!root)return;
 const active=document.querySelector('#campScreen .tabs button.selected:not(.hidden),#campScreen .tabs button.active:not(.hidden)');
 const key=active?.dataset.tab||'';root.dataset.dl43Tab=key;
 let band=$('dl43SectionBand');if(!band){band=document.createElement('header');band.id='dl43SectionBand';band.innerHTML='<div><span id="dl43SectionKicker">SECTION</span><strong id="dl43SectionTitle">PRÉPARATION</strong><small id="dl43SectionCopy"></small></div><span id="dl43SectionCount"></span>';root.prepend(band);}
 const info=tabCopy[key]||[(active?.dataset.label||active?.textContent||'POSTE').trim(),'Préparez uniquement ce qui compte pour la prochaine sortie.'];
 $('dl43SectionKicker').textContent='POSTE // '+(key||'SECTION').toUpperCase();$('dl43SectionTitle').textContent=info[0];$('dl43SectionCopy').textContent=info[1];
 const actionable=root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)').length;$('dl43SectionCount').textContent=actionable?`${actionable} ACTION${actionable>1?'S':''}`:'LECTURE';
}
function classifyCamp(){
 const root=$('shopBody');if(!root)return;
 root.classList.add('dl43-clean-body');
 root.querySelectorAll('.route-map,.v21-recommendation,.v20-directive-card,.briefing-card,.ledger-card,.v21-reco-columns,.event-deliveries,.test-info,.weapon-compare,.profile-metrics,.v22-session-flow,.v22-flow-forecast').forEach(el=>el.classList.add('dl43-deep'));
 root.querySelectorAll('.card p,.notice p,.operation-intro p').forEach(el=>el.classList.add('dl43-copy'));
 root.querySelectorAll('.game-card,.card').forEach(card=>{if(!card.dataset.dl43Card){card.dataset.dl43Card='1';const btns=card.querySelectorAll(':scope .card-actions button');if(btns.length===1)card.classList.add('dl43-single-action');}});
 campBand();
}
function wrapActionLabels(){
 const ids=['reloadBtn','pistolBtn','grenadeBtn','repairBtn','medBtn'];
 for(const id of ids){const b=$(id);if(!b||b.dataset.dl43Label==='1')continue;b.dataset.dl43Label='1';b.setAttribute('aria-label',(b.textContent||'').trim());b.title=(b.textContent||'').trim();const key=b.querySelector(':scope > b');const nodes=[...b.childNodes].filter(n=>n!==key);const span=document.createElement('span');span.className='dl43-action-label';for(const n of nodes)span.appendChild(n);b.appendChild(span);}
 for(const id of ['slot1Btn','slot2Btn']){const b=$(id);if(b){b.title=id==='slot1Btn'?'Arme principale 1':'Arme principale 2';const s=b.querySelector(':scope > span');if(s)s.classList.add('dl43-action-label','dl43-weapon-label');}}
}
function ensureActionGroups(){
 const actions=$('actions');if(!actions||$('dl43WeaponActions'))return;
 wrapActionLabels();
 const weaponGroup=document.createElement('div');weaponGroup.id='dl43WeaponActions';weaponGroup.className='dl43-action-group';weaponGroup.dataset.label='ARMES';
 const utilityGroup=document.createElement('div');utilityGroup.id='dl43UtilityActions';utilityGroup.className='dl43-action-group';utilityGroup.dataset.label='OUTILS';
 for(const id of ['slot1Btn','slot2Btn','pistolBtn','reloadBtn']){const b=$(id);if(b)weaponGroup.appendChild(b);}
 for(const id of ['grenadeBtn','repairBtn','medBtn']){const b=$(id);if(b)utilityGroup.appendChild(b);}
 actions.append(weaponGroup,utilityGroup);
}
function compactObjective(){
 const o=$('objective');if(!o||shell.dataset.phase!=='combat')return;
 const current=(o.textContent||'').trim();
 // If our own compact text is still on screen, keep the last complete objective.
 // A legacy HUD refresh writes a new full value, which becomes the new source of truth.
 let full=(o.dataset.dl43Compact&&current===o.dataset.dl43Compact&&o.dataset.dl43Full)?o.dataset.dl43Full:current;
 if(!full)return;
 if(current!==o.dataset.dl43Compact){o.dataset.dl43Full=full;}
 if(full.includes('·')){
  const parts=full.split('·').map(s=>s.trim()).filter(Boolean),compact=parts.slice(0,2).join('  ·  ');
  o.dataset.dl43Compact=compact;o.title=full;
  if(current!==compact)o.textContent=compact;
 }else{o.dataset.dl43Compact='';o.title=full;}
}
function compactCombatChrome(){
 ensureActionGroups();
 const brand=document.querySelector('#hud .brand');if(brand)brand.setAttribute('aria-hidden','true');
 const sound=$('soundBtn');if(sound){const enabled=typeof data!=='undefined'&&!!data.settings?.sound;sound.title=enabled?'Audio activé':'Audio désactivé';sound.textContent='♪';sound.setAttribute('aria-label',sound.title);sound.setAttribute('aria-pressed',String(enabled));}
 const pause=$('pauseBtn');if(pause){const paused=shell.dataset.phase==='paused';pause.title=paused?'Reprendre':'Pause';pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',pause.title);}
 const fs=$('dl42FullscreenBtn');if(fs){fs.title='Plein écran (F10)';fs.setAttribute('aria-label','Basculer le plein écran');}
 const status=$('weaponStatus');if(status){const important=/RECHARG|CHARGEUR VIDE|RÉPARATION|TRANSMISSION|INSERTION|SUSPENDU/i.test(status.textContent||'');status.classList.toggle('dl43-critical',important);}
 const secondary=$('secondaryStatus');if(secondary)secondary.classList.toggle('dl43-silent',/AUCUN(?:E)?\s+OBJECTIF/i.test(secondary.textContent||''));
 const tactical=$('tacticalStatus');if(tactical){[...tactical.children].forEach(ch=>ch.classList.toggle('dl43-muted-state',/ABSENTE|\b0\s*U\b/i.test(ch.textContent||'')));tactical.classList.toggle('dl43-silent',[...tactical.children].every(ch=>ch.classList.contains('dl43-muted-state')));}
 const pressure=$('v22PressurePanel');if(pressure){const tier=Number(pressure.dataset.tier||0),momentum=parseInt(($('v22MomentumText')?.textContent||'').match(/(\d+)/)?.[1]||'0',10),pack=parseInt(($('v22PackName')?.textContent||'').match(/(\d+)/)?.[1]||'1',10),lanes=[$('v23LaneA'),$('v23LaneB')].some(x=>parseInt((x?.textContent||'').match(/(\d+)\s*$/)?.[1]||'0',10)>0);pressure.classList.toggle('dl43-passive',tier===0&&momentum===0&&pack<=1&&!lanes);}
 compactObjective();
}
function compactSettings(body){
 if(!body||body.dataset.dl43Settings==='1')return;
 const panels=[...body.querySelectorAll(':scope > .settings-panel')];if(panels.length<2)return;
 body.dataset.dl43Settings='1';
 // The oldest settings are loose nodes above the later panels. Turn them into a
 // genuine first category and move combat-readability helpers into their natural
 // LISIBILITÉ section, so opening settings never means scrolling through a form wall.
 const h2=body.querySelector(':scope > h2');
 const firstPanel=panels[0];
 const loose=[...body.children].filter(el=>h2&&el.compareDocumentPosition(h2)&Node.DOCUMENT_POSITION_PRECEDING&&el.compareDocumentPosition(firstPanel)&Node.DOCUMENT_POSITION_FOLLOWING&& !el.classList.contains('dialog-chrome')&&!el.classList.contains('eyebrow'));
 const split=loose.findIndex(el=>/Reprendre le tir tactile/i.test(el.textContent||''));
 const generalNodes=(split>=0?loose.slice(0,split):loose);
 const combatNodes=(split>=0?loose.slice(split):[]);
 const interfacePanel=panels.find(p=>p.id==='interfaceSettings');
 if(interfacePanel&&combatNodes.length){const anchor=interfacePanel.querySelector('.setting-heading')?.nextSibling;for(const node of combatNodes)interfacePanel.insertBefore(node,anchor);}
 const folds=[];
 if(generalNodes.length){
  const details=document.createElement('details');details.className='dl43-settings-fold dl43-settings-general';details.open=true;
  const summary=document.createElement('summary');summary.innerHTML='<span>01</span><strong>GÉNÉRAL</strong>';
  const cluster=document.createElement('div');cluster.className='dl43-settings-cluster';for(const node of generalNodes)cluster.appendChild(node);
  firstPanel.parentNode.insertBefore(details,firstPanel);details.append(summary,cluster);folds.push(details);
 }
 panels.forEach((panel,i)=>{const details=document.createElement('details');details.className='dl43-settings-fold';details.open=!folds.length&&i===0;const title=panel.querySelector('.setting-heading strong')?.textContent||panel.querySelector('.setting-heading span')?.textContent||panel.id?.replace(/([A-Z])/g,' $1')||`RÉGLAGES ${i+1}`;const summary=document.createElement('summary');summary.innerHTML=`<span>${String(i+1+folds.length).padStart(2,'0')}</span><strong>${title.trim().toUpperCase()}</strong>`;panel.parentNode.insertBefore(details,panel);details.append(summary,panel);});
}
function decorateDialog(){
 const body=$('dialogBody');if(!body)return;
 body.classList.add('dl43-dialog');
 const phase=shell.dataset.phase||'';body.dataset.dl43Phase=phase;
 const buttons=body.querySelectorAll('.buttons');buttons.forEach(b=>b.classList.add('dl43-dialog-actions'));
 body.querySelectorAll('.notice').forEach(n=>n.classList.add('dl43-dialog-note'));
 if(phase==='settings')compactSettings(body);
}
function decorate(){if(decorating)return;decorating=true;try{versionPass();ensureCampTools();classifyCamp();compactCombatChrome();decorateDialog();}finally{decorating=false;}}
function showAbout(){
 safe(()=>typeof clearCombatInput==='function'&&clearCombatInput());
 if(typeof phase!=='undefined')phase='about';
 shell.dataset.phase='about';
 if(typeof showScreen==='function')showScreen('dialogScreen');
 const body=$('dialogBody');if(!body)return;body.innerHTML='<div class="eyebrow">DERNIÈRE LIGNE · 0.44.0</div><h2>POSTE STABILISÉ</h2><p>Cette passe QA intégrale stabilise l’interface et les parcours sans retirer les systèmes : menus, préparation, HUD, sauvegardes et huit familles jouables ont été contrôlés sous quatre profils de test.</p><div class="notice"><strong>Aucun système supprimé.</strong> Le bouton DÉTAILS restaure les explications secondaires de la préparation. Les corrections QA n’altèrent ni les dégâts, ni les prix, ni la balistique, ni le schéma 12 des sauvegardes.</div><div class="buttons"><button id="dl43AboutBack" class="primary">RETOUR AU MENU</button></div>';$('dl43AboutBack').onclick=()=>{if(typeof showMenu==='function')showMenu();};decorateDialog();
}
function installAbout(){const b=$('aboutGame');if(!b)return;b.dataset.dl44About='1';b.onclick=showAbout;if(b.textContent!=='À PROPOS · 0.44.0')b.textContent='À PROPOS · 0.44.0';}
// Re-decorate when legacy renderers replace the two dynamic roots.
const watch=el=>{if(!el)return;new MutationObserver(()=>queueMicrotask(()=>{if(!decorating){decorate();installAbout();}})).observe(el,{childList:true});};
watch($('shopBody'));watch($('dialogBody'));
// Legacy menu pages still rewrite the About button/title. Observe the menu root so 0.44 stays authoritative.
const menuRoot=$('menuScreen');
if(menuRoot)new MutationObserver(()=>queueMicrotask(()=>{if(!decorating){versionPass();installAbout();}})).observe(menuRoot,{childList:true,subtree:true,characterData:true});
if(typeof showScreen==='function'){const prior=showScreen;showScreen=function(id){const out=prior(id);if(id!=='campScreen'){intelOpen=false;applyIntel();}queueMicrotask(decorate);return out;};}
if(typeof renderCamp==='function'){const prior=renderCamp;renderCamp=function(){const out=prior();queueMicrotask(decorate);return out;};}
if(typeof updateHUD==='function'){const prior=updateHUD;updateHUD=function(){const out=prior();compactCombatChrome();return out;};}
if(typeof showMenu==='function'){const prior=showMenu;showMenu=function(){const out=prior();queueMicrotask(()=>{decorate();installAbout();});return out;};}
if(typeof dl403MenuPage==='function'){const prior=dl403MenuPage;dl403MenuPage=function(...args){const out=prior(...args);queueMicrotask(()=>{versionPass();installAbout();});return out;};}
// Escape closes the optional intel drawer before touching the game's own navigation.
window.addEventListener('keydown',e=>{if(e.code!=='Escape')return;if(intelOpen&&shell.dataset.phase==='camp'){intelOpen=false;applyIntel();e.stopImmediatePropagation();e.preventDefault();return;}if($('dl43AboutBack')&&$('dialogScreen')?.classList.contains('screen-active')){e.stopImmediatePropagation();e.preventDefault();if(typeof showMenu==='function')showMenu();}},true);
// Capture the click before legacy target handlers run: keyboard and pointer activation both keep About on the newest layer.
document.addEventListener('click',e=>{if(e.target.closest('#aboutGame')){versionPass();installAbout();return;}if(e.target.closest('#dl403-hubNav [data-page],#dl403-back,#dl403-play'))queueMicrotask(()=>{versionPass();installAbout();});},true);
document.addEventListener('pointerdown',e=>{if(intelOpen&&shell.dataset.phase==='camp'&&!e.target.closest('#intelPanel,#dl43IntelBtn')){intelOpen=false;applyIntel();}},true);

// Older UI layers still refresh their own version text; keep the newest presentation authoritative.
setInterval(()=>{versionPass();installAbout();if(shell.dataset.phase==='combat'){compactObjective();compactCombatChrome();}},240);

installAbout();decorate();
window.DL44UI={version:VERSION,decorate,setDetails:v=>{detailsOpen=!!v;applyDensity();},setIntel:v=>{intelOpen=!!v;applyIntel();}};
})();
