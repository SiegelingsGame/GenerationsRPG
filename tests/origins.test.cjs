const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
  return undefined;
}

test('ten origins apply gear/rarity; intro photo and guided start open', async () => {
  const b = await chromium.launch({
    headless: true,
    ...(chromePath() ? { executablePath: chromePath() } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1100, height: 720 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8770/');
    await p.getByRole('button', { name: /^Random Lineage/ }).click();
    // Opening matchmaker auto-picks for random; summary then continue to origin intro
    await p.getByRole('button', { name: 'Continue', exact: true }).click();
    await p.locator('.origin-intro').waitFor();
    await p.locator('.origin-photo').waitFor();
    const state = await p.evaluate(() => {
      const ids = Object.keys(GD.ORIGINS);
      const mc = ch(G.mcId);
      const origin = Origins.get(G.house.originId);
      const rarities = {};
      for (const it of Equip.worn(mc)) rarities[it.rarity || 'common'] = (rarities[it.rarity || 'common'] || 0) + 1;
      // Smoke every origin on a throwaway character
      const applied = [];
      for (const id of ids) {
        const c = makeChar({ cls: 'warrior', race: 'human', birth: 'lowborn', house: G.house.name, status: 'party' });
        Origins.apply(c, id);
        applied.push({
          id,
          gold: G.house.gold,
          gear: Equip.worn(c).map((it) => ({ kind: it.kind, rarity: it.rarity, skill: it.skill, passive: it.passive })),
          injuries: [...(c.injuries || [])],
        });
        // restore gold drift from apply for next loop roughly
      }
      const item = Equip.makeItem('blade', 3, { rarity: 'legendary', mods: ['keen', 'strong'], skill: 'cleave', passive: 'bloodthirst' });
      return {
        originCount: ids.length,
        originName: origin.name,
        goal: G.house.originGoal,
        founder: mc.name,
        rarities,
        item: { rarity: item.rarity, atk: item.atk, skill: item.skill, passive: item.passive, stats: item.stats },
        applied: applied.length,
        hasVeteranArm: applied.find((a) => a.id === 'veteran').injuries.includes('lostArm'),
      };
    });
    assert.equal(state.originCount, 10);
    assert.ok(state.originName);
    assert.ok(state.goal);
    assert.equal(state.applied, 10);
    assert.ok(state.hasVeteranArm);
    assert.equal(state.item.rarity, 'legendary');
    assert.equal(state.item.skill, 'cleave');
    assert.equal(state.item.passive, 'bloodthirst');
    assert.ok(state.item.atk >= 7); // Fine Blade base 7 + keen
    assert.equal(state.item.stats.str, 1);

    await p.screenshot({ path: '/opt/cursor/artifacts/origin-intro.png' });
    await p.getByRole('button', { name: /Start Guide/ }).click();
    await p.locator('.guide-guided').waitFor();
    await p.getByRole('heading', { name: /Take your first journey/ }).waitFor();
    await p.screenshot({ path: '/opt/cursor/artifacts/guided-start.png' });
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
