// Helpers for the login-first flow: ?next= handling and plan/checkout params.

export const WEBSITE_PRICING_URL = 'https://www.koachai.net/pricing';

const PLANS = ['starter', 'pro', 'elite', 'enterprise'];
// Website links use ?interval=monthly|yearly; internally (and in the checkout API) yearly is 'annual'.
const INTERVALS = ['monthly', 'annual', 'yearly'];
const normalizeInterval = (v) => (v === 'annual' || v === 'yearly' ? 'annual' : 'monthly');
export { normalizeInterval };
const LS_PENDING_PLAN = 'koach_pending_plan';

/** Only allow same-origin relative paths (blocks open redirects). */
export function safeNext(value) {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

/** Read ?plan= / ?interval=. `explicit` is false when no valid plan was supplied. Unknown values fall back to Pro monthly. */
export function parsePlan(search) {
  const params = new URLSearchParams(search);
  const plan = (params.get('plan') || '').toLowerCase();
  const interval = (params.get('interval') || '').toLowerCase();
  const explicit = PLANS.includes(plan);
  return {
    plan: explicit ? plan : 'pro',
    interval: INTERVALS.includes(interval) ? normalizeInterval(interval) : 'monthly',
    explicit,
  };
}

/** ?email= prefill — only a plausible address is accepted, anything else is ignored. */
export function parseEmail(search) {
  const v = (new URLSearchParams(search).get('email') || '').trim();
  return v.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(v) ? v : '';
}

/**
 * Plan chosen at signup, stored in the auth user's metadata (never a billing
 * column). Only offered for accounts that never started checkout, so it can't
 * re-fire after a cancellation or an abandoned checkout.
 */
export function planFromUser(user) {
  const plan = user?.signup_plan;
  if (!PLANS.includes(plan)) return null;
  if (user.billing_status !== 'none' || user.stripe_customer_id) return null;
  return { plan, interval: normalizeInterval(user.signup_interval) };
}

export function savePendingPlan(plan, interval) {
  try { localStorage.setItem(LS_PENDING_PLAN, JSON.stringify({ plan, interval })); } catch { /* ignore */ }
}

export function takePendingPlan() {
  try {
    const raw = localStorage.getItem(LS_PENDING_PLAN);
    if (!raw) return null;
    localStorage.removeItem(LS_PENDING_PLAN);
    const { plan, interval } = JSON.parse(raw);
    return PLANS.includes(plan) ? { plan, interval: normalizeInterval(interval) } : null;
  } catch { return null; }
}

/** Create a Stripe checkout session (30-day trial, card required — server side) and go there. */
export async function startCheckout(db, plan, interval) {
  // Paths only: the server pins success/cancel URLs to https://app.koachai.net.
  const res = await db.functions.invoke('stripeCheckout', {
    tier: plan,
    billing_cycle: interval,
    success_url: '/?checkout=success',
    cancel_url: '/subscription',
  });
  if (!res.data?.url) throw new Error(res.data?.error || 'Could not start checkout. Please try again.');
  window.location.href = res.data.url;
}
