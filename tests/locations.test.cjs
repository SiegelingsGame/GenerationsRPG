const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('nearby town prompt enters streets or opens working quick tasks on mobile',async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:8767');
  await p.evaluate(()=>{UI.closeAll();newGame();const c=makeChar({house:G.house.name,status:'party'});G.mcId=G.founderId=c.id;G.party=[c.id];G.house.heroes=[c.id];G.house.heirloom=makeHeirloom();Game.enterWorld(false);const t=G.world.towns[0];G.pos={x:t.x,y:t.y};G.ppos={...G.pos};UI.refresh();});
  const prompt=p.locator('#location-prompt');await prompt.waitFor({state:'visible'});
  await prompt.getByRole('button',{name:'Pass through',exact:true}).click();
  await p.getByRole('button',{name:/^Market/}).click();
  await p.getByRole('button',{name:/^Buy Potion/}).waitFor();
  assert.equal(await p.evaluate(()=>UI.modalStack.length),1);
  await p.evaluate(()=>UI.closeAll());
  await prompt.getByRole('button',{name:'Enter',exact:true}).click();
  await p.locator('.townview').waitFor();
  assert.equal(await p.evaluate(()=>TownView.open),true);
  await p.evaluate(()=>TownView.close());
  await p.evaluate(()=>{G.ppos.x+=0.9;LocationPrompt.render();});
  await prompt.waitFor({state:'visible'});
  const route=await p.evaluate(()=>{const t=LocationPrompt.tile;LocationPrompt.choose(t,'pass');return {moving:Living.moving,pending:!!LocationPrompt.pending,modal:UI.modalStack.length};});
  assert.equal(route.moving,true);assert.equal(route.pending,true);assert.equal(route.modal,0);
  await p.evaluate(()=>{const t=LocationPrompt.tile;Living.stop();G.pos={x:t.x,y:t.y};G.ppos={...G.pos};Game.arrive();});
  await p.getByRole('button',{name:/^Market/}).waitFor();
  assert.equal(await p.evaluate(()=>LocationPrompt.pending),null);
  await p.evaluate(()=>{UI.closeAll();Living.stop();LocationPrompt.pending=null;const empty=G.world.map.tiles.find(t=>!G.world.map.tiles.some(n=>n.feature&&Math.hypot(n.x-t.x,n.y-t.y)<1.5));G.ppos={x:empty.x,y:empty.y};G.pos={...G.ppos};LocationPrompt.render();});
  assert.equal(await prompt.isVisible(),false);
  assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
