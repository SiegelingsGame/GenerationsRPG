const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');const fs=require('fs');function chromePath(){if(fs.existsSync('/usr/bin/chromium'))return'/usr/bin/chromium';if(fs.existsSync('/usr/local/bin/google-chrome'))return'/usr/local/bin/google-chrome';}
test('bundled art loads; seeded rooms persist; combat effects follow damage/heal/status targets',async()=>{
 const b=await chromium.launch({headless:true,...(chromePath()?{executablePath:chromePath()}:{channel:'chrome'}),args:['--no-sandbox']});
 try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:8770');await p.getByRole('button',{name:/^Random Lineage/}).click();await p.getByRole('button',{name:'Continue',exact:true}).click();await p.locator('.origin-intro').waitFor();await p.getByRole('button',{name:/begin playing now/}).click();
 await p.waitForFunction(()=>Object.keys(PackArt.images).every(k=>PackArt.ready(k)));
 const state=await p.evaluate(()=>{WorldArt.ensure();const before=JSON.stringify(G.world.assetSites);saveGame();loadGame();WorldArt.ensure();return {same:before===JSON.stringify(G.world.assetSites),sites:Object.keys(G.world.assetSites).length,room:JSON.stringify(WorldArt.roomPlan('market',42))===JSON.stringify(WorldArt.roomPlan('market',42)),different:JSON.stringify(WorldArt.roomPlan('market',42))!==JSON.stringify(WorldArt.roomPlan('market',43)),geometry:Object.entries(PACK_EFFECTS).every(([k,v])=>PackArt.images[k].naturalWidth===v.w*v.frames&&PackArt.images[k].naturalHeight===v.h)};});
 assert.ok(state.same&&state.room&&state.different&&state.geometry);assert.ok(state.sites>10);
 await p.evaluate(()=>UI.showMarket());await p.locator('.generated-room').waitFor();await p.screenshot({path:'/tmp/generated-market.png'});await p.evaluate(()=>UI.closeAll());
 const battle=await p.evaluate(()=>{
  Battle.start({enemies:[{type:Object.keys(GD.ENEMIES)[0],lvl:1}],kind:'dungeon'});Battle.over=true;
  const u=Battle.units[0],t=Battle.units.find(x=>x.side==='enemy');t.hp=t.maxHp=10000;t.alive=true;u.focus=3;
  const prior=t.hp;Battle.useAbility(u,'firebolt',t);const fire=PackArt.effects.find(f=>f.projectile==='fire_proj');
  u.focus=3;Battle.useAbility(u,'frostNova',t);u.focus=3;Battle.useAbility(u,'smite',t);
  u.hp=Math.max(1,u.maxHp-10);Battle.healUnit(u,u,5);Battle.give(u,'shield',2,20);
  const keys=PackArt.effects.map(f=>f.key),projs=PackArt.effects.map(f=>f.projectile).filter(Boolean);
  // Render a visible projectile at the middle of its flight, then static reduced-motion frames.
  for(const f of PackArt.effects)f.t0=performance.now()-120;Render.frame();
  const old=PackArt.reduced;PackArt.reduced={matches:true};Render.frame();PackArt.reduced=old;
  for(let i=0;i<100;i++)PackArt.emit('hit',t);const bounded=PackArt.effects.length<=40;
  return {dealt:t.hp<prior,fire:!!fire,keys,projs,bounded};
 });
 assert.ok(battle.dealt&&battle.fire&&battle.bounded);for(const key of ['heal','shield','explosion'])assert.ok(battle.keys.includes(key));for(const key of ['fire_proj','ice_proj','holy_proj'])assert.ok(battle.projs.includes(key));
 await p.screenshot({path:'/tmp/asset-battle.png'});assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
