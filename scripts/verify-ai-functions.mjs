#!/usr/bin/env node
/**
 * Step 5d rehearsal — AI functions' DB-facing logic against real Postgres,
 * with the Anthropic API stubbed (no network).
 *
 * Runs REAL modules (not reimplementations):
 *   - _shared/aiMetering.js       — monthly limit gate + counter writes
 *   - _shared/assistantTools.js   — claudeAssistant's tool executor with the
 *                                   multi-tenant ownership scoping (the legacy
 *                                   original had NONE — every tool ran
 *                                   asServiceRole cross-tenant)
 *   - _shared/importMapping.js    — deterministic CSV mapper + AI-merge policy
 *   - _shared/anthropic.js        — envelope + JSON extraction via stubbed fetch
 *
 * Usage: POSTGRES_URL=postgresql://postgres@127.0.0.1:55432/aitest \
 *          node scripts/verify-ai-functions.mjs
 */
import pg from 'pg';
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => v);
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1700, parseFloat);

// ── Deno + fetch shims (before importing the shared modules) ────────────────
const ENV = { ANTHROPIC_API_KEY: 'sk-ant-test-stub' };
globalThis.Deno = globalThis.Deno ?? { env: { get: (k) => ENV[k] } };

let nextClaudeText = '{}';
let lastRequest = null;
globalThis.fetch = async (url, opts) => {
  lastRequest = { url, body: JSON.parse(opts.body) };
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text: nextClaudeText }] }),
    text: async () => '',
  };
};

const { meterAiGeneration, guardAiUse, TIER_AI_LIMITS } = await import('../supabase/functions/_shared/aiMetering.js');
const { executeAssistantTool } = await import('../supabase/functions/_shared/assistantTools.js');
const { deterministicMap, mergeResults } = await import('../supabase/functions/_shared/importMapping.js');
const { invokeClaude, extractJson } = await import('../supabase/functions/_shared/anthropic.js');

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) { console.error('Set POSTGRES_URL'); process.exit(1); }
const db = new pg.Client({ connectionString: POSTGRES_URL });
await db.connect();

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
};
const count = async (sql, vals = []) => (await db.query(sql, vals)).rows[0].n;

// ── minimal supabase-shaped shim over pg ────────────────────────────────────
class Q {
  constructor(t) { this.t = t; this.w = []; this.v = []; this.orX = null; this.lim = null; this.ord = null; this.mode = 'select'; this.cols = '*'; this.payload = null; this.single_ = false; this.maybe = false; this.ret = null; }
  select(c = '*') { if (this.mode === 'insert') { this.ret = c; return this; } this.mode = 'select'; this.cols = c; return this; }
  insert(p) { this.mode = 'insert'; this.payload = p; return this; }
  update(p) { this.mode = 'update'; this.payload = p; return this; }
  eq(c, val) { this.w.push([c, val]); return this; }
  or(x) { this.orX = x; return this; }
  order(c, o = {}) { this.ord = `${c} ${o.ascending === false ? 'desc' : 'asc'}`; return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.maybe = true; return this; }
  single() { this.single_ = true; return this; }
  then(ok, err) { return this._run().then(ok, err); }
  async _run() {
    try {
      const vals = []; const conds = [];
      for (const [c, v] of this.w) { vals.push(v); conds.push(`${c} = $${vals.length}`); }
      if (this.orX) {
        const parts = this.orX.split(',').map((p) => {
          const [c, , ...r] = p.split('.'); vals.push(r.join('.'));
          return `${c} = $${vals.length}`;
        });
        conds.push(`(${parts.join(' or ')})`);
      }
      const w = conds.length ? ` where ${conds.join(' and ')}` : '';
      if (this.mode === 'select') {
        let sql = `select ${this.cols} from public.${this.t}${w}`;
        if (this.ord) sql += ` order by ${this.ord}`;
        if (this.lim) sql += ` limit ${this.lim}`;
        const r = await db.query(sql, vals);
        return { data: (this.maybe || this.single_) ? (r.rows[0] ?? null) : r.rows, error: null };
      }
      if (this.mode === 'insert') {
        const keys = Object.keys(this.payload);
        const sql = `insert into public.${this.t} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')})${this.ret ? ` returning ${this.ret}` : ''}`;
        const r = await db.query(sql, keys.map((k) => JSON.stringify(this.payload[k]) === undefined ? null : this.payload[k]).map((v) => Array.isArray(v) || (v && typeof v === 'object') ? JSON.stringify(v) : v));
        return { data: this.ret ? ((this.single_ || this.maybe) ? (r.rows[0] ?? null) : r.rows) : null, error: null };
      }
      // update
      const keys = Object.keys(this.payload);
      const uv = keys.map((k) => { const v = this.payload[k]; return Array.isArray(v) || (v && typeof v === 'object') ? JSON.stringify(v) : v; });
      const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const w2 = [];
      for (const [c, v] of this.w) { uv.push(v); w2.push(`${c} = $${uv.length}`); }
      await db.query(`update public.${this.t} set ${set}${w2.length ? ` where ${w2.join(' and ')}` : ''}`, uv);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
}
const svc = {
  from: (t) => new Q(t),
  // Mirrors supabase-js .rpc for the atomic quota function.
  rpc: async (fn, a) => {
    const r = await db.query(`select * from public.${fn}($1,$2,$3)`, [a.p_profile, a.p_limit, a.p_month]);
    return { data: r.rows, error: null };
  },
};

// ── seed ────────────────────────────────────────────────────────────────────
const COACH_A = '00000000-0000-0000-0000-0000000000d1';
const COACH_B = '00000000-0000-0000-0000-0000000000d2';
for (const t of ['client_badges', 'messages', 'check_ins', 'nutrition_plans', 'workout_programs', 'exercise_library', 'clients']) {
  await db.query(`delete from public.${t}`);
}
await db.query('delete from auth.users where id in ($1,$2)', [COACH_A, COACH_B]);
await db.query(`insert into auth.users (id, email) values ($1,'coach.a@ai.io'), ($2,'coach.b@ai.io')`, [COACH_A, COACH_B]);
await db.query(`update public.profiles set subscription_tier='starter', ai_generation_count=0, ai_generation_month=null where id in ($1,$2)`, [COACH_A, COACH_B]);

const { rows: [clientX] } = await db.query(
  `insert into public.clients (name, email, user_id, created_by, lifecycle_status)
   values ('Xavier Own','x@ai.io',$1,$1,'active') returning *`, [COACH_A]);
const { rows: [ci] } = await db.query(
  `insert into public.check_ins (client_id, client_name, date, created_by) values ($1,'Xavier Own','2026-07-15',$2) returning id`, [clientX.id, COACH_A]);

// ── 1. metering (shared guard, real profile writes) ─────────────────────────
{
  const NOW = new Date('2026-07-15T12:00:00Z');
  // Metering sits behind the billing gate: a coach needs access (here: active).
  await db.query(`update public.profiles set billing_status='active', ai_generation_count=14, ai_generation_month='2026-07' where id=$1`, [COACH_A]);
  let prof = (await db.query('select * from public.profiles where id=$1', [COACH_A])).rows[0];
  const m1 = await meterAiGeneration(svc, prof, NOW);
  prof = (await db.query('select ai_generation_count, ai_generation_month from public.profiles where id=$1', [COACH_A])).rows[0];
  check('metering: 14/15 starter generation allowed and incremented to 15',
    m1.allowed === true && prof.ai_generation_count === 15 && prof.ai_generation_month === '2026-07');

  prof = (await db.query('select * from public.profiles where id=$1', [COACH_A])).rows[0];
  const m2 = await meterAiGeneration(svc, prof, NOW);
  check('metering: 15/15 starter blocked with legacy-shaped 402',
    m2.allowed === false && m2.status === 402 && m2.body.error === 'monthly_ai_limit_reached'
    && m2.body.used === 15 && m2.body.limit === 15 && /upgrade to Pro/.test(m2.body.message));

  const m3 = await meterAiGeneration(svc, prof, new Date('2026-08-01T00:00:00Z'));
  prof = (await db.query('select ai_generation_count, ai_generation_month from public.profiles where id=$1', [COACH_A])).rows[0];
  check('metering: month rollover resets the counter',
    m3.allowed === true && prof.ai_generation_count === 1 && prof.ai_generation_month === '2026-08');

  const m4 = await meterAiGeneration(svc, { id: COACH_A, subscription_tier: 'enterprise', billing_status: 'active' }, NOW);
  check('metering: enterprise is unmetered', m4.allowed === true && m4.limit === -1 && TIER_AI_LIMITS.enterprise === -1);

  // Billing gate: no subscription / trial => 402 billing_required, counter untouched.
  const m5 = await meterAiGeneration(svc, { id: COACH_A, subscription_tier: 'pro', billing_status: 'none' }, NOW);
  check('metering: no billing access -> 402 billing_required', m5.allowed === false && m5.status === 402 && m5.body.error === 'billing_required');
  const m6 = await meterAiGeneration(svc, { id: COACH_A, subscription_tier: 'enterprise', billing_status: 'none', is_comped: true }, NOW);
  check('metering: comped account passes the billing gate', m6.allowed === true);
}

// ── 1b. guardAiUse: one guard for every AI function (aiPolicy.js) ───────────
{
  const NOW = new Date('2026-10-15T12:00:00Z');
  const setCoach = (fields) => db.query(
    `update public.profiles set subscription_tier=$2, billing_status=$3, is_comped=$4, ai_generation_count=$5, ai_generation_month=$6 where id=$1`,
    [COACH_A, fields.tier, fields.status ?? 'active', fields.comped ?? false, fields.count ?? 0, fields.month ?? '2026-10']);
  const run = async (key, opts) => {
    const profile = (await db.query('select * from public.profiles where id=$1', [COACH_A])).rows[0];
    return guardAiUse(svc, { auth: { id: COACH_A }, profile }, key, { now: NOW, ...opts });
  };
  const used = async () => (await db.query('select ai_generation_count c from public.profiles where id=$1', [COACH_A])).rows[0].c;

  await setCoach({ tier: 'pro', count: 12 });
  check('counted: program generation counts 1 (12 -> 13)', (await run('generateAIProgram')) === null && await used() === 13);
  check('counted: regenerating counts again (13 -> 14)', (await run('generateAIProgram')) === null && await used() === 14);
  check('counted: meal plan counts 1', (await run('generateMealPlan')) === null && await used() === 15);
  check('counted: smart meals counts 1', (await run('generateSmartMeals')) === null && await used() === 16);
  check('Pro: check-in summary, auto summary and AI-drafted replies allowed and NOT counted',
    (await run('aiCheckInInsights')) === null && (await run('checkin.analyze')) === null && (await run('aiMessageAssistant')) === null && await used() === 16);
  check('Pro: full assistant still refused (Elite+)', (await run('claudeAssistant'))?.status === 403 && (await run('aiNutritionInsights'))?.status === 403 && await used() === 16);

  await setCoach({ tier: 'elite', count: 40 });
  check('Elite: check-in summary allowed and NOT counted', (await run('aiCheckInInsights')) === null && (await run('checkin.analyze')) === null && await used() === 40);
  check('Elite: draft replies + full assistant allowed, NOT counted', (await run('aiMessageAssistant')) === null && (await run('claudeAssistant')) === null && await used() === 40);

  await setCoach({ tier: 'starter', count: 3 });
  check('Starter: check-in summary and draft replies refused', (await run('aiCheckInInsights'))?.body?.required_tier === 'pro' && (await run('aiMessageAssistant'))?.status === 403);
  const a = await run('claudeAssistant');
  check('Starter: full assistant -> 403 feature_not_in_plan with upgrade + required tier', a?.status === 403 && a.body.error === 'feature_not_in_plan' && a.body.required_tier === 'elite' && a.body.upgrade_required === true, JSON.stringify(a?.body));
  check('Starter: AI onboarding refused (Pro+), counter untouched', (await run('generateAIProgram', { purpose: 'onboarding' }))?.body?.error === 'feature_not_in_plan' && await used() === 3);
  await setCoach({ tier: 'pro', count: 3 });
  check('Pro: AI onboarding allowed and counted', (await run('generateMealPlan', { purpose: 'onboarding' })) === null && await used() === 4);

  await setCoach({ tier: 'pro', count: 100 });
  const lim = await run('generateAIProgram');
  check('Pro at 100/100: 402 with message, resets_on, upgrade button flag',
    lim?.status === 402 && lim.body.error === 'monthly_ai_limit_reached' && lim.body.limit === 100 && lim.body.resets_on === '2026-11-01'
    && lim.body.upgrade_required === true && /resets on 2026-11-01/.test(lim.body.message), lim?.body?.message);

  await setCoach({ tier: 'starter', count: 15, comped: true, status: 'none' });
  check('Comped: Enterprise limits (unlimited, assistant allowed) without a subscription',
    (await run('generateAIProgram')) === null && (await run('claudeAssistant')) === null);

  await setCoach({ tier: 'elite', status: 'none' });
  check('No subscription: billing_required, even for an Elite plan row', (await run('aiMessageAssistant'))?.body?.error === 'billing_required');
  await setCoach({ tier: 'starter', status: 'active', count: 0 });
}

// ── 1c. every AI edge function guards BEFORE its first Claude call ──────────
// Static source check: in each handler, guardAiUse(...) must come before any
// invokeClaude(...) or any local helper that calls it (e.g. mapImportColumns'
// aiEnhanceMapping), so a caller without access never triggers a paid request.
{
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { AI_POLICY } = await import('../supabase/functions/_shared/aiPolicy.js');
  const fnDir = new URL('../supabase/functions/', import.meta.url);
  const guarded = [];
  for (const name of readdirSync(fnDir)) {
    const file = new URL(`${name}/index.ts`, fnDir);
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    if (!/\binvokeClaude\b/.test(src) || !/\bguardAiUse\b/.test(src)) continue;
    guarded.push(name);
    // Handler entry: Deno.serve(...) or the observe.js wrapper serve('name', ...).
    const serveAt = src.search(/\bDeno\.serve\(|^serve\(/m);
    // Module-level helpers that (transitively, one level) call invokeClaude.
    const helpers = [...src.slice(0, serveAt).matchAll(/function\s+(\w+)\s*\(/g)]
      .map((m, i, all) => ({ name: m[1], body: src.slice(m.index, all[i + 1]?.index ?? serveAt) }))
      .filter((h) => /\binvokeClaude\s*\(/.test(h.body))
      .map((h) => h.name);
    const handler = src.slice(serveAt);
    const aiCall = new RegExp(`\\b(?:${['invokeClaude', ...helpers].join('|')})\\s*\\(`);
    const firstAi = handler.search(aiCall);
    const firstGuard = handler.search(/\bguardAiUse\s*\(/);
    check(`guard-before-AI: ${name}`, firstGuard !== -1 && (firstAi === -1 || firstGuard < firstAi),
      `guardAiUse at ${firstGuard}, first AI call at ${firstAi}`);
  }
  const expected = Object.keys(AI_POLICY).filter((k) => existsSync(new URL(`${k}/index.ts`, fnDir)));
  check('guard-before-AI: every AI_POLICY edge function was checked',
    expected.length > 0 && expected.every((k) => guarded.includes(k)), `missing: ${expected.filter((k) => !guarded.includes(k))}`);
}

// ── 2. assistant tools: ownership scoping (the legacy hole, closed) ────────
{
  const own = await executeAssistantTool(svc, COACH_A, 'get_client_data', { client_id: clientX.id });
  check('assistant get_client_data: owner reads client + check-ins', own.client?.id === clientX.id && Array.isArray(own.recent_checkins));

  const foreign = await executeAssistantTool(svc, COACH_B, 'get_client_data', { client_id: clientX.id });
  check('assistant get_client_data: FOREIGN coach denied', /Forbidden/.test(foreign.error ?? ''));

  const listA = await executeAssistantTool(svc, COACH_A, 'list_clients', { filter: 'all' });
  const listB = await executeAssistantTool(svc, COACH_B, 'list_clients', { filter: 'all' });
  check('assistant list_clients: scoped to own roster', listA.clients.length === 1 && listB.clients.length === 0);

  const plan = await executeAssistantTool(svc, COACH_A, 'create_nutrition_plan',
    { client_id: clientX.id, title: 'Cut Phase 1', calories: 2100, protein_g: 180, carbs_g: 200, fats_g: 65 });
  const { rows: [planRow] } = await db.query('select created_by, client_id, status from public.nutrition_plans where id=$1', [plan.plan_id]);
  const { rows: [afterAssign] } = await db.query('select assigned_nutrition_id from public.clients where id=$1', [clientX.id]);
  check('assistant create_nutrition_plan: created as CALLER + assigned',
    plan.success && planRow.created_by === COACH_A && afterAssign.assigned_nutrition_id === plan.plan_id);

  const foreignUpd = await executeAssistantTool(svc, COACH_B, 'update_nutrition_plan', { plan_id: plan.plan_id, calories: 1 });
  const { rows: [planAfter] } = await db.query('select calories from public.nutrition_plans where id=$1', [plan.plan_id]);
  check('assistant update_nutrition_plan: foreign coach denied, no write',
    /Forbidden/.test(foreignUpd.error ?? '') && planAfter.calories === 2100);

  const ownUpd = await executeAssistantTool(svc, COACH_A, 'update_nutrition_plan', { plan_id: plan.plan_id, calories: 2000 });
  check('assistant update_nutrition_plan: owner update lands', ownUpd.success === true);

  const msgB = await executeAssistantTool(svc, COACH_B, 'send_message', { client_id: clientX.id, message: 'mine now' });
  const msgA = await executeAssistantTool(svc, COACH_A, 'send_message', { client_id: clientX.id, message: 'Great work this week!' });
  const msgs = await count('select count(*)::int n from public.messages where client_id=$1', [clientX.id]);
  check('assistant send_message: owner sends via SHARED executor, foreign denied',
    msgA.success && /Forbidden/.test(msgB.error ?? '') && msgs === 1);

  const respB = await executeAssistantTool(svc, COACH_B, 'create_checkin_response', { checkin_id: ci.id, response: 'hax' });
  const respA = await executeAssistantTool(svc, COACH_A, 'create_checkin_response', { checkin_id: ci.id, response: 'Solid progress.' });
  const { rows: [ciAfter] } = await db.query('select coach_notes, coach_responded, review_status from public.check_ins where id=$1', [ci.id]);
  check('assistant create_checkin_response: owner responds, foreign denied',
    respA.success && /Forbidden/.test(respB.error ?? '') && ciAfter.coach_responded === true && ciAfter.coach_notes === 'Solid progress.');

  const badge1 = await executeAssistantTool(svc, COACH_A, 'award_badge', { client_id: clientX.id, badge_key: 'streak_7' });
  const badge2 = await executeAssistantTool(svc, COACH_A, 'award_badge', { client_id: clientX.id, badge_key: 'streak_7' });
  const badges = await count(`select count(*)::int n from public.client_badges where client_id=$1 and badge_key='streak_7'`, [clientX.id]);
  check('assistant award_badge: awarded once, duplicate deduped (shared executor)',
    badge1.success && badges === 1 && badge2.success !== false);

  const flagB = await executeAssistantTool(svc, COACH_B, 'flag_client_at_risk', { client_id: clientX.id, reason: 'nope' });
  const flagA = await executeAssistantTool(svc, COACH_A, 'flag_client_at_risk', { client_id: clientX.id, reason: 'missed 3 check-ins' });
  const { rows: [cliAfter] } = await db.query('select lifecycle_status, lifecycle_notes from public.clients where id=$1', [clientX.id]);
  check('assistant flag_client_at_risk: owner flags, foreign denied',
    flagA.success && /Forbidden/.test(flagB.error ?? '') && cliAfter.lifecycle_status === 'at_risk' && /missed 3 check-ins/.test(cliAfter.lifecycle_notes));

  const prog = await executeAssistantTool(svc, COACH_A, 'create_program', { title: '8wk UL', client_id: clientX.id, duration_weeks: 8, days_per_week: 4 });
  const { rows: [progRow] } = await db.query('select created_by from public.workout_programs where id=$1', [prog.program_id]);
  check('assistant create_program: created as caller + assigned', prog.success && progRow.created_by === COACH_A);
}

// ── 3. anthropic envelope + JSON extraction (stubbed fetch) ─────────────────
{
  nextClaudeText = 'Here you go:\n```json\n{"message":"Nice work Riley!","tone":"Motivational"}\n```';
  const r = await invokeClaude({ prompt: 'test', expectJson: true });
  check('invokeClaude: extracts JSON from fenced/prose responses',
    r.ok && r.parsed?.message === 'Nice work Riley!' && r.parsed?.tone === 'Motivational');
  check('invokeClaude: envelope has model, max_tokens, single user message',
    lastRequest.url.includes('api.anthropic.com/v1/messages')
    && typeof lastRequest.body.model === 'string'
    && lastRequest.body.messages?.[0]?.role === 'user');

  nextClaudeText = 'I could not produce JSON, sorry!';
  const bad = await invokeClaude({ prompt: 'test', expectJson: true });
  check('invokeClaude: non-JSON response with expectJson → clean error, no throw', bad.ok === false && /not parseable/.test(bad.error));

  check('extractJson: arrays, raw objects, null on garbage',
    Array.isArray(extractJson('[1,2]')) && extractJson('{"a":1}').a === 1 && extractJson('nope') === null);
}

// ── 4. import mapping (real deterministic mapper + merge policy) ────────────
{
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Weight', 'Goal Weight', 'Member Since', 'Trainer', 'Member ID', 'Favorite Color'];
  const base = deterministicMap(headers);
  check('import map: first/last name combined via sentinel',
    base.mapping['First Name'] === 'name' && base.mapping['Last Name'] === '__last_name__');
  check('import map: weight/goal weight/dates/ids resolved',
    base.mapping['Weight'] === 'current_weight' && base.mapping['Goal Weight'] === 'target_weight'
    && base.mapping['Member Since'] === 'start_date' && base.mapping['Member ID'] === 'external_id');
  check('import map: trainer column deliberately unmapped', base.mapping['Trainer'] === null);
  check('import map: unknown column unmapped', base.mapping['Favorite Color'] === null && base.confidence['Favorite Color'] === 'unmapped');

  const ai = {
    mapping: { 'Favorite Color': 'notes', 'Email': 'phone', 'Trainer': 'name' },
    confidence: { 'Favorite Color': 'low' },
  };
  const merged = mergeResults(base, ai, headers);
  check('import merge: AI fills nulls only', merged.mapping['Favorite Color'] === 'notes' && merged.confidence['Favorite Color'] === 'low');
  check('import merge: AI cannot override deterministic matches', merged.mapping['Email'] === 'email');
  check('import merge: AI cannot claim an already-used field', merged.mapping['Trainer'] !== 'name');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
await db.end();
process.exit(failures ? 1 : 0);
