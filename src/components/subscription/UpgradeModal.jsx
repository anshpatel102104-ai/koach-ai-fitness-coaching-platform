import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TIERS, TIER_ORDER, FEATURE_INFO, getUserTier } from '@/lib/subscription';
import { Check, X, Zap, ArrowRight, Sparkles, TrendingUp, Trophy, ShoppingBag,
  ClipboardList, DollarSign, Globe, Smartphone, Users, Palette, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { PLAN_PRICES, clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';

const ICON_MAP = {
  TrendingUp, Trophy, ShoppingBag, ClipboardList, DollarSign, Globe,
  Smartphone, Users, Sparkles, Palette, Code, Zap,
};

// Key selling points shown per tier in the comparison table
const TIER_SELLING_POINTS = {
  starter: [clientLimitLabel('starter'), aiLimitLabel('starter'), 'Workout programs', 'Nutrition plans', 'Scheduling', 'Text messaging'],
  pro:     [clientLimitLabel('pro'), aiLimitLabel('pro'), 'AI onboarding', 'Progress analytics', 'Check-in reviews', 'AI check-in summaries & replies', 'Adherence scoring', 'Analytics graphs', 'Voice & video messages', 'Client mobile dashboard'],
  elite:   [clientLimitLabel('elite'), aiLimitLabel('elite'), 'Full AI assistant', 'AI calorie & progression', 'Auto progression rules', 'Sales pipeline CRM', 'Revenue dashboard', 'White-label branding', 'Community module'],
  enterprise: [clientLimitLabel('enterprise'), aiLimitLabel('enterprise'), 'Team AI access', 'Multi-coach team accounts', 'Advanced analytics (LTV, churn)', 'Stripe & Sheets integrations', 'API access', 'Priority support'],
};

export default function UpgradeModal({ open, onClose, featureKey, user, onUserUpdate }) {
  const { me } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [saving, setSaving] = useState(null);

  const featureInfo = FEATURE_INFO[featureKey] || {};
  const minTierKey = featureInfo.minTier || 'pro';
  const userTier = getUserTier(user);
  const currentTierIndex = TIER_ORDER.indexOf(userTier.key);
  const FeatureIcon = ICON_MAP[featureInfo.icon] || Zap;

  const getPrice = (tier) => {
    const p = PLAN_PRICES[tier.key];
    return billing === 'yearly' ? p.annual : p.monthly;
  };

  const handleSelectTier = async (tierKey) => {
    if (tierKey === userTier.key) return;
    setSaving(tierKey);
    try {
      // Route every plan change through Stripe. The server verifies payment and
      // is the only thing allowed to set subscription_tier — the browser never
      // writes the tier directly (that would be a free-upgrade bypass).
      const res = await db.functions.invoke('stripeCheckout', {
        action: 'checkout',
        tier: tierKey,
        billing_cycle: billing === 'yearly' ? 'annual' : 'monthly',
        success_url: `${window.location.origin}/subscription?success=1`,
        cancel_url: window.location.href,
      });
      const data = res?.data || {};

      // New subscriber → redirect to Stripe Checkout to enter payment details.
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Existing subscriber → server applied a prorated plan change in Stripe.
      if (data.upgraded) {
        const updated = await me();
        if (onUserUpdate) onUserUpdate(updated);
        const tier = TIERS[tierKey];
        const isUpgrade = TIER_ORDER.indexOf(tierKey) > currentTierIndex;
        toast.success(`${isUpgrade ? '🚀 Upgraded' : 'Switched'} to ${tier.name}!`, {
          description: 'Your plan change is now active.',
        });
        onClose();
        return;
      }

      toast.error(data.error || 'Could not start checkout. Please try again.');
    } catch {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  // Recommended = 'elite' if user is pro or above, otherwise 'pro'
  const recommendedKey = currentTierIndex >= TIER_ORDER.indexOf('pro') ? 'elite' : 'pro';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-border" style={{ background: 'var(--tc-card)' }}>
        {/* Header */}
        <div className="relative p-6 pb-4 overflow-hidden border-b border-border">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground hover:text-foreground transition-colors z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center gap-4">
            {featureKey && (
              <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center flex-shrink-0 glow-sm">
                <FeatureIcon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-heading font-bold">
                {featureInfo.name ? `Unlock ${featureInfo.name}` : 'Choose your plan'}
              </h2>
              {featureInfo.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{featureInfo.description}</p>
              )}
            </div>
            {/* Billing toggle */}
            <div className="flex items-center gap-1 bg-muted border border-border rounded-lg p-1 text-xs font-semibold">
              <button
                onClick={() => setBilling('monthly')}
                className={cn('px-3 py-1.5 rounded-md transition-all', billing === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-foreground hover:text-foreground')}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={cn('px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5', billing === 'yearly' ? 'bg-card text-foreground shadow-sm' : 'text-foreground hover:text-foreground')}
              >
                Yearly
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans comparison grid */}
        <div className="p-6 overflow-x-auto">
          <div className="grid grid-cols-4 gap-3 min-w-[640px]">
            {TIER_ORDER.map(tierKey => {
              const tier = TIERS[tierKey];
              const isCurrent = userTier.key === tierKey;
              const isRecommended = tierKey === recommendedKey && !isCurrent;
              const tierIndex = TIER_ORDER.indexOf(tierKey);
              const isUpgrade = tierIndex > currentTierIndex;
              const isDowngrade = tierIndex < currentTierIndex;
              const price = getPrice(tier);

              return (
                <div key={tierKey} className={cn(
                  'relative rounded-xl border flex flex-col transition-all',
                  isCurrent      ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' :
                  isRecommended  ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20' :
                                   'border-border bg-muted hover:border-border'
                )}>
                  {isRecommended && (
                    <div className="absolute -top-2.5 inset-x-0 flex justify-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-accent text-accent-foreground px-3 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-2.5 inset-x-0 flex justify-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground px-3 py-0.5 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="p-4 pb-3 border-b border-border">
                    <p className={cn('font-heading font-bold text-sm mb-1', tier.color)}>{tier.name}</p>
                    <div className="flex items-end gap-1">
                      <span className="stat-number text-2xl font-heading font-bold">${price}</span>
                      <span className="text-xs text-foreground mb-0.5">/mo</span>
                    </div>
                    {billing === 'yearly' && (
                      <p className="text-[10px] text-accent mt-0.5">Save ${PLAN_PRICES[tier.key].annualSave}/yr</p>
                    )}
                  </div>

                  <div className="p-4 flex-1 space-y-1.5">
                    {TIER_SELLING_POINTS[tierKey].map(point => (
                      <div key={point} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-foreground leading-tight">{point}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 pt-3">
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      variant={isCurrent ? 'secondary' : isRecommended ? 'default' : 'outline'}
                      disabled={isCurrent || saving === tierKey}
                      onClick={() => handleSelectTier(tierKey)}
                    >
                      {saving === tierKey ? 'Switching...' :
                       isCurrent ? 'Current Plan' :
                       isUpgrade ? <><span>Upgrade to {tier.name}</span> <ArrowRight className="w-3 h-3" /></> :
                       `Switch to ${tier.name}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-foreground pb-5">
          Secure checkout via Stripe · No setup fees · Cancel anytime
        </p>
      </DialogContent>
    </Dialog>
  );
}