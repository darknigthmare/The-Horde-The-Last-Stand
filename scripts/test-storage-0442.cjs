#!/usr/bin/env node
'use strict';

// Production UI and real browser storage events. Fault injection emulates a
// full/blocked browser store; it does not replace the game's save functions.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
let playwright;
try { playwright = require('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
}
const root = path.resolve(__dirname, '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const gameDir = path.resolve(arg('--game-dir', path.join(root, 'game')));
const out = path.resolve(arg('--out', path.join(root, 'artifacts/storage-0442')));
const storeKey = 'derniere-ligne-v12';
const legacy = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/profile-0.44.0.json'), 'utf8'));
const checks = [], errors = [], consoleErrors = [], scenarios = [];
let browser, server, origin;
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function check(name, ok, details = null) {
  checks.push({ name, ok: !!ok, details });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}
async function serve() {
  server = http.createServer((request, response) => {
    const file = path.resolve(gameDir, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(gameDir + path.sep)) return response.writeHead(403).end();
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) return response.writeHead(404).end();
      const mime = { '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(response);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}
async function context() {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await c.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  return c;
}
async function pageIn(c, label, options = {}) {
  const page = await c.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push({ scenario: label, message: e.message }));
  page.on('console', e => { if (e.type() === 'error') consoleErrors.push({ scenario: label, message: e.text() }); });
  await page.addInitScript(({ key, seed, fault, blockEvents }) => {
    const storage = window.localStorage;
    const nativeGet = Storage.prototype.getItem;
    const nativeSet = Storage.prototype.setItem;
    if (seed !== undefined && !sessionStorage.getItem('storage-regression-seeded')) {
      nativeSet.call(storage, key, seed);
      sessionStorage.setItem('storage-regression-seeded', '1');
    }
    let mode = fault || null;
    window.__storageControl = {
      fault: value => { mode = value; },
      peek: name => nativeGet.call(storage, name),
    };
    Storage.prototype.getItem = function (name) {
      if (this === storage && mode === 'blocked') throw new DOMException('Storage disabled for regression', 'SecurityError');
      return nativeGet.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (this === storage && (mode === 'blocked' || mode === 'primary' && name === key || mode === 'history' && name === key + '-recovery')) {
        throw new DOMException('Storage full for regression', mode === 'blocked' ? 'SecurityError' : 'QuotaExceededError');
      }
      return nativeSet.call(this, name, value);
    };
    if (blockEvents) window.addEventListener('storage', event => event.stopImmediatePropagation(), true);
  }, { key: storeKey, seed: options.seed, fault: options.fault, blockEvents: !!options.blockEvents });
  await page.goto(origin + '/JOUER_DERNIERE_LIGNE.html', { waitUntil: 'load', timeout: 60000 });
  await page.locator('#dl42Boot').waitFor({ state: 'detached' });
  await page.locator('#menuScreen').waitFor({ state: 'visible' });
  check(`${label}: production without the game test API`, await page.evaluate(() => typeof window.__DL === 'undefined'));
  return page;
}
const raw = page => page.evaluate(key => window.__storageControl.peek(key), storeKey);
const profile = async page => JSON.parse(await raw(page));
const phase = (page, name) => page.waitForFunction(value => document.getElementById('shell')?.dataset.phase === value, name);
async function settings(page) {
  await page.locator('[data-page="options"]').click();
  await page.locator('#settingsBtn').click();
  await phase(page, 'settings');
}
async function saves(page) {
  await page.locator('[data-page="options"]').click();
  await page.locator('#saveManagerBtn').click();
  await phase(page, 'saveManager');
}
async function change(page, selector) {
  const field = page.locator(selector), before = await field.isChecked();
  await field.setChecked(!before);
  return !before;
}
async function exported(page, button, label) {
  const ready = page.waitForEvent('download');
  await page.locator(button).click();
  const download = await ready, file = path.join(out, label + '.json');
  await download.saveAs(file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
const preparations = p => Object.entries(p).filter(([,v]) => v && typeof v === 'object' && typeof v.mode === 'string').map(([key,v]) => ({ key, mode: v.mode, night: v.night, cash: v.cash, weapons: v.weapons }));
const routeLabels = ['Campagne · nuit 1', 'Nord · nuit 1', 'Métro · trajet 1', 'ARGO-17 · sortie 1', 'Autoroute · traversée 1', 'Eaux Noires · traversée 1', 'Ascension · étage 1', 'Zone Noire · secteur 1'];
const allRoutesNamed = text => routeLabels.every(label => text.includes(label));
async function summaries() {
  const c = await context();
  try {
    const page = await pageIn(c, 'profile summaries', { seed: JSON.stringify(legacy) });
    await settings(page);
    await change(page, '#activeReloadToggle');
    await page.locator('#leaveSettings').click();
    const savedBytes = await raw(page);
    await saves(page);
    const recovery = await page.locator('.recovery-entry h3').first().innerText();
    check('Recovery-copy previews name all eight saved campaigns', allRoutesNamed(recovery), recovery);
    check('The save manager describes every preparation and the current schema', /toutes ses préparations indépendantes/.test(await page.locator('.recovery-section').innerText()) && /12/.test(await page.locator('label[for="savePaste"]').innerText()));
    await page.locator('#savePaste').fill(JSON.stringify(legacy));
    await page.locator('#importPaste').click();
    await phase(page, 'saveConfirm');
    const summary = await page.locator('.save-stats').innerText();
    check('Import confirmation names all eight campaigns before replacement', allRoutesNamed(summary), summary);
    const compact = summary.replace(/\s/g, '');
    check('Import confirmation displays every independent budget', preparations(legacy).every(p => compact.includes(String(p.cash) + 'CR')), summary);
    await page.locator('#cancelImport').click();
    check('Reading and cancelling complete profile summaries does not write storage', await raw(page) === savedBytes);
    scenarios.push({ id: 'profile-summaries', routes: 8, previewsOnly: true });
  } finally { await c.close(); }
}
async function quota() {
  const c = await context();
  try {
    const page = await pageIn(c, 'quota', { seed: JSON.stringify(legacy) });
    const original = await raw(page);
    await settings(page);
    await page.evaluate(() => __storageControl.fault('primary'));
    const desired = await change(page, '#activeReloadToggle');
    check('A primary write failure keeps the previous stored bytes', original === await raw(page));
    await page.locator('#leaveSettings').click();
    check('A primary write failure exposes a persistent warning and retry action', await page.locator('#profileWarning').isVisible() && await page.locator('#retryProfileWrite').isVisible());
    await page.evaluate(() => __storageControl.fault(null));
    await page.locator('#retryProfileWrite').click();
    const saved = await profile(page);
    check('Retry commits the pending setting and clears the warning', saved.settings.activeReload === desired && !await page.locator('#profileWarning').isVisible());
    check('Retry preserves all eight campaign preparations', JSON.stringify(preparations(saved)) === JSON.stringify(preparations(legacy)));
    await page.reload({ waitUntil: 'load' });
    await page.locator('#dl42Boot').waitFor({ state: 'detached' });
    await settings(page);
    check('The successful retry survives a complete document reload', await page.locator('#activeReloadToggle').isChecked() === desired);
    scenarios.push({ id: 'primary-quota', realReload: true, originalPreparations: preparations(legacy).length });
  } finally { await c.close(); }
}
async function recoveryQuota() {
  const c = await context();
  try {
    const page = await pageIn(c, 'recovery quota', { seed: JSON.stringify(legacy) });
    await settings(page);
    await page.evaluate(() => __storageControl.fault('history'));
    const desired = await change(page, '#activeReloadToggle');
    const committed = await profile(page);
    check('A recovery-copy failure does not roll back the successful primary save', committed.settings.activeReload === desired);
    await page.locator('#leaveSettings').click();
    check('A recovery-copy failure is distinguished from an unsaved game', /Partie enregistrée.*copie de secours indisponible/.test(await page.locator('#profileWarningText').innerText()));
    await page.evaluate(() => __storageControl.fault(null));
    await settings(page);
    await change(page, '#activeReloadToggle');
    await page.locator('#leaveSettings').click();
    const history = await page.evaluate(key => JSON.parse(__storageControl.peek(key + '-recovery')), storeKey);
    check('Recovery resumes after space becomes available', history.length > 0 && history.length <= 3 && history.every(e => JSON.parse(e.text).version === 12) && !await page.locator('#profileWarning').isVisible());
    scenarios.push({ id: 'recovery-quota', historyEntries: history.length });
  } finally { await c.close(); }
}
async function tabs() {
  const c = await context();
  try {
    const first = await pageIn(c, 'first tab', { seed: JSON.stringify(legacy) });
    const second = await pageIn(c, 'second tab');
    await settings(first);
    await settings(second);
    await change(second, '#activeReloadToggle');
    const authoritative = await raw(second);
    await phase(first, 'profileConflict');
    check('A real storage event opens the stale-tab conflict choice', await first.locator('#adoptStored').isEnabled() && await first.locator('#keepLocalSession').isVisible());
    await first.locator('#keepLocalSession').click();
    await settings(first);
    const localMotion = await change(first, '#motionToggle');
    check('Keeping a session separate cannot overwrite the newer tab', await raw(first) === authoritative);
    await first.locator('#leaveSettings').click();
    check('The separate session keeps its export warning visible', /Session séparée/.test(await first.locator('#profileWarningText').innerText()));
    const local = await exported(first, '#quickProfileExport', 'separate-session');
    check('The separate session can export its own settings and preparations', local.settings.motion === localMotion && local.settings.activeReload === legacy.settings.activeReload && preparations(local).length === 8);
    check('Exporting a separate session does not mutate browser storage', await raw(first) === authoritative);
    scenarios.push({ id: 'two-tabs', event: 'native StorageEvent', separateSessionExport: true });
  } finally { await c.close(); }
}
async function lateImport() {
  const c = await context();
  try {
    const first = await pageIn(c, 'late import', { seed: JSON.stringify(legacy), blockEvents: true });
    const second = await pageIn(c, 'late writer');
    await saves(first);
    await first.locator('#savePaste').fill(JSON.stringify(legacy));
    await first.locator('#importPaste').click();
    await phase(first, 'saveConfirm');
    await settings(second);
    await change(second, '#activeReloadToggle');
    const authoritative = await raw(second);
    await first.locator('#confirmImport').click();
    await phase(first, 'profileConflict');
    check('Import confirmation rechecks storage when event delivery is suppressed', await raw(first) === authoritative);
    const conflictSummary = await first.locator('#dialogBody .notice').first().innerText();
    check('The conflict choice names all eight campaigns in the newer profile', allRoutesNamed(conflictSummary), conflictSummary);
    await first.locator('#adoptStored').click();
    await settings(first);
    check('Adopting the newer profile loads its setting without merging profiles', await first.locator('#activeReloadToggle').isChecked() === JSON.parse(authoritative).settings.activeReload);
    check('Late import conflict preserves eight independent preparations', JSON.stringify(preparations(await profile(first))) === JSON.stringify(preparations(legacy)));
    scenarios.push({ id: 'late-import', eventDeliverySuppressed: true, readBeforeWriteGuard: true });
  } finally { await c.close(); }
}
async function invalidStored(label, seed) {
  const c = await context();
  try {
    const page = await pageIn(c, label, { seed });
    check(`${label}: initial load keeps the protected bytes`, await raw(page) === seed);
    await settings(page);
    await change(page, '#activeReloadToggle');
    check(`${label}: editing a setting cannot overwrite the protected bytes`, await raw(page) === seed);
    await page.locator('#leaveSettings').click();
    check(`${label}: the protection warning remains visible`, await page.locator('#profileWarning').isVisible());
    scenarios.push({ id: label, originalBytesPreserved: true });
  } finally { await c.close(); }
}
async function blocked() {
  const c = await context();
  try {
    const page = await pageIn(c, 'blocked storage', { seed: JSON.stringify(legacy), fault: 'blocked' });
    check('Blocked storage does not prevent the production menu from opening', await page.locator('#menuScreen').isVisible());
    await page.locator('[data-page="campaigns"]').click();
    await page.locator('#newCampaign').click();
    const skip = page.getByRole('button', { name: 'COMMENCER SANS FORMATION', exact: true });
    if (await skip.isVisible()) await skip.click();
    await phase(page, 'camp');
    check('A preparation stays playable with blocked storage and a visible warning', await page.locator('#startWaveBtn').isVisible() && await page.locator('#profileWarning').isVisible());
    await page.locator('#backMenu').click();
    await saves(page);
    const exportedProfile = await exported(page, '#exportSave', 'blocked-session');
    check('Blocked browser storage still allows a portable JSON export', exportedProfile.version === 12 && exportedProfile.save?.mode === 'campaign' && exportedProfile.save?.night === 1);
    check('Blocked storage leaves the inaccessible original profile intact', await raw(page) === JSON.stringify(legacy));
    scenarios.push({ id: 'blocked-storage', exception: 'SecurityError', portableExport: true });
  } finally { await c.close(); }
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const started = new Date().toISOString();
  let failure = null, browserVersion;
  try {
    await serve();
    browser = await playwright.chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(process.env.HORDE_BROWSER_EXECUTABLE ? { executablePath: process.env.HORDE_BROWSER_EXECUTABLE } : {}) });
    browserVersion = browser.version();
    await summaries(); await quota(); await recoveryQuota(); await tabs(); await lateImport();
    await invalidStored('corrupt stored profile', '{broken');
    await invalidStored('future stored profile', JSON.stringify({ ...legacy, version: 13 }));
    await blocked();
    check('No uncaught JavaScript errors during storage failures', errors.length === 0, errors);
    check('No browser console errors during storage failures', consoleErrors.length === 0, consoleErrors);
  } catch (error) { failure = error.stack || String(error); console.error(failure); }
  finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    const report = { started, finished: new Date().toISOString(), browser: browserVersion, gameSha256: digest(path.join(gameDir, 'JOUER_DERNIERE_LIGNE.html')), testScriptSha256: digest(__filename), originalImages: true, productionUI: true, testAPI: false, protocol: 'http-localhost', passed: checks.filter(c => c.ok).length, total: checks.length, checks, scenarios, errors, consoleErrors, error: failure, limitations: ['Storage failures are deliberately injected into browser Storage methods; this is not a physical full-disk test.', 'Concurrent writes are guarded optimistically; this does not prove an atomic cross-tab lock.'] };
    fs.writeFileSync(path.join(out, 'storage.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, total: report.total, error: !!failure, report: path.join(out, 'storage.json') }));
    process.exitCode = failure || checks.some(c => !c.ok) ? 1 : 0;
  }
})();
