# Game art sources and licenses

This directory contains only sprites used by Generations RPG, extracted from user-supplied packs. These are integrated game resources, not an asset-pack redistribution. No ZIP archives, previews or unused character packs are shipped. Original artists retain their rights.

- **Pixel Burst VFX: Elemental Spells FREE v1.0 — dotplays**. Eight 48×48 elemental projectile animations. Free and commercial game use permitted; standalone redistribution and AI training prohibited. See `pixel-burst-LICENSE.txt`. Source: https://dotplays.itch.io/pixel-burst-elemental-spells
- **Super Pixel Effects Gigapack (Free Version) v3.3.0 — Will Tice / unTied Games**. Ten selected impact, spell, buff and fire animations, packed into horizontal sheets from their individual PNG frames. Attribution required. Commercial and noncommercial game use allowed; standalone redistribution and AI training prohibited. See supplied `untied-LICENSE.txt`, which references the artist's full terms at https://untiedgames.com/files/license.txt . Source: https://untiedgames.itch.io/super-pixel-effects-gigapack
- **Modern Interiors Free v2.2 — LimeZu**. Eight cropped wooden furniture, rug, plant, pottery and clutter props plus a wood floor tile. **The supplied free license allows NONCOMMERCIAL projects only.** Commercializing this game requires replacing these sprites or obtaining an appropriate license. See `modern-interiors-LICENSE.txt`. Source: https://limezu.itch.io/moderninteriors

`sources.json` maps bundled assets back to their ZIP members and crop coordinates. `scripts/import-game-packs.py` regenerates these resources from the three supplied ZIP files (Pillow required). `js/pack-data.js` preserves frame dimensions, counts and original frame rates. No assets are loaded from external servers during gameplay.

The scenery layout, gameplay, collision and world simulation remain game code. Furniture layouts derive from the world seed and location coordinates so they survive save/load. Decorations do not create invisible movement barriers. Effects are cosmetic and do not change damage, turn costs, target selection, or AI decisions. Motion reduction uses static effect frames when the device requests reduced motion.

Inventory and equipment UI chrome lives in `assets/ui/` (Kasaya's Frames). See that folder's README and LICENSE.
