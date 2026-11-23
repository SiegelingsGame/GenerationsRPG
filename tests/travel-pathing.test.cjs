const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
}

async function boot(page) {
  await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8767');
  await page.evaluate(() => {
    UI.closeAll();
    newGame();
    const c = makeChar({ house: G.house.name, status: 'party' });
    G.mcId = G.founderId = c.id;
    G.party = [c.id];
    G.house.heroes = [c.id];
    G.house.heirloom = makeHeirloom();
    Game.enterWorld(false);
    Guide.init();
    G.guide.done = {};
    LS.ensure();
    G.ppos = { x: G.world.estate.x, y: G.world.estate.y };
    G.pos = { ...G.ppos };
    UI.refresh();
  });
}

test('travel previews routes, explains blocks, cancels, and settles at the estate', async () => {
  const b = await chromium.launch({
    headless: true,
    ...(chromePath() ? { executablePath: chromePath() } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await boot(p);

    const route = await p.evaluate(() => {
      const town = G.world.towns.filter((t) => !t.fallen)
        .sort((a, b) => Math.hypot(a.x - G.ppos.x, a.y - G.ppos.y) - Math.hypot(b.x - G.ppos.x, b.y - G.ppos.y))[0];
      const path = LS.path(G.ppos, { x: town.x, y: town.y });
      const days = Living.estimateDays(path);
      Living.goPoint({ x: town.x, y: town.y });
      return {
        hasPath: !!(path && path.length),
        days: days > 0,
        moving: Living.moving,
        stopVisible: !!(Render.stopBtn && !Render.stopBtn.hidden),
        town: town.name,
      };
    });
    assert.equal(route.hasPath, true);
    assert.equal(route.days, true);
    assert.equal(route.moving, true);
    assert.equal(route.stopVisible, true);

    const cancelled = await p.evaluate(() => {
      const ok = Living.cancel('halted');
      return { ok, moving: Living.moving, stopHidden: !!(Render.stopBtn && Render.stopBtn.hidden) };
    });
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.moving, false);
    assert.equal(cancelled.stopHidden, true);

    const blocked = await p.evaluate(() => {
      // Far ocean / off-map water should not invent a path
      const msg = LS.blockReason(G.ppos, { x: 0.2, y: 0.2 });
      Living.goPoint({ x: 0.2, y: 0.2 });
      return { msg, moving: Living.moving };
    });
    assert.match(blocked.msg, /water|sea|shore|path|footing|island|bridge|peak/i);
    // May soft-recover to shore; either halted with toast or walking to shore is fine —
    // but must not claim a route into deep water without boats.
    if (blocked.moving) {
      const onWater = await p.evaluate(() => LS.hfAt(Living.dest.x, Living.dest.y) < -0.02 && !hasTech('boats'));
      assert.equal(onWater, false);
      await p.evaluate(() => Living.cancel());
    }

    const estate = await p.evaluate(() => {
      const e = G.world.estate;
      G.ppos = { x: e.x + 0.9, y: e.y + 0.2 };
      G.pos = { x: Math.round(G.ppos.x), y: Math.round(G.ppos.y) };
      // Standing beside the hall should still count as home
      const near = LocationPrompt.nearby();
      const here = UI.hereTile();
      Living.settleAt();
      return {
        nearFeature: near && near.feature,
        hereFeature: here.feature,
        settled: tileAt(G.pos.x, G.pos.y).feature,
        atEstate: Math.hypot(G.ppos.x - e.x, G.ppos.y - e.y) < 0.05,
      };
    });
    assert.equal(estate.nearFeature, 'estate');
    assert.equal(estate.hereFeature, 'estate');
    assert.equal(estate.settled, 'estate');
    assert.equal(estate.atEstate, true);

    const snap = await p.evaluate(() => {
      const e = G.world.estate;
      const s = Living.snapTarget({ x: e.x + 0.8, y: e.y + 0.4 });
      return { x: s.x, y: s.y, hasFeature: !!s.feature };
    });
    assert.equal(snap.x, await p.evaluate(() => G.world.estate.x));
    assert.equal(snap.y, await p.evaluate(() => G.world.estate.y));
    assert.equal(snap.hasFeature, true);

    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
