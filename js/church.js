// Churches: one beside many towns, each sworn to the god of its region. Inside (first person, like a
// town street) you can pray for fortune, take in an orphan from the orphanage, and bury your dead.
// Also: House morale, which deaths lower and funerals raise, and the gods' blessings.
'use strict';

// ---------------------------------------------------------------- the gods of the realm
// Each region keeps its own god: the four quarters of the mainland, and the sea for the islands.
GD.GODS = {
  aurel: { name: 'Aurel', title: 'the Dawn-Father', domain: 'sun and harvest', symbol: 'sun',
    glass: ['#f2c14e', '#e07b39', '#3d6db5', '#c43b2e'], robe: '#e07b39',
    boon: 'harvest', boonText: 'Next year’s estate income +50%.', blurb: 'Fields ripen where his light falls. Farmers leave the first sheaf at his altar.' },
  mirya: { name: 'Mirya', title: 'the Tide-Mother', domain: 'sea and birth', symbol: 'wave',
    glass: ['#3aa0c8', '#2d5f8a', '#e8d9a8', '#6fd6c4'], robe: '#2d5f8a',
    boon: 'fertility', boonText: 'Children come more easily to your House for two years.', blurb: 'Every birth is a tide coming in. Mothers pray to her, and sailors.' },
  kethran: { name: 'Kethran', title: 'the Iron Warden', domain: 'war and oaths', symbol: 'sword',
    glass: ['#b03a2e', '#8c8f99', '#e6c06a', '#3a3f55'], robe: '#8c8f99',
    boon: 'valour', boonText: 'Your Guard strikes 10% harder for a year.', blurb: 'An oath sworn before him is never broken twice. Soldiers kneel here before a war.' },
  sylwen: { name: 'Sylwen', title: 'the Green Hart', domain: 'forest and healing', symbol: 'hart',
    glass: ['#4f9a4a', '#2f5d34', '#d8e6a0', '#a8743a'], robe: '#2f5d34',
    boon: 'health', boonText: 'Your Guard is healed, and you gain 2 potions.', blurb: 'The wounded are brought to her groves. Her priests are herbalists first.' },
  oss: { name: 'Oss', title: 'the Lantern of Ash', domain: 'death and memory', symbol: 'lantern',
    glass: ['#7a5fa8', '#3a2f55', '#e8c06a', '#c8c0d8'], robe: '#3a2f55',
    boon: 'memory', boonText: '+10 morale and +3 fame: the dead are remembered.', blurb: 'He carries a lantern for those who have gone ahead. Funerals are his feast.' },
};
GD.ORPHAN_GIFT = 40; // a donation to the orphanage when you take a child in

const Church = {};

// ---------------------------------------------------------------- placing churches on the map
Church.godFor = function (t) {
  const est = G.world.estate || { x: G.world.map.W / 2, y: G.world.map.H / 2 };
  if (t.land !== G.world.mainland) return 'mirya';
  const e = t.x >= est.x, s = t.y >= est.y;
  return e ? (s ? 'aurel' : 'kethran') : (s ? 'oss' : 'sylwen');
};
Church.nameFor = function (t) {
  const g = GD.GODS[t.god], town = G.world.towns[t.churchTown];
  const big = town && town.size >= 4;
  return `${big ? 'Cathedral' : 'Chapel'} of ${g.name}`;
};
// Beside most towns, a church on open ground a short walk away. Runs once per world (and on old saves).
Church.ensure = function () {
  const w = G.world;
  if (!w || !w.map || w.churchesPlaced) return;
  w.churchesPlaced = true;
  const map = w.map;
  const features = map.tiles.filter((t) => t.feature);
  const clear = (t, d) => features.every((o) => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) >= d);
  const ok = (t) => t && !t.feature && ['grass', 'forest', 'hills', 'sand', 'snow'].includes(t.type);
  const towns = w.towns.map((town, i) => ({ town, i })).filter((x) => !x.town.fallen);
  // the town nearest home always gets one, so a church is within reach from the start
  const est = w.estate;
  towns.sort((a, b) => (Math.abs(a.town.x - est.x) + Math.abs(a.town.y - est.y)) - (Math.abs(b.town.x - est.x) + Math.abs(b.town.y - est.y)));
  towns.forEach(({ town, i }, n) => {
    if (n > 0 && R.chance(0.35)) return;
    const spots = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < 2 || d > 3) continue;
      const t = map.tiles[(town.y + dy) * map.W + (town.x + dx)];
      if (town.x + dx < 0 || town.x + dx >= map.W || town.y + dy < 0 || town.y + dy >= map.H) continue;
      if (ok(t) && t.land === tileAt(town.x, town.y).land && clear(t, 2)) spots.push(t);
    }
    if (!spots.length) return;
    const t = R.pick(spots);
    t.feature = 'church'; t.churchTown = i; t.god = this.godFor(t);
    features.push(t);
  });
};
Church.all = function () { return G.world.map.tiles.filter((t) => t.feature === 'church'); };
Church.nearest = function (from = G.pos) {
  return this.all().filter((t) => reachable(t)).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0] || null;
};

// ---------------------------------------------------------------- morale and blessings
function houseMorale() { return G.house.morale == null ? 50 : G.house.morale; }
function addMorale(n) { G.house.morale = clamp(houseMorale() + n, 0, 100); }
function moraleName(m = houseMorale()) {
  return m >= 80 ? 'High spirits' : m >= 60 ? 'Steady' : m >= 40 ? 'Uneasy' : m >= 20 ? 'Grieving' : 'Broken';
}
// how much harder (or softer) the Guard fights, from morale and the Iron Warden's blessing
function battleSpirit() { return (1 + (houseMorale() - 50) / 500) * (blessed('valour') ? 1.1 : 1); }
function blessed(kind) { const b = G.house.blessings || {}; return b[kind] != null && b[kind] >= G.day; }
function bless(kind, days) { G.house.blessings = G.house.blessings || {}; G.house.blessings[kind] = G.day + days; }
// the House's dead who served it and still wait for a burial
Church.unburied = function () {
  return Object.values(G.chars).filter((c) => !c.alive && !c.buried && c.diedServing).sort((a, b) => b.died - a.died);
};
// a year passes: spirits settle back toward calm; recent unburied dead weigh on everyone
Church.yearTick = function () {
  const m = houseMorale();
  const recent = this.unburied().filter((c) => G.day - c.died < DAYS_PER_YEAR * 5).length;
  addMorale((50 - m) * 0.2 - Math.min(9, recent * 3));
};

// ---------------------------------------------------------------- what you can do in a church
// Pray for fortune: a bigger offering makes the god likelier to answer.
Church.pray = function (t, gift) {
  const g = GD.GODS[t.god], mc = ch(G.mcId);
  const odds = gift >= 40 ? 0.95 : 0.6;
  G.house.gold -= gift;
  t.prayedYear = year();
  advanceDays(1);
  if (!R.chance(odds)) {
    chron(`${mc.name} prayed to ${g.name} at the ${Church.nameFor(t)}. The god was silent.`, 'dim', [mc.id], 'prayer');
    return { ok: false, text: `You kneel a long while before ${g.name}. The candles gutter. No answer comes.` };
  }
  let text = '';
  if (g.boon === 'harvest') { bless('harvest', DAYS_PER_YEAR * 1.2); text = 'Warm light falls across the altar. Next year’s harvest will be rich.'; }
  if (g.boon === 'fertility') { bless('fertility', DAYS_PER_YEAR * 2); text = 'You hear, very faintly, the sea. Children will come more easily to your House.'; }
  if (g.boon === 'valour') { bless('valour', DAYS_PER_YEAR); text = 'A cold certainty settles on your Guard. They will strike harder this year.'; }
  if (g.boon === 'health') {
    for (const c of G.party.map(ch).filter(Boolean)) c.hp = maxHp(c);
    G.house.potions += 2;
    text = 'The smell of green things. Wounds close; two flasks of the grove’s water are pressed into your hands.';
  }
  if (g.boon === 'memory') { addMorale(10); G.house.prestige += 3; text = 'Every name of your House is read aloud by the priest. Your people stand a little taller.'; }
  // a rare sign: fortune in coin
  if (R.chance(gift >= 40 ? 0.12 : 0.05)) { const gold = R.int(30, 70); G.house.gold += gold; text += ` And a sign: a pilgrim presses a purse of ${gold} gold on you, for no reason they can name.`; }
  recordChoice('charity', gift >= 40 ? 0.4 : 0.15, mc.id);
  chron(`${mc.name} prayed to ${g.name}, ${g.title}, and was answered.`, 'good', [mc.id], 'prayer');
  return { ok: true, text };
};
// Bury the dead in the churchyard: a simple rite or a full funeral. Grief shared brings the
// living closer, steadies morale, and shapes what the House values.
Church.bury = function (t, dead, grand) {
  const mc = ch(G.mcId), g = GD.GODS[t.god];
  const cost = grand ? 40 : 10;
  G.house.gold -= cost;
  advanceDays(grand ? 3 : 1);
  dead.buried = { year: year(), at: Church.nameFor(t), grand: !!grand };
  const living = Object.values(G.chars).filter((c) => c.alive && c.id !== mc.id && (c.house === G.house.name || c.status === 'party' || c.status === 'household'));
  for (const c of living) {
    addBond(c, mc, grand ? 6 : 3);
    if (c.house !== G.house.name) c.loyalty = clamp(c.loyalty + (grand ? 6 : 3), -100, 100);
  }
  // those who travelled together grieve together
  const guard = G.party.map(ch).filter(Boolean);
  for (let i = 0; i < guard.length; i++) for (let j = i + 1; j < guard.length; j++) addBond(guard[i], guard[j], grand ? 4 : 2);
  addMorale(grand ? 25 : 12);
  G.house.prestige += grand ? 3 : 1;
  // burying kin honours the blood; burying a companion honours those who chose your House
  recordChoice(dead.house === G.house.name ? 'kin' : 'open', grand ? 0.5 : 0.25, mc.id);
  if (grand) recordChoice('charity', 0.2, mc.id);
  chron(`${dead.name} was laid to rest at the ${Church.nameFor(t)}${grand ? ' with a full funeral' : ''}. ${g.name} keeps their name.`, 'death', [dead.id, mc.id], 'burial');
  return `${dead.name} is laid to rest${grand ? '. The whole House walks behind the bier, and half the town with it' : ''}. Morale +${grand ? 25 : 12}.`;
};
// Children waiting at this church's orphanage: real orphans of the nearby town, and foundlings
// left at the door. The same children stay for the season.
Church.orphans = function (t) {
  const key = `${year()}-${seasonName()}`;
  t.orphanage = t.orphanage && t.orphanage.key === key ? t.orphanage : { key, ids: [] };
  let list = t.orphanage.ids.map(ch).filter((c) => c && c.alive && c.status === 'npc' && !isAdult(c));
  if (list.length < 2) {
    const local = Object.values(G.chars).filter((c) => c.alive && c.status === 'npc' && !isAdult(c) && c.town === t.churchTown
      && (c.orphaned || c.parents.every((p) => !ch(p) || !ch(p).alive)) && !list.includes(c));
    list = list.concat(local.slice(0, 3 - list.length));
  }
  while (list.length < 2) {
    const race = R.chance(0.5) ? 'human' : randomRace();
    const k = makeChar({ race, born: G.day - R.int(1, Math.max(2, GD.RACES[race].maturity - 2)) * DAYS_PER_YEAR, birth: 'lowborn', lineageKnown: false,
      secret: R.weighted({ noble: 1, warrior: 1, common: 4, tainted: 0.6 }), corruption: 0, town: t.churchTown });
    k.orphaned = true; k.foundling = true;
    list.push(k);
  }
  t.orphanage.ids = list.map((c) => c.id);
  return list;
};

// ---------------------------------------------------------------- the church interior, first person
const ChurchView = { open: false };
ChurchView.start = function (tile) {
  if (this.open || !tile || tile.feature !== 'church') return;
  this.open = true;
  this.tile = tile; this.god = GD.GODS[tile.god];
  this.seed = (tile.x * 92821 + tile.y * 68917) % 100000 || 4242;
  this.cv = h('canvas', { class: 'town-canvas' });
  this.say = h('div', { class: 'camp-say' });
  this.btns = h('div', { class: 'camp-btns' });
  this.el = h('div', { class: 'townview churchview' }, this.cv, UI.goldPill(), UI.sceneHouseBtn(), h('div', { class: 'camp-ui town-ui' }, this.say, this.btns));
  document.body.append(this.el);
  this.cv.addEventListener('click', (e) => this.click(e));
  this.cv.addEventListener('mousemove', (e) => { this.hover = this.hit(e); this.cv.style.cursor = this.hover ? 'pointer' : 'default'; });
  this.greet();
  this.renderButtons();
  const loop = (ts) => { if (!this.open) return; this.t = ts; try { this.draw(); } catch (err) { console.error(err); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
ChurchView.close = function () {
  if (!this.open) return;
  this.open = false;
  if (this.el) this.el.remove();
  this.el = null;
  UI.closeDrawer();
  UI.refresh();
};
ChurchView.sync = function () { if (!this.open) return; UI.syncGold(); this.renderButtons(); };
ChurchView.greet = function () {
  const g = this.god, n = Church.unburied().length;
  this.setSay(`The ${Church.nameFor(this.tile)}. Light falls through ${g.name}, ${g.title}, god of ${g.domain}. ${g.blurb}${n ? ` ${n} of your House still wait${n === 1 ? 's' : ''} to be buried.` : ''}`);
};
ChurchView.setSay = function (text) { this.say.replaceChildren(h('div', {}, h('p', {}, text))); };
ChurchView.renderButtons = function () {
  const b = (label, fn, opts = {}) => h('button', { class: 'camp-btn' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, onclick: fn }, label);
  const n = Church.unburied().length;
  this.btns.replaceChildren(
    b(`Pray to ${this.god.name}`, () => this.use('altar'), { cls: 'hl' }),
    b('Orphanage', () => this.use('orphanage')),
    b(n ? `Bury the dead (${n})` : 'Churchyard', () => this.use('yard')),
    b('Leave', () => this.close(), { cls: 'leave' }));
};
ChurchView.use = function (kind) {
  if (kind === 'altar') return this.showPrayer();
  if (kind === 'orphanage') return this.showOrphanage();
  if (kind === 'yard') return this.showYard();
};
ChurchView.showPrayer = function () {
  const t = this.tile, g = this.god;
  const done = t.prayedYear === year();
  const offer = (gift, label, odds) => act(label, () => {
    UI.closeModal();
    const r = Church.pray(t, gift);
    this.setSay(r.text);
    UI.toast(r.ok ? `${g.name} answers.` : `${g.name} is silent.`);
    this.sync(); saveGame();
  }, { cls: gift >= 40 ? 'hl' : '', sub: `${gift} gold · ${odds}`, disabled: done || G.house.gold < gift });
  UI.modal([
    h('div', { class: 'ch-god' }, this.glassCanvas(120, 170), h('div', {},
      h('b', {}, `${g.name}, ${g.title}`), h('small', {}, `God of ${g.domain}`),
      h('p', {}, g.blurb), h('p', { class: 'good' }, `If answered: ${g.boonText}`))),
    done ? h('p', { class: 'dim' }, `You have already prayed here this year. Come back in ${year() + 1}.`) : null,
    offer(10, 'Light a candle', 'often answered'),
    offer(40, 'Make a generous offering', 'almost always answered'),
  ], { title: 'At the altar', sheet: true });
};
ChurchView.showOrphanage = function () {
  const list = Church.orphans(this.tile);
  const broke = G.house.gold < GD.ORPHAN_GIFT;
  UI.modal([
    h('p', { class: 'takein-what' }, `The sisters keep the children who have no one. Take one in as your ward: they carry your name and can become your heir. A gift of ${GD.ORPHAN_GIFT} gold keeps the orphanage going.`),
    broke ? h('p', { class: 'bad' }, `You need ${GD.ORPHAN_GIFT} gold.`) : null,
    ...list.map((c) => h('div', { class: 'takein-card' }, portrait(c, 64),
      h('div', { class: 'takein-info' }, h('b', {}, c.name),
        h('small', {}, `${GD.RACES[c.race].name} · ${ageStr(c)} ${ageStr(c) === 1 ? 'year' : 'years'} old`),
        h('small', {}, c.foundling ? 'Left at the church door as a baby' : 'Lost their parents')),
      h('button', { class: 'takein-go', disabled: broke, onclick: () => { UI.closeAll(); Game.adopt(c, GD.ORPHAN_GIFT); this.setSay(`${c.name} takes your hand and does not let go. They are of House ${G.house.name} now.`); this.sync(); } },
        'Take in', h('small', {}, `${GD.ORPHAN_GIFT} gold`)))),
  ], { title: 'The orphanage', sheet: true });
};
ChurchView.showYard = function () {
  const dead = Church.unburied();
  const t = this.tile;
  const row = (c) => h('div', { class: 'takein-card' }, portrait(c, 56),
    h('div', { class: 'takein-info' }, h('b', {}, `${c.name} †`),
      h('small', {}, `${c.house === G.house.name ? 'Of your House' : 'Served your House'} · died ${year(c.died)}, aged ${ageStr(c)}`),
      h('small', {}, c.cause)),
    h('div', { class: 'ch-rites' },
      h('button', { class: 'takein-go', disabled: G.house.gold < 40, onclick: () => { UI.closeModal(); this.setSay(Church.bury(t, c, true)); this.sync(); saveGame(); UI.refresh(); } }, 'Funeral', h('small', {}, '40 gold')),
      h('button', { class: 'takein-go plain', disabled: G.house.gold < 10, onclick: () => { UI.closeModal(); this.setSay(Church.bury(t, c, false)); this.sync(); saveGame(); UI.refresh(); } }, 'Rites', h('small', {}, '10 gold'))));
  const graves = Object.values(G.chars).filter((c) => c.buried && c.buried.at === Church.nameFor(t)).slice(-4);
  UI.modal([
    h('p', { class: 'takein-what' }, dead.length
      ? `Burying your dead lifts the House’s morale, draws the living closer, and shapes what your House values. A full funeral does more. Morale now: ${Math.round(houseMorale())} (${moraleName().toLowerCase()}).`
      : 'All your dead are at rest.'),
    ...dead.slice(0, 5).map(row),
    dead.length > 5 ? h('p', { class: 'dim' }, `+${dead.length - 5} more.`) : null,
    graves.length ? h('p', { class: 'dim' }, `Buried here: ${graves.map((c) => c.name).join(', ')}.`) : null,
  ], { title: 'The churchyard', sheet: true });
};

// ---- drawing the nave
ChurchView.focal = function () { return Math.min(this.H * 0.95, this.W * 0.8); };
ChurchView.proj = function (x, y, z) { const f = this.focal(); return { x: this.W / 2 + (x * f) / z, y: this.hz + ((1.6 - y) * f) / z }; };
ChurchView.draw = function () {
  const cv = this.cv, dpr = window.devicePixelRatio || 1;
  const W = this.W = cv.clientWidth, H = this.H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  this.hz = H * 0.46;
  const t = this.t / 1000, g = this.god;
  const P = (x, y, z) => this.proj(x, y, z);
  const q = (pts, fill) => { c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fill(); };
  const NW = 3.2, NH = 7, Z0 = 1.0, ZB = 11;
  this.hot = [];
  // vault and walls
  c.fillStyle = '#17131b'; c.fillRect(0, 0, W, H);
  q([P(-NW, NH, Z0), P(NW, NH, Z0), P(NW, NH, ZB), P(-NW, NH, ZB)], '#241d26');
  q([P(-NW, 0, Z0), P(-NW, NH, Z0), P(-NW, NH, ZB), P(-NW, 0, ZB)], '#4a4148');
  q([P(NW, 0, Z0), P(NW, NH, Z0), P(NW, NH, ZB), P(NW, 0, ZB)], '#3d353c');
  // floor: worn flagstones
  q([P(-NW, 0, Z0), P(NW, 0, Z0), P(NW, 0, ZB), P(-NW, 0, ZB)], '#5a4e48');
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1;
  for (let z = Z0; z <= ZB; z += 0.8) { const a = P(-NW, 0, z), b = P(NW, 0, z); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  for (let x = -NW; x <= NW; x += 0.8) { const a = P(x, 0, Z0), b = P(x, 0, ZB); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  // a long red carpet down the aisle to the altar
  q([P(-0.55, 0.01, Z0), P(0.55, 0.01, Z0), P(0.55, 0.01, ZB - 1.5), P(-0.55, 0.01, ZB - 1.5)], '#6a2028');
  // back wall with the great window
  q([P(-NW, 0, ZB), P(NW, 0, ZB), P(NW, NH, ZB), P(-NW, NH, ZB)], '#544a50');
  const wTop = P(-1.7, 6.6, ZB), wBot = P(1.7, 1.75, ZB);
  const win = { x: wTop.x, y: wTop.y, w: wBot.x - wTop.x, h: wBot.y - wTop.y };
  this.drawGlass(c, win.x, win.y, win.w, win.h, t);
  this.hot.push({ kind: 'altar', label: `${g.name}, ${g.title}`, lx: win.x + win.w / 2, ly: win.y - 6, poly: [{ x: win.x, y: win.y }, { x: win.x + win.w, y: win.y }, { x: win.x + win.w, y: win.y + win.h }, { x: win.x, y: win.y + win.h }] });
  // light from the window pooling on the floor, in the glass's colours
  c.save(); c.globalCompositeOperation = 'lighter';
  g.glass.slice(0, 3).forEach((col, i) => {
    const x0 = win.x + win.w * (0.2 + i * 0.3), f0 = P(-1.6 + i * 1.6, 0, ZB - 6.5);
    const grad = c.createLinearGradient(x0, win.y + win.h, f0.x, f0.y);
    grad.addColorStop(0, hexA(col, 0.22 + Math.sin(t * 0.7 + i) * 0.03)); grad.addColorStop(1, hexA(col, 0));
    c.fillStyle = grad;
    c.beginPath(); c.moveTo(x0 - win.w * 0.12, win.y + win.h * 0.6); c.lineTo(x0 + win.w * 0.12, win.y + win.h * 0.6);
    c.lineTo(f0.x + 60, f0.y); c.lineTo(f0.x - 60, f0.y); c.closePath(); c.fill();
  });
  c.restore();
  // columns and side windows, far to near
  for (let z = ZB - 1.5; z >= Z0 + 1; z -= 2.6) {
    for (const s of [-1, 1]) {
      const x = s * (NW - 0.05);
      const sw0 = P(x, 2.6, z + 0.5), sw1 = P(x, 4.6, z + 1.4);
      c.fillStyle = hexA(g.glass[(Math.round(z) + (s > 0 ? 1 : 0)) % g.glass.length], 0.75);
      q([P(x, 2.6, z + 0.5), P(x, 2.6, z + 1.4), P(x, 4.4, z + 1.4), P(x, 4.6, z + 0.95), P(x, 4.4, z + 0.5)], c.fillStyle);
      c.strokeStyle = 'rgba(20,14,16,0.8)'; c.lineWidth = Math.max(1, this.focal() / z * 0.02);
      c.beginPath(); c.moveTo(sw0.x, (sw0.y + sw1.y) / 2); c.lineTo(sw1.x, (sw0.y + sw1.y) / 2); c.stroke();
      const cx = s * (NW - 0.35);
      q([P(cx - 0.22, 0, z), P(cx + 0.22, 0, z), P(cx + 0.22, NH, z), P(cx - 0.22, NH, z)], s < 0 ? '#6a5f64' : '#5e5459');
    }
  }
  // the altar, with candles and a priest
  const alt = [P(-1.2, 0, ZB - 1.6), P(1.2, 0, ZB - 1.6), P(1.2, 1.05, ZB - 1.6), P(-1.2, 1.05, ZB - 1.6)];
  q(alt, '#7a6a5a');
  q([P(-1.3, 1.05, ZB - 1.6), P(1.3, 1.05, ZB - 1.6), P(1.3, 1.05, ZB - 2.2), P(-1.3, 1.05, ZB - 2.2)], '#e8e0d0');
  for (const cx of [-0.9, -0.5, 0.5, 0.9]) {
    const b0 = P(cx, 1.05, ZB - 1.9), b1 = P(cx, 1.5, ZB - 1.9);
    c.fillStyle = '#efe6d2'; c.fillRect(b0.x - 2, b1.y, 4, b0.y - b1.y);
    const fl = 3 + Math.sin(t * 9 + cx * 5) * 0.8;
    const glow = c.createRadialGradient(b1.x, b1.y - 3, 1, b1.x, b1.y - 3, 22);
    glow.addColorStop(0, 'rgba(255,214,140,0.7)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(b1.x, b1.y - 3, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe9a0'; c.beginPath(); c.ellipse(b1.x, b1.y - 4, 1.8, fl, 0, 0, Math.PI * 2); c.fill();
  }
  this.hot.push({ kind: 'altar', label: 'Altar · pray', lx: (alt[0].x + alt[1].x) / 2, ly: alt[2].y - 10, poly: alt });
  this.figure(c, 0.0, ZB - 2.7, { skin: '#c9a88a', hair: '#bdb5a8', tunic: g.robe, gender: 'man', beard: true });
  // side doors: orphanage (left) and churchyard (right)
  const door = (s, z, kind, label) => {
    const x = s * NW;
    const d = [P(x, 0, z), P(x, 0, z + 1), P(x, 2.0, z + 1), P(x, 2.4, z + 0.5), P(x, 2.0, z)];
    q(d, '#3a2418');
    c.strokeStyle = '#1a100a'; c.lineWidth = 2; c.beginPath(); c.moveTo(d[0].x, d[0].y); for (const p of d) c.lineTo(p.x, p.y); c.stroke();
    const top = P(x - s * 0.3, 2.9, z + 0.5);
    this.hot.push({ kind, label, lx: top.x, ly: top.y, poly: d });
  };
  door(-1, 3.8, 'orphanage', 'Orphanage');
  door(1, 5.6, 'yard', Church.unburied().length ? `Churchyard · ${Church.unburied().length} to bury` : 'Churchyard');
  // pews, far to near
  for (let z = ZB - 3.6; z >= Z0 + 1.2; z -= 1.35) {
    for (const [x0, x1] of [[-2.7, -0.8], [0.8, 2.7]]) {
      q([P(x0, 0.45, z), P(x1, 0.45, z), P(x1, 0.45, z - 0.45), P(x0, 0.45, z - 0.45)], '#6a4a30');
      q([P(x0, 0, z - 0.45), P(x1, 0, z - 0.45), P(x1, 0.45, z - 0.45), P(x0, 0.45, z - 0.45)], '#4a3020');
      q([P(x0, 0.45, z), P(x1, 0.45, z), P(x1, 1.05, z), P(x0, 1.05, z)], '#5a3c26');
    }
  }
  // a few worshippers, and orphans by their door
  this.figure(c, -1.6, 7.6, { tunic: '#5a6a3a', gender: 'woman', hairStyle: 'long' });
  this.figure(c, 1.9, 6.0, { tunic: '#4a4a6a', gender: 'man' });
  const kids = Church.orphans(this.tile).slice(0, 2);
  kids.forEach((k, i) => this.figure(c, -2.3 + i * 0.5, 3.4 - i * 0.3, null, k));
  // labels
  for (const hs of this.hot) {
    c.font = `600 ${Math.max(12, Math.min(16, W / 50))}px Georgia, serif`;
    const tw = c.measureText(hs.label).width + 14;
    hs.lx = clamp(hs.lx, tw / 2 + 4, W - tw / 2 - 4); hs.ly = clamp(hs.ly, 22, H - 160);
    const on = this.hover && this.hover === hs;
    c.fillStyle = on ? 'rgba(90,66,16,0.95)' : 'rgba(20,16,12,0.8)';
    c.fillRect(hs.lx - tw / 2, hs.ly - 16, tw, 22);
    c.strokeStyle = '#e6c06a'; c.lineWidth = 1; c.strokeRect(hs.lx - tw / 2 + 0.5, hs.ly - 15.5, tw - 1, 21);
    c.fillStyle = '#f2ead8'; c.textAlign = 'center'; c.fillText(hs.label, hs.lx, hs.ly);
  }
  // dim, warm interior light
  const v = c.createRadialGradient(W / 2, H * 0.4, H * 0.15, W / 2, H * 0.5, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
};
ChurchView.figure = function (c, x, z, look, who) {
  const s = this.proj(x, 0, z), sc = this.focal() / z / 52;
  const saved = Render.ctx; Render.ctx = c;
  try {
    Render.drawFigure(s.x, s.y, who ? figLook(who) : { skin: '#c9a88a', hair: '#3a2418', stage: 'prime', race: 'human', hairStyle: 'short', hScale: 1, wScale: 1, ...look }, sc, { bob: 0 });
  } finally { Render.ctx = saved; }
};
// The great window: the god in leaded glass, holding their sign, light moving slowly through it.
ChurchView.drawGlass = function (c, x, y, w, hgt, t) {
  const g = this.god, seed = this.seed;
  const rng = (k) => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  const arch = () => { c.beginPath(); c.moveTo(x, y + hgt); c.lineTo(x, y + w / 2); c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, y + hgt); c.closePath(); };
  const lead = Math.max(1.2, w / 70);
  c.save();
  // glow around the frame
  const halo = c.createRadialGradient(x + w / 2, y + hgt * 0.45, w * 0.2, x + w / 2, y + hgt * 0.45, w * 1.1);
  halo.addColorStop(0, hexA(g.glass[0], 0.35)); halo.addColorStop(1, hexA(g.glass[0], 0));
  c.fillStyle = halo; c.fillRect(x - w, y - w * 0.5, w * 3, hgt + w);
  arch(); c.clip();
  // background mosaic: jittered quads in the god's colours
  const cols = 6, rows = 11, cw = w / cols, rh = hgt / rows;
  const pt = (i, j) => ({ x: x + i * cw + (i > 0 && i < cols ? (rng(i * 31 + j) - 0.5) * cw * 0.5 : 0), y: y + j * rh + (j > 0 && j < rows ? (rng(i * 17 + j * 7) - 0.5) * rh * 0.5 : 0) });
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const a = pt(i, j), b = pt(i + 1, j), d = pt(i, j + 1), e = pt(i + 1, j + 1);
    const base = g.glass[Math.floor(rng(i * 5 + j * 11) * 2) + 1];
    const shim = 0.75 + 0.25 * Math.sin(t * 0.6 + i * 0.7 + j * 0.4);
    c.fillStyle = shade(base, (rng(i + j * 13) - 0.5) * 0.35);
    c.globalAlpha = shim;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.lineTo(d.x, d.y); c.closePath(); c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = '#1a1410'; c.lineWidth = lead; c.stroke();
  }
  // the god: halo, head, robe, arms raised to hold their sign
  const cx = x + w / 2, top = y + hgt * 0.18;
  const fig = (fill, path) => { c.fillStyle = fill; path(); c.fill(); c.strokeStyle = '#1a1410'; c.lineWidth = lead * 1.3; c.stroke(); };
  fig(hexA('#ffe9a0', 0.95), () => { c.beginPath(); c.arc(cx, top + w * 0.13, w * 0.17, 0, Math.PI * 2); });
  fig('#e8d2b0', () => { c.beginPath(); c.arc(cx, top + w * 0.13, w * 0.09, 0, Math.PI * 2); });
  fig(g.robe, () => { c.beginPath(); c.moveTo(cx - w * 0.1, top + w * 0.24); c.lineTo(cx + w * 0.1, top + w * 0.24); c.lineTo(cx + w * 0.3, y + hgt * 0.97); c.lineTo(cx - w * 0.3, y + hgt * 0.97); c.closePath(); });
  fig(shade(g.robe, 0.25), () => { c.beginPath(); c.moveTo(cx - w * 0.05, top + w * 0.3); c.lineTo(cx + w * 0.05, top + w * 0.3); c.lineTo(cx + w * 0.07, y + hgt * 0.95); c.lineTo(cx - w * 0.07, y + hgt * 0.95); c.closePath(); });
  // the sign, held at the chest
  const sx = cx, sy = top + w * 0.55, r = w * 0.16;
  const sign = g.glass[0];
  if (g.symbol === 'sun') {
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * 0.05; fig(sign, () => { c.beginPath(); c.moveTo(sx + Math.cos(a - 0.12) * r, sy + Math.sin(a - 0.12) * r); c.lineTo(sx + Math.cos(a) * r * 1.7, sy + Math.sin(a) * r * 1.7); c.lineTo(sx + Math.cos(a + 0.12) * r, sy + Math.sin(a + 0.12) * r); c.closePath(); }); }
    fig('#fff3c0', () => { c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); });
  } else if (g.symbol === 'wave') {
    for (let k = 0; k < 3; k++) fig(k % 2 ? '#e8f4ff' : sign, () => {
      const yy = sy - r + k * r * 0.7; c.beginPath(); c.moveTo(sx - r * 1.3, yy + r * 0.6);
      for (let i = 0; i <= 12; i++) c.lineTo(sx - r * 1.3 + i * r * 0.217, yy + Math.sin(i * 0.9 + t) * r * 0.18);
      c.lineTo(sx + r * 1.3, yy + r * 0.6); c.closePath(); });
  } else if (g.symbol === 'sword') {
    fig('#e8ecf2', () => { c.beginPath(); c.moveTo(sx, sy - r * 1.9); c.lineTo(sx + r * 0.2, sy - r * 1.5); c.lineTo(sx + r * 0.2, sy + r * 0.9); c.lineTo(sx - r * 0.2, sy + r * 0.9); c.lineTo(sx - r * 0.2, sy - r * 1.5); c.closePath(); });
    fig(sign, () => { c.beginPath(); c.rect(sx - r * 0.9, sy + r * 0.9, r * 1.8, r * 0.3); });
    fig(shade(sign, -0.3), () => { c.beginPath(); c.rect(sx - r * 0.13, sy + r * 1.2, r * 0.26, r * 0.7); });
    fig(sign, () => { c.beginPath(); c.arc(sx, sy + r * 2.0, r * 0.2, 0, Math.PI * 2); });
  } else if (g.symbol === 'hart') {
    fig('#a8743a', () => { c.beginPath(); c.ellipse(sx, sy + r * 0.2, r * 0.45, r * 0.75, 0, 0, Math.PI * 2); });
    c.strokeStyle = '#d8e6a0'; c.lineWidth = Math.max(2, r * 0.16); c.lineCap = 'round';
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(sx + s * r * 0.25, sy - r * 0.35); c.lineTo(sx + s * r * 0.8, sy - r * 1.3); c.lineTo(sx + s * r * 1.3, sy - r * 1.7);
      c.moveTo(sx + s * r * 0.6, sy - r * 1.0); c.lineTo(sx + s * r * 1.2, sy - r * 1.0);
      c.moveTo(sx + s * r * 0.8, sy - r * 1.3); c.lineTo(sx + s * r * 0.7, sy - r * 1.9); c.stroke();
    }
  } else {
    fig('#2a2235', () => { c.beginPath(); c.rect(sx - r * 0.7, sy - r * 0.9, r * 1.4, r * 1.8); });
    const fl = 0.85 + Math.sin(t * 3) * 0.15;
    fig(hexA('#ffd56a', fl), () => { c.beginPath(); c.ellipse(sx, sy, r * 0.42, r * 0.7, 0, 0, Math.PI * 2); });
    fig(sign, () => { c.beginPath(); c.moveTo(sx - r * 0.9, sy - r * 0.9); c.lineTo(sx + r * 0.9, sy - r * 0.9); c.lineTo(sx, sy - r * 1.5); c.closePath(); });
  }
  c.restore();
  // stone frame
  c.strokeStyle = '#8a7f78'; c.lineWidth = Math.max(3, w / 22); arch(); c.stroke();
};
// a small canvas of the window, for the prayer sheet
ChurchView.glassCanvas = function (w, hgt) {
  const cv = h('canvas', { width: w * 2, height: hgt * 2, style: `width:${w}px;height:${hgt}px`, class: 'ch-glass' });
  const c = cv.getContext('2d'); c.scale(2, 2);
  this.drawGlass(c, 8, 6, w - 16, hgt - 12, (this.t || 0) / 1000);
  return cv;
};
ChurchView.hit = function (e) {
  if (!this.hot) return null;
  const r = this.cv.getBoundingClientRect();
  const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
  for (const hs of this.hot) if (Math.abs(pt.x - hs.lx) < 70 && Math.abs(pt.y - hs.ly + 5) < 16) return hs;
  for (const hs of this.hot.slice().reverse()) if (inPoly(pt, hs.poly)) return hs;
  return null;
};
ChurchView.click = function (e) { const hs = this.hit(e); if (hs) this.use(hs.kind); };
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------- the church on the map
Render.drawChurch = function (p, t) {
  const c = this.ctx, g = GD.GODS[t.god] || GD.GODS.aurel;
  this.drawBox(p.x - 2, p.y, 0.55, 0.3, 18, eraTint('#cfc4b2'), eraTint('#5a4a5a'), 10);
  // bell tower
  this.drawBox(p.x + 10, p.y - 2, 0.2, 0.2, 34, eraTint('#d8cdbb'), eraTint('#4a3a4a'), 12);
  c.strokeStyle = '#e6c06a'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(p.x + 10, p.y - 52); c.lineTo(p.x + 10, p.y - 60); c.moveTo(p.x + 7, p.y - 57); c.lineTo(p.x + 13, p.y - 57); c.stroke();
  // a glint of coloured glass
  const k = 0.65 + Math.sin(this.t / 600 + t.x) * 0.25;
  c.fillStyle = hexA(g.glass[0], k); c.beginPath(); c.arc(p.x - 6, p.y - 16, 3, 0, Math.PI * 2); c.fill();
};

// ---------------------------------------------------------------- the Here panel for a church
UI.churchPanel = function (t) {
  const g = GD.GODS[t.god], n = Church.unburied().length;
  return [
    h('h3', {}, Church.nameFor(t)),
    h('p', { class: 'dim' }, `A house of ${g.name}, ${g.title}, god of ${g.domain}. Pray for fortune, take in an orphan, or bury your dead.`),
    act('Enter the church', () => ChurchView.start(t), { cls: 'hl', sub: n ? `${n} of your dead wait to be buried` : 'pray · orphanage · churchyard' }),
  ];
};
