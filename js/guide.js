// Starter goals are saved with each House; no timers, rewards or forced actions.
// The guided walkthrough shows one short step at a time instead of a wall of text.
'use strict';
const Guide = {
  init() {
    if (!G.guide) G.guide = { prestige: G.house.prestige, origin: { ...G.pos }, done: {}, hidden: false, step: 0 };
    if (G.guide.step == null) G.guide.step = 0;
    return G.guide;
  },
  mark(key) {
    if (!G || !G.mcId) return;
    this.init().done[key] = true;
    saveGame();
  },
  update() {
    const g = this.init(), d = g.done;
    if (G.pos.x !== g.origin.x || G.pos.y !== g.origin.y) d.travel = true;
    if (tileAt(G.pos.x, G.pos.y).feature === 'town') d.town = true;
    if (G.house.prestige > g.prestige) d.renown = true;
    if (Object.values(G.chars).some(c => c.house === G.house.name &&
      ((c.parents || []).length || (c.adoptedBy || []).length) && isDescendantOf(c, G.founderId))) d.family = true;
    if (G.heirId && ch(G.heirId)?.alive) d.heir = true;
    return g;
  },
  steps() {
    const towns = G.world.towns.filter(t => !t.fallen).sort((a, b) =>
      Math.hypot(a.x - G.pos.x, a.y - G.pos.y) - Math.hypot(b.x - G.pos.x, b.y - G.pos.y));
    const t = towns[0];
    const originGoal = G.house.originGoal ? ` Your beginning: ${G.house.originGoal}` : '';
    return [
      ['travel', 'Take your first journey', 'Tap the landscape to walk. Zoom with + / −, rotate with Q / E. Roads are faster; travel advances time.' + originGoal],
      ['town', 'Visit a town', `Find town buildings on the map.${t ? ` Nearby: ${t.name}.` : ''} Enter the streets to recruit, court, shop and hear rumors.`],
      ['renown', 'Earn renown', 'Prestige in the HUD is your renown. Deeds, help on the road and victories raise it — and unlock stronger matches. Gear up before ruins.'],
      ['family', 'Grow your family', 'At the estate, open Household & Heir. Children may come with time; adoption is another path. Rest ages everyone.', () => UI.showHousehold(), 'Open household'],
      ['tree', 'Open the family tree', 'See relationships and the line you will carry forward.', () => UI.showTree(), 'Open family tree'],
      ['heir', 'Name a successor', 'In Household & Heir, name an eligible descendant as heir so the House continues when you fall.', () => UI.showHousehold(), 'Choose an heir'],
      ['estate', 'Plan your legacy', 'Improve the estate when you can. Deeds raise prosperity toward a Golden Age; prepare for the thousand-year doom.', () => UI.showEstate(), 'Inspect estate'],
    ];
  },
  // Full list (legacy entry points / review).
  show() {
    this.showGuided({ review: true });
  },
  // One step at a time — condensed guided walkthrough.
  showGuided(opts = {}) {
    const g = this.update();
    const steps = this.steps();
    let i = opts.fresh ? 0 : (opts.review ? steps.findIndex((s) => !g.done[s[0]]) : (g.step || 0));
    if (i < 0) i = steps.length - 1;
    if (opts.fresh) g.step = 0;
    const draw = (idx) => {
      g.step = idx;
      const [key, title, text, action, label] = steps[idx];
      const done = !!g.done[key];
      const body = h('div', { class: 'guide-guided' },
        h('p', { class: 'dim small' }, `Guided start · ${idx + 1} of ${steps.length}${G.house.originId ? ` · ${Origins.get(G.house.originId).name}` : ''}`),
        h('div', { class: 'guide-progress', 'aria-hidden': 'true' },
          steps.map((_, n) => h('span', { class: 'gp' + (n === idx ? ' on' : '') + (g.done[steps[n][0]] ? ' done' : '') }))),
        h('h2', {}, `${done ? '✓ ' : ''}${title}`),
        h('p', {}, text),
        action ? act(label, () => { UI.closeModal(); action(); }) : null,
        h('div', { class: 'row guide-nav' },
          idx > 0 ? act('← Back', () => UI.replaceModal(draw(idx - 1), { title: 'Starter guide', wide: true })) : null,
          idx < steps.length - 1
            ? act('Next →', () => UI.replaceModal(draw(idx + 1), { title: 'Starter guide', wide: true }), { cls: 'hl' })
            : act('Begin playing', () => { UI.closeModal(); UI.refresh(); }, { cls: 'hl' }),
        ),
        act('Skip guide', () => { UI.closeModal(); UI.refresh(); }, { sub: 'you can reopen it from the menu' }),
        act(g.hidden ? 'Show next goal while playing' : 'Hide next goal while playing', () => {
          g.hidden = !g.hidden; saveGame(); UI.closeModal(); UI.refresh();
        }),
      );
      return body;
    };
    UI.modal(draw(i), { title: 'Starter guide', wide: true });
  },
  render() {
    const g = this.update();
    let banner = document.getElementById('guide-goal');
    if (!banner) {
      banner = h('button', { id: 'guide-goal', onclick: () => this.showGuided(), 'aria-label': 'Current starter goal. Open guide' });
      document.body.append(banner);
    }
    banner.hidden = false;
    const steps = this.steps(), next = steps.find(s => !g.done[s[0]]);
    banner.textContent = next ? `Goal: ${next[1]} · ${steps.filter(s => g.done[s[0]]).length}/${steps.length}` : 'Starter goals complete · Review guide';
    if (g.hidden || Battle.active) return;
    const card = h('section', { class: 'guide-card', 'aria-label': 'Starter guide' },
      h('b', {}, next ? `Next goal: ${next[1]}` : 'Your House is ready for its next chapter'),
      h('p', { class: 'small dim' }, `${steps.filter(s => g.done[s[0]]).length}/${steps.length} starter goals complete`),
      G.house.originGoal ? h('p', { class: 'small dim' }, G.house.originGoal) : null,
      act(next ? 'Show me how' : 'Review guide', () => this.showGuided()));
    $('#panel').prepend(card);
  },
};
