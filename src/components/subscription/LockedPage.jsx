import React from 'react';
import { PLAN_PRICES } from '@/lib/planPricing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TIERS, FEATURE_INFO } from '@/lib/subscription';
import { Lock, ArrowRight, Sparkles, Zap, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Context-aware selling points per feature
const FEATURE_HOOKS = {
  assistant: [
    { icon: Sparkles, text: 'AI drafts check-in replies in seconds' },
    { icon: TrendingUp, text: 'Suggests calorie & workout adjustments' },
    { icon: Clock, text: 'Save hours of manual coaching work' },
  ],
  sales: [
    { icon: TrendingUp, text: 'Track leads from DM to signed client' },
    { icon: Zap, text: 'Never let a warm lead go cold again' },
    { icon: Clock, text: 'Built-in call scheduler & follow-up notes' },
  ],
};

export default function LockedPage({ featureKey, onUpgrade }) {
  const info = FEATURE_INFO[featureKey] || {};
  const minTier = TIERS[info.minTier] || TIERS.pro;
  const hooks = FEATURE_HOOKS[featureKey] || [];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center ring-1 ring-border">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>

      <Badge className={cn("mb-3 text-xs border", minTier.badge)}>
        {minTier.name} Plan Required
      </Badge>

      <h2 className="text-2xl font-heading font-bold mb-2">{info.name || 'Premium Feature'}</h2>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-6">
        {info.description || 'This feature is available on higher plans.'}
      </p>

      {hooks.length > 0 && (
        <div className="flex flex-col gap-2 mb-7 w-full max-w-xs text-left">
          {hooks.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => onUpgrade?.(featureKey)} className="gap-2">
        Upgrade to {minTier.name} <ArrowRight className="w-4 h-4" />
      </Button>

      <p className="text-xs text-muted-foreground/50 mt-4">Starting at ${PLAN_PRICES[minTier.key].monthly}/month</p>
    </div>
  );
}