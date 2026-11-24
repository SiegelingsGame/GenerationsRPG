var PixelFxBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // js/pixelfx-entry.js
  var pixelfx_entry_exports = {};
  __export(pixelfx_entry_exports, {
    default: () => pixelfx_entry_default
  });

  // vendor/pixelfx/core/math.js
  var TAU = Math.PI * 2;
  var clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  var lerp = (a, b, t) => a + (b - a) * t;
  var wrap = (x, m) => (x % m + m) % m;
  var seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
  var smooth = (e0, e1, x) => {
    const t = seg(x, e0, e1);
    return t * t * (3 - 2 * t);
  };
  var ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inExpo: (t) => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    outExpo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inSine: (t) => 1 - Math.cos(t * Math.PI / 2),
    outSine: (t) => Math.sin(t * Math.PI / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inBack: (t, s = 1.70158) => t <= 0 ? 0 : t >= 1 ? 1 : (s + 1) * t * t * t - s * t * t,
    outBack: (t, s = 1.70158) => t <= 0 ? 0 : t >= 1 ? 1 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    outElastic: (t) => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    }
  };
  function hash(...ns) {
    let h = 2654435769;
    for (const n of ns) {
      h = Math.imul(h ^ (n | 0), 2246822507);
      h ^= h >>> 13;
      h = Math.imul(h, 3266489909);
      h ^= h >>> 16;
    }
    return h >>> 0;
  }
  var rand = (...ns) => hash(...ns) / 4294967296;
  var Rng = class {
    constructor(seed = 1) {
      this.s = seed >>> 0 || 1;
    }
    next() {
      let t = this.s = this.s + 1831565813 >>> 0;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(a, b) {
      return a + (b - a) * this.next();
    }
    int(a, b) {
      return Math.floor(this.range(a, b + 1));
    }
    chance(p) {
      return this.next() < p;
    }
    sign() {
      return this.next() < 0.5 ? -1 : 1;
    }
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    }
    /** Roughly normal, mean 0, sd 1. */
    gauss() {
      return (this.next() + this.next() + this.next() + this.next() - 2) * 1.732;
    }
  };
  var rng = (...ns) => new Rng(hash(...ns));
  function noise(x, seed = 0) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(rand(i, seed), rand(i + 1, seed), u) * 2 - 1;
  }
  function noise2(x, y, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = rand(ix, iy, seed), b = rand(ix + 1, iy, seed), c = rand(ix, iy + 1, seed), d = rand(ix + 1, iy + 1, seed);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
  }
  function fbm(x, y, seed = 0, octaves = 3) {
    let s = 0, a = 0.5, n = 0;
    for (let o = 0; o < octaves; o++) {
      s += noise2(x, y, seed + o * 101) * a;
      n += a;
      x *= 2.03;
      y *= 2.03;
      a *= 0.5;
    }
    return s / n;
  }
  function loopNoise(phase, radius = 1, seed = 0) {
    const a = phase * TAU;
    return noise2(Math.cos(a) * radius + 50, Math.sin(a) * radius + 50, seed);
  }

  // vendor/pixelfx/core/color.js
  var rgb = (r, g, b) => 255 << 24 | (b & 255) << 16 | (g & 255) << 8 | r & 255;
  var red = (c) => c & 255;
  var green = (c) => c >>> 8 & 255;
  var blue = (c) => c >>> 16 & 255;
  function hex(h) {
    if (typeof h === "number") return h;
    let s = h.replace("#", "");
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const v = parseInt(s.slice(0, 6), 16);
    return rgb(v >> 16 & 255, v >> 8 & 255, v & 255);
  }
  var toHex = (c) => "#" + [red(c), green(c), blue(c)].map((v) => v.toString(16).padStart(2, "0")).join("");
  function mix(a, b, t) {
    t = clamp(t);
    return rgb(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t);
  }
  var scale = (c, k) => rgb(Math.min(255, red(c) * k), Math.min(255, green(c) * k), Math.min(255, blue(c) * k));
  var luma = (c) => (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255;
  var ramp = (list) => list.map(hex);
  function fit(r, n) {
    r = r.map(hex);
    if (r.length === n) return r;
    return Array.from({ length: n }, (_, i) => r[Math.round(i * (r.length - 1) / Math.max(1, n - 1))]);
  }
  var at = (r, t) => r[clamp(Math.floor(t * r.length), 0, r.length - 1)];
  var PAL = {
    fire: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    ember: ["#1a0a0e", "#3d1012", "#701a14", "#a8301a", "#e0561e", "#ff8a2a", "#ffc46a"],
    lava: ["#14060a", "#380a10", "#6e1210", "#ac2410", "#e8501a", "#ff8c2a", "#ffd25a"],
    smoke: ["#0e0c12", "#1d1a22", "#2e2a35", "#433e4b", "#5c5664", "#7b7484", "#a39cab"],
    dust: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2"],
    ice: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"],
    water: ["#081830", "#0e2e5a", "#14508c", "#1c76bc", "#36a2e0", "#78ccf4", "#c4ecff", "#ffffff"],
    electric: ["#0a0f2e", "#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#ffffff"],
    volt: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"],
    poison: ["#0d1a0c", "#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a"],
    holy: ["#2a1c08", "#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"],
    heal: ["#08201a", "#0f3f2c", "#17663e", "#24924e", "#3ec466", "#7ee88a", "#c8ffc4", "#ffffff"],
    arcane: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"],
    shadow: ["#050308", "#0f0a18", "#1c1230", "#2c1a4a", "#432468", "#5e3290", "#8048b8", "#a970e0"],
    blood: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a"],
    earth: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c"],
    stone: ["#0e0e12", "#1c1c24", "#2c2c38", "#42424f", "#5c5c6b", "#7d7d8c", "#a4a4b2", "#d0d0da"],
    gold: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
    leaf: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"],
    wood: ["#160c06", "#2e1a0c", "#4a2c14", "#6a421e", "#8e5c2c", "#b47c40", "#d8a464"],
    metal: ["#0c0e14", "#1c2230", "#2e3648", "#4a5468", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"],
    bone: ["#1a1814", "#3a352c", "#5e5648", "#8a806c", "#b8ad96", "#e4dcc8", "#fffaf0"],
    neon: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"],
    cyber: ["#041418", "#08303a", "#0c5260", "#108088", "#18b4b0", "#4ce8d8", "#b4fff0", "#ffffff"],
    matrix: ["#020a04", "#05200c", "#0a3c16", "#106624", "#1a9a34", "#3cd650", "#a4ffa8", "#e8ffe8"],
    candy: ["#ff4a5a", "#ff9a2a", "#ffe03c", "#5ad84a", "#3cc8ff", "#7a6cff", "#f53cd1"],
    night: ["#07060d", "#0c0a18", "#131026", "#1b1734", "#241f44", "#2f2956"]
  };
  var RAMP = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, ramp(v)]));
  var WHITE = hex("#ffffff");
  var BLACK = hex("#000000");
  var INK = hex("#0b0a10");
  var PATCH = hex("#f53cd1");

  // vendor/pixelfx/core/particles.js
  function cycle(t, period, count, seed, life, fn) {
    for (let i = 0; i < count; i++) {
      const g = rng(seed, i, 911);
      const born = g.next() * period;
      const L = typeof life === "function" ? life(g) : life;
      let age = ((t - born) % period + period) % period;
      for (; age < L; age += period) fn(age, L, rng(seed, i), i);
    }
  }

  // vendor/pixelfx/core/sim.js
  var GRAVITY = 950;
  var CROSS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var HOT = ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"].map(hex);
  var FIRE_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4a1712"].map(hex);
  var SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex);
  var rampAt = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
  var P = { SPARK: 0, MOTE: 1, STREAK: 2, FLAKE: 3, VAPOUR: 4, DUST: 5, STAR: 6, EMBER: 7, SMOKE: 8, FIRE: 9, BRAND: 10, GRIT: 11 };
  var PF = { SMOKES: 1, BIG: 2, BACK: 4 };
  var SOFT = /* @__PURE__ */ new Set([P.VAPOUR, P.DUST, P.SMOKE]);
  var Particles = class {
    constructor(opts = {}) {
      var _a, _b, _c, _d, _e;
      this.R = (_b = opts.rng) != null ? _b : new Rng((_a = opts.seed) != null ? _a : 1);
      this.list = [];
      this.t = 0;
      this.ground = (_c = opts.ground) != null ? _c : (() => Infinity);
      this.sparks = ((_d = opts.sparks) != null ? _d : HOT).map(hex);
      this.haze = opts.haze === void 0 ? null : hex(opts.haze);
      this.onLand = (_e = opts.onLand) != null ? _e : null;
    }
    /** delay: seconds before it appears; flag: PF bits. col 0 lets FIRE and SMOKE use their own ramps. */
    spawn(k, x, y, vx, vy, life, col = WHITE, size = 1, delay = 0, flag = 0) {
      this.list.push({ k, x, y, vx, vy, life, max: life, col: col ? hex(col) : 0, size, seed: this.R.next() * 100, delay, flag });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      var _a;
      this.t += dt;
      const R = this.R, t = this.t;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        if (p.delay > 0) {
          p.delay -= dt;
          continue;
        }
        if ((p.life -= dt) <= 0) {
          if (p.k === P.FIRE && p.flag & PF.SMOKES) {
            const big = p.flag & PF.BIG;
            this.spawn(P.SMOKE, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 6, big ? R.range(1.3, 2.3) : R.range(0.8, 1.4), 0, p.size * (big ? 0.85 : 0.7), 0, big ? PF.BIG : 0);
          }
          this.list.splice(i, 1);
          continue;
        }
        switch (p.k) {
          case P.FIRE:
            p.vy -= 95 * dt;
            p.vx += Math.sin(t * 17 + p.seed) * 30 * dt;
            p.vx -= p.vx * 5 * dt;
            p.vy -= p.vy * 3.2 * dt;
            break;
          case P.GRIT: {
            p.vy += GRAVITY * dt;
            p.vx -= p.vx * 0.8 * dt;
            const g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt;
            if (p.vy > 0 && p.y <= g && ny >= g) {
              p.y = g - 0.25;
              if (p.vy > 130 && R.chance(0.4)) p.vy = -p.vy * 0.25, p.vx = p.vx * 0.5 + R.range(-10, 10);
              else p.vx = p.vy = 0, p.life = Math.min(p.life, 0.5);
            } else p.y = ny;
            continue;
          }
          case P.BRAND: {
            p.vy += GRAVITY * 0.8 * dt;
            p.vx -= p.vx * 0.9 * dt;
            if (R.chance(0.9 * Math.min(1, dt * 60))) this.spawn(P.FIRE, p.x, p.y, p.vx * 0.1 + R.range(-7, 7), p.vy * 0.1 - 10, R.range(0.16, 0.32), 0, R.range(0.9, 1.7) * (0.5 + p.life / p.max * 0.6), 0, R.chance(0.4) ? PF.SMOKES : 0);
            const g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt;
            if (p.vy > 0 && p.y <= g && ny >= g) {
              (_a = this.onLand) == null ? void 0 : _a.call(this, p.x, g);
              this.list.splice(i, 1);
            } else p.y = ny;
            continue;
          }
          case P.SPARK: {
            p.vy += GRAVITY * 0.45 * dt;
            p.vx -= p.vx * 2.2 * dt;
            p.vy -= p.vy * 2.2 * dt;
            const g = this.ground(p.x), ny = p.y + p.vy * dt;
            p.x += p.vx * dt;
            if (p.vy > 0 && p.y <= g && ny >= g) p.vy = -p.vy * 0.45, p.vx *= 0.7, p.y = g - 0.25;
            else p.y = ny;
            continue;
          }
          case P.STREAK:
            p.vx += p.vx * 3 * dt, p.vy += p.vy * 3 * dt;
            break;
          case P.FLAKE:
            p.vx -= p.vx * 2.2 * dt;
            p.vy -= p.vy * 2.2 * dt - 35 * dt;
            p.x += Math.sin(this.t * 2.5 + p.seed) * 7 * dt;
            break;
          case P.EMBER:
            p.vy += (-30 + Math.sin(t * 3 + p.seed) * 20) * dt;
            p.vx += Math.cos(t * 2.3 + p.seed) * 45 * dt;
            p.vx -= p.vx * 1.6 * dt;
            p.vy -= p.vy * 1.6 * dt;
            break;
          case P.SMOKE: {
            const big = p.flag & PF.BIG;
            p.vy -= (big ? 23 : 16) * dt;
            p.vx += Math.sin(t * 1.3 + p.seed) * 8 * dt;
            p.vx -= p.vx * 1.6 * dt;
            p.vy -= p.vy * 1.2 * dt;
            break;
          }
          case P.MOTE:
            p.vx -= p.vx * 0.6 * dt;
            p.vy -= p.vy * 0.6 * dt;
            break;
          default: {
            const drag = SOFT.has(p.k) ? 4 : 1.6;
            p.vx -= p.vx * drag * dt;
            p.vy -= p.vy * drag * dt + 5 * dt;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    draw(p, layer3) {
      for (const q of this.list) {
        if (q.delay > 0) continue;
        if (layer3 && (SOFT.has(q.k) || q.flag & PF.BACK ? "back" : "front") !== layer3) continue;
        const k = q.life / q.max, x = q.x, y = q.y, sp = Math.hypot(q.vx, q.vy) || 1, ux = q.vx / sp, uy = q.vy / sp;
        switch (q.k) {
          case P.SPARK: {
            const S2 = this.sparks, head4 = k > 0.6 ? S2[0] : k > 0.3 ? S2[1] : S2[2], len2 = Math.min(9, 1 + sp * 0.022);
            p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : S2[S2.length - 1]);
            p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4);
            p.glow(x, y, 3, head4, 0.45 * k);
            break;
          }
          case P.MOTE: {
            const len2 = Math.min(16, 0.5 + sp * 0.026) * q.size, a = k < 0.35 ? k / 0.35 : 1;
            p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.35, y - uy * len2 * 0.35, scale(q.col, 0.55), a);
            p.line(x - ux * len2 * 0.4, y - uy * len2 * 0.4, x, y, q.col, a);
            p.glow(x, y, 2.5 + q.size, q.col, 0.4 * k);
            break;
          }
          case P.STREAK: {
            const L = clamp(sp / 30, 1, 7);
            for (let d = L; d >= 0; d -= 0.5) p.dot(x - ux * d, y - uy * d, d < 1 ? WHITE : d < L * 0.5 ? q.col : scale(q.col, 0.6), d < L * 0.5 ? 1 : 1.2 - d / L);
            p.glow(x, y, 4, q.col, 0.4);
            break;
          }
          case P.FLAKE: {
            const a = Math.min(1, k * 3);
            p.dot(x, y, q.col, a);
            if (q.size > 1.3) for (const [dx, dy] of CROSS) p.dot(x + dx, y + dy, scale(q.col, 0.8), a * 0.8);
            break;
          }
          case P.VAPOUR: {
            const r = q.size * (0.6 + (1 - k) * 0.9);
            p.disc(x, y, r, q.col, Math.pow(k, 1.3) * 0.45);
            if (this.haze) p.glow(x, y, r * 1.8, this.haze, 0.16 * k);
            break;
          }
          case P.DUST:
            p.disc(x, y, q.size * (0.6 + (1 - k) * 0.9), q.col, Math.pow(k, 1.3) * 0.7);
            break;
          case P.SMOKE: {
            const age = 1 - k, big = q.flag & PF.BIG;
            const r = q.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4));
            const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58);
            const c = q.col ? mix(q.col, rampAt(SMOKE_RAMP, age), age) : rampAt(SMOKE_RAMP, age * 1.05);
            p.disc(x, y, r, c, a * 0.45);
            p.disc(x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
            if (age < 0.5) p.disc(x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
            break;
          }
          case P.FIRE: {
            const age = 1 - k, heat2 = Math.min(0.999, Math.pow(age, 0.62) + q.seed % 1 * 0.1), F = FIRE_RAMP, n = F.length;
            const idx = Math.min(n - 2, Math.floor(heat2 * (n - 1)));
            const r = q.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = F[idx];
            if (idx >= n - 2) p.disc(x, y, r, c, Math.min(1, k * 3) * 0.85);
            else {
              p.circle(x, y, r, F[Math.min(n - 1, idx + 2)]);
              p.circle(x - r * 0.16, y - r * 0.22, r * 0.78, c);
              if (r > 1.6) p.circle(x, y - r * 0.9, r * 0.42, c);
              if (idx <= 3 && r > 1.8) p.circle(x - r * 0.28, y - r * 0.34, r * 0.36, F[Math.max(0, idx - 1)]);
              if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, 0.18 * k);
            }
            break;
          }
          case P.BRAND:
            p.circle(x, y, 1.6, HOT[3]);
            p.px(x, y, Math.sin(this.t * 40 + q.seed) > 0 ? HOT[0] : HOT[1]);
            p.px(x + 1, y, HOT[1]);
            p.glow(x, y, 7, HOT[2], 0.45);
            break;
          case P.GRIT:
            if (k > 0.25 || k * 4 > 0.5) {
              p.px(x, y, q.col);
              if (q.size >= 2) p.px(x + 1, y, q.col), p.px(x, y + 1, scale(q.col, 0.8)), p.px(x + 1, y + 1, scale(q.col, 0.7));
            }
            break;
          case P.EMBER: {
            const c = k > 0.6 ? this.sparks[0] : k > 0.3 ? this.sparks[1] : this.sparks[2];
            if (k < 0.25 && Math.sin(this.t * 40 + q.seed) < 0) break;
            p.px(x, y, c);
            if (q.size > 1.5) p.px(x, y + 1, this.sparks[this.sparks.length - 1]);
            p.glow(x, y, 3 + q.size, c, 0.35 * k);
            break;
          }
          default: {
            const tw = 0.6 + 0.4 * Math.sin(this.t * (8 + q.seed % 5) + q.seed);
            if (q.size < 1) {
              if (tw * k > 0.25) p.px(x, y, tw > 0.8 ? WHITE : q.col);
              p.glow(x, y, 3, q.col, 0.4 * k * tw);
              break;
            }
            sparkle(p, x, y, q.size * tw * Math.min(1, k * 3), q.col, scale(q.col, 0.75), 0.5 * k * tw);
          }
        }
      }
    }
  };
  var B = { SHARD: 0, CHUNK: 1, DRIP: 2 };
  var Bits = class {
    constructor(opts = {}) {
      var _a;
      this.list = [];
      this.ground = (_a = opts.ground) != null ? _a : (() => Infinity);
    }
    add(b) {
      var _a;
      const life = (_a = b.life) != null ? _a : 1;
      this.list.push({ kind: B.SHARD, vx: 0, vy: 0, a: 0, va: 0, s: 1, c: WHITE, g: 1, drag: 0, bounce: 0, rest: false, ...b, life, max: life });
    }
    get count() {
      return this.list.length;
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const b = this.list[i];
        if ((b.life -= dt) <= 0) {
          this.list.splice(i, 1);
          continue;
        }
        if (b.rest) continue;
        b.vy += GRAVITY * b.g * dt;
        b.vx -= b.vx * b.drag * dt;
        b.vy -= b.vy * b.drag * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.a += b.va * dt;
        const floor3 = this.ground(b.x), sp = b.vy;
        if (b.g <= 0 || b.y < floor3 || sp <= 0) continue;
        b.y = floor3 - 0.01;
        if (b.kind === B.DRIP) b.life = 0;
        else if (b.bounce > 0 && sp > 70) b.vy = -sp * b.bounce, b.vx *= 0.7, b.va *= 0.6;
        else b.rest = true, b.vx = b.vy = 0;
      }
    }
    draw(p) {
      var _a;
      for (const b of this.list) {
        const a = Math.min(1, b.life / 0.4), ca = Math.cos(b.a), sa = Math.sin(b.a);
        if (b.kind === B.SHARD) {
          for (let d = -b.s / 2; d <= b.s / 2; d += 0.5) p.dot(b.x + ca * d, b.y + sa * d, d > b.s / 2 - 0.6 ? WHITE : hex(b.c), a);
        } else if (b.kind === B.DRIP) {
          p.dot(b.x, b.y, hex(b.c), a);
          p.dot(b.x, b.y - 1, hex(b.c), a * 0.5);
        } else {
          const R = ((_a = b.ramp) != null ? _a : ["#1c2030", "#3a4a66", "#6e86a8", "#a8c0dc", "#e8f2ff"]).map(hex), n = R.length;
          const x = Math.round(b.x), y = Math.round(b.y), r = Math.ceil(b.s) + 1;
          for (let py = -r; py <= r; py++)
            for (let px = -r; px <= r; px++) {
              const u = (px + 0.5) * ca + (py + 0.5) * sa, v = -(px + 0.5) * sa + (py + 0.5) * ca;
              const d = Math.abs(u) / b.s + Math.abs(v) / (b.s * 0.62);
              if (d > 1.3) continue;
              p.dot(x + px, y + py, d > 1 ? R[0] : v < 0 ? u < 0 ? R[n - 1] : R[n - 2] : u < 0 ? R[n - 3] : R[Math.max(1, n - 4)], a);
            }
        }
      }
    }
  };
  var Lights = class {
    constructor() {
      this.list = [];
    }
    add(x, y, r, color, k, life) {
      this.list.push({ x, y, r, color: hex(color), k, life, max: life });
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) if ((this.list[i].life -= dt) <= 0) this.list.splice(i, 1);
    }
    draw(p) {
      for (const l of this.list) {
        const k = l.life / l.max;
        p.glow(l.x, l.y, l.r * (0.55 + 0.45 * k), l.color, l.k * k * k);
      }
    }
  };
  function sparkle(p, x, y, arm, c, tip = c, k = 0.6) {
    const n = Math.round(arm);
    if (n < 1) return;
    const X = Math.floor(x), Y = Math.floor(y);
    for (let d = 1; d <= n; d++) {
      const cc = d > n * 0.6 ? tip : c;
      for (const [dx, dy] of CROSS) p.px(X + dx * d, Y + dy * d, cc);
    }
    if (n >= 3) for (const [dx, dy] of DIAG) p.px(X + dx, Y + dy, c);
    if (n >= 6) for (const [dx, dy] of DIAG) p.px(X + dx * 2, Y + dy * 2, tip);
    p.px(X, Y, WHITE);
    p.glow(x, y, 4 + n * 2, c, k);
  }
  function flare(p, x, y, L, k, ramp2) {
    if (L < 1) return;
    const R = ramp2.map(hex), n = R.length;
    for (let i = 0; i < 8; i++) {
      const an = i * Math.PI / 4, len2 = i % 4 === 0 ? L : i % 2 === 0 ? L * 0.6 : L * 0.3, ca = Math.cos(an), sa = Math.sin(an);
      for (let d = 0; d <= len2; d += 0.5) {
        const u = d / len2;
        p.dot(x + ca * d, y + sa * d, u < 0.35 ? WHITE : u < 0.7 ? R[n - 2] : R[n - 3], u < 0.6 ? 1 : k * 1.5 * (1 - u) + 0.2);
      }
    }
  }
  function band(p, cx, cy, r, sy, th, k, ramp2, keep2 = () => true, hot = false) {
    if (r <= 0 || k <= 0) return;
    const R = ramp2.map(hex), n = R.length;
    for (let j = 0, m = Math.ceil(r * TAU * 1.2); j < m; j++) {
      const ang = j / m * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
      if (!keep2(ang)) continue;
      for (let o = th; o >= 0; o -= 0.5) {
        const u = o / th, c = u < 0.15 ? hot ? WHITE : R[n - 1] : u < 0.4 ? R[n - 2] : u < 0.7 ? R[n - 3] : R[n - 4];
        p.dot(cx + ca * (r - o), cy + sa * (r - o) * sy, c, k * (u < 0.4 ? 1.2 : 1.15 - u));
      }
    }
  }
  function crystal(p, x, base, h, w, lean, ramp2, opts = {}) {
    var _a, _b;
    if (h < 1.5) return;
    const R = ramp2.map(hex), n = R.length, C = (i) => R[Math.max(0, n - 1 - i)];
    const a = (_a = opts.a) != null ? _a : 1, top = base - h, ridge0 = x - w * 0.14, glint2 = (_b = opts.glint) != null ? _b : -1;
    const inside = (px, py) => {
      const u = (base - (py + 0.5)) / h;
      return u >= 0 && u <= 1 && Math.abs(px + 0.5 - (x + lean * u)) <= w / 2 * (1 - u) + 0.35;
    };
    for (let py = Math.floor(top) - 1; py < Math.ceil(base); py++)
      for (let px = Math.floor(x - w / 2 - Math.abs(lean) - 2); px <= Math.ceil(x + w / 2 + Math.abs(lean) + 2); px++) {
        if (!inside(px, py)) {
          if (inside(px - 1, py) || inside(px + 1, py) || inside(px, py + 1) || inside(px, py - 1) && py < base - 1) p.dot(px, py, R[0], a);
          continue;
        }
        if (opts.white) {
          p.dot(px, py, WHITE, a);
          continue;
        }
        const u = (base - (py + 0.5)) / h, rx = ridge0 + (x + lean - ridge0) * u, c = x + lean * u, hw = w / 2 * (1 - u) + 0.35, fx = px + 0.5;
        let col = u > 0.9 ? WHITE : Math.abs(fx - rx) < 0.55 ? C(1) : fx < rx ? fx - (c - hw) < 1 ? C(1) : (fx - (c - hw)) / Math.max(1, rx - (c - hw)) > 0.55 ? C(2) : C(3) : c + hw - fx < 1.2 ? C(Math.min(n - 2, 6)) : (fx - rx) / Math.max(1, c + hw - rx) > 0.5 ? C(5) : C(4);
        if (glint2 >= 0 && fx <= rx + 0.6) {
          const g = Math.abs(u - glint2);
          if (g < 0.05) col = WHITE;
          else if (g < 0.1) col = C(1);
        }
        p.dot(px, py, col, a);
      }
  }

  // vendor/pixelfx/core/font.js
  var MINI = {
    A: ".#.|#.#|###|#.#|#.#",
    B: "##.|#.#|##.|#.#|##.",
    C: ".##|#..|#..|#..|.##",
    D: "##.|#.#|#.#|#.#|##.",
    E: "###|#..|##.|#..|###",
    F: "###|#..|##.|#..|#..",
    G: ".##|#..|#.#|#.#|.##",
    H: "#.#|#.#|###|#.#|#.#",
    I: "###|.#.|.#.|.#.|###",
    J: "..#|..#|..#|#.#|.#.",
    K: "#.#|#.#|##.|#.#|#.#",
    L: "#..|#..|#..|#..|###",
    M: "#.#|###|###|#.#|#.#",
    N: "##.|#.#|#.#|#.#|#.#",
    O: ".#.|#.#|#.#|#.#|.#.",
    P: "##.|#.#|##.|#..|#..",
    Q: ".#.|#.#|#.#|##.|.##",
    R: "##.|#.#|##.|#.#|#.#",
    S: ".##|#..|.#.|..#|##.",
    T: "###|.#.|.#.|.#.|.#.",
    U: "#.#|#.#|#.#|#.#|###",
    V: "#.#|#.#|#.#|#.#|.#.",
    W: "#.#|#.#|###|###|#.#",
    X: "#.#|#.#|.#.|#.#|#.#",
    Y: "#.#|#.#|.#.|.#.|.#.",
    Z: "###|..#|.#.|#..|###",
    0: "###|#.#|#.#|#.#|###",
    1: ".#.|##.|.#.|.#.|###",
    2: "##.|..#|.#.|#..|###",
    3: "##.|..#|.#.|..#|##.",
    4: "#.#|#.#|###|..#|..#",
    5: "###|#..|##.|..#|##.",
    6: ".##|#..|###|#.#|###",
    7: "###|..#|.#.|.#.|.#.",
    8: "###|#.#|###|#.#|###",
    9: "###|#.#|###|..#|##.",
    "+": "...|.#.|###|.#.|...",
    "-": "...|...|###|...|...",
    "!": "#|#|#|.|#",
    "?": "##.|..#|.#.|...|.#.",
    ".": ".|.|.|.|#",
    ",": "..|..|..|.#|#.",
    ":": ".|#|.|#|.",
    "/": "..#|..#|.#.|#..|#..",
    "%": "#.#|..#|.#.|#..|#.#",
    x: "...|#.#|.#.|#.#|...",
    "*": "#.#|.#.|#.#|...|...",
    "'": "#|#|.|.|.",
    "(": ".#|#.|#.|#.|.#",
    ")": "#.|.#|.#|.#|#.",
    "<": "..#|.#.|#..|.#.|..#",
    ">": "#..|.#.|..#|.#.|#..",
    "=": "...|###|...|###|...",
    _: "...|...|...|...|###",
    "#": "#.#|###|#.#|###|#.#"
  };
  var BIG = {
    A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    B: "####.|#...#|#...#|####.|#...#|#...#|####.",
    C: ".###.|#...#|#....|#....|#....|#...#|.###.",
    D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
    E: "#####|#....|#....|####.|#....|#....|#####",
    F: "#####|#....|#....|####.|#....|#....|#....",
    G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
    H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    I: "###|.#.|.#.|.#.|.#.|.#.|###",
    J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
    K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
    L: "#....|#....|#....|#....|#....|#....|#####",
    M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
    N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
    O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
    P: "####.|#...#|#...#|####.|#....|#....|#....",
    Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
    R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
    S: ".####|#....|#....|.###.|....#|....#|####.",
    T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
    U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
    V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
    W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
    X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
    Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
    Z: "#####|....#|...#.|..#..|.#...|#....|#####",
    0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
    1: ".#.|##.|.#.|.#.|.#.|.#.|###",
    2: ".###.|#...#|....#|...#.|..#..|.#...|#####",
    3: "#####|...#.|..#..|...#.|....#|#...#|.###.",
    4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
    5: "#####|#....|####.|....#|....#|#...#|.###.",
    6: "..##.|.#...|#....|####.|#...#|#...#|.###.",
    7: "#####|....#|...#.|..#..|.#...|.#...|.#...",
    8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
    9: ".###.|#...#|#...#|.####|....#|...#.|.##..",
    "!": "#|#|#|#|#|.|#",
    "?": ".###.|#...#|....#|...#.|..#..|.....|..#..",
    "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
    "-": "....|....|....|####|....|....|....",
    ".": ".|.|.|.|.|.|#",
    ",": "..|..|..|..|..|.#|#.",
    ":": ".|.|#|.|.|#|.",
    "/": "....#|....#|...#.|..#..|.#...|#....|#....",
    "%": "##...|##..#|...#.|..#..|.#...|#..##|...##",
    x: ".....|.....|#...#|.#.#.|..#..|.#.#.|#...#",
    "*": ".....|..#..|#.#.#|.###.|#.#.#|..#..|.....",
    "'": "#|#|.|.|.|.|.",
    "<": "...#|..#.|.#..|#...|.#..|..#.|...#",
    ">": "#...|.#..|..#.|...#|..#.|.#..|#...",
    "=": "....|....|####|....|####|....|....",
    "(": "..#|.#.|#..|#..|#..|.#.|..#",
    ")": "#..|.#.|..#|..#|..#|.#.|#..",
    "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#."
  };
  function build(table, h) {
    const out = {};
    for (const [ch, src] of Object.entries(table)) {
      const rows2 = src.split("|");
      out[ch] = { w: rows2[0].length, rows: rows2.map((r) => [...r].map((c) => c === "#")) };
      if (rows2.length !== h) throw new Error(`glyph ${ch} has ${rows2.length} rows, expected ${h}`);
    }
    return out;
  }
  var FONTS = {
    mini: { h: 5, space: 2, gap: 1, glyphs: build(MINI, 5) },
    big: { h: 7, space: 3, gap: 1, glyphs: build(BIG, 7) }
  };
  function textWidth(str, font = "mini") {
    var _a;
    const F = FONTS[font];
    let w = 0;
    for (const ch of String(str)) {
      const g = (_a = F.glyphs[ch]) != null ? _a : F.glyphs[ch.toUpperCase()];
      w += (g ? g.w : F.space) + F.gap;
    }
    return Math.max(0, w - F.gap);
  }
  function rasterText(str, font, plot2) {
    var _a;
    const F = FONTS[font];
    let x = 0;
    for (const ch of String(str)) {
      const g = (_a = F.glyphs[ch]) != null ? _a : F.glyphs[ch.toUpperCase()];
      if (!g) {
        x += F.space + F.gap;
        continue;
      }
      for (let r = 0; r < F.h; r++) for (let c = 0; c < g.w; c++) if (g.rows[r][c]) plot2(x + c, r);
      x += g.w + F.gap;
    }
  }

  // vendor/pixelfx/core/painter.js
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  var OUT = { c: 0, a: 1, l: 0, k: 0 };
  var sprites = /* @__PURE__ */ new WeakMap();
  var call = (v, ...args) => typeof v === "function" ? v(...args) : v;
  var Painter = class {
    constructor(frame2) {
      this.frame = frame2;
      this.reset();
    }
    /** Re-read the frame and clear placement, fade and light strength. */
    reset() {
      const f = this.frame;
      this.w = f.w;
      this.h = f.h;
      this.ox = f.ox | 0;
      this.oy = f.oy | 0;
      this.C = f.color;
      this.L = f.light;
      this.tx = 0;
      this.ty = 0;
      this.fx = 1;
      this.cs = 1;
      this.sn = 0;
      this.fade = 1;
      this.lightK = 1;
      this.layer = "front";
      return this;
    }
    /** Put the effect's origin at (x, y) in frame space, mirrored if flip, rotated by angle (radians). */
    place(x, y, flip = false, angle2 = 0) {
      this.tx = x;
      this.ty = y;
      this.fx = flip ? -1 : 1;
      this.cs = Math.cos(angle2);
      this.sn = Math.sin(angle2);
      return this;
    }
    // ---- transforms: local (effect) space <-> screen (frame) space
    toX(x, y) {
      return this.tx + x * this.fx * this.cs - y * this.sn;
    }
    toY(x, y) {
      return this.ty + x * this.fx * this.sn + y * this.cs;
    }
    fromX(sx, sy) {
      const dx = sx - this.tx, dy = sy - this.ty;
      return (dx * this.cs + dy * this.sn) * this.fx;
    }
    fromY(sx, sy) {
      const dx = sx - this.tx, dy = sy - this.ty;
      return -dx * this.sn + dy * this.cs;
    }
    // the screen pixel of the local pixel cell holding (x, y): mirrors and rotations land on whole cells
    cellX(x, y) {
      return Math.floor(this.toX(Math.floor(x) + 0.5, Math.floor(y) + 0.5));
    }
    cellY(x, y) {
      return Math.floor(this.toY(Math.floor(x) + 0.5, Math.floor(y) + 0.5));
    }
    // ---- raw writes, screen space, whole pixels. Color 0 means "nothing": it never erases what's there.
    put(sx, sy, c, a = 1) {
      if (!c) return;
      a *= this.fade;
      if (a < 1 && a <= BAYER[(sy & 3) << 2 | sx & 3]) return;
      const x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.C[y * this.w + x] = c;
    }
    add(sx, sy, c, k = 1) {
      k *= this.fade * this.lightK;
      if (k <= 4e-3) return;
      const x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x, d = this.L[i];
      const r = Math.min(255, (d & 255) + (c & 255) * k) | 0;
      const g = Math.min(255, (d >>> 8 & 255) + (c >>> 8 & 255) * k) | 0;
      const b = Math.min(255, (d >>> 16 & 255) + (c >>> 16 & 255) * k) | 0;
      this.L[i] = 255 << 24 | b << 16 | g << 8 | r;
    }
    /**
     * Blend a color over what's there at alpha a (0..1), keeping the result's own alpha: soft smoke, vapour and
     * mist. Use dithered dot() for hard pixel fades and blend() for translucent volumes.
     */
    blendPx(sx, sy, c, a) {
      a *= this.fade;
      if (!c || a <= 4e-3) return;
      const x = sx - this.ox, y = sy - this.oy;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x, d = this.C[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa;
      const ch = (s) => (c >>> s & 255) * k + (d >>> s & 255) * (1 - k) & 255;
      this.C[i] = (oa * 255 & 255) << 24 | ch(16) << 16 | ch(8) << 8 | ch(0);
    }
    /** Translucent pixel at a local point. */
    blend(x, y, c, a) {
      this.blendPx(this.cellX(x, y), this.cellY(x, y), c, a);
    }
    /** A translucent disc: puffs of smoke, vapour, dust. c and a may be functions of (d: 0 center..1 rim, angle). */
    disc(cx, cy, r, c, a) {
      if (r < 0.5) return this.blend(cx, cy, call(c, 0, 0), call(a, 0, 0));
      this.each(cx - r, cy - r, cx + r, cy + r, (x, y, sx, sy) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        const d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
        this.blendPx(sx, sy, call(c, d, ang), call(a, d, ang));
      });
    }
    /** Read back the color under a local point (0 if empty). */
    get(x, y) {
      const sx = this.cellX(x, y) - this.ox, sy = this.cellY(x, y) - this.oy;
      return sx < 0 || sy < 0 || sx >= this.w || sy >= this.h ? 0 : this.C[sy * this.w + sx];
    }
    // ---- pixels
    /** One opaque pixel. */
    px(x, y, c) {
      this.put(this.cellX(x, y), this.cellY(x, y), c, 1);
    }
    /** One pixel at alpha a (0..1), faded by ordered dither. */
    dot(x, y, c, a = 1) {
      if (a > 0) this.put(this.cellX(x, y), this.cellY(x, y), c, a);
    }
    /** Add light to one pixel. */
    light(x, y, c, k = 1) {
      this.add(this.cellX(x, y), this.cellY(x, y), c, k);
    }
    /**
     * Visit every screen pixel whose center falls in the local box [x0, x1] x [y0, y1], with that center in
     * local space: fn(lx, ly, sx, sy). The basis of every filled shape, so shapes mirror and rotate exactly.
     */
    each(x0, y0, x1, y1, fn) {
      let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
      for (let k = 0; k < 4; k++) {
        const x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0, sx = this.toX(x, y), sy = this.toY(x, y);
        if (sx < ax) ax = sx;
        if (sx > bx) bx = sx;
        if (sy < ay) ay = sy;
        if (sy > by) by = sy;
      }
      const sx0 = Math.max(Math.floor(ax), this.ox), sx1 = Math.min(Math.ceil(bx), this.ox + this.w - 1);
      const sy0 = Math.max(Math.floor(ay), this.oy), sy1 = Math.min(Math.ceil(by), this.oy + this.h - 1);
      for (let sy = sy0; sy <= sy1; sy++)
        for (let sx = sx0; sx <= sx1; sx++) {
          const cx = sx + 0.5, cy = sy + 0.5;
          fn(this.fromX(cx, cy), this.fromY(cx, cy), sx, sy);
        }
    }
    /**
     * A pixel shader over a local box. fn(x, y, out) returns a color, or sets out.c (color), out.a (alpha),
     * out.l (light color, defaults to out.c) and out.k (light amount). Return nothing to leave the pixel alone.
     */
    shade(x0, y0, x1, y1, fn) {
      const o = OUT;
      this.each(x0, y0, x1, y1, (lx, ly, sx, sy) => {
        o.c = 0;
        o.a = 1;
        o.l = 0;
        o.k = 0;
        const c = fn(lx, ly, o) || o.c;
        if (c) this.put(sx, sy, c, o.a);
        if (o.k > 0) this.add(sx, sy, o.l || c, o.k);
      });
    }
    // ---- shapes. Colors (c) and alphas (a) can be numbers or functions of the shape's own coordinates.
    /** 1 px line. c and a may be functions of u (0 at the start, 1 at the end). */
    line(x0, y0, x1, y1, c, a = 1) {
      let sx = this.cellX(x0, y0), sy = this.cellY(x0, y0);
      const ex = this.cellX(x1, y1), ey = this.cellY(x1, y1);
      const dx = Math.abs(ex - sx), dy = -Math.abs(ey - sy), stepx = sx < ex ? 1 : -1, stepy = sy < ey ? 1 : -1;
      const n = Math.max(dx, -dy) || 1, fc = typeof c === "function", fa = typeof a === "function";
      let err = dx + dy, i = 0;
      for (; ; ) {
        const u = i++ / n;
        this.put(sx, sy, fc ? c(u) : c, fa ? a(u) : a);
        if (sx === ex && sy === ey) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          sx += stepx;
        }
        if (e2 <= dx) {
          err += dx;
          sy += stepy;
        }
      }
    }
    /** Lines through a list of points [[x, y], ...]. */
    polyline(pts, c, a = 1) {
      for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, a);
    }
    /** Thick segment with round ends. c and a may be functions of (u along, v across: 0 center, 1 edge). */
    beam(x0, y0, x1, y1, width, c, a = 1) {
      const r = width / 2, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-9;
      this.shade(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y, o) => {
        const u = clamp(((x - x0) * dx + (y - y0) * dy) / L2), px = x0 + dx * u - x, py = y0 + dy * u - y;
        const d2 = px * px + py * py;
        if (d2 > r * r) return;
        const v = Math.sqrt(d2) / r;
        o.c = call(c, u, v);
        o.a = call(a, u, v);
      });
    }
    /** Filled disc. c and a may be functions of (d: 0 center to 1 rim, angle). */
    circle(cx, cy, r, c, a = 1) {
      if (r < 0.6) return this.dot(cx, cy, call(c, 0, 0), call(a, 0, 0));
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r) return;
        const d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
        o.c = call(c, d, ang);
        o.a = call(a, d, ang);
      });
    }
    /** Ellipse. c and a may be functions of (d: 0 center to 1 rim, angle). */
    ellipse(cx, cy, rx, ry, c, a = 1) {
      if (rx <= 0 || ry <= 0) return;
      this.shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, o) => {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, d2 = dx * dx + dy * dy;
        if (d2 > 1) return;
        const d = Math.sqrt(d2), ang = Math.atan2(dy, dx);
        o.c = call(c, d, ang);
        o.a = call(a, d, ang);
      });
    }
    /** Ring from radius r - w to r. c and a may be functions of (v: 0 inner to 1 outer, angle). */
    ring(cx, cy, r, w, c, a = 1) {
      const r0 = Math.max(0, r - w);
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 > r * r || d2 < r0 * r0) return;
        const v = w > 0 ? (Math.sqrt(d2) - r0) / (r - r0 || 1) : 1, ang = Math.atan2(dy, dx);
        o.c = call(c, v, ang);
        o.a = call(a, v, ang);
      });
    }
    /**
     * Band of a ring from angle a0 to a1 (radians, a1 > a0), radius r - w to r: the slash and smear shape.
     * c and a may be functions of (u: 0 at a0 to 1 at a1, v: 0 inner to 1 outer). w can be a function of u
     * for a crescent that tapers at both ends.
     */
    arc(cx, cy, r, w, a0, a1, c, a = 1) {
      const span = a1 - a0, wf = typeof w === "function";
      this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) return;
        let ang = Math.atan2(dy, dx) - a0;
        ang -= Math.floor(ang / (Math.PI * 2)) * Math.PI * 2;
        if (ang > span) return;
        const u = ang / span, ww = wf ? w(u) : w;
        if (ww <= 0 || d < r - ww) return;
        const v = (d - (r - ww)) / ww;
        o.c = call(c, u, v);
        o.a = call(a, u, v);
      });
    }
    /** Filled rectangle. */
    rect(x, y, w, h, c, a = 1) {
      if (this.sn === 0) {
        const X0 = Math.round(x), Y0 = Math.round(y), X1 = Math.round(x + w), Y1 = Math.round(y + h);
        for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) this.put(this.cellX(xx, yy), this.cellY(xx, yy), c, a);
        return;
      }
      this.shade(x, y, x + w, y + h, (lx, ly, o) => {
        if (lx < x || ly < y || lx >= x + w || ly >= y + h) return;
        o.c = c;
        o.a = a;
      });
    }
    /** Filled polygon from points [[x, y], ...] (even-odd rule). */
    poly(pts, c, a = 1) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      const n = pts.length;
      this.shade(x0, y0, x1, y1, (x, y, o) => {
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (!inside) return;
        o.c = call(c, x, y);
        o.a = call(a, x, y);
      });
    }
    tri(x0, y0, x1, y1, x2, y2, c, a = 1) {
      this.poly([[x0, y0], [x1, y1], [x2, y2]], c, a);
    }
    // ---- light
    /** Radial glow into the light buffer: k at the center, falling to 0 at radius r. */
    glow(x, y, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      const cx = this.toX(x, y), cy = this.toY(x, y);
      const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
      for (let sy = y0; sy <= y1; sy++) {
        const dy = (sy + 0.5 - cy) / r;
        for (let sx = x0; sx <= x1; sx++) {
          const dx = (sx + 0.5 - cx) / r, d = dx * dx + dy * dy;
          if (d >= 1) continue;
          const f = 1 - Math.sqrt(d);
          this.add(sx, sy, c, f * f * k);
        }
      }
    }
    /** Glow around a segment (a soft beam of light). */
    glowLine(x0, y0, x1, y1, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      const ax = this.toX(x0, y0), ay = this.toY(x0, y0), bx = this.toX(x1, y1), by = this.toY(x1, y1);
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      const X0 = Math.floor(Math.min(ax, bx) - r), X1 = Math.ceil(Math.max(ax, bx) + r);
      const Y0 = Math.floor(Math.min(ay, by) - r), Y1 = Math.ceil(Math.max(ay, by) + r);
      for (let sy = Y0; sy <= Y1; sy++)
        for (let sx = X0; sx <= X1; sx++) {
          const px = sx + 0.5, py = sy + 0.5, u = clamp(((px - ax) * dx + (py - ay) * dy) / L2);
          const ex = ax + dx * u - px, ey = ay + dy * u - py, d = Math.sqrt(ex * ex + ey * ey) / r;
          if (d >= 1) continue;
          const f = 1 - d;
          this.add(sx, sy, c, f * f * k);
        }
    }
    /** Glow hugging a circle of radius R (a shockwave's light), falling off over width r. */
    glowRing(x, y, R, r, c, k = 0.5) {
      if (r < 1 || k <= 4e-3) return;
      const cx = this.toX(x, y), cy = this.toY(x, y), E = R + r;
      for (let sy = Math.floor(cy - E); sy <= Math.ceil(cy + E); sy++)
        for (let sx = Math.floor(cx - E); sx <= Math.ceil(cx + E); sx++) {
          const d = Math.abs(Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) - R) / r;
          if (d >= 1) continue;
          const f = 1 - d;
          this.add(sx, sy, c, f * f * k);
        }
    }
    // ---- sprites, text, masks
    /**
     * A little sprite from strings: rows like ["..##..", ".#oo#."], pal maps characters to colors
     * ({ "#": "#222034", o: 0xff... }); "." and " " are empty. Top-left at (x, y).
     * opts: { scale, a, flip (mirror left-right), flipY (upside down), tint (draw every pixel in one color) }.
     */
    sprite(rows2, pal, x, y, opts = {}) {
      var _a, _b, _c, _d;
      let s = sprites.get(rows2);
      if (!s) sprites.set(rows2, s = rows2.map((r) => [...r]));
      const k = (_a = opts.scale) != null ? _a : 1, a = (_b = opts.a) != null ? _b : 1, W6 = (_d = (_c = s[0]) == null ? void 0 : _c.length) != null ? _d : 0, cache3 = {};
      for (let r = 0; r < s.length; r++)
        for (let q = 0; q < s[r].length; q++) {
          const ch = s[r][q];
          if (ch === "." || ch === " ") continue;
          let c = opts.tint;
          if (c === void 0) {
            c = cache3[ch];
            if (c === void 0) c = cache3[ch] = pal[ch] === void 0 ? 0 : hex(pal[ch]);
          }
          if (!c) continue;
          const col = opts.flip ? W6 - 1 - q : q, row = opts.flipY ? s.length - 1 - r : r;
          if (k === 1) this.dot(x + col, y + row, c, a);
          else this.rect(x + col * k, y + row * k, k, k, c, a);
        }
    }
    /**
     * Pixel text. opts: { font: "mini" (3x5) | "big" (5x7), scale, align: "left" | "center" | "right",
     * outline: color, shadow: color, a }. (x, y) is the top of the text, at the left, center or right.
     */
    text(str, x, y, c, opts = {}) {
      var _a, _b, _c;
      const font = (_a = opts.font) != null ? _a : "mini", k = (_b = opts.scale) != null ? _b : 1, a = (_c = opts.a) != null ? _c : 1, w = textWidth(str, font) * k;
      const left = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x), top = Math.round(y);
      const ol = opts.outline, sh = opts.shadow;
      if (ol !== void 0) rasterText(str, font, (gx, gy) => this.rect(left + gx * k - 1, top + gy * k - 1, k + 2, k + 2, ol, a));
      if (sh !== void 0) rasterText(str, font, (gx, gy) => this.rect(left + gx * k + 1, top + gy * k + 1, k, k, sh, a));
      rasterText(str, font, (gx, gy) => this.rect(left + gx * k, top + gy * k, k, k, call(c, gx, gy), a));
    }
    /** Size of text in pixels: [w, h]. */
    measure(str, opts = {}) {
      var _a, _b, _c;
      const k = (_a = opts.scale) != null ? _a : 1;
      return [textWidth(str, (_b = opts.font) != null ? _b : "mini") * k, FONTS[(_c = opts.font) != null ? _c : "mini"].h * k];
    }
    /** Fill a mask ({ w, h, data }) with its top-left at (x, y). c may be a function of (mx, my). */
    mask(m, x, y, c, a = 1) {
      for (let my = 0; my < m.h; my++)
        for (let mx = 0; mx < m.w; mx++) if (m.data[my * m.w + mx]) this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
    }
    /** The 1 px outline just outside a mask. */
    outline(m, x, y, c, a = 1) {
      const at2 = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.data[my * m.w + mx];
      for (let my = -1; my <= m.h; my++)
        for (let mx = -1; mx <= m.w; mx++)
          if (!at2(mx, my) && (at2(mx - 1, my) || at2(mx + 1, my) || at2(mx, my - 1) || at2(mx, my + 1)))
            this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
    }
  };

  // vendor/pixelfx/core/actor.js
  var HERO = [
    "....kkkkk...",
    "..kkhhhhhk..",
    ".khhhhhhhhk.",
    ".khhhhhhhhhk",
    ".khhssssshhk",
    ".khsessesshk",
    ".khsessesshk",
    "..ksssssssk.",
    "...kkSSSkk..",
    "..kttttttk..",
    ".kttTttTttk.",
    ".ksttTTttsk.",
    ".kstttttttk.",
    "..kbbbbbbk..",
    "..kppkkppk..",
    "..kppk.kppk.",
    "..kppk.kppk.",
    "..koook.kook",
    "..kkkkk.kkkk"
  ];
  var HERO_PAL = {
    k: "#17121f",
    h: "#7a4128",
    s: "#f3c49d",
    S: "#c98b6c",
    e: "#17121f",
    t: "#5f6f94",
    T: "#46536f",
    b: "#8a5a32",
    p: "#38334a",
    o: "#6a4030",
    // the 2x character's extra detail
    H: "#a35d34",
    w: "#ffffff",
    m: "#a3564a",
    g: "#e8c060",
    L: "#7f90b6",
    O: "#8f5a3f",
    P: "#4b4560",
    // the scarf
    c: "#f53cd1",
    C: "#ff8fe6",
    D: "#a31f8a"
  };
  var DUMMY_PAL = {
    k: "#0e0c14",
    A: "#e4e6ec",
    B: "#b6b9c3",
    C: "#868995",
    D: "#5c5e6a",
    E: "#6e707c",
    F: "#4b4d58",
    G: "#34353f",
    J: "#2a2b33",
    m: "#f53cd1"
  };
  var HERO2 = [
    "...........kkk..........",
    "..........kAABk.........",
    ".........kAAABJk........",
    ".........kABBJJk........",
    ".........kBBBJCDk.......",
    ".........kBCJDDDk.......",
    ".........kkJJJDk........",
    ".......kkkkABBJCkk......",
    "......kAABCJBCCCkDk.....",
    "......kABBCJCCCmDkDk....",
    "......kBBCDDJCDDDkDk....",
    "......kABCDJDDDDDkk.....",
    ".....kAABDkDDDDJkk......",
    ".....kABCDkDDJJGkk......",
    ".....kABCkJJJGGGkk......",
    "....kJJCDkFFFGGGk.......",
    "....kAJJDkJJJGGGk.......",
    "....kJCJJkABBJGGk.......",
    ".....kJCCkBBCDJJJk......",
    ".....kCCCJBBCDJJDk......",
    ".....kCCCDJCCDkJDDk.....",
    "......kCDDJBCDkDDDk.....",
    ".......kDJJJCDkDDDkk....",
    ".......kJBCJCDkDDDkk....",
    ".......kBDJBCDkCDDkk....",
    "........kJJBCDkCDDk.....",
    "........kBBBCDkCCDDk....",
    "........kBBBCDkCCDDk....",
    ".........kBBCDkJDDDk....",
    "........kBJJJJkCJJJk....",
    "........kBBCCDkCCDDk....",
    "........kBBCDDkCDDk.....",
    "........kBBCDkCCDDk.....",
    "........kBCCDkCCDDk.....",
    "........kBCDDkCDDDk.....",
    ".......kJBCJkkkDJkkkk...",
    ".......kAJJAAAAkCCCCCk..",
    "........kkkkkkkkkkkkk..."
  ];
  function maskOf(rows2, k = 1) {
    const h = rows2.length * k, w = rows2[0].length * k, data = new Uint8Array(w * h);
    rows2.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === ".") return;
      for (let j = 0; j < k * k; j++) data[(y * k + (j / k | 0)) * w + x * k + j % k] = 1;
    }));
    return { w, h, data };
  }
  var MASKS = { 1: maskOf(HERO, 1), 2: maskOf(HERO2, 1) };
  function pixelsOf(rows2, pal) {
    const w = rows2[0].length, data = new Uint32Array(w * rows2.length);
    rows2.forEach((r, y) => [...r].forEach((ch, x) => data[y * w + x] = ch === "." ? 0 : hex(pal[ch])));
    return data;
  }
  var PIXELS = { 1: pixelsOf(HERO, HERO_PAL), 2: pixelsOf(HERO2, DUMMY_PAL) };
  function stockActor(k = 1) {
    k = k === 2 ? 2 : 1;
    const m = MASKS[k], x = -Math.floor(m.w / 2), y = -m.h;
    return { mask: m, pixels: PIXELS[k], x, y, w: m.w, h: m.h, k, head: [0, y], chest: [0, k === 2 ? -26 : y + 11], ...k === 2 ? { eyes: [[13, 3], [15, 3]] } : {} };
  }

  // vendor/pixelfx/core/fx.js
  function createFrame(w, h, ox = 0, oy = 0) {
    return { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
  }
  function clearFrame(f) {
    f.color.fill(0);
    f.light.fill(0);
    return f;
  }
  var painters = /* @__PURE__ */ new WeakMap();
  function painterFor(frame2) {
    let p = painters.get(frame2);
    if (!p) painters.set(frame2, p = new Painter(frame2));
    return p.reset();
  }
  var FADE = 0.3;
  var isRamp = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === "number" || /^#[0-9a-f]{3,8}$/i.test(c));
  function resolveOptions(meta35, o = {}) {
    var _a, _b;
    const opts = { ...(_a = meta35.options) != null ? _a : {}, ...o };
    for (const [k, def] of Object.entries((_b = meta35.options) != null ? _b : {}))
      if (isRamp(def) && isRamp(o[k]) && o[k].length !== def.length) opts[k] = fit(o[k], def.length).map(toHex);
    if (meta35.actor && !opts.actor) opts.actor = stockActor(meta35.actor === 2 ? 2 : 1);
    return opts;
  }
  function createFx(mod, o = {}) {
    var _a, _b;
    const meta35 = (_a = mod.meta) != null ? _a : {};
    const opts = resolveOptions(meta35, o);
    const impl = mod.create ? mod.create(opts) : mod;
    const D16 = (_b = meta35.duration) != null ? _b : 1;
    let t = 0, stopAt = Infinity;
    return {
      meta: meta35,
      options: opts,
      get t() {
        return t;
      },
      update(dt) {
        t += dt;
        if (!impl.update) return;
        const n = Math.max(1, Math.ceil(dt * 120 - 1e-9));
        for (let i = 0; i < n; i++) impl.update(dt / n, opts);
      },
      draw(frame2, layer3) {
        var _a2, _b2, _c, _d;
        const p = painterFor(frame2);
        p.place((_a2 = opts.x) != null ? _a2 : 0, (_b2 = opts.y) != null ? _b2 : 0, !!opts.flip, (_c = opts.angle) != null ? _c : 0);
        p.fade = stopAt === Infinity ? 1 : clamp(1 - (t - stopAt) / FADE);
        p.lightK = (_d = opts.light) != null ? _d : 1;
        const tt = meta35.loop ? t % D16 : Math.min(t, D16);
        if (layer3 !== "front" && impl.drawBack) {
          p.layer = "back";
          impl.drawBack(p, tt, opts);
        }
        if (layer3 !== "back") {
          p.layer = "front";
          impl.draw(p, tt, opts);
        }
      },
      /** Let it end: loops fade out, one-shots cut short. */
      stop() {
        if (stopAt === Infinity) stopAt = t;
      },
      done() {
        return t - stopAt >= FADE || !meta35.loop && t >= D16;
      }
    };
  }
  function composite(f, out, bg = null, lightK = 1) {
    const n = f.w * f.h, C = f.color, L = f.light, flat = typeof bg === "number";
    for (let i = 0; i < n; i++) {
      const c = C[i], l = L[i] & 16777215;
      let r, g, b, a;
      const ca = c >>> 24;
      if (ca === 255) {
        r = c & 255;
        g = c >>> 8 & 255;
        b = c >>> 16 & 255;
        a = 255;
      } else if (bg === null) {
        r = c & 255;
        g = c >>> 8 & 255;
        b = c >>> 16 & 255;
        a = ca;
      } else {
        const k = flat ? bg : bg[i], f2 = ca / 255;
        r = (c & 255) * f2 + (k & 255) * (1 - f2);
        g = (c >>> 8 & 255) * f2 + (k >>> 8 & 255) * (1 - f2);
        b = (c >>> 16 & 255) * f2 + (k >>> 16 & 255) * (1 - f2);
        a = 255;
      }
      if (l) {
        const lr = (l & 255) * lightK, lg = (l >>> 8 & 255) * lightK, lb = (l >>> 16 & 255) * lightK;
        if (a < 255) {
          const pa = a / 255, pr = r * pa + lr, pg = g * pa + lg, pb = b * pa + lb;
          const na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
          if (na > 0) {
            r = Math.min(255, pr / na);
            g = Math.min(255, pg / na);
            b = Math.min(255, pb / na);
            a = na * 255;
          }
        } else {
          r = Math.min(255, r + lr);
          g = Math.min(255, g + lg);
          b = Math.min(255, b + lb);
        }
      }
      const j = i * 4;
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = a;
    }
    return out;
  }

  // vendor/pixelfx/core/scene.js
  var SKY = hex("#15131d");
  var SKY_TOP = hex("#0d0b14");
  var SKY_LOW = hex("#221d33");
  var FLOOR_EDGE = hex("#4a4263");
  var FLOOR = hex("#2b2639");
  var FLOOR_DARK = hex("#211d2d");
  var MORTAR = hex("#1a1724");

  // vendor/pixelfx/core/rig.js
  var PAL2 = Object.fromEntries(Object.entries(DUMMY_PAL).map(([k, v]) => [k, hex(v) >>> 0]));
  var INK2 = PAL2.k;
  var SEAM = PAL2.J;
  var MARK = PAL2.m;
  var SHELL = [PAL2.A, PAL2.B, PAL2.C, PAL2.D];
  var CORE = [PAL2.E, PAL2.F, PAL2.G, PAL2.G];
  var DEG = Math.PI / 180;
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var len = (a) => Math.hypot(a[0], a[1], a[2]);
  var unit = (a) => mul(a, 1 / (len(a) || 1e-6));
  var rotY = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  };
  var rotZ = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  };
  var mm = (A, B2) => {
    const o = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B2[c] + A[r * 3 + 1] * B2[3 + c] + A[r * 3 + 2] * B2[6 + c];
    return o;
  };
  var mv = (M2, v) => [M2[0] * v[0] + M2[1] * v[1] + M2[2] * v[2], M2[3] * v[0] + M2[4] * v[1] + M2[5] * v[2], M2[6] * v[0] + M2[7] * v[1] + M2[8] * v[2]];
  var clamp01 = (v) => Math.max(0, Math.min(1, v));
  var M = {
    pelvis: 19.7,
    spine1: 2.8,
    spine2: 4.6,
    shoulderUp: 2.5,
    shoulderOut: 5.9,
    neckUp: 4,
    headUp: 3.1,
    hipDown: 1.1,
    hipOut: 2.8,
    thigh: 8.6,
    shin: 8.3,
    upper: 7.6,
    fore: 7.4,
    turn: 36 * DEG
  };
  var STAND = { lean: 0, crouch: 0, yaw: 0, fx: -3, fy: -15, bx: 5, by: -15, ffx: -2, ffy: -4, fbx: 3, fby: -4 };
  function ik(a, target, L1, L2, pole) {
    let to = sub(target, a), d = len(to);
    const reach = L1 + L2 - 0.02;
    if (d > reach) {
      to = mul(to, reach / d);
      d = reach;
    }
    const u = unit(to), along3 = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - along3 * along3));
    let v = sub(pole, mul(u, dot(pole, u)));
    v = len(v) < 1e-4 ? unit(cross(u, [0, 0, 1])) : unit(v);
    return { joint: add(a, add(mul(u, along3), mul(v, h))), end: add(a, to), u, v };
  }
  function frame(t, R) {
    return { t, R };
  }
  function boneFrame(a, b, pole) {
    const x = unit(sub(b, a));
    let y = sub(pole, mul(x, dot(pole, x)));
    y = len(y) < 1e-4 ? unit(cross(x, [0, 0, 1])) : unit(y);
    const z = cross(x, y);
    return frame(a, [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]]);
  }
  var weaponOf = (name) => WEAPONS[name];
  function solve(pose) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const q = { ...STAND, ...pose }, lean = q.lean, W6 = q.weapon && weaponOf(q.weapon), OW = q.offWeapon && weaponOf(q.offWeapon);
    const sa = (_a = q.sa) != null ? _a : 0, wl = (_b = q.wl) != null ? _b : 1, axisZ = Math.sqrt(Math.max(0, 1 - wl * wl)) * ((_c = q.wz) != null ? _c : 1);
    const axis = [Math.cos(sa) * wl, -Math.sin(sa) * wl, axisZ], side = [-Math.sin(sa), -Math.cos(sa), 0];
    const two = !!(q.two && W6), nearZ = (_d = q.fz) != null ? _d : two ? 3 : 4.5;
    const fwd = (q.fx - STAND.fx) / 24, farFwd = two ? 0 : (q.bx - STAND.bx) / 22;
    let turn = M.turn + (fwd >= 0 ? -44 * DEG * Math.min(1, fwd) : 28 * DEG * Math.min(1, -fwd * 1.8));
    turn += (farFwd > 0 ? 34 * DEG * Math.min(1, farFwd) : 0) + ((_e = q.twist) != null ? _e : 0) * 4 * DEG;
    if (q.turn !== void 0) turn = q.turn;
    const hipTurn = M.turn + (turn - M.turn) * 0.45, tilt = Math.atan2(lean, 13);
    const Rp = mm(rotZ(-tilt * 0.25), rotY(-hipTurn)), Rc = mm(rotZ(-tilt), rotY(-turn));
    const ankleN = [q.ffx, -q.ffy - 1.8, (_f = q.fzz) != null ? _f : 2.4], ankleF = [q.fbx, -q.fby - 1.8, (_g = q.bzz) != null ? _g : -2.4];
    let pelvis = [lean * 0.2, M.pelvis - q.crouch, 0];
    const hipAt = (s) => add(pelvis, mv(Rp, [0, -M.hipDown, s * M.hipOut]));
    const maxLeg = (M.thigh + M.shin) * 0.995;
    for (const [s, a] of [[1, ankleN], [-1, ankleF]]) {
      const h = hipAt(s), dx = h[0] - a[0], dz = h[2] - a[2], flat = dx * dx + dz * dz;
      if (flat < maxLeg * maxLeg) {
        const top = a[1] + Math.sqrt(maxLeg * maxLeg - flat);
        if (h[1] > top) pelvis = [pelvis[0], pelvis[1] - (h[1] - top), pelvis[2]];
      }
    }
    const waist = add(pelvis, [Math.sin(tilt * 0.45) * M.spine1, Math.cos(tilt * 0.45) * M.spine1, 0]);
    const chest = add(waist, [Math.sin(tilt) * M.spine2, Math.cos(tilt) * M.spine2, 0]);
    const neck = add(chest, mv(Rc, [0, M.neckUp, 0]));
    const headTurn = M.turn * 0.9 + (turn - M.turn) * 0.35, nod = tilt * 0.35 + ((_h = q.hy) != null ? _h : 0) * 7 * DEG, roll = ((_i = q.hx) != null ? _i : 0) * 7 * DEG;
    const Rh = mm(rotZ(-nod - roll), rotY(-headTurn));
    const head4 = add(neck, mv(Rh, [0.15, M.headUp, 0]));
    const pick = (s, target) => {
      const base = add(chest, mv(Rc, [0, M.shoulderUp, s * M.shoulderOut])), to = sub(target, base), d = len(to);
      return add(base, mul(unit(to), Math.min(1.8, Math.max(0, d - 11) * 0.35)));
    };
    const nearT = [q.fx, -q.fy, nearZ];
    const farT = two ? [q.fx + axis[0] * W6.two, -q.fy + axis[1] * W6.two, nearZ + axis[2] * W6.two] : [q.bx, -q.by, (_j = q.bz) != null ? _j : q.armsFront ? 5.5 : -4.5];
    const sN = pick(1, nearT), sF = pick(-1, farT);
    const pole = (s, T4, shoulder, hold) => {
      const up = clamp01((T4[1] - shoulder[1] + 2) / 10);
      const base = [-0.55 + up * 1.1, -1 + up * 0.9, s * (0.45 + up * 0.5)];
      if (!hold) return base;
      const u = unit(sub(T4, shoulder));
      let best = base, score = Infinity;
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, x = unit(cross(u, [0.3, 1, 0.2])), y = cross(u, x), v = add(mul(x, Math.cos(a)), mul(y, Math.sin(a)));
        const A = ik(shoulder, T4, M.upper, M.fore, v), f = unit(sub(A.end, A.joint));
        const cost = Math.abs(dot(f, hold)) * 0.7 + (1 - dot(unit(base), v)) * 0.55;
        if (cost < score) {
          score = cost;
          best = v;
        }
      }
      return best;
    };
    const holdN = W6 ? W6.across ? side : axis : null, holdF = two ? W6.across ? side : axis : OW ? [Math.cos((_k = q.sb) != null ? _k : Math.PI), -Math.sin((_l = q.sb) != null ? _l : Math.PI), 0] : null;
    const armN = ik(sN, nearT, M.upper, M.fore, pole(1, nearT, sN, holdN)), armF = ik(sF, farT, M.upper, M.fore, pole(-1, farT, sF, holdF));
    const kneePole = (s) => mv(Rp, [1, 0, s * 0.35]);
    const hipN = hipAt(1), hipF = hipAt(-1);
    const legN = ik(hipN, ankleN, M.thigh, M.shin, kneePole(1)), legF = ik(hipF, ankleF, M.thigh, M.shin, kneePole(-1));
    const footDir = (s) => {
      const t = hipTurn * 0.6 + s * 8 * DEG;
      return [Math.cos(t), 0, Math.sin(t)];
    };
    const B2 = {
      pelvis: frame(pelvis, Rp),
      waist: frame(waist, mm(rotZ(-tilt * 0.6), rotY(-(turn + hipTurn) / 2))),
      chest: frame(chest, Rc),
      head: frame(head4, Rh),
      neck: frame(neck, Rh),
      upperN: boneFrame(sN, armN.joint, armN.v),
      foreN: boneFrame(armN.joint, armN.end, armN.v),
      upperF: boneFrame(sF, armF.joint, armF.v),
      foreF: boneFrame(armF.joint, armF.end, armF.v),
      thighN: boneFrame(hipN, legN.joint, legN.v),
      shinN: boneFrame(legN.joint, legN.end, legN.v),
      thighF: boneFrame(hipF, legF.joint, legF.v),
      shinF: boneFrame(legF.joint, legF.end, legF.v)
    };
    B2.footN = frame(legN.end, mm(rotY(-Math.atan2(footDir(1)[2], footDir(1)[0])), rotZ(q.toeF ? -55 * DEG : 0)));
    B2.footF = frame(legF.end, mm(rotY(-Math.atan2(footDir(-1)[2], footDir(-1)[0])), rotZ(q.toeB ? -55 * DEG : 0)));
    return { B: B2, W: W6, OW, q, axis, side, armN, armF, legN, legF, sN, sF, hipN, hipF, turn };
  }
  var BW = 300;
  var BH = 240;
  var OX = 150;
  var OY = 180;
  var Zb = new Float32Array(BW * BH);
  var Tone = new Float32Array(BW * BH);
  var Part = new Int8Array(BW * BH);
  var Mat = new Int8Array(BW * BH);
  var Fr = new Int8Array(BW * BH);
  var LX = new Float32Array(BW * BH);
  var LY = new Float32Array(BW * BH);
  var Col = new Uint32Array(BW * BH);
  var touched = [];
  var LIGHT = unit([-0.55, 0.72, 0.5]);
  var curFrameIndex = 0;
  var onlyPart = 0;
  function plot(i, z, tone, part, mat, wx, wy, color) {
    if (onlyPart && part !== onlyPart) return;
    if (Part[i] === 0) touched.push(i);
    else if (z <= Zb[i]) return;
    Zb[i] = z;
    Tone[i] = tone;
    Part[i] = part;
    Mat[i] = mat;
    Fr[i] = curFrameIndex;
    LX[i] = wx;
    LY[i] = wy;
    Col[i] = color;
  }
  var PART = { pelvis: 1, waist: 2, chest: 3, neck: 4, head: 5, face: 6, upperN: 7, elbowN: 8, foreN: 9, handN: 10, upperF: 11, elbowF: 12, foreF: 13, handF: 14, thighN: 15, kneeN: 16, shinN: 17, footN: 18, thighF: 19, kneeF: 20, shinF: 21, footF: 22, weapon: 23, offWeapon: 24 };
  var STEEL = Object.fromEntries(Object.entries({ hi: "#ffffff", a: "#e8edf6", b: "#a4afc6", d: "#68748f", gold: "#ffd84a", goldD: "#b8862a", grip: "#7a3a2a", gripD: "#4a2018", wood: "#8a5a32", woodD: "#5a3820", dark: "#3a3448", darkD: "#262033", olive: "#58663f", oliveA: "#7d8c58", oliveD: "#3a4529" }).map(([k, v]) => [k, hex(v) >>> 0]));
  function blade(T4, from, length, w) {
    for (let i = from; i <= from + length + 0.01; i += 0.4) {
      const r = i - from, wd = r > length - 5 ? Math.max(0, (length - r) / 5 * w) : w;
      for (let k = -wd; k <= wd + 0.01; k += 0.4) T4(i, k, k < -w * 0.4 ? STEEL.hi : k > w * 0.4 ? STEEL.d : STEEL.a);
    }
  }
  var haft = (T4, from, to, a, d, r = 0.8) => {
    for (let i = from; i <= to; i += 0.4) for (let k = -r; k <= r + 0.01; k += 0.4) T4(i, k, k > 0.1 ? d : a);
  };
  var WEAPONS = {
    // the fist is at i = 0; `two` is where the other hand goes; `across`: the handle lies across the weapon's length
    sword: { two: -4.4, draw(T4, q) {
      const end = q.two ? -6.5 : -2.6;
      haft(T4, end, 2.2, STEEL.grip, STEEL.gripD);
      for (let k = -1.4; k <= 1.4; k += 0.4) T4(end - 0.4, k, STEEL.gold);
      for (let k = -4.6; k <= 4.6; k += 0.4) T4(2.6, k, Math.abs(k) > 3.8 ? STEEL.goldD : STEEL.gold), T4(3, k, STEEL.goldD);
      blade(T4, 3.2, 25, 2.2);
    } },
    greatsword: { two: -4.8, draw(T4) {
      haft(T4, -7.2, 2.2, STEEL.grip, STEEL.gripD);
      for (let k = -1.8; k <= 1.8; k += 0.4) T4(-7.6, k, STEEL.gold);
      for (let k = -6.6; k <= 6.6; k += 0.4) T4(2.6, k, Math.abs(k) > 5.6 ? STEEL.goldD : STEEL.gold), T4(3, k, STEEL.goldD);
      blade(T4, 3.2, 31, 3);
      for (let i = 4; i <= 28; i += 0.4) T4(i, 0, STEEL.b);
    } },
    dagger: { draw(T4) {
      haft(T4, -2.4, 1.8, STEEL.grip, STEEL.gripD);
      for (let k = -2.6; k <= 2.6; k += 0.4) T4(2.2, k, STEEL.goldD);
      blade(T4, 2.6, 10, 1.3);
    } },
    spear: { two: -12, draw(T4) {
      haft(T4, -18, 36, STEEL.wood, STEEL.woodD, 0.5);
      blade(T4, 36, 11, 2);
      for (let k = -2.4; k <= 2.4; k += 0.4) T4(36, k, STEEL.goldD);
    } },
    hammer: { two: -7, draw(T4) {
      for (const lift of [-0.8, 0, 0.8]) for (let i = -10; i <= 18; i += 0.4) for (let k = -0.8; k <= 0.81; k += 0.4) T4(i, k, k > 0.1 ? STEEL.woodD : STEEL.wood, lift);
      for (let i = 18; i <= 28; i += 0.4) for (let k = -9; k <= 9; k += 0.4) {
        const face = Math.abs(k) > 7.4 ? k < 0 ? STEEL.a : STEEL.d : i < 20 ? STEEL.hi : i > 26.4 ? STEEL.d : Math.abs(k) < 2 ? STEEL.gold : STEEL.b;
        T4(i, k, face, 4.5);
        T4(i, k, face, -4.5);
        if (i < 18.4 || i > 27.6 || Math.abs(k) > 8.6) for (let l = -4; l <= 4; l += 0.4) T4(i, k, k < 0 ? STEEL.a : i > 27.6 ? STEEL.d : STEEL.b, l);
      }
    } },
    scythe: { two: -11, draw(T4) {
      haft(T4, -16, 31, STEEL.dark, STEEL.darkD, 0.5);
      for (let j = 0; j <= 28; j += 0.4) {
        const u = j / 28, w = 3.2 * (1 - u) + 0.3, b = 31.5 - u * u * 12;
        for (let k = -w; k <= w; k += 0.4) T4(b + k, j + 0.8, k > w * 0.3 ? STEEL.hi : k < -w * 0.4 ? STEEL.d : STEEL.b);
      }
    } },
    claw: { draw(T4) {
      for (const q0 of [-2.4, 0, 2.4])
        for (let i = 2; i <= 9.5; i += 0.4) {
          const u = (i - 2) / 7.5, k = q0 + u * u * 1.8;
          T4(i, k, u > 0.55 ? STEEL.hi : STEEL.a);
          if (u < 0.6) T4(i, k + 0.8, STEEL.d);
        }
    } },
    bow: { across: true, draw(T4, q, off) {
      for (let u = -1; u <= 1.001; u += 0.025) {
        const k = u * 17, i = 6 * (1 - u * u) - 1;
        T4(i, k, Math.abs(u) > 0.85 ? STEEL.goldD : STEEL.wood);
        T4(i + 0.8, k, STEEL.woodD);
      }
      const tipA = T4.at(-1, -17), tipB = T4.at(-1, 17), mid = q.pull ? off : T4.at(-1, 0);
      const line = (A, B2, c) => {
        const n = Math.max(2, Math.ceil(len(sub(B2, A)) / 0.4)), Z = STEEL.a;
        for (let k = 0; k <= n; k++) {
          const P4 = add(A, mul(sub(B2, A), k / n)), wx = Math.round(P4[0]), wy = Math.round(P4[1]), idx = (OY - wy) * BW + (OX + wx);
          curFrameIndex = -1;
          plot(idx, P4[2] + 0.05, 2, PART.weapon, 2, wx, wy, c != null ? c : Z);
        }
      };
      line(tipA, mid);
      line(tipB, mid);
      if (q.nocked) {
        const nock = mid, tip = T4.at(13, 0);
        line(nock, tip, STEEL.wood);
        for (let i = 9; i <= 13; i += 0.4) for (let k = -(13 - i) * 0.45; k <= (13 - i) * 0.45; k += 0.4) T4(i, k, STEEL.hi);
      }
    } },
    pistol: { across: true, draw(T4) {
      for (let i = -1; i <= 9.5; i += 0.4) for (let k = -4.2; k <= -2.4; k += 0.4) T4(i, k, k < -3.6 ? STEEL.a : k > -2.9 ? STEEL.d : STEEL.b);
      for (let i = -1.2; i <= 1.2; i += 0.4) for (let k = -2.4; k <= 2.4; k += 0.4) T4(i, k, STEEL.gripD);
      T4(9, -4.6, STEEL.hi);
    } },
    launcher: { two: -9, draw(T4) {
      for (let i = -14; i <= 22; i += 0.4) for (let k = -6; k <= -1; k += 0.4) T4(i, k, k < -4.8 ? STEEL.oliveA : k > -2.2 ? STEEL.oliveD : Math.abs(i - 3) < 1.4 ? STEEL.gold : STEEL.olive);
      for (let k = -6.8; k <= -0.2; k += 0.4) T4(22.4, k, STEEL.b), T4(-14.4, k, STEEL.d);
    } },
    handle: { draw(T4) {
      haft(T4, -2.6, 6, STEEL.grip, STEEL.gripD);
      for (let k = -1.6; k <= 1.6; k += 0.4) T4(-3, k, STEEL.gold), T4(6.4, k, STEEL.gold);
    } }
  };
  var REST_FRAMES = null;
  REST_FRAMES = solve({}).B;

  // vendor/pixelfx/core/act.js
  var TW = 38;
  var TH = 52;
  var TP = Object.fromEntries(Object.entries({ ink: "#0b0a1a", wood: "#724c2e", woodL: "#a0703a", woodD: "#4e331f", straw: "#d2aa55", strawL: "#f0d98a", burlapD: "#86643a", burlap: "#b38b57", burlapL: "#c9a26c", red: "#9a2f3c", redL: "#c4434f", white: "#ffffff" }).map(([k, v]) => [k, hex(v)]));
  var DUST = ["#efe7dc", "#c9bfb8", "#8f8693", "#5a5468"].map(hex);
  var DUMMY = new Uint32Array(TW * TH);
  (function buildDummy() {
    const px = (x, y, c) => {
      if (x >= 0 && y >= 0 && x < TW && y < TH) DUMMY[y * TW + x] = c;
    };
    const R = (x, y, w, h, c) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c);
    };
    R(15, 38, 8, 14, TP.ink);
    R(16, 34, 6, 18, TP.wood);
    R(16, 34, 2, 18, TP.woodL);
    R(20, 34, 2, 18, TP.woodD);
    R(1, 18, 36, 1, TP.ink);
    R(1, 23, 36, 1, TP.ink);
    R(1, 19, 36, 4, TP.wood);
    R(1, 19, 36, 1, TP.woodL);
    R(1, 22, 36, 1, TP.woodD);
    for (const [bx, s] of [[0, -1], [33, 1]]) {
      R(bx, 17, 5, 8, TP.straw);
      for (const [dx, dy, c] of [[2, 16, TP.straw], [3, 15, TP.strawL], [1, 17, TP.strawL], [2, 25, TP.straw], [1, 26, TP.strawL], [3, 25, TP.burlapD], [2, 19, TP.strawL], [3, 21, TP.strawL], [1, 22, TP.burlapD], [2, 23, TP.strawL]]) px(bx + dx, dy, c);
      px(s < 0 ? bx - 1 : bx + 5, 19, TP.straw);
      px(s < 0 ? bx - 1 : bx + 5, 22, TP.strawL);
    }
    const sack = (x, y, w, h) => {
      R(x + 1, y, w - 2, 1, TP.ink);
      R(x + 1, y + h - 1, w - 2, 1, TP.ink);
      R(x, y + 1, 1, h - 2, TP.ink);
      R(x + w - 1, y + 1, 1, h - 2, TP.ink);
      R(x + 1, y + 1, w - 2, h - 2, TP.burlap);
      R(x + w - 4, y + 1, 3, h - 2, TP.burlapD);
      R(x + 1, y + h - 3, w - 2, 2, TP.burlapD);
      R(x + 1, y + 1, 1, h - 4, TP.burlapL);
      R(x + 1, y + 1, w - 6, 1, TP.burlapL);
      for (let j = y + 2; j < y + h - 2; j += 3) for (let i = x + 3 + j % 2; i < x + w - 4; i += 4) px(i, j, TP.burlapD);
    };
    sack(9, 17, 20, 24);
    for (let y = 19; y < 36; y++) for (let x = 11; x < 27; x++) {
      const d = Math.hypot(x - 18.5, y - 27);
      if (d > 4 && d < 5.4 || d < 1.9) px(x, y, x + y < 45 ? TP.redL : TP.red);
    }
    for (let x = 10; x < 28; x++) {
      px(x, 36, x & 1 ? TP.woodL : TP.straw);
      px(x, 37, x & 1 ? TP.woodD : TP.wood);
    }
    for (const [x, y, c] of [[11, 41, TP.straw], [12, 42, TP.strawL], [14, 41, TP.strawL], [15, 42, TP.straw], [23, 41, TP.straw], [24, 42, TP.strawL], [26, 41, TP.straw], [13, 43, TP.straw], [25, 43, TP.straw]]) px(x, y, c);
    sack(10, 1, 18, 16);
    for (const ex of [14, 23]) for (let d = -2; d <= 2; d++) {
      px(ex + d, 7 + d, TP.ink);
      px(ex - d, 7 + d, TP.ink);
    }
    for (let x = 14; x < 24; x++) px(x, 12, x & 1 ? TP.ink : TP.burlapD);
    for (const x of [15, 18, 21]) {
      px(x, 11, TP.ink);
      px(x, 13, TP.ink);
    }
    for (let x = 12; x < 26; x++) {
      px(x, 16, x & 1 ? TP.woodL : TP.straw);
      px(x, 17, x & 1 ? TP.wood : TP.woodD);
    }
    for (const [x, y, c] of [[13, 0, TP.straw], [15, 0, TP.strawL], [18, 0, TP.straw], [21, 0, TP.strawL], [24, 0, TP.straw], [9, 4, TP.straw], [28, 6, TP.straw], [8, 7, TP.strawL], [29, 3, TP.strawL]]) px(x, y, c);
  })();
  var SKINS = { flash: [TP.white, 1], char: [hex("#1a0c0e"), 0.72], ice: [hex("#a8e8ff"), 0.72], shadow: [hex("#3a1a70"), 0.5], holy: [hex("#fff4c0"), 0.5], red: [hex("#ff2040"), 0.45], shock: [hex("#8fd6ff"), 0.6], poison: [hex("#58c43a"), 0.5] };
  var STRAW = [TP.strawL, TP.straw, TP.straw, TP.burlapD, TP.burlapD];
  var REST_MASK = new Uint8Array(24 * 38);
  var REST_PX = new Uint32Array(24 * 38);
  HERO2.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== ".") {
      REST_MASK[r * 24 + c] = 1;
      REST_PX[r * 24 + c] = hex(DUMMY_PAL[ch]);
    }
  }));
  var NEAREST = new Int16Array(24 * 38).fill(-1);
  for (let r = 0; r < 38; r++)
    for (let c = 0; c < 24; c++) {
      let best = -1, bd = 1e9;
      for (let y = Math.max(0, r - 7); y < Math.min(38, r + 8); y++)
        for (let x = Math.max(0, c - 7); x < Math.min(24, c + 8); x++) {
          const d = (x - c) * (x - c) + (y - r) * (y - r);
          if (REST_MASK[y * 24 + x] && d < bd) {
            bd = d;
            best = y * 24 + x;
          }
        }
      NEAREST[r * 24 + c] = best;
    }

  // vendor/pixelfx/core/poses.js
  var READY = { crouch: 3, fx: 11, fy: -21, bx: 9, by: -21, ffx: 7, fbx: -7 };

  // vendor/pixelfx/fx/weather/rain.js
  var rain_exports = {};
  __export(rain_exports, {
    draw: () => draw,
    drawBack: () => drawBack,
    meta: () => meta
  });

  // vendor/pixelfx/fx/weather/_lib.js
  var BAYER2 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  function box(meta35) {
    const [W6, H3] = meta35.size, [OX2, OY2] = meta35.origin;
    return { x0: -OX2, y0: -OY2, x1: W6 - OX2, y1: H3 - OY2, w: W6, h: H3 };
  }
  function clip(p, meta35) {
    const B2 = box(meta35), q = Object.create(p);
    let ok;
    if (p.sn === 0) {
      const a = p.toX(B2.x0, 0), b = p.toX(B2.x1, 0), sx0 = Math.round(Math.min(a, b)), sx1 = Math.round(Math.max(a, b));
      const sy0 = Math.round(p.toY(0, B2.y0)), sy1 = Math.round(p.toY(0, B2.y1));
      ok = (sx, sy) => sx >= sx0 && sx < sx1 && sy >= sy0 && sy < sy1;
    } else
      ok = (sx, sy) => {
        const lx = p.fromX(sx + 0.5, sy + 0.5), ly = p.fromY(sx + 0.5, sy + 0.5);
        return lx >= B2.x0 && lx < B2.x1 && ly >= B2.y0 && ly < B2.y1;
      };
    q.put = (sx, sy, c, a) => ok(sx, sy) && p.put(sx, sy, c, a);
    q.add = (sx, sy, c, k) => ok(sx, sy) && p.add(sx, sy, c, k);
    q.blendPx = (sx, sy, c, a) => ok(sx, sy) && p.blendPx(sx, sy, c, a);
    q.glow = (x, y, r, c, k) => glow(q, B2, x, y, r, c, k);
    return q;
  }
  function glow(q, B2, x, y, r, c, k) {
    if (r < 1 || k <= 4e-3) return;
    const x0 = Math.max(B2.x0, Math.floor(x - r)), x1 = Math.min(B2.x1 - 1, Math.ceil(x + r));
    const y0 = Math.max(B2.y0, Math.floor(y - r)), y1 = Math.min(B2.y1 - 1, Math.ceil(y + r));
    for (let py = y0; py <= y1; py++) {
      const dy = (py + 0.5 - y) / r;
      for (let px = x0; px <= x1; px++) {
        const dx = (px + 0.5 - x) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        q.light(px, py, c, f * f * k);
      }
    }
  }
  var OUT2 = { c: 0, a: 1, b: 0, l: 0, k: 0 };
  function pass(p, meta35, y0, y1, fn) {
    const B2 = box(meta35), o = OUT2;
    y0 = Math.max(B2.y0, Math.floor(y0));
    y1 = Math.min(B2.y1 - 1, Math.ceil(y1));
    if (y0 > y1) return;
    if (p.sn !== 0) {
      const q = clip(p, meta35);
      for (let y = y0; y <= y1; y++)
        for (let x = B2.x0; x < B2.x1; x++) {
          o.c = 0;
          o.a = 1;
          o.b = 0;
          o.l = 0;
          o.k = 0;
          fn(x + 0.5, y + 0.5, o);
          if (o.c) o.b ? q.blend(x, y, o.c, o.a) : q.dot(x, y, o.c, o.a);
          if (o.k > 0) q.light(x, y, o.l || o.c, o.k);
        }
      return;
    }
    const C = p.C, L = p.L, W6 = p.w, fade = p.fade, lk = p.lightK * fade, fx = p.fx, tx = p.tx;
    for (let y = y0; y <= y1; y++) {
      const sy = Math.floor(p.ty + y + 0.5), ry = sy - p.oy;
      if (ry < 0 || ry >= p.h) continue;
      const row = ry * W6, by = (sy & 3) << 2;
      let sxf = tx + (B2.x0 + 0.5) * fx;
      for (let x = B2.x0; x < B2.x1; x++, sxf += fx) {
        const sx = Math.floor(sxf), rx = sx - p.ox;
        if (rx < 0 || rx >= W6) continue;
        o.c = 0;
        o.a = 1;
        o.b = 0;
        o.l = 0;
        o.k = 0;
        fn(x + 0.5, y + 0.5, o);
        const i = row + rx;
        if (o.c) {
          const a = o.a * fade;
          if (o.b) {
            if (a > 4e-3) {
              const d = C[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa, j = 1 - k, c = o.c;
              const r = (c & 255) * k + (d & 255) * j & 255, g = (c >>> 8 & 255) * k + (d >>> 8 & 255) * j & 255;
              const b = (c >>> 16 & 255) * k + (d >>> 16 & 255) * j & 255;
              C[i] = (oa * 255 & 255) << 24 | b << 16 | g << 8 | r;
            }
          } else if (a >= 1 || a > BAYER2[by | sx & 3]) C[i] = o.c;
        }
        if (o.k > 0) {
          const k = o.k * lk;
          if (k > 4e-3) {
            const c = o.l || o.c, d = L[i];
            const r = Math.min(255, (d & 255) + (c & 255) * k) | 0, g = Math.min(255, (d >>> 8 & 255) + (c >>> 8 & 255) * k) | 0;
            const b = Math.min(255, (d >>> 16 & 255) + (c >>> 16 & 255) * k) | 0;
            L[i] = 255 << 24 | b << 16 | g << 8 | r;
          }
        }
      }
    }
  }
  var ROW = { w: 0, c: null, a: null, b: null, l: null, k: null };
  function rows(p, meta35, y0, y1, fn) {
    const B2 = box(meta35), w = B2.w, R = ROW;
    if (R.w !== w) Object.assign(R, { w, c: new Uint32Array(w), a: new Float32Array(w), b: new Uint8Array(w), l: new Uint32Array(w), k: new Float32Array(w) });
    y0 = Math.max(B2.y0, Math.floor(y0));
    y1 = Math.min(B2.y1 - 1, Math.ceil(y1));
    const rot = p.sn !== 0, q = rot ? clip(p, meta35) : null;
    const C = p.C, L = p.L, W6 = p.w, fade = p.fade, lk = p.lightK * fade, fx = p.fx;
    for (let y = y0; y <= y1; y++) {
      R.c.fill(0);
      R.k.fill(0);
      R.a.fill(1);
      R.b.fill(0);
      fn(y + 0.5, R);
      if (rot) {
        for (let i = 0; i < w; i++) {
          if (R.c[i]) R.b[i] ? q.blend(B2.x0 + i, y, R.c[i], R.a[i]) : q.dot(B2.x0 + i, y, R.c[i], R.a[i]);
          if (R.k[i] > 0) q.light(B2.x0 + i, y, R.l[i] || R.c[i], R.k[i]);
        }
        continue;
      }
      const sy = Math.floor(p.ty + y + 0.5), ry = sy - p.oy;
      if (ry < 0 || ry >= p.h) continue;
      const row = ry * W6, by = (sy & 3) << 2;
      let sxf = p.tx + (B2.x0 + 0.5) * fx;
      for (let i = 0; i < w; i++, sxf += fx) {
        const c = R.c[i], kk = R.k[i];
        if (!c && !(kk > 0)) continue;
        const sx = Math.floor(sxf), rx = sx - p.ox;
        if (rx < 0 || rx >= W6) continue;
        const j = row + rx;
        if (c) {
          const a = R.a[i] * fade;
          if (R.b[i]) {
            if (a > 4e-3) {
              const d = C[j], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa, m = 1 - k;
              const r = (c & 255) * k + (d & 255) * m & 255, g = (c >>> 8 & 255) * k + (d >>> 8 & 255) * m & 255;
              const b = (c >>> 16 & 255) * k + (d >>> 16 & 255) * m & 255;
              C[j] = (oa * 255 & 255) << 24 | b << 16 | g << 8 | r;
            }
          } else if (a >= 1 || a > BAYER2[by | sx & 3]) C[j] = c;
        }
        if (kk > 0) {
          const k = kk * lk;
          if (k > 4e-3) {
            const lc = R.l[i] || c, d = L[j];
            const r = Math.min(255, (d & 255) + (lc & 255) * k) | 0, g = Math.min(255, (d >>> 8 & 255) + (lc >>> 8 & 255) * k) | 0;
            const b = Math.min(255, (d >>> 16 & 255) + (lc >>> 16 & 255) * k) | 0;
            L[j] = 255 << 24 | b << 16 | g << 8 | r;
          }
        }
      }
    }
  }
  var bayer = (x, y) => BAYER2[(Math.floor(y) & 3) << 2 | Math.floor(x) & 3];
  var FIELDS = /* @__PURE__ */ new Map();
  function field(seed, w = 256, h = 128, cells = [4, 8, 16, 32]) {
    const key = `${seed}|${w}|${h}|${cells}`;
    let F = FIELDS.get(key);
    if (F) return F;
    const d = new Float32Array(w * h);
    let amp = 0.5, total = 0;
    for (const n of cells) {
      const cs = w / n, rows2 = Math.max(1, Math.round(h / cs));
      const at2 = (a, b) => rand(wrap(a, n), wrap(b, rows2), seed, n);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const gx = x / cs, gy = y / h * rows2, ix = Math.floor(gx), iy = Math.floor(gy), u = gx - ix, v = gy - iy;
          const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
          const top = at2(ix, iy) + (at2(ix + 1, iy) - at2(ix, iy)) * su, bot = at2(ix, iy + 1) + (at2(ix + 1, iy + 1) - at2(ix, iy + 1)) * su;
          d[y * w + x] += (top + (bot - top) * sv) * amp;
        }
      total += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < d.length; i++) d[i] /= total;
    FIELDS.set(key, F = { w, h, d });
    return F;
  }
  function sample(F, u, v) {
    const x = Math.floor(u), y = Math.floor(v), fx = u - x, fy = v - y, m = F.w - 1, n = F.h - 1, D16 = F.d;
    const x0 = x & m, x1 = x + 1 & m, y0 = (y & n) * F.w, y1 = (y + 1 & n) * F.w;
    const a = D16[y0 + x0], b = D16[y0 + x1], c = D16[y1 + x0], e = D16[y1 + x1];
    return a + (b - a) * fx + (c - a + (a - b - c + e) * fx) * fy;
  }
  function trips(t, D16, n, seed, m0, m1, fn) {
    for (let i = 0; i < n; i++) {
      const m = m0 + Math.floor(rand(seed, i, 72) * (m1 - m0 + 1)), s = t / D16 * m + rand(seed, i, 71), k = Math.floor(s);
      fn(s - k, k, m, i);
    }
  }
  function tree(R, x0, y0, x1, y1, jag = 0.3, forks = 0.4, w = 1, depth = 0) {
    const out = [], L = Math.hypot(x1 - x0, y1 - y0);
    let pts = [[x0, y0], [x1, y1]], off = L * jag;
    while (pts.length < 2 + L / 3) {
      const nxt = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay) || 1, o = R.range(-off, off);
        nxt.push([(ax + bx) / 2 + -(by - ay) / l * o, (ay + by) / 2 + (bx - ax) / l * o], [bx, by]);
      }
      pts = nxt;
      off *= 0.52;
    }
    out.push({ pts, w, depth });
    if (depth < 2) {
      for (let i = 2; i < pts.length - 3; i++)
        if (R.chance(forks / (1 + depth) / Math.max(4, pts.length / 6))) {
          const [ax, ay] = pts[i], [bx, by] = pts[Math.min(pts.length - 1, i + 3)];
          const a = Math.atan2(by - ay, bx - ax) + R.sign() * R.range(0.35, 0.95), l = (L - i / pts.length * L) * R.range(0.25, 0.55);
          out.push(...tree(R, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, jag * 1.1, forks, w * 0.55, depth + 1));
        }
    }
    return out;
  }
  function splash(q, x, z, age, size, c, h) {
    const L = 0.3 + 0.12 * size, u = age / L;
    if (u >= 1) return;
    if (age < 0.07) {
      q.px(x, z - 1, c.hot);
      if (size > 0.3) q.px(x - 1, z - 1 - (age > 0.035 ? 1 : 0), c.hot), q.px(x + 1, z - 1 - (age > 0.035 ? 1 : 0), c.hot);
      if (size > 0.65 && age > 0.03) q.px(x - 2, z - 2, c.cool), q.px(x + 2, z - 2, c.cool);
    }
    const rx = 1 + (1.2 + 3.6 * size) * Math.sqrt(u), ry = Math.max(0.5, rx * 0.26), n = Math.ceil(rx * 6.5);
    for (let j = 0; j < n; j++) {
      const a = j / n * TAU, s = Math.sin(a);
      if (s < -0.25) continue;
      q.dot(x + Math.cos(a) * rx, z + s * ry, u < 0.3 && s > 0 ? c.hot : c.cool, u < 0.45 ? s > 0.2 ? 1 : 0.7 : (1 - u) * 1.6 * (s > 0.2 ? 1 : 0.6));
    }
    const nd = size > 0.55 ? 3 : 2, H3 = Math.floor(h * 1e6);
    for (let d = 0; d < nd; d++) {
      const vx = (rand(H3, d, 1) - 0.5) * 2 * (25 + 35 * size), vy = -(55 + rand(H3, d, 2) * 70 * (0.5 + size)), y = z - 1 + vy * age + 475 * age * age;
      if (y > z - 0.5 || age > 0.34) continue;
      const xx = x + vx * age;
      q.px(xx, y, age < 0.12 ? c.hot : c.cool);
      if (vy + 950 * age < -40) q.dot(xx - vx * 0.012, y + 1, c.cool, 0.7);
    }
  }
  function crown(q, x, z, age, size, c, h) {
    const L = 0.22 + 0.14 * size, u = age / L, X = Math.round(x), Z = Math.round(z);
    if (u >= 1) return false;
    if (age < 0.1) {
      const up = age < 0.033 ? 1 : age < 0.067 ? 2 : 2 + (size > 0.5 ? 1 : 0);
      q.px(X, Z - 1, age < 0.05 ? c.white : c.hot);
      for (let d = 1; d <= Math.min(up, size > 0.5 ? 3 : 1); d++) q.px(X - d, Z - 1 - (d > 1 ? d - 1 : 0), d === 1 ? c.hot : c.cool), q.px(X + d, Z - 1 - (d > 1 ? d - 1 : 0), d === 1 ? c.hot : c.cool);
    }
    if (u > 0.15) {
      const w = Math.round(1 + (1.5 + 3.5 * size) * Math.sqrt(u)), gap = u > 0.55 ? Math.max(0, w - 2) : -1;
      for (let d = -w; d <= w; d++) if (Math.abs(d) > gap) q.px(X + d, Z, Math.abs(d) >= w - 1 && u < 0.6 ? c.hot : c.cool);
    }
    const nd = size > 0.5 ? 2 : 1, H3 = Math.floor(h * 1e6);
    for (let d = 0; d < nd; d++) {
      const vx = (rand(H3, d, 1) - 0.5) * 2 * (20 + 30 * size), vy = -(50 + rand(H3, d, 2) * 60 * (0.4 + size)), y = Z - 1 + vy * age + 475 * age * age;
      if (y < Z - 0.5 && age < 0.3) q.px(x + vx * age, y, age < 0.1 ? c.white : c.hot);
    }
    return true;
  }

  // vendor/pixelfx/fx/weather/rain.js
  var meta = {
    name: "Rain",
    desc: "Slanted rain at four depths: far drops fade into the dark, near ones glint and splash, drops ring the puddles and a low mist drifts over the wet floor.",
    tags: ["weather", "rain", "storm", "water", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 8,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#0e1322", "#1a2440", "#283a5e", "#3a5482", "#5674a8", "#84a6d6", "#c0dcf8", "#f2f8ff"],
      density: 1,
      seed: 4
    }
  };
  var D = 8;
  var SLANT = -0.2;
  var UX = SLANT / Math.hypot(SLANT, 1);
  var UY = 1 / Math.hypot(SLANT, 1);
  var LAYERS = [
    { n: 200, m: [10, 13], len: 2, col: [2, 2, 3], stop: [-80, -6] },
    { n: 150, m: [14, 17], len: 4, col: [2, 3, 4], stop: [-45, -2] },
    { n: 96, m: [19, 23], len: 7, col: [3, 4, 5], z: [0, 1.4], size: [0.15, 0.4] },
    { n: 42, m: [25, 29], len: 13, col: [3, 5, 7], z: [2, 6.5], size: [0.6, 1], near: true }
  ];
  function pools(S2) {
    return Array.from({ length: 5 }, (_, i) => {
      const x = -150 + i * 66 + rand(S2, i, 61) * 30, w = 16 + rand(S2, i, 63) * 26;
      return { x0: x, x1: x + w, y: 3 + Math.floor(rand(S2, i, 62) * 3) };
    });
  }
  var poolAt = (P4, x, y) => P4.find((p) => x >= p.x0 + 2 && x <= p.x1 - 2 && Math.abs(y - p.y) < 1.5);
  function drawBack(p, t, o) {
    t = Math.round(t * 3e4) / 3e4;
    const q = clip(p, meta), S2 = o.seed, C = fit(o.palette, 8), P4 = pools(S2);
    const haze = mix(C[0], C[1], 0.6);
    pass(p, meta, -170, -0.5, (x, y, out) => {
      out.c = haze;
      out.a = 0.3 + 0.26 * smooth(-170, 0, y);
      out.b = 1;
    });
    floor(q, t, S2, C, P4);
    for (let L = 0; L < 3; L++) layer(q, t, S2, C, P4, L, o.density);
    mist(p, t, S2, C);
  }
  function draw(p, t, o) {
    t = Math.round(t * 3e4) / 3e4;
    const q = clip(p, meta), S2 = o.seed, C = fit(o.palette, 8), P4 = pools(S2);
    layer(q, t, S2, C, P4, 3, o.density);
  }
  function layer(q, t, S2, C, P4, L, density) {
    const Ly = LAYERS[L], sd = S2 * 11 + L, [c0, c1, c2] = Ly.col.map((i) => C[i]), len2 = Ly.len;
    const n = Math.round(Ly.n * density), G = field(S2 + 21, 256, 128, [4, 8, 16]), sweep = 256 * t / D;
    trips(t, D, n, sd, Ly.m[0], Ly.m[1], (u, k, m, i) => {
      const j = wrap(k, m);
      if (L < 2 && rand(sd, i, j, 7) > 0.35 + 1.3 * (sample(G, (-166 + rand(sd, i, j, 2) * 332) * 0.8 + sweep, 9 + L * 40) - 0.32)) return;
      const end = Ly.z ? Ly.z[0] + rand(sd, i, j, 1) * (Ly.z[1] - Ly.z[0]) : Ly.stop[0] + rand(sd, i, j, 1) * (Ly.stop[1] - Ly.stop[0]);
      const y0 = -172 - len2, y = y0 + (end - y0) * u, x = -166 + rand(sd, i, j, 2) * 332 - (end - y) * SLANT;
      const a = Ly.z ? 1 : Math.min(1, (1 - u) * 5);
      if (len2 <= 2) q.dot(x, y, c2, a), q.dot(x - UX, y - UY, c1, a * 0.8);
      else {
        q.line(x - UX * len2, y - UY * len2, x - UX * len2 * 0.45, y - UY * len2 * 0.45, c0, (v) => a * (0.35 + 0.65 * v));
        q.line(x - UX * len2 * 0.45, y - UY * len2 * 0.45, x - UX, y - UY, c1, a);
        q.dot(x, y, c2, a);
      }
      if (Ly.near) q.glow(x, y - 2, 4, C[5], 0.12);
      if (!Ly.z) return;
      const dur = D / m;
      for (let back = 1; back < 4; back++) {
        const age = u * dur + (back - 1) * dur;
        if (age > 0.7) break;
        const jp = wrap(k - back, m), z = Ly.z[0] + rand(sd, i, jp, 1) * (Ly.z[1] - Ly.z[0]), xp = -166 + rand(sd, i, jp, 2) * 332;
        if (rand(sd, i, jp, 5) > (Ly.near ? 1 : 0.7)) continue;
        const size = Ly.size[0] + (z - Ly.z[0]) / (Ly.z[1] - Ly.z[0]) * (Ly.size[1] - Ly.size[0]), pool = Ly.near && poolAt(P4, xp, z);
        if (pool) rings(q, xp, pool, age, C);
        else if (crown(q, xp, z, age, size, { hot: C[6], cool: C[4], white: WHITE }, rand(sd, i, jp, 4)) && Ly.near && age < 0.1) q.glow(xp, z - 1, 5, C[5], 0.3 * (1 - age / 0.1));
      }
    });
  }
  function rings(q, x, pool, age, C) {
    const X = Math.round(x), y = pool.y;
    if (age < 0.05) q.px(X, y, C[7]);
    for (let r = 0; r < 2; r++) {
      const a = age - r * 0.16, u = a / 0.5;
      if (u <= 0 || u >= 1) continue;
      const w = Math.round(1 + 7 * Math.sqrt(u)), c = u < 0.4 && !r ? C[6] : C[5];
      for (const s of [-1, 1])
        for (let d = 0; d < (u < 0.6 ? 2 : 1); d++) {
          const px = X + s * (w - d);
          if (px > pool.x0 && px < pool.x1) q.px(px, y, c);
        }
    }
  }
  function floor(q, t, S2, C, P4) {
    pass(q, meta, 0, 9.5, (x, y, out) => {
      if (y < 1) return void (out.c = C[4], out.l = C[5], out.k = 0.08);
      if (y < 2) return void (out.c = C[1]);
      out.c = C[0];
      out.a = 0.55;
      out.b = 1;
      for (const p of P4)
        if (x >= p.x0 && x < p.x1 && Math.floor(y) === p.y) {
          const edge = x < p.x0 + 2 || x >= p.x1 - 2;
          out.c = edge ? C[3] : C[4];
          out.a = 1;
          out.b = 0;
          out.l = C[5];
          out.k = 0.06;
        }
    });
    P4.forEach((p, i) => {
      const gx = Math.round(p.x0 + 3 + (p.x1 - p.x0 - 6) * (0.5 + 0.5 * Math.sin(Math.PI * 2 * t / D + i * 1.9)));
      q.px(gx, p.y, C[6]);
      q.glow(gx, p.y, 4, C[5], 0.2);
    });
  }
  function mist(p, t, S2, C) {
    const M2 = field(S2 + 9, 256, 128, [4, 8, 16, 32]), drift3 = 256 * t / D, crest = mix(C[4], C[5], 0.5);
    const dens = (x, y) => {
      const prof = smooth(-22, -4, y) * (1 - smooth(7, 10, y));
      return prof * (0.62 + (sample(M2, x * 0.45 + drift3, y * 4 + 30) - 0.5) * 2);
    };
    pass(p, meta, -20, 9, (x, y, out) => {
      const d = dens(x, y);
      if (d < 0.28) return;
      const th = bayer(x, y) * 0.06;
      out.b = 1;
      if (d > 0.46 + th && dens(x, y - 1) < 0.43) out.c = crest, out.a = 0.5;
      else out.c = d > 0.58 + th ? C[4] : C[3], out.a = clamp((d - 0.28) * 1.6) * 0.5;
      out.l = C[4];
      out.k = (d - 0.3) * 0.1;
    });
  }

  // vendor/pixelfx/fx/weather/snow.js
  var snow_exports = {};
  __export(snow_exports, {
    draw: () => draw2,
    drawBack: () => drawBack2,
    meta: () => meta2
  });
  var meta2 = {
    name: "Snow",
    desc: "Snow at three depths in a gusty breeze: far specks, drifting flakes, big near crystals that spin and glow; they settle on a sparkling drift and melt away.",
    tags: ["weather", "snow", "winter", "cold", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 12,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#0c1020", "#161d36", "#24304f", "#3a4a72", "#5f74a3", "#93abd6", "#cfe0fa", "#ffffff"],
      seed: 6
    }
  };
  var D2 = 12;
  var bank = (x) => -3 + 1.6 * Math.sin(x * 0.045 + 1.3) + 1.1 * Math.sin(x * 0.12 + 0.4) + 0.6 * Math.sin(x * 0.31 + 2);
  var gust = (t) => 10 * Math.sin(TAU * t / D2 + 0.6) + 4 * Math.sin(TAU * 2 * t / D2 + 2.1);
  var LAYERS2 = [
    { n: 230, m: [1, 2], air: 1, sway: [1, 3], wind: 3, gust: 0.4 },
    { n: 140, m: [2, 3], air: 0.8, sway: [3, 7], wind: 6, gust: 0.7 },
    { n: 24, m: [2, 3], air: 0.74, sway: [8, 15], wind: 9, gust: 1 }
  ];
  function drawBack2(p, t, o) {
    const q = clip(p, meta2), S2 = o.seed, C = fit(o.palette, 8);
    const haze = mix(C[1], C[2], 0.4);
    pass(p, meta2, -170, 9, (x, y, out) => {
      out.c = haze;
      out.a = 0.26 + 0.22 * smooth(-170, 0, y);
      out.b = 1;
    });
    layer2(q, t, S2, C, 0);
    drift(q, t, S2, C);
    layer2(q, t, S2, C, 1);
  }
  function draw2(p, t, o) {
    const q = clip(p, meta2), S2 = o.seed, C = fit(o.palette, 8);
    layer2(q, t, S2, C, 2);
  }
  function layer2(q, t, S2, C, L) {
    const Ly = LAYERS2[L], sd = S2 * 13 + L;
    trips(t, D2, Ly.n, sd, Ly.m[0], Ly.m[1], (u, k, m, i) => {
      const j = wrap(k, m), dur = D2 / m, R = (n) => rand(sd, i, j, n);
      const tf = dur * Ly.air, age = Math.min(u * dur, tf), sw = Ly.sway[0] + R(3) * (Ly.sway[1] - Ly.sway[0]), f = 0.25 + R(4) * 0.35, ph = R(5) * TAU;
      const xAt2 = (a) => -175 + R(2) * 350 + Ly.wind * a + (gust(t - u * dur + a) - gust(t - u * dur)) * Ly.gust + sw * Math.sin(TAU * f * a + ph);
      const x = xAt2(age), xl = xAt2(tf), y0 = -176, y1 = L ? bank(xl) - 0.5 : -110 + R(1) * 106;
      const y = y0 + (y1 - y0) * (age / tf), rest = u * dur - tf;
      if (L === 0) {
        const a = Math.min(1, (1 - u) * 6);
        q.dot(x, y, R(6) < 0.5 ? C[4] : C[5], a);
        return;
      }
      const fade = rest > 0 ? 1 - rest / (dur - tf) : 1;
      if (L === 1) {
        const big = R(6) < 0.3;
        if (rest > 0) return void q.dot(xl, y1, C[7], fade * 0.9);
        q.px(x, y, big ? WHITE : C[7]);
        if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) q.px(x + dx, y + dy, C[5]);
        else q.px(x + 1, y, C[6]), q.px(x, y + 1, C[6]), q.px(x + 1, y + 1, C[5]);
        return;
      }
      const r = R(6) < 0.4 ? 3 : R(6) < 0.8 ? 4 : 5, spin = 1.5 + R(7) * 2.5;
      if (rest > 0) {
        q.dot(xl - 1, y1, C[6], fade);
        q.dot(xl, y1, WHITE, fade);
        q.dot(xl + 1, y1, C[6], fade);
        q.glow(xl, y1, 5, C[5], 0.25 * fade);
        return;
      }
      crystal2(q, x, y, r, Math.floor(age * spin + R(8) * 2) % 2, C);
    });
  }
  var AXIS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAG2 = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
  function crystal2(q, x, y, r, turn, C) {
    const X = Math.round(x), Y = Math.round(y), long = turn ? DIAG2 : AXIS, short = turn ? AXIS : DIAG2, R = turn ? r - 1 : r;
    for (const [dx, dy] of long) {
      for (let d = 1; d <= R; d++) q.px(X + dx * d, Y + dy * d, d === R ? WHITE : C[6]);
      const nubs = turn ? R >= 3 ? [R - 1] : [] : R >= 5 ? [R - 1, R - 2] : R >= 4 ? [R - 1] : [];
      for (const n of nubs) {
        const ox = turn ? dx : dy, oy = turn ? -dy : -dx;
        q.px(X + dx * n + (turn ? 0 : ox), Y + dy * n + (turn ? oy : oy), C[4]);
        q.px(X + dx * n + (turn ? -dx : -ox) + (turn ? dx : 0), Y + dy * n + (turn ? dy * 0 : -oy), C[4]);
      }
    }
    for (const [dx, dy] of short) for (let d = 1; d <= (turn ? 1 : Math.max(1, Math.floor(R / 2))); d++) q.px(X + dx * d, Y + dy * d, d === 1 ? C[6] : C[5]);
    q.px(X, Y, WHITE);
    q.glow(X + 0.5, Y + 0.5, r * 2.5 + 5, C[5], 0.13);
    q.light(X, Y, C[6], 0.4);
  }
  function drift(q, t, S2, C) {
    pass(q, meta2, -7, 9, (x, y, out) => {
      const top = bank(x), d = y - top;
      if (d < 0) return;
      out.c = d < 1 ? WHITE : d < 2 ? C[7] : d < 3.5 ? C[6] : d < 6 ? C[5] : C[4];
      if (d < 1) out.l = C[6], out.k = 0.12;
    });
    for (let i = 0; i < 18; i++) {
      const x = -156 + rand(S2, i, 81) * 312, c = 1 + Math.floor(rand(S2, i, 82) * 3), tw = Math.sin(TAU * c * t / D2 + rand(S2, i, 83) * TAU);
      if (tw < 0.55) continue;
      const y = Math.ceil(bank(x)) + Math.floor(rand(S2, i, 84) * 3), k = (tw - 0.55) / 0.45;
      q.px(x, y, WHITE);
      if (k > 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) q.px(x + dx, y + dy, C[6]);
      q.glow(x + 0.5, y + 0.5, 6, C[6], 0.35 * k);
    }
  }

  // vendor/pixelfx/fx/weather/fog.js
  var fog_exports = {};
  __export(fog_exports, {
    draw: () => draw3,
    drawBack: () => drawBack3,
    meta: () => meta3
  });
  var meta3 = {
    name: "Fog",
    desc: "Slow banks of moonlit fog at three depths drift past each other, crests catching the light, while thin streaks of mist slide by in front.",
    tags: ["weather", "fog", "mist", "haze", "night", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 12,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#14121e", "#24213a", "#363250", "#4f4a6c", "#6d688b", "#918cab", "#bdb8d4", "#ece8f6"],
      seed: 5
    }
  };
  var D3 = 12;
  var W = 320;
  var T = [0.3, 0.5, 0.7];
  var BW2 = 0.06;
  var BANKS = [
    { top: -84, base: -40, bot: -20, sx: 1.6, sy: 2.2, lap: 1, alpha: 0.24, tone: [2, 3, 4], crest: 5, warp: 16, crestFrom: 3 },
    { top: -62, base: -24, bot: -2, sx: 1.0667, sy: 2.5, lap: 1, alpha: 0.3, tone: [2, 3, 4], crest: 5, warp: 22, crestFrom: 2 },
    { top: -42, base: -8, bot: 10, sx: 0.8, sy: 2.8, lap: 1, alpha: 0.36, tone: [2, 3, 5], crest: 6, warp: 28, crestFrom: 1 }
  ];
  var BR = new Float32Array(W);
  var P1 = BANKS.map(() => new Float32Array(W));
  var P2 = BANKS.map(() => new Float32Array(W));
  var WARP = new Float32Array(W);
  function drawBack3(p, t, o) {
    const S2 = o.seed, C = fit(o.palette, 8);
    bank2(p, t, S2, C, 0);
    bank2(p, t, S2, C, 1);
  }
  function draw3(p, t, o) {
    const S2 = o.seed, C = fit(o.palette, 8);
    bank2(p, t, S2, C, 2);
    streaks(p, t, S2, C, 1);
  }
  function bank2(p, t, S2, C, n) {
    const B2 = BANKS[n], F = field(S2 * 7 + n, 256, 128), G = field(S2 * 7 + 11, 256, 128, [4, 8, 16]);
    const drift3 = 256 * B2.lap * t / D3, boil = 128 * t / D3, prev1 = P1[n], prev2 = P2[n];
    const tones = B2.tone.map((i) => C[i]), crest = mix(C[B2.crest], WHITE, 0.12 + 0.08 * n);
    prev1.fill(0);
    prev2.fill(0);
    for (let i = 0; i < W; i++) BR[i] = 2 * Math.sin(TAU * t / D3 + (i - 160) * 6e-3 + n * 1.7);
    rows(p, meta3, B2.top - 2, B2.bot, (y, R) => {
      const prof = smooth(B2.top, B2.base, y) * (1 - smooth(B2.bot - (B2.bot < 10 ? 14 : 4), B2.bot + 1, y));
      for (let i = 0; i < W; i += 2) WARP[i] = WARP[i + 1] = sample(G, i * 0.35 + n * 70, y * 0.5 + boil) - 0.5;
      for (let i = 0; i < W; i++) {
        const x = i - 160 + 0.5, w = WARP[i];
        const nn = clamp((sample(F, x * B2.sx + drift3 + w * B2.warp, (y + BR[i]) * B2.sy + w * 8) - 0.5) * 2.6 + 0.5) - 0.5;
        const f = prof <= 0.01 ? 0 : (prof * 0.72 + nn * 0.95) * (0.6 + 0.5 * prof);
        const above = prev2[i];
        prev2[i] = prev1[i];
        prev1[i] = f;
        if (f <= T[0]) continue;
        const th = bayer(i, y) * BW2, band2 = f > T[2] + th ? 2 : f > T[1] + th ? 1 : 0, solid2 = f > T[2] ? 2 : f > T[1] ? 1 : 0;
        if (solid2 >= B2.crestFrom && above < T[solid2]) {
          R.c[i] = crest;
          R.a[i] = B2.alpha * 0.95;
          R.l[i] = C[6];
          R.k[i] = 0.07;
        } else {
          R.c[i] = tones[band2];
          R.a[i] = B2.alpha * (0.55 + 0.25 * band2);
          if (band2 === 2) R.l[i] = C[5], R.k[i] = 0.03 + 0.02 * n;
        }
        R.b[i] = 1;
      }
    });
  }
  function streaks(p, t, S2, C, front) {
    const F = field(S2 * 7 + 20 + front, 256, 128), drift3 = 256 * t / D3, sx = front ? 0.4 : 0.5, y0 = front ? -40 : -96, y1 = front ? 6 : -30;
    rows(p, meta3, y0, y1, (y, R) => {
      const env2 = smooth(y0, y0 + 10, y) * (1 - smooth(y1 - 10, y1, y));
      for (let i = 0; i < W; i++) {
        const x = i - 160 + 0.5, s = (sample(F, x * sx + drift3, y * 6.5 + 30) - 0.64) * 3 * env2;
        if (s <= 0.05) continue;
        R.c[i] = s > 0.35 ? C[5] : C[4];
        R.a[i] = Math.min(0.4, s);
        R.b[i] = 1;
        R.l[i] = C[5];
        R.k[i] = s * 0.05;
      }
    });
  }

  // vendor/pixelfx/fx/weather/storm.js
  var storm_exports = {};
  __export(storm_exports, {
    draw: () => draw4,
    drawBack: () => drawBack4,
    meta: () => meta4
  });
  var meta4 = {
    name: "Storm",
    desc: "Driving rain at two depths under a churning cloud deck; a forked bolt strikes in a double flash that lights the sky and the rain, then sheet lightning glows in the clouds.",
    tags: ["weather", "storm", "rain", "lightning", "thunder", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 10,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#09080f", "#121120", "#1b1a30", "#262541", "#363a5c", "#4f5d8c", "#7790c6", "#c2d6ff"],
      bolt: ["#2a1a6e", "#4835c2", "#6a6cff", "#78b8ff", "#c6ebff", "#ffffff"],
      seed: 5
    }
  };
  var D4 = 10;
  var SLANT2 = 0.42;
  var T_LEAD = 2.62;
  var T1 = 3;
  var T2 = 3.3;
  var T_SHEET = 6.4;
  var T_FAR = 8.6;
  var BX0 = 62;
  var BY0 = -136;
  var BX1 = 52;
  var BY1 = 3;
  var F1 = [1, 0.62, 0.95, 0.4, 0.7, 0.22];
  var F2 = [0.92, 0.5, 0.8, 0.3, 0.12];
  var env = (t, t0, E) => {
    const i = Math.floor((t - t0) * 30 + 1e-3);
    return i >= 0 && i < E.length ? E[i] : 0;
  };
  var flashAt = (t) => Math.max(env(t, T1, F1), env(t, T2, F2));
  function sheetAt(t) {
    const a = t - T_SHEET;
    if (a < 0 || a > 0.9) return 0;
    const p1 = Math.exp(-(((a - 0.08) / 0.05) ** 2)), p2 = Math.exp(-(((a - 0.3) / 0.09) ** 2)), tail = a > 0.3 ? Math.exp(-(a - 0.3) * 6) * 0.5 : 0;
    return Math.min(1, 0.7 * p1 + p2 + tail) * (Math.floor(a * 30) % 3 === 1 ? 0.75 : 1);
  }
  var blink = (a, k) => a < 0 || a > 0.3 ? 0 : k * (Math.exp(-(((a - 0.06) / 0.04) ** 2)) + 0.65 * Math.exp(-(((a - 0.18) / 0.05) ** 2)));
  var farAt = (t) => blink(t - T_FAR, 0.45);
  var far2At = (t) => blink(t - 0.9, 0.3);
  var snap = (t) => Math.round(t * 3e4) / 3e4;
  function drawBack4(p, t, o) {
    t = snap(t);
    const q = clip(p, meta4), B2 = box(meta4), S2 = o.seed, C = fit(o.palette, 8), V = fit(o.bolt, 6);
    const f = flashAt(t), sh = sheetAt(t), far = farAt(t), lead = t > T_LEAD && t < T1 ? 0.25 + 0.2 * Math.sin(t * 70) : 0;
    const pre = t > T_LEAD - 0.5 && t < T_LEAD ? 0.12 * Math.max(0, Math.sin((t - T_LEAD) * 41)) : 0;
    const srcs = [];
    if (f + lead + pre > 0) srcs.push([BX0, BY0 - 6, 150, f + lead * 0.5 + pre]);
    if (sh > 0) srcs.push([-96, -146, 120, sh]);
    if (far > 0) srcs.push([128, -156, 80, far]);
    if (far2At(t) > 0) srcs.push([-40, -160, 70, far2At(t)]);
    const litAt = (x, y) => {
      let L = 0;
      for (const [sx, sy, R, k] of srcs) {
        const d = Math.hypot(x - sx, (y - sy) * 1.5) / R;
        if (d < 1) L += k * (1 - d) * (1 - d);
      }
      return Math.min(1, L);
    };
    sky(p, t, f, V);
    if (sh > 0.05) pass(p, meta4, -170, 0, (x, y, out) => {
      const d = Math.hypot(x + 96, (y + 150) * 1.3) / 170;
      if (d < 1) out.l = V[2], out.k = sh * 0.3 * (1 - d) * (1 - d);
    });
    veil(p, t, S2, C, V, f);
    rain(q, t, S2, C, V, f, 0);
    if (t > T_LEAD && t < T2 + 0.7) bolt(q, t, S2, V);
    deck(q, B2, t, S2, C, V, litAt, srcs.length > 0);
    crawler(q, t, S2, V);
    floor2(q, B2, t, S2, C, V, f);
    strike(q, t, S2, C, V);
  }
  function draw4(p, t, o) {
    t = snap(t);
    const q = clip(p, meta4), S2 = o.seed, C = fit(o.palette, 8), V = fit(o.bolt, 6), f = flashAt(t);
    rain(q, t, S2, C, V, f, 1);
  }
  function sky(p, t, f, V) {
    const k = f * 0.36;
    if (k <= 0.01) return;
    const c = mix(V[2], V[3], 0.6);
    pass(p, meta4, -170, 9, (x, y, out) => {
      const d = Math.abs(x - (BX0 + BX1) / 2) / 230;
      out.l = c;
      out.k = k * (0.2 + 0.8 * Math.max(0, 1 - d) ** 2.2);
    });
  }
  var ROWS = [
    { base: -161, wob: 3, n: 18, rx: [16, 30], ry: 0.8, drift: 15, life: [4, 7], tone: [1, 2, 3, 4], tex: 1 },
    { base: -150, wob: 3, n: 22, rx: [10, 20], ry: 0.85, drift: 10, life: [3.5, 6.5], tone: [1, 2, 3, 5], tex: 1 },
    { base: -140, wob: 3, n: 26, rx: [7, 14], ry: 0.9, drift: 6, life: [3, 6], tone: [2, 2, 3, 5], tex: 0, haze: true }
  ];
  var sag = (x) => 9 * Math.exp(-(((x - 40) / 95) ** 2)) - 3;
  function rolls(S2, t) {
    return ROWS.map((Rw, j) => {
      const out = [];
      for (let i = 0; i < Rw.n; i++) {
        const L = Rw.life[0] + rand(S2, j, i, 1) * (Rw.life[1] - Rw.life[0]), age = wrap(t - rand(S2, j, i, 2) * D4, D4);
        if (age >= L) continue;
        const u = age / L, g = Math.sin(Math.PI * u) ** 0.6;
        const rx = Rw.rx[0] + rand(S2, j, i, 3) * (Rw.rx[1] - Rw.rx[0]), ry = rx * Rw.ry, x = -200 + rand(S2, j, i, 4) * 400 + Rw.drift * (age - L / 2);
        out.push({ x, h: ry * g * (0.6 + 0.4 * rand(S2, j, i, 5)), rx: rx * (0.8 + 0.2 * g) });
      }
      return out;
    });
  }
  function veil(p, t, S2, C, V, f) {
    const F = field(S2 + 11, 256, 128, [4, 8, 16]), shift = 256 * 2 * t / D4, glow2 = mix(C[3], V[3], 0.5);
    pass(p, meta4, -170, -0.5, (x, y, out) => {
      const n = sample(F, (x - y * SLANT2) * 1.9 - shift, y * 0.16 + 7), dens = clamp(0.45 + (n - 0.5) * 2.6);
      out.c = f > 0.05 ? mix(C[1], glow2, Math.min(1, f * dens * 0.7 * Math.max(0.25, 1 - Math.abs(x - BX1) / 220))) : C[1];
      out.a = 0.4 + 0.38 * dens;
      out.b = 1;
    });
  }
  function deck(q, B2, t, S2, C, V, litAt, lit) {
    const R = rolls(S2, t), F = field(S2 * 3 + 1, 256, 128), drift3 = 256 * t / D4, n = ROWS.length, mo = Math.cos(Math.PI * t / D4) ** 2;
    const RAMP2 = [C[0], C[1], C[2], C[3], C[4], C[5], C[6], V[4], WHITE];
    const top = new Float32Array(n), bot = new Float32Array(n), bulge = new Float32Array(n);
    for (let x = B2.x0; x < B2.x1; x++) {
      const cx = x + 0.5;
      let low = -170;
      for (let j = 0; j < n; j++) {
        const Rw = ROWS[j];
        const und = (sample(F, cx * 0.55 + j * 91, 3) * mo + sample(F, cx * 0.55 + j * 91, 60) * (1 - mo) - 0.5) * 2;
        const c = Rw.base + sag(cx) * (0.4 + j * 0.3) + 7 * und + Rw.wob * 2 * (sample(F, cx * 1.8 + j * 61 - drift3 * (0.5 - j * 0.1), 20 + j * 17) - 0.5);
        let bump = 0;
        for (const b of R[j]) {
          const dx = (cx - b.x) / b.rx;
          if (dx * dx < 1) bump = Math.max(bump, b.h * Math.sqrt(1 - dx * dx));
        }
        const y1 = c + bump;
        top[j] = -999;
        bot[j] = y1;
        bulge[j] = bump;
        low = Math.max(low, y1);
      }
      let prev = -1, prevBot = -999;
      for (let y = B2.y0; y < low; y++) {
        const cy = y + 0.5;
        let j = 0;
        while (j < n && !(cy >= top[j] && cy < bot[j])) j++;
        if (j >= n) {
          prev = -1;
          continue;
        }
        if (j !== prev) {
          if (prev >= 0 && prev < j) prevBot = cy;
          prev = j;
        }
        const Rw = ROWS[j], d = bot[j] - cy, tone = Rw.tone, th = bayer(x, y);
        let i;
        if (d < 1) i = bulge[j] > 3 ? tone[3] : tone[3] - 1;
        else if (cy - prevBot < 1.5 && j > 0) i = Math.max(0, tone[0] - 1);
        else if (d < 2 + bulge[j] * 0.25 + th * 2) i = tone[2];
        else if (d < 6 + bulge[j] * 0.4 + th * 3) i = tone[1];
        else {
          const nn = sample(F, cx * 0.9 + j * 77 - drift3 * (0.6 - j * 0.12), cy * 1.7 + j * 31);
          i = tone[0] + (Rw.tex && nn > 0.6 ? 1 : 0);
        }
        let lk = 0;
        if (lit) {
          const Lv = litAt(cx, cy);
          if (Lv > 0.02) {
            i = Math.min(8, i + Math.round(Lv * (d < 1 ? 4.4 : d < 4 ? 3.8 : 3.1)));
            lk = Lv;
          }
        }
        if (Rw.haze && !lk && d >= 1) q.blend(x, y, RAMP2[i], 0.75);
        else q.px(x, y, RAMP2[Math.max(0, i)]);
        if (lk > 0.03) q.light(x, y, V[3], lk * (d < 3 ? 0.4 : 0.22));
      }
    }
  }
  function rain(q, t, S2, C, V, f, near) {
    const litAt = (x) => {
      const L = f * (0.3 + 0.7 * Math.max(0, 1 - Math.abs(x - BX1) / 170));
      return L > 0.45 ? 2 : L > 0.15 ? 1 : 0;
    };
    if (!near) {
      const BODY3 = [C[4], C[4], C[5]], HEAD2 = [C[5], C[6], C[6]];
      trips(t, D4, 300, S2 * 7 + 1, 22, 28, (u, k, m, i) => {
        const j = wrap(k, m), stop = -14 - rand(S2, i, j, 1) * 90, y = -176 + (stop + 176) * u, x = -170 + rand(S2, i, j, 2) * 360 - (stop - y) * SLANT2;
        const L = 3 + rand(S2, i, j, 3) * 2, ux = SLANT2 / Math.hypot(SLANT2, 1), uy = 1 / Math.hypot(SLANT2, 1), lit = litAt(x), body = BODY3[lit], head4 = HEAD2[lit];
        q.line(x - ux * L, y - uy * L, x - ux * L * 0.4, y - uy * L * 0.4, body);
        q.line(x - ux * L * 0.4, y - uy * L * 0.4, x, y, head4);
      });
      return;
    }
    const BODY2 = [C[6], C[6], V[4]], HEAD = [C[7], WHITE, WHITE], TAIL = [C[4], C[5], V[3]];
    trips(t, D4, 84, S2 * 7 + 2, 30, 38, (u, k, m, i) => {
      const j = wrap(k, m), z = 1 + rand(S2, i, j, 1) * 4, y = -180 + (z + 180) * u, x = -175 + rand(S2, i, j, 2) * 370 - (z - y) * SLANT2;
      const L = 9 + rand(S2, i, j, 3) * 5, ux = SLANT2 / Math.hypot(SLANT2, 1), uy = 1 / Math.hypot(SLANT2, 1), lit = litAt(x), body = BODY2[lit], head4 = HEAD[lit], tail = TAIL[lit];
      q.line(x - ux * L, y - uy * L, x - ux * L * 0.55, y - uy * L * 0.55, tail);
      q.line(x - ux * L * 0.55, y - uy * L * 0.55, x - ux, y - uy, body);
      q.px(x, y, head4);
      const dur = D4 / m, age = u * dur;
      if (age < 0.4) {
        const jp = wrap(k - 1, m), zp = 1 + rand(S2, i, jp, 1) * 4, xp = -175 + rand(S2, i, jp, 2) * 370;
        const lit2 = litAt(xp);
        splash(q, xp, zp, age, 0.25 + (zp - 1) / 5.3, { hot: lit2 ? WHITE : C[7], cool: [C[5], C[6], V[4]][lit2] }, rand(S2, i, jp, 4));
      }
    });
  }
  function channel(S2) {
    const R = new Rng(S2 * 31 + 1), P4 = tree(R, BX0, BY0, BX1, BY1, 0.26, 0.18), pts = P4[0].pts, side = R.sign();
    [0.2, 0.38, 0.55].forEach((u, i) => {
      const k = Math.floor(u * (pts.length - 1)), [ax, ay] = pts[k], [bx, by] = pts[Math.min(pts.length - 1, k + 3)];
      const a = Math.atan2(by - ay, bx - ax) + (i % 2 ? -side : side) * R.range(0.6, 1), l = R.range(36, 56) * (1 - u * 0.45);
      P4.push(...tree(R, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, 0.3, 0.5, 0.6, 1));
    });
    return P4;
  }
  function bolt(q, t, S2, V) {
    const P12 = channel(S2);
    if (t < T1) {
      const reach = BY0 + (BY1 - BY0) * Math.pow(Math.floor((t - T_LEAD) / (T1 - T_LEAD) * 9) / 9, 1.25);
      for (const p of P12)
        for (let i = 0; i < p.pts.length - 1; i++) {
          const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
          if (by > reach) break;
          q.line(ax, ay, bx, by, p.w >= 1 ? V[2] : V[1]);
          if (i % 4 === 0) q.glow(ax, ay, 6, V[3], 0.22 * p.w);
        }
      return;
    }
    const P22 = [P12[0], ...tree(new Rng(S2 * 31 + 2), BX0, BY0, BX1, BY1, 0.3, 0.3).slice(1).filter((_, i) => i < 2)];
    const s = t >= T2 ? 2 : 1, a = t - (s === 2 ? T2 : T1), k = env(t, s === 2 ? T2 : T1, s === 2 ? F2 : F1), paths = s === 2 ? P22 : P12;
    if (k > 0) stroke(q, paths, k, V);
    else if (a < 0.5) {
      const g = 1 - a / 0.5;
      for (const p of paths) if (p.w >= 1) for (const [x, y] of p.pts) q.dot(x, y, V[1], g * 0.9);
    }
  }
  function crawler(q, t, S2, V) {
    const a = t - T_SHEET - 0.22;
    if (a < 0 || a > 0.17) return;
    const P4 = tree(new Rng(S2 * 7 + 3), -150, -138, -26, -134, 0.2, 0.7), reach = -150 + 130 * Math.min(1, (Math.floor(a * 30) + 1) / 3), k = a < 0.1 ? 1 : 0.5;
    for (const p of P4)
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
        if (ax > reach) break;
        q.line(ax, ay, bx, by, p.w >= 1 && k > 0.6 ? V[4] : V[3]);
        if (p.w >= 1) q.dot(ax, ay + 1, V[2], k);
        if (i % 3 === 0) q.glow(ax, ay, 10, V[3], 0.35 * k * p.w);
      }
  }
  function stroke(q, paths, k, V) {
    for (const pass2 of [0, 1, 2])
      for (const p of paths) {
        const trunk = p.w >= 1;
        if (!trunk && (k < 0.4 || pass2 === 0 && p.w < 0.5)) continue;
        for (let i = 0; i < p.pts.length - 1; i++) {
          const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1], l = Math.max(1, Math.hypot(bx - ax, by - ay));
          for (let d = 0; d <= l; d += 0.5) {
            const x = ax + (bx - ax) * d / l, y = ay + (by - ay) * d / l;
            if (pass2 === 0) q.circle(x, y, trunk ? k > 0.6 ? 2.3 : 1.7 : 1.2, k > 0.6 ? V[2] : V[1]);
            else if (pass2 === 1) q.circle(x, y, trunk ? k > 0.6 ? 1.4 : 0.9 : 0.6, trunk ? V[4] : V[3]);
            else if (trunk) {
              q.px(x, y, k > 0.3 ? WHITE : V[4]);
              if (k > 0.85) q.px(x + 1, y, WHITE);
            } else if (p.w > 0.4 && k > 0.6) q.px(x, y, V[4]);
          }
          if (pass2 === 0 && i % 3 === 0) q.glow(ax, ay, trunk ? 18 : 8, V[3], (trunk ? 0.5 : 0.3) * k * p.w);
        }
      }
  }
  function strike(q, t, S2, C, V) {
    const a = t - T1;
    if (a < 0 || a > 1.8) return;
    const k = flashAt(t);
    if (k > 0) {
      const fr = Math.floor(t * 30 + 1e-3), Rc = new Rng(S2 * 977 + fr);
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1, l = Rc.range(10, 30) * (0.6 + 0.4 * k);
        for (const p of tree(Rc, BX1 + side, BY1 - 1, BX1 + side * l, BY1 + Rc.range(-2, 3), 0.35, 0.5, 0.6, 1)) {
          q.polyline(p.pts, k > 0.6 && p.w > 0.5 ? V[4] : V[3]);
          q.glow(p.pts[p.pts.length >> 1][0], p.pts[p.pts.length >> 1][1], 8, V[3], 0.3 * k);
        }
      }
      q.circle(BX1, BY1 - 1, 2 + 3 * k, V[4]);
      q.circle(BX1, BY1 - 1, 1 + 2 * k, WHITE);
      q.glow(BX1, BY1 - 12, 95, V[2], 0.55 * k);
      q.glow(BX1, BY1 - 4, 40, V[3], 0.5 * k);
      q.glow(BX1, BY1 - 2, 14, WHITE, 0.6 * k);
    }
    const ps = new Particles({ rng: new Rng(S2 * 13 + 5), ground: () => 4, sparks: [WHITE, V[4], V[3], V[2]], haze: V[2] }), R = ps.R, steam = mix(C[4], V[3], 0.3);
    const burst = (n, pow) => {
      for (let i = 0; i < n; i++) {
        const an = -Math.PI / 2 + R.range(-1.35, 1.35), sp = R.range(110, 420) * pow;
        ps.spawn(P.SPARK, BX1, BY1 - 1, Math.cos(an) * sp, Math.sin(an) * sp, R.range(0.18, 0.6));
      }
      for (let i = 0; i < 6 * pow; i++) {
        const sd = R.sign();
        ps.spawn(P.VAPOUR, BX1 + sd * R.range(2, 8), BY1 - R.range(1, 3), sd * R.range(30, 90), -R.range(4, 16), R.range(0.6, 1.2), steam, R.range(2.5, 4.5), R.range(0, 0.08));
      }
    };
    burst(48, 1);
    let tt = 0, second = false;
    for (const dt = 1 / 120; tt + dt <= a; tt += dt) {
      if (!second && tt >= T2 - T1) second = true, burst(16, 0.7);
      ps.update(dt);
    }
    ps.draw(q);
    if (a < 1.6) q.glow(BX1, BY1, 16, V[2], 0.4 * (1 - a / 1.6) ** 2);
  }
  function floor2(q, B2, t, S2, C, V, f) {
    const F = field(S2 + 3, 256, 128), M2 = field(S2 + 4, 256, 128, [4, 8, 16]), wind = 256 * 3 * t / D4;
    pass(q, meta4, -14, -0.5, (x, y, out) => {
      const m = sample(M2, x * 1.1 - wind, y * 4 + 9) - 0.4;
      if (m <= 0) return;
      out.c = f > 0.1 ? mix(C[4], V[3], f) : C[4];
      out.a = Math.min(0.3, m * 0.9) * (1 + y / 14);
      out.b = 1;
    });
    pass(q, meta4, 0, 9, (x, y, out) => {
      const pool = (yy) => sample(F, x * 1.3 + 31, yy * 9) > 0.6 - yy * 6e-3;
      const wet = pool(y), lip = wet && !pool(y - 1);
      out.b = 1;
      out.c = C[1];
      out.a = 0.5;
      if (y < 1) {
        out.c = sample(F, x * 2, 50) > 0.5 ? C[4] : C[3];
        out.a = 1;
        out.b = 0;
      } else if (wet) {
        const d = Math.abs(x - BX1) / 150;
        if (f > 0.06) {
          out.c = d < 0.25 && f > 0.5 || lip ? V[4] : V[3];
          out.a = clamp(f * (1.35 - d) * (lip ? 1.4 : 1));
          out.b = 0;
        } else {
          out.c = lip ? C[5] : C[3];
          out.a = lip ? 1 : 0.7;
        }
        out.l = V[3];
        out.k = f * 0.25 * Math.max(0, 1 - d);
      }
    });
    if (f > 0.2) {
      for (let y = 1; y < 10; y++) if (rand(y, Math.floor(t * 30), 3) < 0.8) q.dot(BX1 + Math.sin(y * 1.7 + t * 40) * 1.2, y, y < 4 ? WHITE : V[4], f * (1.1 - y / 12));
    }
  }

  // vendor/pixelfx/fx/weather/blizzard.js
  var blizzard_exports = {};
  __export(blizzard_exports, {
    draw: () => draw5,
    drawBack: () => drawBack5,
    meta: () => meta5
  });
  var meta5 = {
    name: "Blizzard",
    desc: "Snow driven almost flat by a gale: streaks at three depths race past, gusts throw translucent sheets of snow across the sky and spindrift streams off the drifts.",
    tags: ["weather", "blizzard", "snow", "wind", "storm", "winter", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 8,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#0d111f", "#182035", "#27324d", "#3e4d6e", "#64779c", "#9cb0d0", "#d8e4f6", "#ffffff"],
      seed: 9
    }
  };
  var D5 = 8;
  var gustAt = (x, t) => 0.5 + 0.5 * Math.sin(TAU * ((x + 160) / 400 - 2 * t / D5) + 0.8);
  var bank3 = (x) => -2 + 1.2 * Math.sin(x * 0.05 + 2) + 0.8 * Math.sin(x * 0.15 + 1);
  var LAYERS3 = [
    { n: 240, m: [3, 4], len: [2, 4], drop: [10, 40], col: [3, 4, 5] },
    { n: 130, m: [4, 5], len: [5, 8], drop: [20, 60], col: [4, 5, 6] },
    { n: 34, m: [6, 7], len: [10, 16], drop: [30, 70], col: [4, 6, 7], near: true }
  ];
  function drawBack5(p, t, o) {
    const q = clip(p, meta5), S2 = o.seed, C = fit(o.palette, 8);
    sheets(p, t, S2, C, 0);
    streaks2(q, t, S2, C, 0);
    streaks2(q, t, S2, C, 1);
    ground(p, q, t, S2, C);
  }
  function draw5(p, t, o) {
    const q = clip(p, meta5), S2 = o.seed, C = fit(o.palette, 8);
    sheets(p, t, S2, C, 1);
    streaks2(q, t, S2, C, 2);
  }
  function streaks2(q, t, S2, C, L) {
    const Ly = LAYERS3[L], sd = S2 * 17 + L, [c0, c1, c2] = Ly.col.map((i) => C[i]);
    trips(t, D5, Ly.n, sd, Ly.m[0], Ly.m[1], (u, k, m, i) => {
      const j = wrap(k, m), R = (n) => rand(sd, i, j, n), drop = Ly.drop[0] + R(3) * (Ly.drop[1] - Ly.drop[0]);
      const x = -190 + 380 * u, y = -178 + R(1) * 182 + drop * u + 3 * Math.sin(u * TAU * (1 + R(5)) + R(6) * 6);
      if (y > bank3(x) - 1) return;
      const g = gustAt(x, t);
      if (!Ly.near && R(7) > 0.45 + 0.75 * g) return;
      const L2 = (Ly.len[0] + R(2) * (Ly.len[1] - Ly.len[0])) * (0.7 + 0.6 * g), dx = 380 / (D5 / m), dy = drop / (D5 / m), l = Math.hypot(dx, dy);
      const ux = dx / l, uy = dy / l;
      q.line(x - ux * L2, y - uy * L2, x - ux * L2 * 0.45, y - uy * L2 * 0.45, c0, (v) => 0.3 + 0.7 * v);
      q.line(x - ux * L2 * 0.45, y - uy * L2 * 0.45, x - ux, y - uy, c1);
      q.px(x, y, g > 0.6 && Ly.near ? WHITE : c2);
      if (Ly.near) q.glow(x, y, 5, C[5], 0.12 + 0.12 * g);
    });
  }
  var GX = new Float32Array(320);
  var WV = new Float32Array(320);
  function sheets(p, t, S2, C, near) {
    const F = field(S2 * 3 + 7 + near, 256, 128), shift = 256 * (near ? 3 : 2) * t / D5, c = near ? C[6] : C[5], y0 = near ? -110 : -170, haze = mix(C[2], C[3], 0.5);
    const sy = near ? 4.5 : 3.2, th = near ? 0.58 : 0.54;
    for (let i = 0; i < 320; i++) GX[i] = gustAt(i - 160 + 0.5, t), WV[i] = 5 * Math.sin((i - 160) * 0.021 - TAU * t / D5 + near * 2);
    rows(p, meta5, y0, 4, (y, R) => {
      const fade = near ? smooth(-110, -40, y) : 1;
      for (let i = 0; i < 320; i++) {
        const g = GX[i], n = sample(F, (i - 160) * 0.16 - shift, (y + WV[i]) * sy + 40), d = (n - th) * 2.2 * (0.35 + g) * fade;
        if (near) {
          if (d <= 0.02) continue;
          R.c[i] = c;
          R.a[i] = Math.min(0.5, d);
        } else {
          R.c[i] = d > 0.08 ? c : haze;
          R.a[i] = 0.3 + 0.12 * g + Math.min(0.42, Math.max(0, d));
        }
        R.b[i] = 1;
        if (d > 0.05) R.l[i] = C[5], R.k[i] = d * 0.08;
      }
    });
  }
  function ground(p, q, t, S2, C) {
    const F = field(S2 * 5 + 1, 256, 128), shift = 256 * 4 * t / D5;
    for (let i = 0; i < 320; i++) GX[i] = gustAt(i - 160 + 0.5, t), WV[i] = bank3(i - 160 + 0.5);
    rows(p, meta5, -16, 9, (y, R) => {
      for (let i = 0; i < 320; i++) {
        const x = i - 160 + 0.5, top = WV[i], d = y - top;
        if (d >= 0) {
          R.c[i] = d < 1 ? WHITE : d < 2 ? C[6] : d < 4 ? C[5] : C[4];
          if (d < 1) R.l[i] = C[6], R.k[i] = 0.1;
          continue;
        }
        if (y < -14) continue;
        const n = sample(F, x * 0.5 - shift, y * 3 + 9), s = (n - 0.5) * 3 * smooth(-14, -1, y) * (0.4 + GX[i]);
        if (s > 0.02) R.c[i] = C[6], R.a[i] = Math.min(0.55, s), R.b[i] = 1;
      }
    });
    trips(t, D5, 40, S2 * 23, 8, 10, (u, k, m, i) => {
      const j = wrap(k, m), x = -175 + 350 * u, y = bank3(x) - 1 - rand(S2, i, j, 1) * 6 * Math.abs(Math.sin(u * 9 + i));
      q.px(x, y, rand(S2, i, j, 2) < 0.5 ? WHITE : C[6]);
      q.px(x - 1, y, C[5]);
    });
  }

  // vendor/pixelfx/fx/weather/falling-leaves.js
  var falling_leaves_exports = {};
  __export(falling_leaves_exports, {
    draw: () => draw6,
    drawBack: () => drawBack6,
    meta: () => meta6
  });
  var meta6 = {
    name: "Falling leaves",
    desc: "Autumn leaves swing down through the air, tilting and flipping to show their pale backs, ride a gust, land flat in the litter and fade.",
    tags: ["weather", "leaves", "autumn", "fall", "wind", "nature", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 10,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#4a1d0c", "#8a3a14", "#c8621e", "#f0982e", "#ffcf72", "#fff0c4"],
      reds: ["#40101a", "#7c1c22", "#b8302a", "#e85a3c", "#ff9a72", "#ffd8c4"],
      golds: ["#3e300c", "#7a5c14", "#b8901e", "#e8c23a", "#fff09a", "#fffbe0"],
      seed: 8
    }
  };
  var D6 = 10;
  var FLOOR2 = 1;
  var gust2 = (t) => 16 * Math.sin(TAU * t / D6 - 1.2) + 5 * Math.sin(TAU * 3 * t / D6);
  var Hc = (th) => {
    const k = Math.floor((th + Math.PI / 2) / Math.PI);
    return 2 * k + 1 + Math.sin(th - k * Math.PI);
  };
  var SHAPES = [
    (u, v) => Math.abs(u) >= 1 ? 9 : v * v / (0.36 * (1 - u * u) * (1.15 - 0.3 * u)),
    // a beech: a long oval, pointed tip
    (u, v) => {
      const r = Math.hypot(u, v * 1.1), a = Math.atan2(v, u);
      return r / (0.62 + 0.38 * Math.abs(Math.cos(2.5 * a)) ** 1.5);
    },
    (u, v) => Math.abs(u) >= 1 ? 9 : v * v / (0.16 * (1 - u * u))
    // a willow: long and thin
  ];
  function drawBack6(p, t, o) {
    const q = clip(p, meta6), S2 = o.seed, R3 = ramps(o), C = R3[0];
    const top = hex("#0e0a12"), low = mix(hex("#140c14"), C[0], 0.3);
    rows(p, meta6, -170, 9, (y, R) => {
      const k = (y + 170) / 180, c = mix(top, low, k * k);
      R.c.fill(c);
      R.a.fill(0.32 + 0.1 * k);
      R.b.fill(1);
    });
    litter(q, S2, R3);
    leaves(q, t, S2, R3, false);
  }
  function draw6(p, t, o) {
    leaves(clip(p, meta6), t, o.seed, ramps(o), true);
  }
  var ramps = (o) => [fit(o.palette, 6), fit(o.reds, 6), fit(o.golds, 6)];
  function leaves(q, t, S2, R3, front) {
    trips(t, D6, 62, S2 * 19, 2, 3, (u, k, m, i) => {
      const j = wrap(k, m), R = (n) => rand(S2 * 19, i, j, n), near = R(1) < 0.35;
      if (near !== front) return;
      const dur = D6 / m, air = 0.72, tf = dur * air, a = Math.min(u * dur, tf), rest = u * dur - tf;
      const w = 1.7 + R(2) * 1.2, ph0 = R(3) * TAU, amp = (near ? 14 : 8) + R(4) * 10, x0 = -180 + R(5) * 340, y0 = -186;
      const path = (aa) => 0.45 * aa + 0.9 * (Hc(w * aa + ph0) - Hc(ph0)) / w, vy = (FLOOR2 - y0) / path(tf);
      const born = t - u * dur, xAt2 = (aa) => x0 + 7 * aa + Math.sin(w * aa + ph0) * amp + (gust2(born + aa) - gust2(born)) * (near ? 1 : 0.7);
      const size = (near ? 5.8 : 4.2) + R(6) * 1.6, shape = Math.floor(R(7) * 3), col = R3[Math.floor(R(8) * 3)];
      if (rest > 0) {
        const fade = 1 - rest / (dur - tf);
        leaf(q, xAt2(tf), FLOOR2 - 1, size, (R(9) - 0.5) * 0.5, 0.42, shape, col, fade);
        return;
      }
      const x = xAt2(a), y = y0 + vy * path(a), tilt = Math.cos(w * a + ph0) * 0.75 + (near ? 0 : 0.3);
      const flip = Math.cos(R(10) * TAU + a * (R(11) < 0.3 ? 5 : 1.2));
      leaf(q, x, y, size, tilt, flip, shape, col, 1);
      if (flip > 0.86) {
        const k2 = (flip - 0.86) / 0.14, hx = x - Math.cos(tilt) * size * 0.3, hy = y - Math.sin(tilt) * size * 0.3 - 1;
        q.px(hx, hy, col[5]);
        q.glow(hx, hy, 5 + size * 0.5, col[4], 0.22 * k2);
      }
    });
  }
  function leaf(q, x, y, size, ang, flip, shape, col, a) {
    const back = flip < -0.25, fs = 0.35 + 0.65 * Math.abs(flip), c = Math.cos(ang), s = Math.sin(ang);
    const L = size, Wd = size * 0.9, ext = L + 1.5, shapeFn = SHAPES[shape];
    const face = back ? [mix(col[1], hex("#9c8a78"), 0.2), mix(col[2], hex("#c8b49c"), 0.22), mix(col[3], hex("#e0d0b8"), 0.22)] : [col[2], col[3], col[4]];
    const rim = col[0], vein = back ? mix(col[2], hex("#e8dcc8"), 0.5) : col[1];
    q.shade(x - ext, y - ext, x + ext, y + ext, (px, py, out) => {
      const dx = px - x, dy = py - y, lu = (dx * c + dy * s) / L, lv = (-dx * s + dy * c) / (Wd * fs);
      const d = shapeFn(lu, lv);
      if (lu < -1.25 || lu > 1.1) return;
      if (lu < -0.92 && Math.abs(lv * Wd * fs) < 0.5) return void (out.c = rim, out.a = a);
      if (d > 1.32) return;
      out.a = a;
      if (d > 1) out.c = rim;
      else if (Math.abs(lv * Wd * fs) < 0.45 && lu > -0.9 && lu < 0.75) out.c = vein;
      else out.c = lv < -0.15 ? face[2] : lv < 0.35 ? face[1] : face[0];
    });
  }
  var LITTER = /* @__PURE__ */ new Map();
  function litter(q, S2, R3) {
    const key = S2 + R3.flat().join();
    let px = LITTER.get(key);
    if (!px) {
      px = [];
      const rec = {
        shade(x0, y0, x1, y1, fn) {
          const o = { c: 0, a: 1 };
          for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
            for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
              o.c = 0;
              o.a = 1;
              const c = fn(x + 0.5, y + 0.5, o) || o.c;
              if (c) px.push(x + 0.5, y + 0.5, c, o.a);
            }
        }
      };
      for (let i = 0; i < 64; i++) {
        const x = -164 + rand(S2, i, 91) * 328, y = FLOOR2 - 2 + Math.floor(rand(S2, i, 92) * 4) * 2, col = R3[Math.floor(rand(S2, i, 93) * 3)];
        leaf(rec, x, y, 3.6 + rand(S2, i, 94) * 1.8, (rand(S2, i, 95) - 0.5) * 0.7, 0.45 + rand(S2, i, 96) * 0.25, Math.floor(rand(S2, i, 97) * 3), col.map((c) => mix(c, col[0], 0.12)), 1);
      }
      LITTER.set(key, px);
    }
    for (let i = 0; i < px.length; i += 4) q.dot(px[i], px[i + 1], px[i + 2], px[i + 3]);
  }

  // vendor/pixelfx/fx/weather/cherry-blossoms.js
  var cherry_blossoms_exports = {};
  __export(cherry_blossoms_exports, {
    draw: () => draw7,
    drawBack: () => drawBack7,
    meta: () => meta7
  });
  var meta7 = {
    name: "Cherry blossoms",
    desc: "Pink petals flutter down on a spring breeze, tumbling in little spirals and flashing as they catch the light, with a few whole blossoms spinning among them.",
    tags: ["weather", "cherry blossom", "sakura", "petals", "spring", "wind", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 10,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#4a1832", "#8e3460", "#d26a94", "#f2a2c0", "#ffd2e2", "#fff4f8"],
      seed: 12
    }
  };
  var D7 = 10;
  var FLOOR3 = 1;
  var gust3 = (t) => 22 * Math.sin(TAU * t / D7 + 0.4) + 7 * Math.sin(TAU * 2 * t / D7 - 1);
  function drawBack7(p, t, o) {
    const q = clip(p, meta7), S2 = o.seed, C = fit(o.palette, 6);
    const top = hex("#0e0a14"), low = mix(hex("#1a0e1a"), C[0], 0.4);
    rows(p, meta7, -170, 9, (y, R) => {
      const k = (y + 170) / 180;
      R.c.fill(mix(top, low, k * k));
      R.a.fill(0.3 + 0.12 * k);
      R.b.fill(1);
    });
    scatter(q, S2, C);
    petals(q, t, S2, C, 0);
  }
  function draw7(p, t, o) {
    const q = clip(p, meta7), S2 = o.seed, C = fit(o.palette, 6);
    petals(q, t, S2, C, 1);
    blossoms(q, t, S2, C);
  }
  function petals(q, t, S2, C, near) {
    const n = near ? 54 : 90, sd = S2 * 7 + near;
    trips(t, D7, n, sd, 1, 2, (u, k, m, i) => {
      const j = wrap(k, m), R = (c) => rand(sd, i, j, c), dur = D7 / m, tf = dur * 0.84, a = Math.min(u * dur, tf), rest = u * dur - tf;
      const born = t - u * dur, x0 = -200 + R(1) * 330, y0 = -184, vy = (FLOOR3 + (near ? 2 : 0) - y0) / tf, vx = 9 + R(2) * 10;
      const rho = (near ? 3 : 2) + R(3) * 3, w = 2.2 + R(4) * 2.8, ph = R(5) * TAU, gk = near ? 1 : 0.6;
      const at2 = (aa) => [x0 + vx * aa + (gust3(born + aa) - gust3(born)) * gk + rho * Math.cos(w * aa + ph), y0 + vy * aa + rho * 0.6 * Math.sin(w * aa + ph)];
      const len2 = (near ? 3.6 : 2.6) + R(6) * 1.1;
      if (rest > 0) {
        const [x2, y2] = at2(tf);
        const fade = 1 - rest / (dur - tf);
        return void (fade > 0.15 && petal(q, x2, y2, len2 * (0.35 + 0.65 * fade), (R(7) - 0.5) * 1.2, 0.5, C, 1));
      }
      const [x, y] = at2(a), flip = Math.cos(R(8) * TAU + a * (3 + R(9) * 5)), ang = R(10) * TAU + a * (R(11) - 0.5) * 3;
      petal(q, x, y, len2, ang, flip, C, 1);
      if (flip > 0.9) {
        const g = (flip - 0.9) / 0.1;
        q.px(x, y - 1, WHITE);
        q.glow(x, y, near ? 7 : 5, C[4], (near ? 0.32 : 0.22) * g);
      }
    });
  }
  function petal(q, x, y, len2, ang, flip, C, a) {
    const fs = 0.3 + 0.7 * Math.abs(flip), back = flip < -0.2, c = Math.cos(ang), s = Math.sin(ang), e = len2 + 1;
    const face = back ? [C[1], C[2], C[3]] : [C[2], C[3], C[4]], tip = back ? C[3] : C[5];
    q.shade(x - e, y - e, x + e, y + e, (px, py, out) => {
      const dx = px - x, dy = py - y, u = (dx * c + dy * s) / len2, v = (-dx * s + dy * c) / (len2 * fs);
      if (u < -1 || u > 1) return;
      const hw = 0.55 * Math.sqrt(1 - u * u) * (1 + 0.35 * u);
      if (Math.abs(v) > hw || u > 0.7 && Math.abs(v) < 0.12) return;
      out.c = u > 0.45 && v < 0.1 ? tip : u < -0.45 ? face[0] : v < 0 ? face[2] : face[1];
      out.a = a;
    });
  }
  function blossoms(q, t, S2, C) {
    trips(t, D7, 7, S2 * 31, 1, 1, (u, k, m, i) => {
      const R = (c) => rand(S2 * 31, i, c), y = -190 + (FLOOR3 + 2 + 190) * Math.min(1, u / 0.9), born = t - u * D7;
      if (u > 0.9) return;
      const x = -190 + R(1) * 330 + 14 * u * D7 * 0.1 + (gust3(t) - gust3(born)) + 6 * Math.sin(u * TAU * 2 + R(2) * 6), rot = R(3) * TAU + u * D7 * (R(4) - 0.5) * 2;
      const r = 3.6 + R(5) * 1.2;
      for (let p = 0; p < 5; p++) {
        const an = rot + p * TAU / 5;
        petal(q, x + Math.cos(an) * r * 0.75, y + Math.sin(an) * r * 0.75, r * 0.7, an, 1, C, 1);
      }
      q.px(x, y, hex("#ffe08a"));
      q.glow(x, y, 8, C[4], 0.2);
    });
  }
  var SCATTER = /* @__PURE__ */ new Map();
  function scatter(q, S2, C) {
    const key = S2 + C.join();
    let px = SCATTER.get(key);
    if (!px) {
      px = [];
      const rec = {
        shade(x0, y0, x1, y1, fn) {
          const o = { c: 0, a: 1 };
          for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
            for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
              o.c = 0;
              const c = fn(x + 0.5, y + 0.5, o) || o.c;
              if (c) px.push(x + 0.5, y + 0.5, c, o.a);
            }
        }
      };
      for (let i = 0; i < 46; i++) petal(rec, -164 + rand(S2, i, 71) * 328, FLOOR3 + Math.floor(rand(S2, i, 72) * 3) * 2, 2.6 + rand(S2, i, 73), (rand(S2, i, 74) - 0.5) * 1.2, 0.5, C, 1);
      SCATTER.set(key, px);
    }
    for (let i = 0; i < px.length; i += 4) q.dot(px[i], px[i + 1], px[i + 2], px[i + 3]);
  }

  // vendor/pixelfx/fx/weather/fireflies.js
  var fireflies_exports = {};
  __export(fireflies_exports, {
    draw: () => draw8,
    drawBack: () => drawBack8,
    meta: () => meta8
  });
  var meta8 = {
    name: "Fireflies",
    desc: "Fireflies wander over a meadow at night, each glowing up and fading on its own rhythm, trailing light and lighting the grass tips beneath them.",
    tags: ["weather", "fireflies", "night", "glow", "meadow", "nature", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 12,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#2a3a10", "#5a7a1a", "#9ad02a", "#d6ff5a", "#f4ffb8", "#ffffff"],
      grass: ["#070f0b", "#0c1a12", "#13281a", "#1d3a24", "#2b5232", "#3f6e40"],
      seed: 2
    }
  };
  var D8 = 12;
  var cyc = (t, n, ph = 0) => TAU * n * t / D8 + ph;
  function fly(S2, i, t) {
    const R = (n) => rand(S2, i, n), depth = i < 14 ? 0 : i < 26 ? 1 : 2, k = [0.5, 0.8, 1][depth];
    const cx = -150 + R(1) * 300, cy = -16 - R(2) * (depth === 2 ? 70 : 130);
    const ax = (14 + R(3) * 26) * k, ay = (8 + R(4) * 14) * k, n1 = 1 + Math.floor(R(5) * 2), n2 = 1 + Math.floor(R(6) * 3);
    const pos = (tt) => [
      cx + ax * Math.sin(cyc(tt, n1, R(7) * TAU)) + 10 * k * loopNoise(tt / D8, 1.5, i * 3),
      cy + ay * Math.sin(cyc(tt, n2, R(8) * TAU)) + 6 * k * loopNoise(tt / D8, 1.5, i * 3 + 1)
    ];
    const per = D8 / (3 + Math.floor(R(9) * 4)), u = ((t / per + R(10)) % 1 + 1) % 1, two = R(11) < 0.35;
    const pulse = (v) => v < 0.06 ? v / 0.06 : v < 0.14 ? 1 : v < 0.4 ? 1 - (v - 0.14) / 0.26 : 0;
    const glow2 = Math.max(pulse(u), two ? pulse(u - 0.22) * 0.8 : 0);
    return { pos, depth, glow: glow2, R };
  }
  function drawBack8(p, t, o) {
    const q = clip(p, meta8), S2 = o.seed, C = fit(o.palette, 6), G = fit(o.grass, 6);
    rows(p, meta8, -170, 9, (y, R) => {
      const k = (y + 170) / 180;
      R.c.fill(mix(G[0], G[1], k));
      R.a.fill(0.48 + 0.14 * k);
      R.b.fill(1);
    });
    const flies = Array.from({ length: 32 }, (_, i) => fly(S2, i, t));
    grass(q, t, S2, G, C, flies, false);
    for (const f of flies) if (f.depth < 2) firefly(q, t, f, C);
  }
  function draw8(p, t, o) {
    const q = clip(p, meta8), S2 = o.seed, C = fit(o.palette, 6), G = fit(o.grass, 6);
    const flies = Array.from({ length: 32 }, (_, i) => fly(S2, i, t));
    grass(q, t, S2, G, C, flies, true);
    for (const f of flies) if (f.depth === 2) firefly(q, t, f, C);
  }
  function firefly(q, t, f, C) {
    const [x, y] = f.pos(t), g = f.glow, X = Math.round(x), Y = Math.round(y);
    if (f.depth === 0) {
      if (g < 0.08) return;
      q.dot(X, Y, g > 0.6 ? C[4] : C[3], Math.min(1, g * 1.6));
      q.glow(x, y, 6, C[2], 0.45 * g);
      return;
    }
    if (g > 0.3)
      for (let j = 1; j <= 4; j++) {
        const [tx, ty] = f.pos(t - j * 0.05);
        q.dot(tx, ty, C[2], (g - 0.3) * (1 - j / 5) * 1.3);
      }
    if (f.depth === 1) {
      q.px(X, Y, g > 0.5 ? C[5] : g > 0.15 ? C[3] : C[1]);
      if (g > 0.4) q.px(X, Y + 1, C[2]);
      q.glow(x, y, 9, C[2], 0.5 * g);
      q.glow(x, y, 3, C[4], 0.5 * g);
      return;
    }
    const [nx] = f.pos(t + 0.05), dir = nx >= x ? 1 : -1, beat = Math.floor(t * 30) % 2;
    q.px(X + dir, Y, C[0]);
    q.px(X + dir * 2, Y, C[0]);
    q.dot(X, Y - 1 - beat, mix(C[1], WHITE, 0.4), 0.7);
    q.dot(X + dir, Y - 1 - beat, mix(C[1], WHITE, 0.4), 0.7);
    q.px(X, Y, g > 0.3 ? C[5] : C[1]);
    q.px(X - dir, Y, g > 0.5 ? C[4] : g > 0.15 ? C[3] : C[1]);
    if (g > 0.6) q.px(X - dir, Y + 1, C[3]);
    if (g > 0.7) for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) q.dot(X - dir + dx, Y + dy, C[3], (g - 0.7) * 3);
    q.glow(x, y, 28, C[2], 0.45 * g);
    q.glow(x, y, 10, C[4], 0.5 * g);
    q.glow(x, y, 4, C[5], 0.5 * g);
  }
  function grass(q, t, S2, G, C, flies, front) {
    const lit = flies.filter((f) => f.glow > 0.25 && f.depth > 0).map((f) => [...f.pos(t), f.glow]);
    const n = front ? 150 : 230;
    for (let i = 0; i < n; i++) {
      const R = (k) => rand(S2 * 3 + (front ? 1 : 0), i, k), x = -162 + (i + R(1)) * (324 / n), h = (front ? 4 : 5) + R(2) * (front ? 8 : 11) + (R(3) < 0.1 ? 6 : 0);
      const base = (front ? 9 : 2) - R(4) * 3, sway = (1.2 + R(5)) * Math.sin(cyc(t, 2, -x * 0.03) + R(6)) + 0.6 * Math.sin(cyc(t, 5, x * 0.07));
      const tone = front ? 1 + Math.floor(R(7) * 3) : 1 + Math.floor(R(7) * 2);
      let tipLight = 0;
      for (const [fx, fy, g] of lit) {
        const d = Math.hypot(fx - (x + sway), fy - (base - h));
        if (d < 28) tipLight = Math.max(tipLight, g * (1 - d / 28));
      }
      for (let r = 0; r < h; r++) {
        const u = r / h, c = u > 0.8 && tipLight > 0.2 ? tipLight > 0.55 && u > 0.9 ? C[3] : C[2] : u > 0.7 ? G[Math.min(5, tone + 1)] : G[tone];
        q.px(x + sway * u * u, base - r, c);
      }
      if (R(8) < 0.07) {
        const sx = x + sway, sy = base - h;
        q.px(sx, sy - 1, tipLight > 0.2 ? C[3] : G[5]);
        q.px(sx - 1, sy, G[4]);
        q.px(sx + 1, sy, G[4]);
      }
    }
  }

  // vendor/pixelfx/fx/weather/clouds.js
  var clouds_exports = {};
  __export(clouds_exports, {
    draw: () => draw9,
    meta: () => meta9
  });
  var meta9 = {
    name: "Clouds",
    desc: "Layers of clouds drift past a bright moon at night: silver-lit tops, dark bellies, edges that flare where they cross the moon, forming and thinning as they go.",
    tags: ["weather", "clouds", "moon", "night", "sky", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 180],
    duration: 12,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#0c0c18", "#16172a", "#232540", "#363a5a", "#545a80", "#8088ae", "#bcc4e2", "#f2f4ff"],
      seed: 7
    }
  };
  var D9 = 12;
  var MX = 92;
  var MY = -128;
  var MR = 12;
  var LAYERS4 = [
    { n: 7, w: [40, 70], h: [6, 11], y: [-150, -110], v: 3, life: [8, 11], tone: [2, 3, 4, 5], alpha: 0.7 },
    { n: 6, w: [60, 100], h: [9, 15], y: [-120, -70], v: 6, life: [8, 11], tone: [1, 2, 4, 6], alpha: 0.88 },
    { n: 5, w: [90, 140], h: [12, 20], y: [-80, -30], v: 10, life: [9, 12], tone: [1, 2, 3, 6], alpha: 1 }
  ];
  function draw9(p, t, o) {
    const q = clip(p, meta9), S2 = o.seed, C = fit(o.palette, 8);
    moon(q, C);
    LAYERS4.forEach((L, j) => {
      for (let i = 0; i < L.n; i++) cloud(q, t, S2, C, L, j, i);
    });
    q.glow(MX, MY, 110, C[4], 0.14);
    q.glow(MX, MY, 40, C[5], 0.25);
    q.glow(MX, MY, 18, C[6], 0.3);
  }
  function moon(q, C) {
    q.shade(MX - MR - 1, MY - MR - 1, MX + MR + 1, MY + MR + 1, (x, y, out) => {
      const dx = x - MX, dy = y - MY, d = Math.hypot(dx, dy) / MR;
      if (d > 1) return;
      const sea = (dx + 4) ** 2 + (dy + 2) ** 2 < 14 || (dx - 3) ** 2 + (dy - 4) ** 2 < 9 || (dx - 5) ** 2 + (dy + 5) ** 2 < 4;
      out.c = d > 0.86 ? dx + dy < 0 ? C[6] : WHITE : sea ? C[5] : d < 0.5 && dx + dy < 0 ? WHITE : C[7];
    });
  }
  function cloud(q, t, S2, C, L, j, i) {
    const R = (k) => rand(S2, j, i, k), life = L.life[0] + R(1) * (L.life[1] - L.life[0]), age = wrap(t - R(2) * D9, D9);
    if (age >= life) return;
    const u = age / life, grow = Math.min(1, u * 4) * Math.min(1, (1 - u) * 4), w = (L.w[0] + R(3) * (L.w[1] - L.w[0])) * (0.6 + 0.4 * grow);
    const x0 = -200 + R(4) * 330 + L.v * age, base = L.y[0] + R(5) * (L.y[1] - L.y[0]), H3 = (L.h[0] + R(6) * (L.h[1] - L.h[0])) * grow;
    if (H3 < 1.5) return;
    const n = 4 + Math.floor(R(7) * 4), puffs = [];
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n, r = H3 * (0.5 + 0.35 * Math.sin(Math.PI * f)) * (0.75 + 0.5 * R(10 + k)) * (1 + 0.06 * Math.sin(TAU * t / D9 + k + i));
      puffs.push([x0 + w * (f - 0.5) + (R(20 + k) - 0.5) * 6, base - r * 0.3 - R(30 + k) * H3 * 0.15, r]);
    }
    for (let k = 0; k < 1 + Math.floor(R(8) * 3); k++) {
      const f = 0.3 + R(40 + k) * 0.4, r = H3 * (0.75 + 0.35 * R(50 + k)) * (1 + 0.05 * Math.sin(TAU * t / D9 + k * 2 + i));
      puffs.push([x0 + w * (f - 0.5), base - H3 * 0.55 - r * 0.2, r]);
    }
    const x1 = x0 - w / 2 - H3, x2 = x0 + w / 2 + H3, B2 = box(meta9);
    for (let x = Math.max(B2.x0, Math.floor(x1)); x <= Math.min(B2.x1 - 1, Math.ceil(x2)); x++) {
      const cx = x + 0.5;
      let top = Infinity, top2 = Infinity;
      for (const [px, py, r] of puffs) {
        const dx = cx - px;
        if (dx * dx >= r * r) continue;
        const y = py - Math.sqrt(r * r - dx * dx);
        if (y < top) top2 = top, top = y;
        else if (y < top2) top2 = y;
      }
      if (top === Infinity) continue;
      const end = Math.min(cx - x1, x2 - cx) / H3, bot = base + 1.5 + Math.sin(cx * 0.21 + i) * 0.8 - (end < 1 ? (1 - end) * 4 : 0);
      if (bot <= top) continue;
      const h = bot - top, inner = top2 - top > 2.5 && top2 < bot - 2 ? Math.floor(top2) : -999;
      for (let y = Math.floor(top); y < bot; y++) {
        const d = y + 0.5 - top, v = d / h, th = bayer(x, y) * 0.12, md = Math.hypot(cx - MX, y - MY);
        let c = d < 1 ? L.tone[3] : v < 0.25 + th ? L.tone[2] : v < 0.62 + th ? L.tone[1] : L.tone[0];
        if (y === inner) c = Math.max(c, L.tone[2]);
        if (bot - y - 0.5 < 1 && v > 0.5) c = Math.max(0, L.tone[0] - 1);
        if (md < 46 && (d < 2 || y === inner || v < 0.3)) c = Math.min(7, c + (md < 24 ? 2 : 1));
        const a = L.alpha * Math.min(1, grow * 1.5);
        if (a >= 1) q.px(x, y, C[c]);
        else q.blend(x, y, C[c], a);
        if (d < 1 && md < 46) q.light(x, y, C[6], 0.35 * (1 - md / 46));
      }
    }
  }

  // vendor/pixelfx/fx/weather/aurora.js
  var aurora_exports = {};
  __export(aurora_exports, {
    draw: () => draw10,
    meta: () => meta10
  });
  var meta10 = {
    name: "Aurora",
    desc: "Rippling curtains of green-to-violet light over a starfield: folding hems burn bright, rays shimmer up into violet, and the whole sky slowly breathes.",
    tags: ["weather", "aurora", "northern lights", "sky", "night", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 180],
    duration: 12,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#081a1e", "#0d3a36", "#13664e", "#1fa06a", "#3fd88e", "#9af7bf", "#e6fff0"],
      upper: ["#120b2a", "#26164f", "#41208a", "#6a34c0", "#9c62e8", "#d2b4ff", "#f6eeff"],
      seed: 3
    }
  };
  var D10 = 12;
  var W2 = 320;
  var H = 180;
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  var I = new Float32Array(W2 * H);
  var HV = new Float32Array(W2 * H);
  var BL = new Float32Array(W2 * H);
  var TMP = new Float32Array(W2 * H);
  var PROF = Float32Array.from({ length: 201 }, (_, i) => {
    const v = i / 200;
    return v < 0.035 ? 2.6 : v < 0.22 ? 1.15 - v : (1 - v) ** 1.5 * 0.9;
  });
  function blur(src, dst, r) {
    const n = 2 * r + 1;
    for (let y = 0; y < H; y++) {
      let acc = 0;
      const o = y * W2;
      for (let x = -r; x < W2 + r; x++) {
        if (x + r < W2) acc += src[o + Math.min(W2 - 1, x + r)];
        if (x - r - 1 >= 0) acc -= src[o + x - r - 1];
        if (x >= 0 && x < W2) TMP[o + x] = acc / n;
      }
    }
    for (let x = 0; x < W2; x++) {
      let acc = 0;
      for (let y = -r; y < H + r; y++) {
        if (y + r < H) acc += TMP[Math.min(H - 1, y + r) * W2 + x];
        if (y - r - 1 >= 0) acc -= TMP[(y - r - 1) * W2 + x];
        if (y >= 0 && y < H) dst[y * W2 + x] = acc / n;
      }
    }
  }
  var cyc2 = (t, c, ph = 0) => TAU * c * t / D10 + ph;
  var CURTAINS = [
    { y: -132, slope: -0.08, amp: 8, lam: 210, fold: 14, flam: 150, height: 40, k: 0.6, s0: -210, s1: 210, rip: 1.6, c: [1, 1, 2], hue: 0.35 },
    { y: -88, slope: 0.22, amp: 13, lam: 250, fold: 19, flam: 165, height: 82, k: 1.5, s0: -195, s1: 180, rip: 2.4, c: [1, 2, 3], hue: 0 },
    { y: -38, slope: -0.05, amp: 5, lam: 150, fold: 10, flam: 110, height: 20, k: 0.45, s0: -210, s1: 210, rip: 1.4, c: [2, 1, 3], hue: 0 }
  ];
  function draw10(p, t, o) {
    const q = clip(p, meta10), B2 = box(meta10), S2 = o.seed, G = fit(o.palette, 7), U = fit(o.upper, 7);
    stars(q, t, S2, G, U);
    I.fill(0);
    HV.fill(0);
    const F = field(S2 * 5 + 1, 256, 128, [8, 16, 32]), breath = 0.75 + 0.25 * Math.sin(cyc2(t, 1, -1.2));
    const rays = [];
    CURTAINS.forEach((c, n) => curtain(q, c, n, t, F, breath, rays, G));
    blur(I, BL, 5);
    const GM = G.map((g, i) => mix(g, U[i], 0.5));
    rows(p, meta10, B2.y0, -12, (y, R) => {
      const base = (Math.floor(y) - B2.y0) * W2, by = (Math.floor(y) & 3) << 2;
      for (let xi = 0; xi < W2; xi++) {
        const i = base + xi, raw = I[i], bl = BL[i];
        let k = bl > 0.015 ? Math.min(0.4, bl * 0.6) : 0;
        if (raw >= 0.03) {
          const e = raw * 1.5 / (1 + raw * 1.5), v = HV[i] / raw, th = e > 0.45 ? BAY[by | xi & 3] * 0.06 : 0;
          let lv = e > 0.86 + th ? 6 : e > 0.72 + th ? 5 : e > 0.56 + th ? 4 : e > 0.4 + th ? 3 : e > 0.24 ? 2 : 1;
          if (v > 0.35) lv = Math.min(lv, 5);
          const c = v < 0.3 ? G[lv] : v < 0.5 ? GM[lv] : U[lv];
          if (lv >= 3) {
            R.c[xi] = c;
            R.a[xi] = clamp((e - 0.3) * 2.2);
            R.b[xi] = lv < 5 ? 1 : 0;
          }
          R.l[xi] = lv >= 3 ? v < 0.4 ? G[4] : U[4] : c === G[lv] ? G[4] : c === U[lv] ? U[4] : GM[4];
          k += e * (lv >= 3 ? 0.28 : 0.72);
        } else R.l[xi] = G[4];
        R.k[xi] = k;
      }
    });
    for (const r of rays) {
      const n = Math.round(r.h);
      for (let j = 1; j < n; j++) {
        const u = j / n;
        q.blend(r.x, r.hem - j, u < 0.35 ? G[5] : u < 0.6 ? mix(G[5], U[5], 0.5) : U[5], r.k * (1 - u) ** 1.3);
      }
      q.px(r.x, r.hem, G[6]);
    }
  }
  function curtain(q, c, n, t, F, breath, rays, G) {
    const X0 = -160, Y0 = -180, fast = 256 * 2 * t / D10, slow = 256 * t / D10;
    let p1 = 0, p2 = 0, lastX = -999;
    for (let s = c.s0; s < c.s1; s += 0.5) {
      const x = s + c.fold * Math.sin(TAU * s / c.flam + cyc2(t, c.c[0], n * 2)) + 5 * Math.sin(TAU * s / 64 + cyc2(t, c.c[2], n));
      if (x < X0 - 2 || x >= X0 + W2 + 1) continue;
      const hem = c.y + c.slope * s + c.amp * Math.sin(TAU * s / c.lam + cyc2(t, c.c[1], n * 1.7)) + c.rip * Math.sin(TAU * s / 23 - cyc2(t, 7, n));
      const env2 = smooth(c.s0, c.s0 + 60, s) * (1 - smooth(c.s1 - 70, c.s1, s));
      const r1 = clamp((sample(F, s * 5 - fast + n * 40, 10 + n * 30) - 0.38) * 3.2), r2 = clamp((sample(F, s * 4.3 + fast * 0.7 + n * 90, 50 + n * 13) - 0.35) * 3);
      const patch = sample(F, s * 0.7 + slow + n * 17, 80 + n * 9);
      const k = c.k * env2 * breath * (0.2 + 0.8 * r1) * (0.3 + 1.4 * Math.max(0, patch - 0.3));
      if (k < 0.01) continue;
      const h = c.height * (0.45 + 0.75 * r2) * (0.75 + 0.5 * patch), xi = Math.floor(x - X0), fr = x - X0 - xi;
      if (p1 > 0.75 && p1 >= p2 && p1 >= r1 && Math.abs(x - lastX) > 2 && k > 0.25) rays.push({ x, hem: hem - 1, h: h * 0.9, k: Math.min(0.85, k * 0.9) }), lastX = x;
      p2 = p1;
      p1 = r1;
      if (xi < -1 || xi >= W2) continue;
      const top = Math.max(0, Math.floor(hem - h - Y0)), bot = Math.min(H - 1, Math.floor(hem - Y0) + 3), inv = 1 / h, k0 = k * 0.5 * (1 - fr), k1 = k * 0.5 * fr;
      let v = (hem - Y0 - 0.5 - top) * inv;
      for (let yi = top; yi <= bot; yi++, v -= inv) {
        const pr = v >= 0 ? PROF[Math.min(200, v * 200 | 0)] : Math.max(0, 0.45 + v * h * 0.16), o = yi * W2 + xi, hv = v + c.hue < 0 ? 0 : v + c.hue > 1 ? 1 : v + c.hue;
        if (pr <= 0) continue;
        if (xi >= 0) I[o] += k0 * pr, HV[o] += k0 * pr * hv;
        if (xi + 1 < W2) I[o + 1] += k1 * pr, HV[o + 1] += k1 * pr * hv;
      }
    }
  }
  function stars(q, t, S2, G, U) {
    for (let i = 0; i < 150; i++) {
      const x = -160 + rand(S2, i, 1) * 320, y = -180 + rand(S2, i, 2) * 175, r = rand(S2, i, 3), c = 1 + Math.floor(rand(S2, i, 4) * 4);
      const tw = 0.5 + 0.5 * Math.sin(cyc2(t, c, rand(S2, i, 5) * TAU));
      const col = r < 0.6 ? mix(U[3], WHITE, 0.2) : r < 0.9 ? mix(U[5], WHITE, 0.5) : WHITE;
      if (r < 0.6) q.dot(x, y, col, 0.35 + 0.5 * tw);
      else if (r < 0.95) {
        q.px(x, y, col);
        q.glow(x + 0.5, y + 0.5, 3, U[5], 0.25 * tw);
      } else sparkle(q, x, y, 1 + Math.round(tw * 2), mix(U[5], WHITE, 0.6), U[4], 0.35 * tw);
    }
  }

  // vendor/pixelfx/fx/weather/god-rays.js
  var god_rays_exports = {};
  __export(god_rays_exports, {
    draw: () => draw11,
    drawBack: () => drawBack9,
    meta: () => meta11
  });
  var meta11 = {
    name: "God rays",
    desc: "Shafts of light slant down from high on the left, breathing and swaying, pooling on the floor, as drifting dust motes light up whenever they cross a beam.",
    tags: ["weather", "god rays", "light", "sunbeam", "dust", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 170],
    duration: 10,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#1a1208", "#3a2810", "#7a5a24", "#c89a44", "#f2d27a", "#fff2c4", "#ffffff"],
      seed: 3
    }
  };
  var D11 = 10;
  var W3 = 320;
  var SX = -230;
  var SY = -300;
  var AX = Math.cos(0.94);
  var AY = Math.sin(0.94);
  var NX = -AY;
  var NY = AX;
  var SHAFTS = [
    { c: -0.27, h: 0.03, k: 0.65, b: 1, sw: 6e-3 },
    { c: -0.17, h: 0.022, k: 0.55, b: 2, sw: 5e-3 },
    { c: -0.07, h: 0.05, k: 1, b: 1, sw: 8e-3 },
    { c: 0.03, h: 0.018, k: 0.6, b: 3, sw: 4e-3 },
    { c: 0.12, h: 0.042, k: 0.85, b: 2, sw: 7e-3 },
    { c: 0.23, h: 0.026, k: 0.6, b: 1, sw: 5e-3 }
  ];
  var STR = new Float32Array(512);
  function lightAt(x, y, sh) {
    const dx = x - SX, dy = y - SY, r = dx * AX + dy * AY, ang = (dx * NX + dy * NY) / r;
    let e = 0;
    for (const s of sh) {
      const q = Math.abs(ang - s.c) / s.h;
      if (q < 1) e += s.k * (1 - q * q) ** 1.5;
    }
    if (e <= 0) return 0;
    const strand = STR[clamp(Math.floor((ang + 0.36) * 700), 0, 511)], fall = clamp(1.25 - (r - 230) / 420);
    return e * fall * (0.7 + 0.45 * strand);
  }
  function drawBack9(p, t, o) {
    const q = clip(p, meta11), S2 = o.seed, C = fit(o.palette, 7);
    const sh = shafts(t, S2);
    const L = C.map((c) => mix(C[0], c, 0.75));
    const n = sh.length, SC = new Float32Array(n), SI = new Float32Array(n), SK = new Float32Array(n);
    sh.forEach((s, j) => (SC[j] = s.c, SI[j] = 1 / s.h, SK[j] = s.k));
    rows(p, meta11, -170, 9, (y, R) => {
      const floor3 = y > 0, dy = y - SY, air = floor3 ? 0.8 : 0.66, boost = floor3 ? 1.6 : 1;
      let r = (-160 + 0.5 - SX) * AX + dy * AY, nn = (-160 + 0.5 - SX) * NX + dy * NY;
      R.a.fill(air);
      R.b.fill(1);
      R.c.fill(C[0]);
      for (let i = 0; i < W3; i++, r += AX, nn += NX) {
        const ang = nn / r;
        let e = 0;
        for (let j = 0; j < n; j++) {
          const q2 = (ang - SC[j]) * SI[j];
          if (q2 > -1 && q2 < 1) {
            const w = 1 - q2 * q2;
            e += SK[j] * w * Math.sqrt(w);
          }
        }
        if (e <= 0) continue;
        const fall = 1.35 - (r - 200) / 330, si = (ang + 0.36) * 700 | 0;
        e *= (fall > 1 ? 1 : fall < 0 ? 0 : fall) * (0.7 + 0.45 * STR[si < 0 ? 0 : si > 511 ? 511 : si]) * boost;
        if (e < 0.06) continue;
        const lv = e > 1.05 ? 6 : e > 0.78 ? 5 : e > 0.52 ? 4 : e > 0.3 ? 3 : 2;
        R.c[i] = floor3 ? C[lv] : L[lv];
        R.a[i] = floor3 ? 0.85 : Math.min(0.78, 0.12 + e * 0.5);
        R.l[i] = C[4];
        R.k[i] = e * (floor3 ? 0.32 : 0.26);
      }
    });
    q.glow(-168, -178, 130, C[3], 0.3);
    q.glow(-168, -178, 50, C[5], 0.35);
    motes(q, t, S2, C, sh, false);
  }
  function draw11(p, t, o) {
    const q = clip(p, meta11), S2 = o.seed, C = fit(o.palette, 7);
    motes(q, t, S2, C, shafts(t, S2), true);
  }
  function shafts(t, S2) {
    for (let i = 0; i < 512; i++) {
      const a = i / 512;
      STR[i] = 0.5 + 0.5 * Math.sin(a * 190 + Math.sin(TAU * t / D11) * 2 + S2) * Math.sin(a * 77 - TAU * t / D11 + S2 * 2);
    }
    return SHAFTS.map((s, i) => ({ c: s.c + s.sw * Math.sin(TAU * t / D11 + i * 1.3), h: s.h * (1 + 0.15 * Math.sin(TAU * s.b * t / D11 + i)), k: s.k * (0.72 + 0.28 * Math.sin(TAU * s.b * t / D11 + i * 2.1)) }));
  }
  function motes(q, t, S2, C, sh, front) {
    for (let i = front ? 0 : 50; i < (front ? 50 : 160); i++) {
      const R = (k2) => rand(S2, i, k2), n1 = 1 + Math.floor(R(1) * 2), n2 = 1 + Math.floor(R(2) * 2);
      const x = -170 + R(3) * 340 + (8 + R(4) * 14) * Math.sin(TAU * n1 * t / D11 + R(5) * TAU), y = -170 + R(6) * 172 + (6 + R(7) * 10) * Math.sin(TAU * n2 * t / D11 + R(8) * TAU) + 4 * Math.sin(TAU * 3 * t / D11 + i);
      const e = lightAt(x, y, sh);
      if (e < 0.12) continue;
      const big = front && R(9) < 0.5, k = Math.min(1, e);
      q.px(x, y, k > 0.6 ? WHITE : k > 0.3 ? C[5] : C[4]);
      if (big && k > 0.5) q.px(x + 1, y, C[4]), q.px(x, y + 1, C[4]);
      q.glow(x, y, big ? 6 : 4, C[4], 0.4 * k);
    }
  }

  // vendor/pixelfx/fx/weather/shooting-stars.js
  var shooting_stars_exports = {};
  __export(shooting_stars_exports, {
    draw: () => draw12,
    meta: () => meta12
  });
  var meta12 = {
    name: "Shooting stars",
    desc: "Meteors burn across a starry sky, white heads trailing gold and rose; the big ones flare and break up, and each leaves a glowing train that twists and fades.",
    tags: ["weather", "meteor", "shooting star", "night", "sky", "stars", "ambient", "loop"],
    size: [320, 180],
    origin: [160, 180],
    duration: 10,
    loop: true,
    fps: 30,
    bg: "sky",
    options: {
      palette: ["#3a1e5a", "#7a3a8a", "#e0607a", "#ffa86a", "#ffe6a8", "#ffffff"],
      sky: ["#141428", "#2a2a4a", "#4c4c7c", "#8e8ec4", "#dcdcff"],
      seed: 4
    }
  };
  var D12 = 10;
  var METEORS = [
    { t0: 0.5, x: 60, y: -170, a: 2.45, v: 260, life: 0.55, s: 0.6 },
    { t0: 1.9, x: -40, y: -176, a: 2.2, v: 220, life: 0.7, s: 0.8 },
    { t0: 3.4, x: 150, y: -150, a: 2.62, v: 300, life: 0.45, s: 0.5 },
    { t0: 4.6, x: 130, y: -178, a: 2.35, v: 240, life: 1.05, s: 1.4, flare: true },
    { t0: 6.7, x: -90, y: -168, a: 2.05, v: 200, life: 0.6, s: 0.7 },
    { t0: 7.9, x: 20, y: -160, a: 2.5, v: 280, life: 0.5, s: 0.6 },
    { t0: 9.2, x: -10, y: -176, a: 2.28, v: 230, life: 0.8, s: 1, flare: true }
  ];
  var TRAIN = 1.6;
  function draw12(p, t, o) {
    const q = clip(p, meta12), B2 = box(meta12), S2 = o.seed, C = fit(o.palette, 6), K = fit(o.sky, 5);
    sky2(p, q, t, S2, K);
    METEORS.forEach((m, i) => meteor(q, wrap(t - m.t0, D12), m, i, S2, C));
  }
  function sky2(p, q, t, S2, K) {
    rows(p, meta12, -180, -1, (y, R) => {
      for (let i = 0; i < 320; i++) {
        const x = i - 160 + 0.5, d = Math.abs(y + 110 - x * -0.32) / 36;
        if (d >= 1) continue;
        const k = (1 - d) * (1 - d);
        R.l[i] = K[2];
        R.k[i] = 0.1 * k;
        if (rand(i, Math.floor(y), S2, 5) < 0.05 * k) R.c[i] = K[2], R.a[i] = 0.7;
      }
    });
    for (let i = 0; i < 130; i++) {
      const x = -160 + rand(S2, i, 1) * 320, y = -180 + rand(S2, i, 2) * 178, r = rand(S2, i, 3), c = 1 + Math.floor(rand(S2, i, 4) * 4);
      const tw = 0.5 + 0.5 * Math.sin(TAU * c * t / D12 + rand(S2, i, 5) * TAU);
      if (r < 0.6) q.dot(x, y, K[3], 0.35 + 0.5 * tw);
      else if (r < 0.94) q.px(x, y, r < 0.8 ? K[4] : WHITE), q.glow(x + 0.5, y + 0.5, 3, K[3], 0.22 * tw);
      else sparkle(q, x, y, 1 + Math.round(tw * 2), K[4], K[3], 0.3 * tw);
    }
  }
  function meteor(q, age, m, i, S2, C) {
    const ca = Math.cos(m.a), sa = Math.sin(m.a), end = m.life + (m.flare ? 0.5 : 0) + TRAIN;
    if (age > end) return;
    const pos = (tt) => [m.x + ca * m.v * tt, m.y + sa * m.v * tt], burn = Math.min(age, m.life), [hx, hy] = pos(burn);
    const trainK = age < m.life ? 1 : 1 - (age - m.life) / (TRAIN + (m.flare ? 0.5 : 0));
    if (trainK > 0) {
      const len2 = m.v * burn, nx = -sa, ny = ca;
      for (let d = 0; d < len2; d += 1) {
        const passed = age - d / m.v;
        if (passed < 0.08) continue;
        const g = trainK * Math.min(1, (passed - 0.08) * 4) * (0.35 + 0.65 * Math.sin(Math.PI * d / len2)) * m.s, tw = Math.sin(d * 0.09 + passed * 1.7) * Math.min(4, passed * 3);
        const x = m.x + ca * d + nx * tw + passed * 4, y = m.y + sa * d + ny * tw;
        q.dot(x, y, passed < 0.6 ? C[2] : C[1], g * 0.75);
        if (d % 6 === 0) q.glow(x, y, 6 + passed * 4, C[1], 0.12 * g);
      }
    }
    if (age > m.life + (m.flare ? 0.5 : 0)) return;
    const u = age / m.life, k = age < m.life ? Math.min(1, u * 6) * (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1) : 0;
    if (k > 0) {
      const L = (24 + 40 * m.s) * Math.min(1, u * 3);
      for (let d = 0; d <= L; d += 0.5) {
        const v = d / L, x = hx - ca * d, y = hy - sa * d;
        q.dot(x, y, v < 0.08 ? WHITE : at(C.slice(1).reverse(), v * 0.95), k * (v < 0.6 ? 1 : (1 - v) / 0.4));
        if (m.s > 0.9 && v < 0.4) q.dot(x - sa * 0.9, y + ca * 0.9, v < 0.15 ? C[4] : C[3], k * (1 - v / 0.4));
      }
      q.px(hx, hy, WHITE);
      if (m.s > 0.9) q.px(hx + 1, hy, WHITE), q.px(hx, hy + 1, C[4]);
      q.glow(hx, hy, 8 + 10 * m.s, C[4], 0.45 * k);
      q.glow(hx - ca * L * 0.3, hy - sa * L * 0.3, 10 + 8 * m.s, C[3], 0.2 * k);
    }
    if (!m.flare || age < m.life * 0.82) return;
    const f = (age - m.life * 0.82) / (m.life * 0.18 + 0.5), [fx, fy] = pos(m.life * 0.86);
    if (f < 0.35) {
      sparkle(q, fx, fy, 9 * Math.sin(Math.PI * f / 0.35) + 2, C[4], C[3], 0.6);
      q.glow(fx, fy, 40, C[3], 0.5 * (1 - f / 0.35));
    }
    for (let j = 0; j < 7; j++) {
      const ang = rand(S2, i, j, 5) * TAU, r = 5 + rand(S2, i, j, 6) * 16, d0 = rand(S2, i, j, 7) * 0.3, g = (f - d0) / 0.45;
      if (g <= 0 || g >= 1) continue;
      const sx = fx + Math.cos(ang) * r * (0.6 + g * 0.5), sy = fy + Math.sin(ang) * r * (0.6 + g * 0.5) - g * 3, arm = Math.round(2.5 * Math.sin(Math.PI * g));
      if (arm >= 1) sparkle(q, sx, sy, arm, j % 3 ? C[4] : WHITE, C[3], 0.3 * (1 - g));
      else q.px(sx, sy, C[4]);
    }
    for (let j = 0; j < 4; j++) {
      const da = (rand(S2, i, j, 1) - 0.5) * 0.5, sp = m.v * (0.5 + rand(S2, i, j, 2) * 0.4), tt = f * (m.life * 0.18 + 0.5), g = 1 - f;
      const x = fx + Math.cos(m.a + da) * sp * tt, y = fy + Math.sin(m.a + da) * sp * tt;
      if (g <= 0) continue;
      q.line(x - Math.cos(m.a + da) * 5 * g, y - Math.sin(m.a + da) * 5 * g, x, y, C[3], g);
      q.px(x, y, g > 0.5 ? WHITE : C[4]);
      q.glow(x, y, 5, C[3], 0.35 * g);
    }
  }

  // vendor/pixelfx/fx/transitions/iris.js
  var iris_exports = {};
  __export(iris_exports, {
    create: () => create,
    meta: () => meta13
  });

  // vendor/pixelfx/fx/transitions/_lib.js
  var W4 = 320;
  var H2 = 180;
  function screenMeta({ name, desc, tags, duration, options }) {
    return {
      name,
      desc,
      tags: ["transition", "screen", ...tags, "one-shot"],
      size: [W4, H2],
      origin: [0, 0],
      duration,
      loop: false,
      fps: 30,
      bg: "sky",
      options: { color: "#0b0a10", seed: 1, ...options }
    };
  }
  var Clipped = class extends Painter {
    inside(sx, sy) {
      const lx = this.fromX(sx + 0.5, sy + 0.5), ly = this.fromY(sx + 0.5, sy + 0.5);
      return lx >= 0 && ly >= 0 && lx < W4 && ly < H2;
    }
    put(sx, sy, c, a) {
      if (this.inside(sx, sy)) super.put(sx, sy, c, a);
    }
    add(sx, sy, c, k) {
      if (this.inside(sx, sy)) super.add(sx, sy, c, k);
    }
    blendPx(sx, sy, c, a) {
      if (this.inside(sx, sy)) super.blendPx(sx, sy, c, a);
    }
  };
  var clips = /* @__PURE__ */ new WeakMap();
  function clipTo(p) {
    let q = clips.get(p);
    if (!q) clips.set(p, q = new Clipped(p.frame));
    q.reset();
    q.tx = p.tx;
    q.ty = p.ty;
    q.fx = p.fx;
    q.cs = p.cs;
    q.sn = p.sn;
    q.fade = p.fade;
    q.lightK = p.lightK;
    q.layer = p.layer;
    return q;
  }
  var unrotated = (p) => p.sn === 0 && p.cs === 1;
  var col0 = (p) => p.fx > 0 ? Math.floor(p.tx + 0.5) : Math.floor(p.tx - 0.5);
  function rect(p, x, y, w, h, c) {
    if (!unrotated(p)) return p.rect(x, y, w, h, c);
    const X0 = Math.round(x), X1 = Math.round(x + w), Y0 = Math.round(y), Y1 = Math.round(y + h), fx = p.fx, b = col0(p);
    for (let yy = Y0; yy < Y1; yy++) {
      const sy = Math.floor(p.ty + yy + 0.5);
      for (let xx = X0; xx < X1; xx++) p.put(b + fx * xx, sy, c, 1);
    }
  }
  function fillConvex(p, pts, c, a = 1) {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) y0 = Math.min(y0, y), y1 = Math.max(y1, y);
    const r0 = Math.max(0, Math.ceil(y0 - 0.5)), r1 = Math.min(H2 - 1, Math.floor(y1 - 0.5)), n = pts.length, fc = typeof c === "function";
    for (let y = r0; y <= r1; y++) {
      const yc = y + 0.5;
      let xl = Infinity, xr = -Infinity;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > yc === yj > yc) continue;
        const x = xi + (yc - yi) * (xj - xi) / (yj - yi);
        if (x < xl) xl = x;
        if (x > xr) xr = x;
      }
      const c0 = Math.max(0, Math.ceil(xl - 0.5)), c1 = Math.min(W4 - 1, Math.floor(xr - 0.5));
      if (unrotated(p)) {
        const fx = p.fx, b = col0(p), sy = Math.floor(p.ty + yc);
        for (let x = c0; x <= c1; x++) {
          const col = fc ? c(x + 0.5, yc) : c;
          if (col) p.put(b + fx * x, sy, col, a);
        }
      } else
        for (let x = c0; x <= c1; x++) {
          const col = fc ? c(x + 0.5, yc) : c;
          if (col) p.dot(x, y, col, a);
        }
    }
  }
  function halfPlane(pts, cx, cy, nx, ny) {
    const out = [], side = ([x, y]) => (x - cx) * nx + (y - cy) * ny;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], sa = side(a), sb = side(b);
      if (sa >= 0) out.push(a);
      if (sa >= 0 !== sb >= 0) {
        const k = sa / (sa - sb);
        out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      }
    }
    return out;
  }
  function glint(p, x, y, L, ang, c1, c2, a = 1) {
    if (L < 0.8 || a <= 0) return;
    for (let i = 0; i < 8; i++) {
      const diag = i % 2 === 1, an = ang + i * TAU / 8, len2 = diag ? L * 0.42 : L, ca = Math.cos(an), sa = Math.sin(an);
      for (let d = 0; d <= len2; d += 0.5) {
        const u = d / len2, c = diag ? u < 0.5 ? c1 : c2 : u < 0.3 ? WHITE : u < 0.65 ? c1 : c2;
        p.dot(x + ca * d, y + sa * d, c, a * (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.35));
        if (!diag && u < 0.22 && L > 4) p.dot(x + ca * d - sa, y + sa * d + ca, c1, a), p.dot(x + ca * d + sa, y + sa * d - ca, c1, a);
      }
    }
    p.dot(x, y, WHITE, a);
    p.glow(x, y, 4 + L * 1.4, c1, 0.5 * a);
    p.glow(x, y, 2 + L * 0.5, WHITE, 0.4 * a);
  }

  // vendor/pixelfx/fx/transitions/iris.js
  var meta13 = screenMeta({
    name: "Iris",
    desc: "A lit iris closes onto a warm spotlight where dust drifts, holds as its rim twinkles, snaps shut into a glint, then pops open from a flash with a white-hot rim throwing sparks.",
    tags: ["iris", "circle", "spotlight", "wipe"],
    duration: 2.2,
    options: { palette: ["#1c140c", "#3b2a18", "#6e5233", "#a8875a", "#d9bd8a", "#f3e2bd", "#fff7e8", "#ffffff"], focus: [160, 100], seed: 1 }
  });
  var D13 = meta13.duration;
  var CLOSE = 0.62;
  var SNAP = 0.9;
  var SHUT = 0.99;
  var POP = 1.2;
  var OPEN = 1.75;
  var RS = 24;
  var RW = 5;
  var GLO = 16;
  function create(o) {
    const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed), [fx, fy] = o.focus;
    const R02 = Math.max(...[[0, 0], [W4, 0], [0, H2], [W4, H2]].map(([x, y]) => Math.hypot(x - fx, y - fy))) + RW + 2;
    const ps = new Particles({ rng: R, sparks: [WHITE, C[6], C[5], C[4]] }), lights = new Lights();
    const radius = (t2) => t2 < CLOSE ? RS + (R02 - RS) * (1 - ease.inOutCubic(t2 / CLOSE)) : t2 < SNAP ? RS + Math.sin((t2 - CLOSE) * 22) * 0.8 * (1 - (t2 - CLOSE) / (SNAP - CLOSE)) : t2 < SHUT ? RS * (1 - ease.inCubic((t2 - SNAP) / (SHUT - SNAP))) : t2 < POP ? 0 : R02 * ease.outQuart(clamp((t2 - POP) / (OPEN - POP)));
    let t = 0, shut = false, popped = false, prevR = R02;
    const end = D13 - 0.05;
    return {
      update(dt) {
        t += dt;
        const r = radius(t);
        if (t > CLOSE - 0.25 && t < SNAP && R.chance(0.25)) {
          const a = R.range(0, TAU), d = Math.sqrt(R.next()) * r * 0.9;
          ps.spawn(P.EMBER, fx + Math.cos(a) * d, fy + Math.sin(a) * d, R.range(-6, 6), -R.range(4, 14), R.range(0.4, 0.8), 0, 1);
        }
        if (t > CLOSE - 0.1 && t < SNAP && R.chance(0.3)) {
          const a = R.range(0, TAU);
          ps.spawn(P.STAR, fx + Math.cos(a) * (r + 1), fy + Math.sin(a) * (r + 1), 0, 0, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.4));
        }
        if (!shut && t >= SHUT) {
          shut = true;
          lights.add(fx, fy, 50, C[5], 0.7, 0.3);
        }
        if (!popped && t >= POP) {
          popped = true;
          lights.add(fx, fy, 140, C[5], 0.7, 0.45);
          lights.add(fx, fy, 50, WHITE, 0.9, 0.12);
          for (let i = 0; i < 40; i++) {
            const a = R.range(0, TAU), v = R.range(150, 420);
            ps.spawn(P.SPARK, fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v, R.range(0.2, 0.5));
          }
        }
        if (t > POP && t < OPEN - 0.1) {
          const vr = (r - prevR) / dt;
          for (let k = 0; k < 2; k++) {
            if (!R.chance(0.6)) continue;
            const a = R.range(0, TAU), x = fx + Math.cos(a) * r, y = fy + Math.sin(a) * r;
            if (x < 0 || y < 0 || x >= W4 || y >= H2) continue;
            ps.spawn(P.MOTE, x, y, Math.cos(a) * vr * 0.35, Math.sin(a) * vr * 0.35, Math.min(R.range(0.2, 0.45), end - t), R.chance(0.5) ? C[6] : C[5], 0.7);
          }
        }
        prevR = r;
        ps.update(dt);
        lights.update(dt);
      },
      draw(p0) {
        const p = clipTo(p0), r = radius(t);
        const hot = t >= POP ? 1 - smooth(POP, OPEN, t) : t < SNAP ? 0.45 + 0.25 * smooth(CLOSE - 0.2, CLOSE, t) : 0.7;
        const rw = RW + (t >= POP ? 3 * hot : 0);
        if (t < OPEN + 0.05 && !(t >= SHUT && t < POP && r <= 0)) {
          for (let y = 0; y < H2; y++) {
            const dy = y + 0.5 - fy, xo = Math.sqrt(Math.max(0, (r + rw) ** 2 - dy * dy)), xi = Math.abs(dy) < r ? Math.sqrt(r * r - dy * dy) : 0;
            if (xo <= 0) {
              rect(p0, 0, y, W4, 1, ink);
              continue;
            }
            const a0 = clamp(Math.floor(fx - xo), 0, W4), b1 = clamp(Math.ceil(fx + xo), 0, W4);
            if (a0 > 0) rect(p0, 0, y, a0, 1, ink);
            if (b1 < W4) rect(p0, b1, y, W4 - b1, 1, ink);
            const g = r > GLO ? Math.sqrt(Math.max(0, (r - GLO) ** 2 - dy * dy)) : 0;
            for (let x = a0; x < b1; x++) {
              const dx = x + 0.5 - fx;
              if (Math.abs(dx) < g) continue;
              const d = Math.hypot(dx, dy) - r;
              if (d >= 0) {
                const q = d / rw, lit = 0.5 - 0.5 * (dx * 0.7 + dy * 0.7) / (r + d + 0.01), h = hot * (0.55 + 0.6 * lit);
                p0.px(x, y, q >= 1 ? ink : q < 0.2 ? h > 0.5 ? WHITE : h > 0.3 ? C[6] : C[5] : q < 0.4 ? h > 0.38 ? C[6] : C[5] : q < 0.65 ? h > 0.3 ? C[5] : C[4] : q < 0.85 ? C[3] : C[2]);
                if (q < 0.5) p0.light(x, y, C[5], 0.45 * h * (1 - q * 2));
              } else if (d > -GLO) p0.light(x, y, C[5], (0.18 + 0.3 * hot) * (1 + d / GLO) ** 2);
            }
          }
        } else if (t >= SHUT && t < POP) rect(p0, 0, 0, W4, H2, ink);
        if (r > 0 && r < 80 && t < SHUT) {
          const k = 1 - r / 80;
          p.glow(fx, fy, r * 1.15 + 6, C[5], 0.18 + 0.32 * k);
          p.glow(fx, fy, r * 0.6 + 3, C[6], 0.25 * k);
        }
        if (t > 0.08 && t < SNAP) {
          const a = -2.4 + (t - 0.08) / (SNAP - 0.08) * TAU, gx = fx + Math.cos(a) * (r + 1), gy = fy + Math.sin(a) * (r + 1);
          if (gx > 2 && gy > 2 && gx < W4 - 2 && gy < H2 - 2) glint(p, gx, gy, 7 + 3 * Math.sin(t * 9), t * 3, C[6], C[5], 0.9);
        }
        const s = t - SHUT;
        if (s > -0.06 && s < 0.22) glint(p, fx, fy, 14 * (1 - Math.abs(s + 0.01) / 0.23), s * 4, C[6], C[5]);
        const u = t - POP;
        if (u >= 0 && u < 0.18) glint(p, fx, fy, 20 * (1 - u / 0.18), 0.4 - u * 3, C[6], C[5]), p.glow(fx, fy, 60, WHITE, 0.6 * (1 - u / 0.18));
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/transitions/diamond-wipe.js
  var diamond_wipe_exports = {};
  __export(diamond_wipe_exports, {
    draw: () => draw13,
    meta: () => meta14
  });
  var meta14 = screenMeta({
    name: "Diamond wipe",
    desc: "A wave of faceted diamonds swells across the screen, rims bright and ridges lit, cooling to black as they lock; then they rise as gems again and shrink away with glints.",
    tags: ["diamond", "lattice", "geometric", "wipe"],
    duration: 2,
    options: { palette: PAL.arcane, seed: 1 }
  });
  var S = 32;
  var HD = S / 2 + 1;
  var GROW = 0.24;
  var IN0 = 0.04;
  var IN1 = 0.66;
  var OUT0 = 1.05;
  var OUT1 = 1.56;
  var cache = /* @__PURE__ */ new Map();
  function lattice(seed) {
    if (cache.has(seed)) return cache.get(seed);
    const out = [];
    for (let j = -1; j <= Math.ceil(H2 / (S / 2)) + 1; j++)
      for (let i = -1; i <= Math.ceil(W4 / S) + 1; i++) {
        const cx = i * S + (j & 1 ? S / 2 : 0), cy = j * S / 2;
        if (cx + HD < 0 || cy + HD < 0 || cx - HD > W4 || cy - HD > H2) continue;
        const u = clamp((cx + 0.45 * cy) / (W4 + 0.45 * H2)), jr = rand(i, j, seed);
        out.push({ cx, cy, tin: IN0 + (IN1 - IN0) * clamp(u + (jr - 0.5) * 0.08), tout: OUT0 + (OUT1 - OUT0) * clamp(u + (rand(i, j, seed + 1) - 0.5) * 0.08), glint: jr < 0.3, spin: rand(i, j, seed + 2) * 3 });
      }
    cache.set(seed, out);
    return out;
  }
  function draw13(p0, t, o) {
    const C = fit(o.palette, 8), ink = hex(o.color), p = clipTo(p0), L = lattice(o.seed), glints = [];
    const FACE = [[C[2], C[1], C[0]], [C[1], C[0], C[0]], [C[1], C[0], C[0]], [C[0], C[0], ink]];
    for (const d of L) {
      const ki = (t - d.tin) / GROW, ko = (t - d.tout) / GROW;
      if (d.glint && ko > 0.7 && ko < 1.5) glints.push([d, (ko - 0.7) / 0.8, 0]);
      if (ki <= 0 || ko >= 1) continue;
      const hd = HD * (ko > 0 ? 1 - ease.inBack(ko, 2) : ease.outBack(Math.min(1, ki), 2.2));
      const heat2 = ko > 0 ? smooth(0, 0.35, ko) : 1 - smooth(0.45, 1.25, ki);
      if (hd < 0.5) continue;
      const settled = heat2 <= 0;
      const y0 = Math.max(0, Math.floor(d.cy - hd)), y1 = Math.min(H2 - 1, Math.ceil(d.cy + hd));
      for (let y = y0; y <= y1; y++) {
        const dy = y + 0.5 - d.cy, w = hd - Math.abs(dy);
        if (w <= 0) continue;
        const x0 = Math.max(0, Math.ceil(d.cx - w - 0.5)), x1 = Math.min(W4 - 1, Math.floor(d.cx + w - 0.5));
        if (x1 < x0) continue;
        if (settled) {
          rect(p0, x0, y, x1 - x0 + 1, 1, ink);
          continue;
        }
        const st = heat2 > 0.66 ? 0 : heat2 > 0.33 ? 1 : 2;
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - d.cx, e = hd - Math.abs(dx) - Math.abs(dy);
          const q = (dy < 0 ? 0 : 2) + (dx < 0 ? 0 : 1), vr = dx > -1 && dx <= 0, hr = dy > -1 && dy <= 0;
          let c;
          if (e < 1) {
            const r = [heat2 > 0.5 ? WHITE : C[6], heat2 > 0.5 ? C[6] : C[5], heat2 > 0.5 ? C[5] : C[4], heat2 > 0.5 ? C[4] : C[3]][q];
            c = heat2 > 0.15 ? r : ink;
            if (heat2 > 0.15) p0.light(x, y, C[5], 0.4 * heat2 * (q === 0 ? 1 : 0.6));
          } else if (e < 2 && q === 0 && heat2 > 0.4) c = C[5];
          else if ((vr || hr) && heat2 > 0.3) {
            const tip = vr && dy < -hd + 4, sheen = Math.abs(((x + y - t * 260) % 90 + 90) % 90 - 45) < 3;
            c = tip || sheen && heat2 > 0.5 ? WHITE : vr && dy < 0 ? heat2 > 0.6 ? C[6] : C[5] : heat2 > 0.6 ? C[3] : C[2];
          } else c = heat2 > 0.15 ? FACE[q][st] : ink;
          p0.px(x, y, c);
        }
      }
      if (!settled) p.glow(d.cx, d.cy, hd + 6, C[4], 0.22 * heat2);
      if (ki > 0.6 && ki < 1.8 && d.glint) glints.push([d, (ki - 0.6) / 1.2, hd]);
    }
    for (const [d, u, hd] of glints) {
      if (u <= 0 || u >= 1) continue;
      const y = hd ? d.cy - hd : d.cy;
      glint(p, d.cx, y, 9 * Math.pow(Math.sin(Math.PI * u), 0.7), d.spin + u * 1.5, C[6], C[5]);
    }
  }

  // vendor/pixelfx/fx/transitions/slash-wipe.js
  var slash_wipe_exports = {};
  __export(slash_wipe_exports, {
    create: () => create2,
    meta: () => meta15
  });
  var meta15 = screenMeta({
    name: "Slash wipe",
    desc: "A white-hot blade edge slices across the screen, light ahead of it and sparks spraying back over the cover; a second cut flashes through and the cover splits apart.",
    tags: ["slash", "blade", "cut", "sparks", "wipe"],
    duration: 1.7,
    options: {
      palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8c9e8", "#e8f1ff", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      seed: 2
    }
  });
  var D14 = meta15.duration;
  var SL = 0.55;
  var CS = 1 / Math.hypot(1, SL);
  var HALO = 18;
  var T0 = 0.06;
  var SWEEP = 0.62;
  var E0 = -(H2 / 2) * SL - 4;
  var E1 = W4 + H2 / 2 * SL + 24;
  var CUT = 0.84;
  var CSW = 0.07;
  var CHOLD = 0.05;
  var CTRAIL = 0.12;
  var SLIP = CUT + 0.12;
  var SPLIT = CUT + CSW + CHOLD + CTRAIL;
  var edgeAt = (t) => E0 + (E1 - E0) * ease.outCubic(clamp((t - T0) / SWEEP));
  var speedAt = (t) => t < T0 || t > T0 + SWEEP ? 0 : (E1 - E0) * 3 * (1 - (t - T0) / SWEEP) ** 2 / SWEEP;
  var xAt = (e, y) => e + (H2 / 2 - y) * SL;
  function create2(o) {
    const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed), n = C.length;
    const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
    const th = R.range(0.42, 0.56), ux = Math.cos(th), uy = Math.sin(th), nx = uy, ny = -ux;
    const cx = W4 / 2 + R.range(-24, 24), cy = H2 / 2 + R.range(-10, 10);
    const area = [[-24, -24], [W4 + 24, -24], [W4 + 24, H2 + 24], [-24, H2 + 24]];
    const ends = [-1, 1].map((s) => {
      let lo = 0, hi = 400;
      for (let k = 0; k < 30; k++) {
        const m = (lo + hi) / 2, x = cx + s * ux * m, y = cy + s * uy * m;
        if (x >= 0 && x <= W4 && y >= 0 && y <= H2) lo = m;
        else hi = m;
      }
      return [cx + s * ux * lo, cy + s * uy * lo];
    });
    const [A, B2] = ends, LC = Math.hypot(B2[0] - A[0], B2[1] - A[1]);
    const halves = [1, -1].map((s) => {
      const pts = halfPlane(area, cx, cy, s * nx, s * ny);
      let mx = 0, my = 0;
      for (const [x, y] of pts) mx += x / pts.length, my += y / pts.length;
      return { s, pts, mx, my, spin: s * R.range(0.5, 0.9) };
    });
    let t = 0, acc = 0, entered = false, tipped = false, split = false;
    const end = D14 - 0.05;
    const placeOf = (hf) => {
      const slip = 5 * ease.outCubic(clamp((t - SLIP) / 0.12)) * (hf.s > 0 ? 1 : -0.4), u = Math.max(0, t - SPLIT);
      const sep = 30 * u + 0.5 * 1500 * u * u, rot = hf.spin * u * u;
      return { dx: ux * slip + hf.s * nx * sep, dy: uy * slip + hf.s * ny * sep, rot, sep };
    };
    const moved = (hf, pl, [x, y]) => {
      const c = Math.cos(pl.rot), s = Math.sin(pl.rot), lx = x - hf.mx, ly = y - hf.my;
      return [hf.mx + lx * c - ly * s + pl.dx, hf.my + lx * s + ly * c + pl.dy];
    };
    return {
      update(dt) {
        t += dt;
        const sp = speedAt(t), e = edgeAt(t);
        if (!entered && t >= T0) {
          entered = true;
          lights.add(4, 4, 60, C[5], 0.6, 0.25);
        }
        for (acc += sp * dt * 0.035; acc > 1; acc--) {
          const y = R.range(4, H2 - 4), x = xAt(e, y) - 1, a0 = Math.PI + R.range(-0.1, 0.6), n2 = R.int(5, 10);
          if (x < 0 || x >= W4) continue;
          for (let i = 0; i < n2; i++) {
            const a = a0 + R.range(-0.75, 0.75), v = R.range(0.2, 1) * (140 + 0.22 * sp);
            ps.spawn(P.SPARK, x, y + R.range(-2, 2), Math.cos(a) * v, Math.sin(a) * v, R.range(0.15, 0.4));
            if (R.chance(0.4)) ps.spawn(P.MOTE, x, y, Math.cos(a) * v * 0.45, Math.sin(a) * v * 0.45 - 20, R.range(0.2, 0.5), R.chance(0.5) ? C[6] : C[5], 0.7);
          }
          lights.add(x, y, R.range(30, 46), C[5], 0.35, 0.14);
        }
        if (!tipped && t >= CUT + CSW) {
          tipped = true;
          for (let i = 0; i < 12; i++) {
            const a = Math.atan2(uy, ux) + R.range(-0.5, 0.5), v = R.range(150, 400);
            ps.spawn(P.SPARK, B2[0] - ux * 2, B2[1] - uy * 2, Math.cos(a) * v, Math.sin(a) * v, R.range(0.12, 0.35));
          }
          for (let i = 0; i < 18; i++) {
            const k = R.range(0.1, 1), x = A[0] + (B2[0] - A[0]) * k, y = A[1] + (B2[1] - A[1]) * k, s = R.sign(), v = R.range(30, 100);
            ps.spawn(P.MOTE, x, y, s * nx * v + ux * 20, s * ny * v - 10, R.range(0.25, 0.55), R.chance(0.5) ? C[5] : C[4], 0.6);
          }
          for (let i = 0; i < 5; i++) lights.add(A[0] + (B2[0] - A[0]) * (i + 0.5) / 5, A[1] + (B2[1] - A[1]) * (i + 0.5) / 5, 46, C[5], 0.45, 0.3);
        }
        if (!split && t >= SPLIT) {
          split = true;
          for (let i = 0; i < 46; i++) {
            const k = R.range(0, 1), x = A[0] + (B2[0] - A[0]) * k, y = A[1] + (B2[1] - A[1]) * k, s = R.sign(), v = R.range(80, 320);
            const a = Math.atan2(s * ny, s * nx) + R.range(-0.7, 0.7);
            ps.spawn(P.SPARK, x, y, Math.cos(a) * v, Math.sin(a) * v, Math.min(R.range(0.15, 0.45), end - t));
          }
          for (let i = 0; i < 6; i++) lights.add(A[0] + (B2[0] - A[0]) * (i + 0.5) / 6, A[1] + (B2[1] - A[1]) * (i + 0.5) / 6, 56, C[5], 0.5, 0.35);
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p0) {
        const p = clipTo(p0);
        if (t < CUT + CSW + CHOLD + 0.02 || t < SLIP) {
          const e = edgeAt(t), sp = speedAt(t), Ls = clamp(sp * 65e-4, 1.5, 8), echo = clamp(sp / 900) * 0.6;
          for (let y = 0; y < H2; y++) {
            const xe = xAt(e, y + 0.5), ia = clamp(Math.floor(xe - (Ls + 10) / CS), 0, W4), ib = clamp(Math.ceil(xe + HALO / CS), 0, W4);
            if (ia > 0) rect(p0, 0, y, ia, 1, ink);
            for (let x = ia; x < ib; x++) {
              const d = (xe - (x + 0.5)) * CS;
              if (d < 0) {
                const u2 = 1 + d / HALO;
                p0.light(x, y, C[5], 0.32 * u2 * u2);
                if (d > -4) p0.light(x, y, WHITE, 0.3 * (1 + d / 4) ** 2);
                continue;
              }
              if (d < 1) p0.px(x, y, WHITE);
              else if (d < 2) p0.px(x, y, C[6]);
              else {
                const q = (d - 2) / Ls;
                p0.px(x, y, q < 0.3 ? C[5] : q < 0.55 ? C[4] : q < 0.8 ? C[3] : q < 1 ? C[2] : ink);
                if (echo > 0 && Math.abs(d - Ls - 7) < 0.5 && (x + y) % 3 === 0) p0.dot(x, y, C[4], echo);
              }
              if (d < Ls + 2) p0.light(x, y, C[5], 0.3 * (1 - d / (Ls + 2)));
            }
          }
        }
        if (t >= SLIP) {
          const heat2 = 1 - clamp((t - CUT - 0.05) / 0.5);
          for (const hf of halves) {
            const pl = placeOf(hf), pts = hf.pts.map((q) => moved(hf, pl, q)), a = moved(hf, pl, A), b = moved(hf, pl, B2);
            const c = Math.cos(pl.rot), sn = Math.sin(pl.rot), mx = hf.s * (nx * c - ny * sn), my = hf.s * (nx * sn + ny * c);
            const rim = [heat2 > 0.55 ? WHITE : heat2 > 0.25 ? C[6] : C[5], heat2 > 0.4 ? C[6] : C[4], heat2 > 0.3 ? C[5] : C[3], heat2 > 0.3 ? C[4] : ink];
            const deep = clamp(1 + pl.sep * 0.5, 1, 4);
            fillConvex(p0, pts, (x, y) => {
              const d = (x - a[0]) * mx + (y - a[1]) * my;
              if (d < deep) {
                if (d < 2) p0.light(x, y, C[5], 0.4 * heat2 * (1 - d / 2));
                return rim[Math.max(0, Math.floor(d))];
              }
              return ink;
            });
            if (heat2 > 0)
              for (let i = 0; i < 8; i++) {
                const k = (i + 0.5) / 8;
                p.glow(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 12 + pl.sep * 0.15, C[5], 0.3 * heat2);
              }
          }
        }
        const u = t - CUT;
        if (u >= 0 && u < CSW + CHOLD + CTRAIL + 0.25) {
          const head4 = LC * ease.outExpo(clamp(u / CSW)), tail = LC * smooth(CSW + CHOLD, CSW + CHOLD + CTRAIL, u), age = clamp(u / (CSW + CHOLD + CTRAIL));
          const Wc = 3.6 * (1 - tail / LC * 0.55), span = head4 - tail, sn = Math.abs(nx);
          if (span > 1 && tail < LC - 1 && t < SPLIT)
            for (let y = 0; y < H2; y++) {
              const x0 = A[0] + (y + 0.5 - A[1]) * ux / uy, hw = (Wc + 1) / sn;
              for (let x = Math.max(0, Math.floor(x0 - hw)); x < Math.min(W4, Math.ceil(x0 + hw)); x++) {
                const px = x + 0.5 - A[0], py = y + 0.5 - A[1], s = px * ux + py * uy, v = (s - tail) / span;
                if (v < 0 || v > 1) continue;
                const w = Wc * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
                if (w < 0.35) continue;
                const q = Math.abs(px * nx + py * ny) / w;
                if (q > 1) continue;
                const ci = q < 0.34 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
                p0.dot(x, y, C[n - 1 - clamp(ci, 0, n - 1)], Math.min(1, v / 0.4));
                if (q < 0.5) p0.light(x, y, C[5], 0.4 * (1 - age));
              }
            }
          if (tail > 2 && t < SPLIT)
            for (let s = 0; s < tail; s += 1.6) p.dot(A[0] + ux * s, A[1] + uy * s, C[5], 0.7 * (0.4 + 0.6 * s / LC));
          if (u < 0.3) {
            const hx = A[0] + ux * head4, hy = A[1] + uy * head4;
            p.glow(hx, hy, 46, C[4], 0.55 * (1 - u / 0.3));
          }
          const g = u - CSW * 0.6;
          if (g > 0 && g < 0.24) sparkle(p, B2[0] - ux * 3, B2[1] - uy * 3, 11 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.24), C[6], C[4], 0.7);
        }
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/transitions/pixel-dissolve.js
  var pixel_dissolve_exports = {};
  __export(pixel_dissolve_exports, {
    draw: () => draw14,
    meta: () => meta16
  });
  var meta16 = screenMeta({
    name: "Pixel dissolve",
    desc: "Clumps of blocks wink in, each drawn in a white outline that fills black and cools, with glints; then they wink out, outlines collapsing, the last small ones sparkling away.",
    tags: ["dissolve", "pixel", "blocks", "glint"],
    duration: 2.2,
    options: { palette: PAL.neon, seed: 1 }
  });
  var P3 = 0.17;
  var IN02 = 0.04;
  var IN12 = 0.8;
  var OUT02 = 1.12;
  var OUT12 = 1.85;
  var CELL = 20;
  var cache2 = /* @__PURE__ */ new Map();
  function layout(seed) {
    if (cache2.has(seed)) return cache2.get(seed);
    const blocks = [];
    for (let cy = 0; cy < H2 / CELL; cy++)
      for (let cx = 0; cx < W4 / CELL; cx++) {
        const h = rand(cx, cy, seed), n = h < 0.32 ? 1 : h < 0.74 ? 2 : 4, s = CELL / n;
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) blocks.push({ x: cx * CELL + i * s, y: cy * CELL + j * s, s });
      }
    const rank = (key) => {
      const v = blocks.map(key), out = new Float32Array(v.length);
      v.map((_, i) => i).sort((a, b) => v[a] - v[b]).forEach((i, k) => out[i] = k / (v.length - 1));
      return out;
    };
    const at2 = (b, sd) => fbm((b.x + b.s / 2) / 64, (b.y + b.s / 2) / 64, sd, 3);
    const uin = rank((b) => at2(b, seed) + 0.22 * rand(b.x, b.y, seed + 1) + (b.s === 20 ? 0.12 : b.s === 5 ? -0.08 : 0));
    const uout = rank((b) => at2(b, seed + 7) + 0.22 * rand(b.x, b.y, seed + 2) + (b.s === 20 ? -0.14 : b.s === 5 ? 0.1 : 0));
    blocks.forEach((b, i) => {
      b.tin = IN02 + uin[i] * (IN12 - IN02);
      b.tout = OUT02 + uout[i] * (OUT12 - OUT02);
      b.glint = rand(b.x, b.y, seed + 3) < (b.s >= 10 ? 0.32 : 0.1);
      b.gx = b.x + (rand(b.x, b.y, seed + 4) < 0.5 ? 0 : b.s);
      b.gy = b.y + (rand(b.x, b.y, seed + 5) < 0.5 ? 0 : b.s);
      b.spin = (rand(b.x, b.y, seed + 6) - 0.5) * 3;
      b.L = b.s === 20 && rand(b.x, b.y, seed + 8) < 0.45 ? 9 + 6 * rand(b.x, b.y, seed + 9) : 2.5 + b.s * 0.32;
    });
    cache2.set(seed, blocks);
    return blocks;
  }
  function mote(p, x, y, c, cross2) {
    p.px(x, y, c);
    if (cross2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, c);
  }
  function square(p, x, y, s, fill, rim) {
    const X = Math.round(x), Y = Math.round(y), S2 = Math.max(1, Math.round(s));
    if (fill) rect(p, X, Y, S2, S2, fill);
    if (rim && S2 > 2) rect(p, X, Y, S2, 1, rim), rect(p, X, Y + S2 - 1, S2, 1, rim), rect(p, X, Y, 1, S2, rim), rect(p, X + S2 - 1, Y, 1, S2, rim);
  }
  function draw14(p0, t, o) {
    const C = fit(o.palette, 8), ink = hex(o.color), p = clipTo(p0), blocks = layout(o.seed), glints = [], frame2 = Math.floor(t * 15);
    for (let n = 0; n < blocks.length; n++) {
      const b = blocks[n], ki = (t - b.tin) / P3, ko = (t - b.tout) / P3, { x, y, s } = b, cx = x + s / 2, cy = y + s / 2;
      if (ki < 0 || ko >= 1.6) continue;
      if (ko < 0) {
        if (ki >= 1) square(p0, x, y, s, ink);
        else {
          const g = ki < 0.35 ? 0.35 + 0.65 * ease.outBack(ki / 0.35) : 1, h = s * g;
          const rim = ki < 0.45 ? WHITE : ki < 0.6 ? C[6] : ki < 0.75 ? C[5] : ki < 0.9 ? C[4] : C[3];
          square(p, cx - h / 2, cy - h / 2, h, ki > 0.2 ? ink : 0, rim);
          if (ki < 0.3 && s >= 10) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(cx - 0.5 + dx, cy - 0.5 + dy, dx || dy ? C[6] : WHITE);
          p.glow(cx, cy, s * 0.8 + 4, C[5], 0.45 * (1 - ki));
        }
        if (b.glint && ki > 0.15 && ki < 1.6) glints.push([b, (ki - 0.15) / 1.45, 1]);
        if (ki < 1.4 && rand(frame2, n, 9) < 0.35) mote(p, x + rand(frame2, n, 10) * (s + 6) - 3, y + rand(frame2, n, 11) * (s + 6) - 3, rand(frame2, n, 12) < 0.5 ? WHITE : C[6], rand(frame2, n, 17) < 0.25);
      } else {
        if (ko < 0.35) {
          const q = ko / 0.35;
          square(p0, x, y, s, ink, q < 0.4 ? C[4] : q < 0.75 ? C[5] : C[6]);
          p.glow(cx, cy, s * 0.8 + 3, C[4], 0.35 * q);
        } else if (ko < 0.75) {
          const q = (ko - 0.35) / 0.4, h = s * (1 - ease.inQuad(q) * 0.85);
          square(p, cx - h / 2, cy - h / 2, h, 0, q < 0.5 ? WHITE : C[6]);
          p.glow(cx, cy, s * 0.8 + 4, C[5], 0.45 * (1 - q * 0.5));
        } else if (ko < 1) {
          const q = (ko - 0.75) / 0.25;
          for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (!(dx || dy) || q < 0.5) p.px(cx - 0.5 + dx, cy - 0.5 + dy, dx || dy ? C[6] : WHITE);
          p.glow(cx, cy, s * 0.5 + 3, C[5], 0.35 * (1 - q));
        }
        if (b.glint && ko > 0.3) glints.push([b, (ko - 0.3) / 1.3, -1]);
        if (ko > 0.3 && ko < 1.5 && rand(frame2, n, 13) < 0.3) mote(p, x + rand(frame2, n, 14) * (s + 6) - 3, y + rand(frame2, n, 15) * (s + 6) - 3, rand(frame2, n, 16) < 0.5 ? WHITE : C[6], rand(frame2, n, 18) < 0.25);
      }
    }
    for (const [b, u, dir] of glints) {
      if (u <= 0 || u >= 1) continue;
      const L = b.L * Math.pow(Math.sin(Math.PI * u), 0.7);
      glint(p, b.gx, b.gy, L, b.spin * u * dir + 0.4, C[5], C[4]);
      if (b.L > 8) p.glow(b.gx, b.gy, 18 + L, C[5], 0.25 * Math.sin(Math.PI * u));
    }
  }

  // vendor/pixelfx/fx/transitions/blinds.js
  var blinds_exports = {};
  __export(blinds_exports, {
    create: () => create3,
    meta: () => meta17
  });
  var meta17 = screenMeta({
    name: "Blinds",
    desc: "Slats catch the light edge-on, then tilt shut top to bottom, lit rims glinting as warm light squeezes through the closing gaps with dust in it; then they tilt open and fade.",
    tags: ["blinds", "slats", "light", "wipe"],
    duration: 2,
    options: { palette: ["#1a120c", "#33241a", "#5a4030", "#8a6848", "#c09a6a", "#e8cc98", "#fff0cc", "#ffffff"], seed: 1 }
  });
  var N = 12;
  var SH = H2 / N;
  var SHUT0 = 0.08;
  var OPEN0 = 1.02;
  var STEP = 0.038;
  var TURN = 0.42;
  var OSTEP = 0.03;
  var OTURN = 0.4;
  var FADE0 = 1.72;
  var FADE1 = 1.94;
  function angle(i, t) {
    if (t < OPEN0) return Math.PI / 2 * ease.outBack(clamp((t - SHUT0 - i * STEP) / TURN), 1.6);
    return Math.PI / 2 * (1 - ease.inOutCubic(clamp((t - OPEN0 - i * OSTEP) / OTURN)));
  }
  function create3(o) {
    const C = fit(o.palette, 8), ink = hex(o.color), R = new Rng(o.seed);
    const ps = new Particles({ rng: R, sparks: [WHITE, C[6], C[5], C[4]] });
    let t = 0;
    const end = meta17.duration - 0.05;
    return {
      update(dt) {
        t += dt;
        if (t < FADE0 && R.chance(0.8)) {
          const i = R.int(0, N - 1), th = angle(i, t);
          if (th > 0.2 && th < 1.45) ps.spawn(P.EMBER, R.range(0, W4), (i + 1) * SH + R.range(-2, 2), R.range(-8, 8), -R.range(2, 8), Math.min(R.range(0.5, 1), end - t), 0, 1);
        }
        ps.update(dt);
      },
      draw(p0) {
        const p = clipTo(p0), open = new Uint8Array(H2).fill(1);
        for (let i = 0; i < N; i++) {
          const h = Math.max(1, (SH + 1) * Math.abs(Math.sin(angle(i, t)))), yc = (i + 0.5) * SH;
          for (let y = Math.max(0, Math.ceil(yc - h / 2 - 0.5)); y <= Math.min(H2 - 1, Math.floor(yc + h / 2 - 0.5)); y++) open[y] = 0;
        }
        for (const q of ps.list) {
          const y = Math.floor(q.y), k = q.life / q.max;
          if (q.delay > 0 || y < 0 || y >= H2 || !open[y] || q.x < 0 || q.x >= W4) continue;
          const tw = q.seed % 1 < 0.3 && Math.sin(t * 14 + q.seed) > 0;
          p0.px(q.x, y, tw || k > 0.5 ? WHITE : C[5]);
          if (tw) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open[y + dy]) p.px(q.x + dx, y + dy, C[6]);
          }
          p0.light(q.x, y, C[6], (tw ? 0.7 : 0.4) * k);
        }
        const fade = 1 - clamp((t - FADE0) / (FADE1 - FADE0)), appear = clamp(t / SHUT0);
        for (let i = 0; i < N; i++) {
          const th = angle(i, t), s = Math.sin(th), c = Math.cos(th), yc = (i + 0.5) * SH;
          const h = Math.max(1, (SH + 1) * Math.abs(s)), y0 = Math.max(0, Math.ceil(yc - h / 2 - 0.5)), y1 = Math.min(H2 - 1, Math.floor(yc + h / 2 - 0.5));
          const under = th > Math.PI / 2;
          if (h < 2.5) {
            const k = Math.min(appear, fade);
            if (k <= 0) continue;
            const yy = Math.round(yc - 0.5);
            rect(p0, 0, yy, W4, 1, k > 0.66 ? C[6] : k > 0.33 ? C[4] : C[2]);
            if (h >= 1.5 && yy + 1 < H2) rect(p0, 0, yy + 1, W4, 1, k > 0.5 ? C[3] : C[1]);
            for (let x = 0; x < W4; x += 2) p0.light(x, yy, C[5], 0.18 * k);
            continue;
          }
          const lit = under ? 0 : c;
          for (let y = y0; y <= y1; y++) {
            const r = y - y0, last = y === y1, v = r / Math.max(1, y1 - y0), f = lit * (1 - v * 0.8);
            const col = r === 0 ? lit > 0.55 ? WHITE : lit > 0.3 ? C[6] : lit > 0.12 ? C[4] : ink : r === 1 ? lit > 0.45 ? C[5] : lit > 0.2 ? C[3] : ink : last ? ink : f > 0.55 ? C[3] : f > 0.35 ? C[2] : f > 0.15 ? C[1] : ink;
            rect(p0, 0, y, W4, 1, col);
            if (r === 0 && lit > 0.12) for (let x = 0; x < W4; x += 2) p0.light(x, y, C[5], 0.35 * lit);
          }
          const gap = SH - h;
          if (gap > 0.5 && th > 0.12 && !under) {
            const k = (0.2 + 0.45 * (1 - gap / SH) ** 1.5) * Math.min(1, th / 0.4), gy = y1 + 1;
            for (let y = gy; y < Math.min(H2, gy + Math.ceil(gap)); y++) {
              const v = (y - gy + 0.5) / gap, kk = k * (1 - Math.abs(v - 0.5) * 1.2);
              if (kk > 0.01) for (let x = 0; x < W4; x += 1) p0.light(x, y, C[6], kk), p0.light(x, y, C[4], kk * 0.5);
            }
          }
          const u = t < OPEN0 ? clamp((t - SHUT0 - i * STEP) / TURN) : clamp((t - OPEN0 - i * OSTEP) / OTURN);
          if (lit > 0.3 && u > 0.05 && u < 0.95) glint(p, W4 * (t < OPEN0 ? u : 1 - u), y0, 6 * Math.sin(Math.PI * u), u * 3, C[6], C[5]);
        }
      }
    };
  }

  // vendor/pixelfx/fx/melee/sword-slash.js
  var sword_slash_exports = {};
  __export(sword_slash_exports, {
    act: () => act,
    create: () => create4,
    meta: () => meta18
  });
  var meta18 = {
    name: "Sword slash",
    desc: "A tilted crescent whips round in two frames, cools from white to deep blue as it trails off, glints at the tip and throws sparks.",
    tags: ["melee", "slash", "sword", "combat", "directional", "one-shot"],
    size: [136, 104],
    origin: [44, 92],
    duration: 0.75,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8c9e8", "#e8f1ff", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      radius: 42,
      seed: 2
    }
  };
  var GUARD = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
  var WIND = { ...GUARD, x: -8, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
  var CUT2 = { ...GUARD, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -10, ghost: 1 };
  var DOWN = { ...GUARD, x: 2, crouch: 5, lean: 5, fx: 20, fy: -21, sa: 0.62, bx: -9, by: -24, ffx: 13, fbx: -10, toeB: true };
  var act = {
    target: { x: 58 },
    poses: [
      [-0.55, { ...GUARD, x: -8 }],
      [-0.3, WIND],
      [-0.08, { ...WIND, crouch: 5, lean: -5 }],
      [0, CUT2, "snap"],
      [0.06, DOWN, "snap"],
      [0.3, { ...DOWN, x: 3, crouch: 6 }],
      [0.58, { ...GUARD, x: 1, crouch: 3, fx: 15, fy: -21, sa: 0.1, bx: -5, by: -21, ffx: 9, fbx: -7 }],
      [0.86, { ...GUARD, x: -8 }]
    ],
    hits: [{ t: 0.06, stop: 0.14, shake: 0.18, amp: 2, push: 2.8, straw: 18 }],
    dust: [{ t: 0.06, x: 16, n: 7, dir: 1 }, { t: 0.06, x: -11, n: 4, dir: -1 }]
  };
  function onArc(s, r, a) {
    const lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy, c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function crescent(p, s, ta, L, W6, age) {
    if (Math.abs(L) < 0.02 || W6 < 0.3) return;
    const R = s.ramp, n = R.length, dir = Math.sign(L), span = Math.abs(L), c = Math.cos(s.rot), sn = Math.sin(s.rot), B2 = s.R + 2;
    p.shade(s.cx - B2, s.cy - B2, s.cx + B2, s.cy + B2, (x, y, out) => {
      const dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * sn, ly = (-dx * sn + dy * c) / s.sy, r = Math.hypot(lx, ly);
      if (r > s.R + 0.5 || r < s.R - W6 - 1) return;
      let u = dir * (Math.atan2(ly, lx) - ta) % TAU;
      if (u < 0) u += TAU;
      if (u > span) return;
      const v = u / span, w = W6 * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
      if (w < 0.35) return;
      const q = (s.R - r) / w;
      if (q < 0 || q > 1) return;
      const ci = q < 0.22 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
      out.c = R[n - 1 - clamp(ci, 0, n - 1)];
      out.a = Math.min(1, v / 0.4);
    });
    for (let u = 0; u <= span; u += 0.3) {
      const [x, y] = onArc(s, s.R - W6 * 0.4, ta + dir * u);
      p.glow(x, y, 5 + W6, R[n - 3], 0.22 * (1 - age) * (u / span));
    }
  }
  function drawSlash(p, s, t) {
    const u = t - s.t0;
    if (u < 0) return;
    const span = s.a1 - s.a0, head4 = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u);
    const age = clamp(u / (s.sweep + s.hold + s.trail));
    if (tail < 1) crescent(p, s, s.a0 + span * tail, span * (head4 - tail), s.W * (1 - tail * 0.55), age);
    const th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    if (tail > 0.02 && th > 0)
      for (let k = 0; k <= tail; k += 0.6 / (Math.abs(span) * s.R)) {
        const [x, y] = onArc(s, s.R - 0.5, s.a0 + span * k);
        p.dot(x, y, s.ramp[1], th * (0.4 + 0.6 * k));
      }
  }
  function tipOf(s) {
    const [x, y] = onArc(s, s.R - s.W * 0.3, s.a1), [x2, y2] = onArc(s, s.R - s.W * 0.3, s.a1 + Math.sign(s.a1 - s.a0) * 0.05);
    const l = Math.hypot(x2 - x, y2 - y) || 1;
    return { x, y, dx: (x2 - x) / l, dy: (y2 - y) / l };
  }
  function create4(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks });
    const R02 = o.radius, a0 = -2.55, a1 = 0.95;
    const A = { cx: 6, cy: -26, R: R02, sy: 0.6, rot: -0.38, a0, a1, W: 12, t0: 0, sweep: 0.06, hold: 0.06, trail: 0.24, ramp: C };
    const E = { ...A, R: R02 * (33 / 42), W: R02 * (4.5 / 42), a0: a0 + (a1 - a0) * 0.1, a1: a1 - (a1 - a0) * (0.15 / 3.5), t0: 0.017, hold: 0.03, trail: 0.2, ramp: C.slice(0, 6) };
    const tip = tipOf(A);
    let t = 0, landed = false;
    return {
      update(dt) {
        t += dt;
        if (!landed && t >= A.sweep) {
          landed = true;
          for (let i = 0; i < 10; i++) {
            const a = Math.atan2(tip.dy, tip.dx) + Rg.range(-0.5, 0.5), sp = Rg.range(150, 400);
            ps.spawn(P.SPARK, tip.x, tip.y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 16; i++) {
            const a = a0 + (a1 - a0) * Rg.range(0.3, 1), [x, y] = onArc(A, A.R, a);
            const ox = x - A.cx, oy = y - A.cy, l = Math.hypot(ox, oy) || 1, sp = Rg.range(30, 100);
            ps.spawn(P.MOTE, x, y, ox / l * sp, oy / l * sp - 10, Rg.range(0.25, 0.55), C[4 + Rg.int(0, 1)], 0.6);
          }
        }
        ps.update(dt);
      },
      draw(p) {
        drawSlash(p, E, t);
        drawSlash(p, A, t);
        const g = t - A.sweep * 0.6;
        if (g > 0 && g < 0.22) sparkle(p, tip.x, tip.y, 9 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.22), C[5], C[3], 0.6);
        if (t < 0.3) {
          const [x, y] = onArc(A, A.R - 4, A.a0 + (A.a1 - A.a0) * ease.outExpo(clamp(t / A.sweep)));
          p.glow(x, y, 40, C[3], 0.5 * (1 - t / 0.3));
        }
        ps.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/melee/double-slash.js
  var double_slash_exports = {};
  __export(double_slash_exports, {
    act: () => act2,
    create: () => create5,
    meta: () => meta19
  });

  // vendor/pixelfx/fx/melee/_lib.js
  var swing = (o) => ({ cx: 0, cy: 0, R: 30, sy: 1, rot: 0, a0: 0, dir: 1, k: 0, ...o });
  function through(x, y, th, dir, R, span, at2 = 0.55, extra = {}) {
    const a = th - dir * Math.PI / 2;
    return swing({ cx: x - Math.cos(a) * R, cy: y - Math.sin(a) * R, R, sy: 1, rot: 0, a0: a - dir * span * at2, dir, span, ...extra });
  }
  function onSwing(s, r, u) {
    const a = s.a0 + s.dir * u, lx = Math.cos(a) * r, ly = Math.sin(a) * r * s.sy - s.k * (s.R - r), c = Math.cos(s.rot), n = Math.sin(s.rot);
    return [s.cx + lx * c - ly * n, s.cy + lx * n + ly * c];
  }
  function travel(s, u) {
    const [x0, y0] = onSwing(s, s.R, u), [x1, y1] = onSwing(s, s.R, u + 0.01), l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return { x: x0, y: y0, dx: (x1 - x0) / l, dy: (y1 - y0) / l, a: s.a0 + s.dir * u };
  }
  function plane(s, x, y) {
    const c = Math.cos(s.rot), n = Math.sin(s.rot), dx = x - s.cx, dy = y - s.cy, lx = dx * c + dy * n, ly = -dx * n + dy * c;
    if (!s.k) return [Math.hypot(lx, ly / s.sy), Math.atan2(ly / s.sy, lx)];
    const m = ly + s.k * s.R, A = s.sy * s.sy - s.k * s.k, B2 = 2 * m * s.k, Cc = lx * lx * s.sy * s.sy + m * m;
    const r = (-B2 + Math.sqrt(B2 * B2 + 4 * A * Cc)) / (2 * A);
    return [r, Math.atan2((m - s.k * r) / s.sy, lx)];
  }
  function smear(p, s, u0, u1, wMax, fn, half = 0, pad = 1) {
    if (u1 - u0 < 5e-3) return;
    const c = Math.cos(s.rot), n = Math.sin(s.rot), A = s.R + pad + 1, Bn = A * s.sy + s.k * (wMax + 2);
    const hx = Math.hypot(A * c, Bn * n) + 1, hy = Math.hypot(A * n, Bn * c) + 1, rIn = s.R - wMax - 1;
    const over = Math.abs(n) * A + s.k * (wMax + 2) + 2, y0 = half > 0 ? s.cy - over : s.cy - hy, y1 = half < 0 ? s.cy + over : s.cy + hy;
    p.shade(s.cx - hx, y0, s.cx + hx, y1, (x, y, out) => {
      const [r, a] = plane(s, x, y);
      if (r > s.R + pad || r < rIn) return;
      if (half && (Math.sin(a) < 0 ? -1 : 1) !== half) return;
      let u = s.dir * (a - s.a0) % TAU;
      if (u < 0) u += TAU;
      while (u < u0) u += TAU;
      if (u > u1) return;
      return fn(u, r, out, a);
    });
  }
  function trace(p, s, r, u0, u1, c, a, half = 0, step = 0.6) {
    const du = step / Math.max(4, r);
    for (let u = u0; u <= u1; u += du) {
      const g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      const [x, y] = onSwing(s, r, u), k = typeof a === "function" ? a(u) : a;
      if (k > 0) p.dot(x, y, typeof c === "function" ? c(u) : c, k);
    }
  }
  function glowAlong(p, s, r, u0, u1, rad, c, k, half = 0, step = 0.35) {
    for (let u = u0; u <= u1; u += step) {
      const g = s.a0 + s.dir * u;
      if (half && (Math.sin(g) < 0 ? -1 : 1) !== half) continue;
      const [x, y] = onSwing(s, r, u), kk = typeof k === "function" ? k(u) : k;
      if (kk > 4e-3) p.glow(x, y, rad, c, kk);
    }
  }
  function slash(p, s, t, half = 0) {
    var _a;
    const u = t - s.t0;
    if (u < 0) return;
    const R = s.ramp, n = R.length, life = s.sweep + s.hold + s.trail, hot = (_a = s.hot) != null ? _a : 0;
    const head4 = ease.outExpo(clamp(u / s.sweep)), tail = smooth(s.sweep + s.hold, life, u), age = clamp(u / life);
    const U = s.span * head4, T4 = s.span * tail, W6 = s.W * (1 - tail * 0.55);
    if (tail < 1 && U - T4 > 0.01) {
      smear(p, s, T4, U, W6, (uu, r, out) => {
        const v = (uu - T4) / (U - T4), w = W6 * Math.pow(Math.sin(Math.PI * Math.pow(v, s.lens ? 1 : 2.2)), s.lens ? 0.75 : 0.6);
        if (w < 0.35) return;
        const q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        const ci = q < 0.22 && age < 0.5 || q < hot * 0.7 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4 - hot * 3);
        out.c = R[n - 1 - clamp(ci, 0, n - 1)];
        out.a = Math.min(1, v / (s.lens ? 0.1 : 0.4));
      }, half);
      glowAlong(p, s, s.R - W6 * 0.4, T4, U, 5 + W6, R[n - 3], (uu) => (0.22 + hot * 0.3) * (1 - age) * ((uu - T4) / (U - T4)), half, 0.3);
    }
    const th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
    if (tail > 0.02 && th > 0) trace(p, s, s.R - 0.5, 0, T4, R[2], (uu) => th * (0.4 + 0.6 * uu / s.span), half);
  }
  var slashEnd = (s) => travel({ ...s, R: s.R - s.W * 0.3 }, s.span);
  function shavings(ps, R, s, n, colors, from = 0.3) {
    for (let i = 0; i < n; i++) {
      const [x, y] = onSwing(s, s.R, s.span * R.range(from, 1)), ox = x - s.cx, oy = y - s.cy, l = Math.hypot(ox, oy) || 1, sp = R.range(30, 100);
      ps.spawn(P.MOTE, x, y, ox / l * sp, Math.min(25, oy / l * sp) - 10, R.range(0.25, 0.55), R.pick(colors), 0.6);
    }
  }
  function stone(c) {
    c = hex(c);
    return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), dark: scale(c, 0.42) };
  }
  var OUTLINE = hex("#1a1422");
  function rock(p, b, st) {
    const r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      const lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body;
      out.a = fade;
    });
  }
  function cracks(R, x0, n, reach, depth = 7, bias = 0.3) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const side = R.chance(0.5 + bias * 0.5) ? 1 : -1, L = reach * R.range(0.45, 1) * (i < 2 ? 1 : 0.7), pts = [[x0 + side * R.range(0, 1.5), 0]];
      let x = pts[0][0], y = 0;
      while (Math.abs(x - x0) < L && y < depth) {
        x += side * R.range(1.5, 3.5);
        y = Math.min(depth, Math.max(0, y + R.range(-0.6, 1.6) * (Math.abs(x - x0) > 3 ? 1 : 0.3)));
        pts.push([Math.round(x), Math.round(y)]);
        if (R.chance(0.18) && pts.length > 3 && y < depth - 2) {
          const f = [[Math.round(x), Math.round(y)]];
          let fx = x, fy = y;
          for (let j = R.int(1, 3); j > 0; j--) fx += side * R.range(1, 3), fy += R.range(0.8, 2), f.push([Math.round(fx), Math.round(Math.min(depth + 1, fy))]);
          out.push({ pts: f, at: Math.abs(x - x0) / reach, fork: true });
        }
      }
      out.push({ pts, at: 0, fork: false });
    }
    return out;
  }
  function star(p, x, y, spikes2, sc, th, core, body, inner, rim) {
    for (const pass2 of [0, 1, 2])
      for (const s of spikes2) {
        const c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L; d += 0.5) {
          const hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3), hw = pass2 === 0 ? hw0 + 0.8 : pass2 === 1 ? hw0 : hw0 * 0.45;
          if (pass2 === 2 && d > L * 0.55) break;
          for (let o = -hw; o <= hw; o += 0.5) p.px(x + c * d - sn * o, y + sn * d + c * o, pass2 === 0 ? rim : pass2 === 1 ? d < L * 0.35 ? inner : body : core);
        }
      }
    const r = 2.4 * sc * Math.sqrt(th);
    p.circle(x, y, r + 0.8, inner);
    p.circle(x, y, r, core);
  }
  function sliver(p, x, y, a, r, arc, c, k) {
    const n = Math.ceil(r * arc * 2.2);
    for (let j = 0; j <= n; j++) {
      const u = j / n - 0.5, th = a + u * arc, w = 1.4 * (1 - Math.abs(u) * 2);
      for (let o = -w * 0.5; o <= w * 0.5 + 0.01; o += 0.5) p.dot(x + Math.cos(th) * (r + o), y + Math.sin(th) * (r + o), c, k);
    }
  }
  function along(pts, len2, fn) {
    let d = 0;
    for (let i = 1; i < pts.length && d < len2; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0), f = Math.min(1, (len2 - d) / l);
      fn(x0, y0, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, d);
      d += l;
    }
  }

  // vendor/pixelfx/fx/melee/double-slash.js
  var meta19 = {
    name: "Double slash",
    desc: "A down cut, then an up cut that crosses it: the moment the X closes both strokes flash white, the crossing bursts with light and sparks, and a dotted X lingers.",
    tags: ["melee", "slash", "combo", "sword", "cross", "combat", "directional", "one-shot"],
    size: [164, 108],
    origin: [44, 92],
    duration: 0.8,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0a22", "#5e1238", "#a01f4e", "#e0386a", "#ff86a6", "#ffd2dd", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      seed: 6
    }
  };
  var STANCE = { ...READY, weapon: "sword", fx: 12, fy: -21, sa: -0.85 };
  var HIGH = { ...STANCE, x: -7, crouch: 4, lean: -4, fx: -7, fy: -35, sa: -2.65, bx: 9, by: -25, armsFront: true, ffx: 9, fbx: -8 };
  var LOW = { ...STANCE, x: 3, crouch: 6, lean: 6, fx: 22, fy: -20, sa: 0.62, bx: -8, by: -24, ffx: 13, fbx: -10, toeB: true };
  var act2 = {
    target: { x: 62 },
    poses: [
      [-0.42, { ...STANCE, x: -7 }],
      [-0.18, HIGH],
      [-0.04, { ...HIGH, crouch: 5 }],
      [0, { ...STANCE, x: 0, crouch: 2, lean: 3, fx: 16, fy: -37, sa: -1.45, bx: -7, by: -24, ffx: 11, fbx: -9, ghost: 1 }, "snap"],
      [0.06, LOW, "snap"],
      [0.14, { ...LOW, x: 4, crouch: 6, lean: 5, fx: 20, fy: -17, sa: 0.85, ghost: 1 }],
      [0.17, { ...LOW, x: 5, crouch: 3, lean: 5, fx: 22, fy: -28, sa: 0.1, by: -18, toeB: true, ghost: 1 }, "snap"],
      [0.21, { ...LOW, x: 6, crouch: 1, lean: 6, fx: 19, fy: -37, sa: -0.95, by: -18, ffx: 13, fby: -6 }, "snap"],
      [0.5, { ...LOW, x: 6, crouch: 3, lean: 3, fx: 18, fy: -36, sa: -1.05, by: -19, ffx: 12 }],
      [0.92, { ...STANCE, x: -7 }]
    ],
    hits: [
      { t: 0.06, stop: 0.05, shake: 0.08, amp: 1, push: 1.4, straw: 8 },
      { t: 0.16, stop: 0.14, shake: 0.2, amp: 2, push: 2.8, straw: 18, y: -28 }
    ],
    dust: [{ t: 0.06, x: 16, n: 5, dir: 1 }, { t: 0.17, x: -8, n: 4, dir: -1 }]
  };
  var UP = 0.14;
  var R0 = 62;
  var cut = (x, y, th, dir, span, extra) => through(x, y, th, dir, R0, span, 0.55, extra);
  function create5(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
    const X = 34, Y = -23;
    const down = cut(X, Y, 0.72, 1, 0.84, { W: 10, t0: 0, sweep: 0.06, hold: 0.07, trail: 0.24, ramp: C, lens: true });
    const up = cut(X, Y, -0.66, -1, 0.84, { W: 11, t0: UP, sweep: 0.06, hold: 0.06, trail: 0.26, ramp: C, lens: true });
    const ends = [slashEnd(down), slashEnd(up)], slivers = [-2.4, -1.1, 0.2, 1.6].map((a) => ({ a: a + Rg.range(-0.2, 0.2), r: Rg.range(5, 8), v: Rg.range(70, 120), arc: Rg.range(0.4, 0.7) }));
    const CLOSE2 = UP + 0.012;
    let t = 0, cut1 = false, cut2 = false, closed = false;
    return {
      update(dt) {
        t += dt;
        if (!cut1 && t >= down.sweep) {
          cut1 = true;
          shavings(ps, Rg, down, 10, [C[4], C[5]]);
          for (let i = 0; i < 6; i++) {
            const a = Math.atan2(ends[0].dy, ends[0].dx) + Rg.range(-0.5, 0.5), sp = Rg.range(120, 300);
            ps.spawn(P.SPARK, ends[0].x, ends[0].y, Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.12, 0.3));
          }
        }
        if (!closed && t >= CLOSE2) {
          closed = true;
          lights.add(X, Y, 56, C[3], 0.45, 0.4);
          lights.add(X, Y, 18, WHITE, 0.6, 0.08);
          for (let i = 0; i < 18; i++) {
            const a = Rg.range(-Math.PI, Math.PI) * 0.8, sp = Rg.range(140, 360);
            ps.spawn(P.SPARK, X, Y, Math.cos(a) * sp, Math.sin(a) * sp - 40, Rg.range(0.14, 0.4));
          }
          for (let i = 0; i < 5; i++) ps.spawn(P.STAR, X + Rg.range(-14, 14), Y + Rg.range(-12, 12), 0, -4, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2.2), Rg.range(0.05, 0.2));
        }
        if (!cut2 && t >= UP + up.sweep) {
          cut2 = true;
          shavings(ps, Rg, up, 12, [C[4], C[5]]);
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        const flash = t >= CLOSE2 && t < CLOSE2 + 0.07 ? 1 : 0;
        down.hot = up.hot = flash;
        slash(p, down, t);
        slash(p, up, t);
        for (const [s, e] of [[down, ends[0]], [up, ends[1]]]) {
          const g = t - s.t0 - s.sweep * 0.6;
          if (g > 0 && g < 0.2) sparkle(p, e.x, e.y, 7 * ease.outBack(Math.min(1, g / 0.05)) * (1 - g / 0.2), C[5], C[3], 0.5);
        }
        const q = t - CLOSE2;
        if (q >= 0 && q < 0.26) {
          const k = q / 0.26;
          flare(p, X, Y, 22 * Math.pow(1 - k, 1.4), 1 - k, C);
          p.glow(X, Y, 34, C[4], 0.35 * (1 - k));
        }
        if (q >= 0.03 && q < 0.15) {
          const k = (q - 0.03) / 0.12;
          for (const s of slivers) sliver(p, X, Y, s.a, s.r + s.v * (q - 0.03), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        for (const s of [down, up]) {
          const u = t - s.t0;
          if (u <= 0 || u >= 0.25) continue;
          const e = slashEnd({ ...s, span: s.span * ease.outExpo(clamp(u / s.sweep)) });
          p.glow(e.x, e.y, 40, C[3], 0.5 * (1 - u / 0.25));
        }
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/melee/thrust.js
  var thrust_exports = {};
  __export(thrust_exports, {
    act: () => act3,
    create: () => create6,
    meta: () => meta20
  });
  var meta20 = {
    name: "Thrust",
    desc: "A piercing stab: a bundle of streaks shoots out from the hand to a point, a long four-point star flares at the tip with a pierce ring, sparks and speed lines.",
    tags: ["melee", "thrust", "stab", "spear", "rapier", "pierce", "combat", "directional", "one-shot"],
    size: [196, 76],
    origin: [34, 62],
    duration: 0.75,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a1608", "#6b3c10", "#b8701a", "#f0b42e", "#ffe27a", "#fff6cf", "#ffffff"],
      sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
      reach: 66,
      seed: 4
    }
  };
  var STANCE2 = { ...READY, weapon: "sword", x: -14, fx: 12, fy: -21, sa: -0.3 };
  var BACK = { ...STANCE2, crouch: 5, lean: -3, fx: -3, fy: -19, sa: -0.05, bx: 8, by: -30, armsFront: true, ffx: 10, fbx: -8 };
  var LUNGE = { ...STANCE2, crouch: 6, lean: 6, fx: 23, fy: -20, sa: 0, bx: -8, by: -24, ffx: 15, fbx: -11, toeB: true };
  var act3 = {
    target: { x: 80 },
    poses: [
      [-0.46, STANCE2],
      [-0.24, BACK],
      [-0.05, { ...BACK, crouch: 6, fx: -5 }],
      [0, { ...LUNGE, ghost: 1 }, "snap"],
      [0.07, LUNGE, "snap"],
      [0.3, { ...LUNGE, crouch: 5, lean: 5 }],
      [0.7, STANCE2]
    ],
    hits: [{ t: 0.07, stop: 0.12, shake: 0.14, amp: 2, push: 2.8, straw: 16, y: -26 }],
    dust: [{ t: 0, x: -24, n: 6, dir: -1 }, { t: 0.07, x: 1, n: 6, dir: 1 }]
  };
  var OUT3 = 0.07;
  var HOLD = 0.06;
  var PULL = 0.2;
  function longStar(p, x, y, L, k, C) {
    if (L < 1) return;
    const arms = [[1, 0, L], [-1, 0, L * 0.7], [0, -1, L * 0.42], [0, 1, L * 0.42]];
    for (const [dx, dy, len2] of arms)
      for (let d = 1; d <= len2; d += 0.5) {
        const u = d / len2, c = u < 0.3 ? WHITE : u < 0.65 ? C[5] : C[4];
        p.dot(x + dx * d, y + dy * d, c, u < 0.7 ? 1 : 1 - (u - 0.7) / 0.35);
        if (u < 0.25 && len2 > 6) p.dot(x + dx * d - dy, y + dy * d + dx, C[5]), p.dot(x + dx * d + dy, y + dy * d - dx, C[5]);
      }
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let d = 1; d <= Math.min(3, L * 0.14); d++) p.px(x + dx * d, y + dy * d, d < 2 ? C[5] : C[4]);
    p.px(x, y, WHITE);
    p.glow(x, y, 6 + L * 1.3, C[4], 0.35 * k);
    p.glow(x, y, 3 + L * 0.4, WHITE, 0.3 * k);
  }
  function create6(o) {
    const C = fit(o.palette, 7), Rg = new Rng(o.seed), ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks }), lights = new Lights();
    const HX = 9, HY = -20, TX = HX + o.reach, TY = HY;
    const streaks3 = [-7, -4, -2, 0, 2, 4, 7].map((off) => ({ off, x0: HX + 1 + Rg.range(0, 5) + Math.abs(off) * 0.6, t0: Rg.range(0, 0.02) + Math.abs(off) * 3e-3, w: off === 0 ? 2 : 1, hot: off === 0, len: Rg.range(0.75, 1) }));
    const lines = [];
    let t = 0, struck = false;
    return {
      update(dt) {
        t += dt;
        if (t < OUT3 + 0.08 && Rg.chance(0.5)) {
          const s = Rg.sign();
          lines.push({ x: HX + Rg.range(0, o.reach * 0.6), y: HY + s * Rg.range(7, 17), l: Rg.range(18, 42), v: Rg.range(200, 340), t });
        }
        for (let i = lines.length - 1; i >= 0; i--) if (t - lines[i].t > 0.24) lines.splice(i, 1);
        for (const l of lines) l.x += l.v * dt;
        if (!struck && t >= OUT3) {
          struck = true;
          lights.add(TX, TY, 44, C[4], 0.45, 0.3);
          lights.add(TX, TY, 14, WHITE, 0.6, 0.06);
          for (let i = 0; i < 12; i++) {
            const a = Rg.range(-0.55, 0.45), sp = Rg.range(150, 330);
            ps.spawn(P.SPARK, TX, TY, Math.cos(a) * sp, Math.sin(a) * sp - 30, Rg.range(0.12, 0.35));
          }
          for (let i = 0; i < 10; i++) {
            const a = Rg.range(-0.9, 0.9) + (Rg.chance(0.3) ? Math.PI : 0), sp = Rg.range(40, 120);
            ps.spawn(P.MOTE, TX + Rg.range(-6, 2), TY + Rg.range(-2, 2), Math.cos(a) * sp, Math.sin(a) * sp, Rg.range(0.25, 0.5), Rg.chance(0.5) ? C[5] : C[4], 0.6);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.STAR, TX + Rg.range(-10, 8), TY + Rg.range(-9, 9), 0, -3, Rg.range(0.2, 0.4), Rg.chance(0.5) ? C[5] : WHITE, Rg.range(1, 2), Rg.range(0.06, 0.2));
        }
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        if (t < 0.05) sparkle(p, HX + 2, HY, 5 * (1 - t / 0.05) + 1, C[5], C[3], 0.4);
        for (const l of lines) {
          const k = (t - l.t) / 0.24;
          for (let d = 0; d < l.l * (1 - k * 0.6); d++) p.dot(l.x - d, l.y, d < 3 ? WHITE : d < l.l * 0.4 ? C[5] : C[3], (1 - d / l.l) * (1 - k));
        }
        const pull = smooth(OUT3 + HOLD, OUT3 + HOLD + PULL, t);
        for (const s of streaks3) {
          const u = clamp((t - s.t0) / OUT3), head4 = ease.outExpo(u);
          if (u <= 0 || pull >= 1) continue;
          const y0 = HY + s.off, end = s.x0 + (TX - s.x0) * s.len, x1 = s.x0 + (end - s.x0) * head4, xa = s.x0 + (end - s.x0) * Math.max(pull, head4 * 0.35 * (1 - s.len) * 3);
          const yAt = (x) => y0 + (TY - y0) * clamp((x - s.x0) / (TX - s.x0)) * 0.85;
          for (let x = xa; x <= x1; x += 0.5) {
            const v = (x - xa) / Math.max(1, x1 - xa), c = v > 0.88 ? WHITE : s.hot ? v > 0.35 ? C[6] : C[5] : v > 0.55 ? C[5] : v > 0.25 ? C[4] : C[3];
            p.dot(x, yAt(x), c, v < 0.12 ? v / 0.12 : 1);
            if (s.w > 1 && v > 0.1) p.dot(x, yAt(x) + 1, v > 0.6 ? C[5] : C[3], v < 0.2 ? v / 0.2 : 1);
          }
        }
        if (t < OUT3 + HOLD + PULL) p.glowLine(HX + (TX - HX) * pull, HY, HX + (TX - HX) * ease.outExpo(clamp(t / OUT3)), TY, 6, C[4], 0.22 * (1 - pull));
        const q = t - OUT3;
        if (q >= 0 && q < 0.4) {
          const g = ease.outBack(clamp(q / 0.04), 2.4) * (1 - smooth(0.08, 0.4, q)) * (1 + 0.12 * Math.sin(q * 70));
          longStar(p, TX, TY, 24 * g, 1 - q / 0.4, C);
        }
        if (q >= 0 && q < 0.2) {
          const k = q / 0.2, rx = 2 + 7 * ease.outCubic(k), ry = 4 + 12 * ease.outCubic(k);
          for (let a = 0; a < TAU; a += 0.05) p.dot(TX + 4 + 10 * k + Math.cos(a) * rx, TY + Math.sin(a) * ry, k < 0.3 ? WHITE : C[5], 1.15 - k);
        }
        ps.draw(p);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/melee/hammer-smash.js
  var hammer_smash_exports = {};
  __export(hammer_smash_exports, {
    act: () => act4,
    create: () => create7,
    meta: () => meta21
  });
  var meta21 = {
    name: "Hammer smash",
    desc: "A hammer drops in front in a wedge of motion: a white slam with rays, a dome of force, a dent with cracks, rocks thrown up that bounce and settle, and dust.",
    tags: ["melee", "smash", "hammer", "heavy", "ground", "shockwave", "debris", "combat", "directional", "one-shot"],
    size: [208, 112],
    origin: [80, 92],
    duration: 2,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#141834", "#242c5c", "#38479a", "#5a72d0", "#8fa8f0", "#c4d4ff", "#eef3ff", "#ffffff"],
      stone: "#4a3f69",
      seed: 9
    }
  };
  var REST_ = { ...READY, weapon: "hammer", two: true, sa: 0.62, fx: 11, fy: -21, crouch: 3 };
  var TOP = { ...REST_, x: -3, crouch: 0, lean: -3, fx: 3, fy: -41, sa: -2.1, ffx: 8, ffy: -8, fbx: -5, toeB: true };
  var SLAM = { ...REST_, x: -1, crouch: 7, lean: 6, fx: 14, fy: -19, sa: 0.62, ffx: 11, fbx: -10 };
  var act4 = {
    target: { x: 66 },
    poses: [
      [-0.72, { ...REST_, x: -3 }],
      [-0.44, { ...REST_, x: -3, crouch: 5, lean: -1, fx: 16, fy: -28, sa: -0.9 }],
      [-0.2, TOP],
      [-0.03, { ...TOP, y: -2 }],
      [0.06, { ...REST_, x: 0, y: -3, crouch: -1, lean: 2, fx: 13, fy: -41, sa: -1.2, ffx: 11, ffy: -8, ghost: 1 }, "snap"],
      [0.11, { ...REST_, x: 0, y: -1, crouch: 3, lean: 5, fx: 19, fy: -30, sa: -0.15, ffx: 13, ghost: 1 }, "snap"],
      [0.15, SLAM, "snap"],
      [0.62, { ...SLAM, crouch: 6, lean: 5 }],
      [1.02, { ...REST_, x: -2, crouch: 5, lean: 2, fx: 14, fy: -24, sa: 0.3 }],
      [1.4, { ...REST_, x: -3 }]
    ],
    hits: [{ t: 0.15, stop: 0.2, shake: 0.34, amp: 3, push: 3, straw: 26, y: -8 }],
    dust: [{ t: 0.15, x: 10, n: 8 }, { t: 0.15, x: -12, n: 5, dir: -1 }]
  };
  var SOOT = hex("#0d0a12");
  var HOT2 = ["#fff3a6", "#ffc23d", "#ff8a2a", "#c9281f"].map(hex);
  var DROP = 0.15;
  var head = (t) => {
    const x = clamp((t + 0.03) / (DROP + 0.03));
    return 0.28 * x + 0.72 * x * x;
  };
  function create7(o) {
    const C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone(o.stone), floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3 }), bits = new Bits({ ground: floor3 }), chips = new Bits({ ground: floor3 }), lights = new Lights();
    const A = swing({ cx: 5, cy: -25, R: 32, sy: 1, rot: 0, a0: -2.25, dir: 1 });
    let U1 = 0;
    while (onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4) U1 += 5e-3;
    const HW = 13, [X] = onSwing(A, A.R - HW / 2, U1);
    const lines = cracks(R, X, 5, 24, 6, 0);
    const rays = [-0.95, -0.6, -0.3, -0.05, 0.22, 0.5, 0.85].map((d, i) => ({ a: -Math.PI / 2 + d + R.range(-0.06, 0.06), L: (i === 3 ? 34 : i === 2 || i === 4 ? 26 : i === 1 || i === 5 ? 18 : 12) * R.range(0.9, 1.1) }));
    let t = 0, hit = false;
    const Rm = A.R - HW / 2;
    const wedge = (p) => {
      const h = head(t), U = U1 * h, after = smooth(DROP, DROP + 0.07, t), lagU = Math.max(0, U - (0.3 + 1.05 * h)), T4 = lagU + (U - lagU) * after * 0.8;
      if (U - T4 < 0.03 || after >= 1) return;
      const len2 = (U - T4) * Rm;
      smear(p, A, T4, U, HW + 1, (u, r, out) => {
        const lead = (U - u) * Rm, f = lead / len2, w = HW * (lead < 3 ? 1 : Math.pow(1 - (lead - 3) / Math.max(1, len2 - 3), 0.85)) * (1 - after * 0.5);
        const off = (r - Rm) / (w / 2 + 0.01);
        if (w < 0.6 || Math.abs(off) > 1) return;
        let ci = lead < 2 ? 0 : Math.round(1 + f * 3.4 + Math.abs(off) * 1.4 - (off > 0.55 ? 1 : 0) + after * 3);
        if (ci > n - 3) return;
        out.c = C[n - 1 - Math.max(0, ci)];
      });
      if (after < 0.6)
        for (const [dr, l0, L] of [[-HW / 2 - 2, 3, 26], [-HW / 2 - 5, 9, 16], [HW / 2 + 2, 2, 30], [HW / 2 + 5, 8, 18], [-1, len2 + 2, 14], [3, len2 + 4, 9]]) {
          const r = Rm + dr;
          for (let d = l0; d < l0 + L * (1 - after); d += 0.5) {
            const u = U - d / r, k = (d - l0) / L;
            if (u < 0) break;
            p.dot(...onSwing(A, r, u), k < 0.25 ? C[6] : k < 0.6 ? C[5] : C[4], (1 - k) * (1 - after));
          }
        }
      const [hx, hy] = onSwing(A, Rm, U);
      p.glow(hx, hy, 34, C[4], 0.5 * (1 - smooth(DROP - 0.03, DROP, t)));
    };
    return {
      update(dt) {
        t += dt;
        if (!hit && t >= DROP) {
          hit = true;
          lights.add(X, -5, 16, WHITE, 0.35, 0.08);
          lights.add(X, -10, 64, C[4], 0.42, 0.6);
          for (let i = 0; i < 15; i++) {
            const s = R.sign();
            bits.add({ kind: B.CHUNK, x: X + s * R.range(0, 5), y: -2, vx: s * R.range(20, 105), vy: -R.range(110, 300), g: 1, drag: 0.35, bounce: 0.38, life: R.range(1.25, 1.65), a: R.range(0, TAU), va: R.range(-16, 16), s: R.pick([1, 1, 2, 2, 3]) });
          }
          for (let i = 0; i < 11; i++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(90, 230);
            chips.add({ kind: B.SHARD, x: X + R.range(-4, 4), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.9, drag: 0.5, bounce: 0.35, life: R.range(0.9, 1.5), s: 1 });
          }
          for (let i = 0; i < 40; i++) {
            const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(50, 210);
            ps.spawn(P.GRIT, X + R.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.9, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 14; i++) {
            const s = i % 2 ? -1 : 1, sp = R.range(120, 260);
            ps.spawn(P.MOTE, X + s * 6, -R.range(1, 4), s * sp, -R.range(0, 30), R.range(0.18, 0.34), R.chance(0.5) ? C[6] : C[5], 0.8, R.range(0.02, 0.05));
          }
          for (let i = 0; i < 24; i++) {
            const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(150, 380);
            ps.spawn(P.SPARK, X + Math.cos(a) * 6, -2 + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.12, 0.42), 0, 1, R.range(0.035, 0.08));
          }
          for (let i = 0; i < 20; i++) {
            const s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R.range(2, 10), -R.range(2, 7), s * R.range(40, 125), -R.range(2, 14), R.range(0.95, 1.5), st.dust, R.range(6, 9), R.range(0.02, 0.08), PF.BIG);
          }
          for (let i = 0; i < 7; i++) ps.spawn(P.SMOKE, X + R.range(-6, 6), -R.range(3, 9), R.range(-20, 20), -R.range(30, 80), R.range(1, 1.4), st.dust, R.range(5, 7.5), R.range(0.04, 0.14), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-6, 6), -R.range(1, 4), R.range(-70, 70), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
        }
        bits.update(dt);
        chips.update(dt);
        if (hit && t > DROP + 0.4 && t < DROP + 1.2 && R.chance(0.08)) {
          const b = R.pick(bits.list);
          if (b && b.rest) ps.spawn(P.STAR, b.x + R.range(-1, 1), b.y - 1.5 - b.s, 0, -2, R.range(0.25, 0.45), R.chance(0.5) ? HOT2[0] : WHITE, R.range(0.6, 1.6));
        }
        for (const b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = true;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 14), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.6));
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const q = t - DROP;
        if (q >= 0) {
          const fade = 1 - smooth(1.3, 1.7, q);
          for (let x = -11; x <= 11; x++) {
            const u = x / 10, d = Math.abs(x) > 10 ? 0 : Math.round(3.2 * (1 - u * u) + (rand(x, 4) - 0.5) * 0.8);
            for (let y = 0; y < d; y++) p.dot(X + x, y, y === 0 ? SOOT : st.dark, fade);
            if (d > 0) p.dot(X + x, d, Math.abs(x) < 7 ? st.light : st.body, fade);
            if (Math.abs(x) >= 8) p.dot(X + x, -1, Math.abs(x) >= 10 ? st.body : st.light, fade);
            if (Math.abs(x) === 9 && rand(x, 7) < 0.7) p.dot(X + x, -2, st.body, fade);
          }
          const k = q / 0.5;
          if (k < 1) band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        const q = t - DROP;
        wedge(p);
        if (q >= 0) {
          const fade = 1 - smooth(1.3, 1.7, q);
          for (const c of lines) {
            const reach = 30 * ease.outCubic(clamp((q - c.at * 0.06) / 0.08)) * (c.fork ? 0.3 : 1);
            if (reach > 0)
              along(c.pts, reach, (x0, y0, x1, y1) => {
                if (q >= 0.12) p.line(x0, y0 + 3, x1, y1 + 3, st.shade, fade);
                p.line(x0, y0 + 2, x1, y1 + 2, q < 0.05 ? WHITE : q < 0.12 ? C[5] : SOOT, fade);
              });
          }
          const k = q / 0.5;
          if (k < 1) band(p, X, 0.5, 6 + 50 * ease.outCubic(k), 0.16, Math.max(1, 2 * (1 - k)), 1.15 - k, [st.body, C[3], C[5], C[7]], (g) => Math.sin(g) >= 0);
          const d = (q - 0.045) / 0.4;
          if (d >= 0 && d < 1) {
            const r = 12 + 30 * ease.outCubic(d), th = Math.max(1, 3.6 * Math.pow(1 - d, 0.8)), a = d < 0.6 ? 1 : (1 - d) / 0.4;
            p.shade(X - r - 1, -r - 1, X + r + 1, 0, (x, y, out) => {
              const e = r - Math.hypot(x - X, y);
              if (e < 0 || e > th || y > -0.5) return;
              const v = e / th;
              out.c = d < 0.1 ? v < 0.6 ? WHITE : C[6] : v < 0.34 ? d < 0.45 ? WHITE : C[6] : v < 0.67 ? C[5] : C[4];
              out.a = a;
            });
            for (let i = 0; i < 7; i++) {
              const g = -Math.PI * (0.08 + i / 6 * 0.84);
              p.glow(X + Math.cos(g) * r, Math.sin(g) * r, 14, C[4], 0.36 * (1 - d));
            }
          }
          if (q < 0.2)
            for (const ry of rays) {
              const d1 = ry.L * ease.outCubic(Math.min(1, q / 0.05)), d0 = ry.L * smooth(0.04, 0.2, q), ca = Math.cos(ry.a), sa = Math.sin(ry.a);
              if (d1 - d0 < 1) continue;
              p.line(X + ca * (2 + d0), -1 + sa * (2 + d0), X + ca * d1, -1 + sa * d1, (u) => u < 0.5 ? WHITE : u < 0.8 ? C[6] : C[5]);
              p.glowLine(X + ca * d0, -1 + sa * d0, X + ca * d1, -1 + sa * d1, 4, C[5], 0.18 * (1 - q / 0.2));
            }
          if (q < 0.07) {
            const hot = q < 0.035, rx = hot ? 16 : 12, ry = hot ? 3 : 2;
            p.ellipse(X, 0, rx + 2, ry + 1, hot ? C[6] : C[5]);
            p.ellipse(X, 0, rx, ry, hot ? WHITE : C[7]);
          }
          if (q < 0.2) {
            const pop = Math.exp(-q / 0.05);
            p.glow(X, -5, 26, C[5], 0.3 * pop);
          }
          p.glow(X, -1, 16, HOT2[2], 0.28 * Math.exp(-q / 0.35));
        }
        for (const b of bits.list) rock(p, b, st);
        for (const b of chips.list) {
          const k = b.life / b.max, c = k > 0.7 ? HOT2[0] : k > 0.45 ? HOT2[1] : k > 0.25 ? HOT2[2] : HOT2[3];
          p.dot(b.x, b.y, c, Math.min(1, k * 4));
          if (!b.rest) p.dot(b.x - b.vx * 0.012, b.y - b.vy * 0.012, HOT2[3], Math.min(1, k * 4));
          p.glow(b.x, b.y, 4, c, 0.35 * k);
        }
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/melee/heavy-cleave.js
  var heavy_cleave_exports = {};
  __export(heavy_cleave_exports, {
    act: () => act5,
    create: () => create8,
    meta: () => meta22
  });
  var meta22 = {
    name: "Heavy cleave",
    desc: "A glint over the head, then a thick ember arc accelerates over the top into the floor: a white slam, glowing cracks, dust rolling both ways, grit and rising embers.",
    tags: ["melee", "slash", "cleave", "axe", "heavy", "ground", "fire", "combat", "directional", "one-shot"],
    size: [208, 116],
    origin: [68, 96],
    duration: 1.9,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: {
      palette: ["#2a0c10", "#5c1414", "#a3241a", "#e0481c", "#ff8a2a", "#ffc23d", "#fff0a0", "#ffffff"],
      stone: "#4a3f69",
      seed: 5
    }
  };
  var REST_2 = { ...READY, weapon: "greatsword", two: true, sa: -1, fx: 11, fy: -21 };
  var OVER = { ...REST_2, x: -4, crouch: 2, lean: -2, fx: 1, fy: -42, sa: -2.45, ffx: 8, fbx: -7 };
  var FLOOR4 = { ...REST_2, x: 0, crouch: 7, lean: 6, fx: 17, fy: -21, sa: 0.72, ffx: 11, fbx: -10, toeB: true };
  var act5 = {
    target: { x: 66 },
    poses: [
      [-0.42, { ...REST_2, x: -4 }],
      [-0.3, { ...REST_2, x: -3, crouch: 4, fx: 13, fy: -29, sa: -1.3 }],
      [-0.12, { ...OVER, crouch: 4 }],
      [0.2, { ...OVER, crouch: 3 }],
      [0.27, { ...REST_2, x: -1, y: -2, crouch: 0, lean: 2, fx: 11, fy: -42, sa: -1.45, ffx: 10, ghost: 1 }, "snap"],
      [0.31, { ...REST_2, x: 0, y: -1, crouch: 3, lean: 4, fx: 18, fy: -33, sa: -0.45, ffx: 12, ghost: 1 }, "snap"],
      [0.335, FLOOR4, "snap"],
      [0.85, { ...FLOOR4, crouch: 6, lean: 5 }],
      [1.3, { ...REST_2, x: -2, crouch: 4, lean: 2, fx: 15, fy: -23, sa: 0.1 }],
      [1.7, { ...REST_2, x: -4 }]
    ],
    hits: [{ t: 0.335, stop: 0.2, shake: 0.34, amp: 3, push: 3.2, straw: 28, y: -8 }],
    dust: [{ t: 0.335, x: 18, n: 8, dir: 1 }, { t: 0.335, x: -12, n: 5, dir: -1 }]
  };
  var RAISE = 0.2;
  var SWING = 0.135;
  var HIT = RAISE + SWING;
  var HOLD2 = 0.05;
  var TRAIL = 0.22;
  var head2 = (t) => ease.inQuad(clamp((t - RAISE) / SWING));
  var passedAt = (f) => RAISE + SWING * Math.sqrt(clamp(f));
  function create8(o) {
    const C = fit(o.palette, 8), n = C.length, R = new Rng(o.seed), st = stone(o.stone), floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [C[6], C[5], C[4], C[3]] }), bits = new Bits({ ground: floor3 }), lights = new Lights();
    const A = swing({ cx: 3, cy: -22, R: 37, sy: 0.88, rot: 0.32, a0: -2.45, dir: 1 });
    let U1 = 0;
    while (onSwing(A, A.R, U1)[1] < -0.5 && U1 < 4) U1 += 5e-3;
    const E = { ...A, R: A.R * 0.76 }, W6 = 16, WE = 5;
    const [X] = onSwing(A, A.R - 2, U1), GLINT = onSwing(A, A.R - 3, 0);
    const lines = cracks(R, X, 4, 40, 7, 0.4);
    const spikes2 = [-Math.PI, -2.7, -2.15, -1.62, -1.05, -0.45, 0].map((a, i) => ({ a: a + R.range(-0.08, 0.08), len: (i === 0 || i === 6 ? 20 : i === 3 ? 15 : 9) + R.range(0, 4), w: 1.6 + R.range(0, 0.6) }));
    const shards = [-2.5, -1.9, -1.2, -0.6].map((a) => ({ a: a + R.range(-0.15, 0.15), r: 8 + R.range(0, 3), v: R.range(80, 130), arc: R.range(0.35, 0.6) }));
    let t = 0, hit = false;
    const arc = (p, s, w0, lag, rim) => {
      const tt = t - lag, U = U1 * head2(tt), T4 = U1 * smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, tt);
      if (U < 0.02 || T4 >= U - 0.02) return;
      const gone = smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, tt), shrink = 1 - 0.75 * gone;
      smear(p, s, T4, U, w0, (u, r, out) => {
        const age = Math.max(0, tt - passedAt(u / U1)), v = (u - T4) / (U - T4);
        const w = w0 * shrink * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
        if (w < 0.4) return;
        const q = (s.R - r) / w;
        if (q < 0 || q > 1) return;
        const ci = rim && q < 0.22 && age < 0.12 ? 0 : Math.round(q * (n - 1) * 0.62 + age * 7 + Math.max(0, tt - HIT) * 10 - v * 0.8 + (rim ? 0.7 : 1.7));
        out.c = C[n - 1 - clamp(ci, 0, n - 1)];
        out.a = Math.min(1, v / 0.35) * (1.2 - gone);
      });
      if (rim) glowAlong(p, s, s.R - w0 * 0.4, T4, U, 7 + w0 * 0.5, C[4], (u) => 0.26 * Math.exp(-Math.max(0, tt - passedAt(u / U1)) / 0.2) * ((u - T4) / (U - T4)));
    };
    return {
      update(dt) {
        t += dt;
        if (t < RAISE - 0.04 && R.chance(0.35)) {
          const a = R.range(0, TAU), D16 = R.range(14, 26), T4 = R.range(0.14, 0.2), v = D16 * 3 / (Math.exp(3 * T4) - 1);
          ps.spawn(P.STREAK, GLINT[0] + Math.cos(a) * D16, GLINT[1] + Math.sin(a) * D16, -Math.cos(a) * v, -Math.sin(a) * v, T4, R.chance(0.5) ? C[5] : C[4]);
        }
        if (t > RAISE && t < HIT && R.chance(0.7)) {
          const u = U1 * head2(t) * R.range(0.6, 1), [x, y] = onSwing(A, A.R - R.range(0, 6), u);
          ps.spawn(P.EMBER, x, y, R.range(-20, 20), R.range(-40, -10), R.range(0.5, 1.1), C[4], R.range(1, 2));
        }
        if (!hit && t >= HIT) {
          hit = true;
          lights.add(X, -6, 26, WHITE, 0.9, 0.1);
          lights.add(X, -12, 64, C[4], 0.5, 0.8);
          for (let i = 0; i < 26; i++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.35), sp = R.range(140, 360);
            ps.spawn(P.SPARK, X, -1, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.15, 0.5));
          }
          for (let i = 0; i < 20; i++) {
            const s = i % 2 ? -1 : 1;
            ps.spawn(P.SMOKE, X + s * R.range(0, 8), -R.range(2, 6), s * R.range(45, 135), -R.range(2, 12), R.range(1, 1.45), st.dust, R.range(5, 8.5), R.range(0, 0.07), PF.BIG);
          }
          for (let i = 0; i < 4; i++) ps.spawn(P.SMOKE, X + R.range(-4, 4), -R.range(3, 8), R.range(-15, 15), -R.range(40, 90), R.range(1, 1.45), st.dust, R.range(4, 6.5), R.range(0.02, 0.1), PF.BIG);
          for (let i = 0; i < 8; i++) ps.spawn(P.DUST, X + R.range(-4, 4), -R.range(1, 4), R.range(-60, 60), -R.range(8, 30), R.range(0.35, 0.7), st.dust, R.range(2, 3.5));
          for (let i = 0; i < 44; i++) {
            const a = -Math.PI / 2 + R.range(-0.7, 1), sp = R.range(60, 230);
            ps.spawn(P.GRIT, X + R.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.5), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.35) ? 2 : 1);
          }
          for (let i = 0; i < 6; i++)
            bits.add({ kind: B.CHUNK, x: X + R.range(-3, 3), y: -2, vx: R.range(-50, 110), vy: -R.range(120, 260), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.15, 1.5), a: R.range(0, TAU), va: R.range(-14, 14), s: R.int(1, 2) });
          for (let i = 0; i < 16; i++) ps.spawn(P.EMBER, X + R.range(-8, 8), -R.range(1, 6), R.range(-50, 60), -R.range(30, 110), R.range(0.7, 1.5), C[4], R.range(1, 2));
        }
        if (hit && t < HIT + 0.6 && R.chance(0.12)) {
          const c = R.pick(lines), pt = R.pick(c.pts);
          ps.spawn(P.EMBER, pt[0], pt[1] - 1, R.range(-12, 12), -R.range(20, 50), R.range(0.5, 0.9), C[4], 1);
        }
        bits.update(dt);
        for (const b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = true;
            for (let i = 0; i < 2; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 30), -R.range(2, 12), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.4));
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const q = t - HIT;
        if (q >= 0) {
          const fade = 1 - smooth(1, 1.5, q);
          for (let y = 0; y <= 2; y++)
            for (let x = -9; x <= 9; x++) {
              const d = Math.hypot((x + 0.5) / 9, (y + 0.5) / 3.5);
              if (d > 1) continue;
              const T4 = Math.pow(clamp(1 - q / 0.8), 1.4) * (1.2 - d) - rand(x, y, 3) * 0.3;
              if (T4 > 0.08) p.dot(X + x, y, C[clamp(Math.round(T4 * 9), 1, 7)], fade);
              else p.dot(X + x, y, d < 0.5 ? st.dark : st.shade, (d < 0.9 - rand(x, y, 9) * 0.3 ? 1 : 1 - d) * fade);
            }
          const k = q / 0.45;
          if (k < 1) band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) < 0);
        }
        ps.draw(p, "back");
      },
      draw(p) {
        const q = t - HIT;
        if (t < RAISE + 0.03) {
          const g = ease.outBack(clamp(t / 0.1)) * (1 + 0.15 * Math.sin(t * 60)) * (t > RAISE ? 1 - (t - RAISE) / 0.03 : 1);
          sparkle(p, GLINT[0], GLINT[1], 1 + 7 * g, C[6], C[4], 0.5);
          p.glow(GLINT[0], GLINT[1], 22, C[4], 0.3 * g);
        }
        if (q >= 0) {
          const heat2 = Math.pow(clamp(1 - q / 1.2), 1.2), fade = 1 - smooth(1.15, 1.5, q);
          for (const c of lines) {
            const reach = 40 * ease.outCubic(clamp((q - c.at * 0.1) / 0.13)) * (c.fork ? 0.3 : 1);
            if (reach <= 0) continue;
            along(c.pts, reach, (x0, y0, x1, y1, d) => {
              const h = heat2 * (1 - d / 46) - (c.fork ? 0.12 : 0), col = h > 0.72 ? WHITE : h > 0.08 ? C[clamp(Math.round(h * 8), 1, 6)] : st.dark;
              if (y1 > 0.5) p.line(x0 + 1, y0, x1 + 1, y1, st.dark, fade);
              p.line(x0, y0, x1, y1, col, fade);
              if (h > 0.25 && (d | 0) % 6 < 2) p.glow(x1, y1, 6, C[4], 0.2 * h * fade);
            });
          }
          if (heat2 > 0) p.glow(X, -2, 34, C[4], 0.32 * heat2 * fade);
          const k = q / 0.45;
          if (k < 1) band(p, X, 0.5, 6 + 46 * ease.outCubic(k), 0.16, Math.max(1, 3 * (1 - k)), 1.15 - k, [st.body, st.light, C[4], C[6]], (g) => Math.sin(g) >= 0);
        }
        arc(p, E, WE, 0.02, false);
        arc(p, A, W6, 0, true);
        const tail = U1 * smooth(HIT + HOLD2, HIT + HOLD2 + TRAIL, t), th = 0.8 * (1 - clamp((t - HIT - HOLD2) / (TRAIL + 0.25)));
        if (tail > 0.02 && th > 0) trace(p, A, A.R - 0.5, 0, tail, C[3], (u) => th * (0.4 + 0.6 * u / U1));
        if (t > RAISE && t < HIT + 0.05) {
          const [x, y] = onSwing(A, A.R - 5, U1 * head2(t));
          p.glow(x, y, 40, C[4], 0.5);
        }
        if (q >= 0 && q < 0.035) star(p, X, -1, spikes2, 1, 1, WHITE, C[6], C[7], C[5]);
        else if (q >= 0.035 && q < 0.07) star(p, X, -1, spikes2, 1.25, 0.55, C[7], C[6], C[6], C[4]);
        if (q >= 0.05 && q < 0.16) {
          const k = (q - 0.05) / 0.11;
          for (const s of shards) sliver(p, X, -1, s.a, s.r + s.v * (q - 0.05), s.arc * (1 - 0.4 * k), k < 0.4 ? C[6] : k < 0.7 ? C[5] : C[4], 1 - k);
        }
        if (q >= 0 && q < 0.2) {
          const pop = Math.exp(-q / 0.05);
          p.glow(X, -6, 30, C[5], 0.8 * pop);
          p.glow(X, -2, 10, WHITE, 0.7 * pop);
        }
        for (const b of bits.list) rock(p, b, st);
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/impacts/hit-spark.js
  var hit_spark_exports = {};
  __export(hit_spark_exports, {
    create: () => create9,
    meta: () => meta23
  });
  var meta23 = {
    name: "Hit spark",
    desc: "The everyday hit: a sharp, lopsided cross flare with one long ray along the blow round a white diamond core, then a cone of sparks and hot chips that fall and bounce.",
    tags: ["impact", "hit", "spark", "combat", "directional", "one-shot"],
    size: [136, 80],
    origin: [44, 64],
    duration: 0.5,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffe26b", "#fff3a6", "#ffffff"], height: 20, aim: 0.1, seed: 4 }
  };
  function ray(p, x, y, a, L, w, C, from = 0) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let d = from * L; d <= L; d += 0.5) {
      const u = d / L, hw = w * Math.pow(1 - u, 1.6);
      const col = u < 0.3 ? WHITE : u < 0.62 ? C[5] : u < 0.88 ? C[4] : C[3];
      p.px(x + c * d, y + s * d, col);
      if (hw > 0.45) for (let o = 0.5; o <= hw; o += 0.5) for (const e of [-o, o]) p.px(x + c * d - s * e, y + s * d + c * e, u < 0.3 && o < 1 ? C[5] : C[4]);
    }
  }
  function diamond(p, x, y, r, C) {
    for (let dy = -r - 1; dy <= r + 1; dy++)
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const m = Math.abs(dx) + Math.abs(dy);
        if (m <= r) p.px(x + dx, y + dy, WHITE);
        else if (m === r + 1) p.px(x + dx, y + dy, C[3]);
      }
  }
  function create9(o) {
    const C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = -o.height, A = o.aim, floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [C[6], C[5], C[4], C[2]] });
    const lights = new Lights();
    const tilt = R.range(-0.08, 0.08);
    const rays = [
      { a: A + tilt, L: R.range(33, 37), w: 2.2 },
      { a: A + Math.PI + tilt, L: R.range(8, 10), w: 2.2 },
      { a: A - Math.PI / 2 + tilt, L: R.range(15, 18), w: 2.6 },
      { a: A + Math.PI / 2 + tilt, L: R.range(10, 12), w: 2.3 },
      { a: A - Math.PI / 4 + tilt, L: R.range(5, 7), w: 1 }
    ];
    lights.add(X, Y, 38, C[4], 0.35, 0.18);
    lights.add(X + Math.cos(A) * 10, Y + Math.sin(A) * 10, 22, C[5], 0.45, 0.1);
    lights.add(X, -2, 26, C[3], 0.22, 0.22);
    for (let i = 0; i < 9; i++) {
      const a = A + R.range(-0.6, 0.6) - 0.15, v = R.range(170, 360);
      ps.spawn(P.SPARK, X + 1, Y, Math.cos(a) * v, Math.sin(a) * v - 40, R.range(0.25, 0.45), WHITE, 1, i > 6 ? R.range(0.01, 0.03) : 0);
    }
    for (let i = 0; i < 6; i++) {
      const a = A + R.range(-1.1, 0.5) - 0.3, v = R.range(70, 170);
      ps.spawn(P.GRIT, X + 1, Y, Math.cos(a) * v, Math.sin(a) * v - R.range(30, 80), R.range(0.35, 0.45), R.pick([C[5], C[4], C[4], C[3]]), 1);
    }
    let t = 0;
    return {
      update(dt) {
        t += dt;
        ps.update(dt);
        lights.update(dt);
      },
      draw(p) {
        ps.draw(p);
        if (t < 0.025) {
          for (const r of rays) ray(p, X, Y, r.a, r.L, r.w, C);
          diamond(p, X, Y, 4, C);
        } else if (t < 0.058) {
          for (const r of rays) ray(p, X, Y, r.a, r.L * 1.2, r.w * 0.55, C, 0.12);
          diamond(p, X, Y, 3, C);
        } else if (t < 0.092) {
          const r = rays[0];
          ray(p, X, Y, r.a, r.L * 1.3, 0.6, [C[0], C[1], C[2], C[3], C[3], C[4]], 0.4);
        }
        const pop = Math.exp(-t / 0.045);
        if (pop > 0.02) {
          p.glow(X, Y, 22, C[4], 0.3 * pop);
          p.glow(X, Y, 7, WHITE, 0.15 * pop);
          p.glowLine(X, Y, X + Math.cos(A) * 26, Y + Math.sin(A) * 26, 4, C[5], 0.25 * pop);
        }
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/impacts/crit-hit.js
  var crit_hit_exports = {};
  __export(crit_hit_exports, {
    create: () => create10,
    meta: () => meta24
  });

  // vendor/pixelfx/fx/impacts/_lib.js
  var SOOT2 = hex("#0d0a12");
  var OUTLINE2 = hex("#1a1422");
  var LIGHT2 = Math.atan2(-1, -1);
  function stone2(c) {
    c = hex(c);
    return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3), lip: mix(scale(c, 1.55), WHITE, 0.12) };
  }
  function spikes(R, n, aim, { len: len2 = [7, 10], w = [1.5, 2.1], fwd = 1.8, back = 0.6, jag = 1, jit = 0.18 } = {}) {
    return Array.from({ length: n }, (_, i) => {
      const a = aim + i / n * TAU + R.range(-jit, jit), cb = Math.cos(a - aim);
      const L = R.range(len2[0], len2[1]) * (1 + fwd * Math.pow(Math.max(0, cb), 3) + back * Math.pow(Math.max(0, -cb), 3)) * (i % 2 ? jag : 1);
      return { a, len: L, w: R.range(w[0], w[1]) * (i % 2 ? Math.sqrt(jag) : 1) };
    });
  }
  function star2(p, x, y, list, sc, th, [rim, body, inner, core], a = 1, heart2 = 2.4) {
    for (let pass2 = 0; pass2 < 3; pass2++)
      for (const s of list) {
        const c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
        for (let d = 0; d <= L; d += 0.5) {
          if (pass2 === 2 && d > L * 0.55) break;
          const hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3);
          const hw = pass2 === 0 ? hw0 + 0.8 : pass2 === 1 ? hw0 : hw0 * 0.45;
          const col = pass2 === 0 ? rim : pass2 === 1 ? d < L * 0.35 ? inner : body : core;
          for (let o = -hw; o <= hw; o += 0.5) p.dot(x + c * d - sn * o, y + sn * d + c * o, col, a);
        }
      }
    const r = heart2 * sc * Math.sqrt(th);
    p.circle(x, y, r + 0.8, inner, a);
    p.circle(x, y, r, core, a);
  }
  function brokenRing(p, x, y, r, th, segs, brk, c, c2 = c, k = 1, sy = 1, maxY = Infinity) {
    var _a;
    if (r <= 0 || k <= 0) return;
    const full = TAU / segs.length;
    for (const s of segs) {
      const span = full * (1 - s.gap * brk) + 0.02, rr = r * (1 + s.dr * brk), m = Math.max(4, Math.ceil(rr * span * 1.8));
      for (let j = 0; j <= m; j++) {
        const u = j / m, ang = s.a + (u - 0.5) * span, w = Math.max(0.5, th * ((_a = s.w) != null ? _a : 1) * (1 - brk * Math.pow(Math.abs(2 * u - 1), 1.6)));
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let o = -w / 2; o <= w / 2 + 0.01; o += 0.5) if (y + sa * (rr + o) * sy < maxY) p.dot(x + ca * (rr + o), y + sa * (rr + o) * sy, o > -0.26 ? c : c2, k);
      }
    }
  }
  function walk(R, x, y, a, L, { jit = 0.55, steer = 0.45, step = [2, 4], maxY = Infinity, d0 = 0 } = {}) {
    const pts = [[x, y, d0]];
    let d = 0, cur = a;
    while (d < L - 0.01) {
      const s = Math.min(L - d, R.range(step[0], step[1]));
      cur += R.range(-jit, jit) + (a - cur) * steer;
      x += Math.cos(cur) * s;
      y = clamp(y + Math.sin(cur) * s, 0.5, maxY);
      d += s;
      pts.push([x, y, d0 + d]);
    }
    return pts;
  }
  function makeCracks(R, n, { len: len2 = [14, 40], dive = 0.85, maxY = 22, forks = 0.5, x0 = [1, 5] } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, dip = 0.06 + Math.pow(R.next(), 1.7) * dive, L = R.range(len2[0], len2[1]) * (1 - 0.5 * dip / (dive + 0.06));
      const a = side > 0 ? dip : Math.PI - dip, pts = walk(R, side * R.range(x0[0], x0[1]), R.range(0.5, 1.5), a, L, { maxY });
      const c = { pts, len: L, t0: R.range(0, 0.035), kids: [] };
      for (let j = 2; j < pts.length - 1; j++)
        if (R.chance(forks * 0.4)) {
          const [fx, fy, fd] = pts[j];
          c.kids.push(walk(R, fx, fy, a + R.sign() * R.range(0.45, 1), R.range(3, 9) * (1 - 0.5 * j / pts.length), { maxY, d0: fd, jit: 0.7, step: [1.5, 3] }));
        }
      out.push(c);
    }
    return out;
  }
  function drawCracks(p, cracks3, g, heat2, hot, dark, lip, k = 1) {
    if (k <= 0) return;
    const col = (d) => {
      const h = heat2(d);
      return h > 0.75 ? hot[0] : h > 0.5 ? hot[1] : h > 0.3 ? hot[2] : h > 0.12 ? hot[3] : dark;
    };
    for (const c of cracks3) {
      const G = g(c);
      if (G <= 0) continue;
      for (const path of [c.pts, ...c.kids]) {
        for (let i = 1; i < path.length; i++) {
          const [x0, y0, d0] = path[i - 1], [x1, y1, d1] = path[i];
          if (d0 >= G) break;
          const f = d1 > G ? (G - d0) / (d1 - d0) : 1, ex = x0 + (x1 - x0) * f, ey = y0 + (y1 - y0) * f;
          p.line(x0, y0 + 1, ex, ey + 1, lip, (u) => rand(Math.round(x0 + (ex - x0) * u), Math.round(y0 + (ey - y0) * u), 5) < 0.3 ? k * 0.8 : 0);
          p.line(x0, y0, ex, ey, (u) => col(d0 + (d1 - d0) * f * u), k);
          const h = heat2(d0);
          if (h > 0.12) p.glow((x0 + ex) / 2, (y0 + ey) / 2, 4 + h * 4, hot[2], 0.22 * h * k);
        }
      }
    }
  }
  function frontCrescent(p, x, dir, h, w, cols, k = 1) {
    if (h < 1 || w < 0.3 || k <= 0) return;
    const ry = h * 0.8, cy = -h * 0.2, rx = Math.max(2, h * 0.55);
    const x0 = dir > 0 ? x - rx - w - 1 : x - 1, x1 = dir > 0 ? x + 1 : x + rx + w + 1;
    p.shade(x0, -h - 1, x1, 0, (px, py, out) => {
      if (py > 0) return;
      const ey = (py - cy) / ry;
      if (ey <= -1 || ey >= 1) return;
      const e2 = 1 - ey * ey, edge = rx * Math.sqrt(e2) - rx, wt = w * Math.pow(e2, 0.45), q = (edge - (px - x) * dir) / Math.max(0.5, wt);
      if (q < 0 || q > 1) return;
      out.c = q < 0.28 ? cols[0] : q < 0.62 ? cols[1] : cols[2];
      out.a = k * (ey < -0.8 ? 0.7 : 1) * (q > 0.7 ? 1.25 - q * 0.8 : 1);
    });
  }
  var rockShape = (R, n = 6) => Array.from({ length: n }, () => R.range(0.7, 1.12));
  function rock2(p, b, st) {
    const r = 0.75 + b.s * 0.8, n = b.pts.length, fade = Math.min(1, b.life / 0.5), ca = Math.cos(b.a), sa = Math.sin(b.a);
    p.shade(b.x - r - 2, b.y - r - 2, b.x + r + 2, b.y + r + 2, (x, y, out) => {
      const dx = x - b.x, dy = y - b.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca, d = Math.hypot(u, v);
      let ang = Math.atan2(v, u);
      if (ang < 0) ang += TAU;
      const f = ang / TAU * n, i = Math.floor(f) % n, w = f - Math.floor(f), edge = r * (b.pts[i] * (1 - w) + b.pts[(i + 1) % n] * w);
      if (d > edge + 0.85) return;
      out.a = fade;
      if (d > edge) return OUTLINE2;
      const lit = Math.cos((i + 0.5) / n * TAU + b.a - LIGHT2);
      if (d < edge * 0.42) return lit > 0.55 ? st.light : st.body;
      return lit > 0.35 ? st.light : lit < -0.4 ? st.shade : st.body;
    });
  }

  // vendor/pixelfx/fx/impacts/crit-hit.js
  var meta24 = {
    name: "Critical hit",
    desc: "A critical hit: a jagged starburst slams in white and overshoots, a ring breaks into flying arcs, sparks streak off, shards tumble to the floor under a big flare.",
    tags: ["impact", "hit", "crit", "critical", "combat", "directional", "one-shot"],
    size: [216, 136],
    origin: [84, 106],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#2a0510", "#5c0a1c", "#a3142a", "#e0302c", "#ff7a2a", "#ffc23d", "#fff09a", "#ffffff"], height: 26, aim: 0.12, seed: 3 }
  };
  var KEYS = [
    [0, 1, 1, 1, [6, 7, 7, 7]],
    [0.025, 1.3, 1, 1, [2, 5, 6, 7]],
    [0.058, 1.05, 0.72, 1, [2, 4, 5, 6]],
    [0.092, 1.22, 0.3, 1, [1, 2, 3, 4]],
    [0.125]
  ];
  function flare2(p, x, y, L, k, C) {
    for (const [dx, dy, len2] of [[1, 0, L], [0, 1, L * 0.45], [0.7, 0.7, L * 0.16], [0.7, -0.7, L * 0.16]])
      for (const s of [-1, 1])
        for (let d = 1; d <= len2; d++) {
          const u = d / len2, a = u < 0.7 ? 1 : k * (1.6 - u);
          p.dot(x + s * dx * d, y + s * dy * d, u < 0.35 ? WHITE : u < 0.7 ? C[6] : C[5], a);
          if (dy === 0 && u < 0.42) for (const e of [-1, 1]) p.dot(x + s * d, y + e, u < 0.2 ? C[6] : C[5], u < 0.3 ? 1 : k);
        }
    p.glowLine(x - L, y, x + L, y, 6, C[6], 0.5 * k);
    p.glowLine(x, y - L * 0.45, x, y + L * 0.45, 4, C[6], 0.3 * k);
  }
  function create10(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), X = 0, Y = -o.height, A = o.aim, floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [C[7], C[6], C[5], C[3]] });
    const bits = new Bits({ ground: floor3 }), lights = new Lights();
    const sp = spikes(R, 14, A, { len: [11, 15], w: [1.8, 2.5], fwd: 1.4, back: 0.6, jag: 0.5 });
    [...sp].sort((a, b) => b.len - a.len).slice(0, 2).forEach((s) => s.len *= 1.3);
    const segs = Array.from({ length: 7 }, (_, i) => {
      const a = A + i / 7 * TAU;
      return { a, gap: R.range(0.55, 0.85), dr: R.range(0.08, 0.4) + 0.15 * Math.max(0, Math.cos(a - A)), w: 0.7 + 0.5 * Math.max(0, Math.cos(a - A)) };
    });
    lights.add(X, Y, 84, C[5], 0.6, 0.5);
    lights.add(X, Y, 30, WHITE, 0.7, 0.1);
    lights.add(X, -4, 44, C[4], 0.3, 0.45);
    for (let i = 0; i < 36; i++) {
      const back = R.chance(0.22), a = (back ? A + Math.PI : A) + R.range(-1, 1) * (back ? 0.6 : 0.8), v = R.range(170, 430) * (back ? 0.6 : 1);
      ps.spawn(P.SPARK, X, Y, Math.cos(a) * v, Math.sin(a) * v - 50, R.range(0.15, 0.5), WHITE, 1, R.chance(0.3) ? R.range(0, 0.04) : 0);
    }
    for (let i = 0; i < 10; i++) {
      const a = A + R.range(-1, 1) * 1.1 - 0.35, v = R.range(110, 280);
      bits.add({ kind: B.SHARD, x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 0.8, drag: 0.7, bounce: 0.35, life: R.range(0.55, 0.85), a: R.range(0, TAU), va: R.range(-25, 25), s: R.range(2, 4.5), c: R.pick([C[7], C[6], C[6], C[5]]) });
    }
    for (let i = 0; i < 12; i++) {
      const a = A - Math.PI / 2 + R.range(-1.4, 1.4), v = R.range(35, 110);
      ps.spawn(P.MOTE, X + Math.cos(a) * 4, Y + Math.sin(a) * 4, Math.cos(a) * v, Math.sin(a) * v - 15, R.range(0.35, 0.7), R.pick([C[6], C[5], C[5]]), 0.6, R.range(0, 0.05));
    }
    for (let i = 0; i < 5; i++) {
      const a = R.range(0, TAU), d = R.range(14, 34);
      ps.spawn(P.STAR, X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.8, 0, -4, R.range(0.22, 0.38), R.chance(0.5) ? C[6] : WHITE, R.range(1.6, 3), R.range(0.08, 0.32));
    }
    let t = 0;
    return {
      update(dt) {
        t += dt;
        ps.update(dt);
        bits.update(dt);
        lights.update(dt);
      },
      draw(p) {
        const u = clamp((t - 0.03) / 0.37);
        if (t >= 0.03 && u < 1) {
          const r = 10 + 30 * ease.outCubic(u), brk = smooth(0.12, 0.6, u), th = Math.max(1, 3.6 * Math.pow(1 - u, 1.2));
          const i = u < 0.12 ? 7 : u < 0.3 ? 6 : u < 0.5 ? 5 : u < 0.75 ? 4 : 3;
          brokenRing(p, X, Y, r, th, segs, brk, C[i], C[Math.max(2, i - 2)], u < 0.6 ? 1 : (1 - u) / 0.4, 1, 0);
          if (u < 0.6) p.glowRing(X, Y, r, 6, C[5], 0.35 * Math.pow(1 - u / 0.6, 2));
        }
        bits.draw(p);
        ps.draw(p);
        const f = (t - 0.04) / 0.28;
        if (f > 0 && f < 1) {
          flare2(p, X, Y, 64 * Math.pow(1 - f, 1.3), 1 - f, C);
          p.glow(X, Y, 56, C[5], 0.4 * (1 - f));
        }
        for (let i = 0; i < KEYS.length - 1; i++)
          if (t >= KEYS[i][0] && t < KEYS[i + 1][0]) {
            const [, sc, th, a, cols] = KEYS[i];
            star2(p, X, Y, sp, sc, th, cols.map((j) => C[j]), a, 2.6);
          }
        const pop = Math.exp(-t / 0.05);
        if (pop > 0.02) {
          p.glow(X, Y, 44, C[5], 0.4 * pop);
          p.glow(X, Y, 12, WHITE, 0.6 * pop);
        }
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/impacts/blunt-hit.js
  var blunt_hit_exports = {};
  __export(blunt_hit_exports, {
    create: () => create11,
    meta: () => meta25
  });
  var meta25 = {
    name: "Blunt hit",
    desc: "A heavy, soft thud: a white-hot lumpy blob cools to cream in a warm pool of light, inked wedges jab out and snap back, a squashed ring of dust puffs swells and drifts, clods drop.",
    tags: ["impact", "hit", "blunt", "punch", "club", "thump", "dust", "comic", "one-shot"],
    size: [128, 88],
    origin: [64, 72],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#1d1620", "#4a3a3c", "#7d6a66", "#b09c90", "#dccab4", "#f6ead2", "#ffffff"], warm: "#ffc98a", dust: "#b7a8a6", clod: "#6e5a5a", height: 22, seed: 9 }
  };
  var lump = (r, a, ph) => r * (1 + 0.15 * Math.sin(5 * a + ph) + 0.08 * Math.sin(9 * a + ph * 2.3));
  function create11(o) {
    const C = fit(o.palette, 7), R = new Rng(o.seed), X = 0, Y = -o.height, PH = R.range(0, TAU), floor3 = () => 0;
    const WARM2 = hex(o.warm), DUST3 = hex(o.dust), st = stone2(o.clod);
    const lights = new Lights(), bits = new Bits({ ground: floor3 });
    lights.add(X, Y, 48, WARM2, 0.6, 0.4);
    lights.add(X, Y, 16, WHITE, 0.6, 0.07);
    lights.add(X, -2, 36, WARM2, 0.25, 0.4);
    const wedges = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU + R.range(-0.2, 0.2), len: R.range(6, 15), w: R.range(3.2, 5), r0: R.range(13, 16), t0: R.range(0.015, 0.04), out: R.range(0.04, 0.06), back: R.range(0.09, 0.14) }));
    const puffs = Array.from({ length: 30 }, (_, i) => {
      const a = i / 30 * TAU + R.range(-0.12, 0.12), side = Math.abs(Math.cos(a)), v = R.range(40, 140) * (0.6 + 0.5 * side);
      return { x: X + Math.cos(a) * 9, y: Y + Math.sin(a) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, r: R.range(2.4, 6.2) * (0.75 + 0.35 * side), life: R.range(0.35, 0.85), max: 0, t0: R.range(0.03, 0.1), lift: R.range(4, 16) };
    });
    for (let i = 0; i < 5; i++)
      puffs.push({ x: X + R.range(-6, 6), y: Y - R.range(3, 6), vx: R.range(-30, 30), vy: -R.range(20, 45), r: R.range(3.5, 5.5), life: R.range(0.6, 0.85), max: 0, t0: R.range(0.05, 0.1), lift: R.range(14, 24) });
    for (const q of puffs) q.max = q.life;
    for (let i = 0; i < 5; i++) {
      const s = R.sign(), a = -Math.PI / 2 + s * R.range(0.5, 1.3), v = R.range(70, 140);
      bits.add({ kind: B.CHUNK, x: X + s * R.range(4, 8), y: Y + R.range(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1, drag: 0.6, bounce: 0.28, life: R.range(0.65, 0.85), a: R.range(0, TAU), va: s * R.range(8, 16), s: R.chance(0.4) ? 2 : 1, pts: rockShape(R), pvy: 0 });
    }
    const kicks = [];
    let t = 0;
    return {
      update(dt) {
        var _a;
        t += dt;
        for (const q of puffs) {
          if (t < q.t0) continue;
          q.life -= dt;
          q.vx -= q.vx * 4.5 * dt;
          q.vy -= q.vy * 4.5 * dt + ((_a = q.lift) != null ? _a : 6) * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
        }
        for (const b of bits.list) b.pvy = b.vy;
        bits.update(dt);
        for (const b of bits.list)
          if (b.pvy > 60 && b.vy <= 0) {
            for (let i = 0; i < 2; i++) kicks.push({ x: b.x, y: -1, vx: R.sign() * R.range(8, 22), vy: -R.range(3, 10), r: R.range(1.2, 2), life: 0.4, max: 0.4, t0: 0 });
            b.pvy = 0;
          }
        for (const q of kicks) {
          q.life -= dt;
          q.vx -= q.vx * 4 * dt;
          q.vy -= q.vy * 4 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
        }
        lights.update(dt);
      },
      draw(p) {
        for (const q of [...puffs, ...kicks]) {
          const k = q.life / q.max;
          if (t < q.t0 || k <= 0) continue;
          const r = q.r * (0.7 + (1 - k) * 0.85), a = Math.pow(k, 1.25) * Math.min(1, (t - q.t0) / 0.03), c = mix(DUST3, WARM2, clamp(1 - (t - 0.03) / 0.25) * 0.55);
          p.disc(q.x, q.y, r, c, (d) => 0.58 * a * (1 - d * d * 0.75));
          p.disc(q.x - r * 0.22, q.y - r * 0.32, r * 0.58, mix(c, WHITE, 0.55), (d) => 0.48 * a * (1 - d * d));
        }
        for (const b of bits.list) rock2(p, b, st);
        if (t < 0.058) {
          const f = t < 0.025 ? 0 : 1, R02 = f ? 13.5 : 11.5;
          p.shade(X - R02 * 1.4, Y - R02 * 1.4, X + R02 * 1.4, Y + R02 * 1.4, (x, y) => {
            const dx = x - X, dy = (y - Y) * (f ? 1.25 : 1.1), d = Math.hypot(dx, dy), ro = lump(R02, Math.atan2(dy, dx), PH + f * 0.6);
            if (d > ro) return;
            const q = d / ro;
            return f === 0 ? q < 0.55 ? WHITE : q < 0.86 ? C[5] : C[4] : q < 0.3 ? WHITE : q < 0.72 ? C[5] : q < 0.9 ? C[4] : C[3];
          });
        }
        for (const w of wedges) {
          const u = t - w.t0;
          if (u < 0 || u > w.out + w.back) continue;
          const s = u < w.out ? ease.outCubic(u / w.out) : 1 - ease.inQuad((u - w.out) / w.back), L = w.len * s;
          if (L < 1.5) continue;
          const ca = Math.cos(w.a), sa = Math.sin(w.a), r0 = w.r0 + 2 * s, hw = w.w * (0.6 + 0.4 * s) / 2;
          const tip = [X + ca * r0, Y + sa * r0], end = [X + ca * (r0 + L), Y + sa * (r0 + L)], n = [-sa * hw, ca * hw];
          const wedge = (g) => [[tip[0] - ca * g, tip[1] - sa * g], [end[0] + n[0] * (1 + g * 0.45) + ca * g, end[1] + n[1] * (1 + g * 0.45) + sa * g], [end[0] - n[0] * (1 + g * 0.45) + ca * g, end[1] - n[1] * (1 + g * 0.45) + sa * g]];
          p.poly(wedge(1), C[1]);
          p.poly(wedge(0), u < w.out + 0.02 ? WHITE : C[5]);
        }
        const pop = Math.exp(-t / 0.06);
        if (pop > 0.02) p.glow(X, Y, 28, WARM2, 0.5 * pop);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/impacts/ground-slam.js
  var ground_slam_exports = {};
  __export(ground_slam_exports, {
    create: () => create12,
    meta: () => meta26
  });
  var meta26 = {
    name: "Ground slam",
    desc: "Something lands hard: the floor flashes and cracks, two crescent shock waves race out along it, a dust wave and a tall dust cloud rise, rocks erupt, bounce and settle.",
    tags: ["impact", "ground", "slam", "shockwave", "quake", "rocks", "dust", "one-shot"],
    size: [288, 208],
    origin: [144, 164],
    duration: 3.2,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#2a1712", "#5e2c1c", "#a4502a", "#e8893a", "#ffc764", "#fff0b4", "#ffffff"], stone: "#4a3f69", reach: 104, seed: 5 }
  };
  var WAVE = 0.6;
  function crater(p, st, hot, C, k) {
    for (let x = -12; x <= 11; x++) {
      const q = Math.abs(x + 0.5) / 12, dep = Math.round(2.6 * (1 - q * q));
      if (q < 0.84) {
        for (let y = 0; y < dep; y++) p.dot(x, y, SOOT2, k);
        p.dot(x, dep, hot > 0.5 ? C[5] : hot > 0.2 ? C[4] : st.lip, k);
      } else {
        p.dot(x, -1, q > 0.93 ? st.light : st.lip, k);
        if (q < 0.9) p.dot(x, -2, st.light, k * 0.8);
      }
    }
  }
  function create12(o) {
    const C = fit(o.palette, 7), st = stone2(o.stone), REACH2 = o.reach, R = new Rng(o.seed), floor3 = () => 0, D16 = meta26.duration;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [C[6], C[5], C[4], C[3]] });
    const bits = new Bits({ ground: floor3 }), lights = new Lights(), HOT3 = [WHITE, C[5], C[4], C[3]];
    const dustLit = mix(st.dust, WHITE, 0.2), cracks3 = makeCracks(R, 10, { len: [22, 58], dive: 0.55, maxY: 22, forks: 0.7, x0: [2, 9] });
    const front = (t2) => 7 + (REACH2 - 7) * ease.outCubic(clamp((t2 - 0.015) / WAVE));
    const heat2 = (t2) => Math.pow(clamp(1 - t2 / 0.8), 1.4);
    const crest = (u) => [6 + 28 * Math.pow(1 - u, 0.75), 1.5 + 5 * Math.pow(1 - u, 0.9)];
    const burst = [
      { a: -0.07, len: R.range(34, 40), w: 1.9 },
      { a: Math.PI + 0.07, len: R.range(34, 40), w: 1.9 },
      { a: -0.42 + R.range(-0.08, 0.08), len: R.range(15, 20), w: 1.5 },
      { a: -Math.PI + 0.42 + R.range(-0.08, 0.08), len: R.range(15, 20), w: 1.5 },
      { a: -Math.PI / 2 + R.range(-0.15, 0.15), len: R.range(18, 24), w: 1.7 },
      { a: -1.05 + R.range(-0.1, 0.1), len: R.range(10, 14), w: 1.2 },
      { a: -Math.PI + 1.05 + R.range(-0.1, 0.1), len: R.range(10, 14), w: 1.2 }
    ];
    const embers = [];
    for (const c of cracks3)
      for (const [x, y, d] of c.pts) if (d > 3 && d < 32 && R.chance(0.25)) embers.push({ x, y, d, life: R.range(0.8, 2.2), ph: R.range(0, TAU) });
    lights.add(0, -12, 96, C[4], 0.6, 0.6);
    lights.add(0, -4, 50, WHITE, 0.9, 0.14);
    for (let i = 0; i < 56; i++) {
      const low = i < 14, s = R.sign(), a = low ? s > 0 ? -R.range(0.04, 0.6) : Math.PI + R.range(0.04, 0.6) : -Math.PI / 2 + R.range(-1.15, 1.15);
      const sp = low ? R.range(150, 380) : R.range(200, 500);
      ps.spawn(P.SPARK, R.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, low ? R.range(0.2, 0.5) : R.range(0.25, 0.65), WHITE, 1, low ? 0 : R.range(0, 0.05));
    }
    for (let i = 0; i < 20; i++) {
      const s = i < 3 ? 4 : R.int(1, 3), a = -Math.PI / 2 + R.range(-0.5, 0.5), sp = s > 3 ? R.range(110, 190) : R.range(170, 380) * (s > 2 ? 0.8 : 1);
      bits.add({ kind: B.CHUNK, x: R.range(-7, 7), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.4, bounce: 0.38, life: R.range(1.9, 2.7), a: R.range(0, TAU), va: R.range(-14, 14), s, pts: rockShape(R), pvy: 0 });
    }
    for (let i = 0; i < 110; i++) {
      const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.65, sp = R.range(110, 380) * (1 - 0.35 * Math.abs(u));
      ps.spawn(P.GRIT, u * 6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 2.2), R.pick([st.light, st.body, st.body, st.shade, st.shade, st.lip]), R.chance(0.35) ? 2 : 1);
    }
    for (let i = 0; i < 28; i++) {
      const core = i < 14, s = R.sign();
      ps.spawn(P.SMOKE, core ? R.range(-5, 5) : s * R.range(4, 12), -R.range(2, 10), core ? R.range(-12, 12) : s * R.range(14, 38), -R.range(50, 130) * (core ? 1 : R.range(0.3, 0.6)), R.range(1.9, 2.7), R.chance(0.35) ? dustLit : st.dust, core ? R.range(4.5, 9) : R.range(4, 7.5), R.range(0.02, 0.22), PF.BIG);
    }
    for (let i = 0; i < 10; i++) {
      const s = R.sign();
      ps.spawn(P.SMOKE, s * R.range(2, 14), -R.range(2, 6), s * R.range(20, 70), -R.range(4, 20), R.range(1.4, 2.3), st.dust, R.range(6, 9), R.range(0, 0.08), PF.BIG);
    }
    for (let i = 0; i < 26; i++)
      ps.spawn(P.FLAKE, R.range(-22, 22), -R.range(14, 80), R.range(-12, 12), R.range(-10, 4), R.range(1.2, 2), R.chance(0.5) ? st.lip : dustLit, R.range(0.5, 1.2), R.range(0.25, 1));
    let t = 0;
    const acc = [R.next(), R.next()];
    const ring = (p, back) => {
      const u = clamp((t - 0.015) / (WAVE + 0.1));
      if (t < 0.015 || u >= 0.9) return;
      band(
        p,
        0,
        0.5,
        front(t) + 1,
        0.16,
        Math.max(1, 4 * Math.pow(1 - u, 0.8)),
        u < 0.55 ? 1.1 : (0.9 - u) / 0.35,
        u < 0.35 ? [C[3], C[4], C[5], C[6]] : [st.body, st.light, C[4], C[5]],
        (g) => Math.sin(g) < 0 === back,
        t < 0.09
      );
    };
    const fronts = (p) => {
      const u = clamp((t - 0.03) / (WAVE + 0.16));
      if (t < 0.03 || u >= 1) return;
      const fr = front(t), [h, w] = crest(u), k = u < 0.7 ? 1 : (1 - u) / 0.3;
      const cols = u < 0.14 ? [WHITE, C[6], C[5]] : u < 0.34 ? [C[6], C[5], C[4]] : u < 0.55 ? [C[5], C[4], st.lip] : [st.lip, st.light, st.dust];
      for (const s of [-1, 1]) {
        frontCrescent(p, s * fr, s, h, w, cols, k);
        p.glow(s * fr, -h * 0.3, 8 + h * 0.7, C[4], 0.5 * (1 - u) * k);
      }
    };
    return {
      update(dt) {
        t += dt;
        const u = clamp((t - 0.015) / WAVE);
        if (u > 0 && u < 1) {
          const fr = front(t), [h] = crest(u);
          for (let k = 0; k < 2; k++) {
            const s = k ? 1 : -1;
            for (acc[k] += dt * 120 * (1 - u * 0.7); acc[k] > 1; acc[k]--) {
              ps.spawn(P.SMOKE, s * (fr - R.range(1, 7)), -R.range(0.5, 3), s * R.range(15, 70) * (1 - u), -R.range(2, 12), R.range(1, 2.1), R.chance(0.3) ? dustLit : st.dust, R.range(2.5, 6.5) * (1 - 0.4 * u), 0, PF.BIG);
              if (R.chance(0.5)) ps.spawn(P.DUST, s * (fr - R.range(0, 3)), -R.range(0.3, 0.9) * h, s * R.range(-15, 25), -R.range(8, 35), R.range(0.3, 0.6), R.chance(0.5) ? dustLit : st.dust, R.range(1.2, 2.4));
              if (R.chance(0.4)) ps.spawn(P.GRIT, s * fr, -1, s * R.range(10, 60), -R.range(40, 140) * (1 - u), R.range(0.5, 1), R.pick([st.light, st.body, st.lip]), 1);
              if (u < 0.45 && R.chance(0.2)) ps.spawn(P.SPARK, s * fr, -1, s * R.range(60, 200), -R.range(30, 160), R.range(0.12, 0.3));
            }
          }
        }
        for (const b of bits.list) b.pvy = b.vy;
        bits.update(dt);
        for (const b of bits.list)
          if (b.pvy > 70 && b.vy <= 0) {
            const n = b.pvy > 200 ? 3 : 2;
            for (let i = 0; i < n; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 16), R.range(0.3, 0.65), st.dust, R.range(1.3, 2.4) * (0.7 + b.s * 0.25));
            b.pvy = 0;
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const fade = 1 - smooth(D16 - 0.9, D16 - 0.15, t), H3 = heat2(t);
        if (t > 0.02) crater(p, st, H3, C, fade);
        drawCracks(p, cracks3, (c) => c.len * ease.outCubic(clamp((t - c.t0) / 0.1)), (d) => H3 * clamp(1.2 - d / 40), HOT3, SOOT2, st.light, fade);
        for (const e of embers) {
          const k = 1 - (t - 0.1) / e.life;
          if (t < 0.1 || k <= 0) continue;
          const f = 0.6 + 0.4 * Math.sin(t * 23 + e.ph);
          p.px(e.x, e.y, k * f > 0.55 ? C[5] : k * f > 0.25 ? C[4] : C[3]);
          p.glow(e.x, e.y, 4, C[4], 0.35 * k * f);
        }
        ring(p, true);
        ps.draw(p, "back");
      },
      draw(p) {
        ring(p, false);
        fronts(p);
        for (const b of bits.list) rock2(p, b, st);
        ps.draw(p, "front");
        if (t < 0.035) {
          p.ellipse(0, 0, 30, 4.5, (d) => d > 0.8 ? C[4] : d > 0.5 ? C[6] : WHITE);
          star2(p, 0, -1, burst, 1, 1, [C[4], C[6], WHITE, WHITE]);
        } else if (t < 0.07) star2(p, 0, -1, burst, 1.25, 0.5, [C[3], C[5], C[6], WHITE]);
        if (t < 0.14) p.glowLine(-80, 0, 80, 0, 10, C[5], 0.55 * (1 - t / 0.14));
        const H3 = heat2(t);
        if (H3 > 0) p.glow(0, 1, 46, C[4], 0.35 * H3);
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/fire/fireball.js
  var fireball_exports = {};
  __export(fireball_exports, {
    draw: () => draw15,
    meta: () => meta27
  });

  // vendor/pixelfx/fx/fire/_lib.js
  function pnoise(x, period, seed = 0) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const a = rand(wrap(i, period), seed), b = rand(wrap(i + 1, period), seed);
    return (a + (b - a) * u) * 2 - 1;
  }
  function noiseFor(D16) {
    if (!D16) return (tt, rate, seed = 0, off = 0) => noise(tt * rate + off, seed);
    return (tt, rate, seed = 0, off = 0) => {
      const P4 = Math.max(1, Math.round(rate * D16));
      return pnoise(tt / D16 * P4 + off, P4, seed);
    };
  }
  function looped(t, D16, count, seed, make, draw17) {
    for (let i = 0; i < count; i++) {
      const r = rng(seed, i), born = r.next() * D16, q = make(r, i);
      for (let age = wrap(t - born, D16); age < q.life; age += D16) draw17(q, age, i);
    }
  }
  var hotFirst = (F) => [...F].reverse();
  var LAYERS5 = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];
  function flameTongue(p, x, y, h, w, sx, N3, n, H3, layers = LAYERS5, jit = 0.5, wob = 1.1) {
    if (h < 1) return;
    for (const [lw, lh, ri] of layers) {
      const L = h * lh, c = H3[ri];
      for (let r = 0; r <= L; r++) {
        const u = r / Math.max(1, L);
        const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N3(9, n, r * 0.45) * jit;
        if (half < 0.3) continue;
        const cx = x + sx * u * u * lh + N3(4, n + 7, r * 0.2) * u * wob, Y = Math.round(y - r);
        for (let px = Math.round(cx - half), x1 = Math.round(cx + half); px <= x1; px++) p.px(px, Y, c);
      }
    }
  }
  function flameBlade(p, x, y, ux, uy, len2, w, bend2, N3, n, H3, layers = LAYERS5, jit = 0.5, wob = 1.1) {
    if (len2 < 1) return;
    const nx = -uy, ny = ux;
    for (const [lw, lh, ri] of layers) {
      const L = len2 * lh, c = H3[ri];
      for (let r = 0; r <= L; r += 0.5) {
        const u = r / Math.max(1, L);
        const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + N3(9, n, r * 0.45) * jit;
        if (half < 0.3) continue;
        const off = bend2 * u * u * lh + N3(4, n + 7, r * 0.2) * u * wob, cx = x + ux * r + nx * off, cy = y + uy * r + ny * off;
        for (let q = -half; q <= half; q += 0.5) p.px(cx + nx * q, cy + ny * q, c);
      }
    }
  }
  function solid(p, x, y, r, c) {
    if (r < 0.6) return p.px(x, y, c);
    const cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
    for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
      const dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
      if (s2 < 0) continue;
      const s = Math.sqrt(s2);
      for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.put(sx, sy, c, 1);
    }
  }
  function soft(p, x, y, r, c, a) {
    if (a <= 4e-3) return;
    if (r < 0.5) return p.blend(x, y, c, a);
    const cx = p.toX(x, y), cy = p.toY(x, y), r2 = r * r;
    for (let sy = Math.floor(cy - r); sy <= Math.ceil(cy + r); sy++) {
      const dy = sy + 0.5 - cy, s2 = r2 - dy * dy;
      if (s2 < 0) continue;
      const s = Math.sqrt(s2);
      for (let sx = Math.ceil(cx - s - 0.5); sx <= Math.floor(cx + s - 0.5); sx++) p.blendPx(sx, sy, c, a);
    }
  }
  function firePuff(p, x, y, k, size, frac, H3, glowK = 0.18, tx = 0, ty = -1) {
    const age = 1 - k, n = H3.length, heat2 = Math.min(0.999, Math.pow(age, 0.62) + frac * 0.1);
    const idx = Math.min(n - 2, Math.floor(heat2 * (n - 1)));
    const r = size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = H3[idx];
    if (idx >= n - 2) return soft(p, x, y, r, c, Math.min(1, k * 3) * 0.85);
    solid(p, x, y, r, H3[Math.min(n - 1, idx + 2)]);
    if (r > 1.6 && ty > -0.99) solid(p, x + tx * r * 1.5, y + ty * r * 1.5, r * 0.3, H3[Math.min(n - 1, idx + 1)]);
    solid(p, x - r * 0.16, y - r * 0.22, r * 0.78, c);
    if (r > 1.6) solid(p, x + tx * r * 0.9, y + ty * r * 0.9, r * 0.42, c);
    if (idx <= 3 && r > 1.8) solid(p, x - r * 0.28, y - r * 0.34, r * 0.36, H3[Math.max(0, idx - 1)]);
    if (idx < 6) p.glow(x, y, r * 2.4 + 2, c, glowK * k);
  }
  var rampAt2 = (r, t) => r[Math.min(r.length - 1, Math.max(0, Math.floor(t * r.length)))];
  function smokePuff(p, x, y, k, size, col = 0, big = false, aMul = 1) {
    const age = 1 - k;
    const r = size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4));
    const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58) * aMul;
    const c = col ? mix(col, rampAt2(SMOKE_RAMP, age), age) : rampAt2(SMOKE_RAMP, age * 1.05);
    soft(p, x, y, r, c, a * 0.45);
    soft(p, x + r * 0.05, y + r * 0.06, r * 0.74, c, a * 0.62);
    if (age < 0.5) soft(p, x - r * 0.22, y - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
  }
  function ember(p, x, y, k, size, cols, ph) {
    if (k < 0.25 && Math.sin(ph) < 0) return;
    const c = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
    if (size >= 2) {
      const rim = k > 0.45 ? cols[2] : cols[3];
      p.px(x - 1, y, rim), p.px(x + 1, y, rim), p.px(x, y - 1, rim), p.px(x, y + 1, rim);
      p.px(x, y, c);
      p.glow(x, y, 8, c, 0.4 * k);
      return;
    }
    p.px(x, y, c);
    if (size > 1.4) p.px(x, y + 1, cols[3]);
    p.glow(x, y, 3 + size, c, 0.35 * k);
  }
  function spark(p, x, y, vx, vy, k, cols) {
    const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp, len2 = Math.min(9, 1 + sp * 0.022);
    const head4 = k > 0.6 ? cols[0] : k > 0.3 ? cols[1] : cols[2];
    p.line(x - ux * len2, y - uy * len2, x - ux * len2 * 0.4, y - uy * len2 * 0.4, k > 0.5 ? head4 : cols[cols.length - 1]);
    p.line(x - ux * len2 * 0.45, y - uy * len2 * 0.45, x, y, head4);
    p.glow(x, y, 3, head4, 0.45 * k);
  }
  function along2(x, v, a, k, t) {
    if (k <= 0) return [x + v * t + 0.5 * a * t * t, v + a * t];
    const e = Math.exp(-k * t), vt = a / k;
    return [x + vt * t + (v - vt) * (1 - e) / k, vt + (v - vt) * e];
  }
  function drift2(x, y, vx, vy, t, ax, ay, kx, ky) {
    const X = along2(x, vx, ax, kx, t), Y = along2(y, vy, ay, ky, t);
    return [X[0], Y[0], X[1], Y[1]];
  }
  function floorLight(p, x, y, rx, ry, c, k) {
    if (k <= 4e-3 || rx < 1 || ry < 0.5) return;
    p.shade(x - rx, y - ry, x + rx, y + ry, (px, py, out) => {
      const dx = (px - x) / rx, dy = (py - y) / ry, d = dx * dx + dy * dy;
      if (d >= 1) return;
      const f = 1 - Math.sqrt(d);
      out.l = c;
      out.k = f * f * k;
    });
  }
  function simDraw(p, ps, H3, layer3) {
    const all = ps.list, rest = [], fire = [];
    for (const q of all) (q.k === P.FIRE ? fire : rest).push(q);
    const puffs = (back) => {
      for (const q of fire) if (q.delay <= 0 && !!(q.flag & PF.BACK) === back) firePuff(p, q.x, q.y, q.life / q.max, q.size, q.seed % 1, H3);
    };
    ps.list = rest;
    if (layer3 !== "front") ps.draw(p, "back"), puffs(true);
    if (layer3 !== "back") puffs(false), ps.draw(p, "front");
    ps.list = all;
  }
  var SMOKE1 = hex("#5b5566");

  // vendor/pixelfx/fx/fire/fireball.js
  var meta27 = {
    name: "Fireball",
    desc: "A fireball flying right: a churning white-hot head with a corona of flame, a long torn tail of flame puffs cooling into smoke, embers shed behind.",
    tags: ["fire", "fireball", "projectile", "magic", "directional", "loop"],
    size: [136, 56],
    origin: [112, 28],
    duration: 1.2,
    loop: true,
    fps: 30,
    bg: "dark",
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      radius: 5,
      speed: 120,
      seed: 5
    }
  };
  var D15 = meta27.duration;
  var NL = noiseFor(D15);
  var SMOKE12 = hex("#5b5566");
  var BODY = [[30, 4.2, 0], [23, 4.4, -1.6], [22, 4.4, 1.6], [15, 4.6, 0]];
  var CORONA = [[-1.3, 6, 1.1], [-1.8, 8, 1.2], [-2.3, 7, 1.1], [1.3, 6, 1.1], [1.8, 8, 1.2], [2.3, 7, 1.1]];
  function head3(p, H3, t, R02, S2, hx, hy) {
    const ph = t / D15;
    p.shade(hx - R02 * 2.4, hy - R02 * 1.7, hx + R02 * 1.5, hy + R02 * 1.7, (x, y, out) => {
      x -= hx;
      y -= hy;
      const d = Math.hypot(x, y), th = Math.atan2(y, x), back = Math.max(0, -Math.cos(th)), a = th / TAU;
      const bump = 0.55 * pnoise(a * 9 + ph * 9, 9, S2) + 0.35 * pnoise(a * 5 - ph * 10, 5, S2 + 1);
      const rim = R02 * (1 + 0.55 * back * back) + bump;
      if (d > rim) return;
      const swirl = pnoise(a * 5 - ph * 10 + d * 0.45, 5, S2 + 2);
      const h = 1 - d / rim + 0.26 * swirl + 0.1 * (1 - back);
      if (rim - d < 1 && back < 0.3) return h > 0.3 ? H3[3] : H3[5];
      return h > 0.74 ? H3[0] : h > 0.58 ? H3[1] : h > 0.42 ? H3[2] : h > 0.27 ? H3[4] : h > 0.13 ? H3[5] : H3[6];
    });
  }
  function draw15(p, t, o) {
    const F = fit(o.palette, 9), H3 = hotFirst(F), S2 = o.seed, R02 = o.radius, V = o.speed;
    const N3 = (rate, seed = 0, off = 0) => NL(t, rate, seed, off);
    const GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), SMOKE = mix(SMOKE12, H3[6], 0.3), SPARKS = [H3[1], H3[2], H3[4], H3[5]], EMB = [H3[1], H3[2], H3[4], H3[6]];
    const hx = N3(3, S2 + 50) * 0.5, hy = N3(2.5, S2 + 51) * 0.7;
    const fire = [], smoke = [];
    looped(t, D15, 130, S2 + 100, (r) => {
      const fl2 = r.range(0.22, 0.55), sm = r.chance(0.55), x = -r.range(2, 24);
      return { x, y: r.range(-1, 1) * (R02 - 0.1 * -x), v: V * r.range(0.3, 0.6), vy: r.range(-16, 16), fl: fl2, sm, sl: r.range(0.25, 0.45), s: r.range(1.3, 2.9), f: r.next() * 0.5 + 0.5 * (-x / 24), life: fl2 + (sm ? 0.45 : 0) };
    }, (q, age) => {
      const ta = Math.min(age, q.fl), [wx, y, wvx, vy] = drift2(0, q.y, q.v, q.vy, ta, 0, -70, 4.5, 3);
      const x = q.x + wx - V * ta;
      if (age < q.fl) return fire.push([age, x, y, q]);
      if (!q.sm || age - q.fl > q.sl) return;
      const sa = age - q.fl, [sx, sy] = drift2(x, y, wvx - V, vy * 0.6 - 6, sa, V * 2, -30, 2, 1.2);
      smoke.push([sa, sx, sy, q]);
    });
    for (const [sa, x, y, q] of smoke) smokePuff(p, x, y, 1 - sa / q.sl, q.s * 0.9, SMOKE);
    fire.sort((a, b) => b[0] - a[0]);
    for (const [age, x, y, q] of fire) {
      const u = age / q.fl;
      firePuff(p, x, y, 1 - u, q.s * (1 + 1.3 * u), q.f, H3, 0.07, -0.86, -0.5);
    }
    BODY.forEach(([len2, w, dy], i) => {
      const n = (S2 * 5 + i) * 17, L = len2 * (0.82 + 0.25 * N3(4, n)) * (1 + 0.3 * Math.max(0, N3(2.4, n + 3)));
      flameBlade(p, hx + 1, hy + dy * 0.5, -1, dy * 0.02, L, w * R02 / 5, N3(3, n + 5) * 3 + dy, N3, n, H3, LAYERS5, 0.5, 1.1 + L * 0.05);
    });
    CORONA.forEach(([a, len2, w], i) => {
      const n = (S2 * 5 + i + 20) * 17, L = len2 * (0.7 + 0.4 * (0.5 + 0.5 * N3(6, n))), ox = Math.cos(a) * R02 * 0.85, oy = Math.sin(a) * R02 * 0.85;
      const dx = Math.cos(a) * 0.55 - 1, dy = Math.sin(a) * 0.55, l = Math.hypot(dx, dy);
      flameBlade(p, hx + ox, hy + oy, dx / l, dy / l, L, w, -Math.sign(a) * 1.5, N3, n, H3, LAYERS5);
    });
    head3(p, H3, t, R02, S2, hx, hy);
    looped(t, D15, 26, S2 + 200, (r) => ({ a: r.range(-2.4, 2.4), v: r.range(30, 70), life: r.range(0.08, 0.18) }), (q, age) => {
      const ca = Math.cos(q.a), sa = Math.sin(q.a), d = R02 * 0.9 + q.v * age, x = hx + ca * d - V * 0.4 * age, y = hy + sa * d;
      const k = 1 - age / q.life, L = 1 + 2 * k;
      p.line(x - ca * L + V * 0.02, y - sa * L, x, y, k > 0.5 ? H3[1] : H3[3]);
      p.glow(x, y, 3, H3[2], 0.4 * k);
    });
    looped(t, D15, 30, S2 + 300, (r) => ({ x: -r.range(2, 16), y: r.range(-3, 3), v: V * r.range(0.3, 0.8), vy: r.range(-20, 20), life: r.range(0.25, 0.55), big: r.chance(0.25), ph: r.range(0, 6.3) }), (q, age) => {
      const [wx, y, wvx, vy] = drift2(0, q.y, q.v, q.vy, age, 0, 50, 3, 2);
      const x = q.x + wx - V * age, k = 1 - age / q.life;
      if (q.big) ember(p, x, y, k, 2, EMB, age * 40 + q.ph);
      else spark(p, x, y, wvx - V, vy, k, SPARKS);
    });
    const fl = 0.85 + 0.15 * N3(9, S2 + 7);
    p.glowLine(hx - 6, hy, -50, -2, 12, GLOW, 0.2 * fl);
    p.glow(hx - 2, hy, 42, GLOW, 0.42 * fl);
    p.glow(hx, hy, 13, H3[1], 0.3 * fl);
  }

  // vendor/pixelfx/fx/fire/flame-pillar.js
  var flame_pillar_exports = {};
  __export(flame_pillar_exports, {
    create: () => create13,
    meta: () => meta28
  });
  var meta28 = {
    name: "Flame pillar",
    desc: "The floor cracks and glows, a column of fire erupts white-hot and roars, spewing embers and shedding flame, then collapses into rolling smoke.",
    tags: ["fire", "pillar", "eruption", "spell", "ground", "one-shot"],
    size: [184, 256],
    origin: [92, 232],
    duration: 5,
    loop: false,
    fps: 30,
    bg: "ground",
    options: {
      palette: ["#4a1712", "#8a1f17", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6", "#ffffff"],
      stone: "#4a3f69",
      height: 140,
      seed: 5
    }
  };
  var ERUPT = 0.55;
  var RISE = 0.12;
  var FALL = 1.95;
  var GONE = 2.45;
  var SOOT3 = hex("#0d0a12");
  var OUTLINE3 = hex("#1a1422");
  var WARM = rgb(255, 176, 96);
  function stone3(c) {
    c = hex(c);
    return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
  }
  function rock3(p, b, st) {
    const r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5), lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      const lit = dx * lx + dy * ly;
      out.c = d > r ? OUTLINE3 : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body;
      out.a = fade;
    });
  }
  function create13(o) {
    const F = fit(o.palette, 9), H3 = hotFirst(F), HMAX = o.height, st = stone3(o.stone), R = new Rng(o.seed), floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [H3[1], H3[2], H3[4], H3[5]] });
    const bits = new Bits({ ground: floor3 }), lights = new Lights();
    const GLOW = mix(mix(H3[3], H3[4], 0.5), WHITE, 0.25), S2 = o.seed * 13;
    const cracks3 = [];
    const crack = (x, y, a, len2, t0, w) => {
      const pts = [[x, y]];
      for (let d = 0; d < len2; d += 2) a += R.range(-0.55, 0.55), x += Math.cos(a) * 2, y += Math.sin(a) * 0.76, pts.push([x, y]);
      cracks3.push({ pts, t0, grow: R.range(0.22, 0.36), w });
      return pts;
    };
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + R.range(-0.25, 0.25), pts = crack(R.range(-1, 1), R.range(-0.3, 0.3), a, R.range(20, 40), R.range(0, 0.16), 1);
      const j = 3 + R.int(0, pts.length - 6);
      if (pts.length > 8) crack(pts[j][0], pts[j][1], a + R.sign() * R.range(0.5, 1), R.range(6, 14), 0.18 + R.range(0, 0.15), 0);
    }
    const strands = Array.from({ length: 7 }, (_, i) => ({ o: (rand(i, S2, 1) - 0.5) * 1.4, w: 0.05 + rand(i, S2, 2) * 0.06, f: 1 + rand(i, S2, 3) * 2 }));
    let t = 0, erupted = false, fell = false;
    const height = (tt) => tt < ERUPT ? 0 : tt < ERUPT + RISE ? HMAX * ease.outCubic((tt - ERUPT) / RISE) : tt < FALL ? HMAX * (1 + 0.05 * noise(tt * 3, S2)) : HMAX * (1 - ease.inQuad(clamp((tt - FALL) / (GONE - FALL))));
    const width = (tt) => tt < ERUPT ? 0 : tt < FALL ? 12 * (1 + 0.45 * Math.exp(-(tt - ERUPT) * 7)) * (0.94 + 0.06 * noise(tt * 9, S2 + 1)) : 12 * (1 - smooth(FALL, GONE, tt)) + 1.5 * (1 - smooth(GONE - 0.1, GONE, tt));
    const heat2 = (tt) => smooth(0, ERUPT, tt) * 0.75 + 0.25 * smooth(ERUPT - 0.05, ERUPT + 0.1, tt) - smooth(GONE - 0.3, meta28.duration - 0.6, tt) * 1.05;
    function column(p) {
      const h = height(t), w0 = width(t);
      if (h < 1 || w0 < 0.3) return;
      if (t < FALL + 0.25) {
        const k = clamp(w0 / 12), NZ = (rate, seed, off) => noise(t * rate + off, seed);
        for (let i = 0; i < 5; i++) {
          const n = (S2 + i) * 17, dx = (i - 2) * w0 * 0.4, th = (12 + 12 * (0.5 + 0.5 * noise(t * 3.3 + i, n))) * k * (i === 2 ? 1.2 : i % 4 === 0 ? 0.6 : 0.9);
          flameTongue(p, dx + noise(t * 2, n + 2) * 1.5, -h + 12, th, 3.4 * k * (i % 4 === 0 ? 0.7 : 1), -dx * 0.3 + noise(t * 2.2, n + 1) * 3, NZ, n, H3, LAYERS5);
        }
      }
      const lvlC = [H3[0], H3[1], H3[2], H3[3], H3[4], H3[5], H3[6], H3[7]];
      for (let y = 0; y >= -h; y--) {
        const v = -y / h, cx = noise(-y * 0.04 + t * 1.6, S2 + 2) * 1.6 * v;
        const foot = 1 + 0.7 * Math.max(0, 1 - -y / 12) ** 2, top = 1 - smooth(0.82, 1, v) * 0.7;
        const wl = w0 * foot * top * (1 + 0.65 * Math.max(0, noise(y * 0.2 + t * 8, S2 + 3)) ** 1.5), wr = w0 * foot * top * (1 + 0.65 * Math.max(0, noise(y * 0.2 + t * 8, S2 + 4)) ** 1.5);
        const pulse = (-y * 0.032 + t * 3.6) % 1 < 0.09 ? 1 : 0;
        for (let x = Math.floor(cx - wl * 1.15); x <= Math.ceil(cx + wr * 1.15); x++) {
          const dx = x + 0.5 - cx, q = Math.abs(dx) / (dx < 0 ? wl : wr);
          if (q > 1.15) continue;
          let lvl = q < 0.12 ? 0 : q < 0.26 ? 1 : q < 0.42 ? 2 : q < 0.56 ? 3 : q < 0.7 ? 4 : q < 0.84 ? 5 : q < 0.96 ? 6 : 7;
          for (const s of strands) if (Math.abs(dx / w0 - s.o - 0.06 * Math.sin(t * s.f * 3 + s.o * 9)) < s.w) lvl = Math.max(0, lvl - 1);
          lvl = Math.max(0, lvl - pulse);
          if (lvl === 7 && rand(x, y, Math.floor(t * 20)) < 0.5) continue;
          p.px(x, y, lvlC[lvl]);
        }
        if (y % 12 === 0) p.glow(cx, y, w0 * 2.4 + 8, GLOW, 0.28 * clamp(w0 / 12));
      }
      p.glow(0, -h * 0.45, 92, GLOW, 0.3 * clamp(w0 / 12));
    }
    function cracksDraw(p) {
      const k = heat2(t);
      if (k <= -0.05) return;
      for (const c of cracks3) {
        const n = Math.floor(c.pts.length * clamp((t - c.t0) / c.grow));
        for (let i = 1; i < n; i++) {
          const u = i / c.pts.length, hot = k * (1 - 0.45 * u), [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
          if (hot < 0) {
            const a = 1 + hot * 3;
            if (a > 0) p.line(x0, y0, x1, y1, SOOT3, a);
            continue;
          }
          const col = hot > 0.85 ? H3[1] : hot > 0.65 ? H3[2] : hot > 0.45 ? H3[4] : hot > 0.25 ? H3[5] : hot > 0.1 ? H3[6] : H3[7];
          if (c.w && i < c.pts.length * 0.5 && hot > 0.2) p.line(x0, y0 + 1, x1, y1 + 1, hot > 0.6 ? H3[5] : H3[6]), p.line(x0, y0 - 1, x1, y1 - 1, H3[7]);
          p.line(x0, y0, x1, y1, col);
          if (i % 2 === 0) p.glow(x1, y1, 5 + 7 * hot, GLOW, 0.3 * hot);
        }
      }
      if (k > 0) floorLight(p, 0, 0.5, 44, 8, GLOW, 0.35 * k);
    }
    return {
      update(dt) {
        t += dt;
        if (t < ERUPT && R.chance(0.6 * dt * 60 * smooth(0.15, ERUPT, t))) ps.spawn(P.FIRE, R.range(-5, 5), -1, R.range(-6, 6), -R.range(20, 45), R.range(0.15, 0.3), 0, R.range(1, 2.2));
        if (t < ERUPT && R.chance(0.5 * dt * 60 * smooth(0, ERUPT, t))) {
          const c = R.pick(cracks3), i = R.int(0, Math.floor(c.pts.length * clamp((t - c.t0) / c.grow)) - 1);
          if (i >= 0) {
            const [x, y] = c.pts[i];
            if (R.chance(0.5)) ps.spawn(P.FIRE, x, y - 1, R.range(-5, 5), -R.range(15, 35), R.range(0.15, 0.3), 0, R.range(0.8, 1.6));
            else ps.spawn(P.EMBER, x, y - 1, R.range(-15, 15), -R.range(30, 70), R.range(0.5, 1), H3[3], 1);
          }
        }
        if (!erupted && t >= ERUPT) {
          erupted = true;
          lights.add(0, -40, 90, WARM, 0.7, 0.6);
          lights.add(0, -8, 44, WHITE, 0.7, 0.1);
          for (let i = 0; i < 70; i++) {
            const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(100, 260);
            ps.spawn(P.SPARK, R.range(-4, 4), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.25, 0.7));
          }
          for (let i = 0; i < 18; i++) bits.add({ kind: B.CHUNK, x: R.range(-6, 6), y: -2, vx: R.range(-110, 110), vy: -R.range(150, 330), g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.6, 2.4), a: R.range(0, TAU), va: R.range(-16, 16), s: R.int(1, 3) });
          for (let i = 0; i < 60; i++) {
            const a = -Math.PI / 2 + R.range(-0.9, 0.9), sp = R.range(80, 260);
            ps.spawn(P.GRIT, R.range(-5, 5), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.8), R.pick([st.light, st.body, st.body, st.shade]), R.chance(0.4) ? 2 : 1);
          }
          for (let i = 0; i < 14; i++) {
            const s = R.sign();
            ps.spawn(P.SMOKE, s * R.range(2, 10), -R.range(1, 4), s * R.range(40, 110), -R.range(2, 10), R.range(1, 1.8), st.dust, R.range(4, 7), R.range(0, 0.06), PF.BIG);
          }
        }
        const h = height(t), w = width(t);
        if (t > ERUPT && t < GONE && h > 4) {
          if (R.chance(0.9 * dt * 60)) {
            const s = R.sign(), y = -R.range(4, h * 0.9);
            ps.spawn(P.FIRE, s * w * R.range(0.7, 1.1), y, s * R.range(15, 40), -R.range(30, 70), R.range(0.25, 0.5), 0, R.range(1.6, 3.2), 0, R.chance(0.35) ? PF.SMOKES : 0);
          }
          if (R.chance(0.7 * dt * 60)) ps.spawn(P.FIRE, R.range(-w, w), -h + R.range(0, 6), R.range(-20, 20), -R.range(30, 80), R.range(0.35, 0.7), 0, R.range(3, 5.5), 0, R.chance(0.6) ? PF.SMOKES | (t < FALL - 0.3 ? PF.BIG : 0) : 0);
          if (t < FALL && R.chance(0.5 * dt * 60)) ps.spawn(P.EMBER, R.range(-w, w) * 0.6, -h + 4, R.range(-60, 60), -R.range(50, 110), R.range(0.7, 1.3), H3[3], R.chance(0.2) ? 2 : 1);
        }
        if (t >= FALL && !fell) fell = true;
        if (fell && t < GONE - 0.1 && R.chance(1.6 * dt * 60)) ps.spawn(P.FIRE, R.range(-w - 2, w + 2), -h - R.range(0, 8), R.range(-30, 30), -R.range(10, 50), R.range(0.4, 0.75), 0, R.range(3.5, 6.5), 0, PF.SMOKES);
        bits.update(dt);
        for (const b of bits.list)
          if (b.rest && !b.dusted) {
            b.dusted = true;
            for (let i = 0; i < 3; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 18), R.range(0.3, 0.6), st.dust, R.range(1.3, 2.6));
          }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        cracksDraw(p);
        simDraw(p, ps, H3, "back");
        const k = (t - ERUPT) / 0.45;
        if (k > 0 && k < 1) band(p, 0, 0.5, 84 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.15 - k, [st.body, st.light, H3[4], H3[1]], (g) => Math.sin(g) < 0);
      },
      draw(p) {
        column(p);
        for (const b of bits.list) rock3(p, b, st);
        simDraw(p, ps, H3, "front");
        const k = (t - ERUPT) / 0.45;
        if (k > 0 && k < 1) band(p, 0, 0.5, 84 * ease.outCubic(k), 0.18, Math.max(1, 4 * (1 - k)), 1.15 - k, [st.body, st.light, H3[4], H3[1]], (g) => Math.sin(g) >= 0, k < 0.15);
        const f = (t - ERUPT) / 0.08;
        if (f > 0 && f < 1) {
          p.ellipse(0, -2, 16 * (1 - f * 0.3), 6, H3[2]);
          p.ellipse(0, -3, 11 * (1 - f * 0.3), 4, f < 0.5 ? WHITE : H3[1]);
        }
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/ice/frost-nova.js
  var frost_nova_exports = {};
  __export(frost_nova_exports, {
    act: () => act6,
    create: () => create14,
    meta: () => meta29
  });
  var meta29 = {
    name: "Frost nova",
    desc: "Frost spirals into a spinning snowflake, then a wave blooms three rings of ice crystals round the caster; snow drifts, frost creeps, and the ice melts back into the floor.",
    tags: ["ice", "nova", "aoe", "frost", "magic", "one-shot"],
    size: [288, 192],
    origin: [144, 150],
    duration: 3.4,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 104, seed: 4 }
  };
  var HIGH2 = { turn: 1.15, crouch: 0, fx: -7, fy: -44, bx: 8, by: -44, ffx: -5, fbx: 6 };
  var SLAM2 = { turn: 1.15, crouch: 8, lean: 3, fx: -9, fy: -8, bx: 11, by: -8, ffx: -8, fbx: 9 };
  var EASE = { turn: 1, crouch: 2, fx: -8, fy: -17, bx: 9, by: -17, ffx: -4, fbx: 5 };
  var act6 = {
    target: { x: 76 },
    poses: [
      [-0.34, READY],
      [-0.04, { ...HIGH2, crouch: 2, fy: -36, by: -36 }],
      [0.36, HIGH2],
      [0.42, SLAM2, "snap"],
      [0.9, { ...SLAM2, crouch: 7 }],
      [1.9, { ...SLAM2, crouch: 6 }],
      [2.6, EASE],
      [3.4, READY]
    ],
    hits: [
      { t: 0.42, stop: 0.1, shake: 0.26, amp: 2, target: false },
      { t: 0.66, push: 0.9, straw: 6, y: -10, skin: "ice", shiver: 1.7 },
      { t: 2.9, push: 0.2, straw: 0, flash: 0, skin: null }
    ],
    dust: [{ t: 0.42, x: 10, n: 5, dir: 1, c: "#d8f2ff" }, { t: 0.42, x: -10, n: 5, dir: -1, c: "#d8f2ff" }]
  };
  var CHARGE = 0.42;
  var SPREAD = 0.62;
  var HOLD3 = 1.95;
  var MELT = 0.7;
  var CORE_Y = -24;
  var RINGS = [
    { q: [0.15, 0.24], h: [24, 32], w: [10, 13], n: 2, kids: 2 },
    { q: [0.36, 0.52], h: [13, 19], w: [7, 9], n: 3, kids: 1 },
    { q: [0.62, 0.9], h: [5, 10], w: [4, 6], n: 4, kids: 0 }
  ];
  function frost(p, C, x0, x1, reach, a, edge) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const d = Math.abs(x + 0.5), q = d / reach, k = clamp((a * 1.15 - q) / 0.15);
      if (k <= 0) continue;
      const h = rand(x, 17), fresh = edge > 0 && d > edge - 3, tuft = h < 0.45 ? Math.round((1 + rand(x, 5) * 3) * (1 - q * 0.6)) : 0, D16 = (4 + rand(x, 11) * 4) * (1 - q * 0.5);
      p.dot(x, 0, fresh || h < 0.25 ? WHITE : C[6], k);
      for (let j = 1; j <= tuft; j++) p.dot(x, -j, j === tuft ? WHITE : C[5], k);
      if (tuft > 1 && rand(x, 9) < 0.5) p.dot(x + (rand(x, 3) < 0.5 ? -1 : 1), -tuft + 1, C[6], k);
      for (let j = 1; j <= D16; j++) {
        const v = j / D16;
        p.dot(x, j, rand(x * 31 + j, 7) < 0.06 ? WHITE : v < 0.25 ? C[6] : v < 0.55 ? C[5] : C[4], k * (1.1 - v) * (fresh ? 1.3 : 1));
      }
    }
  }
  function snowflake(p, C, x, y, L, spin, k) {
    if (L < 0.8) return;
    for (let i = 0; i < 6; i++) {
      const a = spin + i * TAU / 6, ca = Math.cos(a), sa = Math.sin(a);
      for (let d = 0; d <= L; d += 0.5) p.dot(x + ca * d, y + sa * d, d < L * 0.4 ? WHITE : C[6], k + 0.2);
      if (L > 3)
        for (const s of [-1, 1]) {
          const bx = x + ca * L * 0.6, by = y + sa * L * 0.6, ba = a + s * 0.9;
          for (let d = 0; d <= L * 0.35; d += 0.5) p.dot(bx + Math.cos(ba) * d, by + Math.sin(ba) * d, C[5], k);
        }
    }
    p.px(x, y, WHITE);
    p.glow(x, y, 10 + L * 3, C[5], 0.35 + 0.5 * k);
  }
  function create14(o) {
    const C = fit(o.palette, 8), DIM = [C[0], C[0], C[1], C[2], C[3], C[4], C[5], C[6]], REACH2 = o.reach;
    const R = new Rng(o.seed), floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
    const bits = new Bits({ ground: floor3 }), lights = new Lights();
    const front = (t2) => t2 < CHARGE ? 0 : REACH2 * (1 - Math.pow(1 - clamp((t2 - CHARGE) / SPREAD), 3));
    const reachedAt = (d) => CHARGE + SPREAD * (1 - Math.cbrt(1 - Math.min(1, d / REACH2)));
    const sites = [];
    for (const side of [-1, 1])
      RINGS.forEach((ring2, ri) => {
        for (let i = 0; i < ring2.n; i++) {
          const q = ring2.q[0] + (ring2.q[1] - ring2.q[0]) * (i + R.range(0.2, 0.8)) / ring2.n, h = R.range(...ring2.h), w = R.range(...ring2.w);
          const parts = [{ dx: 0, h, w, lean: side * h * R.range(0.1, 0.28) }];
          for (let k = 0; k < ring2.kids; k++) {
            const s = k % 2 ? -side : side, kh = h * R.range(0.4, 0.62);
            parts.unshift({ dx: s * R.range(0.3, 0.5) * w, h: kh, w: w * 0.62, lean: s * kh * R.range(0.35, 0.6) });
          }
          sites.push({ x: side * q * REACH2, d: q * REACH2, h, back: (i + ri + (side > 0 ? 1 : 0)) % 2 === 1, t0: reachedAt(q * REACH2) + R.range(0, 0.03), up: false, parts, phase: R.next() });
        }
      });
    let t = 0, released = false;
    const sink = (tt) => smooth(HOLD3, HOLD3 + MELT, tt);
    const drawCrystals = (p, back) => {
      const m = sink(t);
      for (const s of sites) {
        if (!s.up || s.back !== back || m >= 1) continue;
        const g = ease.outBack(clamp((t - s.t0) / 0.1), 2.6), white = t < s.t0 + 0.03, sw = ((t - s.t0) * 0.7 + s.phase * 3) % 1.6 / 0.5;
        for (const q of s.parts)
          crystal(p, s.x + q.dx, back ? -1 : 0, q.h * g * (1 - m), q.w * (1 - m * 0.3), q.lean * g * (1 - m), back ? DIM : C, { white, glint: sw <= 1 ? sw : -1 });
      }
    };
    const ring = (p, back) => {
      if (t < CHARGE) return;
      const u = clamp((t - CHARGE) / (SPREAD + 0.15));
      if (u >= 1) return;
      band(p, 0, 0, front(t) + 2, 0.16, Math.max(2, 10 * Math.pow(1 - u, 0.7)), u < 0.75 ? 1 : (1 - u) / 0.25, C, (g) => Math.sin(g) < 0 === back, t - CHARGE < 0.1);
      if (!back) for (const s of [-1, 1]) p.glow(s * (front(t) + 2), -2, 22, C[5], 0.55 * (1 - u));
    };
    return {
      update(dt) {
        t += dt;
        if (t < CHARGE - 0.06) {
          if (R.chance(0.9)) {
            const a = R.range(0, TAU), D16 = R.range(26, 58), T4 = R.range(0.2, 0.3), v = D16 * 3 / (Math.exp(3 * T4) - 1);
            const x = Math.cos(a) * D16, y = Math.min(CORE_Y + Math.sin(a) * D16 * 0.8, -2), l = Math.hypot(x, y - CORE_Y) || 1;
            ps.spawn(P.STREAK, x, y, -x / l * v, (CORE_Y - y) / l * v, T4, R.chance(0.5) ? C[6] : C[5]);
          }
          if (R.chance(0.14)) {
            const s = R.sign();
            ps.spawn(P.VAPOUR, s * R.range(28, 60), -R.range(0, 2), -s * R.range(35, 70), -R.range(0, 3), R.range(0.35, 0.5), C[6], R.range(2, 3));
          }
        }
        if (t >= CHARGE && !released) {
          released = true;
          lights.add(0, CORE_Y, 84, C[4], 0.8, 0.55);
          lights.add(0, CORE_Y, 45, WHITE, 0.7, 0.12);
          for (let i = 0; i < 22; i++) {
            const a = R.range(-Math.PI, 0.25), sp = R.range(110, 280);
            bits.add({ kind: B.SHARD, x: R.range(-3, 3), y: CORE_Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.7, drag: 0.6, bounce: 0.3, life: R.range(0.9, 1.5), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 3.5), c: R.pick([C[7], C[6], C[5]]) });
          }
          for (let i = 0; i < 14; i++) {
            const a = R.range(-Math.PI, 0), sp = R.range(40, 160);
            ps.spawn(P.FLAKE, 0, CORE_Y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.2, 1.8), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.6));
          }
        }
        const fr = front(t);
        if (t > CHARGE && t < CHARGE + SPREAD)
          for (const s of [-1, 1]) {
            ps.spawn(P.VAPOUR, s * fr + R.range(-2, 2), -R.range(0, 5), s * R.range(15, 75), -R.range(2, 15), R.range(0.6, 1), R.chance(0.7) ? C[6] : C[5], R.range(3, 5.5) * (1 - 0.4 * (fr / REACH2)));
            if (R.chance(0.45)) ps.spawn(P.FLAKE, s * fr, -2, s * R.range(10, 45), -R.range(30, 85), R.range(1.1, 1.9), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2));
          }
        for (const s of sites) {
          if (!s.up && t >= s.t0) {
            s.up = true;
            for (let i = 0; i < 2 + Math.round(s.h / 8); i++) {
              const a = -Math.PI / 2 + R.range(-1.3, 1.3), sp = R.range(60, 200) * (0.5 + s.h / 40);
              bits.add({ kind: B.SHARD, x: s.x + R.range(-3, 3), y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.9, 1.6), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.5, 3), c: R.pick([C[7], C[6], C[5]]) });
            }
            ps.spawn(P.VAPOUR, s.x, -1, R.range(-30, 30), -R.range(2, 8), R.range(0.5, 0.9), C[6], R.range(2.5, 4));
            if (s.h > 10) ps.spawn(P.STAR, s.x + R.range(-3, 3), -R.range(4, s.h * 0.8), 0, -3, R.range(0.3, 0.6), C[6], R.range(1, 2.4));
          }
        }
        if (t > CHARGE + 0.2 && t < HOLD3 + 0.2) {
          if (R.chance(0.5)) {
            const s = R.pick(sites);
            if (s.up) ps.spawn(P.STAR, s.x + R.range(-3, 3), -R.range(2, s.h * 0.9), 0, -3, R.range(0.3, 0.6), R.chance(0.6) ? C[6] : WHITE, R.range(0.6, 2.2));
          }
          if (t < HOLD3 - 0.3 && R.chance(0.16)) ps.spawn(P.FLAKE, R.range(-1, 1) * fr, -R.range(40, 90), R.range(-5, 5), R.range(3, 10), R.range(1.1, 1.5), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.4));
        }
        if (t > HOLD3 && t < HOLD3 + MELT) {
          if (R.chance(0.5)) {
            const s = R.pick(sites);
            bits.add({ kind: B.DRIP, x: s.x + R.range(-3, 3), y: -R.range(3, s.h * 0.6 * (1 - sink(t))), vy: 10, g: 0.6, life: 1, c: C[5] });
          }
          if (R.chance(0.25)) ps.spawn(P.VAPOUR, R.range(-1, 1) * REACH2 * 0.8, -R.range(0, 3), R.range(-10, 10), -R.range(6, 16), R.range(0.6, 1), C[5], R.range(3, 5));
        }
        ps.update(dt);
        bits.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const out = 1 - smooth(HOLD3 + 0.2, HOLD3 + MELT + 0.6, t), fr = front(t);
        if (out > 0 && t > CHARGE) frost(p, C, -Math.max(12, fr + 1), Math.max(12, fr + 1), REACH2, out, fr);
        ring(p, true);
        drawCrystals(p, true);
        ps.draw(p, "back");
      },
      draw(p) {
        ring(p, false);
        drawCrystals(p, false);
        if (t < CHARGE) {
          const k = t / CHARGE, beat = 1 + 0.25 * Math.exp(-((t - CHARGE * 0.55) ** 2) / 2e-3) + 0.3 * Math.exp(-((t - CHARGE * 0.85) ** 2) / 2e-3);
          snowflake(p, C, 0, CORE_Y, (2 + 5.5 * k * k) * beat, t * 4, k);
        } else if (t < CHARGE + 0.22) {
          const a = (t - CHARGE) / 0.22;
          flare(p, 0, CORE_Y, 36 * Math.pow(1 - a, 1.5), 1 - a, C);
          p.glow(0, CORE_Y, 46, WHITE, 0.6 * (1 - a));
        }
        if (t > CHARGE) {
          const k = (1 - smooth(HOLD3, HOLD3 + MELT + 0.3, t)) * (0.85 + 0.15 * Math.sin(t * 2.4)), fr = front(t);
          for (let i = -3; i <= 3; i++) p.glow(i / 3.5 * fr, -4, 26, C[4], 0.16 * k);
        }
        bits.draw(p);
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/ice/ice-spikes.js
  var ice_spikes_exports = {};
  __export(ice_spikes_exports, {
    create: () => create15,
    meta: () => meta30
  });

  // vendor/pixelfx/fx/ice/_lib.js
  function inPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function splitPoly(pts, x, y, a) {
    const nx = -Math.sin(a), ny = Math.cos(a), side = (q) => (q[0] - x) * nx + (q[1] - y) * ny, L = [], Rt = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], sp = side(p), sq = side(q);
      (sp >= 0 ? L : Rt).push(p);
      if (sp >= 0 !== sq >= 0) {
        const u = sp / (sp - sq), m = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
        L.push(m);
        Rt.push(m);
      }
    }
    return [L, Rt].filter((s) => s.length >= 3);
  }
  function glassPoly(p, pts, c, a) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) x0 = Math.min(x0, x), x1 = Math.max(x1, x), y0 = Math.min(y0, y), y1 = Math.max(y1, y);
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (inPoly(pts, x + 0.5, y + 0.5)) p.blend(x, y, c, a);
  }
  var Panes = class {
    constructor(opts = {}) {
      var _a, _b, _c, _d;
      this.list = [];
      this.ground = (_a = opts.ground) != null ? _a : (() => Infinity);
      this.onLand = (_b = opts.onLand) != null ? _b : null;
      this.onCrumble = (_c = opts.onCrumble) != null ? _c : null;
      this.onSkid = (_d = opts.onSkid) != null ? _d : null;
    }
    add(q) {
      var _a;
      const life = (_a = q.life) != null ? _a : 1;
      this.list.push({ vx: 0, vy: 0, a: 0, va: 0, f: 0, vf: 0, lit: 0.6, g: 1, drag: 0.3, bounce: 0.35, rest: false, brittle: false, ...q, life, max: life });
    }
    get count() {
      return this.list.length;
    }
    /** The pane's corners as drawn: tumbled (squashed across its own width), turned and placed. */
    corners(q) {
      const ca = Math.cos(q.a), sa = Math.sin(q.a), k = Math.cos(q.f);
      return q.pts.map(([x, y]) => {
        const yy = y * k;
        return [q.x + x * ca - yy * sa, q.y + x * sa + yy * ca];
      });
    }
    seat(q) {
      let low = -Infinity;
      for (const c of this.corners(q)) low = Math.max(low, c[1]);
      return low;
    }
    update(dt) {
      var _a, _b, _c, _d, _e;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const q = this.list[i];
        if ((q.life -= dt) <= 0) {
          this.list.splice(i, 1);
          continue;
        }
        const floor3 = this.ground(q.x) - 0.5;
        if (q.rest && q.crumble !== void 0 && (q.restT = ((_a = q.restT) != null ? _a : 0) + dt) > q.crumble) {
          (_b = this.onCrumble) == null ? void 0 : _b.call(this, q);
          this.list.splice(i, 1);
          continue;
        }
        if (q.rest) {
          if (Math.abs(q.vx) > 8) (_c = this.onSkid) == null ? void 0 : _c.call(this, q, q.x, floor3 + 0.5);
          q.x += q.vx * dt;
          q.vx -= q.vx * 7 * dt;
          q.a += q.va * dt;
          q.va -= q.va * 9 * dt;
          q.vf -= q.vf * 9 * dt;
          q.f += q.vf * dt;
          q.y -= this.seat(q) - floor3;
          continue;
        }
        q.vy += GRAVITY * q.g * dt;
        q.vx -= q.vx * q.drag * dt;
        q.vy -= q.vy * q.drag * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.a += q.va * dt;
        q.f += q.vf * dt;
        const low = this.seat(q);
        if (q.g <= 0 || low < floor3 || q.vy <= 0) continue;
        q.y -= low - floor3;
        if (q.vy > 70) q.hits = ((_d = q.hits) != null ? _d : 0) + 1, (_e = this.onLand) == null ? void 0 : _e.call(this, q, q.x, floor3 + 0.5, q.vy);
        if (q.brittle && q.vy > 70 && q.hits >= q.brittle) {
          this.list.splice(i, 1);
          continue;
        }
        if (q.vy > 70 && q.bounce > 0) {
          q.vy = -q.vy * q.bounce;
          q.vx *= 0.75;
          q.va *= 0.6;
          q.vf *= 0.5;
        } else {
          q.rest = true;
          q.vy = 0;
        }
      }
    }
    draw(p, C) {
      var _a;
      const n = C.length;
      for (const q of this.list) {
        const a = Math.min(1, q.life / 0.35), pts = this.corners(q), k = Math.cos(q.f), face = Math.abs(k);
        const lv = q.lit * (0.35 + 0.65 * face), flash = face > 0.97 && !q.rest;
        if (face > 0.25) {
          if (q.solid && q.tone !== void 0) {
            p.poly(pts, flash ? C[n - 1] : C[clamp(Math.round(1 + q.tone * 5 * (0.6 + 0.4 * face)), 1, n - 2)], a);
          } else if (q.solid) {
            const rr = (_a = q.ridge) != null ? _a : -Math.PI / 2, cr = Math.cos(rr), sr = Math.sin(rr), ca = Math.cos(q.a), sa = Math.sin(q.a);
            const rx = cr * ca - sr * k * sa, ry = cr * sa + sr * k * ca;
            let nx = -ry, ny = rx;
            if (nx * -0.55 + ny * -0.84 < 0) nx = -nx, ny = -ny;
            const lit = flash ? C[n - 1] : C[clamp(Math.round(3 + lv * 3), 3, n - 2)], deep = C[clamp(Math.round(1 + lv * 2), 1, 3)];
            p.poly(pts, (x, y) => {
              const d = (x - q.x) * nx + (y - q.y) * ny;
              return d > 0.6 ? lit : d > -0.6 ? C[n - 2] : deep;
            }, a);
          } else glassPoly(p, pts, flash ? C[n - 1] : C[clamp(Math.round(3 + lv * 3), 3, n - 2)], (0.3 + 0.35 * lv + (flash ? 0.3 : 0)) * a);
        }
        let cx = 0, cy = 0, top = 0;
        for (const [x, y] of pts) cx += x, cy += y;
        cx /= pts.length;
        cy /= pts.length;
        for (let i = 0; i < pts.length; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
          let nx = y1 - y0, ny = x0 - x1;
          if (nx * ((x0 + x1) / 2 - cx) + ny * ((y0 + y1) / 2 - cy) < 0) nx = -nx, ny = -ny;
          const l = Math.hypot(nx, ny) || 1, lit = (-nx * 0.55 - ny * 0.84) / l;
          p.line(x0, y0, x1, y1, face < 0.25 || lit > 0.35 ? C[n - 1] : lit > -0.25 ? C[n - 2] : q.solid ? C[1] : C[Math.max(2, n - 4)], a);
          if (pts[i][1] < pts[top][1]) top = i;
        }
        if (face > 0.7) p.dot(pts[top][0], pts[top][1], WHITE, a);
        p.glow(cx, cy, 5, C[n - 3], (flash ? 0.5 : 0.14) * a);
      }
    }
  };
  function blade2(p, bx, by, tx, ty, w, C, opts = {}) {
    var _a, _b, _c, _d;
    const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy);
    if (L < 1.5 || w < 0.5) return;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, a = (_a = opts.a) != null ? _a : 1, dim = (_b = opts.dim) != null ? _b : 0, jag = (_c = opts.jag) != null ? _c : -1, glint2 = (_d = opts.glint) != null ? _d : -1;
    const K = (i) => C[clamp(i - dim, 0, C.length - 1)], hw = w / 2;
    const left = (u) => hw * (1 - u) + 0.35, right = (u) => hw * (1 - u) * (jag >= 0 && u > jag ? 0.55 : 1) + 0.35, ridge = (u) => -w * 0.12 * (1 - u);
    const pad = hw + 2;
    p.shade(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty), (x, y, o) => {
      const rx = x - bx, ry = y - by, u = (rx * ux + ry * uy) / L, s = rx * nx + ry * ny;
      if (u < 0) return;
      const l = left(Math.min(u, 1)), r = right(Math.min(u, 1));
      if (u > 1 || s < -l || s > r) {
        const over = u > 1 ? (u - 1) * L : 0, out = Math.max(over, s < -l ? -l - s : s - r);
        if (out < 1 && u < 1 + 1 / L) {
          o.c = K(0);
          o.a = a;
        }
        return;
      }
      o.a = a;
      if (opts.white) return o.c = WHITE;
      const rd = ridge(u);
      let c;
      if (u > 0.88) c = WHITE;
      else if (Math.abs(s - rd) < 0.55) c = K(6);
      else if (s < rd) c = s + l < 1 ? K(6) : (s + l) / Math.max(1, rd + l) > 0.55 ? K(5) : K(4);
      else c = r - s < 1.1 ? K(1) : (s - rd) / Math.max(1, r - rd) > 0.5 ? K(2) : K(3);
      if (jag >= 0 && Math.abs(u - jag) * L < 0.8 && s > rd) c = K(6);
      else if (s < rd && c !== K(6) && (Math.floor(x) * 73856093 ^ Math.floor(y) * 19349663) % 997 < 30) c = K(7);
      if (glint2 >= 0 && s <= rd + 0.6) {
        const g = Math.abs(u - glint2) * L;
        if (g < 0.8) c = WHITE;
        else if (g < 1.8) c = K(6);
      }
      o.c = c;
    });
  }
  function endBy(t, D16, ...systems) {
    const left = Math.max(1e-3, D16 - 0.05 - t);
    for (const sys of systems) for (const q of sys.list) if (q.life > left) q.life = left;
  }

  // vendor/pixelfx/fx/ice/ice-spikes.js
  var meta30 = {
    name: "Ice spikes",
    desc: "A frost line races along the floor and clusters of jagged ice blades burst up behind it in a rising wave, glint, flash white together and shatter into toppling shards.",
    tags: ["ice", "spikes", "ground", "wave", "directional", "magic", "one-shot"],
    size: [264, 112],
    origin: [24, 96],
    duration: 3,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: ["#151a3d", "#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#a6ecff", "#dcfbff", "#ffffff"], reach: 172, height: 56, seed: 3 }
  };
  var START = 0.04;
  var RUN = 0.44;
  var SHIMMER = 0.74;
  var TREMBLE = 1.2;
  var FLASH = 1.36;
  var SHATTER = 1.42;
  var MELT2 = 1.75;
  function create15(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), REACH2 = o.reach, floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: [C[7], C[6], C[5], C[4]], haze: C[5] });
    const bits = new Bits({ ground: floor3 }), lights = new Lights();
    const splinter = (x, y, vx, n) => {
      for (let i = 0; i < n; i++) bits.add({ kind: B.SHARD, x: x + R.range(-2, 2), y: y - 1, vx: vx * 0.5 + R.range(-45, 45), vy: -R.range(30, 100), g: 0.8, drag: 0.6, bounce: 0.35, life: R.range(0.4, 0.75), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 2.4), c: C[R.int(4, 7)] });
    };
    const panes = new Panes({
      ground: floor3,
      onCrumble: (q) => {
        splinter(q.x, 0, 0, 3);
        ps.spawn(P.VAPOUR, q.x, -1, R.range(-12, 12), -R.range(2, 8), R.range(0.4, 0.7), C[6], R.range(1.4, 2.2));
      },
      onLand: (q, x, y, v) => {
        if (v < 110) return;
        ps.spawn(P.VAPOUR, x, y - 1, R.range(-20, 20), -R.range(2, 8), R.range(0.4, 0.7), C[6], R.range(1.4, 2.4));
        splinter(x, y, q.vx, 3);
        if (R.chance(0.3)) ps.spawn(P.STAR, x, y - 2, 0, -5, R.range(0.2, 0.4), WHITE, R.range(0.8, 1.6));
      }
    });
    const front = (t2) => REACH2 * (1 - Math.pow(1 - seg(t2, START, START + RUN), 1.7));
    const reachedAt = (x) => START + RUN * (1 - Math.pow(1 - clamp(x / REACH2), 1 / 1.7));
    const env2 = (q) => 0.28 + 0.72 * Math.exp(-(((q - 0.64) / 0.3) ** 2));
    const clusters = [];
    for (let x = 10; x < REACH2 - 2; x += R.range(20, 26)) {
      const q = x / REACH2, H3 = o.height * env2(q) * R.range(0.88, 1.06), W6 = clamp(H3 * 0.36, 5, 14), lean = H3 * R.range(0.2, 0.34);
      const list = [
        { dx: W6 * R.range(0.35, 0.6), h: H3 * R.range(0.5, 0.7), w: W6 * 0.7, lean: H3 * R.range(0.4, 0.6), back: true, delay: R.range(0.02, 0.05), jag: R.chance(0.5) ? R.range(0.35, 0.6) : -1 },
        { dx: 0, h: H3, w: W6, lean, back: false, delay: 0, jag: R.chance(0.7) ? R.range(0.32, 0.58) : -1, main: true }
      ];
      if (H3 > 14) list.push({ dx: -W6 * R.range(0.35, 0.55), h: H3 * R.range(0.24, 0.4), w: W6 * 0.55, lean: -H3 * R.range(0, 0.12), back: false, delay: R.range(0.03, 0.07), jag: -1 });
      clusters.push({ x, q, H: H3, W: W6, blades: list, main: list[1], t0: reachedAt(x) + 0.012, up: false });
    }
    const crest = clusters.reduce((a, c) => c.H > a.H ? c : a, clusters[0]);
    let t = 0, broke = false, trembled = false;
    const pose = (c, b) => {
      const g = ease.outBack(clamp((t - c.t0 - b.delay) / 0.09), 2.2), x = c.x + b.dx;
      return { g, x, tx: x + b.lean * g, ty: -b.h * g, white: t - c.t0 - b.delay < 0.03 || t >= FLASH && t < SHATTER };
    };
    const drawClusters = (p) => {
      if (t >= SHATTER) return;
      for (const pass2 of [0, 1, 2])
        for (const c of clusters) {
          if (t < c.t0) continue;
          const jx = t >= TREMBLE && t < FLASH ? (Math.floor(t * 40) + Math.round(c.x)) % 2 ? 1 : 0 : 0;
          for (const b of c.blades) {
            if (pass2 === 0 !== b.back || pass2 === 1 !== !!b.main) continue;
            const s = pose(c, b);
            if (s.g <= 0) continue;
            const gl = (t - SHIMMER - c.q * 0.34) / 0.2;
            blade2(p, s.x + jx, 0, s.tx + jx, s.ty, b.w, C, { white: s.white, jag: b.jag, dim: b.back ? 1 : 0, glint: gl >= 0 && gl <= 1 ? gl : -1 });
          }
          if (pass2 === 2) {
            const pop = clamp(1 - (t - c.t0) / 0.15), wh = t >= FLASH;
            p.glow(c.x + c.main.lean * 0.4, -c.H * 0.45, c.H * 0.9 + 10, C[4], (0.16 + 0.42 * pop + (wh ? 0.4 : 0)) * (0.85 + 0.15 * Math.sin(t * 3 + c.x)));
            if (pop > 0) p.glow(c.x, -2, 14, WHITE, 0.55 * pop);
          }
        }
    };
    const drawFrost = (p) => {
      const fr = front(t);
      for (let x = -3; x <= Math.min(fr, REACH2 + 6); x++) {
        const q = clamp(x / REACH2), age = t - reachedAt(Math.max(0, x)), a = 1 - smooth(MELT2 + q * 0.35, MELT2 + q * 0.35 + 0.6, t);
        if (a <= 0 || age < 0) continue;
        const h = rand(x, 17), grow = smooth(0, 0.3, age), head4 = fr - x < 3 && fr < REACH2;
        p.dot(x, 0, head4 || age < 0.06 || h < 0.3 ? WHITE : C[6], a);
        const L = h < 0.45 ? Math.round(grow * (1 + rand(x, 5) * 2.6)) : 0;
        for (let j = 1; j <= L; j++) p.dot(x, -j, j === L ? WHITE : C[5], a);
        if (L > 1 && rand(x, 9) < 0.5) p.dot(x + 1, -L + 1, C[6], a);
        const D16 = grow * (2 + rand(x, 11) * 4) * (1 - q * 0.3);
        for (let j = 1; j <= D16; j++) p.dot(x, j, rand(x * 31 + j, 7) < 0.06 ? WHITE : j < 2 ? C[5] : j < 4 ? C[4] : C[3], a * (1.1 - j / (D16 + 1)));
        if (head4) p.dot(x, -1, WHITE);
      }
      if (fr < REACH2 && t > START) {
        p.glow(fr, -2, 16, C[6], 0.6);
        p.glow(fr, -1, 7, WHITE, 0.6);
      }
    };
    const breakBlade = (c, b) => {
      const s = pose(c, b), ax = s.tx - s.x, ay = s.ty, L = Math.hypot(ax, ay) || 1, nx = -ay / L, ny = ax / L, hw = b.w / 2;
      const tri = [[s.x - nx * hw, -ny * hw], [s.tx, s.ty], [s.x + nx * hw, ny * hw]];
      const ang = Math.atan2(ay, ax) + Math.PI / 2;
      let parts = [tri];
      if (b.h > 9) parts = parts.flatMap((poly) => splitPoly(poly, s.x + ax * 0.4, ay * 0.4, ang));
      if (b.h > 22) parts = parts.flatMap((poly) => poly.some(([, y]) => y < ay * 0.5) ? splitPoly(poly, s.x + ax * 0.72, ay * 0.72, ang) : [poly]);
      for (const part of parts) {
        let mx = 0, my = 0;
        for (const [x, y] of part) mx += x, my += y;
        mx /= part.length, my /= part.length;
        const up = clamp(-my / 40);
        panes.add({
          pts: part.map(([x, y]) => [x - mx, y - my]),
          x: mx,
          y: my,
          vx: R.range(-25, 60),
          vy: -R.range(40, 130) * (0.5 + up),
          a: 0,
          va: R.range(-8, 8),
          f: R.range(-0.7, 0.7),
          vf: R.range(-6, 6),
          lit: b.back ? 0.45 : 0.75,
          g: 0.9,
          drag: 0.6,
          bounce: 0.3,
          solid: true,
          ridge: Math.atan2(ay, ax),
          brittle: b.h > 30 ? 2 : 1,
          crumble: R.range(0.12, 0.4),
          life: R.range(1, 1.4)
        });
      }
      for (let i = 0; i < 2 + b.h / 7; i++) {
        const u = R.next();
        bits.add({ kind: R.chance(0.15) ? B.CHUNK : B.SHARD, x: s.x + ax * u + R.range(-1.5, 1.5), y: ay * u, vx: R.range(-60, 90), vy: -R.range(60, 230), g: 0.9, drag: 0.6, bounce: 0.3, life: R.range(0.7, 1.3), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.2, 3.2), c: C[R.int(4, 7)], ramp: [C[1], C[3], C[4], C[6], C[7]] });
      }
    };
    return {
      update(dt) {
        t += dt;
        if (t - dt <= START && t > START) {
          for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, R.range(0, 6), -R.range(0, 3), R.range(10, 60), -R.range(2, 12), R.range(0.4, 0.7), C[6], R.range(2, 3.2));
          lights.add(4, -4, 26, C[5], 0.6, 0.25);
        }
        const fr = front(t);
        if (t > START && fr < REACH2 - 1) {
          if (R.chance(0.5)) ps.spawn(P.STREAK, fr - R.range(4, 12), -R.range(1, 3), R.range(40, 80), -R.range(0, 6), R.range(0.08, 0.14), R.chance(0.5) ? C[6] : WHITE);
          if (R.chance(0.3)) ps.spawn(P.FLAKE, fr, -1, R.range(10, 50), -R.range(20, 70), R.range(0.5, 0.9), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.2));
          if (R.chance(0.12)) ps.spawn(P.VAPOUR, fr, -R.range(0, 3), R.range(20, 60), -R.range(2, 10), R.range(0.4, 0.7), C[6], R.range(1.6, 2.8));
        }
        for (const c of clusters) {
          if (c.up || t < c.t0) continue;
          c.up = true;
          const big = c === crest, n = 3 + Math.round(c.H / 8);
          for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + R.range(-1.1, 1), sp = R.range(60, 190) * (0.45 + c.H / 44);
            bits.add({ kind: B.SHARD, x: c.x + R.range(-3, 3), y: -1, vx: Math.cos(a) * sp + 25, vy: Math.sin(a) * sp, g: 0.8, drag: 0.6, bounce: 0.3, life: R.range(0.6, 1.1), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1.2, 3), c: C[R.int(5, 7)] });
          }
          ps.spawn(P.VAPOUR, c.x, -1, R.range(-10, 40), -R.range(2, 10), R.range(0.5, 0.9), C[6], R.range(2.2, 3.4) * (0.6 + c.H / 60));
          for (let i = 0; i < 2; i++) ps.spawn(P.FLAKE, c.x + R.range(-4, 4), -R.range(2, c.H * 0.5), R.range(-20, 40), -R.range(20, 60), R.range(0.6, 1.1), R.chance(0.5) ? WHITE : C[6], R.range(0.5, 1.3));
          if (c.H > 16) ps.spawn(P.STAR, c.x + c.main.lean, -c.H * 0.96, 0, -4, R.range(0.3, 0.5), WHITE, R.range(1.4, 2.6), 0.08);
          lights.add(c.x, -c.H * 0.4, 16 + c.H * 0.6, C[5], 0.5, 0.18);
          if (big) {
            lights.add(c.x, -c.H * 0.5, 54, WHITE, 0.5, 0.14);
            for (let i = 0; i < 4; i++) ps.spawn(P.VAPOUR, c.x + R.range(-6, 6), -R.range(0, 4), R.range(-40, 60), -R.range(4, 16), R.range(0.6, 1), C[6], R.range(3, 4.5));
          }
        }
        if (t > START + RUN && t < TREMBLE && R.chance(0.09)) {
          const c = R.pick(clusters), b = R.pick(c.blades), s = pose(c, b), u = R.range(0.3, 0.95);
          ps.spawn(P.STAR, s.x + (s.tx - s.x) * u, s.ty * u, 0, -3, R.range(0.25, 0.5), R.chance(0.6) ? WHITE : C[6], R.range(0.6, 2));
        }
        if (!trembled && t >= TREMBLE) {
          trembled = true;
          for (const c of clusters)
            for (let i = 0; i < 2; i++) bits.add({ kind: B.SHARD, x: c.x + R.range(-4, 4), y: -R.range(4, c.H * 0.8), vx: R.range(-20, 20), vy: -R.range(0, 30), g: 0.8, drag: 0.5, bounce: 0.3, life: R.range(0.3, 0.6), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(1, 1.8), c: C[R.int(5, 7)] });
        }
        if (!broke && t >= SHATTER) {
          broke = true;
          for (const c of clusters) {
            for (const b of c.blades) breakBlade(c, b);
            for (let i = 0; i < 2; i++) ps.spawn(P.VAPOUR, c.x + R.range(-6, 6), -R.range(1, 8), R.range(-30, 50), -R.range(4, 18), R.range(0.6, 1.1), C[6], R.range(2.4, 4) * (0.7 + c.H / 60));
            if (R.chance(0.7)) ps.spawn(P.STAR, c.x + R.range(-6, 6), -R.range(4, c.H), R.range(-10, 10), -R.range(6, 20), R.range(0.4, 0.8), R.chance(0.5) ? WHITE : C[6], R.range(1, 2.2));
            for (let i = 0; i < 2; i++) ps.spawn(P.FLAKE, c.x + R.range(-6, 6), -R.range(4, c.H), R.range(-30, 60), -R.range(30, 90), R.range(0.9, 1.5), R.chance(0.6) ? WHITE : C[6], R.range(0.5, 1.5));
            lights.add(c.x, -c.H * 0.5, 22 + c.H, WHITE, 0.45, 0.12);
          }
          for (let i = 0; i < 5; i++) lights.add(REACH2 * (i + 0.5) / 5, -18, 40, C[4], 0.4, 0.5);
        }
        if (broke && t < SHATTER + 0.8 && R.chance(0.1) && bits.list.length) {
          const b = R.pick(bits.list);
          ps.spawn(P.STAR, b.x, b.y - 1, 0, -3, R.range(0.2, 0.4), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.5));
        }
        ps.update(dt);
        bits.update(dt);
        panes.update(dt);
        lights.update(dt);
        endBy(t, meta30.duration, ps, bits, panes);
      },
      drawBack(p) {
        drawFrost(p);
        ps.draw(p, "back");
      },
      draw(p) {
        drawClusters(p);
        const k = (1 - smooth(MELT2, MELT2 + 0.9, t)) * smooth(START, START + 0.3, t), fr = front(t);
        for (let i = 0; i < 6; i++) p.glow(fr * (i + 0.5) / 6, -3, 26, C[4], 0.15 * k);
        if (t >= FLASH && t < SHATTER + 0.1) for (const c of clusters) sparkle(p, c.x + c.main.lean, -c.H, 6 * (1 - clamp((t - FLASH) / 0.16)), C[6], C[4], 0.4);
        panes.draw(p, C);
        bits.draw(p);
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/lightning/lightning-strike.js
  var lightning_strike_exports = {};
  __export(lightning_strike_exports, {
    create: () => create16,
    meta: () => meta31
  });

  // vendor/pixelfx/fx/lightning/_lib.js
  var VOLT = ["#120a33", "#2a1b78", "#4630c0", "#5a62f0", "#58a6ff", "#9ed8ff", "#e4f6ff", "#ffffff"];
  var PLASMA = ["#ffffff", "#c8f8ff", "#7ff3ff", "#1ab8e6"];
  var SOOT4 = hex("#110c16");
  var SOOT22 = hex("#1c1522");
  function zigzag(R, x0, y0, x1, y1, jag = 0.32, forks = 0.35, w = 1, depth = 0) {
    const out = { paths: [] }, L = Math.hypot(x1 - x0, y1 - y0);
    let pts = [[x0, y0], [x1, y1]], off = L * jag;
    while (pts.length < 2 + L / 3) {
      const nxt = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay) || 1, o = R.range(-off, off);
        nxt.push([(ax + bx) / 2 + -(by - ay) / l * o, (ay + by) / 2 + (bx - ax) / l * o], [bx, by]);
      }
      pts = nxt;
      off *= 0.52;
    }
    out.paths.push({ pts, w });
    if (depth < 2) {
      for (let i = 2; i < pts.length - 3; i++)
        if (R.chance(forks / (1 + depth) / Math.max(4, pts.length / 6))) {
          const [ax, ay] = pts[i], [bx, by] = pts[Math.min(pts.length - 1, i + 3)];
          const a = Math.atan2(by - ay, bx - ax) + R.sign() * R.range(0.35, 0.9), l = (L - i / pts.length * L) * R.range(0.25, 0.55);
          out.paths.push(...zigzag(R, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, jag * 1.1, forks, w * 0.55, depth + 1).paths);
        }
    }
    return out;
  }
  function bend(b, fn) {
    return { paths: b.paths.map((q) => ({ w: q.w, pts: q.pts.map(([x, y]) => fn(x, y)) })) };
  }
  var N2 = 1024;
  var HALF = 512;
  var GRID = new Uint8Array(N2 * N2);
  var HIT2 = [];
  function mark(x, y, lvl) {
    const X = Math.floor(x) + HALF, Y = Math.floor(y) + HALF;
    if (X < 0 || Y < 0 || X >= N2 || Y >= N2) return;
    const i = Y * N2 + X, v = GRID[i];
    if (!v) HIT2.push(i);
    if (lvl > v) GRID[i] = lvl;
  }
  function stamp(x, y, r, lvl) {
    if (r <= 0.5) return mark(Math.round(x), Math.round(y), lvl);
    const r2 = r * r;
    for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) {
      const dy = py + 0.5 - y;
      for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
        const dx = px + 0.5 - x;
        if (dx * dx + dy * dy <= r2) mark(px, py, lvl);
      }
    }
  }
  function flush(p, cols, alphas) {
    for (const i of HIT2) {
      const v = GRID[i];
      GRID[i] = 0;
      const x = i % N2 - HALF, y = (i / N2 | 0) - HALF, a = alphas ? alphas[v - 1] : 1;
      if (a >= 1) p.px(x, y, cols[v - 1]);
      else if (a > 0) p.dot(x, y, cols[v - 1], a);
    }
    HIT2.length = 0;
  }
  var walk2 = (pts, fn) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let d = 0; d <= l; d += 0.5) fn(ax + (bx - ax) * d / l, ay + (by - ay) * d / l, i);
    }
  };
  function stroke2(p, b, k, C, s = 1, o = {}) {
    var _a, _b;
    if (k <= 0.02) return;
    const lk = (_a = o.light) != null ? _a : 0.5;
    for (const q of b.paths) {
      const trunk = q.w >= 1;
      if (!trunk && k < 0.5) continue;
      const rh = (trunk ? k > 0.6 ? 2.1 : 1.6 : 1.1) * s, rb = (trunk ? k > 0.6 ? 1.3 : 0.8 : 0.5) * s;
      const pts = o.upTo !== void 0 && trunk ? q.pts.slice(0, Math.max(2, Math.ceil(q.pts.length * o.upTo))) : q.pts;
      walk2(pts, (x, y) => {
        stamp(x, y, rh, 1);
        stamp(x, y, rb, trunk ? 3 : 2);
        if (trunk && k > 0.3) o.core ? stamp(x, y, o.core, 4) : mark(x, y, 4);
      });
      for (let i = 0; i < pts.length - 1; i += 3) if (o.minY === void 0 || pts[i][1] > o.minY) p.glow(pts[i][0], pts[i][1], (trunk ? 14 : 7) * s, C[4], lk * k * q.w);
    }
    const a = (_b = o.a) != null ? _b : 1;
    flush(p, o.hero ? [C[3], C[6], C[7], C[7]] : [C[2], C[4], C[5], C[7]], [a, a, a, a]);
  }
  function crackle(p, b, k, C, glowK = 0.5, a = 1) {
    if (k <= 0.02) return;
    for (const q of b.paths) {
      const thick = q.w >= 1;
      walk2(q.pts, (x, y) => {
        if (k > 0.45 && thick) for (const [dx, dy] of CROSS2) mark(x + dx * 1.5, y + dy * 1.5, 1);
        if (k > 0.25 && (thick || q.w > 0.4)) mark(x + 1, y, 2), mark(x, y + 1, 2);
        mark(x, y, thick && k > 0.3 ? 4 : 3);
      });
      for (let i = 0; i < q.pts.length - 1; i += 3) p.glow(q.pts[i][0], q.pts[i][1], (thick ? 9 : 5) * (0.5 + k * 0.5), C[4], glowK * k * q.w);
    }
    flush(p, [C[3], C[5], C[5], C[7]], [Math.min(1, (k - 0.45) * 1.6) * a, a, a, a]);
  }
  var CROSS2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function trace2(p, pts, c, a = 1, from = 0, to = pts.length - 1) {
    for (let i = Math.max(0, from); i < Math.min(to, pts.length - 1); i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, a);
  }
  function scorch(p, cx, cy, rx, T02, fade = 1, ry = Math.max(2.5, rx * 0.12)) {
    if (fade <= 0) return;
    for (let y = Math.floor(cy); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        const n = rand(x, y, 41), T4 = T02 * (1.25 - d) - n * 0.35;
        if (T4 > 0.06) {
          const c = FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, Math.floor((1 - Math.min(1, T4)) * (FIRE_RAMP.length - 1)))];
          p.dot(x, y, c, fade);
          if ((x & 3) === 0) p.glow(x + 0.5, y, 6, c, 0.18 * T4 * fade);
        } else p.dot(x, y, d < 0.5 ? SOOT4 : SOOT22, (d < 0.95 - n * 0.3 ? 1 : 1 - d) * fade);
      }
  }
  var heat = (T4) => T4 > 0.06 ? FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, Math.floor((1 - Math.min(1, T4)) * (FIRE_RAMP.length - 1)))] : 0;

  // vendor/pixelfx/fx/lightning/lightning-strike.js
  var meta31 = {
    name: "Lightning strike",
    desc: "A targeted strike: a sigil charges on the floor, the scene darkens, a thick bolt slams into it, arcs race out along the cracks it splits, the channel crumbles to a scorch.",
    tags: ["lightning", "electric", "strike", "spell", "target", "impact", "ground", "one-shot"],
    size: [240, 264],
    origin: [120, 228],
    duration: 3,
    loop: false,
    fps: 30,
    bg: "ground",
    options: { palette: VOLT, sparks: PLASMA, seed: 5 }
  };
  var W5 = 120;
  var TOP2 = -224;
  var RX = 28;
  var SY2 = 0.22;
  var REACH = 52;
  var LEAD0 = 0.48;
  var STEPS = 9;
  var MEET = -30;
  var STROKES = [{ t: 0.76, k: 1 }, { t: 1.04, k: 0.8 }, { t: 1.26, k: 0.55 }];
  var FLICK = [1, 0.72, 0.3, 0.95, 0.5, 0.8, 0.22];
  var level = (a) => {
    var _a;
    return a < 0 ? 0 : (_a = FLICK[Math.floor(a * 30 + 1e-4)]) != null ? _a : 0;
  };
  var NIGHT = hex("#04030a");
  var DUST2 = hex("#6e6382");
  var ASH = hex("#5b5566");
  var STONE = ["#655b7a", "#4a4263", "#342d45"].map(hex);
  var S1 = STROKES[0].t;
  function cracks2(R) {
    const out = [];
    const grow = (x, y, a, len2, w, d, depth) => {
      const pts = [[x, y, d]];
      for (let s = 0; s < len2; s += 1.5) {
        a += R.range(-0.32, 0.32);
        x += Math.cos(a) * 1.5;
        y = clamp(y + Math.sin(a) * 0.45, 0, 5);
        d += 1.5;
        pts.push([x, y, d]);
        if (depth < 2 && s > 3 && R.chance(0.09)) grow(x, y, a + R.sign() * R.range(0.5, 1.2), (len2 - s) * R.range(0.3, 0.6), w * 0.6, d, depth + 1);
      }
      out.push({ pts, w });
    };
    for (let i = 0; i < 6; i++) grow(R.range(-1, 1), R.range(0, 1), i % 2 ? R.range(-0.5, 0.7) : Math.PI + R.range(-0.7, 0.5), REACH * R.range(0.55, 1), 1, 0, 0);
    return out;
  }
  function sigil(p, t, C, k, near) {
    const reveal = clamp(t / 0.22), spin = t * 0.8, burnt = t > S1 ? t - S1 : -1;
    if (burnt > 0.45) return;
    const a0 = burnt < 0 ? 1 : burnt < 0.07 ? 1 : 1 - (burnt - 0.07) / 0.38, hot = burnt >= 0 && burnt < 0.07;
    const on = (a) => Math.sin(a) >= 0 === near;
    const from = (a) => Math.abs(((a - Math.PI / 2) % TAU + TAU + Math.PI) % TAU - Math.PI) / Math.PI;
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU + spin;
      if (!on(a) || from(a) > reveal) continue;
      for (const da of [0, 0.06, 0.12]) {
        const x = Math.cos(a + da) * RX, y = Math.sin(a + da) * RX * SY2;
        p.dot(x, y, hot ? WHITE : near ? k > 0.7 ? C[6] : C[5] : k > 0.7 ? C[4] : C[3], a0);
        if (near) p.dot(x, y + 1, hot ? C[6] : C[2], a0);
      }
      if (i % 3 === 0) p.glow(Math.cos(a) * RX, Math.sin(a) * RX * SY2, 5, C[4], 0.3 * k * a0);
    }
    for (let j = 0; j < 4; j++) {
      const a = spin * -0.5 + j * TAU / 4 + Math.PI / 4;
      if (!on(a) || reveal < 1) continue;
      p.line(Math.cos(a) * (RX - 5), Math.sin(a) * (RX - 5) * SY2, Math.cos(a) * (RX + 5), Math.sin(a) * (RX + 5) * SY2, hot ? WHITE : near ? C[6] : C[4], a0);
    }
    if (t > 0.3)
      for (let a = 0; a < TAU; a += 0.09) {
        if (!on(a)) continue;
        p.dot(Math.cos(a) * 14, Math.sin(a) * 14 * SY2, hot ? WHITE : near ? C[4] : C[2], a0 * clamp((t - 0.3) / 0.12));
      }
    if (near && burnt < 0) {
      const pulse = 0.6 + 0.4 * Math.sin(t * (10 + 30 * k));
      p.px(0, 0, k > 0.5 ? WHITE : C[6]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) p.px(dx, dy, C[5]);
      p.glow(0, -1, 10 + 10 * k, C[5], 0.3 + 0.4 * k * pulse);
    }
  }
  function keep(b) {
    const paths = [];
    for (const q of b.paths) {
      const pts = [];
      for (const pt of q.pts) {
        if (Math.abs(pt[0]) > W5 - 5 || pt[1] > -3 || pt[1] < TOP2 + 6) break;
        pts.push(pt);
      }
      if (q.w >= 1 || pts.length > 3) paths.push({ w: q.w, pts: q.w >= 1 ? q.pts : pts });
    }
    return { paths };
  }
  function create16(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), floor3 = () => 0;
    const ps = new Particles({ rng: R, ground: floor3, sparks: o.sparks }), hot = new Particles({ rng: R, ground: floor3 }), lights = new Lights();
    const X0 = R.range(8, 18) * (R.chance(0.5) ? 1 : -1);
    const main = keep(zigzag(R, X0, TOP2, 0, -1, 0.17, 0.5)), trunk = main.paths[0].pts;
    const drift3 = (dx) => (x, y) => [x + dx * Math.sin(Math.PI * y / TOP2), y];
    const bolts = [main, bend({ paths: [{ pts: trunk, w: 1 }] }, drift3(1.5)), bend({ paths: [{ pts: trunk, w: 1 }] }, drift3(3))];
    const chan = (i) => bolts[i].paths[0].pts, last = STROKES[STROKES.length - 1], end = chan(STROKES.length - 1);
    const tree2 = cracks2(R);
    const gone = end.map(([, y], i) => last.t + 0.25 + 0.75 * (0.55 * rand(o.seed, i, 5) + 0.45 * (1 - y / TOP2)));
    let t = 0, struck = -1;
    const now = () => {
      for (let i = STROKES.length - 1; i >= 0; i--) if (t >= STROKES[i].t) return { i, s: STROKES[i], a: t - STROKES[i].t, k: level(t - STROKES[i].t) * STROKES[i].k };
      return null;
    };
    const charge = () => clamp(t / S1) ** 1.5;
    const heatAt = () => struck < 0 ? 0 : Math.max(...STROKES.slice(0, struck + 1).map((s) => s.k * Math.pow(clamp(1 - (t - s.t) / 1.6), 1.4)));
    return {
      update(dt) {
        t += dt;
        for (const [i, s] of STROKES.entries()) {
          if (struck >= i || t < s.t) continue;
          struck = i;
          const k = s.k;
          lights.add(0, -50, 120, C[4], 0.55 * k, 0.4);
          lights.add(0, -3, 24, WHITE, 0.5 * k, 0.1);
          for (let j = 0; j < Math.round(44 * k); j++) {
            const a = -Math.PI / 2 + R.range(-1.3, 1.3), sp = R.range(110, 320) * (0.65 + 0.35 * k);
            ps.spawn(P.SPARK, R.range(-1.5, 1.5), -2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.55));
          }
          for (let j = 0; j < Math.round(12 * k); j++) {
            const a = -Math.PI / 2 + R.range(-1.2, 1.2), sp = R.range(70, 220);
            hot.spawn(P.SPARK, R.range(-2, 2), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.5, 1));
          }
          for (let j = 0; j < Math.round(5 * k); j++) hot.spawn(P.EMBER, R.range(-4, 4), -2, R.range(-25, 25), -R.range(30, 80), R.range(0.8, 1.5));
          for (let j = 0; j < Math.round(18 * k); j++) {
            const a = -Math.PI / 2 + R.range(-1.1, 1.1), sp = R.range(50, 190);
            ps.spawn(P.GRIT, R.range(-3, 3), -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 1.5), R.pick(STONE), R.chance(0.35) ? 2 : 1);
          }
          for (let j = 0; j < 8; j++) ps.spawn(P.DUST, R.range(-3, 3), -1, R.sign() * R.range(30, 110), -R.range(4, 24), R.range(0.4, 0.8), DUST2, R.range(1.5, 3));
          for (let j = 0; j < Math.round(4 * k); j++) ps.spawn(P.SMOKE, R.range(-8, 8), -4, R.range(-10, 10), -R.range(10, 25), R.range(1.1, 1.6), mix(ASH, C[2], 0.3), R.range(3, 6), R.range(0.05, 0.25));
        }
        if (struck >= 0 && t < 1.7 && R.chance(6 * dt)) ps.spawn(P.SMOKE, R.range(-8, 8), -2, R.range(-4, 4), -R.range(9, 17), R.range(1, 1.3), 0, R.range(2, 3.5));
        for (let i = 0; i < gone.length - 1; i++)
          if (gone[i] <= t && gone[i] > t - dt && rand(o.seed, i, 6) < 0.5) {
            const [x, y] = end[i];
            ps.spawn(P.MOTE, x, y, R.range(-8, 8), R.range(6, 22), R.range(0.4, 0.8), R.chance(0.5) ? C[5] : C[4], R.range(0.5, 0.9));
          }
        ps.update(dt);
        hot.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const dark = 0.5 * smooth(0.46, 0.66, t) * (1 - smooth(S1 - 0.01, S1 + 0.02, t));
        if (dark > 0.01)
          for (let y = -228; y < 36; y++)
            for (let x = -W5; x < W5; x++) {
              const d = Math.hypot(x / W5, (y + 96) / 132), a = dark * (1 - smooth(0.55, 1, d));
              if (a > 0.01) p.blend(x + 0.5, y + 0.5, NIGHT, a);
            }
        sigil(p, t, C, charge(), false);
        if (struck >= 0) {
          const s = now(), front = REACH * ease.outCubic(clamp((t - S1) / 0.35)), T02 = heatAt(), fade = 1 - smooth(2.3, 2.95, t);
          const elec = s.a < 0.14 ? s.s.k * (1 - s.a / 0.14) : 0;
          for (const br of tree2)
            for (const [x, y, d] of br.pts) {
              if (d > front) break;
              const q = d / REACH, n = rand(Math.round(x * 2), Math.round(y * 2), 9), fresh = d > front - 6 && front < REACH;
              const T4 = T02 * (1.15 - q) * (br.w < 1 ? 0.8 : 1) - n * 0.25, c = fresh || elec > 0.3 && n < 0.85 ? q < 0.5 ? WHITE : C[6] : heat(T4) || SOOT22;
              p.dot(x, y + 1, SOOT4, fade);
              p.dot(x, y, c, fade);
              if (br.w >= 1 && d < 9) p.dot(x, y + 2, SOOT4, fade);
              if ((fresh || elec > 0.3) && (Math.round(d) & 3) === 0) p.glow(x, y, 7, C[5], 0.4);
              else if (T4 > 0.2 && (Math.round(d) & 3) === 0) p.glow(x, y, 5, c, 0.2 * T4);
            }
          scorch(p, 0, 0, 12, T02, fade);
          if (T02 > 0) p.glow(0, -2, 34, heat(0.55), 0.3 * T02);
        }
        ps.draw(p, "back");
        hot.draw(p, "back");
      },
      draw(p) {
        const s = now(), f = Math.floor(t * 30 + 1e-4), k = charge();
        sigil(p, t, C, k, true);
        if (t > 0.15 && t < S1) {
          const r = rng(o.seed, 61, f);
          for (let i = 0; i < Math.round(1 + 4 * k); i++) {
            const a = r.range(0, TAU), x = Math.cos(a) * RX, y = Math.sin(a) * RX * SY2;
            crackle(p, zigzag(r, x, y, x + r.range(-2.5, 2.5), y - r.range(4, 9) * (0.6 + k), 0.45, 0.3), 0.45 + 0.4 * k, C, 0.3);
          }
          p.glow(0, -2, 36, C[4], 0.12 + 0.3 * k);
        }
        if (t >= LEAD0 && t < S1) {
          const u = clamp((t - LEAD0) / (S1 - LEAD0)), st = Math.min(STEPS, Math.floor(u * STEPS) + 1), fresh = 1 - u * STEPS % 1;
          const reach = TOP2 + (MEET - TOP2) * Math.pow(st / STEPS, 1.2), prev = TOP2 + (MEET - TOP2) * Math.pow((st - 1) / STEPS, 1.2);
          for (const q of main.paths) {
            const tk = q.w >= 1;
            for (let i = 0; i < q.pts.length - 1; i++) {
              const [ax, ay] = q.pts[i], [bx, by] = q.pts[i + 1];
              if (by > reach) {
                if (ay <= reach && i > 0) p.px(ax, ay, WHITE), p.glow(ax, ay, 7, C[5], 0.5 * fresh + 0.15);
                break;
              }
              const young = by > prev;
              p.line(ax, ay, bx, by, young ? fresh > 0.4 ? tk ? C[6] : C[5] : C[4] : tk ? C[3] : C[2]);
              if (i % 4 === 0 && ay > TOP2 + 14) p.glow(ax, ay, young ? 8 : 5, C[4], young ? 0.3 * fresh + 0.1 : 0.12);
            }
          }
          if (t > 0.62) {
            const h = -MEET * ease.outQuad((t - 0.62) / (S1 - 0.62)), r = rng(o.seed, 77, f);
            const b = zigzag(r, 0, -1, r.range(-2, 2), -Math.max(3, h), 0.3, 0.3), tip = b.paths[0].pts.at(-1);
            crackle(p, b, 0.85, C, 0.45);
            p.px(tip[0], tip[1], WHITE);
            p.glow(tip[0], tip[1], 9, C[5], 0.5);
          }
        }
        const next = STROKES.find((q) => q.t > t);
        if (next && next !== STROKES[0] && t > next.t - 0.06) {
          const tr = chan(STROKES.indexOf(next)), u = (t - (next.t - 0.06)) / 0.06, i1 = Math.floor(u * tr.length);
          trace2(p, tr, C[3], 1);
          trace2(p, tr, C[6], 1, i1 - 18, i1);
          for (let i = Math.max(0, i1 - 18); i < Math.min(tr.length, i1); i += 4) if (tr[i][1] > TOP2 + 14) p.glow(tr[i][0], tr[i][1], 9, C[4], 0.35);
        } else if (s && s.k > 0) {
          const hero = s.i === 0 && s.a < 1 / 30;
          stroke2(p, bolts[s.i], s.k, C, s.i === 0 ? 1.5 : 1.2, { hero, core: s.k > 0.6 ? hero ? 1.2 : 0.8 : 0, minY: TOP2 + 14 });
          const r = 4.5 * s.k;
          p.circle(0, -1, r + 1.5, C[2]);
          p.circle(0, -1, r + 0.5, C[5]);
          p.circle(0, -1, r * 0.65, WHITE);
          if (s.a < 0.07) sparkle(p, 0, -2, Math.round(12 * s.k * (1 - s.a / 0.07)), C[6], C[4], 0.25);
          p.glow(0, -16, 96, C[3], 0.42 * s.k);
          p.glow(0, -3, 22, C[5], 0.3 * s.k);
          if (hero) p.glow(X0 * 0.5, -110, 170, C[3], 0.3);
        } else if (s) {
          const crumble = s.i === STROKES.length - 1, cool = clamp((s.a - 0.23) / 0.45), tr = chan(s.i);
          for (let i = 0; i < tr.length - 1; i++) {
            if (crumble && t >= gone[i]) continue;
            const h = crumble ? 1 - clamp((t - last.t - 0.23) / (gone[i] - last.t - 0.23)) : 1 - cool;
            p.line(tr[i][0], tr[i][1], tr[i + 1][0], tr[i + 1][1], h > 0.7 ? C[5] : h > 0.4 ? C[4] : h > 0.15 ? C[3] : C[2]);
            if (i % 6 === 0 && h > 0.3 && tr[i][1] > TOP2 + 14) p.glow(tr[i][0], tr[i][1], 6, C[4], 0.15 * h);
          }
        }
        if (s && s.a < 0.4) {
          const r = rng(o.seed, 91, f), run = s.i === 0 ? REACH * ease.outCubic(clamp(s.a / 0.35)) : REACH * clamp(s.a / 0.22);
          for (const br of tree2) {
            if (br.w < 1 || r.next() < 0.3) continue;
            const i1 = br.pts.findIndex(([, , d]) => d > run), j1 = i1 < 0 ? br.pts.length : i1, j0 = Math.max(0, j1 - r.int(7, 13));
            const pts = br.pts.slice(j0, j1).map(([x, y]) => [x + r.range(-0.6, 0.6), y - 1.5 - r.range(0, 2.5)]);
            if (pts.length > 1) crackle(p, { paths: [{ pts, w: 1 }] }, 0.9 * (1 - s.a / 0.4) + 0.1, C, 0.35);
          }
        }
        ps.draw(p, "front");
        hot.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/lightning/zap-hit.js
  var zap_hit_exports = {};
  __export(zap_hit_exports, {
    create: () => create17,
    meta: () => meta32
  });
  var meta32 = {
    name: "Zap hit",
    desc: "A contact zap: an arc snaps in from the left, the hit point overloads into a knot of tiny crackling zigzags, a fern of burn marks glows outward, sparks jink away, ozone puffs.",
    tags: ["lightning", "electric", "hit", "impact", "combat", "directional", "one-shot"],
    size: [144, 112],
    origin: [76, 56],
    duration: 0.9,
    loop: false,
    fps: 30,
    bg: "dark",
    options: { palette: VOLT, seed: 3 }
  };
  var SNAP2 = 0.05;
  var ASH2 = hex("#6a6680");
  function fern(R) {
    const out = [];
    const grow = (x, y, a, len2, w, d, depth) => {
      const pts = [[x, y, d]];
      let side = R.sign();
      for (let s = 0; s < len2; s += 1.4) {
        a += R.range(-0.3, 0.3);
        x += Math.cos(a) * 1.4;
        y += Math.sin(a) * 1.4;
        d += 1.4;
        pts.push([x, y, d]);
        if (depth < 2 && s > 2 && R.chance(0.24)) {
          side = -side;
          grow(x, y, a + side * R.range(0.55, 1.05), (len2 - s) * R.range(0.3, 0.55), w * 0.6, d, depth + 1);
        }
      }
      out.push({ pts, w });
    };
    for (let i = 0; i < 6; i++) grow(0, 0, i / 6 * TAU + R.range(-0.35, 0.35), R.range(18, 32), 1, 0, 0);
    return out;
  }
  function create17(o) {
    const C = fit(o.palette, 8), R = new Rng(o.seed), ps = new Particles({ rng: R }), lights = new Lights();
    const tree2 = fern(R), Y0 = R.range(-14, 6);
    const kinked = Array.from({ length: 16 }, () => {
      const a = R.range(-1.2, 1.2) + (R.chance(0.7) ? 0 : Math.PI), sp = R.range(130, 250);
      return { x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: R.range(0.2, 0.36), age: -SNAP2, next: R.range(0.02, 0.05), trail: [] };
    });
    let t = 0, hit = false;
    return {
      update(dt) {
        t += dt;
        if (!hit && t >= SNAP2) {
          hit = true;
          lights.add(0, 0, 60, C[4], 0.7, 0.3);
          lights.add(0, 0, 14, WHITE, 0.5, 0.07);
          for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, R.range(-3, 5), R.range(-4, 2), R.range(-5, 8), -R.range(8, 16), R.range(0.55, 0.75), mix(ASH2, C[4], 0.3), R.range(2.5, 3.8), R.range(0.08, 0.16));
        }
        for (const s of kinked) {
          if ((s.age += dt) < 0 || s.age >= s.life) continue;
          if ((s.next -= dt) <= 0) {
            s.next = R.range(0.025, 0.055);
            const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx) + R.sign() * R.range(0.6, 1.3);
            s.vx = Math.cos(a) * sp;
            s.vy = Math.sin(a) * sp;
            s.trail.push([s.x, s.y]);
            if (s.trail.length > 4) s.trail.shift();
          }
          s.vx -= s.vx * 3 * dt;
          s.vy -= s.vy * 3 * dt - 140 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        if (t < SNAP2) return;
        const cool = smooth(0.45, 0.85, t), fade = 1 - smooth(0.78, 0.88, t);
        for (const br of tree2)
          for (let i = 1; i < br.pts.length; i++) {
            const [x0, y0] = br.pts[i - 1], [x, y, d] = br.pts[i], age = t - SNAP2 - d / 260;
            if (age < 0) break;
            const k = Math.exp(-age / 0.22) - cool * 0.3, c = k > 0.75 ? WHITE : k > 0.45 ? C[6] : k > 0.25 ? C[5] : k > 0.1 ? C[4] : k > -0.05 ? C[2] : C[1];
            p.line(x0, y0, x, y, c, fade);
            if (br.w >= 1 && d < 9) p.line(x0 + 1, y0, x + 1, y, k > 0.45 ? C[5] : C[2], fade);
            if ((i & 3) === 0 && k > 0) p.glow(x, y, 5, C[5], 0.35 * k * fade);
          }
        ps.draw(p, "back");
      },
      draw(p) {
        const f = Math.floor(t * 30 + 1e-4);
        if (t < 0.32) {
          const r = rng(o.seed, 2, f), b = zigzag(r, -66, Y0, 0, 0, 0.22, 0.35), u = clamp(t / SNAP2);
          const k = t < SNAP2 ? 1 : t < 0.2 ? f % 2 ? 0.7 : 1 : 0.55 * (1 - (t - 0.2) / 0.12);
          stroke2(p, u < 1 ? { paths: [b.paths[0]] } : b, k, C, t < SNAP2 + 0.034 ? 0.95 : 0.7, { upTo: u, hero: t >= SNAP2 && t < SNAP2 + 0.034 });
          if (u < 1) {
            const tp = b.paths[0].pts, [hx, hy] = tp[Math.floor(u * (tp.length - 1))];
            p.circle(hx, hy, 2, WHITE);
            p.glow(hx, hy, 14, C[5], 0.6);
          }
        }
        if (t >= SNAP2 && t < 0.45) {
          const a = (t - SNAP2) / 0.4, r = rng(o.seed, 5, f), R02 = 8 * (1 - a * 0.6), m = Math.round(11 * (1 - a * 0.5));
          for (let i = 0; i < m; i++) {
            const ang = r.range(0, TAU), d0 = r.range(0.5, R02 * 0.5), ang2 = ang + r.range(-1.2, 1.2), d1 = r.range(R02 * 0.55, R02);
            crackle(p, zigzag(r, Math.cos(ang) * d0, Math.sin(ang) * d0, Math.cos(ang2) * d1, Math.sin(ang2) * d1, 0.5, 0), 0.75 * (1 - a) + 0.25, C, 0.25);
          }
          p.circle(0, 0, 3 * (1 - a) + 1, C[5]);
          p.circle(0, 0, 2 * (1 - a) + 0.5, WHITE);
          p.glow(0, 0, 20, C[4], 0.55 * (1 - a));
          if (t < SNAP2 + 0.07) p.glow(0, 0, 9, WHITE, 0.4);
        }
        for (const s of kinked) {
          if (s.age < 0 || s.age >= s.life) continue;
          const k = 1 - s.age / s.life, path = [...s.trail, [s.x, s.y]];
          for (let i = 0; i < path.length - 1; i++) p.line(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], i === path.length - 2 ? k > 0.5 ? WHITE : C[6] : k > 0.5 ? C[5] : C[4], 0.6 + 0.4 * (i / path.length));
          p.px(s.x, s.y, k > 0.4 ? WHITE : C[5]);
          p.glow(s.x, s.y, 4, C[5], 0.4 * k);
        }
        if (t >= SNAP2) p.glow(0, 0, 40 * Math.max(0, 1 - t / 0.85), C[3], 0.45 * Math.exp(-(t - SNAP2) * 5) * (f % 2 ? 0.7 : 1));
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
  }

  // vendor/pixelfx/fx/holy/heal.js
  var heal_exports = {};
  __export(heal_exports, {
    act: () => act7,
    create: () => create18,
    meta: () => meta33
  });

  // vendor/pixelfx/fx/holy/_lib.js
  var GOLD = ["#3b1d2a", "#7a3a2c", "#c4652e", "#f0a040", "#ffd25e", "#fff0a0", "#fffbe0", "#ffffff"];
  var SHAPES2 = /* @__PURE__ */ new WeakMap();
  function shapeOf(A) {
    let s = SHAPES2.get(A.mask);
    if (s && s.x === A.x && s.y === A.y) return s;
    const m = A.mask, inside = (i, j) => i >= 0 && j >= 0 && i < m.w && j < m.h && m.data[j * m.w + i] > 0;
    const edge = [], out = [];
    for (let j = -1; j <= m.h; j++)
      for (let i = -1; i <= m.w; i++) {
        const nb = inside(i - 1, j) + inside(i + 1, j) + inside(i, j - 1) + inside(i, j + 1);
        if (inside(i, j)) {
          if (nb < 4) edge.push([A.x + i, A.y + j]);
        } else if (nb) out.push([A.x + i, A.y + j]);
      }
    s = { x: A.x, y: A.y, edge, out, top: A.y, bottom: A.y + m.h, at: (x, y) => inside(Math.floor(x) - A.x, Math.floor(y) - A.y) };
    SHAPES2.set(A.mask, s);
    return s;
  }
  function recolor(p, A, fn, a = 1) {
    const m = A.mask, P4 = A.pixels, fa = typeof a === "function";
    if (!P4) return;
    for (let j = 0; j < m.h; j++)
      for (let i = 0; i < m.w; i++) {
        const c = P4[j * m.w + i];
        if (!c) continue;
        const x = A.x + i, y = A.y + j, n = fn(c, x, y);
        if (n) p.dot(x, y, n, fa ? a(x, y) : a);
      }
  }
  function oval(p, cx, cy, rx, ry, c, a = 1, keep2 = null) {
    if (rx < 0.5) return;
    const n = Math.ceil(Math.max(rx, ry) * TAU * 1.5) + 6, fc = typeof c === "function", fa = typeof a === "function";
    for (let j = 0; j < n; j++) {
      const g = j / n * TAU;
      if (keep2 && !keep2(g)) continue;
      p.dot(cx + Math.cos(g) * rx, cy + Math.sin(g) * ry, fc ? c(g) : c, fa ? a(g) : a);
    }
  }

  // vendor/pixelfx/fx/holy/heal.js
  var meta33 = {
    name: "Heal",
    desc: "Petals of light bloom under the feet, a hoop of light rises up the body restoring its colour and leaving sparkles, and motes spiral up and pop into tiny hearts.",
    tags: ["holy", "heal", "restore", "buff", "petals", "hearts", "character", "one-shot"],
    size: [80, 104],
    origin: [40, 92],
    duration: 1.9,
    loop: false,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: ["#3d2027", "#7d3f35", "#c97a4a", "#f2b46a", "#ffd994", "#fff0cf", "#fffaf2", "#ffffff"], seed: 2 }
  };
  var HURT = { turn: 0.8, crouch: 5, lean: 3, hy: 1, fx: 1, fy: -21, bx: 7, by: -15, ffx: 4, fbx: -3 };
  var UP2 = { turn: 1.15, crouch: -1, fx: -13, fy: -36, bx: 14, by: -36, hy: -1, ffx: -3, fbx: 4 };
  var act7 = {
    onBody: true,
    poses: [
      [-0.3, HURT],
      [0.16, { ...HURT, crouch: 6 }],
      [0.5, { ...HURT, crouch: 3, lean: 1, hy: 0 }],
      [0.78, UP2],
      [1.2, { ...UP2, crouch: 0, fy: -30, by: -30, hy: 0 }],
      [1.9, READY]
    ]
  };
  var SY3 = 0.3;
  var NP = 8;
  var PR = 16;
  var LIFT0 = 0.16;
  var LIFT1 = 0.74;
  var TOPY = -43;
  var HEART = [".#.#.", "#####", ".###.", "..#.."];
  function heart(p, x, y, C, a) {
    const X = Math.round(x) - 2, Y = Math.round(y) - 2, at2 = (i, j) => j >= 0 && j < 4 && i >= 0 && i < 5 && HEART[j][i] === "#";
    for (let j = -1; j <= 4; j++)
      for (let i = -1; i <= 5; i++) {
        if (at2(i, j)) p.dot(X + i, Y + j, i === 1 && j === 1 ? WHITE : j >= 2 ? C[5] : C[6], a);
        else if (at2(i - 1, j) || at2(i + 1, j) || at2(i, j - 1) || at2(i, j + 1)) p.dot(X + i, Y + j, C[3], a * 0.9);
      }
    p.glow(x, y, 6, C[5], 0.4 * a);
  }
  function create18(o) {
    var _a;
    const C = fit(o.palette, 8), A = o.actor, S2 = shapeOf(A), R = new Rng(o.seed);
    const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[4]] });
    const lights = new Lights();
    const rows2 = /* @__PURE__ */ new Map();
    for (const [x, y] of S2.edge) ((_a = rows2.get(y)) != null ? _a : rows2.set(y, []).get(y)).push(x);
    const petals2 = Array.from({ length: NP }, (_, k) => ({ a: k / NP * TAU + 0.2, t0: 0.02 + k * 3 % NP * 0.035, w: R.range(4.2, 5.2) }));
    const motes2 = [];
    for (let k = 0; k < NP; k++) motes2.push({ t0: 0.2 + k * 0.05, th0: petals2[k].a, r0: PR * 0.9, y0: -1, w: 4.2 * (k % 2 ? 1 : -1), v: R.range(46, 58), life: R.range(0.75, 0.95), kind: k % 2 });
    for (let k = 0; k < 8; k++) motes2.push({ t0: LIFT1 + R.range(0, 0.06), th0: k / 8 * TAU, r0: R.range(12, 18), y0: TOPY + R.range(-2, 4), w: 3.6 * (k % 2 ? 1 : -1), v: R.range(14, 34), life: R.range(0.35, 0.6), kind: (k + 1) % 2 });
    let t = 0, burst = false, lastRow = 1;
    const hoopY = (tt) => lerp(0, TOPY, ease.inOutSine(seg(tt, LIFT0, LIFT1)));
    const hoopR = (tt) => lerp(PR, 12, seg(tt, LIFT0, LIFT1));
    function bloom(k, tt) {
      const pe = petals2[k];
      return ease.outBack(seg(tt, pe.t0, pe.t0 + 0.3), 1.8) * (1 - ease.inBack(seg(tt, 1.25 + k * 0.02, 1.6 + k * 0.02), 1.4));
    }
    function petal2(p, k, back) {
      const pe = petals2[k], g = pe.a + t * 0.4, near = Math.sin(g) >= 0, b = bloom(k, t);
      if (near === back || b <= 0.02) return;
      const ca = Math.cos(g), sa = Math.sin(g), rb = 6, rt = rb + 9 * Math.min(1.2, b), h = (k % 2 ? 7 : 9) * b;
      const bx = ca * rb, by = sa * rb * SY3, tx = ca * rt, ty = sa * rt * SY3 - h, L = Math.hypot(tx - bx, ty - by);
      if (L < 1.5) return;
      const ux = (tx - bx) / L, uy = (ty - by) / L, W6 = pe.w * Math.min(1, b) * (0.35 + 0.65 * Math.abs(sa)), pad = W6 + 1;
      p.each(Math.min(bx, tx) - pad, Math.min(by, ty) - pad, Math.max(bx, tx) + pad, Math.max(by, ty) + pad, (x, y, sx, sy) => {
        const dx = x - bx, dy = y - by, u = (dx * ux + dy * uy) / L;
        if (u < 0 || u > 1) return;
        const hw = W6 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.7) + 0.2, v = Math.abs(-dx * uy + dy * ux) / hw;
        if (v > 1) return;
        if (u > 0.9) return p.put(sx, sy, WHITE, 1);
        if (v > 0.7) return p.put(sx, sy, u < 0.3 ? C[3] : u < 0.7 ? C[5] : C[6], 1);
        if (v < 0.2 && u > 0.15 && u < 0.85) return p.put(sx, sy, u < 0.55 ? C[5] : C[6], back ? 0.75 : 0.85);
        p.blendPx(sx, sy, u < 0.45 ? C[3] : C[4], back ? 0.6 : 0.45);
      });
      p.glow(tx, ty, 5, C[5], 0.35 * Math.min(1, b));
    }
    function hoop(p, back) {
      if (t < LIFT0 || t > LIFT1 + 0.12) return;
      const y = hoopY(t), r = hoopR(t) * (t > LIFT1 ? 1 - (t - LIFT1) / 0.12 : 1), keep2 = back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
      oval(p, 0, y, r, r * SY3, (g) => Math.sin(g) > 0.5 ? WHITE : C[6], back ? 0.8 : 1, keep2);
      if (!back) {
        oval(p, 0, y + 1, r - 0.5, r * SY3, C[4], 1, keep2);
        for (let i = -2; i <= 2; i++) p.glow(i * r * 0.45, y, 8, C[5], 0.32);
      }
    }
    return {
      update(dt) {
        t += dt;
        if (t > LIFT0 && t < LIFT1) {
          const Y = Math.round(hoopY(t));
          for (let y = lastRow; y > Y; y--) {
            const xs = rows2.get(y);
            if (!xs || !R.chance(0.45)) continue;
            ps.spawn(P.STAR, R.pick(xs) + R.range(-1, 1) * 2, y, R.range(-4, 4), -R.range(4, 12), R.range(0.3, 0.55), R.chance(0.5) ? WHITE : C[6], R.range(0.6, 1.6));
          }
          lastRow = Math.min(lastRow, Y);
        }
        if (!burst && t >= LIFT1) {
          burst = true;
          lights.add(0, TOPY, 26, C[5], 0.55, 0.3);
          lights.add(0, TOPY, 10, WHITE, 0.45, 0.08);
        }
        ps.update(dt);
        lights.update(dt);
      },
      drawBack(p) {
        const pool = smooth(0, 0.2, t) * (1 - smooth(1.3, 1.75, t));
        if (pool > 0) p.glow(0, -2, 30, C[4], 0.3 * pool);
        for (let k = 0; k < NP; k++) petal2(p, k, true);
        hoop(p, true);
        ps.draw(p, "back");
        riders(p, true);
      },
      draw(p) {
        const drain = smooth(0, 0.08, t);
        if (t < LIFT1 + 0.35) {
          const Y = t < LIFT0 ? 1 : hoopY(t), done = t >= LIFT1;
          recolor(p, A, (c, x, y) => {
            const d = y - Y;
            if (!done && d < -0.5) {
              const l = luma(c) * 0.88;
              return mix(c, rgb(l * 236, l * 226, l * 222), 0.68 * drain);
            }
            if (!done && d < 1) return WHITE;
            if (!done && d < 2.5) return C[6];
            const k = done ? 0.45 * (1 - seg(t, LIFT1, LIFT1 + 0.35)) : 0.5 * Math.exp(-(d - 2.5) / 5);
            return k > 0.05 ? mix(c, C[5], k) : 0;
          });
          if (t > LIFT0 && !done) p.glow(0, Y, 18, C[5], 0.35);
        }
        for (let k = 0; k < NP; k++) petal2(p, k, false);
        hoop(p, false);
        if (t >= LIFT1 && t < LIFT1 + 0.25) sparkle(p, 0, TOPY, 8 * (1 - (t - LIFT1) / 0.25), WHITE, C[5], 0.6);
        riders(p, false);
        ps.draw(p, "front");
        lights.draw(p);
      }
    };
    function riders(p, back) {
      for (const m of motes2) {
        const a = t - m.t0;
        if (a < 0) continue;
        const at2 = (aa) => {
          const th = m.th0 + m.w * aa, r = m.r0 * (1 - 0.45 * (aa / m.life));
          return [Math.cos(th) * r, m.y0 - m.v * aa, Math.sin(th)];
        };
        if (a < m.life) {
          const [x2, y2, z] = at2(a);
          if (z < 0 !== back) continue;
          for (let j = 0; j < 7; j++) {
            const aj = a - j * 0.03;
            if (aj < 0) break;
            const [tx, ty, tz] = at2(aj);
            if (tz < 0 !== back) continue;
            p.dot(tx, ty, j === 0 ? WHITE : j < 3 ? C[6] : C[5], (1 - j / 7) * (back ? 0.6 : 1));
          }
          p.glow(x2, y2, 4, C[5], back ? 0.2 : 0.4);
          continue;
        }
        const u = (a - m.life) / 0.36;
        if (u >= 1 || back) continue;
        const [x, y] = at2(m.life), k = 1 - smooth(0.5, 1, u);
        if (u < 0.12) sparkle(p, x, y, 3, WHITE, C[6], 0.5);
        else if (m.kind) heart(p, x, y - u * 6, C, k);
        else sparkle(p, x, y - u * 5, 1 + 2 * k * (0.7 + 0.3 * Math.sin(a * 30)), WHITE, C[5], 0.45 * k);
      }
    }
  }

  // vendor/pixelfx/fx/holy/blessing.js
  var blessing_exports = {};
  __export(blessing_exports, {
    act: () => act8,
    draw: () => draw16,
    drawBack: () => drawBack10,
    meta: () => meta34
  });
  var meta34 = {
    name: "Blessing",
    desc: "A soft cone of light rests on the character from above; sparkles drift down through it, twinkling, and wink out where they land on the head and shoulders.",
    tags: ["holy", "blessing", "buff", "light", "sparkle", "character", "loop"],
    size: [80, 128],
    origin: [40, 108],
    duration: 3,
    loop: true,
    fps: 30,
    bg: "ground",
    actor: 2,
    options: { palette: GOLD, seed: 7 }
  };
  var OPEN2 = { turn: 1.15, fx: -13, fy: -31, bx: 14, by: -31, hy: -1, ffx: -3, fbx: 4 };
  var act8 = {
    onBody: true,
    poses: [
      [0, OPEN2],
      [0.75, { ...OPEN2, fy: -33, by: -33 }],
      [1.5, { ...OPEN2, crouch: -1, fy: -35, by: -35 }],
      [2.25, { ...OPEN2, fy: -33, by: -33 }],
      [3, OPEN2]
    ]
  };
  var TOP3 = -108;
  var T3 = 3;
  var halfW = (y) => lerp(5, 20, (y - TOP3) / -TOP3);
  var RAYS = [[-0.62, 0.16, 1, 0.3], [-0.2, 0.2, 2, 1.7], [0.22, 0.14, 1, 4.1], [0.6, 0.18, 2, 2.6]];
  var ray2 = (q, t) => {
    let I2 = 0.3 * Math.max(0, 1 - q * q);
    for (const [o, w, k, ph] of RAYS) I2 += Math.exp(-(((q - o) / w) ** 2)) * (0.55 + 0.45 * Math.sin(t / T3 * TAU * k + ph)) * 0.6;
    return I2 * smooth(1.25, 0.75, Math.abs(q));
  };
  var LANDS = /* @__PURE__ */ new Map();
  function landings(o, S2) {
    const key = `${o.seed}:${S2.x}:${S2.y}`;
    if (LANDS.has(key)) return LANDS.get(key);
    const out = [];
    for (let i = 0; i < 20; i++) {
      const R = rng(o.seed, i), q = R.range(-0.9, 0.9), v = R.range(22, 34), sway = R.range(1, 3), ph = R.range(0, TAU), size = R.range(0.8, 2.4);
      let land = Infinity;
      for (let a = 0; a < 6; a += 0.02) {
        const y = TOP3 + 6 + v * a, x = q * halfW(y) + Math.sin(a * 2.2 + ph) * sway;
        if (y >= -1 || S2.at(x, y)) {
          land = a;
          break;
        }
      }
      out.push({ q, v, sway, ph, size, land });
    }
    LANDS.set(key, out);
    return out;
  }
  function drawBack10(p, t, o) {
    const C = fit(o.palette, 8);
    p.each(-24, TOP3, 24, 0.5, (x, y, sx, sy) => {
      const I2 = ray2(x / halfW(y), t) * (0.6 + 0.4 * smooth(TOP3, 0, y));
      if (I2 < 0.02) return;
      p.blendPx(sx, sy, C[6], I2 * 0.13);
      p.add(sx, sy, C[4], I2 * 0.22);
    });
    for (const [o2, , k, ph] of [RAYS[1], RAYS[2]])
      for (let y = TOP3; y < -1; y++) {
        const pulse = 0.5 + 0.5 * Math.sin(y * 0.11 - t / T3 * TAU * 3 + ph);
        p.dot(o2 * halfW(y), y, pulse > 0.85 ? WHITE : C[6], (0.1 + 0.45 * pulse) * (0.5 + 0.5 * Math.sin(t / T3 * TAU * k + ph)) * smooth(TOP3, TOP3 + 20, y));
      }
    p.glow(0, -4, 30, C[4], 0.22);
  }
  function draw16(p, t, o) {
    const C = fit(o.palette, 8), A = o.actor, S2 = A ? shapeOf(A) : null;
    if (A) {
      const m = A.mask;
      for (let i = 0; i < m.w; i++)
        for (let j = 0; j < m.h; j++) {
          const c = A.pixels[j * m.w + i];
          if (!c || luma(c) < 0.15) continue;
          p.px(A.x + i, A.y + j, mix(c, C[6], 0.35));
          break;
        }
      p.glow(0, -30, 20, C[5], 0.22);
    }
    for (let y = 0; y <= 3; y++)
      for (let x = -24; x <= 24; x++) {
        const u = Math.hypot(x / 24, y / 4);
        if (u >= 1) continue;
        p.dot(x, y, u < 0.3 ? y ? C[5] : WHITE : u < 0.6 ? C[5] : u < 0.85 ? C[4] : C[3], y === 0 ? Math.sqrt(1 - u) : (1 - u) * 0.7);
      }
    if (S2) {
      const L = landings(o, S2);
      cycle(t, T3, L.length, o.seed, (g) => 3, (age, life, R, i) => {
        const s = L[i], y = TOP3 + 6 + s.v * age, x = s.q * halfW(y) + Math.sin(age * 2.2 + s.ph) * s.sway, fade = Math.min(1, age / 0.3);
        if (age > s.land) {
          const w = (age - s.land) / 0.14;
          if (w < 1) {
            const ly = TOP3 + 6 + s.v * s.land, lx = s.q * halfW(ly) + Math.sin(s.land * 2.2 + s.ph) * s.sway;
            sparkle(p, lx, ly, 3 * (1 - w) + 1, WHITE, C[6], 0.5 * (1 - w));
          }
          return;
        }
        const tw = 0.6 + 0.4 * Math.sin(age * (7 + i % 4) + s.ph);
        if (s.size > 1.2) sparkle(p, x, y, s.size * tw * fade, tw > 0.85 ? WHITE : C[6], C[5], 0.35 * fade);
        else {
          p.dot(x, y, tw > 0.8 ? WHITE : C[6], fade);
          p.glow(x, y, 3, C[5], 0.35 * fade);
        }
      });
    }
    cycle(t, T3, 16, o.seed + 9, (g) => g.range(1.2, 2.4), (age, life, R) => {
      const u = age / life, y = TOP3 + 10 + R.range(0, 90) + u * R.range(6, 14), q = R.range(-1, 1), x = q * halfW(y) + Math.sin(age * 1.7 + q * 5) * 1.5, k = Math.sin(u * Math.PI) * ray2(q, t);
      if (k > 0.12) p.dot(x, y, k > 0.45 ? WHITE : C[6], Math.min(1, k * 2.2));
    });
  }

  // js/pixelfx-entry.js
  var weather = {
    rain: rain_exports,
    snow: snow_exports,
    fog: fog_exports,
    storm: storm_exports,
    blizzard: blizzard_exports,
    "falling-leaves": falling_leaves_exports,
    "cherry-blossoms": cherry_blossoms_exports,
    fireflies: fireflies_exports,
    clouds: clouds_exports,
    aurora: aurora_exports,
    "god-rays": god_rays_exports,
    "shooting-stars": shooting_stars_exports
  };
  var transitions = {
    iris: iris_exports,
    "diamond-wipe": diamond_wipe_exports,
    "slash-wipe": slash_wipe_exports,
    "pixel-dissolve": pixel_dissolve_exports,
    blinds: blinds_exports
  };
  var attacks = {
    "sword-slash": sword_slash_exports,
    "double-slash": double_slash_exports,
    thrust: thrust_exports,
    "hammer-smash": hammer_smash_exports,
    "heavy-cleave": heavy_cleave_exports,
    "hit-spark": hit_spark_exports,
    "crit-hit": crit_hit_exports,
    "blunt-hit": blunt_hit_exports,
    "ground-slam": ground_slam_exports,
    fireball: fireball_exports,
    "flame-pillar": flame_pillar_exports,
    "frost-nova": frost_nova_exports,
    "ice-spikes": ice_spikes_exports,
    "lightning-strike": lightning_strike_exports,
    "zap-hit": zap_hit_exports,
    heal: heal_exports,
    blessing: blessing_exports
  };
  var api = {
    createFrame,
    clearFrame,
    createFx,
    composite,
    weather,
    transitions,
    attacks,
    ready: true
  };
  if (typeof window !== "undefined") window.PixelFx = api;
  var pixelfx_entry_default = api;
  return __toCommonJS(pixelfx_entry_exports);
})();
