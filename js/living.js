// The living map: seamless party movement and the parties that share the road with you.
// Rule: nothing moves unless your party moves. Time, caravans, bandits and rivals all advance
// only by the days your own travel takes. Unseen ambushes can still strike as you cross the land.
'use strict';

const Living = { moving: false, path: [], dest: null, targetId: null, lastTs: 0, repath: 0, spawnAcc: 0 };

const AGENTS = {
  caravan: { name: 'Caravan', speed: 1 / 18, sight: 0, hostile: false, color: '#c9a24a' },
  bandits: { name: 'Bandits', speed: 1 / 14, sight: 3.6, hostile: true, color: '#7a1f1f' },
  refugees: { name: 'Refugees', speed: 1 / 26, sight: 0, hostile: false, color: '#8a8a8a' },
  rival: { name: 'Rival', speed: 1 / 12, sight: 5.5, hostile: true, color: '#3a1f4a' },
};

// ---------------------------------------------------------------- helpers
Living.ensure = function () {
  if (!G || !G.world || !G.world.map) return false;
  if (!G.world.parties) { G.world.parties = []; for (let i = 0; i < 4; i++) this.spawn(); }
  if (!G.ppos) G.ppos = { x: G.pos.x, y: G.pos.y };
  // keep the drawn position in step with jumps (flight, succession, loading)
  if (!this.moving && Math.hypot(G.ppos.x - G.pos.x, G.ppos.y - G.pos.y) > 0.05) G.ppos = { x: G.pos.x, y: G.pos.y };
  return true;
};
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
Living.partySight = function () {
  const t = tileAt(G.pos.x, G.pos.y);
  let s = 4.2;
  if (t.type === 'hills' || t.type === 'mountain') s += 1.6;
  if (t.type === 'forest' || t.type === 'jungle' || t.type === 'swamp') s -= 1.2;
  if (G.world.era.type === 'war') s += 0.5;
  return s;
};
Living.visible = function (a) { return dist2(a, G.ppos) <= this.partySight(); };
Living.partyPower = function () { return G.party.map(ch).filter(Boolean).reduce((s, c) => s + c.level + 2, 0); };
Living.agentPower = function (a) { return (a.n || 3) * 0.33 * (a.lvl + 2); };
Living.danger = function (a) {
  if (!AGENTS[a.kind].hostile && a.kind !== 'caravan') return { label: 'Harmless', cls: 'good', score: -9 };
  const ratio = this.agentPower(a) / Math.max(1, this.partyPower());
  if (ratio < 0.5) return { label: 'Weak', cls: 'good', score: ratio };
  if (ratio < 0.85) return { label: 'Even', cls: 'dim', score: ratio };
  if (ratio < 1.25) return { label: 'Strong', cls: 'warn', score: ratio };
  return { label: 'Deadly', cls: 'bad', score: ratio };
};
Living.label = function (a) {
  if (a.kind === 'rival') return `${a.name} (Rival)`;
  if (a.kind === 'caravan') return `Caravan to ${a.toName || 'town'}`;
  if (a.kind === 'refugees') return 'Refugees';
  return `${a.name[0].toUpperCase() + a.name.slice(1)} · ~${a.n * 4}`;
};
function regionLevel(x, y, bonus = 0) {
  const d = Math.abs(x - G.world.estate.x) + Math.abs(y - G.world.estate.y);
  return Math.max(1, Math.round(1.5 + d / 4 + bonus + (year() - START_YEAR) / 90));
}

// ---------------------------------------------------------------- moving the party
Living.go = function (tile, agent) { return this.goPoint({ x: tile.x, y: tile.y }, agent); };
Living.goPoint = function (pt, agent) {
  LocationPrompt.pending = null;
  if (!this.ensure() || Battle.active || UI.modalStack.length || TownView.open || TownInterior.open || DensView.open || Campfire.open) return;
  if (!LS.ensure()) return;
  // snap onto places of note
  const t = tileAt(clamp(Math.round(pt.x), 0, G.world.map.W - 1), clamp(Math.round(pt.y), 0, G.world.map.H - 1));
  if (t && t.feature && Math.hypot(pt.x - t.x, pt.y - t.y) < 0.6) pt = { x: t.x, y: t.y };
  if (agent && Math.hypot(agent.x - G.ppos.x, agent.y - G.ppos.y) < 0.7) { this.stop(); return this.encounter(agent, true); }
  const path = LS.path(G.ppos, pt);
  if (!path) {
    const water = LS.hfAt(pt.x, pt.y) < 0;
    return UI.toast(water && !hasTech('boats') ? 'You need boats to cross the sea. Sailing has not been invented yet.' : 'There is no way through from here.');
  }
  this.path = path;
  this.dest = path[path.length - 1];
  this.targetId = agent ? agent.id : null;
  this.repath = 0.4;
  this.moving = true;
};
Living.stop = function () { this.moving = false; this.path = []; this.dest = null; this.targetId = null; };
// days it takes to cross one tile-width of ground at a point
Living.daysPerUnit = function (x, y) {
  let c = LS.costAt(x, y);
  if (!isFinite(c)) c = 1.5;
  const water = LS.hfAt(x, y) < 0;
  let d = 15 * c;
  if (!water) {
    d *= 1 - G.house.up.horses * 0.18;
    if (hasTech('roads')) d *= 0.75;
    if (hasTech('carts')) d *= 0.75;
    if (hasTech('rail')) d *= 0.6;
  }
  return Math.max(1.5, d);
};

Living.frame = function (ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - (this.lastTs || ts)) / 1000));
  this.lastTs = ts;
  if (!this.moving || !G || G.mode !== 'world' || Battle.active || UI.modalStack.length || TownView.open || TownInterior.open || DensView.open || Campfire.open || Game.busy) return;
  if (!this.ensure() || !LS.ensure()) return;
  if (this.targetId) {
    const ag = G.world.parties.find((x) => x.id === this.targetId);
    if (!ag) { this.stop(); return; }
    this.repath -= dt;
    if (this.repath <= 0) {
      this.repath = 0.5;
      const p = LS.path(G.ppos, { x: ag.x, y: ag.y });
      if (p) { this.path = p; this.dest = p[p.length - 1]; }
    }
    if (Math.hypot(ag.x - G.ppos.x, ag.y - G.ppos.y) < 0.65) { this.stop(); return this.encounter(ag, true); }
  }
  const next = this.path[0];
  if (!next) {
    this.stop();
    const t = tileAt(Math.round(G.ppos.x), Math.round(G.ppos.y));
    G.pos = { x: t.x, y: t.y };
    UI.refresh();
    return Game.arrive();
  }
  // walk straight toward the next corner of the route, slower over rough ground
  const c = LS.costAt(G.ppos.x, G.ppos.y);
  const speed = 2.6 / Math.sqrt(isFinite(c) ? Math.max(0.6, c) : 1.5);
  const dx = next.x - G.ppos.x, dy = next.y - G.ppos.y;
  const rem = Math.hypot(dx, dy);
  const step = Math.min(rem, speed * dt);
  if (rem > 0) { G.ppos.x += dx / rem * step; G.ppos.y += dy / rem * step; }
  const days = step * this.daysPerUnit(G.ppos.x, G.ppos.y);
  advanceDays(days);
  this.tick(days);
  if (G.pendingSuccession || G.pendingVictory || G.pendingDoom) { this.stop(); return Game.after(); }
  for (const a of G.world.parties) {
    if (a.cool > G.day) continue;
    if (Math.hypot(a.x - G.ppos.x, a.y - G.ppos.y) < 0.6 && AGENTS[a.kind].hostile && a.hunting) { this.stop(); return this.encounter(a, false); }
  }
  if (rem - step < 0.001) this.path.shift();
  // crossing into a new region
  const t = tileAt(clamp(Math.round(G.ppos.x), 0, G.world.map.W - 1), clamp(Math.round(G.ppos.y), 0, G.world.map.H - 1));
  if (t.x !== G.pos.x || t.y !== G.pos.y) {
    G.pos = { x: t.x, y: t.y };
    this.enterTile(t);
  }
};

// crossing into a new tile: rest a little, and unseen dangers may strike
Living.enterTile = function (t) {
  for (const id of G.party) { const c = ch(id); if (c) c.hp = Math.min(maxHp(c), c.hp + maxHp(c) * 0.03); }
  UI.refresh();
  if (isWater(t) || t.feature) return;
  const q = G.world.doom.quest;
  if (q && q.x === t.x && q.y === t.y) return;
  const rough = { forest: 1.4, jungle: 1.5, swamp: 1.4, hills: 1.2, mountain: 1.3, desert: 1.1, snow: 1.1 }[t.type] || 1;
  if (R.chance(0.13 * Math.sqrt(era().enc) * rough)) {
    this.stop();
    const ev = Events.roll(t);
    if (ev.kind === 'ambush') UI.toast('An ambush! You never saw them coming.');
    Events.show(ev);
  }
};

// ---------------------------------------------------------------- the other parties
Living.tick = function (days) {
  if (days <= 0) return;
  const P = G.world.parties;
  for (const a of P) this.moveAgent(a, days);
  // bandits that catch a caravan rob it
  for (const b of P.filter((a) => a.kind === 'bandits')) {
    const c = P.find((x) => x.kind === 'caravan' && dist2(x, b) < 0.6);
    if (c) {
      c.dead = true;
      const town = G.world.towns.find((tw) => tw.name === c.toName);
      if (town) town.growth = (town.growth || 0) - 0.15;
      const cp = campsList().find((x) => x.id === b.campId);
      if (cp) cp.str = Math.min(12, cp.str + 0.3);
      if (this.visible(b)) chron(`${b.name[0].toUpperCase() + b.name.slice(1)} robbed a caravan bound for ${c.toName}.`, 'bad', [], 'raid');
    }
  }
  G.world.parties = P.filter((a) => !a.dead);
  this.spawnAcc += days;
  if (this.spawnAcc > 6) { this.spawnAcc = 0; this.spawn(); }
};

Living.moveAgent = function (a, days) {
  const kind = AGENTS[a.kind];
  const sees = kind.sight && Math.hypot(a.x - G.ppos.x, a.y - G.ppos.y) <= kind.sight * (['forest', 'jungle', 'swamp'].includes(tileAt(G.pos.x, G.pos.y).type) ? 0.6 : 1);
  const wasHunting = a.hunting;
  a.hunting = false;
  if (sees && a.cool <= G.day) {
    const brave = a.kind === 'rival' || this.agentPower(a) >= this.partyPower() * 0.7;
    if (brave) {
      a.hunting = true;
      if (!wasHunting || (a.repathAt || 0) <= G.day) { a.gx = G.ppos.x; a.gy = G.ppos.y; a.path = null; a.repathAt = G.day + 1.5; }
    } else if (a.kind === 'bandits' && !a.fleeing) {
      a.fleeing = true;
      a.gx = clamp(a.x + (a.x - G.ppos.x) * 3, 0, G.world.map.W - 1);
      a.gy = clamp(a.y + (a.y - G.ppos.y) * 3, 0, G.world.map.H - 1);
      a.path = null;
    }
  } else a.fleeing = false;
  if (a.gx == null || (!a.path && a.tries > 3)) { a.tries = 0; this.newGoal(a); }
  if (a.dead) return;
  if (!a.path) {
    a.path = LS.path({ x: a.x, y: a.y }, { x: a.gx, y: a.gy });
    if (!a.path) { a.tries = (a.tries || 0) + 1; this.newGoal(a); return; }
  }
  let left = kind.speed * days;
  let guard = 0;
  while (left > 0 && a.path && a.path.length && guard++ < 40) {
    const nx = a.path[0];
    const dx = nx.x - a.x, dy = nx.y - a.y;
    const rem = Math.hypot(dx, dy);
    let c = LS.costAt(a.x, a.y); if (!isFinite(c)) c = 1.5;
    const can = left / Math.max(0.6, c);
    if (can >= rem) { a.x = nx.x; a.y = nx.y; a.path.shift(); left -= rem * Math.max(0.6, c); }
    else { a.x += dx / rem * can; a.y += dy / rem * can; left = 0; }
  }
  if (a.path && !a.path.length) {
    a.path = null;
    if (Math.hypot(a.x - a.gx, a.y - a.gy) < 0.7) { this.arrived(a); if (a.dead) return; this.newGoal(a); }
  }
};
Living.arrived = function (a) {
  if (a.kind === 'caravan') {
    const town = G.world.towns.find((t) => t.name === a.toName);
    if (town && !town.fallen) town.growth = (town.growth || 0) + 0.05;
    a.dead = true;
  }
  if (a.kind === 'refugees') {
    const town = G.world.towns.find((t) => t.name === a.toName);
    if (town && !town.fallen) town.growth = (town.growth || 0) + 0.04;
    a.dead = true;
  }
};
Living.newGoal = function (a) {
  const cur = tileAt(Math.round(a.x), Math.round(a.y));
  const landTile = (cx, cy, r) => {
    for (let i = 0; i < 20; i++) {
      const t = tileAt(clamp(Math.round(cx + R.int(-r, r)), 0, G.world.map.W - 1), clamp(Math.round(cy + R.int(-r, r)), 0, G.world.map.H - 1));
      if (t && isLand(t) && t.land === cur.land) return t;
    }
    return cur;
  };
  let t;
  if (a.kind === 'caravan' || a.kind === 'refugees') {
    const town = G.world.towns.find((tw) => tw.name === a.toName && !tw.fallen);
    if (!town) { a.dead = true; return; }
    t = tileAt(town.x, town.y);
  } else if (a.kind === 'bandits') {
    const cp = campsList().find((x) => x.id === a.campId);
    if (!cp) { a.dead = true; return; }
    // raid the roads: go after a nearby caravan, or prowl around the camp
    const prey = G.world.parties.find((x) => x.kind === 'caravan' && dist2(x, a) < 6);
    t = prey ? tileAt(Math.round(prey.x), Math.round(prey.y)) : landTile(cp.x, cp.y, 6);
  } else if (a.kind === 'rival') {
    const rv = ch(a.charId);
    if (!rv || !rv.alive) { a.dead = true; return; }
    t = landTile(G.pos.x, G.pos.y, 7); // they hunt you across the land
  }
  if (!t) t = cur;
  a.gx = t.x; a.gy = t.y;
  a.path = null;
};

Living.spawn = function () {
  const P = G.world.parties;
  const towns = liveTowns();
  // caravans between towns on the same land
  const wantCaravans = Math.max(1, Math.floor(towns.length * 0.6));
  if (P.filter((a) => a.kind === 'caravan').length < wantCaravans && towns.length >= 2) {
    const from = R.pick(towns);
    const fl = tileAt(from.x, from.y).land;
    const dests = towns.filter((t) => t !== from && tileAt(t.x, t.y).land === fl);
    if (dests.length) {
      const to = R.pick(dests);
      P.push({ id: 'p' + G.nextId++, kind: 'caravan', x: from.x, y: from.y, toName: to.name, n: R.int(2, 4), lvl: regionLevel(from.x, from.y), gold: R.int(120, 300), cool: 0 });
    }
  }
  // bandit war bands out of the camps
  for (const cp of campsList()) {
    if (cp.str < 2) continue;
    const want = Math.min(3, Math.floor(cp.str / 3) + 1);
    if (P.filter((a) => a.campId === cp.id).length < want) {
      P.push({ id: 'p' + G.nextId++, kind: 'bandits', campId: cp.id, name: cp.name, x: cp.x, y: cp.y, n: clamp(1 + Math.round(cp.str / 2.5), 2, 4), lvl: regionLevel(cp.x, cp.y, cp.str * 0.3), cool: 0 });
    }
  }
  // refugees in hard times
  const hard = G.world.era.type === 'war' || G.world.era.type === 'famine';
  if (hard && P.filter((a) => a.kind === 'refugees').length < 2 && towns.length >= 2) {
    const small = towns.slice().sort((a, b) => a.size - b.size)[0];
    const big = towns.filter((t) => t !== small && tileAt(t.x, t.y).land === tileAt(small.x, small.y).land).sort((a, b) => b.size - a.size)[0];
    if (big) P.push({ id: 'p' + G.nextId++, kind: 'refugees', x: small.x, y: small.y, toName: big.name, n: 3, lvl: 1, cool: 0 });
  }
  // rivals come looking for you
  for (const rv of Object.values(G.chars).filter((c) => c.alive && c.status === 'rival')) {
    if (P.some((a) => a.charId === rv.id)) continue;
    const spots = G.world.map.tiles.filter((t) => isLand(t) && t.land === tileAt(G.pos.x, G.pos.y).land && Math.hypot(t.x - G.pos.x, t.y - G.pos.y) > 10);
    if (spots.length) { const t = R.pick(spots); P.push({ id: 'p' + G.nextId++, kind: 'rival', charId: rv.id, name: rv.name, x: t.x, y: t.y, n: 3, lvl: rv.level, cool: 0 }); }
  }
};

// ---------------------------------------------------------------- meeting a party
Living.encounter = function (a, mine) {
  const d = this.danger(a);
  const party = G.party.map(ch).filter(Boolean);
  const tile = tileAt(Math.round(a.x), Math.round(a.y));
  const leave = (days = 6) => () => { a.cool = G.day + days; UI.closeAll(); Game.after(); };
  const fight = (title, enemies, after) => { UI.closeAll(); Game.battle(enemies, { kind: a.kind === 'rival' ? 'rival' : 'wild', title, after }); };
  const bandEnemies = () => Array.from({ length: a.n }, (_, i) => ({ type: i === 0 && a.n >= 3 ? 'raider' : 'bandit', lvl: a.lvl + (i === 0 ? 1 : 0) }));
  const head = h('p', { class: 'enc-danger ' + d.cls }, `Danger: ${d.label}`, h('small', { class: 'dim' }, ` · their strength ${Math.round(this.agentPower(a))} vs your ${Math.round(this.partyPower())}`));
  if (a.kind === 'bandits') {
    const bribe = a.n * 15;
    Events.frame('ambush', tile, mine ? `You catch ${a.name}` : `${a.name[0].toUpperCase() + a.name.slice(1)} attack!`,
      mine ? `You run down a war band of ${a.name}, about ${a.n * 4} strong.` : `A war band of ${a.name} has hunted you down. About ${a.n * 4} blades close in.`, [
        head,
        act('Fight', () => fight(a.name[0].toUpperCase() + a.name.slice(1), bandEnemies(), (res) => {
          if (res.outcome === 'victory') {
            a.dead = true; G.world.parties = G.world.parties.filter((x) => !x.dead);
            const cp = campsList().find((x) => x.id === a.campId); if (cp) cp.str = Math.max(0.5, cp.str - 0.6);
            G.house.gold += a.n * 12; G.house.prestige += 2; addProsperity(0.8); recordChoice('martial', 0.3, G.mcId);
            chron(`${ch(G.mcId).name}'s party broke a war band of ${a.name}.`, 'good', G.party.slice(), 'battle');
          } else a.cool = G.day + 15;
        }), { cls: 'danger' }),
        !mine ? act(`Bribe them (${bribe}g)`, () => { G.house.gold -= bribe; recordChoice('martial', -0.3, G.mcId); a.cool = G.day + 40; leave(40)(); }, { disabled: G.house.gold < bribe }) : null,
        !mine ? act('Try to flee', () => {
          const p = clamp(0.5 + G.house.up.horses * 0.12 + (hasTech('roads') ? 0.05 : 0) - (a.n - party.length) * 0.05, 0.2, 0.9);
          if (R.chance(p)) { UI.toast('You slip away.'); leave(8)(); } else { UI.toast('They cut you off!'); fight('Caught!', bandEnemies()); }
        }, { sub: 'faster with horses' }) : act('Leave them be', leave(5)),
      ]);
  } else if (a.kind === 'rival') {
    const rv = ch(a.charId);
    if (!rv || !rv.alive) { a.dead = true; return; }
    UI.closeAll();
    a.cool = G.day + 20;
    Game.rivalBattle(rv);
  } else if (a.kind === 'caravan') {
    Events.frame('trader', tile, `A Caravan to ${a.toName}`, `Merchants and their guards, ${a.n * 3} strong, bound for ${a.toName}. They eye your banner warily.`, [
      act('Trade with them', () => { UI.closeAll(); a.cool = G.day + 5; Events.ev_trader({ kind: 'trader', tile }); }),
      act('Rob the caravan', () => fight(`The ${a.toName} Caravan`, Array.from({ length: a.n }, () => ({ type: R.pick(['bandit', 'knight']), lvl: a.lvl })), (res) => {
        if (res.outcome === 'victory') {
          a.dead = true; G.world.parties = G.world.parties.filter((x) => !x.dead);
          G.house.gold += a.gold; G.house.prestige = Math.max(0, G.house.prestige - 4); G.house.scandal = (G.house.scandal || 0) + 0.1;
          recordChoice('charity', -1, G.mcId);
          const town = G.world.towns.find((t) => t.name === a.toName); if (town) town.growth = (town.growth || 0) - 0.15;
          chron(`${ch(G.mcId).name}'s party robbed a caravan bound for ${a.toName}, taking ${a.gold}g. Word spreads.`, 'bad', G.party.slice(), 'raid');
        }
      }), { cls: 'danger', sub: 'gold, but prestige and reputation suffer' }),
      act('Wish them well', leave(5)),
    ]);
  } else if (a.kind === 'refugees') {
    Events.frame('needy', tile, 'Refugees on the Road', `Families fleeing the ${GD.ERAS[G.world.era.type].short.toLowerCase()}, heading for ${a.toName}. They have little left.`, [
      act('Give them food and coin (40g)', () => {
        G.house.gold -= 40; addProsperity(1); G.house.prestige += Math.round(2 * repMult()); recordChoice('charity', 0.8, G.mcId);
        a.dead = true; G.world.parties = G.world.parties.filter((x) => !x.dead);
        chron(`${ch(G.mcId).name} gave aid to refugees bound for ${a.toName}.`, 'good', [G.mcId], 'deed');
        UI.closeAll(); Game.after();
      }, { disabled: G.house.gold < 40 }),
      act('Ride on', leave(10)),
    ]);
  }
};

// ---------------------------------------------------------------- drawing
Living.visibleAgents = function () {
  if (!G || !G.world || !G.world.parties || !G.ppos) return [];
  const s = this.partySight();
  return G.world.parties.filter((a) => dist2(a, G.ppos) <= s);
};
Living.drawAgent = function (r, a) {
  const c = r.ctx;
  const t = tileAt(Math.round(a.x), Math.round(a.y));
  const p = r.iso(a.x, a.y, t ? t.h : 1);
  if (r.flat && LS.ready) p.y -= LS.bridgeLift(a.x, a.y);
  const kind = AGENTS[a.kind];
  const look = (tunic, o = {}) => ({ skin: o.skin || '#d9a77e', hair: '#3a2a1a', tunic, race: o.race || 'human', stage: 'prime', gender: o.g || 'man', hairStyle: 'short', beard: !!o.beard });
  if (a.kind === 'caravan') {
    r.drawBox(p.x + 6, p.y + 2, 0.5, 0.3, 9, eraTint('#8a6a45'), eraTint('#e8dcc0'), 6);
    c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(p.x + 1, p.y + 5, 2.5, 0, Math.PI * 2); c.arc(p.x + 11, p.y + 7, 2.5, 0, Math.PI * 2); c.fill();
    r.drawFigure(p.x - 8, p.y + 4, look('#6a4c93', { beard: true }), 0.45, { bob: Living.moving ? Math.sin(r.t / 120) : 0 });
  } else if (a.kind === 'refugees') {
    r.drawFigure(p.x - 6, p.y + 3, look('#7b6a52'), 0.42, {});
    r.drawFigure(p.x + 4, p.y + 5, look('#6b5a4a', { g: 'woman' }), 0.42, {});
    r.drawFigure(p.x + 10, p.y + 2, { ...look('#4a5a6a'), stage: 'child' }, 0.42, {});
  } else {
    const n = Math.min(3, a.n);
    for (let i = 0; i < n; i++) r.drawFigure(p.x - 8 + i * 7, p.y + 3 + (i % 2) * 2, look(a.kind === 'rival' ? '#2a1420' : i ? '#4d3b2a' : '#5a2a2a'), 0.48, { weapon: 'sword', bob: Living.moving ? Math.sin(r.t / 100 + i) : 0 });
  }
  // banner
  c.strokeStyle = '#2a1a10'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(p.x - 12, p.y + 2); c.lineTo(p.x - 12, p.y - 34); c.stroke();
  c.fillStyle = kind.color;
  c.beginPath(); c.moveTo(p.x - 12, p.y - 34); c.lineTo(p.x, p.y - 31 + Math.sin(r.t / 260) * 1.5); c.lineTo(p.x - 12, p.y - 26); c.closePath(); c.fill();
  a._sx = p.x; a._sy = p.y;
  (this._labels || (this._labels = [])).push(a);
};
// labels go on top of everything else on the map
Living.drawLabels = function (r) {
  const c = r.ctx;
  for (const a of this._labels || []) this.drawLabel(r, c, a, { x: a._sx, y: a._sy });
  this._labels = [];
};
Living.drawLabel = function (r, c, a, p) {
  const d = this.danger(a);
  const lab = this.label(a);
  c.font = '600 11px Georgia, serif'; c.textAlign = 'center';
  const tw = c.measureText(lab).width + 12;
  const col = { good: '#5fb36a', dim: '#c9a24a', warn: '#e0904a', bad: '#e0503a' }[d.cls];
  c.fillStyle = 'rgba(15,12,18,0.82)'; c.fillRect(p.x - tw / 2, p.y - 52, tw, 15);
  c.fillStyle = col; c.fillRect(p.x - tw / 2, p.y - 38, tw, 2);
  c.fillStyle = '#f2ead8'; c.fillText(lab, p.x, p.y - 41);
  if (a.hunting) { c.fillStyle = '#ff5c5c'; c.font = 'bold 14px Georgia, serif'; c.fillText('!', p.x + tw / 2 + 6, p.y - 40); }
};
Living.drawDest = function (r) {
  if (!this.moving || !this.dest) return;
  const t = this.dest;
  const p = r.iso(t.x, t.y, t.h);
  const c = r.ctx;
  c.strokeStyle = '#ffd76a'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(p.x, p.y, 14, 7, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x, p.y - 22); c.stroke();
  c.fillStyle = G.house.color; c.beginPath(); c.moveTo(p.x, p.y - 22); c.lineTo(p.x + 10, p.y - 18); c.lineTo(p.x, p.y - 14); c.closePath(); c.fill();
};
// tap on a party (in un-zoomed screen space)
Living.pick = function (pt) {
  let best = null, bd = 26;
  for (const a of this.visibleAgents()) {
    if (a._sx == null) continue;
    const dd = Math.hypot(pt.x - a._sx, pt.y - (a._sy - 14));
    if (dd < bd) { bd = dd; best = a; }
  }
  return best;
};

// the movement loop runs alongside rendering
(function loop(ts) { try { Living.frame(ts); } catch (e) { console.error(e); Living.stop(); } requestAnimationFrame(loop); })(0);
