// Context actions grow out of a place's map nametag — a small chip, not a blocking sheet.
'use strict';
const LocationPrompt = {
  pending: null,
  openTimer: 0,
  expanded: false,
  lastKey: null,

  nearby(maxDist = 1.85) {
    if (!G || !G.mcId || G.mode !== 'world') return null;
    const p = G.ppos || G.pos;
    let best = null, distance = maxDist;
    const reach = Math.ceil(maxDist) + 1;
    for (let y = Math.max(0, Math.floor(p.y) - reach); y <= Math.min(G.world.map.H - 1, Math.ceil(p.y) + reach); y++) {
      for (let x = Math.max(0, Math.floor(p.x) - reach); x <= Math.min(G.world.map.W - 1, Math.ceil(p.x) + reach); x++) {
        const t = tileAt(x, y), d = Math.hypot(x - p.x, y - p.y);
        if (!t.feature || (t.feature === 'town' && G.world.towns[t.townIdx]?.fallen)) continue;
        const allow = (t.feature === 'estate' || t.feature === 'town') ? Math.max(maxDist, 1.85) : maxDist;
        if (d < Math.min(distance, allow + 0.001)) { best = t; distance = d; }
      }
    }
    return best;
  },

  name(t) {
    return t.feature === 'town' ? G.world.towns[t.townIdx].name : t.feature === 'estate' ? `House ${G.house.name}` :
      Events.label(t) || ({ ruins: 'Ruins', spire: 'The Black Spire', shrine: 'Beacon Shrine' }[t.feature]) || t.feature;
  },

  // glyph that blooms out of the nametag when you are close enough to act
  icon(t) {
    return ({ town: '⌂', estate: '♛', ruins: '†', shrine: '✦', spire: '▲', camp: '▲', cave: '◈', mine: '◈' }[t.feature]) || '·';
  },

  // skip the painted canvas label for the active nearby place so the DOM chip owns that spot
  hidesLabel(t) {
    return !!(this.tile && t && this.tile.x === t.x && this.tile.y === t.y && this.el && !this.el.hidden);
  },

  choose(t, mode) {
    if (this.nearby() !== t || Battle.active || UI.modalStack.length) return;
    Living.stop();
    const p = G.ppos || G.pos;
    if (Math.hypot(p.x - t.x, p.y - t.y) > 0.35) {
      Living.go(t);
      if (Living.moving) this.pending = { x: t.x, y: t.y, mode };
      return;
    }
    G.ppos = { x: t.x, y: t.y };
    G.pos = { x: t.x, y: t.y };
    this.open(t, mode);
  },

  arrive(t) {
    const pending = this.pending;
    if (!pending || pending.x !== t.x || pending.y !== t.y) return;
    this.pending = null;
    this.open(t, pending.mode);
  },

  open(t, mode) {
    Living.stop(); UI.closeDrawer();
    if (mode === 'enter' && t.feature === 'town') return TownView.start(t);
    const rows = t.feature === 'town' ? UI.townPanel(t).filter((e, i) => i !== 2) :
      t.feature === 'estate' ? UI.estatePanel() : t.feature === 'ruins' ? UI.ruinsPanel(t) :
      t.feature === 'spire' ? UI.spirePanel() : Events.panel(t) || [h('p', {}, t.lit ? 'The beacon burns again.' : 'Reach a beacon marked by your current quest to rekindle it.')];
    const body = h('div', { class: 'here-sheet' },
      h('p', { class: 'dim' }, 'Pick a clear task, or keep moving.'),
      ...rows.filter(Boolean));
    for (const button of body.querySelectorAll('button')) {
      button.addEventListener('click', () => UI.closeModal(), { capture: true, once: true });
    }
    UI.modal([body, act('Keep travelling', () => UI.closeModal(), { sub: 'return to the map' })], { title: `${this.name(t)} · Options` });
  },

  ensure() {
    if (this.el) return;
    this.iconEl = h('span', { class: 'place-tag-icon', 'aria-hidden': 'true' });
    this.title = h('strong', { class: 'place-tag-name' });
    this.chevron = h('span', { class: 'place-tag-chevron', 'aria-hidden': 'true' }, '▾');
    this.head = h('button', {
      type: 'button',
      class: 'place-tag-head',
      'aria-expanded': 'false',
      'aria-controls': 'place-tag-actions',
      onclick: (e) => { e.stopPropagation(); this.toggle(); },
    }, this.iconEl, this.title, this.chevron);
    this.enter = act('Enter', (e) => { e.stopPropagation(); this.choose(this.tile, 'enter'); });
    this.pass = act('Pass through', (e) => { e.stopPropagation(); this.choose(this.tile, 'pass'); });
    this.actions = h('div', { id: 'place-tag-actions', class: 'place-tag-actions', role: 'group', 'aria-label': 'Place actions' },
      this.enter, this.pass);
    this.el = h('section', {
      id: 'location-prompt',
      class: 'place-tag',
      'aria-label': 'Nearby place',
      hidden: true,
    }, this.head, this.actions);
    // keep map clicks free: only the chip itself is interactive
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('click', (e) => e.stopPropagation());
    $('#stage').append(this.el);
  },

  toggle() {
    if (!this.tile) return;
    this.setExpanded(!this.expanded);
  },

  setExpanded(on) {
    this.expanded = !!on;
    if (!this.el) return;
    this.el.classList.toggle('is-open', this.expanded);
    if (this.head) this.head.setAttribute('aria-expanded', this.expanded ? 'true' : 'false');
  },

  collapse() {
    this.setExpanded(false);
    if (this.openTimer) { clearTimeout(this.openTimer); this.openTimer = 0; }
  },

  scheduleOpen() {
    if (this.openTimer || this.expanded) return;
    this.openTimer = setTimeout(() => {
      this.openTimer = 0;
      if (this.tile && this.el && !this.el.hidden) this.setExpanded(true);
    }, 420);
  },

  render() {
    this.ensure();
    const t = this.nearby();
    const blocked = !t || Battle.active || TownView.open || Campfire.open || UI.modalStack.length > 0 || Game.busy || Living.moving;
    if (blocked) {
      if (this.lastKey) { this.collapse(); this.lastKey = null; }
      this.tile = null;
      this.el.hidden = true;
      this.el.classList.remove('is-near', 'is-open');
      return;
    }

    const key = `${t.x},${t.y},${t.feature}`;
    if (key !== this.lastKey) {
      this.collapse();
      this.lastKey = key;
      this.el.classList.remove('is-near');
      // restart the bloom animation when a new place comes into range
      void this.el.offsetWidth;
      this.scheduleOpen();
    }

    this.tile = t;
    this.el.hidden = false;
    this.el.classList.add('is-near');
    this.el.dataset.feature = t.feature || '';
    this.iconEl.textContent = this.icon(t);
    this.title.textContent = this.name(t);
    this.enter.textContent = t.feature === 'town' ? 'Enter' : 'Explore';
    this.pass.textContent = 'Pass through';

    // pin the chip exactly where the painted nametag sat
    const p = Render.iso(t.x, t.y, Render.flat ? 0 : t.h);
    const x = Render.w / 2 + (p.x - Render.w / 2) * Render.zoom;
    const y = Render.h / 2 + (p.y - Render.h / 2) * Render.zoom - 55 * Render.zoom;
    const width = this.el.offsetWidth || 160;
    const height = this.el.offsetHeight || 28;
    this.el.style.left = `${Math.max(6, Math.min(Render.w - width - 6, x - width / 2))}px`;
    this.el.style.top = `${Math.max(8, Math.min(Render.h - height - 8, y - (this.expanded ? 8 : 0) - 10))}px`;
  },
};
