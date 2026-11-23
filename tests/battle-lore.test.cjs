const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770';
const chrome = require('fs').existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium'
  : (require('fs').existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);

async function boot(page) {
  await page.goto(URL);
  await page.getByRole('button', { name: /^Random Lineage/ }).click();
  await page.getByRole('button', { name: /^Skip$/ }).click();
  await page.getByRole('button', { name: 'Start the game', exact: true }).click();
  await page.getByRole('button', { name: 'Continue playing', exact: true }).click();
}

test('battle party popup hides social actions; enemy lore grows and scales damage/resist', async () => {
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

    // --- (a) battle mode gates non-combat character actions ---
    const battleUi = await p.evaluate(() => {
      const mc = ch(G.mcId);
      // Out of battle: social/equipment actions present for a companion or self equipment.
      const outLabels = UI.charActions(mc).filter((n) => n && n.tagName === 'BUTTON').map((n) => n.childNodes[0]?.textContent || n.textContent);
      Battle.start({ enemies: [{ type: 'bandit', lvl: 2 }], kind: 'wild', title: 'Ambush' });
      Battle.waiting = true;
      Battle.cur = Battle.units.find((u) => u.charId === mc.id);
      const inLabels = UI.charActions(mc).filter((n) => n && n.tagName === 'BUTTON').map((n) => n.childNodes[0]?.textContent || n.textContent);
      const body = UI.charBody(mc);
      const text = body.innerText || body.textContent;
      UI.showChar(mc);
      return {
        outLabels,
        inLabels,
        hasEquipmentOut: outLabels.some((l) => /Equipment|Inventory|Try On/i.test(l)),
        hasSocialIn: inLabels.some((l) => /Spend time|Court|Gift|Marriage|Recruit|Legitimise|Arranged/i.test(l)),
        hasEquipIn: inLabels.some((l) => /Equipment|Inventory|Try On/i.test(l)),
        showsCombat: /In battle|ATK|Enemy knowledge/i.test(text),
        openEquipHidden: !/Open equipment/i.test(text),
      };
    });
    assert.ok(battleUi.hasEquipmentOut, 'out of battle should offer equipment actions');
    assert.equal(battleUi.hasSocialIn, false, 'battle popup must not offer social actions');
    assert.equal(battleUi.hasEquipIn, false, 'battle popup must not offer equipment/try-on');
    assert.ok(battleUi.showsCombat, 'battle popup should show combat stats / enemy knowledge');
    assert.ok(battleUi.openEquipHidden, 'Open equipment hidden mid-battle');

    await p.screenshot({ path: '/tmp/battle-party-popup-restricted.png' });
    await p.evaluate(() => { UI.closeAll(); Battle.active = false; Battle.over = true; });

    // --- (b) familiarity increases and affects damage/defense math ---
    const lore = await p.evaluate(() => {
      G.house.lore = {};
      assertOk = (cond, msg) => { if (!cond) throw new Error(msg); };

      // Caps and formula
      assertOk(EnemyLore.CAP === 20, 'cap');
      assertOk(EnemyLore.dmgBonus('bandit') === 0, 'start at 0');
      EnemyLore.add('bandit', 10);
      assertOk(EnemyLore.get('bandit') === 10, 'add');
      assertOk(Math.abs(EnemyLore.dmgBonus('bandit') - 0.05) < 1e-9, 'dmg 0.5%/pt');
      assertOk(Math.abs(EnemyLore.resist('bandit') - 0.04) < 1e-9, 'resist 0.4%/pt');
      EnemyLore.add('bandit', 100);
      assertOk(EnemyLore.get('bandit') === 20, 'cap enforced');
      assertOk(EnemyLore.summary('bandit').includes('Known: Bandit IV'), 'band IV summary');
      assertOk(EnemyLore.summary('bandit').includes('+10% dmg'), 'max dmg text');
      assertOk(EnemyLore.summary('bandit').includes('+8% resist'), 'max resist text');

      // Hit/kill grants via Battle.damage
      G.house.lore = {};
      Battle.start({ enemies: [{ type: 'wolf', lvl: 1 }, { type: 'wolf', lvl: 1 }], kind: 'dungeon' });
      const party = Battle.units.find((u) => u.side === 'party');
      const foes = Battle.units.filter((u) => u.side === 'enemy');
      foes.forEach((f) => { f.hp = f.maxHp = 500; f.alive = true; });
      Battle.damage(party, foes[0], 5, false);
      Battle.damage(party, foes[0], 5, false); // second hit on same unit: no extra lore
      assertOk(EnemyLore.get('wolf') === EnemyLore.HIT, 'first hit only');
      foes[0].hp = 1;
      Battle.damage(party, foes[0], 10, false);
      assertOk(EnemyLore.get('wolf') === EnemyLore.HIT + EnemyLore.KILL, 'kill grants');

      // loreMult scales outgoing and incoming
      G.house.lore = { bandit: 20 };
      const atk = { side: 'party', atk: 20, mag: 20, agi: 5, cls: 'warrior', st: {}, brave: false, hp: 50, maxHp: 50 };
      const foe = { side: 'enemy', type: 'bandit', def: 0, st: {}, defending: false, cls: null };
      const fromEnemy = { side: 'enemy', type: 'bandit', atk: 20, mag: 20, agi: 5, cls: null, st: {}, brave: false, hp: 50, maxHp: 50 };
      const ally = { side: 'party', def: 0, st: {}, defending: false, cls: 'warrior' };
      const outM = Battle.loreMult(atk, foe);
      const inM = Battle.loreMult(fromEnemy, ally);
      assertOk(Math.abs(outM - 1.1) < 1e-9, 'outgoing +10%');
      assertOk(Math.abs(inM - 0.92) < 1e-9, 'incoming -8%');

      // Deterministic physical with fixed RNG
      const oldFloat = R.float;
      const oldChance = R.chance;
      R.float = () => 1;
      R.chance = () => false;
      G.house.lore = {};
      const base = Battle.physical(
        { side: 'party', atk: 30, agi: 0, cls: 'warrior', st: {}, brave: false, hp: 100, maxHp: 100 },
        { side: 'enemy', type: 'bandit', def: 0, st: {}, defending: false, cls: null },
        1,
      );
      G.house.lore = { bandit: 20 };
      const buffed = Battle.physical(
        { side: 'party', atk: 30, agi: 0, cls: 'warrior', st: {}, brave: false, hp: 100, maxHp: 100 },
        { side: 'enemy', type: 'bandit', def: 0, st: {}, defending: false, cls: null },
        1,
      );
      R.float = oldFloat;
      R.chance = oldChance;
      assertOk(buffed.dmg > base.dmg, 'lore increases damage dealt');

      // Persist through save
      G.house.lore = { bandit: 12 };
      saveGame();
      const kept = G.house.lore.bandit;
      loadGame();
      return {
        kept,
        afterLoad: G.house.lore.bandit,
        summary: EnemyLore.summary('bandit'),
        base: base.dmg,
        buffed: buffed.dmg,
      };
    });
    assert.equal(lore.kept, 12);
    assert.equal(lore.afterLoad, 12);
    assert.ok(lore.buffed > lore.base);
    assert.match(lore.summary, /Known: Bandit III/);

    // UI: enemy inspect shows lore line
    await p.evaluate(() => {
      Battle.start({ enemies: [{ type: 'bandit', lvl: 3 }], kind: 'wild', title: 'Lore Check' });
      G.house.lore = { bandit: 12 };
      const foe = Battle.units.find((u) => u.side === 'enemy');
      UI.showEnemy(foe);
      UI.battleChanged();
    });
    await p.getByText(/Known: Bandit III/).first().waitFor();
    await p.screenshot({ path: '/tmp/enemy-knowledge-ui.png' });

    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
