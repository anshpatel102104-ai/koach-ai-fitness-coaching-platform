// Supabase Edge Function: stripeClientProxy  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeClientProxy. Coach-facing. A
// multi-action proxy for client billing; EVERY action that touches a specific
// client verifies ownership (ownsClient) and, where a customer id is supplied,
// checks it matches the client's stored stripe_customer_id — a client-supplied
// customer id is never trusted. Payment rows written via service role. Secrets
// from env only; none logged.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, ownsClient, jsonResponse, cors } from '../_shared/edgeClients.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    // Step 6 follow-up: Base44's 'admin' gate meant "the coach" in the
    // single-tenant app; under the RBAC split it would have locked every
    // coach out of client billing. This proxy is CLIENT billing (client
    // work), so any authenticated coach may use it — every client-touching
    // action below is already ownsClient-scoped to the caller.
    const userId = caller.profile.id;
    const svc = serviceClient();

    const { action, payload } = await req.json();
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    if (action === 'testConnection') {
      const account = await stripe.accounts.retrieve();
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
      // The customer queried must be THIS client's stored customer.
      const targetCustomer = client.stripe_customer_id;
      if (!targetCustomer) return jsonResponse({ invoices: [] });
      if (customer_id && customer_id !== targetCustomer) {
        return jsonResponse({ error: 'Forbidden: customer ID mismatch' }, 403);
      }
      const invoices = await stripe.invoices.list({ customer: targetCustomer, limit: 20 });
      return jsonResponse({ invoices: invoices.data });
    }

    if (action === 'createCustomer') {
      const { email, name, client_id } = payload;
      if (client_id) {
        const client = await ownsClient(svc, userId, client_id);
        if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      }
      const existing = await stripe.customers.search({ query: `email:'${email}'`, limit: 1 });
      if (existing.data.length > 0) return jsonResponse({ customer: existing.data[0] });
      const customer = await stripe.customers.create({
        email, name,
        metadata: { client_id: client_id || '', coach_user_id: userId, app: 'KOACH AI' },
      });
      return jsonResponse({ customer });
    }

    if (action === 'sendInvoice') {
      const { customer_id, amount, description, client_id, client_name } = payload;
      const client = await ownsClient(svc, userId, client_id);
      if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      if (client.stripe_customer_id && client.stripe_customer_id !== customer_id) {
        return jsonResponse({ error: 'Forbidden: customer ID mismatch' }, 403);
      }
      await stripe.invoiceItems.create({ customer: customer_id, amount: Math.round(amount * 100), currency: 'usd', description });
      const invoice = await stripe.invoices.create({ customer: customer_id, auto_advance: true, collection_method: 'send_invoice', days_until_due: 7 });
      await stripe.invoices.finalizeInvoice(invoice.id);
      const sent = await stripe.invoices.sendInvoice(invoice.id);
      await svc.from('payments').insert({
        client_id, client_name, amount, type: 'one_time', status: 'pending',
        description, stripe_payment_id: invoice.id, due_date: new Date().toISOString().split('T')[0],
        created_by: userId,
      });
      return jsonResponse({ invoice: { id: sent.id, hosted_invoice_url: sent.hosted_invoice_url } });
    }

    if (action === 'createPaymentLink') {
      const { name, amount, description, client_id } = payload;
      if (client_id) {
        const client = await ownsClient(svc, userId, client_id);
        if (!client) return jsonResponse({ error: 'Forbidden: client not owned by you' }, 403);
      }
      const product = await stripe.products.create({ name, description: description || '', metadata: { client_id: client_id || '', coach_user_id: userId } });
      const price = await stripe.prices.create({ product: product.id, unit_amount: Math.round(amount * 100), currency: 'usd' });
      const link = await stripe.paymentLinks.create({ line_items: [{ price: price.id, quantity: 1 }] });
      return jsonResponse({ url: link.url, id: link.id });
    }

    if (action === 'listProducts') {
      const products = await stripe.products.list({ active: true, limit: 20 });
      const withPrices = await Promise.all(products.data.map(async (p) => {
        const prices = await stripe.prices.list({ product: p.id, active: true, limit: 5 });
        return { ...p, prices: prices.data };
      }));
      return jsonResponse({ products: withPrices });
    }

    if (action === 'createProduct') {
      const { name, amount, description, interval } = payload;
      const product = await stripe.products.create({ name, description: description || '' });
      const priceData = { product: product.id, unit_amount: Math.round(amount * 100), currency: 'usd' };
      if (interval) priceData.recurring = { interval };
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
        .select('stripe_customer_id')
        .or(`user_id.eq.${userId},created_by.eq.${userId}`);
      const ownedCustomers = new Set(
        (myClients ?? []).map((c) => c.stripe_customer_id).filter(Boolean),
      );
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
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
