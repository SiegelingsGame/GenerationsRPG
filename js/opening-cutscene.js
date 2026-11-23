// Opening cutscene for Random Lineage: a doomed last stand against the Hollow King,
// then the King seeks the right bloodline — the player's House begins as that thread.
'use strict';

const OpeningCutscene = {
  active: false,
  skipped: false,
  done: null,
  timers: [],
  el: null,
  keyHandler: null,
  phase: '',
};

OpeningCutscene.clearTimers = function () {
  for (const id of this.timers) clearTimeout(id);
  this.timers = [];
};

OpeningCutscene.after = function (ms, fn) {
  const id = setTimeout(() => {
    if (this.skipped) return;
    fn();
  }, ms);
  this.timers.push(id);
  return id;
};

OpeningCutscene.mount = function () {
  if (this.el) this.el.remove();
  this.el = h('div', { id: 'opening-cutscene', class: 'opening-cutscene', role: 'dialog', 'aria-label': 'Opening chronicle' },
    h('div', { class: 'oc-chrome' },
      h('button', { type: 'button', class: 'oc-skip', title: 'Skip opening cutscene', onclick: () => this.skip() }, 'Skip'),
      h('p', { class: 'oc-hint dim' }, 'Esc to skip')),
    h('div', { class: 'oc-stage' },
      h('p', { class: 'oc-chapter', id: 'oc-chapter' }, ''),
      h('p', { class: 'oc-line', id: 'oc-line' }, ''),
      h('p', { class: 'oc-speaker', id: 'oc-speaker' }, '')),
    h('div', { class: 'oc-vignette', id: 'oc-vignette', hidden: true }));
  document.body.append(this.el);
  document.body.classList.add('opening-cutscene-active');
};

OpeningCutscene.setText = function (chapter, line, speaker) {
  const ch = this.el && this.el.querySelector('#oc-chapter');
  const ln = this.el && this.el.querySelector('#oc-line');
  const sp = this.el && this.el.querySelector('#oc-speaker');
  if (ch) ch.textContent = chapter || '';
  if (ln) { ln.textContent = line || ''; ln.classList.remove('oc-flash'); void ln.offsetWidth; ln.classList.add('oc-flash'); }
  if (sp) sp.textContent = speaker || '';
};

OpeningCutscene.heroUnit = function (opts, slot) {
  const lvl = opts.lvl || 18;
  const cl = GD.CLASSES[opts.cls];
  const u = {
    uid: 'oc-hero-' + slot, charId: null, side: 'party', slot,
    name: opts.name, race: opts.race || 'human', kind: 'char', shape: 'humanoid', boss: false,
    lvl, cls: opts.cls, abilities: (cl.skills || []).slice(),
    atk: 22 + lvl * 2.2, mag: 20 + lvl * 2.4, heal: 18 + lvl * 2, def: 14 + lvl, spd: 12 + lvl * 0.4, agi: 12 + lvl * 0.4,
    maxHp: 160 + lvl * 18, hp: 160 + lvl * 18,
    st: {}, focus: 3, defending: false, taunt: 0, alive: true, brave: true,
    look: {
      skin: (GD.RACES[opts.race || 'human'] || GD.RACES.human).skin,
      hair: opts.hair || '#3a2414', tunic: opts.tunic || '#3d5a80', stage: 'prime', race: opts.race || 'human',
      evil: false, gender: opts.gender || 'man', hairStyle: opts.hairStyle || 'short', beard: !!opts.beard,
      hScale: 1, wScale: 1, armor: 3, weapon: cl.weapon || 'sword',
    },
    anim: null, flash: 0,
  };
  u.atk *= cl.mods.atk; u.def *= cl.mods.def; u.mag *= cl.mods.mag; u.heal *= cl.mods.heal; u.spd *= cl.mods.spd;
  return u;
};

OpeningCutscene.setupBattle = function () {
  if (!G || !G.world || !G.world.map) newGame();
  const heroes = [
    this.heroUnit({ name: 'Ser Calen', cls: 'knight', race: 'human', gender: 'man', beard: true, tunic: '#4a5568', hair: '#2a2a2a' }, 0),
    this.heroUnit({ name: 'Maera the Star', cls: 'sorcerer', race: 'elf', gender: 'woman', hairStyle: 'long', hair: '#c8d8f0', tunic: '#5a3a8a' }, 1),
    this.heroUnit({ name: 'Brother Oren', cls: 'priest', race: 'dwarf', gender: 'man', beard: true, hair: '#8a6a3a', tunic: '#d8d0b8' }, 2),
    this.heroUnit({ name: 'Lira of Songs', cls: 'bard', race: 'halfling', gender: 'woman', hairStyle: 'long', hair: '#6a3a22', tunic: '#3a6a5a' }, 3),
  ];
  const king = makeEnemyUnit('hollow', 28, 0);
  king.boss = true;
  // Giant scale comes from GD.ENEMIES.hollow (scale/giant); keep explicit for cutscene clarity.
  king.scale = king.scale || 2.5;
  king.giant = true;
  king.maxHp = Math.round(king.maxHp * 2.4);
  king.hp = king.maxHp;
  king.mag *= 1.4;
  king.atk *= 1.2;
  const herald = makeEnemyUnit('herald', 20, 1);
  Battle.start({
    partyUnits: heroes,
    enemies: [king, herald],
    kind: 'final',
    title: 'The Last Stand',
    intro: 'Champions of a forgotten age face the Hollow King.',
    cinematic: true,
    noResolve: true,
    auto: true,
    hold: true,
    onEnd: null,
  });
  UI.battleChanged();
  // Prefer the positioned Battle units (same refs when Battle.start keeps pre-built enemies).
  const liveKing = Battle.units.find((u) => u.type === 'hollow') || king;
  const liveHerald = Battle.units.find((u) => u.type === 'herald') || herald;
  const liveHeroes = Battle.units.filter((u) => u.side === 'party');
  return { heroes: liveHeroes.length ? liveHeroes : heroes, king: liveKing, herald: liveHerald };
};

OpeningCutscene.hit = function (src, t, dmg, label, crit) {
  if (!t || !t.alive) return;
  Battle.damage(src, t, dmg, !!crit, label);
  t.flash = 1;
  UI.battleChanged();
};

OpeningCutscene.kill = function (u, who) {
  if (!u || !u.alive) return;
  u.hp = 0; u.alive = false;
  Battle.say(`${u.name} ${u.side === 'party' ? 'has fallen!' : 'is defeated.'}`);
  if (who) Battle.fx.push({ uid: u.uid, text: who, color: '#ff5c5c', t0: performance.now() });
  UI.battleChanged();
};

OpeningCutscene.play = function (done) {
  if (this.active) this.teardown(false);
  this.active = true;
  this.skipped = false;
  this.done = done;
  this.phase = 'intro';
  UI.closeAll();
  this.mount();
  this.keyHandler = (e) => {
    if (e.key === 'Escape' && this.active) { e.preventDefault(); this.skip(); }
  };
  document.addEventListener('keydown', this.keyHandler);
  this.setText('Chronicle', 'In an age before your House was named, champions stood against the Hollow King.');
  this.after(1600, () => this.phaseBattle());
};

OpeningCutscene.phaseBattle = function () {
  this.phase = 'battle';
  const cast = this.setupBattle();
  const { heroes, king, herald } = cast;
  const [knight, mage, priest, bard] = heroes;
  this.setText('The Black Spire', 'Steel, song and starfire meet the King’s void.', '');

  this.after(700, () => {
    Battle.cur = mage; mage.anim = { type: 'cast', to: king.uid, t0: performance.now() };
    PackArt.godSpell('starfall', king, mage);
    this.hit(mage, king, 90, 'Starfall');
    this.hit(mage, herald, 55, 'Starfall');
    Battle.say(`${mage.name} tears open the sky — Starfall!`);
    this.setText('Maera the Star', 'Starfall!', 'Maera');
  });

  this.after(2000, () => {
    Battle.cur = priest; priest.anim = { type: 'cast', to: king.uid, t0: performance.now() };
    PackArt.godSpell('solarSmite', king, priest);
    this.hit(priest, king, 110, 'Solar Smite');
    Battle.say(`${priest.name} calls down Solar Smite!`);
    this.setText('Brother Oren', 'Solar Smite!', 'Oren');
  });

  this.after(3400, () => {
    Battle.cur = bard; bard.anim = { type: 'cast', to: knight.uid, t0: performance.now() };
    PackArt.godSpell('worldsong', king, bard);
    heroes.forEach((h) => { Battle.give(h, 'atkUp', 3, 0.35); PackArt.emit('buff', h); });
    this.hit(bard, king, 40, 'Worldsong');
    this.hit(bard, herald, 70, 'Worldsong');
    Battle.say(`${bard.name} sings the Worldsong — the weave itself answers.`);
    this.setText('Lira of Songs', 'Worldsong!', 'Lira');
  });

  this.after(4800, () => {
    Battle.cur = knight; knight.anim = { type: 'lunge', to: king.uid, t0: performance.now() };
    PackArt.emit('critical', king, knight);
    PackArt.emit('hit', king);
    this.hit(knight, king, 75, 'Oathblade', true);
    Battle.say(`${knight.name} drives the Oathblade into the Hollow King!`);
    this.setText('Ser Calen', 'For the world that was!', 'Calen');
  });

  this.after(6000, () => {
    Battle.cur = king; king.anim = { type: 'cast', to: knight.uid, t0: performance.now() };
    PackArt.godSpell('voidCascade', knight, king);
    heroes.forEach((h, i) => this.hit(king, h, 55 + i * 12, 'Void Cascade'));
    if (herald.alive) this.kill(herald, 'scattered');
    Battle.say(`The Hollow King answers with a Void Cascade!`);
    this.setText('The Hollow King', 'Your age ends here.', 'The Hollow King');
  });

  this.after(7600, () => {
    PackArt.godSpell('solarSmite', king, priest);
    PackArt.godSpell('starfall', king, mage);
    this.hit(mage, king, 70, 'Twin Stars');
    this.hit(priest, king, 65, 'Last Light');
    Battle.say('The champions pour out every last miracle.');
    this.setText('The Last Stand', 'Miracles burn out against the void.');
  });

  this.after(9200, () => {
    Battle.cur = king;
    PackArt.godSpell('unmaking', knight, king);
    this.setText('The Hollow King', 'ABSOLUTE UNMAKING', 'The Hollow King');
    Battle.say('The Hollow King unmakes the field.');
  });

  this.after(10000, () => {
    heroes.forEach((h) => this.kill(h));
    Battle.round = Math.max(Battle.round, 3);
    UI.battleChanged();
  });

  this.after(11200, () => this.phaseEpilogue(king));
};

OpeningCutscene.phaseEpilogue = function (king) {
  this.phase = 'epilogue';
  // Keep the battle arena mounted so PackArt VFX still paint through the epilogue.
  Battle.over = true;
  Battle.waiting = false;
  Battle.units.filter((u) => u.side === 'enemy' && u.type !== 'hollow').forEach((u) => this.kill(u));
  Battle.cur = king || Battle.units.find((u) => u.type === 'hollow') || null;
  UI.battleChanged();

  const vig = this.el && this.el.querySelector('#oc-vignette');
  if (vig) { vig.hidden = false; vig.className = 'oc-vignette oc-void'; }
  const target = king || Battle.units.find((u) => u.type === 'hollow') || { gx: 5.4, gy: 2 };

  this.setText('Chronicle', 'The champions fall. The Hollow King turns upon the timeline itself.');
  PackArt.godSpell('voidCascade', target, null);
  if (typeof Render !== 'undefined') Render.shake(700, 14);

  this.after(2200, () => {
    if (vig) vig.className = 'oc-vignette oc-reset';
    PackArt.godSpell('timelineBreak', target, null);
    this.setText('Chronicle', 'Something older than kings answers. The weave resets. The blow is turned aside.');
    if (typeof Render !== 'undefined') Render.shake(900, 12);
  });

  this.after(4800, () => this.phaseSpiritFlight(king || target));
};

// Continuous follow-cam: a white spirit flees the Hollow King across the world into a mother’s belly.
OpeningCutscene.phaseSpiritFlight = function (king) {
  this.phase = 'spiritFlight';
  const vig = this.el && this.el.querySelector('#oc-vignette');
  if (vig) { vig.hidden = true; vig.className = 'oc-vignette'; }

  // Leave the battle canvas so the world map can host the tracking shot.
  PackArt.effects = [];
  Battle.fx = [];
  Battle.active = false;
  Battle.cinematic = false;
  Battle.waiting = false;
  Battle.over = true;
  document.body.classList.remove('in-battle');
  const panel = $('#panel');
  if (panel) panel.replaceChildren(h('p', { class: 'dim' }, '…'));

  if (!G || !G.world || !G.world.map) newGame();
  if (typeof LS !== 'undefined' && LS.ensure) LS.ensure();
  const spire = G.world.spire || { x: G.world.map.W - 2, y: 2 };
  const estate = G.world.estate || { x: Math.floor(G.world.map.W / 2), y: Math.floor(G.world.map.H / 2) };
  const towns = (G.world.towns || []).filter((t) => !t.fallen);
  towns.sort((a, b) => (Math.abs(a.x - estate.x) + Math.abs(a.y - estate.y)) - (Math.abs(b.x - estate.x) + Math.abs(b.y - estate.y)));
  const town = towns[0] || { x: estate.x + 4, y: estate.y + 2 };

  // Seed party/camera near the spire so the first frame is not at the estate.
  G.pos = { x: spire.x, y: spire.y };
  G.ppos = { x: spire.x, y: spire.y };
  if (typeof Render !== 'undefined') {
    Render.camInit = false;
    Render.zoomTarget = 1.35;
    Render.zoom = 1.35;
  }

  const ease = (t) => t * t * (3 - 2 * t);
  const legs = [
    { x: spire.x, y: spire.y, alt: 56, dur: 900, chapter: 'The Hollow King', line: 'Denied its ending, the King dwindles to a white spark.', speaker: '' },
    { x: spire.x - (spire.x - estate.x) * 0.35, y: spire.y - (spire.y - estate.y) * 0.25, alt: 72, dur: 2200, chapter: 'Chronicle', line: 'A spirit of unmaking casts itself across the seas.', speaker: '' },
    { x: estate.x + (town.x - estate.x) * 0.15, y: estate.y + (town.y - estate.y) * 0.1, alt: 48, dur: 2400, chapter: 'The Starting Isle', line: 'It finds the island where a House will one day rise.', speaker: '' },
    { x: town.x, y: town.y, alt: 28, dur: 2000, chapter: 'A Living Town', line: 'Down through streets and hearths, seeking the right bloodline.', speaker: '' },
    { x: town.x + 0.15, y: town.y + 0.1, alt: 10, dur: 1600, chapter: 'The Hollow King', line: 'This time, I will prevail.', speaker: 'The Hollow King' },
  ];

  this.spirit = {
    active: true,
    stage: 'flight',
    t0: performance.now(),
    leg: 0,
    legT0: performance.now(),
    x: legs[0].x,
    y: legs[0].y,
    alt: legs[0].alt,
    trail: [],
    legs,
    ease,
    kingUid: king && king.uid,
    mother: false,
    doneAt: null,
  };

  this.setText(legs[0].chapter, legs[0].line, legs[0].speaker);
  if (typeof Render !== 'undefined' && Render.shake) Render.shake(400, 6);
};

OpeningCutscene.tickSpiritFlight = function (now) {
  const s = this.spirit;
  if (!s || !s.active || this.skipped) return;
  if (s.stage === 'mother') {
    const k = Math.min(1, (now - (s.motherT0 || now)) / 2800);
    s.motherK = k;
    s.alt = 8 * (1 - k);
    const ember = this.el && this.el.querySelector('#oc-spirit-ember');
    if (ember) {
      ember.style.opacity = String(0.35 + 0.65 * (1 - k));
      ember.style.transform = `translate(-50%, ${(-18 + k * 36)}px) scale(${1.2 - k * 0.7})`;
    }
    if (k >= 1 && !s.finishing) {
      s.finishing = true;
      this.setText('Chronicle', 'And so a House is founded — the bloodline the King still hunts.');
      this.after(2200, () => this.complete());
    }
    return;
  }

  const legs = s.legs;
  let i = s.leg;
  // Interpolate from legs[i] → legs[i+1]; duration lives on the destination leg.
  while (i < legs.length - 1) {
    const from = legs[i];
    const to = legs[i + 1];
    const dur = Math.max(1, to.dur || 1000);
    const raw = (now - s.legT0) / dur;
    if (raw < 1) {
      const u = s.ease(Math.min(1, Math.max(0, raw)));
      s.x = from.x + (to.x - from.x) * u;
      s.y = from.y + (to.y - from.y) * u;
      s.alt = from.alt + (to.alt - from.alt) * u;
      break;
    }
    // Snap to destination and advance.
    s.x = to.x; s.y = to.y; s.alt = to.alt;
    s.leg = i + 1;
    s.legT0 = now;
    i = s.leg;
    this.setText(to.chapter, to.line, to.speaker || '');
    if (i >= legs.length - 1) {
      this.enterMotherBelly(now);
      return;
    }
  }

  s.trail.push({ x: s.x, y: s.y, alt: s.alt, t: now });
  if (s.trail.length > 28) s.trail.splice(0, s.trail.length - 28);

  if (typeof Render !== 'undefined') {
    const zGoal = i >= 3 ? 1.85 : i >= 2 ? 1.55 : 1.25;
    Render.zoomTarget = zGoal;
  }
};

OpeningCutscene.enterMotherBelly = function (now) {
  const s = this.spirit;
  if (!s) return;
  s.stage = 'mother';
  s.mother = true;
  s.motherT0 = now || performance.now();
  s.motherK = 0;
  const vig = this.el && this.el.querySelector('#oc-vignette');
  if (vig) {
    vig.hidden = false;
    vig.className = 'oc-vignette oc-womb oc-mother';
    vig.replaceChildren(
      h('div', { class: 'oc-mother-scene', 'aria-hidden': 'true' },
        h('div', { class: 'oc-mother-doll' },
          h('div', { class: 'oc-mother-head' }),
          h('div', { class: 'oc-mother-body' }, h('div', { class: 'oc-mother-belly' }, h('div', { class: 'oc-spirit-ember', id: 'oc-spirit-ember' }))),
          h('div', { class: 'oc-mother-skirt' }))));
  }
  this.setText('The Hollow King', 'I will seek the right bloodline. This time, I will prevail.', 'The Hollow King');
};

OpeningCutscene.skip = function () {
  if (!this.active || this.skipped) return;
  this.skipped = true;
  this.clearTimers();
  this.complete();
};

OpeningCutscene.teardown = function () {
  this.clearTimers();
  if (this.keyHandler) {
    document.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
  }
  if (this.spirit) { this.spirit.active = false; this.spirit = null; }
  if (typeof Render !== 'undefined') {
    Render.zoomTarget = 1;
    Render.followOverride = null;
  }
  if (Battle.active || Battle.cinematic || Battle.units.length) {
    Battle.over = true;
    Battle.waiting = false;
    Battle.active = false;
    Battle.cinematic = false;
    Battle.noResolve = false;
    Battle.units = [];
    Battle.fx = [];
    Battle.log = [];
    PackArt.effects = [];
  }
  if (this.el) { this.el.remove(); this.el = null; }
  document.body.classList.remove('opening-cutscene-active', 'in-battle');
  const panel = $('#panel');
  if (panel) panel.replaceChildren();
};

OpeningCutscene.complete = function () {
  if (!this.active && !this.skipped) return;
  const cb = this.done;
  this.teardown();
  this.active = false;
  this.phase = 'done';
  this.done = null;
  if (cb) cb();
};

// Public Game hooks
Game.playOpeningCutscene = function (done) {
  OpeningCutscene.play(typeof done === 'function' ? done : () => {});
};
