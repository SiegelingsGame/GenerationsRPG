// Entering a town: a first-person street view. Tap buildings to use them, tap people to talk,
// recruit, court or ask for news, and buy rumors that reveal the world.
'use strict';

const TownView = { open: false };

// ---------------------------------------------------------------- open / close
TownView.start = function (tile) {
  if (this.open) return;
  const town = G.world.towns[tile.townIdx];
  if (!town) return;
  this.open = true;
  this.tile = tile; this.town = town; this.idx = tile.townIdx;
  this.selected = null; this.hover = null;
  this.seed = (town.x * 92821 + town.y * 68917) % 100000;
  this.cv = h('canvas', { class: 'town-canvas' });
  this.say = h('div', { class: 'camp-say' });
  this.btns = h('div', { class: 'camp-btns' });
  this.el = h('div', { class: 'townview' }, this.cv, UI.goldPill(), UI.sceneHouseBtn(), h('div', { class: 'camp-ui town-ui' }, this.say, this.btns));
  document.body.append(this.el);
  this.cv.addEventListener('click', (e) => this.click(e));
  this.cv.addEventListener('mousemove', (e) => { this.hover = this.hit(e); this.cv.style.cursor = this.hover ? 'pointer' : 'default'; });
  this.placePeople();
  this.greet();
  this.renderButtons();
  const loop = (ts) => { if (!this.open) return; this.t = ts; try { this.draw(); } catch (err) { console.error(err); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
TownView.close = function () {
  if (!this.open) return;
  this.open = false;
  if (this.el) this.el.remove();
  this.el = null;
  UI.closeDrawer();
  UI.refresh();
};
// called after any game action while the town view is open
TownView.sync = function () {
  if (!this.open) return;
  UI.syncGold();
  const here = tileAt(G.pos.x, G.pos.y);
  if (Battle.active || G.pendingSuccession || here !== this.tile || this.town.fallen) return this.close();
  this.placePeople();
  if (this.selected && (!this.selected.alive || this.selected.status !== 'npc' || this.selected.town !== this.idx)) this.selected = null;
  this.renderButtons();
};

// ---------------------------------------------------------------- people in the street
TownView.placePeople = function () {
  const folk = Object.values(G.chars).filter((c) => c.alive && c.status === 'npc' && c.town === this.idx && !c.evil && isAdult(c))
    .sort((a, b) => b.level - a.level).slice(0, 7);
  const kids = Object.values(G.chars).filter((c) => c.alive && c.status === 'npc' && c.town === this.idx && !isAdult(c)).slice(0, 2);
  const spots = [[-1.6, 3.2], [1.5, 3.8], [-0.6, 5.2], [0.9, 6.4], [-1.9, 7.4], [1.8, 8.6], [-0.2, 9.8], [0.5, 4.6], [-1.1, 11]];
  this.people = [...folk, ...kids].map((c, i) => ({ c, x: spots[i % spots.length][0], z: spots[i % spots.length][1], face: R.chance(0.5) ? 1 : -1 }));
};

// ---------------------------------------------------------------- the street in perspective
TownView.focal = function () { return Math.min(this.H * 0.95, this.W * 0.75); };
TownView.proj = function (x, y, z) {
  const f = this.focal();
  return { x: this.W / 2 + (x * f) / z, y: this.hz + ((1.6 - y) * f) / z };
};
TownView.buildings = function () {
  // left and right rows of houses; the named ones are near the start of the street
  const size = this.town.size;
  const named = { L: [['tavern', 2.2, 4.8], ['inn', 8.4, 11.6]], R: [['market', 2.4, 5.4], ['hall', 7.2, 11.2]] };
  const out = [];
  const rng = (k) => ((this.seed * (k + 7) * 9301 + 49297) % 233280) / 233280;
  for (const side of ['L', 'R']) {
    let z = 1.4, k = side === 'L' ? 0 : 50;
    while (z < 9 + size * 4) {
      const nm = named[side].find((n) => Math.abs(n[1] - z) < 0.4);
      const len = nm ? nm[2] - nm[1] : 1.6 + rng(k) * 1.8;
      const hgt = (nm && nm[0] === 'hall' ? 5.2 : 2.6 + rng(k + 1) * (size >= 3 ? 2.6 : 1.4));
      out.push({ side, z0: nm ? nm[1] : z, z1: (nm ? nm[1] : z) + len, hgt, kind: nm ? nm[0] : null, col: ['#c9b08a', '#d4c3a0', '#bfa57d', '#b89a74', '#d8cbb0', '#a99478'][Math.floor(rng(k + 2) * 6)], roof: ['#8c3b2a', '#5b4a8a', '#7a3022', '#4a5a6a', '#6b4a2a'][Math.floor(rng(k + 3) * 5)] });
      z = (nm ? nm[2] : z + len) + 0.15;
      if (nm) named[side] = named[side].filter((n) => n !== nm);
      const next = named[side][0];
      if (next && z > next[1] - 0.4) z = next[1];
      k += 4;
    }
  }
  return out;
};
TownView.draw = function () {
  const cv = this.cv;
  const dpr = window.devicePixelRatio || 1;
  const W = this.W = cv.clientWidth, H = this.H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  this.hz = H * 0.42;
  const E = G.world.era.type;
  const t = this.t / 1000;
  // sky with the era's light
  const sky = c.createLinearGradient(0, 0, 0, this.hz);
  sky.addColorStop(0, eraTint(E === 'war' ? '#6a4a4a' : E === 'famine' ? '#8a8676' : '#6f9ccc'));
  sky.addColorStop(1, eraTint(E === 'war' ? '#c08060' : '#e8d6a8'));
  c.fillStyle = sky; c.fillRect(0, 0, W, this.hz + 2);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 4; i++) { const cx = ((i * 0.31 + t * 0.008) % 1.2 - 0.1) * W; c.beginPath(); c.ellipse(cx, this.hz * (0.2 + i * 0.12), 60, 14, 0, 0, Math.PI * 2); c.fill(); }
  // distant keep for cities
  if (this.town.size >= 4) {
    const p = this.proj(0, 0, 40);
    c.fillStyle = eraTint('#8c867d');
    c.fillRect(p.x - 40, p.y - 120, 80, 120); c.fillRect(p.x - 60, p.y - 70, 20, 70); c.fillRect(p.x + 40, p.y - 70, 20, 70);
    c.fillStyle = G.house.color; c.fillRect(p.x - 2, p.y - 150, 3, 30);
  }
  // street
  const g = c.createLinearGradient(0, this.hz, 0, H);
  g.addColorStop(0, eraTint('#8a7f6e')); g.addColorStop(1, eraTint('#5e5446'));
  c.fillStyle = g; c.fillRect(0, this.hz, W, H - this.hz);
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
  for (let z = 1.2; z < 40; z *= 1.18) { const a = this.proj(-6, 0, z), b = this.proj(6, 0, z); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  for (let x = -3; x <= 3; x += 0.75) { const a = this.proj(x, 0, 1.1), b = this.proj(x, 0, 40); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  // houses and people, far to near
  this.hot = [];
  const items = [...this.buildings().map((b) => ({ b, z: b.z0 })), ...this.people.map((p) => ({ p, z: p.z }))].sort((a, b) => b.z - a.z);
  for (const it of items) {
    if (it.b) this.drawBuilding(c, it.b);
    else this.drawPerson(c, it.p);
  }
  // the end of the street: a well in the square
  // labels for the named places on top
  for (const hs of this.hot) {
    if (!hs.label) continue;
    c.font = `600 ${Math.max(12, Math.min(16, W / 50))}px Georgia, serif`;
    const tw = c.measureText(hs.label).width + 14;
    hs.lx = clamp(hs.lx, tw / 2 + 4, W - tw / 2 - 4);
    hs.ly = clamp(hs.ly, 22, this.hz + 40);
    const on = this.hover && this.hover.kind === hs.kind;
    c.fillStyle = on ? 'rgba(90,66,16,0.95)' : 'rgba(20,16,12,0.8)';
    c.fillRect(hs.lx - tw / 2, hs.ly - 16, tw, 22);
    c.strokeStyle = '#e6c06a'; c.lineWidth = 1; c.strokeRect(hs.lx - tw / 2 + 0.5, hs.ly - 15.5, tw - 1, 21);
    c.fillStyle = '#f2ead8'; c.textAlign = 'center'; c.fillText(hs.label, hs.lx, hs.ly);
  }
  // era mood
  if (E === 'war') { c.fillStyle = 'rgba(120,20,10,0.08)'; c.fillRect(0, 0, W, H); }
  if (E === 'famine') { c.fillStyle = 'rgba(60,50,30,0.12)'; c.fillRect(0, 0, W, H); }
};
TownView.drawBuilding = function (c, b) {
  const sx = b.side === 'L' ? -3 : 3;
  const out = b.side === 'L' ? -1 : 1;
  const P = (x, y, z) => this.proj(x, y, z);
  const q = (pts, fill) => { c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) c.lineTo(p.x, p.y); c.closePath(); c.fill(); };
  const a0 = P(sx, 0, b.z0), a1 = P(sx, 0, b.z1), t1 = P(sx, b.hgt, b.z1), t0 = P(sx, b.hgt, b.z0);
  // front gable face (facing the viewer) for depth
  const f0 = P(sx + out * 3, 0, b.z0), f1 = P(sx + out * 3, b.hgt, b.z0);
  q([a0, f0, f1, t0], shade(eraTint(b.col), -0.18));
  q([t0, f1, P(sx + out * 1.5, b.hgt + 1.4, b.z0)], shade(eraTint(b.roof), -0.1));
  // wall along the street
  q([a0, a1, t1, t0], eraTint(b.col));
  // roof slope
  q([t0, t1, P(sx + out * 1.5, b.hgt + 1.4, b.z1), P(sx + out * 1.5, b.hgt + 1.4, b.z0)], eraTint(b.roof));
  // timber beam and windows
  c.strokeStyle = 'rgba(60,40,20,0.5)'; c.lineWidth = Math.max(1, (this.H * 0.004) / ((b.z0 + b.z1) / 2) * 3);
  const m0 = P(sx, b.hgt * 0.55, b.z0), m1 = P(sx, b.hgt * 0.55, b.z1);
  c.beginPath(); c.moveTo(m0.x, m0.y); c.lineTo(m1.x, m1.y); c.stroke();
  const n = Math.max(1, Math.round((b.z1 - b.z0) / 0.9));
  for (let i = 0; i < n; i++) {
    const za = b.z0 + (i + 0.3) * (b.z1 - b.z0) / n, zb = za + 0.35 * (b.z1 - b.z0) / n;
    q([P(sx, b.hgt * 0.68, za), P(sx, b.hgt * 0.68, zb), P(sx, b.hgt * 0.86, zb), P(sx, b.hgt * 0.86, za)], 'rgba(40,30,25,0.75)');
    if (b.hgt > 3.6) q([P(sx, b.hgt * 0.3, za), P(sx, b.hgt * 0.3, zb), P(sx, b.hgt * 0.45, zb), P(sx, b.hgt * 0.45, za)], 'rgba(255,220,140,0.5)');
  }
  // door
  const dz = (b.z0 + b.z1) / 2;
  q([P(sx, 0, dz - 0.3), P(sx, 0, dz + 0.3), P(sx, 1.9, dz + 0.3), P(sx, 1.9, dz - 0.3)], '#4a3020');
  if (!b.kind) return;
  // named places: a hanging sign, an awning, or banners, plus a tap target
  const names = { tavern: 'Tavern', inn: 'Inn', market: 'Market', hall: 'Notice Board' };
  const sign = P(sx - out * 0.9, 2.6, b.z0 + 0.6);
  if (b.kind === 'market') {
    for (let i = 0; i < 3; i++) {
      const z0 = b.z0 + 0.2 + i * 1, z1 = z0 + 0.8;
      q([P(sx, 2.1, z0), P(sx, 2.1, z1), P(sx - out * 1.4, 1.7, z1), P(sx - out * 1.4, 1.7, z0)], ['#b03a2e', '#e6c06a', '#3d5a80'][i]);
      q([P(sx - out * 0.2, 0.9, z0), P(sx - out * 0.2, 0.9, z1), P(sx - out * 1.3, 0.9, z1), P(sx - out * 1.3, 0.9, z0)], '#6b4a2a');
    }
  }
  if (b.kind === 'hall') {
    c.fillStyle = G.house.color;
    for (let i = 0; i < 2; i++) { const p0 = P(sx, b.hgt * 0.9, b.z0 + 1 + i * 2), p1 = P(sx, b.hgt * 0.45, b.z0 + 1.4 + i * 2); c.fillRect(p0.x - 3, p0.y, Math.max(6, (p1.x - p0.x) || 6), p1.y - p0.y); }
    q([P(sx - out * 0.05, 1.1, b.z0 + 0.5), P(sx - out * 0.05, 1.1, b.z0 + 1.3), P(sx - out * 0.05, 2.0, b.z0 + 1.3), P(sx - out * 0.05, 2.0, b.z0 + 0.5)], '#d8c8a0');
  }
  if (b.kind === 'tavern' || b.kind === 'inn') {
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 2;
    const top = P(sx, 2.9, b.z0 + 0.6);
    c.beginPath(); c.moveTo(top.x, top.y); c.lineTo(sign.x, top.y); c.stroke();
    c.fillStyle = b.kind === 'tavern' ? '#7a4a2a' : '#4a5a3a';
    const sw = Math.max(10, this.focal() / (b.z0 + 0.6) * 0.5);
    c.fillRect(sign.x - sw / 2, top.y + 2, sw, sw * 0.7);
  }
  const mid = P(sx, b.hgt * 0.5, (b.z0 + b.z1) / 2);
  const lab = P(sx - out * 0.6, Math.min(b.hgt + 0.6, 4.2), b.z0 + 0.8);
  this.hot.push({ kind: b.kind, label: names[b.kind], lx: lab.x, ly: lab.y, poly: [a0, a1, t1, t0, f1, f0], mid });
};
TownView.drawPerson = function (c, p) {
  const s = this.proj(p.x, 0, p.z);
  const sc = this.focal() / p.z / 52;
  const saved = Render.ctx; Render.ctx = c;
  try {
    c.save();
    if (p.face < 0) { c.translate(s.x, 0); c.scale(-1, 1); c.translate(-s.x, 0); }
    Render.drawFigure(s.x, s.y, figLook(p.c), sc, { bob: 0 });
    c.restore();
  } finally { Render.ctx = saved; }
  const top = s.y - 60 * sc;
  const sel = this.selected === p.c, hov = this.hover && this.hover.person === p.c;
  if (sel || hov) {
    c.strokeStyle = sel ? '#e6c06a' : 'rgba(230,192,106,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(s.x, s.y, 16 * sc, 5 * sc, 0, 0, Math.PI * 2); c.stroke();
    c.font = '13px Georgia, serif'; c.textAlign = 'center';
    const lab = `${p.c.name} · ${GD.RACES[p.c.race].name} · L${p.c.level}`;
    const tw = c.measureText(lab).width + 10;
    c.fillStyle = 'rgba(20,16,12,0.85)'; c.fillRect(s.x - tw / 2, top - 22, tw, 18);
    c.fillStyle = '#f2ead8'; c.fillText(lab, s.x, top - 9);
  }
  this.hot.push({ person: p.c, x0: s.x - 14 * sc, x1: s.x + 14 * sc, y0: top, y1: s.y + 4, z: p.z });
};

// ---------------------------------------------------------------- tapping
function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a.y > pt.y) !== (b.y > pt.y)) && (pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x)) inside = !inside;
  }
  return inside;
}
TownView.hit = function (e) {
  if (!this.hot) return null;
  const r = this.cv.getBoundingClientRect();
  const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
  // people first (nearest first), then buildings and labels
  const people = this.hot.filter((x) => x.person && pt.x >= x.x0 && pt.x <= x.x1 && pt.y >= x.y0 && pt.y <= x.y1).sort((a, b) => a.z - b.z);
  if (people.length) return people[0];
  for (const hs of this.hot) {
    if (!hs.kind) continue;
    if (Math.abs(pt.x - hs.lx) < 60 && Math.abs(pt.y - hs.ly + 5) < 16) return hs;
    if (inPoly(pt, hs.poly)) return hs;
  }
  return null;
};
TownView.click = function (e) {
  const hs = this.hit(e);
  if (!hs) return;
  if (hs.person) return this.select(hs.person);
  this.use(hs.kind);
};
TownView.use = function (kind) {
  if (kind === 'tavern') UI.showTavern(this.idx);
  if (kind === 'market') UI.showMarket();
  if (kind === 'inn') { if (G.house.gold >= 10) Game.inn(); else UI.toast('The inn costs 10g.'); }
  if (kind === 'hall') this.noticeBoard();
};
TownView.noticeBoard = function () {
  const { deeds, deedDone } = UI.townDeeds(this.tile);
  const q = G.world.doom.quest;
  UI.modal([
    h('p', { class: 'dim' }, `Notices are pinned three deep: tax rolls, a reward for a lost goat, a call for able hands.${deedDone ? ' Your House has already done its deed here this year.' : ''}`),
    h('h4', {}, 'Deeds for the Realm'), ...deeds,
    q ? h('div', { class: 'quest' }, h('b', {}, q.title), h('p', { class: 'small' }, q.desc)) : null,
  ], { title: `${this.town.name}: Notice Board` });
};

// ---------------------------------------------------------------- talking to people
TownView.greet = function () {
  const rep = reputationInfo();
  const E = G.world.era.type;
  const mood = E === 'war' ? 'Soldiers crowd the streets and shutters are half-closed.' : E === 'famine' ? 'The market stalls are thin and the faces thinner.' : E === 'golden' ? 'Music drifts from every window.' : 'The street hums with trade and gossip.';
  const known = G.house.culture && G.house.culture.formed ? ` People here hold House ${G.house.name} as ${rep.name.toLowerCase()}.` : '';
  this.setSay(`You walk into ${this.town.name}, a ${GD.TOWN_SIZES[this.town.size].toLowerCase()}. ${mood}${known} Tap a building or a person.`);
};
TownView.setSay = function (text, who) {
  this.say.replaceChildren(...[who ? portrait(who, 44) : null, h('div', {}, who ? h('b', {}, `${who.name}`, h('small', { class: 'dim' }, ` · ${UI.charLine(who)}`)) : null, h('p', {}, text))].filter(Boolean));
};
TownView.select = function (c) {
  this.selected = c;
  this.setSay(this.line(c), c);
  this.renderButtons();
};
TownView.renderButtons = function () {
  const c = this.selected;
  const mc = ch(G.mcId);
  const b = (label, fn, opts = {}) => h('button', { class: 'camp-btn' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, title: opts.title, onclick: fn }, label);
  if (c) {
    const cost = hireCost(c), req = recruitPrestigeReq(c);
    const canRomance = isAdult(c) && mc && canTakeSpouse(mc) && canTakeSpouse(c);
    const kids = !isAdult(c);
    this.btns.replaceChildren(...[
      !kids ? b(`Recruit (${cost}g)`, () => { Game.recruit(c); this.selected = null; this.setSay(`${c.name} joins you.`, c); this.sync(); }, { disabled: G.house.gold < cost || G.house.prestige < req, title: req ? `needs ${req} prestige` : '' }) : null,
      canRomance ? b('Court (20g)', () => { Game.court(c); this.setSay(attraction(c, mc) === 0 ? `${c.name} smiles politely. There is nothing more there.` : bond(c, mc) >= 70 ? `${c.name} lingers close. They would say yes, if you asked.` : `${c.name} enjoys your company.`, c); this.sync(); }, { disabled: G.house.gold < 20 }) : null,
      canRomance && bond(c, mc) >= 70 ? b(isWidowed(mc) ? 'Propose Remarriage' : 'Propose', () => { Game.propose(c); this.selected = null; this.sync(); }, { cls: 'leave' }) : null,
      b('Ask for news', () => this.askNews(c)),
      !c.lineageKnown ? b(`Research lineage (${Math.max(10, 40 - G.house.up.library * 10)}g)`, () => { Game.research(c); this.setSay(`${c.name}'s past: ${GD.SECRETS[c.secret || 'common'].name.toLowerCase()}.`, c); this.sync(); }, { disabled: G.house.gold < Math.max(10, 40 - G.house.up.library * 10) }) : null,
      b('Details', () => UI.showChar(c)),
      b('Back', () => { this.selected = null; this.greet(); this.renderButtons(); }),
    ].filter(Boolean));
    return;
  }
  this.btns.replaceChildren(
    b('Tavern', () => this.use('tavern')),
    b('Market', () => this.use('market')),
    b('Inn (10g)', () => this.use('inn'), { disabled: G.house.gold < 10 }),
    b('Notice Board', () => this.use('hall')),
    b('Buy rumors (15g)', () => this.buyRumors(), { disabled: G.house.gold < 15, title: 'stand a round of drinks' }),
    mc && canTakeSpouse(mc) ? b(isWidowed(mc) ? 'Seek a new spouse' : 'Seek match', () => { Game.seekNewSpouse({ townIdx: this.idx }); }, { title: 'compatible adults in town' }) : null,
    b('Leave town', () => this.close(), { cls: 'leave' }),
  );
};
// what a townsperson says depends on who they are and how they see the House
TownView.line = function (c) {
  const mc = ch(G.mcId);
  const rep = reputation();
  const lines = [];
  const parentComp = c.parents.map(ch).find((p) => p && (p.status === 'party' || p.status === 'household' || p.servedHouse || p.house === G.house.name));
  if (parentComp) lines.push(`${parentComp.name} is my ${parentComp.gender === 'woman' ? 'mother' : 'father'}. ${parentComp.alive ? 'They still talk about riding with your House.' : 'They died in your House\'s service, you know.'}`);
  if (c.grudge) lines.push(`I remember House ${G.house.name}. I remember all of it.`);
  if (c.corruption > 70) lines.push('What do you want? Make it quick.', 'Highborn folk always want something.');
  if (bond(c, mc) > 30) lines.push(`${mc.name}! It is good to see you again.`);
  if (rep > 0.4) lines.push(`An honor. Everyone knows the name ${G.house.name}.`);
  if (rep < -0.4) lines.push(`So you are of House ${G.house.name}. I have heard things.`, 'Your kind is not much loved here.');
  if (G.house.scandal > 0.2) lines.push('Is it true, what they say about your family? About who marries whom?');
  if (c.birth === 'bastard' && !c.legit) lines.push('My father never gave me his name. I made my own.');
  if (birthKey(c) === 'orphan') lines.push('I never knew my parents. The road raised me.');
  if (c.birth === 'highborn') lines.push(`My family is old, older than yours perhaps. No offense meant.`);
  if (c.trait === 'brave') lines.push('If there is fighting to be done, I am your blade.');
  if (c.trait === 'ambitious') lines.push('A small town for a person with big plans.');
  if (c.trait === 'wise') lines.push(`${doomYearsLeft()} years, the seers say. I believe them.`);
  if (c.condition === 'lame') lines.push('Do not let the cane fool you.');
  if (!isAdult(c)) lines.push('Are you a real knight? Can I see your sword?', 'Mama says not to talk to strangers.');
  if (G.world.era.type === 'war') lines.push('They took my brother for the muster. Have you seen the front?');
  if (G.world.era.type === 'famine') lines.push('Bread costs a week\'s wage now. A week!');
  if (this.town.size >= 4) lines.push(`${this.town.name} grows every year. Too fast, if you ask me.`);
  if (this.town.size <= 1) lines.push('Half the houses here stand empty now.');
  if (attraction(c, mc) > 1.2 && canTakeSpouse(c) && canTakeSpouse(mc) && isAdult(c)) {
    lines.push(isWidowed(mc) ? `I heard you were alone again, ${mc.name}. If you ever want company…` : `I hoped I would see you today, ${mc.name}.`);
  }
  if (!lines.length) lines.push('Good day to you.', 'Fine weather, or near enough.', `Welcome to ${this.town.name}.`);
  return R.pick(lines);
};
TownView.askNews = function (c) {
  const mc = ch(G.mcId);
  c.orientKnown = true;
  if (c.newsYear === year()) return this.setSay('I have told you all I know this year.', c);
  if (bond(c, mc) < -10 || c.corruption > 80) return this.setSay('Why would I tell you anything?', c);
  c.newsYear = year();
  addBond(c, mc, 2);
  const r = this.rumor(true);
  this.setSay(r, c);
};
TownView.buyRumors = function () {
  G.house.gold -= 15;
  advanceDays(2);
  const a = this.rumor(true), b = this.rumor(true);
  this.setSay(`You stand a round in the common room. ${a}${b !== a ? ' ' + b : ''}`);
  UI.refresh();
};

// ---------------------------------------------------------------- intel: rumors that change what you know
TownView.rumor = function (apply) {
  const opts = [];
  const here = this.town;
  const dist = (o) => Math.abs(o.x - here.x) + Math.abs(o.y - here.y);
  const dir = (o) => { const dx = o.x - here.x, dy = o.y - here.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };
  // hidden or growing bandit camps
  for (const cp of campsList()) {
    if (dist(cp) > 14) continue;
    opts.push({ w: cp.str < 2 ? 3 : 1.5, text: cp.str < 2 ? `Traders whisper of ${cp.name} gathering in the ${GD.BIOMES[tileAt(cp.x, cp.y).type].name.toLowerCase()} to the ${dir(cp)}. It is marked on your map now.` : `${cp.name[0].toUpperCase() + cp.name.slice(1)} to the ${dir(cp)} are about ${Math.round(cp.str * 4)} strong, and growing.`,
      fx: () => { const t = tileAt(cp.x, cp.y); if (t && !t.feature) { t.feature = 'camp'; t.campId = cp.id; } } });
  }
  // caves and mines nearby
  opts.push({ w: 1.5, text: 'A shepherd swears there is a cave in the hills nearby, full of old bones and older gold. You mark it.', fx: () => Events.revealNearby(tileAt(here.x, here.y)) });
  // the prophecy
  const q = G.world.doom.quest;
  if (q && q.x != null) opts.push({ w: 2, text: `About the ${q.title.toLowerCase()}: folk say ${q.place} lies to the ${dir(q)}, ${dist(q) < 8 ? 'not far' : 'many days away'}.` });
  opts.push({ w: 0.8, text: `The old songs say ${GD.VILLAIN.name} wakes in ${G.world.doom.year}. ${G.world.doom.wards ? `${G.world.doom.wards} wards stand against it, and people take heart.` : 'No one has raised a single ward.'}` });
  // rivals
  for (const rv of Object.values(G.chars).filter((x) => x.alive && x.status === 'rival')) {
    opts.push({ w: 2, text: `${rv.name}, who hates your House, was seen on the roads. They say ${rv.name} is level ${rv.level} now, and hiring blades.` });
  }
  // hidden lineages
  const secret = Object.values(G.chars).find((x) => x.alive && x.status === 'npc' && x.town === this.idx && !x.lineageKnown && x.secret && x.secret !== 'common');
  if (secret) opts.push({ w: 2, text: `They say ${secret.name} is not what they seem: ${GD.SECRETS[secret.secret].name.toLowerCase()}.`, fx: () => { secret.lineageKnown = true; const s = GD.SECRETS[secret.secret]; for (const k in s.bonus) secret.bonus[k] += s.bonus[k]; secret.corruption += s.corruption; } });
  // who has an eye on the head of House (including remarriage prospects when widowed)
  const mc = ch(G.mcId);
  if (mc && canTakeSpouse(mc)) {
    const admirer = Object.values(G.chars).find((x) => x.alive && x.status === 'npc' && x.town === this.idx && isAdult(x) && canTakeSpouse(x) && attraction(x, mc) > 1);
    if (admirer) {
      const tip = isWidowed(mc)
        ? `People say ${admirer.name} would make a fine match for a widowed head of House — they've been asking after you.`
        : `Between you and me, ${admirer.name} has been asking about you.`;
      opts.push({ w: isWidowed(mc) ? 3 : 2, text: tip, fx: () => { admirer.orientKnown = true; addBond(admirer, mc, isWidowed(mc) ? 8 : 5); } });
    }
  }
  // technology to come
  const next = (G.world.tech || []).find((x) => !x.got && x.year && x.year - year() < 40);
  if (next) { const d = GD.TECH.find((x) => x.key === next.key); opts.push({ w: 1.5, text: `Craftsfolk talk of something new: ${d.name.toLowerCase()}. Within a generation, they say.` }); }
  // the towns themselves
  const towns = liveTowns().filter((x) => x !== here);
  if (towns.length) {
    const tt = R.pick(towns);
    opts.push({ w: 1, text: `${tt.name} ${tt.growth > 0.3 ? 'is booming; there is work there for anyone' : tt.growth < -0.3 ? 'is in a bad way; people are leaving' : 'carries on as ever'}.` });
  }
  opts.push({ w: 0.6, text: `The people of this era value ${Object.entries(G.world.era.values || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2).map(([k, v]) => (v > 0 ? GD.CULTURE_AXES[k].pos : GD.CULTURE_AXES[k].neg).toLowerCase()).join(' and ')}.` });
  const pick = R.weighted(Object.fromEntries(opts.map((o, i) => [i, o.w])));
  const o = opts[pick];
  if (apply && o.fx) o.fx();
  Log.add(`Rumor in ${here.name}: ${o.text}`, 'dim');
  return o.text;
};
