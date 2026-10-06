// Broken-screen sweep against a mocked backend.
//
// Serves the production build, signs in as a fake coach (and then a fake portal
// client) by seeding a Supabase session, answers every Supabase request
// (auth, REST, functions, storage) from in-memory fixtures, and visits every
// route in src/App.jsx + the portal routes. Fails on uncaught page errors,
// error-boundary screens, unexpected "not found" pages and near-empty pages.
//
//   VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_ANON_KEY=x npm run build
//   node scripts/e2e-mock.mjs [--widths=1440,390] [--only=/clients] [--shots=dir]
//
// It checks that screens render and survive realistic data, not that the
// backend is correct (RLS, functions and SQL have their own verify:* checks).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4180;
const BASE = `http://localhost:${PORT}`;
const SUPA = 'https://placeholder.supabase.co';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const WIDTHS = (args.widths || '1440,390').split(',').map(Number);

const now = Date.now();
const iso = (daysAgo = 0) => new Date(now - daysAgo * 86400000).toISOString();
const day = (daysAgo = 0) => iso(daysAgo).slice(0, 10);
const COACH = '11111111-1111-4111-8111-111111111111';
const PORTAL = '22222222-2222-4222-8222-222222222222';
const C1 = 'c1111111-1111-4111-8111-111111111111';
const C2 = 'c2222222-2222-4222-8222-222222222222';
const P1 = 'a1111111-1111-4111-8111-111111111111';
const N1 = 'b1111111-1111-4111-8111-111111111111';

const program = {
  id: P1, title: '12-week strength', created_by: COACH, duration_weeks: 12, created_at: iso(30), updated_at: iso(2),
  workouts: [
    { day_name: 'Day 1 · Lower', exercises: [{ name: 'Back squat', sets: 4, reps: '6', rest: 120 }, { name: 'Romanian deadlift', sets: 3, reps: '8' }] },
    { day_name: 'Rest', exercises: [] },
    { day_name: 'Day 2 · Upper', exercises: [{ name: 'Bench press', sets: 4, reps: '6' }] },
  ],
};
const clientRow = (id, name, extra = {}) => ({
  id, name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, user_id: COACH, created_by: COACH,
  status: 'active', lifecycle_status: 'active', goal: 'Build strength', current_weight: 182, starting_weight: 190, target_weight: 175,
  assigned_program_id: P1, assigned_nutrition_id: N1, tags: ['online'], created_at: iso(60), updated_at: iso(1), start_date: day(60), ...extra,
});
const FIX = {
  profiles: [
    { id: COACH, email: 'coach@example.com', full_name: 'Casey Coach', role: 'admin', subscription_tier: 'enterprise', billing_status: 'active', is_comped: true, ai_generation_count: 3, ai_generation_month: iso().slice(0, 7), created_at: iso(90) },
    { id: PORTAL, email: 'jordan@example.com', full_name: 'Jordan Client', role: 'client', subscription_tier: 'starter', billing_status: 'none', created_at: iso(60) },
  ],
  clients: [clientRow(C1, 'Jordan Client', { portal_user_id: PORTAL }), clientRow(C2, 'Sam Rivera With A Very Long Name For Layout Testing', { lifecycle_status: 'at_risk', assigned_nutrition_id: null })],
  workout_programs: [program],
  nutrition_plans: [{ id: N1, title: 'Lean bulk', created_by: COACH, client_id: C1, calories: 2600, protein_g: 180, carbs_g: 300, fats_g: 75, meals: [], created_at: iso(20) }],
  check_ins: [
    { id: 'd1111111-1111-4111-8111-111111111111', client_id: C1, client_name: 'Jordan Client', date: day(2), weight: 181.2, energy_level: 7, stress_level: 4, mood: 'good', compliance_nutrition: 80, review_status: 'pending', notes: 'Wins: PR on squat', photo_urls: [], responses: [{ question_id: 'x', preset_key: null, label: 'Favourite meal?', type: 'text_short', value: 'Salmon' }], created_at: iso(2) },
    { id: 'd2222222-2222-4222-8222-222222222222', client_id: C2, client_name: 'Sam Rivera', date: day(16), weight: 201, review_status: 'reviewed', coach_notes: 'Nice work', created_at: iso(16) },
  ],
  check_in_forms: [{ id: 'f1111111-1111-4111-8111-111111111111', name: 'Weekly', is_active: true, created_by: COACH, questions: [{ id: 'q1', preset_key: 'weight', type: 'number', label: 'Weight?' }, { id: 'q2', type: 'text_short', label: 'Favourite meal?' }] }],
  messages: [
    { id: 'e1111111-1111-4111-8111-111111111111', client_id: C1, content: 'How was the session?', sender: 'coach', created_at: iso(1), is_read: true },
    { id: 'e2222222-2222-4222-8222-222222222222', client_id: C1, content: 'Great, hit a PR!', sender: 'client', created_at: iso(0.5), is_read: false },
  ],
  workout_sessions: [{ id: 'f2222222-2222-4222-8222-222222222222', client_id: C1, program_id: P1, workout_day_name: 'Day 1 · Lower', completed_at: iso(3), duration_minutes: 55, exercise_logs: [] }],
  invoices: [{ id: 'f3333333-3333-4333-8333-333333333333', client_id: C1, client_name: 'Jordan Client', amount: 199, status: 'pending', due_date: day(-5), invoice_number: 'INV-001', created_by: COACH, created_at: iso(5) }],
  payments: [{ id: 'f4444444-4444-4444-8444-444444444444', client_id: C1, client_name: 'Jordan Client', amount: 199, status: 'paid', paid_date: day(35), created_at: iso(35) }],
  notifications: [{ id: 'f5555555-5555-4555-8555-555555555555', recipient_id: COACH, title: 'New check-in', body: 'Jordan submitted a check-in', category: 'checkin', is_read: false, created_at: iso(2) }],
  ai_usage_events: [
    { request_id: 'req_aaa', kind: 'llm_call', feature: 'generateAIProgram', model: 'claude-sonnet-5-5', status: 'ok', latency_ms: 21000, input_tokens: 4000, output_tokens: 6000, estimated_cost_usd: 0.068, created_at: iso(0.2) },
    { request_id: 'req_bbb', kind: 'llm_call', feature: 'aiMessageAssistant', model: 'claude-sonnet-5-5', status: 'error', error_type: 'AI_TIMEOUT', latency_ms: 60000, created_at: iso(0.1) },
    { request_id: 'req_aaa', kind: 'charge', feature: 'generateAIProgram', status: 'ok', credits: 1, created_at: iso(0.2) },
  ],
  client_error_events: [{ source: 'render', message: 'Example crash', route: '/clients', release: 'abc1234', created_at: iso(0.3) }],
  processed_stripe_events: [{ event_type: 'invoice.paid', processed_at: iso(1) }],
};
FIX.clients_portal_view = FIX.clients.slice(0, 1);
FIX.check_ins_portal_view = FIX.check_ins.slice(0, 1);
FIX.coaching_sessions_portal_view = [];
FIX.coaching_sessions = [{ id: 'f6666666-6666-4666-8666-666666666666', client_id: C1, title: 'Check-in call', start_time: iso(-1), created_by: COACH }];

function b64url(obj) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }
function session(user) {
  const exp = Math.floor(now / 1000) + 3600 * 24;
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.sig`;
  return { access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp,
    user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: user.full_name }, app_metadata: {} } };
}

function routesFromApp() {
  const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  return [...src.matchAll(/<Route path="(\/[^"*:]*)"/g)].map((m) => m[1])
    .filter((p) => !['/login', '/signup', '/forgot-password', '/reset-password', '/start', '/join', '/client-onboarding', '/unsubscribe'].includes(p));
}
const PORTAL_ROUTES = ['/portal', '/portal/workouts', '/portal/nutrition', '/portal/checkin', '/portal/progress', '/portal/calendar', '/portal/community', '/portal/messages', '/portal/notifications', '/portal/profile', '/portal/billing', '/workout'];

async function mockBackend(page, user) {
  await page.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': '*', ...headers }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return json({});
    if (p.startsWith('/auth/v1/user')) return json(session(user).user);
    if (p.startsWith('/auth/v1/')) return json({ ...session(user) });
    if (p.startsWith('/functions/v1/')) return json({ ok: true, data: {} });
    if (p.startsWith('/storage/v1/')) return json({ signedURL: '/x.png', signedUrls: [] });
    if (p.startsWith('/rest/v1/rpc/')) return json(null);
    if (p.startsWith('/rest/v1/')) {
      const table = p.slice('/rest/v1/'.length);
      if (req.method() !== 'GET' && req.method() !== 'HEAD') {
        let body = {};
        try { body = req.postDataJSON() ?? {}; } catch { /* no body */ }
        const row = Array.isArray(body) ? body[0] : body;
        return json([{ id: crypto.randomUUID(), created_at: iso(), ...row }], 201);
      }
      let rows = FIX[table] ?? [];
      for (const [k, v] of url.searchParams) {
        const m = /^eq\.(.*)$/.exec(v);
        if (m && rows.length && k in rows[0]) rows = rows.filter((r) => String(r[k]) === m[1]);
      }
      const single = (req.headers().accept || '').includes('vnd.pgrst.object');
      if (single) return rows.length ? json(rows[0]) : json({ code: 'PGRST116', message: 'no rows' }, 406);
      return json(rows, 200, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
    }
    return json({});
  });
  await page.addInitScript((s) => {
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify(s));
    localStorage.setItem('koach-onboarding-dismissed', '1');
  }, session(user));
}

const IGNORE = /websocket|realtime|Failed to load resource|favicon|manifest|service worker|ERR_|net::/i;

async function sweep(browser, user, routes, label) {
  let failures = 0;
  for (const width of WIDTHS) {
    for (const route of routes) {
      if (args.only && route !== args.only) continue;
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
      await mockBackend(page, user);
      await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch((e) => errors.push(`nav: ${e.message}`));
      await page.waitForTimeout(700);
      const info = await page.evaluate(() => ({
        text: document.body.innerText,
        path: location.pathname,
        // What a user experiences: can the page itself be scrolled sideways?
        // (scrollWidth alone over-reports when the root clips overflow.)
        overflow: (() => { window.scrollTo(10000, window.scrollY); const x = window.scrollX; window.scrollTo(0, window.scrollY); return x; })(),
      }));
      if (args.shots) await page.screenshot({ path: `${args.shots}/${label}-${width}${route.replace(/\//g, '_') || '_'}.png`, fullPage: false });
      const problems = [...errors];
      if (/This page ran into a problem|A new version of KOACH/.test(info.text)) problems.push('error boundary shown');
      if (/page not found|doesn't exist|does not exist/i.test(info.text) && !/^\/system$/.test(route)) problems.push('not-found page');
      if (info.text.trim().length < 40) problems.push(`near-empty page (${info.text.trim().length} chars)`);
      if (info.overflow > 2) {
        // Name the widest offenders so the fix is obvious.
        // Overflowing elements that no ancestor clips (those are what widen the page).
        const culprits = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const clipped = (el) => {
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const o = getComputedStyle(p).overflowX;
              if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') return true;
            }
            return false;
          };
          return [...document.querySelectorAll('body *')]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 2 && !clipped(el); })
            .filter((el, _i, all) => !all.includes(el.parentElement))
            .slice(0, 3)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 5).join('.')} (right ${Math.round(el.getBoundingClientRect().right)}px)`);
        });
        if (args.debug) {
          const chain = await page.evaluate(() => {
            const far = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > 1000).filter((el, _i, all) => !all.includes(el.parentElement)).slice(0, 5)
              .map((el) => `FAR ${el.tagName}.${String(el.className).slice(0, 70)} right=${Math.round(el.getBoundingClientRect().right)} pos=${getComputedStyle(el).position}`);
            const t = document.querySelector('table') || document.body;
            const out = [];
            for (let p = t; p; p = p.parentElement) out.push(`${p.tagName}.${String(p.className).slice(0, 50)} w=${Math.round(p.getBoundingClientRect().width)} sw=${p.scrollWidth} ox=${getComputedStyle(p).overflowX}`);
            return [...far, ...out];
          });
          console.log(chain.join('\n'));
        }
        problems.push(`horizontal overflow ${info.overflow}px: ${culprits.join(', ')}`);
      }
      if (problems.length) {
        failures++;
        console.log(`FAIL [${label} ${width}] ${route} -> ${info.path}\n   ${problems.slice(0, 4).join('\n   ')}`);
      } else {
        console.log(`PASS [${label} ${width}] ${route} -> ${info.path}`);
      }
      await page.close();
    }
  }
  return failures;
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;
let failures = 0;
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }
  browser = await chromium.launch(existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  failures += await sweep(browser, FIX.profiles[0], routesFromApp(), 'coach');
  failures += await sweep(browser, FIX.profiles[1], PORTAL_ROUTES, 'client');
} finally {
  await browser?.close();
  preview.kill();
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nall screens rendered');
process.exit(failures ? 1 : 0);
