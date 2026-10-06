import React, { useState } from 'react';
import { PLAN_PRICES, clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/kit';
import { TIERS, TIER_ORDER, getUserTier } from '@/lib/subscription';
import UpgradeCompareModal from './UpgradeCompareModal';
import DowngradeModal from './DowngradeModal';
import { db } from '@/api/supabaseClient';
import { startCheckout } from '@/lib/authRedirect';
import { toast } from 'sonner';


const TIER_FEATURES = {
  starter: {
    inherited: [],
    unique: [`${aiLimitLabel('starter')} for program and meal plan builders`, 'Unlimited workout programs', 'Unlimited nutrition plans', 'Scheduling and calendar', 'In-app messaging', 'Client mobile app', 'Basic progress tracking', 'Email support'],
  },
  pro: {
    inherited: ['Everything in Starter'],
    unique: [`${aiLimitLabel('pro')} for program and meal plan builders`, 'AI onboarding: a starting program and meal plan for any new client', 'Progress analytics and graphs', 'Check-in review', 'AI check-in summaries and drafted replies', 'Adherence scoring', 'Voice and video messages', 'Client mobile dashboard', 'Your logo on the client app', 'Priority email support'],
  },
  elite: {
    inherited: ['Everything in Pro'],
    unique: [`${aiLimitLabel('elite')} for program and meal plan builders`, 'Full AI assistant: progression, check-in analysis, replies and calorie suggestions', 'Sales pipeline', 'Revenue dashboard', 'White-label branding', 'Community', 'Zapier', 'Chat support'],
  },
  enterprise: {
    inherited: ['Everything in Elite'],
    unique: [aiLimitLabel('enterprise'), 'The full AI assistant for every coach on your team', 'API access', 'White-label branding and your own domain', 'Team accounts for multi-coach businesses (coming soon)', 'Early access to new features', 'Priority email and chat support'],
  },
};

function PlanCard({ tierKey, billing, isCurrent, isUpgrade, noPlan, busy, onSelect }) {
  const tier = TIERS[tierKey];
  const features = TIER_FEATURES[tierKey];
  const prices = PLAN_PRICES[tierKey];
  const price = billing === 'annual' ? prices.annual : prices.monthly;
  const label = busy ? 'Opening checkout…' : noPlan ? `Start ${tier.name}` : isUpgrade ? `Upgrade to ${tier.name}` : `Switch to ${tier.name}`;
  const ink = isCurrent;

  return (
    <div className={cn(
      'relative flex flex-col rounded-xl overflow-hidden',
      ink ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border)/0.8)]'
    )}>
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[24px]">{tier.name}</h3>
          {isCurrent ? (
            <span className="text-[13px] font-semibold text-primary-foreground/80">Your plan</span>
          ) : tier.popular ? (
            <span className="text-[13px] text-muted-foreground">Most coaches pick this</span>
          ) : null}
        </div>
        <p className={cn('text-[13px] mt-1', ink ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{clientLimitLabel(tierKey)}</p>

        <div className="flex items-baseline gap-2 mt-4">
          {billing === 'annual' && (
            <span className={cn('text-lg line-through', ink ? 'text-primary-foreground/50' : 'text-muted-foreground')}>${prices.monthly}</span>
          )}
          <span className="num text-[44px] leading-none">${price}</span>
          <span className={cn('text-sm', ink ? 'text-primary-foreground/70' : 'text-muted-foreground')}>/ month</span>
        </div>
        <p className={cn('text-[13px] mt-2', ink ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {billing === 'annual'
            ? `$${prices.yearly.toLocaleString('en-US')} billed yearly, saves $${prices.annualSave}`
            : `or $${prices.annual} a month billed yearly`}
        </p>
      </div>

      <div className={cn('mx-6 border-t', ink ? 'border-primary-foreground/15' : 'border-border')} />

      <ul className="px-6 py-5 flex-1 space-y-2.5">
        {features.inherited.map(f => (
          <li key={f} className={cn('text-[13px] font-semibold', ink ? 'text-primary-foreground' : 'text-foreground')}>{f}, plus:</li>
        ))}
        {features.unique.map(f => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className={cn('w-3.5 h-3.5 flex-shrink-0 mt-[3px]', ink ? 'text-primary-foreground/70' : 'text-muted-foreground')} />
            <span className={cn('text-[13px] leading-snug', ink ? 'text-primary-foreground/90' : 'text-foreground/85')}>{f}</span>
          </li>
        ))}
      </ul>

      <div className="px-6 pb-6 space-y-2">
        {isCurrent ? (
          <p className="h-10 flex items-center justify-center rounded-md border border-primary-foreground/20 text-sm font-semibold text-primary-foreground/80">
            You're on {tier.name}
          </p>
        ) : (
          <Button
            className="w-full"
            variant={noPlan || isUpgrade ? 'default' : 'outline'}
            onClick={() => onSelect(tierKey)}
            disabled={busy}
          >
            {label}
          </Button>
        )}
        {tierKey === 'enterprise' && (
          <p className="text-center">
            <a href="mailto:support@koachai.net" className={cn('text-[13px] font-semibold underline underline-offset-4 decoration-1', ink ? 'text-primary-foreground' : 'text-foreground')}>
              Talk to sales
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default function PricingCards({ user, onUserUpdate, clientCount = 0, hasPlan = true }) {
  const [billing, setBilling] = useState('monthly');
  const [upgradeModal, setUpgradeModal] = useState(null); // { from, to }
  const [downgradeModal, setDowngradeModal] = useState(null); // { from, to }

  const userTier = getUserTier(user);
  const currentTierIndex = TIER_ORDER.indexOf(userTier.key);

  const [busyTier, setBusyTier] = useState(null);

  const handleSelect = async (tierKey) => {
    // No live subscription yet: go straight to Stripe Checkout (30-day trial,
    // promo codes allowed). Existing subscribers get the upgrade/downgrade flows.
    if (!hasPlan) {
      setBusyTier(tierKey);
      try {
        await startCheckout(db, tierKey, billing);
      } catch (e) {
        setBusyTier(null);
        toast.error(e.message || 'Could not start checkout. Please try again.');
      }
      return;
    }
    if (tierKey === userTier.key) return;
    const toIdx = TIER_ORDER.indexOf(tierKey);
    if (toIdx > currentTierIndex) {
      setUpgradeModal({ from: userTier.key, to: tierKey });
    } else {
      setDowngradeModal({ from: userTier.key, to: tierKey });
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
        <Segmented
          value={billing}
          onChange={setBilling}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'annual', label: 'Yearly, save 20%' },
          ]}
        />
        <p className="text-[13px] text-muted-foreground">Billed through Stripe. Cancel any time. No setup fees.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {TIER_ORDER.map(tierKey => (
          <PlanCard key={tierKey} tierKey={tierKey} billing={billing}
            isCurrent={hasPlan && userTier.key === tierKey}
            isUpgrade={TIER_ORDER.indexOf(tierKey) > currentTierIndex}
            noPlan={!hasPlan} busy={busyTier === tierKey}
            onSelect={handleSelect} />
        ))}
      </div>

      {/* Upgrade modal */}
      {upgradeModal && (
        <UpgradeCompareModal
          fromTierKey={upgradeModal.from}
          toTierKey={upgradeModal.to}
          billing={billing}
          clientCount={clientCount}
          user={user}
          onUserUpdate={onUserUpdate}
          onClose={() => setUpgradeModal(null)}
        />
      )}

      {/* Downgrade modal */}
      {downgradeModal && (
        <DowngradeModal
          fromTierKey={downgradeModal.from}
          toTierKey={downgradeModal.to}
          clientCount={clientCount}
          renewalDate={user?.subscription_renewal_date}
          user={user}
          onUserUpdate={onUserUpdate}
          onClose={() => setDowngradeModal(null)}
        />
      )}
    </div>
  );
}
