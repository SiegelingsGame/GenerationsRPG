// Ten unique story starts: tribulations, goals, starting gear and wealth.
'use strict';

GD.ORIGINS = {
  exile: {
    name: 'The Exile',
    goal: 'Reclaim a name that was stripped from you.',
    scene: 'road',
    weight: 1,
    preferBirth: ['bastard', 'orphan'],
    preferCls: ['warrior', 'ranger', 'berserker'],
    story: [
      'They cast you out at dawn. No trial worth the name — only a sealed letter and the road.',
      'What little you kept fits in a sack: a blade that still remembers your hand, and a scar that will not let you forget.',
      'Somewhere ahead, a House can be built that no council can unmake.',
    ],
    effects: { gold: -40, prestige: -8, potions: 1, gearTier: 2, rarityBias: 'uncommon', injury: 'scarred', trait: 'ambitious' },
    grant: { kind: null, hand: true, rarity: 'uncommon', skill: 'cleave' },
  },
  warOrphan: {
    name: 'War Orphan',
    goal: 'Raise a family that war cannot break.',
    scene: 'ruins',
    weight: 1,
    preferBirth: ['orphan'],
    preferCls: ['warrior', 'priest', 'ranger'],
    story: [
      'The banners burned before you could read them. You buried strangers beside kin and kept walking.',
      'Formative years hardened you early. Soft beds feel wrong; a campfire feels like home.',
      'If a House begins with you, let it be one that shelters the next generation.',
    ],
    effects: { gold: -20, prestige: 0, potions: 2, formative: 4, birthForce: 'orphan', gearTier: 1, rarityBias: 'low', trait: 'hardy' },
  },
  disinherited: {
    name: 'Disinherited Heir',
    goal: 'Build a seat that outshines the one that cast you off.',
    scene: 'estate',
    weight: 1,
    preferBirth: ['highborn', 'bastard'],
    preferCls: ['knight', 'sorcerer', 'bard'],
    story: [
      'The will named another. The servants looked away. Your mother\'s ring was all they dared press into your palm.',
      'High blood without a hall is a joke in every tavern — until the joke learns to rule.',
      'Gold enough for a start. Pride enough to refuse a quiet life.',
    ],
    effects: { gold: 80, prestige: 5, potions: 1, birthForce: 'highborn', gearTier: 1, rarityBias: 'rare' },
    grant: { slot: 'ring', kind: 'ring', tier: 3, rarity: 'rare', passive: 'scholar', name: 'Mother\'s Signet' },
  },
  veteran: {
    name: 'Battlefield Veteran',
    goal: 'Teach the next generation to fight smarter than you did.',
    scene: 'camp',
    weight: 1,
    preferBirth: ['lowborn'],
    preferCls: ['warrior', 'berserker', 'knight', 'ranger'],
    story: [
      'You lived through a war that ate better fighters. The price was a limb and a reputation.',
      'Your kit is worn but honest. Recruits listen when you speak; they flinch when you don\'t.',
      'A House needs more than steel. It needs someone who has already paid the cost.',
    ],
    effects: { gold: 40, prestige: 8, potions: 3, gearTier: 3, rarityBias: 'uncommon', injury: 'lostArm', trait: 'brave', level: 2 },
    grant: { hand: true, rarity: 'rare', passive: 'laststand' },
  },
  merchant: {
    name: 'Ruined Merchant',
    goal: 'Turn coin and deeds into lasting prosperity.',
    scene: 'town',
    weight: 1,
    preferBirth: ['lowborn'],
    preferCls: ['bard', 'ranger', 'sorcerer'],
    story: [
      'A caravan burned. Ledgers turned to ash. Creditors still smile like knives.',
      'You kept a pouch of seed-gold and the habit of counting exits.',
      'Trade can raise a House as surely as a sword — if the realm still has roads to walk.',
    ],
    effects: { gold: 220, prestige: -5, potions: 2, gearTier: 1, rarityBias: 'uncommon', trait: 'charming' },
    grant: { slot: 'amulet', kind: 'amulet', tier: 2, rarity: 'uncommon', passive: 'thrifty', name: 'Ledger Charm' },
  },
  foundling: {
    name: 'Temple Foundling',
    goal: 'Ward the dark before it claims another generation.',
    scene: 'shrine',
    weight: 1,
    preferBirth: ['orphan'],
    preferCls: ['priest', 'sorcerer', 'bard'],
    story: [
      'Left at a chapel door with a scrap of cloth and a fever. The priests named you; the gods never wrote back.',
      'You learned rites before letters, and fear of the Hollow before fear of hunger.',
      'A House of wards and prayers may yet stand when kings fall.',
    ],
    effects: { gold: 30, prestige: 4, potions: 4, formative: 3, birthForce: 'orphan', gearTier: 1, rarityBias: 'uncommon', clsForce: 'priest' },
    grant: { hand: true, kind: 'staff', tier: 2, rarity: 'rare', skill: 'smite', passive: 'warding', name: 'Chapel Staff' },
  },
  debtor: {
    name: 'Bandit\'s Debt',
    goal: 'Earn loyalty that cannot be bought — or collected.',
    scene: 'camp',
    weight: 1,
    preferBirth: ['lowborn', 'bastard'],
    preferCls: ['berserker', 'ranger', 'warrior'],
    story: [
      'You ran with wolves until the wolves named a price. Leaving cost blood; staying would have cost more.',
      'A notched axe and a debt you still whisper about when the fire burns low.',
      'Companions will test you. Prove you are more than the company you fled.',
    ],
    effects: { gold: -80, prestige: -4, potions: 1, gearTier: 2, rarityBias: 'uncommon', corruption: 25, trait: 'loyal', injury: 'scarred' },
    grant: { hand: true, kind: 'axe', tier: 2, rarity: 'uncommon', skill: 'flurry', name: 'Debt-Axe' },
  },
  shipwreck: {
    name: 'Shipwrecked Noble',
    goal: 'Restore a seat the sea tried to erase.',
    scene: 'shore',
    weight: 1,
    preferBirth: ['highborn'],
    preferCls: ['knight', 'sorcerer', 'bard'],
    story: [
      'The storm took the ship, the household, and the maps. You woke on black sand with salt in your mouth.',
      'A ring clung to your finger as if the tide owed you one kindness.',
      'Nobility without a coast is only a story — unless you make land answer.',
    ],
    effects: { gold: 20, prestige: 12, potions: 1, birthForce: 'highborn', gearTier: 1, rarityBias: 'high', trait: 'wise' },
    grant: { slot: 'ring', kind: 'ring', tier: 4, rarity: 'epic', passive: 'scholar', skill: 'inspire', name: 'Tideborn Band' },
  },
  cursed: {
    name: 'Cursed Blood',
    goal: 'Redeem a line the realm already fears.',
    scene: 'ruins',
    weight: 1,
    preferBirth: ['bastard', 'orphan'],
    preferCls: ['sorcerer', 'bard', 'priest'],
    story: [
      'Whispers followed your cradle. A tainted secret, a night-eye, a gift that burns as it lights.',
      'Villages close shutters when you pass. Ruins open like invitations.',
      'If the Hollow is coming, a cursed House may be the only one willing to meet it halfway.',
    ],
    effects: { gold: 50, prestige: -10, potions: 2, gearTier: 2, rarityBias: 'rare', secret: 'tainted', lineageKnown: true, corruption: 15, clsForce: 'sorcerer' },
    grant: { hand: true, kind: 'orb', tier: 2, rarity: 'epic', skill: 'firebolt', passive: 'bloodthirst', name: 'Ashen Orb' },
  },
  farmer: {
    name: 'Quiet Farmer',
    goal: 'Survive a thousand years by rising slowly and refusing to break.',
    scene: 'fields',
    weight: 1.2,
    preferBirth: ['lowborn'],
    preferCls: ['warrior', 'ranger', 'priest', 'bard'],
    story: [
      'No prophecy. No exile. Only seasons, livestock, and a roof that leaked every spring.',
      'You named a House the way you named a field: hoping it would feed someone after you.',
      'Empires forget farmers. The doom will not. Be ready anyway.',
    ],
    effects: { gold: 90, prestige: 2, potions: 2, gearTier: 1, rarityBias: 'low', trait: 'hardy', livestock: 1 },
  },
};

const Origins = {
  list() { return Object.keys(GD.ORIGINS); },

  pick(sel = {}) {
    const weights = {};
    for (const [id, o] of Object.entries(GD.ORIGINS)) {
      let w = o.weight || 1;
      if (sel.birth && (o.preferBirth || []).includes(sel.birth)) w *= 2.2;
      if (sel.cls && (o.preferCls || []).includes(sel.cls)) w *= 1.6;
      weights[id] = w;
    }
    return R.weighted(weights);
  },

  get(id) { return GD.ORIGINS[id] || GD.ORIGINS.farmer; },

  apply(mc, originId) {
    const o = this.get(originId);
    const e = o.effects || {};
    G.house.originId = originId;
    G.house.originGoal = o.goal;
    if (e.birthForce) {
      if (e.birthForce === 'orphan') { mc.orphaned = true; mc.birth = 'lowborn'; mc.lineageKnown = true; mc.secret = mc.secret || 'common'; mc.formative = Math.max(mc.formative || 0, 2); }
      else mc.birth = e.birthForce;
    }
    if (e.clsForce) mc.cls = e.clsForce;
    if (e.trait) mc.trait = e.trait;
    if (e.level) mc.level = Math.max(mc.level || 1, e.level);
    if (e.formative) mc.formative = Math.max(mc.formative || 0, e.formative);
    if (e.corruption != null) mc.corruption = Math.max(mc.corruption || 0, e.corruption);
    if (e.secret) { mc.secret = e.secret; mc.lineageKnown = e.lineageKnown !== false; }
    if (e.gold) G.house.gold = Math.max(0, G.house.gold + e.gold);
    if (e.prestige) G.house.prestige = Math.max(0, G.house.prestige + e.prestige);
    if (e.potions) G.house.potions = Math.max(0, G.house.potions + e.potions);
    if (e.livestock) G.house.up.livestock = Math.max(G.house.up.livestock || 0, e.livestock);
    // Clear default seed kit when origin grants its own story gear.
    Equip.ensureChar(mc);
    if (o.grant || e.gearTier) {
      for (const slot of Object.keys(mc.equip || {})) mc.equip[slot] = null;
      Equip.syncLegacy(mc);
    }
    if (e.gearTier) Equip.seedStarter(mc, e.gearTier, { rarityBias: e.rarityBias || 'low' });
    if (o.grant) this.grantStory(mc, o.grant, e);
    if (e.injury && GD.INJURIES[e.injury]) {
      mc.injuries = mc.injuries || [];
      if (!mc.injuries.includes(e.injury)) mc.injuries.push(e.injury);
    }
    mc.hp = maxHp(mc);
    return o;
  },

  grantStory(mc, g, e) {
    const kit = Equip.kitFor(mc);
    const opts = {
      rarity: g.rarity, skill: g.skill || null, passive: g.passive || null,
      name: g.name, mods: g.mods || [], force: true,
    };
    if (g.hand) {
      Equip.grant(mc, g.kind || kit.hand, g.tier || e.gearTier || 2, opts);
      return;
    }
    if (g.kind) {
      Equip.grant(mc, g.kind, g.tier || e.gearTier || 2, opts);
      return;
    }
    if (g.slot && kit[g.slot]) Equip.grant(mc, kit[g.slot], g.tier || 2, opts);
  },

  // Painted "photo" of the beginning: scene + founder vignette.
  photo(mc, originId, w = 520, h = 200) {
    const o = this.get(originId);
    const cv = document.createElement('canvas');
    const d = 2;
    cv.width = w * d; cv.height = h * d;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.className = 'origin-photo';
    const ctx = cv.getContext('2d');
    ctx.scale(d, d);
    const scenes = {
      road:   { sky: ['#2a3348', '#6a5a48'], ground: '#3a3428', accent: '#8a6a3a' },
      ruins:  { sky: ['#1e1a28', '#4a3a48'], ground: '#2e2a30', accent: '#6a5a6a' },
      estate: { sky: ['#3a4a5a', '#8a9aaa'], ground: '#4a6a3a', accent: '#c8b070' },
      camp:   { sky: ['#1a2030', '#5a3a28'], ground: '#2a2418', accent: '#ff8a3d' },
      town:   { sky: ['#3a4558', '#7a6a58'], ground: '#4a4038', accent: '#d4b05a' },
      shrine: { sky: ['#2a2840', '#5a4a70'], ground: '#2a2a38', accent: '#fff3a0' },
      shore:  { sky: ['#2a4058', '#6a8aaa'], ground: '#c8b888', accent: '#3b78a8' },
      fields: { sky: ['#5a7a98', '#c8b070'], ground: '#5a8a3a', accent: '#e0c27a' },
    };
    const sc = scenes[o.scene] || scenes.road;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sc.sky[0]); g.addColorStop(0.55, sc.sky[1]); g.addColorStop(1, sc.ground);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // ground band
    ctx.fillStyle = sc.ground;
    ctx.fillRect(0, h * 0.62, w, h * 0.38);
    // scene props
    ctx.fillStyle = sc.accent;
    if (o.scene === 'camp' || o.scene === 'road') {
      ctx.beginPath(); ctx.moveTo(w * 0.18, h * 0.7); ctx.lineTo(w * 0.28, h * 0.48); ctx.lineTo(w * 0.38, h * 0.7); ctx.fill();
    }
    if (o.scene === 'ruins' || o.scene === 'shrine') {
      ctx.fillRect(w * 0.12, h * 0.35, 18, h * 0.35); ctx.fillRect(w * 0.2, h * 0.42, 14, h * 0.28);
      ctx.fillRect(w * 0.72, h * 0.38, 22, h * 0.32);
    }
    if (o.scene === 'shore') {
      ctx.fillStyle = '#3b78a8'; ctx.fillRect(0, h * 0.55, w, h * 0.12);
    }
    if (o.scene === 'fields') {
      for (let i = 0; i < 8; i++) ctx.fillRect(20 + i * 28, h * 0.58, 3, h * 0.18);
    }
    if (o.scene === 'estate' || o.scene === 'town') {
      ctx.fillStyle = '#3a3030';
      ctx.fillRect(w * 0.08, h * 0.4, 50, h * 0.3);
      ctx.fillRect(w * 0.12, h * 0.32, 18, 14);
    }
    // vignette
    const vg = ctx.createRadialGradient(w * 0.55, h * 0.55, h * 0.1, w * 0.5, h * 0.5, h * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,6,12,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    // founder
    const saved = Render.ctx;
    Render.ctx = ctx;
    try {
      Render.drawFigure(w * 0.72, h * 0.88, figLook(mc), 2.1, { weapon: figLook(mc).weapon });
    } finally { Render.ctx = saved; }
    // frame
    ctx.strokeStyle = 'rgba(212,176,90,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(20,16,24,0.55)';
    ctx.fillRect(14, 14, Math.min(280, w * 0.5), 36);
    ctx.fillStyle = '#ffd76a';
    ctx.font = '600 16px Georgia, serif';
    ctx.fillText(o.name, 24, 38);
    return cv;
  },
};
