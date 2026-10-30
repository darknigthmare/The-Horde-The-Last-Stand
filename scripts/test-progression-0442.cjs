#!/usr/bin/env node
'use strict';

// Two deliberately separate kinds of evidence:
//  - controlled settlement/retry states for every route and both budget policies;
//  - a short automated combat pilot using native purchases, aim, fire and ticks.
// Controlled victories are not evidence of naturally completed campaigns.
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
const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const gameDir = path.resolve(option('--game-dir', path.join(root, 'game')));
const game = path.resolve(option('--game', path.join(gameDir, 'JOUER_DERNIERE_LIGNE.html')));
const out = path.resolve(option('--out', path.join(root, 'artifacts', 'progression-0442')));
const section = option('--section', 'all');
if (!['all', 'controlled', 'retries', 'pilot'].includes(section)) throw new Error('Unknown --section; expected all, controlled, retries or pilot');
const routes = [
  { id: 'campaign', start: 'startNew', family: 'expedition', nights: 24, ending: 'evacuation', phase: 'victory' },
  { id: 'north', start: 'startNorth', family: 'north', nights: 16, ending: 'northComplete', phase: 'northEnding' },
  ...['metro', 'air', 'highway', 'water', 'tower', 'dark'].map(id => ({ id, start: 'start' + id[0].toUpperCase() + id.slice(1), family: id, nights: 12, ending: id + 'Complete', phase: id + 'Ending' })),
];
const checks = [], runtimeErrors = [], campaigns = [], retries = [], pilot = [];
const started = new Date().toISOString();
let browser, browserVersion, fatal = null;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const gameSha256 = digest(game), testSha256 = digest(__filename);
function check(name, ok, details = null) {
  checks.push({ name, ok: !!ok, details });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}
async function setup(page) {
  await page.waitForFunction(() => window.__DL && window.DL44UI);
  await page.evaluate(() => {
    __DL.stopLoop();
    __DL.setSettings({ cinematics: false, sound: false, reducedFlashes: true, v21Telemetry: true, activeReload: false });
    const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
    const material = r => r && Object.fromEntries([
      'mode', 'night', 'economy', 'cash', 'health', 'wall', 'wallMax', 'wallLevel', 'weapons', 'loadout', 'activeId',
      'inventory', 'traps', 'allies', 'equipment', 'turretAmmo', 'fuel', 'lures', 'projects', 'localCharge',
      'kills', 'headshots', 'totalSpent', 'lastSettled', 'north', 'metro', 'air', 'highway', 'water', 'tower', 'dark',
    ].filter(key => Object.hasOwn(r, key)).map(key => [key, copy(r[key])]));
    window.__progressionTest = {
      copy, material,
      start(route, economy) {
        __DL.showMenu();
        document.getElementById('economySelect').value = economy;
        if (route.start === 'startNew') __DL.startNew('campaign');
        else __DL[route.start]();
        return material(__DL.readState().run);
      },
      purchase() {
        const before = copy(__DL.readState().run);
        // The permanent pistol has no finite ammo lot. Buy the ordinary rank-0
        // SMG through its production button before testing the resupply ledger.
        if (!__DL.equippedSupplyPlan().items.length && !before.weapons.smg) {
          __DL.setTab('arsenal');
          const button = document.querySelector('[data-buygun="smg"]');
          if (button && !button.disabled) button.click();
        }
        const quote = copy(__DL.equippedSupplyPlan());
        const bought = quote.affordable && __DL.buyEquippedSupply();
        const after = copy(__DL.readState().run);
        return { before: material(before), after: material(after), quote, bought, cost: before.cash - after.cash, spent: after.totalSpent - before.totalSpent };
      },
      settle() {
        const before = copy(__DL.readState().run);
        __DL.start(); __DL.stopLoop();
        const s = __DL.readState(), wave = s.wave;
        if (s.phase !== 'combat' || !wave) throw new Error('Controlled departure did not enter combat');
        const departure = { cash: s.run.cash, fee: wave.fee, id: wave.v21Metrics.id, total: wave.total };
        // Explicit controlled settlement: no claim of playing these encounters.
        wave.time = 40;
        if (wave.fronts) wave.fronts.stages = 2;
        for (const route of ['metro', 'air', 'highway', 'water']) if (wave[route]) wave[route].distance = wave[route].target;
        __DL.completeWave();
        const run = __DL.readState().run, report = run.report;
        const session = copy(__DL.getData().meta.v21Playtests.find(item => item.id === departure.id));
        const income = report.base + report.bounty + report.bonus + (report.contractBonus || 0) + (report.riskBonus || 0)
          + (run.frontReport?.reward || 0) + (run.bastionReport?.sortie?.deliveries?.cash || 0);
        let validation = null;
        try { __DL.validateSave(JSON.parse(__DL.exportText())); }
        catch (error) { validation = error.message; }
        const settled = { cash: run.cash, xp: __DL.getData().meta.xp, sessions: __DL.getData().meta.v21Playtests.filter(item => item.id === departure.id).length };
        __DL.finish(); __DL.finish();
        const repeated = { cash: run.cash, xp: __DL.getData().meta.xp, sessions: __DL.getData().meta.v21Playtests.filter(item => item.id === departure.id).length };
        return copy({ night: before.night, modeBefore: before.mode, economy: before.economy, beforeCash: before.cash, departure,
          phase: __DL.readState().phase, after: material(run), paid: wave.paid, report, session, income,
          expectedCash: before.cash - departure.fee + income, ledger: run.ledgerHistory.at(-1), validation, settled, repeated });
      },
      resume(family) {
        const before = material(__DL.readState().run);
        __DL.showMenu(); const resumed = __DL.resumeCheckpoint(family);
        return { resumed, phase: __DL.readState().phase, before, after: material(__DL.readState().run) };
      },
    };
  });
}
async function newPage(label) {
  // A fresh process also supports minimal single-process Chromium builds, whose
  // renderer can exit when the preceding isolated context is closed.
  if (browser) await browser.close();
  browser = await playwright.chromium.launch({ headless: true,
    ...(process.env.HORDE_BROWSER_EXECUTABLE ? { executablePath: process.env.HORDE_BROWSER_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.env.HORDE_BROWSER_SINGLE_PROCESS === '1' ? ['--no-zygote', '--single-process'] : [])],
  });
  browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.setOffline(true);
  const page = await context.newPage();
  page.on('pageerror', error => runtimeErrors.push({ label, message: error.message }));
  await page.goto(pathToFileURL(game).href + '?test=1', { waitUntil: 'load', timeout: 60000 });
  await setup(page);
  return { context, page };
}
function settlementValid(row) {
  const r = row.report, l = row.ledger;
  return row.paid && row.after.night === row.night + 1 && r.night === row.night
    && row.departure.cash === row.beforeCash - row.departure.fee && row.after.cash === row.expectedCash
    && r.base === (row.economy === 'classic' ? 230 + row.night * 35 : 180 + row.night * 20)
    && row.session?.result === 'victory' && row.session.night === row.night && row.session.cashEnd === row.after.cash
    && row.session.score === r.v20Score && row.session.grade === r.v20Grade && row.validation === null
    && equal(row.settled, row.repeated) && row.settled.sessions === 1
    && l.closing === row.after.cash && l.opening - l.preparation - l.fee + l.defense + l.sortie + l.other === l.closing;
}
async function completeCampaigns(economy) {
  const { context, page } = await newPage(`controlled ${economy}`), expected = {};
  try {
    for (const route of routes) {
      const initial = await page.evaluate(({ route, economy }) => __progressionTest.start(route, economy), { route, economy });
      const rows = [], purchases = [], resumes = [];
      for (let night = 1; night <= route.nights; night++) {
        if (night % 4 === 0) purchases.push(await page.evaluate(() => __progressionTest.purchase()));
        rows.push(await page.evaluate(() => __progressionTest.settle()));
        if (night % 4 === 0) resumes.push(await page.evaluate(family => __progressionTest.resume(family), route.family));
      }
      check(`${economy}/${route.id}: every controlled settlement reconciles cash, ledger, score and one reward`, rows.every(settlementValid), { nights: rows.length, failures: rows.filter(row => !settlementValid(row)) });
      check(`${economy}/${route.id}: paid resupply is charged and remains in the same route`, initial.economy === economy && purchases.every(p => p.bought && p.cost >= p.quote.cost && p.cost === p.spent && p.after.cash >= p.quote.fee), purchases.map(p => ({ cost: p.cost, quotedAmmo: p.quote.cost, fee: p.quote.fee, items: p.quote.items })));
      const last = rows.at(-1);
      check(`${economy}/${route.id}: ending and every four-night checkpoint resume retain materials`, last.after.mode === route.ending && last.phase === route.phase && resumes.every(r => r.resumed && equal(r.before, r.after)), { mode: last.after.mode, phase: last.phase, resumes: resumes.map(r => ({ resumed: r.resumed, night: r.after.night, phase: r.phase, equal: equal(r.before, r.after) })) });
      const evidence = { economy, route: route.id, initial, rows, purchases, resumes };
      if (route.id === 'campaign') {
        const reliefStart = await page.evaluate(() => {
          const before = __progressionTest.material(__DL.readState().run), ok = __DL.continueRelief();
          return { ok, before, after: __progressionTest.material(__DL.readState().run), phase: __DL.readState().phase };
        });
        const withoutMode = value => { const v = { ...value }; delete v.mode; return v; };
        check(`${economy}: evacuation continues into relief without a new budget or supply`, reliefStart.ok && reliefStart.phase === 'camp' && reliefStart.after.mode === 'relief' && equal(withoutMode(reliefStart.before), withoutMode(reliefStart.after)), reliefStart);
        const relief = [];
        for (let night = 25; night <= 36; night++) relief.push(await page.evaluate(() => __progressionTest.settle()));
        check(`${economy}: all twelve controlled relief settlements reach the durable final choice`, relief.every(settlementValid) && relief.at(-1).after.mode === 'reliefComplete' && relief.at(-1).phase === 'victory', { nights: relief.length, failures: relief.filter(row => !settlementValid(row)), ending: relief.at(-1).after.mode });
        const reliefResume = await page.evaluate(() => __progressionTest.resume('expedition'));
        const endlessStart = await page.evaluate(() => {
          const before = __progressionTest.material(__DL.readState().run), ok = __DL.continueAfterRelief();
          return { ok, before, after: __progressionTest.material(__DL.readState().run), phase: __DL.readState().phase };
        });
        check(`${economy}: relief ending resumes and enters endless without resetting material`, reliefResume.resumed && equal(reliefResume.before, reliefResume.after) && endlessStart.ok && endlessStart.phase === 'camp' && endlessStart.after.mode === 'endless' && endlessStart.after.night === 37 && equal(withoutMode(endlessStart.before), withoutMode(endlessStart.after)), endlessStart);
        Object.assign(evidence, { reliefStart, relief, reliefResume, endlessStart });
      }
      expected[route.family] = await page.evaluate(() => __progressionTest.material(__DL.readState().run));
      campaigns.push(evidence);
    }
    await page.reload({ waitUntil: 'load', timeout: 60000 }); await setup(page);
    const afterReload = await page.evaluate(families => families.map(family => {
      __DL.showMenu(); const ok = __DL.resumeCheckpoint(family);
      return { family, ok, material: __progressionTest.material(__DL.readState().run), phase: __DL.readState().phase };
    }), routes.map(route => route.family));
    check(`${economy}: all eight independent endings survive a complete document reload`, afterReload.every(row => row.ok && equal(row.material, expected[row.family])), afterReload);
  } finally { await context.close(); }
}
async function defeatRetries(economy) {
  const { context, page } = await newPage(`retry ${economy}`);
  try {
    for (const route of routes) {
      await page.evaluate(({ route, economy }) => __progressionTest.start(route, economy), { route, economy });
      for (let n = 1; n <= 3; n++) await page.evaluate(() => __progressionTest.settle());
      const bought = await page.evaluate(() => __progressionTest.purchase());
      const defeat = await page.evaluate(({ route, families }) => {
        const { copy, material } = __progressionTest;
        const others = () => Object.fromEntries(families.filter(family => family !== route.family).map(family => [family, material(__DL.checkpointFor(family))]));
        const before = copy(__DL.readState().run), parkedBefore = others();
        __DL.start(); __DL.stopLoop();
        const s = __DL.readState(), id = s.wave.v21Metrics.id;
        __DL.setScreenAim(650, 440); __DL.fire(); __DL.grenade();
        const spent = material(s.run);
        // Defeat-state regression, explicitly injected after native expenditure.
        s.run.health = 0; __DL.step(0.05);
        const read = () => ({ phase: __DL.readState().phase, sessions: copy(__DL.getData().meta.v21Playtests.filter(item => item.id === id)),
          lastSession: copy(s.run.v21LastSession), checkpoint: copy(__DL.getV21Checkpoint()), button: !!document.getElementById('v21RetryNight'),
          reports: document.querySelectorAll('#dialogBody .v21-session-card').length, xp: __DL.getData().meta.xp, cash: s.run.cash, parked: others() });
        const first = read(); __DL.endRun(false); const repeated = read();
        return { before, spent, parkedBefore, first, repeated, fee: s.wave.fee };
      }, { route, families: routes.map(r => r.family) });
      const label = `${economy}/${route.id}, night 4`;
      check(`${label}: defeat records its own report exactly once`, defeat.first.phase === 'defeat' && defeat.first.sessions.length === 1 && defeat.first.sessions[0].result === 'defeat' && defeat.first.sessions[0].night === 4 && defeat.first.sessions[0].score === 0 && defeat.first.sessions[0].grade === 'D' && defeat.first.reports === 1 && equal(defeat.first.sessions, defeat.repeated.sessions) && defeat.first.xp === defeat.repeated.xp && defeat.first.cash === defeat.repeated.cash, { first: defeat.first.sessions, repeated: defeat.repeated.sessions, reportCards: defeat.first.reports });
      const checkpointMatches = equal(defeat.first.checkpoint, defeat.before);
      check(`${label}: retry offers this route's exact preparation after real expenditure`, defeat.first.button && checkpointMatches && defeat.spent.cash === defeat.before.cash - defeat.fee && defeat.spent.inventory[0] === defeat.before.inventory[0] - 1 && bought.cost > 0, { button: defeat.first.button, checkpointMode: defeat.first.checkpoint?.mode, checkpointNight: defeat.first.checkpoint?.night, checkpointMatches, fee: defeat.fee, paidPurchase: bought.cost, grenadeSpent: defeat.before.inventory[0] - defeat.spent.inventory[0] });
      let restored = null;
      if (defeat.first.button && checkpointMatches) {
        // Exercise the actual production retry control, not a replacement helper.
        await page.locator('#v21RetryNight').click();
        restored = await page.evaluate(before => {
          const { copy, material } = __progressionTest;
          const actual = copy(__DL.readState().run), comparable = copy(actual), expected = copy(before);
          delete comparable.v21Retries; delete expected.v21Retries;
          const repeated = __DL.v21RestoreDefeatCheckpoint();
          return { phase: __DL.readState().phase, actual, material: material(actual), exact: JSON.stringify(comparable) === JSON.stringify(expected), count: actual.v21Retries, repeated, afterRepeated: material(__DL.readState().run), checkpoint: __DL.getV21Checkpoint(), xp: __DL.getData().meta.xp };
        }, defeat.before);
      }
      check(`${label}: production retry restores purchases, fees, ammo and consumables once`, restored?.phase === 'camp' && restored.exact && restored.count === (defeat.before.v21Retries || 0) + 1 && restored.repeated === false && restored.checkpoint === null && equal(restored.material, restored.afterRepeated) && restored.xp === defeat.first.xp, restored && { exact: restored.exact, retryCount: restored.count, repeated: restored.repeated, cash: restored.actual.cash, phase: restored.phase });
      let reloaded = null;
      if (restored) {
        await page.reload({ waitUntil: 'load', timeout: 60000 }); await setup(page);
        reloaded = await page.evaluate(({ route, families }) => {
          const ok = __DL.resumeCheckpoint(route.family);
          return { ok, material: __progressionTest.material(__DL.readState().run), others: Object.fromEntries(families.filter(family => family !== route.family).map(family => [family, __progressionTest.material(__DL.checkpointFor(family))])) };
        }, { route, families: routes.map(r => r.family) });
      }
      check(`${label}: restored checkpoint survives reload without changing other routes`, reloaded?.ok && equal(reloaded.material, restored.material) && equal(reloaded.others, defeat.parkedBefore) && equal(defeat.first.parked, defeat.parkedBefore), reloaded && { sameMaterial: equal(reloaded.material, restored.material), othersUnchanged: equal(reloaded.others, defeat.parkedBefore) });
      retries.push({ economy, route: route.id, bought, defeat, restored, reloaded });
    }
  } finally { await context.close(); }
}
async function combatPilot() {
  const { context, page } = await newPage('native combat pilot');
  try {
    await page.evaluate(() => __progressionTest.start({ start: 'startNew' }, 'field'));
    for (let night = 1; night <= 4; night++) {
      const row = await page.evaluate(night => {
        const { copy, material } = __progressionTest;
        const before = material(__DL.readState().run), lots = [__progressionTest.purchase()];
        // A fixed one-lot policy can run out during the first heavy encounter.
        // Plan enough paid reserve for this short pilot, within the real budget.
        while (lots.length < 4 && __DL.equippedSupplyPlan().affordable) {
          const r = __DL.readState().run, id = r.activeId, ammo = r.weapons[id];
          if (id === 'pistol' || ammo.mag + ammo.reserve >= 350) break;
          lots.push(__progressionTest.purchase());
        }
        const purchase = { bought: lots.every(lot => lot.bought), cost: lots.reduce((n, lot) => n + lot.cost, 0), spent: lots.reduce((n, lot) => n + lot.spent, 0), lots };
        __DL.loadCampMagazines();
        const preparation = material(__DL.readState().run);
        __DL.start(); __DL.stopLoop();
        const wave = __DL.readState().wave, initialTotal = wave.total, seen = {}, observations = [];
        const ammoStart = copy(__DL.readState().run.weapons);
        let frames = 0;
        // Read positions to automate aim. Use the normal cooldown, reload, hit
        // detection, difficulty, enemy list and cash rules without modifications.
        for (; frames < 18000 && __DL.readState().phase === 'combat'; frames++) {
          const s = __DL.readState();
          const ammo = s.run.weapons[s.run.activeId];
          if (s.run.activeId !== 'pistol' && ammo.mag + ammo.reserve === 0) document.getElementById('pistolBtn').click();
          for (const enemy of s.enemies) seen[enemy.id] = enemy.type;
          const candidates = s.enemies.filter(enemy => !enemy.dead && __DL.targetVisible(enemy)).sort((a, b) => b.x - a.x);
          if (candidates.length) {
            const target = candidates[0], p = __DL.projectedEnemy(target);
            __DL.setScreenAim(p.x, p.head); __DL.fire();
          }
          __DL.step(0.05);
          if (frames % 600 === 0) observations.push({ seconds: wave.time, spawned: wave.spawned, kills: wave.kills, health: s.run.health, wall: s.run.wall, cash: s.run.cash });
        }
        const s = __DL.readState(), after = material(s.run);
        const shots = copy(wave.v21Metrics.byWeapon);
        const ammoSpent = Object.entries(ammoStart).filter(([id]) => id !== 'pistol').map(([id, ammo]) => ({ id, initial: ammo.mag + ammo.reserve, final: s.run.weapons[id].mag + s.run.weapons[id].reserve, shots: shots[id]?.shots || 0 }));
        return copy({ night, before, purchase, preparation, after, phase: s.phase, seed: s.run.seed, frames, seconds: wave.time,
          initialTotal, total: wave.total, spawned: wave.spawned, kills: wave.kills, seenTypes: [...new Set(Object.values(seen))], seenEnemies: Object.keys(seen).length,
          shots, ammoSpent, report: s.run.report, ledger: s.run.ledgerHistory.at(-1), observations });
      }, night);
      pilot.push(row);
      check(`Native combat pilot: night ${night} settles after actual spawns and weapon kills`, row.phase === 'camp' && row.after.night === night + 1 && row.spawned === row.total && row.kills === row.total && row.seenEnemies === row.total && row.report.night === night && row.after.health > 0, { seconds: row.seconds, enemies: row.total, killed: row.kills, weapons: row.shots, phase: row.phase, seenTypes: row.seenTypes });
      check(`Native combat pilot: night ${night} spends finite ammunition and pays its preparation`, row.purchase.bought && row.purchase.cost === row.purchase.spent && row.ammoSpent.every(a => a.initial - a.final === a.shots) && row.ammoSpent.some(a => a.shots > 0) && row.ledger.closing === row.after.cash && row.ledger.opening - row.ledger.preparation - row.ledger.fee + row.ledger.defense + row.ledger.sortie + row.ledger.other === row.ledger.closing, { purchase: row.purchase.cost, ammoSpent: row.ammoSpent, ledger: row.ledger });
      if (row.phase !== 'camp') break;
    }
    check('Native combat pilot reaches four nights including the first heavy contact', pilot.length === 4 && pilot.at(-1).after.night === 5 && pilot.at(-1).seenTypes.some(type => ['brute', 'ram', 'iron', 'mortar', 'conductor', 'alpha'].includes(type)), { completedNights: pilot.filter(row => row.phase === 'camp').length, lastTypes: pilot.at(-1)?.seenTypes });
  } finally { await context.close(); }
}
(async () => {
  try {
    if (section === 'all' || section === 'controlled') for (const economy of ['field', 'classic']) await completeCampaigns(economy);
    if (section === 'all' || section === 'retries') for (const economy of ['field', 'classic']) await defeatRetries(economy);
    if (section === 'all' || section === 'pilot') await combatPilot();
    check('The tested HTML stayed unchanged throughout the run', digest(game) === gameSha256);
    check('No uncaught JavaScript errors', runtimeErrors.length === 0, runtimeErrors);
  } catch (error) { fatal = error.stack || String(error); console.error(fatal); }
  finally {
    if (browser) await browser.close();
    const report = { started, finished: new Date().toISOString(), browser: browserVersion, viewport: { width: 1440, height: 900 },
      game: path.basename(game), sha256: gameSha256, testSha256, section, mode: 'file://, offline, original embedded images, opt-in ?test=1',
      passed: checks.filter(c => c.ok).length, failed: checks.filter(c => !c.ok).length, checks, runtimeErrors, fatal,
      controlledTransitions: campaigns.reduce((n, campaign) => n + campaign.rows.length + (campaign.relief?.length || 0), 0), campaigns, retries, pilot,
      limitations: [
        'Campaign and relief completion uses explicit controlled arrival/objective/enemy states. It verifies settlement, economic arithmetic and durable transitions, not natural campaign balance.',
        'Defeat regression injects health zero only after normal departure fees, firing and grenade expenditure. It is not a naturally lost encounter.',
        'The four-night pilot automates aim and simulation ticks through the test API, using real enemy generation, weapon damage, cooldowns, finite ammunition and production purchases. It is not a human playtest or a full campaign replay.',
        'Headless desktop browser only; physical controls, audio perception and long-form difficulty remain separate work.',
      ] };
    fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, failed: report.failed, controlledTransitions: report.controlledTransitions, pilotNights: pilot.length, fatal: !!fatal, report: path.join(out, 'report.json') }));
    if (fatal || report.failed) process.exitCode = 1;
  }
})();
