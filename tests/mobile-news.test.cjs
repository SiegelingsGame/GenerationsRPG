const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
  return undefined;
}

test('mobile Here sheet is clear; year ticks popup income and births', async () => {
  const b = await chromium.launch({
    headless: true,
    ...(chromePath() ? { executablePath: chromePath() } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8770/');
    await p.evaluate(() => {
      UI.closeAll();
      newGame();
      const c = makeChar({ house: G.house.name, status: 'party', birth: 'highborn' });
      const partner = makeChar({ house: G.house.name, status: 'household', gender: c.gender === 'man' ? 'woman' : 'man', birth: 'highborn' });
      marry(c, partner);
      G.mcId = G.founderId = c.id;
      G.party = [c.id];
      G.house.heroes = [c.id];
      G.house.heirloom = makeHeirloom();
      Game.enterWorld(false);
      const estate = G.world.map.tiles.find((t) => t.feature === 'estate');
      G.pos = { x: estate.x, y: estate.y };
      G.ppos = { ...G.pos };
      UI.refresh();
    });

    await p.locator('#hereBtn').waitFor();
    await p.locator('#menuBtn').waitFor();
    await p.locator('#hudchip').click();
    await p.locator('.here-sheet').waitFor();
    await p.getByRole('button', { name: /Rest a season/ }).waitFor();
    await p.getByRole('button', { name: /House menu/ }).waitFor();
    await p.screenshot({ path: '/opt/cursor/artifacts/mobile-here-sheet.png' });
    await p.evaluate(() => UI.closeAll());

    await p.locator('#menuBtn').click();
    await p.locator('#drawer-here').waitFor();
    await p.locator('#drawer-party').waitFor();
    await p.locator('#drawer-house').waitFor();
    assert.equal(await p.locator('.drawer-sec-title').count(), 3);
    await p.screenshot({ path: '/opt/cursor/artifacts/mobile-house-menu.png' });
    await p.evaluate(() => UI.closeDrawer());

    const news = await p.evaluate(() => {
      G.newsQueue = [];
      // Force a year boundary and a House birth so the digest has income + family news.
      const mc = ch(G.mcId);
      const spouse = spouseOf(mc);
      haveChild(mc, spouse);
      const before = G.day;
      G.day = (Math.floor(before / DAYS_PER_YEAR) + 1) * DAYS_PER_YEAR;
      yearTick();
      const queued = (G.newsQueue || []).map((e) => e.kind);
      Game.after();
      return {
        queued,
        modal: UI.modalStack.length,
        title: document.querySelector('.modal h2')?.textContent || '',
        rows: document.querySelectorAll('.news-row').length,
        hasIncome: [...document.querySelectorAll('.news-row')].some((r) => r.classList.contains('k-year')),
        hasBirth: [...document.querySelectorAll('.news-row')].some((r) => r.classList.contains('k-birth')),
      };
    });
    assert.ok(news.queued.includes('birth'), 'birth queued for popup');
    assert.ok(news.queued.includes('year'), 'income queued for popup');
    assert.equal(news.modal, 1);
    assert.ok(news.rows >= 2);
    assert.ok(news.hasIncome);
    assert.ok(news.hasBirth);
    await p.locator('.news-popup').waitFor();
    await p.screenshot({ path: '/opt/cursor/artifacts/mobile-news-popup.png' });
    await p.getByRole('button', { name: /Continue/ }).click();
    assert.equal(await p.evaluate(() => UI.modalStack.length), 0);
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
