// Core model: random helpers, characters, aging, genetics, world simulation, map, save/load.
'use strict';

const R = {
  int: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  float: (a, b) => a + Math.random() * (b - a),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  weighted(obj) {
    let total = 0;
    for (const k in obj) total += obj[k];
    let r = Math.random() * total;
    for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
    return Object.keys(obj)[0];
  },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let G = null; // the whole game state (serialisable)

// ---------------------------------------------------------------- log
const Log = {
  listeners: [],
  add(text, kind = 'info', ids) {
    const entry = { text, kind, year: year(), ids: ids || [] };
    G.log.push(entry);
    if (G.log.length > 200) G.log.shift();
    if (G.mcId) this.listeners.forEach((f) => f(entry));
  },
};

// The House chronicle: a permanent ledger of everything that matters to the line.
function relevant(c) {
  return !!c && (c.house === G.house.name || c.status === 'party' || c.status === 'household' || c.status === 'rival' || c.servedHouse);
}
// Kinds that interrupt play with a news popup (skipped during succession timeskip).
const NEWS_KINDS = new Set(['birth', 'death', 'marriage', 'era', 'head', 'rival', 'renounce', 'age', 'year', 'injury']);
function queueNews(e) {
  if (!G || G.skipLog) return;
  if (!G.newsQueue) G.newsQueue = [];
  G.newsQueue.push(e);
}
function chron(text, kind = 'good', ids = [], type = 'event') {
  Log.add(text, kind, ids);
  if (!G.ledger) G.ledger = [];
  const e = { year: year(), day: G.day, text, kind, ids: ids.filter(Boolean), type };
  G.ledger.push(e);
  if (G.skipLog) G.skipLog.push(e);
  else if (NEWS_KINDS.has(kind) || NEWS_KINDS.has(type)) queueNews(e);
  return e;
}

// ---------------------------------------------------------------- time
function year(day = G.day) { return START_YEAR + Math.floor(day / DAYS_PER_YEAR); }
function seasonName(day = G.day) {
  return ['Spring', 'Summer', 'Autumn', 'Winter'][Math.floor((day % DAYS_PER_YEAR) / 90)];
}
function advanceDays(n) {
  const before = Math.floor(G.day / DAYS_PER_YEAR);
  G.day += n; // fractions are fine: travel advances time continuously
  if (typeof tickTraining === 'function') tickTraining(n);
  const after = Math.floor(G.day / DAYS_PER_YEAR);
  for (let y = before + 1; y <= after; y++) yearTick();
}

// ---------------------------------------------------------------- characters
function genName(race) {
  const p = GD.NAME_PARTS[race];
  return R.pick(p.a) + R.pick(p.b);
}
function randomRace(weights) {
  return R.weighted(weights || { human: 5, orc: 2, halfling: 2, dwarf: 2, elf: 1.2 });
}
function rollBase(race) {
  const b = {};
  for (const k of STATS) b[k] = Math.max(1, GD.RACES[race].base[k] + R.int(-1, 2));
  return b;
}

function rollGender() { return R.chance(0.5) ? 'man' : 'woman'; }
function rollOrientation() { return R.weighted(Object.fromEntries(Object.entries(GD.ORIENTATIONS).map(([k, v]) => [k, v.w]))); }
function rollPref() { return R.weighted(Object.fromEntries(Object.entries(GD.PREFERENCES).map(([k, v]) => [k, v.w]))); }
function rollCondition() { return R.chance(0.06) ? R.pick(Object.keys(GD.CONDITIONS)) : null; }

function makeChar(o = {}) {
  const race = o.race || randomRace();
  const r = GD.RACES[race];
  const id = 'c' + (G.nextId++);
  const gender = o.gender || rollGender();
  const condition = o.condition !== undefined ? o.condition : rollCondition();
  const c = {
    id, race, gender,
    orientation: o.orientation || rollOrientation(),
    pref: o.pref || rollPref(),
    height: o.height || R.weighted({ short: 1, average: 3, tall: 1 }),
    build: o.build || R.weighted({ slight: 1, average: 3, stout: 1, large: 0.6 }),
    looks: o.looks ?? R.int(0, 9),
    condition,
    infertile: o.infertile ?? R.chance(0.07),
    infertileKnown: false,
    orientKnown: !!o.orientKnown,
    hairStyle: o.hairStyle || R.pick(GD.HAIRSTYLES),
    beard: o.beard ?? (race === 'dwarf' ? R.chance(0.8) : gender === 'man' && R.chance(0.4)),
    name: o.name || genName(race),
    born: o.born ?? (G.day - (r.maturity + R.int(0, 8)) * DAYS_PER_YEAR),
    lifespan: o.lifespan || R.int(r.life[0], r.life[1]),
    parents: o.parents || [],
    spouse: null,
    children: [],
    birth: o.birth || 'lowborn',
    orphaned: false,
    house: o.house || null,
    status: o.status || 'npc', // party | household | npc | rival | dead
    town: o.town ?? randomTownIdx(),
    base: o.base || rollBase(race),
    bonus: { str: 0, agi: 0, int: 0, wil: 0, vit: 0 },
    level: o.level || 1,
    xp: 0, hp: 1, formative: 0,
    alive: true, died: null, cause: null,
    bonds: {},
    loyalty: o.loyalty ?? R.int(-5, 15),
    corruption: o.corruption ?? R.int(0, 20),
    evil: false,
    lineageKnown: o.lineageKnown ?? true,
    secret: o.secret || null,
    legit: false,
    bastardStat: R.pick(STATS),
    trait: o.trait !== undefined ? o.trait : (R.chance(0.6) ? R.pick(Object.keys(GD.TRAITS)) : null),
    hair: o.hair || R.pick(GD.HAIR),
    tunic: o.tunic || R.pick(GD.TUNIC),
    gear: { weapon: o.weapon || 0, armor: o.armor || 0 },
    generation: o.generation || 0,
    cls: o.cls || null,
  };
  if (condition && GD.CONDITIONS[condition].life) c.lifespan = Math.round(c.lifespan * GD.CONDITIONS[condition].life);
  G.chars[c.id] = c;
  c.hp = maxHp(c);
  return c;
}

function ch(id) { return id ? G.chars[id] : null; }
function age(c) { return ((c.alive ? G.day : c.died) - c.born) / DAYS_PER_YEAR; }
function ageStr(c) { return Math.floor(age(c)); }
function isAdult(c) { return age(c) >= GD.RACES[c.race].maturity; }

function stageKey(c) {
  const r = GD.RACES[c.race];
  const a = age(c);
  if (a < r.maturity) return 'child';
  if (a < r.maturity + (r.primeEnd - r.maturity) * 0.3) return 'youth';
  if (a < r.primeEnd) return 'prime';
  if (a < r.elder) return 'seasoned';
  if (a < r.elder + (c.lifespan - r.elder) * 0.5) return 'elder';
  return 'venerable';
}
function birthKey(c) {
  if (c.birth === 'bastard' && c.legit) return 'lowborn';
  if (c.orphaned && c.birth !== 'highborn') return 'orphan';
  return c.birth;
}
function formativeCap(c) { return birthKey(c) === 'orphan' ? 30 : 20; }

function ageMod(c, k) {
  const st = GD.STAGES[stageKey(c)];
  if (PHYS[k]) {
    let m = st.phys;
    if (m < 1) {
      const protect = Math.min(0.6, c.formative * 0.03) * (c.trait === 'frail' ? 0.5 : 1);
      m = 1 - (1 - m) * (1 - protect);
    }
    return m;
  }
  return st.mind;
}

function stat(c, k) {
  const r = GD.RACES[c.race];
  let v = c.base[k] + r.growth[k] * (c.level - 1) * 0.9 + (c.bonus[k] || 0);
  for (const inj of c.injuries || []) v += (GD.INJURIES[inj].mods[k] || 0);
  if (GD.CLASSES) v += classGrowth(c, k);
  v += (GD.HEIGHTS[c.height || 'average'].mods[k] || 0) + (GD.BUILDS[c.build || 'average'].mods[k] || 0);
  if (c.condition) v += GD.CONDITIONS[c.condition].mods[k] || 0;
  const b = GD.BIRTH[birthKey(c)];
  if (b.mods[k]) v *= b.mods[k];
  if (birthKey(c) === 'bastard' && c.bastardStat === k) v *= 1.15;
  v *= ageMod(c, k);
  return Math.max(1, Math.round(v * 10) / 10);
}
function topStat(c) {
  let best = 'str';
  for (const k of STATS) if (stat(c, k) > stat(c, best)) best = k;
  return best;
}
function maxHp(c) {
  let hp = 24 + stat(c, 'vit') * 6 + c.level * 5;
  if (c.trait === 'hardy') hp *= 1.15;
  if (c.trait === 'frail') hp *= 0.85;
  if (GD.CLASSES && isAdult(c)) hp *= classOf(c).mods.hp;
  return Math.round(hp);
}
function weaponAtk(c) {
  if (!Equip.isChar(c)) return 0;
  Equip.ensureChar(c);
  // Zero is a valid equipment total (e.g. a Cloth Robe or Glass Orb); do not fall back to GD.GEAR.
  let a = Equip.bonus(c, 'atk');
  if (G.mcId === c.id && G.house.heirloom) a += G.house.heirloom.power;
  return a;
}
function armorDef(c) {
  if (!Equip.isChar(c)) return 0;
  Equip.ensureChar(c);
  return Equip.bonus(c, 'def');
}
function gearMag(c) {
  if (!Equip.isChar(c)) return 0;
  Equip.ensureChar(c);
  return Equip.bonus(c, 'mag');
}
function power(c) {
  // rough combat rating for UI and matchmaking
  return Math.round(STATS.reduce((s, k) => s + stat(c, k), 0) + c.level * 2 + weaponAtk(c) + armorDef(c) + gearMag(c) * 0.5);
}

function xpMod(c) {
  let m = GD.STAGES[stageKey(c)].xp * GD.BIRTH[birthKey(c)].xp * (1 + c.formative * 0.02);
  if (c.trait === 'wise') m *= 1.15;
  if (c.house === G.house.name) m *= 1 + G.house.up.yard * 0.1;
  return m;
}
function xpNeed(level) { return Math.round(40 * Math.pow(level, 1.5)); }
function gainXp(c, amount) {
  const gained = Math.round(amount * xpMod(c));
  c.xp += gained;
  let leveled = false;
  while (c.xp >= xpNeed(c.level)) {
    c.xp -= xpNeed(c.level);
    c.level++;
    leveled = true;
  }
  if (leveled) {
    Log.add(`${c.name} reached level ${c.level}.`, 'good', [c.id]);
    c.hp = Math.min(maxHp(c), c.hp + 10);
    if (c.level >= 6 && !c.extraSkill) learnSkill(c, 'through hard-won experience');
  }
  return gained;
}
function learnSkill(c, how) {
  const top = topStat(c);
  const opts = STATS.filter((k) => k !== top).sort((a, b) => stat(c, b) - stat(c, a));
  c.extraSkill = R.chance(0.7) ? opts[0] : R.pick(opts);
  chron(`${c.name} learned ${GD.SKILLS[c.extraSkill].name} ${how}.`, 'skill', [c.id], 'skill');
}
function injure(c, cause) {
  const have = c.injuries || (c.injuries = []);
  const opts = Object.keys(GD.INJURIES).filter((k) => !have.includes(k) && !(GD.INJURIES[k].elderOnly && !['elder', 'venerable'].includes(stageKey(c))));
  if (!opts.length) return null;
  const k = R.weighted(Object.fromEntries(opts.map((o) => [o, GD.INJURIES[o].w])));
  have.push(k);
  c.hp = Math.min(c.hp, maxHp(c));
  chron(`${c.name} ${GD.INJURIES[k].verb} ${cause}.`, GD.INJURIES[k].good ? 'good' : 'injury', [c.id], 'injury');
  return k;
}
function addFormative(c, n) {
  if (stageKey(c) !== 'youth') return 0;
  const mult = birthKey(c) === 'orphan' ? 1.5 : 1;
  const before = c.formative;
  c.formative = Math.min(formativeCap(c), c.formative + n * mult);
  return c.formative - before;
}

// How drawn a is to b (0 = not at all). Gender and orientation gate it; a 'type' weights it.
function attraction(a, b) {
  if (!a || !b || a.id === b.id) return 0;
  const same = a.gender === b.gender;
  let base = { straight: same ? 0 : 1, gay: same ? 1 : 0, bi: 1, ace: 0.35 }[a.orientation || 'straight'];
  if (!base) return 0;
  const p = GD.PREFERENCES[a.pref || 'none'];
  base *= 0.75 + attractiveness(b) * 0.05;
  if (p.stat) base *= clamp(0.6 + (stat(b, p.stat) - 6) * 0.09, 0.45, 1.7);
  if (p.looks) base *= clamp(0.4 + attractiveness(b) * 0.13, 0.4, 1.7);
  if (p.status) base *= b.birth === 'highborn' || b.house === G.house.name ? 1.5 : 0.7;
  return base;
}
function mutual(a, b) { return Math.min(attraction(a, b), attraction(b, a)); }
function canConceive(a, b) { return a.gender !== b.gender && !a.infertile && !b.infertile; }
function orientationText(c, viewer) {
  if (!c.orientKnown && c.house !== G.house.name && c.status !== 'party' && c.status !== 'household') return 'Unknown';
  const o = GD.ORIENTATIONS[c.orientation || 'straight'].name;
  const p = c.pref && c.pref !== 'none' ? ` · ${GD.PREFERENCES[c.pref].name}` : '';
  return o + p;
}
function bodyText(c) {
  const parts = [];
  if (c.height && c.height !== 'average') parts.push(GD.HEIGHTS[c.height].name);
  if (c.build && c.build !== 'average') parts.push(GD.BUILDS[c.build].name);
  parts.push(`${attractivenessLabel(c)} (${attractiveness(c)}/10)`);
  return parts.join(' · ');
}
function bond(a, b) { return a.bonds[b.id] || 0; }
function addBond(a, b, n) {
  if (a.id === b.id) return;
  const mult = (a.trait === 'charming' || b.trait === 'charming') ? 1.4 : 1;
  a.bonds[b.id] = clamp((a.bonds[b.id] || 0) + n * mult, -100, 100);
  b.bonds[a.id] = clamp((b.bonds[a.id] || 0) + n * mult, -100, 100);
}

function kill(c, cause) {
  if (!c.alive) return;
  c.alive = false;
  c.died = G.day;
  c.cause = cause;
  const wasStatus = c.status;
  c.status = 'dead';
  G.party = G.party.filter((id) => id !== c.id);
  if (c.id === G.mcId) G.pendingSuccession = true;
  if (c.id === G.heirId) G.heirId = null;
  const reign = (G.house.reigns || []).find((r) => r.id === c.id && r.to == null);
  if (reign) reign.to = year();
  const msg = `${c.name} (${GD.RACES[c.race].name}, ${ageStr(c)}) died: ${cause}.`;
  if (relevant(c) || wasStatus === 'rival') chron(msg, wasStatus === 'rival' ? 'good' : 'death', [c.id], 'death');
  else Log.add(msg, 'dim', [c.id]);
  // children may become orphans
  for (const kid of c.children.map(ch)) {
    if (kid && kid.alive && !isAdult(kid) && kid.parents.every((p) => !ch(p) || !ch(p).alive)) kid.orphaned = true;
  }
}

function marry(a, b) {
  const remarriage = isWidowed(a) || isWidowed(b);
  a.spouse = b.id;
  b.spouse = a.id;
  addBond(a, b, 20);
  const msg = remarriage
    ? `${a.name} remarried, taking ${b.name} as spouse.`
    : `${a.name} and ${b.name} were married.`;
  if (relevant(a) || relevant(b)) chron(msg, 'marriage', [a.id, b.id], remarriage ? 'remarriage' : 'marriage');
  else Log.add(msg, 'dim', [a.id, b.id]);
}
/** Living spouse, or null if unmarried / widowed. Monogamy gates use this. */
function spouseOf(c) { const s = ch(c.spouse); return s && s.alive ? s : null; }
/** Late spouse record when the linked spouse is dead (widow / widower). */
function lateSpouseOf(c) {
  if (!c || !c.spouse) return null;
  const s = ch(c.spouse);
  return s && !s.alive ? s : null;
}
function isWidowed(c) { return !!lateSpouseOf(c); }
/** True when there is no living spouse (never married, or widowed). Blocks polygamy. */
function canTakeSpouse(c) { return !!(c && c.alive && isAdult(c) && !spouseOf(c)); }
/**
 * Eligible remarriage / courtship prospects: compatible attraction, available adults,
 * not close-kin-blocked, preferably town NPCs when townIdx is set.
 */
function remarriageProspects(who, opts = {}) {
  const limit = opts.limit || 6;
  if (!who || !canTakeSpouse(who)) return [];
  const list = Object.values(G.chars).filter((c) => {
    if (!c.alive || c.id === who.id || !isAdult(c) || c.evil) return false;
    if (spouseOf(c) || c.status === 'rival' || c.status === 'candidate') return false;
    if (opts.townOnly && c.status !== 'npc') return false;
    if (opts.townIdx != null && c.status === 'npc' && c.town !== opts.townIdx) return false;
    if (attraction(who, c) === 0 || attraction(c, who) === 0) return false;
    if (typeof kinBlocked === 'function' && kinBlocked(who, c)) return false;
    if (isDescendantOf(c, who.id) || isDescendantOf(who, c.id)) return false;
    return true;
  });
  return list
    .sort((a, b) => (mutual(b, who) - mutual(a, who)) || (bond(b, who) - bond(a, who)) || (b.level - a.level))
    .slice(0, limit);
}

function childBase(a, b, race) {
  const r = GD.RACES[race];
  const out = {};
  const eff = (p, k) => p.base[k] + (p.bonus[k] || 0) * 0.5 + (p.level - 1) * GD.RACES[p.race].growth[k] * 0.25;
  for (const k of STATS) out[k] = Math.max(1, Math.round((r.base[k] + (eff(a, k) + eff(b, k)) / 2) / 2 + R.int(-1, 2)));
  return out;
}

function haveChild(a, b) {
  const race = R.chance(0.5) ? a.race : b.race;
  const married = a.spouse === b.id;
  let birth;
  const isHouse = a.house === G.house.name || b.house === G.house.name;
  if (!married) birth = 'bastard';
  else if (a.birth === 'highborn' || b.birth === 'highborn' || (isHouse && G.house.prestige >= 40)) birth = 'highborn';
  else birth = 'lowborn';
  const kid = makeChar({
    race, born: G.day, parents: [a.id, b.id], birth,
    house: isHouse ? G.house.name : null,
    status: isHouse ? 'household' : 'npc',
    town: a.status === 'npc' ? a.town : randomTownIdx(),
    base: childBase(a, b, race),
    hair: R.chance(0.5) ? a.hair : b.hair,
    loyalty: isHouse ? 40 : 10 + Math.round(((a.loyalty || 0) + (b.loyalty || 0)) / 4),
    corruption: isHouse ? 0 : R.int(0, 10),
    generation: Math.max(a.generation, b.generation) + 1,
    trait: R.chance(0.4) ? (R.chance(0.5) && a.trait ? a.trait : b.trait) : (R.chance(0.4) ? R.pick(Object.keys(GD.TRAITS)) : null),
    height: R.chance(0.75) ? (R.chance(0.5) ? a.height : b.height) : undefined,
    build: R.chance(0.7) ? (R.chance(0.5) ? a.build : b.build) : undefined,
    looks: clamp(Math.round(((a.looks ?? 5) + (b.looks ?? 5)) / 2 + R.int(-2, 2)), 0, 9),
    condition: (() => {
      const her = [a.condition, b.condition].filter((x) => x && GD.CONDITIONS[x].hereditary);
      if (her.length && R.chance(0.3)) return R.pick(her);
      return rollCondition();
    })(),
    infertile: (a.infertile || b.infertile) ? R.chance(0.15) : R.chance(0.06),
  });
  const inb = kinship(a, b).coef + ((a.inbred || 0) + (b.inbred || 0)) / 4;
  if (inb > 0.01) {
    kid.inbred = Math.round(inb * 1000) / 1000;
    for (const k of STATS) kid.base[k] = Math.max(1, kid.base[k] - Math.round(inb * 10));
    kid.looks = clamp(kid.looks - Math.round(inb * 8), 0, 9);
    if (!kid.condition && R.chance(inb * 2.5)) {
      kid.condition = R.pick(Object.keys(GD.CONDITIONS));
      if (GD.CONDITIONS[kid.condition].life) kid.lifespan = Math.round(kid.lifespan * GD.CONDITIONS[kid.condition].life);
    }
    if (R.chance(inb * 1.2)) kid.infertile = true;
  }
  if (kid.condition && (isHouse || relevant(a) || relevant(b))) chron(`${kid.name} was born ${GD.CONDITIONS[kid.condition].name.toLowerCase()}.`, 'dim', [kid.id], 'condition');
  if (isHouse) {
    const legacy = Math.floor(G.house.generation / 2);
    for (const k of STATS) kid.bonus[k] += legacy;
  }
  a.children.push(kid.id);
  b.children.push(kid.id);
  // childhood friends: companions' children bond with House children
  const label = birth === 'bastard' ? 'a bastard child' : 'a child';
  const bmsg = `${a.name} and ${b.name} had ${label}: ${kid.name} (${GD.RACES[race].name}).`;
  if (isHouse || relevant(a) || relevant(b)) chron(bmsg, 'birth', [kid.id, a.id, b.id], 'birth');
  else Log.add(bmsg, 'dim', [kid.id]);
  if (isHouse && !G.heirId && G.mcId && (a.id === G.mcId || b.id === G.mcId)) G.heirId = kid.id;
  if (isHouse) G.house.prestige += 1;
  return kid;
}

function makeHeirloom() {
  return { name: R.pick(['Ancestral Blade', 'Founder\'s Sword', 'Oathkeeper', 'Hearthguard']), power: 2, gens: 1 };
}

// lineage helpers
function bloodline(c) {
  // ancestors' names (for character sheet)
  const out = [];
  const walk = (id, depth) => {
    const p = ch(id);
    if (!p || depth > 3) return;
    out.push({ c: p, depth });
    p.parents.forEach((pp) => walk(pp, depth + 1));
  };
  c.parents.forEach((p) => walk(p, 1));
  return out;
}
function isDescendantOf(c, ancestorId) {
  const seen = new Set();
  const up = (x) => [...x.parents, ...(x.adoptedBy || [])];
  const stack = up(c);
  while (stack.length) {
    const id = stack.pop();
    if (id === ancestorId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const p = ch(id);
    if (p) stack.push(...up(p));
  }
  return false;
}

// ---------------------------------------------------------------- world map
function tileAt(x, y) {
  const m = G.world.map;
  if (x < 0 || y < 0 || x >= m.W || y >= m.H) return null;
  return m.tiles[y * m.W + x];
}
function findPath(from, to) {
  if (!passable(to)) return null;
  const key = (t) => t.y * G.world.map.W + t.x;
  const prev = new Map([[key(from), null]]);
  const q = [from];
  while (q.length) {
    const t = q.shift();
    if (t === to) break;
    for (const n of neighbors(t)) if (!prev.has(key(n))) { prev.set(key(n), t); q.push(n); }
  }
  if (!prev.has(key(to))) return null;
  const path = [];
  for (let t = to; t && t !== from; t = prev.get(key(t))) path.unshift(t);
  return path;
}

// ---------------------------------------------------------------- new game
function newGame() {
  G = {
    version: 2,
    day: 0,
    nextId: 1,
    chars: {},
    party: [],
    mcId: null,
    heirId: null,
    founderId: null,
    log: [],
    ledger: [],
    house: {
      name: 'Ashford', color: GD.HOUSE_COLORS[0], prestige: 0, gold: 150, tier: 0,
      up: { horses: 0, livestock: 0, yard: 0, library: 0, chapel: 0, armory: 0 },
      retinue: 0, potions: 3, generation: 1, heirloom: null, heroes: [], reigns: [], stash: [],
      // Enemy lore: knowledge 0–20 per enemy type. See EnemyLore / docs/DESIGN.md §8c.
      lore: {},
    },
    world: { map: null, towns: [], prosperity: 30, era: null, eras: [], victory: false },
    pos: { x: 0, y: 0 },
    pendingSuccession: false,
    stats: { battles: 0, deaths: 0 },
  };
  initWorld();
  startEra('peace', 6);
  seedPopulation();
}

function seedPopulation() {
  // NPC families across the towns, so lineages exist from the start
  for (let i = 0; i < 9; i++) {
    const town = i % G.world.towns.length;
    const a = makeChar({ town, birth: R.pick(['lowborn', 'lowborn', 'highborn', 'bastard']), orientation: R.pick(['straight', 'straight', 'bi']), infertile: false });
    if (R.chance(0.55)) {
      const b = makeChar({ town, race: R.chance(0.7) ? a.race : randomRace(), birth: R.pick(['lowborn', 'lowborn', 'highborn']), gender: a.gender === 'man' ? 'woman' : 'man', orientation: R.pick(['straight', 'straight', 'bi']), infertile: false });
      marry(a, b);
      const kids = R.int(0, 2);
      for (let k = 0; k < kids; k++) {
        const kid = haveChild(a, b);
        kid.born = G.day - R.int(1, GD.RACES[kid.race].maturity + 6) * DAYS_PER_YEAR;
      }
    }
  }
  for (let i = 0; i < 5; i++) spawnWanderer();
  G.log = [];
}
function spawnWanderer(town) {
  const orphan = R.chance(0.45);
  const c = makeChar({
    town: town ?? randomTownIdx(),
    birth: orphan ? 'lowborn' : R.pick(['lowborn', 'lowborn', 'bastard', 'highborn']),
    lineageKnown: false,
    secret: R.weighted({ noble: 1, warrior: 1.4, common: 3, tainted: 0.8 }),
    level: Math.max(1, Math.round(partyLevel() + R.int(-2, 1))),
  });
  c.orphaned = orphan;
  if (c.secret === 'tainted') c.corruption += 15;
  return c;
}
function partyLevel() {
  if (!G.party || !G.party.length) return 1;
  return G.party.map(ch).reduce((s, c) => s + c.level, 0) / G.party.length;
}

// ---------------------------------------------------------------- eras
function startEra(type, years) {
  const len = years || R.int(6, 15);
  const prev = G.world.era ? G.world.era.values : null;
  G.world.era = { type, start: year(), end: year() + len, values: rollEraValues(type, prev) };
  G.world.eras.push({ type, start: year(), values: G.world.era.values });
  if (G.log && G.mcId) chron(`A new era dawns: the ${GD.ERAS[type].name}.`, 'era', [], 'era');
}
function era() { return GD.ERAS[G.world.era.type]; }
function nextEra() {
  const p = G.world.prosperity / 100;
  if (G.world.prosperity >= 95) return 'golden';
  const cur = G.world.era.type;
  const w = { abundance: 0.4 + p * 2, peace: 0.5 + p * 2, famine: 1.4 - p * 1.3, war: 1.5 - p * 1.3 };
  if (cur !== 'golden') w[cur] *= 0.4; // eras tend to change
  return R.weighted(w);
}
function addProsperity(n) {
  const before = G.world.prosperity;
  G.world.prosperity = clamp(G.world.prosperity + n, 0, 100);
  if (before < 95 && G.world.prosperity >= 95 && G.world.era.type !== 'golden') {
    startEra('golden', 50);
    G.world.victory = true;
    G.pendingVictory = true;
  }
}

// ---------------------------------------------------------------- yearly tick
function yearTick() {
  G._anc = new Map(); // ancestry cache for this year's kinship checks
  try { yearTickInner(); } finally { G._anc = null; }
}
function yearTickInner() {
  const h = G.house;
  const E = era();
  const y = year();
  // income
  const income = Math.round(GD.ESTATE[h.tier].income * E.income + h.up.livestock * 40);
  h.gold += income;
  addProsperity(E.drift + (G.world.era.type === 'golden' ? 0 : 0));

  const alive = Object.values(G.chars).filter((c) => c.alive);
  // aging and death
  for (const c of alive) {
    const a = age(c);
    const st = stageKey(c);
    if (a >= c.lifespan) { kill(c, 'old age'); continue; }
    let risk = st === 'elder' ? 0.02 : st === 'venerable' ? 0.09 : 0.002;
    if (c.trait === 'frail') risk *= 1.6;
    if (G.world.era.type === 'famine' && c.house !== h.name) risk += 0.01;
    if (R.chance(risk)) { kill(c, st === 'child' ? 'sickness' : 'illness'); continue; }
    if (c.hp < maxHp(c)) c.hp = maxHp(c);
    // House children grow up at the estate
    if (c.house === h.name) {
      const r = GD.RACES[c.race];
      if (st === 'child' && h.up.yard) c.bonus[R.pick(['str', 'agi', 'vit'])] += 0.25 * h.up.yard;
      if (a >= r.maturity && a - 1 < r.maturity) {
        c.bonus.int += h.up.library; c.bonus.wil += h.up.library;
        chron(`${c.name} of House ${h.name} has come of age${c.id !== G.mcId ? ' and may join the party' : ''}.`, 'good', [c.id], 'age');
        h.prestige += 2;
      }
    }
  }

  const living = Object.values(G.chars).filter((c) => c.alive);
  const adults = living.filter((c) => isAdult(c) && !c.evil && stageKey(c) !== 'venerable');

  // bonds grow between people who live and travel together
  const together = living.filter((c) => c.status === 'party' || c.status === 'household');
  for (let i = 0; i < together.length; i++) for (let j = i + 1; j < together.length; j++) {
    const a = together[i], b = together[j];
    addBond(a, b, R.int(0, 6) + (a.status === 'party' && b.status === 'party' ? 3 : 0));
    if (!isAdult(a) && !isAdult(b)) addBond(a, b, 4);
  }
  // childhood friends: companions' kids in town bond with House kids
  const houseKids = living.filter((c) => c.house === h.name && !isAdult(c));
  const compKids = living.filter((c) => c.house !== h.name && !isAdult(c) && c.parents.some((p) => ch(p) && (ch(p).status === 'party' || ch(p).status === 'household')));
  for (const a of houseKids) for (const b of compKids) addBond(a, b, R.int(3, 8));

  // marriages
  const single = adults.filter((c) => !spouseOf(c) && c.id !== G.mcId);
  R.shuffle(single);
  const used = new Set();
  for (const a of single) {
    if (used.has(a.id)) continue;
    for (const b of single) {
      if (b.id === a.id || used.has(b.id)) continue;
      const sameGroup = (a.status === 'npc' && b.status === 'npc' && a.town === b.town) || (a.status !== 'npc' && b.status !== 'npc');
      if (!sameGroup) continue;
      const bd = bond(a, b);
      const m = mutual(a, b);
      if (m <= 0) continue;
      if (kinBlocked(a, b)) continue;
      const ksev = kinship(a, b).sev;
      if (ksev && R.chance(clamp(0.65 + ksev * 0.12, 0, 0.97))) continue; // most still look beyond the family
      if ((bd >= 60 && R.chance(0.4 * Math.min(1.3, m))) || (a.status === 'npc' && b.status === 'npc' && R.chance(0.2 * m))) {
        marry(a, b); used.add(a.id); used.add(b.id);
        if (kinship(a, b).sev) kinScandal(a, b);
        if (a.house === h.name || b.house === h.name) {
          const kin2 = a.house === h.name ? a : b;
          recordChoice('love', 1, kin2.id);
          if (a.gender === b.gender) recordChoice('accept', 1, kin2.id);
          if (!kinship(a, b).sev) recordChoice('kin', -0.3, kin2.id);
          const kin = a.house === h.name ? a : b;
          if (!canConceive(a, b) && a.gender === b.gender) chron(`${kin.name} chose a partner of their own heart. They will not have children together.`, 'dim', [a.id, b.id], 'love');
        }
        break;
      }
      // affairs between close companions
      if (bd >= 45 && a.status !== 'npc' && canConceive(a, b) && R.chance(0.04 * m)) { haveChild(a, b); used.add(a.id); used.add(b.id); break; }
    }
  }
  // births
  const doneCouples = new Set();
  for (const a of adults) {
    const b = spouseOf(a);
    if (!b || doneCouples.has(a.id) || !adults.includes(b)) continue;
    doneCouples.add(a.id); doneCouples.add(b.id);
    if (['elder'].includes(stageKey(a)) || ['elder'].includes(stageKey(b))) continue;
    const kids = a.children.filter((k) => b.children.includes(k)).length;
    if (a.gender === b.gender) continue;
    a.yearsTrying = (a.yearsTrying || 0) + 1; b.yearsTrying = (b.yearsTrying || 0) + 1;
    if (a.infertile || b.infertile) {
      const who = [a, b].filter((x) => x.infertile && !x.infertileKnown);
      if (who.length && kids === 0 && a.yearsTrying >= 3 && R.chance(0.5)) {
        who.forEach((x) => { x.infertileKnown = true; });
        if (relevant(a) || relevant(b)) chron(`After years of trying, it is clear ${who.map((x) => x.name).join(' and ')} cannot have children.`, 'bad', who.map((x) => x.id), 'infertile');
      }
      continue;
    }
    let p = 0.24 * ((GD.RACES[a.race].fertility + GD.RACES[b.race].fertility) / 2) * E.births;
    if (a.orientation === 'ace' || b.orientation === 'ace') p *= 0.35;
    if (a.forced || b.forced) p *= 0.6;
    if (a.trait === 'fertile' || b.trait === 'fertile') p *= 1.5;
    if (kids >= 4) p *= 0.25;
    if ((a.id === G.mcId || b.id === G.mcId) && kids === 0) p = Math.max(p, 0.55);
    if (!relevant(a) && !relevant(b)) p *= clamp(110 / living.length, 0.15, 1.3); // the land feeds only so many
    if (R.chance(p)) haveChild(a, b);
  }

  // corruption and betrayal
  const mc = ch(G.mcId);
  for (const c of living) {
    if (!isAdult(c) || c.evil || c.house === h.name || c.status === 'rival') continue;
    let d = R.float(0, 6);
    if (G.world.era.type === 'war' || G.world.era.type === 'famine') d += 4;
    const bk = birthKey(c);
    if (bk === 'bastard') d += 3;
    if (bk === 'orphan') d += 2;
    if (c.trait === 'ambitious') d += 3;
    if (c.trait === 'loyal') d *= 0.3;
    if (c.status === 'party' || c.status === 'household') d -= 5;
    d -= Math.max(c.loyalty, mc ? bond(c, mc) : 0) / 20;
    if (c.grudge) d += 4;
    // people with no tie to the House rarely come to hate it
    const tied = c.grudge || c.status !== 'npc' || c.servedHouse ||
      c.parents.some((p) => ch(p) && (ch(p).servedHouse || ch(p).house === h.name)) ||
      Object.entries(c.bonds).some(([id, v]) => Math.abs(v) > 15 && ch(id) && ch(id).house === h.name);
    if (!tied) d *= 0.3;
    c.corruption = clamp(c.corruption + d, 0, 120);
    const rivals = living.filter((x) => x.status === 'rival').length;
    if (c.corruption >= 100 && rivals < 3) turnEvil(c);
  }
  // House members who resent the head of House may renounce it or turn on it
  if (mc) for (const c of living) {
    if (c.house !== h.name || c.id === mc.id || !isAdult(c) || c.evil) continue;
    const bd = bond(c, mc);
    if (bd >= -40) { c.corruption = Math.max(0, c.corruption - 3); continue; }
    c.corruption = clamp(c.corruption + (bd < -70 ? 12 : 6), 0, 120);
    if (bd < -70 && R.chance(0.08)) {
      c.house = null; c.status = 'npc'; c.grudge = true; c.servedHouse = true;
      G.party = G.party.filter((id) => id !== c.id);
      if (G.heirId === c.id) G.heirId = null;
      chron(`${c.name} renounced House ${h.name} and left, cursing ${mc.name}'s name.`, 'bad', [c.id, mc.id], 'renounce');
    } else if (c.corruption >= 100) turnEvil(c);
  }
  // rivals grow in power
  for (const c of living.filter((x) => x.status === 'rival')) if (R.chance(0.6)) c.level++;

  // world population upkeep
  const npcAdults = living.filter((c) => c.status === 'npc' && isAdult(c));
  const want = 8 * liveTowns().length;
  if (npcAdults.length < want) for (let i = 0; i < Math.min(5, Math.ceil((want - npcAdults.length) / 3)); i++) spawnWanderer();

  // era change
  if (y >= G.world.era.end && G.world.era.type !== 'golden') startEra(nextEra());
  techTick();
  townTick();
  if (typeof Events !== 'undefined') Events.yearly();
  doomTick();
  G.house.scandal = Math.max(0, (G.house.scandal || 0) - 0.05);
  if (y % 5 === 0) pruneDead();

  const yearLine = `— Year ${y} begins (${GD.ERAS[G.world.era.type].short}). Estate income +${income}g.`;
  Log.add(yearLine, 'year');
  queueNews({ year: y, day: G.day, text: `Year ${y} · Estate income +${income}g (${GD.ERAS[G.world.era.type].short}).`, kind: 'year', ids: [], type: 'income', income });
}
function siblings(a, b) { return a.parents.length && a.parents.some((p) => b.parents.includes(p)); }

function turnEvil(c) {
  const wasParty = c.status === 'party' || c.status === 'household';
  c.evil = true;
  c.status = 'rival';
  G.party = G.party.filter((id) => id !== c.id);
  c.level += 2;
  const mc = ch(G.mcId);
  const friend = mc && bond(c, mc) > 20 ? ` Once a friend of ${mc.name}.` : '';
  chron(`${c.name} has turned against House ${G.house.name} and become a Rival!${friend}`, 'bad', [c.id], 'rival');
  G.house.prestige = Math.max(0, G.house.prestige - (wasParty ? 5 : 2));
}

// ---------------------------------------------------------------- succession
function heirCandidates() {
  const mc = ch(G.mcId);
  const living = Object.values(G.chars).filter((c) => c.alive && c.house === G.house.name && !c.evil);
  const founder = G.founderId;
  const out = [];
  const add = (c, why) => { if (!out.find((o) => o.c.id === c.id)) out.push({ c, why }); };
  if (mc) {
    living.filter((c) => mc.children.includes(c.id)).sort((a, b) => a.born - b.born).forEach((c) => add(c, 'Child'));
    living.filter((c) => isDescendantOf(c, mc.id)).forEach((c) => add(c, 'Grandchild'));
  }
  living.filter((c) => founder && (c.id === founder || isDescendantOf(c, founder))).forEach((c) => add(c, 'Blood relative'));
  if (!out.length) {
    const sp = mc ? mc.spouse : null;
    // last resort: a sworn companion may be adopted into the House
    Object.values(G.chars).filter((c) => c.alive && !c.evil && isAdult(c) && (c.status === 'party' || c.status === 'household') && c.loyalty >= 30 && c.id !== sp)
      .sort((a, b) => b.loyalty - a.loyalty).slice(0, 3).forEach((c) => add(c, 'Adopted companion'));
  }
  return out;
}

function snapshot(c) {
  return { id: c.id, age: ageStr(c), level: c.level, power: power(c), injuries: [...(c.injuries || [])], skill: c.extraSkill || null, armor: c.gear.armor, weapon: c.gear.weapon };
}
function skipPeople() {
  return Object.values(G.chars).filter((c) => c.alive && (c.status === 'party' || c.status === 'household'));
}

// A companion or kinsman lives one year while the House is leaderless.
function liveAYear(c, heir) {
  const st = stageKey(c);
  const war = G.world.era.type === 'war';
  const place = R.pick(G.world.towns).name;
  if (st === 'child') {
    const r = GD.RACES[c.race];
    const a = age(c);
    if (a >= r.maturity / 2 && a - 1 < r.maturity / 2) chron(`${c.name} began training at arms.`, 'dim', [c.id], 'life');
    return;
  }
  // levels: a few, by chance, slower for the old
  if (R.chance(0.55 * clamp(GD.STAGES[st].xp, 0.3, 1.4))) c.level++;
  if (c.id === heir.id) return;
  if (R.chance(war ? 0.09 : 0.045)) {
    injure(c, R.pick([`holding the bridge at ${place}`, `fighting raiders near ${place}`, 'in a hunting accident', `in a duel in ${place}`, 'clearing a beast lair', 'defending the estate']));
  }
  if (['elder', 'venerable'].includes(st) && R.chance(0.06)) injure(c, 'as the years caught up with them');
  if (!c.extraSkill && R.chance(0.09)) learnSkill(c, R.pick([`from a master in ${place}`, 'from an old soldier', 'on the road', 'from forbidden books']));
  if (R.chance(0.12)) {
    Equip.ensureChar(c);
    const kit = Equip.kitFor(c);
    const slot = R.chance(0.5) ? 'body' : 'hand';
    const kind = kit[slot];
    if (kind) {
      const cur = c.equip[slot];
      const next = (cur ? cur.tier : 0) + 1;
      if (next <= 4) {
        const item = Equip.makeItem(kind, next);
        if (cur) Equip.addToStash(cur);
        c.equip[slot] = item;
        Equip.syncLegacy(c);
        chron(`${c.name} ${R.pick(['won', 'forged', 'was gifted', 'found'])} ${item.name.toLowerCase()}.`, 'gear', [c.id], 'gear');
      }
    }
  }
  if (R.chance(0.06)) {
    chron(`${c.name} ${R.pick([`saved a family from a fire in ${place}`, `drove bandits out of ${place}`, 'escorted a caravan through the mountains', `won a tourney in ${place}`, 'brought grain to the starving'])}.`, 'good', [c.id], 'deed');
    addProsperity(0.5);
    c.loyalty = clamp(c.loyalty + 3, -100, 100);
  }
  // risk of death and desertion for companions without a leader
  if (c.house !== G.house.name) {
    const risk = (war ? 0.06 : 0.025) * (c.status === 'party' ? 1 : 0.5);
    if (R.chance(risk)) kill(c, war ? 'fell in the war while the House was leaderless' : 'lost on the road');
    else if (c.loyalty < 0 && R.chance(0.15)) {
      c.status = 'npc'; G.party = G.party.filter((id) => id !== c.id);
      chron(`${c.name} left the House's service.`, 'bad', [c.id], 'leave');
    }
  }
}

function performTimeskip(heir) {
  const r = GD.RACES[heir.race];
  const years = Math.max(1, Math.ceil(r.maturity - age(heir)));
  const startYear = year();
  G.skipLog = [];
  chron(`House ${G.house.name} mourns. ${years} year${years > 1 ? 's' : ''} pass while ${heir.name} grows to lead.`, 'year', [heir.id], 'mourning');
  for (let i = 0; i < years; i++) {
    advanceDays(DAYS_PER_YEAR);
    for (const c of skipPeople()) if (c.alive) liveAYear(c, heir);
    if (!heir.alive || G.pendingDoom) break;
  }
  const events = G.skipLog;
  G.skipLog = null;
  if (!heir.alive) return { events, years, startYear, endYear: year(), heirDied: true };
  // hand over
  if (heir.house !== G.house.name) {
    heir.house = G.house.name; heir.adopted = true; heir.corruption = 0;
    G.house.prestige = Math.max(0, G.house.prestige - 10);
    chron(`${heir.name} is adopted into House ${G.house.name}. The old blood is gone, but the name lives on.`, 'bad', [heir.id], 'adopt');
  }
  G.mcId = heir.id;
  heir.status = 'party';
  G.house.generation++;
  heir.generation = Math.max(heir.generation, G.house.generation);
  G.house.heroes.push(heir.id);
  (G.house.reigns || (G.house.reigns = [])).push({ id: heir.id, from: year(), to: null, gen: G.house.generation });
  if (G.house.heirloom) {
    G.house.heirloom.power += 1 + G.house.up.armory;
    G.house.heirloom.gens++;
  }
  G.party = [heir.id, ...G.party.filter((id) => id !== heir.id && ch(id) && ch(id).alive && ch(id).status === 'party')].slice(0, 4);
  heir.hp = maxHp(heir);
  G.heirId = null;
  const kids = heir.children.map(ch).filter((k) => k && k.alive);
  if (kids.length) G.heirId = kids[0].id;
  G.pos = { ...G.world.estate };
  G.pendingSuccession = false;
  chron(`${heir.name} is now head of House ${G.house.name}. Generation ${G.house.generation} begins.`, 'head', [heir.id], 'head');
  return { events, years, startYear, endYear: year(), heirDied: false };
}

// ---------------------------------------------------------------- partners & recruits
function genPartner(tier, forWhom, genders) {
  const mc = forWhom || ch(G.mcId);
  const race = randomRace({ human: 4, orc: 2, halfling: 2, dwarf: 2, elf: 0.6 + tier * 0.5 });
  const r = GD.RACES[race];
  const mcAgeFrac = mc ? clamp((age(mc) - GD.RACES[mc.race].maturity) / (GD.RACES[mc.race].primeEnd - GD.RACES[mc.race].maturity), 0, 1) : 0.1;
  const years = r.maturity + Math.round((r.primeEnd - r.maturity) * clamp(mcAgeFrac + R.float(-0.1, 0.2), 0.02, 0.9));
  const birth = R.weighted({ highborn: 0.3 + tier * 1.2, lowborn: 2, bastard: 0.6, orphan: 0.4 });
  const base = rollBase(race);
  for (const k of STATS) base[k] += Math.floor(tier * 0.8 + R.float(0, tier * 0.6));
  const c = makeChar({
    race, birth, base,
    born: G.day - years * DAYS_PER_YEAR - R.int(0, 300),
    level: Math.max(1, Math.round((mc ? mc.level : 1) + tier - 1 + R.int(-1, 1))),
    loyalty: 30 + tier * 5,
    trait: R.chance(0.8) ? R.pick(Object.keys(GD.TRAITS).filter((t) => t !== 'frail' || tier === 0)) : null,
    weapon: 0,
    armor: 0,
    gender: genders ? R.pick(genders) : undefined,
    looks: clamp(R.int(2, 9) + Math.round(tier / 2), 0, 9),
    infertile: R.chance(0.06),
  });
  // matchmakers present people who could love the one they are matched with
  if (mc && attraction(c, mc) === 0) c.orientation = c.gender === mc.gender ? R.pick(['gay', 'bi']) : R.pick(['straight', 'straight', 'bi']);
  c.orientKnown = true;
  c.orphaned = birth === 'orphan';
  if (c.orphaned) c.birth = 'lowborn';
  c.status = 'candidate';
  c.dowry = Math.round(30 * Math.pow(tier + 1, 2.2));
  if (tier) Equip.seedStarter(c, Math.min(tier, 5));
  return c;
}
function discardCandidates(list, keepId) {
  for (const c of list) if (c.id !== keepId) delete G.chars[c.id];
}
function joinHouse(c, asSpouseOf) {
  c.house = G.house.name;
  c.loyalty = Math.max(c.loyalty, 50);
  c.corruption = 0;
  if (asSpouseOf) marry(asSpouseOf, c);
  c.status = 'household';
  if (G.party.length < 4) { c.status = 'party'; G.party.push(c.id); }
}
function hireCost(c) { return Math.round(30 + c.level * 18 + (c.birth === 'highborn' ? 40 : 0)); }
function recruitPrestigeReq(c) { return Math.max(0, Math.round((c.level - partyLevel() - 1) * 6)); }
function householdCount() { return Object.values(G.chars).filter((c) => c.alive && isAdult(c) && (c.status === 'household' || c.status === 'party')).length; }

// ---------------------------------------------------------------- save / load
const SAVE_KEY = 'generations-rpg-save-v1';
function saveGame() {
  Heraldry.ensureAll();
  WorldArt.ensure();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); return true; } catch (e) { return false; }
}
function loadGame() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return false;
    const data = JSON.parse(s);
    if (!data || data.version !== 2) return false;
    G = data;
    G.ledger = G.ledger || [];
    for (const c of Object.values(G.chars)) {
      c.gender = c.gender || rollGender(); c.orientation = c.orientation || 'straight'; c.pref = c.pref || 'none';
      c.height = c.height || 'average'; c.build = c.build || 'average'; c.looks = c.looks ?? 5; c.hairStyle = c.hairStyle || 'short';
    }
    G.house.reigns = G.house.reigns || [];
    G.house.stash = G.house.stash || [];
    G.house.lore = G.house.lore || {};
    Equip.ensureHouse();
    Heraldry.ensureAll();
    return true;
  } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- enemy lore (House familiarity)
// Fighting the same foe teaches the House. Knowledge is per enemy type, capped at 20.
// Each point: +0.5% damage dealt to that type, +0.4% resist vs their attacks (max +10% / +8%).
// Gain: +1 the first time you hit a given foe in a battle, +2 when that foe is defeated.
const EnemyLore = {
  CAP: 20,
  HIT: 1,
  KILL: 2,
  DMG_PER: 0.005,
  RES_PER: 0.004,
  ensure() { if (!G.house.lore) G.house.lore = {}; },
  get(type) {
    this.ensure();
    return Math.min(this.CAP, G.house.lore[type] || 0);
  },
  add(type, n) {
    if (!type || !GD.ENEMIES[type] || !n) return 0;
    this.ensure();
    const before = this.get(type);
    G.house.lore[type] = Math.min(this.CAP, before + n);
    return G.house.lore[type] - before;
  },
  dmgBonus(type) { return this.get(type) * this.DMG_PER; },
  resist(type) { return this.get(type) * this.RES_PER; },
  band(type) {
    const k = this.get(type);
    if (k <= 0) return 0;
    return Math.min(4, Math.ceil(k / 5));
  },
  roman(n) { return ['', 'I', 'II', 'III', 'IV'][n] || ''; },
  name(type) { return (GD.ENEMIES[type] && GD.ENEMIES[type].name) || type || 'Foe'; },
  pct(n) { return Math.round(n * 100); },
  summary(type) {
    const k = this.get(type);
    const name = this.name(type);
    if (k <= 0) return `Unknown: ${name}`;
    return `Known: ${name} ${this.roman(this.band(type))} — +${this.pct(this.dmgBonus(type))}% dmg / +${this.pct(this.resist(type))}% resist`;
  },
  shortTag(type) {
    const k = this.get(type);
    const name = this.name(type);
    if (k <= 0) return name;
    return `${name} ${this.roman(this.band(type))}`;
  },
};
