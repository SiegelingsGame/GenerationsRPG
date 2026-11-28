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
  this.resize = resize;
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
    else if (G && G.mode === 'world' && !this.pinching) {
      const ag = Living.pick(this.unzoom(p));
      if (ag) return Living.go(tileAt(Math.round(ag.x), Math.round(ag.y)), ag);
      if (LS.ready) { const wp = this.screenToWorld(p); return Game.clickPoint(wp); }
      const t = this.pickTile(p); if (t) Game.clickTile(t);
    }
  });
  // touch: pinch with two fingers to zoom the world map (a tap still travels)
  let pinch = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: this.zoomTarget };
      this.pinching = true;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (pinch && e.touches.length === 2 && !Battle.active) {
      e.preventDefault();
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      this.setZoom(pinch.z * d / pinch.d);
      this.zoom = this.zoomTarget;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2 && pinch) { pinch = null; setTimeout(() => { this.pinching = false; }, 350); }
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
  // On-screen map controls (desktop strip; on phones they live inside the Map dock).
  const btn = (label, title, fn) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.addEventListener('click', fn); return b; };
  this.ctl = document.createElement('div');
  this.ctl.className = 'mapctl';
  this.stopBtn = btn('■', 'Stop travelling (Esc)', () => Living.cancel('You halt on the road.'));
  this.stopBtn.classList.add('stop-travel');
  this.stopBtn.hidden = true;
  this.mobileStopBtn = btn('Stop', 'Stop travelling (Esc)', () => Living.cancel('You halt on the road.'));
  this.mobileStopBtn.className = 'hud-stop';
  this.mobileStopBtn.hidden = true;
  this.ctl.append(
    this.stopBtn,
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
Render.updateTravelCtl = function () {
  const moving = !!(Living && Living.moving);
  if (this.stopBtn) this.stopBtn.hidden = !moving;
  if (this.mobileStopBtn) this.mobileStopBtn.hidden = !moving;
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

Render.shake = function (ms = 400, power = 8) {
  this.shakeUntil = performance.now() + ms;
  this.shakePower = power;
};

Render.frame = function () {
  const c = this.ctx;
  const box = this.canvas.getBoundingClientRect();
  if (Math.abs(box.width - this.w) > 0.5 || Math.abs(box.height - this.h) > 0.5) this.resize();
  if (this.ctl) this.ctl.hidden = !(G && G.mode === 'world' && !Battle.active);
  c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  c.clearRect(0, 0, this.w, this.h);
  const shaking = this.shakeUntil && performance.now() < this.shakeUntil;
  if (shaking) {
    const p = this.shakePower || 8;
    c.save();
    c.translate((Math.random() - 0.5) * p * 2, (Math.random() - 0.5) * p * 2);
  }
  if (typeof OpeningCutscene !== 'undefined' && OpeningCutscene.active && OpeningCutscene.spirit && OpeningCutscene.spirit.active) {
    OpeningCutscene.tickSpiritFlight(performance.now());
  }
  if (!G || !G.world || !G.world.map) { this.drawTitleBg(); if (shaking) c.restore(); return; }
  const approach = typeof OpeningCutscene !== 'undefined' && OpeningCutscene.spirit && OpeningCutscene.spirit.active
    && OpeningCutscene.isApproachStage && OpeningCutscene.isApproachStage(OpeningCutscene.spirit.stage);
  if (approach) this.drawSpiritApproach(OpeningCutscene.spirit);
  else if (Battle.active) this.drawBattle();
  else this.drawWorld();
  if (!Battle.active && !approach && typeof FxLayer !== 'undefined') FxLayer.drawWeather(this);
  LocationPrompt.render();
  if (shaking) c.restore();
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
  return { x: (rx - ry) * TW / 2 + this.cam.x, y: (rx + ry) * TH / 2 - (this.flat ? 0 : h * HSTEP) + this.cam.y };
};
// screen point -> world point on the flat landscape (inverse of iso at height 0)
Render.screenToWorld = function (p0) {
  const p = this.unzoom(p0);
  const o = this.iso(0, 0, 0), ax = this.iso(1, 0, 0), ay = this.iso(0, 1, 0);
  const a = ax.x - o.x, b = ax.y - o.y, c = ay.x - o.x, d = ay.y - o.y;
  const det = a * d - b * c;
  const dx = p.x - o.x, dy = p.y - o.y;
  return { x: (d * dx - c * dy) / det, y: (-b * dx + a * dy) / det };
};
Render.partyWorldPos = function () {
  if (this.move) {
    const k = clamp((this.t - this.move.t0) / this.move.dur, 0, 1);
    const a = tileAt(this.move.from.x, this.move.from.y), b = tileAt(this.move.to.x, this.move.to.y);
    const hop = Math.sin(k * Math.PI) * (this.move.fly ? 8 : 0.5);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, h: a.h + (b.h - a.h) * k + hop, k };
  }
  if (G.ppos) {
    const t = tileAt(Math.round(G.ppos.x), Math.round(G.ppos.y)) || tileAt(G.pos.x, G.pos.y);
    return { x: G.ppos.x, y: G.ppos.y, h: t.h, k: 1 };
  }
  const t = tileAt(G.pos.x, G.pos.y);
  return { x: t.x, y: t.y, h: t.h, k: 1 };
};

// dashed route polyline on the landscape (active march or hover preview)
Render.drawRoute = function (path, opts = {}) {
  if (!path || !path.length) return;
  const c = this.ctx;
  const from = opts.from || G.ppos;
  const ok = opts.ok !== false;
  const active = !!opts.active;
  c.save();
  c.strokeStyle = ok
    ? (active ? 'rgba(255,230,140,0.85)' : 'rgba(255,220,120,0.55)')
    : 'rgba(220,90,70,0.55)';
  c.lineWidth = active ? 2.4 : 2;
  c.setLineDash(active ? [7, 5] : [4, 6]);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  const s0 = this.iso(from.x, from.y, 0); c.moveTo(s0.x, s0.y);
  for (const q of path) { const s1 = this.iso(q.x, q.y, 0); c.lineTo(s1.x, s1.y); }
  c.stroke();
  c.setLineDash([]);
  c.restore();
};

// compute a free-movement path under the cursor (throttled)
Render.refreshHoverRoute = function () {
  this.hoverRoute = null; this.hoverDest = null; this.hoverDays = 0; this.hoverOk = true;
  if (!this.mouse || Living.moving || this.move || !LS.ready || !G || G.mode !== 'world') return;
  if (Battle.active || TownView.open || ChurchView.open || Campfire.open || (UI.modalStack && UI.modalStack.length)) return;
  const wp = this.screenToWorld(this.mouse);
  const key = `${wp.x.toFixed(1)},${wp.y.toFixed(1)},${G.ppos.x.toFixed(1)},${G.ppos.y.toFixed(1)}`;
  if (key === this._hoverKey && this._hoverCache) {
    this.hoverRoute = this._hoverCache.path;
    this.hoverDest = this._hoverCache.dest;
    this.hoverDays = this._hoverCache.days;
    this.hoverOk = this._hoverCache.ok;
    return;
  }
  this._hoverKey = key;
  const snapped = Living.snapTarget(wp);
  let path = LS.path(G.ppos, snapped);
  let ok = !!path;
  if (!path) {
    const near = LS.nearestPassable(snapped.x, snapped.y, 10);
    if (near) {
      const alt = LS.cellCenter(near.i, near.j);
      path = LS.path(G.ppos, alt);
      if (path) { snapped.x = alt.x; snapped.y = alt.y; ok = true; }
    }
  }
  const days = path ? Living.estimateDays(path) : 0;
  this.hoverRoute = path || [];
  this.hoverDest = snapped;
  this.hoverDays = days;
  this.hoverOk = ok;
  this._hoverCache = { path: this.hoverRoute, dest: snapped, days, ok };
};

// early-game coach: ghost path to the nearest town + soft road glints
Render.drawTravelCoach = function () {
  if (!G || !G.guide || G.guide.done?.travel || Living.moving || !LS.ready) return;
  if (!G.ppos) G.ppos = { x: G.pos.x, y: G.pos.y };
  const towns = G.world.towns.filter((t) => !t.fallen)
    .sort((a, b) => Math.hypot(a.x - G.ppos.x, a.y - G.ppos.y) - Math.hypot(b.x - G.ppos.x, b.y - G.ppos.y));
  const town = towns[0];
  if (!town) return;
  if (!this._coachKey || this._coachKey !== `${town.x},${town.y},${Math.round(G.ppos.x)},${Math.round(G.ppos.y)}`) {
    this._coachKey = `${town.x},${town.y},${Math.round(G.ppos.x)},${Math.round(G.ppos.y)}`;
    this._coachPath = LS.path(G.ppos, { x: town.x, y: town.y }) || [];
  }
  if (!this._coachPath.length) return;
  const c = this.ctx;
  const pulse = 0.28 + Math.sin(this.t / 400) * 0.12;
  c.save();
  c.strokeStyle = `rgba(255, 210, 120, ${pulse})`;
  c.lineWidth = 3; c.setLineDash([10, 10]);
  c.beginPath();
  const s0 = this.iso(G.ppos.x, G.ppos.y, 0); c.moveTo(s0.x, s0.y);
  for (const q of this._coachPath) { const s1 = this.iso(q.x, q.y, 0); c.lineTo(s1.x, s1.y); }
  c.stroke(); c.setLineDash([]);
  const tip = this.iso(town.x, town.y, 0);
  c.fillStyle = `rgba(255, 220, 140, ${0.35 + pulse})`;
  c.beginPath(); c.ellipse(tip.x, tip.y, 18, 9, 0, 0, Math.PI * 2); c.fill();
  c.font = '600 11px Georgia, serif'; c.textAlign = 'center';
  c.fillStyle = 'rgba(12,10,16,0.75)';
  const label = `Road to ${town.name}`;
  const tw = c.measureText(label).width + 10;
  c.fillRect(tip.x - tw / 2, tip.y - 78, tw, 16);
  c.fillStyle = '#ffe9a8'; c.fillText(label, tip.x, tip.y - 66);
  c.restore();
};

// The seamless landscape: a painted terrain texture laid out in the 2.5D view, with trees, peaks,
// settlements and parties standing upright on it, sorted by depth.
Render.drawWorld = function () {
  if (LS.ensure()) return this.drawLandscape();
  this.flat = false;
  return this.drawWorldTiles();
};
Render.drawLandscape = function () {
  const c = this.ctx;
  const map = G.world.map;
  this.flat = true;
  const sky = c.createLinearGradient(0, 0, 0, this.h);
  sky.addColorStop(0, eraTint('#1d3550')); sky.addColorStop(1, eraTint('#0d1824'));
  c.fillStyle = sky; c.fillRect(0, 0, this.w, this.h);
  const spiritCam = typeof OpeningCutscene !== 'undefined' && OpeningCutscene.spirit && OpeningCutscene.spirit.active;
  const pp = this.partyWorldPos();
  const camSrc = spiritCam ? OpeningCutscene.spirit : pp;
  const [prx, pry] = this.rotXY(camSrc.x, camSrc.y);
  const tx = this.w / 2 - (prx - pry) * TW / 2;
  const ty = this.h / 2 - (prx + pry) * TH / 2;
  if (!this.camInit) { this.cam.x = tx; this.cam.y = ty; this.camInit = true; }
  const camLerp = spiritCam ? 0.28 : 0.15;
  this.cam.x += (tx - this.cam.x) * camLerp;
  this.cam.y += (ty - this.cam.y) * camLerp;
  this.zoom += (this.zoomTarget - this.zoom) * 0.18;
  c.save();
  const sk = this.spin ? clamp((this.t - this.spin) / 220, 0, 1) : 1;
  c.translate(this.w / 2, this.h / 2);
  c.scale(this.zoom * (0.75 + 0.25 * sk), this.zoom);
  c.translate(-this.w / 2, -this.h / 2);
  // the terrain itself, as one image mapped onto the ground plane
  const o = this.iso(-0.5, -0.5, 0), ax = this.iso(0.5, -0.5, 0), ay = this.iso(-0.5, 0.5, 0);
  c.save();
  c.transform((ax.x - o.x) / LS.S, (ax.y - o.y) / LS.S, (ay.x - o.x) / LS.S, (ay.y - o.y) / LS.S, o.x, o.y);
  c.imageSmoothingEnabled = true;
  c.drawImage(LS.tex, 0, 0);
  c.restore();
  // first-journey road pulse: teach "follow the roads". A hint must never stop the world drawing.
  try { this.drawTravelCoach(); } catch (e) { console.warn('travel coach', e); }
  // hover preview + active route
  this.refreshHoverRoute();
  this.drawRoute(Living.moving ? Living.path : (this.hoverRoute || []), {
    from: G.ppos,
    active: Living.moving,
    ok: Living.moving || this.hoverOk !== false,
  });
  if (!Living.moving && this.hoverDest) {
    Living.drawDest(this, this.hoverDest, { preview: true, ok: this.hoverOk, days: this.hoverDays });
  }
  // everything that stands up, sorted back to front
  const view = (sx, sy) => { const zx = (sx - this.w / 2) * this.zoom + this.w / 2, zy = (sy - this.h / 2) * this.zoom + this.h / 2; return zx > -90 && zx < this.w + 90 && zy > -140 && zy < this.h + 160; };
  const items = [];
  for (const t of map.tiles) {
    const s = this.iso(t.x, t.y, 0);
    if (!view(s.x, s.y)) continue;
    if (t.feature || ['forest', 'jungle', 'mountain', 'snow', 'hills', 'desert', 'swamp'].includes(t.type)) items.push({ y: s.y, t });
  }
  for (const a of Living.visibleAgents()) { const s = this.iso(a.x, a.y, 0); items.push({ y: s.y + (LS.bridgeLift(a.x, a.y) ? 30 : 0), a }); }
  // bridges sort by their farthest point, so whatever stands on or in front of them draws after
  for (const b of LS.bridges || []) {
    const e1 = this.iso(b.x - b.dx * b.len / 2, b.y - b.dy * b.len / 2, 0), e2 = this.iso(b.x + b.dx * b.len / 2, b.y + b.dy * b.len / 2, 0);
    const mid = this.iso(b.x, b.y, 0);
    if (!view(mid.x, mid.y)) continue;
    items.push({ y: Math.min(e1.y, e2.y) - 4, bridge: b });
  }
  for (const a of G.world.parties || []) if (!Living.visible(a)) a._sx = null;
  if (!spiritCam) {
    const ps = this.iso(pp.x, pp.y, 0);
    items.push({ y: ps.y + 0.1 + (LS.bridgeLift(pp.x, pp.y) ? 30 : 0), party: true });
  }
  items.sort((p, q) => p.y - q.y);
  for (const it of items) {
    if (it.t) this.drawFeature(it.t);
    else if (it.bridge) LS.drawBridge(this, it.bridge);
    else if (it.a) Living.drawAgent(this, it.a);
    else { Living.drawDest(this); this.drawParty(pp); }
  }
  // labels — soft ground rings help settlements read as places, not stickers
  c.font = '600 12px Georgia, serif';
  c.textAlign = 'center';
  for (const t of map.tiles) {
    if (!t.feature) continue;
    const p = this.iso(t.x, t.y, 0);
    if (!view(p.x, p.y)) continue;
    if (t.feature === 'estate' || t.feature === 'town' || t.feature === 'ruins' || t.feature === 'shrine' || t.feature === 'church') {
      c.fillStyle = t.feature === 'estate' ? 'rgba(255, 215, 120, 0.14)' : 'rgba(200, 190, 160, 0.1)';
      c.beginPath(); c.ellipse(p.x, p.y + 4, 22, 11, 0, 0, Math.PI * 2); c.fill();
    }
    // nearby place owns this spot as a live nametag chip
    if (typeof LocationPrompt !== 'undefined' && LocationPrompt.hidesLabel(t)) continue;
    const town = t.feature === 'town' ? G.world.towns[t.townIdx] : null;
    const label = town ? `${town.name}${town.size >= 4 ? ' ★' : ''}` : t.feature === 'estate' ? `House ${G.house.name}` : t.feature === 'church' ? Church.nameFor(t)
      : Events.label(t) ? Events.label(t) : t.feature === 'spire' ? 'The Black Spire' : t.feature === 'shrine' ? (t.lit ? 'Beacon (lit)' : 'Beacon Shrine')
        : `${t.ruinOf ? 'Ruins of ' + t.ruinOf : 'Ruins'}${t.cleared ? ' (cleared)' : ''}`;
    const w = c.measureText(label).width + 10;
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(p.x - w / 2, p.y - 62, w, 17);
    c.fillStyle = t.feature === 'estate' ? '#ffd98a' : '#f2ead8';
    c.fillText(label, p.x, p.y - 49);
  }
  Living.drawLabels(this);
  const q = G.world.doom && G.world.doom.quest;
  if (q && q.x != null) {
    const p = this.iso(q.x, q.y, 0);
    const bob = Math.sin(this.t / 300) * 4;
    c.fillStyle = '#ffd76a'; c.strokeStyle = '#5a4210'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(p.x, p.y - 88 + bob); c.lineTo(p.x + 9, p.y - 76 + bob); c.lineTo(p.x, p.y - 64 + bob); c.lineTo(p.x - 9, p.y - 76 + bob); c.closePath(); c.fill(); c.stroke();
  }
  if (spiritCam && OpeningCutscene.spirit.stage !== 'mother') this.drawSpiritFlight(OpeningCutscene.spirit);
  c.restore();
  this.drawCompass();
  this.drawMinimap();
  const v = c.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.35, this.w / 2, this.h / 2, this.h * 0.9);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.4)');
  c.fillStyle = v; c.fillRect(0, 0, this.w, this.h);
  if (G.world.era.type === 'war') this.drawEmbers();
};

// White pixel spirit + short trail for the opening cutscene tracking shot.
Render.drawSpiritFlight = function (spirit) {
  if (!spirit) return;
  const c = this.ctx;
  const lift = (pt) => {
    const p = this.iso(pt.x, pt.y, 0);
    return { x: p.x, y: p.y - (pt.alt || 0) };
  };
  const now = performance.now();
  const trail = spirit.trail || [];
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    if (pt.mode === 'approach') continue;
    const age = (now - pt.t) / 700;
    if (age > 1) continue;
    const p = lift(pt);
    const a = (1 - age) * 0.55;
    c.fillStyle = `rgba(255,252,240,${a})`;
    const sz = 2 + (1 - age) * 2;
    c.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  const p = lift(spirit);
  const pulse = 0.75 + Math.sin(now / 90) * 0.25;
  c.fillStyle = `rgba(255,255,255,${0.35 * pulse})`;
  c.beginPath(); c.arc(p.x, p.y, 7 * pulse, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fffef6';
  c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  c.fillStyle = 'rgba(200,230,255,0.85)';
  c.fillRect(p.x - 1, p.y - 1, 2, 2);
};

// ---------------------------------------------------------------- opening 2.5D approach (town → belly)
// Camera looks toward decreasing world-z (dolly into town). Pitch tips the view for foreshortening.
Render.spiritProj = function (spirit, x, y, z) {
  const cam = spirit.cam || { x: 0, y: 2, z: 10, pitch: 0, fov: 1 };
  const W = this.w, H = this.h;
  const focal = Math.min(H * 0.98, W * 0.82) * (cam.fov || 1);
  const hz = H * (0.42 + Math.max(-0.08, Math.min(0.12, (cam.pitch || 0) * 0.35)));
  const rx = x - (cam.x || 0);
  const ry = y - (cam.y || 0);
  // Depth ahead of camera (camera faces -Z along the street).
  let depth = (cam.z || 0) - z;
  // Pitch: negative looks down so distant ground rises toward horizon.
  const pitch = cam.pitch || 0;
  const cos = Math.cos(pitch), sin = Math.sin(pitch);
  const ry2 = ry * cos - depth * sin;
  depth = ry * sin + depth * cos;
  depth = Math.max(0.45, depth);
  return {
    x: W / 2 + (rx * focal) / depth,
    y: hz - (ry2 * focal) / depth,
    depth,
    scale: focal / depth,
  };
};

Render.drawSpiritApproach = function (spirit) {
  if (!spirit) return;
  const c = this.ctx;
  const W = this.w, H = this.h;
  const stage = spirit.stage || 'town';
  const stageProg = spirit.stageProgress || 0;
  const seed = spirit.seed || 1;
  const rng = (k) => ((seed * (k + 7) * 9301 + 49297) % 233280) / 233280;
  const camZ = (spirit.cam && spirit.cam.z) || 12;
  const P = (x, y, z) => this.spiritProj(spirit, x, y, z);
  const q = (pts, fill) => {
    if (!pts || pts.length < 3) return;
    // Skip degenerate / behind-camera quads
    if (pts.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
    c.fill();
  };

  // --- sky / atmosphere
  const sky = c.createLinearGradient(0, 0, 0, H);
  if (stage === 'belly') {
    sky.addColorStop(0, '#3a1018'); sky.addColorStop(0.5, '#6a2438'); sky.addColorStop(1, '#1a080e');
  } else if (stage === 'room') {
    sky.addColorStop(0, '#1c1410'); sky.addColorStop(1, '#3a2818');
  } else if (stage === 'house') {
    sky.addColorStop(0, '#2a2018'); sky.addColorStop(0.55, '#4a3828'); sky.addColorStop(1, '#1a120e');
  } else {
    sky.addColorStop(0, eraTint('#3a5578'));
    sky.addColorStop(0.5, eraTint('#7a9ab8'));
    sky.addColorStop(1, eraTint('#c8b090'));
  }
  c.fillStyle = sky; c.fillRect(0, 0, W, H);

  // Far hills + rooftop parallax (screen-space layer drifting with cam z)
  if (stage === 'town' || stage === 'neighborhood') {
    const hillShift = (26 - camZ) * 5;
    c.fillStyle = eraTint('#4a5a48');
    c.beginPath();
    c.moveTo(-20, H * 0.48);
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * (W + 40) - 20 + hillShift * 0.2;
      c.lineTo(x, H * 0.34 + Math.sin(i * 0.9 + seed * 0.01) * 16 - (stage === 'town' ? 8 : -4));
    }
    c.lineTo(W + 20, H * 0.55); c.lineTo(-20, H * 0.55); c.closePath(); c.fill();
    for (let i = 0; i < 16; i++) {
      const x = ((i * 0.07 + rng(i) * 0.02) % 1) * W - 10 + hillShift * 0.45;
      const hgt = 14 + rng(i + 3) * 26;
      const y = H * 0.42 - hgt + (stage === 'neighborhood' ? 18 : 0);
      c.fillStyle = eraTint('#6a4a3a');
      c.fillRect(x, y, 18 + rng(i + 1) * 16, hgt);
      c.fillStyle = eraTint(['#8c3b2a', '#5b4a8a', '#7a3022'][i % 3]);
      c.beginPath();
      c.moveTo(x - 2, y);
      c.lineTo(x + 10 + rng(i) * 6, y - 8 - rng(i + 2) * 5);
      c.lineTo(x + 24 + rng(i + 1) * 8, y);
      c.closePath(); c.fill();
    }
  }

  const street = stage === 'town' || stage === 'neighborhood' || stage === 'house';
  // distance haze: far things fade in out of the mist instead of appearing
  const haze = (z) => Math.max(0, Math.min(1, (30 - (camZ - z)) / 12));
  const withHaze = (z, fn) => { const a = haze(z); if (a <= 0.01) return; c.save(); c.globalAlpha *= a; fn(); c.restore(); };

  // Ground: grass verges, a cobbled street down the middle, all the way to the bottom of the screen
  if (stage !== 'belly') {
    const nearZ = Math.max(0.6, camZ - 0.5);
    const farZ = Math.min(nearZ - 1, 1.2);
    const indoor = stage === 'room' || (stage === 'house' && stageProg > 0.6);
    const grass = indoor ? '#4a3428' : eraTint('#55683f');
    const stone = indoor ? '#4a3428' : eraTint('#9b8b70');
    const gl = P(-9, 0, farZ), gr = P(9, 0, farZ), nl = P(-9, 0, nearZ), nr = P(9, 0, nearZ);
    q([gl, gr, nr, nl], grass);
    c.fillStyle = grass; c.fillRect(0, Math.min(nl.y, nr.y), W, H);
    if (street && !indoor) {
      const sl = P(-2.5, 0, farZ), sr = P(2.5, 0, farZ), snl = P(-2.5, 0, nearZ), snr = P(2.5, 0, nearZ);
      q([sl, sr, snr, snl], stone);
      // carry the street off the bottom edge
      c.beginPath(); c.moveTo(snl.x, snl.y); c.lineTo(snr.x, snr.y); c.lineTo(snr.x + (snr.x - sr.x) * 3, H + 40); c.lineTo(snl.x + (snl.x - sl.x) * 3, H + 40); c.closePath(); c.fill();
      // cobble courses: rows get closer together in the distance
      c.strokeStyle = 'rgba(40,30,20,0.22)'; c.lineWidth = 1;
      for (let z = Math.floor(nearZ * 2) / 2; z > farZ; z -= 0.5) {
        const l = P(-2.5, 0, z), r = P(2.5, 0, z);
        c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(r.x, r.y); c.stroke();
      }
      c.strokeStyle = 'rgba(255,240,210,0.10)';
      for (const x of [-1.25, 0, 1.25]) { const a1 = P(x, 0, nearZ), b1 = P(x, 0, farZ); c.beginPath(); c.moveTo(a1.x, a1.y); c.lineTo(b1.x, b1.y); c.stroke(); }
      // kerbs
      c.strokeStyle = 'rgba(30,22,16,0.45)'; c.lineWidth = 2;
      for (const x of [-2.5, 2.5]) { const a1 = P(x, 0, nearZ), b1 = P(x, 0, farZ); c.beginPath(); c.moveTo(a1.x, a1.y); c.lineTo(b1.x, b1.y); c.stroke(); }
    }
  }

  // The house the spirit is heading for stands at the end of the street from the very first frame,
  // small in the haze, and grows as the camera travels toward it.
  const doorZ = 2.6;
  if (street && doorZ < camZ - 0.35 && !(stage === 'house' && stageProg > 0.7)) {
    withHaze(doorZ, () => {
      const wall = '#b89a74';
      const a0 = P(-1.6, 0, doorZ), a1 = P(1.6, 0, doorZ), t1 = P(1.6, 3.5, doorZ), t0 = P(-1.6, 3.5, doorZ);
      q([a1, P(1.6, 0, doorZ - 0.7), P(1.6, 3.5, doorZ - 0.7), t1], shade(eraTint(wall), -0.25));
      q([a0, a1, t1, t0], eraTint(wall));
      q([t0, t1, P(0, 4.6, doorZ)], eraTint('#7a3022'));
      q([P(0.7, 3.9, doorZ - 0.2), P(1.05, 3.9, doorZ - 0.2), P(1.05, 4.7, doorZ - 0.2), P(0.7, 4.7, doorZ - 0.2)], shade(eraTint('#7a6a5a'), -0.1)); // chimney
      q([P(-1.2, 2.3, doorZ + 0.01), P(-0.75, 2.3, doorZ + 0.01), P(-0.75, 2.9, doorZ + 0.01), P(-1.2, 2.9, doorZ + 0.01)], 'rgba(255,214,140,0.75)');
      q([P(0.75, 2.3, doorZ + 0.01), P(1.2, 2.3, doorZ + 0.01), P(1.2, 2.9, doorZ + 0.01), P(0.75, 2.9, doorZ + 0.01)], 'rgba(255,214,140,0.75)');
      q([P(-0.5, 0, doorZ + 0.02), P(0.5, 0, doorZ + 0.02), P(0.5, 2.15, doorZ + 0.02), P(-0.5, 2.15, doorZ + 0.02)], '#0e0a0c');
      const door = P(0, 1.05, doorZ);
      const gr = Math.max(20, Math.min(90, door.scale * 1.4));
      const glow = c.createRadialGradient(door.x, door.y, 2, door.x, door.y, gr);
      glow.addColorStop(0, 'rgba(255,180,100,0.45)'); glow.addColorStop(1, 'rgba(255,180,100,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(door.x, door.y, gr, 0, Math.PI * 2); c.fill();
      // smoke from the chimney: a home, lived in
      for (let i = 0; i < 4; i++) {
        const k = ((this.t / 2400) + i / 4) % 1;
        const sp2 = P(0.88 + k * 0.6, 4.8 + k * 2.2, doorZ - 0.2);
        c.fillStyle = `rgba(220,220,225,${0.28 * (1 - k)})`;
        c.beginPath(); c.arc(sp2.x, sp2.y, Math.max(2, sp2.scale * (0.18 + k * 0.35)), 0, Math.PI * 2); c.fill();
      }
    });
  }

  // Street buildings, lamps and townsfolk: fixed in the world, drawn far → near, so the camera
  // really travels down the lane past them.
  if (stage === 'town' || stage === 'neighborhood' || (stage === 'house' && stageProg < 0.45)) {
    const clipZ = camZ - 0.45;
    const drawBuilding = (side, z0, z1, hgt, col, roof) => {
      if (z1 >= camZ - 0.4) return;
      z0 = Math.min(z0, clipZ);
      const sx = side === 'L' ? -2.6 : 2.6;
      const out = side === 'L' ? -1 : 1;
      const a0 = P(sx, 0, z0), a1 = P(sx, 0, z1), t1 = P(sx, hgt, z1), t0 = P(sx, hgt, z0);
      const f0 = P(sx + out * 2.2, 0, z0), f1 = P(sx + out * 2.2, hgt, z0);
      q([a0, f0, f1, t0], shade(eraTint(col), -0.22));
      q([a0, a1, t1, t0], eraTint(col));
      q([t0, t1, P(sx + out * 1.15, hgt + 1.05, z1), P(sx + out * 1.15, hgt + 1.05, z0)], eraTint(roof));
      const n = Math.max(1, Math.round((z0 - z1) / 0.9));
      for (let i = 0; i < n; i++) {
        const za = z0 - (i + 0.3) * (z0 - z1) / n;
        const zb = za - 0.28 * (z0 - z1) / n;
        q([P(sx, hgt * 0.55, za), P(sx, hgt * 0.55, zb), P(sx, hgt * 0.72, zb), P(sx, hgt * 0.72, za)], 'rgba(40,30,25,0.72)');
        if (hgt > 3.2) q([P(sx, hgt * 0.28, za), P(sx, hgt * 0.28, zb), P(sx, hgt * 0.42, zb), P(sx, hgt * 0.42, za)], 'rgba(255,220,140,0.45)');
      }
    };
    const drawLamp = (x, z) => {
      if (z >= camZ - 0.5) return;
      const b0 = P(x, 0, z), t0 = P(x, 2.1, z);
      c.strokeStyle = 'rgba(30,24,20,0.9)'; c.lineWidth = Math.max(1, b0.scale * 0.06);
      c.beginPath(); c.moveTo(b0.x, b0.y); c.lineTo(t0.x, t0.y); c.stroke();
      const r = Math.max(4, t0.scale * 0.5);
      const g = c.createRadialGradient(t0.x, t0.y, 1, t0.x, t0.y, r);
      g.addColorStop(0, 'rgba(255,224,150,0.95)'); g.addColorStop(0.25, 'rgba(255,196,110,0.45)'); g.addColorStop(1, 'rgba(255,190,100,0)');
      c.fillStyle = g; c.beginPath(); c.arc(t0.x, t0.y, r, 0, Math.PI * 2); c.fill();
    };
    const folk = [
      { x: -1.7, z: 5.2, tunic: '#6a4a3a', g: 'woman' }, { x: 1.5, z: 8.4, tunic: '#3d5a80', g: 'man' },
      { x: -1.3, z: 12.6, tunic: '#5a6a3a', g: 'man' }, { x: 1.8, z: 15.8, tunic: '#7a3a4a', g: 'woman' },
      { x: -1.9, z: 19.5, tunic: '#4a4a6a', g: 'man' }, { x: 0.9, z: 23.2, tunic: '#6a5a3a', g: 'woman' },
    ];
    const items = [];
    for (let k = 0; k < 14; k++) {
      const z0 = 4.4 + k * 1.8 + rng(k) * 0.3;
      const z1 = z0 - 1.4 - rng(k + 1) * 0.3;
      items.push({ z: (z0 + z1) / 2, draw: () => drawBuilding('L', z0, z1, 2.5 + rng(k + 2) * 1.9, ['#c9b08a', '#d4c3a0', '#bfa57d'][k % 3], ['#8c3b2a', '#5b4a8a', '#7a3022'][k % 3]) });
      const r0 = z0 - 0.5, r1 = r0 - 1.3 - rng(k + 4) * 0.3;
      items.push({ z: (r0 + r1) / 2, draw: () => drawBuilding('R', r0, r1, 2.3 + rng(k + 5) * 2.1, ['#d8cbb0', '#a99478', '#c9b08a'][k % 3], ['#4a5a6a', '#6b4a2a', '#8c3b2a'][k % 3]) });
    }
    for (let z = 4; z < 28; z += 4.5) { items.push({ z, draw: () => drawLamp(-2.3, z) }); items.push({ z: z + 2.2, draw: () => drawLamp(2.3, z + 2.2) }); }
    folk.forEach((f, i) => items.push({ z: f.z, draw: () => {
      if (f.z >= camZ - 0.8) return;
      const sway = Math.sin(this.t / 700 + i) * 0.12;
      const foot = P(f.x + sway, 0, f.z);
      const sc = foot.scale / 46;
      if (sc < 0.08 || sc > 6) return;
      this.drawFigure(foot.x, foot.y, { skin: '#c9a88a', hair: '#3a2418', tunic: f.tunic, stage: 'prime', race: 'human', gender: f.g, hairStyle: f.g === 'woman' ? 'long' : 'short', hScale: 1, wScale: 1 }, sc, {});
    } }));
    items.sort((a2, b2) => a2.z - b2.z); // far first
    for (const it of items) withHaze(it.z, it.draw);
  }

  // Interior box (house → room → belly)
  if (stage === 'house' || stage === 'room' || stage === 'belly') {
    const fade = stage === 'house' ? Math.min(1, Math.max(0, (stageProg - 0.25) / 0.75)) : 1;
    c.save();
    c.globalAlpha = fade;
    const back = Math.max(0.35, camZ - (stage === 'belly' ? 1.15 : stage === 'room' ? 1.55 : 1.9));
    const near = Math.max(back + 0.35, camZ - 0.55);
    const bw = stage === 'belly' ? 0.7 : 1.45;
    const bh = stage === 'belly' ? 1.5 : 2.55;
    const warm = stage === 'belly';
    q([P(-bw, 0, back), P(bw, 0, back), P(bw * 1.8, 0, near), P(-bw * 1.8, 0, near)], warm ? '#4a1824' : '#4a3428');
    q([P(-bw, 0, back), P(-bw, bh, back), P(-bw * 1.8, bh * 1.1, near), P(-bw * 1.8, 0, near)], warm ? '#5a2030' : '#5a4030');
    q([P(bw, 0, back), P(bw, bh, back), P(bw * 1.8, bh * 1.1, near), P(bw * 1.8, 0, near)], warm ? '#2e1018' : '#3a2818');
    q([P(-bw, bh, back), P(bw, bh, back), P(bw * 1.8, bh * 1.1, near), P(-bw * 1.8, bh * 1.1, near)], warm ? '#1a080e' : '#2a1c18');
    q([P(-bw, 0, back), P(bw, 0, back), P(bw, bh, back), P(-bw, bh, back)], warm ? '#6a2840' : '#6a4a38');

    if (stage !== 'belly') {
      const bedZ = (back + near) * 0.55;
      q([P(-0.95, 0.05, bedZ), P(0.95, 0.05, bedZ), P(0.95, 0.5, bedZ), P(-0.95, 0.5, bedZ)], '#6a4a3a');
      q([P(-0.9, 0.5, bedZ), P(0.9, 0.5, bedZ), P(0.9, 0.62, bedZ - 0.15), P(-0.9, 0.62, bedZ - 0.15)], '#8a6a5a');
      q([P(-0.4, 1.35, back + 0.02), P(0.4, 1.35, back + 0.02), P(0.4, 2.05, back + 0.02), P(-0.4, 2.05, back + 0.02)], 'rgba(255,210,140,0.4)');
      // Side props
      q([P(-1.2, 0, back + 0.25), P(-0.85, 0, back + 0.25), P(-0.85, 1.1, back + 0.25), P(-1.2, 1.1, back + 0.25)], '#5a4030');
    }
    c.restore();
  }

  // Mother paper-doll (room → belly) — keep her framed in the viewport
  if (stage === 'room' || stage === 'belly') {
    const motherAlpha = stage === 'room' ? Math.min(1, 0.55 + stageProg * 0.6) : 1;
    c.save();
    c.globalAlpha = motherAlpha;
    const mx = 0;
    const mz = Math.max(0.55, camZ - (stage === 'belly' ? 0.85 : 1.15));
    let foot = P(mx, 0.02, mz);
    // Fallback screen placement if projection drifts off-frame at extreme dolly.
    if (foot.y > H * 0.92 || foot.y < H * 0.2 || foot.x < 0 || foot.x > W) {
      foot = { x: W / 2, y: H * (stage === 'belly' ? 0.62 : 0.7), depth: 1, scale: 80 };
    }
    const sc = Math.max(0.7, Math.min(2.4, (foot.scale || 80) / 55)) * (stage === 'belly' ? 1.35 + stageProg * 0.7 : 1.05);
    const look = {
      skin: '#c9a88a', hair: '#3a2418', tunic: '#5a3a4a', stage: 'prime', race: 'human',
      gender: 'woman', hairStyle: 'long', beard: false, hScale: 1, wScale: 1.12,
    };
    this.drawFigure(foot.x, foot.y, look, sc, {});
    const bellyY = foot.y - 18 * sc;
    const br = 14 * sc * (stage === 'belly' ? 1.55 + stageProg : 1);
    const bg = c.createRadialGradient(foot.x, bellyY, 2, foot.x, bellyY, br);
    bg.addColorStop(0, `rgba(180,70,90,${0.35 + (spirit.motherK || 0) * 0.4})`);
    bg.addColorStop(1, 'rgba(160,60,80,0)');
    c.fillStyle = bg;
    c.beginPath(); c.arc(foot.x, bellyY, br, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // Belly bloom
  if (stage === 'belly') {
    const k = spirit.motherK || stageProg;
    const sp = spirit.spiritLocal || { x: 0, y: 1, z: camZ - 0.8 };
    const core = P(sp.x, sp.y, sp.z);
    const bloom = c.createRadialGradient(core.x, core.y, 6, W / 2, H * 0.55, Math.max(W, H) * (0.35 + k * 0.3));
    bloom.addColorStop(0, `rgba(255,140,160,${0.2 + k * 0.25})`);
    bloom.addColorStop(0.4, `rgba(90,24,40,${0.3 + k * 0.2})`);
    bloom.addColorStop(1, `rgba(8,2,6,${0.4 + k * 0.35})`);
    c.fillStyle = bloom; c.fillRect(0, 0, W, H);
  }

  this.drawSpiritApproachSprite(spirit);

  const v = c.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, stage === 'belly' ? 'rgba(10,2,6,0.72)' : 'rgba(0,0,0,0.42)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
};

Render.drawSpiritApproachSprite = function (spirit) {
  if (!spirit) return;
  const c = this.ctx;
  const now = performance.now();
  const sp = spirit.spiritLocal || { x: 0, y: 1.5, z: 5 };
  const trail = spirit.trail || [];
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    if (pt.mode !== 'approach') continue;
    const age = (now - pt.t) / 650;
    if (age > 1) continue;
    const p = this.spiritProj(spirit, pt.x, pt.y, pt.z);
    const a = (1 - age) * 0.65;
    const sz = Math.max(2, 3.2 * (p.scale / 70) * (1 - age));
    c.fillStyle = `rgba(255,252,240,${a})`;
    c.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  const p = this.spiritProj(spirit, sp.x, sp.y, sp.z);
  const pulse = 0.75 + Math.sin(now / 90) * 0.25;
  const glowR = Math.max(5, 7 * (p.scale / 60) * pulse);
  c.fillStyle = `rgba(255,255,255,${0.45 * pulse})`;
  c.beginPath(); c.arc(p.x, p.y, glowR, 0, Math.PI * 2); c.fill();
  const pix = Math.max(2.5, 3.5 * (p.scale / 80));
  c.fillStyle = '#fffef6';
  c.fillRect(p.x - pix / 2, p.y - pix / 2, pix, pix);
  c.fillStyle = 'rgba(200,230,255,0.95)';
  c.fillRect(p.x - pix / 3, p.y - pix / 3, pix * 0.66, pix * 0.66);
};
Render.drawWorldTiles = function () {
  const c = this.ctx;
  const map = G.world.map;
  // sky
  const sky = c.createLinearGradient(0, 0, 0, this.h);
  sky.addColorStop(0, eraTint('#253a55')); sky.addColorStop(1, eraTint('#0f1a26'));
  c.fillStyle = sky; c.fillRect(0, 0, this.w, this.h);

  // camera follows party (or opening-cutscene spirit)
  const spiritCam = typeof OpeningCutscene !== 'undefined' && OpeningCutscene.spirit && OpeningCutscene.spirit.active;
  const pp = this.partyWorldPos();
  const camSrc = spiritCam ? OpeningCutscene.spirit : pp;
  const [prx, pry] = this.rotXY(camSrc.x, camSrc.y);
  const tx = this.w / 2 - (prx - pry) * TW / 2;
  const ty = this.h / 2 - (prx + pry) * TH / 2 + (spiritCam ? 0 : pp.h * HSTEP);
  this.cam.x += (tx - this.cam.x) * (spiritCam ? 0.28 : 0.12);
  this.cam.y += (ty - this.cam.y) * (spiritCam ? 0.28 : 0.12);
  if (!this.camInit) { this.cam.x = tx; this.cam.y = ty; this.camInit = true; }
  this.zoom += (this.zoomTarget - this.zoom) * 0.18;

  this.hover = this.mouse && !this.move && !Living.moving ? this.pickTile(this.mouse) : null;
  c.save();
  // zoom about the centre; a quick squash when the view rotates
  const sk = this.spin ? clamp((this.t - this.spin) / 220, 0, 1) : 1;
  c.translate(this.w / 2, this.h / 2);
  c.scale(this.zoom * (0.75 + 0.25 * sk), this.zoom);
  c.translate(-this.w / 2, -this.h / 2);
  if (this.hover && this.hover !== this.lastHover) {
    this.lastHover = this.hover;
    this.hoverPath = findPath(tileAt(G.pos.x, G.pos.y), this.hover) || [];
  }
  if (!this.hover) this.hoverPath = [];
  const pathSet = new Set((this.hoverPath || []).map((t) => t.y * map.W + t.x));

  const partyTileOrder = Math.round(prx) + Math.round(pry);
  let partyDrawn = false;
  // other parties on the road, drawn in depth order with the tiles
  const agentsAt = new Map();
  for (const a of Living.visibleAgents()) {
    const [ax, ay] = this.rotXY(a.x, a.y);
    const k = Math.round(ax) + Math.round(ay);
    if (!agentsAt.has(k)) agentsAt.set(k, []);
    agentsAt.get(k).push(a);
  }
  for (const a of G.world.parties || []) if (!Living.visible(a)) a._sx = null;
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
    for (const a of agentsAt.get(s) || []) Living.drawAgent(this, a);
    if (!spiritCam && (s === partyTileOrder || (s === map.W + map.H - 2 && !partyDrawn))) {
      if (!partyDrawn) { Living.drawDest(this); this.drawParty(pp); partyDrawn = true; }
    }
  }
  // labels
  c.font = '600 12px Georgia, serif';
  c.textAlign = 'center';
  for (const t of map.tiles) {
    if (!t.feature) continue;
    if (typeof LocationPrompt !== 'undefined' && LocationPrompt.hidesLabel(t)) continue;
    const p = this.iso(t.x, t.y, t.h);
    const zx = (p.x - this.w / 2) * this.zoom + this.w / 2, zy = (p.y - this.h / 2) * this.zoom + this.h / 2;
    if (zx < -60 || zx > this.w + 60 || zy < -60 || zy > this.h + 100) continue;
    const town = t.feature === 'town' ? G.world.towns[t.townIdx] : null;
    const label = town ? `${town.name}${town.size >= 4 ? ' ★' : ''}` : t.feature === 'estate' ? `House ${G.house.name}` : t.feature === 'church' ? Church.nameFor(t)
      : Events.label(t) ? Events.label(t) : t.feature === 'spire' ? 'The Black Spire' : t.feature === 'shrine' ? (t.lit ? 'Beacon (lit)' : 'Beacon Shrine')
        : `${t.ruinOf ? 'Ruins of ' + t.ruinOf : 'Ruins'}${t.cleared ? ' (cleared)' : ''}`;
    c.fillStyle = 'rgba(0,0,0,0.55)';
    const w = c.measureText(label).width + 10;
    c.fillRect(p.x - w / 2, p.y - 70, w, 17);
    c.fillStyle = t.feature === 'estate' ? '#ffd98a' : '#f2ead8';
    c.fillText(label, p.x, p.y - 57);
  }
  Living.drawLabels(this);
  const q = G.world.doom && G.world.doom.quest;
  if (q && q.x != null) {
    const qt = tileAt(q.x, q.y);
    const p = this.iso(q.x, q.y, qt.h);
    const bob = Math.sin(this.t / 300) * 4;
    c.fillStyle = '#ffd76a'; c.strokeStyle = '#5a4210'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(p.x, p.y - 96 + bob); c.lineTo(p.x + 9, p.y - 84 + bob); c.lineTo(p.x, p.y - 72 + bob); c.lineTo(p.x - 9, p.y - 84 + bob); c.closePath(); c.fill(); c.stroke();
  }
  if (spiritCam && OpeningCutscene.spirit.stage !== 'mother') this.drawSpiritFlight(OpeningCutscene.spirit);
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
  const mini = UI.isMobile() && UI.mob && UI.mob.mini;
  const c = mini ? mini.getContext('2d') : this.ctx, map = G.world.map;
  const size = mini ? mini.width : Math.min(150, this.w * (this.w < 500 ? 0.26 : 0.22)), px = size / map.W;
  const x0 = mini ? 0 : 10, y0 = x0;
  if (mini) c.clearRect(0, 0, size, size);
  if (!this.mini || this.miniKey !== G.world.towns.length + ':' + Math.floor(G.day / 360) + ':' + this.rot + ':' + (LS.k || '')) {
    const cv = this.mini || document.createElement('canvas');
    cv.width = map.W; cv.height = map.H;
    const m = cv.getContext('2d');
    if (LS.ready && LS.tex) { cv.width = LS.tex.width / 4; cv.height = LS.tex.height / 4; m.drawImage(LS.tex, 0, 0, cv.width, cv.height); }
    else for (const t of map.tiles) { m.fillStyle = GD.BIOMES[t.type].top; m.fillRect(t.x, t.y, 1, 1); }
    this.mini = cv; this.miniKey = G.world.towns.length + ':' + Math.floor(G.day / 360) + ':' + this.rot + ':' + (LS.k || '');
  }
  c.save();
  c.globalAlpha = 0.92;
  if (!mini) { c.fillStyle = 'rgba(15,13,20,0.8)'; c.fillRect(x0 - 3, y0 - 3, size + 6, size + 6); }
  c.imageSmoothingEnabled = false;
  c.drawImage(this.mini, x0, y0, size, size);
  const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(x0 + (x + 0.5) * px, y0 + (y + 0.5) * px, r * (mini ? 1.65 : 1), 0, Math.PI * 2); c.fill(); };
  for (const t of G.world.towns) if (!t.fallen) dot(t.x, t.y, '#f2ead8', 2);
  dot(G.world.spire.x, G.world.spire.y, '#b04aff', 3);
  const q = G.world.doom.quest;
  if (q && q.x != null) dot(q.x, q.y, '#ffd76a', 2.5);
  dot(G.world.estate.x, G.world.estate.y, G.house.color, 3);
  for (const a of Living.visibleAgents()) dot(a.x, a.y, AGENTS[a.kind].hostile ? '#ff5c5c' : '#e6c06a', 1.8);
  dot(G.ppos ? G.ppos.x : G.pos.x, G.ppos ? G.ppos.y : G.pos.y, '#ffffff', 2.5);
  c.fillStyle = '#a59c8e'; c.font = '10px Georgia, serif'; c.textAlign = 'left';
  if (!mini) c.fillText('N ↑ (map)', x0, y0 + size + 13);
  c.restore();
};

Render.drawCompass = function () {
  const compass = UI.isMobile() && UI.mob && UI.mob.compass;
  const c = compass ? compass.getContext('2d') : this.ctx;
  const cx = compass ? 22 : this.w - (this.w < 700 ? 84 : 44), cy = compass ? 22 : this.w < 700 ? 100 : 44;
  c.save();
  if (compass) {
    c.clearRect(0, 0, compass.width, compass.height);
    c.scale(2, 2);
  }
  const [ax, ay] = this.rotXY(G.world.map.W / 2, 0);
  const [bx, by] = this.rotXY(G.world.map.W / 2, G.world.map.H);
  const vx = ((ax - ay) - (bx - by)) * TW / 2, vy = ((ax + ay) - (bx + by)) * TH / 2;
  const len = Math.hypot(vx, vy) || 1;
  c.fillStyle = 'rgba(15,13,20,0.7)'; c.beginPath(); c.arc(cx, cy, 22, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e6c06a'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - vx / len * 14, cy - vy / len * 14); c.lineTo(cx + vx / len * 14, cy + vy / len * 14); c.stroke();
  c.fillStyle = '#e6c06a'; c.font = 'bold 11px Georgia, serif'; c.textAlign = 'center';
  c.fillText('N', cx + vx / len * 16, cy + vy / len * 16 + 4);
  c.restore();
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
  if (t.type === 'hills' && !t.feature && !this.flat) {
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
  WorldArt.drawSite(this, t);
  if (t.feature === 'town') this.drawTown(p, G.world.towns[t.townIdx]);
  if (t.feature === 'estate') this.drawEstate(p, G.house.tier);
  if (t.feature === 'ruins') this.drawRuins(p, t.cleared);
  if (t.feature === 'spire') this.drawSpire(p);
  if (t.feature === 'shrine') this.drawShrine(p, t.lit);
  if (t.feature === 'church') this.drawChurch(p, t);
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
  Heraldry.paint(c, G.house.heraldry, bx, by - 8, 22, 15);
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
  if (this.flat && LS.ready) p.y -= LS.bridgeLift(pp.x, pp.y); // up and over a bridge
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
    this.drawFigure(p.x - 10 - i * 7, p.y + 2 - i * 3, figLook(c), 0.55, { bob: (this.move || Living.moving) ? Math.sin(this.t / 90 + i) : 0 });
  });
  this.drawFigure(p.x + 4, p.y + 6, figLook(mc), 0.62, { bob: (this.move || Living.moving) ? Math.sin(this.t / 90) : 0, banner: G.house.color });
};

function figLook(c, overlay) {
  const inj = {};
  for (const k of c.injuries || []) if (GD.INJURIES[k].look) inj[GD.INJURIES[k].look] = true;
  const full = Equip.isChar(c);
  if (full) Equip.ensureChar(c);
  const eq = overlay || (full && c.equip) || {};
  const body = eq.body;
  const head = eq.head;
  const feet = eq.feet;
  const hand = eq.hand;
  const off = eq.offhand;
  const armorTier = body ? body.tier : (full && c.gear && c.gear.armor) || 0;
  const clsKey = full ? classFor(c) : (c.cls && GD.CLASSES[c.cls] ? c.cls : null);
  const stage = (c.born != null && c.lifespan != null) ? stageKey(c) : (c.stage || 'prime');
  return {
    skin: (GD.RACES[c.race] || GD.RACES.human).skin, hair: c.hair, tunic: c.tunic, stage, race: c.race || 'human', evil: c.evil,
    house: full && G && G.house && c.house === G.house.name, inj, armor: armorTier,
    bodyStyle: body ? (body.kind === 'robe' ? 'robe' : body.kind === 'leather' ? 'leather' : 'armor') : null,
    headStyle: head ? head.kind : null, headTier: head ? head.tier : 0,
    feetStyle: feet ? feet.kind : null, feetTier: feet ? feet.tier : 0,
    weapon: hand && hand.weapon ? hand.weapon : (off && off.weapon === 'shield' ? 'shield' : ((clsKey && GD.CLASSES[clsKey]) || {}).weapon || null),
    hasShield: !!(off && off.weapon === 'shield'),
    gender: c.gender || 'man', hairStyle: c.hairStyle || 'short', beard: !!c.beard,
    hScale: GD.HEIGHTS[c.height || 'average'].scale, wScale: GD.BUILDS[c.build || 'average'].width,
    cane: c.condition === 'lame', cloudy: c.condition === 'cloudedEye',
  };
}
const ARMOR_COLORS = ['', '#7d7f84', '#a9b1b9', '#c8d0d8', '#d4b05a', '#8fd8f0'];
const ROBE_COLORS = ['', '#5a4a7a', '#6a5a9a', '#7a6aba', '#9a7ad4', '#c9a0ff'];
const LEATHER_COLORS = ['', '#6b4a32', '#7a5538', '#8a6440', '#a8782e', '#c49a4a'];
const HELM_COLORS = ['', '#7d7f84', '#a9b1b9', '#c8d0d8', '#d4b05a', '#8fd8f0'];
const CROWN_COLORS = ['', '#b08a4a', '#c9a24a', '#e0c27a', '#ffd76a', '#fff3a0'];

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
  // body gear: plate, leather, or flowing robes by class kit
  if (look.armor && !fl) {
    const style = look.bodyStyle || 'armor';
    if (style === 'robe') {
      const rc = ROBE_COLORS[look.armor] || ROBE_COLORS[1];
      c.fillStyle = rc;
      c.beginPath();
      c.moveTo(x - hip * s * wd - 1 * s, by + 2 * s); c.lineTo(x + hip * s * wd + 1 * s, by + 2 * s);
      c.lineTo(x + sh * s * wd + stoop * 0.5, by - 20 * s); c.lineTo(x - sh * s * wd + stoop * 0.5, by - 20 * s);
      c.closePath(); c.fill();
      c.fillStyle = shade(rc, 0.25);
      c.fillRect(x - 1.2 * s + stoop * 0.25, by - 18 * s, 2.4 * s, 16 * s);
    } else {
      const ac = style === 'leather' ? (LEATHER_COLORS[look.armor] || LEATHER_COLORS[1]) : ARMOR_COLORS[look.armor];
      c.fillStyle = ac;
      c.beginPath();
      c.moveTo(x - 6.5 * s * wd, by - 4 * s); c.lineTo(x + 6.5 * s * wd, by - 4 * s);
      c.lineTo(x + 6 * s * wd + stoop * 0.5, by - 18 * s); c.lineTo(x - 6 * s * wd + stoop * 0.5, by - 18 * s);
      c.closePath(); c.fill();
      c.fillStyle = shade(ac, 0.3); c.fillRect(x - 1 * s + stoop * 0.25, by - 17 * s, 2 * s, 12 * s);
      if (look.armor >= 2 && style === 'armor') {
        c.fillStyle = shade(ac, -0.15);
        c.beginPath(); c.arc(x - 8 * s * wd + stoop * 0.5, by - 18 * s, 3.5 * s, 0, Math.PI * 2); c.fill();
        if (!inj.arm) { c.beginPath(); c.arc(x + 8 * s * wd + stoop * 0.5, by - 18 * s, 3.5 * s, 0, Math.PI * 2); c.fill(); }
      }
    }
  }
  // boots / shoes
  if (look.feetStyle && !fl && !o.seated) {
    const dark = look.feetStyle === 'boots' ? '#2a2018' : '#4a3a55';
    c.fillStyle = dark;
    c.fillRect(x - 5.5 * s * wd, y - 4 * s, 5 * s * wd, 4 * s);
    if (!inj.leg) c.fillRect(x + 0.5 * s * wd, y - 4 * s, 5 * s * wd, 4 * s);
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
  // weapon (options override, else the look from equipped gear / class)
  const wield = o.weapon || look.weapon;
  if (wield && !(inj.arm && wield !== 'shield')) {
    const hx0 = x + 10 * s * wd, hy0 = by - 6 * s;
    const w = wield;
    if (w === 'bow') {
      c.strokeStyle = '#7a5a3a'; c.lineWidth = 2 * s;
      c.beginPath(); c.arc(hx0 + 4 * s, hy0 - 10 * s, 12 * s, -Math.PI * 0.45, Math.PI * 0.45); c.stroke();
      c.strokeStyle = '#e8e0c8'; c.lineWidth = 0.7 * s;
      c.beginPath(); c.moveTo(hx0 + 4 * s + Math.cos(-Math.PI * 0.45) * 12 * s, hy0 - 10 * s + Math.sin(-Math.PI * 0.45) * 12 * s); c.lineTo(hx0 + 4 * s + Math.cos(Math.PI * 0.45) * 12 * s, hy0 - 10 * s + Math.sin(Math.PI * 0.45) * 12 * s); c.stroke();
    } else if (w === 'lute') {
      c.fillStyle = '#9a6a3a'; c.beginPath(); c.ellipse(hx0 - 2 * s, hy0 - 4 * s, 5 * s, 4 * s, -0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(hx0, hy0 - 6 * s); c.lineTo(hx0 + 8 * s, hy0 - 16 * s); c.stroke();
      c.fillStyle = '#2a1a0a'; c.beginPath(); c.arc(hx0 - 2 * s, hy0 - 4 * s, 1.2 * s, 0, Math.PI * 2); c.fill();
    } else {
      if (w === 'banner') {
        c.strokeStyle = '#7a5a3a'; c.lineWidth = 2 * s;
        c.beginPath(); c.moveTo(hx0, hy0 + 4 * s); c.lineTo(hx0, by - 36 * s); c.stroke();
        c.fillStyle = look.house ? G.house.color : '#c9a227';
        c.beginPath();
        c.moveTo(hx0, by - 36 * s);
        c.lineTo(hx0 + 12 * s * wd, by - 32 * s);
        c.lineTo(hx0 + 12 * s * wd, by - 24 * s);
        c.lineTo(hx0, by - 28 * s);
        c.closePath(); c.fill();
        c.strokeStyle = '#e8e0c8'; c.lineWidth = 0.8 * s; c.stroke();
      } else {
      const staff = w === 'staff' || w === 'orb';
      const dagger = w === 'dagger';
      c.strokeStyle = staff || w === 'lance' ? '#7a5a3a' : '#cfd6dc'; c.lineWidth = (w === 'axe' ? 2.6 : dagger ? 1.8 : 2.2) * s;
      c.beginPath(); c.moveTo(hx0, hy0); c.lineTo(x + (dagger ? 14 : 18) * s * wd, by - (staff ? 34 : dagger ? 18 : 26) * s); c.stroke();
      if (dagger) {
        c.fillStyle = '#d8dde2';
        c.beginPath();
        c.moveTo(x + 14 * s * wd, by - 18 * s);
        c.lineTo(x + 16.5 * s * wd, by - 22 * s);
        c.lineTo(x + 12.5 * s * wd, by - 19 * s);
        c.closePath(); c.fill();
      }
      if (w === 'staff') { c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(x + 18 * s * wd, by - 35 * s, 3 * s, 0, Math.PI * 2); c.fill(); c.fillRect(x + 17 * s * wd, by - 41 * s, 2 * s, 5 * s); }
      if (w === 'orb') { const g = 0.6 + Math.sin(this.t / 200) * 0.3; c.fillStyle = `rgba(180,138,255,${g})`; c.beginPath(); c.arc(x + 18 * s * wd, by - 36 * s, 4.2 * s, 0, Math.PI * 2); c.fill(); }
      if (w === 'lance') {
        c.fillStyle = '#d8dde2'; c.beginPath(); c.moveTo(x + 18 * s * wd, by - 26 * s); c.lineTo(x + 20.5 * s * wd, by - 33 * s); c.lineTo(x + 16.5 * s * wd, by - 27 * s); c.closePath(); c.fill();
        c.fillStyle = look.house ? G.house.color : '#5a6a7a'; c.beginPath(); c.moveTo(x - 17 * s * wd, by - 17 * s); c.lineTo(x - 7 * s * wd, by - 17 * s); c.lineTo(x - 8 * s * wd, by - 6 * s); c.lineTo(x - 12 * s * wd, by - 1 * s); c.lineTo(x - 16 * s * wd, by - 6 * s); c.closePath(); c.fill();
        c.strokeStyle = '#cfd6dc'; c.lineWidth = 1 * s; c.stroke();
      }
      if (w === 'axe') { c.fillStyle = '#b8c0c8'; c.beginPath(); c.moveTo(x + 17 * s * wd, by - 24 * s); c.quadraticCurveTo(x + 26 * s * wd, by - 26 * s, x + 24 * s * wd, by - 17 * s); c.lineTo(x + 16 * s * wd, by - 20 * s); c.closePath(); c.fill(); }
      if (w === 'shield') { c.fillStyle = look.house ? G.house.color : '#6a6a6a'; c.beginPath(); c.ellipse(x - 12 * s * wd, by - 10 * s, 5 * s, 8 * s, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#cfd6dc'; c.lineWidth = 1 * s; c.stroke(); }
      }
    }
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
  // hair, in the person's own style (hidden under a full helm)
  const helmOn = look.headStyle === 'helm' && look.headTier;
  c.fillStyle = hair;
  const style = look.hairStyle || 'short';
  if (!helmOn) {
    if (style !== 'shaved') {
      c.beginPath(); c.arc(hx, hy - 1.5 * s, (style === 'crop' ? 6.6 : 6.9) * s, Math.PI * 1.05, Math.PI * 1.95); c.fill();
    } else {
      c.globalAlpha = 0.35; c.beginPath(); c.arc(hx, hy - 1 * s, 6.6 * s, Math.PI * 1.1, Math.PI * 1.9); c.fill(); c.globalAlpha = 1;
    }
    if (style === 'long') { c.fillRect(hx - 7 * s, hy - 2 * s, 2.6 * s, 11 * s); c.fillRect(hx + 4.4 * s, hy - 2 * s, 2.6 * s, 11 * s); }
    if (style === 'bun') { c.beginPath(); c.arc(hx - 3 * s, hy - 7.5 * s, 3 * s, 0, Math.PI * 2); c.fill(); }
    if (style === 'braid') { c.fillRect(hx - 6.8 * s, hy - 1 * s, 2.2 * s, 14 * s); c.beginPath(); c.arc(hx - 5.7 * s, hy + 13.5 * s, 1.6 * s, 0, Math.PI * 2); c.fill(); }
  }
  if (st === 'venerable' && !helmOn) { c.fillStyle = look.skin; c.beginPath(); c.arc(hx, hy - 4 * s, 3 * s, Math.PI, 0); c.fill(); }
  // headgear: helm, crown, or hood
  if (look.headStyle && look.headTier && !fl) {
    if (look.headStyle === 'helm') {
      const hc = HELM_COLORS[look.headTier] || HELM_COLORS[1];
      c.fillStyle = hc;
      c.beginPath(); c.arc(hx, hy - 1.5 * s, 7.2 * s, Math.PI, 0); c.fill();
      c.fillRect(hx - 7.2 * s, hy - 1.5 * s, 14.4 * s, 4 * s);
      c.fillStyle = shade(hc, -0.25);
      c.beginPath(); c.moveTo(hx - 3 * s, hy + 1 * s); c.lineTo(hx, hy - 2 * s); c.lineTo(hx + 3 * s, hy + 1 * s); c.closePath(); c.fill();
    } else if (look.headStyle === 'crown') {
      const cc = CROWN_COLORS[look.headTier] || CROWN_COLORS[1];
      c.fillStyle = cc;
      c.fillRect(hx - 6.5 * s, hy - 7 * s, 13 * s, 2.4 * s);
      for (let i = -2; i <= 2; i++) {
        c.fillRect(hx + i * 2.6 * s - 0.8 * s, hy - (i === 0 ? 11 : 9.5) * s, 1.6 * s, (i === 0 ? 4.5 : 3) * s);
      }
    } else if (look.headStyle === 'hood') {
      c.fillStyle = '#3a2a22';
      c.beginPath(); c.arc(hx, hy - 1 * s, 7.4 * s, Math.PI * 1.05, Math.PI * 1.95); c.fill();
      c.fillRect(hx - 7.5 * s, hy - 2 * s, 3 * s, 10 * s);
      c.fillRect(hx + 4.5 * s, hy - 2 * s, 3 * s, 10 * s);
    }
  }
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
    Heraldry.paint(c, G.house.heraldry, x - 12*s, y - 62*s, 26*s, 18*s);
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
  // On phones the move HUD overlays the bottom; keep the arena centered in the open upper band
  // but large enough that floor and scenery still read through the translucent sheet.
  const mobileBattle = typeof document !== 'undefined' && document.body.classList.contains('in-battle');
  const hudLift = mobileBattle ? Math.min(48, this.h * 0.05) : 0;
  const oy = this.h / 2 - (3.5 + 2.5) * BTH / 2 + 30 - hudLift;
  return { x: (gx - gy) * BTW / 2 + ox, y: (gx + gy) * BTH / 2 + oy };
};
// Floor / sky / decor driven by the tile the fight started on.
Render.battleScene = function () {
  const biomeKey = Battle.biome || 'grass';
  const biome = (GD.BIOMES && GD.BIOMES[biomeKey]) || GD.BIOMES.grass;
  const feat = Battle.feature;
  const kind = Battle.kind || 'wild';
  const dungeon = kind === 'dungeon' || feat === 'cave' || feat === 'mine' || feat === 'ruins';
  const voidish = kind === 'final' || feat === 'spire';
  const night = kind === 'rival' || feat === 'camp';
  let sky0 = '#5b7ea8', sky1 = '#c9b48a', haze = 'rgba(255,240,200,0.12)';
  if (voidish) { sky0 = '#0a0614'; sky1 = '#2a1438'; haze = 'rgba(180,100,255,0.12)'; }
  else if (dungeon) { sky0 = '#121018'; sky1 = '#2a2430'; haze = 'rgba(120,110,140,0.1)'; }
  else if (night) { sky0 = '#0c1020'; sky1 = '#2a2438'; haze = 'rgba(180,200,255,0.08)'; }
  else if (biomeKey === 'snow') { sky0 = '#6a8498'; sky1 = '#d8e4ec'; haze = 'rgba(255,255,255,0.14)'; }
  else if (biomeKey === 'desert' || biomeKey === 'sand') { sky0 = '#6a90b8'; sky1 = '#e8c888'; haze = 'rgba(255,210,120,0.16)'; }
  else if (biomeKey === 'swamp') { sky0 = '#3a4a48'; sky1 = '#6a7050'; haze = 'rgba(140,160,120,0.1)'; }
  else if (biomeKey === 'jungle') { sky0 = '#3a6080'; sky1 = '#7a9a50'; haze = 'rgba(120,180,100,0.1)'; }
  else if (biomeKey === 'forest') { sky0 = '#4a6a88'; sky1 = '#8aaa60'; haze = 'rgba(160,200,120,0.1)'; }
  else if (biomeKey === 'mountain' || biomeKey === 'hills') { sky0 = '#5a7088'; sky1 = '#a8b090'; haze = 'rgba(200,210,220,0.1)'; }
  else if (biomeKey === 'water' || biomeKey === 'deep') { sky0 = '#3a6a98'; sky1 = '#7ab0c8'; haze = 'rgba(140,200,230,0.12)'; }
  const top = biome.top || '#6fa34a';
  let floorA = top, floorB = shade(top, -0.08);
  if (dungeon) { floorA = '#5a5566'; floorB = '#4e4a58'; }
  if (voidish) { floorA = '#2a1a38'; floorB = '#1a1028'; }
  if (feat === 'camp') { floorA = shade(top, -0.12); floorB = shade(top, -0.2); }
  return { biomeKey, biome, feat, kind, dungeon, voidish, night, sky0, sky1, haze, floorA, floorB, top };
};
Render.battleNearRiver = function () {
  const t = Battle.tile;
  if (!t || typeof LS === 'undefined' || !LS.river || !LS.cellAt) return false;
  try {
    const c = LS.cellAt(t.x, t.y);
    const W = LS.W;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const i = c.i + di, j = c.j + dj;
      if (i < 0 || j < 0 || i >= W || j >= LS.H) continue;
      if (LS.river[j * W + i]) return true;
    }
  } catch (e) { /* landscape not ready */ }
  return !!(t.type === 'water' || t.type === 'deep' || t.type === 'sand');
};
Render.drawBattleSky = function (scene) {
  const c = this.ctx, w = this.w, h = this.h;
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, eraTint(scene.sky0));
  g.addColorStop(0.55, eraTint(shade(scene.sky1, scene.night || scene.dungeon ? -0.15 : 0.05)));
  g.addColorStop(1, eraTint(shade(scene.floorA, -0.35)));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // soft sun / moon
  if (!scene.dungeon) {
    const cx = w * (scene.night || scene.voidish ? 0.78 : 0.18);
    const cy = h * (scene.night || scene.voidish ? 0.12 : 0.14);
    const rad = scene.night || scene.voidish ? 18 : 28;
    const glow = c.createRadialGradient(cx, cy, 2, cx, cy, rad * 3.2);
    glow.addColorStop(0, scene.voidish ? 'rgba(190,120,255,0.55)' : scene.night ? 'rgba(230,230,210,0.55)' : 'rgba(255,230,160,0.55)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = glow; c.fillRect(cx - rad * 3.2, cy - rad * 3.2, rad * 6.4, rad * 6.4);
    c.fillStyle = scene.voidish ? '#d8b0ff' : scene.night ? '#f4f0d8' : '#ffe7a0';
    c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill();
    if (scene.night || scene.voidish) {
      for (let i = 0; i < 28; i++) {
        const sx = ((i * 97 + 13) % 100) / 100 * w;
        const sy = ((i * 53 + 7) % 40) / 100 * h;
        c.fillStyle = `rgba(255,255,240,${0.35 + (i % 5) * 0.1})`;
        c.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
      }
    } else {
      // drifting cloud banks
      c.fillStyle = 'rgba(255,255,255,0.14)';
      for (let i = 0; i < 5; i++) {
        const cx2 = w * (0.2 + i * 0.16) + Math.sin(this.t / 4000 + i) * 12;
        const cy2 = h * (0.08 + (i % 3) * 0.04);
        c.beginPath(); c.ellipse(cx2, cy2, 48 + i * 6, 12 + (i % 2) * 4, 0, 0, Math.PI * 2); c.fill();
      }
    }
  } else {
    // dungeon vault gloom
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, w, h * 0.35);
    // a few lanterns hanging on chains from the vault, flickering
    for (let i = 0; i < 3; i++) {
      const lx = w * (0.22 + i * 0.28), ly = h * (0.12 + (i % 2) * 0.05);
      c.strokeStyle = 'rgba(20,16,12,0.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, ly - 8); c.stroke();
      const f = 0.75 + Math.sin(this.t / 180 + i * 2) * 0.15;
      const glow = c.createRadialGradient(lx, ly, 1, lx, ly, 46);
      glow.addColorStop(0, `rgba(255,190,100,${0.35 * f})`); glow.addColorStop(1, 'rgba(255,170,80,0)');
      c.fillStyle = glow; c.fillRect(lx - 46, ly - 46, 92, 92);
      c.fillStyle = '#2a2018'; c.fillRect(lx - 5, ly - 8, 10, 3); c.fillRect(lx - 4, ly + 6, 8, 3);
      c.fillStyle = `rgba(255,214,140,${f})`; c.fillRect(lx - 3.5, ly - 5, 7, 11);
    }
  }
  // distant horizon silhouette
  const hz = h * 0.42;
  c.fillStyle = eraTint(shade(scene.top, scene.dungeon || scene.voidish ? -0.55 : -0.45));
  c.beginPath(); c.moveTo(0, hz + 40);
  for (let x = 0; x <= w; x += 16) {
    let yy = hz;
    const k = scene.biomeKey;
    if (scene.dungeon || scene.voidish) yy -= 10 + ((x * 3) % 18);
    else if (k === 'mountain' || k === 'hills') yy -= Math.abs(Math.sin(x / 90)) * (k === 'mountain' ? 70 : 38) + 8;
    else if (k === 'forest' || k === 'jungle' || k === 'snow') yy -= ((x * 7) % 5) * 5 + ((x / 16) % 2 ? 18 : 6);
    else if (k === 'desert' || k === 'sand') yy -= Math.sin(x / 70) * 12 + 6;
    else if (k === 'swamp') yy -= 6 + ((x * 5) % 4) * 3;
    else yy -= Math.sin(x / 110) * 8 + 4;
    c.lineTo(x, yy);
  }
  c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
  c.fillStyle = scene.haze; c.fillRect(0, 0, w, h);
};
Render.drawBattleScenery = function (scene, layer) {
  const c = this.ctx;
  const props = [];
  const push = (gx, gy, draw, depth) => props.push({ gx, gy, draw, depth: depth != null ? depth : gx + gy });
  const k = scene.biomeKey;
  const river = !scene.dungeon && !scene.voidish && this.battleNearRiver();
  if (river) {
    // a water ribbon behind the left flank
    push(-0.4, 1.2, (p) => {
      c.fillStyle = eraTint('#3b78a8');
      c.beginPath(); c.moveTo(p.x - 90, p.y - 10); c.quadraticCurveTo(p.x - 20, p.y + 18, p.x + 70, p.y + 6);
      c.quadraticCurveTo(p.x + 100, p.y + 24, p.x + 40, p.y + 36); c.quadraticCurveTo(p.x - 40, p.y + 40, p.x - 100, p.y + 16); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(200,230,255,0.4)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(p.x - 70, p.y); c.quadraticCurveTo(p.x, p.y + 10, p.x + 50, p.y + 4); c.stroke();
    }, -2);
  }
  if (!scene.dungeon && !scene.voidish) {
    if (k === 'forest' || k === 'grass' || k === 'hills') {
      [[-1.0, -0.2, 1.9], [-0.5, 0.6, 1.55], [-0.8, 2.2, 1.7], [-0.3, 3.6, 1.4],
        [6.8, -0.1, 1.75], [7.3, 1.4, 1.5], [7.1, 3.0, 1.65], [6.7, 4.4, 1.35],
        [1.2, -0.6, 1.3], [4.5, -0.5, 1.45], [0.4, 4.9, 1.2], [5.5, 4.8, 1.35]].forEach(([gx, gy, s], i) => {
        if (k === 'grass' && i > 7) return;
        if (k === 'hills' && i > 9) return;
        push(gx, gy, (p) => this.drawTree(p.x, p.y, s));
      });
    }
    if (k === 'snow') {
      [[-0.9, 0.1, 1.7], [-0.4, 2.4, 1.45], [6.9, 0.3, 1.6], [7.2, 2.8, 1.4], [6.8, 4.3, 1.25], [0.5, 4.8, 1.35]].forEach(([gx, gy, s]) => {
        push(gx, gy, (p) => this.drawTree(p.x, p.y, s, true));
      });
    }
    if (k === 'jungle') {
      [[-1.0, 0.0], [-0.5, 1.6], [-0.7, 3.2], [6.7, 0.0], [7.3, 1.8], [7.0, 3.6], [6.6, 4.6], [0.2, 4.9]].forEach(([gx, gy], i) => {
        push(gx, gy, (p) => { for (let n = 0; n < 4; n++) this.drawPalm(p.x - 14 + n * 10, p.y - 2 + (n % 2) * 5, 1.15 + (i % 2) * 0.2); });
      });
    }
    if (k === 'swamp') {
      [[-0.8, 0.8], [-0.4, 2.6], [6.7, 0.6], [7.1, 2.4], [6.8, 4.0], [1.0, 4.7], [4.8, 4.8]].forEach(([gx, gy]) => {
        push(gx, gy, (p) => {
          c.fillStyle = 'rgba(40,60,50,0.62)';
          c.beginPath(); c.ellipse(p.x, p.y + 4, 30, 12, 0, 0, Math.PI * 2); c.fill();
          c.strokeStyle = eraTint('#6b7a3a'); c.lineWidth = 2.4;
          for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(p.x - 20 + i * 8, p.y + 10); c.lineTo(p.x - 22 + i * 8, p.y - 16); c.stroke(); }
        });
      });
    }
    if (k === 'desert' || k === 'sand') {
      [[-0.8, 0.6], [-0.3, 2.8], [6.8, 0.8], [7.2, 2.6], [6.9, 4.2]].forEach(([gx, gy]) => {
        push(gx, gy, (p) => {
          c.fillStyle = eraTint('#cfae63');
          c.beginPath(); c.ellipse(p.x, p.y + 4, 36, 13, 0, Math.PI, 0); c.fill();
          c.fillStyle = eraTint('#4f8a3c'); c.fillRect(p.x + 12, p.y - 24, 4, 24); c.fillRect(p.x + 6, p.y - 16, 6, 3);
        });
      });
    }
    if (k === 'mountain' || k === 'hills') {
      [[-1.1, -0.4], [-0.6, 1.2], [7.4, -0.3], [7.6, 1.8], [7.3, 3.4]].forEach(([gx, gy], i) => {
        push(gx, gy, (p) => {
          const tall = k === 'mountain' ? 1.15 : 0.65;
          c.fillStyle = eraTint('#9d9a94');
          c.beginPath(); c.moveTo(p.x - 42 * tall, p.y + 12); c.lineTo(p.x - 4, p.y - 72 * tall); c.lineTo(p.x + 44 * tall, p.y + 12); c.closePath(); c.fill();
          c.fillStyle = eraTint('#6f6c67');
          c.beginPath(); c.moveTo(p.x - 4, p.y - 72 * tall); c.lineTo(p.x + 44 * tall, p.y + 12); c.lineTo(p.x + 10, p.y + 14); c.closePath(); c.fill();
          if (k === 'mountain' || i === 0) {
            c.fillStyle = '#f4f4f4';
            c.beginPath(); c.moveTo(p.x - 14, p.y - 42 * tall); c.lineTo(p.x - 4, p.y - 72 * tall); c.lineTo(p.x + 10, p.y - 44 * tall); c.lineTo(p.x - 2, p.y - 48 * tall); c.closePath(); c.fill();
          }
        }, -1);
      });
      [[-0.3, 3.6], [6.5, 4.1], [0.6, -0.2], [5.8, -0.3], [-0.5, 4.5]].forEach(([gx, gy]) => {
        push(gx, gy, (p) => {
          c.fillStyle = eraTint('#7a7872');
          c.beginPath(); c.ellipse(p.x - 8, p.y, 16, 9, -0.2, 0, Math.PI * 2); c.fill();
          c.fillStyle = eraTint('#5c5a56');
          c.beginPath(); c.ellipse(p.x + 10, p.y + 3, 12, 7, 0.3, 0, Math.PI * 2); c.fill();
        });
      });
    }
  }
  if (scene.feat === 'camp' || scene.kind === 'rival') {
    [[-0.6, 1.2], [6.7, 1.2], [7.0, 3.0]].forEach(([gx, gy], i) => {
      push(gx, gy, (p) => {
        c.fillStyle = eraTint(i ? '#7a3a2a' : '#6b4a32');
        c.beginPath(); c.moveTo(p.x - 28, p.y + 10); c.lineTo(p.x, p.y - 36); c.lineTo(p.x + 28, p.y + 10); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke();
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.moveTo(p.x, p.y - 36); c.lineTo(p.x + 28, p.y + 10); c.lineTo(p.x, p.y + 10); c.closePath(); c.fill();
      });
    });
  }
  if (scene.dungeon || scene.feat === 'ruins') {
    [[-0.8, 0.3], [-0.3, 2.0], [6.9, 0.2], [7.2, 2.2], [7.0, 4.0], [0.3, 4.7]].forEach(([gx, gy], i) => {
      push(gx, gy, (p) => {
        c.fillStyle = eraTint(i % 2 ? '#6a6570' : '#524e58');
        c.fillRect(p.x - 20, p.y - 30, 18, 36);
        c.fillStyle = eraTint('#3e3a44');
        c.fillRect(p.x - 2, p.y - 18, 22, 26);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(p.x - 12, p.y - 10, 8, 14);
        c.fillStyle = eraTint('#7a757f');
        c.beginPath(); c.moveTo(p.x - 24, p.y + 8); c.lineTo(p.x - 8, p.y - 6); c.lineTo(p.x + 6, p.y + 10); c.closePath(); c.fill();
      });
    });
  }
  if (scene.feat === 'shrine') {
    push(6.7, 1.0, (p) => this.drawShrine(p, !!(Battle.tile && Battle.tile.lit)));
  }
  if (scene.voidish || scene.feat === 'spire') {
    push(6.8, 1.5, (p) => this.drawSpire(p), -1);
  }
  props.sort((a, b) => a.depth - b.depth);
  const wantFar = layer !== 'near';
  for (const pr of props) {
    const far = pr.depth < 4.2;
    if (wantFar ? far : !far) pr.draw(this.biso(pr.gx, pr.gy));
  }
};
// Visual size: enemy defs may set scale (>1) / giant; party chars stay at 1.
Render.unitScale = function (u) { return (u && u.scale) || 1; };
Render.unitFigScale = function (u) {
  const base = !u ? 1.25 : u.shape === 'beast' ? 1.1 : u.shape === 'brute' ? 1.7 : 1.25;
  return base * this.unitScale(u);
};
// Mid-torso aim / pick height in battle pixels (feet at unitScreen.y).
Render.unitAimLift = function (u) { return Math.round(24 * this.unitFigScale(u)); };
// HP bar / name sit just above the tallest part of the figure.
Render.unitBarLift = function (u) { return Math.round(52 * this.unitFigScale(u) + 16); };
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
  const scene = this.battleScene();
  this.drawBattleSky(scene);
  // Fit the arena to the full canvas (HUD overlays on phones instead of shrinking the stage).
  const mobileBattle = typeof document !== 'undefined' && document.body.classList.contains('in-battle');
  // phones: fit the arena into the space above the action menu, not behind it
  const inset = mobileBattle && !Battle.cinematic ? (this.battleInset || 0) : 0;
  const availH = this.h - inset;
  const bs = this.bscale = Math.min(mobileBattle ? 1.2 : 1, this.w / (mobileBattle ? 560 : 780), availH / (mobileBattle ? 360 : 520));
  const cy = inset ? Math.max(availH / 2 + 12, availH * 0.55) : this.h / 2;
  const bm = this.mouse ? this.unbattle(this.mouse) : null;
  c.save();
  // Cutscene camera: eases its zoom and focus toward Render.cine's targets. Normal battles never move.
  let fx = this.w / 2, fy = this.h / 2, cz = 1;
  if (Battle.cinematic && this.cine) {
    const k = this.cine;
    k.z += (k.zt - k.z) * k.ease; k.gx += (k.tgx - k.gx) * k.ease; k.gy += (k.tgy - k.gy) * k.ease;
    const f = this.biso(k.gx, k.gy);
    fx = f.x; fy = f.y - 40; cz = k.z;
  }
  c.translate(this.w / 2, cy); c.scale(bs * cz, bs * cz); c.translate(-fx, -fy);
  this.bview = { cx: this.w / 2, cy, s: bs * cz, fx, fy };
  // Soft ground skirt so the arena sits in the landscape instead of a floating slab.
  {
    const mid = this.biso(3.5, 2.5);
    const skirt = c.createRadialGradient(mid.x, mid.y, 40, mid.x, mid.y + 20, 340);
    skirt.addColorStop(0, eraTint(shade(scene.floorA, -0.05)));
    skirt.addColorStop(0.55, eraTint(shade(scene.floorA, -0.28)));
    skirt.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = skirt;
    c.beginPath(); c.ellipse(mid.x, mid.y + 18, 320, 150, 0, 0, Math.PI * 2); c.fill();
  }
  // Far props behind the floor, then tiles, then near flank props around the fighters.
  this.drawBattleScenery(scene, 'far');
  // arena tiles
  for (let s = 0; s <= 7 + 5 - 2; s++) for (let gx = 0; gx < 7; gx++) {
    const gy = s - gx;
    if (gy < 0 || gy >= 5) continue;
    const p = this.biso(gx + 0.5, gy + 0.5);
    const base = (gx + gy) % 2 ? scene.floorA : scene.floorB;
    c.fillStyle = eraTint(base);
    c.beginPath(); c.moveTo(p.x, p.y - BTH / 2); c.lineTo(p.x + BTW / 2, p.y); c.lineTo(p.x, p.y + BTH / 2); c.lineTo(p.x - BTW / 2, p.y); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.stroke();
    if (gy === 4 || gx === 6) {
      c.fillStyle = eraTint(shade(base, -0.35));
      if (gy === 4) { c.beginPath(); c.moveTo(p.x - BTW / 2, p.y); c.lineTo(p.x, p.y + BTH / 2); c.lineTo(p.x, p.y + BTH / 2 + 18); c.lineTo(p.x - BTW / 2, p.y + 18); c.closePath(); c.fill(); }
      if (gx === 6) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.moveTo(p.x + BTW / 2, p.y); c.lineTo(p.x, p.y + BTH / 2); c.lineTo(p.x, p.y + BTH / 2 + 18); c.lineTo(p.x + BTW / 2, p.y + 18); c.closePath(); c.fill(); }
    }
  }
  this.drawBattleScenery(scene, 'near');
  // units sorted by depth
  const units = [...Battle.units].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  const now = this.t;
  for (const u of units) {
    const p = this.unitScreen(u);
    const figS = this.unitFigScale(u);
    const footR = 26 * Math.sqrt(this.unitScale(u));
    const aimLift = this.unitAimLift(u);
    u.flash = Math.max(0, (u.flash || 0) - 0.06);
    const isCur = Battle.cur === u && !Battle.over;
    if (isCur) {
      c.strokeStyle = u.side === 'party' ? '#ffd98a' : '#ff7a7a'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(p.x, p.y, footR, footR * 0.42, 0, 0, Math.PI * 2); c.stroke();
    }
    if (UI.targeting && UI.validTarget(u) && bm) {
      const d = Math.hypot(bm.x - p.x, bm.y - (p.y - aimLift));
      if (d < 40 * Math.sqrt(this.unitScale(u))) { c.fillStyle = 'rgba(255,230,120,0.25)'; c.beginPath(); c.ellipse(p.x, p.y, footR * 1.15, footR * 0.5, 0, 0, Math.PI * 2); c.fill(); }
    }
    const o = { flash: u.flash, dead: !u.alive };
    const facing = u.side === 'enemy';
    c.save();
    if (facing) { c.translate(p.x, 0); c.scale(-1, 1); c.translate(-p.x, 0); }
    if (u.shape === 'beast') this.drawBeast(p.x, p.y, u.look, figS, o);
    else if (u.kind === 'char') this.drawFigure(p.x, p.y, u.look, figS, { ...o, weapon: (GD.CLASSES[u.cls] || {}).weapon || 'sword' });
    else {
      const look = { skin: u.look.skin || (u.shape === 'brute' ? '#7d8f72' : '#d8b08c'), hair: '#2a2a2a', tunic: u.look.color, race: u.shape === 'brute' ? 'orc' : 'human', stage: 'prime' };
      if (u.shape === 'wraith') { c.globalAlpha = 0.75; look.skin = '#c8d8f0'; look.tunic = u.look.color; }
      if (u.giant) { look.evil = true; look.hair = '#1a1020'; look.hairStyle = 'long'; }
      this.drawFigure(p.x, p.y + (u.shape === 'wraith' ? -8 + Math.sin(now / 300) * 3 : 0), look, figS, { ...o, weapon: (u.abilities || []).includes('firebolt') ? 'orb' : 'sword' });
      c.globalAlpha = 1;
    }
    c.restore();
    // hp bar
    if (u.alive) {
      const bw = u.giant ? 72 : 50, bx = p.x - bw / 2, byy = p.y - this.unitBarLift(u);
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(bx - 1, byy - 1, bw + 2, 7);
      c.fillStyle = u.side === 'party' ? '#5fd35f' : '#e0503a';
      c.fillRect(bx, byy, bw * (u.hp / u.maxHp), 5);
      c.fillStyle = '#f2ead8'; c.font = u.giant ? 'bold 13px Georgia, serif' : '11px Georgia, serif'; c.textAlign = 'center';
      c.fillText(`${u.boss ? '☠ ' : ''}${u.name} · L${u.lvl}`, p.x, byy - 4);
      // focus pips (warlocks hold 4)
      const focusMax = typeof Battle.maxFocus === 'function' ? Battle.maxFocus(u) : 3;
      const pipW = focusMax > 3 ? 5 : 6;
      const pipGap = focusMax > 3 ? 6 : 8;
      for (let i = 0; i < focusMax; i++) {
        c.fillStyle = i < u.focus ? '#8fd3ff' : 'rgba(255,255,255,0.15)';
        c.fillRect(bx + i * pipGap, byy + 7, pipW, 3);
      }
      if (u.defending) { c.fillStyle = '#8fd3ff'; c.fillText('🛡', bx + bw + 8, byy + 6); }
      // status markers
      const tags = [];
      const S = (k) => Battle.st(u, k);
      if (S('atkUp')) tags.push(['▲', '#ffd76a']);
      if (S('bloodlust')) tags.push(['♥', '#ff5c5c']);
      if (S('guard')) tags.push(['◆', '#8fd3ff']);
      if (u.st && u.st.shield) tags.push(['◎', '#b48aff']);
      if (S('defDown')) tags.push(['▼', '#e0904a']);
      if (S('slow')) tags.push(['❄', '#9fe0ff']);
      if (S('poison')) tags.push(['☠', '#8fd36a']);
      if (S('mark')) tags.push(['✶', '#ff5c5c']);
      if (S('riposte')) tags.push(['⚔', '#cfd6dc']);
      c.font = 'bold 11px Georgia, serif'; c.textAlign = 'left';
      tags.forEach(([g, col], i) => { c.fillStyle = col; c.fillText(g, bx + 28 + i * 10, byy + 13); });
      c.textAlign = 'center';
    }
  }
  PackArt.drawBattle(this);
  ForgeFX.draw(this);
  if (typeof FxLayer !== 'undefined') FxLayer.drawAttacks(this);
  // fx
  Battle.fx = Battle.fx.filter((f) => now - f.t0 < 1100);
  for (const f of Battle.fx) {
    const u = Battle.find(f.uid);
    if (!u) continue;
    const p = this.biso(u.gx, u.gy);
    const aim = this.unitAimLift(u);
    const floatY = this.unitBarLift(u) + 8;
    const k = (now - f.t0) / 1100;
    if (k < 0) continue;
    if (f.burst) {
      c.fillStyle = f.burst; c.globalAlpha = 1 - k;
      c.beginPath(); c.arc(p.x, p.y - aim, 10 + k * 40, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      continue;
    }
    c.globalAlpha = 1 - k * k;
    c.font = f.small ? 'italic 12px Georgia, serif' : 'bold 20px Georgia, serif';
    c.textAlign = 'center';
    c.fillStyle = '#000'; c.fillText(f.text, p.x + 1, p.y - floatY - k * 40 + 1 + (f.small ? 18 : 0));
    c.fillStyle = f.color; c.fillText(f.text, p.x, p.y - floatY - k * 40 + (f.small ? 18 : 0));
    c.globalAlpha = 1;
  }
  c.restore();
  // title (a cutscene has its own captions)
  if (Battle.cinematic) return;
  c.font = `600 ${bs < 0.7 ? 14 : 18}px Georgia, serif`; c.textAlign = 'center'; c.fillStyle = '#f2ead8';
  c.fillText(`${Battle.title} — Round ${Math.max(1, Battle.round)}`, this.w / 2, bs < 0.7 ? 22 : 34);
};
// Point the cutscene camera at a grid spot (or a unit) with a zoom; `ease` is how quickly it gets there.
Render.cineAim = function (target, zoom = 1.3, ease = 0.05) {
  const t = target && target.gx != null ? { gx: +target.gx, gy: +target.gy - 0.3 } : (target || { gx: 3.5, gy: 2.5 });
  if (!this.cine) this.cine = { z: zoom, gx: t.gx, gy: t.gy, zt: zoom, tgx: t.gx, tgy: t.gy, ease };
  Object.assign(this.cine, { zt: zoom, tgx: t.gx, tgy: t.gy, ease });
};
Render.unbattle = function (p) {
  const v = this.bview || { cx: this.w / 2, cy: this.h / 2, s: this.bscale || 1, fx: this.w / 2, fy: this.h / 2 };
  return { x: (p.x - v.cx) / v.s + v.fx, y: (p.y - v.cy) / v.s + v.fy };
};

Render.pickUnit = function (p0) {
  const p = this.unbattle(p0);
  let best = null, bd = 1e9;
  for (const u of Battle.units) {
    const s = this.unitScreen(u);
    const lift = this.unitAimLift(u);
    const reach = 50 * Math.sqrt(this.unitScale(u));
    const d = Math.hypot(p.x - s.x, p.y - (s.y - lift));
    if (d < reach && d < bd) { bd = d; best = u; }
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
