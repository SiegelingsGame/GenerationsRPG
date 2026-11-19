// DOM user interface: HUD, panels, modals, character sheets, family tree.
'use strict';

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (v === undefined || v === null || v === false) continue;
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && this.modalStack.length && !this.modalStack[this.modalStack.length - 1].locked) this.closeModal();
  });
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
    h('div', { class: 'tb grow' }, h('small', {}, `Prosperity ${Math.round(w.prosperity)} / 95 for a Golden Age`), bar(w.prosperity, 100, 'pros')),
    h('div', { class: 'tb' }, h('small', {}, 'Prestige'), h('b', {}, Math.round(hs.prestige))),
    h('div', { class: 'tb' }, h('small', {}, 'Gold'), h('b', { class: 'gold' }, Math.round(hs.gold))),
    h('div', { class: 'tb' }, h('small', {}, 'Potions'), h('b', {}, hs.potions)),
    h('button', { class: 'small', onclick: () => this.showTree() }, 'Family Tree'),
    h('button', { class: 'small', onclick: () => this.showMenu() }, 'Menu'),
  );
};

UI.charLine = function (c) {
  const st = GD.STAGES[stageKey(c)].name;
  return `${GD.RACES[c.race].name} · ${ageStr(c)} yrs · ${st}`;
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
    return h('div', { class: 'heirbox warn' }, cands.length ? 'No blood heir yet. If you die, your spouse rules as regent.' : '⚠ No heir! If you die, the House ends.');
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
  else body.push(h('h3', {}, 'The Wilds'), h('p', { class: 'dim' }, `${t.type[0].toUpperCase() + t.type.slice(1)}. Click a tile to travel. Every step costs time, and danger is everywhere.`));
  body.push(h('div', { class: 'hint' }, 'Click the map to travel. Hover a tile to see the path.'));
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
    act('Family Tree', () => this.showTree()),
  ];
};

UI.townPanel = function (t) {
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
  return [
    h('h3', {}, town.name),
    h('p', { class: 'dim' }, `${this.townPeople(t.townIdx).length} people of note live here.`),
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

UI.ruinsPanel = function (t) {
  const quiet = t.cleared && year() < (t.clearedYear || 0) + 5;
  const dist = Math.abs(t.x - G.world.estate.x) + Math.abs(t.y - G.world.estate.y);
  const lvl = Math.max(1, Math.round(partyLevel() + dist / 5 + 1.5));
  const ready = partyLevel() >= lvl - 1 && G.party.length >= 2;
  return [
    h('h3', {}, 'Ancient Ruins'),
    h('p', { class: 'dim' }, quiet ? `Cleared in ${t.clearedYear}. Something may return in time.` : 'Dark things gather here. Clearing it makes the land safer and brings great prestige.'),
    h('p', { class: ready ? 'dim' : 'bad' }, `Foes around level ${lvl}. ${ready ? 'Your party looks ready.' : 'Your party looks outmatched. Death here is permanent.'}`),
    act('Delve', () => Game.delve(t), { disabled: quiet, sub: 'hard battle · loot · prosperity', cls: 'danger' }),
  ];
};

// ---------------------------------------------------------------- battle panel
UI.battleChanged = function () {
  if (!Battle.active) return;
  this.renderParty();
  const p = $('#panel');
  const u = Battle.cur;
  const kids = [h('h3', {}, Battle.title)];
  if (Battle.waiting && u && u.side === 'party') {
    const sk = GD.SKILLS[u.skill];
    kids.push(h('p', {}, h('b', {}, `${u.name}'s turn`), h('br'), h('small', { class: 'dim' }, `Focus ${u.focus}/3`)));
    if (this.targeting) {
      kids.push(h('p', { class: 'dim' }, `Choose a target for ${this.targeting === 'skill' ? sk.name : this.targeting}: click on the field or below.`));
      const targets = Battle.units.filter((x) => this.validTarget(x));
      kids.push(...targets.map((x) => act(`${x.name} (${x.hp}/${x.maxHp})`, () => this.chooseTarget(x))));
      kids.push(act('Back', () => { this.targeting = null; this.battleChanged(); }));
    } else {
      kids.push(act('Attack', () => this.beginTarget('attack')));
      kids.push(act(`${sk.name}`, () => {
        if (u.skill === 'str' || u.skill === 'vit') Battle.act('skill');
        else this.beginTarget('skill');
      }, { disabled: u.focus < 2, sub: `2 focus · ${sk.desc}` }));
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
};
UI.beginTarget = function (kind) { this.targeting = kind; this.battleChanged(); };
UI.validTarget = function (x) {
  const u = Battle.cur;
  if (!u || !x.alive || !this.targeting) return false;
  const friendly = this.targeting === 'potion' || (this.targeting === 'skill' && u.skill === 'wil');
  return friendly ? x.side === u.side : x.side !== u.side;
};
UI.chooseTarget = function (x) {
  const kind = this.targeting;
  this.targeting = null;
  Battle.act(kind, x.uid);
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
    h('td', { class: 'dim' }, ageMod(c, k) !== 1 ? `age ×${ageMod(c, k).toFixed(2)}` : ''), h('td', { class: 'dim' }, c.bonus[k] ? `+${c.bonus[k].toFixed(1)} flat` : '')));
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
  const grand = bloodline(c).filter((x) => x.depth === 2).map((x) => x.c);
  const actions = this.charActions(c);
  return h('div', { class: 'sheet' },
    h('div', { class: 'sheet-left' },
      portrait(c, 140),
      h('div', { class: 'tags' }, tags),
      h('p', {}, this.charLine(c)),
      h('p', { class: 'dim' }, `Born ${year(c.born)} · expected lifespan ~${Math.round((r.life[0] + r.life[1]) / 2)} · ${lifeLeft}`),
      c.alive ? h('p', { class: 'dim' }, `Formative ${Math.round(c.formative)}/${formativeCap(c)} · XP ×${xpMod(c).toFixed(2)}`) : null,
      ...actions),
    h('div', { class: 'sheet-right' },
      h('p', {}, h('b', {}, `Level ${c.level}`), ` · Power ${power(c)} · Signature: ${GD.SKILLS[topStat(c)].name}`),
      c.alive ? h('div', {}, bar(c.xp, xpNeed(c.level), 'xp'), h('small', { class: 'dim' }, `XP ${Math.round(c.xp)}/${xpNeed(c.level)}`)) : null,
      h('table', { class: 'stats' }, statRows),
      h('p', { class: 'dim' }, `Max HP ${maxHp(c)} · Weapon ${c.gear.weapon ? GD.GEAR[c.gear.weapon - 1].name : 'none'}${G.mcId === c.id && G.house.heirloom ? ` + ${G.house.heirloom.name} (+${G.house.heirloom.power})` : ''} · Armour ${c.gear.armor ? GD.GEAR[c.gear.armor - 1].name : 'none'}`),
      h('h4', {}, 'Family'),
      lineage,
      grand.length ? h('p', { class: 'dim' }, 'Grandparents: ', grand.map((g, i) => [i ? ', ' : '', link(g)])) : null,
      sp ? h('p', {}, 'Spouse: ', link(sp)) : h('p', { class: 'dim' }, 'Unmarried'),
      kids.length ? h('p', {}, 'Children: ', kids.map((k, i) => [i ? ', ' : '', link(k), k.alive ? ` (${ageStr(k)})` : ''])) : null,
      mc && c.id !== mc.id && c.alive ? h('p', { class: 'dim' }, `Bond with ${mc.name}: ${Math.round(bond(c, mc))} · Loyalty to the House: ${Math.round(c.loyalty)}`) : null,
      c.alive && !c.house && isAdult(c) ? h('p', { class: c.corruption > 60 ? 'bad' : 'dim' }, `Resentment: ${c.corruption > 70 ? 'dangerous' : c.corruption > 40 ? 'simmering' : 'low'}`) : null,
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
  const canRomance = isAdult(c) && !spouseOf(mc) && !spouseOf(c) && !isDescendantOf(c, mc.id) && !isDescendantOf(mc, c.id) && !siblings(c, mc) && c.status !== 'rival';
  if (canRomance && (inTown || c.status !== 'npc')) {
    out.push(act('Court', () => { Game.court(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '20g · 10 days', disabled: G.house.gold < 20 }));
    if (bond(c, mc) >= 70) out.push(act('Propose Marriage', () => { Game.propose(c); this.closeModal(); }, { cls: 'hl' }));
  }
  if (!c.lineageKnown && inTown) {
    const cost = Math.max(10, 40 - G.house.up.library * 10);
    out.push(act('Research Lineage', () => { Game.research(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: `${cost}g`, disabled: G.house.gold < cost }));
  }
  if (c.house === G.house.name && c.birth === 'bastard' && !c.legit) out.push(act('Legitimise', () => { Game.legitimise(c); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }, { sub: '10 prestige', disabled: G.house.prestige < 10 }));
  if (c.house === G.house.name && isDescendantOf(c, mc.id) && G.heirId !== c.id) out.push(act('Name as Heir', () => { G.heirId = c.id; Log.add(`${c.name} is named heir of House ${G.house.name}.`, 'good'); this.replaceModal(this.charBody(c), { title: c.name, wide: true }); }));
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
UI.showTree = function () {
  const root = ch(G.founderId);
  if (!root) return;
  const seen = new Set();
  const node = (c) => {
    if (!c || seen.has(c.id)) return null;
    seen.add(c.id);
    const spouses = Object.values(G.chars).filter((o) => o.spouse === c.id || c.spouse === o.id || (o.children.some((k) => c.children.includes(k)) && o.id !== c.id));
    const uniq = [...new Map(spouses.map((s) => [s.id, s])).values()];
    uniq.forEach((s) => seen.add(s.id));
    const kids = c.children.map(ch).filter(Boolean).sort((a, b) => a.born - b.born);
    const person = (p) => h('div', { class: 'tnode' + (p.alive ? '' : ' dead') + (p.id === G.mcId ? ' mc' : '') + (p.id === G.heirId ? ' heir' : ''), onclick: () => this.replaceModalChar(p) },
      portrait(p, 40),
      h('div', {},
        h('b', {}, (p.id === G.mcId ? '♛ ' : p.id === G.heirId ? '★ ' : '') + p.name),
        h('small', {}, `${GD.RACES[p.race].name} · ${year(p.born)}–${p.alive ? '' : year(p.died)}`),
        h('small', { class: p.birth === 'bastard' && !p.legit ? 'bad' : 'dim' }, GD.BIRTH[birthKey(p)].name + (G.house.heroes.includes(p.id) ? ' · Head of House' : ''))));
    return h('li', {},
      h('div', { class: 'couple' }, person(c), ...uniq.map((s) => [h('span', { class: 'amp' }, '⚭'), person(s)])),
      kids.length ? h('ul', {}, kids.map(node)) : null);
  };
  const tree = h('div', { class: 'tree' }, h('ul', {}, node(root)));
  this.modal([h('p', { class: 'dim' }, 'Your bloodline. ♛ is the current head, ★ is the heir, faded entries are dead. Click anyone to see their sheet.'), tree], { title: `The Line of House ${G.house.name}`, wide: true });
};

// ---------------------------------------------------------------- menu
UI.showMenu = function () {
  this.modal([
    act('Save Game', () => { UI.toast(saveGame() ? 'Game saved.' : 'Could not save (storage unavailable).'); this.closeModal(); }),
    act('Concept & How to Play', () => { this.closeModal(); this.showHelp(); }),
    act('Abandon & Start Over', () => { if (confirm('Start a new House? Your current save will be erased.')) { deleteSave(); location.reload(); } }, { cls: 'danger' }),
  ], { title: 'Menu' });
};
UI.showHelp = function () {
  this.modal(h('div', { class: 'help', html: `
    <p><b>Generations</b> is a roguelike about a family line. Your goal is to build a better world for future generations and bring about a <b>Golden Age</b> (95 prosperity).</p>
    <ul>
      <li><b>Time matters.</b> Travel, battles and rest all cost days. Every new year everyone ages, and people are born, marry, die or turn bad.</li>
      <li><b>Age:</b> youths level ×1.5 and earn <i>formative points</i> (permanent XP bonus and protection from old-age debuffs). Elders are wiser but weaker, and level slowly.</li>
      <li><b>Races</b> mature and age at different speeds. An elf heir takes 30 years to come of age; an orc heir takes 11.</li>
      <li><b>Death:</b> fallen fighters may die for good. When your head of house dies, choose an heir. Time skips until they come of age. Companions gain only flat stats while you are gone.</li>
      <li><b>Birth:</b> Highborn, Lowborn, Bastard and Orphan each carry bonuses and drawbacks. Research unknown lineages in taverns.</li>
      <li><b>Prestige</b> unlocks better partners, recruits and estate tiers. Invest gold in your estate. Upgrades and the heirloom pass down.</li>
      <li><b>Betrayal:</b> resentful companions and their children can become <b>Rivals</b> who hunt your line. Keep bonds and loyalty high.</li>
      <li><b>Deeds</b> in towns, cleared ruins and slain rivals raise prosperity, and higher prosperity makes good eras more likely.</li>
    </ul>` }), { title: 'How to Play', wide: true });
};
