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
    await p.getByRole('button', { name: 'Start the game', exact: true }).click();
    await p.getByRole('button', { name: 'Continue playing', exact: true }).click();

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
