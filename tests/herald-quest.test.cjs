const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8771';
function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
}

async function seedHerald(page) {
  return page.evaluate(() => {
    UI.closeAll();
    newGame();
    const c = makeChar({ house: G.house.name, status: 'party' });
    G.mcId = G.founderId = c.id;
    G.party = [c.id];
    G.house.heroes = [c.id];
    G.house.heirloom = makeHeirloom();
    Game.enterWorld(false);
    // Featureless land tile away from the estate — mirrors newQuest() herald placement.
    const est = G.world.estate;
    const spot = G.world.map.tiles.find((t) => isLand(t) && !t.feature
      && Math.abs(t.x - est.x) + Math.abs(t.y - est.y) >= 8);
    if (!spot) throw new Error('no herald spot');
    G.world.doom.quest = {
      type: 'herald',
      gen: G.house.generation,
      given: year(),
      progress: [],
      x: spot.x,
      y: spot.y,
      place: 'the wilds',
      title: GD.QUESTS.herald.name,
      desc: GD.QUESTS.herald.desc.replace('{place}', 'the wilds'),
    };
    // Stand one tile away so Nearby can show Confront before we teleport on-site.
    const near = G.world.map.tiles.find((t) => isLand(t) && !t.feature
      && Math.abs(t.x - spot.x) + Math.abs(t.y - spot.y) === 1);
    G.pos = { x: near.x, y: near.y };
    G.ppos = { x: near.x, y: near.y };
    Living.stop();
    LocationPrompt.pending = null;
    UI.refresh();
    LocationPrompt.render();
    return { x: spot.x, y: spot.y, nearX: near.x, nearY: near.y };
  });
}

test('herald quest marker offers Confront nearby and starts battle on the tile', async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(chromePath() ? { executablePath: chromePath() } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);

    const spot = await seedHerald(page);

    // Adjacent: LocationPrompt must surface the herald landmark with a Confront action.
    const prompt = page.locator('#location-prompt');
    await prompt.waitFor({ state: 'visible' });
    const nearby = await page.evaluate(() => {
      const t = LocationPrompt.nearby();
      const q = questAt(t.x, t.y);
      return {
        title: LocationPrompt.title.textContent,
        enter: LocationPrompt.enter.textContent,
        type: q && q.type,
        x: t.x,
        y: t.y,
      };
    });
    assert.equal(nearby.type, 'herald');
    assert.equal(nearby.x, spot.x);
    assert.equal(nearby.y, spot.y);
    assert.match(nearby.title, /Herald/i);
    assert.equal(nearby.enter, 'Confront');

    // Teleport onto the marked tile and arrive — battle must start.
    const fought = await page.evaluate(({ x, y }) => {
      Living.stop();
      LocationPrompt.pending = null;
      G.pos = { x, y };
      G.ppos = { x, y };
      UI.refresh();
      Game.arrive();
      return {
        active: !!Battle.active,
        title: Battle.title || '',
        enemies: (Battle.units || []).filter((u) => u.side === 'enemy').map((u) => u.type),
        hasHeraldPanel: !!document.querySelector('#panel')?.innerText?.includes('Confront the Herald'),
      };
    }, spot);

    assert.equal(fought.active, true, 'arriving on herald tile must start battle');
    assert.match(fought.title, /Herald/i);
    assert.ok(fought.enemies.includes('herald'), 'herald unit present');

    const outDir = path.join(__dirname, '..', 'artifacts');
    fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: path.join(outDir, 'herald-quest-trigger.png'), fullPage: true });

    // After ending battle, standing on the tile still offers Confront via the side panel / Here sheet.
    await page.evaluate(() => {
      Battle.active = false;
      Battle.over = true;
      UI.closeAll();
      UI.refresh();
      LocationPrompt.render();
    });
    const panel = await page.evaluate(() => {
      const text = document.querySelector('#panel')?.innerText || '';
      return {
        text,
        promptVisible: !document.getElementById('location-prompt')?.hidden,
        promptLabel: LocationPrompt.enter?.textContent || '',
      };
    });
    assert.match(panel.text, /Confront the Herald/);
    assert.equal(panel.promptVisible, true);
    assert.equal(panel.promptLabel, 'Confront');

    // Clicking Confront from the Here prompt starts the fight again.
    await prompt.getByRole('button', { name: 'Confront', exact: true }).click();
    const again = await page.evaluate(() => ({ active: !!Battle.active, title: Battle.title || '' }));
    assert.equal(again.active, true);
    assert.match(again.title, /Herald/i);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
