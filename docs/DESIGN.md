# Generations — Game Design Concept

> A 2.5D roguelike, turn-based RPG about a family line. You will die. Your children will not start from zero.

## 1. Pillars

1. **Time is the main resource.** Every step, battle, rest and season costs days. Everyone ages — you, your partner, your companions, your rivals, the world itself.
2. **Death is a transition, not a fail state.** When the protagonist dies, the game skips ahead to when the heir is old enough to lead. The run continues as the next generation.
3. **Blood and birth matter.** Race, age, parentage, legitimacy and upbringing all change how a character plays. Family trees are a core screen, not a codex footnote.
4. **Build for the future.** Gold, prestige, estate upgrades, heirlooms and a better world are the things that carry over. The real goal is to hand the next generation a better world than the one you got.

## 2. Core loop

```
 ┌─► Explore the 2.5D overworld (time passes per step)
 │     ├─ Turn-based battles (XP, gold, prestige, risk of permanent death)
 │     ├─ Towns: recruit, court, trade, research lineage, deeds for the realm
 │     ├─ Ruins: hard battles, loot, big prestige & prosperity gains
 │     └─ Estate: invest gold, train, rest, arranged matches, family tree
 │
 ├─► Yearly tick: aging, births, marriages, deaths, corruption, eras, income
 │
 └─► Protagonist dies ─► choose heir ─► TIMESKIP until heir comes of age
         (party ages, some die, flat stat growth, world simulates on)
         └─► play as the heir (generation +1) ───────────────────────────┘
```

## 3. Characters

Every character — protagonist, partner, companion, NPC, rival — is the same data type, with:

| Field | Purpose |
|---|---|
| Race | Lifespan, maturity age, stat bias, fertility, look |
| Birth date → age | Determines life stage (see 3.2) |
| Parents / spouse / children | Family tree and genetics |
| Birth status | Highborn, Lowborn, Bastard, Orphan (see 3.3) |
| Base stats + flat bonus | STR, AGI, INT, WIL, VIT |
| Level / XP | Grows with play, scaled by age and upbringing |
| Formative points | Earned by doing things while young; permanent XP bonus and protection against elder debuffs |
| Loyalty (to the House) & bonds (to people) | Recruitment, romance, betrayal |
| Corruption | Over the years this can turn a friend into a rival |

### 3.1 Races

| Race | Comes of age | Lifespan | Fertility | Notes |
|---|---|---|---|---|
| Human | 16 | 62–85 | Normal | Balanced, quick generations |
| Orc | 11 | 44–58 | High | Strong, matures very fast, burns out fast |
| Halfling | 20 | 100–130 | Above avg | Agile, wilful, small |
| Dwarf | 25 | 180–240 | Low | Tough, long prime |
| Elf | 30 | 320–420 | Very low | Gifted, ageless, but an elf heir means a 30-year timeskip |

Mixed couples have children of either parent's race. The partner's race is a strategic choice: an elf partner gives strong, long-lived heirs, but they take decades to come of age, and your human companions grow old waiting.

### 3.2 Life stages

Stages are measured relative to each race's maturity, prime and elder ages, so a 60-year-old elf is a youth and a 60-year-old orc is long dead.

| Stage | XP mod | Physical (STR/AGI/VIT) | Mental (INT/WIL) | Other |
|---|---|---|---|---|
| Child | — | can't fight | — | Grows at the estate; trainers and tutors add stats |
| Youth | ×1.5 | ×0.92 | ×0.95 | Earns **formative points** |
| Prime | ×1.0 | ×1.0 | ×1.0 | |
| Seasoned | ×0.8 | ×0.95 | ×1.08 | |
| Elder | ×0.55 | ×0.80 | ×1.15 | Yearly illness risk |
| Venerable | ×0.3 | ×0.65 | ×1.20 | High yearly death risk |

**Formative points** (max 20, Orphans 30): +1 per battle won and +2 per deed done as a youth. Each point gives +2% XP for life and cancels 3% of physical age debuffs (up to 60%). A character who was active as a youth grows old gracefully. One who skipped youth in a timeskip doesn't.

### 3.3 Birth status

| Status | How you get it | Effect |
|---|---|---|
| Highborn | Married parents, one highborn or House prestige ≥ 40 | +10% INT/WIL, more prestige on deeds; others expect more |
| Lowborn | Married commoners | +10% STR/VIT, +5% XP ("Grit") |
| Bastard | Parents not married | +10% XP ("Driven"), random +15% stat, corruption builds faster; can be **legitimised** with prestige |
| Orphan | Both parents dead before coming of age, or a foundling | Higher formative cap, ×1.5 formative gain ("Self-Made"), lineage unknown until researched |

Researching an unknown lineage (in a tavern) can reveal hidden noble blood, a warrior line, or a tainted bloodline.

### 3.4 Genetics

A child's base stats are the average of (race base) and (both parents' effective stats, including part of their levels and bonuses), plus variance. House children also get a **legacy bonus** that grows each generation. A strong partner makes a strong heir.

## 4. Time and death

- Travel costs 15 days per tile, more for forest, hills and mountains. Horses cut that.
- Battles cost 3 days. Resting at the estate costs a season. Training costs a season.
- The calendar has 360 days per year. Each new year runs the **yearly tick**.

**Battle death:** a character reduced to 0 HP is *Fallen*. After the battle each Fallen character makes a death roll (30% base; higher for elders, lower for youths, lower with a chapel). If the whole party is wiped out, every roll is harder.

**Succession:** when the protagonist dies, you pick an heir from the living bloodline: children first, then grandchildren, then other blood relatives, then the surviving spouse as regent. If there is no one, the House ends (game over).

**Timeskip:** the game skips forward until the heir comes of age (at least one year). Every simulated year:
- the world ticks normally (births, deaths, eras, rivals),
- adult companions gain **flat** stats (half a level's worth) but **no formative points or XP mods**,
- leaderless companions risk dying (more so in wartime),
- disloyal companions may leave.

Staying alive and levelling naturally is always better than dying and skipping.

## 5. The House

**Prestige** is earned through deeds, ruins, rivals, upgrades, highborn marriages and heirs coming of age. It unlocks better partners, recruits and estate tiers.

**Estate tiers:** Hut → Farmhouse → Manor → Keep → Castle. Each tier raises yearly income, household size, retinue cap and arranged-match quality.

**Upgrades** (3 levels each):
- **Stables & Horses**: less travel time per tile.
- **Livestock**: steady income, protects against famine.
- **Training Yard**: more XP for the House; children gain stats while growing up.
- **Library & Tutors**: children come of age with INT/WIL bonuses; cheaper lineage research.
- **Chapel & Healers**: fewer battle deaths.
- **Armory & Smith**: heirlooms grow stronger every generation.
- **Retinue**: sworn soldiers who volley an enemy every combat round.

**Heirlooms** pass to each new protagonist and gain power every generation.

## 6. Relationships and family

- **Courting** a person (time + gifts) raises your bond with them. At 70 you can propose.
- **Arranged match** at the estate: pick 1 of 3 candidates, the same as the opening choice. Candidate quality depends on prestige and estate tier. If a new protagonist comes of age unmarried, they're offered one at once.
- **Remarriage (widow / widower):** the House is monogamous. `spouseOf` only counts a *living* spouse, so when a spouse dies the head (or any playable adult) may court and propose again, or use **Seek a new spouse** at the estate, household, tavern, or town streets. Suggested prospects filter for mutual attraction, availability, and not-too-close kin. A road **prospect** event can introduce a remarriage match while you travel. Chronicle notes the remarriage; children of the prior marriage keep their place; succession is unchanged except that a new spouse may bear or adopt further heirs.
- **Companions bond** with each other through battles and years together, marry, and have children.
- Companions' children grow up in towns and can be **found and recruited** later, with known lineage.
- Children of the House and of companions who grow up together become **childhood friends**.

## 6b. Identity, attraction and the body

Under the deck, every person is simulated as a whole person:

- **Gender** (man or woman) and **orientation** (straight, gay or lesbian, bisexual, asexual) decide who they are drawn to. Only a man and a woman can have children together.
- **Type:** some people have a particular type: sapiosexual (INT), drawn to strength (STR), drawn to kindness (WIL), drawn to beauty (looks) or drawn to status (high birth). It scales how fast bonds grow and who they marry.
- **Body:** height, build and looks are inherited from both parents with some variation, and each slightly shifts stats.
- **Conditions** (lame, weak heart, clouded eye, deaf). Some run in families.
- **Infertility** is hidden. A couple only finds out after years of trying.
- **Kin choose for themselves.** Heirs and kin marry by their own nature, so a gay heir may marry someone they can't have children with.
- **Forced matches:** the head of House can force an arranged match that "can give an heir". The forced person's bond with the head drops sharply. Unless the head mends it (time together, gifts, a heart-to-heart that can go badly, a public apology), they may renounce the House or turn against it as a rival.
- **Adoption** of orphans and foundlings gives any couple heirs who carry the House name and its legacy, but not its blood.

### Betrayal

Every non-House adult builds **corruption** each year. It builds faster during war and famine, for bastards and orphans, and for people with a grudge against the House. Loyalty, bonds with the current protagonist and being in the party slow it down. At 100 the character **turns against the House** and becomes a **Rival**: a named boss who levels up each year and ambushes you on the road. Your heir's childhood friend can end up as the villain of the next generation.

## 7. The world

The land goes through **eras**, each 6–15 years long:

| Era | Income | Encounters | Births | Other |
|---|---|---|---|---|
| Abundance | ×1.3 | ×0.8 | ×1.4 | |
| Peace | ×1.1 | ×0.6 | ×1.0 | Festivals |
| Famine | ×0.6 | ×1.2 | ×0.5 | Ghouls; Aid the Starving deed |
| War | ×0.8 | ×1.5 | ×0.8 | Raiders & knights; Answer the Muster deed; more XP and prestige |
| Golden Age | ×1.5 | ×0.4 | ×1.5 | **Victory condition** |

**Prosperity (0–100)** is the world's long-term health. Deeds, cleared ruins and defeated rivals raise it. War and famine wear it down. Prosperity weights which era comes next, so each generation's work makes the next era more likely to be a good one. Reaching 95 prosperity starts the **Golden Age**, which is the goal of the whole game.

## 7b. The thousand years

- **Opening (Random Lineage only):** before founding, a skipable chronicle cutscene shows a forgotten age’s champions fighting the Hollow King with spectacle spells, losing, and the King attempting to unmake the timeline. Something resets the weave; the King flees into a mother’s womb seeking “the right bloodline.” The player’s House is that bloodline’s continuation (`Game.playOpeningCutscene` / `js/opening-cutscene.js`).
- **The doom:** the world ends 1,000 years after the House is founded, when the Hollow King comes forth from the Black Spire, unless the House destroys it first.
- **Quests:** each generation gets a quest: recover a Seal from a ruin, slay a Herald, rally three towns with deeds, raise a champion, or relight a beacon shrine on a far island.
- **Wards:** every quest completed raises a Ward, and each Ward takes 3 levels off the Hollow King, which otherwise grows stronger every year. Seven Wards make it beatable.
- **The final battle:** you can assault the Spire at any time. When the 1,000 years run out, the final battle happens wherever the House stands.
- **The map:** a 44×44 world of mainland and islands, with grassland, forest, jungle, swamp, desert, tundra, hills and mountains.
- **Technology** arrives at thresholds whose timing differs every run, and some inventions never arrive at all:
  - sailing boats (~70–140 years in), needed to reach the islands
  - paved roads
  - carriages
  - steamships
  - railways
  - flying machines (fly straight to any tile)
- **Towns** grow and shrink with the era and the world's prosperity. They can fall to ruin (and become delvable ruins), be resettled in good times, or be founded anew. This happens during time skips too, so the heir may inherit a different realm.

## 6c. Culture, kinship and attractiveness

- **Attractiveness** (0–10) comes from inherited looks, youth, scars, conditions and inbreeding. It raises everyone's attraction toward a person.
- **Kinship:** the game computes real kinship, both the relationship (parent, sibling, half-sibling, grandparent, aunt or uncle, first or second cousin and so on) and how much blood a pair shares, using Wright's coefficient.
- **Taboo:** each era's people tolerate unions up to a certain closeness.
  - Townsfolk only marry within that limit, and even then they mostly look beyond the family.
  - Parents and grandparents never pair off on their own.
  - The House can still arrange a match within the family, at the cost of a scandal if the era forbids it.
- **Inbreeding:** children of close kin carry that inbreeding, which raises their chance of conditions and infertility and lowers their stats and looks.
- **Culture:** the House records every choice: love or duty in marriage, close kin or outsiders, martial or scholarly, open or insular, charitable or ambitious, accepting or rigid.
  - Each person's influence is weighted by the years they lived as an adult.
  - Once 5 people have belonged to the House, its culture forms and gets a name.
  - Culture only changes how the people of each era see the House. Its distance from the era's own values, minus lingering scandal, sets a reputation (Revered to Scorned), which scales courting, hiring, matches and prestige.

## 7c. The road and the campfire

**Road events:** a step through the wilds can turn up any of these, weighted by biome and era (traders in peace, refugees in war and famine, mines in hills and desert):
- **Traders:** cheap potions, gear, tonics that permanently raise a stat, and maps that reveal caves and mines.
- **Ambushes**, which come more often near bandit camps.
- **People in need:** a cart in the mud, refugees, starving families, a wounded traveler who may join you, wolves at a farm. Helping raises prestige and prosperity and pushes the culture toward charity. Sometimes it's a ruse.
- **Lost children**, who can be adopted, taken to a town, or left behind (and remember it).
- **Wanderers** who ask to join.
- **Mines:** working one takes 20 days and pays gold based on STR. Cave-ins can injure, and the seam runs out.
- **Caves and dungeons:** a crawl of several rooms. Fights can be sneaked past with AGI, chests may be trapped, there are traps to beat with AGI or INT, healing springs, altars that strengthen the heirloom, and a boss at the end.

**Bandit camps:**
- Attack a camp when you find it, or leave it.
- A camp you leave grows every year (faster in war and famine), shows up on the map, stunts nearby towns, raids them, and can become a Bandit Stronghold.
- New camps appear unseen in hard times.

**The campfire:**
- *Make camp* anywhere in the wilds to open a first-person view from the head of House: night sky, a horizon that matches the biome, a flickering fire with sparks, warm light falling off into the dark, and your own hands held to the flames (just one if you lost an arm).
- Your companions sit across the fire, drawn with their age, race, injuries and armour.
- **Talking:** click someone to talk. What they say comes from who they are: resentment over a forced marriage, kinship, old wounds, age, traits, the era, the doom, and their own memories from the Chronicle.
- **Other actions:** share stories (bonds and formative growth), sleep, or rest with a watch (less healing, safer from night attacks).
- **Sound:** an optional fire crackle.

**Entering a town (first person):** *Enter Town* walks you into a street drawn in perspective. Its size, mood and light follow the town and the era: banners and smoke in war, thin stalls in famine, a distant keep in cities.
- Tap the **Tavern**, **Market**, **Inn** or **Notice Board** (deeds for the realm and the current prophecy task) to use them.
- **Residents:** the town's actual residents stand in the street. Tap one to hear them speak in their own voice (lineage, grudges, traits, the era, how the people of this era see your House), then recruit, court, propose, research their lineage, or **ask for news**.
- **Rumors:** *Buy rumors* (a round of drinks) gives intel that changes what you know. It can:
  - reveal hidden bandit camps and caves
  - tell you which way the current task lies
  - report where rivals are
  - expose someone's secret lineage
  - tip you off to who fancies you
  - hint at inventions to come, or how other towns are faring
- The quick town options stay in the side panel for speed.

## 7d. The living map

The world moves only when your party moves.
- **Moving:** tap a destination and the party walks there smoothly along the best path. Days pass in proportion to the ground covered and its terrain. Standing still freezes everything: the calendar, caravans, bandits and rivals.
- **Visible parties** share the road:
  - **Caravans** travel between towns and feed their growth. You can trade with them or rob them (gold, but prestige, reputation and charity suffer).
  - **Bandit war bands** come out of camps (more as a camp grows), prowl around it, hunt down caravans (starving the towns they were bound for), and chase your party if they think they can win. They flee if you're stronger.
  - **Refugees** walk the roads in war and famine and can be given aid.
  - **Rivals** hunt your House across the land.
- **Sight:** you only see parties within your party's sight range (longer on hills, shorter in forests). Anything outside it is unseen.
- **Choosing your battles:** each party shows a label with its danger (Weak, Even, Strong, Deadly) and a red "!" when it's hunting you. Tap a party to pursue it; meeting one opens a card: fight, bribe, flee (better with horses), trade, rob, help or leave.
- **Unseen dangers:** ambushes and road events (traders, people in need, mines, caves, camps) can still strike as you cross the land.
- **Map size:** new worlds are 64×64 tiles with proportionally more towns, ruins and shrines.

**Landscape and free movement:**
- **Terrain:** the world is drawn as one continuous landscape instead of tiles: a smooth height field with blended biomes, hill shading, highland contour lines and natural coastlines, laid out in the 2.5D view. Trees, peaks, settlements and parties stand upright on it.
- **Rivers** flow downhill from the highlands to the sea. They block travel except at **bridges** (on roads, or standalone crossings with tracks off each bank) and the occasional **ford**.
- **Roads** connect the estate and the towns on each landmass and are much faster to travel.
- **Sheer peaks** are impassable.
- **Free movement:** tap any point and the party walks there in any direction, along a route found on a fine navigation grid (three cells per region) and then straightened. It curves only for rivers, sea, cliffs and rough ground.
- **Time** passes only while you move: days per step come from the ground underfoot (roads fast, swamps slow).
- **Other parties** follow the same free routes.
- **Underneath,** the old tiles remain as regions for biomes, towns and encounters.

## 8. Combat (turn-based)

- Up to 4 party members against 1–4 enemies, in initiative order by AGI.
- **Focus:** +1 per turn, max 3. Skills cost 2.
- Actions: Attack, Signature Skill (set by the highest stat), Defend (halves damage, +1 focus), Potion, Flee (wild battles only).
- Signature skills: **Cleave** (STR, hits all), **Flurry** (AGI, two hits with high crit), **Firebolt** (INT), **Mend** (WIL, heals), **Bulwark** (VIT, taunt + guard).
- Your House retinue volleys an enemy at the start of each round.

## 8b. Classes

Every character has a class. You choose yours at founding. Others take theirs from their strongest stats, and sometimes inherit a parent's calling. Each class shapes stat growth, combat numbers, weapon and passive, and gives two abilities plus a third at level 5. Abilities cost focus (1–3).

| Class | Role | Passive | Abilities |
|---|---|---|---|
| Warrior | Hard physical hits, protects the party | Steady: −15% damage taken | Heavy Blow (190%, pierces armour) · Shield Wall (party −35% damage, taunt) · Cleave |
| Berserker | Huge damage, low defence, reckless | Rage: up to +60% damage as health drops | Reckless Strike (210%, costs 8% health, exposes self) · Bloodlust (+50% damage, lifesteal) · Whirlwind |
| Sorcerer | Innate magic | Basic attacks are arcane bolts that ignore most armour | Firebolt · Frost Nova (all, slows) · Arcane Shield (absorb) |
| Priest | Healing | Last Rites: fallen allies far less likely to die | Mend · Prayer (heal all) · Smite (double vs undead) |
| Bard | Support | Party earns +15% XP | Inspire (+25% damage, 3 rounds) · Rally (+1 focus, small heal) · Dissonance (enemies lose half their armour) |
| Ranger | Precision | +10% crit chance | Aimed Shot · Volley · Hunter's Mark (+30% damage taken) |
| Knight | High defence, precision attacks | Plate and precision: −20% damage taken; every attack pierces a quarter of armour and crits more often | Precision Strike (170%, +30% crit, pierces armour) · Riposte (guard 2 rounds, counter-attacks every attacker) · Challenge (marks a foe and draws its attacks) |

Status effects (inspired, bloodlust, guarded, shielded, exposed, slowed, marked, riposte) show as markers over each fighter. The battle AI picks abilities by role: heal the wounded, shield or guard, buff, rally, mark, then area or single-target damage.

Mid-battle, opening a party character sheet shows **combat info only** (ATK/DEF/MAG, focus, potions on your turn, enemy knowledge). Estate social actions, equipment try-on, courtship and household management stay out of battle.

## 8c. Enemy lore (House familiarity)

The House remembers foes. Knowledge is stored on `G.house.lore[enemyType]` (0–**20**), persists across fights and saves.

| Event | Gain |
|---|---|
| First hit on a given enemy unit in a battle | +1 |
| That enemy is defeated | +2 |

| Bonus (per knowledge point) | Cap at 20 |
|---|---|
| Damage dealt to that type | +0.5% → **+10%** |
| Damage taken from that type | −0.4% → **−8%** |

Bands for the UI: I (1–5), II (6–10), III (11–15), IV (16–20). Inspect an enemy in battle (tap the field or a lore tag) or open a party member mid-fight to see lines like `Known: Bandit II — +6% dmg / +5% resist`.

## 9. 2.5D presentation

- Isometric world built from height-extruded tiles. Lighting shifts with the era: warm gold in Abundance, cold grey in Famine, red haze in War.
- Characters are drawn procedurally and show their **race** (ears, beards, tusks, height) and **age** (children are small, elders are grey and stooped). You can watch your hero grow old.
- The estate building on the map changes as you upgrade it, from hut to castle.
- Battles play out on an isometric arena with lunges, hit flashes and floating numbers.

## 10. Prototype scope (this repository)

Implemented in the playable concept (`index.html`):

- [x] House founding: name, race, birth status, choosing 1 of 3 partners
- [x] Random Lineage opening cutscene: throwaway high-level party vs the Hollow King (PackArt god-spell VFX), forced defeat, timeline reset, King seeks the bloodline; skipable (Esc / Skip), then normal QuickStart founding
- [x] Aging, life stages, XP modifiers, formative points, old-age death
- [x] Isometric overworld with towns, ruins and the estate; time cost per step
- [x] Turn-based combat with skills, focus, retinue, flee, permanent death
- [x] Battle-only party popup actions; House enemy lore (familiarity damage/resist)
- [x] Yearly world simulation: births, marriages, bastards, orphans, corruption, rivals
- [x] Eras, prosperity, Golden Age victory
- [x] Succession, heir choice and timeskip with flat growth
- [x] Estate tiers, upgrades, heirlooms, arranged matches
- [x] Taverns: recruiting, courting, lineage research, legitimisation
- [x] Remarriage after spouse death: Seek a new spouse / court / propose; prospect road event; monogamy enforced while spouse lives
- [x] Family tree and character sheets
- [x] Save/load (browser storage)

- [x] Equipment slots and inventory try-on: class kits choose armour or robes, helms or crowns, blades/staves/bows, boots or shoes; house stash; Kasaya UI frames
- [x] Mobile Here/Menu split, grouped place actions, and news popups for births, marriages, deaths, income and eras

Future work: authored quests and story events, more enemy and skill variety, rival houses with politics, sprite art, music, and a balance pass.
