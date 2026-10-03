import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TIERS, TIER_ORDER, getUserTier } from '@/lib/subscription';
import { Check, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

// Exact pricing
const PLAN_PRICES = {
  starter:    { monthly: 29,  annual: 23,  annualSave: 72 },
  pro:        { monthly: 79,  annual: 63,  annualSave: 192 },
  elite:      { monthly: 149, annual: 119, annualSave: 360 },
  enterprise: { monthly: 299, annual: 239, annualSave: 720 },
};

const CLIENT_LIMIT = {
  starter: 'Up to 20 clients',
  pro: 'Up to 75 clients',
  elite: 'Unlimited clients',
  enterprise: 'Unlimited clients',
};

// inherited = shown normally, unique = shown bold/highlighted
const TIER_FEATURES = {
  starter: {
    inherited: [],
    unique: [
      'Up to 20 clients',
      'Workout program builder',
      'Basic nutrition plans',
      'Scheduling & calendar',
      'In-app messaging',
      'Client mobile app access',
      'Basic progress tracking',
      'Email support',
    ],
  },
  pro: {
    inherited: [
      'Everything in Starter',
    ],
    unique: [
      'Up to 75 clients',
      'Progress analytics & graphs',
      'Check-in review system',
      'Adherence scoring',
      'Voice & video messages',
      'Client mobile dashboard',
      'AI reply suggestions',
      'Custom branding (logo)',
      'Priority email support',
    ],
  },
  elite: {
    inherited: [
      'Everything in Pro',
    ],
    unique: [
      'Unlimited clients',
      'Full AI assistant (program + meal plan generation)',
      'Auto progression rules',
      'Sales pipeline CRM',
      'Revenue dashboard',
      'White-label branding',
      'Community module',
      'Zapier integrations',
      'Chat support',
    ],
  },
  enterprise: {
    inherited: [
      'Everything in Elite',
    ],
    unique: [
      'Unlimited clients',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'Team accounts (multiple coaches)',
      'Custom contract & invoicing',
      'Priority phone support',
      'Custom onboarding & training',
    ],
  },
};

export default function StripeUpgradeModal({ open, onClose, user, onUserUpdate }) {
  const { me } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(null);

  const userTier = getUserTier(user);
  const currentTierIndex = TIER_ORDER.indexOf(userTier.key);

  const getPrice = (tierKey) => {
    const p = PLAN_PRICES[tierKey];
    return billing === 'annual' ? p.annual : p.monthly;
  };

  const handleSelectTier = async (tierKey) => {
    if (tierKey === userTier.key) return;
    setLoading(tierKey);

    const res = await db.functions.invoke('stripeCheckout', {
      action: 'checkout',
      tier: tierKey,
      success_url: `${window.location.origin}/subscription?success=1`,
      cancel_url: `${window.location.origin}/subscription`,
    });

    setLoading(null);

    if (res.data?.url) {
      window.location.href = res.data.url;
    } else if (res.data?.upgraded) {
      const updated = await me();
      if (onUserUpdate) onUserUpdate(updated);
      toast.success(`Upgraded to ${TIERS[tierKey].name}!`);
      onClose();
    } else {
      toast.error(res.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-border/50" style={{ background: 'hsl(222 28% 7%)' }}>
        {/* Header */}
        <div className="relative p-6 pb-4 overflow-hidden border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center justify-between gap-4 pr-10">
            <div>
              <h2 className="text-xl font-heading font-bold">Choose your plan</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Billed via Stripe · Cancel anytime · No setup fees</p>
            </div>
            {/* Pill toggle */}
            <div className="flex items-center bg-secondary/40 rounded-full p-1 text-xs font-semibold select-none">
              <button
                onClick={() => setBilling('monthly')}
                className={cn(
                  'px-4 py-1.5 rounded-full transition-all duration-200',
                  billing === 'monthly'
                    ? 'bg-gradient-to-r from-primary to-primary text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={cn(
                  'px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5',
                  billing === 'annual'
                    ? 'bg-gradient-to-r from-primary to-primary text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Annual
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors',
                  billing === 'annual' ? 'bg-[var(--kc-w-20)] text-white' : 'bg-accent/10 text-accent'
                )}>-20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6 overflow-x-auto">
          <div className="grid grid-cols-4 gap-3 min-w-[700px]">
            {TIER_ORDER.map(tierKey => {
              const tier = TIERS[tierKey];
              const isCurrent = userTier.key === tierKey;
              const isUpgrade = TIER_ORDER.indexOf(tierKey) > currentTierIndex;
              const isElite = tierKey === 'elite';
              const isPro = tierKey === 'pro';
              const price = getPrice(tierKey);
              const monthlyPrice = PLAN_PRICES[tierKey].monthly;
              const annualSave = PLAN_PRICES[tierKey].annualSave;
              const features = TIER_FEATURES[tierKey];

              return (
                <div key={tierKey} className={cn(
                  'relative rounded-xl border flex flex-col transition-all',
                  isCurrent     ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' :
                  isElite       ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20' :
                                  'border-border/40 bg-secondary/10 hover:border-border/70'
                )}>
                  {/* Badges */}
                  {isElite && !isCurrent && (
                    <div className="absolute -top-2.5 inset-x-0 flex justify-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-accent text-accent-foreground px-3 py-0.5 rounded-full">⭐ Recommended</span>
                    </div>
                  )}
                  {isPro && !isCurrent && (
                    <div className="absolute -top-2.5 inset-x-0 flex justify-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-success text-white px-3 py-0.5 rounded-full">Most Popular</span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-2.5 inset-x-0 flex justify-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground px-3 py-0.5 rounded-full">Current Plan</span>
                    </div>
                  )}

                  <div className="p-4 pb-3 border-b border-border/20">
                    <p className={cn('font-heading font-bold text-sm mb-2', tier.color)}>{tier.name}</p>

                    {/* Price display */}
                    <div className="flex items-end gap-1.5">
                      {billing === 'annual' && (
                        <span className="text-sm text-muted-foreground/50 line-through mb-0.5">${monthlyPrice}</span>
                      )}
                      <span className="text-2xl font-heading font-bold text-foreground" style={{ transition: 'all 0.3s ease' }}>
                        ${price}
                      </span>
                      <span className="text-xs text-muted-foreground mb-0.5">/mo</span>
                    </div>

                    {billing === 'annual' ? (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                        Save ${annualSave}/year
                      </span>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">or ${PLAN_PRICES[tierKey].annual}/mo billed annually</p>
                    )}

                    {/* Client limit pill */}
                    <p className="mt-2 text-[10px] font-semibold text-muted-foreground bg-secondary/40 rounded-md px-2 py-1 inline-block">
                      {CLIENT_LIMIT[tierKey]}
                    </p>
                  </div>

                  <div className="p-3 flex-1 space-y-1">
                    {features.inherited.map(point => (
                      <div key={point} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-muted-foreground/60 leading-tight">{point}</span>
                      </div>
                    ))}
                    {features.unique.map(point => (
                      <div key={point} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-foreground/80 leading-tight font-medium">{point}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 pt-3">
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      variant={isCurrent ? 'secondary' : isElite ? 'default' : 'outline'}
                      disabled={isCurrent || loading === tierKey}
                      onClick={() => handleSelectTier(tierKey)}
                    >
                      {loading === tierKey ? 'Loading...' :
                       isCurrent ? 'Current Plan' :
                       isUpgrade ? <><span>Upgrade to {tier.name}</span><ArrowRight className="w-3 h-3 ml-1" /></> :
                       `Switch to ${tier.name}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 pb-5">
          Payments securely processed by Stripe · Upgrades take effect immediately · Downgrades at period end
        </p>
      </DialogContent>
    </Dialog>
  );
}