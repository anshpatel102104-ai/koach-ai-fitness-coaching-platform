/**
 * Plan prices shown in the app. These mirror the live Stripe prices (looked up
 * server-side by lookup_key koach_<plan>_<monthly|yearly>); Stripe is what
 * actually charges, so change a price in Stripe AND here.
 *
 *   Starter $49/mo or $468/yr · Pro $89/mo or $852/yr
 *   Elite $149/mo or $1,428/yr · Enterprise $299/mo or $2,868/yr
 *
 * `annual` is the per-month equivalent of the yearly price (yearly / 12) and
 * `annualSave` the yearly saving vs 12 monthly payments.
 */
import { TIERS } from './subscription.js';

const YEARLY = { starter: 468, pro: 852, elite: 1428, enterprise: 2868 };
const MONTHLY = { starter: 49, pro: 89, elite: 149, enterprise: 299 };

export const PLAN_PRICES = Object.fromEntries(
  Object.keys(MONTHLY).map((k) => [k, {
    monthly: MONTHLY[k],
    yearly: YEARLY[k],
    annual: Math.round(YEARLY[k] / 12),
    annualSave: MONTHLY[k] * 12 - YEARLY[k],
  }]),
);

export const formatMoney = (n) => `$${Number(n).toLocaleString('en-US')}`;

/** "Up to 75 clients" / "Unlimited clients" — generated from TIERS limits, never typed by hand. */
export const clientLimitLabel = (tierKey) => {
  const n = TIERS[tierKey].limits.max_clients;
  return n === -1 ? 'Unlimited clients' : `Up to ${n} clients`;
};

/** "100 AI generations/month" / "Unlimited AI generations" */
export const aiLimitLabel = (tierKey) => {
  const n = TIERS[tierKey].limits.max_ai_generations_per_month;
  return n === -1 ? 'Unlimited AI generations' : `${n} AI generations/month`;
};

/**
 * What each plan ADDS over the one below — the ONE list every plan card,
 * upgrade, compare and downgrade screen shows. Every line must be a feature
 * that TIERS (subscription.js) unlocks at that plan and that exists in the app.
 * The marketing site (koach-ai: src/lib/plans.js) mirrors this; change both.
 * (Previously four components each had their own list, advertising API access,
 * Zapier, a dedicated account manager, phone support and custom domains.)
 */
export const PLAN_HIGHLIGHTS = {
  starter: [
    'AI program and meal plan builders',
    'Unlimited programs and nutrition plans',
    'Scheduling and calendar',
    'In-app messaging',
    'Client app for workouts and check-ins',
    'Invoices and Stripe payments',
  ],
  pro: [
    'AI onboarding: a starting program and meal plan for a new client',
    'Check-in review',
    'AI check-in summaries and drafted replies',
    'Adherence scoring',
    'Progress analytics and graphs',
    'Program templates',
    'Voice and video messages',
  ],
  elite: [
    'Full AI assistant: progression, check-in analysis, replies and calorie suggestions',
    'White-label branding',
    'Auto progression rules',
    'Sales pipeline',
    'Revenue dashboard',
    'Store',
    'Community',
  ],
  enterprise: [
    'Team seats for multiple coaches',
  ],
};
