const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770';
const chrome = fs.existsSync('/usr/bin/chromium')
  ? '/usr/bin/chromium'
  : (fs.existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);

test('thief class lays snares, applies venom, and wears daggers', async () => {
  const b = await chromium.launch({
    headless: true,
    ...(chrome ? { executablePath: chrome } : { channel: 'chrome' }),
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(URL);
    await p.getByRole('button', { name: /^Random Lineage/ }).click();
    await p.getByRole('button', { name: /^Skip$/ }).waitFor();
    await p.getByRole('button', { name: /^Skip$/ }).click();
    await p.getByText('Random Lineage · Ready to play', { exact: true }).waitFor();
    await p.getByRole('button', { name: 'Start the game', exact: true }).click();
    await p.getByText('Your first generation', { exact: true }).waitFor();
    await p.getByRole('button', { name: 'Continue playing', exact: true }).click();

    const result = await p.evaluate(() => {
      const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
      ok(GD.CLASSES.thief, 'thief class exists');
      ok(GD.ABILITIES.laySnare && GD.ABILITIES.venomBlade && GD.ABILITIES.caltrops, 'thief abilities');
      ok(GD.CLASS_KIT.thief.hand === 'dagger', 'thief kit uses dagger');
      ok(GD.ITEM_KINDS.dagger, 'dagger item kind');

      const mc = ch(G.mcId);
      mc.cls = 'thief';
      mc.level = 5;
      Equip.ensureChar(mc);
      mc.equip = { head: null, neck: null, body: null, hand: null, offhand: null, feet: null, ring: null };
      Equip.seedStarter(mc, 2);
      ok(mc.equip.hand && mc.equip.hand.kind === 'dagger', 'seeded dagger');
      ok(abilitiesOf(mc).includes('caltrops'), 'level 5 unlocks caltrops');

      const oldFloat = R.float;
      const oldChance = R.chance;
      R.float = () => 1;
      R.chance = () => false;

      Battle.start({ enemies: [{ type: 'bandit', lvl: 2 }, { type: 'bandit', lvl: 2 }], kind: 'wild', title: 'Trap test', hold: true });
      const thief = Battle.units.find((u) => u.side === 'party');
      thief.cls = 'thief';
      thief.abilities = ['laySnare', 'venomBlade', 'caltrops'];
      thief.focus = 3;
      thief.atk = 20;
      thief.agi = 10;
      thief._ambushUsed = false;
      const foes = Battle.units.filter((u) => u.side === 'enemy');
      foes.forEach((f) => { f.hp = f.maxHp = 200; f.def = 0; f.alive = true; f.st = {}; });

      // Ambush boosts first physical strike
      const ambushed = Battle.physical(thief, foes[0], 1);
      ok(ambushed.dmg > 20, 'ambush boosts first hit');
      Battle.markAmbush(thief);
      const after = Battle.physical(thief, foes[0], 1);
      ok(after.dmg < ambushed.dmg, 'ambush only once');

      // Lay snare arms a delayed trap
      thief.focus = 3;
      thief._ambushUsed = true;
      Battle.useAbility(thief, 'laySnare');
      ok(Battle.traps.length === 1 && Battle.traps[0].kind === 'snare', 'snare armed');
      Battle.round = 2;
      Battle.triggerTraps();
      ok(Battle.traps.length === 0, 'snare consumed');
      ok(foes.every((f) => Battle.st(f, 'slow')), 'snare slows all foes');
      ok(foes.every((f) => f.hp < f.maxHp), 'snare damages all foes');

      // Venom blade applies poison DoT
      foes[0].hp = foes[0].maxHp = 200;
      foes[0].st = {};
      thief.focus = 3;
      Battle.useAbility(thief, 'venomBlade', foes[0]);
      ok(Battle.st(foes[0], 'poison'), 'venom applied');
      const beforeTick = foes[0].hp;
      Battle.tickStatus(foes[0]);
      ok(foes[0].hp < beforeTick, 'venom ticks');

      // Caltrops expose armour
      foes.forEach((f) => { f.hp = f.maxHp = 200; f.st = {}; });
      thief.focus = 3;
      Battle.useAbility(thief, 'caltrops');
      ok(foes.every((f) => Battle.st(f, 'defDown')), 'caltrops expose');

      R.float = oldFloat;
      R.chance = oldChance;
      Battle.active = false;
      Battle.over = true;
      return { ok: true, kit: Equip.kitFor(mc).hand, weapon: Equip.weaponLook(mc) };
    });

    assert.equal(result.ok, true);
    assert.equal(result.kit, 'dagger');
    assert.equal(result.weapon, 'dagger');
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
