const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(saved) {
  const ctx = vm.createContext({ G: saved || { mcId: 1, founderId: 1, pos: { x: 0, y: 0 }, house: { name: 'Oak', prestige: 10 }, chars: {}, world: { towns: [] } },
    saveGame() {}, tileAt: (x) => ({ feature: x === 2 ? 'town' : 'estate' }),
    isDescendantOf: c => (c.parents || c.adoptedBy || []).includes(1),
    ch(id) { return this.G.chars[id]; } });
  vm.runInContext(fs.readFileSync('js/guide.js', 'utf8') + '\n globalThis.guide = Guide;', ctx);
  // Avoid relying on a receiver for game-global character lookup.
  ctx.ch = id => ctx.G.chars[id];
  return ctx;
}
test('goals require actual travel and prestige gain; achievements stay complete', () => {
  const c = setup(); c.guide.update();
  assert.equal(c.G.guide.done.renown, undefined);
  c.G.pos.x = 2; c.G.house.prestige = 11; c.guide.update();
  for (const k of ['travel', 'town', 'renown']) assert.equal(c.G.guide.done[k], true);
  c.G.pos.x = 0; c.G.house.prestige = 0; c.guide.update();
  assert.equal(c.G.guide.done.renown, true);
});
test('birth and adoption qualify, unrelated townspeople do not', () => {
  for (const relation of ['parents', 'adoptedBy']) {
    const c = setup(); c.G.chars[2] = { house: 'Other', parents: [1] }; c.guide.update();
    assert.equal(c.G.guide.done.family, undefined);
    c.G.chars[3] = { alive: true, house: 'Oak', [relation]: [1] }; c.G.heirId = 3; c.guide.update();
    assert.equal(c.G.guide.done.family, true); assert.equal(c.G.guide.done.heir, true);
  }
});
test('save round trip preserves baseline, completed goals and dismissal', () => {
  const c = setup(); c.guide.init(); c.guide.mark('tree'); c.G.guide.hidden = true;
  const resumed = setup(JSON.parse(JSON.stringify(c.G))); resumed.guide.update();
  assert.equal(resumed.G.guide.prestige, 10); assert.equal(resumed.G.guide.done.tree, true);
  assert.equal(resumed.G.guide.hidden, true);
});
