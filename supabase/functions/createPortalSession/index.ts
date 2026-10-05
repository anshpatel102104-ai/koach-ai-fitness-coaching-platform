// Supabase Edge Function: createPortalSession
//
// Authenticates the caller, looks up THEIR stripe_customer_id (never taken from
// the request) and returns a Stripe Billing Portal URL whose return_url is the
// app's billing route: https://app.koachai.net/subscription
//
// Plan switching / proration / cancel-at-period-end behaviour comes from the
// Billing Portal configuration in the Stripe dashboard, not from this code.
// Deploy normally (JWT verification on): the caller is a signed-in coach.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { billingDeniedFor } from '../_shared/teamRole.js';
import { APP_ORIGIN, BILLING_PATH } from '../_shared/stripePlans.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    // Billing is owner-only (team coaches ride on the owner's subscription).
    const denied = await billingDeniedFor(serviceClient(), caller.auth.id);
    if (denied) return jsonResponse(denied, 403);

    const customerId = caller.profile.stripe_customer_id;
    if (!customerId) {
      return jsonResponse({ error: 'No billing account yet — subscribe to a plan first.', code: 'no_customer' }, 400);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });
    let session;
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_ORIGIN}${BILLING_PATH}`,
      });
    } catch (e) {
      if (e?.code === 'resource_missing') {
        return jsonResponse({ error: 'No billing account yet — subscribe to a plan first.', code: 'no_customer' }, 400);
      }
      throw e;
    }
    return jsonResponse({ url: session.url });
  } catch (error) {
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
