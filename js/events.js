// Things that happen on the road: traders, ambushes, people in need, mines, caves and bandit camps,
// plus the campfire, seen through the eyes of the head of House.
'use strict';

const Events = {};

// ---------------------------------------------------------------- helpers
function bestStat(k) {
  const party = G.party.map(ch).filter((c) => c && c.alive);
  return party.reduce((b, c) => (stat(c, k) > (b ? stat(b, k) : -1) ? c : b), null);
}
function check(k, diff) {
  const c = bestStat(k);
  const p = clamp(0.4 + (stat(c, k) - diff) * 0.07, 0.1, 0.92);
  return { ok: R.chance(p), c, p };
}
function nearestTown(x, y) {
  return liveTowns().sort((a, b) => (Math.abs(a.x - x) + Math.abs(a.y - y)) - (Math.abs(b.x - x) + Math.abs(b.y - y)))[0];
}
function campsList() { return G.world.camps || (G.world.camps = []); }
const CAMP_NAMES = { a: ['Red', 'Black', 'Ashen', 'Grey', 'Bloody', 'Hollow', 'Broken', 'Iron', 'Crooked', 'Silent'], b: ['Hand', 'Crows', 'Knives', 'Wolves', 'Brotherhood', 'Hoods', 'Fangs', 'Company', 'Rats', 'Banner'] };

// a small 2.5D vignette for each kind of event
Events.vignette = function (kind, tile) {
  const W = 560, H = 150, d = 2;
  const cv = document.createElement('canvas');
  cv.width = W * d; cv.height = H * d; cv.className = 'vignette';
  const c = cv.getContext('2d');
  c.scale(d, d);
  const biome = GD.BIOMES[tile.type] || GD.BIOMES.grass;
  const sky = c.createLinearGradient(0, 0, 0, H);
  const dark = kind === 'cave' || kind === 'camp' || kind === 'ambush';
  sky.addColorStop(0, dark ? '#1c1a2a' : '#5b7ea8'); sky.addColorStop(1, dark ? '#3a2a2a' : '#c9b48a');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  c.fillStyle = shade(biome.top, -0.25);
  c.beginPath(); c.moveTo(0, 95); for (let x = 0; x <= W; x += 40) c.lineTo(x, 88 + Math.sin(x * 0.03) * 8); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
  c.fillStyle = biome.top; c.fillRect(0, 110, W, 40);
  const saved = Render.ctx; Render.ctx = c;
  try {
    const party = G.party.map(ch).filter(Boolean);
    party.forEach((p, i) => Render.drawFigure(70 + i * 34, 135, figLook(p), 0.9, {}));
    const npc = (x, tunic, o = {}) => Render.drawFigure(x, 135, { skin: o.skin || '#d9a77e', hair: o.hair || '#3a2a1a', tunic, race: o.race || 'human', stage: o.stage || 'prime', gender: o.gender || 'man', hairStyle: o.hs || 'short', beard: o.beard }, o.s || 0.9, { weapon: o.weapon });
    if (kind === 'trader') {
      Render.drawBox(420, 128, 1.4, 0.8, 22, '#8a6a45', '#c8b08c', 14);
      c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(395, 130, 8, 0, Math.PI * 2); c.arc(450, 132, 8, 0, Math.PI * 2); c.fill();
      npc(360, '#6a4c93', { beard: true });
    } else if (kind === 'needy' || kind === 'child') {
      npc(380, '#7b6a52'); if (kind === 'child') npc(420, '#5a7a8a', { stage: 'child', gender: R.chance(0.5) ? 'man' : 'woman' }); else { npc(415, '#6b5a4a', { gender: 'woman', hs: 'long' }); npc(450, '#4a5a6a', { stage: 'child' }); }
    } else if (kind === 'wanderer') {
      npc(400, '#3f6b3a', { weapon: 'staff' });
    } else if (kind === 'mine' || kind === 'cave') {
      c.fillStyle = '#5a5550'; c.beginPath(); c.moveTo(330, 140); c.lineTo(380, 60); c.lineTo(470, 52); c.lineTo(540, 140); c.closePath(); c.fill();
      c.fillStyle = '#0c0a0e'; c.beginPath(); c.ellipse(440, 125, 28, 32, 0, Math.PI, 0); c.fill(); c.fillRect(412, 125, 56, 15);
      if (kind === 'mine') { c.fillStyle = '#7a5a3a'; c.fillRect(408, 88, 6, 52); c.fillRect(466, 88, 6, 52); c.fillRect(404, 86, 72, 6); }
    } else if (kind === 'camp' || kind === 'ambush') {
      if (kind === 'camp') {
        c.fillStyle = '#6b4a32'; c.beginPath(); c.moveTo(380, 135); c.lineTo(410, 95); c.lineTo(440, 135); c.closePath(); c.fill();
        c.fillStyle = '#7a3a2a'; c.beginPath(); c.moveTo(450, 135); c.lineTo(475, 100); c.lineTo(500, 135); c.closePath(); c.fill();
        c.fillStyle = '#ff9a3d'; c.beginPath(); c.moveTo(355, 135); c.lineTo(362, 115); c.lineTo(369, 135); c.closePath(); c.fill();
      }
      npc(kind === 'camp' ? 330 : 380, '#4d3b2a', { weapon: 'sword' }); npc(kind === 'camp' ? 520 : 430, '#5a2a2a', { weapon: 'sword' });
    }
  } finally { Render.ctx = saved; }
  return cv;
};

// ---------------------------------------------------------------- rolling events on the road
Events.roll = function (tile) {
  const E = G.world.era.type;
  const hard = E === 'war' || E === 'famine';
  const good = E === 'peace' || E === 'abundance' || E === 'golden';
  const t = tile.type;
  const nearCamp = campsList().find((cp) => Math.abs(cp.x - tile.x) + Math.abs(cp.y - tile.y) <= 4);
  const w = {
    ambush: 3 * era().enc * (nearCamp ? 1.8 : 1),
    trader: (good ? 2.4 : hard ? 0.8 : 1.6) * (['swamp', 'snow'].includes(t) ? 0.5 : 1),
    needy: hard ? 2.4 : 1.2,
    child: 0.35,
    wanderer: 0.7,
    mine: ['hills', 'mountain', 'desert'].includes(t) ? 1.4 : 0,
    cave: ['hills', 'mountain', 'forest', 'jungle', 'snow'].includes(t) ? 1.2 : 0.3,
    camp: ['forest', 'hills', 'grass', 'swamp', 'jungle'].includes(t) && !nearCamp ? (hard ? 1.4 : 0.5) : 0,
  };
  const kind = R.weighted(w);
  return { kind, tile, camp: nearCamp };
};

Events.show = function (ev) {
  const f = this['ev_' + ev.kind];
  if (f) f.call(this, ev);
};

Events.frame = function (kind, tile, title, text, options) {
  UI.modal(h('div', { class: 'event' },
    this.vignette(kind, tile),
    h('p', {}, text),
    h('div', { class: 'ev-opts' }, options.filter(Boolean))), { title, wide: true, locked: true });
};
Events.done = function (msg, kind = 'good') {
  UI.closeAll();
  if (msg) { Log.add(msg, kind); UI.toast(msg); }
  Game.after();
};

Events.ev_ambush = function (ev) {
  if (ev.camp && ev.camp.str >= 2) return this.campAmbush(ev.camp);
  Game.battle(buildEncounter(ev.tile), { kind: 'wild', title: 'Ambush on the road' });
};

Events.ev_trader = function (ev) {
  const tile = ev.tile;
  const party = G.party.map(ch).filter(Boolean);
  const maxTier = Math.min(GD.GEAR.length, 3 + G.house.up.armory + Math.floor(G.house.tier / 2));
  const who = R.pick(party);
  Equip.ensureChar(who);
  const offers = Equip.marketOffers(who, maxTier).filter((o) => o.slot === 'hand' || o.slot === 'body');
  const offer = offers.length ? R.pick(offers) : null;
  const gearCost = offer ? Math.round(offer.cost * R.float(0.75, 1.0) * (2 - repMult())) : 0;
  const tonicStat = R.pick(STATS);
  const tonicCost = 140;
  const name = R.pick(['Odo the Peddler', 'a caravan from the far south', 'a dwarven tinker', 'an elven spice merchant', 'a halfling with a laden mule']);
  const buy = (fn) => () => { fn(); UI.closeAll(); this.ev_trader_more(ev, name); };
  this.frame('trader', tile, 'A Trader on the Road', `You meet ${name}. Their wares are laid out on a blanket by the road.`, [
    act('Potion', buy(() => { G.house.gold -= 18; G.house.potions++; }), { sub: '18g, cheaper than town', disabled: G.house.gold < 18 }),
    offer ? act(`${offer.item.name} for ${who.name}`, buy(() => {
      G.house.gold -= gearCost;
      const item = Equip.makeItem(offer.kind, offer.item.tier);
      Equip.addToStash(item);
      Equip.equipItem(who, item, true);
    }), { sub: `${gearCost}g`, disabled: G.house.gold < gearCost }) : null,
    act(`Tonic of ${STAT_NAMES[tonicStat]}`, buy(() => { G.house.gold -= tonicCost; const c = R.pick(party); c.bonus[tonicStat] += 1; UI.toast(`${c.name} drinks it: +1 ${STAT_NAMES[tonicStat]} for life.`); }), { sub: `${tonicCost}g · +1 ${STAT_NAMES[tonicStat]} for life, to a random companion`, disabled: G.house.gold < tonicCost }),
    act('Buy a map of the area', buy(() => { G.house.gold -= 40; this.revealNearby(tile); }), { sub: '40g · marks a nearby cave or mine', disabled: G.house.gold < 40 }),
    act('Go on your way', () => this.done()),
  ]);
};
Events.ev_trader_more = function (ev, name) {
  UI.refresh();
  this.frame('trader', ev.tile, 'A Trader on the Road', `${name} smiles and packs up the coins. "Anything else?"`, [
    act('Look again', () => { UI.closeAll(); this.ev_trader(ev); }),
    act('Go on your way', () => this.done()),
  ]);
};
Events.revealNearby = function (tile) {
  const spots = G.world.map.tiles.filter((t) => isLand(t) && !t.feature && ['hills', 'mountain', 'forest', 'snow', 'desert', 'jungle'].includes(t.type) &&
    Math.abs(t.x - tile.x) + Math.abs(t.y - tile.y) <= 7 && Math.abs(t.x - tile.x) + Math.abs(t.y - tile.y) >= 2);
  if (!spots.length) return UI.toast('The map shows nothing new.');
  const t = R.pick(spots);
  if (['hills', 'mountain', 'desert'].includes(t.type) && R.chance(0.5)) { t.feature = 'mine'; t.richness = R.int(2, 5); }
  else { t.feature = 'cave'; t.depth = R.int(3, 5); }
  Log.add(`The map marks a ${t.feature} nearby.`, 'good');
};

Events.ev_needy = function (ev) {
  const E = G.world.era.type;
  const variant = R.pick(E === 'war' ? ['refugees', 'wounded', 'cart'] : E === 'famine' ? ['refugees', 'starving', 'cart'] : ['cart', 'wounded', 'wolves', 'starving']);
  const mc = ch(G.mcId);
  const ruse = R.chance(0.12);
  const help = (cost, days, pros, pres, msg) => () => {
    if (cost) G.house.gold -= cost;
    if (days) advanceDays(days);
    if (ruse) { UI.closeAll(); UI.toast('It was a ruse!'); return Game.battle(buildEncounter(ev.tile, { count: 3 }), { kind: 'wild', title: 'A Trap', intro: 'The "travelers" draw knives. It was a trap!' }); }
    addProsperity(pros);
    G.house.prestige += Math.round(pres * repMult());
    recordChoice('charity', 0.8, mc.id);
    G.party.map(ch).forEach((c) => { addFormative(c, 1); c.loyalty = clamp(c.loyalty + 2, -100, 100); });
    chron(msg, 'good', [mc.id], 'deed');
    this.done();
  };
  const ignore = () => { recordChoice('charity', -0.4, mc.id); this.done('You leave them to their fate.', 'dim'); };
  const T = {
    cart: ['A Cart in the Mud', 'A farmer and their family struggle with a cart sunk to the axles in mud.',
      [act('Help push it free', help(0, 3, 0.5, 1, `${mc.name}'s party helped a farmer on the road.`), { sub: '3 days · prestige, prosperity' })]],
    refugees: ['Refugees', `A column of refugees trudges past, fleeing the ${GD.ERAS[E].short.toLowerCase()}. Children ride on their parents' shoulders.`,
      [act('Give them food and coin', help(50, 1, 1.5, 3, `${mc.name} gave food and coin to refugees on the road.`), { sub: '50g · prestige, prosperity', disabled: G.house.gold < 50 }),
        act('Escort them to the nearest town', help(0, 12, 2, 4, `${mc.name}'s party escorted refugees to safety.`), { sub: '12 days' })]],
    starving: ['Hungry Travelers', 'A family sits by the road, too weak to walk on. They have not eaten in days.',
      [act('Share your supplies', help(25, 1, 1, 2, `${mc.name} fed a starving family on the road.`), { sub: '25g', disabled: G.house.gold < 25 })]],
    wounded: ['A Wounded Traveler', 'A traveler lies bleeding by the road, robbed and left for dead.',
      [act('Use a potion on them', () => {
        G.house.potions--;
        if (R.chance(0.35)) {
          const c = spawnWanderer(randomTownIdx());
          c.loyalty = 40; addBond(c, mc, 30); c.orientKnown = true;
          UI.closeAll();
          return this.frame('wanderer', ev.tile, 'A Life Saved', `The traveler, ${c.name} (${UI.charLine(c)}), recovers. "I owe you my life. Let me ride with you."`, [
            act('Welcome them', () => { c.status = G.party.length < 4 ? 'party' : 'household'; if (c.status === 'party') G.party.push(c.id); c.servedHouse = true; chron(`${c.name} joined House ${G.house.name} after ${mc.name} saved their life.`, 'good', [c.id, mc.id], 'join'); this.done(); }),
            act('Send them home', () => this.done(`${c.name} promises never to forget.`)),
          ]);
        }
        help(0, 1, 0.5, 2, `${mc.name} saved a wounded traveler.`)();
      }, { sub: 'uses a potion', disabled: G.house.potions < 1 })]],
    wolves: ['Wolves at the Farm', 'Screams from a farmstead: a wolf pack is attacking the herd.',
      [act('Drive them off', () => { UI.closeAll(); Game.battle([{ type: 'wolf', lvl: Math.max(1, Math.round(partyLevel())) }, { type: 'wolf', lvl: Math.max(1, Math.round(partyLevel())) }, { type: 'wolf', lvl: Math.max(1, Math.round(partyLevel()) - 1) }], { kind: 'wild', title: 'Wolves at the Farm', after: (res) => { if (res.outcome === 'victory') { G.house.prestige += 2; addProsperity(1); chron(`${mc.name}'s party saved a farmstead from wolves.`, 'good', [mc.id], 'deed'); } } }); })]],
  }[variant];
  this.frame('needy', ev.tile, T[0], T[1], [...T[2], act('Ride on', ignore)]);
};

Events.ev_child = function (ev) {
  const mc = ch(G.mcId);
  const race = randomRace();
  const k = makeChar({ race, born: G.day - R.int(3, Math.max(4, GD.RACES[race].maturity - 3)) * DAYS_PER_YEAR, birth: 'lowborn', lineageKnown: false, secret: R.weighted({ noble: 1, warrior: 1, common: 4, tainted: 0.5 }), corruption: 0 });
  k.orphaned = true; k.foundling = true;
  const town = nearestTown(ev.tile.x, ev.tile.y);
  this.frame('child', ev.tile, 'A Lost Child', `A ${GD.RACES[race].name.toLowerCase()} child, ${k.name}, sits alone by the road. ${GD.GENDERS[k.gender].sym} ${ageStr(k)} years old. They will not say where their family is.`, [
    act('Adopt them into the House', () => { G.house.gold += 40; UI.closeAll(); Game.adopt(k); }, { sub: 'free · they take your name' }),
    town ? act(`Take them to ${town.name}`, () => { advanceDays(6); k.town = G.world.towns.indexOf(town); addBond(k, mc, 25); G.house.prestige += 1; recordChoice('charity', 0.5, mc.id); this.done(`${k.name} was left in the care of ${town.name}. They will remember you.`); }, { sub: '6 days · they may seek you out one day' }) : null,
    act('Leave them', () => { k.town = randomTownIdx(); k.grudge = true; recordChoice('charity', -0.6, mc.id); this.done('You ride on. The child watches you go.', 'dim'); }),
  ]);
};

Events.ev_wanderer = function (ev) {
  const mc = ch(G.mcId);
  const c = spawnWanderer(randomTownIdx());
  c.orientKnown = R.chance(0.5);
  const full = householdCount() >= GD.ESTATE[G.house.tier].household;
  this.frame('wanderer', ev.tile, 'A Wanderer', `${c.name} (${UI.charLine(c)}, ${GD.BIRTH[birthKey(c)].name.toLowerCase()}${c.trait ? ', ' + GD.TRAITS[c.trait].name.toLowerCase() : ''}) shares the road for a while and asks to join House ${G.house.name}.`, [
    act('Take them in', () => { c.status = G.party.length < 4 ? 'party' : 'household'; if (c.status === 'party') G.party.push(c.id); c.servedHouse = true; c.loyalty += 15; recordChoice('open', 0.6, mc.id); chron(`${c.name}, a wanderer met on the road, joined House ${G.house.name}.`, 'good', [c.id], 'join'); this.done(); }, { disabled: full, sub: full ? 'household full' : 'free' }),
    act('Share a meal and part as friends', () => { addBond(c, mc, 15); this.done(`${c.name} heads for ${G.world.towns[c.town].name}.`, 'dim'); }),
    act('Send them away', () => { recordChoice('open', -0.4, mc.id); this.done(); }),
  ]);
};

// ---------------------------------------------------------------- mines
Events.ev_mine = function (ev) {
  const t = ev.tile;
  this.frame('mine', t, 'An Old Mine', 'Timbers frame a shaft into the rock. Old tools lie rusting by the entrance, and there is a glint of ore in the walls.', [
    act('Work the mine', () => { t.feature = 'mine'; t.richness = t.richness ?? R.int(2, 5); UI.closeAll(); this.workMine(t); }, { sub: '20 days · gold, some danger' }),
    act('Mark it on the map', () => { t.feature = 'mine'; t.richness = R.int(2, 5); this.done('The mine is marked on your map.'); }),
    act('Ride on', () => this.done()),
  ]);
};
Events.workMine = function (t) {
  const party = G.party.map(ch).filter(Boolean);
  advanceDays(20);
  const str = party.reduce((s, c) => s + stat(c, 'str'), 0);
  const gold = Math.round((30 + str * 4) * (0.6 + (t.richness || 1) * 0.15) * era().income);
  G.house.gold += gold;
  t.richness = (t.richness || 1) - 1;
  recordChoice('charity', -0.2, G.mcId);
  let extra = '';
  if (R.chance(0.14)) {
    const v = R.pick(party);
    v.hp = Math.max(1, Math.round(v.hp - maxHp(v) * 0.4));
    extra = ` A tunnel collapses on ${v.name}!`;
    if (R.chance(0.35)) injure(v, 'in a cave-in');
  }
  if (t.richness <= 0) { t.feature = null; extra += ' The seam is exhausted.'; }
  chron(`The party mined ore worth ${gold}g.${extra}`, extra.includes('collapses') ? 'bad' : 'good', G.party.slice(), 'mine');
  Game.after();
};

// ---------------------------------------------------------------- caves and dungeons
Events.ev_cave = function (ev) {
  const t = ev.tile;
  const deep = ['mountain', 'hills'].includes(t.type) && R.chance(0.4);
  this.frame('cave', t, deep ? 'A Dungeon Entrance' : 'A Cave Mouth', deep ? 'Worked stone steps lead down into the dark, under an arch carved with forgotten names.' : 'A cave mouth breathes cold air. Something has worn a path into it.', [
    act('Enter', () => { t.feature = 'cave'; t.depth = t.depth || R.int(3, deep ? 6 : 4); t.dungeon = deep; UI.closeAll(); Crawl.start(t); }, { cls: 'danger', sub: 'several rooms · fights, traps, treasure' }),
    act('Mark it on the map', () => { t.feature = 'cave'; t.depth = R.int(3, deep ? 6 : 4); t.dungeon = deep; this.done('The entrance is marked on your map.'); }),
    act('Ride on', () => this.done()),
  ]);
};

const Crawl = { rooms: [], i: 0, tile: null };
Crawl.start = function (t) {
  this.tile = t;
  this.i = 0;
  const n = t.depth || 4;
  this.rooms = [];
  for (let k = 0; k < n - 1; k++) this.rooms.push(R.weighted({ fight: 3, treasure: 2, trap: 2, spring: 1, relic: 0.4 }));
  this.rooms.push('boss');
  this.loot = 0;
  this.room();
};
Crawl.lvl = function (bonus = 0) { return Math.max(1, Math.round(partyLevel() + (this.tile.dungeon ? 1.5 : 0.5) + bonus + (year() - START_YEAR) / 150)); };
Crawl.room = function () {
  if (G.pendingSuccession || !G.party.length) return Game.after();
  const t = this.tile;
  const type = this.rooms[this.i];
  const n = this.rooms.length;
  const head = `Room ${this.i + 1} of ${n}. `;
  const leave = act('Turn back', () => { UI.closeAll(); Log.add(`The party leaves the ${t.dungeon ? 'dungeon' : 'cave'} with ${this.loot}g.`, 'dim'); Game.after(); });
  const next = () => { advanceDays(1); this.i++; UI.closeAll(); if (this.i >= n) return this.finish(); this.room(); };
  const enemies = (count, bonus) => {
    const pool = t.dungeon ? ['wraith', 'cultist', 'ghoul'] : (GD.ENCOUNTERS[t.type] || ['wolf']).concat(['ghoul', 'troll']);
    return Array.from({ length: count }, () => ({ type: R.pick(pool), lvl: this.lvl(bonus) }));
  };
  const fight = (count, bonus, title) => { UI.closeAll(); Game.battle(enemies(count, bonus), { kind: 'dungeon', title, after: (res) => { if (res.outcome === 'victory') setTimeout(() => { if (!UI.modalStack.length) next(); }, 50); } }); };
  const frame = (title, text, opts) => Events.frame('cave', t, title, head + text, [...opts, leave]);
  if (type === 'fight') {
    frame('In the Dark', 'Shapes move in the dark ahead. They have not seen you yet.', [
      act('Attack', () => fight(R.int(2, 3), 0, 'In the Dark')),
      act('Try to sneak past', () => { const r = check('agi', 7 + this.i); if (r.ok) { UI.toast(`${r.c.name} leads you past unseen.`); next(); } else { UI.toast('You are spotted!'); fight(R.int(3, 4), 0.5, 'Spotted!'); } }, { sub: `best AGI: ${bestStat('agi').name}` }),
    ]);
  } else if (type === 'treasure') {
    frame('A Forgotten Chest', 'An iron-bound chest sits in an alcove, thick with dust.', [
      act('Open it', () => {
        if (R.chance(0.22)) { const r = check('agi', 8); if (!r.ok) { const v = R.pick(G.party.map(ch)); v.hp = Math.max(1, Math.round(v.hp - maxHp(v) * 0.3)); UI.toast(`A needle trap! ${v.name} is hurt.`); } }
        const gold = Math.round(R.int(40, 120) * (1 + partyLevel() * 0.12));
        G.house.gold += gold; this.loot += gold;
        let msg = `${gold}g`;
        if (R.chance(0.4)) { G.house.potions++; msg += ' and a potion'; }
        if (R.chance(0.2)) {
          const c = R.pick(G.party.map(ch));
          Equip.ensureChar(c);
          const kit = Equip.kitFor(c);
          const slot = R.chance(0.5) ? 'hand' : 'body';
          const kind = kit[slot];
          if (kind) {
            const cur = c.equip[slot];
            const next = (cur ? cur.tier : 0) + 1;
            if (next <= 5) {
              const item = Equip.makeItem(kind, next);
              if (cur) Equip.addToStash(cur);
              c.equip[slot] = item;
              Equip.syncLegacy(c);
              msg += `, and ${item.name.toLowerCase()} for ${c.name}`;
            }
          }
        }
        UI.toast(`Inside: ${msg}.`);
        next();
      }),
      act('Leave it', next),
    ]);
  } else if (type === 'trap') {
    const k = R.pick(['agi', 'int']);
    frame(k === 'agi' ? 'A Crumbling Bridge' : 'Runes on the Floor', k === 'agi' ? 'A narrow stone bridge spans a chasm. It does not look sturdy.' : 'Glowing runes cover the floor of the next chamber. Some kind of ward.', [
      act(k === 'agi' ? 'Cross carefully' : 'Study the runes', () => {
        const r = check(k, 8 + this.i);
        if (r.ok) { UI.toast(`${r.c.name} finds the safe way through.`); }
        else {
          const v = R.pick(G.party.map(ch));
          v.hp = Math.max(1, Math.round(v.hp - maxHp(v) * 0.35));
          UI.toast(k === 'agi' ? `The stones give way under ${v.name}!` : `The ward flares and burns ${v.name}!`);
          if (R.chance(0.2)) injure(v, k === 'agi' ? 'in a fall in the dark' : 'when a ward flared');
        }
        next();
      }, { sub: `best ${STAT_NAMES[k]}: ${bestStat(k).name}` }),
    ]);
  } else if (type === 'spring') {
    frame('A Clear Spring', 'Cold, clean water wells up between the stones. The air here is calm.', [
      act('Drink and rest', () => { G.party.map(ch).forEach((c) => { c.hp = Math.min(maxHp(c), c.hp + maxHp(c) * 0.5); }); UI.toast('The party is refreshed.'); next(); }),
    ]);
  } else if (type === 'relic') {
    frame('An Ancient Altar', 'An altar older than any kingdom. A faint warmth comes from the stone.', [
      act('Lay the heirloom upon it', () => { if (G.house.heirloom) { G.house.heirloom.power += 1; UI.toast(`The ${G.house.heirloom.name} hums with new power (+1).`); } next(); }, { disabled: !G.house.heirloom }),
      act('Pray', () => { G.party.map(ch).forEach((c) => { c.corruption = Math.max(0, c.corruption - 10); addFormative(c, 1); }); UI.toast('A strange peace settles on the party.'); next(); }),
    ]);
  } else if (type === 'boss') {
    frame(t.dungeon ? 'The Deepest Hall' : 'The Lair', t.dungeon ? 'The final hall. Something ancient waits on a throne of bones.' : 'The cave opens into a lair littered with bones. Its master wakes.', [
      act('Fight', () => fight(3, 2, t.dungeon ? 'The Deepest Hall' : 'The Lair')),
    ]);
  }
};
Crawl.finish = function () {
  const t = this.tile;
  const gold = Math.round((t.dungeon ? 260 : 150) * (1 + partyLevel() * 0.15));
  G.house.gold += gold; this.loot += gold;
  G.house.prestige += t.dungeon ? 6 : 3;
  G.house.potions++;
  addProsperity(t.dungeon ? 3 : 1.5);
  G.party.map(ch).forEach((c) => addFormative(c, 2));
  recordChoice('martial', 0.5, G.mcId);
  chron(`${ch(G.mcId).name}'s party cleared ${t.dungeon ? 'a dungeon' : 'a cave'} in the ${GD.BIOMES[t.type].name.toLowerCase()}, taking ${this.loot}g.`, 'good', G.party.slice(), 'deed');
  t.feature = null;
  Game.after();
};

// ---------------------------------------------------------------- bandit camps
Events.ev_camp = function (ev) {
  const t = ev.tile;
  const name = `the ${R.pick(CAMP_NAMES.a)} ${R.pick(CAMP_NAMES.b)}`;
  const str = R.float(1, 2.6);
  this.frame('camp', t, 'A Bandit Camp', `Smoke rises from a hidden camp: ${name}, about ${Math.round(str * 4)} cutthroats. Left alone, they will grow, raid the towns nearby, and become a lasting stronghold.`, [
    act('Attack the camp', () => { UI.closeAll(); const cp = this.addCamp(t, name, str); this.attackCamp(cp); }, { cls: 'danger' }),
    act('Leave them be', () => { this.addCamp(t, name, str); recordChoice('martial', -0.2, G.mcId); this.done(`You leave ${name} alone, for now.`, 'dim'); }),
  ]);
};
Events.addCamp = function (t, name, str) {
  const cp = { id: 'b' + Date.now().toString(36) + R.int(0, 999), x: t.x, y: t.y, name, str, founded: year() };
  campsList().push(cp);
  if (str >= 2) t.feature = 'camp';
  t.campId = cp.id;
  return cp;
};
Events.campStrength = (cp) => (cp.str >= 6 ? 'Stronghold' : cp.str >= 3.5 ? 'Large camp' : 'Camp');
Events.attackCamp = function (cp) {
  const n = clamp(2 + Math.floor(cp.str / 2.5), 2, 4);
  const lvl = Math.max(1, Math.round(partyLevel() + cp.str * 0.5 + (year() - START_YEAR) / 150));
  const enemies = Array.from({ length: n }, (_, i) => ({ type: i === 0 && cp.str >= 4 ? 'raider' : R.pick(['bandit', 'bandit', 'raider']), lvl: lvl + (i === 0 && cp.str >= 4 ? 2 : 0) }));
  Game.battle(enemies, {
    kind: 'dungeon', title: `${cp.name[0].toUpperCase() + cp.name.slice(1)}`, intro: `You storm ${cp.name}'s ${this.campStrength(cp).toLowerCase()}!`,
    after: (res) => {
      if (res.outcome !== 'victory') { cp.str += 0.5; return; }
      const gold = Math.round(60 * cp.str * era().income);
      G.house.gold += gold;
      G.house.prestige += Math.round((3 + cp.str) * repMult());
      addProsperity(2 + cp.str / 2);
      recordChoice('martial', 0.6, G.mcId);
      const t = tileAt(cp.x, cp.y);
      if (t && (t.feature === 'camp')) t.feature = null;
      G.world.camps = campsList().filter((x) => x !== cp);
      chron(`House ${G.house.name} destroyed ${cp.name}${cp.str >= 6 ? "'s stronghold" : ''} and took ${gold}g in plunder.`, 'good', [G.mcId, ...G.party], 'camp');
    },
  });
};
Events.campAmbush = function (cp) {
  const lvl = Math.max(1, Math.round(partyLevel() + cp.str * 0.3));
  Game.battle(Array.from({ length: clamp(1 + Math.floor(cp.str / 2), 2, 4) }, () => ({ type: R.pick(['bandit', 'raider']), lvl })), { kind: 'wild', title: `Raiders of ${cp.name}`, intro: `Raiders from ${cp.name} spring from cover!` });
};
// camps grow, raid, and appear in hard times
Events.yearly = function () {
  const E = G.world.era.type;
  const hard = E === 'war' || E === 'famine';
  for (const cp of campsList()) {
    const before = cp.str;
    cp.str = Math.min(12, cp.str + 0.35 + (hard ? 0.5 : 0) + (G.world.prosperity < 30 ? 0.2 : 0) - (G.world.prosperity > 65 ? 0.3 : 0) + R.float(-0.2, 0.2));
    const t = tileAt(cp.x, cp.y);
    if (cp.str >= 2 && t && !t.feature) { t.feature = 'camp'; t.campId = cp.id; if (before < 2) chron(`Travelers report ${cp.name} camped in the ${GD.BIOMES[t.type].name.toLowerCase()}.`, 'bad', [], 'camp'); }
    if (before < 6 && cp.str >= 6) chron(`${cp.name[0].toUpperCase() + cp.name.slice(1)} have raised a stronghold. Their raids grow bolder.`, 'bad', [], 'camp');
    for (const town of liveTowns()) {
      const d = Math.abs(town.x - cp.x) + Math.abs(town.y - cp.y);
      if (d <= 7) town.growth = (town.growth || 0) - 0.035 * cp.str;
    }
    if (cp.str >= 4 && R.chance(0.3)) {
      const town = nearestTown(cp.x, cp.y);
      if (town) { addProsperity(-1); chron(`${cp.name[0].toUpperCase() + cp.name.slice(1)} raided ${town.name}.`, 'bad', [], 'raid'); }
    }
  }
  if (campsList().length < 6 && R.chance(hard ? 0.14 : 0.04)) {
    const taken = [...liveTowns(), G.world.estate, ...campsList()];
    const spots = G.world.map.tiles.filter((t) => ['forest', 'hills', 'grass', 'swamp', 'jungle'].includes(t.type) && !t.feature && taken.every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= 4));
    if (spots.length) this.addCamp(R.pick(spots), `the ${R.pick(CAMP_NAMES.a)} ${R.pick(CAMP_NAMES.b)}`, R.float(0.8, 1.6));
  }
};

// ---------------------------------------------------------------- map features and panels
Events.drawFeature = function (r, t, p) {
  const c = r.ctx;
  if (t.feature === 'camp') {
    const cp = campsList().find((x) => x.id === t.campId);
    const big = cp && cp.str >= 6;
    if (big) {
      c.fillStyle = eraTint('#6b4a2a');
      for (let i = -3; i <= 3; i++) c.fillRect(p.x + i * 6 - 1, p.y - 6 + Math.abs(i) * 2, 3, 14);
    }
    c.fillStyle = eraTint('#7a5a3a'); c.beginPath(); c.moveTo(p.x - 16, p.y + 4); c.lineTo(p.x - 7, p.y - 12); c.lineTo(p.x + 2, p.y + 4); c.closePath(); c.fill();
    c.fillStyle = eraTint('#7a2a2a'); c.beginPath(); c.moveTo(p.x + 2, p.y + 6); c.lineTo(p.x + 11, p.y - 9); c.lineTo(p.x + 20, p.y + 6); c.closePath(); c.fill();
    const f = 0.6 + Math.sin(r.t / 90) * 0.25;
    c.fillStyle = `rgba(255,150,50,${f})`; c.beginPath(); c.moveTo(p.x - 4, p.y + 10); c.lineTo(p.x, p.y + 1); c.lineTo(p.x + 4, p.y + 10); c.closePath(); c.fill();
  }
  if (t.feature === 'cave') {
    c.fillStyle = eraTint('#6a655e'); c.beginPath(); c.moveTo(p.x - 18, p.y + 6); c.lineTo(p.x - 6, p.y - 18); c.lineTo(p.x + 10, p.y - 20); c.lineTo(p.x + 20, p.y + 6); c.closePath(); c.fill();
    c.fillStyle = '#0d0b10'; c.beginPath(); c.ellipse(p.x + 1, p.y + 2, 8, 10, 0, Math.PI, 0); c.fill(); c.fillRect(p.x - 7, p.y + 2, 16, 4);
    if (t.dungeon) { c.fillStyle = eraTint('#9a9488'); c.fillRect(p.x - 10, p.y - 10, 22, 3); }
  }
  if (t.feature === 'mine') {
    c.fillStyle = '#0d0b10'; c.beginPath(); c.ellipse(p.x, p.y + 2, 8, 10, 0, Math.PI, 0); c.fill(); c.fillRect(p.x - 8, p.y + 2, 16, 4);
    c.fillStyle = eraTint('#8a6a45'); c.fillRect(p.x - 10, p.y - 10, 3, 16); c.fillRect(p.x + 7, p.y - 10, 3, 16); c.fillRect(p.x - 11, p.y - 12, 22, 3);
    c.fillStyle = '#5a5a5a'; c.fillRect(p.x + 12, p.y + 2, 9, 5);
  }
};
Events.label = function (t) {
  if (t.feature === 'camp') { const cp = campsList().find((x) => x.id === t.campId); return cp ? `${cp.name[0].toUpperCase() + cp.name.slice(1)} (${Events.campStrength(cp)})` : 'Bandit camp'; }
  if (t.feature === 'cave') return t.dungeon ? 'Dungeon' : 'Cave';
  if (t.feature === 'mine') return 'Mine';
  return null;
};
Events.panel = function (t) {
  if (t.feature === 'camp') {
    const cp = campsList().find((x) => x.id === t.campId);
    if (!cp) return [h('h3', {}, 'An abandoned camp')];
    return [h('h3', {}, cp.name[0].toUpperCase() + cp.name.slice(1)),
      h('p', { class: 'dim' }, `${this.campStrength(cp)}, about ${Math.round(cp.str * 4)} outlaws, here since ${cp.founded}. They raid towns within a week's ride and grow stronger every year.`),
      act('Attack', () => this.attackCamp(cp), { cls: 'danger', sub: `foes around level ${Math.round(partyLevel() + cp.str * 0.5)}` })];
  }
  if (t.feature === 'cave') return [h('h3', {}, t.dungeon ? 'Dungeon Entrance' : 'Cave'), h('p', { class: 'dim' }, `${t.depth || 4} chambers deep.`), act('Enter', () => Crawl.start(t), { cls: 'danger' })];
  if (t.feature === 'mine') return [h('h3', {}, 'Mine'), h('p', { class: 'dim' }, `Ore remains for about ${t.richness} more workings.`), act('Work the mine', () => this.workMine(t), { sub: '20 days · gold, some danger' })];
  return null;
};

// ---------------------------------------------------------------- the campfire (first person)
const Campfire = { open: false, el: null, cv: null, sparks: [], talked: new Set(), stories: false, sound: null };

Campfire.start = function () {
  const mc = ch(G.mcId);
  if (!mc) return;
  this.open = true; this.talked = new Set(); this.stories = false; this.sparks = []; this.say = null;
  this.tile = tileAt(G.pos.x, G.pos.y);
  this.stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.45, r: Math.random() * 1.3 + 0.3, tw: Math.random() * 6 }));
  this.cv = h('canvas', { class: 'camp-canvas' });
  this.box = h('div', { class: 'camp-say' });
  this.btns = h('div', { class: 'camp-btns' });
  this.el = h('div', { class: 'campfire' }, this.cv, h('div', { class: 'camp-ui' }, this.box, this.btns));
  document.body.append(this.el);
  this.cv.addEventListener('click', (e) => { const p = this.hit(e); if (p) this.talk(p); });
  this.cv.addEventListener('mousemove', (e) => { this.hover = this.hit(e); this.cv.style.cursor = this.hover ? 'pointer' : 'default'; });
  this.setSay(`${mc.name} builds a fire in the ${GD.BIOMES[this.tile.type].name.toLowerCase()}. The others gather close as night falls.`);
  this.renderButtons();
  const loop = (ts) => { if (!this.open) return; this.t = ts; try { this.draw(); } catch (err) { console.error(err); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
Campfire.companions = function () { return G.party.map(ch).filter((c) => c && c.alive && c.id !== G.mcId); };
Campfire.setSay = function (text, who) {
  this.box.replaceChildren(...[who ? portrait(who, 44) : null, h('div', {}, who ? h('b', {}, who.name) : null, h('p', {}, text))].filter(Boolean));
};
Campfire.renderButtons = function () {
  const comps = this.companions();
  this.btns.replaceChildren(
    ...comps.map((c) => h('button', { class: 'camp-btn' + (this.talked.has(c.id) ? ' done' : ''), onclick: () => this.talk(c) }, `Talk to ${c.name}`)),
    h('button', { class: 'camp-btn', disabled: this.stories || !comps.length, onclick: () => this.shareStories() }, 'Share stories'),
    h('button', { class: 'camp-btn', onclick: () => this.rest(false) }, 'Sleep'),
    h('button', { class: 'camp-btn', onclick: () => this.rest(true) }, 'Rest with a watch'),
    h('button', { class: 'camp-btn', onclick: () => this.toggleSound() }, this.sound ? 'Sound: on' : 'Sound: off'),
    h('button', { class: 'camp-btn leave', onclick: () => this.close() }, 'Break camp'),
  );
};
Campfire.close = function (then) {
  this.open = false;
  if (this.sound) { try { this.sound.ctx.close(); } catch (e) { /* ignore */ } this.sound = null; }
  if (this.el) this.el.remove();
  this.el = null;
  if (then) then(); else Game.after();
};
Campfire.layout = function () {
  const w = this.cv.clientWidth, h2 = this.cv.clientHeight;
  const fx = w / 2, fy = h2 * 0.66;
  const comps = this.companions();
  const n = comps.length;
  return comps.map((c, i) => {
    // seats on the far side of the fire, facing the viewer
    const a = Math.PI + (n === 1 ? 0.5 : (i + 0.5) / n) * Math.PI;
    const x = fx + Math.cos(a) * Math.min(w * 0.26, h2 * 0.42);
    const y = fy + Math.sin(a) * h2 * 0.09 - 6;
    const sc = (h2 / 210) * (1 + Math.sin(a) * 0.15);
    return { c, x, y, sc };
  }).sort((a, b) => a.y - b.y);
};
Campfire.hit = function (e) {
  const r = this.cv.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  return (this.layout().find((s) => Math.abs(mx - s.x) < 22 * s.sc && my < s.y + 6 && my > s.y - 60 * s.sc) || {}).c || null;
};

Campfire.draw = function () {
  const cv = this.cv;
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const t = this.t / 1000;
  const fx = w / 2, fy = H * 0.66;
  const flick = 0.85 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.04 + Math.random() * 0.04;
  // night sky and stars
  const sky = c.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, '#05060f'); sky.addColorStop(1, '#141a2e');
  c.fillStyle = sky; c.fillRect(0, 0, w, H);
  for (const s of this.stars) { c.fillStyle = `rgba(255,255,240,${0.4 + Math.sin(t * 1.5 + s.tw) * 0.3})`; c.fillRect(s.x * w, s.y * H, s.r, s.r); }
  c.fillStyle = 'rgba(230,230,210,0.9)'; c.beginPath(); c.arc(w * 0.82, H * 0.12, 16, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#05060f'; c.beginPath(); c.arc(w * 0.82 + 6, H * 0.12 - 3, 15, 0, Math.PI * 2); c.fill();
  // horizon by biome
  const type = this.tile.type;
  c.fillStyle = '#0a0d12';
  c.beginPath(); c.moveTo(0, H * 0.5);
  for (let x = 0; x <= w; x += 18) {
    let yy = H * 0.5;
    if (['forest', 'snow', 'jungle', 'swamp', 'grass'].includes(type)) yy -= ((x * 7) % 5) * 6 + ((x / 18) % 2 ? 22 : 8);
    if (['hills', 'mountain'].includes(type)) yy -= Math.abs(Math.sin(x / 140)) * 80;
    if (type === 'desert' || type === 'sand') yy -= Math.sin(x / 90) * 10 + 8;
    c.lineTo(x, yy);
  }
  c.lineTo(w, H); c.lineTo(0, H); c.closePath(); c.fill();
  // ground lit by the fire
  const g = c.createRadialGradient(fx, fy, 10, fx, fy, w * 0.6);
  g.addColorStop(0, '#5a3a20'); g.addColorStop(0.35, '#2a1d14'); g.addColorStop(1, '#0b0908');
  c.fillStyle = g; c.fillRect(0, H * 0.5, w, H * 0.5);
  // companions seated across the fire
  const saved = Render.ctx; Render.ctx = c;
  try {
    for (const s of this.layout()) {
      Render.drawFigure(s.x, s.y, figLook(s.c), s.sc, { seated: true });
      if (this.hover === s.c) { c.fillStyle = '#f2ead8'; c.font = '13px Georgia, serif'; c.textAlign = 'center'; c.fillText(s.c.name, s.x, s.y - 66 * s.sc); }
    }
  } finally { Render.ctx = saved; }
  if (!this.companions().length) { c.fillStyle = 'rgba(242,234,216,0.5)'; c.font = 'italic 15px Georgia, serif'; c.textAlign = 'center'; c.fillText('You sit alone by the fire.', fx, fy - 70); }
  // logs, stones and flames
  c.fillStyle = '#3a2a1e';
  c.save(); c.translate(fx, fy + 8); c.rotate(0.25); c.fillRect(-34, -5, 68, 10); c.rotate(-0.5); c.fillRect(-34, -5, 68, 10); c.restore();
  c.fillStyle = '#4a4440';
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; c.beginPath(); c.ellipse(fx + Math.cos(a) * 44, fy + 10 + Math.sin(a) * 12, 9, 6, 0, 0, Math.PI * 2); c.fill(); }
  const flame = (col, sc, ph) => {
    c.fillStyle = col;
    c.beginPath(); c.moveTo(fx - 26 * sc, fy + 6);
    for (let i = 0; i <= 8; i++) {
      const x = fx - 26 * sc + i * 6.5 * sc;
      const hgt = (i % 2 ? 46 : 26) * sc * flick * (1 + Math.sin(t * 11 + i * 1.7 + ph) * 0.18);
      c.lineTo(x, fy + 4 - hgt);
    }
    c.lineTo(fx + 26 * sc, fy + 6); c.closePath(); c.fill();
  };
  flame('#c4351a', 1.15, 0); flame('#f07a1e', 0.9, 1); flame('#ffd24a', 0.6, 2); flame('#fff6c8', 0.3, 3);
  // sparks
  if (Math.random() < 0.5) this.sparks.push({ x: fx + R.float(-14, 14), y: fy - 20, vx: R.float(-0.4, 0.4), vy: R.float(-1.6, -0.8), life: 1 });
  this.sparks = this.sparks.filter((s) => (s.life -= 0.012) > 0);
  for (const s of this.sparks) { s.x += s.vx + Math.sin(t * 3 + s.y * 0.05) * 0.3; s.y += s.vy; c.fillStyle = `rgba(255,${150 + s.life * 100 | 0},60,${s.life})`; c.fillRect(s.x, s.y, 2, 2); }
  // darkness beyond the firelight, and warm light within it
  const rad = Math.min(w, H) * 0.62 * flick;
  const dark = c.createRadialGradient(fx, fy - 20, rad * 0.25, fx, fy - 20, rad);
  dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(2,2,8,0.78)');
  c.fillStyle = dark; c.fillRect(0, 0, w, H);
  c.globalCompositeOperation = 'lighter';
  const warm = c.createRadialGradient(fx, fy - 20, 0, fx, fy - 20, rad * 0.8);
  warm.addColorStop(0, `rgba(255,140,40,${0.28 * flick})`); warm.addColorStop(1, 'rgba(255,120,40,0)');
  c.fillStyle = warm; c.fillRect(0, 0, w, H);
  c.globalCompositeOperation = 'source-over';
  // your own hands, warming at the fire (first person)
  const mc = ch(G.mcId);
  if (mc) {
    const skin = GD.RACES[mc.race].skin;
    const sleeve = mc.tunic;
    const lost = (mc.injuries || []).includes('lostArm');
    const bob = Math.sin(t * 1.3) * 3;
    const k = Math.min(1.4, H / 650);
    const hand = (side) => {
      // forearm rising from the bottom of the view, palm open toward the flames
      const x = w / 2 + side * Math.min(w * 0.17, 230), y = H * 0.8 + bob;
      c.fillStyle = shade(sleeve, -0.25);
      c.beginPath(); c.moveTo(x + side * 120 * k, H + 20); c.lineTo(x + side * 6 * k, y + 18 * k); c.lineTo(x + side * 44 * k, y + 30 * k); c.lineTo(x + side * 175 * k, H + 20); c.closePath(); c.fill();
      c.fillStyle = skin;
      c.beginPath(); c.ellipse(x + side * 14 * k, y + 4 * k, 30 * k, 21 * k, side * 0.55, 0, Math.PI * 2); c.fill();
      // four fingers fanned up toward the fire, thumb along the inner edge
      for (let f = 0; f < 4; f++) {
        const a = -Math.PI / 2 - side * (0.55 - f * 0.28);
        const cx = x + side * 10 * k + Math.cos(a) * 26 * k, cy = y + 2 * k + Math.sin(a) * 24 * k;
        c.beginPath(); c.ellipse(cx, cy, 6 * k, 14 * k, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
      }
      c.beginPath(); c.ellipse(x - side * 18 * k, y + 8 * k, 6 * k, 13 * k, side * 0.9, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,120,40,${0.28 * flick})`; c.beginPath(); c.ellipse(x - side * 6 * k, y, 34 * k, 24 * k, side * 0.4, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'source-over';
    };
    hand(-1);
    if (!lost) hand(1);
  }
};

// ---- what people say by the fire, drawn from who they are and what they have lived
Campfire.line = function (c) {
  const mc = ch(G.mcId);
  const b = bond(c, mc);
  const k = kinship(mc, c);
  const lines = [];
  if (c.forcedBy === mc.id) lines.push(`I sit at your fire, ${mc.name}. Do not mistake that for forgiveness.`, `My spouse is kind enough. That is not the point, and you know it.`);
  if (b < -40) lines.push('...', `Say what you came to say, ${mc.name}.`, 'I would rather watch the fire than talk to you.');
  if (c.spouse === mc.id) lines.push(attraction(c, mc) > 0 ? 'Come closer. The night is cold and I would rather be warm with you.' : `We do our duty well, you and I. That counts for something.`);
  if (k.rel && c.spouse !== mc.id) lines.push(`You are my ${kinship(c, mc).rel}, and I am glad of it tonight.`);
  if (isDescendantOf(c, mc.id)) lines.push(`Will you tell me about our House again? About ${ch(G.founderId) ? ch(G.founderId).name : 'the founder'}?`);
  const inj = c.injuries || [];
  if (inj.includes('lostArm')) lines.push('I still reach for my sword with a hand that is not there.');
  if (inj.includes('lostLeg')) lines.push('The leg aches when the nights turn cold. The one I lost, I mean.');
  if (inj.includes('lostEye')) lines.push('Half the world went dark for me. The other half got sharper.');
  if (c.condition === 'lame') lines.push('Do not slow down on my account. I have kept up all my life.');
  const st = stageKey(c);
  if (st === 'youth') lines.push('One day the songs will be about me. You will see.', 'Teach me something tomorrow? Anything.');
  if (st === 'elder' || st === 'venerable') lines.push(`I have seen ${ageStr(c)} winters. ${GD.VILLAIN.name} grows bolder every one.`, 'When I am gone, remember me kindly.');
  if (c.trait === 'brave') lines.push('Let them come. I sleep better after a good fight.');
  if (c.trait === 'wise') lines.push('Every age thinks it is the last. This one might be right.');
  if (c.trait === 'ambitious') lines.push(`House ${G.house.name} could be so much more, if we wanted it.`);
  if (c.trait === 'loyal') lines.push(`Wherever you ride, ${mc.name}, I ride.`);
  if (G.world.era.type === 'war') lines.push('I can smell the smoke of burning farms, even here.');
  if (G.world.era.type === 'famine') lines.push('Eat slowly. Make it last. Who knows when we will eat this well again.');
  if (doomYearsLeft() < 150) lines.push(`${doomYearsLeft()} years, the seers say. And then the end.`);
  if (!spouseOf(c) && attraction(c, mc) > 1.1 && !spouseOf(mc) && !k.sev) lines.push(`The firelight suits you, ${mc.name}.`);
  const mem = (G.ledger || []).filter((e) => (e.ids || []).includes(c.id) && e.type !== 'join').slice(-4);
  if (mem.length) { const e = R.pick(mem); lines.push(`I keep thinking about ${e.year}. ${e.text}`); }
  if (b > 50) lines.push(`There is no one I would rather share a fire with.`);
  if (!lines.length) lines.push('A quiet night. Good.', 'Listen to that wind.', 'Pass the bread?');
  return R.pick(lines);
};
Campfire.talk = function (c) {
  const mc = ch(G.mcId);
  this.setSay(this.line(c), c);
  if (!this.talked.has(c.id)) {
    this.talked.add(c.id);
    if (!(c.forcedBy === mc.id && R.chance(0.5))) addBond(c, mc, R.int(2, 5));
    this.renderButtons();
  }
};
Campfire.shareStories = function () {
  const people = [ch(G.mcId), ...this.companions()];
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) addBond(people[i], people[j], R.int(2, 5));
  people.forEach((c) => addFormative(c, 0.5));
  this.stories = true;
  const teller = R.pick(people);
  const mem = (G.ledger || []).filter((e) => ['deed', 'ward', 'head', 'camp', 'final', 'forced', 'scandal'].includes(e.type)).slice(-12);
  const story = mem.length ? R.pick(mem) : null;
  this.setSay(story ? `${teller.name} tells the story of ${story.year}: ${story.text} The others laugh, or go quiet, in the right places.` : `${teller.name} tells an old tale of the first kings. Everyone has heard it. Everyone listens anyway.`, teller);
  this.renderButtons();
};
Campfire.rest = function (watch) {
  advanceDays(1);
  const comps = this.companions();
  const heal = watch ? 0.45 : 0.6;
  for (const c of G.party.map(ch)) if (c) c.hp = Math.min(maxHp(c), c.hp + maxHp(c) * heal);
  const p = (watch ? 0.03 : 0.1) * era().enc;
  if (R.chance(p)) {
    this.close(() => {
      UI.toast(watch ? 'The watch raises the alarm!' : 'You wake to steel in the dark!');
      Game.battle(buildEncounter(this.tile, { count: R.int(2, 3) }), { kind: 'wild', title: 'Attack in the Night', intro: watch ? 'The watch spots them just in time!' : 'Attackers fall on the sleeping camp!' });
    });
    return;
  }
  this.setSay(watch ? `${comps.length ? R.pick(comps).name : ch(G.mcId).name} keeps watch through the night. Nothing stirs. Dawn comes grey and cold.` : 'You sleep deeply by the embers. At dawn the fire is ash, and everyone is rested.');
  this.btns.replaceChildren(h('button', { class: 'camp-btn leave', onclick: () => this.close() }, 'Break camp at dawn'));
};
// a soft crackle made from filtered noise (only after the player turns it on)
Campfire.toggleSound = function () {
  if (this.sound) { try { this.sound.ctx.close(); } catch (e) { /* ignore */ } this.sound = null; this.renderButtons(); return; }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 1 : 0.08);
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const gain = ctx.createGain(); gain.gain.value = 0.35;
    src.connect(lp).connect(gain).connect(ctx.destination); src.start();
    this.sound = { ctx };
  } catch (e) { UI.toast('Sound is not available here.'); }
  this.renderButtons();
};
