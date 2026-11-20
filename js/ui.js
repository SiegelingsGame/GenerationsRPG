// DOM user interface: HUD, panels, modals, character sheets, family tree.
'use strict';

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (v === undefined || v === null || v === false) continue;
    if ((k === 'disabled' || k === 'checked' || k === 'selected') && !v) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(3)) {
    if (kid === null || kid === undefined || kid === false) continue;
    e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return e;
}
const $ = (s) => document.querySelector(s);

function portrait(c, size = 64, bg = true) {
  const cv = document.createElement('canvas');
  const d = 2;
  cv.width = size * d; cv.height = size * d;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  cv.className = 'portrait';
  const ctx = cv.getContext('2d');
  ctx.scale(d, d);
  if (bg) {
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, c.evil ? '#3a1a22' : '#3a3550'); g.addColorStop(1, '#1d1a26');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  const saved = Render.ctx;
  Render.ctx = ctx;
  try { Render.drawFigure(size / 2, size - 5, figLook(c), size / 60, {}); } finally { Render.ctx = saved; }
  if (!c.alive) { ctx.fillStyle = 'rgba(20,20,20,0.55)'; ctx.fillRect(0, 0, size, size); }
  return cv;
}

function bar(v, max, cls) {
  return h('div', { class: 'bar ' + (cls || '') }, h('div', { style: `width:${clamp(v / max * 100, 0, 100)}%` }));
}

const UI = {
  targeting: null,
  modalStack: [],
};

UI.init = function () {
  Log.listeners.push(() => this.renderLog());
  this.buildMobile();
  this.checkForUpdate();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.checkForUpdate(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && this.modalStack.length && !this.modalStack[this.modalStack.length - 1].locked) this.closeModal();
  });
};

// ---------------------------------------------------------------- phone layout
// On a phone the map fills the screen. A Menu button opens a drawer holding the location's actions,
// the party and heir, and the House's stats and buttons. In battle, the battle actions rise as a sheet.
UI.isMobile = () => window.matchMedia('(max-width: 900px)').matches;
UI.buildMobile = function () {
  this.mob = {
    bar: h('div', { id: 'mobilebar' },
      h('button', { id: 'hudchip', onclick: () => this.openDrawer() }, ''),
      h('button', { id: 'menuBtn', 'aria-label': 'Open menu', onclick: () => this.openDrawer() }, '☰ Menu')),
    backdrop: h('div', { id: 'backdrop', onclick: () => this.closeDrawer() }),
    drawer: h('aside', { id: 'drawer', 'aria-hidden': 'true' },
      h('div', { class: 'drawer-head' }, h('b', {}, 'Generations'), h('button', { class: 'drawer-x', 'aria-label': 'Close menu', onclick: () => this.closeDrawer() }, '×')),
      h('div', { id: 'drawer-body' })),
    sheet: h('div', { id: 'sheet' }),
  };
  document.body.append(this.mob.bar, this.mob.backdrop, this.mob.drawer, this.mob.sheet);
  window.addEventListener('resize', () => { this.fixStandalone(); this.placeLayout(); });
  window.addEventListener('orientationchange', () => setTimeout(() => this.fixStandalone(), 300));
  this.fixStandalone();
  this.placeLayout();
};
// iOS home-screen apps report a viewport shorter than the screen they actually draw on, leaving an
// unpainted strip at the bottom. Measure the shortfall and let the layout extend over it.
UI.fixStandalone = function () {
  // iOS home-screen apps can report a viewport shorter than the screen they draw on. Use the real
  // screen height there, so the map and every full-screen layer reach the bottom edge.
  const ios = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  let full = window.innerHeight;
  if (ios && standalone) {
    const landscape = window.innerWidth > window.innerHeight;
    const sh = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
    full = Math.max(full, sh);
  }
  document.documentElement.style.setProperty('--appH', full + 'px');
  document.documentElement.style.setProperty('--xb', Math.max(0, full - window.innerHeight) + 'px');
};
UI.openDrawer = function () { document.body.classList.add('drawer-open'); this.mob.drawer.setAttribute('aria-hidden', 'false'); this.placeLayout(); };
UI.closeDrawer = function () { document.body.classList.remove('drawer-open'); this.mob.drawer.setAttribute('aria-hidden', 'true'); };
UI.placeLayout = function () {
  if (!this.mob) return;
  const topbar = $('#topbar'), party = $('#party'), panel = $('#panel'), game = $('#game'), stage = $('#stage');
  const body = $('#drawer-body');
  const mobile = this.isMobile();
  document.body.classList.toggle('mobile', mobile);
  document.body.classList.toggle('in-battle', mobile && Battle.active);
  if (!(mobile && Battle.active)) stage.style.bottom = '';
  if (mobile) {
    if (Battle.active) { if (panel.parentNode !== this.mob.sheet) this.mob.sheet.append(panel); this.closeDrawer(); }
    else if (panel.parentNode !== body) body.prepend(panel);
    if (party.parentNode !== body) body.insertBefore(party, panel.parentNode === body ? panel.nextSibling : body.firstChild);
    if (topbar.parentNode !== body) body.append(topbar);
  } else {
    if (topbar.parentNode !== document.body || topbar.nextElementSibling !== game) document.body.insertBefore(topbar, game);
    if (party.parentNode !== game) game.insertBefore(party, stage);
    if (panel.parentNode !== game) game.append(panel);
    this.closeDrawer();
  }
  this.updateChip();
};
UI.updateChip = function () {
  document.body.classList.toggle('has-game', !!(G && G.mcId));
  if (!this.mob || !G || !G.mcId || !G.world || !G.world.map) return;
  const t = tileAt(G.pos.x, G.pos.y);
  const place = t.feature === 'town' ? G.world.towns[t.townIdx].name : t.feature === 'estate' ? 'Your estate' : t.feature === 'ruins' ? 'Ruins'
    : t.feature === 'spire' ? 'The Black Spire' : (Events.label && Events.label(t)) || (isWater(t) ? 'At sea' : GD.BIOMES[t.type].name);
  const mc = ch(G.mcId);
  $('#hudchip').replaceChildren(h('b', {}, place), h('small', {}, ` · ${seasonName()} ${year()} · ${Math.round(G.house.gold)}g${mc ? ` · ${mc.name} ${Math.round(mc.hp)}/${maxHp(mc)}` : ''}`));
};

// ---------------------------------------------------------------- modal
UI.modal = function (content, opts = {}) {
  const wrap = h('div', { class: 'modal-wrap' },
    h('div', { class: 'modal ' + (opts.wide ? 'wide' : '') },
      opts.title ? h('h2', {}, opts.title) : null,
      !opts.locked ? h('button', { class: 'close', title: 'Close', onclick: () => this.closeModal() }, '×') : null,
      h('div', { class: 'modal-body' }, content)));
  document.body.append(wrap);
  this.modalStack.push({ el: wrap, onclose: opts.onclose, locked: opts.locked });
  return wrap;
};
UI.closeModal = function () {
  const m = this.modalStack.pop();
  if (!m) return;
  m.el.remove();
  if (m.onclose) m.onclose();
  this.refresh();
};
UI.closeAll = function () { while (this.modalStack.length) { const m = this.modalStack.pop(); m.el.remove(); } };
UI.replaceModal = function (content, opts) { const m = this.modalStack.pop(); if (m) m.el.remove(); return this.modal(content, opts); };
UI.toast = function (text) {
  const t = h('div', { class: 'toast' }, text);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
};

// ---------------------------------------------------------------- HUD
UI.refresh = function () {
  if (!G || !G.mcId) return;
  this.placeLayout();
  this.renderTop();
  this.renderParty();
  if (!Battle.active) this.renderPanel();
  this.renderLog();
};

UI.renderTop = function () {
  const hs = G.house, w = G.world, E = era();
  const yearsLeft = Math.max(0, w.era.end - year());
  $('#topbar').replaceChildren(
    h('div', { class: 'crest', style: `background:${hs.color}` }, hs.name[0]),
    h('div', { class: 'house' }, h('b', {}, `House ${hs.name}`), h('small', {}, `Generation ${hs.generation} · ${GD.ESTATE[hs.tier].name}`)),
    h('div', { class: 'tb' }, h('small', {}, 'Year'), h('b', {}, `${seasonName()} ${year()}`)),
    h('div', { class: 'tb' }, h('small', {}, 'Era'), h('b', { style: `color:${E.color}` }, E.name), h('small', {}, w.era.type === 'golden' ? 'Victory!' : `${yearsLeft} yr left`)),
    h('div', { class: 'tb grow' }, h('small', {}, `Prosperity ${Math.round(w.prosperity)} / 95`), bar(w.prosperity, 100, 'pros')),
    h('div', { class: 'tb doom', title: `${GD.VILLAIN.name} will end the world in ${w.doom.year}` }, h('small', {}, 'Doom'), h('b', { class: doomYearsLeft() < 100 ? 'bad' : '' }, `${Math.max(0, doomYearsLeft())} yrs`), h('small', {}, `Wards ${w.doom.wards}/${GD.WARDS_NEEDED}`)),
    h('div', { class: 'tb' }, h('small', {}, 'Reputation'), h('b', { style: `color:${reputationInfo().color}` }, reputationInfo().name)),
    h('div', { class: 'tb' }, h('small', {}, 'Prestige'), h('b', {}, Math.round(hs.prestige))),
    h('div', { class: 'tb' }, h('small', {}, 'Gold'), h('b', { class: 'gold' }, Math.round(hs.gold))),
    h('div', { class: 'tb' }, h('small', {}, 'Potions'), h('b', {}, hs.potions)),
    h('button', { class: 'small', onclick: () => this.showTree() }, 'Family Tree'),
    h('button', { class: 'small', onclick: () => this.showChronicle() }, 'Chronicle'),
    h('button', { class: 'small', onclick: () => this.showWorld() }, 'World'),
    h('button', { class: 'small', onclick: () => this.showMenu() }, 'Menu'),
  );
};

UI.charLine = function (c) {
  const st = GD.STAGES[stageKey(c)].name;
  const cl = isAdult(c) ? classOf(c) : null;
  return `${GD.GENDERS[c.gender || 'man'].sym} ${GD.RACES[c.race].name}${cl ? ' ' + cl.name : ''} · ${ageStr(c)} yrs · ${st}`;
};

UI.renderParty = function () {
  const party = G.party.map(ch).filter(Boolean);
  const bu = Battle.active ? Battle.units : null;
  $('#party').replaceChildren(
    h('div', { class: 'ptitle' }, 'Party'),
    ...party.map((c) => {
      const u = bu && bu.find((x) => x.charId === c.id);
      const hp = u ? u.hp : c.hp, mhp = u ? u.maxHp : maxHp(c);
      const stage = stageKey(c);
      const life = age(c) / c.lifespan;
      return h('div', { class: 'pcard' + (c.id === G.mcId ? ' mc' : '') + (u && !u.alive ? ' fallen' : '') + (Battle.cur && u === Battle.cur ? ' active' : ''), onclick: () => this.showChar(c) },
        portrait(c, 52),
        h('div', { class: 'pinfo' },
          h('div', { class: 'pname' }, c.id === G.mcId ? '♛ ' : '', c.name, h('span', { class: 'lvl' }, `L${c.level}`)),
          h('div', { class: 'psub' }, this.charLine(c)),
          bar(hp, mhp, 'hp'),
          h('div', { class: 'psub' }, `HP ${Math.round(hp)}/${mhp} · XP ×${xpMod(c).toFixed(2)}`),
          h('div', { class: 'lifebar', title: 'Lifespan used (estimate)' }, h('div', { style: `width:${clamp(life * 100, 0, 100)}%`, class: 'st-' + stage })),
        ));
    }),
    this.heirBox(),
  );
};
UI.heirBox = function () {
  const heir = ch(G.heirId);
  if (!heir || !heir.alive) {
    const cands = heirCandidates();
    const blood = cands.filter((x) => !x.why.startsWith('Spouse'));
    if (blood.length) return h('div', { class: 'heirbox warn' }, 'No heir named. Pick one in the Household.');
    return h('div', { class: 'heirbox warn' }, cands.length ? 'No blood heir. A loyal companion would be adopted if you die.' : '⚠ No heir! If you die, the House ends. Have children.');
  }
  return h('div', { class: 'heirbox', onclick: () => this.showChar(heir) }, portrait(heir, 36), h('div', {}, h('small', {}, 'Heir'), h('div', {}, heir.name), h('small', {}, this.charLine(heir))));
};

UI.renderLog = function () {
  const el = $('#log');
  if (!el || !G) return;
  el.replaceChildren(...G.log.slice(-40).map((e) => h('div', { class: 'le ' + e.kind }, h('span', { class: 'ly' }, e.year), ' ', e.text)));
  el.scrollTop = el.scrollHeight;
};

// ---------------------------------------------------------------- side panel by location
UI.renderPanel = function () {
  const p = $('#panel');
  const t = tileAt(G.pos.x, G.pos.y);
  const body = [];
  if (t.feature === 'estate') body.push(...this.estatePanel());
  else if (t.feature === 'town') body.push(...this.townPanel(t));
  else if (t.feature === 'ruins') body.push(...this.ruinsPanel(t));
  else if (t.feature === 'spire') body.push(...this.spirePanel());
  else if (Events.panel(t)) body.push(...Events.panel(t));
  else if (t.feature === 'shrine') body.push(h('h3', {}, 'Beacon Shrine'), h('p', { class: 'dim' }, t.lit ? 'The beacon burns again, a ward against the dark.' : 'A cold beacon from an older age.'));
  else body.push(h('h3', {}, isWater(t) ? 'At Sea' : GD.BIOMES[t.type].name), h('p', { class: 'dim' }, isWater(t) ? 'Your boat rides the waves.' : 'Tap anywhere to travel. Time passes only while you move, and danger is everywhere.'));
  if (!isWater(t) && t.feature !== 'town' && t.feature !== 'estate') body.push(act('Make camp', () => Campfire.start(), { sub: 'sit by the fire with your party · rest the night' }));
  body.push(this.questBox());
  body.push(h('div', { class: 'hint' }, this.isMobile()
    ? `Tap the map to travel${hasTech('flight') ? ' (or fly to far tiles)' : ''}. Pinch to zoom; use the buttons to rotate.`
    : `Click the map to travel${hasTech('flight') ? ' (or fly to far tiles)' : ''}. Wheel to zoom, Q/E to rotate.`));
  p.replaceChildren(...body.filter(Boolean));
};

function act(label, fn, opts = {}) {
  return h('button', { class: 'act' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, title: opts.title, onclick: fn }, label, opts.sub ? h('small', {}, opts.sub) : null);
}

UI.estatePanel = function () {
  const hs = G.house;
  const mc = ch(G.mcId);
  const unmarried = !spouseOf(mc);
  return [
    h('h3', {}, `${GD.ESTATE[hs.tier].name} of House ${hs.name}`),
    h('p', { class: 'dim' }, `Income ${Math.round(GD.ESTATE[hs.tier].income * era().income + hs.up.livestock * 40)}g a year. Household ${householdCount()}/${GD.ESTATE[hs.tier].household}. Retinue ${hs.retinue}.`),
    act('Rest a season', () => Game.rest(90), { sub: '90 days · heal everyone' }),
    act('Train a season', () => Game.train(), { sub: '90 days · XP for the party' }),
    act('Let a year pass', () => Game.rest(360), { sub: '360 days · watch your family grow' }),
    act('Improve the Estate', () => this.showEstate(), { sub: 'tiers, upgrades, retinue' }),
    act('Household & Heir', () => this.showHousehold(), { sub: 'party, children, succession' }),
    unmarried ? act('Arranged Match', () => Game.arrangedMatch(), { sub: 'choose 1 of 3 partners', cls: 'hl' }) : null,
    act('Adopt a Child', () => this.showAdoption(), { sub: 'give an orphan a family and a name' }),
    act('Family Tree', () => this.showTree()),
  ];
};

UI.townDeeds = function (t) {
  const town = G.world.towns[t.townIdx];
  const E = G.world.era.type;
  const deedDone = town.deedYear === year();
  const deeds = [];
  if (E === 'famine') deeds.push(act('Aid the Starving', () => Game.deed(town, 'aid'), { sub: '120g · prosperity, prestige', disabled: deedDone || G.house.gold < 120 }));
  if (E === 'war') deeds.push(act('Answer the Muster', () => Game.deed(town, 'muster'), { sub: 'hard battle · big prestige', disabled: deedDone }));
  if (E !== 'war' && E !== 'famine') {
    deeds.push(act('Hold a Festival', () => Game.deed(town, 'festival'), { sub: '80g · prestige, loyalty', disabled: deedDone || G.house.gold < 80 }));
  }
  deeds.push(act('Fund Roads & Wells', () => Game.deed(town, 'roads'), { sub: '160g · prosperity', disabled: deedDone || G.house.gold < 160 }));
  return { deeds, deedDone };
};
UI.townPanel = function (t) {
  const town = G.world.towns[t.townIdx];
  const { deeds, deedDone } = this.townDeeds(t);
  return [
    h('h3', {}, town.name), h('p', { class: 'dim' }, `${GD.TOWN_SIZES[town.size]} · founded ${town.founded}`),
    act('Enter Town', () => TownView.start(t), { cls: 'hl', sub: 'walk the streets, talk to people, hear rumors' }),
    h('p', { class: 'dim' }, `${this.townPeople(t.townIdx).length} people of note live here. Quick options:`),
    act('Tavern', () => this.showTavern(t.townIdx), { sub: 'recruit, court, lineage' }),
    act('Market', () => this.showMarket(), { sub: 'gear & potions' }),
    act('Rest at the Inn', () => Game.inn(), { sub: '10g · 7 days · heal', disabled: G.house.gold < 10 }),
    h('h4', {}, 'Deeds for the Realm', deedDone ? h('small', {}, ' (done this year)') : null),
    ...deeds,
  ];
};
UI.townPeople = function (idx) {
  return Object.values(G.chars).filter((c) => c.alive && c.status === 'npc' && c.town === idx && !c.evil);
};

UI.questBox = function () {
  const d = G.world.doom;
  const q = d.quest;
  return h('div', { class: 'quest' },
    h('h4', {}, `The Prophecy · ${Math.max(0, doomYearsLeft())} years left`),
    q ? [h('b', {}, q.title), h('p', { class: 'small' }, q.desc),
      q.type === 'rally' ? h('small', { class: 'dim' }, `${q.progress.length}/${q.count} towns: ${q.progress.join(', ') || 'none yet'}`) : null,
      q.x != null ? h('small', { class: 'dim' }, `Marked on the map with a gold ◆.${!reachable(tileAt(q.x, q.y)) ? ' You need boats to reach it.' : ''}`) : null]
      : h('p', { class: 'dim small' }, 'No task yet.'),
    h('small', { class: 'dim' }, `Wards ${d.wards}/${GD.WARDS_NEEDED} · the Black Spire waits`));
};
UI.spirePanel = function () {
  const d = G.world.doom;
  return [
    h('h3', {}, 'The Black Spire'),
    h('p', { class: 'dim' }, `The seat of ${GD.VILLAIN.name}. It will end the world in ${d.year} unless it is destroyed first. Each ward raised weakens it.`),
    h('p', { class: d.wards >= GD.WARDS_NEEDED ? 'good' : 'bad' }, `Wards ${d.wards}/${GD.WARDS_NEEDED}. ${GD.VILLAIN.name} is around level ${villainLevel()}.`),
    act('Assault the Spire', () => Game.finalBattle(false), { cls: 'danger', sub: 'the final battle; it can be tried again if you survive', disabled: G.world.saved }),
  ];
};
UI.ruinsPanel = function (t) {
  const quiet = !!t.cleared && year() < (t.clearedYear || 0) + 5;
  const lvl = ruinLevel(t);
  const pl = partyLevel();
  const q = G.world.doom.quest;
  const isQuest = q && q.type === 'seal' && q.x === t.x && q.y === t.y;
  const ready = pl >= lvl - 1 && G.party.length >= 2;
  return [
    h('h3', {}, t.ruinOf ? `Ruins of ${t.ruinOf}` : 'Ancient Ruins'),
    h('p', { class: 'dim' }, quiet ? `Cleared in ${t.clearedYear}. Something may return in time.` : 'Dark things gather here. Clearing it makes the land safer and brings great prestige.'),
    h('p', { class: ready ? 'dim' : 'bad' }, `Foes around level ${lvl} (your party: ${pl.toFixed(1)}). ${ready ? 'Your party looks ready.' : `Your party looks outmatched. Train, recruit or clear nearer ruins first. Death here is permanent.`}`),
    isQuest ? h('p', { class: 'good small' }, 'The Seal of Warding lies here. Its guardians are never far beyond your strength.') : null,
    act('Delve', () => Game.delve(t), { disabled: quiet, sub: 'hard battle · loot · prosperity', cls: 'danger' }),
  ];
};

// ---------------------------------------------------------------- battle panel
UI.battleChanged = function () {
  if (!Battle.active) return;
  if (this.isMobile() && !document.body.classList.contains('in-battle')) this.placeLayout();
  this.renderParty();
  const p = $('#panel');
  const u = Battle.cur;
  const kids = [h('h3', {}, Battle.title)];
  if (Battle.waiting && u && u.side === 'party') {
    const cl = GD.CLASSES[u.cls];
    const st = Object.keys(u.st || {}).filter((k) => Battle.st(u, k)).map((k) => ({ atkUp: 'inspired', bloodlust: 'bloodlust', guard: 'guarded', defDown: 'exposed', slow: 'slowed', mark: 'marked', shield: `shield ${u.st.shield && u.st.shield.v}`, riposte: 'riposte' }[k])).filter(Boolean);
    kids.push(h('p', {}, h('b', {}, `${u.name}'s turn`), h('br'), h('small', { class: 'dim' }, `${cl ? cl.icon + ' ' + cl.name + ' · ' : ''}Focus ${u.focus}/3${st.length ? ' · ' + st.join(', ') : ''}`)));
    if (this.targeting) {
      kids.push(h('p', { class: 'dim' }, `Choose a target for ${this.targeting === 'skill' ? GD.ABILITIES[this.targetSkill].name : this.targeting}: tap the field or below.`));
      const targets = Battle.units.filter((x) => this.validTarget(x));
      kids.push(...targets.map((x) => act(`${x.name} (${x.hp}/${x.maxHp})`, () => this.chooseTarget(x))));
      kids.push(act('Back', () => { this.targeting = null; this.battleChanged(); }));
    } else {
      kids.push(act(u.cls === 'sorcerer' ? 'Arcane Bolt' : 'Attack', () => this.beginTarget('attack'), { sub: u.cls === 'sorcerer' ? 'magic that slips past armour' : null }));
      for (const id of u.abilities || []) {
        const A = GD.ABILITIES[id];
        if (!A) continue;
        kids.push(act(A.name, () => {
          if (A.target === 'enemy' || A.target === 'ally') { this.targetSkill = id; this.beginTarget('skill'); }
          else Battle.act('skill', null, id);
        }, { disabled: u.focus < A.cost, sub: `${A.cost} focus · ${A.desc}`, cls: 'ability' }));
      }
      kids.push(act('Defend', () => Battle.act('defend'), { sub: 'halve damage, +1 focus' }));
      kids.push(act(`Potion (${G.house.potions})`, () => this.beginTarget('potion'), { disabled: G.house.potions <= 0 }));
      if (Battle.kind === 'wild') kids.push(act('Flee', () => Battle.act('flee'), { cls: 'danger' }));
    }
  } else {
    kids.push(h('p', { class: 'dim' }, u ? `${u.name} is acting…` : '…'));
  }
  kids.push(h('label', { class: 'auto' }, h('input', { type: 'checkbox', checked: Battle.auto, onchange: (e) => { Battle.auto = e.target.checked; if (Battle.auto && Battle.waiting) { Battle.waiting = false; Battle.ai(Battle.cur); } } }), ' Auto-battle'));
  kids.push(h('div', { class: 'blog' }, ...Battle.log.map((l) => h('div', {}, l))));
  p.replaceChildren(...kids);
  if (this.isMobile() && this.mob) $('#stage').style.bottom = this.mob.sheet.offsetHeight + 'px';
};
UI.beginTarget = function (kind) { this.targeting = kind; this.battleChanged(); };
UI.validTarget = function (x) {
  const u = Battle.cur;
  if (!u || !x.alive || !this.targeting) return false;
  const friendly = this.targeting === 'potion' || (this.targeting === 'skill' && GD.ABILITIES[this.targetSkill] && GD.ABILITIES[this.targetSkill].target === 'ally');
  return friendly ? x.side === u.side : x.side !== u.side;
};
UI.chooseTarget = function (x) {
  const kind = this.targeting;
  this.targeting = null;
  Battle.act(kind, x.uid, kind === 'skill' ? this.targetSkill : undefined);
};
UI.clickUnit = function (u) {
  if (this.targeting && this.validTarget(u)) this.chooseTarget(u);
  else if (u.charId && !Battle.waiting) { /* ignore */ }
};

UI.battleResults = function (res, done) {
  const rows = [];
  if (res.outcome === 'victory') {
    rows.push(h('p', { class: 'big good' }, 'Victory!'));
    rows.push(h('p', {}, `+${res.gold} gold · ${res.xp} XP shared`));
    for (const l of res.levels) rows.push(h('div', { class: 'row' }, portrait(l.c, 32), `${l.c.name}: +${l.gained} XP`, l.up ? h('b', { class: 'good' }, ` → Level ${l.c.level}!`) : ''));
    if (res.formative.length) rows.push(h('p', { class: 'dim' }, `Formative experience: ${res.formative.join(', ')}.`));
    if (res.rivalDefeated) rows.push(h('p', { class: 'good' }, `The rival ${res.rivalDefeated.name} is slain. Prestige +12, Prosperity +8.`));
  } else if (res.outcome === 'fled') rows.push(h('p', { class: 'big' }, 'You fled the battle.'));
  else {
    rows.push(h('p', { class: 'big bad' }, 'Defeat…'));
    rows.push(h('p', {}, `The survivors limp home. ${res.goldLost}g lost.`));
  }
  for (const c of res.survived) rows.push(h('p', { class: 'dim' }, `${c.name} was struck down but survives.`));
  for (const t of res.injured || []) rows.push(h('p', { class: 'bad' }, `Lasting injury: ${t}.`));
  for (const c of res.dead) rows.push(h('div', { class: 'row bad' }, portrait(c, 32), `${c.name} has died at ${ageStr(c)}.`));
  rows.push(act('Continue', () => { this.closeModal(); done(); }));
  this.modal(rows, { title: 'Battle Over', locked: true });
};

// ---------------------------------------------------------------- character sheet
UI.showChar = function (c) {
  this.modal(this.charBody(c), { title: c.name, wide: true });
};

UI.charBody = function (c) {
  const mc = ch(G.mcId);
  const bk = birthKey(c);
  const sp = ch(c.spouse);
  const parents = c.parents.map(ch).filter(Boolean);
  const kids = c.children.map(ch).filter(Boolean);
  const link = (p) => h('a', { href: '#', onclick: (e) => { e.preventDefault(); this.replaceModal(this.charBody(p), { title: p.name, wide: true }); } }, p.name + (p.alive ? '' : ' †'));
  const st = stageKey(c);
  const r = GD.RACES[c.race];
  const lifeLeft = c.alive ? `${Math.max(0, Math.round(r.elder - age(c)))} yrs until elder` : `Died ${year(c.died)}: ${c.cause}`;
  const statRows = STATS.map((k) => h('tr', {}, h('td', {}, STAT_NAMES[k]), h('td', {}, stat(c, k).toFixed(1)),
    h('td', { class: 'dim' }, ageMod(c, k) !== 1 ? `age ×${ageMod(c, k).toFixed(2)}` : ''), h('td', { class: 'dim' }, c.bonus[k] ? `+${c.bonus[k].toFixed(1)} flat` : ''),
    h('td', { class: 'bad' }, (c.injuries || []).reduce((t, i) => t + (GD.INJURIES[i].mods[k] || 0), 0) < 0 ? `${(c.injuries || []).reduce((t, i) => t + (GD.INJURIES[i].mods[k] || 0), 0)} injury` : '')));
  const tags = [
    h('span', { class: 'tag' }, GD.BIRTH[bk].name),
    c.birth === 'bastard' && c.legit ? h('span', { class: 'tag good' }, 'Legitimised') : null,
    c.trait ? h('span', { class: 'tag', title: GD.TRAITS[c.trait].desc }, GD.TRAITS[c.trait].name) : null,
    c.house ? h('span', { class: 'tag house', style: `border-color:${G.house.color}` }, `House ${c.house}`) : null,
    c.evil ? h('span', { class: 'tag bad' }, 'Rival') : null,
    c.id === G.mcId ? h('span', { class: 'tag good' }, 'Head of House') : null,
    c.id === G.heirId ? h('span', { class: 'tag good' }, 'Heir') : null,
    !c.alive ? h('span', { class: 'tag dim' }, 'Deceased') : null,
  ];
  let lineage;
  if (parents.length) lineage = h('p', {}, 'Child of ', parents.map((p, i) => [i ? ' & ' : '', link(p)]));
  else if (c.lineageKnown) lineage = h('p', { class: 'dim' }, c.secret ? `Lineage: ${GD.SECRETS[c.secret].name}.` : 'Of common, unrecorded stock.');
  else lineage = h('p', { class: 'dim' }, 'Lineage unknown. Research it at a tavern.');
  const adoptive = (c.adoptedBy || []).map(ch).filter(Boolean);
  if (adoptive.length) lineage = h('div', {}, lineage, h('p', {}, 'Adopted by ', adoptive.map((p, i) => [i ? ' & ' : '', link(p)])));
  const grand = bloodline(c).filter((x) => x.depth === 2).map((x) => x.c);
  const actions = this.charActions(c);
  return h('div', { class: 'sheet' },
    h('div', { class: 'sheet-left' },
      portrait(c, 140),
      h('div', { class: 'tags' }, tags),
      h('p', {}, this.charLine(c)),
      h('p', { class: 'dim' }, `${GD.GENDERS[c.gender || 'man'].name} · ${bodyText(c)}`),
      h('p', { class: 'dim' }, `Drawn to: ${orientationText(c)}`),
      (() => { const k = ch(G.mcId) && c.id !== G.mcId ? kinship(ch(G.mcId), c) : null; return k && k.rel ? h('p', { class: 'dim' }, `${ch(G.mcId).name}'s ${k.rel}`) : null; })(),
      c.inbred > 0.05 ? h('p', { class: 'bad' }, `Born of close kin (blood ${Math.round(c.inbred * 100)}% shared).`) : null,
      c.condition ? h('p', { class: 'bad', title: GD.CONDITIONS[c.condition].desc }, `Born ${GD.CONDITIONS[c.condition].name.toLowerCase()}: ${GD.CONDITIONS[c.condition].desc}`) : null,
      c.infertileKnown ? h('p', { class: 'bad' }, 'Cannot have children.') : null,
      c.adoptedBy && c.adoptedBy.length ? h('p', { class: 'good' }, 'Adopted into the House.') : null,
      c.forcedBy ? h('p', { class: 'bad' }, `Forced into marriage by ${ch(c.forcedBy) ? ch(c.forcedBy).name : 'the House'}. Resentful.`) : null,
      h('p', { class: 'dim' }, `Born ${year(c.born)} · expected lifespan ~${Math.round((r.life[0] + r.life[1]) / 2)} · ${lifeLeft}`),
      c.alive ? h('p', { class: 'dim' }, `Formative ${Math.round(c.formative)}/${formativeCap(c)} · XP ×${xpMod(c).toFixed(2)}`) : null,
      ...actions),
    h('div', { class: 'sheet-right' },
      h('p', {}, h('b', {}, `Level ${c.level}`), ` · Power ${power(c)}`),
      h('div', { class: 'classbox' },
        h('b', {}, `${classOf(c).icon} ${classOf(c).name}`), h('small', { class: 'dim' }, ` ${classOf(c).desc}`),
        h('small', { class: 'good' }, classOf(c).passive),
        h('ul', { class: 'abil' }, classOf(c).skills.map((id, i) => h('li', { class: i === 2 && c.level < 5 ? 'dim' : '' }, h('b', {}, GD.ABILITIES[id].name), ` (${GD.ABILITIES[id].cost} focus${i === 2 && c.level < 5 ? ', unlocks at level 5' : ''}): ${GD.ABILITIES[id].desc}`)),
          c.extraSkill && GD.LEGACY_SKILL[c.extraSkill] && !classOf(c).skills.includes(GD.LEGACY_SKILL[c.extraSkill]) ? h('li', {}, h('b', {}, GD.ABILITIES[GD.LEGACY_SKILL[c.extraSkill]].name), ` (learned): ${GD.ABILITIES[GD.LEGACY_SKILL[c.extraSkill]].desc}`) : null)),
      (c.injuries || []).length ? h('div', { class: 'tags' }, c.injuries.map((k) => h('span', { class: 'tag ' + (GD.INJURIES[k].good ? 'good' : 'bad'), title: Object.entries(GD.INJURIES[k].mods).map(([s2, v]) => `${STAT_NAMES[s2]} ${v > 0 ? '+' : ''}${v}`).join(', ') }, GD.INJURIES[k].name))) : null,
      c.alive ? h('div', {}, bar(c.xp, xpNeed(c.level), 'xp'), h('small', { class: 'dim' }, `XP ${Math.round(c.xp)}/${xpNeed(c.level)}`)) : null,
      h('table', { class: 'stats' }, statRows),
      h('p', { class: 'dim' }, `Max HP ${maxHp(c)} · Weapon ${c.gear.weapon ? GD.GEAR[c.gear.weapon - 1].name : 'none'}${G.mcId === c.id && G.house.heirloom ? ` + ${G.house.heirloom.name} (+${G.house.heirloom.power})` : ''} · Armour ${c.gear.armor ? GD.GEAR[c.gear.armor - 1].name : 'none'}`),
      h('h4', {}, 'Family'),
      lineage,
      grand.length ? h('p', { class: 'dim' }, 'Grandparents: ', grand.map((g, i) => [i ? ', ' : '', link(g)])) : null,
      sp ? h('p', {}, 'Spouse: ', link(sp)) : h('p', { class: 'dim' }, 'Unmarried'),
      kids.length ? h('p', {}, 'Children: ', kids.map((k, i) => [i ? ', ' : '', link(k), k.alive ? ` (${ageStr(k)})` : ''])) : null,
      mc && c.id !== mc.id && c.alive ? h('p', { class: bond(c, mc) < -40 ? 'bad' : 'dim' }, `Bond with ${mc.name}: ${Math.round(bond(c, mc))}${bond(c, mc) < -40 ? ' (resents you)' : ''} · Loyalty to the House: ${Math.round(c.loyalty)}`) : null,
      mc && c.id !== mc.id && c.alive && isAdult(c) && c.orientKnown && !spouseOf(c) && !isDescendantOf(c, mc.id) ? h('p', { class: 'dim' }, attraction(c, mc) === 0 ? `Not drawn to ${mc.name}.` : attraction(c, mc) > 1.15 ? `Strongly drawn to ${mc.name}.` : `Could be drawn to ${mc.name}.`) : null,
      c.alive && !c.house && isAdult(c) ? h('p', { class: c.corruption > 60 ? 'bad' : 'dim' }, `Resentment: ${c.corruption > 70 ? 'dangerous' : c.corruption > 40 ? 'simmering' : 'low'}`) : null,
      this.lifeEvents(c),
    ));
};

UI.charActions = function (c) {
  const mc = ch(G.mcId);
  const out = [];
  if (!c.alive || !mc || c.id === mc.id) {
    if (c.id === mc?.id && !spouseOf(mc) && tileAt(G.pos.x, G.pos.y).feature === 'estate') out.push(act('Arranged Match', () => { this.closeModal(); Game.arrangedMatch(); }));
    return out;
  }
  const inTown = tileAt(G.pos.x, G.pos.y).feature === 'town';
  const atEstate = tileAt(G.pos.x, G.pos.y).feature === 'estate';
  if (c.status === 'npc' && isAdult(c) && inTown) {
    const cost = hireCost(c), req = recruitPrestigeReq(c);
    out.push(act('Recruit', () => { Game.recruit(c); this.closeModal(); }, { sub: `${cost}g${req ? ` · needs ${req} prestige` : ''}`, disabled: G.house.gold < cost || G.house.prestige < req }));
  }
  const canRomance = isAdult(c) && !spouseOf(mc) && !spouseOf(c) && c.status !== 'rival';
  if (canRomance && (inTown || c.status !== 'npc')) {
    out.push(act('Court', () => { Game.court(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '20g · 10 days', disabled: G.house.gold < 20 }));
    if (bond(c, mc) >= 70) out.push(act('Propose Marriage', () => { Game.propose(c); this.closeModal(); }, { cls: 'hl' }));
  }
  if (!c.lineageKnown && inTown) {
    const cost = Math.max(10, 40 - G.house.up.library * 10);
    out.push(act('Research Lineage', () => { Game.research(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: `${cost}g`, disabled: G.house.gold < cost }));
  }
  // relationships with kin and companions
  const close = c.house === G.house.name || c.status === 'party' || c.status === 'household';
  if (close && c.status !== 'rival') {
    out.push(act('Spend time together', () => { Game.interact(c, 'time'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '7 days · bond' }));
    out.push(act('Give a gift', () => { Game.interact(c, 'gift'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '30g · bond', disabled: G.house.gold < 30 }));
    if (bond(c, mc) < 0) out.push(act('Heart-to-heart', () => { Game.interact(c, 'talk'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '14 days · may heal old wounds, or open them' }));
    if (c.forcedBy === mc.id && !c.apologised) out.push(act('Ask forgiveness', () => { Game.interact(c, 'apology'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '5 prestige · once' }));
  }
  if (c.house === G.house.name && isAdult(c) && !spouseOf(c) && c.id !== mc.id && atEstate) {
    out.push(act('Arrange a marriage', () => { this.closeAll(); Game.matchmaker(c); }, { sub: `match ${c.name} with a suitor` }));
  }
  if (c.house === G.house.name && c.birth === 'bastard' && !c.legit) out.push(act('Legitimise', () => { Game.legitimise(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '10 prestige', disabled: G.house.prestige < 10 }));
  if (c.house === G.house.name && isDescendantOf(c, mc.id) && G.heirId !== c.id) out.push(act('Name as Heir', () => { G.heirId = c.id; chron(`${c.name} is named heir of House ${G.house.name}.`, 'good', [c.id], 'heir'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }));
  if (atEstate && (c.status === 'household') && isAdult(c)) out.push(act('Add to Party', () => { Game.toParty(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { disabled: G.party.length >= 4 }));
  if (atEstate && c.status === 'party') out.push(act('Leave at Estate', () => { Game.toHousehold(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }));
  if ((c.status === 'party' || c.status === 'household') && !c.house) out.push(act('Dismiss', () => { Game.dismiss(c); this.closeModal(); }, { cls: 'danger' }));
  return out;
};

// ---------------------------------------------------------------- town screens
UI.showTavern = function (idx) {
  const people = this.townPeople(idx).filter(isAdult).sort((a, b) => b.level - a.level);
  const kids = this.townPeople(idx).filter((c) => !isAdult(c));
  const mc = ch(G.mcId);
  const body = h('div', {},
    h('p', { class: 'dim' }, 'Adventurers, wanderers and locals. Click someone to see their lineage, court them or recruit them.'),
    h('div', { class: 'grid' }, people.map((c) => this.miniCard(c, () => this.replaceModalChar(c), [
      h('small', {}, `${hireCost(c)}g`),
      c.parents.some((p) => ch(p) && (ch(p).status === 'party' || ch(p).status === 'household' || ch(p).house === G.house.name)) ? h('small', { class: 'good' }, 'Child of a companion') : null,
      mc && bond(c, mc) > 20 ? h('small', { class: 'good' }, `Bond ${Math.round(bond(c, mc))}`) : null,
    ]))),
    kids.length ? h('p', { class: 'dim' }, `Children in town: ${kids.map((k) => `${k.name} (${ageStr(k)}, ${GD.RACES[k.race].name})`).join(', ')}`) : null,
  );
  this.modal(body, { title: `Tavern of ${G.world.towns[idx].name}`, wide: true });
};
UI.replaceModalChar = function (c) { this.modal(this.charBody(c), { title: c.name, wide: true, onclose: () => { } }); };

UI.miniCard = function (c, onclick, extra = []) {
  return h('div', { class: 'mini', onclick },
    portrait(c, 56),
    h('div', {},
      h('b', {}, c.name), h('span', { class: 'lvl' }, ` L${c.level}`),
      h('div', { class: 'psub' }, this.charLine(c)),
      h('div', { class: 'psub' }, `${GD.BIRTH[birthKey(c)].name}${c.trait ? ' · ' + GD.TRAITS[c.trait].name : ''} · Power ${power(c)}`),
      ...extra));
};

UI.showMarket = function () {
  const maxTier = Math.min(GD.GEAR.length, 2 + G.house.up.armory + Math.floor(G.house.tier / 2));
  const party = G.party.map(ch);
  const rows = [];
  rows.push(h('div', { class: 'row' }, act('Buy Potion', () => { Game.buyPotion(); this.closeModal(); this.showMarket(); }, { sub: `25g · you have ${G.house.potions}`, disabled: G.house.gold < 25 })));
  for (const c of party) {
    const cells = [h('b', {}, c.name)];
    for (const slot of ['weapon', 'armor']) {
      const next = c.gear[slot] + 1;
      if (next <= maxTier) {
        const g = GD.GEAR[next - 1];
        const cost = Math.round(g.cost * (slot === 'armor' ? 1.1 : 1));
        cells.push(act(`${g.name} ${slot === 'weapon' ? 'Weapon' : 'Armour'}`, () => { Game.buyGear(c, slot, cost); this.closeModal(); this.showMarket(); }, { sub: `${cost}g · ${slot === 'weapon' ? '+' + g.atk + ' atk' : '+' + g.def + ' def'}`, disabled: G.house.gold < cost }));
      } else cells.push(h('small', { class: 'dim' }, `${slot === 'weapon' ? 'Weapon' : 'Armour'}: best available`));
    }
    rows.push(h('div', { class: 'row market' }, cells));
  }
  rows.push(h('p', { class: 'dim' }, `Gear up to tier ${maxTier} is available. An armory and a bigger estate unlock better smiths.`));
  this.modal(rows, { title: 'Market' });
};

UI.showAdoption = function () {
  const list = Game.adoptables();
  this.modal([
    h('p', { class: 'dim' }, 'Orphans and foundlings of the realm. An adopted child carries your House name, can be named heir, and inherits the House legacy, but not your blood.'),
    h('div', { class: 'grid' }, list.map((k) => this.miniCard(k, () => { }, [
      h('small', {}, `${bodyText(k)}${k.condition ? ' · ' + GD.CONDITIONS[k.condition].name : ''}`),
      k.foundling ? h('small', { class: 'dim' }, 'A foundling: lineage unknown') : null,
      act('Adopt (40g)', () => { this.closeAll(); Game.adopt(k); }, { disabled: G.house.gold < 40 }),
    ]))),
  ], { title: 'Adopt a Child', wide: true });
};

// ---------------------------------------------------------------- estate screens
UI.showEstate = function () {
  const hs = G.house;
  const next = GD.ESTATE[hs.tier + 1];
  const rows = [];
  rows.push(h('p', {}, 'Current seat: ', h('b', {}, GD.ESTATE[hs.tier].name), ` · ${hs.gold}g · ${Math.round(hs.prestige)} prestige`));
  if (next) {
    rows.push(act(`Build ${next.name}`, () => { Game.upgradeEstate(); this.closeModal(); this.showEstate(); },
      { cls: 'hl', sub: `${next.cost}g · needs ${next.prestige} prestige · income ${next.income}/yr, household ${next.household}, retinue ${next.retinue}`, disabled: hs.gold < next.cost || hs.prestige < next.prestige }));
  } else rows.push(h('p', { class: 'good' }, 'Your seat is a mighty castle.'));
  rows.push(h('h4', {}, 'Improvements'));
  for (const k in GD.UPGRADES) {
    const u = GD.UPGRADES[k];
    const lvl = hs.up[k];
    const cost = u.cost[lvl];
    rows.push(h('div', { class: 'row up' },
      h('div', { class: 'grow' }, h('b', {}, `${u.name} `), h('span', { class: 'pips' }, '●'.repeat(lvl) + '○'.repeat(3 - lvl)), h('br'), h('small', { class: 'dim' }, u.desc)),
      lvl < 3 ? act('Build', () => { Game.buyUpgrade(k); this.closeModal(); this.showEstate(); }, { sub: `${cost}g`, disabled: hs.gold < cost }) : h('small', { class: 'good' }, 'Max')));
  }
  const rCap = GD.ESTATE[hs.tier].retinue;
  const rCost = 120 + hs.retinue * 80;
  rows.push(h('div', { class: 'row up' },
    h('div', { class: 'grow' }, h('b', {}, `Retinue ${hs.retinue}/${rCap}`), h('br'), h('small', { class: 'dim' }, 'Sworn soldiers volley an enemy at the start of each combat round.')),
    act('Hire', () => { Game.hireRetinue(rCost); this.closeModal(); this.showEstate(); }, { sub: `${rCost}g`, disabled: hs.gold < rCost || hs.retinue >= rCap })));
  if (hs.heirloom) rows.push(h('p', { class: 'dim' }, `Heirloom: ${hs.heirloom.name}, +${hs.heirloom.power} attack, carried by ${hs.heirloom.gens} generation(s). It grows stronger each time it passes on.`));
  this.modal(rows, { title: 'Improve the Estate', wide: true });
};

UI.showHousehold = function () {
  const all = Object.values(G.chars).filter((c) => c.alive && (c.status === 'party' || c.status === 'household'));
  const blood = all.filter((c) => c.house === G.house.name);
  const comp = all.filter((c) => c.house !== G.house.name);
  const cand = heirCandidates();
  const body = h('div', {},
    h('h4', {}, 'House members'),
    h('div', { class: 'grid' }, blood.map((c) => this.miniCard(c, () => this.replaceModalChar(c), [
      c.id === G.heirId ? h('small', { class: 'good' }, '★ Heir') : null,
      c.status === 'party' ? h('small', {}, 'In party') : null,
      !isAdult(c) ? h('small', { class: 'dim' }, `Comes of age in ${Math.ceil(GD.RACES[c.race].maturity - age(c))} yrs`) : null,
    ]))),
    h('h4', {}, 'Companions'),
    comp.length ? h('div', { class: 'grid' }, comp.map((c) => this.miniCard(c, () => this.replaceModalChar(c), [c.status === 'party' ? h('small', {}, 'In party') : h('small', { class: 'dim' }, 'At the estate')]))) : h('p', { class: 'dim' }, 'No companions. Recruit some in town taverns.'),
    h('h4', {}, 'Line of succession'),
    cand.length ? h('ol', {}, cand.map((x) => h('li', {}, `${x.c.name} (${x.why}, ${ageStr(x.c)})`))) : h('p', { class: 'bad' }, 'No one can inherit. Marry and have children!'),
  );
  this.modal(body, { title: 'Household & Heir', wide: true });
};

// ---------------------------------------------------------------- family tree
UI.treeEl = function (opts = {}) {
  const root = ch(G.founderId);
  if (!root) return h('p', { class: 'dim' }, 'No line recorded.');
  const seen = new Set();
  const open = (p) => (opts.static ? this.modal(this.charBody(p), { title: p.name, wide: true }) : this.replaceModalChar(p));
  const node = (c) => {
    if (!c || seen.has(c.id)) return null;
    seen.add(c.id);
    const spouses = Object.values(G.chars).filter((o) => o.spouse === c.id || c.spouse === o.id || (o.children.some((k) => c.children.includes(k)) && o.id !== c.id));
    const uniq = [...new Map(spouses.map((s2) => [s2.id, s2])).values()];
    uniq.forEach((s2) => seen.add(s2.id));
    const kids = c.children.map(ch).filter(Boolean).sort((a2, b2) => a2.born - b2.born);
    const person = (p) => h('div', { class: 'tnode' + (p.alive ? '' : ' dead') + (p.id === G.mcId ? ' mc' : '') + (p.id === G.heirId ? ' heir' : '') + (G.house.heroes.includes(p.id) ? ' head' : ''), onclick: () => open(p) },
      portrait(p, 40),
      h('div', {},
        h('b', {}, (p.id === G.mcId && p.alive ? '♛ ' : p.id === G.heirId ? '★ ' : G.house.heroes.includes(p.id) ? '♔ ' : '') + p.name),
        h('small', {}, `${GD.RACES[p.race].name} · ${year(p.born)}–${p.alive ? '' : year(p.died)}`),
        h('small', { class: p.birth === 'bastard' && !p.legit ? 'bad' : 'dim' }, `${GD.GENDERS[p.gender || 'man'].sym} ` + (p.adoptedBy && p.adoptedBy.length ? 'Adopted' : GD.BIRTH[birthKey(p)].name) + (G.house.heroes.includes(p.id) ? ' · Head of House' : '')),
        !p.alive && p.cause ? h('small', { class: 'dim' }, `† ${p.cause}`) : null));
    return h('li', {},
      h('div', { class: 'couple' }, person(c), ...uniq.map((s2) => [h('span', { class: 'amp' }, '⚭'), person(s2)])),
      kids.length ? h('ul', {}, kids.map(node)) : null);
  };
  return h('div', { class: 'tree' }, h('ul', {}, node(root)));
};
UI.showTree = function () {
  this.modal([h('p', { class: 'dim' }, 'Your bloodline. ♛ is the current head, ♔ past heads, ★ the heir; faded entries are dead. Click anyone to see their sheet.'), this.treeEl()], { title: `The Line of House ${G.house.name}`, wide: true });
};

// ---------------------------------------------------------------- chronicle (the House ledger)
const KIND_ICON = { birth: '✦', death: '†', marriage: '⚭', injury: '✚', skill: '✧', gear: '⚔', era: '◈', head: '♛', year: '⌛', good: '•', bad: '!', dim: '·' };
UI.ledgerRow = function (e) {
  const who = e.ids && e.ids.length ? ch(e.ids[0]) : null;
  return h('div', { class: 'lrow k-' + e.kind },
    h('span', { class: 'lyear' }, e.year),
    h('span', { class: 'licon' }, KIND_ICON[e.kind] || '•'),
    who ? portrait(who, 28) : h('span', { class: 'lspace' }),
    h('span', { class: 'ltext' }, e.text));
};
UI.chronicleEl = function (filterId, kinds) {
  let rows = (G.ledger || []).filter((e) => (!filterId || (e.ids || []).includes(filterId)) && (!kinds || kinds.includes(e.kind)));
  if (!rows.length) return h('p', { class: 'dim' }, 'Nothing recorded yet.');
  const out = [];
  let lastYear = null;
  for (const e of rows) {
    if (e.year !== lastYear) {
      const eraAt = [...G.world.eras].reverse().find((x) => x.start <= e.year);
      out.push(h('div', { class: 'lyhead' }, h('b', {}, e.year), eraAt ? h('small', { style: `color:${GD.ERAS[eraAt.type].color}` }, GD.ERAS[eraAt.type].short) : null));
      lastYear = e.year;
    }
    out.push(this.ledgerRow(e));
  }
  return h('div', { class: 'ledger' }, out);
};
UI.lifeEvents = function (c) {
  const ev = (G.ledger || []).filter((e) => (e.ids || []).includes(c.id));
  if (!ev.length) return null;
  return h('details', { class: 'life' }, h('summary', {}, `Life events (${ev.length})`), h('div', { class: 'ledger small' }, ev.map((e) => this.ledgerRow(e))));
};
UI.showChronicle = function () {
  const people = Object.values(G.chars).filter((c) => (G.ledger || []).some((e) => (e.ids || []).includes(c.id)) && (c.house === G.house.name || c.servedHouse || c.status === 'party' || c.status === 'household'))
    .sort((a, b) => a.born - b.born);
  const holder = h('div', {}, this.chronicleEl());
  const update = () => holder.replaceChildren(this.chronicleEl(sel.value || null, kindSel.value ? kindSel.value.split(',') : null));
  const sel = h('select', { id: 'chron-filter', onchange: update },
    h('option', { value: '' }, 'Everyone'),
    people.map((c) => h('option', { value: c.id }, `${c.name}${c.alive ? '' : ' †'}${c.house === G.house.name ? '' : ' (companion)'}`)));
  const kindSel = h('select', { id: 'chron-kind', onchange: update },
    h('option', { value: '' }, 'All events'),
    h('option', { value: 'birth,death,marriage,head' }, 'Births, marriages, deaths'),
    h('option', { value: 'injury,skill,gear' }, 'Scars, skills & gear'),
    h('option', { value: 'era,head,year' }, 'Eras & successions'));
  this.modal([h('div', { class: 'row' }, h('label', { class: 'dim' }, 'Person ', sel), h('label', { class: 'dim' }, 'Show ', kindSel)), holder], { title: `Chronicle of House ${G.house.name}`, wide: true });
};

// ---------------------------------------------------------------- time skip timeline
UI.timeline = function (d, onDone) {
  this.refresh();
  const span = Math.max(1, d.endYear - d.startYear);
  const dur = clamp(span * 650, 3500, 15000);
  const events = [...d.events].sort((a, b) => a.year - b.year || a.day - b.day);
  const people = d.people.map(ch).filter(Boolean);
  const yearEl = h('div', { class: 'tl-year' }, d.startYear);
  const fill = h('div', { class: 'tl-fill' });
  const track = h('div', { class: 'tl-track' }, fill,
    events.filter((e) => ['death', 'birth', 'marriage', 'injury', 'head'].includes(e.kind)).map((e) => h('span', { class: 'tl-dot k-' + e.kind, style: `left:${((e.year - d.startYear) / span) * 100}%`, title: e.text })));
  const feed = h('div', { class: 'tl-feed' });
  const roster = h('div', { class: 'tl-roster' });
  const drawRoster = (yr) => {
    roster.replaceChildren(...people.map((c) => {
      const dead = !c.alive && year(c.died) <= yr;
      const a = Math.floor(age(c) - ((c.alive ? year() : year(c.died)) - Math.min(yr, c.alive ? yr : year(c.died))));
      // draw them as they looked in that year: shift their birth so the stage matches
      const shift = ((c.alive ? year() : year(c.died)) - Math.min(yr, c.alive ? yr : year(c.died))) * DAYS_PER_YEAR;
      const then = { ...c, born: c.born + shift };
      return h('div', { class: 'tl-person' + (dead ? ' dead' : '') + (c.id === d.heir.id ? ' heir' : '') }, portrait(then, 48), h('b', {}, c.name), h('small', {}, dead ? `† ${year(c.died)}` : `age ${Math.max(0, a)}`));
    }));
  };
  const skipBtn = act('Skip ▸▸', () => { t0 = -1e9; });
  const body = h('div', { class: 'timeline' },
    h('div', { class: 'row' }, portrait(d.dead, 70), h('div', {},
      h('p', { class: 'big' }, `† ${d.dead.name}`),
      h('p', { class: 'dim' }, `Head of House ${G.house.name}, died ${year(d.dead.died)} aged ${ageStr(d.dead)}: ${d.dead.cause}.`),
      h('p', {}, `The House waits for its heir to come of age. The years turn…`))),
    yearEl, track, roster, feed, h('div', { class: 'tl-actions' }, skipBtn));
  this.modal(body, { title: 'The Years Turn', wide: true, locked: true });
  let t0 = performance.now();
  let shown = 0;
  let lastYr = null;
  const frame = () => {
    const k = clamp((performance.now() - t0) / dur, 0, 1);
    const yr = Math.floor(d.startYear + span * k);
    yearEl.textContent = yr;
    fill.style.width = `${k * 100}%`;
    if (yr !== lastYr) { drawRoster(yr); lastYr = yr; }
    while (shown < events.length && events[shown].year <= yr) {
      const row = this.ledgerRow(events[shown]);
      row.classList.add('pop');
      feed.prepend(row);
      shown++;
    }
    if (k < 1) requestAnimationFrame(frame);
    else finish();
  };
  const finish = () => {
    skipBtn.remove();
    const rows = people.map((c) => {
      const b = d.before[c.id];
      if (!b) return null;
      const newInj = (c.injuries || []).filter((x) => !b.injuries.includes(x)).map((x) => GD.INJURIES[x].name);
      const changes = [];
      if (c.level > b.level) changes.push(`+${c.level - b.level} levels`);
      if (newInj.length) changes.push(newInj.join(', '));
      if (c.extraSkill && c.extraSkill !== b.skill) changes.push(`learned ${GD.SKILLS[c.extraSkill].name}`);
      if (c.gear.armor > b.armor || c.gear.weapon > b.weapon) changes.push('new gear');
      return h('tr', { class: c.alive ? '' : 'bad' },
        h('td', {}, c.name), h('td', {}, c.alive ? `${b.age} → ${ageStr(c)}` : `† at ${ageStr(c)}`), h('td', {}, `L${b.level} → L${c.level}`),
        h('td', { class: 'dim' }, c.alive ? (changes.join(' · ') || 'a quiet life') : c.cause));
    }).filter(Boolean);
    feed.after(h('div', {}, h('h4', {}, 'How the years treated them'), h('div', { class: 'tablewrap' }, h('table', { class: 'stats sum' }, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Age'), h('th', {}, 'Level'), h('th', {}, 'Changes')), rows)),
      act(d.lineEnded ? 'See the history of your House' : `Lead as ${d.heir.name}`, () => { this.closeModal(); onDone(); }, { cls: 'hl' })));
  };
  requestAnimationFrame(frame);
};

// ---------------------------------------------------------------- end of a line (or a Golden Age)
UI.endScreen = function (opts) {
  const reigns = G.house.reigns || [];
  const heads = h('div', { class: 'heads' }, reigns.map((r, i) => {
    const c = ch(r.id);
    if (!c) return null;
    return h('div', { class: 'head-card', onclick: () => this.modal(this.charBody(c), { title: c.name, wide: true }) }, portrait(c, 64),
      h('b', {}, c.name), h('small', {}, `Generation ${i + 1}`), h('small', {}, `${r.from}–${r.to ?? (c.alive ? 'now' : year(c.died))}`),
      h('small', { class: 'dim' }, c.alive ? `L${c.level}, still living` : `† ${c.cause}`));
  }));
  const all = Object.values(G.chars).filter((c) => c.house === G.house.name);
  const body = h('div', { class: 'endscreen' },
    h('div', { class: 'title' }, h('h1', {}, opts.title), h('p', {}, opts.text)),
    h('div', { class: 'endstats' },
      h('div', {}, h('b', {}, G.house.generation), h('small', {}, 'generations')),
      h('div', {}, h('b', {}, `${START_YEAR}–${year()}`), h('small', {}, 'years of the House')),
      h('div', {}, h('b', {}, all.length), h('small', {}, 'born or wed into the line')),
      h('div', {}, h('b', {}, Math.round(G.house.prestige)), h('small', {}, 'prestige')),
      h('div', {}, h('b', {}, Math.round(G.world.prosperity)), h('small', {}, 'prosperity')),
      h('div', {}, h('b', {}, G.stats.battles), h('small', {}, 'battles'))),
    h('h4', {}, 'Heads of the House'), heads,
    h('h4', {}, 'Family tree'), this.treeEl({ static: true }),
    h('h4', {}, 'Timeline of the House'), this.chronicleEl(),
    h('div', { class: 'tl-actions' }, opts.actions));
  this.modal(body, { wide: true, locked: true });
};
// ---------------------------------------------------------------- the world: prophecy, culture, technology, towns
UI.showWorld = function (tab = 'prophecy') {
  const tabs = { prophecy: 'Prophecy', culture: 'Culture', tech: 'Technology', towns: 'Towns' };
  const nav = h('div', { class: 'tabs' }, Object.entries(tabs).map(([k, v]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), onclick: () => { this.closeModal(); this.showWorld(k); } }, v)));
  let body;
  const d = G.world.doom;
  if (tab === 'prophecy') {
    const span = GD.DOOM_YEARS, now = year() - START_YEAR;
    body = h('div', {},
      h('p', {}, `In the year ${d.year}, ${GD.VILLAIN.name} will come forth from ${GD.VILLAIN.seat} and end the world. Each generation can raise wards against it: ${GD.WARDS_NEEDED} wards weaken it enough to be beaten. You may assault the Spire at any time, or face it when the years run out.`),
      h('div', { class: 'doomline' },
        h('div', { class: 'dl-fill', style: `width:${clamp(now / span * 100, 0, 100)}%` }),
        (G.world.tech || []).filter((t) => t.got).map((t) => h('span', { class: 'dl-mark' + (t.got ? ' got' : ''), style: `left:${(t.year - START_YEAR) / span * 100}%`, title: t.got ? `${GD.TECH.find((x) => x.key === t.key).name} (${t.year})` : 'An invention yet to come' })),
        d.done.map((w) => h('span', { class: 'dl-ward', style: `left:${(w.year - START_YEAR) / span * 100}%`, title: `${w.title} (${w.year})` })),
        h('span', { class: 'dl-now', style: `left:${clamp(now / span * 100, 0, 100)}%` })),
      h('div', { class: 'row spread' }, h('small', {}, START_YEAR), h('small', {}, `now: ${year()}`), h('small', { class: 'bad' }, `${d.year}: the end`)),
      h('h4', {}, `Wards raised: ${d.wards}/${GD.WARDS_NEEDED}`),
      d.done.length ? h('div', { class: 'ledger small' }, d.done.map((w) => h('div', { class: 'lrow k-head' }, h('span', { class: 'lyear' }, w.year), h('span', { class: 'licon' }, '✦'), ch(w.by) ? portrait(ch(w.by), 28) : null, h('span', { class: 'ltext' }, `${w.title}, by ${ch(w.by) ? ch(w.by).name : 'the House'} (generation ${w.gen})`)))) : h('p', { class: 'dim' }, 'None yet.'),
      h('h4', {}, 'Current task'), this.questBox(),
      h('p', { class: 'dim' }, `${GD.VILLAIN.name} is around level ${villainLevel()} now. It grows stronger every year; every ward takes 3 levels from it.`));
  } else if (tab === 'culture') {
    const cu = G.house.culture;
    const w = G.world.era.values || {};
    const members = houseMembersEver();
    const rows = Object.entries(GD.CULTURE_AXES).map(([k, ax]) => {
      const hv = cultureValue(k), wv = w[k] || 0;
      const pos = (v) => `${(v + 1) * 50}%`;
      return h('div', { class: 'axis' },
        h('div', { class: 'axis-label' }, h('small', {}, ax.neg), h('b', {}, ax.label), h('small', {}, ax.pos)),
        h('div', { class: 'axis-bar' }, h('span', { class: 'ax-era', style: `left:${pos(wv)}`, title: `The people of this era: ${wv.toFixed(2)}` }),
          cu.formed ? h('span', { class: 'ax-house', style: `left:${pos(hv)}`, title: `House ${G.house.name}: ${hv.toFixed(2)}` }) : null));
    });
    body = h('div', {},
      cu.formed
        ? h('p', {}, h('b', {}, `The ${cu.name}`), ` (since ${cu.since}). ${cultureTenets().join(' · ') || 'No strong tenets yet.'}`)
        : h('p', { class: 'dim' }, `Your House is still too small to have a culture of its own (${members}/${GD.CULTURE_MEMBERS} members). The choices made now will shape it.`),
      h('p', { class: 'dim small' }, 'Every choice the House makes (who marries whom, forcing or allowing love, fighting or studying, charity or ambition, welcoming or turning away outsiders) shapes its culture. A person\'s choices weigh more the longer they lived. Culture changes only how the people of each era see the House.'),
      h('div', { class: 'legend' }, h('span', { class: 'ax-house' }), ' House', h('span', { class: 'ax-era' }), ` People of the ${GD.ERAS[G.world.era.type].name}`),
      rows,
      h('p', {}, 'Reputation in this era: ', h('b', { style: `color:${reputationInfo().color}` }, reputationInfo().name),
        cu.formed ? h('small', { class: 'dim' }, ` · courting, hiring, matches and prestige ×${repMult().toFixed(2)}${G.house.scandal > 0.05 ? ' · lingering scandal' : ''}`) : null),
      h('p', { class: 'dim small' }, `Close-kin unions this era will accept: ${eraKinTolerance() < 1 ? 'none closer than distant kin' : eraKinTolerance() < 1.5 ? 'up to second cousins' : eraKinTolerance() < 2 ? 'up to first cousins once removed' : eraKinTolerance() < 3 ? 'up to first cousins' : eraKinTolerance() < 4 ? 'up to aunts, uncles, nieces and nephews' : 'even siblings'}.`),
      h('h4', {}, 'Who shaped the House most'),
      h('div', { class: 'row' }, topInfluencers().map((x) => h('div', { class: 'mini' }, portrait(x.c, 40), h('div', {}, h('b', {}, x.c.name), h('small', {}, `${Math.round(x.w)} years of influence`))))));
  } else if (tab === 'tech') {
    body = h('div', {}, h('p', { class: 'dim' }, 'Inventions arrive at different times in every world, and some never arrive at all.'),
      (G.world.tech || []).map((t) => {
        const d2 = GD.TECH.find((x) => x.key === t.key);
        return h('div', { class: 'row up' }, h('div', { class: 'grow' }, h('b', {}, t.got ? d2.name : '???'), h('br'), h('small', { class: 'dim' }, t.got ? `${d2.desc} (since ${t.year})` : 'Not yet discovered.')), h('small', { class: t.got ? 'good' : 'dim' }, t.got ? 'Known' : 'Unknown'));
      }));
  } else {
    body = h('div', {}, h('div', { class: 'tablewrap' }, h('table', { class: 'stats sum' },
      h('tr', {}, h('th', {}, 'Town'), h('th', {}, 'Size'), h('th', {}, 'Founded'), h('th', {}, 'Where')),
      G.world.towns.map((t) => h('tr', { class: t.fallen ? 'dim' : '' }, h('td', {}, t.name), h('td', {}, t.fallen ? 'Fallen' : GD.TOWN_SIZES[t.size]), h('td', {}, t.founded),
        h('td', {}, tileAt(t.x, t.y).land === G.world.mainland ? 'Mainland' : 'Island'))))));
  }
  this.modal([nav, body], { title: 'The World', wide: true });
};

// ---------------------------------------------------------------- menu
// which build is running, and what the screen reports (for checking phone layouts)
UI.buildVersion = function () { const m = document.querySelector('meta[name="gen-version"]'); const v = m ? m.content : 'dev'; return v === '__VERSION__' ? 'dev' : v; };
UI.diagnostics = function () {
  const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return `Version ${this.buildVersion()} · screen ${screen.width}×${screen.height} · view ${window.innerWidth}×${window.innerHeight} · fill ${getComputedStyle(document.documentElement).getPropertyValue('--appH').trim() || '-'} · ${standalone ? 'home-screen app' : 'browser'}`;
};
// installed web apps can hold on to old files: check the live page and reload if it has moved on
UI.checkForUpdate = function () {
  if (!/^https?:/.test(location.protocol)) return;
  const mine = this.buildVersion();
  if (mine === 'dev') return;
  fetch(location.pathname + '?check=' + Date.now(), { cache: 'no-store' }).then((r) => r.text()).then((html) => {
    const m = html.match(/name="gen-version" content="([^"]+)"/);
    let tried = null;
    try { tried = sessionStorage.getItem('gen-update-tried'); } catch (e) { /* storage blocked */ }
    if (m && m[1] !== mine && m[1] !== '__VERSION__' && tried !== m[1]) {
      try { sessionStorage.setItem('gen-update-tried', m[1]); } catch (e) { /* storage blocked */ }
      try { saveGame(); } catch (e) { /* nothing to save yet */ }
      UI.toast('Updating to the latest version…');
      setTimeout(() => location.replace(location.pathname + '?v=' + m[1]), 900);
    }
  }).catch(() => {});
};
UI.showMenu = function () {
  this.modal([
    h('p', { class: 'dim small' }, this.diagnostics()),
    act('Save Game', () => { UI.toast(saveGame() ? 'Game saved.' : 'Could not save (storage unavailable).'); this.closeModal(); }),
    act('Concept & How to Play', () => { this.closeModal(); this.showHelp(); }),
    act('Abandon & Start Over', () => {
      this.closeModal();
      this.modal([h('p', {}, 'Start a new House? Your current save will be erased.'),
        act('Erase and start over', () => { deleteSave(); location.reload(); }, { cls: 'danger' }),
        act('Keep playing', () => this.closeModal())], { title: 'Start Over' });
    }, { cls: 'danger' }),
  ], { title: 'Menu' });
};
UI.showHelp = function () {
  this.modal(h('div', { class: 'help', html: `
    <p class="dim">Play on any device: <a href="https://siegelingsgame.github.io/GenerationsRPG/" target="_blank" rel="noopener">siegelingsgame.github.io/GenerationsRPG</a>. On a phone, add it to your home screen to play full screen.</p>
    <p><b>Generations</b> is a roguelike about a family line. Your goal is to build a better world for future generations and bring about a <b>Golden Age</b> (95 prosperity).</p>
    <ul>
      <li><b>Time matters.</b> Travel, battles and rest all cost days. Every new year everyone ages, and people are born, marry, die or turn bad.</li>
      <li><b>Age:</b> youths level ×1.5 and earn <i>formative points</i> (permanent XP bonus and protection from old-age debuffs). Elders are wiser but weaker, and level slowly.</li>
      <li><b>Races</b> mature and age at different speeds. An elf heir takes 30 years to come of age; an orc heir takes 11.</li>
      <li><b>Death:</b> fallen fighters may die for good. When your head of House dies, your named heir (or the eldest of the blood) takes over and the years turn until they come of age. Everyone lives those years: they level up, marry, have children, gain scars, lose limbs, learn skills and sometimes die.</li>
      <li><b>Chronicle:</b> every birth, death, marriage, injury and succession is kept in the House ledger. When your line ends you get its full family tree and timeline.</li>
      <li><b>Map:</b> drag the wheel or use + and − to zoom, and Q / E or the buttons to rotate.</li>
      <li><b>Birth:</b> Highborn, Lowborn, Bastard and Orphan each carry bonuses and drawbacks. Research unknown lineages in taverns.</li>
      <li><b>Prestige</b> unlocks better partners, recruits and estate tiers. Invest gold in your estate. Upgrades and the heirloom pass down.</li>
      <li><b>Betrayal:</b> resentful companions and their children can become <b>Rivals</b> who hunt your line. Keep bonds and loyalty high.</li>
      <li><b>Deeds</b> in towns, cleared ruins and slain rivals raise prosperity, and higher prosperity makes good eras more likely.</li>
    </ul>` }), { title: 'How to Play', wide: true });
};
