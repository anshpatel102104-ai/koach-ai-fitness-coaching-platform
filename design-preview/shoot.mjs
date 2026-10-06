#!/usr/bin/env node
/**
 * Screenshot the real app with seeded mock data (no backend).
 *
 *   node design-preview/shoot.mjs                         # default route list
 *   node design-preview/shoot.mjs today=/ clients=/clients portal=/portal?as=client
 *   node design-preview/shoot.mjs --desktop-only clients=/clients
 *   node design-preview/shoot.mjs --mobile-only --dark today=/
 *
 * Flags: --desktop-only | --mobile-only | --dark (prefers-color-scheme: dark)
 *        --wait=<ms> extra settle time after network idle (default 800)
 * Env:   PREVIEW_PORT (default 5288), PREVIEW_OUT (default design-preview/out),
 *        PLAYWRIGHT_CHROMIUM (explicit chrome binary)
 *
 * Output: <out>/<name>-<desktop|mobile>.png (full page). Per-route page errors and
 * console errors are printed; exit code is 0 even when a page logs errors.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const OUT = path.resolve(process.env.PREVIEW_OUT || path.join(here, 'out'));
mkdirSync(OUT, { recursive: true });

// Seeded ids (see design-preview/seed.js IDS)
const JORDAN = 'c1000000-0000-4000-8000-000000000001';
const UPPER_LOWER = 'd1000000-0000-4000-8000-000000000001';

const DEFAULT_ROUTES = [
  ['today', '/'],
  ['clients', '/clients'],
  ['client-profile', `/client-profile?id=${JORDAN}`],
  ['checkin-review', '/checkin-review'],
  ['messages', '/messages'],
  ['programs', '/programs'],
  ['program-builder', `/program-builder?id=${UPPER_LOWER}`],
  ['nutrition', '/nutrition'],
  ['schedule', '/schedule'],
  ['exercises', '/exercises'],
  ['subscription', '/subscription'],
  ['settings', '/settings'],
  ['portal', '/portal?as=client'],
  ['portal-workouts', '/portal/workouts?as=client'],
  ['portal-checkin', '/portal/checkin?as=client'],
  ['portal-nutrition', '/portal/nutrition?as=client'],
  ['login', '/login?as=anon'],
];

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// ---- args ----------------------------------------------------------------------
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')).map((a) => a.split('=')[0]));
const waitArg = args.find((a) => a.startsWith('--wait='));
const SETTLE_MS = waitArg ? Number(waitArg.split('=')[1]) : 800;
const specs = args.filter((a) => !a.startsWith('--')).map((a) => {
  const i = a.indexOf('=');
  if (i === -1) return [a.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'root', a];
  return [a.slice(0, i), a.slice(i + 1)];
});
const routes = specs.length ? specs : DEFAULT_ROUTES;
let viewports = ['desktop', 'mobile'];
if (flags.has('--desktop-only')) viewports = ['desktop'];
if (flags.has('--mobile-only')) viewports = ['mobile'];
const colorScheme = flags.has('--dark') ? 'dark' : 'light';

// ---- server --------------------------------------------------------------------
// No HMR / file watching while shooting: other people (or agents) editing src/
// mid-run would otherwise trigger reloads and half-written-module errors.
const vite = await createServer({
  configFile: path.join(here, 'vite.config.js'),
  server: { hmr: false, watch: null },
});
await vite.listen();
const PORT = vite.config.server.port;
const BASE = `http://localhost:${PORT}`;
console.log(`design-preview server on ${BASE}`);

// ---- browser -------------------------------------------------------------------
function chromeCandidates() {
  const list = [process.env.PLAYWRIGHT_CHROMIUM, '/opt/pw-browsers/chromium'];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of readdirSync(root)) {
      if (d.startsWith('chromium-')) list.push(path.join(root, d, 'chrome-linux', 'chrome'));
      if (d.startsWith('chromium_headless_shell-')) list.push(path.join(root, d, 'chrome-linux', 'headless_shell'));
    }
  } catch { /* no browsers dir */ }
  return list.filter((p) => p && existsSync(p));
}

const proxyEnv = process.env.HTTPS_PROXY || process.env.https_proxy;
const launchOpts = {
  // Google Fonts are reachable only through the sandbox proxy (if any).
  ...(proxyEnv ? { proxy: { server: proxyEnv, bypass: 'localhost,127.0.0.1' } } : {}),
};
let browser;
try {
  browser = await chromium.launch(launchOpts);
} catch (firstErr) {
  for (const executablePath of chromeCandidates()) {
    try { browser = await chromium.launch({ ...launchOpts, executablePath }); break; } catch { /* try next */ }
  }
  if (!browser) { await vite.close(); throw firstErr; }
}

// Only localhost + Google Fonts are allowed out; everything else (unsplash,
// youtube thumbnails, stripe.js…) is aborted so network-idle is deterministic.
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com']);

async function shoot(name, route, vp) {
  const context = await browser.newContext({ ...VIEWPORTS[vp], colorScheme, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
  await context.route('**/*', (r) => {
    let host = '';
    try { host = new URL(r.request().url()).hostname; } catch { /* data: etc */ }
    if (!host || ALLOWED_HOSTS.has(host)) return r.continue();
    return r.abort();
  });
  const page = await context.newPage();
  const errors = [];
  const warnings = new Set();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/net::ERR_FAILED|ERR_BLOCKED|Failed to load resource/.test(t)) return; // our own aborted external requests
    // React dev-mode warnings (keys, refs, act…) are app hygiene, not render failures
    if (t.startsWith('Warning:')) { warnings.add(t.split('\n')[0].replace(/%s/g, '').slice(0, 160)); return; }
    errors.push(`console: ${t.slice(0, 400)}`);
  });
  const url = BASE + (route.startsWith('/') ? route : `/${route}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    errors.push(`goto: ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(SETTLE_MS);
  const file = path.join(OUT, `${name}-${vp}.png`);
  try {
    // Pages that scroll inside a fixed full-viewport container (the client
    // portal) have no document scroll, so fullPage alone would only capture
    // one screen. Grow the viewport to the inner scroll height instead.
    const innerHeight = await page.evaluate(() => {
      const vh = window.innerHeight;
      let best = 0;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (!/(auto|scroll)/.test(cs.overflowY)) continue;
        if (el.clientHeight < vh * 0.7 || el.scrollHeight <= el.clientHeight + 4) continue;
        best = Math.max(best, el.scrollHeight + (vh - el.clientHeight));
      }
      return best > document.documentElement.scrollHeight ? Math.min(best, 16000) : 0;
    });
    if (innerHeight) {
      await page.setViewportSize({ width: VIEWPORTS[vp].viewport.width, height: innerHeight });
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: file, fullPage: true });
  } catch (e) {
    errors.push(`screenshot: ${e.message.split('\n')[0]}`);
  }
  const finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
  await context.close();
  return { name, vp, route, finalPath, file, errors, warnings: [...warnings] };
}

const results = [];
for (const [name, route] of routes) {
  for (const vp of viewports) {
    let r = await shoot(name, route, vp);
    // A cold Vite dep cache can re-optimize mid-run (duplicate module instances,
    // "Failed to fetch dynamically imported module"); one retry clears that.
    if (r.errors.length) r = { ...(await shoot(name, route, vp)), retried: true };
    results.push(r);
    console.log(`${r.errors.length ? '!' : '✓'} ${name} [${vp}] ${route}${r.finalPath !== route ? `  -> ${r.finalPath}` : ''}${r.retried ? ' (retried)' : ''}`);
    console.log(`    ${r.file}`);
    for (const e of r.errors) console.log(`    ${e}`);
    for (const w of r.warnings) console.log(`    (react warning) ${w}`);
  }
}

await browser.close();
await vite.close();

const failing = results.filter((r) => r.errors.length);
console.log(`\n${results.length} screenshots in ${OUT}; ${failing.length} with errors.`);
