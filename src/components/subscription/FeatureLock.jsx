import React from 'react';
import { Lock } from 'lucide-react';
import { hasFeature, FEATURE_INFO, TIERS } from '@/lib/subscription';
import { useUpgradeModal } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

/**
 * FeatureLock: wraps any UI section and shows a quiet lock overlay
 * when the user's tier doesn't include the feature.
 *
 * Usage:
 *   <FeatureLock feature="ai_suggestions">
 *     <MySectionComponent />
 *   </FeatureLock>
 */
export default function FeatureLock({ feature, children, className }) {
  const { user, openUpgradeModal } = useUpgradeModal();

  // While user is loading, render children normally (avoids flash)
  if (user === null) return <div className={className}>{children}</div>;

  const locked = !hasFeature(user, feature);
  if (!locked) return <div className={className}>{children}</div>;

  const info = FEATURE_INFO[feature];
  const minTierKey = info?.minTier || 'pro';
  const tierConfig = TIERS[minTierKey];

  return (
    <div className={cn('relative', className)}>
      {/* Dimmed children (no blur, no glass) */}
      <div className="pointer-events-none select-none opacity-30" aria-hidden="true">
        {children}
      </div>

      <button
        onClick={() => openUpgradeModal(feature)}
        className="absolute inset-0 z-10 flex items-center justify-center p-3"
        aria-label={`${info?.name || feature} is on ${tierConfig?.name || minTierKey}`}
      >
        <span className="flex max-w-[280px] flex-col items-center gap-1.5 rounded-lg bg-card px-4 py-3 text-center shadow-[0_0_0_1px_rgb(var(--border))]">
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> On the {tierConfig?.name || minTierKey} plan
          </span>
          <span className="text-sm font-semibold text-foreground leading-tight">{info?.name || feature}</span>
          {info?.description && <span className="text-[13px] text-muted-foreground leading-snug">{info.description}</span>}
          <span className="text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1">See plans</span>
        </span>
      </button>
    </div>
  );
}
