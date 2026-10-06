// Supabase Edge Function: storeCheckout  (Migration Step 5a)
//
// Faithful port of base44/functions/storeCheckout. A buyer checks out a public
// store listing. The listing is loaded via service role by id (it's public
// data), the caller's session is verified to attach their email. No
// cross-tenant customer/subscription id is trusted (none is supplied here).
// Secrets from env only; none logged.
import Stripe from 'npm:stripe@17.3.1';
import { getCaller, serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { appUrl } from '../_shared/stripePlans.js';

// SECURITY (audit 2026-10-05): redirect URLs are never taken verbatim from the
// body (open redirect / phishing via a genuine Stripe checkout). Only a
// relative app path ('/x', not '//x' or 'https://...') is honoured, pinned to
// APP_ORIGIN by appUrl(); anything else falls back to the default path.
function safeAppUrl(input, fallbackPath) {
  if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//') || input.startsWith('/\\')) {
    return appUrl(fallbackPath, fallbackPath);
  }
  return appUrl(input, fallbackPath);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const user = caller.profile;

    const { listing_id, success_url, cancel_url } = await req.json();
    if (!listing_id) return jsonResponse({ error: 'listing_id required' }, 400);

    const svc = serviceClient();
    const { data: listing } = await svc.from('plan_listings').select('*').eq('id', listing_id).maybeSingle();
    if (!listing) return jsonResponse({ error: 'Listing not found' }, 404);

    const successUrl = safeAppUrl(success_url, '/store?purchase=success');
    const cancelUrl = safeAppUrl(cancel_url, '/store');

    const sessionParams = {
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { listing_id, coach_id: listing.coach_id || '' },
    };
    if (user.email) sessionParams.customer_email = user.email;

    if (listing.stripe_price_id) {
      sessionParams.line_items = [{ price: listing.stripe_price_id, quantity: 1 }];
      sessionParams.mode = listing.payment_type === 'subscription' ? 'subscription' : 'payment';
    } else {
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(listing.price) * 100),
          product_data: {
            name: listing.title,
            description: listing.description || listing.title,
            images: listing.image_url ? [listing.image_url] : [],
          },
        },
        quantity: 1,
      }];
      sessionParams.mode = 'payment';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return jsonResponse({ checkout_url: session.url, session_id: session.id });
  } catch (error) {
    console.error('storeCheckout error:', error);
    return jsonResponse({ error: 'Could not start checkout' }, 500);
  }
});
