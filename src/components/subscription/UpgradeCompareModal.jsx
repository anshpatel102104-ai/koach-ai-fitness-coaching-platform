import React, { useState } from 'react';
import { PLAN_PRICES, clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';
import { X, Check, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIERS, TIER_ORDER } from '@/lib/subscription';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import SuccessScreen from './SuccessScreen';


const TIER_FEATURES = {
  starter: ['Workout program builder', 'Basic nutrition plans', 'Scheduling & calendar', 'In-app messaging', 'Client mobile app access', 'Basic progress tracking', 'Email support'],
  pro:     ['AI onboarding', 'Progress analytics & graphs', 'Check-in review system', 'AI check-in summaries & AI-drafted replies', 'Adherence scoring', 'Voice & video messages', 'Client mobile dashboard', 'Custom branding (logo)', 'Priority email support'],
  elite:   ['Full AI assistant', 'Auto progression rules', 'Sales pipeline CRM', 'Revenue dashboard', 'White-label branding', 'Community module', 'Zapier integrations', 'Chat support'],
  enterprise: ['API access', 'Custom integrations', 'Dedicated account manager', 'Team accounts (multiple coaches)', 'Custom contract & invoicing', 'Priority phone support', 'Custom onboarding & training'],
};

const CARD_ACCENT = {
  starter: 'var(--tc-muted-foreground)',
  pro: 'var(--tc-primary)',
  elite: 'var(--tc-ai)',
  enterprise: 'var(--tc-warning)',
};

export default function UpgradeCompareModal({ fromTierKey, toTierKey, billing: initialBilling, clientCount = 0, user, onClose, onUserUpdate }) {
  const { me } = useAuth();
  const [billing, setBilling] = useState(initialBilling || 'monthly');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const fromTier = TIERS[fromTierKey];
  const toTier = TIERS[toTierKey];
  const fromPrices = PLAN_PRICES[fromTierKey];
  const toPrices = PLAN_PRICES[toTierKey];

  const fromPrice = billing === 'annual' ? fromPrices.annual : fromPrices.monthly;
  const toPrice = billing === 'annual' ? toPrices.annual : toPrices.monthly;
  const diff = toPrice - fromPrice;

  // Features gained (in toTier not in fromTier, only the unique new ones)
  const fromIdx = TIER_ORDER.indexOf(fromTierKey);
  const newFeatures = [
    clientLimitLabel(toTierKey),
    aiLimitLabel(toTierKey),
    ...TIER_ORDER.slice(fromIdx + 1, TIER_ORDER.indexOf(toTierKey) + 1).flatMap(k => TIER_FEATURES[k]),
  ];

  const billedAmount = billing === 'annual' ? `$${toPrices.yearly.toLocaleString('en-US')}/yr` : `$${toPrices.monthly}/mo`;

  const nextBillingDate = () => {
    const d = new Date();
    if (billing === 'annual') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleConfirm = async () => {
    setLoading(true);
    const res = await db.functions.invoke('stripeCheckout', {
      action: 'checkout',
      tier: toTierKey,
      billing_cycle: billing,
      success_url: `${window.location.origin}/subscription?success=1`,
      cancel_url: `${window.location.origin}/subscription`,
    });
    setLoading(false);

    if (res.data?.url) {
      window.location.href = res.data.url;
    } else if (res.data?.upgraded) {
      const updated = await me();
      if (onUserUpdate) onUserUpdate(updated);
      setSuccessData({ tier: toTierKey, price: toPrice, billing, nextDate: nextBillingDate(), email: user?.email });
      setShowSuccess(true);
    } else {
      toast.error(res.data?.error || 'Something went wrong. Please try again.');
    }
  };

  if (showSuccess && successData) {
    return <SuccessScreen {...successData} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-sidebar shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Upgrade to {toTier.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Review what you're gaining and confirm your upgrade</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Plan comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Current */}
            <div className="rounded-xl border border-white/10 bg-card/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Current</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: CARD_ACCENT[fromTierKey] }} />
                <span className="font-bold text-sidebar-foreground">{fromTier.name}</span>
              </div>
              <div className="text-3xl font-bold text-muted-foreground">${fromPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            </div>
            {/* New */}
            <div className="rounded-xl border border-white/20 p-4" style={{ background: `${CARD_ACCENT[toTierKey]}10`, borderColor: `${CARD_ACCENT[toTierKey]}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Upgrading to</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: CARD_ACCENT[toTierKey] }} />
                <span className="font-bold text-white">{toTier.name}</span>
              </div>
              <div className="text-3xl font-bold text-white">${toPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            </div>
          </div>

          {/* Price difference */}
          <div className="rounded-xl border border-white/10 bg-card/[0.03] p-4 text-center">
            <span className="text-muted-foreground text-sm">You'll pay </span>
            <span className="text-white font-bold">${Math.abs(diff)} more per month</span>
            {billing === 'monthly' && toPrices.annualSave > 0 && (
              <p className="text-success text-xs mt-1">💡 Switch to annual and save ${toPrices.annualSave}/year</p>
            )}
          </div>

          {/* Billing toggle */}
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground mb-3">Billing cycle</p>
            <div className="flex items-center bg-[var(--kc-w-5)] rounded-full p-1 border border-white/10 w-fit">
              {['monthly', 'annual'].map(b => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 capitalize',
                    billing === b ? 'bg-gradient-to-r from-primary to-ai text-white' : 'text-muted-foreground hover:text-white'
                  )}
                >
                  {b}
                  {b === 'annual' && <span className="ml-1.5 text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">-20%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* New features you're gaining */}
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ai" /> What you're gaining
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {newFeatures.map(f => (
                <div key={f} className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                  <span className="text-xs text-sidebar-foreground">{f}</span>
                  <span className="ml-auto text-[9px] font-bold uppercase bg-success/20 text-success px-1.5 py-0.5 rounded-full">NEW</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="rounded-xl border border-white/10 bg-card/[0.03] p-4 space-y-2.5">
            <p className="text-sm font-semibold text-white mb-3">Order Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{toTier.name} plan ({billing})</span>
              <span className="text-white">{billedAmount}</span>
            </div>
            <div className="border-t border-white/10 pt-2.5 flex justify-between">
              <span className="font-bold text-white">Billed</span>
              <span className="font-bold text-white">{billedAmount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Upgrades are prorated. Have a promo code? Enter it at checkout.</p>
            <p className="text-xs text-muted-foreground">Next billing: {nextBillingDate()}</p>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 20px color-mix(in srgb, var(--tc-ai) 30%, transparent)' }}
            >
              {loading ? 'Processing...' : `Start ${toTier.name} Plan →`}
            </button>
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Secured by Stripe · SSL Encrypted
            </p>
            <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors py-1">
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}