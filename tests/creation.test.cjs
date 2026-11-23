const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');
function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
  return undefined;
}
test('mobile creation preserves choices and starts only after House summary', async () => {
 const browser = await chromium.launch({headless:true,...(chromePath()?{executablePath:chromePath()}:{channel:'chrome'}),args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8766');
  await page.getByRole('button',{name:/^Prepare Carefully/}).click();
  await page.getByRole('heading',{name:'Sex & preferences',exact:true}).waitFor();
  await page.selectOption('#c-orient','bi');
  await page.getByRole('button',{name:'Next: Race →',exact:true}).click();
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  assert.equal(await page.inputValue('#c-orient'),'bi');
  await page.getByRole('button',{name:'Next: Race →',exact:true}).click();
  await page.getByRole('button',{name:'Next: Class →',exact:true}).click();
  await page.getByRole('button',{name:'Next: Birth & background →',exact:true}).click();
  await page.getByRole('button',{name:'Next: Name your House →',exact:true}).click();
  await page.getByLabel('Your name',{exact:true}).fill('Arden');
  await page.getByLabel('House',{exact:true}).fill('Dawn');
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  await page.getByRole('button',{name:'Next: Name your House →',exact:true}).click();
  assert.equal(await page.getByLabel('Your name',{exact:true}).inputValue(),'Arden');
  await page.getByRole('button',{name:'Next: Flag & sigil →',exact:true}).click();
  await page.getByLabel('Sigil category',{exact:true}).selectOption('Animals');
  await page.getByRole('button',{name:'Next: choose your partner →',exact:true}).click();
  await page.getByRole('button',{name:'Choose',exact:true}).first().click();
  await page.getByRole('heading',{name:'House Dawn',exact:true}).waitFor();
  assert.match(await page.locator('.house-summary').innerText(),/Arden/);
  assert.equal(await page.locator('#guide-goal').count(),0);
  await page.getByRole('button',{name:'Start the game',exact:true}).click();
  await page.getByText('Your first generation',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
});
