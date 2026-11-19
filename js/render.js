// 2.5D isometric renderer for the overworld and battles (Canvas 2D, procedural art).
'use strict';

const Render = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1,
  cam: { x: 0, y: 0 }, hover: null, t: 0,
  rot: 0, zoom: 1, zoomTarget: 1, spin: 0,
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
  canvas.addEventListener('wheel', (e) => {
    if (Battle.active) return;
    e.preventDefault();
    this.setZoom(this.zoomTarget * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (Battle.active || e.target.tagName === 'INPUT' || (typeof UI !== 'undefined' && UI.modalStack.length)) return;
    if (e.key === 'q' || e.key === 'Q') this.rotate(-1);
    if (e.key === 'e' || e.key === 'E') this.rotate(1);
    if (e.key === '+' || e.key === '=') this.setZoom(this.zoomTarget * 1.2);
    if (e.key === '-' || e.key === '_') this.setZoom(this.zoomTarget / 1.2);
  });
  // on-screen map controls
  const btn = (label, title, fn) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.addEventListener('click', fn); return b; };
  this.ctl = document.createElement('div');
  this.ctl.className = 'mapctl';
  this.ctl.append(
    btn('⟲', 'Rotate left (Q)', () => this.rotate(-1)),
    btn('⟳', 'Rotate right (E)', () => this.rotate(1)),
    btn('+', 'Zoom in (+ or mouse wheel)', () => this.setZoom(this.zoomTarget * 1.25)),
    btn('−', 'Zoom out (−)', () => this.setZoom(this.zoomTarget / 1.25)),
    btn('⌂', 'Reset view', () => { this.rot = 0; this.setZoom(1); }),
  );
  canvas.parentElement.append(this.ctl);
  const loop = (ts) => { this.t = ts; try { this.frame(); } catch (err) { console.error(err); } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};

Render.rotate = function (dir) { this.rot = (this.rot + dir + 4) % 4; this.spin = this.t; this.lastHover = null; };
Render.setZoom = function (z) { this.zoomTarget = clamp(z, 0.45, 2.6); };
// screen point -> unzoomed world-screen point
Render.unzoom = function (p) { return { x: (p.x - this.w / 2) / this.zoom + this.w / 2, y: (p.y - this.h / 2) / this.zoom + this.h / 2 }; };
Render.rotXY = function (x, y) {
  const N = G.world.map.W - 1;
  switch (this.rot) {
    case 1: return [N - y, x];
    case 2: return [N - x, N - y];
    case 3: return [y, N - x];
    default: return [x, y];
  }
};
Render.unrotXY = function (rx, ry) {
  const N = G.world.map.W - 1;
  switch (this.rot) {
    case 1: return [ry, N - rx];
    case 2: return [N - rx, N - ry];
    case 3: return [N - ry, rx];
    default: return [rx, ry];
  }
};

Render.frame = function () {
  const c = this.ctx;
  if (this.ctl) this.ctl.hidden = !(G && G.mode === 'world' && !Battle.active);
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
  const [rx, ry] = this.rotXY(x, y);
  return { x: (rx - ry) * TW / 2 + this.cam.x, y: (rx + ry) * TH / 2 - h * HSTEP + this.cam.y };
};
Render.partyWorldPos = function () {
  if (this.move) {
    const k = clamp((this.t - this.move.t0) / this.move.dur, 0, 1);
    const a = tileAt(this.move.from.x, this.move.from.y), b = tileAt(this.move.to.x, this.move.to.y);
    const hop = Math.sin(k * Math.PI) * (this.move.fly ? 8 : 0.5);
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
  const [prx, pry] = this.rotXY(pp.x, pp.y);
  const tx = this.w / 2 - (prx - pry) * TW / 2;
  const ty = this.h / 2 - (prx + pry) * TH / 2 + pp.h * HSTEP;
  this.cam.x += (tx - this.cam.x) * 0.12;
  this.cam.y += (ty - this.cam.y) * 0.12;
  if (!this.camInit) { this.cam.x = tx; this.cam.y = ty; this.camInit = true; }
  this.zoom += (this.zoomTarget - this.zoom) * 0.18;

  this.hover = this.mouse && !this.move ? this.pickTile(this.mouse) : null;
  c.save();
  // zoom about the centre; a quick squash when the view rotates
  const sk = this.spin ? clamp((this.t - this.spin) / 220, 0, 1) : 1;
  c.translate(this.w / 2, this.h / 2);
  c.scale(this.zoom * (0.75 + 0.25 * sk), this.zoom);
  c.translate(-this.w / 2, -this.h / 2);
  const pathSet = new Set((this.hoverPath || []).map((t) => t.y * map.W + t.x));
  if (this.hover && this.hover !== this.lastHover) {
    this.lastHover = this.hover;
    this.hoverPath = findPath(tileAt(G.pos.x, G.pos.y), this.hover) || [];
  }
  if (!this.hover) this.hoverPath = [];

  const partyTileOrder = Math.round(prx) + Math.round(pry);
  let partyDrawn = false;
  for (let s = 0; s <= map.W + map.H - 2; s++) {
    for (let rx = 0; rx < map.W; rx++) {
      const ry = s - rx;
      if (ry < 0 || ry >= map.H) continue;
      const [x, y] = this.unrotXY(rx, ry);
      const t = tileAt(x, y);
      const sp = this.iso(x, y, t.h);
      const zx = (sp.x - this.w / 2) * this.zoom + this.w / 2, zy = (sp.y - this.h / 2) * this.zoom + this.h / 2;
      if (zx < -80 * this.zoom || zx > this.w + 80 * this.zoom || zy < -120 * this.zoom || zy > this.h + 140 * this.zoom) continue;
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
    const zx = (p.x - this.w / 2) * this.zoom + this.w / 2, zy = (p.y - this.h / 2) * this.zoom + this.h / 2;
    if (zx < -60 || zx > this.w + 60 || zy < -60 || zy > this.h + 100) continue;
    const town = t.feature === 'town' ? G.world.towns[t.townIdx] : null;
    const label = town ? `${town.name}${town.size >= 4 ? ' ★' : ''}` : t.feature === 'estate' ? `House ${G.house.name}`
      : Events.label(t) ? Events.label(t) : t.feature === 'spire' ? 'The Black Spire' : t.feature === 'shrine' ? (t.lit ? 'Beacon (lit)' : 'Beacon Shrine')
        : `${t.ruinOf ? 'Ruins of ' + t.ruinOf : 'Ruins'}${t.cleared ? ' (cleared)' : ''}`;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    const w = c.measureText(label).width + 10;
    c.fillRect(p.x - w / 2, p.y - 70, w, 17);
    c.fillStyle = t.feature === 'estate' ? '#ffd98a' : '#f2ead8';
    c.fillText(label, p.x, p.y - 57);
  }
  const q = G.world.doom && G.world.doom.quest;
  if (q && q.x != null) {
    const qt = tileAt(q.x, q.y);
    const p = this.iso(q.x, q.y, qt.h);
    const bob = Math.sin(this.t / 300) * 4;
    c.fillStyle = '#ffd76a'; c.strokeStyle = '#5a4210'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(p.x, p.y - 96 + bob); c.lineTo(p.x + 9, p.y - 84 + bob); c.lineTo(p.x, p.y - 72 + bob); c.lineTo(p.x - 9, p.y - 84 + bob); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
  // compass: which way is north on the rotated map
  this.drawCompass();
  this.drawMinimap();
  // vignette
  const v = c.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.35, this.w / 2, this.h / 2, this.h * 0.9);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = v; c.fillRect(0, 0, this.w, this.h);
  if (G.world.era.type === 'war') this.drawEmbers();
};

Render.drawMinimap = function () {
  const c = this.ctx, map = G.world.map;
  const size = Math.min(150, this.w * 0.22), px = size / map.W;
  const x0 = 10, y0 = 10;
  if (!this.mini || this.miniKey !== G.world.towns.length + ':' + Math.floor(G.day / 360) + ':' + this.rot) {
    const cv = this.mini || document.createElement('canvas');
    cv.width = map.W; cv.height = map.H;
    const m = cv.getContext('2d');
    for (const t of map.tiles) { m.fillStyle = GD.BIOMES[t.type].top; m.fillRect(t.x, t.y, 1, 1); }
    this.mini = cv; this.miniKey = G.world.towns.length + ':' + Math.floor(G.day / 360) + ':' + this.rot;
  }
  c.save();
  c.globalAlpha = 0.92;
  c.fillStyle = 'rgba(15,13,20,0.8)'; c.fillRect(x0 - 3, y0 - 3, size + 6, size + 6);
  c.imageSmoothingEnabled = false;
  c.drawImage(this.mini, x0, y0, size, size);
  const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(x0 + (x + 0.5) * px, y0 + (y + 0.5) * px, r, 0, Math.PI * 2); c.fill(); };
  for (const t of G.world.towns) if (!t.fallen) dot(t.x, t.y, '#f2ead8', 2);
  dot(G.world.spire.x, G.world.spire.y, '#b04aff', 3);
  const q = G.world.doom.quest;
  if (q && q.x != null) dot(q.x, q.y, '#ffd76a', 2.5);
  dot(G.world.estate.x, G.world.estate.y, G.house.color, 3);
  dot(G.pos.x, G.pos.y, '#ffffff', 2.5);
  c.fillStyle = '#a59c8e'; c.font = '10px Georgia, serif'; c.textAlign = 'left';
  c.fillText('N ↑ (map)', x0, y0 + size + 13);
  c.restore();
};

Render.drawCompass = function () {
  const c = this.ctx;
  const cx = this.w - 44, cy = 44;
  const [ax, ay] = this.rotXY(G.world.map.W / 2, 0);
  const [bx, by] = this.rotXY(G.world.map.W / 2, G.world.map.H);
  const vx = ((ax - ay) - (bx - by)) * TW / 2, vy = ((ax + ay) - (bx + by)) * TH / 2;
  const len = Math.hypot(vx, vy) || 1;
  c.fillStyle = 'rgba(15,13,20,0.7)'; c.beginPath(); c.arc(cx, cy, 22, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e6c06a'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - vx / len * 14, cy - vy / len * 14); c.lineTo(cx + vx / len * 14, cy + vy / len * 14); c.stroke();
  c.fillStyle = '#e6c06a'; c.font = 'bold 11px Georgia, serif'; c.textAlign = 'center';
  c.fillText('N', cx + vx / len * 16, cy + vy / len * 16 + 4);
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
  const col = GD.BIOMES[t.type];
  let top = eraTint(col.top);
  if (col.water) {
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
  if (!t.feature) {
    const seed = (t.x * 73 + t.y * 31) % 7;
    if (t.type === 'jungle') {
      for (let i = 0; i < 4; i++) this.drawPalm(p.x - 14 + i * 9, p.y - 4 + ((i * 5 + seed) % 9), 0.8 + (i % 2) * 0.2);
    } else if (t.type === 'snow') {
      if (seed < 3) for (let i = 0; i < 2; i++) this.drawTree(p.x - 8 + i * 14, p.y + (i ? 2 : -4), 0.8, true);
    } else if (t.type === 'desert') {
      c.fillStyle = eraTint('#cfae63');
      c.beginPath(); c.ellipse(p.x - 6, p.y + 3, 14, 5, 0, Math.PI, 0); c.fill();
      if (seed < 3) { c.fillStyle = eraTint('#4f8a3c'); c.fillRect(p.x + 8, p.y - 14, 3, 14); c.fillRect(p.x + 4, p.y - 10, 4, 2); c.fillRect(p.x + 4, p.y - 14, 2, 4); }
    } else if (t.type === 'swamp') {
      c.fillStyle = 'rgba(40,60,50,0.55)';
      c.beginPath(); c.ellipse(p.x - 6, p.y + 2, 10, 4, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(p.x + 10, p.y - 3, 6, 3, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = eraTint('#6b7a3a'); c.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(p.x - 14 + i * 7, p.y + 6); c.lineTo(p.x - 15 + i * 7, p.y - 6); c.stroke(); }
    }
  }
  if (t.feature === 'town') this.drawTown(p, G.world.towns[t.townIdx]);
  if (t.feature === 'estate') this.drawEstate(p, G.house.tier);
  if (t.feature === 'ruins') this.drawRuins(p, t.cleared);
  if (t.feature === 'spire') this.drawSpire(p);
  if (t.feature === 'shrine') this.drawShrine(p, t.lit);
  if (t.feature === 'camp' || t.feature === 'cave' || t.feature === 'mine') Events.drawFeature(this, t, p);
};

Render.drawPalm = function (x, y, s) {
  const c = this.ctx;
  c.strokeStyle = '#6b4a2a'; c.lineWidth = 2 * s;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3 * s, y - 10 * s, x + 1 * s, y - 20 * s); c.stroke();
  c.fillStyle = eraTint('#2f7a2a');
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.7;
    c.beginPath(); c.ellipse(x + 1 * s + Math.cos(a) * 6 * s, y - 20 * s + Math.sin(a) * 3 * s + 3 * s, 7 * s, 2.2 * s, a, 0, Math.PI * 2); c.fill();
  }
};
Render.drawSpire = function (p) {
  const c = this.ctx;
  c.fillStyle = '#1a1020';
  c.beginPath(); c.moveTo(p.x - 14, p.y + 6); c.lineTo(p.x - 4, p.y - 70); c.lineTo(p.x, p.y - 92); c.lineTo(p.x + 4, p.y - 70); c.lineTo(p.x + 14, p.y + 6); c.closePath(); c.fill();
  c.fillStyle = '#2c1838';
  c.beginPath(); c.moveTo(p.x, p.y - 92); c.lineTo(p.x + 4, p.y - 70); c.lineTo(p.x + 14, p.y + 6); c.lineTo(p.x + 2, p.y + 8); c.closePath(); c.fill();
  const glow = 0.5 + Math.sin(this.t / 350) * 0.3;
  c.fillStyle = `rgba(190,80,255,${glow})`;
  c.beginPath(); c.arc(p.x, p.y - 60, 3, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(p.x, p.y - 94, 4 + glow * 3, 0, Math.PI * 2); c.fill();
};
Render.drawShrine = function (p, lit) {
  const c = this.ctx;
  this.drawBox(p.x, p.y, 0.35, 0.35, 26, eraTint('#a9a39a'), eraTint('#8c867d'));
  if (lit) {
    const f = 0.6 + Math.sin(this.t / 120) * 0.3;
    c.fillStyle = `rgba(255,180,60,${f})`; c.beginPath(); c.arc(p.x, p.y - 34, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,240,180,0.9)'; c.beginPath(); c.arc(p.x, p.y - 34, 3, 0, Math.PI * 2); c.fill();
  } else { c.fillStyle = '#555'; c.fillRect(p.x - 5, p.y - 34, 10, 4); }
};

Render.drawTree = function (x, y, s, snowy) {
  const c = this.ctx;
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath(); c.ellipse(x, y + 2, 7 * s, 3 * s, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a3d24'; c.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 8 * s);
  const leaf = G.world.era.type === 'famine' ? '#6b6a3c' : '#2f6b2a';
  c.fillStyle = eraTint(leaf);
  c.beginPath(); c.moveTo(x - 9 * s, y - 4 * s); c.lineTo(x, y - 26 * s); c.lineTo(x + 9 * s, y - 4 * s); c.closePath(); c.fill();
  c.fillStyle = eraTint(shade(leaf, 0.15));
  c.beginPath(); c.moveTo(x - 9 * s, y - 4 * s); c.lineTo(x, y - 26 * s); c.lineTo(x - 1 * s, y - 4 * s); c.closePath(); c.fill();
  if (snowy) { c.fillStyle = '#f4f8fa'; c.beginPath(); c.moveTo(x - 4 * s, y - 16 * s); c.lineTo(x, y - 26 * s); c.lineTo(x + 4 * s, y - 16 * s); c.closePath(); c.fill(); }
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

Render.drawTown = function (p, town) {
  const size = town ? town.size : 2;
  if (size >= 4) {
    // city walls and towers
    const wall = eraTint('#a39b8c');
    this.drawBox(p.x - 22, p.y - 2, 0.25, 0.25, 26, wall, eraTint('#8c867d'));
    this.drawBox(p.x + 22, p.y - 2, 0.25, 0.25, 26, wall, eraTint('#8c867d'));
  }
  if (size >= 3) this.drawBox(p.x - 12, p.y - 2, 0.7, 0.6, 12 + (size >= 4 ? 8 : 0), eraTint('#c9b08a'), eraTint('#8c3b2a'), 9);
  if (size >= 2) this.drawBox(p.x + 12, p.y - 4, 0.6, 0.6, 10, eraTint('#d4c3a0'), eraTint('#5b4a8a'), 8);
  this.drawBox(p.x, p.y + 6, 0.8, 0.6, size >= 5 ? 30 : 14, eraTint('#bfa57d'), eraTint('#7a3022'), 10);
  if (size >= 5) this.drawBox(p.x + 2, p.y - 10, 0.3, 0.3, 44, eraTint('#d8cbb0'), eraTint('#c9a24a'), 14);
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
  const here = tileAt(Math.round(pp.x), Math.round(pp.y));
  if (here && isWater(here) && !(this.move && this.move.fly)) {
    const c = this.ctx;
    c.fillStyle = '#6b4a2a';
    c.beginPath(); c.moveTo(p.x - 24, p.y - 2); c.lineTo(p.x + 26, p.y - 2); c.lineTo(p.x + 16, p.y + 10); c.lineTo(p.x - 16, p.y + 10); c.closePath(); c.fill();
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x + 2, p.y - 2); c.lineTo(p.x + 2, p.y - 46); c.stroke();
    c.fillStyle = hasTech('steam') ? '#555' : '#efe6d2';
    if (hasTech('steam')) { c.fillRect(p.x + 8, p.y - 22, 6, 20); } else { c.beginPath(); c.moveTo(p.x + 3, p.y - 44); c.lineTo(p.x + 22, p.y - 10); c.lineTo(p.x + 3, p.y - 8); c.closePath(); c.fill(); }
  }
  // followers behind leader
  party.slice(1).forEach((c, i) => {
    this.drawFigure(p.x - 10 - i * 7, p.y + 2 - i * 3, figLook(c), 0.55, { bob: this.move ? Math.sin(this.t / 90 + i) : 0 });
  });
  this.drawFigure(p.x + 4, p.y + 6, figLook(mc), 0.62, { bob: this.move ? Math.sin(this.t / 90) : 0, banner: G.house.color });
};

function figLook(c) {
  const inj = {};
  for (const k of c.injuries || []) if (GD.INJURIES[k].look) inj[GD.INJURIES[k].look] = true;
  return {
    skin: GD.RACES[c.race].skin, hair: c.hair, tunic: c.tunic, stage: stageKey(c), race: c.race, evil: c.evil,
    house: G && G.house && c.house === G.house.name, inj, armor: (c.gear && c.gear.armor) || 0,
    gender: c.gender || 'man', hairStyle: c.hairStyle || 'short', beard: !!c.beard,
    hScale: GD.HEIGHTS[c.height || 'average'].scale, wScale: GD.BUILDS[c.build || 'average'].width,
    cane: c.condition === 'lame', cloudy: c.condition === 'cloudedEye',
  };
}
const ARMOR_COLORS = ['', '#7d7f84', '#a9b1b9', '#c8d0d8', '#d4b05a', '#8fd8f0'];

// ---------------------------------------------------------------- figures
Render.drawFigure = function (x, y, look, scale = 1, o = {}) {
  const c = this.ctx;
  const r = GD.RACES[look.race] || GD.RACES.human;
  const st = look.stage || 'prime';
  let s = scale * r.height * (st === 'child' ? 0.6 : st === 'youth' ? 0.92 : 1) * (look.hScale || 1);
  const wd = r.width * (st === 'child' ? 0.85 : 1) * (look.wScale || 1);
  const woman = look.gender === 'woman';
  const sh = woman ? 6.2 : 7.4; // shoulder half-width
  const hip = woman ? 8.6 : 8;
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
  const inj = look.inj || {};
  // legs (a peg leg if one was lost); seated: shins forward, knees up
  c.fillStyle = fl ? '#fff' : '#3b2f2a';
  if (o.seated) {
    c.fillRect(x - 7 * s * wd, y - 6 * s, 6 * s * wd, 5 * s);
    c.fillRect(x + 1 * s * wd, y - 6 * s, 6 * s * wd, 5 * s);
    c.fillStyle = fl ? '#fff' : '#2a201c';
    c.fillRect(x - 7 * s * wd, y - 1.5 * s, 6 * s * wd, 2.5 * s);
    if (!inj.leg) c.fillRect(x + 1 * s * wd, y - 1.5 * s, 6 * s * wd, 2.5 * s);
  } else c.fillRect(x - 5 * s * wd, y - 14 * s + Math.max(0, bob), 4 * s * wd, 14 * s);
  if (o.seated) { /* drawn above */ } else if (inj.leg) {
    c.fillRect(x + 1 * s * wd, y - 14 * s, 4 * s * wd, 6 * s);
    c.fillStyle = fl ? '#fff' : '#8a6a45';
    c.fillRect(x + 2.2 * s * wd, y - 8 * s, 1.6 * s, 8 * s);
  } else c.fillRect(x + 1 * s * wd, y - 14 * s + Math.max(0, -bob), 4 * s * wd, 14 * s);
  // body
  const by = y - (o.seated ? 6 : 14) * s;
  c.fillStyle = fl ? '#fff' : (look.evil ? '#2a1420' : look.tunic);
  c.beginPath();
  c.moveTo(x - hip * s * wd, by); c.lineTo(x + hip * s * wd, by);
  c.lineTo(x + sh * s * wd + stoop * 0.5, by - 20 * s); c.lineTo(x - sh * s * wd + stoop * 0.5, by - 20 * s);
  c.closePath(); c.fill();
  // armour: a breastplate and pauldrons that change with its tier
  if (look.armor && !fl) {
    const ac = ARMOR_COLORS[look.armor];
    c.fillStyle = ac;
    c.beginPath();
    c.moveTo(x - 6.5 * s * wd, by - 4 * s); c.lineTo(x + 6.5 * s * wd, by - 4 * s);
    c.lineTo(x + 6 * s * wd + stoop * 0.5, by - 18 * s); c.lineTo(x - 6 * s * wd + stoop * 0.5, by - 18 * s);
    c.closePath(); c.fill();
    c.fillStyle = shade(ac, 0.3); c.fillRect(x - 1 * s + stoop * 0.25, by - 17 * s, 2 * s, 12 * s);
    if (look.armor >= 2) {
      c.fillStyle = shade(ac, -0.15);
      c.beginPath(); c.arc(x - 8 * s * wd + stoop * 0.5, by - 18 * s, 3.5 * s, 0, Math.PI * 2); c.fill();
      if (!inj.arm) { c.beginPath(); c.arc(x + 8 * s * wd + stoop * 0.5, by - 18 * s, 3.5 * s, 0, Math.PI * 2); c.fill(); }
    }
  }
  // belt / house sash
  c.fillStyle = look.house ? G.house.color : '#4a3a2a';
  c.fillRect(x - 8 * s * wd, by - 6 * s, 16 * s * wd, 3 * s);
  // arms (a bound stump if one was lost)
  c.fillStyle = fl ? '#fff' : shade(look.evil ? '#2a1420' : look.tunic, -0.2);
  c.fillRect(x - (sh + 3.6) * s * wd, by - 19 * s, 4 * s, 14 * s);
  if (inj.arm) {
    c.fillRect(x + (sh - 0.4) * s * wd + stoop * 0.5, by - 19 * s, 4 * s, 5 * s);
    c.fillStyle = '#d8d2c0'; c.fillRect(x + (sh - 0.4) * s * wd + stoop * 0.5, by - 14.5 * s, 4 * s, 1.5 * s);
  } else c.fillRect(x + (sh - 0.4) * s * wd + stoop * 0.5, by - 19 * s, 4 * s, 14 * s);
  if (look.cane && !o.dead) {
    c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.6 * s;
    c.beginPath(); c.moveTo(x - (sh + 2) * s * wd, by - 6 * s); c.lineTo(x - (sh + 4) * s * wd, y); c.stroke();
  }
  // weapon
  if (o.weapon && !(inj.arm && o.weapon !== 'shield')) {
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
  // hair, in the person's own style
  c.fillStyle = hair;
  const style = look.hairStyle || 'short';
  if (style !== 'shaved') {
    c.beginPath(); c.arc(hx, hy - 1.5 * s, (style === 'crop' ? 6.6 : 6.9) * s, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  } else {
    c.globalAlpha = 0.35; c.beginPath(); c.arc(hx, hy - 1 * s, 6.6 * s, Math.PI * 1.1, Math.PI * 1.9); c.fill(); c.globalAlpha = 1;
  }
  if (style === 'long') { c.fillRect(hx - 7 * s, hy - 2 * s, 2.6 * s, 11 * s); c.fillRect(hx + 4.4 * s, hy - 2 * s, 2.6 * s, 11 * s); }
  if (style === 'bun') { c.beginPath(); c.arc(hx - 3 * s, hy - 7.5 * s, 3 * s, 0, Math.PI * 2); c.fill(); }
  if (style === 'braid') { c.fillRect(hx - 6.8 * s, hy - 1 * s, 2.2 * s, 14 * s); c.beginPath(); c.arc(hx - 5.7 * s, hy + 13.5 * s, 1.6 * s, 0, Math.PI * 2); c.fill(); }
  if (st === 'venerable') { c.fillStyle = look.skin; c.beginPath(); c.arc(hx, hy - 4 * s, 3 * s, Math.PI, 0); c.fill(); }
  // beard
  if (look.beard && st !== 'child') {
    c.fillStyle = hair;
    c.beginPath(); c.moveTo(hx - 6 * s, hy + 1 * s); c.lineTo(hx + 6 * s, hy + 1 * s); c.lineTo(hx, hy + 13 * s); c.closePath(); c.fill();
  }
  if (look.race === 'orc') {
    c.fillStyle = '#f2ecd8';
    c.fillRect(hx - 3 * s, hy + 2 * s, 1.5 * s, 3 * s); c.fillRect(hx + 1.5 * s, hy + 2 * s, 1.5 * s, 3 * s);
  }
  // eyes (a patch over a lost one)
  c.fillStyle = look.evil ? '#ff3b3b' : '#1a1a1a';
  c.fillRect(hx - 3 * s, hy - 1 * s, 1.6 * s, 1.6 * s);
  if (inj.eye) {
    c.fillStyle = '#111';
    c.beginPath(); c.ellipse(hx + 2.3 * s, hy - 0.2 * s, 2.4 * s, 2 * s, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 0.8 * s;
    c.beginPath(); c.moveTo(hx - 6.5 * s, hy - 3 * s); c.lineTo(hx + 6.5 * s, hy + 0.5 * s); c.stroke();
  } else c.fillRect(hx + 1.5 * s, hy - 1 * s, 1.6 * s, 1.6 * s);
  if (look.cloudy && !inj.eye) { c.fillStyle = '#d8dde2'; c.fillRect(hx + 1.5 * s, hy - 1 * s, 1.6 * s, 1.6 * s); }
  if (inj.scar) {
    c.strokeStyle = '#a03a2e'; c.lineWidth = 0.9 * s;
    c.beginPath(); c.moveTo(hx - 4 * s, hy - 4 * s); c.lineTo(hx - 1 * s, hy + 4 * s); c.stroke();
  }
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

Render.pickTile = function (p0) {
  const map = G.world.map;
  const p = this.unzoom(p0);
  for (let s = map.W + map.H - 2; s >= 0; s--) {
    for (let rx = map.W - 1; rx >= 0; rx--) {
      const ry = s - rx;
      if (ry < 0 || ry >= map.H) continue;
      const [x, y] = this.unrotXY(rx, ry);
      const t = tileAt(x, y);
      const c = this.iso(x, y, t.h);
      const dx = Math.abs(p.x - c.x) / (TW / 2), dy = Math.abs(p.y - c.y) / (TH / 2);
      if (dx + dy <= 1) return t;
    }
  }
  return null;
};
