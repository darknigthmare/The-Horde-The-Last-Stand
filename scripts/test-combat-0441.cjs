#!/usr/bin/env node
'use strict';

// Targeted behavioral regressions on the shipped HTML with its original images.
// Uses the opt-in ?test=1 API to prepare controlled combat scenarios; the separate
// smoke_game.cjs suite exercises production navigation without that API.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
let playwright;
try { playwright = require('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
}

const root = path.resolve(__dirname, '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const game = path.resolve(option('--game', path.join(root, 'game', 'JOUER_DERNIERE_LIGNE.html')));
const output = path.resolve(option('--out', path.join(root, 'artifacts', 'combat-0441.json')));
const checks = [], runtimeErrors = [];
const started = new Date().toISOString();
let browser, browserVersion, fatal = null;

function check(name, passed, details) {
  checks.push({ name, passed: Boolean(passed), details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
}
const near = (a, b) => Math.abs(a - b) < 1e-7;

async function encounter(page, start, type, state, control) {
  return page.evaluate(({ start, type, state, control }) => {
    __DL.showMenu();
    __DL[start]();
    __DL.start();
    __DL.stopLoop();
    __DL.clearEnemies();
    const world = __DL.readState();
    world.wave.spawnTimer = 100;
    world.run.allies = {};
    world.run.traps.fill(null);
    world.run.equipment.turret = 0;
    const z = __DL.spawn(type);
    z.x = 700;
    z.stun = control === 'stun' ? 0.3 : 0;
    z[state].spit = 0.01;
    if (control === 'lure') world.decoys.push({ x: z.x, lane: z.lane, life: 0.3, radius: 180 });
    if (control === 'dead') z.dead = true;
    const timerBefore = z[state].spit;
    __DL.advance(0.1);
    const first = {
      projectiles: __DL.getEffects().projectiles.length,
      timer: z[state].spit,
      stun: z.stun,
      distracted: __DL.distracted(z),
    };
    if (control === 'stun' || control === 'lure') __DL.advance(0.4);
    return { timerBefore, first, resumed: { projectiles: __DL.getEffects().projectiles.length, timer: z[state].spit, stun: z.stun, distracted: __DL.distracted(z) } };
  }, { start, type, state, control });
}

async function jumper(page, control) {
  return page.evaluate(control => {
    __DL.showMenu();
    __DL.startHighway();
    __DL.start();
    __DL.stopLoop();
    __DL.clearEnemies();
    const world = __DL.readState();
    world.wave.spawnTimer = 100;
    world.run.allies = {};
    world.run.traps.fill(null);
    world.run.equipment.turret = 0;
    const z = __DL.spawn('roadJumper');
    z.x = 400;
    z.stun = control === 'stun' ? 0.3 : 0;
    z.road.jump = 0;
    z.road.warn = 0.01;
    if (control === 'lure') world.decoys.push({ x: z.x, lane: z.lane, life: 0.3, radius: 180 });
    if (control === 'dead') z.dead = true;
    const initialLane = z.lane;
    __DL.advance(0.1);
    const first = { lane: z.lane, warn: z.road.warn, jump: z.road.jump };
    if (control === 'stun' || control === 'lure') {
      __DL.advance(0.4);
      const released = { lane: z.lane, warn: z.road.warn, jump: z.road.jump, stun: z.stun, distracted: __DL.distracted(z) };
      // Bring only the cooldown to its boundary; preserve the native new warning.
      z.road.jump = 0.01;
      __DL.advance(0.1);
      const reannounced = { lane: z.lane, warn: z.road.warn };
      __DL.advance(0.9);
      return { initialLane, first, released, reannounced, final: { lane: z.lane, warn: z.road.warn, jump: z.road.jump } };
    }
    return { initialLane, first };
  }, control);
}

async function breather(page, mode, scout) {
  return page.evaluate(({ mode, scout }) => {
    __DL.showMenu();
    __DL.setSettings({ v22HordeFlow: mode !== 'classic', v22FlowMode: mode === 'classic' ? 'nervous' : mode });
    __DL.startNew('campaign');
    const run = __DL.readState().run;
    run.crewServices = { night: run.night, abel: false, jeanne: false, malik: scout };
    __DL.start();
    __DL.stopLoop();
    __DL.clearEnemies();
    const wave = __DL.readState().wave;
    wave.spawned = wave.breaks[0];
    wave.spawnTimer = 0;
    wave.intermission = 0;
    __DL.advanceSpawns(0.05);
    const initial = { spawned: wave.spawned, intermission: wave.intermission, timer: wave.spawnTimer, scout: wave.roster.scout };
    let elapsed = 0, earlyArrival = false;
    while (wave.spawned === initial.spawned && elapsed < 12) {
      __DL.advanceSpawns(0.05);
      elapsed += 0.05;
      if (wave.spawned > initial.spawned && wave.intermission > 1e-7) earlyArrival = true;
    }
    return { initial, elapsed, earlyArrival, final: { spawned: wave.spawned, intermission: wave.intermission, timer: wave.spawnTimer } };
  }, { mode, scout });
}

async function bossSafety(page) {
  return page.evaluate(() => {
    __DL.showMenu();
    __DL.setSettings({ v22HordeFlow: false });
    __DL.startNew('campaign');
    __DL.start();
    __DL.stopLoop();
    __DL.clearEnemies();
    const s = __DL.readState();
    s.wave.spawnTimer = 100;
    s.run.allies = {};
    s.run.traps.fill(null);
    s.run.equipment.turret = 0;
    const boss = __DL.spawn('mortar');
    boss.x = 700;
    boss.boss.state = 'windup';
    boss.boss.timer = 0.01;
    boss.stun = 0.3;
    __DL.advance(0.1);
    const interrupted = { state: boss.boss.state, projectiles: __DL.getEffects().projectiles.length, interruptions: s.wave.telemetry.interruptions };
    boss.stun = 0;
    boss.boss.state = 'windup';
    boss.boss.timer = 0.01;
    __DL.advance(0.05);
    return { interrupted, resumed: { state: boss.boss.state, projectiles: __DL.getEffects().projectiles.length } };
  });
}

async function journeySettlement(page, start, route, outcome) {
  return page.evaluate(({ start, route, outcome }) => {
    __DL.showMenu();
    __DL.setSettings({ v21Telemetry: true });
    __DL[start]();
    __DL.start();
    __DL.stopLoop();
    __DL.clearEnemies();
    const world = __DL.readState(), data = __DL.getData(), wave = world.wave;
    // Reproduce the normal tick condition after the last enemy was eliminated.
    // The journey itself remains unfinished, and no finish helper is called.
    wave.list = [];
    wave.total = wave.spawned;
    const journey = wave[route];
    journey.distance = 0;
    const id = wave.v21Metrics.id, key = wave.v21Metrics.missionKey;
    delete data.meta.missionScores[key];
    const read = () => JSON.parse(JSON.stringify({
      phase: __DL.readState().phase,
      paid: wave.paid,
      recorded: wave.v21Metrics.recorded,
      cash: world.run.cash,
      xp: data.meta.xp,
      time: Math.round(wave.time * 10) / 10,
      distance: journey.distance,
      target: journey.target,
      sessions: data.meta.v21Playtests.filter(session => session.id === id),
      score: data.meta.missionScores[key] || null,
      career: __DL.v26CareerData(),
    }));
    const before = read();
    __DL.advance(0.2);
    const waiting = read();
    __DL.advance(0.6);
    if (outcome === 'victory') journey.distance = journey.target;
    else world.run.health = 0;
    __DL.advance(0.1);
    const finished = read();
    // Repeated completion attempts must not duplicate a report or reward.
    __DL.finish();
    __DL.finish();
    return { before, waiting, finished, repeated: read() };
  }, { start, route, outcome });
}

async function consecutiveOutcomes(page, start, route) {
  return page.evaluate(({ start, route }) => {
    __DL.showMenu();
    __DL.setSettings({ v21Telemetry: true });
    if (start === 'startNew') __DL.startNew('campaign');
    else __DL[start]();
    __DL.start();
    __DL.stopLoop();
    __DL.clearEnemies();
    const data = __DL.getData(), first = __DL.readState();
    first.wave.list = [];
    first.wave.total = first.wave.spawned;
    first.wave.time = 12;
    if (route !== 'campaign') first.wave[route].distance = first.wave[route].target;
    const firstId = first.wave.v21Metrics.id;
    const copy = value => JSON.parse(JSON.stringify(value));
    __DL.advance(0.05);
    const previous = copy(data.meta.v21Playtests.find(session => session.id === firstId));
    if (__DL.readState().phase !== 'camp' || previous.result !== 'victory') throw new Error(`${route}: first journey did not settle into camp`);
    const priorRecord = copy(data.meta.missionScores[previous.missionKey]);
    __DL.start();
    __DL.stopLoop();
    const second = __DL.readState(), secondId = second.wave.v21Metrics.id;
    // Leave the earlier run.report in place, as the normal camp/departure flow does.
    second.run.health = 0;
    __DL.advance(0.1);
    return copy({
      phase: __DL.readState().phase,
      paid: second.wave.paid,
      previous,
      current: data.meta.v21Playtests.find(session => session.id === secondId),
      previousAfter: data.meta.v21Playtests.find(session => session.id === firstId),
      priorRecord,
      priorRecordAfter: data.meta.missionScores[previous.missionKey],
    });
  }, { start, route });
}

(async () => {
  try {
    browser = await playwright.chromium.launch({
      ...(process.env.HORDE_BROWSER_EXECUTABLE ? { executablePath: process.env.HORDE_BROWSER_EXECUTABLE } : {}),
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.HORDE_BROWSER_SINGLE_PROCESS === '1' ? ['--no-zygote', '--single-process'] : [])],
    });
    browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.setOffline(true);
    const page = await context.newPage();
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto(pathToFileURL(game).href + '?test=1', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__DL && window.DL44UI);
    await page.evaluate(() => {
      __DL.stopLoop();
      __DL.setSettings({ cinematics: false, sound: false, reducedFlashes: true });
    });

    for (const [start, type, state] of [
      ['startHighway', 'roadSpitter', 'road'],
      ['startWater', 'waterSpitter', 'water'],
      ['startDark', 'darkSpitter', 'dark'],
    ]) {
      const ordinary = await encounter(page, start, type, state, 'none');
      check(`${type}: ready shot remains functional`, ordinary.first.projectiles === 1, ordinary);
      for (const control of ['stun', 'lure']) {
        const result = await encounter(page, start, type, state, control);
        check(`${type}: ${control} prevents attack and freezes its timer`, result.first.projectiles === 0 && near(result.first.timer, result.timerBefore), result);
        check(`${type}: fires after ${control} expires`, result.resumed.projectiles === 1 && !result.resumed.distracted && result.resumed.stun <= 1e-7, result.resumed);
      }
      const dead = await encounter(page, start, type, state, 'dead');
      check(`${type}: defeated enemy emits no projectile`, dead.first.projectiles === 0, dead);
    }

    const ordinaryJump = await jumper(page, 'none');
    check('roadJumper: announced lane change still completes without control', ordinaryJump.first.lane === 1 - ordinaryJump.initialLane, ordinaryJump);
    for (const control of ['stun', 'lure']) {
      const result = await jumper(page, control);
      check(`roadJumper: ${control} cancels the announced jump`, result.first.lane === result.initialLane && result.first.warn === 0 && result.first.jump >= 5.9, result);
      check(`roadJumper: no stale jump after ${control} expires`, result.released.lane === result.initialLane && result.released.warn === 0 && result.released.jump > 5 && result.released.stun <= 1e-7 && !result.released.distracted, result.released);
      check(`roadJumper: new attempt has a fresh warning after ${control}`, result.reannounced.lane === result.initialLane && result.reannounced.warn > 0 && result.final.lane === 1 - result.initialLane, result);
    }
    const deadJump = await jumper(page, 'dead');
    check('roadJumper: defeated enemy never changes lane', deadJump.first.lane === deadJump.initialLane, deadJump);

    for (const [mode, duration] of [['classic', 6], ['tactical', 6], ['nervous', 4.5], ['relentless', 3.5]]) {
      for (const scout of [false, true]) {
        const result = await breather(page, mode, scout), expected = duration + (scout ? 2 : 0);
        const label = `${mode}, scout ${scout ? 'paid' : 'absent'}`;
        check(`Breather ${label}: countdown and spawn timer agree`, near(result.initial.intermission, expected) && near(result.initial.timer, expected), result.initial);
        check(`Breather ${label}: arrival honors announced duration`, !result.earlyArrival && result.final.spawned === result.initial.spawned + 1 && result.elapsed >= expected - 1e-7 && result.elapsed <= expected + 0.051, result);
      }
    }
    const boss = await bossSafety(page);
    check('Boss: stun still interrupts a mortar windup once', boss.interrupted.state === 'recover' && boss.interrupted.projectiles === 0 && boss.interrupted.interruptions === 1, boss.interrupted);
    check('Boss: uncontested mortar salvo still creates three projectiles', boss.resumed.projectiles === 3, boss.resumed);
    for (const [start, route] of [['startMetro', 'metro'], ['startAir', 'air']]) {
      for (const outcome of ['victory', 'defeat']) {
        const result = await journeySettlement(page, start, route, outcome), { before, waiting, finished, repeated } = result;
        const label = `${route}, later ${outcome}`;
        check(`Journey ${label}: no victory report or mission score before arrival`, waiting.phase === 'combat' && waiting.distance < waiting.target && !waiting.paid && !waiting.recorded && waiting.sessions.length === 0 && waiting.score === null, waiting);
        check(`Journey ${label}: no early cash, XP or career award`, waiting.cash === before.cash && waiting.xp === before.xp && JSON.stringify(waiting.career) === JSON.stringify(before.career), { before, waiting });
        const session = finished.sessions[0];
        check(`Journey ${label}: records the actual outcome and final totals once`, finished.sessions.length === 1 && session.result === outcome && session.duration === finished.time && session.cashEnd === finished.cash && (outcome === 'victory' ? finished.paid && finished.phase === 'camp' && finished.score !== null && session.score === finished.score.score : !finished.paid && finished.phase === 'defeat' && finished.score === null), finished);
        check(`Journey ${label}: repeated completion cannot duplicate records or rewards`, repeated.cash === finished.cash && repeated.xp === finished.xp && JSON.stringify(repeated.sessions) === JSON.stringify(finished.sessions) && JSON.stringify(repeated.score) === JSON.stringify(finished.score), { finished, repeated });
      }
    }
    for (const [start, route] of [['startNew', 'campaign'], ['startMetro', 'metro'], ['startAir', 'air']]) {
      const result = await consecutiveOutcomes(page, start, route);
      check(`Consecutive ${route}: later defeat cannot inherit the previous victory score`, result.phase === 'defeat' && !result.paid && result.previous.score > 0 && result.current.night === result.previous.night + 1 && result.current.result === 'defeat' && result.current.score === 0 && result.current.grade === 'D', result);
      check(`Consecutive ${route}: previous victory and its record remain intact`, JSON.stringify(result.previousAfter) === JSON.stringify(result.previous) && JSON.stringify(result.priorRecordAfter) === JSON.stringify(result.priorRecord), result);
    }
    check('No uncaught JavaScript errors', runtimeErrors.length === 0, runtimeErrors);
  } catch (error) {
    fatal = error.stack || String(error);
    console.error(fatal);
  } finally {
    if (browser) await browser.close();
    const report = {
      started,
      finished: new Date().toISOString(),
      browser: browserVersion,
      viewport: { width: 1440, height: 900 },
      game: path.basename(game),
      sha256: crypto.createHash('sha256').update(fs.readFileSync(game)).digest('hex'),
      mode: 'file://, offline, original embedded images, opt-in ?test=1',
      passed: checks.filter(item => item.passed).length,
      failed: checks.filter(item => !item.passed).length,
      checks,
      runtimeErrors,
      fatal,
      limitations: ['Controlled combat regressions; not a full campaign replay or difficulty-balancing certification.', 'Headless desktop browser; physical device interaction and audio listening are covered separately.'],
    };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, failed: report.failed, fatal: Boolean(fatal), report: output }));
    if (fatal || report.failed) process.exitCode = 1;
  }
})();
