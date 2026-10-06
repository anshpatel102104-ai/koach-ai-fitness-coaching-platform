// Supabase Edge Function: stripeCreateSubscription  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeCreateSubscription. A coach creates a
// billing subscription for one of THEIR clients. Ownership is verified
// server-side (ownsClient) before any Stripe call — the client-supplied
// client_id is never trusted. Payment row written via service role. Secrets
// from env only; none logged.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, ownsClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { billingDeniedFor } from '../_shared/teamRole.js';
import { resolveClientCustomer } from '../_shared/stripeSync.js';
import { serve } from '../_shared/observe.js';

serve('stripeCreateSubscription', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
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

    // SECURITY (B-STRIPE-XT): client_email / client_name from the body are
    // IGNORED. Previously the body email drove a Stripe customer search, so a
    // coach could pass another coach's email, attach a subscription to that
    // coach's SaaS customer and (via the webhook) lock them out. The customer
    // is now always the client row's own stored/created customer.
    const { client_id, price_amount, interval, description } = await req.json();

    // The client must belong to the calling coach.
    const client = await ownsClient(svc, user.id, client_id);
    if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
    if (!client.email) return jsonResponse({ error: 'Client has no email address' }, 400);

    const amount = Number(price_amount);
    if (!Number.isFinite(amount) || amount <= 0) return jsonResponse({ error: 'Invalid price_amount' }, 400);
    const recurringInterval = ['day', 'week', 'month', 'year'].includes(interval) ? interval : 'month';

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Never search customers by email: the client's own (verified) stored
    // customer, or a new one tagged to this client and persisted on the row.
    const customerId = await resolveClientCustomer(stripe, svc, client, user.id);

    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(amount * 100),
      recurring: { interval: recurringInterval },
      product_data: { name: description || 'Coaching Subscription' },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { client_id: client.id, coach_user_id: user.id },
    });

    await svc.from('payments').insert({
      client_id: client.id,
      client_name: client.name,
      amount,
      type: 'monthly',
      status: 'pending',
      description: description || 'Stripe Subscription',
      stripe_payment_id: subscription.id,
      due_date: new Date().toISOString().split('T')[0],
      created_by: user.id,
    });

    return jsonResponse({
      subscription_id: subscription.id,
      client_secret: subscription.latest_invoice?.payment_intent?.client_secret,
      customer_id: customerId,
    });
  } catch (error) {
    console.error('stripeCreateSubscription error:', error);
    return jsonResponse({ error: 'Failed to create subscription' }, 500);
  }
});
