// Careful Start: customize run baselines after Prepare Carefully, and share them as a seed string.
// Seed format: GR1.<base64url(JSON)> where JSON holds v, seed, and the exposed run knobs.
'use strict';

const CarefulStart = {
  VERSION: 1,
  PREFIX: 'GR1.',

  // Knobs that already exist in the model — do not invent systems beyond these.
  defaultsFromGame() {
    const hs = G && G.house;
    return {
      seed: (Date.now() ^ (Math.floor(Math.random() * 1e9))) >>> 0 || 1,
      startYear: (G && G.startYear) || DEFAULT_START_YEAR,
      prosperity: (G && G.world && G.world.prosperity != null) ? G.world.prosperity : 30,
      wards: (G && G.world && G.world.doom) ? G.world.doom.wards : 0,
      doomYears: GD.DOOM_YEARS,
      estateTier: hs ? hs.tier : 0,
      gold: hs ? hs.gold : 150,
      prestige: hs ? hs.prestige : 0,
      potions: hs ? hs.potions : 3,
      era: (G && G.world && G.world.era && G.world.era.type) || 'peace',
      worldSize: WORLD_SIZE || DEFAULT_WORLD_SIZE,
      houseName: hs ? hs.name : '',
      heraldry: hs && hs.heraldry ? JSON.parse(JSON.stringify(hs.heraldry)) : null,
    };
  },

  clampConfig(cfg) {
    const out = { ...this.defaultsFromGame(), ...cfg };
    out.v = this.VERSION;
    out.seed = (Number(out.seed) >>> 0) || 1;
    out.startYear = clamp(Math.round(Number(out.startYear) || DEFAULT_START_YEAR), 1, 9999);
    out.prosperity = clamp(Math.round(Number(out.prosperity) || 0), 0, 94);
    out.wards = clamp(Math.round(Number(out.wards) || 0), 0, GD.WARDS_NEEDED);
    out.doomYears = clamp(Math.round(Number(out.doomYears) || GD.DOOM_YEARS), 100, 2000);
    out.estateTier = clamp(Math.round(Number(out.estateTier) || 0), 0, GD.ESTATE.length - 1);
    out.gold = clamp(Math.round(Number(out.gold) || 0), 0, 50000);
    out.prestige = clamp(Math.round(Number(out.prestige) || 0), 0, 500);
    out.potions = clamp(Math.round(Number(out.potions) || 0), 0, 99);
    out.era = GD.ERAS[out.era] ? out.era : 'peace';
    out.worldSize = [44, 64, 80].includes(Number(out.worldSize)) ? Number(out.worldSize) : DEFAULT_WORLD_SIZE;
    out.houseName = String(out.houseName || '').trim().slice(0, 20);
    return out;
  },

  // Compact payload for the shareable string (omit null heraldry).
  payload(cfg) {
    const c = this.clampConfig(cfg);
    const p = {
      v: this.VERSION,
      seed: c.seed,
      startYear: c.startYear,
      prosperity: c.prosperity,
      wards: c.wards,
      doomYears: c.doomYears,
      estateTier: c.estateTier,
      gold: c.gold,
      prestige: c.prestige,
      potions: c.potions,
      era: c.era,
      worldSize: c.worldSize,
      houseName: c.houseName,
    };
    if (c.heraldry) p.heraldry = c.heraldry;
    return p;
  },

  encode(cfg) {
    const json = JSON.stringify(this.payload(cfg));
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return this.PREFIX + b64;
  },

  decode(str) {
    const raw = String(str || '').trim();
    if (!raw) throw new Error('Empty seed');
    let body = raw;
    if (body.startsWith(this.PREFIX)) body = body.slice(this.PREFIX.length);
    else if (/^GR\d+\./i.test(body)) body = body.replace(/^GR\d+\./i, '');
    const pad = body.length % 4 === 0 ? '' : '='.repeat(4 - (body.length % 4));
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/') + pad;
    let json;
    try {
      json = decodeURIComponent(escape(atob(b64)));
    } catch (e) {
      throw new Error('Seed is not valid base64');
    }
    let data;
    try { data = JSON.parse(json); } catch (e) { throw new Error('Seed JSON is invalid'); }
    if (!data || typeof data !== 'object') throw new Error('Seed payload missing');
    if (data.v != null && data.v !== this.VERSION) throw new Error(`Unsupported seed version ${data.v}`);
    return this.clampConfig(data);
  },

  // Re-roll the map and NPC population from the seed while keeping the prepared House.
  rebuildWorld(cfg) {
    const c = this.clampConfig(cfg);
    const keepIds = new Set([G.mcId, G.founderId, G.heirId, ...(G.party || [])].filter(Boolean));
    const mc = ch(G.mcId);
    const partner = mc && spouseOf(mc);
    if (partner) keepIds.add(partner.id);
    const kept = {};
    for (const id of keepIds) if (G.chars[id]) kept[id] = G.chars[id];
    const houseKeep = {
      name: c.houseName || G.house.name,
      color: G.house.color,
      heraldry: c.heraldry || G.house.heraldry,
      prestige: c.prestige,
      gold: c.gold,
      tier: c.estateTier,
      up: { ...G.house.up },
      retinue: G.house.retinue,
      potions: c.potions,
      generation: G.house.generation,
      heirloom: G.house.heirloom,
      heroes: [...(G.house.heroes || [])],
      reigns: G.house.reigns ? G.house.reigns.map((r) => ({ ...r })) : [],
      stash: G.house.stash ? G.house.stash.slice() : [],
      lore: { ...(G.house.lore || {}) },
      influence: {},
      culture: { formed: false, name: null },
      scandal: 0,
    };
    const ids = {
      mcId: G.mcId, founderId: G.founderId, heirId: G.heirId, party: [...(G.party || [])],
    };

    START_YEAR = c.startYear;
    WORLD_SIZE = c.worldSize;
    R.seed(c.seed);

    G.chars = {};
    G.party = [];
    G.mcId = null;
    G.founderId = null;
    G.heirId = null;
    G.log = [];
    G.ledger = [];
    G.newsQueue = [];
    G.day = 0;
    G.startYear = c.startYear;
    G.seed = c.seed;
    G.careful = { ...this.payload(c) };
    G.world = { map: null, towns: [], prosperity: c.prosperity, era: null, eras: [], victory: false };
    G.heraldry = G.heraldry || {};

    initWorld();
    startEra(c.era, 6);
    seedPopulation();

    // Restore prepared House characters after NPC seeding.
    for (const [id, char] of Object.entries(kept)) G.chars[id] = char;
    G.mcId = ids.mcId;
    G.founderId = ids.founderId;
    G.heirId = ids.heirId;
    G.party = ids.party.filter((id) => G.chars[id]);
    Object.assign(G.house, houseKeep);
    G.house.name = houseKeep.name;
    if (houseKeep.heraldry) {
      G.house.heraldry = houseKeep.heraldry;
      G.house.color = Heraldry.color(houseKeep.heraldry.primary);
      G.heraldry[G.house.name] = houseKeep.heraldry;
    }
    for (const char of Object.values(kept)) {
      if (char.house === houseKeep.name || char.status === 'party' || char.id === G.mcId || (partner && char.id === partner.id)) {
        char.house = G.house.name;
      }
    }
    G.world.prosperity = c.prosperity;
    G.world.doom = {
      year: START_YEAR + c.doomYears,
      wards: c.wards,
      quest: null,
      done: [],
    };
    G.pos = { x: G.world.estate.x, y: G.world.estate.y };
    if (G.ppos) G.ppos = { ...G.pos };
    R.seed(null); // later play uses unseeded RNG; world layout is already fixed
    return c;
  },
};
