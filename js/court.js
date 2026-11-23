// Retainer Court, Orphanage, Wards and Squires.
// Overflow recruits live simulated lives at court; underage wards grow in the orphanage.
'use strict';

const PARTY_CAP = 4;

GD.ESTATE.forEach((e, i) => {
  if (e.court == null) e.court = Math.max(2, e.household - 2);
  if (e.orphanage == null) e.orphanage = 2 + i;
});

const Court = {
  ensure() {
    if (!G || !G.house) return;
    G.house.court = G.house.court || [];
    G.house.orphanage = G.house.orphanage || [];
    // Drop dead / missing ids
    G.house.court = G.house.court.filter((id) => ch(id) && ch(id).alive);
    G.house.orphanage = G.house.orphanage.filter((id) => ch(id) && ch(id).alive && !isAdult(ch(id)));
  },

  partyCap() { return PARTY_CAP; },
  courtCap() { return GD.ESTATE[G.house.tier].court; },
  orphanCap() { return GD.ESTATE[G.house.tier].orphanage; },

  list() {
    this.ensure();
    return G.house.court.map(ch).filter((c) => c && c.alive && c.status === 'court');
  },
  orphans() {
    this.ensure();
    return G.house.orphanage.map(ch).filter((c) => c && c.alive && c.status === 'orphanage');
  },
  wardsOf(masterId) {
    return Object.values(G.chars).filter((c) => c.alive && c.role === 'ward' && c.masterId === masterId);
  },
  squireOf(masterId) {
    return Object.values(G.chars).find((c) => c.alive && c.role === 'squire' && c.masterId === masterId) || null;
  },
  travelingWards() {
    // Wards whose master is currently in the party (camp assist).
    return G.party.map(ch).filter(Boolean).flatMap((m) => this.wardsOf(m.id));
  },

  canTakeCourt() {
    this.ensure();
    return this.list().length < this.courtCap();
  },
  canTakeOrphan() {
    this.ensure();
    return this.orphans().length < this.orphanCap();
  },

  // Place someone in the retainer court (not party, not household).
  toCourt(c, opts = {}) {
    if (!c || !c.alive || c.id === G.mcId) return false;
    this.ensure();
    if (c.status === 'court') return true;
    if (!this.canTakeCourt() && !opts.force) return false;
    G.party = G.party.filter((id) => id !== c.id);
    // Keep ward/squire roles when parking someone at court (e.g. adult squire of a party member).
    c.status = 'court';
    c.servedHouse = true;
    if (!G.house.court.includes(c.id)) G.house.court.push(c.id);
    G.house.orphanage = G.house.orphanage.filter((id) => id !== c.id);
    return true;
  },

  summon(c) {
    if (!c || !c.alive || c.status !== 'court') return false;
    if (G.party.length >= PARTY_CAP) return false;
    if (!isAdult(c) && c.role !== 'squire') return false;
    c.status = 'party';
    G.party.push(c.id);
    G.house.court = G.house.court.filter((id) => id !== c.id);
    return true;
  },

  // Underage care.
  toOrphanage(c, opts = {}) {
    if (!c || !c.alive || isAdult(c)) return false;
    this.ensure();
    if (c.status === 'orphanage') return true;
    if (!this.canTakeOrphan() && !opts.force) return false;
    G.party = G.party.filter((id) => id !== c.id);
    G.house.court = G.house.court.filter((id) => id !== c.id);
    c.status = 'orphanage';
    c.orphaned = true;
    c.orphanYears = c.orphanYears || 0;
    if (!G.house.orphanage.includes(c.id)) G.house.orphanage.push(c.id);
    return true;
  },

  releaseOrphan(c) {
    if (!c || c.status !== 'orphanage') return false;
    G.house.orphanage = G.house.orphanage.filter((id) => id !== c.id);
    c.status = 'npc';
    c.town = randomTownIdx();
    c.role = null;
    c.masterId = null;
    return true;
  },

  clearRole(c) {
    if (!c) return;
    c.role = null;
    c.masterId = null;
  },

  assignWard(kid, master) {
    if (!kid || !master || !kid.alive || !master.alive) return false;
    if (isAdult(kid)) return false;
    if (master.id === kid.id) return false;
    // One ward slot soft-cap per master
    if (this.wardsOf(master.id).length >= 2) return false;
    kid.role = 'ward';
    kid.masterId = master.id;
    addBond(kid, master, 8);
    // Prefer orphanage or household for wards
    if (kid.status === 'npc') this.toOrphanage(kid, { force: true });
    return true;
  },

  assignSquire(youth, master) {
    if (!youth || !master || !youth.alive || !master.alive) return false;
    if (youth.id === master.id || youth.id === G.mcId) return false;
    if (!isAdult(youth) && age(youth) < GD.RACES[youth.race].maturity - 4) return false;
    // Only one squire per master
    const prev = this.squireOf(master.id);
    if (prev && prev.id !== youth.id) this.clearRole(prev);
    youth.role = 'squire';
    youth.masterId = master.id;
    youth.servedHouse = true;
    addBond(youth, master, 10);
    // Squires travel with the party when master is in party, without counting as a party slot if underage;
    // adult squires stay at court until summoned, but still enter combat with their master.
    if (youth.status === 'npc') this.toCourt(youth, { force: true });
    if (youth.status === 'orphanage') {
      G.house.orphanage = G.house.orphanage.filter((id) => id !== youth.id);
      this.toCourt(youth, { force: true });
    }
    return true;
  },

  // Yearly lives of court retainers and orphanage children.
  yearly() {
    this.ensure();
    const h = G.house;
    const court = this.list();
    // Bonds among the court
    for (let i = 0; i < court.length; i++) for (let j = i + 1; j < court.length; j++) {
      addBond(court[i], court[j], R.int(0, 4));
    }
    for (const c of court) {
      c.loyalty = clamp((c.loyalty || 0) + R.int(-2, 3), -100, 100);
      // Soft XP / formative drip so court lives feel real
      if (isAdult(c) && R.chance(0.35)) gainXp(c, 8 + c.level * 2);
      if (c.loyalty < -50 && R.chance(0.08)) {
        chron(`${c.name} left the court of House ${h.name}, seeking another path.`, 'dim', [c.id], 'leave');
        this.dismissFromCourt(c, false);
      }
    }

    // Orphanage childhood
    const kids = this.orphans();
    for (const k of kids) {
      k.orphanYears = (k.orphanYears || 0) + 1;
      // Tutors and yard shape them
      if (h.up.yard) k.bonus[R.pick(['str', 'agi', 'vit'])] += 0.2 * h.up.yard;
      if (h.up.library) { k.bonus.int += 0.15 * h.up.library; k.bonus.wil += 0.15 * h.up.library; }
      addFormative(k, 0.4 + h.up.yard * 0.1);
      // Traits crystallise over childhood
      if (!k.trait && k.orphanYears >= 2 && R.chance(0.22)) {
        k.trait = R.pick(Object.keys(GD.TRAITS));
        chron(`${k.name} shows a ${GD.TRAITS[k.trait].name.toLowerCase()} streak while under the House's care.`, 'dim', [k.id], 'grow');
      } else if (k.trait && k.orphanYears >= 4 && R.chance(0.08)) {
        const next = R.pick(Object.keys(GD.TRAITS).filter((t) => t !== k.trait));
        chron(`${k.name}'s temperament shifts from ${GD.TRAITS[k.trait].name.toLowerCase()} toward ${GD.TRAITS[next].name.toLowerCase()}.`, 'dim', [k.id], 'grow');
        k.trait = next;
      }
      // Coming of age: leave orphanage → court, town, or stay as ward briefly
      if (isAdult(k)) this.graduateOrphan(k);
    }

    // Auto-intake: freshly orphaned underage kids with no House claim
    for (const c of Object.values(G.chars)) {
      if (!c.alive || isAdult(c) || c.status === 'orphanage' || c.house === h.name) continue;
      if (!c.orphaned) continue;
      if (c.status === 'party' || c.status === 'household' || c.status === 'court') continue;
      if (this.canTakeOrphan() && R.chance(0.4)) {
        this.toOrphanage(c);
        chron(`${c.name}, an orphan of the realm, was taken into the House orphanage.`, 'dim', [c.id], 'orphan');
      }
    }
  },

  graduateOrphan(k) {
    G.house.orphanage = G.house.orphanage.filter((id) => id !== k.id);
    if (k.role === 'ward') {
      // Wards coming of age often stay as squires or join court
      if (k.masterId && ch(k.masterId) && ch(k.masterId).alive && R.chance(0.55)) {
        this.assignSquire(k, ch(k.masterId));
        chron(`${k.name} came of age and was raised as squire to ${ch(k.masterId).name}.`, 'good', [k.id, k.masterId], 'squire');
        return;
      }
      this.clearRole(k);
    }
    if (this.canTakeCourt() && R.chance(0.55)) {
      this.toCourt(k);
      chron(`${k.name} came of age in the orphanage and entered the House court.`, 'good', [k.id], 'court');
    } else if (R.chance(0.5)) {
      k.status = 'npc';
      k.town = randomTownIdx();
      chron(`${k.name} came of age and left to make their own way in the realm.`, 'dim', [k.id], 'leave');
    } else {
      // Ask via toast/log; park as household if House blood, else court/npc
      if (k.house === G.house.name) { k.status = 'household'; chron(`${k.name} came of age and waits at the estate.`, 'good', [k.id], 'age'); }
      else if (this.canTakeCourt()) { this.toCourt(k); chron(`${k.name} came of age and joined the court.`, 'good', [k.id], 'court'); }
      else { k.status = 'npc'; k.town = randomTownIdx(); chron(`${k.name} came of age and drifted into the towns.`, 'dim', [k.id], 'leave'); }
    }
  },

  dismissFromCourt(c, bitter = true) {
    G.house.court = G.house.court.filter((id) => id !== c.id);
    G.party = G.party.filter((id) => id !== c.id);
    this.clearRole(c);
    c.status = 'npc';
    c.town = randomTownIdx();
    if (bitter) { c.loyalty -= 15; c.grudge = true; }
  },

  // Combat helpers
  squiresForBattle() {
    const out = [];
    const seen = new Set();
    for (const id of G.party) {
      const m = ch(id);
      if (!m || !m.alive) continue;
      const s = this.squireOf(m.id);
      if (!s || !s.alive || seen.has(s.id)) continue;
      // Don't double-add if already in party
      if (G.party.includes(s.id)) continue;
      seen.add(s.id);
      out.push({ squire: s, master: m });
    }
    return out;
  },
};

// Migrate older saves.
Court.migrate = function () {
  this.ensure();
  for (const c of Object.values(G.chars || {})) {
    if (c.role && !['ward', 'squire'].includes(c.role)) c.role = null;
    if (c.status === 'court' && !G.house.court.includes(c.id)) G.house.court.push(c.id);
    if (c.status === 'orphanage' && !G.house.orphanage.includes(c.id)) G.house.orphanage.push(c.id);
  }
};
