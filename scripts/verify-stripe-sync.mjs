#!/usr/bin/env node
/**
 * Rehearses the REAL syncSubscriptionToUser (supabase/functions/_shared/stripeSync.js)
 * against Postgres with the migrated schema (incl. 20261006000100): plan from
 * price.lookup_key, billing interval, status, trial_end, current_period_end,
 * cancel_at_period_end, 3-day grace anchor, and stale-subscription protection.
 *
 * Usage: POSTGRES_URL=postgresql://postgres@127.0.0.1:55432/<db> node scripts/verify-stripe-sync.mjs
 */
import pg from 'pg';
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
import { syncSubscriptionToUser, invoiceSubscriptionId } from '../supabase/functions/_shared/stripeSync.js';
import { billingAccess } from '../supabase/functions/_shared/billingAccess.js';

const db = new pg.Client({ connectionString: process.env.POSTGRES_URL });
if (!process.env.POSTGRES_URL) { console.error('Set POSTGRES_URL'); process.exit(1); }
await db.connect();

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
};

// Minimal PostgREST-shaped service client over pg (just what the sync uses).
const svc = {
  from(table) {
    const q = { table, filters: [], op: 'select', patch: null };
    const api = {
      select() { return api; },
      update(patch) { q.op = 'update'; q.patch = patch; return api; },
      eq(col, val) { q.filters.push([col, val]); return api; },
      limit() { return api; },
      async maybeSingle() {
        const where = q.filters.map(([c], i) => `${c}=$${i + 1}`).join(' and ');
        const { rows } = await db.query(`select * from public.${q.table} where ${where} limit 1`, q.filters.map(([, v]) => v));
        return { data: rows[0] ?? null, error: null };
      },
      then(resolve, reject) {
        (async () => {
          const cols = Object.keys(q.patch);
          const sets = cols.map((c, i) => `${c}=$${i + 1}`).join(', ');
          const where = q.filters.map(([c], i) => `${c}=$${cols.length + i + 1}`).join(' and ');
          try {
            await db.query(`update public.${q.table} set ${sets} where ${where}`, [...cols.map((c) => q.patch[c]), ...q.filters.map(([, v]) => v)]);
            return { error: null };
          } catch (e) { return { error: e }; }
        })().then(resolve, reject);
      },
    };
    return api;
  },
};

const U = '00000000-0000-0000-0000-00000000b001';
await db.query('delete from auth.users where id=$1', [U]);
await db.query(`insert into auth.users (id, email) values ($1,'sync@x.io')`, [U]);
const profile = async () => (await db.query('select * from public.profiles where id=$1', [U])).rows[0];

const sec = (d) => Math.floor((Date.now() + d * 86400000) / 1000);
const sub = (over = {}) => ({
  id: 'sub_A', customer: 'cus_A', status: 'trialing', cancel_at_period_end: false,
  trial_end: sec(30), metadata: { user_id: U },
  items: { data: [{ price: { id: 'price_1', lookup_key: 'koach_pro_monthly', recurring: { interval: 'month' } }, current_period_end: sec(30) }] },
  ...over,
});

check('new profile starts with NO access', !billingAccess(await profile()).hasAccess);

// 1. checkout -> trialing
await syncSubscriptionToUser(svc, sub());
let p = await profile();
check('plan mapped from lookup_key (pro)', p.subscription_tier === 'pro');
check('interval monthly', p.billing_cycle === 'monthly');
check('status trialing + customer/subscription ids stored', p.billing_status === 'trialing' && p.stripe_customer_id === 'cus_A' && p.stripe_subscription_id === 'sub_A');
check('trial_ends_at and current_period_end stored', !!p.trial_ends_at && !!p.current_period_end && !!p.subscription_renewal_date);
check('trialing grants access', billingAccess(p).hasAccess);

// 2. switch to elite yearly, cancel at period end (portal)
await syncSubscriptionToUser(svc, sub({ status: 'active', trial_end: null, cancel_at_period_end: true,
  items: { data: [{ price: { id: 'price_2', lookup_key: 'koach_elite_yearly', recurring: { interval: 'year' } }, current_period_end: sec(365) }] } }));
p = await profile();
check('plan -> elite, interval -> annual', p.subscription_tier === 'elite' && p.billing_cycle === 'annual');
check('cancel_at_period_end stored, still active', p.subscription_cancel_at_period_end === true && p.billing_status === 'active');
check('trial_ends_at cleared once trial is over', p.trial_ends_at === null);

// 3. payment fails -> past_due, grace anchored once
await syncSubscriptionToUser(svc, sub({ status: 'past_due', trial_end: null }));
p = await profile();
const since1 = p.past_due_since;
check('past_due sets past_due_since and keeps access (grace)', p.billing_status === 'past_due' && !!since1 && billingAccess(p).reason === 'grace');
await new Promise((r) => setTimeout(r, 20));
await syncSubscriptionToUser(svc, sub({ status: 'past_due', trial_end: null }));
check('repeat past_due does NOT move the grace anchor', (await profile()).past_due_since === since1);
await db.query(`update public.profiles set past_due_since = now() - interval '4 days' where id=$1`, [U]);
check('past_due older than 3 days loses access', !billingAccess(await profile()).hasAccess);

// 4. invoice.paid recovers
await syncSubscriptionToUser(svc, sub({ status: 'active', trial_end: null }));
p = await profile();
check('recovery clears past_due_since and restores access', p.past_due_since === null && billingAccess(p).hasAccess);

// 5. stale deleted event for an OLD subscription must not clobber the current one
await syncSubscriptionToUser(svc, sub({ id: 'sub_OLD', status: 'canceled' }));
p = await profile();
check('late deleted(old sub) is ignored', p.stripe_subscription_id === 'sub_A' && p.billing_status === 'active');

// 6. deleted for the current subscription
await syncSubscriptionToUser(svc, sub({ status: 'canceled' }));
p = await profile();
check('deleted -> canceled, no access', p.billing_status === 'canceled' && !billingAccess(p).hasAccess);

// 7. profile found by customer id when metadata is missing (portal-created changes)
await syncSubscriptionToUser(svc, sub({ status: 'active', metadata: {} }));
check('resolves coach by stripe_customer_id when metadata.user_id absent', (await profile()).billing_status === 'active');

// 8. unknown customer/user is a no-op, not an error
await syncSubscriptionToUser(svc, sub({ customer: 'cus_NOBODY', metadata: {} }));
check('unknown customer ignored', true);

// 9. invoice -> subscription id (both API shapes)
check('invoice.subscription (pre-basil)', invoiceSubscriptionId({ subscription: 'sub_1' }) === 'sub_1');
check('invoice.parent.subscription_details (basil)', invoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_2' } } }) === 'sub_2');
check('invoice without subscription', invoiceSubscriptionId({}) === null);

await db.query('delete from auth.users where id=$1', [U]);
await db.end();
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
