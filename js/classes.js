// Classes and abilities. Every character has a class that shapes their stats, their weapon,
// their passive and the abilities they can use in battle (a third unlocks at level 5).
'use strict';

GD.CLASSES = {
  warrior: {
    name: 'Warrior', icon: '⚔', weapon: 'shield', top: ['str', 'vit'],
    desc: 'A disciplined fighter. Heavy, armour-breaking blows, and a shield wall that protects the whole party.',
    passive: 'Steady: takes 15% less damage.',
    mods: { atk: 1.15, def: 1.25, hp: 1.12, mag: 0.7, heal: 0.8, spd: 0.95 },
    growth: { str: 0.35, vit: 0.35 },
    skills: ['heavyBlow', 'shieldWall', 'cleave'],
  },
  berserker: {
    name: 'Berserker', icon: '🪓', weapon: 'axe', top: ['str'],
    desc: 'Reckless fury. Enormous damage that grows as they bleed, but poor defence, and some attacks hurt themselves.',
    passive: 'Rage: deals up to 60% more damage as their health drops.',
    mods: { atk: 1.4, def: 0.7, hp: 1.08, mag: 0.5, heal: 0.6, spd: 1.05 },
    growth: { str: 0.5, agi: 0.15 },
    skills: ['recklessStrike', 'bloodlust', 'whirlwind'],
  },
  sorcerer: {
    name: 'Sorcerer', icon: '✦', weapon: 'orb', top: ['int'],
    desc: 'Born with magic in the blood. Even their basic attack is an arcane bolt that slips past armour.',
    passive: 'Innate magic: attacks are arcane bolts that ignore most armour.',
    mods: { atk: 0.7, def: 0.85, hp: 0.85, mag: 1.4, heal: 0.9, spd: 1 },
    growth: { int: 0.5, wil: 0.15 },
    skills: ['firebolt', 'frostNova', 'arcaneShield'],
  },
  priest: {
    name: 'Priest', icon: '✚', weapon: 'staff', top: ['wil'],
    desc: 'A healer and keeper of the dead. Mends wounds, lifts the whole party in prayer, and smites the undead.',
    passive: 'Last Rites: while a priest lives, fallen allies are much less likely to die.',
    mods: { atk: 0.8, def: 1, hp: 1, mag: 1.05, heal: 1.45, spd: 1 },
    growth: { wil: 0.5, vit: 0.15 },
    skills: ['mend', 'prayer', 'smite'],
  },
  bard: {
    name: 'Bard', icon: '♪', weapon: 'lute', top: ['wil', 'agi'],
    desc: 'A support who wins battles without swinging much. Songs that inspire, rally and unsettle the enemy.',
    passive: 'Tales of glory: the party earns 15% more XP.',
    mods: { atk: 0.9, def: 0.95, hp: 0.95, mag: 1.05, heal: 1.1, spd: 1.1 },
    growth: { wil: 0.3, agi: 0.25 },
    skills: ['inspire', 'rally', 'dissonance'],
  },
  knight: {
    name: 'Knight', icon: '♞', weapon: 'lance', top: ['vit', 'str'],
    desc: 'Sworn and armoured. The hardest to bring down, with precise strikes that find the gaps in any armour.',
    passive: 'Plate and precision: takes 20% less damage; every attack pierces a quarter of armour and crits more often.',
    mods: { atk: 1.05, def: 1.45, hp: 1.15, mag: 0.6, heal: 0.8, spd: 0.85 },
    growth: { vit: 0.4, str: 0.25 },
    skills: ['precisionStrike', 'riposte', 'challenge'],
  },
  ranger: {
    name: 'Ranger', icon: '➶', weapon: 'bow', top: ['agi'],
    desc: 'A sharp-eyed archer. Precise shots, arrow volleys, and marks that let the whole party strike harder.',
    passive: 'Keen eye: 10% higher chance of critical hits.',
    mods: { atk: 1.1, def: 0.9, hp: 0.95, mag: 0.8, heal: 0.8, spd: 1.15 },
    growth: { agi: 0.5, str: 0.15 },
    skills: ['aimedShot', 'volley', 'huntersMark'],
  },
};

// role tells the battle AI when to use it; target: enemy | enemies | ally | allies | self
GD.ABILITIES = {
  heavyBlow:      { name: 'Heavy Blow',      cost: 2, target: 'enemy',   role: 'nuke',  anim: 'lunge', desc: 'A crushing strike for 190% damage that ignores a third of armour.' },
  shieldWall:     { name: 'Shield Wall',     cost: 2, target: 'allies',  role: 'guard', anim: 'cast',  desc: 'The party takes 35% less damage for 2 rounds; draws enemy attacks.' },
  cleave:         { name: 'Cleave',          cost: 2, target: 'enemies', role: 'aoe',   anim: 'lunge', desc: 'Hit every enemy for 80% damage.' },
  recklessStrike: { name: 'Reckless Strike', cost: 1, target: 'enemy',   role: 'nuke',  anim: 'lunge', desc: '210% damage, but costs 8% of your health and lowers your defence for a round.' },
  bloodlust:      { name: 'Bloodlust',       cost: 2, target: 'self',    role: 'buff',  anim: 'cast',  desc: '+50% damage and heal for a quarter of damage dealt, for 3 rounds.' },
  whirlwind:      { name: 'Whirlwind',       cost: 3, target: 'enemies', role: 'aoe',   anim: 'lunge', desc: 'Spin through every enemy for 130% damage, taking a little damage per foe.' },
  firebolt:       { name: 'Firebolt',        cost: 2, target: 'enemy',   role: 'nuke',  anim: 'cast',  desc: 'Heavy fire damage that ignores most armour.' },
  frostNova:      { name: 'Frost Nova',      cost: 3, target: 'enemies', role: 'aoe',   anim: 'cast',  desc: 'Freezing magic on every enemy; slows them for 2 rounds.' },
  arcaneShield:   { name: 'Arcane Shield',   cost: 2, target: 'ally',    role: 'shield', anim: 'cast', desc: 'Wrap an ally in a shield that absorbs damage.' },
  mend:           { name: 'Mend',            cost: 2, target: 'ally',    role: 'heal',  anim: 'cast',  desc: 'Heal one ally.' },
  prayer:         { name: 'Prayer',          cost: 3, target: 'allies',  role: 'heal',  anim: 'cast',  desc: 'Heal the whole party.' },
  smite:          { name: 'Smite',           cost: 2, target: 'enemy',   role: 'nuke',  anim: 'cast',  desc: 'Holy damage; double against the undead and the Hollow King\'s servants.' },
  inspire:        { name: 'Inspire',         cost: 2, target: 'allies',  role: 'buff',  anim: 'cast',  desc: 'A war song: the party deals 25% more damage for 3 rounds.' },
  rally:          { name: 'Rally',           cost: 2, target: 'allies',  role: 'rally', anim: 'cast',  desc: 'Every ally gains 1 focus and a little health.' },
  dissonance:     { name: 'Dissonance',      cost: 3, target: 'enemies', role: 'aoe',   anim: 'cast',  desc: 'A jarring chord: enemies take damage and lose half their armour for 3 rounds.' },
  aimedShot:      { name: 'Aimed Shot',      cost: 2, target: 'enemy',   role: 'nuke',  anim: 'cast',  desc: '200% damage with a much higher chance to crit.' },
  volley:         { name: 'Volley',          cost: 2, target: 'enemies', role: 'aoe',   anim: 'cast',  desc: 'Rain arrows on every enemy for 70% damage.' },
  huntersMark:    { name: 'Hunter\'s Mark',  cost: 1, target: 'enemy',   role: 'mark',  anim: 'cast',  desc: 'Marked enemies take 30% more damage from everyone for 3 rounds.' },
  precisionStrike: { name: 'Precision Strike', cost: 2, target: 'enemy', role: 'nuke', anim: 'lunge', desc: '170% damage through the gaps: ignores most armour and crits often.' },
  riposte:        { name: 'Riposte',         cost: 2, target: 'self',    role: 'guard', anim: 'cast',  desc: 'A guarded stance for 2 rounds: take less damage and counter-attack anyone who strikes you.' },
  challenge:      { name: 'Challenge',       cost: 2, target: 'enemy',   role: 'mark',  anim: 'cast',  desc: 'Call out one foe: they are marked (+30% damage taken) and enemies must attack you for 3 rounds.' },
  flurry:         { name: 'Flurry',          cost: 2, target: 'enemy',   role: 'nuke',  anim: 'lunge', desc: 'Two quick strikes with a high crit chance.' },
  bulwark:        { name: 'Bulwark',         cost: 2, target: 'self',    role: 'guard', anim: 'cast',  desc: 'Guard and draw enemy attacks for 2 rounds.' },
};
// skills learned the old way (by stat) map onto abilities
GD.LEGACY_SKILL = { str: 'cleave', agi: 'flurry', int: 'firebolt', wil: 'mend', vit: 'bulwark' };
const UNDEAD = { ghoul: 1, wraith: 1, herald: 1, hollow: 1 };

// ---------------------------------------------------------------- characters and classes
function classFor(c) {
  if (c.cls && GD.CLASSES[c.cls]) return c.cls;
  // pick from what the person is naturally good at (a parent's calling sometimes passes down)
  const parentCls = c.parents.map(ch).filter((p) => p && p.cls).map((p) => p.cls);
  if (parentCls.length && R.chance(0.35)) return (c.cls = R.pick(parentCls));
  const order = STATS.slice().sort((a, b) => (c.base[b] + (c.bonus[b] || 0)) - (c.base[a] + (c.bonus[a] || 0)));
  const top = order[0];
  const pick = { str: R.chance(0.6) ? 'warrior' : 'berserker', vit: R.chance(0.5) ? 'knight' : 'warrior', int: 'sorcerer', wil: R.chance(0.6) ? 'priest' : 'bard', agi: R.chance(0.65) ? 'ranger' : 'bard' }[top];
  return (c.cls = pick);
}
function classOf(c) { return GD.CLASSES[classFor(c)]; }
function classGrowth(c, k) { return (classOf(c).growth[k] || 0) * (c.level - 1); }
function abilitiesOf(c) {
  const cl = classOf(c);
  const out = cl.skills.slice(0, c.level >= 5 ? 3 : 2);
  const extra = c.extraSkill && GD.LEGACY_SKILL[c.extraSkill];
  if (extra && !out.includes(extra)) out.push(extra);
  return out;
}

// ---------------------------------------------------------------- abilities in battle
Battle.st = function (u, k) { return (u.st && u.st[k] && u.st[k].t > 0) ? u.st[k] : null; };
Battle.give = function (u, k, turns, v = 0) { u.st = u.st || {}; u.st[k] = { t: turns, v }; };
Battle.tickStatus = function (u) {
  if (!u.st) return;
  for (const k of Object.keys(u.st)) { u.st[k].t--; if (u.st[k].t <= 0 && k !== 'shield') delete u.st[k]; }
  if (u.st.shield && u.st.shield.v <= 0) delete u.st.shield;
};
// damage multipliers shared by every attack
Battle.outMult = function (u) {
  let m = 1;
  const up = this.st(u, 'atkUp'); if (up) m += up.v;
  const bl = this.st(u, 'bloodlust'); if (bl) m += 0.5;
  if (u.cls === 'berserker') m *= 1 + 0.6 * (1 - u.hp / u.maxHp); // rage
  if (u.brave) m *= 1.1;
  return m;
};
Battle.inMult = function (t) {
  let m = 1;
  if (this.st(t, 'mark')) m *= 1.3;
  if (this.st(t, 'guard')) m *= 0.65;
  if (t.defending) m *= 0.5;
  if (t.cls === 'warrior') m *= 0.85;
  if (t.cls === 'knight') m *= 0.8;
  if (this.st(t, 'riposte')) m *= 0.75;
  return m;
};
Battle.armour = function (t) { return t.def * (this.st(t, 'defDown') ? 0.5 : 1); };
Battle.physical = function (u, t, mult, extraCrit = 0, pierce = 0) {
  if (u.cls === 'knight') pierce = Math.min(0.9, pierce + 0.25);
  let dmg = u.atk * R.float(0.85, 1.15) * mult * this.outMult(u) - this.armour(t) * 0.5 * (1 - pierce);
  const crit = R.chance(0.05 + u.agi * 0.008 + extraCrit + (u.cls === 'ranger' ? 0.1 : 0) + (u.cls === 'knight' ? 0.08 : 0));
  if (crit) dmg *= 1.6;
  dmg *= this.inMult(t);
  return { dmg: Math.max(1, Math.round(dmg)), crit };
};
Battle.magic = function (u, t, mult) {
  let dmg = u.mag * R.float(0.9, 1.1) * mult * this.outMult(u) - this.armour(t) * 0.15;
  dmg *= this.inMult(t);
  return { dmg: Math.max(1, Math.round(dmg)), crit: false };
};
Battle.healUnit = function (u, t, amt, label) {
  amt = Math.round(amt);
  t.hp = Math.min(t.maxHp, t.hp + amt);
  this.fx.push({ uid: t.uid, text: '+' + amt, color: '#6fe08a', t0: performance.now() });
  return amt;
};
Battle.leech = function (u, dealt) {
  if (this.st(u, 'bloodlust') && dealt > 0) { const h = Math.round(dealt * 0.25); u.hp = Math.min(u.maxHp, u.hp + h); }
};
// one ability, used by unit u on (optional) target t
Battle.useAbility = function (u, id, t) {
  const A = GD.ABILITIES[id];
  const foes = this.alive(u.side === 'party' ? 'enemy' : 'party');
  const allies = this.alive(u.side);
  const pickFoe = () => (t && t.alive && t.side !== u.side ? t : (foes.find((f) => f.taunt > 0) || foes[0]));
  const pickAlly = () => (t && t.alive && t.side === u.side ? t : allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]);
  const fx = (target, col) => this.fx.push({ uid: target.uid, burst: col, t0: performance.now() });
  const label = (target, text, col = '#8fd3ff') => this.fx.push({ uid: target.uid, text, color: col, t0: performance.now() });
  u.focus -= A.cost;
  u.anim = { type: A.anim, to: t ? t.uid : null, t0: performance.now() };
  let msg = '';
  switch (id) {
    case 'heavyBlow': { const f = pickFoe(); const r = this.physical(u, f, 1.9, 0, 0.33); this.damage(u, f, r.dmg, r.crit); msg = `${u.name} lands a Heavy Blow on ${f.name} for ${r.dmg}.`; break; }
    case 'shieldWall': { allies.forEach((a) => { this.give(a, 'guard', 2); label(a, 'Shield Wall'); }); u.taunt = 2; msg = `${u.name} raises a Shield Wall before the party.`; break; }
    case 'cleave': { let tot = 0; foes.forEach((f) => { const r = this.physical(u, f, 0.8); this.damage(u, f, r.dmg, r.crit); tot += r.dmg; }); this.leech(u, tot); msg = `${u.name} cleaves through every foe!`; break; }
    case 'recklessStrike': {
      const f = pickFoe(); const r = this.physical(u, f, 2.1); this.damage(u, f, r.dmg, r.crit); this.leech(u, r.dmg);
      const cost = Math.round(u.maxHp * 0.08); u.hp = Math.max(1, u.hp - cost); this.give(u, 'defDown', 1); label(u, `-${cost}`, '#ff9a6a');
      msg = `${u.name} strikes recklessly at ${f.name} for ${r.dmg}, heedless of the cost.`; break;
    }
    case 'bloodlust': { this.give(u, 'bloodlust', 3); label(u, 'Bloodlust', '#ff5c5c'); fx(u, '#ff3b3b'); msg = `${u.name} is consumed by bloodlust!`; break; }
    case 'whirlwind': {
      let tot = 0; foes.forEach((f) => { const r = this.physical(u, f, 1.3); this.damage(u, f, r.dmg, r.crit); tot += r.dmg; });
      this.leech(u, tot); const cost = Math.round(u.maxHp * 0.04 * foes.length); u.hp = Math.max(1, u.hp - cost);
      msg = `${u.name} spins into a whirlwind of steel!`; break;
    }
    case 'firebolt': { const f = pickFoe(); const r = this.magic(u, f, 2.0); this.damage(u, f, r.dmg, false); fx(f, '#ff8a3d'); msg = `${u.name} hurls a Firebolt at ${f.name} for ${r.dmg}.`; break; }
    case 'frostNova': { foes.forEach((f) => { const r = this.magic(u, f, 0.9); this.damage(u, f, r.dmg, false); this.give(f, 'slow', 2); fx(f, '#9fe0ff'); }); msg = `${u.name} unleashes a Frost Nova; the enemy slows.`; break; }
    case 'arcaneShield': { const a = pickAlly(); this.give(a, 'shield', 99, Math.round(u.mag * 1.6)); label(a, 'Shield'); fx(a, '#b48aff'); msg = `${u.name} wraps ${a.name} in an Arcane Shield.`; break; }
    case 'mend': { const a = pickAlly(); const amt = this.healUnit(u, a, u.heal * R.float(0.9, 1.1)); fx(a, '#7dffa8'); msg = `${u.name} mends ${a.name}'s wounds (+${amt}).`; break; }
    case 'prayer': { allies.forEach((a) => { this.healUnit(u, a, u.heal * 0.55); fx(a, '#fff3a0'); }); msg = `${u.name} prays, and the party is restored.`; break; }
    case 'smite': { const f = pickFoe(); const r = this.magic(u, f, 1.5 * (UNDEAD[f.type] ? 2 : 1)); this.damage(u, f, r.dmg, false); fx(f, '#fff3a0'); msg = `${u.name} smites ${f.name} for ${r.dmg}${UNDEAD[f.type] ? ', burning the unholy' : ''}.`; break; }
    case 'inspire': { allies.forEach((a) => { this.give(a, 'atkUp', 3, 0.25); label(a, 'Inspired', '#ffd76a'); }); msg = `${u.name} strikes up a war song. The party fights harder!`; break; }
    case 'rally': { allies.forEach((a) => { a.focus = Math.min(3, a.focus + 1); this.healUnit(u, a, u.heal * 0.15); }); msg = `${u.name} rallies the party!`; break; }
    case 'dissonance': { foes.forEach((f) => { const r = this.magic(u, f, 0.6); this.damage(u, f, r.dmg, false); this.give(f, 'defDown', 3); }); msg = `${u.name} plays a jarring chord; the enemy's guard falters.`; break; }
    case 'aimedShot': { const f = pickFoe(); const r = this.physical(u, f, 2.0, 0.25); this.damage(u, f, r.dmg, r.crit); msg = `${u.name} looses an Aimed Shot at ${f.name} for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`; break; }
    case 'volley': { foes.forEach((f) => { const r = this.physical(u, f, 0.7); this.damage(u, f, r.dmg, r.crit); }); msg = `${u.name} looses a volley of arrows!`; break; }
    case 'huntersMark': { const f = pickFoe(); this.give(f, 'mark', 3); label(f, 'Marked', '#ffd76a'); msg = `${u.name} marks ${f.name} for the hunt.`; break; }
    case 'precisionStrike': { const f = pickFoe(); const r = this.physical(u, f, 1.7, 0.3, 0.6); this.damage(u, f, r.dmg, r.crit); msg = `${u.name} finds the gap in ${f.name}'s guard for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`; break; }
    case 'riposte': { this.give(u, 'riposte', 2); u.defending = true; label(u, 'Riposte'); msg = `${u.name} takes a guarded stance, blade ready to answer.`; break; }
    case 'challenge': { const f = pickFoe(); this.give(f, 'mark', 3); u.taunt = 3; label(f, 'Challenged', '#ffd76a'); label(u, 'Challenge'); msg = `${u.name} challenges ${f.name}! All eyes turn to the knight.`; break; }
    case 'flurry': { const f = pickFoe(); let tot = 0; for (let i = 0; i < 2 && f.alive; i++) { const r = this.physical(u, f, 0.65, 0.2); this.damage(u, f, r.dmg, r.crit); tot += r.dmg; } msg = `${u.name} unleashes a Flurry on ${f.name} for ${tot}.`; break; }
    case 'bulwark': { u.defending = true; u.taunt = 2; this.give(u, 'guard', 2); label(u, 'Bulwark'); msg = `${u.name} raises a Bulwark and draws the enemy's attacks.`; break; }
    default: msg = `${u.name} hesitates.`;
  }
  this.say(msg);
};
// how a unit's plain attack works (sorcerers throw arcane bolts)
Battle.basicAttack = function (u, t) {
  if (u.cls === 'sorcerer') {
    const r = this.magic(u, t, 0.95);
    this.damage(u, t, r.dmg, false);
    this.fx.push({ uid: t.uid, burst: '#b48aff', t0: performance.now() });
    this.say(`${u.name} flings an arcane bolt at ${t.name} for ${r.dmg}.`);
    return;
  }
  const r = this.physical(u, t, 1);
  this.damage(u, t, r.dmg, r.crit);
  this.leech(u, r.dmg);
  this.say(`${u.name} strikes ${t.name} for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`);
};
// what an AI-controlled unit (enemy, or a party member on auto) chooses
Battle.choose = function (u) {
  const foes = this.alive(u.side === 'party' ? 'enemy' : 'party');
  const friends = this.alive(u.side);
  const can = (u.abilities || []).filter((id) => GD.ABILITIES[id] && GD.ABILITIES[id].cost <= u.focus);
  const has = (role) => can.filter((id) => GD.ABILITIES[id].role === role);
  const hurt = friends.filter((f) => f.hp < f.maxHp * 0.55).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const taunter = foes.find((f) => f.taunt > 0);
  const pick = (ids) => ids.sort((a, b) => GD.ABILITIES[b].cost - GD.ABILITIES[a].cost)[0];
  const heals = has('heal');
  if (hurt.length && heals.length) {
    const group = heals.find((id) => GD.ABILITIES[id].target === 'allies');
    if (group && hurt.length >= 2) return { id: group };
    const one = heals.find((id) => GD.ABILITIES[id].target === 'ally') || group;
    return { id: one, t: hurt[0] };
  }
  const sh = has('shield'); if (sh.length && hurt.length && !this.st(hurt[0], 'shield')) return { id: sh[0], t: hurt[0] };
  const gd = has('guard'); if (gd.length && hurt.length && !friends.some((f) => this.st(f, 'guard'))) return { id: gd[0] };
  const bf = has('buff');
  if (bf.length && foes.length >= 2 && !friends.some((f) => this.st(f, 'atkUp') || this.st(f, 'bloodlust')) && R.chance(0.75)) return { id: bf[0] };
  const ra = has('rally'); if (ra.length && friends.filter((f) => f.focus < 2).length >= 2 && R.chance(0.5)) return { id: ra[0] };
  const mk = has('mark'); if (mk.length && !foes.some((f) => this.st(f, 'mark')) && R.chance(0.6)) return { id: mk[0], t: taunter || foes.slice().sort((a, b) => b.hp - a.hp)[0] };
  const ao = has('aoe'); if (ao.length && foes.length >= 2) return { id: pick(ao) };
  const nk = has('nuke');
  // berserkers will not risk a reckless strike when nearly dead
  const safeNk = nk.filter((id) => !(id === 'recklessStrike' && u.hp < u.maxHp * 0.2));
  if (safeNk.length) return { id: pick(safeNk), t: taunter || foes.slice().sort((a, b) => a.hp - b.hp)[0] };
  return null;
};

// a knight in riposte answers every blow aimed at them
Battle.counter = function (src, t) {
  if (!src || src === t || !src.alive || !t.alive || src.side === t.side || !this.st(t, 'riposte') || this._countering) return;
  this._countering = true;
  const r = this.physical(t, src, 0.6);
  this.say(`${t.name} ripostes ${src.name} for ${r.dmg}${r.crit ? ' (critical!)' : ''}.`);
  this.damage(null, src, r.dmg, r.crit, 'Riposte');
  this._countering = false;
};
