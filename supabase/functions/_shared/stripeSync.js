/**
 * Stripe subscription -> profiles sync, extracted from stripeWebhook so the
 * rules can be exercised against a real Postgres (scripts/verify-stripe-sync.mjs).
 */
import { subscriptionPeriodEnd } from './stripePeriod.js';
import { planFromPrice, billingStatusFromStripe } from './stripePlans.js';

const iso = (epochSeconds) => (epochSeconds != null ? new Date(epochSeconds * 1000).toISOString() : null);

// Post-basil API versions put the subscription under invoice.parent; older ones
// use invoice.subscription. Accept both.
export function invoiceSubscriptionId(invoice) {
  const s = invoice?.subscription ?? invoice?.parent?.subscription_details?.subscription;
  return typeof s === 'string' ? s : s?.id ?? null;
}

// Resolve the owning coach: subscription metadata first (set at checkout and
// carried on the subscription forever), then the stored stripe_customer_id.
async function findProfile(svc, subscription) {
  const userId = subscription.metadata?.user_id;
  if (userId) {
    const { data } = await svc.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) return data;
  }
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (customerId) {
    const { data } = await svc.from('profiles').select('*').eq('stripe_customer_id', customerId).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function syncSubscriptionToUser(svc, subscription) {
  const profile = await findProfile(svc, subscription);
  if (!profile) return; // not one of ours (or user deleted) — nothing to update

  const status = billingStatusFromStripe(subscription.status);

  // A late event for an OLD, already-canceled subscription must not clobber the
  // coach's current one (e.g. cancel + resubscribe: deleted(old) arrives last).
  if (status === 'canceled' && profile.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) return;

  const price = subscription.items?.data?.[0]?.price;
  const mapped = planFromPrice(price);
  const plan = mapped.plan || subscription.metadata?.tier || null; // unknown price: keep stored plan below
  const periodEnd = subscriptionPeriodEnd(subscription);
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  const patch = {
    stripe_customer_id: customerId || profile.stripe_customer_id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: price?.id || '',
    billing_status: status,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
    trial_ends_at: iso(subscription.trial_end),
    current_period_end: iso(periodEnd),
    had_trial: true,
    // Keep the first moment we saw past_due; clear it as soon as it recovers.
    past_due_since: status === 'past_due' ? (profile.past_due_since || new Date().toISOString()) : null,
  };
  if (periodEnd != null) patch.subscription_renewal_date = new Date(periodEnd * 1000).toISOString().split('T')[0];
  if (mapped.interval) patch.billing_cycle = mapped.interval;
  if (plan && ['starter', 'pro', 'elite', 'enterprise'].includes(plan)) patch.subscription_tier = plan;
  // Existing behaviour (preserved): a canceled subscription drops to starter.
  if (status === 'canceled') patch.subscription_tier = 'starter';

  const { error } = await svc.from('profiles').update(patch).eq('id', profile.id);
  if (error) throw new Error(`profile update failed: ${error.message}`);
}
