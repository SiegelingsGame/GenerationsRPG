// Prebaked PixelForge effects, drawn inside the existing battle camera (no overlay).
'use strict';
const ForgeFX = {
 clips:{}, live:[], reduced:window.matchMedia('(prefers-reduced-motion: reduce)'),
 ready(key){const clip=this.clips[key];return !!(clip?.img.complete&&clip.img.naturalWidth);},
 emit(key,target,source=null){
  if(!target||!this.ready(key))return false;
  if(this.reduced.matches)return true; // handled, without falling back to moving effects
  const last=this.live.find(f=>f.key===key&&f.uid===target.uid&&performance.now()-f.t0<35);
  if(last)return true;
  this.live.push({key,uid:target.uid,flip:source?.side==='enemy',t0:performance.now()});
  if(this.live.length>24)this.live.shift();return true;
 },
 attack(src,target,crit){
  const id=src?.vfxSkill;
  const key={firebolt:'flame-pillar',soulfire:'soul-wisps',hexbolt:'arcane-missile',obliterate:'shadow-void',frostNova:'frost-nova',smite:'holy-pillar',dissonance:'psychic-wave',whirlwind:'spin-slash',cleave:'spin-slash',venomBlade:'poison-cloud'}[id] ||
   (crit?'crit-hit':src?.shape==='beast'?'claw-swipe':['sorcerer','warlock'].includes(src?.cls)?'arcane-missile':src?.cls==='ranger'?'hit-spark':'sword-slash');
  return this.emit(key,target,src);
 },
 reset(){this.live=[];},
 draw(render){
  const now=render.t||performance.now();
  this.live=this.live.filter(f=>{const c=this.clips[f.key];return now-f.t0<c.n/c.fps*1000;});
  if(this.reduced.matches){this.reset();return;}
  for(const f of this.live){
   const u=Battle.find(f.uid);if(!u)continue;
   const clip=this.clips[f.key],p=render.unitScreen(u),lift=render.unitAimLift?render.unitAimLift(u):30;
   const frame=Math.max(0,Math.floor((now-f.t0)*clip.fps/1000));
   const scale=Math.min(2.5,Math.max(1.3,120/Math.max(clip.fw,clip.fh)))*(u.giant?1.4:1);
   PixelForgePlayer.drawFrame(render.ctx,clip,frame,p.x,p.y-lift,scale,f.flip);
  }
 },
};
const forgeVersion=document.querySelector('meta[name="gen-version"]')?.content||'dev';
for(const [key,pf] of Object.entries(FORGE_CLIPS)){
 const img=new Image();img.src=`assets/forge/${key}.png?v=${encodeURIComponent(forgeVersion)}`;
 ForgeFX.clips[key]={...pf,img};
}
