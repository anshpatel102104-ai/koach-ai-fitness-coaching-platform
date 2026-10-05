#!/usr/bin/env node
/**
 * Pure checks for the Stripe production billing rules (no DB / network):
 *  - access rules (comped, admin, trialing/active, past_due grace, 14-day trial, denials)
 *  - frontend and edge copies of billingAccess.js contain identical code
 *  - lookup-key plan mapping, status mapping, and origin pinning of Stripe URLs
 *
 * Usage: node scripts/verify-billing-access.mjs
 */
import { readFileSync } from 'node:fs';
import { TIERS } from '../src/lib/subscription.js';
import { PLAN_PRICES, clientLimitLabel, aiLimitLabel } from '../src/lib/planPricing.js';
import { COUNTED_AI_FUNCTIONS as CLIENT_COUNTED, aiUsage, aiResetDate as clientReset } from '../src/lib/aiPolicy.js';
import { TIER_LIMITS, TIER_FEATURES, featureAllowed } from '../supabase/functions/_shared/subscriptionTiers.js';
import { AI_POLICY, COUNTED_AI_FUNCTIONS, aiResetDate } from '../supabase/functions/_shared/aiPolicy.js';
import { billingAccess, effectiveTier, PAST_DUE_GRACE_MS } from '../supabase/functions/_shared/billingAccess.js';
import {
  lookupKeyFor, planFromLookupKey, planFromPrice, billingStatusFromStripe, appUrl, APP_ORIGIN,
} from '../supabase/functions/_shared/stripePlans.js';

let failures = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
};

const now = new Date('2026-10-10T12:00:00Z');
const day = 24 * 60 * 60 * 1000;
const at = (ms) => new Date(now.getTime() + ms).toISOString();

// --- access rules ---------------------------------------------------------
check('new account (status none, no trial) has NO access', !billingAccess({ billing_status: 'none' }, now).hasAccess);
check('empty profile has NO access', !billingAccess({}, now).hasAccess);
check('comped has access with no subscription', billingAccess({ is_comped: true, billing_status: 'none' }, now).hasAccess);
check('admin role has access', billingAccess({ role: 'admin', billing_status: 'none' }, now).hasAccess);
check('trialing has access', billingAccess({ billing_status: 'trialing' }, now).hasAccess);
check('active has access', billingAccess({ billing_status: 'active' }, now).hasAccess);
check('migration trial running has access', billingAccess({ billing_status: 'none', trial_ends_at: at(5 * day) }, now).reason === 'trial');
check('migration trial expired has NO access', !billingAccess({ billing_status: 'none', trial_ends_at: at(-1) }, now).hasAccess);
check('past_due inside 3-day grace has access', billingAccess({ billing_status: 'past_due', past_due_since: at(-2 * day) }, now).reason === 'grace');
check('past_due after 3 days has NO access', !billingAccess({ billing_status: 'past_due', past_due_since: at(-(PAST_DUE_GRACE_MS + 1000)) }, now).hasAccess);
check('past_due with no past_due_since has NO access', !billingAccess({ billing_status: 'past_due' }, now).hasAccess);
for (const st of ['canceled', 'unpaid', 'incomplete']) {
  check(`${st} has NO access (even with an old trial date)`, !billingAccess({ billing_status: st, trial_ends_at: at(5 * day) }, now).hasAccess);
}

check('comped/admin get enterprise limits', effectiveTier({ is_comped: true, subscription_tier: 'starter' }) === 'enterprise' && effectiveTier({ role: 'admin' }) === 'enterprise');
check('everyone else follows the stored plan', effectiveTier({ subscription_tier: 'pro' }) === 'pro' && effectiveTier({}) === 'starter');

// --- frontend copy == edge copy (code after the header comment) -----------
const body = (f) => readFileSync(f, 'utf8').split('*/').slice(1).join('*/').trim();
check('src/lib/billingAccess.js matches edge _shared copy',
  body('src/lib/billingAccess.js') === body('supabase/functions/_shared/billingAccess.js'));

// --- plan mapping by lookup key -------------------------------------------
check('lookup key monthly', lookupKeyFor('pro', 'monthly') === 'koach_pro_monthly');
check('lookup key annual -> yearly', lookupKeyFor('elite', 'annual') === 'koach_elite_yearly');
check('lookup key yearly', lookupKeyFor('starter', 'yearly') === 'koach_starter_yearly');
check('map koach_enterprise_yearly', JSON.stringify(planFromLookupKey('koach_enterprise_yearly')) === '{"plan":"enterprise","interval":"annual"}');
check('map koach_starter_monthly', JSON.stringify(planFromLookupKey('koach_starter_monthly')) === '{"plan":"starter","interval":"monthly"}');
check('unknown lookup key -> null', planFromLookupKey('other_thing') === null && planFromLookupKey(null) === null);
check('price without lookup key falls back to recurring interval',
  JSON.stringify(planFromPrice({ recurring: { interval: 'year' } })) === '{"plan":null,"interval":"annual"}');
check('status mapping', billingStatusFromStripe('trialing') === 'trialing'
  && billingStatusFromStripe('past_due') === 'past_due'
  && billingStatusFromStripe('canceled') === 'canceled'
  && billingStatusFromStripe('incomplete_expired') === 'canceled');

// --- Stripe return URLs are pinned to app.koachai.net ----------------------
check('origin constant', APP_ORIGIN === 'https://app.koachai.net');
check('localhost origin discarded', appUrl('http://localhost:5173/subscription?success=1', '/x') === 'https://app.koachai.net/subscription?success=1');
check('marketing origin discarded', appUrl('https://koachai.net/pricing', '/x') === 'https://app.koachai.net/pricing');
check('relative path kept', appUrl('/?checkout=success', '/x') === 'https://app.koachai.net/?checkout=success');
check('protocol-relative tricks stay on app origin', appUrl('//evil.example/x', '/subscription').startsWith('https://app.koachai.net/'));
check('missing -> fallback', appUrl(undefined, '/subscription') === 'https://app.koachai.net/subscription');

// --- plan limits: server JS == client JS == SQL ---------------------------------
const EXPECTED = {
  starter:    { clients: 10, ai: 15 },
  pro:        { clients: 75, ai: 100 },
  elite:      { clients: -1, ai: 300 },
  enterprise: { clients: -1, ai: -1 },
};
const sql = readFileSync('supabase/migrations/20261006000100_stripe_production_billing.sql', 'utf8');
const capFn = sql.slice(sql.indexOf('function app.tier_client_cap'), sql.indexOf('$$;', sql.indexOf('function app.tier_client_cap') + 120));
const sqlCaps = Object.fromEntries([...capFn.matchAll(/when '(\w+)' then (-?\d+)/g)].map((m) => [m[1], Number(m[2])]));
for (const [tier, want] of Object.entries(EXPECTED)) {
  check(`${tier}: client cap — server JS, client JS and SQL all = ${want.clients}`,
    TIER_LIMITS[tier].max_clients === want.clients && TIERS[tier].limits.max_clients === want.clients && sqlCaps[tier] === want.clients,
    `server ${TIER_LIMITS[tier].max_clients} / client ${TIERS[tier].limits.max_clients} / sql ${sqlCaps[tier]}`);
  check(`${tier}: AI generations/month — server JS and client JS = ${want.ai}`,
    TIER_LIMITS[tier].max_ai_generations_per_month === want.ai && TIERS[tier].limits.max_ai_generations_per_month === want.ai);
}
check('SQL cap function covers exactly the four plans', Object.keys(sqlCaps).sort().join() === 'elite,enterprise,pro,starter');
check('programs / nutrition plans stay unlimited on every plan', Object.values(TIER_LIMITS).every((l) => l.max_programs === -1 && l.max_nutrition_plans === -1)
  && Object.values(TIERS).every((t) => t.limits.max_programs === -1 && t.limits.max_nutrition_plans === -1));

// AI feature flags agree between server and client for every plan
const AI_KEYS = ['ai_program_builder', 'ai_meal_plan_builder', 'ai_onboarding', 'ai_assistant_full', 'ai_team_access',
  'ai_suggestions', 'ai_checkin_summary', 'ai_features', 'ai_calorie_suggestions', 'ai_workout_progression', 'ai_checkin_responses', 'auto_progression_rules', 'api_access'];
for (const tier of Object.keys(EXPECTED)) {
  const diff = AI_KEYS.filter((k) => featureAllowed(tier, k) !== (TIERS[tier].features[k] === true));
  check(`${tier}: AI feature flags agree (server vs client)`, diff.length === 0, diff.join(','));
}
check('Starter: builders only', featureAllowed('starter', 'ai_program_builder') && featureAllowed('starter', 'ai_meal_plan_builder') && !featureAllowed('starter', 'ai_onboarding') && !featureAllowed('starter', 'ai_assistant_full'));
check('Pro: check-in summary + AI-drafted replies (uncounted), still no full assistant / check-in responses / calorie suggestions',
  featureAllowed('pro', 'ai_checkin_summary') && featureAllowed('pro', 'ai_suggestions') && !featureAllowed('pro', 'ai_checkin_responses') && !featureAllowed('pro', 'ai_calorie_suggestions') && !featureAllowed('pro', 'ai_assistant_full')
  && !featureAllowed('starter', 'ai_checkin_summary') && !featureAllowed('starter', 'ai_suggestions'));
check('policy: summaries + draft replies gated at Pro, not counted',
  ['checkin.analyze', 'aiCheckInInsights'].every((k) => AI_POLICY[k].feature === 'ai_checkin_summary' && !AI_POLICY[k].counted)
  && AI_POLICY.aiMessageAssistant.feature === 'ai_suggestions' && !AI_POLICY.aiMessageAssistant.counted);
check('Pro: builders + onboarding, no full assistant', featureAllowed('pro', 'ai_onboarding') && !featureAllowed('pro', 'ai_assistant_full') && !TIERS.pro.features.assistant);
check('Elite: full assistant', featureAllowed('elite', 'ai_assistant_full') && featureAllowed('elite', 'ai_checkin_responses') && featureAllowed('elite', 'ai_calorie_suggestions') && featureAllowed('elite', 'auto_progression_rules') && !featureAllowed('elite', 'ai_team_access') && !featureAllowed('elite', 'api_access'));
check('Enterprise: team AI + API access', featureAllowed('enterprise', 'ai_team_access') && featureAllowed('enterprise', 'api_access'));

// AI generation definition: one place, mirrored on the client
check('counted generations = program, meal plan, smart meals', COUNTED_AI_FUNCTIONS.slice().sort().join() === 'generateAIProgram,generateMealPlan,generateSmartMeals');
check('client counted list == server counted list', CLIENT_COUNTED.slice().sort().join() === COUNTED_AI_FUNCTIONS.slice().sort().join());
check('summaries, draft replies, assistant are NOT counted', ['aiCheckInInsights', 'checkin.analyze', 'aiMessageAssistant', 'claudeAssistant'].every((k) => AI_POLICY[k] && !AI_POLICY[k].counted));
check('every gated AI feature is a known server feature', Object.values(AI_POLICY).every((p) => !p.feature || Object.values(TIER_FEATURES).some((l) => l.includes(p.feature))));
check('reset date = first of next month (server == client)', aiResetDate(new Date('2026-10-17T10:00:00Z')) === '2026-11-01' && clientReset(new Date('2026-12-31T23:59:00Z')) === '2027-01-01');
check('usage resets on a new month', aiUsage({ ai_generation_month: '2026-09', ai_generation_count: 14 }, 15, new Date('2026-10-05T00:00:00Z')).used === 0
  && aiUsage({ ai_generation_month: '2026-10', ai_generation_count: 12 }, 100, new Date('2026-10-05T00:00:00Z')).used === 12);

// displayed prices / limits come from the single constants
check('price table: $49/$89/$149/$299 monthly, $468/$852/$1,428/$2,868 yearly',
  PLAN_PRICES.starter.monthly === 49 && PLAN_PRICES.pro.monthly === 89 && PLAN_PRICES.elite.monthly === 149 && PLAN_PRICES.enterprise.monthly === 299
  && PLAN_PRICES.starter.yearly === 468 && PLAN_PRICES.pro.yearly === 852 && PLAN_PRICES.elite.yearly === 1428 && PLAN_PRICES.enterprise.yearly === 2868);
check('limit labels are generated from limits', clientLimitLabel('pro') === 'Up to 75 clients' && clientLimitLabel('elite') === 'Unlimited clients' && aiLimitLabel('elite') === '300 AI generations/month' && aiLimitLabel('enterprise') === 'Unlimited AI generations');

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
