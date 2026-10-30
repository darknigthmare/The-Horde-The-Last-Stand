/* 0.44.2 — Audio controls and motion preferences apply to the complete feedback path.
   Injected inside the engine closure. No simulation, economy or save-schema changes. */
const DL442Feedback={version:'0.44.2',routedHums:new WeakSet(),gainTargets:new WeakMap(),routedCount:0};

function dl442RouteLegacyAmbience(){
 const c=dlAudio.ctx,bus=dlAudio.ambience;
 if(!c||!bus)return;
 // These route-specific sources predate or follow the unified mixer and used to
 // bypass both the master slider and the ambience slider via c.destination.
 for(const hum of [metroHum,airHum,highwayHum,waterHum,towerHum,darkHum]){
  const gain=hum?.gain;if(!gain||DL442Feedback.routedHums.has(gain))continue;
  try{gain.disconnect(c.destination);gain.connect(bus);DL442Feedback.routedHums.add(gain);DL442Feedback.routedCount++;}
  catch(_){/* Audio-device failures must not interrupt the game. */}
 }
}

// Keep the existing slider curve, bus levels and compressor settings. Zero is a
// true mute after a short fade; rapid off/on changes cannot retain a pending mute.
syncAudioMix=function(immediate=false){
 const c=dlAudio.ctx;if(!c)return;ensureAudioSettings();const t=c.currentTime;
 for(const [node,value] of [[dlAudio.master,audioMasterLevel()],[dlAudio.sfx,audioValue('sfxVolume')],[dlAudio.ambience,audioValue('ambienceVolume')],[dlAudio.music,audioValue('musicVolume')]]){
  if(!node)continue;const gain=node.gain;
  if(!immediate&&DL442Feedback.gainTargets.get(gain)===value)continue;
  DL442Feedback.gainTargets.set(gain,value);const current=gain.value;
  gain.cancelScheduledValues(t);gain.setValueAtTime(current,t);
  if(immediate)gain.setValueAtTime(value,t);
  else if(value===0)gain.linearRampToValueAtTime(0,t+.025);
  else gain.setTargetAtTime(value,t,.08);
 }
 if(dlAudio.compressor){dlAudio.compressor.threshold.setTargetAtTime(data.settings.nightMix?-30:-16,t,.08);dlAudio.compressor.ratio.setTargetAtTime(data.settings.nightMix?8:4,t,.08);}
};

function dl442PublishAudioState(){
 const button=$('soundBtn'),enabled=String(!!data.settings.sound);
 if(button&&button.dataset.audioEnabled!==enabled)button.dataset.audioEnabled=enabled;
 window.DL44UI?.syncAudioState?.();
}

const dl442FeedbackHUDPrior=updateHUD;
updateHUD=function(...args){
 const out=dl442FeedbackHUDPrior.apply(this,args);
 if(dlAudio.ctx){dl442RouteLegacyAmbience();syncAudioMix();}
 dl442PublishAudioState();return out;
};

// The original motion switch already disables the Canvas shake. It must also
// disable the later CSS recoil transform on that same Canvas.
const dl442CanvasImpactPrior=v20ApplyCanvasImpact;
v20ApplyCanvasImpact=function(){
 if(data.settings.motion===false){const el=$('game');if(el)el.style.transform='';return;}
 return dl442CanvasImpactPrior();
};

// Share one comfort factor between image effects and their procedural fallbacks.
// Leave impact markers, blood, smoke, tracers and threat warnings readable.
function dl442FlashOpacity(){return data.settings.reducedFlashes ? 0.25 : 1;}
const dl442FlashingEffects=new Set(['muzzle1','muzzle2','sparks','explosion']);
const dl442EffectImagePrior=v26DrawEffectImage;
v26DrawEffectImage=function(name,x,y,size,alpha=1,rotation=0){
 return dl442EffectImagePrior(name,x,y,size,alpha*(dl442FlashingEffects.has(name)?dl442FlashOpacity():1),rotation);
};

dl442RouteLegacyAmbience();if(dlAudio.ctx)syncAudioMix();dl442PublishAudioState();
queueMicrotask(()=>{if(window.__DL)window.__DL.feedback442={
 version:DL442Feedback.version,
 audio:()=>({context:dlAudio.ctx?.state||'absent',master:dlAudio.master?.gain.value??null,sfx:dlAudio.sfx?.gain.value??null,ambience:dlAudio.ambience?.gain.value??null,music:dlAudio.music?.gain.value??null,routedHums:DL442Feedback.routedCount}),
 sync:immediate=>syncAudioMix(immediate)
};});
