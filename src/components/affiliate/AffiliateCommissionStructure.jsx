import React, { useState } from 'react';
import { Panel, PanelHeader, InkPanel, Segmented } from '@/components/kit';
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

  const planName = PLANS.find(p => p.price === selectedPlan)?.name;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <Panel>
        <PanelHeader title="Commission tiers" subtitle="Based on how many coaches are paying through your link." />
        <ul className="divide-y divide-border px-5 sm:px-6 pb-2">
          {TIERS.map((t) => {
            const isCurrentTier = profile.active_referrals >= t.min && (t.max === null || profile.active_referrals <= t.max);
            return (
              <li key={t.tier} className="flex items-center justify-between py-3">
                <div>
                  <p className={isCurrentTier ? 'text-[15px] font-semibold text-foreground' : 'text-[15px] text-foreground/80'}>
                    {t.tier}
                    {isCurrentTier && <span className="text-[13px] font-medium text-muted-foreground ml-2">You are here</span>}
                  </p>
                  <p className="text-[13px] text-muted-foreground">{t.max === null ? `${t.min}+ referrals` : `${t.min} to ${t.max} referrals`}</p>
                </div>
                <span className={isCurrentTier ? 'num text-[26px] text-foreground' : 'num text-[26px] text-muted-foreground'}>{t.rate}%</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="What you could earn" subtitle="Move the numbers to see a monthly figure." />
        <div className="px-5 sm:px-6 pb-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-foreground mb-1.5">Plan they're on</p>
            <Segmented size="sm" value={selectedPlan} onChange={setSelectedPlan} options={PLANS.map(p => ({ value: p.price, label: `${p.name} $${p.price}` }))} />
          </div>
          <div>
            <label htmlFor="ac-count" className="text-sm font-medium text-foreground">Coaches referred</label>
            <div className="flex items-center gap-4 mt-1.5">
              <input id="ac-count" type="range" min="1" max="100" value={referralCount} onChange={(e) => setReferralCount(parseInt(e.target.value))}
                className="flex-1 accent-[rgb(var(--primary))]" />
              <span className="num text-[26px] min-w-[48px] text-right">{referralCount}</span>
            </div>
          </div>
          <InkPanel>
            <p className="text-sm text-ai-foreground/70">{referralCount} coaches on {planName} at {profile.commission_rate}%</p>
            <p className="num text-[40px] leading-none mt-2 text-ai-foreground">${monthlyEarnings.toFixed(2)}<span className="text-xl"> a month</span></p>
          </InkPanel>
        </div>
      </Panel>
    </div>
  );
}
