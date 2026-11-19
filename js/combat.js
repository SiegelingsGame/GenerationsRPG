// Turn-based combat. Pure logic + timing; the renderer reads Battle.units / Battle.fx.
'use strict';

const Battle = {
  active: false, units: [], queue: [], cur: null, round: 0,
  kind: 'wild', waiting: false, auto: false, fx: [], onEnd: null, over: false, log: [],
};

function unitFromChar(c, side, slot, boss) {
  const u = {
    uid: 'u' + c.id, charId: c.id, side, slot, name: c.name, race: c.race,
    kind: 'char', shape: 'humanoid', boss: !!boss,
    lvl: c.level,
    atk: stat(c, 'str') * 1.4 + weaponAtk(c) + c.level,
    mag: stat(c, 'int') * 1.5 + c.level,
    heal: stat(c, 'wil') * 2.4 + c.level * 2,
    def: stat(c, 'vit') * 0.6 + armorDef(c) + c.level * 0.5,
    spd: stat(c, 'agi'),
    agi: stat(c, 'agi'),
    maxHp: maxHp(c), hp: Math.max(1, Math.round(c.hp)),
    skill: topStat(c), focus: 1, defending: false, taunt: 0,
    brave: c.trait === 'brave', alive: true,
    look: { skin: GD.RACES[c.race].skin, hair: c.hair, tunic: c.tunic, stage: stageKey(c), race: c.race, house: c.house === G.house.name },
    anim: null, flash: 0,
  };
  if (boss) {
    u.maxHp = Math.round(u.maxHp * 1.8); u.hp = u.maxHp;
    u.atk *= 1.15; u.mag *= 1.15; u.look.evil = true;
  }
  return u;
}

function makeEnemyUnit(type, lvl, slot) {
  const d = GD.ENEMIES[type];
  const m = 1 + (lvl - 1) * 0.16;
  const s = {};
  for (const k of STATS) s[k] = d.s[k] * m;
  const u = {
    uid: 'e' + slot + '_' + Math.random().toString(36).slice(2, 7), side: 'enemy', slot, name: d.name, type,
    kind: 'enemy', shape: d.shape, lvl,
    atk: s.str * 1.4 + lvl, mag: s.int * 1.5 + lvl, heal: s.wil * 2 + lvl,
    def: s.vit * 0.6 + lvl * 0.5, spd: s.agi, agi: s.agi,
    maxHp: Math.round(18 + s.vit * 5 + lvl * 6), hp: 0,
    skill: d.skill || null, focus: 0, defending: false, taunt: 0, alive: true,
    xp: Math.round(d.xp * (1 + lvl * 0.15)), gold: Math.round(d.gold * (1 + lvl * 0.2)),
    look: { color: d.color, skin: d.skin },
    anim: null, flash: 0,
  };
  u.hp = u.maxHp;
  return u;
}

function unitPos(u) {
  const col = u.side === 'party' ? 1.5 : 5.4;
  const n = Battle.units.filter((x) => x.side === u.side).length;
  const off = (4 - n) * 0.6;
  return { gx: col + (u.side === 'party' ? (u.slot % 2) * -0.5 : (u.slot % 2) * 0.5), gy: 0.6 + off + u.slot * 1.2 };
}

Battle.start = function (opts) {
  this.active = true; this.over = false; this.round = 0; this.fx = []; this.log = [];
  this.kind = opts.kind || 'wild';
  this.title = opts.title || 'Battle';
  this.onEnd = opts.onEnd;
  this.units = [];
  G.party.map(ch).filter((c) => c && c.alive).forEach((c, i) => this.units.push(unitFromChar(c, 'party', i)));
  (opts.enemies || []).forEach((e, i) => this.units.push(e.charId ? e : makeEnemyUnit(e.type, e.lvl, i)));
  this.units.filter((u) => u.side === 'enemy').forEach((u, i) => { u.slot = i; });
  this.units.forEach((u) => Object.assign(u, unitPos(u)));
  this.queue = [];
  this.waiting = false;
  this.say(opts.intro || 'Enemies approach!');
  setTimeout(() => this.next(), 500);
};

Battle.say = function (t) { this.log.push(t); if (this.log.length > 6) this.log.shift(); UI.battleChanged(); };
Battle.alive = function (side) { return this.units.filter((u) => u.side === side && u.alive); };

Battle.next = function () {
  if (this.over) return;
  if (!this.alive('enemy').length) return this.finish('victory');
  if (!this.alive('party').length) return this.finish('defeat');
  if (!this.queue.length) {
    this.round++;
    this.units.forEach((u) => { if (u.taunt) u.taunt--; });
    if (G.house.retinue > 0 && this.round > 0) {
      const t = R.pick(this.alive('enemy'));
      const dmg = Math.round(3 + G.house.retinue * 3 + partyLevel() * 1.2);
      this.damage(null, t, dmg, false, 'Retinue volley');
      if (!this.alive('enemy').length) return setTimeout(() => this.finish('victory'), 500);
    }
    this.queue = this.units.filter((u) => u.alive).sort((a, b) => b.spd * R.float(0.8, 1.2) - a.spd * R.float(0.8, 1.2));
  }
  const u = this.queue.shift();
  if (!u.alive) return this.next();
  this.cur = u;
  u.defending = false;
  u.focus = Math.min(3, u.focus + 1);
  if (u.side === 'party' && !this.auto) {
    this.waiting = true;
    UI.battleChanged();
    return;
  }
  this.waiting = false;
  UI.battleChanged();
  setTimeout(() => this.ai(u), this.auto ? 250 : 450);
};

Battle.ai = function (u) {
  if (this.over) return;
  const foes = this.alive(u.side === 'party' ? 'enemy' : 'party');
  const friends = this.alive(u.side);
  if (!foes.length) return this.next();
  let target;
  const taunter = foes.find((f) => f.taunt > 0);
  if (u.skill && u.focus >= 2) {
    if (u.skill === 'wil') {
      const hurt = friends.filter((f) => f.hp < f.maxHp * 0.6);
      if (hurt.length) return this.act('skill', hurt.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0].uid);
    } else if (u.skill !== 'vit' || u.hp < u.maxHp * 0.7 || u.side === 'party') {
      if (u.skill !== 'wil') return this.act('skill', (taunter || R.pick(foes)).uid);
    }
  }
  if (u.side === 'party' && G.house.potions > 0 && u.hp < u.maxHp * 0.3) return this.act('potion', u.uid);
  target = taunter || (R.chance(0.5) ? foes.sort((a, b) => a.hp - b.hp)[0] : R.pick(foes));
  this.act('attack', target.uid);
};

Battle.find = function (uid) { return this.units.find((u) => u.uid === uid); };

Battle.physical = function (u, t, mult, extraCrit = 0) {
  let dmg = u.atk * R.float(0.85, 1.15) * mult - t.def * 0.5;
  if (u.brave) dmg *= 1.1;
  const crit = R.chance(0.05 + u.agi * 0.008 + extraCrit);
  if (crit) dmg *= 1.6;
  if (t.defending) dmg *= 0.5;
  return { dmg: Math.max(1, Math.round(dmg)), crit };
};

Battle.damage = function (src, t, dmg, crit, label) {
  t.hp = Math.max(0, t.hp - dmg);
  t.flash = 1;
  this.fx.push({ uid: t.uid, text: (crit ? 'CRIT ' : '') + dmg, color: crit ? '#ffd23f' : '#ff5c5c', t0: performance.now() });
  if (label) this.fx.push({ uid: t.uid, text: label, color: '#ddd', t0: performance.now() + 60, small: true });
  if (t.hp <= 0 && t.alive) {
    t.alive = false;
    this.say(`${t.name} ${t.side === 'party' ? 'has fallen!' : 'is defeated.'}`);
  }
};

Battle.act = function (action, targetUid) {
  const u = this.cur;
  if (!u || this.over) return;
  this.waiting = false;
  let t = this.find(targetUid);
  const foes = this.alive(u.side === 'party' ? 'enemy' : 'party');
  if (action === 'attack') {
    if (!t || !t.alive || t.side === u.side) t = foes[0];
    const r = this.physical(u, t, 1);
    u.anim = { type: 'lunge', to: t.uid, t0: performance.now() };
    this.damage(u, t, r.dmg, r.crit);
    this.say(`${u.name} strikes ${t.name} for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`);
  } else if (action === 'defend') {
    u.defending = true; u.focus = Math.min(3, u.focus + 1);
    this.fx.push({ uid: u.uid, text: 'Guard', color: '#8fd3ff', t0: performance.now() });
    this.say(`${u.name} braces.`);
  } else if (action === 'potion') {
    if (G.house.potions <= 0) return this.next();
    G.house.potions--;
    if (!t || !t.alive || t.side !== u.side) t = u;
    const amt = Math.round(t.maxHp * 0.45);
    t.hp = Math.min(t.maxHp, t.hp + amt);
    this.fx.push({ uid: t.uid, text: '+' + amt, color: '#6fe08a', t0: performance.now() });
    this.say(`${u.name} uses a potion on ${t.name}.`);
  } else if (action === 'skill') {
    u.focus -= 2;
    const sk = GD.SKILLS[u.skill].name;
    u.anim = { type: u.skill === 'int' || u.skill === 'wil' ? 'cast' : 'lunge', to: t ? t.uid : null, t0: performance.now() };
    if (u.skill === 'str') {
      for (const f of foes) { const r = this.physical(u, f, 0.7); this.damage(u, f, r.dmg, r.crit); }
      this.say(`${u.name} uses ${sk} on all foes!`);
    } else if (u.skill === 'agi') {
      if (!t || !t.alive || t.side === u.side) t = foes[0];
      let total = 0;
      for (let i = 0; i < 2 && t.alive; i++) { const r = this.physical(u, t, 0.65, 0.2); this.damage(u, t, r.dmg, r.crit); total += r.dmg; }
      this.say(`${u.name} uses ${sk} on ${t.name} for ${total}.`);
    } else if (u.skill === 'int') {
      if (!t || !t.alive || t.side === u.side) t = foes[0];
      const dmg = Math.max(1, Math.round(u.mag * 1.7 * R.float(0.9, 1.1) - t.def * 0.15) * (t.defending ? 0.5 : 1));
      this.damage(u, t, dmg, false);
      this.fx.push({ uid: t.uid, burst: '#ff8a3d', t0: performance.now() });
      this.say(`${u.name} casts ${sk} at ${t.name} for ${dmg}.`);
    } else if (u.skill === 'wil') {
      const allies = this.alive(u.side);
      if (!t || !t.alive || t.side !== u.side) t = allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const amt = Math.round(u.heal * R.float(0.9, 1.1));
      t.hp = Math.min(t.maxHp, t.hp + amt);
      this.fx.push({ uid: t.uid, text: '+' + amt, color: '#6fe08a', t0: performance.now() });
      this.fx.push({ uid: t.uid, burst: '#7dffa8', t0: performance.now() });
      this.say(`${u.name} uses ${sk} on ${t.name} (+${amt}).`);
    } else if (u.skill === 'vit') {
      u.defending = true; u.taunt = 2;
      this.fx.push({ uid: u.uid, text: 'Bulwark', color: '#8fd3ff', t0: performance.now() });
      this.say(`${u.name} raises a Bulwark and draws the enemy's attacks.`);
    }
  } else if (action === 'flee') {
    const pa = this.alive('party'), ea = this.alive('enemy');
    const avg = (l) => l.reduce((s, x) => s + x.agi, 0) / l.length;
    if (R.chance(clamp(0.45 + (avg(pa) - avg(ea)) * 0.04, 0.15, 0.9))) {
      this.say('You escape!');
      return setTimeout(() => this.finish('fled'), 400);
    }
    this.say('You fail to escape!');
  }
  UI.battleChanged();
  setTimeout(() => this.next(), this.auto ? 350 : 650);
};

Battle.finish = function (outcome) {
  if (this.over) return;
  this.over = true;
  this.waiting = false;
  const res = resolveBattle(outcome, this);
  UI.battleChanged();
  setTimeout(() => { this.active = false; if (this.onEnd) this.onEnd(res); }, 600);
};

// Apply results of a battle to the model.
function resolveBattle(outcome, b) {
  G.stats.battles++;
  const res = { outcome, xp: 0, gold: 0, dead: [], survived: [], levels: [], formative: [], kind: b.kind, rivalDefeated: null };
  const partyUnits = b.units.filter((u) => u.side === 'party');
  const enemies = b.units.filter((u) => u.side === 'enemy');
  // write HP back
  for (const u of partyUnits) { const c = ch(u.charId); if (c) c.hp = Math.max(1, u.hp); }
  if (outcome === 'victory') {
    res.xp = enemies.reduce((s, e) => s + (e.xp || Math.round(30 + e.lvl * 12)), 0);
    res.gold = Math.round(enemies.reduce((s, e) => s + (e.gold || 40 + e.lvl * 10), 0) * era().income);
    if (G.world.era.type === 'war') res.xp = Math.round(res.xp * 1.25);
    G.house.gold += res.gold;
    const alive = partyUnits.filter((u) => u.alive).map((u) => ch(u.charId));
    for (const c of alive) {
      const before = c.level;
      res.levels.push({ c, gained: gainXp(c, res.xp / Math.max(1, alive.length) * 1.6), up: c.level > before });
      const f = addFormative(c, 1);
      if (f > 0) res.formative.push(c.name);
      c.loyalty = clamp(c.loyalty + 1, -100, 100);
    }
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) addBond(alive[i], alive[j], 2);
    addProsperity(G.world.era.type === 'war' ? 0.6 : 0.3);
    const rivalUnit = enemies.find((e) => e.charId);
    if (rivalUnit) {
      const rv = ch(rivalUnit.charId);
      kill(rv, `slain by House ${G.house.name}`);
      G.house.prestige += 12; addProsperity(8);
      res.rivalDefeated = rv;
    }
  }
  // death rolls for the fallen
  const wiped = outcome === 'defeat';
  for (const u of partyUnits) {
    const c = ch(u.charId);
    if (!c || !c.alive) continue;
    if (!u.alive) {
      const st = stageKey(c);
      let p = 0.22 - G.house.up.chapel * 0.06 + (st === 'elder' ? 0.15 : st === 'venerable' ? 0.25 : st === 'youth' ? -0.08 : 0);
      if (wiped) p += 0.15;
      if (c.id === G.mcId && !heirCandidates().some((x) => x.c.id !== c.id && !x.why.startsWith('Spouse'))) p *= 0.5; // fate spares a line's last hope (a little)
      if (R.chance(clamp(p, 0.05, 0.9))) {
        kill(c, wiped ? 'slain in a lost battle' : 'fell in battle');
        G.stats.deaths++;
        res.dead.push(c);
      } else { c.hp = Math.max(1, Math.round(maxHp(c) * 0.15)); res.survived.push(c); }
    }
  }
  if (wiped) {
    const lost = Math.round(G.house.gold * 0.2);
    G.house.gold -= lost;
    res.goldLost = lost;
    for (const id of G.party) { const c = ch(id); if (c) c.hp = Math.max(c.hp, Math.round(maxHp(c) * 0.3)); }
  }
  advanceDays(3);
  return res;
}

// Build an encounter for a tile.
function buildEncounter(tile, opts = {}) {
  const E = era();
  let pool = [...(GD.ENCOUNTERS[tile.feature === 'ruins' ? 'ruins' : tile.type] || GD.ENCOUNTERS.grass)];
  if (E.extra && tile.feature !== 'ruins') pool = pool.concat(E.extra);
  const dist = Math.abs(tile.x - G.world.estate.x) + Math.abs(tile.y - G.world.estate.y);
  const lvlBase = Math.max(1, Math.round(partyLevel() + dist / 5 + (opts.hard ? 2 : 0) - 0.5));
  const n = opts.count || clamp(R.int(1, Math.min(4, 1 + Math.ceil(G.party.length * 0.9))), 1, 4);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ type: R.pick(pool), lvl: Math.max(1, lvlBase + R.int(-1, 1)) });
  return out;
}
