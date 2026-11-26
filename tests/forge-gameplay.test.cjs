const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');
test('PixelForge attacks, enhancements, traits and protection follow battle actions without duplicate legacy effects',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:8771');
  await p.waitForFunction(()=>Object.keys(FORGE_CLIPS).every(k=>ForgeFX.ready(k)));
  const result=await p.evaluate(()=>{
   UI.closeAll();newGame();const c=makeChar({name:'Tester',house:G.house.name,status:'party',cls:'sorcerer',trait:'brave'});
   G.mcId=G.founderId=c.id;G.party=[c.id];G.house.heroes=[c.id];G.house.heirloom=makeHeirloom();Game.enterWorld(false);
   Battle.start({enemies:[{type:'troll',lvl:1}],hold:true});
   const trait=ForgeFX.live.some(f=>f.key==='trait');ForgeFX.reset();
   const u=Battle.units[0],t=Battle.units[1];t.hp=t.maxHp=100000;
   u.focus=3;Battle.useAbility(u,'firebolt',t);const fire=ForgeFX.live.some(f=>f.key==='flame-pillar'&&f.uid===t.uid);
   const noDuplicate=PackArt.effects.length===0&&FxLayer.attacks.length===0;
   Battle.give(u,'atkUp',3,.25);Battle.give(u,'shield',2,20);
   const enhance=ForgeFX.live.some(f=>f.key==='enhance'&&f.uid===u.uid),shield=ForgeFX.live.some(f=>f.key==='shield-bubble');
   const hp=u.hp;Battle.damage(t,u,5,false);const soaked=u.hp===hp&&u.st.shield.v===15,protection=ForgeFX.live.some(f=>f.key==='protection');
   const damaged=t.hp<t.maxHp;
   for(const f of ForgeFX.live)f.t0=performance.now()-200;Render.frame();
   const old=ForgeFX.reduced;ForgeFX.reduced={matches:true};ForgeFX.reset();const reducedHandled=ForgeFX.emit('heal',u)&&ForgeFX.live.length===0;ForgeFX.reduced=old;
   const clip=ForgeFX.clips['sword-slash'];delete ForgeFX.clips['sword-slash'];u.cls='warrior';u.vfxSkill=null;PackArt.damage(u,t,false);const fallback=PackArt.effects.length>0;ForgeFX.clips['sword-slash']=clip;
   ForgeFX.reset();for(let i=0;i<50;i++)ForgeFX.emit('hit-spark',{uid:'test'+i});const capped=ForgeFX.live.length<=24;
   Battle.start({enemies:[{type:'wolf',lvl:1}],hold:true});const reset=ForgeFX.live.every(f=>Battle.find(f.uid));
   Battle.over=true;return {trait,fire,noDuplicate,enhance,shield,soaked,protection,damaged,reducedHandled,fallback,capped,reset};
  });
  for(const [k,v]of Object.entries(result))assert.equal(v,true,k);
  await p.screenshot({path:'/tmp/forge-battle.png'});assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
