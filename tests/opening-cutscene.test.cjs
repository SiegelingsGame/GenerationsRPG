const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const ART = '/opt/cursor/artifacts';
const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770';

test('Random Lineage plays opening cutscene; Skip reaches playable world', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.getByRole('button', { name: /^Random Lineage/ }).waitFor();

    assert.equal(await page.evaluate(() => typeof Game.playOpeningCutscene), 'function');
    assert.equal(await page.evaluate(() => typeof OpeningCutscene.play), 'function');

    await page.getByRole('button', { name: /^Random Lineage/ }).click();
    await page.waitForFunction(() => OpeningCutscene.active === true);
    await page.getByRole('button', { name: /^Skip$/ }).waitFor();
    await page.locator('#oc-line').waitFor();
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-active.png') });

    const mid = await page.evaluate(() => ({
      active: OpeningCutscene.active,
      battle: Battle.active || Battle.cinematic,
      phase: OpeningCutscene.phase,
    }));
    assert.equal(mid.active, true);
    assert.ok(mid.phase === 'intro' || mid.phase === 'battle' || mid.phase === 'epilogue');

    await page.getByRole('button', { name: /^Skip$/ }).click();
    await page.waitForFunction(() => OpeningCutscene.active === false);
    await page.getByText('Random Lineage · Ready to play', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => !!document.getElementById('opening-cutscene')), false);
    assert.equal(await page.evaluate(() => Battle.active), false);

    await page.getByRole('button', { name: 'Start the game', exact: true }).click();
    await page.getByText('Your first generation', { exact: true }).waitFor();
    const world = await page.evaluate(() => ({
      mode: G.mode,
      mc: !!ch(G.mcId),
      partner: !!spouseOf(ch(G.mcId)),
      map: !!(G.world && G.world.map),
    }));
    assert.deepEqual(world, { mode: 'world', mc: true, partner: true, map: true });
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-after-skip-world.png') });

    // Esc skip path via API play + Esc
    await page.evaluate(() => { UI.closeAll(); Game.playOpeningCutscene(() => { window.__ocDone = true; }); });
    await page.waitForFunction(() => OpeningCutscene.active === true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__ocDone === true && OpeningCutscene.active === false);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
