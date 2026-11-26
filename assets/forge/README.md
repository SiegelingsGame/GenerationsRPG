# PixelForge gameplay animation set

Generated from the shared Claude-authored PixelForge renderer and presets in `pixelforge/` (including the icon-layer update). Rebuild with `node scripts/bake-game-forge.cjs`. The three small game-specific specs (`enhance`, `protection`, `trait`) use its icon layer.

The PNG sheets and playback metadata are checked in so phones do not render procedural animations at startup. `js/forge-data.js` contains the compact metadata; `pixelforge/player.js` draws frames inside the existing battle camera. JSON exports remain available for editing and reuse.

Attack selection follows the acting unit and skill. Enhancement cues accompany actual buffs; trait sparkles introduce existing positive traits at battle start without applying any new bonus. Shield, guard and riposte skills show protection effects, including impacts during defense and shield absorption. These are presentation changes only.

Reduced motion suppresses these bursts. The existing PackArt / PixelFX effects remain the fallback while a PixelForge sheet is unavailable. Queues are bounded and cleared on battle start.
