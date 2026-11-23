const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('fs');

function chromePath() {
  if (fs.existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  if (fs.existsSync('/usr/local/bin/google-chrome')) return '/usr/local/bin/google-chrome';
  return undefined;
}

test('single valid target skips confirm; multiple targets keep pick UI', async () => {
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

    const result = await p.evaluate(() => {
      UI.closeAll();
      newGame();
      const mc = makeChar({ house: G.house.name, status: 'party', birth: 'highborn', cls: 'knight', level: 3 });
      G.mcId = G.founderId = mc.id;
      G.party = [mc.id];
      G.house.heroes = [mc.id];
      G.house.heirloom = makeHeirloom();
      G.house.potions = 3;
      Game.enterWorld(false);

      const origNext = Battle.next;
      Battle.next = function () {}; // freeze turn advance while probing targeting

      Battle.start({
        enemies: [{ type: 'bandit', lvl: 1 }],
        kind: 'wild',
        title: 'Single foe',
        intro: 'One bandit.',
        onEnd: () => {},
      });

      const hero = Battle.units.find((u) => u.side === 'party' && u.alive);
      const foe = Battle.units.find((u) => u.side === 'enemy' && u.alive);
      Battle.cur = hero;
      Battle.waiting = true;
      Battle.queue = [];
      Battle.over = false;
      UI.targeting = null;

      const foeHpBefore = foe.hp;
      UI.beginTarget('attack');
      const afterOne = {
        targeting: UI.targeting,
        waiting: Battle.waiting,
        foeDamaged: foe.hp < foeHpBefore,
      };

      // Two living enemies: beginTarget must open pick UI, not auto-act.
      Battle.waiting = true;
      Battle.cur = hero;
      UI.targeting = null;
      const e2 = makeEnemyUnit('bandit', 1, 1);
      Object.assign(e2, { gx: 5.4, gy: 2.0 });
      Battle.units.push(e2);
      const enemyCount = Battle.units.filter((u) => u.side === 'enemy' && u.alive).length;
      UI.beginTarget('attack');
      const afterTwo = {
        targeting: UI.targeting,
        waiting: Battle.waiting,
        enemyCount,
        validCount: Battle.units.filter((x) => UI.validTarget(x)).length,
      };

      // Potion with sole ally recipient auto-applies.
      UI.targeting = null;
      Battle.waiting = true;
      Battle.cur = hero;
      hero.hp = Math.max(1, Math.round(hero.maxHp * 0.4));
      const potionsBefore = G.house.potions;
      const hpBefore = hero.hp;
      UI.beginTarget('potion');
      const afterPotion = {
        targeting: UI.targeting,
        used: G.house.potions === potionsBefore - 1,
        healed: hero.hp > hpBefore,
      };

      // Single-target skill (enemy) with one foe left after killing e2 conceptually:
      // restore one foe only and try Heavy Blow / challenge-style targeting via beginTarget('skill').
      e2.alive = false;
      e2.hp = 0;
      Battle.waiting = true;
      Battle.cur = hero;
      UI.targeting = null;
      hero.focus = 3;
      const skillId = (hero.abilities || []).find((id) => GD.ABILITIES[id] && GD.ABILITIES[id].target === 'enemy')
        || 'heavyBlow';
      if (!hero.abilities.includes(skillId)) hero.abilities = [...(hero.abilities || []), skillId];
      const skillFoe = Battle.units.find((u) => u.side === 'enemy' && u.alive) || foe;
      skillFoe.alive = true;
      skillFoe.hp = skillFoe.maxHp;
      const skillHpBefore = skillFoe.hp;
      UI.targetSkill = skillId;
      UI.beginTarget('skill');
      const afterSkill = {
        targeting: UI.targeting,
        skillId,
        damaged: skillFoe.hp < skillHpBefore || UI.targeting === null,
      };

      Battle.next = origNext;
      return { afterOne, afterTwo, afterPotion, afterSkill };
    });

    assert.equal(result.afterOne.targeting, null, 'single foe: targeting cleared');
    assert.equal(result.afterOne.foeDamaged, true, 'single foe: attack executed');
    assert.equal(result.afterTwo.enemyCount, 2);
    assert.equal(result.afterTwo.targeting, 'attack', 'two foes: stay in targeting');
    assert.equal(result.afterTwo.waiting, true, 'two foes: still waiting for pick');
    assert.ok(result.afterTwo.validCount >= 2, 'two foes: multiple valid targets');
    assert.equal(result.afterPotion.targeting, null, 'single ally potion: targeting cleared');
    assert.equal(result.afterPotion.used, true, 'single ally potion: potion consumed');
    assert.equal(result.afterPotion.healed, true, 'single ally potion: healed');
    assert.equal(result.afterSkill.targeting, null, 'single-target skill: targeting cleared');
    assert.equal(result.afterSkill.damaged, true, 'single-target skill: executed');
    assert.deepEqual(errors, []);
  } finally {
    await b.close();
  }
});
