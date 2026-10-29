#!/usr/bin/env node
'use strict';

// Real production HTML, original images, real UI input, network disabled.
// Requires Playwright. Optional: HORDE_BROWSER_EXECUTABLE=/path/to/chromium.
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
const game = path.join(root, 'game', 'JOUER_DERNIERE_LIGNE.html');
const outFlag = process.argv.indexOf('--out');
const out = path.resolve(outFlag >= 0 ? process.argv[outFlag + 1] : path.join(root, 'artifacts', 'smoke'));
const checks = [];
const runtimeErrors = [];
const consoleErrors = [];
const networkRequests = [];
const failedRequests = [];
const screenshots = [];
let browser;

function check(name, ok, details = null, fatal = true) {
  checks.push({ name, ok: Boolean(ok), details });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok && fatal) throw new Error(`Check failed: ${name}`);
}

async function phase(page, value) {
  await page.waitForFunction(expected => document.getElementById('shell')?.dataset.phase === expected, value);
}

async function load(page) {
  await page.goto(pathToFileURL(game).href, { waitUntil: 'load', timeout: 60000 });
  await page.locator('#menuScreen').waitFor({ state: 'visible' });
  await page.locator('#dl42Boot').waitFor({ state: 'detached' });
}

async function runViewport(width, height) {
  const label = `${width}x${height}`;
  const context = await browser.newContext({ viewport: { width, height } });
  await context.setOffline(true);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => runtimeErrors.push({ viewport: label, message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push({ viewport: label, message: message.text() });
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url())) networkRequests.push({ viewport: label, url: request.url() });
  });
  page.on('requestfailed', request => failedRequests.push({ viewport: label, url: request.url().slice(0,200), error: request.failure()?.errorText }));
  try {
    await load(page);
    check(`${label}: production build 0.44.1`, (await page.title()).endsWith('0.44.1') && await page.evaluate(() => window.DL44UI?.version === '0.44.1'));
    check(`${label}: no test API`, await page.evaluate(() => typeof window.__DL === 'undefined'));
    check(`${label}: menu loaded offline`, await page.locator('#menuScreen').isVisible());

    await page.locator('[data-page="options"]').click();
    await page.locator('#aboutGame').click();
    check(`${label}: About shows current build`, (await page.locator('#dialogBody').innerText()).includes('0.44.1'));
    await page.keyboard.press('Escape');
    await page.locator('#menuScreen').waitFor({ state: 'visible' });
    check(`${label}: Escape closes About`, await page.locator('#menuScreen').isVisible());

    await page.locator('[data-page="campaigns"]').click();
    await page.locator('#newCampaign').click();
    const training = page.getByRole('button', { name: 'COMMENCER SANS FORMATION', exact: true });
    if (await training.isVisible()) await training.click();
    await page.locator('#campScreen').waitFor({ state: 'visible' });
    check(`${label}: campaign preparation`, await page.locator('#startWaveBtn').isVisible());
    const campSize = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    check(`${label}: preparation fits viewport`, campSize.width <= campSize.viewport + 2, campSize);

    if (width === 414) {
      check(`${label}: opening splash stays closed during preparation`, await page.locator('#dl42Boot').count() === 0);
      // Let the native 240 ms contentEnter animation finish before recording pixels.
      await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('shopBody')).opacity) >= .999);
      const name = `camp-${label}.png`;
      await page.screenshot({ path: path.join(out, name) });
      screenshots.push(name);
    }

    await page.locator('#startWaveBtn').click();
    const cinematicSkip = page.locator('#v18CinemaSkip');
    if (await cinematicSkip.isVisible()) await cinematicSkip.click();
    await phase(page, 'combat');
    check(`${label}: first wave starts through UI`, await page.locator('#combatBar').isVisible());
    const hudSize = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    check(`${label}: combat fits viewport`, hudSize.width <= hudSize.viewport + 2, hudSize);

    if (width === 1440) {
      check(`${label}: opening splash stays closed during combat`, await page.locator('#dl42Boot').count() === 0);
      await page.waitForTimeout(1500); // Let the real wave and its graphics advance.
      const name = `combat-${label}.png`;
      await page.screenshot({ path: path.join(out, name) });
      screenshots.push(name);
    }

    await page.locator('#pauseBtn').click();
    await phase(page, 'paused');
    check(`${label}: pause opens`, await page.getByRole('button', { name: 'REPRENDRE', exact: true }).isVisible());
    await page.getByRole('button', { name: 'REPRENDRE', exact: true }).click();
    await phase(page, 'combat');
    check(`${label}: resume returns to combat`, !await page.locator('#dialogScreen').isVisible());
    await page.keyboard.press('Escape');
    await phase(page, 'paused');
    check(`${label}: keyboard pause`, await page.getByRole('button', { name: 'REPRENDRE', exact: true }).isVisible());
    await page.getByRole('button', { name: 'MENU', exact: true }).click();
    await page.locator('#menuScreen').waitFor({ state: 'visible' });
    check(`${label}: return to menu`, await page.locator('#menuScreen').isVisible());

    const saveMetadata = await page.evaluate(() => Object.keys(localStorage).map(key => {
      try { const value=JSON.parse(localStorage.getItem(key)); return { key, version:value?.version, length:localStorage.getItem(key).length }; }
      catch { return { key, length:localStorage.getItem(key).length }; }
    }));
    check(`${label}: a profile is saved locally`, saveMetadata.some(item => item.version === 12), saveMetadata);
    await load(page);
    check(`${label}: reload retains a schema-12 profile`, await page.evaluate(() => Object.keys(localStorage).some(key => { try { return JSON.parse(localStorage.getItem(key))?.version === 12; } catch { return false; } })));
  } finally {
    await context.close();
  }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const started = new Date().toISOString();
  let error = null;
  let browserVersion = null;
  try {
    browser = await playwright.chromium.launch({
      ...(process.env.HORDE_BROWSER_EXECUTABLE ? { executablePath: process.env.HORDE_BROWSER_EXECUTABLE } : {}),
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    browserVersion = browser.version();
    for (const [width,height] of [[1440,900],[896,414],[414,896]]) await runViewport(width,height);
    check('No uncaught JavaScript errors', runtimeErrors.length === 0, runtimeErrors, false);
    check('No browser console errors', consoleErrors.length === 0, consoleErrors, false);
    check('No HTTP(S) dependency requests', networkRequests.length === 0, networkRequests, false);
    check('No failed resource requests', failedRequests.length === 0, failedRequests, false);
    if (checks.some(item => !item.ok)) throw new Error('Runtime diagnostics failed; see the recorded checks.');
  } catch (failure) {
    error = failure.stack || String(failure);
    console.error(error);
  } finally {
    if (browser) await browser.close();
    const report = {
      started, finished: new Date().toISOString(), game: 'game/JOUER_DERNIERE_LIGNE.html',
      sha256: crypto.createHash('sha256').update(fs.readFileSync(game)).digest('hex'),
      testScriptSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
      browser: browserVersion, protocol: 'file:', offline: true, originalImages: true,
      testAPIEnabled: false, inputMethod: 'Production UI clicks and keyboard',
      passed: checks.filter(item=>item.ok).length, total: checks.length,
      checks, runtimeErrors, consoleErrors, networkRequests, failedRequests, screenshots, error,
      observations: ['The opening splash runs once per document load. The production title, menu, About panel and DL44UI identify 0.44.1. Captures use the shipped HTML and its original images.'],
      limitations: ['Short smoke of the first campaign wave; not a replay of the 471 historical checks.', 'Headless desktop browser with viewport emulation; not physical mobile, audio listening, balancing, or performance certification.'],
    };
    fs.writeFileSync(path.join(out, 'smoke-game.json'), JSON.stringify(report, null, 2)+'\n');
    console.log(JSON.stringify({ passed:report.passed, total:report.total, error, report:path.join(out,'smoke-game.json') }));
    process.exitCode = error || checks.some(item=>!item.ok) ? 1 : 0;
  }
})();
