#!/usr/bin/env node
/**
 * Rehearsal for the four Base44 gap closures — pure logic, in-memory fakes,
 * NO network and NO AI calls:
 *   1. checkin.analyze  (_shared/progressAnalysis.js): stores to
 *      check_ins.ai_checkin_summary, meters against the coach, skips silently
 *      over quota, is idempotent, never throws.
 *   3. Google OAuth state (_shared/googleOAuth.js): sign/verify, expiry, forgery,
 *      redirect-origin allow-list, consent URL (scope + offline), redirect URI.
 *   4. Assistant tools (_shared/assistantTools.js): writes only via preview
 *      (no side effects), ownership scoping on every tool, sets/reps change
 *      application, bounds validation.
 * (Referral rewards are a DB trigger — verified against Postgres, see PR.)
 *   node scripts/verify-gap-closure.mjs
 */
import { analyzeCheckIn, computeProgressSignals } from '../supabase/functions/_shared/progressAnalysis.js';
import {
  signState, verifyState, safeReturnOrigin, buildConsentUrl, redirectUri, CALENDAR_SCOPE,
} from '../supabase/functions/_shared/googleOAuth.js';
import {
  previewAssistantWrite, executeAssistantTool, applyProgramChanges, READ_TOOLS, WRITE_TOOLS,
} from '../supabase/functions/_shared/assistantTools.js';

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
};

// ── tiny in-memory supabase-shaped client ────────────────────────────────────
function fakeDb(tables) {
  return {
    writes: [],
    from(name) {
      const q = { eq: [], or: null, order: null, limit: null };
      const rows = () => {
        let r = (tables[name] ?? []).filter((row) => q.eq.every(([c, v]) => row[c] === v));
        if (q.or) {
          const parts = q.or.split(',').map((p) => { const [c, , ...v] = p.split('.'); return [c, v.join('.')]; });
          r = r.filter((row) => parts.some(([c, v]) => row[c] === v));
        }
        if (q.order) r = [...r].sort((a, b) => (a[q.order.c] < b[q.order.c] ? 1 : -1) * (q.order.asc ? -1 : 1));
        return q.limit ? r.slice(0, q.limit) : r;
      };
      const b = {
        select() { return b; },
        eq(c, v) { q.eq.push([c, v]); return b; },
        or(e) { q.or = e; return b; },
        order(c, o = {}) { q.order = { c, asc: o.ascending !== false }; return b; },
        limit(n) { q.limit = n; return b; },
        async maybeSingle() { return { data: rows()[0] ?? null, error: null }; },
        then(res, rej) { return Promise.resolve({ data: rows(), error: null }).then(res, rej); },
        update(vals) {
          return { eq: async (c, v) => {
            for (const r of tables[name].filter((x) => x[c] === v)) Object.assign(r, vals);
            this.writes.push({ table: name, op: 'update', vals });
            return { error: null };
          } };
        },
        insert(vals) {
          tables[name].push({ id: `new-${tables[name].length}`, ...vals });
          this.writes.push({ table: name, op: 'insert', vals });
          return { select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) };
        },
      };
      b.update = b.update.bind(this); b.insert = b.insert.bind(this);
      return b;
    },
  };
}

// ── 1. checkin.analyze ───────────────────────────────────────────────────────
{
  const mk = () => ({
    clients: [{ id: 'c1', name: 'Sam', goal: 'fat_loss', user_id: 'coachA' }],
    check_ins: [
      { id: 'k1', client_id: 'c1', date: '2026-09-01', weight: 200, compliance_training: 80, mood: 'good' },
      { id: 'k2', client_id: 'c1', date: '2026-09-08', weight: 199, compliance_training: 70, mood: 'okay' },
      { id: 'k3', client_id: 'c1', date: '2026-09-15', weight: 198.5, compliance_training: 90, mood: 'good', notes: 'felt strong' },
    ],
    messages: [{ client_id: 'c1', sender: 'coach' }, { client_id: 'c1', sender: 'client' }],
  });
  const coach = { id: 'coachA', subscription_tier: 'starter' };
  let aiCalls = 0; let metered = 0; let lastPrompt = '';
  const deps = (allowed) => ({
    meter: async () => { metered++; return { allowed }; },
    invoke: async ({ prompt }) => { aiCalls++; lastPrompt = prompt; return { ok: true, parsed: { summary: 'ok', sentiment: 'good', key_wins: [], red_flags: [] } }; },
    tool: {}, system: '',
  });

  let t = mk(); let d = fakeDb(t);
  let r = await analyzeCheckIn(d, { checkIn: t.check_ins[2], client: t.clients[0], coach }, deps(true));
  check('analyze: stores summary on the check-in', r.analysed && t.check_ins[2].ai_checkin_summary?.summary === 'ok');
  check('analyze: stamps ai_checkin_summary_at', !!t.check_ins[2].ai_checkin_summary_at);
  check('analyze: prompt carries history + base44 trend signals', /TREND SIGNALS/.test(lastPrompt) && /PREVIOUS CHECK-IN: weight 199/.test(lastPrompt));
  check('analyze: exactly one meter + one AI call', metered === 1 && aiCalls === 1);

  r = await analyzeCheckIn(d, { checkIn: t.check_ins[2], client: t.clients[0], coach }, deps(true));
  check('analyze: idempotent (already analysed → no meter, no AI)', r.skipped === 'already analysed' && metered === 1 && aiCalls === 1);

  t = mk(); d = fakeDb(t); metered = 0; aiCalls = 0;
  r = await analyzeCheckIn(d, { checkIn: t.check_ins[2], client: t.clients[0], coach }, deps(false));
  check('analyze: over quota → skipped silently, NO AI call, nothing stored',
    r.skipped === 'over quota' && aiCalls === 0 && !t.check_ins[2].ai_checkin_summary && d.writes.length === 0);

  t = mk(); d = fakeDb(t);
  r = await analyzeCheckIn(d, { checkIn: t.check_ins[2], client: t.clients[0], coach },
    { ...deps(true), invoke: async () => { throw new Error('boom'); } });
  check('analyze: model failure never throws (best-effort)', r.skipped === 'error');
  r = await analyzeCheckIn(d, { checkIn: t.check_ins[2], client: t.clients[0], coach },
    { ...deps(true), invoke: async () => ({ ok: false, error: 'x' }) });
  check('analyze: AI !ok → skipped, nothing stored', r.skipped === 'ai failed' && !t.check_ins[2].ai_checkin_summary);

  const sig = computeProgressSignals(mk().check_ins, mk().messages, new Date('2026-09-20').getTime());
  check('signals: weekly rate / days-since / no plateau', sig.weeklyWeightRate === -0.75 && sig.daysSinceLast === 5 && sig.plateau === false, JSON.stringify(sig));
  check('signals: null with <2 check-ins', computeProgressSignals([mk().check_ins[0]]) === null);
}

// ── 3. Google OAuth ──────────────────────────────────────────────────────────
{
  const secret = 'test-secret';
  const st = await signState(secret, { uid: 'u1', ret: 'https://app.koachai.net' });
  const ok = await verifyState(secret, st);
  check('google: state round-trips (uid + return origin)', ok?.uid === 'u1' && ok?.ret === 'https://app.koachai.net');
  check('google: wrong secret rejected', (await verifyState('other', st)) === null);
  const [p, s] = st.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 'victim', ret: 'https://evil.test', exp: Date.now() + 1e6 })).toString('base64url');
  check('google: forged payload rejected', (await verifyState(secret, `${forged}.${s}`)) === null);
  check('google: expired state rejected', (await verifyState(secret, st, Date.now() + 11 * 60 * 1000)) === null);
  check('google: garbage state rejected', (await verifyState(secret, 'nope')) === null && (await verifyState(secret, undefined)) === null);
  check('google: return origin allow-list',
    safeReturnOrigin('https://evil.test', 'https://app.koachai.net') === 'https://app.koachai.net'
    && safeReturnOrigin('http://localhost:5173', 'https://app.koachai.net') === 'http://localhost:5173'
    && safeReturnOrigin('https://app.koachai.net/x?y', 'https://app.koachai.net') === 'https://app.koachai.net');
  const u = new URL(buildConsentUrl({ clientId: 'cid', redirect: redirectUri('https://abc.supabase.co/'), state: 'S' }));
  check('google: consent URL scope=calendar.events, offline, consent prompt',
    u.searchParams.get('scope') === CALENDAR_SCOPE && CALENDAR_SCOPE.endsWith('/calendar.events')
    && u.searchParams.get('access_type') === 'offline' && u.searchParams.get('prompt') === 'consent'
    && u.searchParams.get('response_type') === 'code');
  check('google: redirect URI', u.searchParams.get('redirect_uri') === 'https://abc.supabase.co/functions/v1/googleCalendarCallback');
}

// ── 4. Assistant tools ───────────────────────────────────────────────────────
{
  const t = {
    clients: [
      { id: 'mine', name: 'Mine', user_id: 'coachA', assigned_program_id: 'pMine', assigned_nutrition_id: 'nMine' },
      { id: 'theirs', name: 'Theirs', user_id: 'coachB', assigned_program_id: 'pTheirs', assigned_nutrition_id: 'nTheirs' },
    ],
    nutrition_plans: [
      { id: 'nMine', title: 'Mine plan', client_id: 'mine', created_by: 'coachA', calories: 2000, protein_g: 150, carbs_g: 200, fats_g: 60 },
      { id: 'nTheirs', title: 'Their plan', client_id: 'theirs', created_by: 'coachB', calories: 2400, protein_g: 180, carbs_g: 250, fats_g: 70 },
    ],
    workout_programs: [
      { id: 'pMine', title: 'Mine prog', created_by: 'coachA', workouts: [
        { day_name: 'Day 1', day_number: 1, exercises: [{ name: 'Barbell Squat', sets: 3, reps: '8-10' }, { name: 'Leg Curl', sets: 3, reps: '12' }] },
        { day_name: 'Day 2', day_number: 2, exercises: [{ name: 'Bench Press', sets: 4, reps: '5' }] },
      ] },
      { id: 'pTheirs', title: 'Their prog', created_by: 'coachB', workouts: [{ day_name: 'Day 1', exercises: [{ name: 'Barbell Squat', sets: 3, reps: '8' }] }] },
    ],
    check_ins: [{ id: 'ciT', client_id: 'theirs', date: '2026-09-01' }, { id: 'ciM', client_id: 'mine', date: '2026-09-01' }],
  };
  const d = fakeDb(t);
  const snap = JSON.stringify(t);

  check('tools: read/write sets are disjoint and cover every tool', [...READ_TOOLS].every((x) => !WRITE_TOOLS.has(x)) && READ_TOOLS.size === 4 && WRITE_TOOLS.size === 9);

  let p = await previewAssistantWrite(d, 'coachA', 'update_nutrition_plan', { plan_id: 'nMine', calories: 1800, protein_g: 170 });
  check('preview: own nutrition plan → diff (calories 2000→1800)', p.ok && p.changes.some((c) => c.field === 'calories' && c.before === 2000 && c.after === 1800));
  p = await previewAssistantWrite(d, 'coachA', 'update_program', { program_id: 'pMine', changes: [{ workout: 'Day 1', exercise: 'barbell squat', sets: 5, reps: '5' }] });
  check('preview: own program → sets/reps diff', p.ok && p.changes[0].before === '3 x 8-10' && p.changes[0].after === '5 x 5', JSON.stringify(p.changes));
  check('preview: NO side effects (db untouched, no writes)', JSON.stringify(t) === snap && d.writes.length === 0);

  for (const [tool, input] of [
    ['update_nutrition_plan', { plan_id: 'nTheirs', calories: 1000 }],
    ['update_program', { program_id: 'pTheirs', changes: [{ workout: 'Day 1', exercise: 'Barbell Squat', sets: 9 }] }],
    ['update_client', { client_id: 'theirs', goal: 'x' }],
    ['send_message', { client_id: 'theirs', message: 'hi' }],
    ['create_checkin_response', { checkin_id: 'ciT', response: 'x' }],
    ['create_nutrition_plan', { client_id: 'theirs', title: 't', calories: 2000 }],
  ]) {
    const pv = await previewAssistantWrite(d, 'coachA', tool, input);
    const ex = await executeAssistantTool(d, 'coachA', tool, input);
    check(`scope: ${tool} on another coach's data denied (preview + execute)`, !!pv.error && /Forbidden/.test(ex.error ?? ''));
  }
  for (const [tool, input] of [['get_client_data', { client_id: 'theirs' }], ['get_program', { program_id: 'pTheirs' }], ['list_checkins', { client_id: 'theirs' }]]) {
    const ex = await executeAssistantTool(d, 'coachA', tool, input);
    check(`scope: read ${tool} on another coach's data denied`, /Forbidden/.test(ex.error ?? ''));
  }
  const lc = await executeAssistantTool(d, 'coachA', 'list_clients', {});
  check('scope: list_clients only returns own clients', lc.clients?.length === 1 && lc.clients[0].id === 'mine');
  check('read: own get_program / list_checkins work',
    (await executeAssistantTool(d, 'coachA', 'get_program', { program_id: 'pMine' })).program?.workouts?.length === 2
    && (await executeAssistantTool(d, 'coachA', 'list_checkins', { client_id: 'mine' })).checkins?.length === 1);

  for (const bad of [{ calories: 50 }, { calories: 99999 }, { protein_g: -5 }, { calories: 'abc' }]) {
    const pv = await previewAssistantWrite(d, 'coachA', 'update_nutrition_plan', { plan_id: 'nMine', ...bad });
    check(`validation: rejects ${JSON.stringify(bad)}`, !!pv.error);
  }
  check('validation: unknown workout/exercise, bad sets all rejected',
    !!applyProgramChanges(t.workout_programs[0].workouts, [{ workout: 'Day 9', exercise: 'x', sets: 3 }]).error
    && !!applyProgramChanges(t.workout_programs[0].workouts, [{ workout: 'Day 1', exercise: 'nope', sets: 3 }]).error
    && !!applyProgramChanges(t.workout_programs[0].workouts, [{ workout: 'Day 1', exercise: 'Leg Curl', sets: 99 }]).error
    && !!applyProgramChanges(t.workout_programs[0].workouts, []).error);

  // Confirm path: execute actually writes, and only what was proposed.
  let ex = await executeAssistantTool(d, 'coachA', 'update_nutrition_plan', { plan_id: 'nMine', calories: 1800, protein_g: 170 });
  check('confirm: update_nutrition_plan writes calories/macros', ex.success && t.nutrition_plans[0].calories === 1800 && t.nutrition_plans[0].protein_g === 170 && t.nutrition_plans[0].carbs_g === 200);
  ex = await executeAssistantTool(d, 'coachA', 'update_program', { program_id: 'pMine', changes: [{ workout: 'Day 1', exercise: 'Barbell Squat', sets: 5, reps: '5' }, { workout: '2', exercise: 'Bench Press', sets: 5 }] });
  const w = t.workout_programs[0].workouts;
  check('confirm: update_program writes sets/reps (by day name and day number)', ex.success && w[0].exercises[0].sets === 5 && w[0].exercises[0].reps === '5' && w[1].exercises[0].sets === 5 && w[0].exercises[1].sets === 3);
  check("scope: other coach's data untouched after all of the above", t.nutrition_plans[1].calories === 2400 && t.workout_programs[1].workouts[0].exercises[0].sets === 3);
}

console.log(failures ? `\n${failures} FAILED` : '\nAll gap-closure checks passed');
process.exit(failures ? 1 : 0);
