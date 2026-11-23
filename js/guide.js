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
    const dq = G.world && G.world.densQuests;
    if (dq && dq.main && dq.main.status === 'done') d.dens = true;
    else if (typeof densList === 'function' && dq && dq.main && !densList().some((x) => x.main && !x.cleared)) d.dens = true;
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
    const dens = (typeof densList === 'function' ? densList() : (G.world.dens || [])).find((d) => d.main && !d.cleared);
    return [
      ['travel', 'Take your first journey', 'Tap or click the landscape to walk. Scroll or use + / − to zoom, and Q / E to rotate. Roads help you explore; travel advances time.'],
      ['dens', 'Seal the starter dens', dens
        ? `A dens nest is marked on the map near ${dens.x}, ${dens.y}. Enter it in first person, delve to the nest, and clear the brood. Side quests (hunt a pack, rescue a traveler, gather trophies) unlock from dens travel and tavern news.`
        : 'The starter dens is already sealed — watch for new dens spawning over the years, and dens side quests from road events and tavern rumors.'],
      ['town', 'Visit a town', `Look for town buildings on the map.${t ? ` A nearby town is ${t.name}, at map tile ${t.x}, ${t.y}.` : ''} Walk there, then use the location actions to enter its streets. Inns, taverns and markets open as first-person interiors — talk and trade from that view.`],
      ['renown', 'Earn renown for your House', 'Renown is called Prestige in the HUD. Earn more than you started with by doing good deeds in towns, helping travelers or winning battles. Better reputation opens stronger matches. Prepare equipment and potions before risking ruins.'],
      ['family', 'Grow your family', 'At your estate, open Household & Heir to meet your family. A compatible couple may have children as years pass; births are not guaranteed. Adopt a Child is another path to an heir. Rest advances time and ages everyone, so plan before skipping years.', () => UI.showHousehold(), 'Open household'],
      ['tree', 'Explore your family tree', 'Open the family tree and select a person to see their relationships. It records the line you will carry into future generations.', () => UI.showTree(), 'Open family tree'],
      ['heir', 'Name your successor', 'In Household & Heir, select an eligible descendant and choose Name as Heir. Protect and train them: when your head of House dies, succession lets the family continue.', () => UI.showHousehold(), 'Choose an heir'],
      ['estate', 'Plan your legacy', 'Return to your estate and inspect its improvements. Invest gold when you can afford it. Deeds improve prosperity; aim for a Golden Age at 95 prosperity while preparing for the thousand-year threat.', () => UI.showEstate(), 'Inspect estate'],
    ];
  },
  show() {
    const g = this.update(), steps = this.steps();
    UI.modal([
      h('p', {}, 'Build a House that outlives its founder. Follow these goals in any order; progress is checked as you play. On a phone, open ☰ Menu to find location actions and this guide.'),
      h('p', { class: 'dim' }, `${steps.filter(s => g.done[s[0]]).length} / ${steps.length} goals complete. You can close this guide and keep playing at any time.`),
      ...steps.map(([key, title, text, action, label]) => h('section', { class: 'guide-step' },
        h('h3', {}, `${g.done[key] ? '✓ ' : ''}${title}`), h('p', {}, text),
        action ? act(label, () => { UI.closeModal(); action(); }) : null)),
      act('Continue playing', () => { UI.closeModal(); UI.refresh(); }),
      act(g.hidden ? 'Show next goal while playing' : 'Hide next goal while playing', () => {
        g.hidden = !g.hidden; saveGame(); UI.closeModal(); UI.refresh();
      }),
    ], { title: 'Your first generation' });
  },
  render() {
    const g = this.update();
    let banner = document.getElementById('guide-goal');
    if (!banner) {
      banner = h('button', { id: 'guide-goal', onclick: () => this.show(), 'aria-label': 'Current starter goal. Open guide' });
      document.body.append(banner);
    }
    banner.hidden = false;
    const steps = this.steps(), next = steps.find(s => !g.done[s[0]]);
    banner.textContent = next ? `Goal: ${next[1]} · ${steps.filter(s => g.done[s[0]]).length}/${steps.length}` : 'Starter goals complete · Review guide';
    if (g.hidden || Battle.active) return;
    const card = h('section', { class: 'guide-card', 'aria-label': 'Starter guide' },
      h('b', {}, next ? `Next goal: ${next[1]}` : 'Your House is ready for its next chapter'),
      h('p', { class: 'small dim' }, `${steps.filter(s => g.done[s[0]]).length}/${steps.length} starter goals complete`),
      act(next ? 'Show me how' : 'Review guide', () => this.show()));
    $('#panel').prepend(card);
  },
};
