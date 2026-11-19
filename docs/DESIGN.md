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
- **Companions bond** with each other through battles and years together, marry, and have children.
- Companions' children grow up in towns and can be **found and recruited** later, with known lineage.
- Children of the House and of companions who grow up together become **childhood friends**.

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

## 8. Combat (turn-based)

- Up to 4 party members against 1–4 enemies, in initiative order by AGI.
- **Focus:** +1 per turn, max 3. Skills cost 2.
- Actions: Attack, Signature Skill (set by the highest stat), Defend (halves damage, +1 focus), Potion, Flee (wild battles only).
- Signature skills: **Cleave** (STR, hits all), **Flurry** (AGI, two hits with high crit), **Firebolt** (INT), **Mend** (WIL, heals), **Bulwark** (VIT, taunt + guard).
- Your House retinue volleys an enemy at the start of each round.

## 9. 2.5D presentation

- Isometric world built from height-extruded tiles. Lighting shifts with the era: warm gold in Abundance, cold grey in Famine, red haze in War.
- Characters are drawn procedurally and show their **race** (ears, beards, tusks, height) and **age** (children are small, elders are grey and stooped). You can watch your hero grow old.
- The estate building on the map changes as you upgrade it, from hut to castle.
- Battles play out on an isometric arena with lunges, hit flashes and floating numbers.

## 10. Prototype scope (this repository)

Implemented in the playable concept (`index.html`):

- [x] House founding: name, race, birth status, choosing 1 of 3 partners
- [x] Aging, life stages, XP modifiers, formative points, old-age death
- [x] Isometric overworld with towns, ruins and the estate; time cost per step
- [x] Turn-based combat with skills, focus, retinue, flee, permanent death
- [x] Yearly world simulation: births, marriages, bastards, orphans, corruption, rivals
- [x] Eras, prosperity, Golden Age victory
- [x] Succession, heir choice and timeskip with flat growth
- [x] Estate tiers, upgrades, heirlooms, arranged matches
- [x] Taverns: recruiting, courting, lineage research, legitimisation
- [x] Family tree and character sheets
- [x] Save/load (browser storage)

Future work: authored quests and story events, more enemy and skill variety, equipment slots, rival houses with politics, sprite art, music, and a balance pass.
