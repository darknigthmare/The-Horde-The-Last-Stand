#!/usr/bin/env node
'use strict';

// Regression for the opening splash and HTTP companion resources. Uses the
// production UI, original images and audio graph, with no ?test=1 game API.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
let playwright;
try { playwright = require('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
}

const root = path.resolve(__dirname, '..');
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
const gameDir = path.resolve(option('--game-dir', path.join(root, 'game')));
const game = path.join(gameDir, 'JOUER_DERNIERE_LIGNE.html');
const version = option('--version', '0.44.1');
const out = path.resolve(option('--out', path.join(root, 'artifacts', 'startup-web')));
const checks = [], diagnostics = [], requests = [], servedRequests = [], views = [];
let browser, server;
function check(name, ok, details = null) {
  checks.push({ name, ok: !!ok, details });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}

async function serve() {
  const mime = { '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml' };
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    servedRequests.push(pathname);
    const file = path.resolve(gameDir, '.' + pathname);
    if (!file.startsWith(gameDir + path.sep)) { response.writeHead(403).end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(response);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}/`;
}

async function run(protocol, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (protocol === 'file:') await context.setOffline(true);
  else {
    const origin = new URL(url).origin;
    await context.route('**/*', route => {
      const requestUrl = route.request().url();
      if (/^https?:/.test(requestUrl) && new URL(requestUrl).origin !== origin) return route.abort();
      return route.continue();
    });
  }
  await context.addInitScript(() => {
    const seen = new WeakSet();
    window.__startupAudit = { boots: [] };
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const boots = node.id === 'dl42Boot' ? [node] : [...node.querySelectorAll('#dl42Boot')];
        for (const boot of boots) if (!seen.has(boot)) {
          seen.add(boot);
          window.__startupAudit.boots.push(boot.textContent);
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => diagnostics.push({ protocol, type: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.push({ protocol, type: 'console', message: message.text() });
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url())) requests.push({ protocol, url: request.url() });
  });
  page.on('response', response => {
    if (response.status() >= 400) diagnostics.push({ protocol, type: 'http', status: response.status(), url: response.url() });
  });
  page.on('requestfailed', request => diagnostics.push({ protocol, type: 'requestfailed', url: request.url(), message: request.failure()?.errorText }));
  const phase = expected => page.waitForFunction(value => document.getElementById('shell')?.dataset.phase === value, expected);
  async function verifyStage(stage) {
    // Cross both legacy refresh intervals (180 and 240 ms). A recurring splash
    // is observable by the init-script observer even if it disappears quickly.
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      boots: window.__startupAudit.boots.slice(), bootVisible: !!document.getElementById('dl42Boot'),
      title: document.title, stamp: document.querySelector('#dl42TopStamp span:last-child')?.textContent,
      version: window.DL44UI?.version, testAPI: typeof window.__DL !== 'undefined',
    }));
    views.push({ protocol, stage, ...state });
    check(`${protocol} ${stage}: splash created once`, state.boots.length === 1, { count: state.boots.length });
    check(`${protocol} ${stage}: splash stays closed`, !state.bootVisible);
    check(`${protocol} ${stage}: current version stays consistent`, state.title.endsWith(version) && state.stamp === version && state.version === version, state);
  }
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.locator('#menuScreen').waitFor({ state: 'visible' });
    await page.locator('#dl42Boot').waitFor({ state: 'detached' });
    const boot = await page.evaluate(() => window.__startupAudit.boots);
    check(`${protocol} initial splash identifies current build`, boot.length === 1 && boot[0].includes(version), boot);
    check(`${protocol} production has no game test API`, await page.evaluate(() => typeof window.__DL === 'undefined'));
    await verifyStage('menu');
    await page.locator('[data-page="options"]').click();
    await page.locator('#aboutGame').click();
    check(`${protocol} About identifies current build`, (await page.locator('#dialogBody').innerText()).includes(version));
    await page.keyboard.press('Escape');
    await page.locator('#menuScreen').waitFor({ state: 'visible' });
    await verifyStage('return from About');
    await page.locator('[data-page="campaigns"]').click();
    await page.locator('#newCampaign').click();
    const training = page.getByRole('button', { name: 'COMMENCER SANS FORMATION', exact: true });
    if (await training.isVisible()) await training.click();
    await page.locator('#campScreen').waitFor({ state: 'visible' });
    await verifyStage('preparation');
    await page.locator('#startWaveBtn').click();
    const skip = page.locator('#v18CinemaSkip');
    if (await skip.isVisible()) await skip.click();
    await phase('combat');
    await verifyStage('combat');

    if (protocol === 'http:') {
      // Enable the real Web Audio graph through its production control. This
      // naturally loads the optional catalogue; no synthetic game state call.
      const audioResponse = page.waitForResponse(response => response.url().endsWith('/assets/audio/manifest.json'));
      if (await page.locator('#soundBtn').getAttribute('aria-pressed') === 'true') await page.locator('#soundBtn').click();
      await page.locator('#soundBtn').click();
      const response = await audioResponse;
      // Read the companion document independently: older Chromium versions may
      // discard a caught 404 fetch's body before Playwright asks for it.
      const catalogResponse = await page.request.get(new URL('assets/audio/manifest.json', url).href);
      const catalog = catalogResponse.ok() ? await catalogResponse.json() : null;
      check('http: optional audio catalogue loads successfully', response.ok() && catalogResponse.ok() && catalog?.samples && Object.keys(catalog.samples).length === 0, { status: response.status(), catalog });
      const manifest = await page.evaluate(async () => {
        const link = document.querySelector('link[rel="manifest"]');
        const response = await fetch(link.href);
        return { status: response.status, body: response.ok ? await response.json() : null };
      });
      check('http: manifest points at the playable HTML', manifest.status === 200 && manifest.body?.start_url === './JOUER_DERNIERE_LIGNE.html', manifest);
      const icons = await Promise.all((manifest.body?.icons || []).map(icon => page.request.get(new URL(icon.src, url).href)));
      check('http: manifest icons exist', icons.length > 0 && icons.every(response => response.ok()));
      // Worker-script fetches are browser-level requests and are not guaranteed
      // to appear in page.on('request'); the local server observes them too.
      check('http: no absent service worker requested', !servedRequests.some(pathname => pathname === '/sw.js'), servedRequests);
      const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(item => item.scope));
      check('http: no service worker caches an obsolete build', registrations.length === 0, registrations);
    }

    await page.locator('#pauseBtn').click();
    await phase('paused');
    await verifyStage('pause');
    await page.getByRole('button', { name: 'REPRENDRE', exact: true }).click();
    await phase('combat');
    await verifyStage('resume');
    await page.keyboard.press('Escape');
    await phase('paused');
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await page.locator('#menuScreen').waitFor({ state: 'visible' });
    await verifyStage('return to menu');
  } finally { await context.close(); }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const started = new Date().toISOString();
  let error = null, browserVersion = null;
  try {
    browser = await playwright.chromium.launch({
      ...(process.env.HORDE_BROWSER_EXECUTABLE ? { executablePath: process.env.HORDE_BROWSER_EXECUTABLE } : {}),
      headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    browserVersion = browser.version();
    await run('file:', pathToFileURL(game).href);
    const origin = await serve();
    await run('http:', origin + 'JOUER_DERNIERE_LIGNE.html');
    check('file: no HTTP(S) dependency', requests.filter(item => item.protocol === 'file:').length === 0);
    check('No JavaScript, console or resource errors', diagnostics.length === 0, diagnostics);
  } catch (failure) {
    error = failure.stack || String(failure);
    console.error(error);
  } finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    const report = {
      started, finished: new Date().toISOString(), version, game,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(game)).digest('hex'),
      testScriptSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
      browser: browserVersion, viewport: { width: 1440, height: 900 },
      protocols: ['file:', 'http:'], originalImages: true, testAPIEnabled: false,
      passed: checks.filter(item => item.ok).length, total: checks.length,
      checks, views, diagnostics, requests, servedRequests, error,
      limitations: ['Local HTTP only; no public hosting or installability certification.', 'Procedural audio activation and catalogue fallback checked, without listening validation.'],
    };
    fs.writeFileSync(path.join(out, 'startup-web.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, total: report.total, error, report: path.join(out, 'startup-web.json') }));
    process.exitCode = error || checks.some(item => !item.ok) ? 1 : 0;
  }
})();
