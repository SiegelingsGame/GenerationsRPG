const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');

const ART=process.env.ARTIFACT_DIR||'/opt/cursor/artifacts';
fs.mkdirSync(ART,{recursive:true});

test('starter dens quest, dens FP delve, and FP inn interior',async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await b.newPage({viewport:{width:1100,height:720}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:8771');
  await p.evaluate(()=>{
    UI.closeAll();
    newGame();
    const c=makeChar({house:G.house.name,status:'party'});
    G.mcId=G.founderId=c.id;G.party=[c.id];G.house.heroes=[c.id];G.house.heirloom=makeHeirloom();
    Game.enterWorld(false);
  });
  const densInfo=await p.evaluate(()=>{
    Dens.ensure();
    const main=densList().find(d=>d.main);
    const q=G.world.densQuests;
    return {
      densCount:densList().length,
      hasMain:!!main,
      mainQuest:q?.main?.title||null,
      mainStatus:q?.main?.status||null,
      x:main?.x,y:main?.y,
      feature:main?tileAt(main.x,main.y).feature:null,
    };
  });
  assert.equal(densInfo.hasMain,true);
  assert.equal(densInfo.feature,'dens');
  assert.equal(densInfo.mainStatus,'active');
  assert.match(densInfo.mainQuest,/Seal/i);

  // Quest list surfaces dens main quest
  await p.evaluate(()=>UI.refresh());
  const questText=await p.locator('.quest-stack, .quest').allTextContents();
  assert.ok(questText.join(' ').includes('Seal')||questText.join(' ').includes('Dens'),questText.join(' | '));

  // Move camera/party to dens and open FP delve
  await p.evaluate(()=>{
    const den=densList().find(d=>d.main);
    G.pos={x:den.x,y:den.y};G.ppos={...G.pos};
    UI.refresh();
    DensView.start(den);
  });
  await p.locator('.densview').waitFor();
  assert.equal(await p.evaluate(()=>DensView.open),true);
  await p.screenshot({path:path.join(ART,'dens-fp-interior.png')});

  // Map marker screenshot: close dens, center on dens tile
  await p.evaluate(()=>{
    DensView.close();
    const den=densList().find(d=>d.main);
    G.pos={x:den.x,y:den.y};G.ppos={...G.pos};
    if(Render.cam){Render.cam.x=den.x;Render.cam.y=den.y;}
    UI.refresh();
  });
  await p.waitForTimeout(200);
  await p.screenshot({path:path.join(ART,'dens-on-map.png')});

  // Yearly dens spawn (simulate years with empty room under cap)
  const spawn=await p.evaluate(()=>{
    const before=densList().filter(d=>!d.cleared).length;
    // Force spawn path: empty slots + many yearly rolls
    for(let i=0;i<40;i++){
      G.world.era.type='war';
      Dens.yearly();
    }
    return {before,after:densList().length,max:Dens.maxActive()};
  });
  assert.ok(spawn.after>=spawn.before);

  // FP inn interior from town
  await p.evaluate(()=>{
    const t=G.world.towns[0];
    G.pos={x:t.x,y:t.y};G.ppos={...G.pos};
    UI.refresh();
    TownInterior.start('inn',0);
  });
  await p.locator('.interior-view').waitFor();
  assert.equal(await p.evaluate(()=>TownInterior.open&&TownInterior.kind==='inn'),true);
  await p.getByRole('button',{name:/Talk to Innkeep|Rest/}).first().waitFor();
  await p.screenshot({path:path.join(ART,'inn-fp-interior.png')});

  // Talk to innkeep from FP
  await p.evaluate(()=>TownInterior.selectHost());
  await p.getByRole('button',{name:/Rest here/}).waitFor();

  // Quest list screenshot
  await p.evaluate(()=>{TownInterior.close(true);UI.refresh();});
  await p.locator('.quest-stack, .dens-block, .quest').first().waitFor();
  await p.screenshot({path:path.join(ART,'dens-quest-list.png')});

  // Side quest unlock via rumor/trophy path
  const sides=await p.evaluate(()=>{
    Dens.unlockSide('hunt');
    Dens.unlockSide('rescue');
    Dens.unlockSide('trophies');
    UI.refresh();
    return Object.values(G.world.densQuests.side).map(s=>({id:s.id,status:s.status}));
  });
  assert.ok(sides.filter(s=>s.status==='active'||s.status==='done').length>=2);

  assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
