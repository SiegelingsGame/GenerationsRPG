const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const ART = '/opt/cursor/artifacts';
const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770';

test('Hollow King enemy is a giant-scale unit', async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    await page.goto(URL);
    await page.getByRole('button', { name: /^Random Lineage/ }).waitFor();
    const info = await page.evaluate(() => {
      const def = GD.ENEMIES.hollow;
      const u = makeEnemyUnit('hollow', 20, 0);
      return {
        defScale: def.scale,
        defGiant: !!def.giant,
        unitScale: u.scale,
        unitGiant: !!u.giant,
        figScale: typeof Render !== 'undefined' && Render.unitFigScale ? Render.unitFigScale(u) : null,
        barLift: typeof Render !== 'undefined' && Render.unitBarLift ? Render.unitBarLift(u) : null,
        normalFig: typeof Render !== 'undefined' && Render.unitFigScale ? Render.unitFigScale({ shape: 'wraith', scale: 1 }) : null,
      };
    });
    assert.equal(info.defScale, 2.5);
    assert.equal(info.defGiant, true);
    assert.equal(info.unitScale, 2.5);
    assert.equal(info.unitGiant, true);
    assert.ok(info.figScale > info.normalFig * 2);
    assert.ok(info.barLift > 150);
  } finally {
    await browser.close();
  }
});

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

    // Wait for battle phase so the giant Hollow King is on screen vs normal heroes.
    await page.waitForFunction(() => OpeningCutscene.phase === 'battle' && Battle.units.some((u) => u.type === 'hollow'), null, { timeout: 8000 });
    const giant = await page.evaluate(() => {
      const king = Battle.units.find((u) => u.type === 'hollow');
      const hero = Battle.units.find((u) => u.side === 'party');
      return {
        kingScale: king && king.scale,
        kingGiant: !!(king && king.giant),
        kingFig: king && Render.unitFigScale(king),
        heroFig: hero && Render.unitFigScale(hero),
        heroScale: hero && (hero.scale || 1),
      };
    });
    assert.equal(giant.kingScale, 2.5);
    assert.equal(giant.kingGiant, true);
    assert.equal(giant.heroScale, 1);
    assert.ok(giant.kingFig > giant.heroFig * 2);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(ART, 'hollow-king-giant-vs-party.png') });

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
