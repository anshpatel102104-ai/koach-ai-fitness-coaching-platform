#!/usr/bin/env node
/**
 * Step 5e rehearsal — final-tranche utilities against real Postgres
 * (migration 20260715000100 applied).
 *
 * Real modules exercised:
 *   - _shared/importCommit.js   — CSV normalizers + row builder + the commit
 *                                 loop's duplicate/flag semantics against the
 *                                 real clients table constraints
 *   - _shared/checkinReminders.js — Friday sweep: per-coach scoping, portal
 *                                 vs email channels, and the NEW per-week
 *                                 idempotency (legacy had none)
 *   - migration 13 objects      — push_subscriptions table + unique index +
 *                                 coach_settings Google token columns
 *
 * Usage: POSTGRES_URL=postgresql://postgres@127.0.0.1:55432/utiltest \
 *          node scripts/verify-utils.mjs
 */
import pg from 'pg';
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => v);
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1700, parseFloat);

import { mappingContext, buildClientRow, parseHeight, parseWeight, parseMonthlyRate, normalizeLifecycle } from '../supabase/functions/_shared/importCommit.js';
import { runCheckinReminders, startOfCurrentWeek } from '../supabase/functions/_shared/checkinReminders.js';

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

// ── supabase-shaped shim (adds gte/in over the 5d harness subset) ────────────
class Q {
  constructor(t) { this.t = t; this.w = []; this.orX = null; this.lim = null; this.ord = null; this.mode = 'select'; this.cols = '*'; this.payload = null; this.single_ = false; this.maybe = false; this.ret = null; }
  select(c = '*') { if (this.mode === 'insert') { this.ret = c; return this; } this.mode = 'select'; this.cols = c; return this; }
  insert(p) { this.mode = 'insert'; this.payload = p; return this; }
  update(p) { this.mode = 'update'; this.payload = p; return this; }
  eq(c, v) { this.w.push([`${c} = ?`, v]); return this; }
  gte(c, v) { this.w.push([`${c} >= ?`, v]); return this; }
  in(c, arr) { this.w.push([`${c} = any(?)`, arr]); return this; }
  or(x) { this.orX = x; return this; }
  order(c, o = {}) { this.ord = `${c} ${o.ascending === false ? 'desc' : 'asc'}`; return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.maybe = true; return this; }
  single() { this.single_ = true; return this; }
  then(ok, err) { return this._run().then(ok, err); }
  async _run() {
    try {
      const vals = []; const conds = [];
      for (const [tpl, v] of this.w) { vals.push(v); conds.push(tpl.replace('?', `$${vals.length}`)); }
      if (this.orX) {
        const parts = this.orX.split(',').map((p) => {
          const [c, , ...r] = p.split('.'); vals.push(r.join('.'));
          return `${c} = $${vals.length}`;
        });
        conds.push(`(${parts.join(' or ')})`);
      }
      const w = conds.length ? ` where ${conds.join(' and ')}` : '';
      const jsonify = (v) => (Array.isArray(v) && this.t !== 'clients') || (v && typeof v === 'object' && !Array.isArray(v)) ? JSON.stringify(v) : v;
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
        const r = await db.query(sql, keys.map((k) => jsonify(this.payload[k])));
        return { data: this.ret ? ((this.single_ || this.maybe) ? (r.rows[0] ?? null) : r.rows) : null, error: null };
      }
      const keys = Object.keys(this.payload);
      const uv = keys.map((k) => jsonify(this.payload[k]));
      const set = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const w2 = [];
      for (const [tpl, v] of this.w) { uv.push(v); w2.push(tpl.replace('?', `$${uv.length}`)); }
      await db.query(`update public.${this.t} set ${set}${w2.length ? ` where ${w2.join(' and ')}` : ''}`, uv);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
}
const admin = { from: (t) => new Q(t) };

// ── seed ────────────────────────────────────────────────────────────────────
const COACH_A = '00000000-0000-0000-0000-0000000000e1';
const COACH_B = '00000000-0000-0000-0000-0000000000e2';
const PORTAL_U = '00000000-0000-0000-0000-0000000000e3';
for (const t of ['push_subscriptions', 'notifications', 'messages', 'check_ins', 'workout_sessions', 'client_import_jobs', 'clients', 'teams']) {
  await db.query(`delete from public.${t}`);
}
await db.query('delete from auth.users where id in ($1,$2,$3)', [COACH_A, COACH_B, PORTAL_U]);
await db.query(`insert into auth.users (id, email) values ($1,'a@utils.io'), ($2,'b@utils.io'), ($3,'portal@utils.io')`, [COACH_A, COACH_B, PORTAL_U]);

// ── 1. import commit (real normalizers + loop semantics vs real constraints) ─
{
  const mapping = {
    'First Name': 'name', 'Last Name': '__last_name__', 'Email': 'email',
    'Phone': 'phone', 'Weight': 'current_weight', 'Height': 'height',
    'Status': 'status', 'Tags': 'tags', 'Rate': 'monthly_rate',
    'Member Since': 'start_date', 'Trainer': null,
  };
  const headers = [...Object.keys(mapping), 'Fav Color'];
  const rows = [
    { 'First Name': 'Tessa', 'Last Name': 'True', 'Email': 'tessa@utils.io', 'Phone': '555-1', 'Weight': '185 lbs', 'Height': '70', 'Status': 'Active', 'Tags': 'vip, premium', 'Rate': '$250/mo', 'Member Since': '2026-01-15', 'Trainer': 'Old Coach', 'Fav Color': 'teal' },
    { 'First Name': 'Dupe', 'Last Name': 'Dennis', 'Email': 'existing@utils.io' },      // duplicate (pre-seeded)
    { 'First Name': 'Nora', 'Last Name': 'NoEmail' },                                    // no email → flagged by NOT NULL
    { 'Trainer': 'x' },                                                                  // no name/email → skipped
  ];

  await db.query(`insert into public.clients (name, email, user_id, created_by) values ('Existing','existing@utils.io',$1,$1)`, [COACH_A]);

  const ctx = mappingContext(mapping, headers);
  const { data: existing } = await admin.from('clients').select('email').or(`user_id.eq.${COACH_A},created_by.eq.${COACH_A}`);
  const existingEmails = new Set(existing.map((c) => (c.email || '').toLowerCase().trim()));

  // mirror of commitClientImport's loop
  let imported = 0, skipped = 0, flagged = 0; const errorLog = [];
  for (let i = 0; i < rows.length; i++) {
    const built = buildClientRow(rows[i], i, ctx);
    if (built.skip) { errorLog.push(built.skip); skipped++; continue; }
    if (built.email && existingEmails.has(built.email.toLowerCase().trim())) { skipped++; continue; }
    const { error } = await admin.from('clients').insert({ ...built.clientData, user_id: COACH_A, created_by: COACH_A });
    if (error) { flagged++; errorLog.push(`Row ${i + 1}: ${error.message}`); continue; }
    if (built.email) existingEmails.add(built.email.toLowerCase().trim());
    imported++;
  }

  check('import: counts (1 imported, 2 skipped incl. duplicate, 1 flagged by NOT NULL email)',
    imported === 1 && skipped === 2 && flagged === 1, `i=${imported} s=${skipped} f=${flagged}`);

  const { rows: [tessa] } = await db.query(`select * from public.clients where email='tessa@utils.io'`);
  check('import: first+last merged, weight/height/rate parsed against real columns',
    tessa.name === 'Tessa True' && tessa.current_weight === 185 && tessa.height === `5'10"`
    && tessa.monthly_rate === 250 && tessa.start_date === '2026-01-15' && tessa.status === 'active',
    `${tessa.name} ${tessa.current_weight} ${tessa.height} ${tessa.monthly_rate}`);
  check('import: tags split on commas', Array.isArray(tessa.tags) && tessa.tags.join('|') === 'vip|premium');
  check('import: unmapped columns land in notes; MAPPED values do NOT (legacy bug fixed)',
    /Trainer: Old Coach/.test(tessa.notes) && /Fav Color: teal/.test(tessa.notes)
    && !/tessa@utils.io/.test(tessa.notes) && !/185/.test(tessa.notes),
    JSON.stringify(tessa.notes));
  check('import: normalizers (unit sanity)', parseWeight('~200kg?') === 200 && parseHeight('178') === `5'10"`
    && parseMonthlyRate('USD 99.50') === 99.5 && normalizeLifecycle('At Risk') === 'at_risk');
}

// ── 2. Friday reminders (real module) ────────────────────────────────────────
{
  const NOW = new Date('2026-07-17T18:00:00Z'); // a Friday
  const weekStart = startOfCurrentWeek(NOW);
  check('reminders: week starts Monday 00:00 UTC', weekStart.toISOString() === '2026-07-13T00:00:00.000Z');

  // coach A: lagging client (no check-in/workout) WITH portal identity
  const { rows: [lag] } = await db.query(
    `insert into public.clients (name, email, user_id, created_by, portal_user_id, lifecycle_status)
     values ('Laggy Lou','lou@utils.io',$1,$1,$2,'active') returning id`, [COACH_A, PORTAL_U]);
  // coach A: compliant client (check-in + completed workout this week)
  const { rows: [good] } = await db.query(
    `insert into public.clients (name, email, user_id, created_by, lifecycle_status)
     values ('Good Gil','gil@utils.io',$1,$1,'active') returning id`, [COACH_A]);
  await db.query(`insert into public.check_ins (client_id, client_name, date, created_by) values ($1,'Good Gil','2026-07-15',$2)`, [good.id, COACH_A]);
  await db.query(`insert into public.workout_sessions (client_id, workout_day_name, status, completed_at, created_by) values ($1,'Push','completed','2026-07-14T10:00:00Z',$2)`, [good.id, COACH_A]);
  // coach B: lagging client without portal identity
  const { rows: [blag] } = await db.query(
    `insert into public.clients (name, email, user_id, created_by, lifecycle_status)
     values ('Beta Bo','bo@utils.io',$1,$1,'active') returning id`, [COACH_B]);
  // a lead (not active) — never reminded
  await db.query(`insert into public.clients (name, email, user_id, created_by, lifecycle_status) values ('Lead Larry','larry@utils.io',$1,$1,'lead')`, [COACH_A]);

  let sentEmails = [];
  const sendEmail = async (m) => { sentEmails.push(m); return { ok: true }; };
  const r1 = await runCheckinReminders(admin, { sendEmail, appUrl: 'https://app.koach.test', now: NOW });

  // three lagging actives: Lou (A), Bo (B), and Tessa True imported as
  // 'active' in part 1; Good Gil (compliant) and Lead Larry are skipped
  check('reminders: exactly the three lagging ACTIVE clients emailed (compliant + lead skipped)',
    r1.count === 3 && sentEmails.length === 3
    && sentEmails.some((m) => m.to === 'lou@utils.io') && sentEmails.some((m) => m.to === 'bo@utils.io')
    && sentEmails.some((m) => m.to === 'tessa@utils.io')
    && !sentEmails.some((m) => m.to === 'gil@utils.io') && !sentEmails.some((m) => m.to === 'larry@utils.io'));
  check('reminders: email lists both pending items for a fully lagging client',
    sentEmails.every((m) => /Weekly Check-in/.test(m.html) && /Workout This Week/.test(m.html)));

  const aNudge = await count(`select count(*)::int n from public.notifications where recipient_id=$1 and type='client_friday_reminder' and related_client_id=$2`, [COACH_A, lag.id]);
  const bNudge = await count(`select count(*)::int n from public.notifications where recipient_id=$1 and type='client_friday_reminder' and related_client_id=$2`, [COACH_B, blag.id]);
  const crossTenant = await count(`select count(*)::int n from public.notifications where recipient_id=$1 and related_client_id=$2`, [COACH_A, blag.id]);
  check('reminders: nudges go to each OWNING coach only (no cross-tenant blast)', aNudge === 1 && bNudge === 1 && crossTenant === 0);

  const portalCopy = await count(`select count(*)::int n from public.notifications where recipient_id=$1 and type='friday_reminder'`, [PORTAL_U]);
  check('reminders: client in-app copy targets the linked portal identity', portalCopy === 1);

  // second run same week: idempotent
  sentEmails = [];
  const r2 = await runCheckinReminders(admin, { sendEmail, appUrl: 'https://app.koach.test', now: NOW });
  check('reminders: re-run same week sends NOTHING (per-week idempotency — new vs legacy)',
    r2.count === 0 && r2.skippedIdempotent === 3 && sentEmails.length === 0,
    `count=${r2.count} skipped=${r2.skippedIdempotent}`);
}

// ── 3. migration 13 objects ──────────────────────────────────────────────────
{
  const sub = { endpoint: 'https://push.example/ep1', keys: { p256dh: 'k', auth: 'a' } };
  await db.query(`insert into public.push_subscriptions (user_id, endpoint, subscription) values ($1,$2,$3)`, [COACH_A, sub.endpoint, JSON.stringify(sub)]);
  let dupErr = null;
  try {
    await db.query(`insert into public.push_subscriptions (user_id, endpoint, subscription) values ($1,$2,$3)`, [COACH_A, sub.endpoint, JSON.stringify(sub)]);
  } catch (e) { dupErr = e.code; }
  check('push_subscriptions: full subscription stored; one row per (user, endpoint)', dupErr === '23505');
  const { rows: [stored] } = await db.query(`select subscription from public.push_subscriptions where user_id=$1`, [COACH_A]);
  check('push_subscriptions: keys survive (legacy threw them away)', stored.subscription.keys.p256dh === 'k');

  const cols = (await db.query(`select column_name from information_schema.columns where table_name='coach_settings' and column_name like 'google_%token%'`)).rows.map((r) => r.column_name).sort();
  check('coach_settings: Google OAuth token columns present',
    cols.join(',') === 'google_access_token,google_refresh_token,google_token_expires_at'.split(',').sort().join(','), cols.join(','));
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
await db.end();
process.exit(failures ? 1 : 0);
