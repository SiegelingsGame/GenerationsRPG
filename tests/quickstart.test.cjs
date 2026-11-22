const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
test('QuickStart generates founder and partner, validates rename, and saves chosen House',async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:8768');
  await p.getByRole('button',{name:/^Random Lineage/}).waitFor();
  await p.getByRole('button',{name:/^Prepare Carefully/}).waitFor();
  await p.getByRole('button',{name:/^Random Lineage/}).click();
  await p.getByText('Random Lineage · Ready to play',{exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>!!spouseOf(ch(G.mcId))),true);
  await p.getByLabel('House name',{exact:true}).fill('   ');
  await p.getByRole('button',{name:'Start the game',exact:true}).click();
  await p.getByLabel('House name',{exact:true}).waitFor();
  await p.getByLabel('House name',{exact:true}).fill('Silveroak');
  await p.getByRole('button',{name:'Start the game',exact:true}).click();
  await p.getByText('Your first generation',{exact:true}).waitFor();
  const family=await p.evaluate(()=>({house:G.house.name,founder:ch(G.mcId).house,partner:spouseOf(ch(G.mcId)).house,saved:JSON.parse(localStorage.getItem(SAVE_KEY)).house.name}));
  assert.deepEqual(family,{house:'Silveroak',founder:'Silveroak',partner:'Silveroak',saved:'Silveroak'});
  await p.reload();
  await p.getByRole('button',{name:'Continue your House',exact:true}).click();
  assert.equal(await p.evaluate(()=>G.house.name),'Silveroak');
  // Exercise random races, classes and preferences without playing through seven sections.
  await p.evaluate(()=>{UI.closeAll();for(let i=0;i<12;i++){Game.randomLineage();if(!ch(G.mcId)||!spouseOf(ch(G.mcId)))throw Error('Missing family');UI.closeAll();}});
  assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
