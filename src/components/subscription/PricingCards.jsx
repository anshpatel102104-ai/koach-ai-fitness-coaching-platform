import React, { useState } from 'react';
import { PLAN_PRICES, clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIERS, TIER_ORDER, getUserTier } from '@/lib/subscription';
import UpgradeCompareModal from './UpgradeCompareModal';
import DowngradeModal from './DowngradeModal';
import { db } from '@/api/supabaseClient';
import { startCheckout } from '@/lib/authRedirect';
import { toast } from 'sonner';


const TIER_FEATURES = {
  starter: {
    inherited: [],
    unique: [`✨ ${aiLimitLabel('starter')} — program & meal plan builders`, 'Unlimited workout programs', 'Unlimited nutrition plans', 'Scheduling & calendar', 'In-app messaging', 'Client mobile app access', 'Basic progress tracking', 'Email support'],
  },
  pro: {
    inherited: ['Everything in Starter'],
    unique: [`✨ ${aiLimitLabel('pro')} — program & meal plan builders`, '✨ AI Onboarding — auto-generate a starting program & meal plan for any client', 'Progress analytics & graphs', 'Check-in review system', 'AI check-in summaries & AI-drafted replies', 'Adherence scoring', 'Voice & video messages', 'Client mobile dashboard', 'Custom branding (logo)', 'Priority email support'],
  },
  elite: {
    inherited: ['Everything in Pro'],
    unique: [`✨ ${aiLimitLabel('elite')} — program & meal plan builders`, '🤖 Full AI Assistant — auto progression, check-in analysis, AI check-in responses & calorie suggestions', 'Sales pipeline CRM', 'Revenue dashboard', 'White-label branding', 'Community module', 'Zapier integrations', 'Chat support'],
  },
  enterprise: {
    inherited: ['Everything in Elite'],
    unique: [`✨ ${aiLimitLabel('enterprise')}`, '🤖 Everything in Elite, including the Full AI Assistant', '🤖 Team-wide AI access for all your coaches', '🔌 API access', 'White-label branding & custom domain', '🏢 Team accounts for multi-coach businesses (coming soon)', 'Early access to all new features', 'Priority email & chat support'],
  },
};

const CARD_CONFIG = {
  starter:    { accentColor: 'var(--tc-muted-foreground)', checkColor: 'text-muted-foreground', btnClass: 'border-border text-sidebar-foreground hover:bg-foreground/50 bg-transparent', badge: null },
  pro:        { accentColor: 'var(--tc-primary)', checkColor: 'text-primary',  btnClass: 'bg-primary hover:bg-primary text-primary-foreground border-0', badge: { label: 'MOST POPULAR', cls: 'bg-primary/20 text-primary border border-primary/30' } },
  elite:      { accentColor: 'var(--tc-ai)', checkColor: 'text-ai', btnClass: '', badge: { label: '⭐ RECOMMENDED', cls: 'bg-gradient-to-r from-primary/20 to-ai/20 text-ai border border-ai/30' } },
  enterprise: { accentColor: 'var(--tc-warning)', checkColor: 'text-warning', btnClass: 'border-warning/50 text-warning hover:bg-warning/10 bg-transparent', badge: { label: 'ENTERPRISE', cls: 'bg-warning/10 text-warning border border-warning/30' } },
};

function PlanCard({ tierKey, billing, isCurrent, isUpgrade, noPlan, busy, onSelect }) {
  const tier = TIERS[tierKey];
  const config = CARD_CONFIG[tierKey];
  const features = TIER_FEATURES[tierKey];
  const prices = PLAN_PRICES[tierKey];
  const price = billing === 'annual' ? prices.annual : prices.monthly;
  const isElite = tierKey === 'elite';
  const label = busy ? 'Opening checkout…' : noPlan ? `Subscribe to ${tier.name} →` : isUpgrade ? `Upgrade to ${tier.name} →` : `Switch to ${tier.name}`;

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-1',
      isElite
        ? 'bg-gradient-to-b from-[var(--kc-1a1040)] to-[var(--kc-120c35)] hover:shadow-[0_0_40px_color-mix(in srgb, var(--tc-ai) 25%, transparent)] md:scale-[1.03] z-10'
        : 'bg-[var(--kc-0f1117)] hover:shadow-[0_8px_32px_color-mix(in srgb, black 50%, transparent)]',
    )}>
      {/* Top accent border */}
      {isElite ? (
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 12px color-mix(in srgb, var(--tc-ai) 60%, transparent)' }} />
      ) : (
        <div className="h-[3px] w-full" style={{ background: config.accentColor }} />
      )}

      {/* Badge row */}
      <div className="flex justify-center pt-3 min-h-[32px]">
        {isCurrent ? (
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-success/10 text-success border border-success/30">
            ✓ Your Current Plan
          </span>
        ) : config.badge ? (
          <span className={cn('text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full', config.badge.cls)}>
            {config.badge.label}
          </span>
        ) : null}
      </div>

      {/* Price section */}
      <div className="p-6 pb-4">
        <p className="font-bold text-sm mb-3" style={{ color: config.accentColor }}>{tier.name}</p>
        <p className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--kc-w-5)] text-muted-foreground border border-white/10 mb-4">
          {clientLimitLabel(tierKey)}
        </p>
        <div className="flex items-end gap-2 mb-2">
          {billing === 'annual' && (
            <span className="text-xl text-muted-foreground line-through mb-1">${prices.monthly}</span>
          )}
          <span className="text-5xl font-bold text-white leading-none">${price}</span>
          <span className="text-muted-foreground text-sm mb-1">/mo</span>
        </div>
        {billing === 'annual' ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block text-[11px] font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
              Save ${prices.annualSave}/year
            </span>
            <span className="text-[11px] text-muted-foreground">${prices.yearly.toLocaleString('en-US')} billed yearly</span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">or ${prices.annual}/mo billed annually</p>
        )}
      </div>

      <div className="mx-6 border-t border-white/10" />

      {/* Features */}
      <div className="p-6 flex-1 space-y-2.5">
        {features.inherited.length > 0 && (
          <>
            {features.inherited.map(f => (
              <div key={f} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[12px] text-muted-foreground">{f}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 pb-0.5">
              <div className="flex-1 h-px bg-[var(--kc-w-5)]" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Also includes</span>
              <div className="flex-1 h-px bg-[var(--kc-w-5)]" />
            </div>
          </>
        )}
        {features.unique.map(f => (
          <div key={f} className="flex items-start gap-2">
            <Check className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', config.checkColor)} />
            <span className="text-[12px] text-sidebar-foreground font-medium leading-snug">{f}</span>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <div className="p-6 pt-0 space-y-2">
        {isCurrent ? (
          <div className="w-full text-center py-2 text-sm font-semibold text-success border border-success/30 rounded-xl bg-success/5">
            ✓ Your Current Plan
          </div>
        ) : isElite ? (
          <button
            onClick={() => onSelect(tierKey)}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 20px color-mix(in srgb, var(--tc-ai) 40%, transparent)' }}
          >
            {label}
          </button>
        ) : (
          <button
            onClick={() => onSelect(tierKey)}
            className={cn('w-full py-2.5 rounded-xl text-sm font-semibold border transition-all', config.btnClass)}
          >
            {label}
          </button>
        )}
        {tierKey === 'enterprise' && (
          <p className="text-center text-[11px] text-muted-foreground">
            <a href="mailto:support@koachai.net" className="hover:text-warning transition-colors">Talk to Sales →</a>
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

  const orderedMobile = ['elite', 'pro', 'starter', 'enterprise'];

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center bg-[var(--kc-w-5)] rounded-full p-1 border border-white/10">
          {['monthly', 'annual'].map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-200 capitalize',
                billing === b ? 'bg-gradient-to-r from-primary to-ai text-white shadow-lg' : 'text-muted-foreground hover:text-white'
              )}
            >
              {b === 'annual' ? 'yearly' : b}
              {b === 'annual' && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', billing === 'annual' ? 'bg-[var(--kc-w-20)] text-white' : 'bg-success/20 text-success')}>
                  -20%
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Billed via Stripe · Cancel anytime · No setup fees</p>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 items-start">
        {TIER_ORDER.map(tierKey => (
          <PlanCard key={tierKey} tierKey={tierKey} billing={billing}
            isCurrent={hasPlan && userTier.key === tierKey}
            isUpgrade={TIER_ORDER.indexOf(tierKey) > currentTierIndex}
            noPlan={!hasPlan} busy={busyTier === tierKey}
            onSelect={handleSelect} />
        ))}
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-col gap-4">
        {orderedMobile.map(tierKey => (
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