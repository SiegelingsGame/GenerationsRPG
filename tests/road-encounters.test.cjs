const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8782';
const chrome = fs.existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium'
  : (fs.existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);

async function boot(page) {
  await page.goto(URL);
  await page.evaluate(() => {
    UI.closeAll();
    newGame();
    const c = makeChar({ house: G.house.name, status: 'party' });
    G.mcId = G.founderId = c.id;
    G.party = [c.id];
    G.house.heroes = [c.id];
    G.house.heirloom = makeHeirloom();
    Game.enterWorld(false);
    UI.refresh();
  });
}

test('road weights: trader is rare; new kinds present; FP encounter opens RoadView', async () => {
  const b = await chromium.launch({
    headless: true,
    ...(chrome ? { executablePath: chrome } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await boot(p);

    const weights = await p.evaluate(() => {
      // Peaceful grassland: the old table made traders dominate here.
      G.world.era.type = 'peace';
      const tile = G.world.map.tiles.find((t) => t.type === 'grass' && !t.feature) || tileAt(G.pos.x, G.pos.y);
      const w = Events.weights(tile);
      const total = Object.values(w).reduce((s, v) => s + v, 0);
      const share = (k) => w[k] / total;
      const kinds = Object.keys(w).filter((k) => w[k] > 0);
      // Monte Carlo: trader should be a small fraction of rolls.
      let traderHits = 0;
      const N = 400;
      for (let i = 0; i < N; i++) if (Events.roll(tile).kind === 'trader') traderHits++;
      return {
        trader: w.trader,
        needy: w.needy,
        ambush: w.ambush,
        traderShare: share('trader'),
        needyShare: share('needy'),
        ambushShare: share('ambush'),
        kinds,
        traderHits,
        N,
        hasStranded: !!w.stranded,
        hasShrine: !!w.shrine,
        hasWedding: !!w.wedding,
        hasOmen: !!w.omen,
        hasScout: !!w.scout,
        hasDens: !!w.dens_spill,
        hasRuin: !!w.ruin,
        fpHas: [...Events.FP_KINDS],
      };
    });

    assert.ok(weights.trader < weights.needy, `trader (${weights.trader}) should be below needy (${weights.needy})`);
    assert.ok(weights.traderShare < 0.12, `trader share too high: ${weights.traderShare}`);
    assert.ok(weights.traderHits / weights.N < 0.15, `trader rolled too often: ${weights.traderHits}/${weights.N}`);
    assert.ok(weights.ambushShare > weights.traderShare, 'ambush should outweigh trader in peace');
    for (const k of ['stranded', 'shrine', 'wedding', 'omen', 'scout', 'dens_spill', 'ruin']) {
      assert.ok(weights.kinds.includes(k), `missing kind ${k}`);
    }
    assert.ok(weights.hasStranded && weights.hasShrine && weights.hasWedding && weights.hasOmen);
    assert.ok(weights.fpHas.includes('stranded') && weights.fpHas.includes('shrine'));

    // Force a first-person roadside encounter and assert the container opens.
    const fp = await p.evaluate(() => {
      UI.closeAll();
      if (RoadView.open) RoadView.close(true);
      const tile = tileAt(G.pos.x, G.pos.y);
      Events.ev_stranded({ kind: 'stranded', tile });
      return {
        open: RoadView.open,
        hasEl: !!document.querySelector('.roadview'),
        kind: document.querySelector('.roadview')?.getAttribute('data-kind'),
      };
    });
    assert.equal(fp.open, true);
    assert.equal(fp.hasEl, true);
    assert.equal(fp.kind, 'stranded');
    await p.locator('.roadview').waitFor();
    await p.getByRole('button', { name: /Ride on/ }).click();
    await p.waitForFunction(() => !RoadView.open);

    // Shrine also opens FP.
    const shrine = await p.evaluate(() => {
      const tile = tileAt(G.pos.x, G.pos.y);
      Events.ev_shrine({ kind: 'shrine', tile });
      return { open: RoadView.open, kind: document.querySelector('.roadview')?.getAttribute('data-kind') };
    });
    assert.equal(shrine.open, true);
    assert.equal(shrine.kind, 'shrine');
    await p.getByRole('button', { name: /Pass without stopping/ }).click();
    await p.waitForFunction(() => !RoadView.open);

    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
