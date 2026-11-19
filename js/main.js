// Game controller: founding a house, travel, actions, battles, succession.
'use strict';

const Game = {
  busy: false,
};

Game.boot = function () {
  Render.init($('#view'));
  UI.init();
  this.title();
};

Game.title = function () {
  const can = hasSave();
  UI.modal(h('div', { class: 'title' },
    h('h1', {}, 'Generations'),
    h('p', { class: 'tag-line' }, 'A roguelike RPG about a family line. You will die. Your children will carry on.'),
    can ? act('Continue your House', () => { if (loadGame()) { UI.closeAll(); this.enterWorld(); } else UI.toast('Save could not be loaded.'); }, { cls: 'hl' }) : null,
    act('Found a new House', () => { UI.closeAll(); this.create(); }),
    act('How to play', () => UI.showHelp()),
  ), { locked: true });
};

// ---------------------------------------------------------------- founding
Game.create = function () {
  newGame();
  const sel = { race: 'human', birth: 'lowborn', color: GD.HOUSE_COLORS[0], name: genName('human'), house: R.pick(GD.HOUSE_NAMES),
    gender: 'man', orientation: 'straight', pref: 'none', height: 'average', build: 'average' };
  const pick = (id, label, key, table, extra) => h('label', {}, label, ' ',
    h('select', { id, onchange: (e) => { sel[key] = e.target.value; if (extra) extra(); } },
      Object.entries(table).map(([k, v]) => h('option', { value: k, selected: sel[key] === k }, v.name))));
  const draw = () => {
    const body = h('div', { class: 'create' },
      h('div', { class: 'row' },
        h('label', {}, 'Your name ', h('input', { value: sel.name, oninput: (e) => { sel.name = e.target.value; } })),
        h('label', {}, 'House ', h('input', { value: sel.house, oninput: (e) => { sel.house = e.target.value; } })),
        h('div', { class: 'colors' }, GD.HOUSE_COLORS.map((c) => h('span', { class: 'swatch' + (sel.color === c ? ' on' : ''), style: `background:${c}`, onclick: () => { sel.color = c; UI.replaceModal(draw(), opts); } })))),
      h('h4', {}, 'Who you are'),
      h('div', { class: 'choices two' }, Object.entries(GD.GENDERS).map(([k, g]) => h('div', { class: 'choice' + (sel.gender === k ? ' on' : ''), onclick: () => { sel.gender = k; UI.replaceModal(draw(), opts); } },
        portrait({ race: sel.race, gender: k, hairStyle: k === 'man' ? 'crop' : 'long', beard: false, hair: '#5a3a22', tunic: '#3d5a80', alive: true, born: G.day - (GD.RACES[sel.race].maturity + 4) * DAYS_PER_YEAR, lifespan: 999, height: sel.height, build: sel.build }, 60),
        h('b', {}, `${g.sym} ${g.name}`)))),
      h('div', { class: 'row idrow' },
        pick('c-orient', 'Drawn to', 'orientation', GD.ORIENTATIONS),
        pick('c-pref', 'Type', 'pref', GD.PREFERENCES),
        pick('c-height', 'Height', 'height', GD.HEIGHTS, () => UI.replaceModal(draw(), opts)),
        pick('c-build', 'Build', 'build', GD.BUILDS, () => UI.replaceModal(draw(), opts))),
      h('p', { class: 'dim small' }, `${GD.ORIENTATIONS[sel.orientation].desc} ${GD.PREFERENCES[sel.pref].desc || ''} Your partner choices follow from this. Only a man and a woman can have children together; anyone can adopt.`),
      h('h4', {}, 'Race'),
      h('div', { class: 'choices' }, Object.entries(GD.RACES).map(([k, r]) => h('div', { class: 'choice' + (sel.race === k ? ' on' : ''), onclick: () => { sel.race = k; sel.name = genName(k); UI.replaceModal(draw(), opts); } },
        racePortrait(k), h('b', {}, r.name), h('small', {}, `Comes of age at ${r.maturity} · lives ${r.life[0]}–${r.life[1]}`), h('small', { class: 'dim' }, r.desc)))),
      h('h4', {}, 'Birth'),
      h('div', { class: 'choices' }, Object.entries(GD.BIRTH).map(([k, b]) => h('div', { class: 'choice' + (sel.birth === k ? ' on' : ''), onclick: () => { sel.birth = k; UI.replaceModal(draw(), opts); } },
        h('b', {}, b.name), h('small', { class: 'dim' }, b.desc),
        h('small', {}, k === 'highborn' ? 'Start: +10 prestige, +100 gold' : k === 'lowborn' ? 'Start: +1 potion' : k === 'bastard' ? 'Start: −3 prestige' : 'Start: no family, +2 formative')))),
      act('Next: choose your partner →', () => { if (!sel.name.trim() || !sel.house.trim()) return UI.toast('Name yourself and your House.'); this.found(sel); }, { cls: 'hl' }),
    );
    return body;
  };
  const opts = { title: 'Found your House', wide: true, locked: true };
  UI.modal(draw(), opts);
};

function racePortrait(race) {
  return portrait({ race, hair: '#5a3a22', tunic: '#3d5a80', evil: false, alive: true, born: G.day - (GD.RACES[race].maturity + 4) * DAYS_PER_YEAR, lifespan: GD.RACES[race].life[1] }, 60);
}

Game.found = function (sel) {
  UI.closeAll();
  G.house.name = sel.house.trim().slice(0, 20);
  G.house.color = sel.color;
  const r = GD.RACES[sel.race];
  const mc = makeChar({
    name: sel.name.trim().slice(0, 20), race: sel.race, birth: sel.birth === 'orphan' ? 'lowborn' : sel.birth,
    born: G.day - (r.maturity + Math.max(1, Math.round((r.primeEnd - r.maturity) * 0.08))) * DAYS_PER_YEAR - 40,
    house: G.house.name, status: 'party', loyalty: 100, corruption: 0, weapon: 1, trait: R.pick(['brave', 'wise', 'hardy', 'charming', 'ambitious', 'loyal']),
    gender: sel.gender, orientation: sel.orientation, pref: sel.pref, height: sel.height, build: sel.build,
    condition: null, infertile: R.chance(0.04), orientKnown: true, beard: sel.gender === 'man' ? R.chance(0.4) : sel.race === 'dwarf',
  });
  if (sel.birth === 'orphan') { mc.orphaned = true; mc.formative = 2; mc.lineageKnown = true; mc.secret = 'common'; }
  if (sel.birth === 'highborn') { G.house.prestige += 10; G.house.gold += 100; mc.gear.armor = 1; }
  if (sel.birth === 'lowborn') G.house.potions++;
  if (sel.birth === 'bastard') G.house.prestige = 0;
  mc.hp = maxHp(mc);
  G.mcId = mc.id;
  G.founderId = mc.id;
  G.party = [mc.id];
  G.house.heroes = [mc.id];
  G.house.reigns = [{ id: mc.id, from: year(), to: null, gen: 1 }];
  G.house.heirloom = makeHeirloom();
  this.matchmaker(mc, { opening: true });
};

// Find a spouse for someone of the House (the head, or one of their kin).
// Candidates follow the person's own orientation unless the House overrides it.
function compatibleGenders(c) {
  const other = c.gender === 'man' ? 'woman' : 'man';
  return { straight: [other], gay: [c.gender], bi: [other, c.gender], ace: [other, c.gender] }[c.orientation || 'straight'];
}
Game.matchmaker = function (who, opts = {}) {
  const mc = ch(G.mcId);
  const self = who.id === G.mcId;
  const opening = !!opts.opening;
  const forHeir = !!opts.forHeir;
  const tier = opening ? 0 : maxPartnerTier();
  const genders = forHeir ? [who.gender === 'man' ? 'woman' : 'man'] : compatibleGenders(who);
  const kinMode = !!opts.kin;
  const kinList = Object.values(G.chars).filter((c) => c.alive && c.id !== who.id && isAdult(c) && !c.evil && !spouseOf(c) && c.status !== 'candidate' && kinship(who, c).sev > 0)
    .sort((a, b) => kinship(who, b).sev - kinship(who, a).sev);
  const cands = kinMode ? kinList.slice(0, 9) : [genPartner(tier, who, genders), genPartner(Math.max(0, tier - 1), who, genders), genPartner(tier, who, genders)];
  const discard = (keep) => { if (!kinMode) discardCandidates(cands, keep); };
  const canSwitch = who.orientation !== 'straight';
  const done = (chosen) => {
    discard(chosen ? chosen.id : null);
    UI.closeAll();
    if (chosen) {
      if (!opening && !kinMode) G.house.gold -= chosen.dowry;
      if (kinMode && chosen.status !== 'npc') marry(who, chosen);
      else { chosen.status = 'npc'; joinHouse(chosen, who); }
      if (chosen.birth === 'highborn') G.house.prestige += 5;
      const against = attraction(who, chosen) === 0;
      if (kinship(who, chosen).sev) kinScandal(who, chosen);
      recordChoice('love', against ? -1 : 0.4, mc ? mc.id : who.id);
      if (against && who.orientation !== 'straight' && who.gender !== chosen.gender) recordChoice('accept', -1, mc ? mc.id : who.id);
      if (!kinship(who, chosen).sev) recordChoice('kin', -0.3, mc ? mc.id : who.id);
      if (against) {
        who.forced = true; chosen.forced = true;
        addBond(who, chosen, -15);
        if (!self) {
          addBond(who, mc, -55);
          who.loyalty = clamp(who.loyalty - 30, -100, 100);
          who.forcedBy = mc.id;
          chron(`${who.name} was forced by ${mc.name} to marry ${chosen.name}, against their heart. ${who.name} will not forget it.`, 'bad', [who.id, chosen.id, mc.id], 'forced');
        } else chron(`${who.name} married ${chosen.name} out of duty to the House, not love.`, 'dim', [who.id, chosen.id], 'duty');
      } else if (!self) addBond(who, mc, 8);
      if (!opening) advanceDays(15);
    }
    if (opening) this.enterWorld(true);
    else this.after();
  };
  const note = (c) => {
    const k = kinship(who, c);
    const kinNote = k.sev ? h('small', { class: k.sev > eraKinTolerance() ? 'bad' : 'dim' }, `${who.name}'s ${k.rel} · ${k.sev > eraKinTolerance() ? 'taboo in this era: a scandal' : 'accepted in this era'} · shared blood ${Math.round(k.coef * 100)}%`) : null;
    const kids = canConceive(who, c) ? null : (who.gender === c.gender ? 'No children together. Adoption is possible.' : null);
    const love = attraction(who, c) === 0 ? (self ? 'A marriage of duty: no love on your side.' : `Against ${who.name}'s heart: they will resent you.`) : (attraction(who, c) > 1.15 ? `${who.name} is strongly drawn to them.` : null);
    return [kinNote, kids ? h('small', { class: 'bad' }, kids) : null, love ? h('small', { class: attraction(who, c) === 0 ? 'bad' : 'good' }, love) : null];
  };
  const intro = opening
    ? 'Every House begins with a union. Choose who will be the other parent of your line. Their blood will shape your heirs.'
    : self
      ? `A matchmaker presents three suitors. With ${Math.round(G.house.prestige)} prestige and a ${GD.ESTATE[G.house.tier].name}, you can attract tier ${tier} matches.`
      : `A match for ${who.name} (${GD.GENDERS[who.gender].name}, ${GD.ORIENTATIONS[who.orientation].name}${who.pref !== 'none' ? ', ' + GD.PREFERENCES[who.pref].name.toLowerCase() : ''}).`;
  const body = h('div', {},
    h('p', { class: 'dim' }, intro),
    h('div', { class: 'choices partners' }, cands.map((c) => h('div', { class: 'choice' },
      portrait(c, 110),
      h('b', {}, c.name), h('small', {}, UI.charLine(c)),
      h('small', {}, `${bodyText(c)}${c.condition ? ' · ' + GD.CONDITIONS[c.condition].name : ''}`),
      h('small', {}, `${GD.BIRTH[birthKey(c)].name}${c.trait ? ' · ' + GD.TRAITS[c.trait].name : ''} · L${c.level} · Power ${power(c)}`),
      h('small', { class: 'dim' }, STATS.map((k) => `${STAT_NAMES[k]} ${stat(c, k).toFixed(0)}`).join(' · ')),
      h('small', { class: 'dim' }, `${orientationText(c)}`),
      h('small', { class: 'dim' }, `Children would come of age at ~${GD.RACES[c.race].maturity} (if ${GD.RACES[c.race].name})`),
      note(c),
      act(opening ? 'Choose' : kinMode ? 'Marry' : `Marry (${c.dowry}g)`, () => done(c), { cls: 'hl', disabled: !opening && !kinMode && G.house.gold < c.dowry })))),
    kinMode && !cands.length ? h('p', { class: 'dim' }, `${who.name} has no unmarried adult kin.`) : null,
    h('div', { class: 'row' },
      !opening && !kinMode ? act('Seek a match within the family', () => { discard(null); UI.closeAll(); this.matchmaker(who, { ...opts, kin: true, forHeir: false }); }, { sub: 'keep the blood close, if the era allows' }) : null,
      kinMode ? act('Back to outside matches', () => { UI.closeAll(); this.matchmaker(who, { ...opts, kin: false }); }) : null,
      canSwitch && !forHeir && !kinMode ? act(self ? 'Seek a match who can give you an heir' : `Force a match that can give an heir`, () => { discard(null); UI.closeAll(); this.matchmaker(who, { ...opts, forHeir: true }); }, { cls: self ? '' : 'danger', sub: self ? 'a marriage of duty' : `${who.name} will hate you for it` }) : null,
      forHeir ? act('Back to matches of the heart', () => { discard(null); UI.closeAll(); this.matchmaker(who, { ...opts, forHeir: false }); }) : null,
      !opening ? act('Decline for now', () => done(null)) : null),
    kinMode ? h('p', { class: 'dim small' }, 'Close-kin unions concentrate the blood: children are more likely to be born with conditions, infertile, weaker and plainer.') : null,
  );
  UI.modal(body, { title: opening ? 'Choose your Partner' : self ? 'Arranged Match' : `A Match for ${who.name}`, wide: true, locked: true });
};
Game.choosePartner = function (opening) { this.matchmaker(ch(G.mcId), { opening }); };
function maxPartnerTier() {
  let t = 0;
  GD.PARTNER_TIER_PRESTIGE.forEach((p, i) => { if (G.house.prestige >= p) t = i; });
  return Math.min(t, GD.ESTATE[G.house.tier].partnerTier + 1);
}
Game.arrangedMatch = function () { this.choosePartner(false); };

Game.enterWorld = function (fresh) {
  G.mode = 'world';
  Render.camInit = false;
  if (fresh) {
    chron(`${ch(G.mcId).name} founds House ${G.house.name} in the ${era().name}. The ${G.house.heirloom.name} is its first heirloom.`, 'head', [G.mcId], 'head');
    Log.add('Tip: travel to towns to recruit and court, clear ruins for prestige, and invest at your estate.', 'dim');
  }
  UI.refresh();
  saveGame();
};

// ---------------------------------------------------------------- travel
Game.clickTile = function (t) {
  if (this.busy || UI.modalStack.length || Battle.active) return;
  if (t.x === G.pos.x && t.y === G.pos.y) return;
  const dist = Math.abs(t.x - G.pos.x) + Math.abs(t.y - G.pos.y);
  if (hasTech('flight') && dist > 3) return this.fly(t);
  const path = findPath(tileAt(G.pos.x, G.pos.y), t);
  if (!path || !path.length) return UI.toast(isWater(t) || (isLand(t) && t.land !== tileAt(G.pos.x, G.pos.y).land) ? 'You need boats to cross the sea. Sailing has not been invented yet.' : 'You cannot travel there.');
  this.travel(path);
};

Game.fly = function (t) {
  this.busy = true;
  const dist = Math.abs(t.x - G.pos.x) + Math.abs(t.y - G.pos.y);
  Render.move = { from: { ...G.pos }, to: { x: t.x, y: t.y }, t0: performance.now(), dur: 900, fly: true };
  setTimeout(() => {
    Render.move = null;
    G.pos = { x: t.x, y: t.y };
    advanceDays(Math.max(2, dist * 1.5));
    this.busy = false;
    if (G.pendingSuccession || G.pendingVictory || G.pendingDoom) return this.after();
    this.arrive();
  }, 920);
};

Game.travel = function (path) {
  this.busy = true;
  const step = () => {
    if (!path.length) { this.busy = false; this.arrive(); return; }
    const next = path.shift();
    const from = { ...G.pos };
    Render.move = { from, to: { x: next.x, y: next.y }, t0: performance.now(), dur: 190 };
    setTimeout(() => {
      Render.move = null;
      G.pos = { x: next.x, y: next.y };
      advanceDays(moveDays(next));
      for (const id of G.party) { const c = ch(id); if (c) c.hp = Math.min(maxHp(c), c.hp + maxHp(c) * 0.04); }
      UI.refresh();
      if (G.pendingSuccession || G.pendingVictory || G.pendingDoom) { this.busy = false; return this.after(); }
      const q = G.world.doom.quest;
      if (next.feature || (q && q.x === next.x && q.y === next.y)) { path.length = 0; return step(); }
      if (isWater(next)) return step();
      // ambush by rivals
      const rivals = Object.values(G.chars).filter((c) => c.alive && c.status === 'rival');
      if (rivals.length && R.chance(0.05 * rivals.length)) { this.busy = false; return this.rivalBattle(R.pick(rivals)); }
      if (R.chance(0.26 * Math.sqrt(era().enc) * ({ forest: 1.2, hills: 1.2, mountain: 1.3, jungle: 1.3, swamp: 1.3, desert: 1.1, snow: 1.1 }[next.type] || 1))) {
        this.busy = false;
        return Events.show(Events.roll(next));
      }
      step();
    }, 200);
  };
  step();
};

Game.arrive = function () {
  const t = tileAt(G.pos.x, G.pos.y);
  const q = G.world.doom.quest;
  if (q && q.x === t.x && q.y === t.y) {
    if (q.type === 'herald') return this.heraldBattle();
    if (q.type === 'beacon') {
      if (R.chance(0.5)) {
        return this.battle(buildEncounter(t, { hard: true, count: 3 }), { kind: 'dungeon', title: 'Guardians of the Beacon',
          after: (res) => { if (res.outcome === 'victory') completeQuest(); } });
      }
      completeQuest();
    }
  }
  if (t.feature === 'town') Log.add(`Arrived at ${G.world.towns[t.townIdx].name}.`, 'dim');
  if (t.feature === 'estate') {
    Log.add('Home at last.', 'dim');
    for (const id of G.party) { const c = ch(id); if (c) c.hp = Math.min(maxHp(c), c.hp + maxHp(c) * 0.3); }
  }
  UI.refresh();
  saveGame();
};

// ---------------------------------------------------------------- battle
Game.battle = function (enemies, opts) {
  UI.targeting = null;
  if (TownView.open) TownView.close();
  Battle.start({
    enemies, kind: opts.kind, title: opts.title,
    intro: opts.intro,
    onEnd: (res) => {
      UI.refresh();
      UI.battleResults(res, () => { if (opts.after) opts.after(res); this.after(); });
    },
  });
  UI.battleChanged();
};

Game.rivalBattle = function (rv) {
  const mc = ch(G.mcId);
  const minions = buildEncounter(tileAt(G.pos.x, G.pos.y), { count: R.int(1, 2) }).map((e) => ({ ...e, type: R.pick(['bandit', 'raider', 'cultist']) }));
  const u = unitFromChar(rv, 'enemy', 0, true);
  const past = bond(rv, mc) > 20 ? ` "You remember me, ${mc.name}? I remember everything."` : '';
  this.battle([u, ...minions], { kind: 'rival', title: `Rival: ${rv.name}`, intro: `${rv.name} ambushes you!${past}` });
};

Game.delve = function (t) {
  this.battle(buildEncounter(t, { hard: true, count: clamp(G.party.length + R.int(0, 1), 2, 4) }), {
    kind: 'dungeon', title: 'The Ruins',
    after: (res) => {
      if (res.outcome !== 'victory') return;
      t.cleared = (t.cleared || 0) + 1;
      t.clearedYear = year();
      const loot = Math.round(120 * era().income * (1 + partyLevel() * 0.2));
      G.house.gold += loot;
      G.house.prestige += 6 + (ch(G.mcId).birth === 'highborn' ? 2 : 0);
      G.house.potions += 1;
      addProsperity(5);
      G.party.map(ch).forEach((c) => addFormative(c, 2));
      const q = G.world.doom.quest;
      if (q && q.type === 'seal' && q.x === t.x && q.y === t.y) completeQuest();
      chron(`${ch(G.mcId).name}'s party cleared the ruins. Treasure: ${loot}g and a potion. Prestige +6, Prosperity +5.`, 'good', G.party.slice(), 'deed');
    },
  });
};

Game.heraldBattle = function () {
  const lvl = Math.max(3, Math.ceil(partyLevel()) + 1); // a quest foe is never far beyond the House's strength
  const enemies = [{ type: 'herald', lvl }, { type: 'cultist', lvl: lvl - 1 }, { type: 'wraith', lvl: lvl - 2 }];
  this.battle(enemies, { kind: 'dungeon', title: 'The Herald', intro: `The Herald of ${GD.VILLAIN.name} rises from the earth!`,
    after: (res) => { if (res.outcome === 'victory') completeQuest(); } });
};
// The last battle: at the Black Spire, or wherever the House stands when the thousand years end.
Game.finalBattle = function (forced) {
  const d = G.world.doom;
  const lvl = villainLevel();
  const enemies = [{ type: 'hollow', lvl }, { type: 'herald', lvl: lvl - 4 }, { type: 'herald', lvl: lvl - 5 }];
  const warded = d.wards >= GD.WARDS_NEEDED;
  this.battle(enemies, {
    kind: 'final', title: GD.VILLAIN.name,
    intro: warded ? `The wards blaze. ${GD.VILLAIN.name} is weakened, but not beaten.` : `${GD.VILLAIN.name} rises, strong with the years. Only ${d.wards} wards stand against it.`,
    after: (res) => {
      if (res.outcome === 'victory') {
        G.world.saved = true;
        d.ended = true;
        chron(`${ch(G.mcId) ? ch(G.mcId).name : 'House ' + G.house.name} destroyed ${GD.VILLAIN.name}. The world endures.`, 'head', [G.mcId, ...G.party], 'final');
        G.pendingSaved = true;
      } else if (forced) {
        d.ended = true;
        chron(`${GD.VILLAIN.name} ended the world in the year ${year()}.`, 'bad', [], 'final');
        G.pendingWorldEnd = true;
      }
    },
  });
};

// ---------------------------------------------------------------- estate & town actions
Game.rest = function (days) {
  advanceDays(days);
  for (const id of G.party) { const c = ch(id); if (c) c.hp = maxHp(c); }
  Log.add(days >= 360 ? 'A quiet year passes at the estate.' : 'The party rests for a season.', 'dim');
  this.after();
};
Game.train = function () {
  advanceDays(90);
  recordChoice('martial', 0.4, G.mcId);
  for (const id of G.party) {
    const c = ch(id);
    if (!c || !c.alive) continue;
    const g = gainXp(c, 25 + c.level * 6 + G.house.up.yard * 15);
    addFormative(c, 0.5);
    Log.add(`${c.name} trains: +${g} XP.`, 'dim');
  }
  this.after();
};
Game.inn = function () {
  G.house.gold -= 10;
  advanceDays(7);
  for (const id of G.party) { const c = ch(id); if (c) c.hp = maxHp(c); }
  Log.add('The party rests at the inn.', 'dim');
  this.after();
};
Game.deed = function (town, kind) {
  const mc = ch(G.mcId);
  const hb = mc.birth === 'highborn' ? 1 : 0;
  const amb = mc.trait === 'ambitious' ? 1 : 0;
  const finish = (pros, pres, text) => {
    town.deedYear = year();
    addProsperity(pros);
    G.house.prestige += pres + hb + amb;
    G.party.map(ch).forEach((c) => { addFormative(c, 2); c.loyalty = clamp(c.loyalty + 3, -100, 100); });
    chron(`${text} Prosperity +${pros}, Prestige +${pres + hb + amb}.`, 'good', G.party.slice(), 'deed');
    recordChoice('charity', 1, G.mcId);
    const q = G.world.doom.quest;
    if (q && q.type === 'rally' && !q.progress.includes(town.name)) {
      q.progress.push(town.name);
      if (q.progress.length >= q.count) completeQuest();
      else Log.add(`Rally the Realm: ${q.progress.length}/${q.count} towns.`, 'good');
    }
  };
  if (kind === 'aid') { G.house.gold -= 120; advanceDays(10); finish(4, 3, `House ${G.house.name} feeds the starving of ${town.name}.`); }
  if (kind === 'festival') {
    G.house.gold -= 80; advanceDays(5);
    Object.values(G.chars).filter((c) => c.alive && c.town === G.world.towns.indexOf(town) && c.status === 'npc').forEach((c) => { c.loyalty += 4; c.corruption = Math.max(0, c.corruption - 8); });
    finish(1, 4, `A festival in ${town.name} wins the people's hearts.`);
  }
  if (kind === 'roads') { G.house.gold -= 160; advanceDays(10); finish(5, 1, `New roads and wells are built near ${town.name}.`); }
  if (kind === 'muster') {
    const enemies = [];
    for (let i = 0; i < 4; i++) enemies.push({ type: R.pick(['raider', 'raider', 'knight']), lvl: Math.max(1, Math.round(partyLevel() + 1)) });
    return this.battle(enemies, {
      kind: 'muster', title: `The Muster of ${town.name}`,
      after: (res) => { if (res.outcome === 'victory') finish(6, 7, `House ${G.house.name} held the line at ${town.name}.`); else town.deedYear = year(); },
    });
  }
  this.after();
};

Game.recruit = function (c) {
  if (householdCount() >= GD.ESTATE[G.house.tier].household) return UI.toast('Your household is full. Improve your estate.');
  G.house.gold -= hireCost(c);
  c.loyalty = clamp(c.loyalty + 20, -100, 100);
  c.corruption = Math.max(0, c.corruption - 15);
  if (G.party.length < 4) { c.status = 'party'; G.party.push(c.id); } else c.status = 'household';
  c.servedHouse = true;
  const parentComp = c.parents.map(ch).find((p) => p && p.alive && (p.status === 'party' || p.status === 'household'));
  if (parentComp) { addBond(c, parentComp, 15); c.loyalty += 10; }
  if (c.lineageKnown && c.secret === 'noble') G.house.prestige += 2;
  recordChoice('open', 0.6, G.mcId);
  chron(`${c.name} joins House ${G.house.name}${c.status === 'household' ? ' (waiting at the estate)' : ''}.`, 'good', [c.id], 'join');
  this.after();
};
Game.court = function (c) {
  const mc = ch(G.mcId);
  G.house.gold -= 20;
  advanceDays(10);
  const att = attraction(c, mc);
  c.orientKnown = true;
  let gain;
  if (att === 0) {
    gain = R.int(1, 4);
    addBond(c, mc, gain);
    UI.toast(`${c.name} enjoys your company, but isn't drawn to you that way (${GD.ORIENTATIONS[c.orientation].name}).`);
  } else {
    gain = Math.round((R.int(8, 15) + Math.round(stat(mc, 'wil') / 3) + (G.house.prestige > 30 ? 3 : 0) - (c.birth === 'highborn' && mc.birth !== 'highborn' ? 4 : 0)) * Math.min(1.5, att));
    addBond(c, mc, gain);
    UI.toast(`You spend time with ${c.name}. Bond +${gain} (${Math.round(bond(c, mc))}).${att > 1.15 ? ' They seem taken with you.' : ''}`);
  }
  Log.add(`${mc.name} courts ${c.name}.`, 'dim');
  this.after(true);
};
Game.propose = function (c) {
  const mc = ch(G.mcId);
  if (c.status === 'npc' && householdCount() >= GD.ESTATE[G.house.tier].household) return UI.toast('Your household is full. Improve your estate.');
  if (attraction(c, mc) === 0) return UI.toast(`${c.name} does not feel that way about you.`);
  const wasStatus = c.status;
  if (wasStatus !== 'npc') { c.house = G.house.name; marry(mc, c); c.loyalty = Math.max(c.loyalty, 60); }
  else joinHouse(c, mc);
  if (kinship(mc, c).sev) kinScandal(mc, c);
  else recordChoice('kin', -0.3, mc.id);
  recordChoice('love', 1, mc.id);
  if (mc.gender === c.gender) recordChoice('accept', 1, mc.id);
  if (c.birth === 'highborn') G.house.prestige += 5;
  this.after();
};
// ---- relationships: mend or deepen bonds with your kin and companions
Game.interact = function (c, kind) {
  const mc = ch(G.mcId);
  let gain = 0, text;
  if (kind === 'time') {
    advanceDays(7);
    gain = R.int(3, 8) + (mc.trait === 'charming' ? 2 : 0) + (!isAdult(c) ? 3 : 0);
    text = !isAdult(c) ? `${mc.name} spends a week with young ${c.name}.` : `${mc.name} and ${c.name} spend time together.`;
  } else if (kind === 'gift') {
    G.house.gold -= 30;
    gain = R.int(5, 11);
    text = `${mc.name} gives ${c.name} a gift.`;
  } else if (kind === 'talk') {
    advanceDays(14);
    if (R.chance(clamp(0.45 + stat(mc, 'wil') / 40 + (c.trait === 'loyal' ? 0.15 : 0), 0.2, 0.9))) {
      gain = R.int(12, 20);
      text = `${mc.name} and ${c.name} talk long into the night. Old wounds begin to close.`;
    } else {
      gain = -R.int(3, 8);
      text = `${mc.name} tries to talk with ${c.name}. It ends in shouting.`;
    }
  } else if (kind === 'apology') {
    G.house.prestige = Math.max(0, G.house.prestige - 5);
    c.apologised = true;
    gain = 20;
    c.loyalty = clamp(c.loyalty + 10, -100, 100);
    text = `${mc.name} publicly asks ${c.name}'s forgiveness for the forced marriage.`;
    recordChoice('love', 0.8, mc.id);
  }
  addBond(c, mc, gain);
  if (bond(c, mc) > 0 && c.forcedBy) {
    c.forcedBy = null;
    chron(`${c.name} has forgiven ${mc.name}.`, 'good', [c.id, mc.id], 'forgive');
  } else Log.add(`${text} (bond ${gain >= 0 ? '+' : ''}${gain})`, gain >= 0 ? 'good' : 'bad', [c.id]);
  UI.toast(`${text} Bond ${gain >= 0 ? '+' : ''}${gain} → ${Math.round(bond(c, mc))}.`);
  this.after(true);
};

// ---- adoption: an orphan of the realm becomes a child of the House
Game.adoptables = function () {
  let list = Object.values(G.chars).filter((c) => c.alive && c.status === 'npc' && !isAdult(c) && (c.orphaned || c.parents.every((p) => !ch(p) || !ch(p).alive)));
  if (list.length < 3) {
    for (let i = list.length; i < 3; i++) {
      const race = randomRace();
      const k = makeChar({ race, born: G.day - R.int(0, Math.max(1, GD.RACES[race].maturity - 2)) * DAYS_PER_YEAR, birth: 'lowborn', lineageKnown: false, secret: R.weighted({ noble: 1, warrior: 1, common: 4, tainted: 0.6 }), corruption: 0 });
      k.orphaned = true; k.foundling = true;
      list.push(k);
    }
  }
  return list.slice(0, 6);
};
Game.adopt = function (k) {
  const mc = ch(G.mcId);
  const sp = spouseOf(mc);
  G.house.gold -= 40;
  k.house = G.house.name;
  k.status = 'household';
  k.adoptedBy = [mc.id, sp ? sp.id : null].filter(Boolean);
  k.loyalty = 45; k.corruption = 0;
  mc.children.push(k.id);
  if (sp) sp.children.push(k.id);
  const legacy = Math.floor(G.house.generation / 2);
  for (const s2 of STATS) k.bonus[s2] += legacy;
  addBond(k, mc, 25);
  if (sp) addBond(k, sp, 20);
  if (!G.heirId) G.heirId = k.id;
  recordChoice('open', 1, mc.id);
  chron(`${mc.name}${sp ? ' and ' + sp.name : ''} adopted ${k.name}${k.foundling ? ', a foundling' : ', an orphan'}, into House ${G.house.name}.`, 'birth', [k.id, mc.id], 'adopt');
  this.after();
};

Game.research = function (c) {
  const cost = Math.max(10, 40 - G.house.up.library * 10);
  G.house.gold -= cost;
  c.lineageKnown = true;
  recordChoice('martial', -0.4, G.mcId);
  const s = GD.SECRETS[c.secret || 'common'];
  for (const k in s.bonus) c.bonus[k] += s.bonus[k];
  c.corruption += s.corruption;
  Log.add(`You research ${c.name}'s lineage: ${s.name}.`, c.secret === 'tainted' ? 'bad' : 'good');
  UI.toast(`${c.name}: ${s.name}.`);
  this.after(true);
};
Game.legitimise = function (c) {
  G.house.prestige -= 10;
  c.legit = true;
  recordChoice('open', 0.5, G.mcId); recordChoice('accept', 0.6, G.mcId);
  chron(`${c.name} is legitimised and recognised as a true child of House ${G.house.name}.`, 'good', [c.id], 'legit');
  this.after(true);
};
Game.toParty = function (c) { if (G.party.length >= 4) return; c.status = 'party'; G.party.push(c.id); this.after(true); };
Game.toHousehold = function (c) {
  if (c.id === G.mcId) return;
  c.status = 'household'; G.party = G.party.filter((id) => id !== c.id); this.after(true);
};
Game.dismiss = function (c) {
  c.status = 'npc'; c.town = randomTownIdx();
  G.party = G.party.filter((id) => id !== c.id);
  c.loyalty -= 20; c.grudge = true;
  recordChoice('open', -0.8, G.mcId);
  chron(`${c.name} was dismissed and leaves bitter.`, 'bad', [c.id], 'leave');
  this.after();
};
Game.buyGear = function (c, slot, cost) { G.house.gold -= cost; c.gear[slot]++; this.after(true); };
Game.buyPotion = function () { if (G.house.gold < 25) return; G.house.gold -= 25; G.house.potions++; this.after(true); };
Game.upgradeEstate = function () {
  const next = GD.ESTATE[G.house.tier + 1];
  G.house.gold -= next.cost;
  G.house.tier++;
  G.house.prestige += next.gain || 0;
  recordChoice('charity', -0.8, G.mcId);
  chron(`House ${G.house.name} raises a ${next.name}! Prestige +${next.gain}.`, 'good', [G.mcId], 'estate');
  this.after(true);
};
Game.buyUpgrade = function (k) {
  const u = GD.UPGRADES[k];
  G.house.gold -= u.cost[G.house.up[k]];
  G.house.up[k]++;
  G.house.prestige += 2;
  Log.add(`Built ${u.name} (level ${G.house.up[k]}).`, 'good');
  this.after(true);
};
Game.hireRetinue = function (cost) { G.house.gold -= cost; G.house.retinue++; Log.add('A new soldier swears to the House.', 'good'); this.after(true); };

// ---------------------------------------------------------------- after every action
Game.after = function (quiet) {
  if (TownView.open && (G.pendingSuccession || G.pendingVictory || G.pendingSaved || G.pendingWorldEnd || G.pendingDoom)) TownView.close();
  if (G.pendingVictory) {
    G.pendingVictory = false;
    UI.closeAll();
    UI.endScreen({
      title: 'A Golden Age',
      text: `Through ${G.house.generation} generation(s), House ${G.house.name} has healed the land. Prosperity has reached ${Math.round(G.world.prosperity)}, and a Golden Age begins. This is the story of your line so far.`,
      actions: act('Continue the line', () => { UI.closeModal(); this.after(); }, { cls: 'hl' }),
    });
    return;
  }
  if (G.pendingSaved) {
    G.pendingSaved = false;
    UI.closeAll();
    return UI.endScreen({ title: 'The World Endures', text: `${GD.VILLAIN.name} is destroyed in the year ${year()}, after ${G.house.generation} generation(s) of House ${G.house.name} and ${G.world.doom.wards} wards raised against the dark. This is the story of your line.`,
      actions: act('Live on in the saved world', () => { UI.closeModal(); this.after(); }, { cls: 'hl' }) });
  }
  if (G.pendingWorldEnd) {
    G.pendingWorldEnd = false;
    deleteSave();
    UI.closeAll();
    return UI.endScreen({ title: 'The End of the World', text: `In the year ${year()}, ${GD.VILLAIN.name} unmade the world. House ${G.house.name} stood until the last, through ${G.house.generation} generation(s), with ${G.world.doom.wards} of ${GD.WARDS_NEEDED} wards raised.`,
      actions: act('Begin a new world', () => location.reload(), { cls: 'hl' }) });
  }
  if (G.pendingDoom && !Battle.active) {
    G.pendingDoom = false;
    UI.closeAll();
    if (!G.party.length || !ch(G.mcId) || !ch(G.mcId).alive) { G.pendingWorldEnd = true; G.world.doom.ended = true; return this.after(); }
    UI.modal(h('div', { class: 'title' }, h('h1', {}, 'The Thousand Years Are Over'),
      h('p', {}, `${GD.VILLAIN.name} comes forth from ${GD.VILLAIN.seat} to end the world. House ${G.house.name} must stand now, with ${G.world.doom.wards} of ${GD.WARDS_NEEDED} wards.`),
      act('Face the end', () => { UI.closeModal(); this.finalBattle(true); }, { cls: 'hl' })), { locked: true });
    return;
  }
  TownView.sync();
  if (G.pendingSuccession) return this.succession();
  const q = G.world.doom && G.world.doom.quest;
  if (q && q.type === 'champion' && G.party.map(ch).some((c) => c && c.level >= q.count)) completeQuest();
  if (G.world.doom && !G.world.doom.quest && !G.world.doom.ended) newQuest();
  UI.refresh();
  if (!quiet) saveGame();
};

// The head of House is dead: no choosing, no regency. The heir is named by
// custom (the designated heir, else the eldest of the blood) and the years turn.
Game.succession = function () {
  const dead = ch(G.mcId);
  UI.closeAll();
  if (!heirCandidates().length) return this.lineEnd(dead);
  const startYear = year();
  const before = {};
  const watch = new Set();
  const note = (c) => { if (c && !before[c.id]) { before[c.id] = snapshot(c); watch.add(c.id); } };
  heirCandidates().slice(0, 2).forEach((x) => note(x.c));
  G.party.map(ch).forEach(note);
  skipPeople().filter((c) => c.house === G.house.name).forEach(note);
  skipPeople().forEach(note);
  let events = [];
  let heir = null;
  let lineEnded = false;
  for (let guard = 0; guard < 8; guard++) {
    const cands = heirCandidates();
    if (!cands.length) { lineEnded = true; break; }
    const next = (cands.find((x) => x.c.id === G.heirId) || cands[0]).c;
    note(next);
    heir = next;
    const res = performTimeskip(heir);
    events = events.concat(res.events);
    if (!res.heirDied) break;
  }
  const people = [...watch].map(ch).filter(Boolean)
    .sort((a, b) => (b.id === heir.id) - (a.id === heir.id) || (b.house === G.house.name) - (a.house === G.house.name) || a.born - b.born)
    .slice(0, 10);
  G.mode = 'world';
  saveGame();
  UI.timeline({ dead, heir, startYear, endYear: year(), events, before, people: people.map((c) => c.id), lineEnded }, () => {
    if (lineEnded) return this.lineEnd(dead);
    Render.camInit = false;
    if (!spouseOf(heir) && isAdult(heir)) this.choosePartner(false);
    else this.after();
  });
};

Game.lineEnd = function (dead) {
  deleteSave();
  UI.closeAll();
  UI.endScreen({
    title: 'The Line Ends',
    text: `${dead.name} died (${dead.cause}) and no one of the blood remains. House ${G.house.name} lasted ${G.house.generation} generation(s), from ${START_YEAR} to ${year()}. This is its story.`,
    actions: act('Found a new House', () => location.reload(), { cls: 'hl' }),
  });
};

window.addEventListener('load', () => Game.boot());
