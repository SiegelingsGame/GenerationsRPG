// PixelFX weather overlays, scene transitions and battle attack bursts.
'use strict';

const FxLayer = {
  ready: false,
  W: 320,
  H: 180,
  weatherKey: null,
  weatherFx: null,
  weatherSeed: 1,
  frame: null,
  canvas: null,
  ctx: null,
  img: null,
  lastT: 0,
  attacks: [],
  transition: null,
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)'),

  init() {
    if (!window.PixelFx || !PixelFx.ready) return false;
    this.frame = PixelFx.createFrame(this.W, this.H);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.W, this.H);
    this.ready = true;
    return true;
  },

  ensure() {
    return this.ready || this.init();
  },

  dt(now) {
    const t = now || performance.now();
    const d = this.lastT ? Math.min((t - this.lastT) / 1000, 0.1) : 0;
    this.lastT = t;
    return d;
  },

  // ---------------------------------------------------------------- weather
  pickWeather() {
    if (!G || !G.world || Battle.active) return null;
    const season = typeof seasonName === 'function' ? seasonName() : 'Spring';
    const tile = tileAt(G.pos.x, G.pos.y);
    const type = tile && tile.type;
    const eraType = G.world.era && G.world.era.type;
    if (eraType === 'war') return 'storm';
    if (type === 'snow' || season === 'Winter') return (G.day % 7 === 0) ? 'blizzard' : 'snow';
    if (type === 'swamp') return 'fog';
    if (type === 'jungle') return (season === 'Summer') ? 'rain' : 'fog';
    if (season === 'Autumn') return 'falling-leaves';
    if (season === 'Spring') return (type === 'forest' || type === 'grass') ? 'cherry-blossoms' : 'god-rays';
    if (season === 'Summer' && (type === 'desert' || type === 'sand')) return 'god-rays';
    if (eraType === 'famine' || eraType === 'plague') return 'fog';
    if (type === 'forest') return 'clouds';
    return (G.day % 11 === 0) ? 'rain' : 'clouds';
  },

  syncWeather() {
    if (!this.ensure() || this.reduced.matches) { this.weatherFx = null; this.weatherKey = null; return; }
    const key = this.pickWeather();
    if (key === this.weatherKey && this.weatherFx) return;
    this.weatherKey = key;
    this.weatherFx = null;
    if (!key || !PixelFx.weather[key]) return;
    const mod = PixelFx.weather[key];
    const [ox, oy] = mod.meta.origin || [this.W / 2, this.H - 10];
    this.weatherSeed = (this.weatherSeed + 1) % 9999;
    this.weatherFx = PixelFx.createFx(mod, { x: ox, y: oy, seed: this.weatherSeed });
  },

  drawWeather(render) {
    this.syncWeather();
    if (!this.weatherFx || !render || !render.ctx) return;
    const dt = this.dt(render.t);
    this.weatherFx.update(dt);
    PixelFx.clearFrame(this.frame);
    this.weatherFx.draw(this.frame, 'back');
    this.weatherFx.draw(this.frame, 'front');
    PixelFx.composite(this.frame, this.img.data, null);
    this.ctx.putImageData(this.img, 0, 0);
    const c = render.ctx;
    c.save();
    c.globalAlpha = this.weatherKey === 'fog' ? 0.55 : this.weatherKey === 'storm' ? 0.5 : 0.42;
    c.imageSmoothingEnabled = false;
    // Soften over the map so terrain still reads.
    c.globalCompositeOperation = (this.weatherKey === 'god-rays' || this.weatherKey === 'aurora') ? 'screen' : 'source-over';
    c.drawImage(this.canvas, 0, 0, render.w, render.h);
    c.restore();
  },

  // ---------------------------------------------------------------- transitions
  playTransition(name, opts = {}) {
    if (!this.ensure() || this.reduced.matches) {
      if (opts.onDone) opts.onDone();
      return;
    }
    const mod = PixelFx.transitions[name] || PixelFx.transitions.iris;
    if (!mod) { if (opts.onDone) opts.onDone(); return; }
    const [ox, oy] = mod.meta.origin || [this.W / 2, this.H / 2];
    const fx = PixelFx.createFx(mod, { x: ox, y: oy, seed: (Math.random() * 999) | 0 });
    const host = document.createElement('canvas');
    host.className = 'fx-transition';
    host.width = this.W;
    host.height = this.H;
    Object.assign(host.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      zIndex: '30', pointerEvents: 'none', imageRendering: 'pixelated',
    });
    document.body.append(host);
    const hctx = host.getContext('2d');
    const himg = hctx.createImageData(this.W, this.H);
    const frame = PixelFx.createFrame(this.W, this.H);
    const dur = (mod.meta.duration || 1.2) * 1000;
    const t0 = performance.now();
    let last = t0;
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      fx.update(dt);
      PixelFx.clearFrame(frame);
      fx.draw(frame, 'back');
      fx.draw(frame, 'front');
      PixelFx.composite(frame, himg.data, null);
      hctx.putImageData(himg, 0, 0);
      if (now - t0 < dur && !fx.done()) requestAnimationFrame(tick);
      else {
        host.remove();
        this.transition = null;
        if (opts.onDone) opts.onDone();
      }
    };
    this.transition = { host, fx };
    requestAnimationFrame(tick);
  },

  // ---------------------------------------------------------------- battle attacks
  attackFor(src, crit) {
    const id = src && src.vfxSkill;
    if (id === 'firebolt' || id === 'soulfire') return 'flame-pillar';
    if (id === 'frostNova') return 'frost-nova';
    if (id === 'smite') return 'lightning-strike';
    if (id === 'hexbolt' || id === 'obliterate') return 'zap-hit';
    if (id === 'dissonance') return 'ground-slam';
    if (src && src.cls === 'ranger') return crit ? 'crit-hit' : 'thrust';
    if (src && (src.cls === 'berserker' || src.cls === 'warrior')) return crit ? 'heavy-cleave' : 'sword-slash';
    if (src && src.cls === 'priest') return 'blessing';
    if (src && (src.cls === 'sorcerer' || src.cls === 'warlock')) return crit ? 'flame-pillar' : 'fireball';
    return crit ? 'crit-hit' : 'hit-spark';
  },

  emitAttack(src, target, crit) {
    if (!this.ensure() || this.reduced.matches || !target) return;
    const key = this.attackFor(src, crit);
    const mod = PixelFx.attacks[key];
    if (!mod) return;
    const [ox, oy] = mod.meta.origin || [this.W / 2, this.H / 2];
    const fx = PixelFx.createFx(mod, {
      x: ox, y: oy,
      seed: (Math.random() * 9999) | 0,
      flip: !!(src && src.side === 'enemy'),
    });
    const frame = PixelFx.createFrame(this.W, this.H);
    const canvas = document.createElement('canvas');
    canvas.width = this.W;
    canvas.height = this.H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(this.W, this.H);
    this.attacks.push({
      fx, frame, canvas, ctx, img, key,
      uid: target.uid,
      t0: performance.now(),
      dur: (mod.meta.duration || 1) * 1000,
      last: performance.now(),
    });
    if (this.attacks.length > 10) this.attacks.shift();
  },

  emitHeal(target) {
    if (!this.ensure() || this.reduced.matches || !target) return;
    const mod = PixelFx.attacks.heal;
    if (!mod) return;
    const [ox, oy] = mod.meta.origin || [this.W / 2, this.H / 2];
    const fx = PixelFx.createFx(mod, { x: ox, y: oy, seed: (Math.random() * 999) | 0 });
    const frame = PixelFx.createFrame(this.W, this.H);
    const canvas = document.createElement('canvas');
    canvas.width = this.W; canvas.height = this.H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(this.W, this.H);
    this.attacks.push({
      fx, frame, canvas, ctx, img, key: 'heal', uid: target.uid,
      t0: performance.now(), dur: (mod.meta.duration || 1) * 1000, last: performance.now(),
    });
  },

  drawAttacks(render) {
    if (!this.attacks.length || !render) return;
    const now = render.t || performance.now();
    const c = render.ctx;
    this.attacks = this.attacks.filter((a) => {
      const dt = Math.min((now - a.last) / 1000, 0.1);
      a.last = now;
      a.fx.update(dt);
      PixelFx.clearFrame(a.frame);
      a.fx.draw(a.frame, 'back');
      a.fx.draw(a.frame, 'front');
      PixelFx.composite(a.frame, a.img.data, null);
      a.ctx.putImageData(a.img, 0, 0);
      const u = Battle.find && Battle.find(a.uid);
      if (!u) return now - a.t0 < a.dur;
      const p = render.unitScreen ? render.unitScreen(u) : render.biso(u.gx, u.gy);
      const lift = render.unitAimLift ? render.unitAimLift(u) : 30;
      const size = a.key === 'flame-pillar' || a.key === 'lightning-strike' ? 220 : 160;
      c.save();
      c.imageSmoothingEnabled = false;
      c.globalAlpha = 0.95;
      c.drawImage(a.canvas, p.x - size / 2, p.y - lift - size * 0.55, size, size * (this.H / this.W));
      c.restore();
      return now - a.t0 < a.dur && !a.fx.done();
    });
  },
};
