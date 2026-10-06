import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useTeamRole } from '@/lib/useTeamRole';
import { getUserTier, getLimit } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, ChevronDown, LogOut } from 'lucide-react';
import { Page, PageHeader, Panel, PanelHeader } from '@/components/kit';
import { StatusDot, Meter } from '@/components/business/ui';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import PricingCards from '@/components/subscription/PricingCards';
import { openBillingPortal } from '@/lib/billing';
import { billingAccess } from '@/lib/billingAccess';
import { PLAN_PRICES, formatMoney } from '@/lib/planPricing';
import AiUsageMeter from '@/components/subscription/AiUsageMeter';
import CancellationModal from '@/components/subscription/CancellationModal';

const BILLING_STATUS_CONFIG = {
  none:       { label: 'No plan',    tone: 'muted' },
  active:     { label: 'Active',     tone: 'success' },
  trialing:   { label: 'Trial',      tone: 'muted' },
  past_due:   { label: 'Past due',   tone: 'danger' },
  unpaid:     { label: 'Unpaid',     tone: 'danger' },
  incomplete: { label: 'Incomplete', tone: 'warning' },
  canceled:   { label: 'Canceled',   tone: 'muted' },
};

const FAQS = [
  { q: 'Can I change plans later?', a: 'Yes. You can upgrade or downgrade your plan at any time from the subscription page. Upgrades take effect immediately (prorated), and downgrades apply at the end of your billing period.' },
  { q: 'What happens to my clients if I downgrade?', a: 'Your existing clients remain in the system. However, if you exceed the client limit of your new plan, you won\'t be able to add new clients until you\'re back under the limit. Existing client data is never deleted.' },
  { q: 'Is there a free trial?', a: 'New subscriptions start with a 30-day free trial on any plan. A card is required to start it, and you can cancel before the trial ends to avoid being charged.' },
  { q: 'Do my clients pay separately?', a: 'No. Your clients use KOACH AI free as part of your subscription. You pay one flat monthly or annual rate that covers you and all your clients.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) via Stripe. Annual plans can also be invoiced for Enterprise customers.' },
  { q: 'Can I add more coaches to my account?', a: 'Team accounts with multiple coaches are available on the Enterprise plan. Contact our sales team to discuss pricing for your coaching organization.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-foreground">{q}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0', open && 'rotate-180')} />
      </button>
      {open && <p className="text-sm text-muted-foreground pb-4 leading-relaxed max-w-3xl">{a}</p>}
    </div>
  );
}

function CoachBillingBlock() {
  return (
    <Page>
      <PageHeader title="Plan and billing" subtitle="Only the team owner can see or change the plan." />
      <Panel className="px-5 py-6 sm:px-6 max-w-xl">
        <p className="text-[15px] font-semibold text-foreground">Billing is owner-only</p>
        <p className="text-sm text-muted-foreground mt-1">Ask your team owner if something needs changing.</p>
      </Panel>
    </Page>
  );
}

export default function Subscription({ gated = false, accessReason = undefined }) {
  const { me, logout } = useAuth();
  const [user, setUser] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const { isOwner, isLoading: loadingRole } = useTeamRole();

  useEffect(() => { me().then(setUser).catch(() => {}); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') || params.get('checkout')) {
      setTimeout(() => {
        me().then(u => { setUser(u); toast.success('Subscription updated'); });
      }, 2000);
    }
  }, []);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.entities.Client.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => db.entities.WorkoutProgram.list() });
  const { data: nutritionPlans = [] } = useQuery({ queryKey: ['nutrition-plans'], queryFn: () => db.entities.NutritionPlan.list() });

  // Block non-owners from accessing billing (after all hooks)
  if (!loadingRole && !isOwner) return <CoachBillingBlock />;

  const userTier = getUserTier(user);
  const billingStatus = user?.billing_status || 'none';
  const access = billingAccess(user);
  const billingCfg = BILLING_STATUS_CONFIG[billingStatus] || BILLING_STATUS_CONFIG.none;
  const isPastDue = ['past_due', 'unpaid', 'incomplete'].includes(billingStatus);
  const isCanceled = billingStatus === 'canceled';
  const hasPlan = !!user?.stripe_subscription_id && ['trialing', 'active', 'past_due'].includes(billingStatus);
  const cancelAtEnd = user?.subscription_cancel_at_period_end;
  const isYearly = user?.billing_cycle === 'annual';
  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null);
  const periodEnd = fmtDate(user?.current_period_end || user?.subscription_renewal_date);
  const trialEnd = fmtDate(user?.trial_ends_at);
  const planPrice = PLAN_PRICES[userTier.key];

  // One line of renewal / trial / cancellation state for the billing summary.
  let dateLine = null;
  if (hasPlan && cancelAtEnd) dateLine = `Cancels on ${periodEnd || 'the end of the period'}`;
  else if (hasPlan && billingStatus === 'trialing') dateLine = `Trial ends ${trialEnd || periodEnd}`;
  else if (hasPlan && periodEnd) dateLine = `Renews ${periodEnd}`;
  else if (!hasPlan && access.reason === 'trial') dateLine = `Free trial ends ${trialEnd}`;

  const usages = [
    { key: 'max_clients', label: 'Clients', current: clients.length },
    { key: 'max_programs', label: 'Programs', current: programs.length },
    { key: 'max_nutrition_plans', label: 'Nutrition plans', current: nutritionPlans.length },
  ];

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      await openBillingPortal(db);
    } catch (e) {
      setOpeningPortal(false);
      toast.error(e.message || 'Could not open billing portal');
    }
  };

  const refreshUser = async () => {
    const u = await me();
    setUser(u);
    toast.success('Subscription status refreshed');
  };

  const GATED_MESSAGE = {
    past_due_expired: 'Your payment failed and the 3-day grace period has ended. Update your payment method to restore access.',
    trial_expired: 'Your free trial has ended. Pick a plan to keep going. Your clients and data are safe.',
    canceled: 'Your subscription has ended. Subscribe again to pick up where you left off. Your clients and data are safe.',
    unpaid: 'Your subscription is unpaid. Update your payment method to restore access.',
    incomplete: 'Your subscription setup was not completed. Choose a plan to finish subscribing.',
  };

  const planName = hasPlan
    ? `${userTier.name}, billed ${isYearly ? 'yearly' : 'monthly'}`
    : access.reason === 'trial' ? `${userTier.name}, free trial` : access.hasAccess ? `${userTier.name}, complimentary` : 'No active plan';
  const statusLabel = access.reason === 'trial' ? 'Free trial' : (access.reason === 'comped' || access.reason === 'admin') ? 'Full access' : billingCfg.label;
  const subtitle = hasPlan
    ? `${planName}.${dateLine ? ` ${dateLine}.` : ''}`
    : gated ? 'Pick a plan to keep coaching. Every plan starts with a 30-day free trial.' : `${planName}.${dateLine ? ` ${dateLine}.` : ''} Every plan starts with a 30-day free trial.`;

  return (
    <Page>
      {/* No access: explain why and what to do (never a blank/error page) */}
      {gated && (
        <Panel className="mb-5 px-5 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">Subscribe to continue</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {GATED_MESSAGE[accessReason] || 'Choose a plan to start your 30-day free trial.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPastDue && user?.stripe_customer_id && (
              <Button size="sm" onClick={handleOpenPortal} disabled={openingPortal}>
                {openingPortal ? 'Opening…' : 'Fix payment'}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => logout()}>
              <LogOut /> Sign out
            </Button>
          </div>
        </Panel>
      )}

      {/* Payment failure: the one red rule on this page */}
      {isPastDue && !gated && access.reason !== 'grace' && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-card border-l-[3px] border-destructive px-4 py-3 shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
          <p className="flex-1 min-w-[220px] text-sm">
            <span className="font-semibold text-destructive">Your last payment failed.</span>{' '}
            <span className="text-muted-foreground">Fix it within 3 days to keep access.</span>
          </p>
          <Button size="sm" onClick={handleOpenPortal}>Fix payment</Button>
        </div>
      )}
      {cancelAtEnd && !isCanceled && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-card px-4 py-3 shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
          <p className="flex-1 min-w-[220px] text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{userTier.name} ends on {periodEnd || 'the renewal date'}.</span> You keep access until then.
          </p>
          <Button size="sm" variant="outline" onClick={handleOpenPortal}>Keep my plan</Button>
        </div>
      )}

      <PageHeader
        title={hasPlan ? 'Plan and billing' : 'Choose a plan'}
        subtitle={subtitle}
        actions={(
          <>
            <Button variant="ghost" onClick={refreshUser}><RefreshCw /> Refresh</Button>
            {user?.stripe_customer_id && (
              <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
                <ExternalLink /> {openingPortal ? 'Opening…' : 'Manage billing'}
              </Button>
            )}
          </>
        )}
      />

      {/* Billing summary + usage */}
      <Panel className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] mb-8 overflow-hidden">
        <div className="px-5 py-5 sm:px-6 sm:py-6 border-b lg:border-b-0 lg:border-r border-border">
          <p className="text-[13px] text-muted-foreground">Current plan</p>
          <h2 className="text-[28px] text-foreground mt-0.5">{hasPlan || access.hasAccess ? userTier.name : 'None'}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <StatusDot tone={access.reason === 'trial' || access.reason === 'comped' || access.reason === 'admin' ? 'muted' : billingCfg.tone}>{statusLabel}</StatusDot>
            {dateLine && <span className="text-sm text-muted-foreground">{dateLine}</span>}
          </div>
          {hasPlan && planPrice && (
            <p className="mt-4">
              <span className="num text-[36px] leading-none text-foreground">{formatMoney(isYearly ? planPrice.yearly : planPrice.monthly)}</span>
              <span className="text-sm text-muted-foreground"> / {isYearly ? 'year' : 'month'}</span>
            </p>
          )}
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-[13px] text-muted-foreground mb-3">What you're using</p>
          <div className="space-y-4">
            {usages.map(({ key, label, current }) => {
              const limit = getLimit(user, key);
              const atLimit = limit !== -1 && current >= limit;
              const nearLimit = limit !== -1 && current / limit >= 0.8;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-sm text-foreground">{label}</span>
                    <span className={cn('text-sm tabular-nums', atLimit ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                      {limit === -1 ? `${current}, no limit` : `${current} of ${limit} used`}
                    </span>
                  </div>
                  <Meter value={limit === -1 ? 0 : current} max={limit === -1 ? 1 : limit} tone={atLimit ? 'danger' : nearLimit ? 'warning' : 'ink'} />
                </div>
              );
            })}
            <div>
              <p className="text-sm text-foreground mb-1.5">AI generations</p>
              <AiUsageMeter bar />
            </div>
          </div>
        </div>
      </Panel>

      {/* Pricing */}
      <h2 className="text-[26px] text-foreground mb-3">{hasPlan ? 'Compare plans' : 'Plans'}</h2>
      <PricingCards user={user} onUserUpdate={setUser} clientCount={clients.length} hasPlan={hasPlan} />
      <p className="text-[13px] text-muted-foreground mt-4">
        Payments are processed by Stripe. Upgrade or downgrade any time, no long-term contracts. Questions? Write to support@koachai.net.
      </p>

      {/* FAQ */}
      <Panel className="mt-8">
        <PanelHeader title="Common questions" />
        <div className="px-5 sm:px-6 pb-2">
          {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
        </div>
      </Panel>

      {/* Billing management */}
      {user?.stripe_customer_id && (
        <Panel className="mt-5 px-5 py-5 sm:px-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Card, invoices and cancellation</p>
            <p className="text-sm text-muted-foreground mt-0.5">Managed in Stripe's billing portal.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleOpenPortal} disabled={openingPortal}>
              <ExternalLink /> {openingPortal ? 'Opening…' : 'Manage billing'}
            </Button>
            {user?.stripe_subscription_id && !cancelAtEnd && (
              <Button variant="link" onClick={() => setCancelModalOpen(true)} className="text-muted-foreground hover:text-destructive">
                Cancel subscription
              </Button>
            )}
          </div>
        </Panel>
      )}

      {cancelModalOpen && (
        <CancellationModal user={user} onUserUpdate={setUser} onClose={() => setCancelModalOpen(false)} />
      )}
    </Page>
  );
}
