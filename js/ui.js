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

function portrait(c, size = 64, bg = true, overlay) {
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
  const look = figLook(c, overlay);
  const saved = Render.ctx;
  Render.ctx = ctx;
  try { Render.drawFigure(size / 2, size - 5, look, size / 60, { weapon: look.weapon }); } finally { Render.ctx = saved; }
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
    if (e.key !== 'Escape') return;
    if (this.modalStack.length && !this.modalStack[this.modalStack.length - 1].locked) return this.closeModal();
    if (this.mob && this.mob.camera && this.mob.camera.open) { this.mob.camera.open = false; return; }
    if (this.mob && this.mob.logPanel && this.mob.logPanel.open) { this.closeLog(); return; }
    if (Living.moving && !Battle.active && !TownView.open && !ChurchView.open && !Campfire.open) Living.cancel('You halt on the road.');
  });
};

// ---------------------------------------------------------------- phone layout
// Phone: top header (minimap + chip + goal) and bottom dock (Here / Map / Log / House).
// Map expands camera tools; Log expands recent actions and carried items.
UI.isMobile = () => window.matchMedia('(max-width: 900px)').matches;
UI.buildMobile = function () {
  const mini = h('canvas', { class: 'hud-mini', width: 144, height: 144, role: 'img', 'aria-label': 'North-up world overview' });
  const compass = h('canvas', { width: 88, height: 88, 'aria-hidden': 'true' });
  const camera = h('details', { class: 'hud-camera' },
    h('summary', {}, compass, 'Map'));
  const goal = h('div', { id: 'mobile-goal' });
  const logBody = h('div', { class: 'hud-log-body', id: 'hud-log-body' });
  const logPanel = h('details', { class: 'hud-log' },
    h('summary', {}, 'Log'),
    h('div', { class: 'hud-log-panel' },
      h('div', { class: 'hud-log-tabs', role: 'tablist' },
        h('button', { type: 'button', class: 'hud-log-tab on', 'data-tab': 'actions', onclick: (e) => { e.preventDefault(); this.setLogTab('actions'); } }, 'Actions'),
        h('button', { type: 'button', class: 'hud-log-tab', 'data-tab': 'items', onclick: (e) => { e.preventDefault(); this.setLogTab('items'); } }, 'Items')),
      logBody));
  camera.addEventListener('toggle', () => { if (camera.open) this.closeLog(); });
  logPanel.addEventListener('toggle', () => {
    if (logPanel.open) { camera.open = false; this.renderExpandableLog(); }
  });
  this.mob = {
    mini, compass, camera, goal, logPanel, logBody, logTab: 'actions',
    bar: h('div', { id: 'mobilebar' },
      h('div', { class: 'hud-header' },
        h('div', { class: 'hud-overview' }, mini,
          h('button', { id: 'hudchip', 'aria-label': 'Actions here', onclick: () => this.openHere() })),
        goal),
      h('nav', { class: 'hud-dock', 'aria-label': 'World controls' },
        h('button', { id: 'hereBtn', 'aria-label': 'Actions here', onclick: () => this.openHere() }, 'Here'),
        camera, Render.mobileStopBtn,
        logPanel,
        h('button', { id: 'menuBtn', 'aria-label': 'Open house menu', onclick: () => this.openDrawer() }, 'House'))),
    backdrop: h('div', { id: 'backdrop', onclick: () => this.closeDrawer() }),
    drawer: h('aside', { id: 'drawer', 'aria-hidden': 'true' },
      h('div', { class: 'grip', 'aria-hidden': 'true' }),
      h('div', { class: 'drawer-head' }, h('div', { id: 'drawer-crest' }, h('b', {}, 'Your House')), h('button', { class: 'drawer-x', 'aria-label': 'Close menu', onclick: () => this.closeDrawer() }, '×')),
      h('div', { id: 'drawer-body' })),
    sheet: h('div', { id: 'sheet' }),
  };
  document.body.append(this.mob.bar, this.mob.backdrop, this.mob.drawer, this.mob.sheet);
  this.swipeToClose(this.mob.drawer, () => this.closeDrawer());
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
  // iOS paints nothing outside the page box, so the page itself has to be screen-tall as well
  document.documentElement.classList.toggle('ios-short', full > window.innerHeight);
};
// Inside a town, church or camp, the House screen still opens: over the scene, which stays put.
UI.inScene = function () {
  return !!((typeof TownView !== 'undefined' && TownView.open) || (typeof ChurchView !== 'undefined' && ChurchView.open) || (typeof Campfire !== 'undefined' && Campfire.open));
};
UI.sceneHouseBtn = function () {
  return h('button', { class: 'scene-house', type: 'button', 'aria-label': 'Open House: family, Guard, heir', onclick: (e) => {
    e.stopPropagation();
    if (this.isMobile()) this.openDrawer(); else this.showHousehold();
  } }, h('span', { 'aria-hidden': 'true' }, '♛'), ' House');
};
UI.openDrawer = function () {
  this.closeModalQuiet();
  document.body.classList.toggle('scene-open', this.inScene());
  if (this.mob.camera) this.mob.camera.open = false;
  this.closeLog();
  document.body.classList.add('drawer-open');
  this.mob.drawer.setAttribute('aria-hidden', 'false');
  this.placeLayout();
};
// ---- multi-class: learned classes, training and mentors
UI.learnedBox = function (c) {
  const ls = learnedClasses(c);
  if (!ls.length) return null;
  return h('div', { class: 'classbox learned' },
    h('small', { class: 'dim' }, `Also trained (${ls.length}/${GD.MAX_LEARNED})`),
    ...ls.map((k) => h('div', {}, h('b', {}, `${GD.CLASSES[k].icon} ${GD.CLASSES[k].name}`),
      h('ul', { class: 'abil' }, GD.CLASSES[k].skills.slice(0, 2).map((id) => h('li', {}, h('b', {}, GD.ABILITIES[id].name), ` (${GD.ABILITIES[id].cost} focus): ${GD.ABILITIES[id].desc}`))))));
};
UI.trainingBox = function (c) {
  const t = c.training;
  if (t) {
    const m = ch(t.mentor), need = trainDays(c);
    return h('div', { class: 'classbox training' },
      h('b', {}, `Learning: ${GD.CLASSES[t.cls].icon} ${GD.CLASSES[t.cls].name}`),
      h('small', { class: 'dim' }, `${c.squireOf === t.mentor ? 'Squire to' : 'Taught by'} ${m ? m.name : 'their mentor'} · about ${Math.max(1, Math.ceil((need - t.days) / 30))} more months together`),
      bar(t.days, need, 'xp'),
      c.alive ? act('Change mentor', () => this.showMentors(c), { sub: 'start learning something else instead' }) : null);
  }
  if (!c.alive || learnedClasses(c).length >= GD.MAX_LEARNED) return null;
  return act('Learn a new class', () => this.showMentors(c), { cls: 'hl', sub: `train with a mentor from your court or party · ${learnedClasses(c).length}/${GD.MAX_LEARNED} learned` });
};
UI.showMentors = function (c) {
  const list = mentorsFor(c);
  const months = Math.round(trainDays(c) / 30);
  this.modal([
    h('p', { class: 'takein-what' }, `${c.name} keeps being a ${isAdult(c) ? classOf(c).name : 'child of the House'} and learns a second calling on top. Pick a teacher; they must stay with your party or at the estate. It takes about ${months} months${months < 12 ? ' (the young learn faster)' : ''}.`),
    list.length ? null : h('p', { class: 'dim' }, 'Nobody in your court or party knows a class they could teach. Recruit people in towns, or take in a squire.'),
    ...list.map(({ m, k }) => h('div', { class: 'takein-card' },
      portrait(m, 56),
      h('div', { class: 'takein-info' },
        h('b', {}, `${GD.CLASSES[k].icon} ${GD.CLASSES[k].name}`),
        h('small', {}, `taught by ${m.name}${m.id === G.mcId ? ' (you)' : ''}`),
        h('small', {}, `Gains: ${GD.CLASSES[k].skills.slice(0, 2).map((id) => GD.ABILITIES[id].name).join(', ')}`)),
      h('button', { class: 'takein-go', onclick: () => {
        startTraining(c, m, k);
        Log.add(`${c.name} begins training as a ${GD.CLASSES[k].name} under ${m.name}.`, 'good', [c.id, m.id]);
        saveGame(); this.closeAll(); this.toast(`${c.name} starts learning ${GD.CLASSES[k].name}.`); this.refresh();
      } }, 'Train', h('small', {}, 'free')))),
  ], { title: `Teach ${c.name}`, sheet: true });
};
// How much gold the House has, kept current by UI.refresh.
UI.goldPill = function () {
  return h('div', { class: 'gold-pill', 'aria-live': 'polite' }, h('span', { class: 'coin', 'aria-hidden': 'true' }), h('b', {}, Math.round(G.house.gold)), ' gold');
};
UI.syncGold = function () {
  if (!G || !G.house) return;
  for (const b of document.querySelectorAll('.gold-pill b')) b.textContent = Math.round(G.house.gold);
};
// drag a sheet down to dismiss it
UI.swipeToClose = function (el, close) {
  let y0 = null, dy = 0;
  el.addEventListener('touchstart', (e) => {
    const scroller = e.target.closest('.modal-body, #drawer-body');
    y0 = scroller && scroller.scrollTop > 0 ? null : e.touches[0].clientY; dy = 0;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    el.style.transform = dy ? `translateY(${dy}px)` : '';
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (y0 == null) return;
    el.style.transform = '';
    if (dy > 90) close();
    y0 = null; dy = 0;
  });
};
// Take someone in: a ward (a child raised as your own, who can become heir) or a squire (a young
// fighter who serves the head of the House). Only your own people's children: those of your House,
// party and court. Orphans are found at church orphanages.
UI.showTakeIn = function (kind = 'ward') {
  const ward = kind === 'ward';
  const mc = ch(G.mcId);
  const list = ward ? Game.courtWards() : Game.squireCandidates();
  const cost = ward ? 0 : GD.SQUIRE_COST;
  const broke = G.house.gold < cost;
  // what stands out compared with others of their race
  const best = (c) => { const rb = GD.RACES[c.race].base, edge = (k) => c.base[k] + c.bonus[k] - rb[k] + k.length * 0.001;
    const k = STATS.reduce((a, b) => (edge(b) > edge(a) ? b : a)); return { str: 'strong', agi: 'quick', int: 'clever', wil: 'steady', vit: 'tough' }[k]; };
  // whose child they are, in a few words
  const kinOf = (c) => {
    const ps = Game.parentsOf(c).filter((p) => Game.isCourtPerson(p));
    const p = ps[0];
    if (!p) return '';
    const rel = p.id === G.mcId ? 'your' : `${p.name}'s`;
    const kid = c.gender === 'woman' ? 'daughter' : 'son';
    const who = p.id === G.mcId ? '' : p.house === G.house.name ? ' (your kin)' : p.status === 'party' ? ' (in your Guard)' : p.alive ? ' (of your court)' : ', who fell in your service';
    return `${rel[0].toUpperCase() + rel.slice(1)} ${(c.adoptedBy || []).includes(p.id) ? 'adopted ' : ''}${kid}${who}`;
  };
  const card = (c) => h('div', { class: 'takein-card' },
    portrait(c, 64),
    h('div', { class: 'takein-info' },
      h('b', {}, c.name),
      h('small', { class: 'takein-kin' }, kinOf(c)),
      h('small', {}, `${GD.RACES[c.race].name} · ${ageStr(c)} yrs · naturally ${best(c)}${c.trait ? ' · ' + GD.TRAITS[c.trait].name : ''}`),
      ward ? null : h('small', { class: 'takein-cls' }, (() => { const own = classFor(c), lc = classFor(mc);
        return own === lc ? `A born ${GD.CLASSES[own].name}, like you` : `${GD.CLASSES[own].name} · will learn ${GD.CLASSES[lc].name} from you`; })())),
    h('button', { class: 'takein-go', disabled: broke, onclick: () => { this.closeAll(); ward ? Game.adopt(c, 0) : Game.takeSquire(c); } },
      ward ? 'Take in' : 'Accept', h('small', {}, ward ? 'their parent agrees' : `${cost} gold`)));
  const church = typeof Church !== 'undefined' ? Church.nearest() : null;
  const churchHint = church ? `The nearest orphanage is at the ${Church.nameFor(church)}${G.world.towns[church.churchTown] ? ' by ' + G.world.towns[church.churchTown].name : ''}.` : 'Churches keep orphanages.';
  // ⓘ who qualifies: a tap-to-open tip (hover alone does nothing on a phone). Opens by itself when nobody does.
  const why = Game.takeInWhy(kind);
  const rule = ward
    ? 'Wards are young children, born or adopted, of someone in your House, your Guard or your court, including those who died in your service. Strangers are never offered.'
    : 'Squires are the sons and daughters, born or adopted, of your House, your Guard or your court, once they come of age and while still young. Strangers are never offered.';
  const tipBody = h('div', { class: 'tip-body', id: `tip-${kind}`, hidden: !!list.length, role: 'note' },
    h('p', {}, rule),
    !list.length && why.reasons.length ? h('ul', {}, why.reasons.map((r) => h('li', {}, r))) : null,
    !list.length && why.soon.length ? h('p', { class: 'good' }, 'Coming of age soon: ', why.soon.map((x) => `${x.c.name} in ${x.yrs} yr${x.yrs === 1 ? '' : 's'}`).join(', '), '.') : null,
    ward ? h('p', {}, `Orphans with no one at all are cared for by the churches. ${churchHint}`)
      : h('p', {}, 'To have more: recruit companions who have families, take in wards, and raise children of your own.'));
  const tipBtn = h('button', { class: 'tip-btn', type: 'button', 'aria-expanded': list.length ? 'false' : 'true', 'aria-controls': `tip-${kind}`,
    onclick: () => { tipBody.hidden = !tipBody.hidden; tipBtn.setAttribute('aria-expanded', tipBody.hidden ? 'false' : 'true'); } },
  'ⓘ ', list.length ? `Who can be a ${ward ? 'ward' : 'squire'}?` : `Why is no one here?`);
  const empty = [h('p', { class: 'dim takein-none' }, ward ? 'No child of your people can come to you right now.' : 'No one of your people can serve as a squire right now.')];
  this.replaceOrOpen([
    h('div', { class: 'takein-tabs', role: 'tablist' },
      h('button', { class: ward ? 'on' : '', role: 'tab', onclick: () => this.showTakeIn('ward') }, h('span', { 'aria-hidden': 'true' }, '🧒'), ' Ward'),
      h('button', { class: ward ? '' : 'on', role: 'tab', onclick: () => this.showTakeIn('squire') }, h('span', { 'aria-hidden': 'true' }, '🛡'), ' Squire')),
    h('p', { class: 'takein-what' }, ward
      ? 'A child of your court raised in your home. They take your name and can become your heir.'
      : `A son or daughter of your people who joins your party. They keep their own class and learn ${mc.name}'s ${classOf(mc).name} class on top.`),
    h('div', { class: 'tip' }, tipBtn, tipBody),
    broke && list.length ? h('p', { class: 'bad' }, `You need ${cost} gold.`) : null,
    ...(list.length ? list.slice(0, 4).map(card) : empty),
    list.length > 4 ? h('p', { class: 'dim' }, `+${list.length - 4} more.`) : null,
    ward && list.length ? h('p', { class: 'dim small' }, `Orphans: ${churchHint}`) : null,
  ], { title: 'Ward or squire', sheet: true, takein: true });
};
// re-open a screen in place when switching its tabs
UI.replaceOrOpen = function (content, opts) {
  const top = this.modalStack[this.modalStack.length - 1];
  if (top && top.takein) { top.el.remove(); this.modalStack.pop(); }
  const w = this.modal(content, opts);
  this.modalStack[this.modalStack.length - 1].takein = opts.takein;
  return w;
};
// Tabs that keep every panel in the page and only show one, so a screen never needs to scroll.
// tabs: [{ k, label, icon?, badge?, body }]. Returns { nav, panes, set }.
UI.tabSet = function (tabs, key, opts = {}) {
  tabs = tabs.filter(Boolean);
  const cur = tabs.some((t) => t.k === key) ? key : tabs[0].k;
  const nav = h('div', { class: 'tabset-nav ' + (opts.cls || ''), role: 'tablist' });
  const panes = h('div', { class: 'tabset-panes' });
  const set = (k) => {
    for (const b of nav.children) { const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }
    for (const pn of panes.children) pn.hidden = pn.dataset.k !== k;
    if (opts.onChange) opts.onChange(k);
  };
  for (const t of tabs) {
    nav.append(h('button', { type: 'button', role: 'tab', 'data-k': t.k, onclick: () => set(t.k) },
      t.icon ? h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, t.icon) : null,
      h('span', { class: 'tab-label' }, t.label),
      t.badge ? h('span', { class: 'tab-badge' }, t.badge) : null));
    panes.append(h('div', { class: 'tabset-pane', role: 'tabpanel', 'data-k': t.k }, t.body));
  }
  set(cur);
  return { nav, panes, set };
};

// Where someone stands in the House, as the House screen and character sheet show it.
UI.roleOf = function (c) {
  const mc = ch(G.mcId);
  if (!c) return null;
  if (c.id === G.mcId) return { k: 'head', icon: '♛', label: 'Head of House' };
  if (mc && spouseOf(mc) === c) return { k: 'spouse', icon: '⚭', label: 'Spouse' };
  if (c.id === G.heirId) return { k: 'heir', icon: '★', label: 'Heir' };
  if (c.adoptedBy && c.adoptedBy.length) return { k: 'ward', icon: '❦', label: 'Adopted' };
  if (c.squireOf) return { k: 'squire', icon: '🛡', label: 'Squire' };
  if (c.house === G.house.name) {
    const k = mc ? kinship(mc, c) : null;
    return { k: 'kin', icon: '⚜', label: k && k.rel ? k.rel[0].toUpperCase() + k.rel.slice(1) : 'Kin' };
  }
  return { k: 'court', icon: '⚑', label: 'Companion' };
};
UI.closeness = function (b) {
  return b >= 80 ? 'Devoted' : b >= 60 ? 'In love' : b >= 30 ? 'Fond' : b >= 0 ? 'Cordial' : b >= -40 ? 'Cold' : 'Estranged';
};
// what happens to the House if the head died today
UI.successionState = function () {
  const mc = ch(G.mcId), heir = ch(G.heirId), cands = heirCandidates(G.mcId);
  if (heir && heir.alive) return { ok: true, heir, cands };
  const next = cands[0];
  if (!next) return { ok: false, level: 'end', cands, text: `If ${mc.name} dies now, House ${G.house.name} ends.`,
    sub: 'Nobody can carry the name. A child, a ward, or a loyal companion of long service would save it.' };
  if (next.why === 'Adopted companion') return { ok: false, level: 'thin', cands, text: 'No heir of the House.',
    sub: `If ${mc.name} dies, ${next.c.name}, a loyal companion, would be taken in to lead. Better to raise one of your own.` };
  return { ok: false, level: 'unnamed', cands, text: 'No heir named.', sub: `By custom, ${next.c.name} (${next.why.toLowerCase()}) would inherit.` };
};

// ---- The House screen (phones): a crest header, five tabs along the bottom, and never a scroll.
// Court: who is head, spouse and heir, and who is blood, adopted or sworn. Guard: the party.
// Heir: what happens to the line and how to secure it. Quest: the prophecy. More: everything else.
UI.renderDrawer = function () {
  if (!this.mob || !G || !G.mcId) return;
  const hs = G.house;
  $('#drawer-crest').replaceChildren(
    Heraldry.canvas(hs.heraldry, 40),
    h('div', { class: 'hv-name' }, h('b', {}, `House ${hs.name}`), h('small', {}, `${seasonName()} ${year()} · Gen ${hs.generation} · ${GD.ESTATE[hs.tier].name}`)),
    h('div', { class: 'hv-stats' },
      h('span', { class: 'hv-gold', title: 'Gold' }, h('span', { class: 'coin', 'aria-hidden': 'true' }), h('b', {}, Math.round(hs.gold))),
      h('span', { title: 'Potions' }, '⚗', h('b', {}, hs.potions)),
      h('span', { title: 'Fame' }, '✦', h('b', {}, Math.round(hs.prestige)))));
  const st = this.successionState();
  const tabs = this.tabSet([
    { k: 'court', icon: '♛', label: 'Court', body: this.houseCourt() },
    { k: 'guard', icon: '⚔', label: 'Guard', badge: `${G.party.length}/4`, body: this.houseGuard() },
    { k: 'heir', icon: '★', label: 'Heir', badge: st.ok ? null : '!', body: this.houseHeir() },
    { k: 'quest', icon: '📜', label: 'Quest', body: this.houseQuest() },
    { k: 'more', icon: '☰', label: 'More', body: this.houseMore() },
  ], this.houseTab || 'court', { cls: 'hv-tabs', onChange: (k) => { this.houseTab = k; } });
  $('#drawer-body').replaceChildren(h('div', { class: 'hv' }, tabs.panes, tabs.nav));
  this.houseTabs = tabs;
};
UI.goHouseTab = function (k) { if (this.houseTabs) this.houseTabs.set(k); };
UI.fromHouse = function (fn) { return () => { this.closeDrawer(); fn(); }; };

UI.houseCourt = function () {
  const mc = ch(G.mcId), sp = spouseOf(mc), heir = ch(G.heirId);
  const open = (c) => this.fromHouse(() => this.showChar(c));
  const inGuard = (c) => G.party.includes(c.id);
  const others = Object.values(G.chars).filter((c) => c.alive && (c.status === 'party' || c.status === 'household')
    && c.id !== mc.id && c !== sp && c.id !== G.heirId)
    .sort((a, b) => inGuard(b) - inGuard(a) || a.born - b.born);
  const kin = others.filter((c) => c.house === G.house.name && !(c.adoptedBy && c.adoptedBy.length));
  const wards = others.filter((c) => c.adoptedBy && c.adoptedBy.length);
  const court = others.filter((c) => c.house !== G.house.name);
  const chip = (c) => {
    const r = this.roleOf(c);
    return h('button', { class: `hv-chip r-${r.k}` + (inGuard(c) ? ' guard' : ''), onclick: open(c) },
      inGuard(c) ? h('span', { class: 'hv-guardmark', title: 'In your Guard' }, '⚔') : null,
      portrait(c, 40),
      h('b', {}, c.name),
      h('small', {}, isAdult(c) ? (r.k === 'court' ? classOf(c).name : r.label) : `${r.k === 'ward' ? 'Ward' : r.label} · ${ageStr(c)}`));
  };
  const row = (title, list, empty) => h('div', { class: 'hv-row' },
    h('div', { class: 'hv-row-head' }, h('b', {}, title), h('small', {}, list.length || '')),
    h('div', { class: 'hv-strip' }, list.length ? list.map(chip) : empty));
  const ghost = (icon, text, fn) => h('button', { class: 'hv-chip ghost', onclick: fn }, h('span', { class: 'hv-ghost-icon' }, icon), h('small', {}, text));
  const odds = sp ? birthOdds(mc, sp) : null;
  return h('div', { class: 'hv-court' },
    h('div', { class: 'hv-seat' },
      h('button', { class: 'hv-throne', onclick: open(mc) },
        h('span', { class: 'hv-crown', 'aria-hidden': 'true' }, '♛'),
        portrait(mc, 72),
        h('small', { class: 'hv-role' }, 'Head of House'),
        h('b', {}, mc.name),
        h('small', {}, `${classOf(mc).name} · L${mc.level} · ${ageStr(mc)} yrs`),
        bar(mc.hp, maxHp(mc), 'hp')),
      h('span', { class: 'hv-knot', 'aria-hidden': 'true' }, sp ? '⚭' : ''),
      sp ? h('button', { class: 'hv-consort', onclick: this.fromHouse(() => this.showPartner()) },
        portrait(sp, 56),
        h('small', { class: 'hv-role' }, 'Spouse'),
        h('b', {}, sp.name),
        h('small', { class: 'hv-heart' }, `♥ ${this.closeness(bond(sp, mc))} · ${Math.round(bond(sp, mc))}`),
        odds && !odds.why ? h('small', {}, `Child this year ~${Math.round(odds.shown * 100)}%`) : h('small', {}, odds ? 'No children together' : ''))
        : h('button', { class: 'hv-consort ghost', onclick: this.fromHouse(() => Game.seekNewSpouse()) },
          h('span', { class: 'hv-ghost-icon' }, '⚭'),
          h('b', {}, isWidowed(mc) ? 'Widowed' : 'Unmarried'),
          h('small', {}, 'Find a spouse'))),
    heir && heir.alive
      ? h('button', { class: 'hv-heirline', onclick: () => this.goHouseTab('heir') }, portrait(heir, 36),
        h('span', {}, h('small', {}, '★ Heir'), h('b', {}, heir.name)),
        h('small', { class: 'hv-heirwhy' }, isAdult(heir) ? `${classOf(heir).name} · ${ageStr(heir)} yrs` : `${ageStr(heir)} yrs · of age in ${Math.ceil(GD.RACES[heir.race].maturity - age(heir))}`))
      : h('button', { class: 'hv-heirline warn', onclick: () => this.goHouseTab('heir') },
        h('span', { class: 'hv-ghost-icon' }, '⚠'),
        h('span', {}, h('b', {}, 'No heir'), h('small', {}, this.successionState().text)), h('small', { class: 'hv-heirwhy' }, 'What it means ›')),
    row('Family', kin, ghost('✦', sp ? 'Children come with time' : 'Marry to found a line', this.fromHouse(() => this.showPartner()))),
    row('Adopted', wards, ghost('❦', 'Take in a ward', this.fromHouse(() => this.showTakeIn('ward')))),
    row('Court', court, ghost('⚑', 'Recruit at a tavern or take a squire', this.fromHouse(() => this.showTakeIn('squire')))),
    h('p', { class: 'hv-legend' }, '♛ head · ⚭ spouse · ★ heir · ❦ adopted · ⚔ in your Guard'));
};

UI.houseGuard = function () {
  const atEstate = tileAt(G.pos.x, G.pos.y).feature === 'estate';
  const party = G.party.map(ch).filter(Boolean);
  const slot = (c) => {
    if (!c) return h('div', { class: 'hv-slot empty' }, h('span', { class: 'hv-ghost-icon' }, '+'), h('b', {}, 'Open place'), h('small', {}, 'recruit in a tavern, take a squire, or bring someone from the estate'));
    const r = this.roleOf(c);
    return h('button', { class: `hv-slot r-${r.k}`, onclick: this.fromHouse(() => this.showChar(c)) },
      h('span', { class: 'hv-badge' }, `${r.icon} ${r.label}`),
      portrait(c, 52),
      h('b', {}, c.name),
      h('small', {}, isAdult(c) ? `${classOf(c).name}${learnedClasses(c).length ? ' +' + learnedClasses(c).length : ''} · L${c.level}` : `${GD.STAGES[stageKey(c)].name} · ${ageStr(c)}`),
      bar(c.hp, maxHp(c), 'hp'),
      h('small', { class: 'hv-slot-meta' }, `HP ${Math.round(c.hp)}/${maxHp(c)} · Power ${power(c)}`),
      c.training ? h('small', { class: 'dm-training' }, `learning ${GD.CLASSES[c.training.cls].name}`) : null);
  };
  const waiting = Object.values(G.chars).filter((c) => c.alive && c.status === 'household' && isAdult(c));
  return h('div', { class: 'hv-guard' },
    h('p', { class: 'hv-lead' }, 'Your Guard travels with you and fights at your side. Four places.'),
    h('div', { class: 'hv-slots' }, [0, 1, 2, 3].map((i) => slot(party[i]))),
    h('div', { class: 'hv-row' },
      h('div', { class: 'hv-row-head' }, h('b', {}, 'At the estate'), h('small', {}, atEstate ? 'tap someone to bring them' : 'go home to change your Guard')),
      h('div', { class: 'hv-strip' }, waiting.length ? waiting.map((c) => h('button', { class: 'hv-chip r-' + this.roleOf(c).k, onclick: this.fromHouse(() => this.showChar(c)) },
        portrait(c, 40), h('b', {}, c.name), h('small', {}, `${classOf(c).name} · L${c.level}`)))
        : h('small', { class: 'dim hv-none' }, 'Nobody waiting at home.'))),
    h('div', { class: 'hv-morale' },
      h('span', {}, 'Morale ', h('b', {}, Math.round(houseMorale())), ` · ${moraleName()}`),
      bar(houseMorale(), 100, houseMorale() >= 50 ? 'hp' : 'xp'),
      h('small', {}, `${battleSpirit() >= 1 ? '+' : ''}${Math.round((battleSpirit() - 1) * 100)}% in battle${blessed('valour') ? ' (blessed by Kethran)' : ''}${Church.unburied().length ? ` · ${Church.unburied().length} dead wait for burial` : ''}`)),
    h('div', { class: 'hv-guard-foot' },
      h('span', {}, h('b', {}, G.house.retinue), ` sworn soldier${G.house.retinue === 1 ? '' : 's'} volley each round`),
      h('span', {}, h('b', {}, G.house.potions), ' potions')));
};

UI.houseHeir = function () {
  const mc = ch(G.mcId), sp = spouseOf(mc);
  const st = this.successionState();
  const option = (icon, title, sub, fn, cls = '') => h('button', { class: 'hv-option ' + cls, onclick: fn },
    h('span', { class: 'hv-opt-icon', 'aria-hidden': 'true' }, icon), h('span', {}, h('b', {}, title), h('small', {}, sub)), h('span', { class: 'hv-chev', 'aria-hidden': 'true' }, '›'));
  const odds = sp ? birthOdds(mc, sp) : null;
  const named = st.ok ? st.heir : null;
  const blood = heirCandidates(G.mcId).filter((x) => x.why !== 'Adopted companion' && isDescendantOf(x.c, mc.id));
  return h('div', { class: 'hv-heir' },
    named
      ? h('button', { class: 'hv-heircard', onclick: this.fromHouse(() => this.showChar(named)) },
        h('span', { class: 'hv-crown', 'aria-hidden': 'true' }, '★'),
        portrait(named, 64),
        h('span', {},
          h('small', {}, 'Next in line'), h('b', {}, named.name),
          h('small', {}, `${named.adoptedBy && named.adoptedBy.length ? 'Adopted · ' : ''}${isAdult(named) ? classOf(named).name + ' · ' : ''}${ageStr(named)} yrs`),
          h('small', { class: 'good' }, isAdult(named) ? `Rules when ${mc.name} dies.` : `Comes of age in ${Math.ceil(GD.RACES[named.race].maturity - age(named))} years.`)))
      : h('div', { class: 'hv-alarm lvl-' + st.level },
        h('span', { class: 'hv-opt-icon', 'aria-hidden': 'true' }, st.level === 'end' ? '☠' : '⚠'),
        h('span', {}, h('b', {}, st.text), h('small', {}, st.sub))),
    h('h4', { class: 'hv-sub' }, named ? 'Strengthen the line' : 'How to secure the line'),
    sp
      ? option('♥', `Time with ${sp.name}`, odds.why || `${this.closeness(bond(sp, mc))} · ~${Math.round(odds.shown * 100)}% chance of a child this year`, this.fromHouse(() => this.showPartner()), 'love')
      : option('⚭', isWidowed(mc) ? 'Seek a new spouse' : 'Find a spouse', 'a marriage brings children, and a partner at your side', this.fromHouse(() => Game.seekNewSpouse()), 'love'),
    option('❦', 'Take in a ward', `a child of your court, or an orphan from a church${G.heirId ? '' : ' · named heir at once'}`, this.fromHouse(() => this.showTakeIn('ward'))),
    blood.length ? option('★', named ? 'Change heir' : 'Name an heir', `${blood.length} of your line can inherit`, this.fromHouse(() => this.showNameHeir())) : null,
    h('h4', { class: 'hv-sub' }, 'Line of succession'),
    st.cands.length
      ? h('ol', { class: 'hv-line' }, this.successionOrder(st.cands).slice(0, 3).map((x) => h('li', {}, portrait(x.c, 28), h('b', {}, x.c.name),
        h('small', {}, `${x.c.id === G.heirId ? '★ Named heir' : x.c.adoptedBy && x.c.adoptedBy.length ? 'Adopted' : x.why} · ${ageStr(x.c)}`))))
      : h('p', { class: 'bad hv-none' }, 'No one can inherit.'));
};

// the order the House would actually pass on in: the named heir first, then custom
UI.successionOrder = function (cands) {
  return cands.slice().sort((a, b) => (b.c.id === G.heirId) - (a.c.id === G.heirId));
};
UI.houseQuest = function () {
  const d = G.world.doom, q = d.quest, w = G.world, E = era();
  const span = GD.DOOM_YEARS, now = year() - START_YEAR;
  return h('div', { class: 'hv-quest' },
    q ? h('button', { class: 'hv-questcard', onclick: this.fromHouse(() => this.showWorld('prophecy')) },
      h('small', {}, 'Main quest'), h('b', {}, q.title), h('span', {}, q.desc),
      q.type === 'rally' ? h('small', {}, `${q.progress.length}/${q.count} towns rallied`) : null,
      q.x != null ? h('small', {}, `Marked on your map with a gold ◆${!reachable(tileAt(q.x, q.y)) ? ' · needs boats' : ''}`) : null)
      : h('div', { class: 'hv-questcard' }, h('small', {}, 'Main quest'), h('b', {}, 'No task yet'), h('span', {}, 'A new task appears as the years pass.')),
    h('div', { class: 'hv-doom' },
      h('div', { class: 'hv-doom-head' }, h('b', {}, GD.VILLAIN.name), h('small', { class: doomYearsLeft() < 100 ? 'bad' : '' }, `rises in ${d.year} · ${Math.max(0, doomYearsLeft())} years left`)),
      h('div', { class: 'doomline' }, h('div', { class: 'dl-fill', style: `width:${clamp(now / span * 100, 0, 100)}%` }),
        d.done.map((wd) => h('span', { class: 'dl-ward', style: `left:${(wd.year - START_YEAR) / span * 100}%` }))),
      h('div', { class: 'hv-wards' }, h('small', {}, 'Wards raised'),
        h('span', { class: 'hv-pips' }, Array.from({ length: GD.WARDS_NEEDED }, (_, i) => h('i', { class: i < d.wards ? 'on' : '' }))),
        h('small', {}, `${d.wards}/${GD.WARDS_NEEDED}`)),
      h('small', { class: 'dim' }, `Now around level ${villainLevel()}. Each ward takes 3 levels from it.`)),
    h('div', { class: 'hv-doom' },
      h('div', { class: 'hv-doom-head' }, h('b', { style: `color:${E.color}` }, E.name), h('small', {}, w.era.type === 'golden' ? 'a Golden Age' : `${Math.max(0, w.era.end - year())} years left`)),
      h('small', {}, `Prosperity ${Math.round(w.prosperity)} / 95 for a Golden Age`), bar(w.prosperity, 100, 'pros')),
    h('div', { class: 'hv-two' },
      option2('📖', 'The prophecy', this.fromHouse(() => this.showWorld('prophecy'))),
      option2('📜', 'Story so far', this.fromHouse(() => this.showChronicle()))));
  function option2(icon, label, fn) { return h('button', { class: 'hv-mini', onclick: fn }, h('span', { 'aria-hidden': 'true' }, icon), h('b', {}, label)); }
};

UI.houseMore = function () {
  const tile = (icon, label, hint, fn) => h('button', { class: 'dm-tile', onclick: this.fromHouse(fn) },
    h('span', { class: 'dm-icon', 'aria-hidden': 'true' }, icon), h('b', {}, label), h('small', {}, hint));
  return h('div', { class: 'dm-grid hv-more' },
    tile('🎒', 'Gear', 'weapons and armour', () => this.showInventory(ch(G.mcId))),
    tile('🛡', 'Ward or squire', 'take a young one in', () => this.showTakeIn('ward')),
    tile('🌳', 'Family tree', 'everyone, past and present', () => this.showTree()),
    tile('📜', 'Story so far', 'what has happened', () => this.showChronicle()),
    tile('🗺', 'World', 'towns, eras, the prophecy', () => this.showWorld()),
    tile('👪', 'Household list', 'everyone at once', () => this.showHousehold()),
    tile('🧭', 'Starter goals', G.guide && G.guide.hidden ? 'hidden · tap to see' : 'what to try next', () => Guide.show()),
    tile('⚙', 'Save & help', 'save, how to play', () => this.showMenu()));
};

// ---- Partner: the head and their spouse. A warm bond and time together make a child likelier.
UI.partnerBody = function () {
  const mc = ch(G.mcId), sp = spouseOf(mc);
  if (!sp) return h('p', { class: 'dim' }, `${mc.name} has no spouse.`);
  const odds = birthOdds(mc, sp);
  const b = Math.round(bond(sp, mc));
  const kids = mc.children.filter((k) => sp.children.includes(k)).map(ch).filter(Boolean);
  const redo = () => this.replaceModal(this.partnerBody(), { title: 'Your partner', sheet: true });
  const close = recentlyClose(mc, sp);
  return h('div', { class: 'pt' },
    h('div', { class: 'pt-couple' },
      h('div', { class: 'pt-person' }, portrait(mc, 72), h('b', {}, mc.name), h('small', {}, '♛ Head')),
      h('div', { class: 'pt-heart' + (b >= 60 ? ' warm' : b < 0 ? ' cold' : '') }, h('span', { 'aria-hidden': 'true' }, b < 0 ? '♡' : '♥'), h('b', {}, b), h('small', {}, this.closeness(b))),
      h('button', { class: 'pt-person', onclick: () => this.modal(this.charBody(sp), { title: sp.name, wide: true }) }, portrait(sp, 72), h('b', {}, sp.name), h('small', {}, `⚭ ${GD.RACES[sp.race].name} · ${ageStr(sp)}`))),
    h('div', { class: 'pt-bond' }, h('small', {}, 'Bond'), bar(Math.max(0, b), 100, 'xp'), h('small', {}, close ? 'close this year' : 'not much time together lately')),
    h('div', { class: 'pt-odds' },
      odds.why
        ? [h('b', {}, 'No children together'), h('small', {}, odds.why)]
        : [h('div', { class: 'pt-pct' }, h('b', {}, `~${Math.round(odds.shown * 100)}%`), h('small', {}, 'chance of a child this year')),
          h('ul', {}, odds.notes.map((n) => h('li', { class: n.v > 0 ? 'good' : n.v < 0 ? 'bad' : 'dim' }, (n.v > 0 ? '▲ ' : n.v < 0 ? '▼ ' : '• ') + n.t)))],
      kids.length ? h('small', { class: 'dim' }, `Children together: ${kids.map((k) => k.name + (k.alive ? '' : ' †')).join(', ')}`) : null),
    h('div', { class: 'pt-acts' },
      act('Spend a week together', () => { Game.interact(sp, 'time'); redo(); }, { cls: 'hl', sub: `7 days · bond up${odds.why ? '' : ' · a child likelier this year'}` }),
      act('Give a gift', () => { Game.interact(sp, 'gift'); redo(); }, { sub: '30 gold · bond up', disabled: G.house.gold < 30 }),
      b < 0 ? act('Heart-to-heart', () => { Game.interact(sp, 'talk'); redo(); }, { sub: '14 days · may heal old wounds, or open them' }) : null,
      odds.why ? act('Take in a ward', () => { this.closeAll(); this.showTakeIn('ward'); }, { sub: 'a child of your court, or an orphan from a church' }) : null));
};
UI.showPartner = function () {
  const mc = ch(G.mcId);
  if (!spouseOf(mc)) return Game.seekNewSpouse();
  this.modal(this.partnerBody(), { title: 'Your partner', sheet: true });
};

// ---- Name an heir from the head's line (children, grandchildren, adopted wards)
UI.showNameHeir = function () {
  const mc = ch(G.mcId);
  const list = heirCandidates(G.mcId).filter((x) => isDescendantOf(x.c, mc.id));
  this.modal([
    h('p', { class: 'takein-what' }, `When ${mc.name} dies, the heir becomes head of the House and you play as them. A child heir waits for the years to pass.`),
    ...list.map(({ c, why }) => h('div', { class: 'takein-card' + (c.id === G.heirId ? ' on' : '') },
      portrait(c, 56),
      h('div', { class: 'takein-info' },
        h('b', {}, c.name),
        h('small', {}, `${c.adoptedBy && c.adoptedBy.length ? 'Adopted' : why} · ${ageStr(c)} yrs${isAdult(c) ? ' · ' + classOf(c).name + ' L' + c.level : ''}`),
        h('small', {}, `${GD.RACES[c.race].name}${c.trait ? ' · ' + GD.TRAITS[c.trait].name : ''} · Power ${power(c)}`)),
      c.id === G.heirId ? h('span', { class: 'good takein-named' }, '★ Heir')
        : h('button', { class: 'takein-go', onclick: () => {
          G.heirId = c.id; chron(`${c.name} is named heir of House ${G.house.name}.`, 'good', [c.id], 'heir');
          saveGame(); this.closeAll(); this.toast(`${c.name} is now your heir.`); this.refresh();
        } }, 'Name', h('small', {}, 'as heir')))),
  ], { title: 'Name an heir', sheet: true });
};
UI.closeDrawer = function () { document.body.classList.remove('drawer-open'); document.body.classList.toggle('scene-open', this.inScene()); this.mob.drawer.setAttribute('aria-hidden', 'true'); };
UI.closeLog = function () { if (this.mob && this.mob.logPanel) this.mob.logPanel.open = false; };
UI.setLogTab = function (tab) {
  if (!this.mob) return;
  this.mob.logTab = tab === 'items' ? 'items' : 'actions';
  for (const btn of this.mob.logPanel.querySelectorAll('.hud-log-tab')) {
    btn.classList.toggle('on', btn.dataset.tab === this.mob.logTab);
  }
  this.renderExpandableLog();
};
UI.closeModalQuiet = function () {
  // Drop unlocked modals (Here sheet) without triggering a full refresh cascade.
  while (this.modalStack.length && !this.modalStack[this.modalStack.length - 1].locked) {
    const m = this.modalStack.pop();
    m.el.remove();
  }
};
UI.placeName = function () {
  if (!G || !G.world || !G.world.map) return '';
  const t = this.hereTile ? this.hereTile() : tileAt(G.pos.x, G.pos.y);
  return t.feature === 'town' ? G.world.towns[t.townIdx].name : t.feature === 'estate' ? 'Your estate' : t.feature === 'ruins' ? 'Ruins'
    : t.feature === 'spire' ? 'The Black Spire' : t.feature === 'shrine' ? 'Beacon Shrine' : t.feature === 'church' ? Church.nameFor(t)
    : (Events.label && Events.label(t)) || (isWater(t) ? 'At sea' : GD.BIOMES[t.type].name);
};
UI.placeLayout = function () {
  if (!this.mob) return;
  const topbar = $('#topbar'), party = $('#party'), panel = $('#panel'), game = $('#game'), stage = $('#stage');
  const body = $('#drawer-body');
  const mobile = this.isMobile();
  document.body.classList.toggle('mobile', mobile);
  document.body.classList.toggle('scene-open', this.inScene());
  document.body.classList.toggle('in-battle', mobile && Battle.active);
  // Battle HUD overlays the canvas; never reserve bottom space for the sheet.
  stage.style.bottom = '';
  if (mobile) {
    if (Render.ctl && Render.ctl.parentNode !== this.mob.camera) this.mob.camera.append(Render.ctl);
    if (Battle.active) {
      this.mob.camera.open = false;
      this.closeLog();
      if (panel.parentNode !== this.mob.sheet) this.mob.sheet.append(panel);
      this.closeDrawer();
    } else {
      // The phone House menu is its own simple page (renderDrawer). The desktop panels wait offstage;
      // place actions live behind the Here button.
      let stash = $('#mob-stash');
      if (!stash) { stash = h('div', { id: 'mob-stash' }); document.body.append(stash); }
      for (const el of [panel, party, topbar]) if (el.parentNode !== stash) stash.append(el);
      if (document.body.classList.contains('drawer-open')) this.renderDrawer();
    }
  } else {
    this.mob.camera.open = false;
    this.closeLog();
    if (Render.ctl && Render.ctl.parentNode !== stage) stage.append(Render.ctl);
    if (topbar.parentNode !== document.body || topbar.nextElementSibling !== game) document.body.insertBefore(topbar, game);
    if (party.parentNode !== game) game.insertBefore(party, stage);
    if (panel.parentNode !== game) game.append(panel);
    this.closeDrawer();
  }
  const goal = $('#guide-goal');
  if (goal) (mobile ? this.mob.goal : document.body).append(goal);
  this.updateChip();
};
UI.updateChip = function () {
  document.body.classList.toggle('has-game', !!(G && G.mcId));
  if (!this.mob || !G || !G.mcId || !G.world || !G.world.map) return;
  const place = this.placeName();
  const mc = ch(G.mcId);
  $('#hudchip').replaceChildren(
    h('span', { class: 'hud-house' }, `House ${G.house.name}`),
    h('b', { class: 'hud-place' }, place),
    h('span', { class: 'hud-date' }, `${seasonName()} ${year()} · `, h('b', { class: 'hud-gold' }, `${Math.round(G.house.gold)} gold`)),
    mc && h('span', { class: 'hud-health' },
      h('span', { class: 'hud-hero' }, mc.name),
      h('span', {}, `${Math.round(mc.hp)}/${maxHp(mc)} HP`),
      h('meter', { min: 0, max: maxHp(mc), value: mc.hp, 'aria-label': `${mc.name}'s health` })),
  );
};
// Compact location action sheet — clearer than digging through the full House menu.
UI.openHere = function () {
  if (!G || !G.mcId || Battle.active) return;
  this.closeDrawer();
  if (this.mob.camera) this.mob.camera.open = false;
  this.closeLog();
  this.closeModalQuiet();
  const place = this.placeName();
  const acts = this.locationActs();
  const body = h('div', { class: 'here-sheet' },
    h('p', { class: 'dim' }, 'Choose an action for this place.'),
    ...acts,
    act('Open House menu', () => { this.closeModalQuiet(); this.openDrawer(); }, { sub: 'party, chronicle, save, settings' }),
  );
  for (const button of body.querySelectorAll('button.act')) {
    if (/Open House menu/.test(button.getAttribute('aria-label') || button.textContent)) continue;
    button.addEventListener('click', () => this.closeModalQuiet(), { capture: true, once: true });
  }
  this.modal(body, {
    title: place || 'Here', sheet: true,
    onclose: () => { this.closeDrawer(); },
  });
};

// ---------------------------------------------------------------- modal
UI.modal = function (content, opts = {}) {
  const sheet = opts.sheet && this.isMobile();
  const body = h('div', { class: 'modal-body' }, content);
  const wrap = h('div', { class: 'modal-wrap' + (sheet ? ' sheet-wrap' : '') },
    h('div', { class: 'modal ' + (opts.wide ? 'wide' : '') },
      sheet ? h('div', { class: 'grip', 'aria-hidden': 'true' }) : null,
      opts.title ? h('h2', {}, opts.title) : null,
      !opts.locked ? h('button', { class: 'close', title: 'Close', onclick: () => this.closeModal() }, '×') : null,
      body,
      sheet && !opts.locked ? h('button', { class: 'sheet-close', onclick: () => this.closeModal() }, 'Close') : null));
  // any screen that asks for money shows how much the House has
  if (G && G.mcId && /\d\s?g\b|\bgold\b/.test(body.textContent)) wrap.firstChild.insertBefore(this.goldPill(), body);
  if (sheet && !opts.locked) {
    wrap.addEventListener('click', (e) => { if (e.target === wrap) this.closeModal(); });
    this.swipeToClose(wrap.firstChild, () => { if (this.modalStack.length && this.modalStack[this.modalStack.length - 1].el === wrap) this.closeModal(); });
  }
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

const NEWS_TITLE = {
  birth: 'Birth', death: 'Death', marriage: 'Marriage', year: 'Income', era: 'New era',
  head: 'Succession', rival: 'Rival', renounce: 'Renounced', age: 'Coming of age', injury: 'Injury',
};
UI.showNews = function (done) {
  this.closeDrawer();
  this.closeModalQuiet();
  const items = (G.newsQueue || []).splice(0);
  const expect = !!G.expectNews;
  G.expectNews = false;
  if (!items.length) { if (done) done(); return; }
  const important = items.filter((e) => e.kind !== 'year');
  // Travel year-crossings: toast income only; Rest/Train still get a full popup.
  if (!important.length && !expect) {
    const last = items[items.length - 1];
    const gained = items.reduce((s, e) => s + (e.income || 0), 0);
    this.toast(gained ? `Year ${last.year}: estate income +${gained}g.` : last.text);
    if (done) done();
    return;
  }
  // Prefer family moments over routine income when the list is long.
  const rank = (e) => ({ birth: 0, death: 1, marriage: 2, era: 3, rival: 4, renounce: 4, head: 5, age: 6, injury: 7, year: 8 }[e.kind] ?? 9);
  const sorted = items.slice().sort((a, b) => rank(a) - rank(b) || a.year - b.year);
  const shown = sorted.slice(0, 12);
  const incomes = items.filter((e) => e.kind === 'year');
  const incomeTotal = incomes.reduce((s, e) => s + (e.income || 0), 0);
  const title = items.some((e) => e.kind === 'birth') ? 'A child is born'
    : items.some((e) => e.kind === 'death') ? 'A death in the House'
    : items.some((e) => e.kind === 'marriage') ? 'A marriage'
    : items.some((e) => e.kind === 'era') ? 'A new era'
    : incomes.length ? 'The year turns' : 'House news';
  const body = h('div', { class: 'news-popup' },
    incomes.length
      ? h('p', { class: 'news-summary' }, `Estate gathered ${incomeTotal}g across ${incomes.length} year${incomes.length === 1 ? '' : 's'}.`)
      : h('p', { class: 'dim' }, 'While time passed at the House…'),
    h('div', { class: 'news-list' }, shown.map((e) => {
      const who = (e.ids || []).map(ch).filter(Boolean)[0];
      return h('div', { class: 'news-row k-' + (e.kind || 'info') },
        who ? portrait(who, 40) : h('span', { class: 'news-icon' }, KIND_ICON[e.kind] || '•'),
        h('div', { class: 'news-body' },
          h('b', {}, NEWS_TITLE[e.kind] || 'News'),
          h('small', { class: 'dim' }, `Year ${e.year}`),
          h('p', {}, e.text)));
    })),
    items.length > shown.length ? h('p', { class: 'dim small' }, `+${items.length - shown.length} more in the Chronicle`) : null,
    act('Continue', () => {
      this.closeModal();
      if (done) done();
      else this.refresh();
    }, { cls: 'hl', sub: 'return to the map' }),
  );
  this.modal(body, { title, locked: true });
};

// ---------------------------------------------------------------- HUD
UI.refresh = function () {
  if (!G || !G.mcId) return;
  this.placeLayout();
  this.renderTop();
  this.renderParty();
  if (!Battle.active) this.renderPanel();
  this.renderLog();
  Guide.render();
  this.syncGold();
};

UI.renderTop = function () {
  const hs = G.house, w = G.world, E = era();
  const yearsLeft = Math.max(0, w.era.end - year());
  $('#topbar').replaceChildren(
    Heraldry.canvas(hs.heraldry, 54),
    h('div', { class: 'house' }, h('b', {}, `House ${hs.name}`), h('small', {}, `Generation ${hs.generation} · ${GD.ESTATE[hs.tier].name}`)),
    h('div', { class: 'tb' }, h('small', {}, 'Year'), h('b', {}, `${seasonName()} ${year()}`)),
    h('div', { class: 'tb' }, h('small', {}, 'Era'), h('b', { style: `color:${E.color}` }, E.name), h('small', {}, w.era.type === 'golden' ? 'Victory!' : `${yearsLeft} yr left`)),
    h('div', { class: 'tb grow' }, h('small', {}, `Prosperity ${Math.round(w.prosperity)} / 95`), bar(w.prosperity, 100, 'pros')),
    h('div', { class: 'tb doom', title: `${GD.VILLAIN.name} will end the world in ${w.doom.year}` }, h('small', {}, 'Doom'), h('b', { class: doomYearsLeft() < 100 ? 'bad' : '' }, `${Math.max(0, doomYearsLeft())} yrs`), h('small', {}, `Wards ${w.doom.wards}/${GD.WARDS_NEEDED}`)),
    h('div', { class: 'tb' }, h('small', {}, 'Reputation'), h('b', { style: `color:${reputationInfo().color}` }, reputationInfo().name)),
    h('div', { class: 'tb' }, h('small', {}, 'Prestige'), h('b', {}, Math.round(hs.prestige))),
    h('div', { class: 'tb' }, h('small', {}, 'Gold'), h('b', { class: 'gold' }, Math.round(hs.gold))),
    h('div', { class: 'tb' }, h('small', {}, 'Potions'), h('b', {}, hs.potions)),
    h('div', { class: 'tb-tools' },
      h('button', { class: 'small', onclick: () => this.showTree() }, 'Family Tree'),
      h('button', { class: 'small', onclick: () => this.showChronicle() }, 'Chronicle'),
      h('button', { class: 'small', onclick: () => this.showWorld() }, 'World'),
      h('button', { class: 'small', onclick: () => this.showMenu() }, 'Save & Help'),
    ),
  );
};

UI.charLine = function (c) {
  const st = GD.STAGES[stageKey(c)].name;
  const cl = isAdult(c) ? classNames(c).replace(/ · /g, '/') : null;
  return `${GD.GENDERS[c.gender || 'man'].sym} ${GD.RACES[c.race].name}${cl ? ' ' + cl : ''} · ${ageStr(c)} yrs · ${st}`;
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
  el.replaceChildren(...this.logEntries());
  el.scrollTop = el.scrollHeight;
  if (this.mob && this.mob.logPanel && this.mob.logPanel.open) this.renderExpandableLog();
};

UI.logEntries = function () {
  if (!G || !G.log) return [];
  return G.log.slice(-40).map((e) => h('div', { class: 'le ' + e.kind }, h('span', { class: 'ly' }, e.year), ' ', e.text));
};

UI.renderExpandableLog = function () {
  if (!this.mob || !this.mob.logBody || !G) return;
  const body = this.mob.logBody;
  const setKids = (...kids) => body.replaceChildren(...kids.flat(2).filter(Boolean));
  if (this.mob.logTab === 'items') {
    const mc = ch(G.mcId);
    const worn = mc && mc.equip ? Object.entries(mc.equip).filter(([, it]) => it).map(([slot, it]) =>
      h('div', { class: 'hud-item-row' },
        h('span', { class: 'hud-item-slot' }, Equip.slotLabel(mc, slot)),
        h('span', { class: 'hud-item-name' }, it.name),
        h('small', { class: 'dim' }, Equip.itemDesc(it)))) : [];
    const stash = (G.house.stash || []).slice(0, 12).map((it) =>
      h('div', { class: 'hud-item-row' },
        h('span', { class: 'hud-item-name' }, it.name),
        h('small', { class: 'dim' }, Equip.itemDesc(it))));
    setKids(
      h('div', { class: 'hud-item-summary' },
        h('span', {}, `${Math.round(G.house.gold)}g`),
        h('span', {}, `Potions ${G.house.potions}`),
        h('span', {}, `Stash ${(G.house.stash || []).length}`)),
      worn.length && h('h4', { class: 'hud-log-sec' }, mc.name + ' · worn'),
      worn,
      stash.length
        ? h('h4', { class: 'hud-log-sec' }, 'House stash')
        : h('p', { class: 'dim' }, worn.length ? 'Stash is empty.' : 'No gear yet — visit a market.'),
      stash,
      (G.house.stash || []).length > stash.length
        && h('p', { class: 'dim small' }, `+${G.house.stash.length - stash.length} more in inventory`),
      mc && act('Open inventory', () => { this.closeLog(); this.showInventory(mc); }, { sub: 'try on / equip' }),
    );
    return;
  }
  const entries = this.logEntries().reverse();
  setKids(h('div', { class: 'hud-log-feed' }, entries.length ? entries : h('p', { class: 'dim' }, 'No activity yet.')));
  const feed = body.querySelector('.hud-log-feed');
  if (feed) feed.scrollTop = 0;
};

// ---------------------------------------------------------------- side panel by location
UI.hereTile = function () {
  const standing = tileAt(G.pos.x, G.pos.y);
  const near = typeof LocationPrompt !== 'undefined' ? LocationPrompt.nearby(1.9) : null;
  if (near && (!standing.feature || standing === near || Math.hypot((G.ppos || G.pos).x - near.x, (G.ppos || G.pos).y - near.y) <= 1.2)) return near;
  return standing;
};
UI.locationActs = function () {
  const t = this.hereTile();
  const body = [];
  if (Living.moving) {
    body.push(
      h('h3', {}, 'On the road'),
      h('p', { class: 'dim' }, 'Time advances while you walk. Escape or Stop cancels the march; click near your party to halt.'),
      act('Stop travelling', () => Living.cancel('You halt on the road.'), { sub: 'cancel this journey · stay where you are', cls: 'hl' }),
    );
  } else if (t.feature === 'estate') body.push(...this.estatePanel());
  else if (t.feature === 'town') body.push(...this.townPanel(t));
  else if (t.feature === 'ruins') body.push(...this.ruinsPanel(t));
  else if (t.feature === 'spire') body.push(...this.spirePanel());
  else if (t.feature === 'church') body.push(...this.churchPanel(t));
  else if (Events.panel(t)) body.push(...Events.panel(t));
  else if (t.feature === 'shrine') body.push(h('h3', {}, 'Beacon Shrine'), h('p', { class: 'dim' }, t.lit ? 'The beacon burns again, a ward against the dark.' : 'A cold beacon from an older age.'));
  else body.push(h('h3', {}, isWater(t) ? 'At Sea' : GD.BIOMES[t.type].name), h('p', { class: 'dim' }, isWater(t) ? 'Your boat rides the waves.' : 'Click land or roads to travel. A gold path previews your route; red means no way through. Time passes only while you move.'));
  if (!Living.moving && !isWater(t) && t.feature !== 'town' && t.feature !== 'estate') body.push(act('Make camp', () => Campfire.start(), { sub: 'sit by the fire with your party · rest the night', cls: 'hl' }));
  body.push(this.questBox());
  return body.filter(Boolean);
};
UI.renderPanel = function () {
  const p = $('#panel');
  const body = this.locationActs();
  body.push(h('div', { class: 'hint' }, this.isMobile()
    ? `Tap land or roads to travel${hasTech('flight') ? ' (or fly far)' : ''}. Gold path = route. Stop / Esc cancels. Use Here for place actions.`
    : `Click land or roads to travel${hasTech('flight') ? ' (or fly far)' : ''}. Hover for the path · Esc stops · Wheel zooms · Q/E rotates.`));
  p.replaceChildren(...body);
};

function act(label, fn, opts = {}) {
  return h('button', {
    class: 'act' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled, title: opts.title,
    'aria-label': opts.sub ? `${label}. ${opts.sub}` : undefined, onclick: fn,
  }, label, opts.sub ? h('small', {}, opts.sub) : null);
}

UI.estatePanel = function () {
  const hs = G.house;
  const mc = ch(G.mcId);
  const freeToMarry = canTakeSpouse(mc);
  const widowed = isWidowed(mc);
  const income = Math.round(GD.ESTATE[hs.tier].income * era().income + hs.up.livestock * 40);
  return [
    h('h3', {}, `${GD.ESTATE[hs.tier].name} of House ${hs.name}`),
    h('p', { class: 'dim' }, `Income ${income}g a year. Household ${householdCount()}/${GD.ESTATE[hs.tier].household}. Retinue ${hs.retinue}.`),
    h('div', { class: 'act-group' },
      h('p', { class: 'act-group-label' }, 'Pass time'),
      act('Rest a season', () => Game.rest(90), { sub: '90 days · heal everyone', cls: 'hl' }),
      act('Train a season', () => Game.train(), { sub: '90 days · XP for the party', cls: 'hl' }),
      act('Let a year pass', () => Game.rest(360), { sub: '360 days · watch your family grow' }),
    ),
    h('div', { class: 'act-group' },
      h('p', { class: 'act-group-label' }, 'House'),
      act('Improve the Estate', () => this.showEstate(), { sub: 'tiers, upgrades, retinue' }),
      act('Household & Heir', () => this.showHousehold(), { sub: 'party, children, succession' }),
      act('Armory & Inventory', () => this.showInventory(ch(G.mcId)), { sub: 'try on armour, robes, helms, weapons' }),
      freeToMarry ? act(widowed ? 'Seek a new spouse' : 'Arranged Match', () => Game.seekNewSpouse(), { sub: widowed ? 'court again, or arrange a remarriage' : 'choose 1 of 3 partners', cls: 'hl' }) : null,
      act('Take in a ward or squire', () => this.showTakeIn('ward'), { sub: 'a child to raise, or a young fighter to train' }),
      act('Family Tree', () => this.showTree()),
    ),
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
    h('div', { class: 'act-group' },
      h('p', { class: 'act-group-label' }, 'Quick tasks'),
      act('Tavern', () => this.showTavern(t.townIdx), { sub: 'recruit, court, lineage' }),
      act('Market', () => this.showMarket(), { sub: 'gear & potions' }),
      act('Rest at the Inn', () => Game.inn(), { sub: '10g · 7 days · heal', disabled: G.house.gold < 10 }),
    ),
    h('div', { class: 'act-group' },
      h('p', { class: 'act-group-label' }, deedDone ? 'Deeds (done this year)' : 'Deeds for the Realm'),
      ...deeds,
    ),
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
  const foes = Battle.units.filter((x) => x.side === 'enemy' && x.alive);
  if (foes.length) {
    kids.push(h('div', { class: 'tags lore-tags' }, foes.map((f) =>
      h('span', {
        class: 'tag' + (f.type && EnemyLore.get(f.type) > 0 ? ' good' : ''),
        title: f.type ? EnemyLore.summary(f.type) : f.name,
        onclick: (e) => { e.stopPropagation(); this.showEnemy(f); },
      }, f.type ? EnemyLore.shortTag(f.type) : f.name))));
  }
  if ((Battle.traps || []).some((t) => t.side === 'party')) {
    kids.push(h('p', { class: 'dim small' }, 'A snare is armed — it springs at the start of the next round.'));
  }
  if (Battle.waiting && u && u.side === 'party') {
    const cl = GD.CLASSES[u.cls];
    const st = Object.keys(u.st || {}).filter((k) => Battle.st(u, k)).map((k) => ({ atkUp: 'inspired', bloodlust: 'bloodlust', guard: 'guarded', defDown: 'exposed', slow: 'slowed', poison: 'venom', mark: 'marked', shield: `shield ${u.st.shield && u.st.shield.v}`, riposte: 'riposte' }[k])).filter(Boolean);
    const focusMax = Battle.maxFocus(u);
    kids.push(h('p', {}, h('b', {}, `${u.name}'s turn`), h('br'), h('small', { class: 'dim' }, `${cl ? cl.icon + ' ' + cl.name + ' · ' : ''}Focus ${u.focus}/${focusMax}${st.length ? ' · ' + st.join(', ') : ''}`)));
    if (this.targeting) {
      const targetingLabel = this.targeting === 'skill'
        ? GD.ABILITIES[this.targetSkill].name
        : (this.targeting === 'attack' && u.cls === 'noble' ? 'Strategize' : this.targeting);
      kids.push(h('p', { class: 'dim' }, `Choose a target for ${targetingLabel}: tap the field or below.`));
      const targets = Battle.units.filter((x) => this.validTarget(x));
      kids.push(...targets.map((x) => act(`${x.name} (${x.hp}/${x.maxHp})`, () => this.chooseTarget(x))));
      kids.push(act('Back', () => { this.targeting = null; this.battleChanged(); }));
    } else {
      const attackLabel = u.cls === 'sorcerer' ? 'Arcane Bolt' : u.cls === 'warlock' ? 'Pact Bolt' : u.cls === 'noble' ? 'Strategize' : 'Attack';
      const attackSub = u.cls === 'sorcerer' ? 'magic that slips past armour'
        : u.cls === 'warlock' ? 'a strong pact-bolt'
        : u.cls === 'noble' ? 'command an ally to strike' : null;
      kids.push(act(attackLabel, () => this.beginTarget('attack'), { sub: attackSub }));
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
  // Keep the battle canvas full-bleed on phones; the move HUD overlays it.
  if (this.isMobile() && this.mob) $('#stage').style.bottom = '';
};
UI.beginTarget = function (kind) {
  this.targeting = kind;
  // One valid target: skip the confirm/pick step and act immediately.
  const targets = Battle.units.filter((x) => this.validTarget(x));
  if (targets.length === 1) {
    this.chooseTarget(targets[0]);
    return;
  }
  this.battleChanged();
};
UI.validTarget = function (x) {
  const u = Battle.cur;
  if (!u || !x.alive || !this.targeting) return false;
  // Noble Strategize commands another living ally
  if (this.targeting === 'attack' && u.cls === 'noble') return x.side === u.side && x !== u;
  const friendly = this.targeting === 'potion' || (this.targeting === 'skill' && GD.ABILITIES[this.targetSkill] && GD.ABILITIES[this.targetSkill].target === 'ally');
  if (friendly) return x.side === u.side && !(this.targeting === 'skill' && this.targetSkill === 'synchronize' && x === u);
  return x.side !== u.side;
};
UI.chooseTarget = function (x) {
  const kind = this.targeting;
  this.targeting = null;
  Battle.act(kind, x.uid, kind === 'skill' ? this.targetSkill : undefined);
};
UI.clickUnit = function (u) {
  if (this.targeting && this.validTarget(u)) this.chooseTarget(u);
  else if (u.side === 'enemy') this.showEnemy(u);
  else if (u.charId && !Battle.waiting) { /* ignore */ }
};

UI.showEnemy = function (u) {
  const d = u.type && GD.ENEMIES[u.type];
  const rows = [
    h('p', {}, h('b', {}, u.name), ` · Level ${u.lvl}${u.boss ? ' · Boss' : ''}`),
    h('p', { class: 'dim' }, `HP ${Math.round(u.hp)}/${u.maxHp}${d ? ` · ${d.shape}` : ''}`),
    u.type ? h('p', { class: u.type && EnemyLore.get(u.type) > 0 ? 'good' : 'dim' }, EnemyLore.summary(u.type))
      : h('p', { class: 'dim' }, 'A named foe — no bestiary entry.'),
  ];
  if (u.type && EnemyLore.get(u.type) > 0) {
    rows.push(h('p', { class: 'dim' }, `House lore ${EnemyLore.get(u.type)}/${EnemyLore.CAP}. Fight, strike and defeat this kind to learn more.`));
  } else if (u.type) {
    rows.push(h('p', { class: 'dim' }, 'Strike and defeat this foe to learn its weaknesses.'));
  }
  const st = Object.keys(u.st || {}).filter((k) => Battle.st(u, k));
  if (st.length) rows.push(h('p', { class: 'dim' }, 'Status: ' + st.join(', ')));
  this.modal(rows, { title: u.name });
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
  this.charTab = Battle.active ? 'battle' : 'about';
  this.modal(this.charBody(c), { title: c.name, wide: true });
};

// The character sheet: a fixed header (portrait, banner, who they are to the House) and tabs, so
// nothing needs scrolling. All tabs stay in the page; only one shows at a time.
UI.charBody = function (c) {
  Heraldry.ensureAll();
  const mc = ch(G.mcId);
  const bk = birthKey(c);
  const sp = ch(c.spouse);
  const parents = c.parents.map(ch).filter(Boolean);
  const kids = c.children.map(ch).filter(Boolean);
  const link = (p) => h('a', { href: '#', onclick: (e) => { e.preventDefault(); this.replaceModal(this.charBody(p), { title: p.name, wide: true }); } }, p.name + (p.alive ? '' : ' †'));
  const r = GD.RACES[c.race];
  const lifeLeft = c.alive ? `${Math.max(0, Math.round(r.elder - age(c)))} yrs until elder` : `Died ${year(c.died)}: ${c.cause}`;
  const statRows = STATS.map((k) => h('tr', {}, h('td', {}, STAT_NAMES[k]), h('td', {}, stat(c, k).toFixed(1)),
    h('td', { class: 'dim' }, ageMod(c, k) !== 1 ? `age ×${ageMod(c, k).toFixed(2)}` : ''), h('td', { class: 'dim' }, c.bonus[k] ? `+${c.bonus[k].toFixed(1)} flat` : ''),
    h('td', { class: 'bad' }, (c.injuries || []).reduce((t, i) => t + (GD.INJURIES[i].mods[k] || 0), 0) < 0 ? `${(c.injuries || []).reduce((t, i) => t + (GD.INJURIES[i].mods[k] || 0), 0)} injury` : '')));
  const role = c.alive && (c.house === G.house.name || c.status === 'party' || c.status === 'household') ? this.roleOf(c) : null;
  const tags = [
    role ? h('span', { class: `tag role r-${role.k}` }, `${role.icon} ${role.label}`) : null,
    G.party.includes(c.id) ? h('span', { class: 'tag role r-guard' }, '⚔ Guard') : null,
    c.id === G.heirId && role && role.k !== 'heir' ? h('span', { class: 'tag good' }, '★ Heir') : null,
    h('span', { class: 'tag' }, GD.BIRTH[bk].name),
    c.birth === 'bastard' && c.legit ? h('span', { class: 'tag good' }, 'Legitimised') : null,
    c.trait ? h('span', { class: 'tag', title: GD.TRAITS[c.trait].desc }, GD.TRAITS[c.trait].name) : null,
    c.house ? h('span', { class: 'tag house', style: `border-color:${G.house.color}` }, `House ${c.house}`) : null,
    c.evil ? h('span', { class: 'tag bad' }, 'Rival') : null,
    !c.alive ? h('span', { class: 'tag dim' }, 'Deceased') : null,
  ];
  let lineage;
  if (parents.length) lineage = h('p', {}, 'Child of ', parents.map((p, i) => [i ? ' & ' : '', link(p)]));
  else if (c.lineageKnown) lineage = h('p', { class: 'dim' }, c.secret ? `Lineage: ${GD.SECRETS[c.secret].name}.` : 'Of common, unrecorded stock.');
  else lineage = h('p', { class: 'dim' }, 'Lineage unknown. Research it at a tavern.');
  const adoptive = (c.adoptedBy || []).map(ch).filter(Boolean);
  if (adoptive.length) lineage = h('div', {}, lineage, h('p', {}, 'Adopted by ', adoptive.map((p, i) => [i ? ' & ' : '', link(p)])));
  const grand = bloodline(c).filter((x) => x.depth === 2).map((x) => x.c);
  const actions = this.charActions(c).filter(Boolean);
  const kin = mc && c.id !== mc.id ? kinship(mc, c) : null;

  const about = h('div', { class: 'cs-about' },
    h('p', { class: 'dim' }, `${GD.GENDERS[c.gender || 'man'].name} · ${bodyText(c)}`),
    h('p', { class: 'dim' }, `Drawn to: ${orientationText(c)}`),
    kin && kin.rel ? h('p', { class: 'dim' }, `${mc.name}'s ${kin.rel}`) : null,
    c.inbred > 0.05 ? h('p', { class: 'bad' }, `Born of close kin (blood ${Math.round(c.inbred * 100)}% shared).`) : null,
    c.condition ? h('p', { class: 'bad', title: GD.CONDITIONS[c.condition].desc }, `Born ${GD.CONDITIONS[c.condition].name.toLowerCase()}: ${GD.CONDITIONS[c.condition].desc}`) : null,
    c.infertileKnown ? h('p', { class: 'bad' }, 'Cannot have children.') : null,
    c.adoptedBy && c.adoptedBy.length ? h('p', { class: 'good' }, 'Adopted into the House.') : null,
    c.forcedBy ? h('p', { class: 'bad' }, `Forced into marriage by ${ch(c.forcedBy) ? ch(c.forcedBy).name : 'the House'}. Resentful.`) : null,
    h('p', { class: 'dim' }, `Born ${year(c.born)} · lifespan ~${Math.round((r.life[0] + r.life[1]) / 2)} · ${lifeLeft}`),
    c.alive ? h('p', { class: 'dim' }, `Formative ${Math.round(c.formative)}/${formativeCap(c)} · XP ×${xpMod(c).toFixed(2)}`) : null,
    h('table', { class: 'stats' }, statRows));

  const skills = h('div', { class: 'cs-class' },
    h('p', {}, h('b', {}, `Level ${c.level}`), ` · Power ${power(c)}`),
    c.alive ? h('div', {}, bar(c.xp, xpNeed(c.level), 'xp'), h('small', { class: 'dim' }, `XP ${Math.round(c.xp)}/${xpNeed(c.level)}`)) : null,
    h('div', { class: 'classbox' },
      h('b', {}, `${classOf(c).icon} ${classOf(c).name}`), h('small', { class: 'dim' }, ` ${classOf(c).desc}`),
      h('small', { class: 'good' }, classOf(c).passive),
      h('ul', { class: 'abil' }, classOf(c).skills.map((id, i) => h('li', { class: i === 2 && c.level < 5 ? 'dim' : '' }, h('b', {}, GD.ABILITIES[id].name), ` (${GD.ABILITIES[id].cost} focus${i === 2 && c.level < 5 ? ', unlocks at level 5' : ''}): ${GD.ABILITIES[id].desc}`)),
        c.extraSkill && GD.LEGACY_SKILL[c.extraSkill] && !classOf(c).skills.includes(GD.LEGACY_SKILL[c.extraSkill]) ? h('li', {}, h('b', {}, GD.ABILITIES[GD.LEGACY_SKILL[c.extraSkill]].name), ` (learned): ${GD.ABILITIES[GD.LEGACY_SKILL[c.extraSkill]].desc}`) : null)),
    isAdult(c) ? this.learnedBox(c) : null,
    c.training || (c.alive && c.house === G.house.name) || c.squireOf ? this.trainingBox(c) : null,
    (c.injuries || []).length ? h('div', { class: 'tags' }, c.injuries.map((k) => h('span', { class: 'tag ' + (GD.INJURIES[k].good ? 'good' : 'bad'), title: Object.entries(GD.INJURIES[k].mods).map(([s2, v]) => `${STAT_NAMES[s2]} ${v > 0 ? '+' : ''}${v}`).join(', ') }, GD.INJURIES[k].name))) : null,
    (() => {
      Equip.ensureChar(c);
      const worn = Equip.worn(c);
      const bits = worn.length ? worn.map((it) => it.name).join(' · ') : 'nothing equipped';
      const heir = G.mcId === c.id && G.house.heirloom ? ` · ${G.house.heirloom.name} (+${G.house.heirloom.power})` : '';
      return h('p', { class: 'dim' }, `Max HP ${maxHp(c)} · ${bits}${heir}`);
    })());

  const family = h('div', { class: 'cs-family' },
    lineage,
    grand.length ? h('p', { class: 'dim' }, 'Grandparents: ', grand.map((g, i) => [i ? ', ' : '', link(g)])) : null,
    (() => {
      const late = lateSpouseOf(c);
      if (spouseOf(c) && sp) return h('p', {}, 'Spouse: ', link(sp), mc && c.id === mc.id ? [' · ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); this.showPartner(); } }, 'time together ›')] : null);
      if (late) return h('p', {}, 'Widowed · late spouse: ', link(late));
      return h('p', { class: 'dim' }, 'Unmarried');
    })(),
    kids.length ? h('p', {}, 'Children: ', kids.map((k, i) => [i ? ', ' : '', link(k), k.alive ? ` (${ageStr(k)})` : ''])) : null,
    mc && c.id !== mc.id && c.alive ? h('p', { class: bond(c, mc) < -40 ? 'bad' : 'dim' }, `Bond with ${mc.name}: ${Math.round(bond(c, mc))} (${this.closeness(bond(c, mc)).toLowerCase()})${bond(c, mc) < -40 ? ', resents you' : ''} · Loyalty to the House: ${Math.round(c.loyalty)}`) : null,
    mc && c.id !== mc.id && c.alive && isAdult(c) && c.orientKnown && !spouseOf(c) && !isDescendantOf(c, mc.id) ? h('p', { class: 'dim' }, attraction(c, mc) === 0 ? `Not drawn to ${mc.name}.` : attraction(c, mc) > 1.15 ? `Strongly drawn to ${mc.name}.` : `Could be drawn to ${mc.name}.`) : null,
    c.alive && !c.house && isAdult(c) ? h('p', { class: c.corruption > 60 ? 'bad' : 'dim' }, `Resentment: ${c.corruption > 70 ? 'dangerous' : c.corruption > 40 ? 'simmering' : 'low'}`) : null);

  const story = this.lifeEvents(c);
  if (story) story.open = true;
  const tabs = this.tabSet([
    Battle.active ? { k: 'battle', label: 'Battle', body: h('div', { class: 'cs-acts' }, actions) } : null,
    { k: 'about', label: 'About', body: about },
    { k: 'class', label: 'Class', body: skills },
    { k: 'family', label: 'Family', body: family },
    !Battle.active && actions.length ? { k: 'acts', label: 'Actions', badge: actions.filter((n) => n.tagName === 'BUTTON').length || null, body: h('div', { class: 'cs-acts' }, actions) } : null,
    story ? { k: 'story', label: 'Story', body: story } : null,
  ], this.charTab || 'about', { cls: 'cs-tabs', onChange: (k) => { this.charTab = k; } });

  return h('div', { class: 'sheet cs' },
    h('div', { class: 'cs-head' },
      h('div', { class: 'cs-portrait' + (role ? ' r-' + role.k : '') }, portrait(c, 92),
        c.house && G.heraldry[c.house] ? h('span', { class: 'cs-flag' }, Heraldry.canvas(G.heraldry[c.house], 34)) : null,
        role && role.k === 'head' ? h('span', { class: 'cs-crown', 'aria-hidden': 'true' }, '♛') : null),
      h('div', { class: 'cs-id' },
        h('div', { class: 'tags' }, tags),
        h('p', {}, this.charLine(c)),
        c.alive ? h('div', { class: 'cs-hp' }, bar(c.hp, maxHp(c), 'hp'), h('small', { class: 'dim' }, `HP ${Math.round(c.hp)}/${maxHp(c)} · L${c.level}`)) : null)),
    tabs.nav, tabs.panes);
};

// Mid-battle party popup: combat info only — no estate social / equipment / courtship actions.
UI.battleCharActions = function (c) {
  const out = [];
  const u = Battle.units.find((x) => x.charId === c.id);
  if (u) {
    const st = Object.keys(u.st || {}).filter((k) => Battle.st(u, k)).map((k) => ({
      atkUp: 'inspired', bloodlust: 'bloodlust', guard: 'guarded', defDown: 'exposed',
      slow: 'slowed', poison: 'venom', mark: 'marked', shield: 'shielded', riposte: 'riposte',
    }[k] || k));
    out.push(h('p', { class: 'dim' }, `In battle · ATK ${Math.round(u.atk)} · DEF ${Math.round(u.def)} · MAG ${Math.round(u.mag)} · Focus ${u.focus}/${Battle.maxFocus(u)}`));
    out.push(h('p', { class: 'dim' }, `HP ${Math.round(u.hp)}/${u.maxHp}${u.defending ? ' · guarding' : ''}${st.length ? ' · ' + st.join(', ') : ''}`));
    out.push(h('p', { class: 'dim' }, `Bonuses · +${Equip.bonus(c, 'atk')} atk · +${Equip.bonus(c, 'def')} def · +${Equip.bonus(c, 'mag')} mag`));
    if (u.alive && Battle.waiting && Battle.cur === u) {
      out.push(act(`Use Potion (${G.house.potions})`, () => {
        this.closeModal();
        Battle.act('potion', u.uid);
      }, { sub: 'restore ~45% HP', disabled: G.house.potions <= 0 }));
    }
  } else {
    out.push(h('p', { class: 'dim' }, 'Not fighting in this battle.'));
  }
  const foes = Battle.units.filter((x) => x.side === 'enemy');
  const types = [...new Set(foes.map((e) => e.type).filter(Boolean))];
  if (types.length) {
    out.push(h('h4', {}, 'Enemy knowledge'));
    for (const type of types) {
      out.push(h('p', { class: EnemyLore.get(type) > 0 ? 'good' : 'dim' }, EnemyLore.summary(type)));
    }
  }
  return out;
};

UI.charActions = function (c) {
  if (Battle.active) return this.battleCharActions(c);
  const mc = ch(G.mcId);
  const out = [];
  const close = c && (c.house === G.house.name || c.status === 'party' || c.status === 'household');
  if (c && c.alive && close) {
    out.push(act('Equipment', () => { this.closeModal(); this.showEquipment(c); }, { sub: 'wear armour, robes, helms, crowns, weapons…' }));
    out.push(act('Inventory & Try On', () => { this.closeModal(); this.showInventory(c); }, { sub: 'house stash · try gear on this character' }));
  }
  if (!c.alive || !mc || c.id === mc.id) {
    if (c.id === mc?.id && canTakeSpouse(mc)) {
      const atEst = tileAt(G.pos.x, G.pos.y).feature === 'estate';
      const inTn = tileAt(G.pos.x, G.pos.y).feature === 'town';
      if (atEst || inTn || isWidowed(mc)) {
        out.push(act(isWidowed(mc) ? 'Seek a new spouse' : 'Arranged Match', () => {
          this.closeModal();
          Game.seekNewSpouse(inTn ? { townIdx: tileAt(G.pos.x, G.pos.y).townIdx } : {});
        }, { sub: isWidowed(mc) ? 'court again or arrange a remarriage' : 'choose 1 of 3 partners' }));
      }
    }
    return out;
  }
  const inTown = tileAt(G.pos.x, G.pos.y).feature === 'town';
  const atEstate = tileAt(G.pos.x, G.pos.y).feature === 'estate';
  if (c.status === 'npc' && isAdult(c) && inTown) {
    const cost = hireCost(c), req = recruitPrestigeReq(c);
    out.push(act('Recruit', () => { Game.recruit(c); this.closeModal(); }, { sub: `${cost}g${req ? ` · needs ${req} prestige` : ''}`, disabled: G.house.gold < cost || G.house.prestige < req }));
  }
  const canRomance = isAdult(c) && canTakeSpouse(mc) && canTakeSpouse(c) && c.status !== 'rival';
  if (canRomance && (inTown || c.status !== 'npc')) {
    out.push(act('Court', () => { Game.court(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '20g · 10 days', disabled: G.house.gold < 20 }));
    if (bond(c, mc) >= 70) out.push(act(isWidowed(mc) ? 'Propose Remarriage' : 'Propose Marriage', () => { Game.propose(c); this.closeModal(); }, { cls: 'hl' }));
  }
  if (!c.lineageKnown && inTown) {
    const cost = Math.max(10, 40 - G.house.up.library * 10);
    out.push(act('Research Lineage', () => { Game.research(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: `${cost}g`, disabled: G.house.gold < cost }));
  }
  // relationships with kin and companions
  if (close && c.status !== 'rival') {
    out.push(act('Spend time together', () => { Game.interact(c, 'time'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '7 days · bond' }));
    out.push(act('Give a gift', () => { Game.interact(c, 'gift'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '30g · bond', disabled: G.house.gold < 30 }));
    if (bond(c, mc) < 0) out.push(act('Heart-to-heart', () => { Game.interact(c, 'talk'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '14 days · may heal old wounds, or open them' }));
    if (c.forcedBy === mc.id && !c.apologised) out.push(act('Ask forgiveness', () => { Game.interact(c, 'apology'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '5 prestige · once' }));
  }
  if (c.house === G.house.name && isAdult(c) && canTakeSpouse(c) && c.id !== mc.id && atEstate) {
    out.push(act(isWidowed(c) ? 'Arrange a remarriage' : 'Arrange a marriage', () => { this.closeAll(); Game.matchmaker(c); }, { sub: `match ${c.name} with a suitor` }));
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
  const free = mc && canTakeSpouse(mc);
  const body = h('div', {},
    WorldArt.room('tavern', WorldArt.seedHere()),
    h('p', { class: 'dim' }, 'Adventurers, wanderers and locals. Click someone to see their lineage, court them or recruit them.'),
    free ? h('div', { class: 'act-group' },
      h('p', { class: 'act-group-label' }, isWidowed(mc) ? 'Remarriage' : 'Seek a spouse'),
      act(isWidowed(mc) ? 'Seek a new spouse' : 'Seek match', () => { this.closeModal(); Game.seekNewSpouse({ townIdx: idx }); }, { sub: 'compatible adults here · court or propose', cls: 'hl' }),
    ) : null,
    h('div', { class: 'grid' }, people.map((c) => this.miniCard(c, () => this.replaceModalChar(c), [
      h('small', {}, `${hireCost(c)}g`),
      c.parents.some((p) => ch(p) && (ch(p).status === 'party' || ch(p).status === 'household' || ch(p).house === G.house.name)) ? h('small', { class: 'good' }, 'Child of a companion') : null,
      mc && bond(c, mc) > 20 ? h('small', { class: 'good' }, `Bond ${Math.round(bond(c, mc))}`) : null,
      free && canTakeSpouse(c) && attraction(c, mc) > 0 && attraction(mc, c) > 0 ? h('small', { class: 'good' }, 'Possible match') : null,
    ]))),
    kids.length ? h('p', { class: 'dim' }, `Children in town: ${kids.map((k) => `${k.name} (${ageStr(k)}, ${GD.RACES[k.race].name})`).join(', ')}`) : null,
  );
  this.modal(body, { title: `Tavern of ${G.world.towns[idx].name}`, wide: true });
};

UI.showSeekSpouse = function ({ intro, cands, widowed, late, townIdx }) {
  const mc = ch(G.mcId);
  const body = h('div', {},
    h('p', { class: 'dim' }, intro),
    late ? h('p', { class: 'dim small' }, `Late spouse: ${late.name} † · prior children keep their place in succession.`) : null,
    cands.length
      ? h('div', { class: 'grid' }, cands.map((c) => this.miniCard(c, () => this.replaceModalChar(c), [
        h('small', {}, UI.charLine(c)),
        h('small', { class: 'dim' }, orientationText(c)),
        h('small', { class: bond(c, mc) >= 70 ? 'good' : 'dim' }, `Bond ${Math.round(bond(c, mc))}`),
        act('Court', () => { Game.court(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '20g · 10 days', disabled: G.house.gold < 20 }),
        bond(c, mc) >= 70 ? act(widowed ? 'Propose Remarriage' : 'Propose Marriage', () => { this.closeAll(); Game.propose(c); }, { cls: 'hl' }) : null,
      ])))
      : h('p', { class: 'dim' }, 'No clear prospects nearby. Travel to a town tavern, or ask the matchmaker for an arranged union.'),
    h('div', { class: 'row' },
      act('Arranged Match', () => { this.closeAll(); Game.arrangedMatch(); }, { sub: 'choose 1 of 3 partners', cls: 'hl' }),
      townIdx != null ? act('Back to tavern', () => { this.closeModal(); this.showTavern(townIdx); }) : act('Close', () => this.closeModal()),
    ),
  );
  this.modal(body, { title: widowed ? 'Seek a New Spouse' : 'Seek a Spouse', wide: true });
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
  Equip.loadUi();
  Equip.ensureHouse();
  const maxTier = Math.min(GD.GEAR.length, 2 + G.house.up.armory + Math.floor(G.house.tier / 2));
  const party = G.party.map(ch);
  const rows = [];
  rows.push(WorldArt.room('market', WorldArt.seedHere()));
  rows.push(h('div', { class: 'row' }, act('Buy Potion', () => { Game.buyPotion(); this.closeModal(); this.showMarket(); }, { sub: `25g · you have ${G.house.potions}`, disabled: G.house.gold < 25 })));
  rows.push(h('p', { class: 'dim' }, 'Smiths stock armour or robes, helms or crowns, blades or staves — whatever your class can wear.'));
  for (const c of party) {
    const kit = Equip.kitFor(c);
    rows.push(h('div', { class: 'market-char' },
      h('div', { class: 'row' }, portrait(c, 44), h('div', {}, h('b', {}, c.name), h('small', { class: 'dim' }, ` · ${classOf(c).icon} ${classOf(c).name}`))),
      h('div', { class: 'eq-offers' }, Equip.marketOffers(c, maxTier).map((offer) =>
        act(offer.item.name, () => { Game.buyEquipOffer(c, offer); this.closeModal(); this.showMarket(); }, {
          sub: `${offer.cost}g · ${Equip.itemDesc(offer.item)} · ${Equip.slotLabel(c, offer.slot)}`,
          disabled: G.house.gold < offer.cost,
        }))),
      act('Try on / equip', () => { this.closeModal(); this.showInventory(c); }, { sub: 'open inventory with this character' }),
    ));
  }
  rows.push(h('p', { class: 'dim' }, `Gear up to tier ${maxTier}. An armory and a bigger estate unlock better smiths. House stash: ${G.house.stash.length} item${G.house.stash.length === 1 ? '' : 's'}.`));
  this.modal(rows, { title: 'Market', wide: true });
};

// ---------------------------------------------------------------- inventory try-on & equipment screens
UI.equipPortrait = function (c, tryItem, size = 160) {
  const overlay = tryItem ? Equip.tryOverlay(c, tryItem) : null;
  return portrait(c, size, true, overlay);
};

UI.slotButton = function (c, slot, opts = {}) {
  Equip.ensureChar(c);
  const item = (opts.overlay && opts.overlay[slot]) || c.equip[slot];
  const trying = opts.tryItem && opts.tryItem.slot === slot;
  const emptySrc = `assets/ui/${GD.EQ_SLOTS[slot].empty}.png`;
  const btn = h('button', {
    class: 'eq-slot' + (item ? ' filled' : '') + (trying ? ' trying' : '') + (opts.selected === slot ? ' selected' : ''),
    title: item ? `${item.name} (${Equip.itemDesc(item)})` : `Empty ${Equip.slotLabel(c, slot)}`,
    onclick: opts.onclick || (() => {}),
  },
    h('img', { class: 'eq-slot-bg', src: emptySrc, alt: '' }),
    item ? (() => {
      const cv = document.createElement('canvas');
      cv.width = 40; cv.height = 40; cv.className = 'eq-slot-icon';
      Equip.drawIcon(cv.getContext('2d'), item, 4, 4, 32);
      return cv;
    })() : null,
    h('small', { class: 'eq-slot-label' }, Equip.slotLabel(c, slot)),
    item ? h('small', { class: 'eq-slot-name' }, item.name) : null,
  );
  return btn;
};

UI.showEquipment = function (c, selSlot) {
  Equip.loadUi();
  Equip.ensureHouse();
  Equip.ensureChar(c);
  const kit = Equip.kitFor(c);
  const slots = Object.keys(GD.EQ_SLOTS).filter((s) => kit[s] || s === 'neck' || s === 'ring').sort((a, b) => GD.EQ_SLOTS[a].order - GD.EQ_SLOTS[b].order);
  const selected = selSlot && slots.includes(selSlot) ? selSlot : null;
  const worn = selected ? c.equip[selected] : null;
  const body = h('div', { class: 'equip-screen' },
    h('div', { class: 'equip-left' },
      this.equipPortrait(c, null, 180),
      h('p', {}, h('b', {}, `${classOf(c).icon} ${classOf(c).name}`), h('small', { class: 'dim' }, ` · ${c.name}`)),
      h('p', { class: 'dim' }, (() => {
        const body = Equip.slotLabel(c, 'body').toLowerCase();
        const hand = Equip.slotLabel(c, 'hand').toLowerCase();
        const head = Equip.slotLabel(c, 'head').toLowerCase();
        const an = (w) => (/^[aeiou]/.test(w) ? 'an' : 'a') + ' ' + w;
        return `${classOf(c).name}s wear ${body}, wield ${an(hand)}, and cover the head with ${an(head)}.`;
      })()),
      h('p', { class: 'dim' }, `Bonuses · +${Equip.bonus(c, 'atk')} atk · +${Equip.bonus(c, 'def')} def · +${Equip.bonus(c, 'mag')} mag`),
      h('div', { class: 'row' },
        act('Inventory & Try On', () => { this.closeModal(); this.showInventory(c); }),
        act('Character', () => { this.closeModal(); this.showChar(c); })),
    ),
    h('div', { class: 'equip-doll' },
      h('h4', {}, 'Worn'),
      h('div', { class: 'eq-slots' }, slots.map((slot) => this.slotButton(c, slot, {
        selected,
        onclick: () => {
          if (c.equip[slot]) this.replaceModal(this._equipBody(c, slot), { title: `${c.name} — Equipment`, wide: true });
          else this.replaceModal(this._equipBody(c, slot), { title: `${c.name} — Equipment`, wide: true });
        },
      }))),
    ),
    h('div', { class: 'equip-detail' },
      h('h4', {}, selected ? Equip.slotLabel(c, selected) : 'Slot'),
      selected && worn ? h('div', { class: 'item-card' },
        h('b', {}, worn.name),
        h('p', { class: 'dim' }, Equip.itemDesc(worn)),
        act('Unequip to stash', () => { Equip.unequip(c, selected); saveGame(); this.replaceModal(this._equipBody(c, selected), { title: `${c.name} — Equipment`, wide: true }); UI.refresh(); }),
      ) : selected ? h('p', { class: 'dim' }, `No ${Equip.slotLabel(c, selected).toLowerCase()} equipped. Open Inventory to try one on.`) : h('p', { class: 'dim' }, 'Tap a slot to inspect or unequip.'),
      h('div', { class: 'item-desc-frame' }, h('img', { src: 'assets/ui/item-describe.png', alt: '' }),
        h('div', { class: 'item-desc-text' }, selected && worn ? `${worn.name}: ${Equip.itemDesc(worn)}` : 'Choose a worn piece.')),
    ),
  );
  this._equipBody = (chara, slot) => {
    // rebuild helper bound for replaceModal
    const prev = this.showEquipment;
    // inline rebuild without nesting another modal open
    Equip.ensureChar(chara);
    const k = Equip.kitFor(chara);
    const sl = Object.keys(GD.EQ_SLOTS).filter((s) => k[s] || s === 'neck' || s === 'ring').sort((a, b) => GD.EQ_SLOTS[a].order - GD.EQ_SLOTS[b].order);
    const sel = slot && sl.includes(slot) ? slot : null;
    const w = sel ? chara.equip[sel] : null;
    return h('div', { class: 'equip-screen' },
      h('div', { class: 'equip-left' },
        this.equipPortrait(chara, null, 180),
        h('p', {}, h('b', {}, `${classOf(chara).icon} ${classOf(chara).name}`), h('small', { class: 'dim' }, ` · ${chara.name}`)),
        h('p', { class: 'dim' }, `Bonuses · +${Equip.bonus(chara, 'atk')} atk · +${Equip.bonus(chara, 'def')} def · +${Equip.bonus(chara, 'mag')} mag`),
        h('div', { class: 'row' },
          act('Inventory & Try On', () => { this.closeModal(); this.showInventory(chara); }),
          act('Character', () => { this.closeModal(); this.showChar(chara); })),
      ),
      h('div', { class: 'equip-doll' },
        h('h4', {}, 'Worn'),
        h('div', { class: 'eq-slots' }, sl.map((s) => this.slotButton(chara, s, {
          selected: sel,
          onclick: () => this.replaceModal(this._equipBody(chara, s), { title: `${chara.name} — Equipment`, wide: true }),
        }))),
      ),
      h('div', { class: 'equip-detail' },
        h('h4', {}, sel ? Equip.slotLabel(chara, sel) : 'Slot'),
        sel && w ? h('div', { class: 'item-card' },
          h('b', {}, w.name),
          h('p', { class: 'dim' }, Equip.itemDesc(w)),
          act('Unequip to stash', () => { Equip.unequip(chara, sel); saveGame(); this.replaceModal(this._equipBody(chara, sel), { title: `${chara.name} — Equipment`, wide: true }); UI.refresh(); }),
        ) : sel ? h('p', { class: 'dim' }, `No ${Equip.slotLabel(chara, sel).toLowerCase()} equipped.`) : h('p', { class: 'dim' }, 'Tap a slot to inspect or unequip.'),
      ),
    );
  };
  this.modal(body, { title: `${c.name} — Equipment`, wide: true });
};

UI.showInventory = function (c, tryId) {
  Equip.loadUi();
  Equip.ensureHouse();
  Equip.ensureChar(c);
  const tryItem = tryId ? Equip.findInStash(tryId) : null;
  const canTry = tryItem && Equip.canWear(c, tryItem);
  const party = G.party.map(ch).filter(Boolean);
  const stash = G.house.stash;
  const fit = stash.filter((it) => Equip.canWear(c, it));
  const other = stash.filter((it) => !Equip.canWear(c, it));

  const rebuild = (id) => { this.replaceModal(this._invBody(c, id), { title: `${c.name} — Inventory`, wide: true }); };
  this._invBody = (chara, tid) => {
    const tItem = tid ? Equip.findInStash(tid) : null;
    const ok = tItem && Equip.canWear(chara, tItem);
    const overlay = ok ? Equip.tryOverlay(chara, tItem) : null;
    const fit2 = G.house.stash.filter((it) => Equip.canWear(chara, it));
    const other2 = G.house.stash.filter((it) => !Equip.canWear(chara, it));
    const slots = Object.keys(GD.EQ_SLOTS).filter((s) => Equip.kitFor(chara)[s] || s === 'neck' || s === 'ring')
      .sort((a, b) => GD.EQ_SLOTS[a].order - GD.EQ_SLOTS[b].order);

    const stashCell = (it, wearable) => h('button', {
      class: 'inv-cell' + (tid === it.id ? ' trying' : '') + (wearable ? '' : ' locked'),
      title: `${it.name} · ${Equip.itemDesc(it)}${wearable ? '' : ' · wrong class kit'}`,
      onclick: () => rebuild(it.id),
    },
      (() => { const cv = document.createElement('canvas'); cv.width = 36; cv.height = 36; Equip.drawIcon(cv.getContext('2d'), it, 2, 2, 32); return cv; })(),
      h('small', {}, it.name),
    );

    return h('div', { class: 'inv-screen' },
      h('div', { class: 'inv-left' },
        h('div', { class: 'inv-preview' + (ok ? ' trying' : '') }, this.equipPortrait(chara, ok ? tItem : null, 170)),
        h('p', {}, h('b', {}, chara.name), h('small', { class: 'dim' }, ` · ${classOf(chara).icon} ${classOf(chara).name}`)),
        ok ? h('p', { class: 'good' }, `Trying on ${tItem.name}`) : h('p', { class: 'dim' }, 'Pick a stash item to try it on.'),
        h('p', { class: 'dim' }, `Preview bonuses · +${(ok ? Object.values(overlay).filter(Boolean) : Equip.worn(chara)).reduce((s, it) => s + (it.atk || 0), 0)} atk · +${(ok ? Object.values(overlay).filter(Boolean) : Equip.worn(chara)).reduce((s, it) => s + (it.def || 0), 0)} def · +${(ok ? Object.values(overlay).filter(Boolean) : Equip.worn(chara)).reduce((s, it) => s + (it.mag || 0), 0)} mag`),
        h('div', { class: 'row' },
          ok ? act('Wear it', () => { Equip.equipItem(chara, tItem, true); saveGame(); UI.refresh(); rebuild(null); UI.toast(`${chara.name} equips ${tItem.name}.`); }, { cls: 'hl' }) : null,
          ok ? act('Clear try-on', () => rebuild(null)) : null,
        ),
        h('div', { class: 'eq-slots compact' }, slots.map((slot) => this.slotButton(chara, slot, {
          overlay, tryItem: ok ? tItem : null,
          onclick: () => {
            if (chara.equip[slot]) { Equip.unequip(chara, slot); saveGame(); UI.refresh(); rebuild(tid); }
          },
        }))),
        h('p', { class: 'dim small' }, 'Tap a worn slot to unequip it into the stash.'),
      ),
      h('div', { class: 'inv-right' },
        h('div', { class: 'inv-chrome' }, h('img', { class: 'inv-panel-img', src: 'assets/ui/inventory-panel.png', alt: '' })),
        h('h4', {}, `Fits ${chara.name}`),
        fit2.length ? h('div', { class: 'inv-grid' }, fit2.map((it) => stashCell(it, true))) : h('p', { class: 'dim' }, 'Nothing in the house stash that this class can wear. Buy gear at the market.'),
        other2.length ? h('h4', {}, 'Other kit (wrong class)') : null,
        other2.length ? h('div', { class: 'inv-grid dimmed' }, other2.map((it) => stashCell(it, false))) : null,
        h('h4', {}, 'Dress another'),
        h('div', { class: 'row wrap' }, party.map((p) => act(p.name, () => { this.closeModal(); this.showInventory(p, tid); }, { cls: p.id === chara.id ? 'hl' : '' }))),
        act('Equipment screen', () => { this.closeModal(); this.showEquipment(chara); }),
      ),
    );
  };

  this.modal(this._invBody(c, tryId), { title: `${c.name} — Inventory`, wide: true });
};

// ---------------------------------------------------------------- estate screens
UI.showEstate = function () {
  Guide.mark('estate');
  const hs = G.house;
  const next = GD.ESTATE[hs.tier + 1];
  const rows = [WorldArt.room('estate', WorldArt.seedHere())];
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
  const mc = ch(G.mcId);
  const body = h('div', {},
    mc && canTakeSpouse(mc) ? h('div', { class: 'act-group' },
      h('p', { class: 'act-group-label' }, isWidowed(mc) ? 'Remarriage' : 'Marriage'),
      act(isWidowed(mc) ? 'Seek a new spouse' : 'Arranged Match', () => { this.closeModal(); Game.seekNewSpouse(); }, { sub: isWidowed(mc) ? 'court again or arrange a remarriage' : 'choose 1 of 3 partners', cls: 'hl' }),
    ) : null,
    h('h4', {}, 'House members'),
    h('div', { class: 'grid' }, blood.map((c) => this.miniCard(c, () => this.replaceModalChar(c), [
      c.id === G.heirId ? h('small', { class: 'good' }, '★ Heir') : null,
      c.status === 'party' ? h('small', {}, 'In party') : null,
      isWidowed(c) ? h('small', { class: 'dim' }, 'Widowed') : null,
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
  Guide.mark('tree');
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
    act('House flag & sigil', () => { this.closeModal(); this.modal([Heraldry.canvas(G.house.heraldry, 288), act('Edit heraldry', () => { this.closeModal(); this.modal([Heraldry.editor(G.house.heraldry, flag => { G.house.heraldry=flag; G.house.color=Heraldry.color(flag.primary); saveGame(); UI.refresh(); })], { title: 'House heraldry', wide: true }); })], { title: `House ${G.house.name}` }); }),
    G && G.mcId ? act('Inventory & Equipment', () => { this.closeModal(); this.showInventory(ch(G.mcId)); }, { sub: 'try on gear by class' }) : null,
    act('Save Game', () => { UI.toast(saveGame() ? 'Game saved.' : 'Could not save (storage unavailable).'); this.closeModal(); }),
    act('Interactive starter guide', () => { this.closeModal(); Guide.show(); }),
    act('Art credits', () => { this.closeModal(); this.showArtCredits(); }),
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

UI.showArtCredits = function () {
  this.modal([
    h('p', {}, 'Pixel Burst VFX: Elemental Spells — dotplays. Used in combat projectiles.'),
    h('p', {}, 'Super Pixel Effects Gigapack — Will Tice / unTied Games. Used in combat impacts, healing and defensive effects.'),
    h('p', {}, 'Modern Interiors Free — LimeZu. Used in generated rooms and settlement details. The supplied free pack is licensed for noncommercial projects only.'),
    h('p', {}, "Kasaya's Frames — Kasaya. Used in inventory, equipment slots and try-on screens."),
    h('p', {}, 'House sigils: Angais / Pixel Art Atlas (CC0 dedication).'),
    h('a', { href: 'assets/packs/README.md', target: '_blank', rel: 'noopener' }, 'Asset sources and license notes'),
  ], { title: 'Art credits' });
};
