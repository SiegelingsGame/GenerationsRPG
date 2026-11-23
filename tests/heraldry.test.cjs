const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');const fs=require('fs');function chromePath(){if(fs.existsSync('/usr/bin/chromium'))return'/usr/bin/chromium';if(fs.existsSync('/usr/local/bin/google-chrome'))return'/usr/local/bin/google-chrome';}
test('heraldry categories, sliders, generation, House rename and save migration',async()=>{
 const b=await chromium.launch({headless:true,...(chromePath()?{executablePath:chromePath()}:{channel:'chrome'}),args:['--no-sandbox']});
 try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:8769');await p.getByRole('button',{name:/^Random Lineage/}).click();
 await p.getByRole('button',{name:/^Skip$/}).click();
 await p.getByLabel('House name',{exact:true}).fill('Brightoak');await p.getByRole('button',{name:'Edit flag & sigil',exact:true}).click();
 await p.getByLabel('Sigil category',{exact:true}).selectOption('Animals');assert.equal(await p.locator('.sigil-grid button').count(),12);
 await p.locator('.sigil-grid button').first().click();await p.getByLabel('Field Hue',{exact:true}).fill('210');await p.getByLabel('Flag pattern',{exact:true}).selectOption('2');
 const pixels=await p.locator('.heraldry-preview canvas').evaluate(cv=>Array.from(cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data).filter((v,i)=>i%4===3&&v>0).length);assert.ok(pixels>1000);
 await p.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await p.getByLabel('House name',{exact:true}).inputValue(),'Brightoak');
 await p.getByRole('button',{name:'Start the game',exact:true}).click();await p.getByText('Your first generation',{exact:true}).waitFor();
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem(SAVE_KEY)));assert.equal(saved.house.heraldry.primary[0],210);assert.equal(saved.house.heraldry.pattern,2);assert.equal(saved.house.heraldry.sigil,0);assert.deepEqual(saved.heraldry.Brightoak,saved.house.heraldry);
 await p.reload();await p.getByRole('button',{name:'Continue your House',exact:true}).click();assert.deepEqual(await p.evaluate(()=>G.house.heraldry),saved.house.heraldry);
 await p.evaluate(()=>{UI.closeAll();delete G.house.heraldry;delete G.heraldry;localStorage.setItem(SAVE_KEY,JSON.stringify(G));if(!loadGame())throw Error('Migration failed');Heraldry.ensureAll();});
 assert.equal(await p.evaluate(()=>Object.values(G.chars).filter(c=>c.house).every(c=>!!G.heraldry[c.house])),true);
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
});
