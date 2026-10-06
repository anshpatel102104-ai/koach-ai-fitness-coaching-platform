// Supabase Edge Function: stripeCheckout  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeCheckout. The caller's session is
// verified (getCaller); every action reads the subscription/customer id from
// the caller's OWN profile — never from client input — so a coach can only act
// on their own billing. Privileged billing columns are written via the service
// role scoped to the caller's id (the profiles trigger blocks non-service
// writes to those columns). Secrets come only from env; none are logged.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { billingDeniedFor } from '../_shared/teamRole.js';
import { subscriptionPeriodEnd, renewalDateFromSubscription } from '../_shared/stripePeriod.js';
import { PLANS, resolvePrice, planFromPrice, appUrl, BILLING_PATH } from '../_shared/stripePlans.js';
import { serve } from '../_shared/observe.js';

serve('stripeCheckout', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });

    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    // Step 6 RBAC: coach-tier team members don't manage anything money-shaped;
    // billing rides on the team owner's profile. Server-side mirror of the
    // frontend's useTeamRole gate (CoachBillingBlock).
    {
      const denied = await billingDeniedFor(serviceClient(), caller.auth.id);
      if (denied) return jsonResponse(denied, 403);
    }
    const user = caller.profile;
    const svc = serviceClient();
    // Privileged billing writes to the caller's own profile (trigger-guarded columns).
    const updateSelf = (patch) => svc.from('profiles').update(patch).eq('id', user.id);

    const { action, tier, billing_cycle, success_url, cancel_url } = await req.json();

    // ── Reuse the stored Stripe customer; create one only if none is usable ──
    // (a stored id can be stale after a Stripe account/mode switch → verify it).
    let customerId = user.stripe_customer_id;
    if (customerId) {
      try {
        const c = await stripe.customers.retrieve(customerId);
        if (c.deleted) customerId = null;
      } catch (e) {
        if (e?.code === 'resource_missing') customerId = null; else throw e;
      }
    }
    if (!customerId) {
      const esc = (v) => String(v).replace(/['\\]/g, '');
      // Only a customer tagged with THIS user's id is reused. Never match by
      // email: an email-matched customer may belong to someone else (this was a
      // Billing Portal takeover path while profiles.email was self-writable).
      const existing = await stripe.customers.search({ query: `metadata['user_id']:'${esc(user.id)}'`, limit: 1 });
      const verifiedEmail = caller.auth.email || user.email;
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: verifiedEmail,
          name: user.full_name || user.business_name || verifiedEmail,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }
      await updateSelf({ stripe_customer_id: customerId });
    }

    if (action === 'portal') {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: appUrl(cancel_url, BILLING_PATH),
      });
      return jsonResponse({ url: session.url });
    }

    if (action === 'cancel') {
      if (!user.stripe_subscription_id) return jsonResponse({ error: 'No active subscription to cancel' }, 400);
      const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      if (sub.status === 'canceled') return jsonResponse({ error: 'Subscription already canceled' }, 400);
      const updated = await stripe.subscriptions.update(user.stripe_subscription_id, { cancel_at_period_end: true });
      const cancelRenewal = renewalDateFromSubscription(updated);
      await updateSelf({
        subscription_cancel_at_period_end: true,
        ...(cancelRenewal ? { subscription_renewal_date: cancelRenewal } : {}),
      });
      return jsonResponse({ canceled: true, ends_at: subscriptionPeriodEnd(updated) });
    }

    if (action === 'reactivate') {
      if (!user.stripe_subscription_id) return jsonResponse({ error: 'No subscription to reactivate' }, 400);
      const updated = await stripe.subscriptions.update(user.stripe_subscription_id, { cancel_at_period_end: false });
      await updateSelf({ subscription_cancel_at_period_end: false });
      return jsonResponse({ reactivated: true, status: updated.status });
    }

    // ── Checkout / Upgrade ──────────────────────────────────────────────────
    if (!PLANS.includes(tier)) return jsonResponse({ error: `Unknown plan "${tier}".` }, 400);
    const interval = billing_cycle === 'annual' || billing_cycle === 'yearly' ? 'annual' : 'monthly';
    const price = await resolvePrice(stripe, tier, interval); // by lookup_key
    const priceId = price.id;

    // Inline plan change if the caller already has a live subscription (their own).
    if (user.stripe_subscription_id) {
      let sub = null;
      try {
        sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      } catch (e) {
        if (e?.code !== 'resource_missing') throw e; // stale id → fall through to a fresh checkout
      }
      if (sub && sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
        const updated = await stripe.subscriptions.update(user.stripe_subscription_id, {
          items: [{ id: sub.items.data[0].id, price: priceId }],
          proration_behavior: 'always_invoice',
          metadata: { user_id: user.id, tier },
        });
        const upgradeRenewal = renewalDateFromSubscription(updated);
        await updateSelf({
          subscription_tier: tier,
          billing_cycle: planFromPrice(price).interval || interval,
          stripe_price_id: priceId,
          billing_status: updated.status,
          ...(upgradeRenewal ? { subscription_renewal_date: upgradeRenewal } : {}),
          subscription_cancel_at_period_end: false,
        });
        return jsonResponse({ upgraded: true, tier });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl(success_url, `${BILLING_PATH}?success=1`),
      cancel_url: appUrl(cancel_url, BILLING_PATH),
      subscription_data: {
        metadata: { user_id: user.id, tier },
        trial_period_days: user.had_trial ? undefined : 30,
      },
      allow_promotion_codes: true,
    });
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
