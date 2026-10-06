import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Segmented } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { TIERS, TIER_ORDER, FEATURE_INFO, getUserTier } from '@/lib/subscription';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { PLAN_PRICES, PLAN_HIGHLIGHTS, clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';

// Key selling points shown per tier in the comparison table (one source: PLAN_HIGHLIGHTS).
const TIER_SELLING_POINTS = Object.fromEntries(Object.keys(PLAN_HIGHLIGHTS).map((k) => [
  k, [clientLimitLabel(k), aiLimitLabel(k), ...PLAN_HIGHLIGHTS[k]],
]));

export default function UpgradeModal({ open, onClose, featureKey, user, onUserUpdate }) {
  const { me } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [saving, setSaving] = useState(null);

  const featureInfo = FEATURE_INFO[featureKey] || {};
  const minTierKey = featureInfo.minTier || 'pro';
  const userTier = getUserTier(user);
  const currentTierIndex = TIER_ORDER.indexOf(userTier.key);

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
        toast.success(`${isUpgrade ? 'Upgraded' : 'Switched'} to ${tier.name}`, {
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

  const minTier = TIERS[minTierKey] || TIERS.pro;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl p-0 sm:p-0 sm:gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pr-12">
          <div className="min-w-0">
            <DialogTitle className="text-[26px]">
              {featureInfo.name ? `${featureInfo.name} is on ${minTier.name}` : 'Choose your plan'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {featureInfo.description || `You're on ${userTier.name}. Every plan bills through Stripe and can be changed any time.`}
            </p>
          </div>
          <Segmented
            size="sm"
            value={billing}
            onChange={setBilling}
            options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly, save 20%' }]}
          />
        </div>

        {/* Plans comparison grid */}
        <div className="p-6 overflow-x-auto">
          <div className="grid grid-cols-4 gap-3 min-w-[680px]">
            {TIER_ORDER.map(tierKey => {
              const tier = TIERS[tierKey];
              const isCurrent = userTier.key === tierKey;
              const isRecommended = tierKey === recommendedKey && !isCurrent;
              const tierIndex = TIER_ORDER.indexOf(tierKey);
              const isUpgrade = tierIndex > currentTierIndex;
              const price = getPrice(tier);

              return (
                <div key={tierKey} className={cn(
                  'rounded-xl flex flex-col',
                  isCurrent ? 'bg-primary text-primary-foreground' : 'bg-card shadow-[0_0_0_1px_rgb(var(--border))]'
                )}>
                  <div className={cn('p-4 pb-3 border-b', isCurrent ? 'border-primary-foreground/15' : 'border-border')}>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xl">{tier.name}</h3>
                      <span className={cn('text-xs', isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {isCurrent ? 'Your plan' : isRecommended ? 'Suggested' : ''}
                      </span>
                    </div>
                    <p className="mt-2">
                      <span className="num text-[30px] leading-none">${price}</span>
                      <span className={cn('text-xs', isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground')}> / month</span>
                    </p>
                    {billing === 'yearly' && (
                      <p className={cn('text-xs mt-1', isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground')}>Saves ${PLAN_PRICES[tier.key].annualSave} a year</p>
                    )}
                  </div>

                  <ul className="p-4 flex-1 space-y-1.5">
                    {TIER_SELLING_POINTS[tierKey].map(point => (
                      <li key={point} className="flex items-start gap-2">
                        <Check className={cn('w-3.5 h-3.5 flex-shrink-0 mt-[2px]', isCurrent ? 'text-primary-foreground/70' : 'text-muted-foreground')} />
                        <span className={cn('text-[13px] leading-snug', isCurrent ? 'text-primary-foreground/90' : 'text-foreground/85')}>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="p-4 pt-2">
                    {isCurrent ? (
                      <p className="h-8 flex items-center justify-center text-[13px] font-semibold text-primary-foreground/70">Current plan</p>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        variant={isUpgrade ? 'default' : 'outline'}
                        disabled={saving === tierKey}
                        onClick={() => handleSelectTier(tierKey)}
                      >
                        {saving === tierKey ? 'Switching…' : isUpgrade ? `Upgrade to ${tier.name}` : `Switch to ${tier.name}`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground px-6 pb-6">
          Checkout through Stripe. No setup fees. Cancel any time.
        </p>
      </DialogContent>
    </Dialog>
  );
}
