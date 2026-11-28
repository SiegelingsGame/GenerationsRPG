const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8771';
const chrome = fs.existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium'
  : (fs.existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);

async function boot(page) {
  await page.goto(URL);
  await page.getByRole('button', { name: /^Random Lineage/ }).click();
  await page.getByRole('button', { name: /^Skip$/ }).click();
  await page.getByRole('button', { name: 'Start the game', exact: true }).click();
  await page.getByRole('button', { name: /^Guide me/ }).click();
}

test('spouse dies → seek/court/propose remarriage; blocked while spouse alive', async () => {
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

    // --- (a) living spouse blocks court / propose / seek ---
    const blocked = await p.evaluate(() => {
      const mc = ch(G.mcId);
      const sp = spouseOf(mc);
      if (!sp) {
        // Ensure a living spouse for the block checks.
        const mate = makeChar({
          gender: mc.gender === 'man' ? 'woman' : 'man',
          orientation: 'straight',
          race: mc.race,
          birth: 'lowborn',
          house: G.house.name,
          status: 'household',
          level: 2,
        });
        marry(mc, mate);
      }
      const living = spouseOf(mc);
      const prospect = makeChar({
        gender: living.gender === 'man' ? 'woman' : 'man',
        orientation: 'straight',
        race: 'human',
        birth: 'lowborn',
        status: 'npc',
        town: 0,
        level: 2,
      });
      // Force mutual attraction for a clean gate test.
      prospect.orientation = mc.gender === prospect.gender ? 'gay' : 'straight';
      if (mc.orientation === 'straight') prospect.gender = mc.gender === 'man' ? 'woman' : 'man';
      prospect.orientKnown = true;
      addBond(prospect, mc, 80);

      const beforeSpouse = mc.spouse;
      const toastCourt = (() => { let t = null; const old = UI.toast; UI.toast = (m) => { t = m; }; Game.court(prospect); UI.toast = old; return t; })();
      const toastPropose = (() => { let t = null; const old = UI.toast; UI.toast = (m) => { t = m; }; Game.propose(prospect); UI.toast = old; return t; })();
      const seekLabels = (() => {
        const atEstate = true;
        // Simulate estate char actions for MC
        G.pos = G.pos || { x: 0, y: 0 };
        const estate = G.world.map.tiles.find((t) => t.feature === 'estate');
        if (estate) { G.pos.x = estate.x; G.pos.y = estate.y; }
        return UI.charActions(mc).filter((n) => n && n.tagName === 'BUTTON').map((n) => n.childNodes[0]?.textContent || n.textContent);
      })();

      return {
        hasLivingSpouse: !!spouseOf(mc),
        canTake: canTakeSpouse(mc),
        widowed: isWidowed(mc),
        toastCourt,
        toastPropose,
        spouseUnchanged: mc.spouse === beforeSpouse,
        seekOnSelf: seekLabels.some((l) => /Seek a new spouse|Arranged Match/i.test(l)),
        prospectId: prospect.id,
        livingId: living.id,
      };
    });

    assert.equal(blocked.hasLivingSpouse, true);
    assert.equal(blocked.canTake, false);
    assert.equal(blocked.widowed, false);
    assert.equal(blocked.spouseUnchanged, true, 'propose must not remarry while spouse lives');
    assert.match(String(blocked.toastCourt), /living spouse/i);
    assert.match(String(blocked.toastPropose), /living spouse|Remarriage/i);
    assert.equal(blocked.seekOnSelf, false, 'Seek/Arranged must not show while spouse lives (unless location gates differ)');

    // --- (b) spouse dies → widow state, seek UI, court + propose succeed ---
    const remarried = await p.evaluate((ids) => {
      const mc = ch(G.mcId);
      const late = ch(ids.livingId);
      const priorKids = mc.children.slice();
      kill(late, 'illness');
      assertLike = (cond, msg) => { if (!cond) throw new Error(msg); };
      assertLike(isWidowed(mc), 'should be widowed');
      assertLike(canTakeSpouse(mc), 'widowed MC may take a spouse');
      assertLike(!spouseOf(mc), 'spouseOf null when late spouse dead');

      const estate = G.world.map.tiles.find((t) => t.feature === 'estate');
      if (estate) { G.pos.x = estate.x; G.pos.y = estate.y; }
      const labels = UI.charActions(mc).filter((n) => n && n.tagName === 'BUTTON').map((n) => n.childNodes[0]?.textContent || n.textContent);

      let prospect = ch(ids.prospectId);
      // Ensure still free and attracted
      prospect.alive = true;
      prospect.status = 'npc';
      prospect.spouse = null;
      if (mc.orientation === 'straight' || !mc.orientation) {
        prospect.gender = mc.gender === 'man' ? 'woman' : 'man';
        prospect.orientation = 'straight';
      } else if (mc.orientation === 'gay') {
        prospect.gender = mc.gender;
        prospect.orientation = 'gay';
      } else {
        prospect.orientation = 'bi';
      }
      prospect.orientKnown = true;
      addBond(prospect, mc, 80);
      G.house.gold = Math.max(G.house.gold, 100);

      const ledgerBefore = (G.ledger || []).length;
      Game.court(prospect);
      const bondAfterCourt = bond(prospect, mc);
      // Boost to proposal threshold if one court wasn't enough
      if (bondAfterCourt < 70) addBond(prospect, mc, 70 - bondAfterCourt);
      Game.propose(prospect);

      const remarriageNote = (G.ledger || []).slice(ledgerBefore).find((e) => /remarried|remarriage/i.test(e.text + (e.type || '')));
      const sheet = UI.charBody(mc);
      const sheetText = sheet.innerText || sheet.textContent;

      return {
        widowedBeforePropose: true,
        labels,
        newSpouseId: mc.spouse,
        prospectId: prospect.id,
        priorKidsKept: priorKids.every((id) => mc.children.includes(id)),
        remarriageNote: remarriageNote ? remarriageNote.text : null,
        sheetHasSpouse: /Spouse:/i.test(sheetText),
        canTakeAfter: canTakeSpouse(mc),
        livingSpouse: !!spouseOf(mc),
        prospects: remarriageProspects(mc).length,
      };
    }, { livingId: blocked.livingId, prospectId: blocked.prospectId });

    assert.ok(remarried.labels.some((l) => /Seek a new spouse/i.test(l)), 'widowed MC sees Seek a new spouse');
    assert.equal(remarried.newSpouseId, remarried.prospectId);
    assert.equal(remarried.priorKidsKept, true);
    assert.ok(remarried.remarriageNote, 'chronicle notes remarriage');
    assert.equal(remarried.livingSpouse, true);
    assert.equal(remarried.canTakeAfter, false, 'monogamy restored after remarriage');
    assert.equal(remarried.prospects, 0, 'no prospects while remarried');

    // Seek panel / estate action after widowhood (re-widow for UI screenshot)
    await p.evaluate(() => {
      const mc = ch(G.mcId);
      const sp = spouseOf(mc);
      if (sp) kill(sp, 'battle');
      G.house.gold = Math.max(G.house.gold, 200);
      // Seed a few free NPCs for suggestions
      for (let i = 0; i < 3; i++) {
        const c = makeChar({
          gender: mc.gender === 'man' ? 'woman' : 'man',
          orientation: 'straight',
          race: 'human',
          birth: 'lowborn',
          status: 'npc',
          town: 0,
          level: 2 + i,
        });
        c.orientKnown = true;
        addBond(c, mc, 20 + i * 10);
      }
      Game.seekNewSpouse();
    });
    await p.getByRole('heading', { name: /Seek a New Spouse/i }).waitFor({ timeout: 5000 });
    await p.screenshot({ path: '/tmp/remarriage-seek-spouse.png' });

    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
