// Churches, burials, morale, and where wards and squires come from.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770/';

test('wards and squires are your people’s children; churches pray, take in orphans and bury the dead', async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(URL);
    await p.waitForFunction(() => typeof Church !== 'undefined');
    const r = await p.evaluate(() => {
      UI.closeAll();
      newGame();
      const mc = makeChar({ house: G.house.name, status: 'party' });
      G.mcId = G.founderId = mc.id; G.party = [mc.id]; G.house.heroes = [mc.id];
      Game.enterWorld(false);
      UI.closeAll();
      const out = { churches: Church.all().length, godsOk: Church.all().every((t) => GD.GODS[t.god]) };
      // strangers never qualify
      const human = GD.RACES.human;
      const stranger = makeChar({ status: 'npc', race: 'human', town: 0 }); stranger.born = G.day - (human.maturity + 1) * DAYS_PER_YEAR;
      const waif = makeChar({ status: 'npc', race: 'human', town: 0 }); waif.born = G.day - 5 * DAYS_PER_YEAR;
      out.noStrangers = !Game.courtWards().includes(waif) && !Game.squireCandidates().includes(stranger);
      // a companion's children do
      const comp = makeChar({ status: 'party', race: 'human' }); G.party.push(comp.id);
      const kid = makeChar({ status: 'npc', race: 'human', parents: [comp.id], town: 0 }); kid.born = G.day - 6 * DAYS_PER_YEAR;
      const youth = makeChar({ status: 'npc', race: 'human', parents: [comp.id], town: 0 }); youth.born = G.day - (human.maturity + 1) * DAYS_PER_YEAR;
      comp.children.push(kid.id, youth.id);
      out.courtKid = Game.courtWards().includes(kid);
      out.courtYouth = Game.squireCandidates().includes(youth);
      // a death in the Guard lowers morale and waits for burial
      const fallen = makeChar({ status: 'party', race: 'human', house: G.house.name }); G.party.push(fallen.id);
      const m0 = houseMorale();
      kill(fallen, 'test');
      out.moraleDrop = houseMorale() < m0;
      out.unburied = Church.unburied().includes(fallen);
      const t = Church.all()[0];
      G.house.gold = 500;
      const m1 = houseMorale();
      Church.bury(t, fallen, true);
      out.buried = !!fallen.buried && !Church.unburied().includes(fallen);
      out.moraleUp = houseMorale() > m1;
      // the orphanage holds children with no parents
      const orphans = Church.orphans(t);
      out.orphansOk = orphans.length >= 2 && orphans.every((c) => !isAdult(c) && c.parents.every((pid) => !ch(pid) || !ch(pid).alive));
      Game.adopt(orphans[0], GD.ORPHAN_GIFT);
      out.adopted = orphans[0].house === G.house.name && (orphans[0].adoptedBy || []).includes(mc.id);
      // the interior opens and closes cleanly
      ChurchView.start(t);
      out.viewOpen = ChurchView.open && !!document.querySelector('.churchview');
      ChurchView.close();
      return out;
    });
    await p.waitForTimeout(300);
    assert.ok(r.churches >= 1, 'a world has churches');
    assert.ok(r.godsOk, 'every church has a god');
    assert.ok(r.noStrangers, 'strangers are never wards or squires');
    assert.ok(r.courtKid, "a companion's child can be a ward");
    assert.ok(r.courtYouth, "a companion's grown child can be a squire");
    assert.ok(r.moraleDrop && r.unburied, 'a death lowers morale and waits for burial');
    assert.ok(r.buried && r.moraleUp, 'a funeral buries them and lifts morale');
    assert.ok(r.orphansOk, 'the orphanage holds parentless children');
    assert.ok(r.adopted, 'an orphan can be taken in as a ward');
    assert.ok(r.viewOpen, 'the church interior opens');
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
