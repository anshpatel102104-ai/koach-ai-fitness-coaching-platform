/**
 * Billing access rules (JS mirror of app.billing_access_direct in
 * supabase/migrations/20261006000100_stripe_production_billing.sql).
 * This is the same code as supabase/functions/_shared/billingAccess.js (edge
 * functions cannot import from src/); scripts/verify-billing-access.mjs asserts they match.
 */
export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function billingAccess(profile, now = new Date()) {
  const p = profile || {};
  const t = now.getTime();
  const ms = (v) => (v ? new Date(v).getTime() : null);

  if (p.is_comped) return { hasAccess: true, reason: 'comped' };
  if (p.role === 'admin') return { hasAccess: true, reason: 'admin' };

  const status = p.billing_status || 'none';
  if (status === 'trialing' || status === 'active') return { hasAccess: true, reason: 'stripe' };

  if (status === 'past_due') {
    const since = ms(p.past_due_since);
    if (since != null && t < since + PAST_DUE_GRACE_MS) {
      return { hasAccess: true, reason: 'grace', graceEndsAt: new Date(since + PAST_DUE_GRACE_MS).toISOString() };
    }
    return { hasAccess: false, reason: 'past_due_expired' };
  }

  if (status === 'none') {
    const end = ms(p.trial_ends_at);
    if (end != null && t < end) return { hasAccess: true, reason: 'trial', trialEndsAt: new Date(end).toISOString() };
    return { hasAccess: false, reason: end != null ? 'trial_expired' : 'no_subscription' };
  }

  return { hasAccess: false, reason: status }; // canceled | unpaid | incomplete
}

/**
 * Plan whose limits/features apply. Comped and admin accounts get full
 * (enterprise) access regardless of any stored plan; everyone else follows the
 * plan stored from Stripe (profiles.subscription_tier).
 */
export function effectiveTier(profile) {
  const p = profile || {};
  if (p.is_comped || p.role === 'admin') return 'enterprise';
  return p.subscription_tier || 'starter';
}
