const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770';
const chrome = fs.existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium'
  : (fs.existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);

async function boot(page) {
  await page.goto(URL);
  await page.getByRole('button', { name: /^Random Lineage/ }).click();
  await page.getByRole('button', { name: /^Skip$/ }).waitFor();
  await page.getByRole('button', { name: /^Skip$/ }).click();
  await page.getByText('Random Lineage · Ready to play', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start the game', exact: true }).click();
  await page.getByText('Your first generation', { exact: true }).waitFor();
  await page.getByRole('button', { name: /^Guide me/ }).click();
}

test('noble strategizes and musters focus; warlock holds 4 AP and casts obliterate', async () => {
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

    const result = await p.evaluate(() => {
      const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
      ok(GD.CLASSES.noble && GD.CLASSES.warlock, 'classes exist');
      ok(GD.CLASSES.warlock.maxFocus === 4, 'warlock maxFocus');
      ok(GD.ABILITIES.synchronize && GD.ABILITIES.muster && GD.ABILITIES.coordinatedStrike, 'noble abilities');
      ok(GD.ABILITIES.hexbolt && GD.ABILITIES.soulfire && GD.ABILITIES.obliterate, 'warlock abilities');
      ok(GD.ABILITIES.hexbolt.cost === 1 && GD.ABILITIES.soulfire.cost === 2 && GD.ABILITIES.obliterate.cost === 3, 'warlock costs');
      ok(GD.CLASS_KIT.noble.hand === 'banner', 'noble banner kit');
      ok(GD.CLASS_KIT.warlock.hand === 'orb', 'warlock orb kit');

      const oldFloat = R.float;
      const oldChance = R.chance;
      R.float = () => 1;
      R.chance = () => false;

      // --- Warlock focus pact ---
      const wc = makeChar({ cls: 'warlock', race: 'human', birth: 'lowborn', house: G.house.name, status: 'party', level: 5 });
      G.chars[wc.id] = wc;
      Equip.ensureChar(wc);
      const wu = unitFromChar(wc, 'party', 0);
      ok(wu.focus === 4, 'warlock starts at 4 focus');
      ok(Battle.maxFocus(wu) === 4, 'warlock cap 4');
      Battle.gainFocus(wu, 1);
      ok(wu.focus === 4, 'warlock cannot exceed 4');

      // --- Noble banner + strategize + muster + synchronize ---
      const nc = makeChar({ cls: 'noble', race: 'human', birth: 'highborn', house: G.house.name, status: 'party', level: 5 });
      const ac = makeChar({ cls: 'warrior', race: 'human', birth: 'lowborn', house: G.house.name, status: 'party', level: 3 });
      G.chars[nc.id] = nc;
      G.chars[ac.id] = ac;
      G.party = [nc.id, ac.id];
      Equip.ensureChar(nc);
      Equip.ensureChar(ac);

      Battle.start({
        partyUnits: [unitFromChar(nc, 'party', 0), unitFromChar(ac, 'party', 1)],
        enemies: [{ type: 'bandit', lvl: 2 }, { type: 'bandit', lvl: 2 }],
        kind: 'wild',
        title: 'Noble test',
        hold: true,
      });
      const noble = Battle.units.find((u) => u.cls === 'noble');
      const ally = Battle.units.find((u) => u.cls === 'warrior');
      const foes = Battle.units.filter((u) => u.side === 'enemy');
      foes.forEach((f) => { f.hp = f.maxHp = 400; f.def = 0; f.alive = true; f.st = {}; });

      ok(ally.focus >= 2, 'banner gave ally +1 focus at battle start');
      ok(noble.focus >= 2, 'banner gave noble +1 focus');

      // Strategize: ally should take damage-dealing action
      const foeHpBefore = foes[0].hp;
      Battle.basicAttack(noble, ally);
      ok(foes[0].hp < foeHpBefore, 'strategize made ally strike');

      // Muster grants focus
      ally.focus = 0;
      noble.focus = 3;
      Battle.useAbility(noble, 'muster');
      ok(ally.focus === 2, 'muster +2 focus to ally');
      // cost 2 (3→1) then muster +2 to self → 3
      ok(noble.focus === 3, 'muster refunds noble after its cost');

      // Synchronize: ally hit + noble follow-up
      foes[0].hp = foes[0].maxHp = 400;
      noble.focus = 3;
      Battle.useAbility(noble, 'synchronize', ally);
      ok(foes[0].hp < 400, 'synchronize dealt damage');

      // Coordinated strike
      foes[0].hp = foes[0].maxHp = 400;
      noble.focus = 3;
      Battle.useAbility(noble, 'coordinatedStrike', foes[0]);
      ok(foes[0].hp < 400, 'coordinated strike dealt damage');

      // --- Warlock obliterate ---
      Battle.start({
        partyUnits: [unitFromChar(wc, 'party', 0)],
        enemies: [{ type: 'bandit', lvl: 3 }],
        kind: 'wild',
        title: 'Warlock test',
        hold: true,
      });
      const warlock = Battle.units.find((u) => u.cls === 'warlock');
      const foe = Battle.units.find((u) => u.side === 'enemy');
      foe.hp = foe.maxHp = 500;
      foe.def = 0;
      ok(warlock.focus === 4, 'warlock enters battle at 4');
      Battle.useAbility(warlock, 'obliterate', foe);
      ok(warlock.focus === 1, 'obliterate spends 3');
      ok(foe.hp < 500, 'obliterate damaged');

      // Pact bolt is stronger than sorcerer bolt at same mag
      const bolt = Battle.magic({ ...warlock, focus: 4, st: {}, brave: false }, { ...foe, st: {}, defending: false }, 1.35);
      const arcane = Battle.magic({ ...warlock, cls: 'sorcerer', st: {}, brave: false }, { ...foe, st: {}, defending: false }, 0.95);
      ok(bolt.dmg > arcane.dmg, 'pact bolt stronger than arcane bolt');

      R.float = oldFloat;
      R.chance = oldChance;
      Battle.active = false;
      Battle.over = true;
      return { ok: true };
    });

    assert.equal(result.ok, true);
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
