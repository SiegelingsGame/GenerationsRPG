// Starter goals are saved with each House; no timers, rewards or forced actions.
'use strict';
const Guide = {
  init() {
    if (!G.guide) G.guide = { prestige: G.house.prestige, origin: { ...G.pos }, done: {}, hidden: false };
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
      Math.hypot(a.x-G.pos.x,a.y-G.pos.y)-Math.hypot(b.x-G.pos.x,b.y-G.pos.y));
    const t = towns[0];
    return [
      ['travel', 'Take your first journey', 'Tap land or a road. A glowing path shows the route first; travel takes days. Water and cliffs block you until you find bridges or boats.'],
      ['town', 'Visit a town', `${t ? `${t.name} is close. ` : ''}Follow the dashed line, then Enter. Inside you can recruit, court, shop and hear rumors.`],
      ['renown', 'Earn renown for your House', 'Do good deeds in towns, help travelers or win battles. Fame opens better marriages and recruits.'],
      ['family', 'Grow your family', 'Open House › Court. Spend time with your partner for a better chance of a child each year, or adopt a ward.', () => (UI.isMobile() ? UI.openDrawer() : UI.showHousehold()), 'Open the House'],
      ['tree', 'Explore your family tree', 'Everyone your House has ever had, living and dead. Tap anyone to see who they are.', () => UI.showTree(), 'Open family tree'],
      ['heir', 'Name your successor', 'When your head dies, the heir carries on. Without one, the House can end. Open House › Heir.', () => { UI.houseTab = 'heir'; UI.isMobile() ? UI.openDrawer() : UI.showHousehold(); }, 'Open the Heir tab'],
      ['estate', 'Plan your legacy', 'Come home to build up the estate, rest and plan for the thousand-year threat.', () => UI.showEstate(), 'Inspect estate'],
    ];
  },
  // First thing a new House sees: two big choices and an optional peek at the goals. No scrolling.
  welcome() {
    const g = this.init();
    const pick = (hidden) => { g.hidden = hidden; g.chosen = true; saveGame(); UI.closeAll(); UI.refresh(); };
    UI.modal(h('div', { class: 'gw' },
      h('p', { class: 'gw-lead' }, 'Build a House that outlives its founder. You will grow old and die; your heir plays on.'),
      h('button', { class: 'gw-choice hl', onclick: () => pick(false) },
        h('span', { class: 'gw-icon', 'aria-hidden': 'true' }, '🧭'),
        h('span', {}, h('b', {}, 'Guide me'), h('small', {}, 'One goal at a time at the top of the screen, with a hint for each.'))),
      h('button', { class: 'gw-choice', onclick: () => pick(true) },
        h('span', { class: 'gw-icon', 'aria-hidden': 'true' }, '⚔'),
        h('span', {}, h('b', {}, 'Just let me play'), h('small', {}, 'No goals on screen. Find them later under House › More.'))),
      h('button', { class: 'gw-more', onclick: () => { UI.closeAll(); this.show(); } }, 'What are the goals? ›')),
    { title: 'Your first generation', locked: true });
  },
  // The goal list: one line per goal, tap to open its hint. The next goal starts open.
  show() {
    const g = this.update(), steps = this.steps();
    const done = steps.filter((s) => g.done[s[0]]).length;
    const next = steps.find((s) => !g.done[s[0]]);
    UI.modal(h('div', { class: 'gl' },
      h('div', { class: 'gl-progress' }, h('small', {}, `${done} of ${steps.length} goals done`), bar(done, steps.length, 'pros')),
      h('div', { class: 'gl-list' }, steps.map(([key, title, text, action, label]) => h('details', { class: 'gl-step' + (g.done[key] ? ' done' : ''), open: next && next[0] === key },
        h('summary', {}, h('span', { class: 'gl-check', 'aria-hidden': 'true' }, g.done[key] ? '✓' : '○'), title),
        h('p', {}, text),
        action ? act(label, () => { UI.closeModal(); action(); }) : null))),
      h('div', { class: 'gl-foot' },
        act('Play', () => { UI.closeModal(); UI.refresh(); }, { cls: 'hl' }),
        act(g.hidden ? 'Show goals' : 'Hide goals', () => { g.hidden = !g.hidden; saveGame(); UI.closeModal(); UI.refresh(); }))),
    { title: 'Starter goals' });
  },
  render() {
    const g = this.update();
    let banner = document.getElementById('guide-goal');
    if (!banner) {
      banner = h('button', { id: 'guide-goal', onclick: () => this.show(), 'aria-label': 'Current starter goal. Open guide' });
      (UI.isMobile() && UI.mob && UI.mob.goal ? UI.mob.goal : document.body).append(banner);
    }
    banner.hidden = Battle.active || (UI.isMobile() && g.hidden);
    const steps = this.steps(), next = steps.find((s) => !g.done[s[0]]);
    banner.textContent = next
      ? `Goal: ${next[1]} · ${steps.filter((s) => g.done[s[0]]).length}/${steps.length}`
      : 'Starter goals complete · Review guide';
    if (g.hidden || Battle.active) return;
    const card = h('section', { class: 'guide-card', 'aria-label': 'Starter guide' },
      h('b', {}, next ? `Next goal: ${next[1]}` : 'Your House is ready for its next chapter'),
      h('p', { class: 'small dim' }, `${steps.filter((s) => g.done[s[0]]).length}/${steps.length} starter goals complete`),
      act(next ? 'Show me how' : 'Review guide', () => this.show()));
    $('#panel').prepend(card);
  },
};
