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

// SECURITY (B-STRIPE-XT): coaches bill their own clients on the SAME Stripe
// account as KOACH SaaS billing (no Connect). A coach->client subscription must
// never touch a coach's profiles billing row — otherwise a coach could create a
// subscription on another coach's SaaS customer and the webhook would
// downgrade/lock the victim via the stripe_customer_id fallback.
// A subscription is KOACH SaaS billing only if it is not tagged with a
// client_id AND (it carries metadata.user_id from our checkout OR one of its
// prices has a koach_* plan lookup_key — see stripePlans.js lookupKeyFor).
export function isKoachPlanSubscription(subscription) {
  const md = subscription?.metadata || {};
  if (md.client_id) return false;
  if (md.user_id) return true;
  const items = subscription?.items?.data || [];
  return items.some((it) => typeof it?.price?.lookup_key === 'string' && it.price.lookup_key.startsWith('koach_'));
}

export async function syncSubscriptionToUser(svc, subscription) {
  if (!isKoachPlanSubscription(subscription)) return; // coach->client billing, not ours to sync
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

/**
 * Resolve the Stripe customer for a coach's CLIENT (coach->client billing).
 *
 * SECURITY (B-STRIPE-XT): never searches customers by email. clients.stripe_customer_id
 * is coach-writable through RLS, so a stored id is only reused when the Stripe
 * customer is tagged with THIS client's id (metadata.client_id) — a coach can't
 * point their client row at another coach's SaaS customer. Otherwise a fresh
 * customer is created, tagged {client_id, coach_user_id}, and persisted on the
 * client row via the service client (scoped by id).
 * Returns the customer id.
 */
/**
 * Read-only check: the client's stored Stripe customer, ONLY if Stripe says it
 * is tagged to this client (metadata.client_id); otherwise null. Never creates.
 */
export async function verifiedClientCustomer(stripe, client) {
  const stored = client?.stripe_customer_id;
  if (!stored) return null;
  try {
    const c = await stripe.customers.retrieve(stored);
    return c && !c.deleted && c.metadata?.client_id === client.id ? c.id : null;
  } catch {
    return null;
  }
}

export async function resolveClientCustomer(stripe, svc, client, coachUserId) {
  const stored = client.stripe_customer_id;
  if (stored) {
    try {
      const existing = await stripe.customers.retrieve(stored);
      if (existing && !existing.deleted && existing.metadata?.client_id === client.id) return existing.id;
      console.error('resolveClientCustomer: stored customer not tagged to this client; replacing', { client_id: client.id });
    } catch (e) {
      console.error('resolveClientCustomer: stored customer lookup failed; replacing', { client_id: client.id, err: e?.message });
    }
  }
  const customer = await stripe.customers.create({
    email: client.email || undefined,
    name: client.name || undefined,
    metadata: { client_id: client.id, coach_user_id: coachUserId, app: 'KOACH AI' },
  });
  const { error } = await svc.from('clients').update({ stripe_customer_id: customer.id }).eq('id', client.id);
  if (error) console.error('resolveClientCustomer: persist failed', { client_id: client.id, err: error.message });
  return customer.id;
}
