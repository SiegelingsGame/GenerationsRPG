# Generations

A 2.5D roguelike, turn-based RPG about a family line. You play the head of a House, choose a partner, raise heirs, and try to leave a better world for the next generation. You will die. Time skips ahead. Your heir takes your place.

**Play online (phone or desktop):** https://siegelingsgame.github.io/GenerationsRPG/. It's published by `.github/workflows/pages.yml` on every push. On a phone, use your browser's "Add to Home Screen" to install it like an app.

**Play locally:** open `index.html` in a browser. No build step and no dependencies. Everything is drawn procedurally with Canvas 2D.

**Controls:** click a tile to travel; mouse wheel or + / − to zoom; Q / E or the on-screen buttons to rotate the map.

**Design:** see [`docs/DESIGN.md`](docs/DESIGN.md) for the full concept (pillars, systems, numbers and roadmap).

## What's in the playable concept

| System | Where |
|---|---|
| Founding: house name and colour, race, birth status, choosing 1 of 3 partners | `js/main.js` (`Game.create`, `Game.choosePartner`) |
| Aging, life stages, XP modifiers, formative points, lifespans per race | `js/model.js` (`stageKey`, `ageMod`, `xpMod`) |
| Genetics, birth status (highborn / lowborn / bastard / orphan), hidden lineages | `js/model.js` (`childBase`, `haveChild`, `birthKey`) |
| Yearly world simulation: births, marriages, affairs, deaths, corruption, rivals, eras | `js/model.js` (`yearTick`) |
| Succession, heir choice, timeskip with flat-only growth | `js/model.js` (`heirCandidates`, `performTimeskip`) |
| Turn-based combat: focus, signature skills, retinue volleys, flee, permanent death | `js/combat.js` |
| Isometric overworld, estate that changes with its tier, era lighting, battle arena | `js/render.js` |
| Estate tiers, upgrades, retinue, heirloom, arranged matches, taverns, deeds, family tree | `js/ui.js`, `js/main.js` |
| Big biome map, islands, technology, towns rising and falling, culture, kinship and taboo, attractiveness, the 1,000-year doom and its quests | `js/world.js` |
| Road events (traders, people in need, mines, cave and dungeon crawls, bandit camps that grow) and the first-person campfire | `js/events.js` |
| Static data: races, eras, enemies, estate, gear | `js/data.js` |

## Quick tips

- Youths level ×1.5 and earn **formative points** that protect them in old age. Get your heirs fighting early.
- An elf partner gives gifted heirs who take **30 years** to come of age. An orc partner gives heirs in 11.
- Ruins and rivals are deadly, and fallen fighters can die for good. Keep potions on hand and build a chapel.
- Raise **prosperity** to 95 with deeds, cleared ruins and slain rivals to bring about the **Golden Age**.

The game saves to browser storage automatically after most actions.
