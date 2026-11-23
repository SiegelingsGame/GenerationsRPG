const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
  return undefined;
}

async function launch() {
  return chromium.launch({
    headless: true,
    ...(chromePath() ? { executablePath: chromePath() } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
}

async function throughPrepareCarefully(page) {
  await page.getByRole('button', { name: /^Prepare Carefully/ }).click();
  await page.getByRole('heading', { name: 'Sex & preferences', exact: true }).waitFor();
  for (const next of [
    'Next: Race →', 'Next: Class →', 'Next: Birth & background →',
    'Next: Name your House →', 'Next: Flag & sigil →', 'Next: choose your partner →',
  ]) {
    if (next === 'Next: Flag & sigil →') {
      await page.getByLabel('Your name', { exact: true }).fill('Arden');
      await page.getByLabel('House', { exact: true }).fill('Dawn');
    }
    await page.getByRole('button', { name: next, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Choose', exact: true }).first().click();
  await page.getByRole('heading', { name: 'House Dawn', exact: true }).waitFor();
}

test('Prepare Carefully finish-up offers Story Start vs Careful Start', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8771');
    await throughPrepareCarefully(page);
    await page.getByRole('button', { name: 'Finish up →', exact: true }).click();
    await page.getByRole('heading', { name: 'Choose your start', exact: true }).waitFor();
    assert.match(await page.locator('.start-path-choice').innerText(), /Begin Story Start/);
    assert.match(await page.locator('.start-path-choice').innerText(), /Careful Start/);
    await page.getByText('Careful Start (custom run)', { exact: true }).click();
    await page.getByRole('heading', { name: 'Shareable seed', exact: true }).waitFor();
    assert.equal(await page.locator('.careful-start').count(), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('Careful Start seed round-trips and rebuilds the same world layout', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8771');
    await throughPrepareCarefully(page);
    await page.getByRole('button', { name: 'Finish up →', exact: true }).click();
    await page.getByText('Careful Start (custom run)', { exact: true }).click();
    await page.getByRole('heading', { name: 'Shareable seed', exact: true }).waitFor();

    const seed = await page.evaluate(() => {
      const cfg = CarefulStart.clampConfig({
        ...CarefulStart.defaultsFromGame(),
        seed: 424242,
        startYear: 900,
        prosperity: 40,
        wards: 2,
        doomYears: 800,
        estateTier: 1,
        gold: 220,
        prestige: 12,
        potions: 5,
        era: 'war',
        worldSize: 44,
        houseName: 'Dawn',
      });
      const encoded = CarefulStart.encode(cfg);
      const decoded = CarefulStart.decode(encoded);
      return { encoded, decoded, cfg };
    });
    assert.equal(seed.decoded.seed, 424242);
    assert.equal(seed.decoded.startYear, 900);
    assert.equal(seed.decoded.prosperity, 40);
    assert.equal(seed.decoded.wards, 2);
    assert.equal(seed.decoded.doomYears, 800);
    assert.equal(seed.decoded.estateTier, 1);
    assert.equal(seed.decoded.era, 'war');
    assert.equal(seed.decoded.worldSize, 44);
    assert.equal(seed.decoded.houseName, 'Dawn');
    assert.match(seed.encoded, /^GR1\./);

    // Paste seed into UI and apply.
    await page.getByLabel('Paste shared careful start seed', { exact: true }).fill(seed.encoded);
    await page.getByRole('button', { name: 'Apply pasted seed', exact: true }).click();
    await page.getByText('Seed applied.', { exact: true }).waitFor({ timeout: 3000 }).catch(() => {});

    const snap = await page.evaluate((encoded) => {
      const cfg = CarefulStart.decode(encoded);
      CarefulStart.rebuildWorld(cfg);
      const estate = { ...G.world.estate };
      const towns = G.world.towns.map((t) => `${t.name}@${t.x},${t.y}`).sort();
      const sample = G.world.map.tiles.filter((_, i) => i % 97 === 0).map((t) => t.type + (t.feature || ''));
      return {
        year: year(),
        startYear: G.startYear,
        prosperity: G.world.prosperity,
        wards: G.world.doom.wards,
        doomYear: G.world.doom.year,
        tier: G.house.tier,
        gold: G.house.gold,
        era: G.world.era.type,
        size: G.world.map.W,
        house: G.house.name,
        founder: ch(G.mcId).name,
        estate,
        towns,
        sample,
        seedAgain: CarefulStart.encode(cfg),
      };
    }, seed.encoded);

    assert.equal(snap.startYear, 900);
    assert.equal(snap.year, 900);
    assert.equal(snap.prosperity, 40);
    assert.equal(snap.wards, 2);
    assert.equal(snap.doomYear, 1700);
    assert.equal(snap.tier, 1);
    assert.equal(snap.gold, 220);
    assert.equal(snap.era, 'war');
    assert.equal(snap.size, 44);
    assert.equal(snap.house, 'Dawn');
    assert.equal(snap.founder, 'Arden');

    const snap2 = await page.evaluate((encoded) => {
      const cfg = CarefulStart.decode(encoded);
      CarefulStart.rebuildWorld(cfg);
      return {
        estate: { ...G.world.estate },
        towns: G.world.towns.map((t) => `${t.name}@${t.x},${t.y}`).sort(),
        sample: G.world.map.tiles.filter((_, i) => i % 97 === 0).map((t) => t.type + (t.feature || '')),
      };
    }, seed.encoded);

    assert.deepEqual(snap2.estate, snap.estate);
    assert.deepEqual(snap2.towns, snap.towns);
    assert.deepEqual(snap2.sample, snap.sample);

    // Begin from UI after apply (accessible name includes the subtitle).
    await page.getByRole('button', { name: /^Begin Careful Start/ }).click();
    await page.getByText('Your first generation', { exact: true }).waitFor();
    const live = await page.evaluate(() => ({
      year: year(), prosperity: G.world.prosperity, size: G.world.map.W, careful: !!G.careful,
    }));
    assert.equal(live.year, 900);
    assert.equal(live.prosperity, 40);
    assert.equal(live.size, 44);
    assert.equal(live.careful, true);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
