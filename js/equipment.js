// Equipment slots, class-based kits, house stash, and try-on helpers.
// UI chrome comes from Kasaya's Frames (see assets/ui/).
'use strict';

GD.EQ_SLOTS = {
  head:    { name: 'Head',     empty: 'slot-helm',     order: 0 },
  neck:    { name: 'Neck',     empty: 'slot-neck',     order: 1 },
  body:    { name: 'Body',     empty: 'slot-armour',   order: 2 },
  hand:    { name: 'Hand',     empty: 'shop-weapons',  order: 3 },
  offhand: { name: 'Off-hand', empty: 'slot-bracelet', order: 4 },
  feet:    { name: 'Feet',     empty: 'slot-boot',     order: 5 },
  ring:    { name: 'Ring',     empty: 'slot-ring',     order: 6 },
};

// What each class wears. Martial classes take armour / helms / boots;
// casters and bards take robes / crowns / shoes; rangers take leather / hoods.
GD.CLASS_KIT = {
  warrior:   { head: 'helm',  body: 'armor',   hand: 'blade', offhand: 'shield', feet: 'boots', neck: 'amulet', ring: 'ring' },
  berserker: { head: 'helm',  body: 'armor',   hand: 'axe',   offhand: null,     feet: 'boots', neck: 'amulet', ring: 'ring' },
  sorcerer:  { head: 'crown', body: 'robe',    hand: 'orb',   offhand: null,     feet: 'shoes', neck: 'amulet', ring: 'ring' },
  priest:    { head: 'crown', body: 'robe',    hand: 'staff', offhand: null,     feet: 'shoes', neck: 'amulet', ring: 'ring' },
  bard:      { head: 'crown', body: 'robe',    hand: 'lute',  offhand: null,     feet: 'shoes', neck: 'amulet', ring: 'ring' },
  knight:    { head: 'helm',  body: 'armor',   hand: 'lance', offhand: 'shield', feet: 'boots', neck: 'amulet', ring: 'ring' },
  ranger:    { head: 'hood',  body: 'leather', hand: 'bow',   offhand: null,     feet: 'boots', neck: 'amulet', ring: 'ring' },
};

// Item kinds: slot, icon glyph, combat bonuses by tier (1–5), and display names.
GD.ITEM_KINDS = {
  helm:    { slot: 'head', icon: 'helm', weapon: null, names: ['Iron Cap', 'Steel Helm', 'Fine Helm', 'Masterwork Helm', 'Mythril Helm'],
             atk: [0, 0, 0, 0, 0], def: [1, 2, 3, 4, 6], mag: [0, 0, 0, 0, 0] },
  crown:   { slot: 'head', icon: 'helm', weapon: null, names: ['Copper Circlet', 'Silver Circlet', 'Gold Crown', 'Arcane Crown', 'Star Crown'],
             atk: [0, 0, 0, 0, 0], def: [0, 1, 1, 2, 3], mag: [1, 2, 3, 5, 7] },
  hood:    { slot: 'head', icon: 'helm', weapon: null, names: ['Cloth Hood', 'Scout Hood', 'Ranger Hood', 'Shadow Hood', 'Wind Hood'],
             atk: [0, 0, 1, 1, 2], def: [0, 1, 2, 3, 4], mag: [0, 0, 0, 0, 0] },
  armor:   { slot: 'body', icon: 'armor', weapon: null, names: ['Iron Armour', 'Steel Armour', 'Fine Armour', 'Masterwork Armour', 'Mythril Armour'],
             atk: [0, 0, 0, 0, 0], def: [1, 3, 5, 8, 12], mag: [0, 0, 0, 0, 0] },
  robe:    { slot: 'body', icon: 'armor', weapon: null, names: ['Cloth Robe', 'Adept Robe', 'Mystic Robe', 'Archmage Robe', 'Starweave Robe'],
             atk: [0, 0, 0, 0, 0], def: [0, 1, 2, 3, 5], mag: [1, 3, 5, 8, 12] },
  leather: { slot: 'body', icon: 'armor', weapon: null, names: ['Hide Jerkin', 'Hardened Leather', 'Studded Leather', 'Masterwork Hide', 'Drakehide'],
             atk: [0, 0, 1, 2, 3], def: [1, 2, 4, 6, 9], mag: [0, 0, 0, 0, 0] },
  blade:   { slot: 'hand', icon: 'sword', weapon: 'shield', names: ['Iron Blade', 'Steel Blade', 'Fine Blade', 'Masterwork Blade', 'Mythril Blade'],
             atk: [2, 4, 7, 11, 16], def: [0, 0, 0, 0, 0], mag: [0, 0, 0, 0, 0] },
  axe:     { slot: 'hand', icon: 'sword', weapon: 'axe', names: ['Iron Axe', 'Steel Axe', 'Fine Axe', 'Masterwork Axe', 'Mythril Axe'],
             atk: [2, 5, 8, 12, 17], def: [0, 0, 0, 0, 0], mag: [0, 0, 0, 0, 0] },
  lance:   { slot: 'hand', icon: 'sword', weapon: 'lance', names: ['Iron Lance', 'Steel Lance', 'Fine Lance', 'Masterwork Lance', 'Mythril Lance'],
             atk: [2, 4, 7, 11, 16], def: [1, 1, 2, 2, 3], mag: [0, 0, 0, 0, 0] },
  bow:     { slot: 'hand', icon: 'bow', weapon: 'bow', names: ['Yew Bow', 'Ash Bow', 'Fine Bow', 'Masterwork Bow', 'Wind Bow'],
             atk: [2, 4, 7, 11, 16], def: [0, 0, 0, 0, 0], mag: [0, 0, 0, 0, 0] },
  staff:   { slot: 'hand', icon: 'staff', weapon: 'staff', names: ['Oak Staff', 'Ash Staff', 'Runed Staff', 'Archstaff', 'Star Staff'],
             atk: [1, 2, 3, 4, 6], def: [0, 0, 0, 0, 0], mag: [2, 4, 7, 11, 16] },
  orb:     { slot: 'hand', icon: 'staff', weapon: 'orb', names: ['Glass Orb', 'Crystal Orb', 'Arcane Orb', 'Master Orb', 'Void Orb'],
             atk: [0, 1, 2, 3, 4], def: [0, 0, 0, 0, 0], mag: [2, 5, 8, 12, 17] },
  lute:    { slot: 'hand', icon: 'sword', weapon: 'lute', names: ['Pine Lute', 'Maple Lute', 'Fine Lute', 'Masterwork Lute', 'Songwood Lute'],
             atk: [1, 2, 3, 5, 7], def: [0, 0, 0, 0, 0], mag: [1, 3, 5, 8, 11] },
  shield:  { slot: 'offhand', icon: 'armor', weapon: 'shield', names: ['Wooden Shield', 'Iron Shield', 'Steel Shield', 'Masterwork Shield', 'Mythril Shield'],
             atk: [0, 0, 0, 0, 0], def: [1, 2, 4, 6, 9], mag: [0, 0, 0, 0, 0] },
  boots:   { slot: 'feet', icon: 'boots', weapon: null, names: ['Leather Boots', 'Studded Boots', 'Steel Boots', 'Masterwork Boots', 'Mythril Boots'],
             atk: [0, 0, 0, 0, 0], def: [0, 1, 2, 3, 4], mag: [0, 0, 0, 0, 0] },
  shoes:   { slot: 'feet', icon: 'boots', weapon: null, names: ['Cloth Shoes', 'Soft Shoes', 'Embroidered Shoes', 'Silk Shoes', 'Starweave Shoes'],
             atk: [0, 0, 0, 0, 0], def: [0, 0, 1, 1, 2], mag: [0, 1, 1, 2, 3] },
  amulet:  { slot: 'neck', icon: 'necklace', weapon: null, names: ['Copper Amulet', 'Silver Amulet', 'Gold Amulet', 'Runed Amulet', 'Heirloom Amulet'],
             atk: [0, 0, 0, 1, 1], def: [0, 0, 1, 1, 2], mag: [0, 1, 2, 3, 5] },
  ring:    { slot: 'ring', icon: 'ring', weapon: null, names: ['Copper Ring', 'Silver Ring', 'Gold Ring', 'Runed Ring', 'Mythril Ring'],
             atk: [0, 0, 1, 1, 2], def: [0, 0, 0, 1, 1], mag: [0, 1, 1, 2, 3] },
};

GD.ITEM_ICON_ORDER = ['sword', 'bow', 'staff', 'helm', 'armor', 'legs', 'necklace', 'glove', 'ring', 'gem', 'boots'];

// Rarity weights and what each grade can roll. Higher rarity → more mods / skills / passives.
GD.RARITY = {
  common:    { name: 'Common',    color: '#c8c0b0', weight: 52, cost: 1,   mods: [0, 1], skill: 0.00, passive: 0.00 },
  uncommon:  { name: 'Uncommon',  color: '#6fe08a', weight: 26, cost: 1.6, mods: [0, 1], skill: 0.10, passive: 0.08 },
  rare:      { name: 'Rare',      color: '#6fb3d9', weight: 14, cost: 2.4, mods: [1, 2], skill: 0.28, passive: 0.20 },
  epic:      { name: 'Epic',      color: '#b48aff', weight: 6,  cost: 3.6, mods: [1, 2], skill: 0.50, passive: 0.40 },
  legendary: { name: 'Legendary', color: '#ffd76a', weight: 2,  cost: 5.5, mods: [2, 3], skill: 0.75, passive: 0.60 },
};

// Affixes: combat numbers or flat wearer stats.
GD.ITEM_MODS = {
  keen:     { name: 'Keen',     atk: 1 },
  ruthless: { name: 'Ruthless', atk: 2 },
  sturdy:   { name: 'Sturdy',   def: 1 },
  bulwark:  { name: 'Bulwarked', def: 2 },
  arcane:   { name: 'Arcane',   mag: 1 },
  radiant:  { name: 'Radiant',  mag: 2 },
  strong:   { name: 'of Strength',  stats: { str: 1 } },
  swift:    { name: 'of Swiftness', stats: { agi: 1 } },
  wise:     { name: 'of Insight',   stats: { int: 1 } },
  steadfast:{ name: 'of Will',      stats: { wil: 1 } },
  hardy:    { name: 'of Vigor',     stats: { vit: 1 } },
};

// Passives while the piece is worn (combat / economy hooks).
GD.ITEM_PASSIVES = {
  warding:    { name: 'Warding',     desc: 'Takes 6% less damage.' },
  bloodthirst:{ name: 'Bloodthirst', desc: 'Deals 6% more damage.' },
  thrifty:    { name: 'Thrifty',     desc: '+12% gold from victories.' },
  scholar:    { name: 'Scholar',     desc: '+10% XP while worn.' },
  laststand:  { name: 'Last Stand',  desc: 'Below 30% HP, takes 12% less damage.' },
  hunter:     { name: 'Hunter',      desc: '+8% critical chance.' },
};

// Bonus moves that can appear on rare+ gear (ability ids from GD.ABILITIES).
GD.ITEM_SKILLS = ['cleave', 'flurry', 'firebolt', 'mend', 'bulwark', 'aimedShot', 'inspire', 'smite'];

const Equip = {
  _seq: 1,
  uiReady: false,
  images: {},
};

Equip.loadUi = function () {
  if (this.uiReady) return;
  const files = [
    'slot-helm', 'slot-armour', 'slot-boot', 'slot-bracelet', 'slot-neck', 'slot-ring', 'slot-legs',
    'slot-brown', 'slot-empty', 'slots-grid', 'inventory-panel', 'item-describe', 'item-icons',
    'shop-weapons', 'shop-armors', 'confirm', 'x', 'select', 'hotbar',
  ];
  for (const key of files) {
    const img = new Image();
    img.src = `assets/ui/${key}.png`;
    this.images[key] = img;
  }
  this.uiReady = true;
};

Equip.img = function (key) { return this.images[key] || null; };

Equip.emptyEquip = function () {
  return { head: null, neck: null, body: null, hand: null, offhand: null, feet: null, ring: null };
};

Equip.rollRarity = function (bias) {
  // bias: rarity key to favor, 'high' to tilt toward rare+, or a weight mult map
  const weights = {};
  for (const [k, r] of Object.entries(GD.RARITY)) {
    let w = r.weight;
    if (bias === k) w *= 4;
    else if (bias === 'high') w *= ({ common: 0.4, uncommon: 0.8, rare: 1.6, epic: 2.2, legendary: 2.8 }[k] || 1);
    else if (bias === 'low') w *= ({ common: 1.4, uncommon: 1.1, rare: 0.6, epic: 0.3, legendary: 0.1 }[k] || 1);
    else if (bias && typeof bias === 'object' && bias[k] != null) w *= bias[k];
    weights[k] = w;
  }
  return R.weighted(weights);
};

Equip.makeItem = function (kind, tier, o = {}) {
  const k = GD.ITEM_KINDS[kind];
  if (!k) return null;
  const t = clamp(tier | 0, 1, 5);
  const rarity = o.rarity || this.rollRarity(o.rarityBias);
  const rare = GD.RARITY[rarity] || GD.RARITY.common;
  const id = o.id || (`it${Date.now().toString(36)}_${Equip._seq++}`);
  let atk = k.atk[t - 1], def = k.def[t - 1], mag = k.mag[t - 1];
  const stats = {};
  const mods = [];
  const modCount = o.mods ? o.mods.length : R.int(rare.mods[0], rare.mods[1]);
  const pool = Object.keys(GD.ITEM_MODS);
  const chosenMods = o.mods || [];
  if (!o.mods) {
    for (let i = 0; i < modCount && pool.length; i++) {
      if (i === 0 && rarity === 'common' && !R.chance(0.22)) break;
      const left = pool.filter((x) => !chosenMods.includes(x));
      if (!left.length) break;
      chosenMods.push(R.pick(left));
    }
  }
  for (const mid of chosenMods) {
    const m = GD.ITEM_MODS[mid];
    if (!m) continue;
    mods.push(mid);
    if (m.atk) atk += m.atk;
    if (m.def) def += m.def;
    if (m.mag) mag += m.mag;
    if (m.stats) for (const s of Object.keys(m.stats)) stats[s] = (stats[s] || 0) + m.stats[s];
  }
  let skill = o.skill || null;
  if (!('skill' in o) && R.chance(rare.skill)) skill = R.pick(GD.ITEM_SKILLS);
  let passive = o.passive || null;
  if (!('passive' in o) && R.chance(rare.passive)) passive = R.pick(Object.keys(GD.ITEM_PASSIVES));
  const baseName = o.name || k.names[t - 1];
  const prefix = mods.map((mid) => GD.ITEM_MODS[mid]).filter((m) => m && !m.stats).map((m) => m.name);
  const suffix = mods.map((mid) => GD.ITEM_MODS[mid]).filter((m) => m && m.stats).map((m) => m.name);
  let name = baseName;
  if (prefix.length) name = `${prefix[0]} ${name}`;
  if (suffix.length) name = `${name} ${suffix[0]}`;
  if (o.name) name = o.name;
  return {
    id, kind, tier: t, slot: k.slot, rarity, name,
    atk, def, mag, stats, mods, skill, passive,
    weapon: k.weapon || null, icon: k.icon,
  };
};

// Creation-preview portraits are lightweight stubs without parents/base/gear.
Equip.isChar = function (c) { return !!(c && c.base && Array.isArray(c.parents)); };

Equip.kitFor = function (c) {
  if (!this.isChar(c)) return GD.CLASS_KIT[(c && c.cls) || 'warrior'] || GD.CLASS_KIT.warrior;
  return GD.CLASS_KIT[classFor(c)] || GD.CLASS_KIT.warrior;
};

Equip.canWear = function (c, item) {
  if (!item || !this.isChar(c)) return false;
  const kit = this.kitFor(c);
  const allowed = kit[item.slot];
  if (item.slot === 'neck' || item.slot === 'ring') return true;
  if (!allowed) return false;
  return allowed === item.kind;
};

Equip.ensureChar = function (c) {
  if (!this.isChar(c)) return;
  if (!c.equip) c.equip = this.emptyEquip();
  for (const slot of Object.keys(GD.EQ_SLOTS)) if (!(slot in c.equip)) c.equip[slot] = null;
  // Migrate legacy gear.weapon / gear.armor into equipped items once.
  if (!c._eqMigrated) {
    c._eqMigrated = true;
    const kit = this.kitFor(c);
    if (!c.equip.hand && c.gear && c.gear.weapon > 0 && kit.hand) {
      c.equip.hand = this.makeItem(kit.hand, c.gear.weapon);
    }
    if (!c.equip.body && c.gear && c.gear.armor > 0 && kit.body) {
      c.equip.body = this.makeItem(kit.body, c.gear.armor);
    }
    if (!c.equip.offhand && kit.offhand === 'shield' && c.gear && c.gear.armor > 0) {
      c.equip.offhand = this.makeItem('shield', Math.max(1, c.gear.armor - 1));
    }
  }
  this.syncLegacy(c);
};

Equip.ensureHouse = function () {
  if (!G || !G.house) return;
  if (!Array.isArray(G.house.stash)) G.house.stash = [];
  for (const c of Object.values(G.chars || {})) this.ensureChar(c);
};

Equip.syncLegacy = function (c) {
  // Keep gear.weapon / gear.armor in sync so older combat and market code still works.
  c.gear = c.gear || { weapon: 0, armor: 0 };
  c.gear.weapon = c.equip && c.equip.hand ? c.equip.hand.tier : 0;
  c.gear.armor = c.equip && c.equip.body ? c.equip.body.tier : 0;
};

Equip.worn = function (c) {
  this.ensureChar(c);
  if (!c || !c.equip) return [];
  return Object.values(c.equip).filter(Boolean);
};

Equip.bonus = function (c, key) {
  this.ensureChar(c);
  let n = 0;
  for (const it of this.worn(c)) n += it[key] || 0;
  return n;
};

Equip.statBonus = function (c, key) {
  this.ensureChar(c);
  let n = 0;
  for (const it of this.worn(c)) n += (it.stats && it.stats[key]) || 0;
  return n;
};

Equip.passives = function (c) {
  return this.worn(c).map((it) => it.passive).filter((p) => p && GD.ITEM_PASSIVES[p]);
};

Equip.hasPassive = function (c, id) { return this.passives(c).includes(id); };

Equip.skills = function (c) {
  return this.worn(c).map((it) => it.skill).filter((s) => s && GD.ABILITIES[s]);
};

Equip.weaponLook = function (c) {
  this.ensureChar(c);
  if (c.equip.hand && c.equip.hand.weapon) return c.equip.hand.weapon;
  if (c.equip.offhand && c.equip.offhand.weapon === 'shield' && !c.equip.hand) return 'shield';
  return (GD.CLASSES[classFor(c)] || {}).weapon || 'sword';
};

Equip.bodyStyle = function (c) {
  this.ensureChar(c);
  const body = c.equip.body;
  if (!body) return null;
  if (body.kind === 'robe') return 'robe';
  if (body.kind === 'leather') return 'leather';
  return 'armor';
};

Equip.headStyle = function (c) {
  this.ensureChar(c);
  const head = c.equip.head;
  return head ? head.kind : null;
};

Equip.itemDesc = function (item) {
  if (!item) return '';
  const bits = [];
  const rare = GD.RARITY[item.rarity] || GD.RARITY.common;
  bits.push(rare.name);
  if (item.atk) bits.push(`+${item.atk} atk`);
  if (item.def) bits.push(`+${item.def} def`);
  if (item.mag) bits.push(`+${item.mag} mag`);
  if (item.stats) {
    for (const [s, v] of Object.entries(item.stats)) if (v) bits.push(`+${v} ${STAT_NAMES[s] || s}`);
  }
  if (item.skill && GD.ABILITIES[item.skill]) bits.push(`move: ${GD.ABILITIES[item.skill].name}`);
  if (item.passive && GD.ITEM_PASSIVES[item.passive]) bits.push(GD.ITEM_PASSIVES[item.passive].name);
  bits.push(`tier ${item.tier}`);
  return bits.join(' · ');
};

Equip.rarityColor = function (item) {
  return (GD.RARITY[item && item.rarity] || GD.RARITY.common).color;
};

Equip.slotLabel = function (c, slot) {
  const kit = this.kitFor(c);
  const kind = kit[slot];
  if (!kind) return GD.EQ_SLOTS[slot].name;
  const names = {
    helm: 'Helm', crown: 'Crown', hood: 'Hood',
    armor: 'Armour', robe: 'Robes', leather: 'Leather',
    blade: 'Blade', axe: 'Axe', lance: 'Lance', bow: 'Bow', staff: 'Staff', orb: 'Orb', lute: 'Lute',
    shield: 'Shield', boots: 'Boots', shoes: 'Shoes', amulet: 'Amulet', ring: 'Ring',
  };
  return names[kind] || GD.EQ_SLOTS[slot].name;
};

Equip.findInStash = function (id) {
  this.ensureHouse();
  return G.house.stash.find((it) => it && it.id === id) || null;
};

Equip.removeFromStash = function (id) {
  this.ensureHouse();
  const i = G.house.stash.findIndex((it) => it && it.id === id);
  if (i < 0) return null;
  return G.house.stash.splice(i, 1)[0];
};

Equip.addToStash = function (item) {
  if (!item) return;
  this.ensureHouse();
  G.house.stash.push(item);
};

Equip.unequip = function (c, slot) {
  this.ensureChar(c);
  const it = c.equip[slot];
  if (!it) return null;
  c.equip[slot] = null;
  this.addToStash(it);
  this.syncLegacy(c);
  return it;
};

Equip.equipItem = function (c, item, fromStash = true) {
  this.ensureChar(c);
  if (!item || !this.canWear(c, item)) return false;
  const slot = item.slot;
  if (fromStash) {
    const got = this.removeFromStash(item.id);
    if (!got) return false;
    item = got;
  }
  if (c.equip[slot]) this.addToStash(c.equip[slot]);
  c.equip[slot] = item;
  this.syncLegacy(c);
  return true;
};

Equip.tryOverlay = function (c, tryItem) {
  // Return a shallow equip map with tryItem previewed in its slot.
  this.ensureChar(c);
  const overlay = { ...c.equip };
  if (tryItem && this.canWear(c, tryItem)) overlay[tryItem.slot] = tryItem;
  return overlay;
};

Equip.marketOffers = function (c, maxTier) {
  this.ensureChar(c);
  const kit = this.kitFor(c);
  const offers = [];
  for (const slot of Object.keys(GD.EQ_SLOTS)) {
    const kind = kit[slot];
    if (!kind) continue;
    const worn = c.equip[slot];
    const next = (worn ? worn.tier : 0) + 1;
    if (next > maxTier) continue;
    const item = this.makeItem(kind, next, { rarityBias: 'low' });
    const base = GD.GEAR[next - 1] ? GD.GEAR[next - 1].cost : 40 * next * next;
    const mult = slot === 'body' ? 1.1 : slot === 'hand' ? 1 : slot === 'offhand' ? 0.7 : slot === 'head' || slot === 'feet' ? 0.55 : 0.4;
    const rareMult = (GD.RARITY[item.rarity] || GD.RARITY.common).cost;
    offers.push({ slot, kind, item, cost: Math.round(base * mult * rareMult) });
  }
  return offers;
};

Equip.seedStarter = function (c, tier, o = {}) {
  // Give a new recruit / highborn a basic kit matching their class.
  this.ensureChar(c);
  const kit = this.kitFor(c);
  const t = clamp(tier | 0, 0, 5);
  if (t <= 0) return;
  const bias = o.rarityBias || 'low';
  const mk = (kind, ti) => this.makeItem(kind, ti, { rarityBias: bias, rarity: o.rarity, skill: o.skill, passive: o.passive });
  if (kit.hand && !c.equip.hand) c.equip.hand = mk(kit.hand, t);
  if (kit.body && !c.equip.body) c.equip.body = mk(kit.body, t);
  if (kit.head && t >= 2 && !c.equip.head) c.equip.head = mk(kit.head, t - 1);
  if (kit.feet && t >= 2 && !c.equip.feet) c.equip.feet = mk(kit.feet, Math.max(1, t - 1));
  if (kit.offhand && t >= 1 && !c.equip.offhand) c.equip.offhand = mk(kit.offhand, Math.max(1, t - 1));
  this.syncLegacy(c);
};

// Grant a named piece (often a story start reward) and equip it.
Equip.grant = function (c, kind, tier, opts = {}) {
  this.ensureChar(c);
  const item = this.makeItem(kind, tier, opts);
  if (!item) return null;
  if (this.canWear(c, item)) {
    if (c.equip[item.slot]) this.addToStash(c.equip[item.slot]);
    c.equip[item.slot] = item;
    this.syncLegacy(c);
  } else this.addToStash(item);
  return item;
};

Equip.iconIndex = function (item) {
  if (!item) return -1;
  const icon = item.icon || (GD.ITEM_KINDS[item.kind] || {}).icon;
  return GD.ITEM_ICON_ORDER.indexOf(icon);
};

Equip.drawIcon = function (ctx, item, x, y, size = 28) {
  const img = this.img('item-icons');
  const idx = this.iconIndex(item);
  if (!img || !img.complete || img.naturalWidth <= 0 || idx < 0) {
    ctx.fillStyle = '#c8b58a';
    ctx.font = `${Math.round(size * 0.45)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((item && item.name || '?').slice(0, 1), x + size / 2, y + size / 2);
    return;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, idx * 32, 0, 32, 32, x, y, size, size);
  ctx.restore();
};
