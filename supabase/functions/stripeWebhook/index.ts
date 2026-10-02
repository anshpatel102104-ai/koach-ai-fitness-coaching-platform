// Supabase Edge Function: stripeWebhook  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeWebhook. Behavior preserved exactly;
// two things carried over verbatim and one gap CLOSED:
//   PRESERVED: Stripe signature verification (constructEventAsync with the
//     webhook secret) runs BEFORE any processing — a forged/unsigned body is
//     rejected, so it can never drive syncSubscriptionToUser.
//   PRESERVED: the same event handling (subscription lifecycle, checkout
//     completed, invoice paid/failed, trial ending) and the same tier mapping.
//   CLOSED GAP: Base44's version had NO idempotency guard. Stripe delivers
//     events at least once, so a redelivery could double-process. This version
//     atomically CLAIMS event.id in processed_stripe_events before doing any
//     work; a duplicate is acknowledged and skipped. If processing throws, the
//     claim is released so Stripe's retry can re-attempt.
//
// Secrets (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_*) come
// only from env and are never logged.
//
// IMPORTANT: deploy with --no-verify-jwt. Stripe does not send a Supabase JWT;
// authenticity is established by the Stripe signature, not by GoTrue.
import Stripe from 'npm:stripe@14.21.0';
import { serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { renewalDateFromSubscription } from '../_shared/stripePeriod.js';

function getTierFromPriceId(priceId) {
  const map = {};
  for (const key of ['STARTER', 'PRO', 'ELITE', 'ENTERPRISE']) {
    const monthly = Deno.env.get(`STRIPE_PRICE_${key}`);
    const annual = Deno.env.get(`STRIPE_PRICE_${key}_ANNUAL`);
    if (monthly) map[monthly] = key.toLowerCase();
    if (annual) map[annual] = key.toLowerCase();
  }
  return map[priceId] || null;
}

async function syncSubscriptionToUser(svc, subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = getTierFromPriceId(priceId) || subscription.metadata?.tier || 'starter';
  // Post-basil API versions carry current_period_end on the ITEMS, not the
  // subscription — the helper resolves both shapes (null if truly absent, in
  // which case we keep the previously stored renewal date rather than throw).
  const renewalDate = renewalDateFromSubscription(subscription);

  let tierToSet = tier;
  let billingStatus = subscription.status;
  if (subscription.status === 'canceled') {
    tierToSet = 'starter';
    billingStatus = 'canceled';
  }

  // Service-role write to the specific user's own profile (webhooks are
  // cross-tenant by nature; metadata.user_id names the owner).
  const { data: profile } = await svc.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!profile) return;
  await svc.from('profiles').update({
    subscription_tier: tierToSet,
    billing_status: billingStatus,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    stripe_price_id: priceId || '',
    ...(renewalDate ? { subscription_renewal_date: renewalDate } : {}),
    subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
    had_trial: true,
  }).eq('id', userId);
}

// Email is re-platformed with sendEmailNotification in Step 5c; invoke it if
// present and never let a missing mailer fail the webhook (Stripe would retry).
async function sendEmail(svc, { to, subject, body }) {
  try {
    await svc.functions.invoke('sendEmailNotification', { body: { to, subject, html: body } });
  } catch (_) {
    // mailer not deployed yet — non-fatal
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');

    // ── Signature verification (preserved; must run before anything else) ────
    if (!webhookSecret) return jsonResponse({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, 500);
    if (!sig) return jsonResponse({ error: 'Missing stripe-signature header' }, 400);

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
    } catch (err) {
      return jsonResponse({ error: `Webhook signature verification failed: ${err.message}` }, 400);
    }

    const svc = serviceClient();

    // ── Idempotency claim (new): first writer wins; duplicates are skipped ───
    const { error: claimErr } = await svc
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });
    if (claimErr) {
      if (claimErr.code === '23505') return jsonResponse({ received: true, duplicate: true });
      return jsonResponse({ error: 'idempotency claim failed' }, 500); // Stripe retries
    }

    try {
      const obj = event.data.object;

      if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
        await syncSubscriptionToUser(svc, obj);
      }

      if (event.type === 'checkout.session.completed') {
        const subId = obj.subscription;
        if (subId) {
          await syncSubscriptionToUser(svc, await stripe.subscriptions.retrieve(subId));
        } else if (obj.metadata?.listing_id) {
          // One-time store purchase fulfillment (B-STORE). Idempotent on the
          // session id; also increments plan_listings.sales_count.
          await svc.rpc('record_store_purchase', {
            p_session: obj.id,
            p_listing: obj.metadata.listing_id,
            p_coach: obj.metadata.coach_id || null,
            p_email: obj.customer_details?.email || obj.customer_email || null,
            p_amount: (obj.amount_total ?? 0) / 100,
          });
        }
      }

      if (event.type === 'invoice.payment_succeeded') {
        const subId = obj.subscription;
        if (subId) {
          await syncSubscriptionToUser(svc, await stripe.subscriptions.retrieve(subId));
          const { data: payments } = await svc.from('payments').select('*').eq('stripe_payment_id', subId);
          for (const p of (payments ?? []).filter((p) => p.status === 'pending' || p.status === 'failed')) {
            await svc.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', p.id);
          }
        }
      }

      if (event.type === 'invoice.payment_failed') {
        const subId = obj.subscription;
        const customerId = obj.customer;
        if (subId) {
          await syncSubscriptionToUser(svc, await stripe.subscriptions.retrieve(subId));
          if (customerId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer.email) {
              await sendEmail(svc, {
                to: customer.email,
                subject: '⚠️ Payment failed — action required to keep your KOACH AI account active',
                body: `Hi,\n\nYour recent payment for KOACH AI failed. Please update your billing information within 7 days to avoid service interruption.\n\nUpdate billing: ${Deno.env.get('APP_URL') || 'https://app.koachai.net'}/subscription\n\nIf you have questions, reply to this email.\n\nKOACH AI Team`,
              });
            }
          }
          const { data: payments } = await svc.from('payments').select('*').eq('stripe_payment_id', subId);
          for (const p of (payments ?? []).filter((p) => p.status === 'pending')) {
            await svc.from('payments').update({ status: 'failed' }).eq('id', p.id);
          }
        }
      }

      if (event.type === 'customer.subscription.trial_will_end') {
        const customerId = obj.customer;
        const trialEnd = new Date(obj.trial_end * 1000);
        const formattedDate = trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer.email) {
            await sendEmail(svc, {
              to: customer.email,
              subject: '🔔 Your KOACH AI trial ends in 3 days',
              body: `Hi,\n\nYour free trial of KOACH AI Pro ends on ${formattedDate}.\n\nTo keep access to all your coaching tools, add a payment method before your trial ends:\n\n${Deno.env.get('APP_URL') || 'https://app.koachai.net'}/subscription\n\nIf you don't add a payment method, your account will be moved to the free Starter plan.\n\nKOACH AI Team`,
            });
          }
        }
      }

      return jsonResponse({ received: true });
    } catch (procErr) {
      // Release the claim so Stripe's redelivery can re-attempt this event.
      await svc.from('processed_stripe_events').delete().eq('event_id', event.id);
      return jsonResponse({ error: 'processing failed' }, 500);
    }
  } catch (error) {
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
