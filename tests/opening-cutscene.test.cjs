const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const ART = '/opt/cursor/artifacts';
const URL = process.env.GAME_TEST_URL || 'http://127.0.0.1:8770';

test('Hollow King enemy is a giant-scale unit', async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    await page.goto(URL);
    await page.getByRole('button', { name: /^Random Lineage/ }).waitFor();
    const info = await page.evaluate(() => {
      const def = GD.ENEMIES.hollow;
      const u = makeEnemyUnit('hollow', 20, 0);
      return {
        defScale: def.scale,
        defGiant: !!def.giant,
        unitScale: u.scale,
        unitGiant: !!u.giant,
        figScale: typeof Render !== 'undefined' && Render.unitFigScale ? Render.unitFigScale(u) : null,
        barLift: typeof Render !== 'undefined' && Render.unitBarLift ? Render.unitBarLift(u) : null,
        normalFig: typeof Render !== 'undefined' && Render.unitFigScale ? Render.unitFigScale({ shape: 'wraith', scale: 1 }) : null,
      };
    });
    assert.equal(info.defScale, 2.5);
    assert.equal(info.defGiant, true);
    assert.equal(info.unitScale, 2.5);
    assert.equal(info.unitGiant, true);
    assert.ok(info.figScale > info.normalFig * 2);
    assert.ok(info.barLift > 150);
  } finally {
    await browser.close();
  }
});

test('Cutscene PackArt FX aim near Hollow King screen position (not origin)', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    await page.goto(URL);
    await page.getByRole('button', { name: /^Random Lineage/ }).click();
    await page.waitForFunction(() => OpeningCutscene.phase === 'battle' && Battle.units.some((u) => u.type === 'hollow'), null, { timeout: 8000 });
    // impacts, not the caster's wind-up glow (`charge`), should land on the King
    await page.waitForFunction(() => PackArt.effects.some((e) => !e.charge && e.to && Number.isFinite(e.to.x) && Number.isFinite(e.to.y)), null, { timeout: 12000 });
    const info = await page.evaluate(() => {
      const king = Battle.units.find((u) => u.type === 'hollow');
      const kingScreen = Render.unitScreen(king);
      const fx = PackArt.effects.filter((e) => !e.charge && e.to && Number.isFinite(e.to.x) && Number.isFinite(e.to.y));
      const samples = fx.slice(0, 6).map((e) => {
        const p = Render.biso(e.to.x, e.to.y);
        return {
          key: e.key,
          grid: e.to,
          screen: p,
          dist: Math.hypot(p.x - kingScreen.x, p.y - kingScreen.y),
        };
      });
      return {
        king: { gx: king.gx, gy: king.gy, screen: kingScreen },
        samples,
        fxCount: fx.length,
        sameRef: (() => {
          return king.gx != null && king.gy != null;
        })(),
      };
    });
    assert.ok(info.sameRef);
    assert.ok(info.fxCount > 0, 'expected PackArt effects during starfall');
    for (const s of info.samples) {
      assert.ok(Number.isFinite(s.grid.x) && Number.isFinite(s.grid.y), `effect ${s.key} missing grid coords`);
      assert.ok(s.screen.x > 80 && s.screen.y > 80, `effect ${s.key} screen near origin: ${JSON.stringify(s.screen)}`);
      assert.ok(s.dist < 220, `effect ${s.key} too far from king (${s.dist})`);
    }
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-vfx-on-hollow-king.png') });
    await page.getByRole('button', { name: /^Skip$/ }).click();
    await page.waitForFunction(() => OpeningCutscene.active === false);
  } finally {
    await browser.close();
  }
});

test('Spirit flight multi-stage 2.5D approach: town → neighborhood → house → room → belly', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.evaluate(() => {
      // Shorten early beats so the test reaches spirit flight quickly.
      const realAfter = OpeningCutscene.after.bind(OpeningCutscene);
      OpeningCutscene.after = function (ms, fn) {
        const scaled = ms > 4000 ? Math.min(ms, 900) : Math.min(ms, 200);
        return realAfter(scaled, fn);
      };
      // Speed map legs + approach beats for CI.
      const realPlay = OpeningCutscene.phaseSpiritFlight.bind(OpeningCutscene);
      OpeningCutscene.phaseSpiritFlight = function (king) {
        realPlay(king);
        const s = OpeningCutscene.spirit;
        if (s && s.legs) s.legs.forEach((leg, i) => { if (i > 0) leg.dur = Math.min(leg.dur, 320); });
        if (s && s.beats) {
          s.beats.forEach((b) => { b.dur = b.name === 'belly' ? 1600 : Math.min(b.dur, 1100); });
        }
      };
    });
    await page.getByRole('button', { name: /^Random Lineage/ }).click();
    await page.waitForFunction(() => OpeningCutscene.phase === 'spiritFlight' && OpeningCutscene.spirit && OpeningCutscene.spirit.active, null, { timeout: 20000 });

    const api = await page.evaluate(() => ({
      stages: OpeningCutscene.APPROACH_STAGES.slice(),
      hasApproachDraw: typeof Render.drawSpiritApproach === 'function',
      hasProj: typeof Render.spiritProj === 'function',
      hasTick: typeof OpeningCutscene.tickSpiritFlight === 'function',
      hasBegin: typeof OpeningCutscene.beginApproach === 'function',
    }));
    assert.deepEqual(api.stages, ['town', 'neighborhood', 'house', 'room', 'belly']);
    assert.equal(api.hasApproachDraw, true);
    assert.equal(api.hasProj, true);
    assert.equal(api.hasTick, true);
    assert.equal(api.hasBegin, true);

    const midFlight = await page.evaluate(() => {
      const s = OpeningCutscene.spirit;
      return {
        phase: OpeningCutscene.phase,
        stage: s.stage,
        alt: s.alt,
        trail: s.trail.length,
        battleActive: Battle.active,
      };
    });
    assert.equal(midFlight.phase, 'spiritFlight');
    assert.ok(midFlight.stage === 'flight' || OpeningCutscene.APPROACH_STAGES.includes(midFlight.stage));
    assert.equal(midFlight.battleActive, false);
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-spirit-flight-map.png') });

    const stageShot = async (name, file) => {
      await page.waitForFunction((n) => OpeningCutscene.spirit && OpeningCutscene.spirit.stage === n && OpeningCutscene.active, name, { timeout: 20000 });
      // Freeze stage clock briefly so we can screenshot mid-beat without auto-advancing.
      await page.evaluate((n) => {
        const s = OpeningCutscene.spirit;
        if (!s) return;
        s.stageT0 = performance.now();
        s.finishing = false;
        const beat = (s.beats || []).find((b) => b.name === n);
        if (beat) OpeningCutscene.setText(beat.chapter, beat.line, beat.speaker || '');
      }, name);
      await page.waitForTimeout(220);
      const snap = await page.evaluate(() => {
        const s = OpeningCutscene.spirit;
        return {
          stage: s.stage,
          stageIndex: s.stageIndex,
          stageProgress: s.stageProgress,
          approachProgress: s.approachProgress,
          cam: s.cam && { z: s.cam.z, y: s.cam.y, pitch: s.cam.pitch },
          spiritLocal: s.spiritLocal && { z: s.spiritLocal.z, y: s.spiritLocal.y },
          trailApproach: (s.trail || []).filter((t) => t.mode === 'approach').length,
          bodyClass: document.body.classList.contains('oc-approach-active'),
          line: (document.querySelector('#oc-line') || {}).textContent || '',
          chapter: (document.querySelector('#oc-chapter') || {}).textContent || '',
          speaker: (document.querySelector('#oc-speaker') || {}).textContent || '',
          active: OpeningCutscene.active,
        };
      });
      assert.equal(snap.active, true);
      assert.equal(snap.stage, name);
      assert.ok(snap.approachProgress >= 0 && snap.approachProgress <= 1);
      assert.ok(snap.cam && Number.isFinite(snap.cam.z));
      assert.ok(snap.spiritLocal && Number.isFinite(snap.spiritLocal.z));
      assert.equal(snap.bodyClass, true);
      await page.screenshot({ path: path.join(ART, file) });
      // Resume near end of beat so the sequence advances without long waits.
      await page.evaluate((n) => {
        const s = OpeningCutscene.spirit;
        if (!s) return;
        const beat = (s.beats || []).find((b) => b.name === n);
        const dur = (beat && beat.dur) || 1000;
        s.stageT0 = performance.now() - dur * 0.92;
      }, name);
      return snap;
    };

    const town = await stageShot('town', 'opening-cutscene-spirit-town.png');
    const hood = await stageShot('neighborhood', 'opening-cutscene-spirit-neighborhood.png');
    const house = await stageShot('house', 'opening-cutscene-spirit-house.png');
    const room = await stageShot('room', 'opening-cutscene-spirit-room.png');
    const belly = await stageShot('belly', 'opening-cutscene-spirit-belly.png');

    assert.ok(hood.approachProgress >= town.approachProgress);
    assert.ok(house.approachProgress >= hood.approachProgress);
    assert.ok(room.approachProgress >= house.approachProgress);
    assert.ok(belly.approachProgress >= room.approachProgress);
    assert.ok(town.cam.z > hood.cam.z, 'camera should dolly inward (town z > neighborhood z)');
    assert.ok(hood.cam.z > house.cam.z);
    assert.ok(room.cam.z > belly.cam.z);
    assert.match(belly.line, /bloodline|prevail|House/i);
    // Seeking / claiming the bloodline is the spirit's voice — not the Hollow King.
    assert.match(belly.chapter, /spirit/i);
    assert.match(belly.speaker, /spirit/i);
    assert.ok(!/hollow\s*king/i.test(belly.speaker || ''));

    // Approach beats should never put bloodline-seeking dialogue in the King's mouth.
    const seekingCopy = await page.evaluate(() => {
      const beats = OpeningCutscene.approachBeats();
      const legs = (OpeningCutscene.spirit && OpeningCutscene.spirit.legs) || [];
      return {
        belly: beats.find((b) => b.name === 'belly'),
        mapSeek: legs.map((l) => `${l.chapter}|${l.line}|${l.speaker || ''}`),
      };
    });
    assert.match(seekingCopy.belly.line, /seek.*bloodline|prevail/i);
    assert.match(seekingCopy.belly.speaker, /spirit/i);
    assert.ok(!/hollow\s*king/i.test(seekingCopy.belly.speaker || ''));
    assert.ok(seekingCopy.mapSeek.some((row) => /spirit.*seek|seek.*bloodline/i.test(row)));
    assert.ok(!seekingCopy.mapSeek.some((row) => /hollow\s*king.*seek|king.*dwindles/i.test(row)));

    // Also keep a mother-belly alias artifact name for continuity with prior PR evidence.
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-spirit-mother-belly.png') });

    // Skip if still running; otherwise the belly beat may already be auto-completing.
    const stillActive = await page.evaluate(() => OpeningCutscene.active);
    if (stillActive) {
      const skip = page.getByRole('button', { name: /^Skip$/ });
      if (await skip.count()) await skip.click();
    }
    await page.waitForFunction(() => OpeningCutscene.active === false, null, { timeout: 15000 });
    await page.getByText('Random Lineage · Ready to play', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('Random Lineage plays opening cutscene; Skip reaches playable world', async () => {
  fs.mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.getByRole('button', { name: /^Random Lineage/ }).waitFor();

    assert.equal(await page.evaluate(() => typeof Game.playOpeningCutscene), 'function');
    assert.equal(await page.evaluate(() => typeof OpeningCutscene.play), 'function');
    assert.equal(await page.evaluate(() => typeof OpeningCutscene.phaseSpiritFlight), 'function');
    assert.deepEqual(await page.evaluate(() => OpeningCutscene.APPROACH_STAGES), ['town', 'neighborhood', 'house', 'room', 'belly']);

    await page.getByRole('button', { name: /^Random Lineage/ }).click();
    await page.waitForFunction(() => OpeningCutscene.active === true);
    await page.getByRole('button', { name: /^Skip$/ }).waitFor();
    await page.locator('#oc-line').waitFor();
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-active.png') });

    await page.waitForFunction(() => OpeningCutscene.phase === 'battle' && Battle.units.some((u) => u.type === 'hollow'), null, { timeout: 8000 });
    const giant = await page.evaluate(() => {
      const king = Battle.units.find((u) => u.type === 'hollow');
      const hero = Battle.units.find((u) => u.side === 'party');
      return {
        kingScale: king && king.scale,
        kingGiant: !!(king && king.giant),
        kingFig: king && Render.unitFigScale(king),
        heroFig: hero && Render.unitFigScale(hero),
        heroScale: hero && (hero.scale || 1),
      };
    });
    assert.equal(giant.kingScale, 2.5);
    assert.equal(giant.kingGiant, true);
    assert.equal(giant.heroScale, 1);
    assert.ok(giant.kingFig > giant.heroFig * 2);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(ART, 'hollow-king-giant-vs-party.png') });

    const mid = await page.evaluate(() => ({
      active: OpeningCutscene.active,
      battle: Battle.active || Battle.cinematic,
      phase: OpeningCutscene.phase,
    }));
    assert.equal(mid.active, true);
    assert.ok(mid.phase === 'intro' || mid.phase === 'battle' || mid.phase === 'epilogue' || mid.phase === 'spiritFlight');

    await page.getByRole('button', { name: /^Skip$/ }).click();
    await page.waitForFunction(() => OpeningCutscene.active === false);
    await page.getByText('Random Lineage · Ready to play', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => !!document.getElementById('opening-cutscene')), false);
    assert.equal(await page.evaluate(() => Battle.active), false);

    await page.getByRole('button', { name: 'Start the game', exact: true }).click();
    await page.getByText('Your first generation', { exact: true }).waitFor();
    const world = await page.evaluate(() => ({
      mode: G.mode,
      mc: !!ch(G.mcId),
      partner: !!spouseOf(ch(G.mcId)),
      map: !!(G.world && G.world.map),
    }));
    assert.deepEqual(world, { mode: 'world', mc: true, partner: true, map: true });
    await page.screenshot({ path: path.join(ART, 'opening-cutscene-after-skip-world.png') });

    await page.evaluate(() => { UI.closeAll(); Game.playOpeningCutscene(() => { window.__ocDone = true; }); });
    await page.waitForFunction(() => OpeningCutscene.active === true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__ocDone === true && OpeningCutscene.active === false);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
