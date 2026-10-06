// Supabase Edge Function: storeCreateProduct  (Migration Step 5a)
//
// Faithful port of base44/functions/storeCreateProduct. A coach creates a
// Stripe product+price for one of their store listings. Session is verified.
// The Base44 version created the product straight from request-body listing
// data with no ownership check; this port ADDS an ownership guard when the
// listing already exists (listing.id) — a coach may only turn their own listing
// into a Stripe product — while preserving the create-from-body behavior for a
// brand-new listing (no id yet). No cross-tenant Stripe id is trusted. Secrets
// from env only; none logged.
import Stripe from 'npm:stripe@17.3.1';
import { getCaller, serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { serve } from '../_shared/observe.js';

serve('storeCreateProduct', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    const user = caller.profile;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const { listing } = await req.json();
    if (!listing) return jsonResponse({ error: 'listing required' }, 400);

    // If a listing id is given it must EXIST and belong to the caller — a
    // missing row is no longer silently skipped.
    if (listing.id) {
      const svc = serviceClient();
      const { data: existing, error: lookupErr } = await svc.from('plan_listings').select('coach_id, created_by').eq('id', listing.id).maybeSingle();
      if (lookupErr) {
        console.error('storeCreateProduct: listing lookup failed', lookupErr.message);
        return jsonResponse({ error: 'Server error' }, 500);
      }
      if (!existing) return jsonResponse({ error: 'Listing not found' }, 404);
      if (existing.coach_id !== user.id && existing.created_by !== user.id) {
        return jsonResponse({ error: 'Forbidden: listing not owned by you' }, 403);
      }
    }

    const stripeProduct = await stripe.products.create({
      name: listing.title,
      description: listing.description || listing.title,
      images: listing.image_url ? [listing.image_url] : [],
      metadata: { coach_id: user.email || '', coach_user_id: user.id, listing_id: listing.id || '' },
    });

    const priceParams = { product: stripeProduct.id, currency: 'usd' };
    if (listing.is_free) {
      priceParams.unit_amount = 0;
      priceParams.recurring = undefined;
    } else if (listing.payment_type === 'subscription') {
      priceParams.unit_amount = Math.round(Number(listing.price) * 100);
      const intervalMap = { monthly: 'month', quarterly: 'month', annual: 'year' };
      const intervalCountMap = { monthly: 1, quarterly: 3, annual: 1 };
      priceParams.recurring = {
        interval: intervalMap[listing.billing_frequency] || 'month',
        interval_count: intervalCountMap[listing.billing_frequency] || 1,
      };
    } else {
      priceParams.unit_amount = Math.round(Number(listing.price) * 100);
    }

    const stripePrice = await stripe.prices.create(priceParams);
    return jsonResponse({ stripe_product_id: stripeProduct.id, stripe_price_id: stripePrice.id });
  } catch (error) {
    console.error('storeCreateProduct error:', error);
    return jsonResponse({ error: 'Failed to create Stripe product' }, 500);
  }
});
