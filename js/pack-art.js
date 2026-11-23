// Game-integrated art from the supplied packs; no runtime CDN dependency.
'use strict';
const PackArt = {
  images: {}, effects: [], reduced: window.matchMedia('(prefers-reduced-motion: reduce)'),
  load(key,path) { const image=new Image();image.src=path;this.images[key]=image;return image; },
  ready(key) { const im=this.images[key];return im?.complete && im.naturalWidth>0; },
  emit(key,target,source=null,projectile=null) {
    if (!target || !PACK_EFFECTS[key]) return;
    const t0=performance.now();
    const pos=u=>({x:u.gx,y:u.gy});
    this.effects.push({key,to:pos(target),from:source?pos(source):null,projectile,t0,delay:projectile?240:0});
    if(this.effects.length>40)this.effects.splice(0,this.effects.length-40);
  },
  damage(src,target,crit) {
    const id=src?.vfxSkill;
    const spell={firebolt:['explosion','fire_proj'],frostNova:['sparkle','ice_proj'],smite:['critical','holy_proj'],dissonance:['music','wind_proj']}[id];
    if(spell)this.emit(spell[0],target,src,spell[1]);
    else if(src?.cls==='sorcerer'&&!id)this.emit('sparkle',target,src,'dark_proj');
    else this.emit(crit?'critical':'hit',target);
  },
  frame(ctx,key,x,y,elapsed,size=90,loop=false,angle=0) {
    const info=PACK_EFFECTS[key];if(!info||!this.ready(key)||elapsed<0)return;
    const frame=this.reduced.matches?Math.floor(info.frames/2):Math.floor(elapsed*info.fps/1000);
    if(!loop&&frame>=info.frames)return;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x,y);ctx.rotate(angle);
    const w=size,h=size*info.h/info.w;
    ctx.drawImage(this.images[key],(frame%info.frames)*info.w,0,info.w,info.h,-w/2,-h/2,w,h);ctx.restore();
  },
  drawBattle(render) {
    const now=render.t,ctx=render.ctx;
    this.effects=this.effects.filter(f=>now-f.t0<f.delay+PACK_EFFECTS[f.key].frames/PACK_EFFECTS[f.key].fps*1000);
    for(const f of this.effects) {
      const elapsed=now-f.t0,to=render.biso(f.to.x,f.to.y);to.y-=30;
      if(f.projectile&&elapsed>=0&&elapsed<f.delay&&!this.reduced.matches) {
        const from=render.biso(f.from.x,f.from.y);from.y-=35;
        const k=elapsed/f.delay;this.frame(ctx,f.projectile,from.x+(to.x-from.x)*k,from.y+(to.y-from.y)*k,elapsed,65,true,Math.atan2(to.y-from.y,to.x-from.x));
      }
      this.frame(ctx,f.key,to.x,to.y,elapsed-f.delay, f.key==='explosion'?120:95);
    }
  },
};
for(const key of Object.keys(PACK_EFFECTS))PackArt.load(key,`assets/packs/${key}.png`);
PackArt.load('props','assets/packs/props.png');PackArt.load('floor','assets/packs/wood-floor.png');

const WorldArt = {
  // Hash-based layouts never consume the simulation's RNG, and stay stable in saved worlds.
  hash(seed,n) {let h=Math.imul(seed^n,0x45d9f3b);h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;},
  ensure() {
    if(!G?.world?.map)return;
    const world=G.world;
    if(world.seed==null)world.seed=R.int(1,2e9);
    if(!world.assetSites)world.assetSites={};
    for(const t of world.map.tiles) {
      if(!['town','estate','ruins','camp','dens'].includes(t.feature))continue;
      const key=`${t.x},${t.y}`,seed=this.hash(world.seed||812,t.x*8191+t.y*131);
      if(!world.assetSites[key]) {
        const theme=['market','garden','scholars','homestead'][seed%4];
        const pool=t.feature==='ruins'?[5,6,7]:t.feature==='camp'||t.feature==='dens'?[0,1,7]:theme==='garden'?[4,7,4]:theme==='scholars'?[2,0,6]:[0,1,7,4];
        world.assetSites[key]={seed,theme,props:Array.from({length:3+seed%3},(_,i)=>({id:pool[this.hash(seed,i+1)%pool.length],dx:(i%2?1:-1)*(.48+(i%3)*.19),dy:-.3+Math.floor(i/2)*.35}))};
      }
    }
  },
  prop(ctx,id,x,y,size=24) {
    if(!PackArt.ready('props'))return;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(PackArt.images.props,id*64,0,64,64,x-size/2,y-size,size,size);ctx.restore();
  },
  drawSite(render,t) {
    if(t.feature==='camp'||(t.feature==='shrine'&&t.lit)) {
      const p=render.iso(t.x,t.y,render.flat?0:t.h);
      PackArt.frame(render.ctx,'flame',p.x,p.y-(t.feature==='shrine'?30:9),render.t,30,true);
    }
    const plan=G.world.assetSites?.[`${t.x},${t.y}`];if(!plan)return;
    for(const prop of plan.props) {
      const p=render.iso(t.x+prop.dx,t.y+prop.dy,render.flat?0:t.h);
      this.prop(render.ctx,prop.id,p.x,p.y,28);
    }
  },
  roomPlan(kind,seed) {
    const layout=kind==='market'?[[6,40,100],[6,344,100],[7,112,64],[7,272,64],[0,84,156],[0,300,156],[4,40,216],[4,344,216]]:
      kind==='estate'?[[2,40,64],[2,112,64],[2,272,64],[2,344,64],[0,84,148],[1,104,184],[4,344,216],[6,40,216]]:
      [[0,84,98],[0,300,98],[1,60,136],[1,110,136],[1,276,136],[1,326,136],[6,56,56],[7,328,56],[4,344,216]];
    return layout.map(([id,x,y],i)=>({id,x:x+(this.hash(seed,i)%3-1)*5,y:y+(this.hash(seed,i+20)%3-1)*4}));
  },
  room(kind,seed) {
    const cv=h('canvas',{width:384,height:240,class:'generated-room',role:'img','aria-label':`Generated ${kind} interior`});
    const draw=()=>{
      const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#5b402a';c.fillRect(0,0,384,240);
      if(PackArt.ready('floor')) {const pattern=c.createPattern(PackArt.images.floor,'repeat');c.fillStyle=pattern;c.fillRect(12,28,360,200);}
      c.fillStyle='#382d27';c.fillRect(0,0,384,28);c.fillRect(0,0,12,240);c.fillRect(372,0,12,240);
      this.prop(c,3,192,207,120);
      for(const prop of this.roomPlan(kind,seed))this.prop(c,prop.id,prop.x,prop.y+34,64);
      c.fillStyle='#c8a16a';c.fillRect(168,228,48,12); // clear central entrance and aisle
      c.fillStyle='#f2ead8';c.font='12px Georgia';c.textAlign='center';c.fillText(kind==='market'?'Trading hall':kind==='estate'?'House library & hall':'Tavern common room',192,18);
    };
    draw();for(const key of ['props','floor'])if(!PackArt.ready(key))PackArt.images[key].addEventListener('load',draw,{once:true});return cv;
  },
  seedHere() {const t=tileAt(G.pos.x,G.pos.y);return this.hash(G.world.seed||812,t.x*8191+t.y*131);},
};
