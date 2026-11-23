const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
  return undefined;
}

test('court overflow, orphanage growth, ward camp and squire combat', async () => {
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
    const state = await p.evaluate(() => {
      UI.closeAll();
      newGame();
      const mc = makeChar({ house: G.house.name, status: 'party', birth: 'highborn', cls: 'knight' });
      G.mcId = G.founderId = mc.id;
      G.party = [mc.id];
      G.house.heroes = [mc.id];
      G.house.heirloom = makeHeirloom();
      Game.enterWorld(false);
      Court.ensure();

      // Fill party then overflow into court
      const recruits = [];
      for (let i = 0; i < 5; i++) {
        const c = makeChar({ cls: 'warrior', race: 'human', birth: 'lowborn', status: 'npc' });
        G.house.gold += hireCost(c);
        Game.recruit(c);
        recruits.push(c.id);
      }
      const courtAfterRecruit = Court.list().map((c) => c.id);
      const partySize = G.party.length;

      // Orphanage childhood
      const kid = makeChar({
        race: 'human', birth: 'lowborn', orphaned: true, foundling: true,
        born: G.day - 4 * DAYS_PER_YEAR, status: 'npc',
      });
      Court.toOrphanage(kid);
      const years = kid.orphanYears || 0;
      for (let i = 0; i < 3; i++) Court.yearly();
      const grew = (kid.orphanYears || 0) > years || !!kid.trait || Object.values(kid.bonus).some((v) => v > 0);

      // Ward + squire
      const ward = makeChar({
        race: 'human', birth: 'lowborn', orphaned: true,
        born: G.day - 6 * DAYS_PER_YEAR, status: 'npc',
      });
      Court.toOrphanage(ward);
      Game.takeAsWard(ward, mc);
      const squire = makeChar({ cls: 'warrior', race: 'human', birth: 'lowborn', status: 'npc', level: 2 });
      Game.takeAsSquire(squire, mc);

      // Battle includes squire as AI unit
      Battle.start({
        enemies: [{ type: 'bandit', lvl: 1 }],
        kind: 'wild', title: 'Squire drill', intro: 'A drill.',
        onEnd: () => {},
      });
      const squireUnit = Battle.units.find((u) => u.squire && u.charId === squire.id);
      const masterUnit = Battle.units.find((u) => u.charId === mc.id);
      // Force a squire AI turn
      if (squireUnit) {
        Battle.cur = squireUnit;
        Battle.waiting = false;
        Battle.ai(squireUnit);
      }
      Battle.active = false;
      Battle.over = true;

      return {
        partySize,
        courtCount: courtAfterRecruit.length,
        courtHasOverflow: courtAfterRecruit.length >= 1,
        orphanInCare: kid.status === 'orphanage' || isAdult(kid),
        grew,
        wardRole: ward.role,
        squireRole: squire.role,
        squireMaster: squire.masterId === mc.id,
        squireInBattle: !!squireUnit,
        squireAiOnly: !!(squireUnit && squireUnit.aiOnly),
        masterLinked: !!(squireUnit && masterUnit && squireUnit.masterUid === masterUnit.uid),
        caps: { court: Court.courtCap(), orphan: Court.orphanCap(), party: PARTY_CAP },
      };
    });

    assert.equal(state.partySize, 4);
    assert.ok(state.courtHasOverflow, 'overflow recruit lands in court');
    assert.ok(state.grew, 'orphanage childhood develops the child');
    assert.equal(state.wardRole, 'ward');
    assert.equal(state.squireRole, 'squire');
    assert.equal(state.squireMaster, true);
    assert.equal(state.squireInBattle, true);
    assert.equal(state.squireAiOnly, true);
    assert.equal(state.masterLinked, true);
    assert.equal(state.caps.party, 4);
    assert.ok(state.caps.court >= 2);
    assert.deepEqual(errors, []);

    // UI screens open
    await p.evaluate(() => { UI.closeAll(); UI.showCourt(); });
    await p.getByRole('heading', { name: 'Retainer Court' }).waitFor();
    await p.screenshot({ path: '/opt/cursor/artifacts/court-screen.png' });
    await p.evaluate(() => { UI.closeAll(); UI.showOrphanage(); });
    await p.getByRole('heading', { name: 'House Orphanage' }).waitFor();
    await p.screenshot({ path: '/opt/cursor/artifacts/orphanage-screen.png' });
  } finally {
    await b.close();
  }
});
