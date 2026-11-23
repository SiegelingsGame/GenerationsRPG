// Monster dens: map sites that spawn over the years, a starter main quest, side diversions,
// and a first-person nest delve that ends in combat.
'use strict';

const DEN_NAMES = {
  a: ['Hollow', 'Thorn', 'Bone', 'Ashen', 'Murk', 'Fang', 'Rot', 'Silent', 'Iron', 'Bleak'],
  b: ['Den', 'Nest', 'Lair', 'Burrow', 'Hollow', 'Pit'],
};

function densList() { return G.world.dens || (G.world.dens = []); }

const Dens = {
  ensure() {
    if (!G.world.dens) G.world.dens = [];
    if (!G.world.densQuests) {
      G.world.densQuests = {
        main: null,
        side: {
          hunt: { id: 'hunt-pack', status: 'locked', title: 'Hunt the Dens Pack', desc: 'A dens pack prowls the roads. Ambush or track them near a dens.' },
          rescue: { id: 'rescue-traveler', status: 'locked', title: 'Traveler Near the Dens', desc: 'Someone is trapped near a dens. Find and rescue them.' },
          trophies: { id: 'gather-trophies', status: 'locked', title: 'Dens Trophies', desc: 'A town contact wants dens trophies. Collect 3 from dens beasts.', need: 3, have: 0 },
        },
        trophies: 0,
      };
    }
    return G.world.densQuests;
  },

  // One dens near the estate as the generation's starter main quest.
  placeStarter() {
    this.ensure();
    if (densList().some((d) => d.main)) return densList().find((d) => d.main);
    const est = G.world.estate;
    const spots = G.world.map.tiles.filter((t) =>
      isLand(t) && !t.feature && t.land === G.world.mainland &&
      ['forest', 'hills', 'grass', 'swamp', 'jungle'].includes(t.type) &&
      Math.abs(t.x - est.x) + Math.abs(t.y - est.y) >= 2 &&
      Math.abs(t.x - est.x) + Math.abs(t.y - est.y) <= 7);
    const t = spots.length ? R.pick(spots) : G.world.map.tiles.find((x) => isLand(x) && !x.feature);
    if (!t) return null;
    const den = this.add(t, { main: true, name: 'the Starter Dens', threat: 1.2, known: true });
    const q = this.ensure();
    q.main = {
      id: 'clear-starter-dens',
      status: 'active',
      title: 'Seal the Nest',
      desc: `Clear the dens at ${den.place || 'the nearby nest'} and seal the brood before it spills onto the roads.`,
      densId: den.id,
      x: den.x,
      y: den.y,
    };
    chron(`Scouts mark a dens near the estate. Clearing it is House ${G.house.name}'s first charge against the wild.`, 'dim', [], 'dens');
    return den;
  },

  add(t, opts = {}) {
    this.ensure();
    const name = opts.name || `the ${R.pick(DEN_NAMES.a)} ${R.pick(DEN_NAMES.b)}`;
    const den = {
      id: opts.id || ('d' + Date.now().toString(36) + R.int(0, 999)),
      x: t.x,
      y: t.y,
      name,
      place: questPlace(t),
      threat: opts.threat != null ? opts.threat : R.float(1, 2.4),
      founded: year(),
      main: !!opts.main,
      cleared: false,
      known: opts.known !== false,
    };
    densList().push(den);
    t.feature = 'dens';
    t.densId = den.id;
    if (typeof WorldArt !== 'undefined') WorldArt.ensure();
    return den;
  },

  find(id) { return densList().find((d) => d.id === id); },
  atTile(t) { return t && t.feature === 'dens' ? this.find(t.densId) : null; },

  // Cap scales with estate tier and softens in golden ages.
  maxActive() {
    const tier = G.house?.tier || 0;
    const soft = G.world.era?.type === 'golden' ? 1 : 0;
    return Math.max(1, 1 + tier - soft + (G.world.era?.type === 'war' || G.world.era?.type === 'famine' ? 1 : 0));
  },

  yearly() {
    if (!G.world?.map) return;
    this.ensure();
    const active = densList().filter((d) => !d.cleared);
    for (const den of active) {
      den.threat = Math.min(8, den.threat + 0.12 + (G.world.era.type === 'war' || G.world.era.type === 'famine' ? 0.2 : 0));
      const t = tileAt(den.x, den.y);
      if (t && !t.feature) { t.feature = 'dens'; t.densId = den.id; }
      // Spill: dens that grow loud enough start hunting the roads.
      if (den.threat >= 2.2 && R.chance(0.18)) {
        den.known = true;
        chron(`Beasts spill from ${den.name} onto the nearby roads.`, 'bad', [], 'dens');
        this.unlockSide('hunt');
      }
    }
    if (active.length < this.maxActive() && R.chance(0.1 + (G.world.era.type === 'war' || G.world.era.type === 'famine' ? 0.12 : 0))) {
      const taken = [...liveTowns(), G.world.estate, ...densList(), ...(G.world.camps || [])];
      const spots = G.world.map.tiles.filter((t) =>
        ['forest', 'hills', 'grass', 'swamp', 'jungle'].includes(t.type) && !t.feature &&
        taken.every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= 5));
      if (spots.length) {
        const den = this.add(R.pick(spots), { known: R.chance(0.55) });
        chron(den.known
          ? `A new dens, ${den.name}, is reported in the ${GD.BIOMES[tileAt(den.x, den.y).type].name.toLowerCase()}.`
          : 'Shepherds speak of something nesting beyond the roads.', den.known ? 'bad' : 'dim', [], 'dens');
        if (den.known) this.unlockSide('rescue');
      }
    }
  },

  unlockSide(key) {
    const q = this.ensure().side[key];
    if (!q || q.status !== 'locked') return;
    q.status = 'active';
    Log.add(`Side quest: ${q.title}.`, 'good');
  },

  markTrophy(n = 1) {
    const q = this.ensure();
    q.trophies = (q.trophies || 0) + n;
    const side = q.side.trophies;
    if (side.status === 'locked') this.unlockSide('trophies');
    if (side.status === 'active') {
      side.have = Math.min(side.need, (side.have || 0) + n);
      if (side.have >= side.need) this.completeSide('trophies');
    }
  },

  completeSide(key) {
    const side = this.ensure().side[key];
    if (!side || side.status === 'done') return;
    side.status = 'done';
    const gold = key === 'trophies' ? 90 : 55;
    const prestige = key === 'trophies' ? 4 : 3;
    G.house.gold += gold;
    G.house.prestige += prestige;
    addProsperity(1);
    chron(`House ${G.house.name} finished "${side.title}" (+${gold}g, +${prestige} prestige).`, 'good', [G.mcId], 'dens');
    Log.add(`Quest complete: ${side.title}.`, 'good');
  },

  completeMain(den) {
    const q = this.ensure();
    if (!q.main || q.main.status === 'done') return;
    if (q.main.densId && den && den.id !== q.main.densId) return;
    q.main.status = 'done';
    G.house.prestige += 6;
    G.house.gold += 120;
    addProsperity(3);
    chron(`${ch(G.mcId).name} sealed ${den ? den.name : 'the dens'}, raising the House's first wild ward of renown.`, 'good', G.party.slice(), 'dens');
    this.unlockSide('trophies');
    this.unlockSide('hunt');
  },

  clear(den, res) {
    if (!den || den.cleared) return;
    const threat = den.threat || 1;
    den.cleared = true;
    den.threat = 0;
    const t = tileAt(den.x, den.y);
    if (t && t.feature === 'dens') { t.feature = null; t.densId = null; }
    const gold = Math.round(70 * (1 + threat * 0.4) * era().income);
    G.house.gold += gold;
    G.house.prestige += Math.round(3 + (den.main ? 2 : 0));
    addProsperity(den.main ? 2.5 : 1.5);
    this.markTrophy(den.main ? 2 : 1);
    recordChoice('martial', 0.5, G.mcId);
    chron(`House ${G.house.name} cleared ${den.name} and took ${gold}g in dens spoils.`, 'good', G.party.slice(), 'dens');
    if (den.main) this.completeMain(den);
    const side = this.ensure().side;
    if (side.hunt.status === 'active') this.completeSide('hunt');
  },

  near(tile, r = 4) {
    return densList().find((d) => !d.cleared && Math.abs(d.x - tile.x) + Math.abs(d.y - tile.y) <= r);
  },

  // Hook into road events: dens spill, rescue, hunt.
  biasEvent(ev) {
    const den = this.near(ev.tile, 4);
    if (!den) return ev;
    if (R.chance(0.35)) {
      this.unlockSide('hunt');
      return { kind: 'dens_pack', tile: ev.tile, dens: den };
    }
    if (R.chance(0.2)) {
      this.unlockSide('rescue');
      return { kind: 'dens_rescue', tile: ev.tile, dens: den };
    }
    if (den.threat >= 2 && R.chance(0.45)) {
      return { kind: 'dens_spill', tile: ev.tile, dens: den };
    }
    return ev;
  },

  drawFeature(r, t, p) {
    const c = r.ctx;
    const den = this.atTile(t);
    c.fillStyle = eraTint('#4a3a2a');
    c.beginPath(); c.moveTo(p.x - 20, p.y + 8); c.lineTo(p.x - 8, p.y - 16); c.lineTo(p.x + 12, p.y - 18); c.lineTo(p.x + 22, p.y + 8); c.closePath(); c.fill();
    c.fillStyle = '#0a080c';
    c.beginPath(); c.ellipse(p.x + 1, p.y + 4, 10, 12, 0, Math.PI, 0); c.fill();
    c.fillRect(p.x - 9, p.y + 4, 20, 5);
    // pulsing eyes
    const f = 0.45 + Math.sin(r.t / 120) * 0.35;
    c.fillStyle = `rgba(220,80,40,${f})`;
    c.beginPath(); c.arc(p.x - 3, p.y + 2, 2.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(p.x + 5, p.y + 2, 2.2, 0, Math.PI * 2); c.fill();
    if (den?.main && !den.cleared) {
      c.fillStyle = '#e6c06a';
      c.beginPath(); c.moveTo(p.x, p.y - 28); c.lineTo(p.x + 5, p.y - 18); c.lineTo(p.x - 5, p.y - 18); c.closePath(); c.fill();
    }
  },

  label(t) {
    const den = this.atTile(t);
    if (!den) return 'Dens';
    return den.cleared ? 'Sealed Dens' : (den.main ? `${den.name.replace(/^the /, '').replace(/\b\w/g, (c) => c.toUpperCase())} (Main Quest)` : den.name.replace(/^the /, '').replace(/\b\w/g, (c) => c.toUpperCase()));
  },

  panel(t) {
    const den = this.atTile(t);
    if (!den) return [h('h3', {}, 'A sealed dens'), h('p', { class: 'dim' }, 'Only scorched earth and old bones remain.')];
    const q = this.ensure();
    const isMain = q.main && q.main.densId === den.id && q.main.status === 'active';
    return [
      h('h3', {}, den.name.replace(/^the /, '').replace(/\b\w/g, (c) => c.toUpperCase())),
      h('p', { class: 'dim' }, `A monster dens nesting since ${den.founded}. Threat ${den.threat.toFixed(1)}. Beasts spill onto nearby roads as it grows.`),
      isMain ? h('p', { class: 'good small' }, 'Main quest: seal this nest.') : null,
      act('Enter dens', () => DensView.start(den), { cls: 'danger', sub: 'first-person delve · clear the brood' }),
    ];
  },

  questRows() {
    const q = this.ensure();
    const rows = [];
    if (q.main) {
      rows.push(h('div', { class: 'quest dens-quest' },
        h('b', {}, `${q.main.status === 'done' ? '✓ ' : ''}${q.main.title}`),
        h('p', { class: 'small' }, q.main.desc),
        q.main.status !== 'done' && q.main.x != null ? h('small', { class: 'dim' }, `Marked on the map near ${q.main.x}, ${q.main.y}.`) : h('small', { class: 'good' }, 'Nest sealed.')));
    }
    for (const side of Object.values(q.side)) {
      if (side.status === 'locked') continue;
      rows.push(h('div', { class: 'quest dens-quest side' },
        h('b', {}, `${side.status === 'done' ? '✓ ' : ''}${side.title}`),
        h('p', { class: 'small' }, side.desc),
        side.need ? h('small', { class: 'dim' }, `Trophies ${side.have || 0}/${side.need}`) : null));
    }
    return rows;
  },
};

// ---------------------------------------------------------------- road hooks (called from Events)
Events.ev_dens_pack = function (ev) {
  const den = ev.dens;
  Dens.unlockSide('hunt');
  this.frame('ambush', ev.tile, 'A Dens Pack', `A pack from ${den.name} blocks the road, smelling of wet fur and old blood.`, [
    act('Hunt them down', () => {
      UI.closeAll();
      const lvl = Math.max(1, Math.round(partyLevel() + den.threat * 0.4));
      Game.battle(Array.from({ length: 3 }, () => ({ type: R.pick(['wolf', 'boar', 'jaguar', 'frostwolf']), lvl })), {
        kind: 'wild', title: 'Dens Pack',
        after: (res) => {
          if (res.outcome === 'victory') {
            Dens.markTrophy(1);
            Dens.completeSide('hunt');
          }
        },
      });
    }, { cls: 'danger' }),
    act('Drive them off', () => { Dens.markTrophy(1); this.done('The pack scatters into the brush.'); }),
    act('Ride hard past them', () => this.done('You leave the pack snarling behind you.', 'dim')),
  ]);
};
Events.ev_dens_rescue = function (ev) {
  const den = ev.dens;
  Dens.unlockSide('rescue');
  this.frame('needy', ev.tile, 'Traveler Near the Dens', `A traveler clings to a fallen tree near ${den.name}. Something large circles in the brush.`, [
    act('Rescue them', () => {
      UI.closeAll();
      Game.battle(Array.from({ length: 2 }, () => ({ type: R.pick(['wolf', 'boar']), lvl: Math.max(1, Math.round(partyLevel() + 0.5)) })), {
        kind: 'wild', title: 'Dens Ambush',
        after: (res) => {
          if (res.outcome !== 'victory') return;
          Dens.completeSide('rescue');
          G.house.prestige += 2;
          addProsperity(1);
          if (R.chance(0.4)) {
            const c = makeChar({ birth: 'lowborn', status: 'npc', town: randomTownIdx() });
            Log.add(`${c.name} is safe. They will remember House ${G.house.name}.`, 'good');
            addBond(c, ch(G.mcId), 20);
          } else Log.add('The traveler limps toward the nearest town.', 'good');
        },
      });
    }, { cls: 'hl' }),
    act('Leave them', () => { recordChoice('charity', -0.4, G.mcId); this.done('Their cries fade behind you.', 'bad'); }),
  ]);
};
Events.ev_dens_spill = function (ev) {
  const den = ev.dens;
  this.frame('ambush', ev.tile, 'Spill from the Dens', `Monsters from ${den.name} pour across the track.`, [
    act('Stand and fight', () => {
      UI.closeAll();
      Game.battle(Array.from({ length: clamp(2 + Math.floor(den.threat / 2), 2, 4) }, () => ({ type: R.pick(['wolf', 'boar', 'troll', 'ghoul']), lvl: Math.max(1, Math.round(partyLevel() + den.threat * 0.35)) })), {
        kind: 'wild', title: 'Dens Spill',
        after: (res) => { if (res.outcome === 'victory') Dens.markTrophy(1); },
      });
    }, { cls: 'danger' }),
    act('Flee the road', () => this.done('You cut inland until the howling fades.', 'dim')),
  ]);
};

// Patch Events.roll / draw / label / panel / yearly without rewriting camps.
(function patchEventsForDens() {
  const roll = Events.roll.bind(Events);
  Events.roll = function (tile) {
    const ev = roll(tile);
    return Dens.biasEvent(ev);
  };
  const draw = Events.drawFeature.bind(Events);
  Events.drawFeature = function (r, t, p) {
    if (t.feature === 'dens') return Dens.drawFeature(r, t, p);
    return draw(r, t, p);
  };
  const label = Events.label.bind(Events);
  Events.label = function (t) {
    if (t.feature === 'dens') return Dens.label(t);
    return label(t);
  };
  const panel = Events.panel.bind(Events);
  Events.panel = function (t) {
    if (t.feature === 'dens') return Dens.panel(t);
    return panel(t);
  };
  const yearly = Events.yearly.bind(Events);
  Events.yearly = function () {
    yearly();
    Dens.yearly();
  };
})();

// ---------------------------------------------------------------- first-person dens delve
const DensView = { open: false };

DensView.start = function (den) {
  if (this.open || !den || den.cleared) return;
  UI.closeAll();
  Living.stop();
  this.open = true;
  this.den = den;
  this.chamber = 0; // 0 mouth, 1 tunnel, 2 nest
  this.selected = null;
  this.hover = null;
  this.seed = (den.x * 7919 + den.y * 104729) % 100000;
  this.cv = h('canvas', { class: 'town-canvas' });
  this.say = h('div', { class: 'camp-say' });
  this.btns = h('div', { class: 'camp-btns' });
  this.el = h('div', { class: 'townview densview' }, this.cv, h('div', { class: 'camp-ui town-ui' }, this.say, this.btns));
  document.body.append(this.el);
  this.cv.addEventListener('click', (e) => this.click(e));
  this.cv.addEventListener('mousemove', (e) => { this.hover = this.hit(e); this.cv.style.cursor = this.hover ? 'pointer' : 'default'; });
  this.greet();
  this.renderButtons();
  const loop = (ts) => { if (!this.open) return; this.t = ts; try { this.draw(); } catch (err) { console.error(err); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
DensView.close = function () {
  if (!this.open) return;
  this.open = false;
  if (this.el) this.el.remove();
  this.el = null;
  UI.refresh();
};
DensView.greet = function () {
  const lines = [
    `The mouth of ${this.den.name} breathes warm, foul air. Claw marks score the stone.`,
    'A low tunnel smells of musk and old kills. Something scrapes ahead.',
    'The nest chamber opens: bones, torn banners, and eyes in the dark.',
  ];
  this.setSay(lines[this.chamber] || lines[0]);
};
DensView.setSay = function (text) {
  this.say.replaceChildren(h('div', {}, h('p', {}, text)));
};
DensView.renderButtons = function () {
  const b = (label, fn, opts = {}) => h('button', { class: 'camp-btn' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, onclick: fn }, label);
  if (this.chamber < 2) {
    this.btns.replaceChildren(
      b('Delve deeper', () => { this.chamber++; advanceDays(1); this.greet(); this.renderButtons(); }, { cls: 'hl' }),
      b('Leave dens', () => this.close(), { cls: 'leave' }),
    );
    return;
  }
  this.btns.replaceChildren(
    b('Fight the brood', () => this.fightNest(), { cls: 'danger' }),
    b('Search for trophies', () => {
      Dens.markTrophy(1);
      this.setSay('You pry a dens trophy from a ribcage of bone.');
      this.renderButtons();
    }),
    b('Retreat', () => this.close(), { cls: 'leave' }),
  );
};
DensView.fightNest = function () {
  const den = this.den;
  const n = clamp(2 + Math.floor(den.threat / 2), 2, 4);
  const lvl = Math.max(1, Math.round(partyLevel() + den.threat * 0.5 + (den.main ? 0.5 : 0)));
  const enemies = Array.from({ length: n }, (_, i) => ({
    type: i === 0 ? R.pick(['troll', 'jaguar', 'frostwolf']) : R.pick(['wolf', 'boar', 'ghoul', 'jaguar']),
    lvl: lvl + (i === 0 ? 1 : 0),
  }));
  this.close();
  Game.battle(enemies, {
    kind: 'dungeon',
    title: den.name.replace(/^the /, '').replace(/\b\w/g, (c) => c.toUpperCase()),
    intro: 'The dens brood surges from the nest!',
    after: (res) => {
      if (res.outcome === 'victory') Dens.clear(den, res);
    },
  });
};
DensView.draw = function () {
  const cv = this.cv;
  const dpr = window.devicePixelRatio || 1;
  const W = this.W = cv.clientWidth, H = this.H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = (this.t || 0) / 1000;
  // cave walls in perspective
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a1520'); sky.addColorStop(0.45, '#2a2218'); sky.addColorStop(1, '#12100e');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  const hz = H * 0.38;
  c.fillStyle = '#3a3228';
  c.beginPath(); c.moveTo(0, hz); c.lineTo(W * 0.35, hz + 20); c.lineTo(W * 0.65, hz + 20); c.lineTo(W, hz); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  // tunnel mouth
  const mx = W / 2, my = hz + 30 + this.chamber * 8;
  c.fillStyle = '#050308';
  c.beginPath(); c.ellipse(mx, my + 40, 70 - this.chamber * 8, 90 - this.chamber * 10, 0, Math.PI, 0); c.fill();
  c.fillRect(mx - 70 + this.chamber * 8, my + 40, 140 - this.chamber * 16, H - my);
  // glowing eyes / nest
  const pulse = 0.4 + Math.sin(t * 3) * 0.35;
  if (this.chamber >= 1) {
    c.fillStyle = `rgba(220,70,30,${pulse})`;
    c.beginPath(); c.arc(mx - 18, my + 50, 4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(mx + 22, my + 48, 4, 0, Math.PI * 2); c.fill();
  }
  if (this.chamber >= 2) {
    c.fillStyle = '#5a4030';
    c.beginPath(); c.ellipse(mx, my + 110, 90, 28, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 5; i++) {
      c.fillStyle = `rgba(200,60,30,${0.3 + pulse * 0.4})`;
      c.beginPath(); c.arc(mx - 50 + i * 25, my + 95 + (i % 2) * 8, 3.5, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(230,192,106,0.85)';
    c.font = '600 15px Georgia, serif'; c.textAlign = 'center';
    c.fillText('The Nest', mx, my + 20);
  }
  // party silhouettes at bottom edge (first person feel)
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(0, H - 90, W, 90);
  const saved = Render.ctx; Render.ctx = c;
  try {
    const party = G.party.map(ch).filter(Boolean).slice(0, 3);
    party.forEach((p, i) => Render.drawFigure(W * 0.22 + i * 70, H - 30, figLook(p), 1.05, {}));
  } finally { Render.ctx = saved; }
  this.hot = this.chamber >= 2 ? [{ kind: 'nest', x0: mx - 80, x1: mx + 80, y0: my + 40, y1: my + 140 }] : [];
};
DensView.hit = function (e) {
  if (!this.hot) return null;
  const r = this.cv.getBoundingClientRect();
  const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
  return this.hot.find((h) => pt.x >= h.x0 && pt.x <= h.x1 && pt.y >= h.y0 && pt.y <= h.y1) || null;
};
DensView.click = function (e) {
  const hs = this.hit(e);
  if (hs && hs.kind === 'nest') this.fightNest();
};
