// Supabase Edge Function: stripeWebhook
//
// Stripe -> database billing sync. Authenticity is the Stripe signature
// (constructEventAsync + SubtleCrypto provider, over the RAW body), never a
// Supabase JWT, so deploy with --no-verify-jwt.
//
// Events handled:
//   checkout.session.completed, customer.subscription.created|updated|deleted,
//   invoice.paid (alias: invoice.payment_succeeded), invoice.payment_failed
//   (+ customer.subscription.trial_will_end, email only — optional).
//
// Every subscription event ends in syncSubscriptionToUser(), which writes the
// coach's stripe_customer_id, stripe_subscription_id, plan (subscription_tier,
// mapped from price.lookup_key), billing_cycle, billing_status
// (trialing | active | past_due | canceled | ...), trial_ends_at,
// current_period_end (+ subscription_renewal_date), cancel_at_period_end and
// past_due_since (anchor of the 3-day grace period).
//
// Idempotency: event.id is claimed in processed_stripe_events (the stripe_events
// ledger) before any work; a redelivery is acknowledged and skipped. If
// processing throws, the claim is released so Stripe's retry re-attempts.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (+ the Supabase-provided
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Never logged.
import Stripe from 'npm:stripe@14.21.0';
import { serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { APP_ORIGIN, BILLING_PATH } from '../_shared/stripePlans.js';
import { syncSubscriptionToUser, invoiceSubscriptionId } from '../_shared/stripeSync.js';

// Email is delivered by sendEmailNotification; a missing mailer must never fail
// the webhook (Stripe would retry the whole event).
async function sendEmail(svc, { to, subject, body }) {
  try {
    await svc.functions.invoke('sendEmailNotification', { body: { to, subject, html: body } });
  } catch (_) {
    // non-fatal
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    // RAW body — signature verification is over the exact bytes Stripe sent.
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!webhookSecret) return jsonResponse({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, 500);
    if (!sig) return jsonResponse({ error: 'Missing stripe-signature header' }, 400);

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody, sig, webhookSecret, undefined, Stripe.createSubtleCryptoProvider(),
      );
    } catch (err) {
      return jsonResponse({ error: `Webhook signature verification failed: ${err.message}` }, 400);
    }

    const svc = serviceClient();

    // Idempotency claim: first writer wins; a duplicate is acknowledged.
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
        const subId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          // The checkout session knows the coach even if subscription metadata were missing.
          const uid = obj.client_reference_id || obj.metadata?.user_id;
          if (uid && !sub.metadata?.user_id) sub.metadata = { ...(sub.metadata || {}), user_id: uid };
          await syncSubscriptionToUser(svc, sub);
        } else if (obj.metadata?.listing_id) {
          // One-time store purchase fulfillment (idempotent on the session id).
          await svc.rpc('record_store_purchase', {
            p_session: obj.id,
            p_listing: obj.metadata.listing_id,
            p_coach: obj.metadata.coach_id || null,
            p_email: obj.customer_details?.email || obj.customer_email || null,
            p_amount: (obj.amount_total ?? 0) / 100,
          });
        }
      }

      if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
        const subId = invoiceSubscriptionId(obj);
        if (subId) {
          await syncSubscriptionToUser(svc, await stripe.subscriptions.retrieve(subId));
          const { data: payments } = await svc.from('payments').select('*').eq('stripe_payment_id', subId);
          for (const p of (payments ?? []).filter((p) => p.status === 'pending' || p.status === 'failed')) {
            await svc.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', p.id);
          }
        }
      }

      if (event.type === 'invoice.payment_failed') {
        const subId = invoiceSubscriptionId(obj);
        const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
        if (subId) {
          await syncSubscriptionToUser(svc, await stripe.subscriptions.retrieve(subId));
          if (customerId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && customer.email) {
              await sendEmail(svc, {
                to: customer.email,
                subject: '⚠️ Payment failed — fix your payment to keep your KOACH AI account active',
                body: `Hi,\n\nYour recent payment for KOACH AI failed. Please update your payment method within 3 days to avoid losing access.\n\nFix payment: ${APP_ORIGIN}${BILLING_PATH}\n\nIf you have questions, reply to this email.\n\nKOACH AI Team`,
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
        const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
        const trialEnd = new Date(obj.trial_end * 1000);
        const formattedDate = trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        if (customerId) {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted && customer.email) {
            await sendEmail(svc, {
              to: customer.email,
              subject: '🔔 Your KOACH AI trial ends in 3 days',
              body: `Hi,\n\nYour free trial of KOACH AI ends on ${formattedDate}, after which your card will be charged.\n\nManage your plan or payment method any time:\n\n${APP_ORIGIN}${BILLING_PATH}\n\nKOACH AI Team`,
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
