// Supabase Edge Function: stripeGetDashboard  (Migration Step 5a)
//
// Faithful port of base44/functions/stripeGetDashboard. Admin-only (checked on
// the caller's verified profile). Platform-wide Stripe metrics are returned (as
// in Base44 — this is the admin revenue dashboard), but the per-coach monthly
// revenue series is scoped to the caller's own payments (created_by = caller).
// Secrets from env only; none logged.
import Stripe from 'npm:stripe@14.21.0';
import { getCaller, serviceClient, jsonResponse, cors } from '../_shared/edgeClients.js';
import { subscriptionPeriodEnd } from '../_shared/stripePeriod.js';
import { serve } from '../_shared/observe.js';

serve('stripeGetDashboard', async (req, ctx) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const caller = await getCaller(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
    if (caller.profile.role !== 'admin') return jsonResponse({ error: 'Forbidden: admin only' }, 403);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const subscriptions = await stripe.subscriptions.list({ limit: 100, status: 'all' });
    const charges = await stripe.charges.list({ limit: 100 });

    const activeCount = subscriptions.data.filter((s) => s.status === 'active').length;
    const pastDueCount = subscriptions.data.filter((s) => s.status === 'past_due').length;
    const canceledCount = subscriptions.data.filter((s) => s.status === 'canceled').length;

    const mrr = subscriptions.data
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.items.data[0]?.price?.unit_amount || 0) / 100, 0);

    const totalRevenue = charges.data
      .filter((c) => c.paid && !c.refunded)
      .reduce((sum, c) => sum + c.amount / 100, 0);

    const failedCharges = charges.data.filter((c) => c.failure_code).length;

    // Per-coach monthly revenue — scoped to the caller's own payments.
    const svc = serviceClient();
    const { data: payments } = await svc.from('payments')
      .select('*').eq('created_by', caller.profile.id).order('paid_date', { ascending: false }).limit(200);

    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const month = d.getMonth();
      const year = d.getFullYear();
      const total = (payments ?? [])
        .filter((p) => p.status === 'paid' && p.paid_date)
        .filter((p) => { const pd = new Date(p.paid_date); return pd.getMonth() === month && pd.getFullYear() === year; })
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      monthlyRevenue.push({ month: label, revenue: total });
    }

    return jsonResponse({
      mrr,
      total_revenue: totalRevenue,
      active_subscriptions: activeCount,
      past_due: pastDueCount,
      canceled: canceledCount,
      failed_charges: failedCharges,
      monthly_revenue: monthlyRevenue,
      subscriptions: subscriptions.data.slice(0, 20).map((s) => ({
        id: s.id, status: s.status,
        amount: (s.items.data[0]?.price?.unit_amount || 0) / 100,
        interval: s.items.data[0]?.price?.recurring?.interval,
        current_period_end: subscriptionPeriodEnd(s),
        customer_email: s.customer_email,
        metadata: s.metadata,
      })),
    });
  } catch (error) {
    return jsonResponse({ error: (error && error.message) || 'Server error' }, 500);
  }
});
