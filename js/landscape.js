// A continuous landscape over the region tiles: a smooth height field, rivers, roads and bridges,
// a painted terrain texture with hill shading, and a fine navigation grid for free movement.
// Tiles stay underneath as regions (biome, towns, encounters); movement and drawing are seamless.
'use strict';

const LS = { N: 3, S: 18, ready: false };

// ---------------------------------------------------------------- deterministic noise
function lsHash(a, b) {
  let n = (a * 374761393 + b * 668265263 + (G.world.seed | 0) * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function lsNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = lsHash(xi, yi), b = lsHash(xi + 1, yi), c = lsHash(xi, yi + 1), d = lsHash(xi + 1, yi + 1);
  return (a * (1 - s(xf)) + b * s(xf)) * (1 - s(yf)) + (c * (1 - s(xf)) + d * s(xf)) * s(yf);
}
const ELEV_BY_H = [-0.08, 0.04, 0.22, 0.5, 0.72];

// ---------------------------------------------------------------- building
LS.key = function () { return `${G.world.map.W}:${G.world.era.type}:${hasTech('boats') ? 1 : 0}:${(G.world.landscape && G.world.landscape.v) || 0}`; };
LS.ensure = function () {
  if (!G || !G.world || !G.world.map) return false;
  const k = this.key();
  if (this.ready && this.builtFor === G.world && this.k === k) return true;
  try { this.build(); } catch (e) { console.error(e); this.ready = false; return false; }
  this.builtFor = G.world; this.k = k;
  return true;
};
LS.tileE = function (x, y) {
  const t = tileAt(clamp(x, 0, G.world.map.W - 1), clamp(y, 0, G.world.map.H - 1));
  return t.e != null ? t.e : ELEV_BY_H[t.h] - (t.type === 'deep' ? 0.12 : 0);
};
// smooth elevation at any world point (tile centres are at integer coordinates)
LS.elevAt = function (wx, wy) {
  const x0 = Math.floor(wx), y0 = Math.floor(wy), fx = wx - x0, fy = wy - y0;
  const s = (t) => t * t * (3 - 2 * t);
  const e = (this.tileE(x0, y0) * (1 - s(fx)) + this.tileE(x0 + 1, y0) * s(fx)) * (1 - s(fy)) +
    (this.tileE(x0, y0 + 1) * (1 - s(fx)) + this.tileE(x0 + 1, y0 + 1) * s(fx)) * s(fy);
  return e + (lsNoise(wx * 1.7, wy * 1.7) - 0.5) * 0.08 + (lsNoise(wx * 4.1, wy * 4.1) - 0.5) * 0.03;
};
LS.cellAt = function (wx, wy) {
  return { i: clamp(Math.floor((wx + 0.5) * this.N), 0, this.W - 1), j: clamp(Math.floor((wy + 0.5) * this.N), 0, this.H - 1) };
};
LS.cellCenter = function (i, j) { return { x: (i + 0.5) / this.N - 0.5, y: (j + 0.5) / this.N - 0.5 }; };

LS.build = function () {
  const map = G.world.map;
  if (G.world.seed == null) G.world.seed = R.int(1, 2e9);
  const N = this.N;
  const W = this.W = map.W * N, H = this.H = map.H * N;
  // height field at navigation resolution
  const hf = this.hf = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const p = this.cellCenter(i, j);
    hf[j * W + i] = this.elevAt(p.x, p.y);
  }
  // keep the land under every place of note dry
  for (const t of map.tiles) {
    if (!t.feature) continue;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const c = this.cellAt(t.x + di / N, t.y + dj / N);
      hf[c.j * W + c.i] = Math.max(hf[c.j * W + c.i], 0.06);
    }
  }
  if (!G.world.landscape || G.world.landscape.W !== W || (G.world.landscape.v || 0) < 3) G.world.landscape = this.genWaterways();
  const L = G.world.landscape;
  this.river = new Uint8Array(W * H); // 1 river, 2 ford
  this.road = new Uint8Array(W * H); // 1 road, 2 bridge
  for (const r of L.rivers) for (const idx of r.cells) this.river[idx] = 1;
  for (const r of L.rivers) for (const idx of r.fords || []) this.river[idx] = 2;
  for (const r of L.rivers) for (const idx of r.bridges || []) this.river[idx] = 3;
  for (const rd of L.roads) for (const idx of rd) this.road[idx] = this.river[idx] === 1 ? 2 : 1;
  for (const r of L.rivers) for (const b of r.bridges || []) {
    const bi = b % W, bj = Math.floor(b / W);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const n = (bj + dj) * W + (bi + di); if (n >= 0 && n < W * H && this.river[n] !== 1 && !this.road[n]) this.road[n] = 1; }
  }
  this.buildCost();
  this.paint();
  this.ready = true;
};

// ---------------------------------------------------------------- what it costs to cross a point
LS.buildCost = function () {
  const { W, H, hf } = this;
  const boats = hasTech('boats');
  const cost = this.cost = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const idx = j * W + i;
    const p = this.cellCenter(i, j);
    const t = tileAt(Math.round(p.x), Math.round(p.y));
    let c;
    if (hf[idx] < 0) c = boats ? (hasTech('steam') ? 1 : 1.8) : Infinity;
    else {
      c = GD.BIOMES[t.type].water ? 1.2 : GD.BIOMES[t.type].cost;
      if (t.type === 'mountain' && hf[idx] > 0.78 && !t.feature) c = Infinity; // sheer peaks
      if (this.river[idx] === 1) c = boats ? 2.2 : Infinity;
      if (this.river[idx] === 2) c = 2.4; // ford
      if (this.river[idx] === 3) c = 0.8; // bridge
      if (this.road[idx]) c = 0.6; // roads and bridges
    }
    cost[idx] = c;
  }
  for (const t of G.world.map.tiles) if (t.feature) { const c = this.cellAt(t.x, t.y); cost[c.j * W + c.i] = Math.min(cost[c.j * W + c.i], 1); }
};
LS.costAt = function (wx, wy) { const c = this.cellAt(wx, wy); return this.cost[c.j * this.W + c.i]; };
LS.passableAt = function (wx, wy) { return isFinite(this.costAt(wx, wy)); };
LS.onRoad = function (wx, wy) { const c = this.cellAt(wx, wy); return this.road[c.j * this.W + c.i] > 0; };

// ---------------------------------------------------------------- rivers, roads and bridges (saved)
LS.genWaterways = function () {
  const { W, H, hf, N } = this;
  const map = G.world.map;
  const rivers = [];
  const taken = new Uint8Array(W * H);
  const sources = [];
  for (let j = 2; j < H - 2; j += 2) for (let i = 2; i < W - 2; i += 2) {
    const idx = j * W + i;
    const p = this.cellCenter(i, j);
    const t = tileAt(Math.round(p.x), Math.round(p.y));
    if (hf[idx] > 0.42 && (t.type === 'hills' || t.type === 'mountain' || t.type === 'snow') && !t.feature) sources.push(idx);
  }
  R.shuffle(sources);
  const want = Math.round(map.W / 6);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const s of sources) {
    if (rivers.length >= want) break;
    if (rivers.some((r) => r.cells.some((c) => Math.abs((c % W) - (s % W)) + Math.abs(Math.floor(c / W) - Math.floor(s / W)) < 10))) continue;
    const cells = [s];
    const seen = new Set([s]);
    let cur = s, ok = false;
    for (let step = 0; step < 500; step++) {
      const ci = cur % W, cj = Math.floor(cur / W);
      let best = -1, be = Infinity;
      for (const [di, dj] of dirs) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni;
        if (seen.has(n)) continue;
        const e = hf[n] + lsHash(ni, nj) * 0.012 + (di && dj ? 0.004 : 0);
        if (e < be) { be = e; best = n; }
      }
      if (best < 0) break;
      // stuck in a hollow: carve onward a little rather than pooling
      if (hf[best] > hf[cur] + 0.05) break;
      seen.add(best); cells.push(best); cur = best;
      if (hf[cur] < 0 || taken[cur]) { ok = true; break; }
    }
    if (!ok || cells.length < 14) continue;
    const land = cells.filter((c) => hf[c] >= 0);
    land.forEach((c) => { taken[c] = 1; });
    // a few fords so no land is ever sealed off
    // crossings along the river: bridges (with a track off each bank) alternating with fords
    const fords = [], bridges = [];
    let alt = R.chance(0.5);
    for (let k = 7; k < land.length - 3; k += R.int(10, 15)) { (alt ? bridges : fords).push(land[k]); alt = !alt; }
    if (!bridges.length && land.length > 8) bridges.push(land[Math.floor(land.length / 2)]);
    rivers.push({ cells: land, fords, bridges });
  }
  this.river = new Uint8Array(W * H);
  for (const r of rivers) for (const c of r.cells) this.river[c] = 1;
  // roads: link the estate and towns on each landmass, bridging rivers where they cross
  const roads = [];
  const nodes = [G.world.estate, ...G.world.towns.filter((t) => !t.fallen)];
  const byLand = {};
  for (const n of nodes) { const l = tileAt(n.x, n.y).land; (byLand[l] = byLand[l] || []).push(n); }
  const roadCost = (idx) => {
    if (hf[idx] < 0) return Infinity;
    const p = this.cellCenter(idx % W, Math.floor(idx / W));
    const t = tileAt(Math.round(p.x), Math.round(p.y));
    let c = GD.BIOMES[t.type].water ? 3 : GD.BIOMES[t.type].cost;
    if (t.type === 'mountain') c *= 2.5;
    if (this.river[idx]) c += 1.2; // a bridge is worth building
    return c;
  };
  const roadSet = new Uint8Array(W * H);
  for (const list of Object.values(byLand)) {
    if (list.length < 2) continue;
    const linked = [list[0]];
    const rest = list.slice(1);
    while (rest.length) {
      let bi = 0, bl = linked[0], bd = Infinity;
      rest.forEach((n, i) => linked.forEach((m) => { const d = Math.hypot(n.x - m.x, n.y - m.y); if (d < bd) { bd = d; bi = i; bl = m; } }));
      const n = rest.splice(bi, 1)[0];
      const a = this.cellAt(n.x, n.y), b = this.cellAt(bl.x, bl.y);
      const cells = this.astar(a.i, a.j, b.i, b.j, (idx) => (roadSet[idx] ? 0.4 : roadCost(idx)));
      if (cells) { cells.forEach((c) => { roadSet[c] = 1; }); roads.push(cells); }
      linked.push(n);
    }
  }
  return { W, rivers, roads, v: 3 };
};

// ---------------------------------------------------------------- pathfinding (8 directions, A*)
LS.astar = function (si, sj, ti, tj, costFn) {
  const { W, H } = this;
  const start = sj * W + si, goal = tj * W + ti;
  if (!isFinite(costFn(goal)) || !isFinite(costFn(start)) && start !== goal) { /* start may be odd; allow */ }
  const g = new Float32Array(W * H).fill(Infinity);
  const came = new Int32Array(W * H).fill(-1);
  const heap = [];
  const push = (f, n) => { heap.push([f, n]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const hFn = (n) => { const dx = Math.abs((n % W) - ti), dy = Math.abs(Math.floor(n / W) - tj); return (Math.max(dx, dy) + 0.41 * Math.min(dx, dy)) * 0.55; };
  g[start] = 0; push(hFn(start), start);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [-1, 1, 1.41], [1, -1, 1.41], [-1, -1, 1.41]];
  let found = false, iter = 0;
  while (heap.length && iter++ < 200000) {
    const [, cur] = pop();
    if (cur === goal) { found = true; break; }
    const ci = cur % W, cj = Math.floor(cur / W);
    for (const [di, dj, dl] of dirs) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      const c = costFn(n);
      if (!isFinite(c)) continue;
      if (di && dj && (!isFinite(costFn(cj * W + ni)) || !isFinite(costFn(nj * W + ci)))) continue; // no cutting corners
      const ng = g[cur] + c * dl;
      if (ng < g[n]) { g[n] = ng; came[n] = cur; push(ng + hFn(n), n); }
    }
  }
  if (!found) return null;
  const out = [];
  for (let n = goal; n !== -1; n = came[n]) { out.push(n); if (n === start) break; }
  return out.reverse();
};
// nearest walkable cell to a point (for taps on water or cliffs)
LS.nearestPassable = function (wx, wy, maxR = 6) {
  const c = this.cellAt(wx, wy);
  for (let r = 0; r <= maxR; r++) {
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = c.i + di, j = c.j + dj;
      if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue;
      if (isFinite(this.cost[j * this.W + i])) return { i, j };
    }
  }
  return null;
};
// a free-movement path between two world points: A* on the fine grid, then straightened
LS.path = function (from, to) {
  if (!this.ensure()) return null;
  const a = this.cellAt(from.x, from.y);
  let b = this.cellAt(to.x, to.y);
  if (!isFinite(this.cost[b.j * this.W + b.i])) { b = this.nearestPassable(to.x, to.y); if (!b) return null; to = this.cellCenter(b.i, b.j); }
  const cells = this.astar(a.i, a.j, b.i, b.j, (idx) => this.cost[idx]);
  if (!cells) return null;
  const pts = cells.map((idx) => this.cellCenter(idx % this.W, Math.floor(idx / this.W)));
  pts[pts.length - 1] = { x: to.x, y: to.y };
  // string-pull: keep only the corners needed to stay on walkable, similar-cost ground
  const out = [];
  let i = 0;
  const pos = { x: from.x, y: from.y };
  let last = pos;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !this.clear(last, pts[j])) j--;
    out.push(pts[j]);
    last = pts[j];
    i = j;
  }
  if (!out.length) out.push(pts[pts.length - 1]);
  return out;
};
LS.clear = function (a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(2, Math.ceil(d / 0.12));
  const ca = this.costAt(a.x, a.y), cb = this.costAt(b.x, b.y);
  const limit = Math.max(isFinite(ca) ? ca : 1, isFinite(cb) ? cb : 1) * 1.35;
  for (let k = 1; k < n; k++) {
    const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
    const c = this.costAt(x, y);
    if (!isFinite(c) || c > limit) return false;
  }
  return true;
};

// ---------------------------------------------------------------- painting the land
LS.paint = function () {
  const map = G.world.map;
  const S = this.S;
  const TWp = map.W * S, THp = map.H * S;
  const cv = this.tex || document.createElement('canvas');
  cv.width = TWp; cv.height = THp;
  const c = cv.getContext('2d');
  const img = c.createImageData(TWp, THp);
  const px = img.data;
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const tint = {};
  for (const k in GD.BIOMES) tint[k] = rgb(eraTint(GD.BIOMES[k].top));
  const shallow = rgb(eraTint('#3f7fb0')), deep = rgb(eraTint('#1f4d78')), sand = rgb(eraTint('#d9c48a'));
  for (let py = 0; py < THp; py++) {
    const wy = (py + 0.5) / S - 0.5;
    for (let pxx = 0; pxx < TWp; pxx++) {
      const wx = (pxx + 0.5) / S - 0.5;
      const e = this.hfAt(wx, wy);
      let r, g, b;
      if (e < 0) {
        const k = clamp(-e / 0.18, 0, 1);
        r = shallow[0] * (1 - k) + deep[0] * k; g = shallow[1] * (1 - k) + deep[1] * k; b = shallow[2] * (1 - k) + deep[2] * k;
        if (e > -0.015) { r += 30; g += 30; b += 25; } // surf
      } else {
        // blend the four surrounding regions' colours
        const x0 = Math.floor(wx), y0 = Math.floor(wy), fx = wx - x0, fy = wy - y0;
        const s = (t) => t * t * (3 - 2 * t);
        const w = [(1 - s(fx)) * (1 - s(fy)), s(fx) * (1 - s(fy)), (1 - s(fx)) * s(fy), s(fx) * s(fy)];
        const ts = [tileAt(clamp(x0, 0, map.W - 1), clamp(y0, 0, map.H - 1)), tileAt(clamp(x0 + 1, 0, map.W - 1), clamp(y0, 0, map.H - 1)), tileAt(clamp(x0, 0, map.W - 1), clamp(y0 + 1, 0, map.H - 1)), tileAt(clamp(x0 + 1, 0, map.W - 1), clamp(y0 + 1, 0, map.H - 1))];
        r = 0; g = 0; b = 0; let ws = 0, forest = 0;
        for (let k = 0; k < 4; k++) {
          const col = GD.BIOMES[ts[k].type].water ? sand : tint[ts[k].type];
          r += col[0] * w[k]; g += col[1] * w[k]; b += col[2] * w[k]; ws += w[k];
          if (ts[k].type === 'forest' || ts[k].type === 'jungle') forest += w[k];
        }
        r /= ws; g /= ws; b /= ws;
        if (e < 0.035) { const k = 1 - e / 0.035; r = r * (1 - k) + sand[0] * k; g = g * (1 - k) + sand[1] * k; b = b * (1 - k) + sand[2] * k; }
        // hill shading, light from the north-west
        const dx = this.hfAt(wx + 0.12, wy) - this.hfAt(wx - 0.12, wy), dy = this.hfAt(wx, wy + 0.12) - this.hfAt(wx, wy - 0.12);
        const sh = clamp(1 + (-dx - dy) * 3.2, 0.62, 1.35);
        r *= sh; g *= sh; b *= sh;
        // contour lines on the highlands
        if (e > 0.3 && (e * 14) % 1 < 0.07) { r *= 0.86; g *= 0.86; b *= 0.86; }
        // forest canopy texture
        if (forest > 0.45) { const n = lsHash(pxx, py); if (n < 0.35) { r *= 0.82; g *= 0.86; b *= 0.82; } }
        const grain = (lsHash(pxx * 3, py * 7) - 0.5) * 10;
        r += grain; g += grain; b += grain;
      }
      const o = (py * TWp + pxx) * 4;
      px[o] = clamp(r, 0, 255); px[o + 1] = clamp(g, 0, 255); px[o + 2] = clamp(b, 0, 255); px[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  // rivers
  const toPx = (idx) => { const p = this.cellCenter(idx % this.W, Math.floor(idx / this.W)); return [(p.x + 0.5) * S, (p.y + 0.5) * S]; };
  // smooth the grid stair-steps into flowing curves (Chaikin corner cutting)
  const smooth = (cells) => {
    let pts = cells.map(toPx);
    for (let it = 0; it < 3; it++) {
      if (pts.length < 3) break;
      const out = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
        out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  };
  const stroke = (cells, width, col) => {
    if (cells.length < 2) return;
    c.strokeStyle = col; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    const pts = smooth(cells);
    c.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
    c.stroke();
  };
  for (const r of G.world.landscape.rivers) {
    const wid = (k) => S * (0.16 + Math.min(0.22, k / r.cells.length * 0.22));
    stroke(r.cells, wid(r.cells.length) + 2, eraTint('#2b5f88'));
    stroke(r.cells, wid(r.cells.length), eraTint('#4a8cc0'));
    for (const f of r.fords || []) { const [x, y] = toPx(f); c.fillStyle = eraTint('#c9b98a'); c.beginPath(); c.arc(x, y, S * 0.22, 0, Math.PI * 2); c.fill(); }
  }
  const bridgeAt = (x, y, ang) => {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-S * 0.5, -S * 0.17, S * 1.0, S * 0.44);
    c.fillStyle = '#4a3020'; c.fillRect(-S * 0.48, -S * 0.21, S * 0.96, S * 0.42);
    c.fillStyle = '#9a7a52'; for (let q = -4; q <= 4; q++) c.fillRect(q * S * 0.105 - S * 0.04, -S * 0.18, S * 0.08, S * 0.36);
    c.fillStyle = '#3a2416'; c.fillRect(-S * 0.48, -S * 0.23, S * 0.96, S * 0.05); c.fillRect(-S * 0.48, S * 0.18, S * 0.96, S * 0.05);
    c.restore();
  };
  for (const r of G.world.landscape.rivers) {
    for (const b of r.bridges || []) {
      const k = r.cells.indexOf(b);
      const [x, y] = toPx(b);
      const [xa, ya] = toPx(r.cells[Math.max(0, k - 1)]), [xb, yb] = toPx(r.cells[Math.min(r.cells.length - 1, k + 1)]);
      const flow = Math.atan2(yb - ya, xb - xa), across = flow + Math.PI / 2;
      // a track leading off both banks
      c.strokeStyle = eraTint('#b8996a'); c.lineWidth = S * 0.1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - Math.cos(across) * S * 1.4, y - Math.sin(across) * S * 1.4); c.lineTo(x + Math.cos(across) * S * 1.4, y + Math.sin(across) * S * 1.4); c.stroke();
      bridgeAt(x, y, across);
    }
  }
  // roads, then bridges where they cross a river
  for (const rd of G.world.landscape.roads) { stroke(rd, S * 0.2, 'rgba(90,64,36,0.55)'); stroke(rd, S * 0.12, eraTint('#b8996a')); }
  for (const rd of G.world.landscape.roads) {
    for (let k = 1; k < rd.length - 1; k++) {
      if (this.river[rd[k]] !== 1) continue;
      const [x, y] = toPx(rd[k]); const [xa, ya] = toPx(rd[k - 1]); const [xb, yb] = toPx(rd[k + 1]);
      bridgeAt(x, y, Math.atan2(yb - ya, xb - xa));
    }
  }
  this.tex = cv;
};
// height at a point, read from the fine grid (bilinear)
LS.hfAt = function (wx, wy) {
  const N = this.N, W = this.W, H = this.H;
  const gx = clamp((wx + 0.5) * N - 0.5, 0, W - 1.001), gy = clamp((wy + 0.5) * N - 0.5, 0, H - 1.001);
  const i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  const hf = this.hf;
  const a = hf[j * W + i], b = hf[j * W + Math.min(W - 1, i + 1)], c2 = hf[Math.min(H - 1, j + 1) * W + i], d = hf[Math.min(H - 1, j + 1) * W + Math.min(W - 1, i + 1)];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c2 * (1 - fx) + d * fx) * fy;
};
