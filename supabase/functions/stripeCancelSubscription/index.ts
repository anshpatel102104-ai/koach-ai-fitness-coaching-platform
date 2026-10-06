// Supabase Edge Function: stripeCancelSubscription  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeCancelSubscription. The subscription
// id is read from the caller's OWN profile — never client-supplied — so a coach
// can only cancel their own subscription. The "already gone" handling that lets
// account deletion proceed safely is preserved verbatim. Secrets from env only.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, ownsClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { billingDeniedFor } from '../_shared/teamRole.js';
import { serve } from '../_shared/observe.js';

serve('stripeCancelSubscription', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    // Step 6 RBAC: coach-tier team members don't manage anything money-shaped;
    // billing rides on the team owner's profile. Server-side mirror of the
    // frontend's useTeamRole gate (CoachBillingBlock).
    {
      const denied = await billingDeniedFor(serviceClient(), caller.auth.id);
      if (denied) return jsonResponse(denied, 403);
    }

    // SECURITY (B-CANCEL): decide WHICH subscription to cancel.
    //   - No id (or the caller's own id) → cancel the caller's own SaaS plan.
    //   - A different id (a CLIENT's subscription, from StripeSubscriptionTable)
    //     → cancel it ONLY after verifying it belongs to one of the caller's
    //       clients. The previous version ignored the body entirely and always
    //       cancelled the caller's own plan, so clicking "cancel" on a client
    //       row killed the coach's KOACH subscription.
    let requestedId = null;
    try { requestedId = (await req.json())?.subscription_id ?? null; } catch { /* no body */ }

    const ownSub = caller.profile.stripe_subscription_id;
    let subscriptionId = ownSub;

    if (requestedId && requestedId !== ownSub) {
      // Ownership comes from the subscription itself, as Stripe reports it:
      // client subscriptions are created server-side with metadata
      // { client_id, coach_user_id } (stripeCreateSubscription / stripeClientProxy).
      // It used to come from payments.stripe_payment_id, which coaches can write,
      // so anyone who knew another tenant's sub_ id could cancel it.
      if (typeof requestedId !== 'string' || !/^sub_[A-Za-z0-9]+$/.test(requestedId)) {
        return jsonResponse({ error: 'Invalid subscription id' }, 400);
      }
      let sub;
      try {
        sub = await stripe.subscriptions.retrieve(requestedId);
      } catch {
        return jsonResponse({ error: 'Forbidden: subscription not found for your account' }, 403);
      }
      const md = sub?.metadata || {};
      const svc = serviceClient();
      const ownsByCoach = md.coach_user_id && md.coach_user_id === caller.auth.id;
      const ownsByClient = md.client_id && (await ownsClient(svc, caller.auth.id, md.client_id));
      if (!ownsByCoach && !ownsByClient) return jsonResponse({ error: 'Forbidden: subscription not owned by you' }, 403);
      subscriptionId = requestedId;
    }

    if (!subscriptionId) return jsonResponse({ status: 'no_active_subscription' });

    try {
      const canceled = await stripe.subscriptions.cancel(subscriptionId);
      return jsonResponse({ status: canceled.status });
    } catch (stripeErr) {
      const code = stripeErr?.code;
      const msg = (stripeErr?.message || '').toLowerCase();
      const alreadyGone =
        code === 'resource_missing' ||
        msg.includes('no such subscription') ||
        msg.includes('already canceled') ||
        msg.includes('already been canceled');
      if (alreadyGone) return jsonResponse({ status: 'no_active_subscription' });
      return jsonResponse({ error: stripeErr.message }, 500);
    }
  } catch (error) {
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
