// The wider world: big biome map with islands, travel and technology, towns that rise and fall,
// House culture and the era's values, kinship and taboo, attractiveness, and the thousand-year doom.
'use strict';

// ---------------------------------------------------------------- map generation
// Default map edge; Careful Start may shrink/grow it before initWorld().
let WORLD_SIZE = 64;
const DEFAULT_WORLD_SIZE = 64;

function makeNoise(W, H, scale) {
  const gw = Math.ceil(W / scale) + 2, gh = Math.ceil(H / scale) + 2;
  const g = [];
  for (let i = 0; i < gw * gh; i++) g.push(R._rand());
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const v = (a, b) => g[b * gw + a];
    const top = v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx;
    const bot = v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bot * ty;
  };
}

function genMap(W, H) {
  const n1 = makeNoise(W, H, 9), n2 = makeNoise(W, H, 4), n3 = makeNoise(W, H, 2);
  const moist = makeNoise(W, H, 7), tempN = makeNoise(W, H, 8);
  const main = { x: W / 2 + R.int(-3, 3), y: H / 2 + R.int(-3, 3), r: W * 0.3 };
  const centers = [main];
  for (let tries = 0; tries < 300 && centers.length < 9; tries++) {
    const c = { x: R.int(3, W - 4), y: R.int(3, H - 4), r: R.float(2.5, 6.5) };
    if (centers.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > o.r + c.r + 3)) centers.push(c);
  }
  const tiles = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let mask = 0;
      for (const c of centers) mask = Math.max(mask, 1 - Math.hypot(x - c.x, y - c.y) / c.r);
      const fb = n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15;
      const e = mask * 0.95 + (fb - 0.5) * 0.7 - 0.22;
      const temp = y / (H - 1) * 0.85 + (tempN(x, y) - 0.5) * 0.35; // north is cold
      const m = moist(x, y);
      let type, h;
      if (e < -0.12) { type = 'deep'; h = 0; }
      else if (e < 0) { type = 'water'; h = 0; }
      else if (e < 0.06) { type = temp < 0.18 ? 'snow' : 'sand'; h = 1; }
      else if (e > 0.62) { type = 'mountain'; h = 4; }
      else if (e > 0.46) { type = temp < 0.2 ? 'snow' : 'hills'; h = 3; }
      else {
        h = e > 0.28 ? 2 : 1;
        if (temp < 0.2) type = 'snow';
        else if (temp > 0.68 && m < 0.42) type = 'desert';
        else if (temp > 0.62 && m > 0.6) type = 'jungle';
        else if (m > 0.72) type = 'swamp';
        else if (m > 0.52) type = 'forest';
        else type = 'grass';
      }
      tiles.push({ x, y, h, type, feature: null, e: Math.round(e * 1000) / 1000 });
    }
  }
  return { W, H, tiles };
}

function isWater(t) { return t && GD.BIOMES[t.type].water; }
function isLand(t) { return t && !isWater(t); }
function passable(t) { return !!t && (isLand(t) || hasTech('boats')); }
function neighbors(t) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => tileAt(t.x + dx, t.y + dy)).filter(passable);
}
// days to enter a tile
function moveDays(t) {
  let d = 15 * GD.BIOMES[t.type].cost;
  if (isWater(t)) { if (hasTech('steam')) d = 15; }
  else {
    d *= 1 - G.house.up.horses * 0.18;
    if (hasTech('roads')) d *= 0.75;
    if (hasTech('carts')) d *= 0.75;
    if (hasTech('rail')) d *= 0.6;
  }
  return Math.max(2, d);
}

function labelLandmasses(map) {
  let id = 0;
  for (const t of map.tiles) {
    if (!isLand(t) || t.land != null) continue;
    const q = [t]; t.land = id; let size = 0;
    while (q.length) {
      const c = q.shift(); size++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = map.tiles[(c.y + dy) * map.W + (c.x + dx)];
        if (n && Math.abs(n.x - c.x) + Math.abs(n.y - c.y) === 1 && isLand(n) && n.land == null) { n.land = id; q.push(n); }
      }
    }
    map.lands = map.lands || {};
    map.lands[id] = size;
    id++;
  }
}

function townName() {
  const used = new Set((G.world.towns || []).map((t) => t.name));
  for (let i = 0; i < 50; i++) {
    const n = R.pick(GD.TOWN_SYL.a) + R.pick(GD.TOWN_SYL.b);
    if (!used.has(n)) return n;
  }
  return 'New ' + R.pick(GD.TOWN_SYL.a) + 'ford';
}

function placeFeatures(map) {
  labelLandmasses(map);
  const cx = map.W / 2, cy = map.H / 2;
  const land = map.tiles.filter((t) => t.type === 'grass' || t.type === 'forest');
  land.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  const estate = land[0];
  estate.feature = 'estate'; estate.type = 'grass';
  const mainland = estate.land;
  const far = (t, list, d) => list.every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= d);
  const settle = (t) => ['grass', 'forest', 'sand', 'desert', 'jungle', 'snow'].includes(t.type) && !t.feature;
  const towns = [];
  const shuffled = R.shuffle(map.tiles.filter(settle));
  for (const t of shuffled) {
    if (towns.filter((x) => x.land === mainland).length >= Math.round(5 * map.W / 44)) break;
    if (t.land === mainland && far(t, [estate, ...towns], 6)) { t.feature = 'town'; towns.push(t); }
  }
  // island towns, one per sizeable island
  const islandIds = Object.keys(map.lands).map(Number).filter((id) => id !== mainland && map.lands[id] >= 8);
  for (const id of R.shuffle(islandIds).slice(0, Math.round(4 * map.W / 44))) {
    const t = shuffled.find((x) => x.land === id && !x.feature && far(x, towns, 4));
    if (t) { t.feature = 'town'; towns.push(t); }
  }
  const ruins = [];
  for (const t of R.shuffle(map.tiles.filter((t) => isLand(t) && !t.feature && t.type !== 'sand'))) {
    if (ruins.length >= Math.round(11 * map.W / 44)) break;
    const onMain = t.land === mainland;
    if (onMain && ruins.filter((r) => r.land === mainland).length >= Math.round(7 * map.W / 44)) continue;
    if (far(t, [estate, ...towns, ...ruins], 5)) { t.feature = 'ruins'; t.cleared = 0; ruins.push(t); }
  }
  // the Black Spire: the land tile farthest from home, ideally on an island
  const spireCands = map.tiles.filter((t) => isLand(t) && !t.feature && t.land !== mainland);
  const pool = spireCands.length ? spireCands : map.tiles.filter((t) => isLand(t) && !t.feature);
  pool.sort((a, b) => (Math.abs(b.x - estate.x) + Math.abs(b.y - estate.y)) - (Math.abs(a.x - estate.x) + Math.abs(a.y - estate.y)));
  const spire = pool[0];
  spire.feature = 'spire'; spire.type = 'mountain'; spire.h = 4;
  // beacon shrines on far coasts and islands
  const shrines = [];
  for (const t of R.shuffle(map.tiles.filter((t) => isLand(t) && !t.feature))) {
    if (shrines.length >= Math.round(4 * map.W / 44)) break;
    if (far(t, [estate, ...towns, ...ruins, spire, ...shrines], 7)) { t.feature = 'shrine'; t.lit = false; shrines.push(t); }
  }
  return { estate, towns, ruins, spire, mainland };
}

function initWorld() {
  let map, f;
  for (let tries = 0; tries < 40; tries++) {
    map = genMap(WORLD_SIZE, WORLD_SIZE);
    G.world.map = map;
    f = placeFeatures(map);
    if (f.towns.filter((t) => t.land === f.mainland).length >= 5 && f.ruins.length >= 8) break;
  }
  G.world.mainland = f.mainland;
  G.world.towns = f.towns.map((t, i) => {
    t.townIdx = i;
    return { name: townName(), x: t.x, y: t.y, size: t.land === f.mainland ? R.int(2, 3) : R.int(1, 2), founded: START_YEAR - R.int(50, 400), fallen: false, growth: 0 };
  });
  G.world.estate = { x: f.estate.x, y: f.estate.y };
  G.world.spire = { x: f.spire.x, y: f.spire.y };
  G.pos = { x: f.estate.x, y: f.estate.y };
  // technology arrives at different times each run, and sometimes not at all
  let last = 0;
  G.world.tech = GD.TECH.map((t) => {
    let yr = R.int(t.years[0], t.years[1]);
    yr = Math.max(yr, last + 15); last = yr;
    return { key: t.key, year: R.chance(0.07) && t.key !== 'boats' ? null : START_YEAR + yr, got: false };
  });
  G.world.doom = { year: START_YEAR + GD.DOOM_YEARS, wards: 0, quest: null, done: [] };
  G.house.influence = {};
  G.house.culture = { formed: false, name: null };
  G.house.scandal = 0;
}

function liveTowns() { return G.world.towns.filter((t) => !t.fallen); }
function randomTownIdx() {
  const live = G.world.towns.map((t, i) => [t, i]).filter(([t]) => !t.fallen);
  const main = live.filter(([t]) => tileAt(t.x, t.y).land === G.world.mainland);
  const pickFrom = main.length ? main : live;
  return pickFrom.length ? R.pick(pickFrom)[1] : 0;
}

// ---------------------------------------------------------------- technology
function hasTech(k) { const t = (G.world.tech || []).find((x) => x.key === k); return !!(t && t.got); }
function techTick() {
  for (const t of G.world.tech || []) {
    if (!t.got && t.year && year() >= t.year) {
      t.got = true;
      const d = GD.TECH.find((x) => x.key === t.key);
      chron(`A new age of invention: ${d.name}. ${d.desc}`, 'era', [], 'tech');
    }
  }
}

// ---------------------------------------------------------------- towns rise and fall
function townTick() {
  const E = G.world.era.type;
  const eraG = { abundance: 0.08, peace: 0.06, famine: -0.06, war: -0.07, golden: 0.1 }[E] || 0;
  const hard = E === 'war' || E === 'famine';
  const alive = liveTowns().length;
  G.world.towns.forEach((town, i) => {
    if (town.fallen) return;
    town.growth = (town.growth || 0) + eraG + (G.world.prosperity - 30) / 1000 + R.float(-0.1, 0.1) + (town.size <= 1 ? 0.03 : 0);
    if (E === 'war' && town.size <= 2 && alive > 4 && R.chance(0.015)) { town.growth = -1; town.size = 1; }
    if (town.growth >= 1 && town.size < 5) {
      town.size++; town.growth = 0;
      if (town.size >= 4) chron(`${town.name} has grown into a ${GD.TOWN_SIZES[town.size]}.`, 'good', [], 'town');
    } else if (town.growth <= -1) {
      town.size--; town.growth = 0;
      if (town.size <= 0 && (liveTowns().length <= 3 || !hard || R.chance(0.6))) town.size = 1;
      else if (town.size <= 0) fallTown(town, i);
      else if (town.size <= 1) chron(`${town.name} has dwindled to a ${GD.TOWN_SIZES[town.size].toLowerCase()}.`, 'bad', [], 'town');
    }
  });
  // settlers found new towns in good times, or rebuild fallen ones
  const good = E === 'abundance' || E === 'peace' || E === 'golden';
  const fallen = G.world.towns.map((t, i) => [t, i]).filter(([t]) => t.fallen);
  if (good && fallen.length && R.chance(0.04 + G.world.prosperity / 1500)) {
    const [town, idx] = R.pick(fallen);
    const t = tileAt(town.x, town.y);
    town.fallen = false; town.size = 1; town.growth = 0; town.rebuilt = year();
    t.feature = 'town'; t.townIdx = idx; t.ruinOf = null;
    chron(`Settlers return to the ruins of ${town.name} and rebuild it.`, 'good', [], 'town');
    for (let k = 0; k < 2; k++) spawnWanderer(idx);
  }
  if (R.chance(0.045 * (G.world.prosperity / 50) * (good ? 1.4 : 0.5))) {
    const taken = [...G.world.towns.filter((t) => !t.fallen), G.world.estate];
    const spots = G.world.map.tiles.filter((t) => ['grass', 'forest', 'sand', 'desert', 'jungle'].includes(t.type) && !t.feature &&
      taken.every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= 5));
    if (spots.length) {
      const t = R.pick(spots);
      const town = { name: townName(), x: t.x, y: t.y, size: 1, founded: year(), fallen: false, growth: 0 };
      t.feature = 'town'; t.townIdx = G.world.towns.length;
      G.world.towns.push(town);
      chron(`Settlers founded ${town.name}${t.land !== G.world.mainland ? ' on a distant island' : ''}.`, 'good', [], 'town');
      for (let k = 0; k < 2; k++) spawnWanderer(t.townIdx);
    }
  }
}
function fallTown(town, idx) {
  town.fallen = true; town.size = 0;
  const t = tileAt(town.x, town.y);
  t.feature = 'ruins'; t.cleared = 0; t.ruinOf = town.name;
  chron(`${town.name} has fallen. Only ruins remain.`, 'bad', [], 'town');
  for (const c of Object.values(G.chars)) if (c.alive && c.status === 'npc' && c.town === idx) c.town = randomTownIdx();
  if (G.world.doom.quest && G.world.doom.quest.townIdx === idx) G.world.doom.quest = null;
}

// ---------------------------------------------------------------- attractiveness
function attractiveness(c) {
  let a = c.looks ?? 5;
  a += { child: 0, youth: 1, prime: 0.5, seasoned: -0.5, elder: -1.5, venerable: -2.5 }[stageKey(c)];
  for (const k of c.injuries || []) a += { lostEye: -1, lostArm: -0.5, lostLeg: -0.5, scarred: -0.3 }[k] || 0;
  if (c.condition) a -= 0.5;
  a -= (c.inbred || 0) * 6;
  return clamp(Math.round(a * 2) / 2, 0, 10);
}
function attractivenessLabel(c) {
  const a = attractiveness(c);
  return a >= 9.5 ? 'Beautiful' : a >= 8.5 ? 'Striking' : a >= 7 ? 'Comely' : a >= 5 ? 'Fair' : a >= 3 ? 'Plain' : 'Homely';
}

// ---------------------------------------------------------------- kinship and taboo
function bioParents(c) { return c.parents.map(ch).filter(Boolean); }
function ancestry(c, max = 4) {
  if (G._anc && G._anc.has(c.id)) return G._anc.get(c.id);
  const m = new Map([[c.id, 0]]);
  let frontier = [c];
  for (let d = 1; d <= max; d++) {
    const next = [];
    for (const p of frontier) for (const q of bioParents(p)) if (!m.has(q.id)) { m.set(q.id, d); next.push(q); }
    frontier = next;
  }
  if (G._anc) G._anc.set(c.id, m);
  return m;
}
// Wright's coefficient over nearest common ancestors, plus a plain-language relation.
function kinship(a, b) {
  if (!a || !b || a.id === b.id) return { coef: 0, sev: 0, rel: null };
  const A = ancestry(a), B = ancestry(b);
  const common = [...A.keys()].filter((id) => B.has(id));
  if (!common.length) return { coef: 0, sev: 0, rel: null };
  const set = new Set(common);
  const nearest = common.filter((id) => !common.some((other) => other !== id && ch(other) && ch(other).parents.includes(id) && set.has(other)));
  let coef = 0, best = null;
  for (const id of nearest) {
    const da = A.get(id), db = B.get(id);
    coef += Math.pow(0.5, da + db + 1) * (1 + (ch(id).inbred || 0));
    if (!best || da + db < best.da + best.db) best = { da, db };
  }
  const shared = nearest.filter((id) => A.get(id) === best.da && B.get(id) === best.db).length;
  const half = shared < 2 && best.da > 0 && best.db > 0;
  const rel = relationName(best.da, best.db, b, half);
  const sev = { line: 4.5, parent: 5, child: 5, grandparent: 4.5, grandchild: 4.5, sibling: 4, 'half-sibling': 3.5, 'aunt/uncle': 3, 'niece/nephew': 3,
    'great-aunt/uncle': 2, 'grand-niece/nephew': 2, 'first cousin': 2, 'first cousin once removed': 1.5, 'second cousin': 1 }[rel.key] ?? 0.6;
  return { coef, sev: half && sev >= 3 && rel.key !== 'half-sibling' ? sev - 0.5 : sev, rel: rel.text };
}
// what b is to a, given each one's depth to their nearest common ancestor
function relationName(da, db, b, half) {
  const g = b.gender === 'woman';
  const h = half ? 'half-' : '';
  if (da === 0 && db === 1) return { key: 'child', text: g ? 'daughter' : 'son' };
  if (da === 1 && db === 0) return { key: 'parent', text: g ? 'mother' : 'father' };
  if (da === 0 && db === 2) return { key: 'grandchild', text: g ? 'granddaughter' : 'grandson' };
  if (da === 2 && db === 0) return { key: 'grandparent', text: g ? 'grandmother' : 'grandfather' };
  if (da === 0 || db === 0) return { key: 'line', text: da === 0 ? 'descendant' : 'ancestor' };
  if (da === 1 && db === 1) return { key: half ? 'half-sibling' : 'sibling', text: h + (g ? 'sister' : 'brother') };
  if (da === 1 && db === 2) return { key: 'niece/nephew', text: h + (g ? 'niece' : 'nephew') };
  if (da === 2 && db === 1) return { key: 'aunt/uncle', text: h + (g ? 'aunt' : 'uncle') };
  if (da === 1 && db === 3) return { key: 'grand-niece/nephew', text: g ? 'grand-niece' : 'grand-nephew' };
  if (da === 3 && db === 1) return { key: 'great-aunt/uncle', text: g ? 'great-aunt' : 'great-uncle' };
  if (da === 2 && db === 2) return { key: 'first cousin', text: 'first cousin' };
  if ((da === 2 && db === 3) || (da === 3 && db === 2)) return { key: 'first cousin once removed', text: 'first cousin once removed' };
  if (da === 3 && db === 3) return { key: 'second cousin', text: 'second cousin' };
  return { key: 'distant', text: 'distant kin' };
}
// how close a union the people of this era will tolerate (in severity units)
function eraKinTolerance() { const k = (G.world.era.values || {}).kin ?? -0.6; return 0.6 + (k + 1) * 1.6; }
function houseKinTolerance() {
  const k = Math.max((G.world.era.values || {}).kin ?? -0.6, G.house.culture.formed ? cultureValue('kin') : -1);
  return 0.6 + (k + 1) * 1.6;
}
function kinBlocked(a, b) {
  const k = kinship(a, b);
  if (!k.sev) return false;
  if (k.sev >= 4.5) return true; // parents and grandparents never pair off on their own
  const tol = (a.house === G.house.name || b.house === G.house.name) ? houseKinTolerance() : eraKinTolerance();
  return k.sev > tol;
}
function kinScandal(a, b) {
  const k = kinship(a, b);
  if (!k.sev) return;
  if (a.house === G.house.name || b.house === G.house.name) recordChoice('kin', k.sev / 2.5, G.mcId);
  const over = k.sev - eraKinTolerance();
  if (over > 0) {
    const loss = Math.round(over * 5);
    G.house.prestige = Math.max(0, G.house.prestige - loss);
    G.house.scandal = (G.house.scandal || 0) + over * 0.15;
    chron(`${a.name} wed their own ${k.rel}, ${b.name}. The realm is scandalised. Prestige −${loss}.`, 'bad', [a.id, b.id], 'scandal');
  }
}

// ---------------------------------------------------------------- culture
function recordChoice(axis, v, actorId) {
  if (!actorId || !G.house.influence) return;
  const inf = G.house.influence[actorId] || (G.house.influence[actorId] = {});
  inf[axis] = (inf[axis] || 0) + v;
  checkCultureForms();
}
function influenceWeight(id) {
  const c = ch(id);
  if (!c) return 1;
  return Math.max(1, age(c) - GD.RACES[c.race].maturity + 1); // the longer they lived, the more they shaped the House
}
function cultureValue(axis) {
  let sum = 0, w = 0;
  for (const [id, inf] of Object.entries(G.house.influence || {})) {
    if (inf[axis] == null) continue;
    const wt = influenceWeight(id);
    sum += Math.tanh(inf[axis] / 3) * wt;
    w += wt;
  }
  return w ? sum / w : 0;
}
function houseMembersEver() { return Object.values(G.chars).filter((c) => c.house === G.house.name).length; }
function checkCultureForms() {
  const cu = G.house.culture;
  if (!cu || cu.formed) return;
  if (houseMembersEver() >= GD.CULTURE_MEMBERS && Object.keys(G.house.influence).length >= 1) {
    cu.formed = true;
    cu.name = `${G.house.name} ${R.pick(['Way', 'Custom', 'Creed', 'Tradition'])}`;
    cu.since = year();
    chron(`House ${G.house.name} has grown enough for its ways to become a culture: the ${cu.name}. ${cultureTenets().join(', ') || 'Its tenets are still taking shape'}.`, 'head', [G.mcId], 'culture');
  }
}
function cultureTenets() {
  return Object.entries(GD.CULTURE_AXES).map(([k, ax]) => {
    const v = cultureValue(k);
    return Math.abs(v) >= 0.25 ? (v > 0 ? ax.pos : ax.neg) : null;
  }).filter(Boolean);
}
function topInfluencers(n = 5) {
  return Object.keys(G.house.influence || {}).map((id) => ({ c: ch(id), w: influenceWeight(id) })).filter((x) => x.c).sort((a, b) => b.w - a.w).slice(0, n);
}
// each era's people hold their own values, drifting from the last era's
function rollEraValues(type, prev) {
  const bias = {
    war: { martial: 0.4, charity: -0.2, accept: -0.15 }, famine: { charity: 0.35, open: -0.3 }, peace: { open: 0.25, accept: 0.2, martial: -0.2 },
    abundance: { love: 0.25, charity: -0.1 }, golden: { accept: 0.35, open: 0.3, charity: 0.2 },
  }[type] || {};
  const out = {};
  for (const k of Object.keys(GD.CULTURE_AXES)) {
    const base = prev ? prev[k] : (k === 'kin' ? R.float(-0.9, -0.3) : R.float(-0.4, 0.4));
    out[k] = clamp(base * 0.6 + R.float(-0.35, 0.35) + (bias[k] || 0) + (k === 'kin' ? -0.3 : 0), -1, 1);
  }
  return out;
}
// how the people of this era see the House: alignment of values, minus lingering scandal
function reputation() {
  if (!G.house.culture || !G.house.culture.formed) return 0;
  const w = G.world.era.values || {};
  const axes = Object.keys(GD.CULTURE_AXES);
  let al = 0;
  for (const k of axes) al += 1 - Math.abs(cultureValue(k) - (w[k] || 0)) / 2;
  return clamp((al / axes.length - 0.74) * 4 - (G.house.scandal || 0), -1, 1);
}
function reputationInfo() {
  if (!G.house.culture || !G.house.culture.formed) return { name: 'Unknown', color: '#a59c8e' };
  const r = reputation();
  return GD.REPUTATION.find((x) => r >= x.min);
}
function repMult() { return 1 + reputation() * 0.25; }

// ---------------------------------------------------------------- the thousand-year doom and its quests
function doomYearsLeft() { return G.world.doom.year - year(); }
function questPlace(t) {
  if (t.feature === 'town') return G.world.towns[t.townIdx].name;
  const near = liveTowns().sort((a, b) => (Math.abs(a.x - t.x) + Math.abs(a.y - t.y)) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y)))[0];
  const where = isLand(t) && t.land !== G.world.mainland ? 'an island' : GD.BIOMES[t.type].name.toLowerCase();
  return `the ${t.ruinOf ? 'ruins of ' + t.ruinOf : t.feature === 'shrine' ? 'beacon shrine' : t.feature === 'ruins' ? 'ruins' : where}${near ? ' near ' + near.name : ''}`;
}
function reachable(t) {
  if (hasTech('boats')) return true;
  return t.land === G.world.mainland;
}
function newQuest() {
  const d = G.world.doom;
  const opts = {};
  const ruins = G.world.map.tiles.filter((t) => t.feature === 'ruins' && reachable(t) && !(t.cleared && year() < (t.clearedYear || 0) + 5));
  if (ruins.length) opts.seal = 3;
  const shrines = G.world.map.tiles.filter((t) => t.feature === 'shrine' && !t.lit && reachable(t));
  if (shrines.length) opts.beacon = 2;
  opts.herald = 2.5;
  if (liveTowns().length >= 3) opts.rally = 1.5;
  opts.champion = 1;
  const type = R.weighted(opts);
  const q = { type, gen: G.house.generation, given: year(), progress: [] };
  if (type === 'seal') { const t = R.pick(ruins); Object.assign(q, { x: t.x, y: t.y, place: questPlace(t) }); }
  if (type === 'beacon') { const t = R.pick(shrines); Object.assign(q, { x: t.x, y: t.y, place: questPlace(t) }); }
  if (type === 'herald') {
    const est = G.world.estate;
    const spots = G.world.map.tiles.filter((t) => isLand(t) && !t.feature && reachable(t) && Math.abs(t.x - est.x) + Math.abs(t.y - est.y) >= 8);
    const t = R.pick(spots.length ? spots : G.world.map.tiles.filter((x) => isLand(x) && !x.feature));
    Object.assign(q, { x: t.x, y: t.y, place: questPlace(t) });
  }
  if (type === 'rally') q.count = 3;
  if (type === 'champion') q.count = Math.max(5, Math.ceil(partyLevel() + 4));
  q.title = GD.QUESTS[type].name;
  q.desc = GD.QUESTS[type].desc.replace('{place}', q.place || '').replace('{count}', q.count || '');
  d.quest = q;
  chron(`A new task for House ${G.house.name}: ${q.title}. ${q.desc}`, 'quest', [G.mcId], 'quest');
}
function completeQuest() {
  const d = G.world.doom;
  const q = d.quest;
  if (!q) return;
  d.wards++;
  d.done.push({ title: q.title, year: year(), by: G.mcId, gen: G.house.generation });
  G.house.prestige += Math.round(10 * repMult());
  addProsperity(3);
  if (q.type === 'beacon') { const t = tileAt(q.x, q.y); if (t) t.lit = true; }
  const nth = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'][d.wards - 1] || `${d.wards}th`;
  chron(`${q.title} is done. The ${nth} Ward against ${GD.VILLAIN.name} is raised (${d.wards}/${GD.WARDS_NEEDED}).`, 'ward', [G.mcId, ...G.party], 'ward');
  d.quest = null;
  newQuest();
}
function doomTick() {
  const d = G.world.doom;
  if (!d) return;
  const left = doomYearsLeft();
  if (left > 0 && left % 100 === 0) chron(`An omen: ${GD.VILLAIN.name} stirs in ${GD.VILLAIN.seat}. ${left} years remain before the end.`, 'bad', [], 'omen');
  if (left === 10) chron(`The sky darkens over ${GD.VILLAIN.seat}. Ten years remain.`, 'bad', [], 'omen');
  if (left <= 0 && !d.ended && !G.world.saved) G.pendingDoom = true;
  if (!d.quest && G.mcId) newQuest();
}
function villainLevel() {
  return Math.max(10, Math.round(16 + (year() - START_YEAR) / 30 - G.world.doom.wards * 3));
}

// ---------------------------------------------------------------- keep the save small over a thousand years
function pruneDead() {
  const keep = new Set();
  for (const c of Object.values(G.chars)) {
    if (!c.alive) continue;
    for (const id of ancestry(c, 4).keys()) keep.add(id);
  }
  for (const e of G.ledger || []) for (const id of e.ids || []) keep.add(id);
  Object.keys(G.house.influence || {}).forEach((id) => keep.add(id));
  (G.house.reigns || []).forEach((r) => keep.add(r.id));
  for (const [id, c] of Object.entries(G.chars)) {
    if (!c.alive && !keep.has(id) && c.house !== G.house.name && G.day - c.died > 40 * DAYS_PER_YEAR) delete G.chars[id];
  }
}

// Each ruin has its own fixed danger, set by distance from home and creeping up over the centuries.
// It does not chase the party's level, so getting stronger lets you clear it.
function ruinLevel(t) {
  if (t.lvl == null) {
    const d = Math.abs(t.x - G.world.estate.x) + Math.abs(t.y - G.world.estate.y);
    t.lvl = Math.max(2, Math.round(2 + d / 3.5 + (t.land !== G.world.mainland ? 2 : 0)));
  }
  let lvl = t.lvl + Math.floor((year() - START_YEAR) / 90);
  const q = G.world.doom && G.world.doom.quest;
  if (q && q.type === 'seal' && q.x === t.x && q.y === t.y) lvl = Math.min(lvl, Math.ceil(partyLevel()) + 1);
  return lvl;
}
