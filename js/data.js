// Static game data: races, birth statuses, life stages, enemies, estate, eras.
'use strict';

const DAYS_PER_YEAR = 360;
const START_YEAR = 812;
const STATS = ['str', 'agi', 'int', 'wil', 'vit'];
const STAT_NAMES = { str: 'STR', agi: 'AGI', int: 'INT', wil: 'WIL', vit: 'VIT' };
const PHYS = { str: true, agi: true, vit: true };

const GD = {};

GD.RACES = {
  human: {
    name: 'Human', maturity: 16, primeEnd: 38, elder: 55, life: [62, 85], fertility: 1.0,
    skin: '#e2b48c', height: 1.0, width: 1.0,
    base: { str: 5, agi: 5, int: 5, wil: 5, vit: 5 },
    growth: { str: 1, agi: 1, int: 1, wil: 1, vit: 1 },
    desc: 'Adaptable and quick to come of age. Short-lived, so generations pass quickly.',
  },
  orc: {
    name: 'Orc', maturity: 11, primeEnd: 26, elder: 36, life: [44, 58], fertility: 1.4,
    skin: '#7f9c55', height: 1.1, width: 1.2,
    base: { str: 8, agi: 5, int: 3, wil: 4, vit: 7 },
    growth: { str: 1.3, agi: 0.9, int: 0.6, wil: 0.8, vit: 1.2 },
    desc: 'Mighty and very fast to mature. Burns bright and dies young.',
  },
  halfling: {
    name: 'Halfling', maturity: 20, primeEnd: 55, elder: 80, life: [100, 130], fertility: 1.1,
    skin: '#ecc39b', height: 0.72, width: 0.9,
    base: { str: 3, agi: 7, int: 5, wil: 7, vit: 5 },
    growth: { str: 0.7, agi: 1.2, int: 1, wil: 1.2, vit: 0.9 },
    desc: 'Nimble and hard to discourage. Lives about a century and a half.',
  },
  dwarf: {
    name: 'Dwarf', maturity: 25, primeEnd: 110, elder: 150, life: [180, 240], fertility: 0.6,
    skin: '#d8a27a', height: 0.8, width: 1.25,
    base: { str: 6, agi: 3, int: 5, wil: 6, vit: 8 },
    growth: { str: 1.1, agi: 0.7, int: 0.9, wil: 1, vit: 1.3 },
    desc: 'Stout and stubborn, with a very long prime. Few children.',
  },
  elf: {
    name: 'Elf', maturity: 30, primeEnd: 180, elder: 260, life: [320, 420], fertility: 0.35,
    skin: '#f3dcc2', height: 1.12, width: 0.85,
    base: { str: 4, agi: 7, int: 7, wil: 6, vit: 3 },
    growth: { str: 0.7, agi: 1.2, int: 1.2, wil: 1.0, vit: 0.7 },
    desc: 'Gifted and nearly ageless, but children are rare and take 30 years to mature.',
  },
};

GD.STAGES = {
  child:     { name: 'Child',     xp: 0,    phys: 0.6,  mind: 0.7 },
  youth:     { name: 'Youth',     xp: 1.5,  phys: 0.92, mind: 0.95 },
  prime:     { name: 'Prime',     xp: 1.0,  phys: 1.0,  mind: 1.0 },
  seasoned:  { name: 'Seasoned',  xp: 0.8,  phys: 0.95, mind: 1.08 },
  elder:     { name: 'Elder',     xp: 0.55, phys: 0.8,  mind: 1.15 },
  venerable: { name: 'Venerable', xp: 0.3,  phys: 0.65, mind: 1.2 },
};

GD.BIRTH = {
  highborn: { name: 'Highborn', mods: { int: 1.1, wil: 1.1 }, xp: 1.0, desc: '+10% INT/WIL. Deeds earn more prestige.' },
  lowborn:  { name: 'Lowborn',  mods: { str: 1.1, vit: 1.1 }, xp: 1.05, desc: '+10% STR/VIT. Grit: +5% XP.' },
  bastard:  { name: 'Bastard',  mods: {}, xp: 1.1, desc: 'Driven: +10% XP and +15% to one stat. Corruption builds faster unless legitimised.' },
  orphan:   { name: 'Orphan',   mods: {}, xp: 1.0, desc: 'Self-Made: formative points ×1.5, higher cap. Lineage unknown.' },
};

GD.SECRETS = {
  noble:   { name: 'Hidden noble blood', bonus: { int: 2, wil: 2 }, corruption: 0 },
  warrior: { name: 'A line of warriors', bonus: { str: 2, vit: 2 }, corruption: 0 },
  common:  { name: 'Common stock',       bonus: {}, corruption: 0 },
  tainted: { name: 'A tainted bloodline', bonus: { int: 3 }, corruption: 35 },
};

GD.SKILLS = {
  str: { name: 'Cleave',   desc: 'Hit all enemies for 70% damage.' },
  agi: { name: 'Flurry',   desc: 'Two quick strikes with a high crit chance.' },
  int: { name: 'Firebolt', desc: 'Heavy magic damage that ignores most armour.' },
  wil: { name: 'Mend',     desc: 'Heal the most wounded ally.' },
  vit: { name: 'Bulwark',  desc: 'Guard, and draw enemy attacks for a round.' },
};

GD.NAME_PARTS = {
  human:    { a: ['Al', 'Bran', 'Ced', 'Ed', 'Ger', 'Hal', 'Ior', 'Mar', 'Os', 'Ro', 'Ser', 'Wil', 'Ael', 'Bea', 'Cla', 'El', 'Isa', 'Li', 'Mae', 'Tam', 'Jor', 'Kat'], b: ['ric', 'an', 'wyn', 'wen', 'old', 'ard', 'ina', 'a', 'in', 'ette', 'eth', 'os', 'ia', 'mund', 'ys'] },
  orc:      { a: ['Gor', 'Thr', 'Ug', 'Mak', 'Dra', 'Kru', 'Gash', 'Ur', 'Bol', 'Sha', 'Zug', 'Rok'], b: ['ash', 'uk', 'ga', 'nak', 'gul', 'ra', 'zog', 'mok', 'ka', 'th'] },
  halfling: { a: ['Bil', 'Mer', 'Pip', 'Tob', 'Ros', 'Dai', 'Lob', 'Fen', 'Mil', 'Wil', 'Pea', 'Hob'], b: ['bo', 'ry', 'pin', 'ias', 'ie', 'sy', 'elia', 'kin', 'ly', 'bert'] },
  dwarf:    { a: ['Thor', 'Bal', 'Dur', 'Gim', 'Bru', 'Hel', 'Kil', 'Dis', 'Thra', 'Mor', 'Bom', 'Ag'], b: ['in', 'ra', 'ek', 'gar', 'li', 'na', 'dra', 'grim', 'dis', 'ur'] },
  elf:      { a: ['Ae', 'Lir', 'Gal', 'Thal', 'Ela', 'Sil', 'Fae', 'Ith', 'Cal', 'Nim', 'Ery', 'Ama'], b: ['ndil', 'wen', 'rion', 'thas', 'riel', 'iel', 'lith', 'ador', 'nor', 'sea', 'ndra'] },
};

GD.HOUSE_NAMES = ['Ashford', 'Blackwater', 'Dunmere', 'Greyhollow', 'Thornwick', 'Valemont', 'Ironvale', 'Marrow', 'Oakhart', 'Redfern', 'Stormvale', 'Wyndham'];
GD.TOWN_NAMES = ['Millbrook', 'Harrowgate', 'Saltmere', 'Copperhill'];
GD.HAIR = ['#2b1d14', '#5a3a22', '#8a5a2b', '#c8a25a', '#e8d6a0', '#a33b1f', '#1a1a1a', '#6d4c3d'];
GD.TUNIC = ['#3d5a80', '#7b2d26', '#3f6b3a', '#6a4c93', '#8c6d2c', '#2f4f4f', '#9c4f2e', '#4a4e69'];
GD.HOUSE_COLORS = ['#8b1e2d', '#1e4f8b', '#2d6b2f', '#6b3a8b', '#a8781e', '#1e6b6b'];

GD.TRAITS = {
  brave:     { name: 'Brave',     desc: '+10% physical damage.' },
  wise:      { name: 'Wise',      desc: '+15% XP.' },
  hardy:     { name: 'Hardy',     desc: '+15% max HP.' },
  charming:  { name: 'Charming',  desc: 'Bonds grow faster.' },
  ambitious: { name: 'Ambitious', desc: 'Earns more prestige, but corruption builds faster.' },
  loyal:     { name: 'Loyal',     desc: 'Corruption builds much slower.' },
  fertile:   { name: 'Fertile',   desc: 'More likely to have children.' },
  frail:     { name: 'Frail',     desc: '-15% max HP, ages poorly.' },
};

GD.ENEMIES = {
  wolf:    { name: 'Wolf',         shape: 'beast',    color: '#6f6f72', s: { str: 5, agi: 7, int: 1, wil: 2, vit: 4 }, xp: 10, gold: 2 },
  boar:    { name: 'Tusked Boar',  shape: 'beast',    color: '#6b4a32', s: { str: 6, agi: 4, int: 1, wil: 2, vit: 7 }, xp: 12, gold: 3 },
  bandit:  { name: 'Bandit',       shape: 'humanoid', color: '#4d3b2a', s: { str: 5, agi: 6, int: 3, wil: 3, vit: 5 }, xp: 12, gold: 10 },
  troll:   { name: 'Hill Troll',   shape: 'brute',    color: '#6d7d6a', s: { str: 9, agi: 2, int: 1, wil: 3, vit: 10 }, xp: 25, gold: 8 },
  ghoul:   { name: 'Ghoul',        shape: 'humanoid', color: '#9aa39a', s: { str: 6, agi: 6, int: 1, wil: 1, vit: 5 }, xp: 14, gold: 1, skin: '#b8c0b0' },
  raider:  { name: 'Raider',       shape: 'humanoid', color: '#7a1f1f', s: { str: 7, agi: 5, int: 2, wil: 4, vit: 6 }, xp: 16, gold: 14 },
  knight:  { name: 'Hostile Knight', shape: 'humanoid', color: '#55606e', s: { str: 8, agi: 3, int: 3, wil: 6, vit: 9 }, xp: 24, gold: 25, skill: 'vit' },
  cultist: { name: 'Cultist',      shape: 'humanoid', color: '#3a2347', s: { str: 3, agi: 4, int: 8, wil: 6, vit: 4 }, xp: 18, gold: 12, skill: 'int' },
  wraith:  { name: 'Wraith',       shape: 'wraith',   color: '#8fa7c4', s: { str: 6, agi: 7, int: 7, wil: 5, vit: 5 }, xp: 26, gold: 18, skill: 'int' },
};

GD.ENCOUNTERS = {
  grass:    ['wolf', 'bandit', 'bandit', 'boar'],
  forest:   ['wolf', 'wolf', 'boar', 'bandit'],
  hills:    ['troll', 'bandit', 'boar'],
  mountain: ['troll', 'wolf'],
  ruins:    ['wraith', 'cultist', 'ghoul', 'cultist'],
};

GD.ERAS = {
  abundance: { name: 'Age of Abundance', short: 'Abundance', income: 1.3, enc: 0.8, births: 1.4, drift: 1, tint: [255, 220, 140, 0.10], color: '#d9b648' },
  peace:     { name: 'Age of Peace',     short: 'Peace',     income: 1.1, enc: 0.6, births: 1.0, drift: 1, tint: [150, 210, 255, 0.08], color: '#6fb3d9' },
  famine:    { name: 'Age of Famine',    short: 'Famine',    income: 0.6, enc: 1.2, births: 0.5, drift: -2, tint: [120, 110, 90, 0.28], color: '#9a8a6a', extra: ['ghoul', 'bandit'] },
  war:       { name: 'Age of War',       short: 'War',       income: 0.8, enc: 1.5, births: 0.8, drift: -2, tint: [200, 40, 30, 0.16], color: '#c4473a', extra: ['raider', 'raider', 'knight'] },
  golden:    { name: 'Golden Age',       short: 'Golden',    income: 1.5, enc: 0.4, births: 1.5, drift: 1, tint: [255, 235, 160, 0.14], color: '#ffd76a' },
};

GD.ESTATE = [
  { name: 'Hut',       cost: 0,     prestige: 0,   income: 25,  household: 4,  retinue: 1, partnerTier: 0 },
  { name: 'Farmhouse', cost: 400,   prestige: 10,  income: 70,  household: 6,  retinue: 2, partnerTier: 1, gain: 5 },
  { name: 'Manor',     cost: 1500,  prestige: 35,  income: 160, household: 9,  retinue: 3, partnerTier: 2, gain: 12 },
  { name: 'Keep',      cost: 4000,  prestige: 80,  income: 330, household: 12, retinue: 5, partnerTier: 3, gain: 25 },
  { name: 'Castle',    cost: 10000, prestige: 150, income: 700, household: 16, retinue: 7, partnerTier: 4, gain: 50 },
];

GD.UPGRADES = {
  horses:    { name: 'Stables & Horses',  cost: [150, 500, 1200],  desc: 'Travel takes 18% less time per level.' },
  livestock: { name: 'Livestock',         cost: [100, 350, 900],   desc: '+40 gold a year per level. Unaffected by famine.' },
  yard:      { name: 'Training Yard',     cost: [200, 700, 1800],  desc: '+10% XP for the House per level. Children gain stats as they grow.' },
  library:   { name: 'Library & Tutors',  cost: [200, 700, 1800],  desc: 'Children come of age with +1 INT/WIL per level. Cheaper lineage research.' },
  chapel:    { name: 'Chapel & Healers',  cost: [250, 800, 2000],  desc: 'Fallen allies are 8% less likely to die per level.' },
  armory:    { name: 'Armory & Smith',    cost: [300, 900, 2200],  desc: 'Heirlooms gain +1 extra power per generation per level. Better gear at market.' },
};

GD.PARTNER_TIER_PRESTIGE = [0, 15, 40, 90, 160];
GD.GEAR = [
  { name: 'Iron',       atk: 2,  def: 1,  cost: 40 },
  { name: 'Steel',      atk: 4,  def: 3,  cost: 120 },
  { name: 'Fine Steel', atk: 7,  def: 5,  cost: 320 },
  { name: 'Masterwork', atk: 11, def: 8,  cost: 800 },
  { name: 'Mythril',    atk: 16, def: 12, cost: 1800 },
];

// Lasting injuries and marks. mods are flat stat changes; look drives the 2.5D figure.
GD.INJURIES = {
  lostArm:  { name: 'Lost an arm',     verb: 'lost an arm',          mods: { str: -3, agi: -1 }, w: 1,   look: 'arm' },
  lostEye:  { name: 'Lost an eye',     verb: 'lost an eye',          mods: { agi: -2 },          w: 1.4, look: 'eye' },
  lostLeg:  { name: 'Lost a leg',      verb: 'lost a leg',           mods: { agi: -3, vit: -1 }, w: 0.8, look: 'leg' },
  scarred:  { name: 'Battle-scarred',  verb: 'came back scarred but harder', mods: { wil: 1, vit: 1 }, w: 2, look: 'scar', good: true },
  badKnee:  { name: 'Ruined knee',     verb: 'ruined a knee',        mods: { agi: -1.5 },        w: 1.5 },
  weakLungs:{ name: 'Weak lungs',      verb: 'developed weak lungs', mods: { vit: -2 },          w: 1,   elderOnly: true },
};

// ---------------------------------------------------------------- identity, body and attraction
GD.GENDERS = {
  man:   { name: 'Man',   sym: '♂' },
  woman: { name: 'Woman', sym: '♀' },
};
// who someone is drawn to. 'ace' feel little attraction but can still choose companionship.
GD.ORIENTATIONS = {
  straight: { name: 'Straight',        w: 70, desc: 'Drawn to the other gender.' },
  gay:      { name: 'Gay / Lesbian',   w: 11, desc: 'Drawn to their own gender.' },
  bi:       { name: 'Bisexual',        w: 13, desc: 'Drawn to any gender.' },
  ace:      { name: 'Asexual',         w: 6,  desc: 'Little desire. May marry for companionship; rarely has children.' },
};
// what kindles attraction beyond gender; weights a partner's qualities
GD.PREFERENCES = {
  none:     { name: 'No particular type', w: 50 },
  sapio:    { name: 'Sapiosexual',        w: 12, stat: 'int',  desc: 'Drawn to a sharp mind (INT).' },
  strength: { name: 'Drawn to strength',  w: 12, stat: 'str',  desc: 'Drawn to the strong (STR).' },
  kindness: { name: 'Drawn to kindness',  w: 12, stat: 'wil',  desc: 'Drawn to a warm, steady heart (WIL).' },
  beauty:   { name: 'Drawn to beauty',    w: 10, looks: true,  desc: 'Drawn to good looks.' },
  status:   { name: 'Drawn to status',    w: 8,  status: true, desc: 'Drawn to rank and high birth.' },
};
GD.HEIGHTS = {
  short:   { name: 'Short',   scale: 0.9,  mods: { agi: 0.5, str: -0.5 } },
  average: { name: 'Average height', scale: 1, mods: {} },
  tall:    { name: 'Tall',    scale: 1.1,  mods: { str: 0.5, agi: -0.5 } },
};
GD.BUILDS = {
  slight:  { name: 'Slight',  width: 0.85, mods: { agi: 1, vit: -1 } },
  average: { name: 'Average build', width: 1, mods: {} },
  stout:   { name: 'Stout',   width: 1.15, mods: { vit: 1, agi: -0.5 } },
  large:   { name: 'Large',   width: 1.3,  mods: { str: 1, vit: 1, agi: -1.5 } },
};
GD.LOOKS = ['Homely', 'Plain', 'Plain', 'Fair', 'Fair', 'Fair', 'Comely', 'Comely', 'Striking', 'Beautiful'];
// conditions people are born with; some run in families
GD.CONDITIONS = {
  lame:       { name: 'Lame',         mods: { agi: -2 },           hereditary: false, desc: 'Born with a twisted leg. Walks with a cane.' },
  weakHeart:  { name: 'Weak heart',   mods: { vit: -2 }, life: 0.8, hereditary: true, desc: 'A frail heart. A shorter life.' },
  cloudedEye: { name: 'Clouded eye',  mods: { agi: -1, int: 0.5 },  hereditary: true, desc: 'Half-blind from birth, and more watchful for it.' },
  deaf:       { name: 'Deaf',         mods: { wil: 1, agi: -1 },    hereditary: true, desc: 'Born without hearing. Patient and hard to rattle.' },
};
GD.HAIRSTYLES = ['short', 'long', 'bun', 'braid', 'shaved', 'crop'];
