// Entry for the PixelFX runtime bundle. Exports weather, transitions and attack FX.
import { createFrame, clearFrame, createFx, composite } from '../vendor/pixelfx/core/index.js';

import * as rain from '../vendor/pixelfx/fx/weather/rain.js';
import * as snow from '../vendor/pixelfx/fx/weather/snow.js';
import * as fog from '../vendor/pixelfx/fx/weather/fog.js';
import * as storm from '../vendor/pixelfx/fx/weather/storm.js';
import * as blizzard from '../vendor/pixelfx/fx/weather/blizzard.js';
import * as fallingLeaves from '../vendor/pixelfx/fx/weather/falling-leaves.js';
import * as cherryBlossoms from '../vendor/pixelfx/fx/weather/cherry-blossoms.js';
import * as fireflies from '../vendor/pixelfx/fx/weather/fireflies.js';
import * as clouds from '../vendor/pixelfx/fx/weather/clouds.js';
import * as aurora from '../vendor/pixelfx/fx/weather/aurora.js';
import * as godRays from '../vendor/pixelfx/fx/weather/god-rays.js';
import * as shootingStars from '../vendor/pixelfx/fx/weather/shooting-stars.js';

import * as iris from '../vendor/pixelfx/fx/transitions/iris.js';
import * as diamondWipe from '../vendor/pixelfx/fx/transitions/diamond-wipe.js';
import * as slashWipe from '../vendor/pixelfx/fx/transitions/slash-wipe.js';
import * as pixelDissolve from '../vendor/pixelfx/fx/transitions/pixel-dissolve.js';
import * as blinds from '../vendor/pixelfx/fx/transitions/blinds.js';

import * as swordSlash from '../vendor/pixelfx/fx/melee/sword-slash.js';
import * as doubleSlash from '../vendor/pixelfx/fx/melee/double-slash.js';
import * as thrust from '../vendor/pixelfx/fx/melee/thrust.js';
import * as hammerSmash from '../vendor/pixelfx/fx/melee/hammer-smash.js';
import * as heavyCleave from '../vendor/pixelfx/fx/melee/heavy-cleave.js';
import * as hitSpark from '../vendor/pixelfx/fx/impacts/hit-spark.js';
import * as critHit from '../vendor/pixelfx/fx/impacts/crit-hit.js';
import * as bluntHit from '../vendor/pixelfx/fx/impacts/blunt-hit.js';
import * as groundSlam from '../vendor/pixelfx/fx/impacts/ground-slam.js';
import * as fireball from '../vendor/pixelfx/fx/fire/fireball.js';
import * as flamePillar from '../vendor/pixelfx/fx/fire/flame-pillar.js';
import * as frostNova from '../vendor/pixelfx/fx/ice/frost-nova.js';
import * as iceSpikes from '../vendor/pixelfx/fx/ice/ice-spikes.js';
import * as lightningStrike from '../vendor/pixelfx/fx/lightning/lightning-strike.js';
import * as zapHit from '../vendor/pixelfx/fx/lightning/zap-hit.js';
import * as heal from '../vendor/pixelfx/fx/holy/heal.js';
import * as blessing from '../vendor/pixelfx/fx/holy/blessing.js';

const weather = {
  rain, snow, fog, storm, blizzard,
  'falling-leaves': fallingLeaves,
  'cherry-blossoms': cherryBlossoms,
  fireflies, clouds, aurora,
  'god-rays': godRays,
  'shooting-stars': shootingStars,
};

const transitions = {
  iris,
  'diamond-wipe': diamondWipe,
  'slash-wipe': slashWipe,
  'pixel-dissolve': pixelDissolve,
  blinds,
};

const attacks = {
  'sword-slash': swordSlash,
  'double-slash': doubleSlash,
  thrust,
  'hammer-smash': hammerSmash,
  'heavy-cleave': heavyCleave,
  'hit-spark': hitSpark,
  'crit-hit': critHit,
  'blunt-hit': bluntHit,
  'ground-slam': groundSlam,
  fireball,
  'flame-pillar': flamePillar,
  'frost-nova': frostNova,
  'ice-spikes': iceSpikes,
  'lightning-strike': lightningStrike,
  'zap-hit': zapHit,
  heal,
  blessing,
};

const api = {
  createFrame,
  clearFrame,
  createFx,
  composite,
  weather,
  transitions,
  attacks,
  ready: true,
};

if (typeof window !== 'undefined') window.PixelFx = api;
export default api;
