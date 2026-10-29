/* 0.44.2 — Input ownership, safe rebinding and resumed fire.
 * Injected inside the engine closure, after its existing input handlers.
 * Hardware state stays in padState; no save schema or action mapping changes.
 */
let v442PadFireNeedsRelease=false;
let v442LastNonPadMode=inputMode==='pointer'?'pointer':'keyboard';
function v442PadTrigger(p){return padValue(p,7)>.35||padPressed(p,7);}

const v442ClearInputPrior=clearCombatInput;
clearCombatInput=function(){
 // A held trigger must be released after a pause, blur or screen transition,
 // just as a pointer must be pressed again after losing its capture.
 v442PadFireNeedsRelease=true;
 padState.shooting=false;
 return v442ClearInputPrior.apply(this,arguments);
};
const v442PadAimPrior=updatePadAim;
updatePadAim=function(p,dt){
 if(!v442PadTrigger(p))v442PadFireNeedsRelease=false;
 const out=v442PadAimPrior(p,dt);
 if(v442PadFireNeedsRelease&&aimPointerId===null){shootHeld=false;padState.shooting=false;}
 return out;
};

const v442InputModePrior=setInputMode;
setInputMode=function(mode){
 if(mode!=='gamepad')v442LastNonPadMode=mode;
 const out=v442InputModePrior(mode);
 // Legacy CSS uses this class for its action glyphs and help text. Its visual
 // state follows the device being used; padState retains connection status.
 $('shell').classList.toggle('gamepad-connected',mode==='gamepad'&&padState.connected);
 return out;
};
const v442GamepadPrior=tickGamepad;
tickGamepad=function(now,dt){
 const p=activePad();
 let usedPad=false;
 const previousNonPadMode=v442LastNonPadMode;
 if(p){
  if(!padState.connected)v442PadFireNeedsRelease=true;
  if(!v442PadTrigger(p))v442PadFireNeedsRelease=false;
  const buttonEdge=p.buttons.some((b,i)=>b.pressed&&!padState.buttons[i]);
  const movingStick=p.axes.some((_,i)=>axisValue(p,i)!==0);
  usedPad=buttonEdge||movingStick||(!v442PadFireNeedsRelease&&v442PadTrigger(p)&&!padState.shooting);
 }
 const out=v442GamepadPrior(now,dt);
 if(p&&usedPad){
  // Let aiming read the previous device before changing it: the first stick
  // motion starts at the pointer's position. Pad B also emits a synthetic
  // Escape, which must not make the prompt switch back to keyboard.
  v442LastNonPadMode=previousNonPadMode;
  setInputMode('gamepad');
 }else if(!p){
  // The disconnect event clears connected before the old polling handler can
  // remove its CSS class. Reconcile it even when no new pad event arrives.
  if(padState.shooting&&aimPointerId===null)shootHeld=false;
  padState.shooting=false;
  if(inputMode==='gamepad')setInputMode(v442LastNonPadMode);
 }
 $('shell').classList.toggle('gamepad-connected',!!p&&inputMode==='gamepad');
 return out;
};

const v442BindingUIPrior=v21RefreshBindingUI;
v21RefreshBindingUI=function(){
 const focused=document.activeElement?.dataset?.v21Bind;
 const out=v442BindingUIPrior();
 if(focused&&phase==='settings'){
  const button=[...($('v21BindingList')?.querySelectorAll('[data-v21-bind]')||[])].find(b=>b.dataset.v21Bind===focused);
  button?.focus({preventScroll:true});
 }
 return out;
};

// Called by the existing window capture listener before its modal focus trap.
// Escape cancels capture in place; Tab cancels capture then keeps normal focus
// navigation. Neither key can become a gameplay binding.
function v442HandleBindingSafety(e){
 if(!v21BindingCapture)return false;
 if(e.key!=='Escape'&&e.key!=='Tab')return false;
 v21BindingCapture=null;
 v21RefreshBindingUI();
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return true;}
 return false;
}
const v442InputScreenPrior=showScreen;
showScreen=function(id){
 if(phase!=='settings'||id!=='dialogScreen')v21BindingCapture=null;
 return v442InputScreenPrior.apply(this,arguments);
};
document.addEventListener('pointerdown',e=>{
 if(v21BindingCapture&&!e.target?.closest?.('[data-v21-bind]')){
  v21BindingCapture=null;v21RefreshBindingUI();
 }
},true);
