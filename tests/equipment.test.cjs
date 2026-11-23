const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('class kits drive equipment; try-on and equip update figure and combat bonuses', async () => {
  const chrome = require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : (require('fs').existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined);
  const b = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : { channel: 'chrome' }), args: ['--no-sandbox'] });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:8770');
    await p.getByRole('button', { name: /^Random Lineage/ }).click();
    await p.getByRole('button', { name: 'Continue', exact: true }).click();
    await p.locator('.origin-intro').waitFor();
    await p.getByRole('button', { name: /begin playing now/ }).click();

    const state = await p.evaluate(() => {
      Equip.ensureHouse();
      const mc = ch(G.mcId);
      const kit = Equip.kitFor(mc);
      // Stash a higher-tier head piece matching this class and try it on.
      const head = Equip.makeItem(kit.head, 3);
      Equip.addToStash(head);
      const can = Equip.canWear(mc, head);
      const beforeAtk = weaponAtk(mc);
      const beforeDef = armorDef(mc);
      Equip.equipItem(mc, head, true);
      const afterDef = armorDef(mc);
      const look = figLook(mc);
      // Wrong kit body should be rejected for this class.
      const wrongKind = kit.body === 'robe' ? 'armor' : 'robe';
      const wrong = Equip.makeItem(wrongKind, 2);
      Equip.addToStash(wrong);
      const reject = Equip.canWear(mc, wrong);
      Equip.equipItem(mc, wrong, true);
      const stillWrong = mc.equip.body && mc.equip.body.kind === wrongKind;
      return {
        kitHead: kit.head,
        kitBody: kit.body,
        kitHand: kit.hand,
        can,
        reject,
        stillWrong,
        headStyle: look.headStyle,
        headTier: look.headTier,
        defUp: afterDef >= beforeDef,
        beforeAtk,
        wornHead: mc.equip.head && mc.equip.head.kind,
        stash: G.house.stash.length,
      };
    });

    assert.ok(state.can, 'class can wear matching headgear');
    assert.equal(state.reject, false, 'class cannot wear the wrong body kit');
    assert.equal(state.stillWrong, false, 'equipItem refuses wrong kit');
    assert.equal(state.wornHead, state.kitHead);
    assert.equal(state.headStyle, state.kitHead);
    assert.equal(state.headTier, 3);
    assert.ok(state.defUp);

    // Zero equipment bonuses must not fall back to legacy GD.GEAR tiers.
    const zero = await p.evaluate(() => {
      const c = makeChar({ cls: 'sorcerer', race: 'human', birth: 'lowborn', house: G.house.name, status: 'party', level: 2 });
      Equip.ensureChar(c);
      // Force plain common pieces so random affixes cannot pad atk/def.
      for (const slot of Object.keys(c.equip)) c.equip[slot] = null;
      c.equip.body = Equip.makeItem('robe', 1, { rarity: 'common', mods: [] }); // def 0
      c.equip.hand = Equip.makeItem('orb', 1, { rarity: 'common', mods: [] }); // atk 0
      Equip.syncLegacy(c);
      const before = { def: armorDef(c), atk: weaponAtk(c), armorTier: c.gear.armor };
      c.equip.feet = Equip.makeItem('shoes', 3, { rarity: 'common', mods: [] }); // def 1
      return { before, afterDef: armorDef(c) };
    });
    assert.equal(zero.before.def, 0);
    assert.equal(zero.before.atk, 0);
    assert.equal(zero.before.armorTier, 1);
    assert.equal(zero.afterDef, 1);

    // Creation-preview stubs must not crash through figLook / Equip.ensureChar.
    const preview = await p.evaluate(() => {
      try {
        const cv = portrait({ race: 'human', gender: 'man', hairStyle: 'crop', beard: false, hair: '#5a3a22', tunic: '#3d5a80', alive: true, born: G.day - 20 * DAYS_PER_YEAR, lifespan: 999, height: 'average', build: 'average' }, 40);
        return { ok: !!cv && cv.tagName === 'CANVAS' };
      } catch (e) { return { ok: false, err: String(e) }; }
    });
    assert.equal(preview.ok, true, preview.err || 'preview portrait');

    await p.evaluate(() => UI.showInventory(ch(G.mcId)));
    await p.locator('.inv-screen').waitFor();
    await p.screenshot({ path: '/tmp/inventory-tryon.png' });
    await p.evaluate(() => { UI.closeAll(); UI.showEquipment(ch(G.mcId)); });
    await p.locator('.equip-screen').waitFor();
    await p.screenshot({ path: '/tmp/equipment-screen.png' });
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
