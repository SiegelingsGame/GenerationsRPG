// 2.5D isometric renderer for the overworld and battles (Canvas 2D, procedural art).
'use strict';

const Render = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  cam: { x: 0, y: 0 }, hover: null, t: 0,
  move: null, // {from:{x,y}, to:{x,y}, t0, dur}
};

const TILE = {
  water:    { top: '#3b78a8', side: '#285a80' },
  sand:     { top: '#d9c48a', side: '#a8925e' },
  grass:    { top: '#6fa34a', side: '#4d7a34' },
  forest:   { top: '#4f8a3c', side: '#376128' },
  hills:    { top: '#8f9a5a', side: '#6b7342' },
  mountain: { top: '#8c8a86', side: '#66645f' },
};
const HSTEP = 14;

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + ((1 << 24) | ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)).toString(16).slice(1);
}
function eraTint(hex) {
  // blend a colour toward the era's light
  const [tr, tg, tb, a] = era().tint;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (G.world.era.type === 'famine') { const l = (r + g + b) / 3; r = r * 0.6 + l * 0.4; g = g * 0.6 + l * 0.4; b = b * 0.6 + l * 0.4; }
  r = r * (1 - a) + tr * a; g = g * (1 - a) + tg * a; b = b * (1 - a) + tb * a;
  return '#' + ((1 << 24) | ((r | 0) << 16) | ((g | 0) << 8) | (b | 0)).toString(16).slice(1);
}

Render.init = function (canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  const resize = () => {
    this.dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    canvas.width = Math.round(r.width * this.dpr);
    canvas.height = Math.round(r.height * this.dpr);
  };
  window.addEventListener('resize', resize);
  resize();
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  canvas.addEventListener('mouseleave', () => { this.mouse = null; });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (Battle.active) { const u = this.pickUnit(p); if (u) UI.clickUnit(u); }
    else if (G && G.mode === 'world') { const t = this.pickTile(p); if (t) Game.clickTile(t); }
  });
  const loop = (ts) => { this.t = ts; try { this.frame(); } catch (err) { console.error(err); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};

Render.frame = function () {
  const c = this.ctx;
  c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  c.clearRect(0, 0, this.w, this.h);
  if (!G || !G.world || !G.world.map) { this.drawTitleBg(); return; }
  if (Battle.active) this.drawBattle();
  else this.drawWorld();
};

Render.drawTitleBg = function () {
  const c = this.ctx;
  const g = c.createLinearGradient(0, 0, 0, this.h);
  g.addColorStop(0, '#1b1a2e'); g.addColorStop(1, '#3a2a2a');
  c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
};

// ---------------------------------------------------------------- world
const TW = 64, TH = 32;
Render.iso = function (x, y, h) {
  return { x: (x - y) * TW / 2 + this.cam.x, y: (x + y) * TH / 2 - h * HSTEP + this.cam.y };
};
Render.partyWorldPos = function () {
  if (this.move) {
    const k = clamp((this.t - this.move.t0) / this.move.dur, 0, 1);
    const a = tileAt(this.move.from.x, this.move.from.y), b = tileAt(this.move.to.x, this.move.to.y);
    const hop = Math.sin(k * Math.PI) * 0.5;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, h: a.h + (b.h - a.h) * k + hop, k };
  }
  const t = tileAt(G.pos.x, G.pos.y);
  return { x: t.x, y: t.y, h: t.h, k: 1 };
};

Render.drawWorld = function () {
  const c = this.ctx;
  const map = G.world.map;
  // sky
  const sky = c.createLinearGradient(0, 0, 0, this.h);
  sky.addColorStop(0, eraTint('#253a55')); sky.addColorStop(1, eraTint('#0f1a26'));
  c.fillStyle = sky; c.fillRect(0, 0, this.w, this.h);

  // camera follows party smoothly
  const pp = this.partyWorldPos();
  const tx = this.w / 2 - (pp.x - pp.y) * TW / 2;
  const ty = this.h / 2 - (pp.x + pp.y) * TH / 2 + pp.h * HSTEP;
  this.cam.x += (tx - this.cam.x) * 0.12;
  this.cam.y += (ty - this.cam.y) * 0.12;
  if (!this.camInit) { this.cam.x = tx; this.cam.y = ty; this.camInit = true; }

  this.hover = this.mouse && !this.move ? this.pickTile(this.mouse) : null;
  const pathSet = new Set((this.hoverPath || []).map((t) => t.y * map.W + t.x));
  if (this.hover && this.hover !== this.lastHover) {
    this.lastHover = this.hover;
    this.hoverPath = findPath(tileAt(G.pos.x, G.pos.y), this.hover) || [];
  }
  if (!this.hover) this.hoverPath = [];

  const partyTileOrder = Math.round(pp.x) + Math.round(pp.y);
  let partyDrawn = false;
  for (let s = 0; s <= map.W + map.H - 2; s++) {
    for (let x = 0; x < map.W; x++) {
      const y = s - x;
      if (y < 0 || y >= map.H) continue;
      const t = tileAt(x, y);
      this.drawTile(t, pathSet.has(y * map.W + x));
      this.drawFeature(t);
    }
    if (s === partyTileOrder || (s === map.W + map.H - 2 && !partyDrawn)) {
      if (!partyDrawn) { this.drawParty(pp); partyDrawn = true; }
    }
  }
  // labels
  c.font = '600 12px Georgia, serif';
  c.textAlign = 'center';
  for (const t of map.tiles) {
    if (!t.feature) continue;
    const p = this.iso(t.x, t.y, t.h);
    const label = t.feature === 'town' ? G.world.towns[t.townIdx].name : t.feature === 'estate' ? `House ${G.house.name}` : (t.cleared ? 'Ruins (cleared)' : 'Ruins');
    c.fillStyle = 'rgba(0,0,0,0.55)';
    const w = c.measureText(label).width + 10;
    c.fillRect(p.x - w / 2, p.y - 70, w, 17);
    c.fillStyle = t.feature === 'estate' ? '#ffd98a' : '#f2ead8';
    c.fillText(label, p.x, p.y - 57);
  }
  // vignette
  const v = c.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.35, this.w / 2, this.h / 2, this.h * 0.9);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = v; c.fillRect(0, 0, this.w, this.h);
  if (G.world.era.type === 'war') this.drawEmbers();
};

Render.drawEmbers = function () {
  const c = this.ctx;
  for (let i = 0; i < 30; i++) {
    const s = (i * 9301 + 49297) % 233280 / 233280;
    const x = (s * this.w + this.t * 0.02 * (1 + i % 3)) % this.w;
    const y = this.h - ((this.t * 0.03 * (1 + (i % 5) * 0.3) + i * 97) % this.h);
    c.fillStyle = `rgba(255,${120 + (i % 4) * 30},60,${0.3 + (i % 3) * 0.15})`;
    c.fillRect(x, y, 2, 2);
  }
};

Render.drawTile = function (t, onPath) {
  const c = this.ctx;
  const p = this.iso(t.x, t.y, t.h);
  const col = TILE[t.type];
  let top = eraTint(col.top);
  if (t.type === 'water') {
    const w = Math.sin(this.t / 600 + t.x * 0.8 + t.y * 0.5) * 0.06;
    top = shade(top, w);
  }
  const depth = (t.h + 1) * HSTEP;
  // left side
  c.fillStyle = shade(eraTint(col.side), -0.1);
  c.beginPath();
  c.moveTo(p.x - TW / 2, p.y); c.lineTo(p.x, p.y + TH / 2); c.lineTo(p.x, p.y + TH / 2 + depth); c.lineTo(p.x - TW / 2, p.y + depth);
  c.closePath(); c.fill();
  // right side
  c.fillStyle = shade(eraTint(col.side), -0.3);
  c.beginPath();
  c.moveTo(p.x + TW / 2, p.y); c.lineTo(p.x, p.y + TH / 2); c.lineTo(p.x, p.y + TH / 2 + depth); c.lineTo(p.x + TW / 2, p.y + depth);
  c.closePath(); c.fill();
  // top
  c.fillStyle = top;
  c.beginPath();
  c.moveTo(p.x, p.y - TH / 2); c.lineTo(p.x + TW / 2, p.y); c.lineTo(p.x, p.y + TH / 2); c.lineTo(p.x - TW / 2, p.y);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1; c.stroke();
  if (onPath || this.hover === t) {
    c.fillStyle = this.hover === t ? (passable(t) ? 'rgba(255,240,180,0.35)' : 'rgba(255,80,80,0.3)') : 'rgba(255,240,180,0.15)';
    c.fill();
  }
  // texture specks
  if (t.type === 'grass' || t.type === 'hills') {
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 4; i++) {
      const sx = ((t.x * 31 + t.y * 17 + i * 13) % 40) - 20, sy = ((t.x * 7 + t.y * 29 + i * 11) % 14) - 7;
      c.fillRect(p.x + sx, p.y + sy * 0.8, 2, 1);
    }
  }
};

Render.drawFeature = function (t) {
  const c = this.ctx;
  const p = this.iso(t.x, t.y, t.h);
  if (t.type === 'forest' && !t.feature) {
    const spots = [[-12, -2], [10, -4], [0, 6], [-2, -9]];
    for (let i = 0; i < 3 + ((t.x + t.y) % 2); i++) {
      const [ox, oy] = spots[i];
      this.drawTree(p.x + ox, p.y + oy, 0.8 + ((t.x * 3 + i) % 3) * 0.12);
    }
  }
  if (t.type === 'mountain' && !t.feature) {
    c.fillStyle = eraTint('#9d9a94');
    c.beginPath(); c.moveTo(p.x - 22, p.y + 6); c.lineTo(p.x - 2, p.y - 34); c.lineTo(p.x + 22, p.y + 6); c.closePath(); c.fill();
    c.fillStyle = eraTint('#6f6c67');
    c.beginPath(); c.moveTo(p.x - 2, p.y - 34); c.lineTo(p.x + 22, p.y + 6); c.lineTo(p.x + 4, p.y + 8); c.closePath(); c.fill();
    c.fillStyle = '#f4f4f4';
    c.beginPath(); c.moveTo(p.x - 9, p.y - 20); c.lineTo(p.x - 2, p.y - 34); c.lineTo(p.x + 6, p.y - 21); c.lineTo(p.x - 2, p.y - 24); c.closePath(); c.fill();
  }
  if (t.type === 'hills' && !t.feature) {
    c.fillStyle = eraTint('#7d8a4c');
    c.beginPath(); c.ellipse(p.x - 6, p.y + 2, 16, 8, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.ellipse(p.x + 10, p.y + 5, 11, 6, 0, Math.PI, 0); c.fill();
  }
  if (t.feature === 'town') this.drawTown(p);
  if (t.feature === 'estate') this.drawEstate(p, G.house.tier);
  if (t.feature === 'ruins') this.drawRuins(p, t.cleared);
};

Render.drawTree = function (x, y, s) {
  const c = this.ctx;
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath(); c.ellipse(x, y + 2, 7 * s, 3 * s, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a3d24'; c.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 8 * s);
  const leaf = G.world.era.type === 'famine' ? '#6b6a3c' : '#2f6b2a';
  c.fillStyle = eraTint(leaf);
  c.beginPath(); c.moveTo(x - 9 * s, y - 4 * s); c.lineTo(x, y - 26 * s); c.lineTo(x + 9 * s, y - 4 * s); c.closePath(); c.fill();
  c.fillStyle = eraTint(shade(leaf, 0.15));
  c.beginPath(); c.moveTo(x - 9 * s, y - 4 * s); c.lineTo(x, y - 26 * s); c.lineTo(x - 1 * s, y - 4 * s); c.closePath(); c.fill();
};

Render.drawBox = function (x, y, w, d, h, wall, roof, roofH = 0) {
  // isometric box with footprint w (x-axis) by d (y-axis), height h; optional pitched roof
  const c = this.ctx;
  const P = (lx, ly) => ({ x: x + (lx - ly) * TW / 4, y: y + (lx + ly) * TH / 4 });
  const a = P(-w / 2, -d / 2), b = P(w / 2, -d / 2), cc = P(w / 2, d / 2), dd = P(-w / 2, d / 2);
  // left wall (dd-cc)
  c.fillStyle = shade(wall, -0.05);
  c.beginPath(); c.moveTo(dd.x, dd.y); c.lineTo(cc.x, cc.y); c.lineTo(cc.x, cc.y - h); c.lineTo(dd.x, dd.y - h); c.closePath(); c.fill();
  // right wall (cc-b)
  c.fillStyle = shade(wall, -0.3);
  c.beginPath(); c.moveTo(cc.x, cc.y); c.lineTo(b.x, b.y); c.lineTo(b.x, b.y - h); c.lineTo(cc.x, cc.y - h); c.closePath(); c.fill();
  if (roofH > 0) {
    // ridge along x axis
    const r1 = P(-w / 2, 0), r2 = P(w / 2, 0);
    c.fillStyle = shade(roof, -0.1);
    c.beginPath(); c.moveTo(dd.x, dd.y - h); c.lineTo(cc.x, cc.y - h); c.lineTo(r2.x, r2.y - h - roofH); c.lineTo(r1.x, r1.y - h - roofH); c.closePath(); c.fill();
    c.fillStyle = shade(roof, -0.35);
    c.beginPath(); c.moveTo(cc.x, cc.y - h); c.lineTo(b.x, b.y - h); c.lineTo(r2.x, r2.y - h - roofH); c.closePath(); c.fill();
  } else {
    c.fillStyle = roof;
    c.beginPath(); c.moveTo(a.x, a.y - h); c.lineTo(b.x, b.y - h); c.lineTo(cc.x, cc.y - h); c.lineTo(dd.x, dd.y - h); c.closePath(); c.fill();
  }
  return { a, b, c: cc, d: dd };
};

Render.drawTown = function (p) {
  this.drawBox(p.x - 12, p.y - 2, 0.7, 0.6, 12, eraTint('#c9b08a'), eraTint('#8c3b2a'), 9);
  this.drawBox(p.x + 12, p.y - 4, 0.6, 0.6, 10, eraTint('#d4c3a0'), eraTint('#5b4a8a'), 8);
  this.drawBox(p.x, p.y + 6, 0.8, 0.6, 14, eraTint('#bfa57d'), eraTint('#7a3022'), 10);
  // smoke
  const c = this.ctx;
  for (let i = 0; i < 3; i++) {
    const k = ((this.t / 1500) + i / 3) % 1;
    c.fillStyle = `rgba(220,220,220,${0.35 * (1 - k)})`;
    c.beginPath(); c.arc(p.x + 4 + k * 6, p.y - 22 - k * 22, 3 + k * 4, 0, Math.PI * 2); c.fill();
  }
};

Render.drawEstate = function (p, tier) {
  const col = G.house.color;
  const c = this.ctx;
  if (tier === 0) {
    this.drawBox(p.x, p.y + 2, 0.6, 0.5, 9, eraTint('#8a6a45'), eraTint('#b49a52'), 9);
  } else if (tier === 1) {
    this.drawBox(p.x - 4, p.y, 0.9, 0.6, 12, eraTint('#c8b08c'), eraTint('#7a4a2a'), 10);
    this.drawBox(p.x + 16, p.y + 6, 0.4, 0.4, 7, eraTint('#8a6a45'), eraTint('#8a6a45'), 5);
  } else if (tier === 2) {
    this.drawBox(p.x, p.y, 1.1, 0.8, 18, eraTint('#d8cbb0'), eraTint('#4a5a7a'), 12);
    this.drawBox(p.x + 18, p.y + 8, 0.4, 0.4, 24, eraTint('#cfc2a6'), eraTint('#4a5a7a'), 10);
  } else {
    const wall = eraTint('#a9a39a');
    if (tier >= 4) {
      this.drawBox(p.x - 20, p.y - 2, 0.35, 0.35, 34, wall, eraTint('#7c766d'));
      this.drawBox(p.x + 20, p.y - 2, 0.35, 0.35, 34, wall, eraTint('#7c766d'));
    }
    this.drawBox(p.x, p.y + 4, 1.0, 1.0, 30, wall, eraTint('#8c867d'));
    this.drawBox(p.x, p.y - 6, 0.45, 0.45, 48, eraTint('#b8b2a8'), eraTint('#8c867d'));
  }
  // banner
  const bx = p.x + 6, by = p.y - 24 - tier * 8;
  c.strokeStyle = '#3a2a1a'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(bx, by + 22); c.lineTo(bx, by - 8); c.stroke();
  const wave = Math.sin(this.t / 300) * 2;
  c.fillStyle = col;
  c.beginPath(); c.moveTo(bx, by - 8); c.lineTo(bx + 14, by - 6 + wave); c.lineTo(bx, by + 2); c.closePath(); c.fill();
};

Render.drawRuins = function (p, cleared) {
  const c = this.ctx;
  const stone = eraTint(cleared ? '#9d9a8c' : '#6f6a78');
  this.drawBox(p.x - 12, p.y, 0.25, 0.25, 22, stone, stone);
  this.drawBox(p.x + 12, p.y, 0.25, 0.25, 16, stone, stone);
  this.drawBox(p.x, p.y + 8, 0.6, 0.3, 6, stone, stone);
  c.fillStyle = stone;
  c.fillRect(p.x - 14, p.y - 24, 28, 5);
  if (!cleared) {
    const pulse = 0.4 + Math.sin(this.t / 400) * 0.2;
    c.fillStyle = `rgba(160,110,255,${pulse})`;
    c.beginPath(); c.ellipse(p.x, p.y - 8, 6, 9, 0, 0, Math.PI * 2); c.fill();
  }
};

Render.drawParty = function (pp) {
  const p = this.iso(pp.x, pp.y, pp.h);
  const mc = ch(G.mcId);
  if (!mc) return;
  const party = G.party.map(ch).filter(Boolean);
  // followers behind leader
  party.slice(1).forEach((c, i) => {
    this.drawFigure(p.x - 10 - i * 7, p.y + 2 - i * 3, figLook(c), 0.55, { bob: this.move ? Math.sin(this.t / 90 + i) : 0 });
  });
  this.drawFigure(p.x + 4, p.y + 6, figLook(mc), 0.62, { bob: this.move ? Math.sin(this.t / 90) : 0, banner: G.house.color });
};

function figLook(c) {
  return { skin: GD.RACES[c.race].skin, hair: c.hair, tunic: c.tunic, stage: stageKey(c), race: c.race, evil: c.evil, house: c.house === G.house.name };
}

// ---------------------------------------------------------------- figures
Render.drawFigure = function (x, y, look, scale = 1, o = {}) {
  const c = this.ctx;
  const r = GD.RACES[look.race] || GD.RACES.human;
  const st = look.stage || 'prime';
  let s = scale * r.height * (st === 'child' ? 0.6 : st === 'youth' ? 0.92 : 1);
  const wd = r.width * (st === 'child' ? 0.85 : 1);
  const stoop = st === 'elder' ? 3 : st === 'venerable' ? 6 : 0;
  const hair = (st === 'elder' || st === 'venerable') ? (st === 'venerable' ? '#e8e8e8' : '#a8a8a8') : (st === 'seasoned' ? shade(look.hair, 0.25) : look.hair);
  const bob = (o.bob || 0) * 1.5;
  const fl = o.flash > 0;
  y += o.dy || 0; x += o.dx || 0;
  if (o.dead) {
    c.save(); c.translate(x, y); c.rotate(-Math.PI / 2.3); c.translate(-x, -y + 6);
  }
  // shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(x, y, 11 * s * wd, 4 * s, 0, 0, Math.PI * 2); c.fill();
  // legs
  c.fillStyle = fl ? '#fff' : '#3b2f2a';
  c.fillRect(x - 5 * s * wd, y - 14 * s + Math.max(0, bob), 4 * s * wd, 14 * s);
  c.fillRect(x + 1 * s * wd, y - 14 * s + Math.max(0, -bob), 4 * s * wd, 14 * s);
  // body
  const by = y - 14 * s;
  c.fillStyle = fl ? '#fff' : (look.evil ? '#2a1420' : look.tunic);
  c.beginPath();
  c.moveTo(x - 8 * s * wd, by); c.lineTo(x + 8 * s * wd, by);
  c.lineTo(x + 7 * s * wd + stoop * 0.5, by - 20 * s); c.lineTo(x - 7 * s * wd + stoop * 0.5, by - 20 * s);
  c.closePath(); c.fill();
  // belt / house sash
  c.fillStyle = look.house ? G.house.color : '#4a3a2a';
  c.fillRect(x - 8 * s * wd, by - 6 * s, 16 * s * wd, 3 * s);
  // arms
  c.fillStyle = fl ? '#fff' : shade(look.evil ? '#2a1420' : look.tunic, -0.2);
  c.fillRect(x - 11 * s * wd, by - 19 * s, 4 * s, 14 * s);
  c.fillRect(x + 7 * s * wd + stoop * 0.5, by - 19 * s, 4 * s, 14 * s);
  // weapon
  if (o.weapon) {
    c.strokeStyle = o.weapon === 'staff' ? '#7a5a3a' : '#cfd6dc'; c.lineWidth = 2.2 * s;
    c.beginPath();
    c.moveTo(x + 10 * s * wd, by - 6 * s);
    c.lineTo(x + 18 * s * wd, by - (o.weapon === 'staff' ? 34 : 26) * s);
    c.stroke();
    if (o.weapon === 'staff') { c.fillStyle = '#8fd3ff'; c.beginPath(); c.arc(x + 18 * s * wd, by - 35 * s, 3 * s, 0, Math.PI * 2); c.fill(); }
    if (o.weapon === 'shield') { c.fillStyle = look.house ? G.house.color : '#6a6a6a'; c.beginPath(); c.ellipse(x - 12 * s * wd, by - 10 * s, 5 * s, 8 * s, 0, 0, Math.PI * 2); c.fill(); }
  }
  // head
  const hx = x + stoop, hy = by - 26 * s;
  c.fillStyle = fl ? '#fff' : (look.skin || '#e2b48c');
  c.beginPath(); c.arc(hx, hy, 6.5 * s, 0, Math.PI * 2); c.fill();
  // ears (elf)
  if (look.race === 'elf') {
    c.beginPath(); c.moveTo(hx - 6 * s, hy); c.lineTo(hx - 11 * s, hy - 5 * s); c.lineTo(hx - 5 * s, hy - 2 * s); c.fill();
    c.beginPath(); c.moveTo(hx + 6 * s, hy); c.lineTo(hx + 11 * s, hy - 5 * s); c.lineTo(hx + 5 * s, hy - 2 * s); c.fill();
  }
  // hair
  c.fillStyle = hair;
  c.beginPath(); c.arc(hx, hy - 1.5 * s, 6.8 * s, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  if (st === 'venerable') { c.fillStyle = look.skin; c.beginPath(); c.arc(hx, hy - 4 * s, 3 * s, Math.PI, 0); c.fill(); }
  // beard (dwarf, or older human men-ish look as random flourish)
  if (look.race === 'dwarf' && st !== 'child') {
    c.fillStyle = hair;
    c.beginPath(); c.moveTo(hx - 6 * s, hy + 1 * s); c.lineTo(hx + 6 * s, hy + 1 * s); c.lineTo(hx, hy + 13 * s); c.closePath(); c.fill();
  }
  if (look.race === 'orc') {
    c.fillStyle = '#f2ecd8';
    c.fillRect(hx - 3 * s, hy + 2 * s, 1.5 * s, 3 * s); c.fillRect(hx + 1.5 * s, hy + 2 * s, 1.5 * s, 3 * s);
  }
  // eyes
  c.fillStyle = look.evil ? '#ff3b3b' : '#1a1a1a';
  c.fillRect(hx + 1.5 * s, hy - 1 * s, 1.6 * s, 1.6 * s);
  c.fillRect(hx - 3 * s, hy - 1 * s, 1.6 * s, 1.6 * s);
  if (o.banner) {
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 12 * s, y - 2); c.lineTo(x - 12 * s, y - 62 * s); c.stroke();
    c.fillStyle = o.banner;
    const w = Math.sin(this.t / 250) * 2;
    c.beginPath(); c.moveTo(x - 12 * s, y - 62 * s); c.lineTo(x + 2 * s, y - 58 * s + w); c.lineTo(x - 12 * s, y - 50 * s); c.closePath(); c.fill();
  }
  if (o.dead) c.restore();
};

Render.drawBeast = function (x, y, look, scale, o = {}) {
  const c = this.ctx;
  const s = scale;
  const fl = o.flash > 0;
  y += o.dy || 0; x += o.dx || 0;
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath(); c.ellipse(x, y, 18 * s, 5 * s, 0, 0, Math.PI * 2); c.fill();
  if (o.dead) { c.globalAlpha = 0.5; }
  const col = fl ? '#fff' : look.color;
  c.fillStyle = shade(col, -0.2);
  for (const lx of [-12, -6, 6, 12]) c.fillRect(x + lx * s, y - 10 * s, 3 * s, 10 * s);
  c.fillStyle = col;
  c.beginPath(); c.ellipse(x, y - 15 * s, 17 * s, 8 * s, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x - 17 * s, y - 19 * s, 7 * s, 6 * s, -0.3, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x - 24 * s, y - 18 * s); c.lineTo(x - 30 * s, y - 15 * s); c.lineTo(x - 22 * s, y - 14 * s); c.fill();
  c.fillStyle = '#ffdd55'; c.fillRect(x - 20 * s, y - 21 * s, 2 * s, 2 * s);
  c.globalAlpha = 1;
};

// ---------------------------------------------------------------- battle
const BTW = 110, BTH = 55;
Render.biso = function (gx, gy) {
  const ox = this.w / 2 - (3.5 - 2.5) * BTW / 2;
  const oy = this.h / 2 - (3.5 + 2.5) * BTH / 2 + 30;
  return { x: (gx - gy) * BTW / 2 + ox, y: (gx + gy) * BTH / 2 + oy };
};
Render.unitScreen = function (u) {
  const p = this.biso(u.gx, u.gy);
  let dx = 0, dy = 0;
  if (u.anim && u.anim.type === 'lunge') {
    const k = (this.t - u.anim.t0) / 380;
    if (k >= 0 && k <= 1) {
      const t = Battle.find(u.anim.to);
      if (t) { const tp = this.biso(t.gx, t.gy); const f = Math.sin(k * Math.PI) * 0.45; dx = (tp.x - p.x) * f; dy = (tp.y - p.y) * f; }
    } else if (k > 1) u.anim = null;
  }
  if (u.anim && u.anim.type === 'cast') {
    const k = (this.t - u.anim.t0) / 500;
    if (k <= 1) dy = -Math.sin(k * Math.PI) * 10; else u.anim = null;
  }
  return { x: p.x + dx, y: p.y + dy };
};

Render.drawBattle = function () {
  const c = this.ctx;
  const g = c.createLinearGradient(0, 0, 0, this.h);
  g.addColorStop(0, eraTint('#1a2433')); g.addColorStop(1, eraTint('#2b2420'));
  c.fillStyle = g; c.fillRect(0, 0, this.w, this.h);
  const ruins = Battle.kind === 'dungeon';
  // arena tiles
  for (let s = 0; s <= 7 + 5 - 2; s++) for (let gx = 0; gx < 7; gx++) {
    const gy = s - gx;
    if (gy < 0 || gy >= 5) continue;
    const p = this.biso(gx + 0.5, gy + 0.5);
    const base = ruins ? '#5a5566' : ((gx + gy) % 2 ? '#6e8f4a' : '#678a45');
    c.fillStyle = eraTint(base);
    c.beginPath(); c.moveTo(p.x, p.y - BTH / 2); c.lineTo(p.x + BTW / 2, p.y); c.lineTo(p.x, p.y + BTH / 2); c.lineTo(p.x - BTW / 2, p.y); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.stroke();
    if (gy === 4 || gx === 6) {
      c.fillStyle = eraTint(shade(base, -0.35));
      if (gy === 4) { c.beginPath(); c.moveTo(p.x - BTW / 2, p.y); c.lineTo(p.x, p.y + BTH / 2); c.lineTo(p.x, p.y + BTH / 2 + 18); c.lineTo(p.x - BTW / 2, p.y + 18); c.closePath(); c.fill(); }
      if (gx === 6) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.moveTo(p.x + BTW / 2, p.y); c.lineTo(p.x, p.y + BTH / 2); c.lineTo(p.x, p.y + BTH / 2 + 18); c.lineTo(p.x + BTW / 2, p.y + 18); c.closePath(); c.fill(); }
    }
  }
  // units sorted by depth
  const units = [...Battle.units].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  const now = this.t;
  for (const u of units) {
    const p = this.unitScreen(u);
    u.flash = Math.max(0, (u.flash || 0) - 0.06);
    const isCur = Battle.cur === u && !Battle.over;
    if (isCur) {
      c.strokeStyle = u.side === 'party' ? '#ffd98a' : '#ff7a7a'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(p.x, p.y, 26, 11, 0, 0, Math.PI * 2); c.stroke();
    }
    if (UI.targeting && UI.validTarget(u) && this.mouse) {
      const d = Math.hypot(this.mouse.x - p.x, this.mouse.y - (p.y - 30));
      if (d < 40) { c.fillStyle = 'rgba(255,230,120,0.25)'; c.beginPath(); c.ellipse(p.x, p.y, 30, 13, 0, 0, Math.PI * 2); c.fill(); }
    }
    const o = { flash: u.flash, dead: !u.alive };
    const facing = u.side === 'enemy';
    c.save();
    if (facing) { c.translate(p.x, 0); c.scale(-1, 1); c.translate(-p.x, 0); }
    if (u.shape === 'beast') this.drawBeast(p.x, p.y, u.look, 1.1, o);
    else if (u.kind === 'char') this.drawFigure(p.x, p.y, u.look, 1.25, { ...o, weapon: u.skill === 'int' || u.skill === 'wil' ? 'staff' : u.skill === 'vit' ? 'shield' : 'sword' });
    else {
      const look = { skin: u.look.skin || (u.shape === 'brute' ? '#7d8f72' : '#d8b08c'), hair: '#2a2a2a', tunic: u.look.color, race: u.shape === 'brute' ? 'orc' : 'human', stage: 'prime' };
      if (u.shape === 'wraith') { c.globalAlpha = 0.75; look.skin = '#c8d8f0'; look.tunic = u.look.color; }
      this.drawFigure(p.x, p.y + (u.shape === 'wraith' ? -8 + Math.sin(now / 300) * 3 : 0), look, u.shape === 'brute' ? 1.7 : 1.25, { ...o, weapon: u.skill === 'int' ? 'staff' : 'sword' });
      c.globalAlpha = 1;
    }
    c.restore();
    // hp bar
    if (u.alive) {
      const bw = 50, bx = p.x - bw / 2, byy = p.y - (u.shape === 'brute' ? 100 : 82);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(bx - 1, byy - 1, bw + 2, 7);
      c.fillStyle = u.side === 'party' ? '#5fd35f' : '#e0503a';
      c.fillRect(bx, byy, bw * (u.hp / u.maxHp), 5);
      c.fillStyle = '#f2ead8'; c.font = '11px Georgia, serif'; c.textAlign = 'center';
      c.fillText(`${u.boss ? '☠ ' : ''}${u.name} · L${u.lvl}`, p.x, byy - 4);
      // focus pips
      for (let i = 0; i < 3; i++) { c.fillStyle = i < u.focus ? '#8fd3ff' : 'rgba(255,255,255,0.15)'; c.fillRect(bx + i * 8, byy + 7, 6, 3); }
      if (u.defending) { c.fillStyle = '#8fd3ff'; c.fillText('🛡', bx + bw + 8, byy + 6); }
    }
  }
  // fx
  Battle.fx = Battle.fx.filter((f) => now - f.t0 < 1100);
  for (const f of Battle.fx) {
    const u = Battle.find(f.uid);
    if (!u) continue;
    const p = this.biso(u.gx, u.gy);
    const k = (now - f.t0) / 1100;
    if (k < 0) continue;
    if (f.burst) {
      c.fillStyle = f.burst; c.globalAlpha = 1 - k;
      c.beginPath(); c.arc(p.x, p.y - 30, 10 + k * 40, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      continue;
    }
    c.globalAlpha = 1 - k * k;
    c.font = f.small ? 'italic 12px Georgia, serif' : 'bold 20px Georgia, serif';
    c.textAlign = 'center';
    c.fillStyle = '#000'; c.fillText(f.text, p.x + 1, p.y - 90 - k * 40 + 1 + (f.small ? 18 : 0));
    c.fillStyle = f.color; c.fillText(f.text, p.x, p.y - 90 - k * 40 + (f.small ? 18 : 0));
    c.globalAlpha = 1;
  }
  // title
  c.font = '600 18px Georgia, serif'; c.textAlign = 'center'; c.fillStyle = '#f2ead8';
  c.fillText(`${Battle.title} — Round ${Math.max(1, Battle.round)}`, this.w / 2, 34);
};

Render.pickUnit = function (p) {
  let best = null, bd = 50;
  for (const u of Battle.units) {
    const s = this.unitScreen(u);
    const d = Math.hypot(p.x - s.x, p.y - (s.y - 30));
    if (d < bd) { bd = d; best = u; }
  }
  return best;
};

Render.pickTile = function (p) {
  const map = G.world.map;
  for (let s = map.W + map.H - 2; s >= 0; s--) {
    for (let x = map.W - 1; x >= 0; x--) {
      const y = s - x;
      if (y < 0 || y >= map.H) continue;
      const t = tileAt(x, y);
      const c = this.iso(x, y, t.h);
      const dx = Math.abs(p.x - c.x) / (TW / 2), dy = Math.abs(p.y - c.y) / (TH / 2);
      if (dx + dy <= 1) return t;
    }
  }
  return null;
};
