// Context actions follow the closest nearby landmark, without interrupting travel.
'use strict';
const LocationPrompt = {
  pending: null,
  nearby(maxDist = 1.85) {
    if (!G || !G.mcId || G.mode !== 'world') return null;
    const p = G.ppos || G.pos;
    let best = null, distance = maxDist;
    const reach = Math.ceil(maxDist) + 1;
    for (let y = Math.max(0, Math.floor(p.y) - reach); y <= Math.min(G.world.map.H - 1, Math.ceil(p.y) + reach); y++) {
      for (let x = Math.max(0, Math.floor(p.x) - reach); x <= Math.min(G.world.map.W - 1, Math.ceil(p.x) + reach); x++) {
        const t = tileAt(x, y), d = Math.hypot(x - p.x, y - p.y);
        if (!t.feature || (t.feature === 'town' && G.world.towns[t.townIdx]?.fallen)) continue;
        // estate / towns forgive standing a step beside the building
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
    // Close this task picker before an action opens another screen or advances time.
    const body = h('div', { class: 'here-sheet' },
      h('p', { class: 'dim' }, 'Pick a clear task, or keep moving.'),
      ...rows.filter(Boolean));
    for (const button of body.querySelectorAll('button')) {
      button.addEventListener('click', () => UI.closeModal(), { capture: true, once: true });
    }
    UI.modal([body, act('Keep travelling', () => UI.closeModal(), { sub: 'return to the map' })], { title: `${this.name(t)} · Options` });
  },
  render() {
    if (!this.el) {
      this.title = h('strong');
      this.enter = act('Enter', () => this.choose(this.tile, 'enter'));
      this.pass = act('Pass through', () => this.choose(this.tile, 'pass'));
      this.el = h('section', { id: 'location-prompt', 'aria-label': 'Nearby location' }, this.title,
        h('div', { class: 'row' }, this.enter, this.pass));
      $('#stage').append(this.el);
    }
    const t = this.nearby();
    this.el.hidden = !t || Battle.active || TownView.open || Campfire.open || UI.modalStack.length > 0 || Game.busy;
    if (this.el.hidden) return;
    this.tile = t; this.title.textContent = this.name(t);
    this.enter.textContent = t.feature === 'town' ? 'Enter' : 'Explore';
    const p = Render.iso(t.x, t.y, Render.flat ? 0 : t.h);
    const x = Render.w/2 + (p.x-Render.w/2)*Render.zoom;
    const y = Render.h/2 + (p.y-Render.h/2)*Render.zoom - 55*Render.zoom;
    const width = this.el.offsetWidth, height = this.el.offsetHeight;
    this.el.style.left = `${Math.max(8, Math.min(Render.w-width-8, x-width/2))}px`;
    this.el.style.top = `${Math.max(150, Math.min(Render.h-height-180, y-height))}px`;
  },
};
