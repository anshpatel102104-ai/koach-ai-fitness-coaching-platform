import React from 'react';
import { PLAN_PRICES } from '@/lib/planPricing';
import { Button } from '@/components/ui/button';
import { TIERS, FEATURE_INFO } from '@/lib/subscription';
import { Lock, Check } from 'lucide-react';
import { Page, Panel } from '@/components/kit';

// Context-aware selling points per feature
const FEATURE_HOOKS = {
  assistant: [
    { text: 'Drafts check-in replies for you to edit' },
    { text: 'Suggests calorie and workout changes' },
    { text: 'Takes the busywork out of weekly reviews' },
  ],
  sales: [
    { text: 'Track leads from first message to signed client' },
    { text: 'See who needs a follow-up' },
    { text: 'Call scheduler and follow-up notes' },
  ],
};

export default function LockedPage({ featureKey, onUpgrade }) {
  const info = FEATURE_INFO[featureKey] || {};
  const minTier = TIERS[info.minTier] || TIERS.pro;
  const hooks = FEATURE_HOOKS[featureKey] || [];

  return (
    <Page>
      <Panel className="max-w-xl px-6 py-7 sm:px-8 sm:py-8">
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> On the {minTier.name} plan
        </p>
        <h1 className="text-[32px] text-foreground mt-2">{info.name || 'Not on your plan'}</h1>
        <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">
          {info.description || 'This is available on a higher plan.'}
        </p>

        {hooks.length > 0 && (
          <ul className="mt-5 space-y-2">
            {hooks.map(({ text }) => (
              <li key={text} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={() => onUpgrade?.(featureKey)}>Upgrade to {minTier.name}</Button>
          <span className="text-[13px] text-muted-foreground">From ${PLAN_PRICES[minTier.key].monthly} a month</span>
        </div>
      </Panel>
    </Page>
  );
}
