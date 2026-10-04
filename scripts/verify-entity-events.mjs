#!/usr/bin/env node
/**
 * Step 5c rehearsal — entity-event triggers + the three ported functions'
 * DB-facing logic, against real Postgres with ALL migrations applied
 * (including 20260714000100_entity_event_triggers.sql).
 *
 * What runs REAL code (not reimplementations):
 *   - _shared/entityEvents.js handlers (the onEntityEvent logic) through a
 *     supabase-shaped shim over node-postgres,
 *   - _shared/automationActions.js executors (the SAME write paths
 *     runAutomations uses — proving the trigger functions reuse them),
 *   - _shared/intakeMapping.js (submitOnboardingIntake's row builder) against
 *     the real onboarding_responses CHECK constraints,
 *   - _shared/subscriptionTiers.js gate expressions against real row counts,
 *   - _shared/resendEmail.js payload shape via a stubbed fetch (proves the
 *     defensive `functions.invoke('sendEmailNotification', {to,subject,html})`
 *     bodies in stripeWebhook/weeklyDigest/sendClientInvite parse cleanly),
 *   - the claim/release idempotency flow of onEntityEvent (verbatim control
 *     flow, same as the Step 5a stripe rehearsal),
 *   - the REAL DB triggers: business inserts must succeed with pg_net/vault
 *     absent (fire-and-forget guarantee), and the WHEN gates are asserted
 *     from the catalog.
 *
 * Setup (throwaway DB):
 *   psql -p 55432 -U postgres -c 'create database evttest'
 *   psql -p 55432 -U postgres -d evttest -f scripts/fixtures/auth-shim.sql
 *   for f in supabase/migrations/*.sql; do psql ... -d evttest -f $f; done
 * Run:
 *   POSTGRES_URL=postgresql://postgres@127.0.0.1:55432/evttest \
 *     node scripts/verify-entity-events.mjs
 */
import pg from 'pg';
// Keep DATE/TIMESTAMP as strings (PostgREST shape) — same as other harnesses.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => v);
pg.types.setTypeParser(1114, (v) => v);

// _shared/resendEmail.js reads Deno.env — shim it for node before importing.
globalThis.Deno = globalThis.Deno ?? {
  env: {
    get: (k) => ({
      RESEND_API_KEY: 'rk_test_shim',
      FROM_NAME: 'KOACH AI',
      FROM_EMAIL: 'noreply@koachai.test',
    })[k],
  },
};

import { handleEntityEvent } from '../supabase/functions/_shared/entityEvents.js';
import { sendMessage, notifyCoach, awardBadge } from '../supabase/functions/_shared/automationActions.js';
import { buildIntakeRow, EXPERIENCE_MAP } from '../supabase/functions/_shared/intakeMapping.js';
import { createBlocked, featureAllowed, tierLimits } from '../supabase/functions/_shared/subscriptionTiers.js';
import { sendResendEmail } from '../supabase/functions/_shared/resendEmail.js';

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) { console.error('Set POSTGRES_URL'); process.exit(1); }

const db = new pg.Client({ connectionString: POSTGRES_URL });
await db.connect();

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
};

// ── supabase-shaped shim over pg (the subset the shared modules use) ─────────
function shim() {
  return {
    from(table) {
      const q = { table, wheres: [], ors: null, limit: null, cols: '*' };
      const bld = {
        select(cols = '*') { q.cols = cols; return bld; },
        eq(col, val) { q.wheres.push([col, val]); return bld; },
        or(expr) { q.ors = expr; return bld; },
        limit(n) { q.limit = n; return bld; },
        async maybeSingle() {
          const { data, error } = await run();
          return { data: data?.[0] ?? null, error };
        },
        async single() {
          const { data, error } = await run();
          return { data: data?.[0] ?? null, error: error ?? (data?.length ? null : { message: 'no rows' }) };
        },
        insert(row) {
          const p = doInsert(row);
          return Object.assign(p, {
            select(cols) {
              return {
                async single() {
                  const r = await doInsert(row, cols || '*');
                  return { data: r.rows?.[0] ?? null, error: r.error };
                },
              };
            },
          });
        },
        update(vals) {
          return {
            async eq(col, val) {
              const sets = Object.keys(vals).map((k, i) => `${k}=$${i + 1}`).join(', ');
              try {
                await db.query(
                  `update public.${q.table} set ${sets} where ${col}=$${Object.keys(vals).length + 1}`,
                  [...Object.values(vals), val],
                );
                return { error: null };
              } catch (e) { return { error: { message: e.message, code: e.code } }; }
            },
          };
        },
        delete() {
          return {
            async eq(col, val) {
              try {
                await db.query(`delete from public.${q.table} where ${col}=$1`, [val]);
                return { error: null };
              } catch (e) { return { error: { message: e.message, code: e.code } }; }
            },
          };
        },
        then(res, rej) { return run().then(res, rej); }, // awaitable builder
      };
      async function run() {
        try {
          const conds = [];
          const params = [];
          for (const [c, v] of q.wheres) { params.push(v); conds.push(`${c}=$${params.length}`); }
          if (q.ors) {
            // supabase .or('a.eq.X,b.eq.Y') — parse the eq-only subset we use
            const parts = q.ors.split(',').map((p) => {
              const [col, , ...val] = p.split('.');
              params.push(val.join('.'));
              return `${col}=$${params.length}`;
            });
            conds.push(`(${parts.join(' or ')})`);
          }
          const sql = `select ${q.cols === '*' ? '*' : q.cols} from public.${q.table}` +
            (conds.length ? ` where ${conds.join(' and ')}` : '') +
            (q.limit ? ` limit ${q.limit}` : '');
          const { rows } = await db.query(sql, params);
          return { data: rows, error: null };
        } catch (e) { return { data: null, error: { message: e.message, code: e.code } }; }
      }
      async function doInsert(row, returning) {
        try {
          const rows_ = Array.isArray(row) ? row : [row];
          let out = [];
          for (const r of rows_) {
            const keys = Object.keys(r);
            const sql = `insert into public.${q.table} (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')})` +
              (returning ? ` returning ${returning}` : '');
            const res = await db.query(sql, Object.values(r));
            out = out.concat(res.rows ?? []);
          }
          return { rows: out, error: null };
        } catch (e) { return { rows: null, error: { message: e.message, code: e.code } }; }
      }
      return bld;
    },
  };
}
const admin = shim();

// ── email recorder injected into handlers ────────────────────────────────────
let sentEmails = [];
const recordEmail = async (msg) => { sentEmails.push(msg); return { ok: true, id: `rec_${sentEmails.length}` }; };
const APP_URL = 'https://app.koach.test';
const deps = { sendEmail: recordEmail, appUrl: APP_URL };

// ── verbatim onEntityEvent claim/release control flow ────────────────────────
async function deliver(event, { failProcessing = false } = {}) {
  try {
    await db.query(
      'insert into public.processed_entity_events (event_key, event_type) values ($1,$2)',
      [event.event_key, event.event_type],
    );
  } catch (e) {
    if (e.code === '23505') return { received: true, duplicate: true };
    throw e;
  }
  try {
    if (failProcessing) throw new Error('simulated downstream failure');
    const result = await handleEntityEvent(admin, event, deps);
    return { received: true, ...result };
  } catch (e) {
    await db.query('delete from public.processed_entity_events where event_key=$1', [event.event_key]);
    throw e;
  }
}

// ── seed ─────────────────────────────────────────────────────────────────────
const COACH = '00000000-0000-0000-0000-0000000000e1';
for (const t of ['notifications', 'messages', 'check_ins', 'workout_sessions', 'onboarding_responses',
  'coach_defaults', 'processed_entity_events', 'client_badges']) {
  await db.query(`delete from public.${t}`);
}
await db.query('delete from public.clients');
await db.query('delete from public.workout_programs');
await db.query('delete from public.nutrition_plans');
await db.query('delete from public.profiles where id=$1', [COACH]);
await db.query('delete from auth.users where id=$1', [COACH]);

await db.query(`insert into auth.users (id, email, raw_user_meta_data)
  values ($1, 'coach@events.io', jsonb_build_object('full_name', 'Eve Coach'))`, [COACH]);
// handle_new_user created the profile; normalize
await db.query(`update public.profiles set subscription_tier='starter' where id=$1`, [COACH]);

const { rows: [prog] } = await db.query(
  `insert into public.workout_programs (title, created_by) values ('Default Program', $1) returning id`, [COACH]);
const { rows: [client] } = await db.query(
  `insert into public.clients (name, email, user_id, created_by, lifecycle_status)
   values ('Cli Ent', 'client@events.io', $1, $1, 'active') returning *`, [COACH]);

// ── 0. DB triggers never block business writes (pg_net/vault absent) ─────────
check('client INSERT succeeded with entity trigger installed but pg_net/vault absent', Boolean(client?.id));

const { rows: [ci] } = await db.query(
  `insert into public.check_ins (client_id, client_name, date, weight, compliance_training, notes, created_by)
   values ($1, 'Cli Ent', current_date, 181.5, 88, 'Feeling strong this week', $2) returning *`,
  [client.id, COACH]);
check('check-in INSERT succeeded (trigger fire-and-forget)', Boolean(ci?.id));

// WHEN gates present in catalog
const { rows: trgs } = await db.query(
  `select tgname, pg_get_triggerdef(oid) def from pg_trigger where tgname like 'trg_entity%' order by tgname`);
check('all 6 entity triggers installed', trgs.length === 6, trgs.map((t) => t.tgname).join(','));
const respondedDef = trgs.find((t) => t.tgname === 'trg_entity_event_checkin_responded')?.def ?? '';
check('checkin_responded trigger gated on false→true transition',
  respondedDef.includes('WHEN ((new.coach_responded AND (NOT old.coach_responded)))'), respondedDef.slice(0, 160));
const wcUpd = trgs.find((t) => t.tgname === 'trg_entity_event_workout_completed_upd')?.def ?? '';
check('workout_completed UPDATE trigger gated on transition into completed',
  /new\.status = 'completed'.*old\.status IS DISTINCT FROM 'completed'/s.test(wcUpd));

// ── 1. checkin.created ───────────────────────────────────────────────────────
sentEmails = [];
const evt1 = { event_key: 'checkin.created:test:1', event_type: 'checkin.created', record: ci };
const r1 = await deliver(evt1);
check('checkin.created processed', r1.received === true && r1.notified === 1, JSON.stringify(r1));
{
  const { rows } = await db.query(
    `select * from public.notifications where recipient_id=$1 and type='checkin_received'`, [COACH]);
  check('coach notification written via shared notifyCoach executor',
    rows.length === 1 && rows[0].category === 'checkin' && rows[0].related_client_id === client.id
    && rows[0].related_checkin_id === ci.id && rows[0].link === '/checkin-review');
  check('notification body carries the check-in notes excerpt',
    rows[0]?.body?.includes('Feeling strong this week'));
  check('coach email sent (check-in template, addressed by name)',
    sentEmails.length === 1 && sentEmails[0].to === 'coach@events.io'
    && sentEmails[0].toName === 'Eve Coach' && sentEmails[0].subject.includes('submitted their check-in')
    && sentEmails[0].html.includes('181.50 lbs') && sentEmails[0].html.includes(`${APP_URL}/checkin-review`));
}

// duplicate delivery (same event_key) → skipped, side effects unchanged
const r1b = await deliver(evt1);
{
  const { rows } = await db.query(
    `select count(*)::int n from public.notifications where type='checkin_received'`);
  check('duplicate checkin.created delivery skipped by idempotency ledger',
    r1b.duplicate === true && rows[0].n === 1 && sentEmails.length === 1);
}

// ── 2. checkin.responded ─────────────────────────────────────────────────────
sentEmails = [];
await db.query(`update public.check_ins set coach_responded=true, coach_notes='Great week — keep the protein up.' where id=$1`, [ci.id]);
const { rows: [ci2] } = await db.query('select * from public.check_ins where id=$1', [ci.id]);
const r2 = await deliver({
  event_key: 'checkin.responded:test:1', event_type: 'checkin.responded',
  record: ci2, old_record: { ...ci2, coach_responded: false },
});
check('checkin.responded emails the CLIENT with coach feedback, reply-to coach',
  r2.emails === 1 && sentEmails[0]?.to === 'client@events.io'
  && sentEmails[0]?.replyTo === 'coach@events.io'
  && sentEmails[0]?.html.includes('Great week — keep the protein up.'),
  JSON.stringify(r2));

const r2b = await deliver({
  event_key: 'checkin.responded:test:2', event_type: 'checkin.responded',
  record: ci2, old_record: ci2, // old already responded → not a transition
});
check('checkin.responded skips non-transition (defense in depth behind WHEN gate)',
  r2b.skipped === 'not a respond transition' && sentEmails.length === 1);

// ── 3. client.created (auto-assign + welcome message via shared executors) ───
await db.query(
  `insert into public.coach_defaults (coach_id, created_by, auto_assign_enabled, default_program_id,
     send_welcome_message, welcome_message)
   values ($1, $1, true, $2, true, 'Welcome aboard, {client_name}!')`, [COACH, prog.id]);

sentEmails = [];
const { rows: [cl2] } = await db.query(
  `insert into public.clients (name, email, user_id, created_by, lifecycle_status)
   values ('New Person', 'newp@events.io', $1, $1, 'active') returning *`, [COACH]);
const r3 = await deliver({ event_key: 'client.created:test:1', event_type: 'client.created', record: cl2 });
{
  const { rows: [after] } = await db.query('select assigned_program_id from public.clients where id=$1', [cl2.id]);
  check('client.created auto-assigns the coach default program',
    after.assigned_program_id === prog.id, JSON.stringify(r3.updates_applied));
  const { rows: msgs } = await db.query(
    `select * from public.messages where client_id=$1`, [cl2.id]);
  check('welcome message written via SHARED sendMessage executor (sender coach, tag general)',
    msgs.length === 1 && msgs[0].sender === 'coach' && msgs[0].tag === 'general'
    && msgs[0].content === 'Welcome aboard, {client_name}!' && msgs[0].client_name === 'New Person');
  const { rows: notifs } = await db.query(
    `select * from public.notifications where type='new_client' and recipient_id=$1`, [COACH]);
  check('new_client notification to owning coach (link to client profile)',
    notifs.length === 1 && notifs[0].link === `/client-profile?id=${cl2.id}`
    && notifs[0].body.includes('Plans auto-assigned'));
  check('two emails: coach roster alert + client welcome (reply-to coach)',
    sentEmails.length === 2
    && sentEmails.some((e) => e.to === 'coach@events.io' && e.subject.includes('joined your roster'))
    && sentEmails.some((e) => e.to === 'newp@events.io' && e.subject.startsWith('Welcome to Eve Coach')
        && e.replyTo === 'coach@events.io' && e.html.includes(`${APP_URL}/portal`)));
}

// master toggle off → no auto-assign, no welcome message
await db.query('update public.coach_defaults set auto_assign_enabled=false where coach_id=$1', [COACH]);
sentEmails = [];
const { rows: [cl3] } = await db.query(
  `insert into public.clients (name, email, user_id, created_by, lifecycle_status)
   values ('Toggle Off', 'toff@events.io', $1, $1, 'active') returning *`, [COACH]);
const r3b = await deliver({ event_key: 'client.created:test:2', event_type: 'client.created', record: cl3 });
{
  const { rows: [after] } = await db.query('select assigned_program_id from public.clients where id=$1', [cl3.id]);
  const { rows: msgs } = await db.query('select count(*)::int n from public.messages where client_id=$1', [cl3.id]);
  check('auto_assign_enabled=false: no assignment, no welcome message (notifications/emails still sent)',
    after.assigned_program_id === null && msgs[0].n === 0
    && Object.keys(r3b.updates_applied).length === 0 && sentEmails.length === 2);
}

// ── 4. intake.submitted (real mapping → real CHECK constraints) ─────────────
const intakeRow = buildIntakeRow({
  name: 'Ida Intake',
  email: 'ida@events.io',
  formData: {
    goals: ['confidence'],                 // → general_fitness
    activity_level: 'Moderately active',   // → moderately_active
    experience: 'intermediate',            // → experienced (CHECK-safe)
    training_days_per_week: 4,
    fav_foods: ['salmon'], injuries: ['knee'],
    sleep_quality: 7, commitment_level: 9,
  },
}, COACH);
check('intake mapping: intermediate → experienced, confidence → general_fitness',
  intakeRow.previous_experience === 'experienced' && intakeRow.goal === 'general_fitness'
  && intakeRow.activity_level === 'moderately_active' && EXPERIENCE_MAP.intermediate === 'experienced');

const { rows: [intake] } = await db.query(
  `insert into public.onboarding_responses (${Object.keys(intakeRow).join(',')})
   values (${Object.keys(intakeRow).map((_, i) => `$${i + 1}`).join(',')}) returning *`,
  Object.values(intakeRow));
check('mapped intake row satisfies the new CHECK constraints (insert succeeded)', Boolean(intake?.id));

sentEmails = [];
const r4 = await deliver({ event_key: 'intake.submitted:test:1', event_type: 'intake.submitted', record: intake });
{
  const { rows: notifs } = await db.query(
    `select * from public.notifications where type='intake_submitted' and recipient_id=$1`, [COACH]);
  check('intake.submitted: prospect confirmation + coach notify emails',
    r4.emails === 2
    && sentEmails.some((e) => e.to === 'ida@events.io' && e.subject.includes('intake received'))
    && sentEmails.some((e) => e.to === 'coach@events.io' && e.subject.includes('pending review')
        && e.html.includes('Ida Intake') && e.html.includes(`${APP_URL}/onboarding-manager`)));
  check("intake in-app notification: priority high, category mapped 'intake'→'client'",
    notifs.length === 1 && notifs[0].priority === 'high' && notifs[0].category === 'client');
}

// ── 5. workout.completed ─────────────────────────────────────────────────────
const { rows: [ws] } = await db.query(
  `insert into public.workout_sessions (client_id, workout_day_name, status, duration_minutes, session_rating, session_note, created_by)
   values ($1, 'Push Day A', 'completed', 55, 8.5, 'PR on bench!', $2) returning *`, [client.id, COACH]);
sentEmails = [];
const r5 = await deliver({ event_key: 'workout.completed:test:1', event_type: 'workout.completed', record: ws });
{
  const { rows: notifs } = await db.query(
    `select * from public.notifications where type='workout_completed' and recipient_id=$1`, [COACH]);
  check("workout.completed: coach notification (category 'client_activity'→'client') + email",
    r5.notified === 1 && notifs.length === 1 && notifs[0].category === 'client'
    && notifs[0].body.includes('Push Day A · 55 min · Rating 8.5/10')
    && sentEmails.length === 1 && sentEmails[0].subject.includes('just completed Push Day A')
    && sentEmails[0].html.includes('PR on bench!'), JSON.stringify(r5));
}
const r5b = await deliver({
  event_key: 'workout.completed:test:2', event_type: 'workout.completed',
  record: { ...ws, status: 'scheduled' },
});
check('workout.completed skips non-completed sessions', r5b.skipped === 'not completed');

// ── 6. claim release on processing failure → retry succeeds ─────────────────
let threw = false;
try {
  await deliver({ event_key: 'client.created:test:fail', event_type: 'client.created', record: cl3 }, { failProcessing: true });
} catch { threw = true; }
const { rows: [{ n: claimN }] } = await db.query(
  `select count(*)::int n from public.processed_entity_events where event_key='client.created:test:fail'`);
const retry = await deliver({ event_key: 'client.created:test:fail', event_type: 'client.created', record: cl3 });
check('failed processing releases the claim; retry processes successfully',
  threw && claimN === 0 && retry.received === true && !retry.duplicate);

// ── 7. shared executors are the single write path (badge idempotency too) ───
await awardBadge(admin, null, { client_id: client.id, client_name: 'Cli Ent', badge_key: 'streak_7' });
await awardBadge(admin, null, { client_id: client.id, client_name: 'Cli Ent', badge_key: 'streak_7' });
{
  const { rows: [{ n }] } = await db.query(
    `select count(*)::int n from public.client_badges where client_id=$1 and badge_key='streak_7'`, [client.id]);
  check('awardBadge executor is idempotent per badge_key', n === 1);
}

// ── 8. validateSubscription gate against real row counts ────────────────────
{
  const { rows: [{ n: current }] } = await db.query(
    `select count(*)::int n from public.clients where user_id=$1`, [COACH]);
  check('starter under limit → create allowed', createBlocked('starter', 'max_clients', current) === false, `count=${current}`);
  // fill to the starter cap (10)
  const limit = tierLimits('starter').max_clients;
  for (let i = current; i < limit; i++) {
    await db.query(`insert into public.clients (name, email, user_id, created_by, lifecycle_status)
      values ('Filler ${'' + i}', 'filler${'' + i}@events.io', $1, $1, 'active')`, [COACH]);
  }
  const { rows: [{ n: atCap }] } = await db.query(
    `select count(*)::int n from public.clients where user_id=$1`, [COACH]);
  check('starter at max_clients=10 → validate_create_client blocks',
    atCap === limit && createBlocked('starter', 'max_clients', atCap) === true, `count=${atCap}`);
  check('enterprise unlimited → never blocks', createBlocked('enterprise', 'max_clients', 10000) === false);
  check('feature gates: starter lacks ai_features, elite has them',
    featureAllowed('starter', 'ai_features') === false && featureAllowed('elite', 'ai_features') === true
    && featureAllowed('enterprise', 'api_access') === true);
}

// ── 9. resendEmail payload contract (defensive invokers' body shape) ────────
{
  let captured = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body), auth: opts.headers.Authorization };
    return new Response(JSON.stringify({ id: 'email_stub_1' }), { status: 200 });
  };
  // exactly the body stripeWebhook/weeklyDigest send via functions.invoke
  const r = await sendResendEmail({ to: 'coach@events.io', subject: 'Digest', html: '<b>hi</b>' });
  const shaped = await sendResendEmail({ to: 'c@x.io', toName: 'Coach C', subject: 's', html: 'h', replyTo: 'r@x.io' });
  globalThis.fetch = realFetch;
  check('sendResendEmail accepts the defensive-invoker body {to,subject,html}',
    r.ok === true && captured.url === 'https://api.resend.com/emails'
    && captured.auth === 'Bearer rk_test_shim');
  check('Resend envelope matches legacy shape (from name, Name <email>, reply_to)',
    shaped.ok === true && captured.body.from === 'KOACH AI <noreply@koachai.test>'
    && captured.body.to[0] === 'Coach C <c@x.io>' && captured.body.reply_to === 'r@x.io');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
await db.end();
process.exit(failures ? 1 : 0);
