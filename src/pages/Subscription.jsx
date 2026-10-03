import React, { useState, useEffect } from 'react';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useTeamRole } from '@/lib/useTeamRole';
import { ShieldAlert } from 'lucide-react';
import { getUserTier, getLimit } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Zap, Users, Dumbbell, Salad, AlertTriangle,
  ExternalLink, RefreshCw, Calendar, CreditCard, CheckCircle2, XCircle,
  Clock, Lock, RotateCcw, MessageCircle, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import PricingCards from '@/components/subscription/PricingCards';
import CancellationModal from '@/components/subscription/CancellationModal';

const BILLING_STATUS_CONFIG = {
  active:     { label: 'Active',      cls: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  trialing:   { label: 'Trial',       cls: 'bg-primary/10 text-primary border-primary/30',          icon: Clock },
  past_due:   { label: 'Past Due',    cls: 'bg-warning/10 text-warning border-warning/30',       icon: AlertTriangle },
  unpaid:     { label: 'Unpaid',      cls: 'bg-destructive/10 text-destructive border-destructive/30',             icon: XCircle },
  incomplete: { label: 'Incomplete',  cls: 'bg-warning/10 text-warning border-warning/30',       icon: Clock },
  canceled:   { label: 'Canceled',    cls: 'bg-[var(--kc-w-5)] text-muted-foreground border-white/10',               icon: XCircle },
};

const PLAN_PRICES = {
  starter: 29, pro: 79, elite: 149, enterprise: 299,
};

const TIER_HIGHLIGHTS = {
  starter:    ['Up to 10 clients', '15 AI generations/month (programs + meal plans)', 'Workout program builder', 'Basic nutrition plans', 'Scheduling & calendar', 'In-app messaging', 'Client mobile app access', 'Basic progress tracking', 'Email support'],
  pro:        ['Up to 25 clients', 'Everything in Starter', '50 AI generations/month — program & meal plan builder', 'Progress analytics & graphs', 'Check-in review system', 'Adherence scoring', 'Voice & video messages', 'Client mobile dashboard', 'AI reply suggestions', 'Custom branding (logo)', 'Priority email support'],
  elite:      ['Up to 75 clients', 'Everything in Pro', '150 AI generations/month — program & meal plan builder', 'Full AI Assistant — auto progression, check-in analysis & coaching automation', 'Sales pipeline CRM', 'Revenue dashboard', 'White-label branding', 'Community module', 'Zapier integrations', 'Chat support'],
  enterprise: ['Unlimited clients', 'Everything in Elite', 'Team-wide AI access for multiple coaches', 'AI API access', 'Custom integrations', 'Dedicated account manager', 'Team accounts (multiple coaches)', 'Custom contract & invoicing', 'Priority phone support', 'Custom onboarding & training'],
};

const TRUST_ITEMS = [
  { icon: Lock, text: 'Payments securely processed by Stripe' },
  { icon: RotateCcw, text: 'Upgrade or downgrade anytime' },
  { icon: XCircle, text: 'Cancel anytime — no long-term contracts' },
  { icon: MessageCircle, text: 'Questions? Chat with us' },
];

const FAQS = [
  { q: 'Can I change plans later?', a: 'Yes! You can upgrade or downgrade your plan at any time from the subscription page. Upgrades take effect immediately, and downgrades apply at the end of your billing period.' },
  { q: 'What happens to my clients if I downgrade?', a: 'Your existing clients remain in the system. However, if you exceed the client limit of your new plan, you won\'t be able to add new clients until you\'re back under the limit. Existing client data is never deleted.' },
  { q: 'Is there a free trial?', a: 'We offer a 30-day free trial on all plans so you can explore KOACH AI risk-free. No credit card required to start your trial.' },
  { q: 'Do my clients pay separately?', a: 'No — your clients use KOACH AI for free as part of your subscription. You pay one flat monthly or annual rate that covers you and all your clients.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) via Stripe. Annual plans can also be invoiced for Enterprise customers.' },
  { q: 'Can I add more coaches to my account?', a: 'Team accounts with multiple coaches are available on the Enterprise plan. Contact our sales team to discuss pricing for your coaching organization.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-sm font-semibold text-sidebar-foreground group-hover:text-white transition-colors">{q}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function CoachBillingBlock() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--tc-sidebar)' }}>
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'color-mix(in srgb, var(--tc-destructive) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 25%, transparent)' }}>
          <ShieldAlert className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Billing is owner-only</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Only the team owner can view or change the subscription plan. Contact your team owner if you need to make billing changes.
        </p>
      </div>
    </div>
  );
}

export default function Subscription() {
  const { me } = useAuth();
  const [user, setUser] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const { isOwner, isLoading: loadingRole } = useTeamRole();

  useEffect(() => { me().then(setUser).catch(() => {}); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      setTimeout(() => {
        me().then(u => { setUser(u); toast.success('Subscription updated!'); });
      }, 2000);
    }
  }, []);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.entities.Client.list() });
  const { data: programs = [] } = useQuery({ queryKey: ['programs'], queryFn: () => db.entities.WorkoutProgram.list() });
  const { data: nutritionPlans = [] } = useQuery({ queryKey: ['nutrition-plans'], queryFn: () => db.entities.NutritionPlan.list() });

  // Block non-owners from accessing billing (after all hooks)
  if (!loadingRole && !isOwner) return <CoachBillingBlock />;

  const userTier = getUserTier(user);
  const billingStatus = user?.billing_status || 'active';
  const billingCfg = BILLING_STATUS_CONFIG[billingStatus] || BILLING_STATUS_CONFIG.active;
  const BillingIcon = billingCfg.icon;
  const isPastDue = ['past_due', 'unpaid', 'incomplete'].includes(billingStatus);
  const isCanceled = billingStatus === 'canceled';
  const renewalDate = user?.subscription_renewal_date;
  const cancelAtEnd = user?.subscription_cancel_at_period_end;

  const usages = [
    { key: 'max_clients', label: 'Clients', icon: Users, current: clients.length },
    { key: 'max_programs', label: 'Programs', icon: Dumbbell, current: programs.length },
    { key: 'max_nutrition_plans', label: 'Nutrition Plans', icon: Salad, current: nutritionPlans.length },
  ];

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    const res = await db.functions.invoke('stripeCheckout', {
      action: 'portal',
      cancel_url: window.location.href,
    });
    setOpeningPortal(false);
    if (res.data?.url) window.open(res.data.url, '_blank');
    else toast.error('Could not open billing portal');
  };

  const refreshUser = async () => {
    const u = await me();
    setUser(u);
    toast.success('Subscription status refreshed');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--tc-sidebar)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">

        {/* Alert Banners */}
        {isPastDue && (
          <div className="mb-6 flex items-start gap-4 bg-warning/10 border border-warning/30 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-warning">Payment Issue — Action Required</p>
              <p className="text-xs text-warning/70 mt-0.5">Your last payment failed. Update your billing details to restore full access.</p>
            </div>
            <Button size="sm" className="bg-warning hover:bg-warning text-black font-semibold flex-shrink-0" onClick={handleOpenPortal}>
              Fix Payment
            </Button>
          </div>
        )}
        {cancelAtEnd && !isCanceled && (
          <div className="mb-6 flex items-start gap-4 bg-[var(--kc-w-5)] border border-white/10 rounded-2xl p-4">
            <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Subscription Ending</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your {userTier.name} plan will end on {renewalDate || 'the renewal date'}.</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleOpenPortal} className="flex-shrink-0 border-white/20 text-white hover:bg-[var(--kc-w-10)]">Reactivate</Button>
          </div>
        )}

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={refreshUser} className="text-muted-foreground hover:text-sidebar-foreground text-xs">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
            {user?.stripe_subscription_id && (
              <Button variant="ghost" size="sm" onClick={handleOpenPortal} disabled={openingPortal} className="text-muted-foreground hover:text-sidebar-foreground text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                {openingPortal ? 'Opening...' : 'Billing Portal'}
              </Button>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Scale your coaching business with the right tools</p>
        </div>

        {/* Current Plan Status Bar */}
        <div className="bg-card/[0.04] border border-white/10 rounded-2xl p-5 mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--kc-w-5)] border border-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Current Plan</p>
                <h2 className="text-xl font-bold text-white">{userTier.name}</h2>
              </div>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', billingCfg.cls)}>
                <BillingIcon className="w-3 h-3" />{billingCfg.label}
              </span>
              {renewalDate && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {cancelAtEnd ? 'Ends' : 'Renews'} {renewalDate}
                </span>
              )}
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-white">${PLAN_PRICES[userTier.key] ?? 0}</span>
              <span className="text-muted-foreground text-sm mb-0.5">/mo</span>
            </div>
          </div>

          {/* Usage Meters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {usages.map(({ key, label, icon: Icon, current }) => {
              const limit = getLimit(user, key);
              const pct = limit === -1 ? 0 : Math.min((current / limit) * 100, 100);
              const atLimit = limit !== -1 && current >= limit;
              const nearLimit = limit !== -1 && pct >= 80;
              return (
                <div key={key} className="bg-card/[0.03] border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className={cn('text-2xl font-bold', atLimit ? 'text-destructive' : nearLimit ? 'text-warning' : 'text-white')}>
                      {current}
                    </span>
                    <span className="text-xs text-muted-foreground">{limit === -1 ? '∞ unlimited' : `/ ${limit}`}</span>
                  </div>
                  {limit !== -1 && (
                    <div className="h-1.5 rounded-full bg-[var(--kc-w-5)] overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700', atLimit ? 'bg-destructive' : nearLimit ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Cards */}
        <PricingCards user={user} onUserUpdate={setUser} clientCount={clients.length} />

        {/* Trust Bar */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRUST_ITEMS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-muted-foreground text-xs">
              <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="bg-card/[0.03] border border-white/10 rounded-2xl px-6">
            {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
          </div>
        </div>

        {/* Billing management */}
        {user?.stripe_customer_id && (
          <div className="mt-8 bg-card/[0.03] border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--kc-w-5)] flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Billing managed by Stripe</p>
                <p className="text-xs text-muted-foreground">Update payment method, download invoices, or cancel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={openingPortal}
                className="border-white/20 text-white hover:bg-[var(--kc-w-10)]">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {openingPortal ? 'Opening...' : 'Manage Billing'}
              </Button>
              {user?.stripe_subscription_id && !cancelAtEnd && (
                <Button variant="ghost" size="sm" onClick={() => setCancelModalOpen(true)}
                  className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-xs">
                  Cancel subscription
                </Button>
              )}
            </div>
          </div>
        )}

        {cancelModalOpen && (
          <CancellationModal user={user} onUserUpdate={setUser} onClose={() => setCancelModalOpen(false)} />
        )}

      </div>
    </div>
  );
}