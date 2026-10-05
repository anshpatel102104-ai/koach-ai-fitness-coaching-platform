// Helpers for the login-first flow: ?next= handling and plan/checkout params.

export const WEBSITE_PRICING_URL = 'https://www.koachai.net/pricing';

const PLANS = ['starter', 'pro', 'elite', 'enterprise'];
const INTERVALS = ['monthly', 'annual'];
const LS_PENDING_PLAN = 'koach_pending_plan';

/** Only allow same-origin relative paths (blocks open redirects). */
export function safeNext(value) {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

/** Read ?plan= / ?interval=. `explicit` is false when no valid plan was supplied. */
export function parsePlan(search) {
  const params = new URLSearchParams(search);
  const plan = (params.get('plan') || '').toLowerCase();
  const interval = (params.get('interval') || '').toLowerCase();
  const explicit = PLANS.includes(plan);
  return {
    plan: explicit ? plan : 'pro',
    interval: INTERVALS.includes(interval) ? interval : 'monthly',
    explicit,
  };
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
    return PLANS.includes(plan) ? { plan, interval: INTERVALS.includes(interval) ? interval : 'monthly' } : null;
  } catch { return null; }
}

/** Create a Stripe checkout session (30-day trial, card required — server side) and go there. */
export async function startCheckout(db, plan, interval) {
  const origin = window.location.origin;
  const res = await db.functions.invoke('stripeCheckout', {
    tier: plan,
    billing_cycle: interval,
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/subscription`,
  });
  if (!res.data?.url) throw new Error(res.data?.error || 'Could not start checkout. Please try again.');
  window.location.href = res.data.url;
}
