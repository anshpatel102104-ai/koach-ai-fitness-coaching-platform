// Supabase Edge Function: stripeClientProxy  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeClientProxy. Coach-facing. A
// multi-action proxy for client billing; EVERY action that touches a specific
// client verifies ownership (ownsClient) and uses the client's OWN stored
// Stripe customer — a client-supplied customer id or email is never trusted.
// Payment rows written via service role. Secrets from env only; none logged.
//
// SECURITY (audit 2026-10-05):
//  - portal clients (callers who own no clients and aren't admin) are rejected;
//  - mutating actions require coach billing access (billingAccess.js);
//  - no customers.search by email (could hand back another tenant's customer);
//  - sendInvoice / createPaymentLink require an owned client_id;
//  - products are scoped by metadata.coach_user_id (shared Stripe account);
//  - testConnection is admin-only (it exposes the platform account identity);
//  - Stripe error details are logged, never returned.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, ownsClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { billingAccess } from '../_shared/billingAccess.js';
import { resolveClientCustomer, verifiedClientCustomer } from '../_shared/stripeSync.js';
import { serve } from '../_shared/observe.js';

const MUTATING = new Set(['createCustomer', 'sendInvoice', 'createPaymentLink', 'createProduct']);

const validAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

serve('stripeClientProxy', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    // Step 6 follow-up: Base44's 'admin' gate meant "the coach" in the
    // single-tenant app; under the RBAC split it would have locked every
    // coach out of client billing. This proxy is CLIENT billing (client
    // work), so any authenticated coach may use it — every client-touching
    // action below is already ownsClient-scoped to the caller.
    const profile = caller.profile;
    const userId = profile.id;
    const isAdmin = profile.role === 'admin';
    const svc = serviceClient();

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const payload = body?.payload || {};

    // Reject portal clients: only coaches (own >= 1 client) or admins.
    if (!isAdmin) {
      const { data: owned, error: ownErr } = await svc
        .from('clients')
        .select('id')
        .or(`user_id.eq.${userId},created_by.eq.${userId}`)
        .limit(1);
      if (ownErr) {
        console.error('stripeClientProxy: owned-clients lookup failed', ownErr.message);
        return jsonResponse({ error: 'Server error' }, 500);
      }
      if (!owned?.length) return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Mutating actions require an active coach subscription (or trial/comp/admin).
    if (MUTATING.has(action) && !billingAccess(profile).hasAccess) {
      return jsonResponse({ error: 'An active KOACH subscription is required for this action.' }, 403);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    if (action === 'testConnection') {
      // Coaches only learn whether payments are available; the PLATFORM
      // account identity (email) is admin-only.
      const account = await stripe.accounts.retrieve();
      if (!isAdmin) return jsonResponse({ ok: true, display_name: 'KOACH AI Payments' });
      return jsonResponse({ ok: true, email: account.email, display_name: account.display_name || account.business_profile?.name });
    }

    if (action === 'getClientInvoices') {
      // SECURITY (B-STRIPE-XT / IDOR): client_id is REQUIRED and ownership is
      // always verified. The previous `if (client_id)` guard was skippable — a
      // caller could omit client_id and read ANY Stripe customer's invoices.
      const { customer_id, client_id } = payload;
      if (!client_id) return jsonResponse({ error: 'client_id is required' }, 400);
      const client = await ownsClient(svc, userId, client_id);
      if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      // The customer queried must be THIS client's customer as Stripe tags it
      // (clients.stripe_customer_id is coach-writable, so a stored id alone
      // could point at another tenant's customer).
      const targetCustomer = await verifiedClientCustomer(stripe, client);
      if (!targetCustomer) return jsonResponse({ invoices: [] });
      if (customer_id && customer_id !== targetCustomer) {
        return jsonResponse({ error: 'Forbidden: customer ID mismatch' }, 403);
      }
      const invoices = await stripe.invoices.list({ customer: targetCustomer, limit: 20 });
      return jsonResponse({ invoices: invoices.data });
    }

    if (action === 'createCustomer') {
      // No email search: the body email/name are ignored. The customer is the
      // owned client's own (tag-verified) customer, or a new one persisted on it.
      const { client_id } = payload;
      if (!client_id) return jsonResponse({ error: 'client_id is required' }, 400);
      const client = await ownsClient(svc, userId, client_id);
      if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      const customerId = await resolveClientCustomer(stripe, svc, client, userId);
      // Minimal shape — the frontend only reads customer.id.
      return jsonResponse({ customer: { id: customerId } });
    }

    if (action === 'sendInvoice') {
      // body customer_id is IGNORED — only the owned client's stored customer is billed.
      const { amount, description, client_id } = payload;
      if (!client_id) return jsonResponse({ error: 'client_id is required' }, 400);
      const client = await ownsClient(svc, userId, client_id);
      if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      // Tag-verified customer (replaced by a fresh, correctly tagged one if the
      // stored id doesn't belong to this client).
      const customerId = await resolveClientCustomer(stripe, svc, client, userId);
      const amt = validAmount(amount);
      if (!amt) return jsonResponse({ error: 'Invalid amount' }, 400);
      await stripe.invoiceItems.create({ customer: customerId, amount: Math.round(amt * 100), currency: 'usd', description });
      const invoice = await stripe.invoices.create({
        customer: customerId, auto_advance: true, collection_method: 'send_invoice', days_until_due: 7,
        metadata: { client_id: client.id, coach_user_id: userId },
      });
      await stripe.invoices.finalizeInvoice(invoice.id);
      const sent = await stripe.invoices.sendInvoice(invoice.id);
      await svc.from('payments').insert({
        client_id: client.id, client_name: client.name, amount: amt, type: 'one_time', status: 'pending',
        description, stripe_payment_id: invoice.id, due_date: new Date().toISOString().split('T')[0],
        created_by: userId,
      });
      return jsonResponse({ invoice: { id: sent.id, hosted_invoice_url: sent.hosted_invoice_url } });
    }

    if (action === 'createPaymentLink') {
      // client_id is optional (the Payment Links panel creates generic links),
      // but when given it must be owned. Every link is tagged to the coach, and
      // MUTATING above already requires an active KOACH subscription.
      const { name, amount, description, client_id } = payload;
      let client = null;
      if (client_id) {
        client = await ownsClient(svc, userId, client_id);
        if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      }
      const amt = validAmount(amount);
      if (!amt || !name) return jsonResponse({ error: 'name and a valid amount are required' }, 400);
      const meta = client ? { client_id: client.id, coach_user_id: userId } : { coach_user_id: userId };
      const product = await stripe.products.create({ name, description: description || '', metadata: meta });
      const price = await stripe.prices.create({ product: product.id, unit_amount: Math.round(amt * 100), currency: 'usd' });
      const link = await stripe.paymentLinks.create({ line_items: [{ price: price.id, quantity: 1 }], metadata: meta });
      return jsonResponse({ url: link.url, id: link.id });
    }

    if (action === 'listProducts') {
      // Shared Stripe account: only this coach's products (metadata.coach_user_id).
      // products.list + filter (not products.search): search is eventually
      // consistent, so a just-created product would vanish from the panel.
      // Capped scan; move to a DB-side product table / Stripe Connect at scale.
      const all = await stripe.products.list({ active: true, limit: 100 }).autoPagingToArray({ limit: 1000 });
      const owned = all.filter((p) => p.metadata?.coach_user_id === userId).slice(0, 20);
      const withPrices = await Promise.all(owned.map(async (p) => {
        const prices = await stripe.prices.list({ product: p.id, active: true, limit: 5 });
        return { ...p, prices: prices.data };
      }));
      return jsonResponse({ products: withPrices });
    }

    if (action === 'createProduct') {
      const { name, amount, description, interval } = payload;
      const amt = validAmount(amount);
      if (!amt || !name) return jsonResponse({ error: 'name and a valid amount are required' }, 400);
      const product = await stripe.products.create({
        name, description: description || '', metadata: { coach_user_id: userId },
      });
      const priceData = { product: product.id, unit_amount: Math.round(amt * 100), currency: 'usd' };
      if (interval) {
        if (!['day', 'week', 'month', 'year'].includes(interval)) return jsonResponse({ error: 'Invalid interval' }, 400);
        priceData.recurring = { interval };
      }
      const price = await stripe.prices.create(priceData);
      return jsonResponse({ product, price });
    }

    if (action === 'getCharges') {
      // SECURITY (B-STRIPE-XT): all coaches share one Stripe account (no
      // Connect), so an unscoped charges.list() returned EVERY coach's client
      // revenue to any caller. Scope to the caller's own clients' Stripe
      // customers. (Proper isolation needs Stripe Connect — tracked in
      // REMEDIATION_PLAN Phase 8.)
      const { data: myClients } = await svc
        .from('clients')
        .select('id, stripe_customer_id')
        .or(`user_id.eq.${userId},created_by.eq.${userId}`);
      // Only customers Stripe tags to one of these clients (stored ids are coach-writable).
      const verified = await Promise.all((myClients ?? []).filter((c) => c.stripe_customer_id)
        .map((c) => verifiedClientCustomer(stripe, c)));
      const ownedCustomers = new Set(verified.filter(Boolean));
      if (ownedCustomers.size === 0) return jsonResponse({ charges: [] });
      // Fetch per owned customer so we never read another tenant's charges.
      const results = [];
      for (const cust of ownedCustomers) {
        const charges = await stripe.charges.list({ customer: cust, limit: 100 });
        results.push(...charges.data);
      }
      return jsonResponse({ charges: results });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('stripeClientProxy error:', error);
    return jsonResponse({ error: 'Stripe request failed' }, 500);
  }
});
