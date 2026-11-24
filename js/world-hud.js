// One world HUD: current goal + estate / map / zoom / rotate tools.
'use strict';

const WorldHud = {
  el: null,
  goal: null,
  tools: null,
  stopBtn: null,

  build() {
    if (this.el) return this.el;
    this.el = h('div', { id: 'world-hud', class: 'world-hud', 'aria-label': 'World controls' },
      this.goal = h('button', {
        id: 'wh-goal',
        class: 'wh-goal',
        type: 'button',
        'aria-label': 'Current starter goal. Open guide',
        onclick: () => Guide.show(),
      }, ''),
      this.tools = h('div', { class: 'wh-tools', role: 'toolbar', 'aria-label': 'Map tools' },
        this.btn('⌂', 'Travel home to your estate', () => this.goEstate(), 'wh-estate'),
        this.btn('⦿', 'Center map on your party', () => this.centerParty(), 'wh-map'),
        this.btn('⟲', 'Rotate left (Q)', () => Render.rotate(-1)),
        this.btn('⟳', 'Rotate right (E)', () => Render.rotate(1)),
        this.btn('+', 'Zoom in', () => Render.setZoom(Render.zoomTarget * 1.25)),
        this.btn('−', 'Zoom out', () => Render.setZoom(Render.zoomTarget / 1.25)),
        this.btn('⊡', 'Reset view', () => { Render.rot = 0; Render.setZoom(1); }),
        this.stopBtn = this.btn('■', 'Stop travelling (Esc)', () => Living.cancel('You halt on the road.'), 'wh-stop'),
      ),
    );
    this.stopBtn.hidden = true;
    document.body.append(this.el);
    return this.el;
  },

  btn(label, title, fn, cls) {
    return h('button', {
      type: 'button',
      class: 'wh-btn' + (cls ? ' ' + cls : ''),
      title,
      'aria-label': title,
      onclick: (e) => { e.stopPropagation(); fn(); },
    }, label);
  },

  goEstate() {
    if (!G || !G.world || !G.world.estate || Battle.active) return;
    if (TownView.open) TownView.close();
    if (Campfire.open) Campfire.close();
    FxLayer.playTransition('diamond-wipe');
    Living.go(G.world.estate);
    UI.toast('Heading for the estate.');
  },

  centerParty() {
    if (!G || !G.world || typeof Render.partyWorldPos !== 'function') return;
    // Snap the camera onto the party immediately (it normally eases to follow).
    const p = Render.partyWorldPos();
    const [prx, pry] = Render.rotXY(p.x, p.y);
    const TW = 64, TH = 32;
    Render.cam.x = Render.w / 2 - (prx - pry) * TW / 2;
    Render.cam.y = Render.h / 2 - (prx + pry) * TH / 2;
    Render.camInit = true;
  },

  sync() {
    this.build();
    const playing = !!(G && G.mcId && G.world && G.world.map);
    const hide = !playing || Battle.active || document.body.classList.contains('opening-cutscene-active');
    this.el.hidden = hide;
    if (hide) return;
    if (this.stopBtn) this.stopBtn.hidden = !(Living && Living.moving);
    // Goal text
    if (typeof Guide !== 'undefined' && Guide.init) {
      const g = Guide.update();
      const steps = Guide.steps();
      const next = steps.find((s) => !g.done[s[0]]);
      const done = steps.filter((s) => g.done[s[0]]).length;
      this.goal.hidden = !!g.hidden;
      this.goal.textContent = next
        ? `Goal: ${next[1]} · ${done}/${steps.length}`
        : `Goals complete · ${done}/${steps.length}`;
    }
  },
};
