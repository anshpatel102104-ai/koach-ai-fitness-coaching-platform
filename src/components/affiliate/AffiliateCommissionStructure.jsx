import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PLAN_PRICES } from '@/lib/planPricing';

const TIERS = [
  { tier: 'Bronze', min: 0, max: 10, rate: 20 },
  { tier: 'Silver', min: 11, max: 25, rate: 25 },
  { tier: 'Gold', min: 26, max: 50, rate: 30 },
  { tier: 'Platinum', min: 51, max: null, rate: 35 },
];

const PLANS = [
  { name: 'Starter', price: PLAN_PRICES.starter.monthly },
  { name: 'Pro', price: PLAN_PRICES.pro.monthly },
  { name: 'Elite', price: PLAN_PRICES.elite.monthly },
  { name: 'Enterprise', price: PLAN_PRICES.enterprise.monthly },
];

export default function AffiliateCommissionStructure({ profile }) {
  const [selectedPlan, setSelectedPlan] = useState(PLAN_PRICES.pro.monthly);
  const [referralCount, setReferralCount] = useState(profile.active_referrals || 5);

  const monthlyEarnings = referralCount * selectedPlan * (profile.commission_rate / 100);

  return (
    <div className="space-y-8">
      {/* Tier breakdown */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-black text-foreground mb-6">Commission Tiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t, i) => {
            const isCurrentTier = profile.active_referrals >= t.min && (t.max === null || profile.active_referrals <= t.max);
            return (
              <motion.div key={i}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  isCurrentTier
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card'
                }`}>
                <p className="font-bold text-foreground">{t.tier}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.min}-{t.max === null ? '∞' : t.max} referrals</p>
                <p className="text-2xl font-black mt-3" style={{ color: isCurrentTier ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}>
                  {t.rate}%
                </p>
                {isCurrentTier && (
                  <p className="text-xs font-bold text-primary mt-2">✓ Current Tier</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-lg font-black text-foreground mb-4">Earnings Calculator</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Plan: {PLANS.find(p => p.price === selectedPlan)?.name}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLANS.map(p => (
                <button key={p.price} onClick={() => setSelectedPlan(p.price)}
                  className={`px-3 py-2 rounded-lg font-bold text-sm border transition-all ${
                    selectedPlan === p.price
                      ? 'border-primary bg-accent text-primary'
                      : 'border-border bg-card text-foreground hover:border-primary'
                  }`}>
                  {p.name}<br/><span className="text-xs">${p.price}/mo</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              Number of Referrals
            </label>
            <div className="flex items-center gap-4">
              <input type="range" min="1" max="100" value={referralCount} onChange={(e) => setReferralCount(parseInt(e.target.value))}
                className="flex-1" />
              <span className="text-2xl font-black text-primary min-w-[60px]">{referralCount}</span>
            </div>
          </div>

          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            className="mt-6 p-4 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-ai) 100%)' }}>
            <p className="text-white/80 text-sm">Monthly Recurring Revenue</p>
            <p className="text-4xl font-black text-white mt-1">
              ${monthlyEarnings.toFixed(2)}/month
            </p>
            <p className="text-white/60 text-xs mt-2">@ {profile.commission_rate}% commission rate</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}