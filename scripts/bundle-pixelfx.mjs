#!/usr/bin/env node
// Bundle a PixelFX subset into a classic-script runtime for GenerationsRPG.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
await esbuild.build({
  entryPoints: [join(root, 'js/pixelfx-entry.js')],
  bundle: true,
  format: 'iife',
  globalName: 'PixelFxBundle',
  outfile: join(root, 'js/pixelfx-runtime.js'),
  target: ['es2019'],
  logLevel: 'info',
});
console.log('Wrote js/pixelfx-runtime.js');
