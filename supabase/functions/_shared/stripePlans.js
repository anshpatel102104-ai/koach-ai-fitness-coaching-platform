/**
 * Stripe plan <-> price mapping, by LOOKUP KEY (no hardcoded price IDs).
 *
 * Live prices are identified by lookup_key:
 *   koach_{starter|pro|elite|enterprise}_{monthly|yearly}
 * Checkout resolves a (plan, interval) to a price with
 * stripe.prices.list({ lookup_keys: [key] }); the webhook maps a subscription's
 * price back to a plan with price.lookup_key. The app stores the interval as
 * profiles.billing_cycle = 'monthly' | 'annual' (existing column/values).
 */

export const PLANS = ['starter', 'pro', 'elite', 'enterprise'];

export function lookupKeyFor(plan, interval) {
  const cycle = interval === 'annual' || interval === 'yearly' ? 'yearly' : 'monthly';
  return `koach_${plan}_${cycle}`;
}

/** { plan, interval: 'monthly'|'annual' } from a price's lookup_key, else null. */
export function planFromLookupKey(key) {
  const m = /^koach_(starter|pro|elite|enterprise)_(monthly|yearly)$/.exec(key || '');
  if (!m) return null;
  return { plan: m[1], interval: m[2] === 'yearly' ? 'annual' : 'monthly' };
}

/**
 * Resolve the plan/interval a Stripe price represents. Prefers lookup_key;
 * falls back to the recurring interval (month/year) so billing_cycle is still
 * right if a price without a lookup key slips in. `plan` is null if unknown.
 */
export function planFromPrice(price) {
  const byKey = planFromLookupKey(price?.lookup_key);
  if (byKey) return byKey;
  const rec = price?.recurring?.interval;
  return { plan: null, interval: rec === 'year' ? 'annual' : rec === 'month' ? 'monthly' : null };
}

/** Find the active Stripe price for (plan, interval); throws a clear error if missing. */
export async function resolvePrice(stripe, plan, interval) {
  if (!PLANS.includes(plan)) throw new Error(`Unknown plan "${plan}".`);
  const key = lookupKeyFor(plan, interval);
  const res = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = res.data[0];
  if (!price) {
    throw new Error(`No active Stripe price with lookup key "${key}". Check the price exists in the same Stripe mode (live/test) as STRIPE_SECRET_KEY.`);
  }
  return price;
}

/** Map a Stripe subscription status to profiles.billing_status. */
export function billingStatusFromStripe(status) {
  switch (status) {
    case 'trialing': case 'active': case 'past_due': case 'unpaid': case 'incomplete':
      return status;
    case 'incomplete_expired': case 'canceled':
      return 'canceled';
    case 'paused':
      return 'unpaid';
    default:
      return 'none';
  }
}

/** The only origin Stripe is ever sent back to. Never localhost, never the marketing site. */
export const APP_ORIGIN = 'https://app.koachai.net';
export const BILLING_PATH = '/subscription';

/** Keep only path+query of a client-supplied URL and pin it to APP_ORIGIN. */
export function appUrl(input, fallbackPath) {
  try {
    const u = new URL(input || fallbackPath, APP_ORIGIN);
    const path = u.pathname.startsWith('/') && !u.pathname.startsWith('//') ? u.pathname : fallbackPath;
    return `${APP_ORIGIN}${path}${u.search}`;
  } catch {
    return `${APP_ORIGIN}${fallbackPath}`;
  }
}
