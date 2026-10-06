import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Meter } from '@/components/business/ui';
import { getLimit } from '@/lib/subscription';
import { useUpgradeModal } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * LimitBanner: shows a soft warning at 75%+ usage, hard block at 100%.
 * The soft warning is session-dismissable (won't re-appear until page reload).
 * The hard block cannot be dismissed.
 *
 * Usage:
 *   <LimitBanner limitKey="max_clients" currentCount={clients.length} label="clients" featureKey="clients" />
 */
export default function LimitBanner({ limitKey, currentCount, label, featureKey, className }) {
  const { user, openUpgradeModal } = useUpgradeModal();
  const [dismissed, setDismissed] = useState(false);

  const limit = getLimit(user, limitKey);
  if (limit === -1 || !user) return null;

  const pct = (currentCount / limit) * 100;
  const atLimit = currentCount >= limit;
  const nearLimit = !atLimit && pct >= 75;

  if (!atLimit && !nearLimit) return null;
  if (nearLimit && dismissed) return null;

  const remaining = limit - currentCount;

  const shell = cn(
    'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-card px-4 py-2.5 text-sm shadow-[0_0_0_1px_rgb(var(--border)/0.6)]',
    className
  );
  const meter = (
    <div className="hidden sm:block w-28 flex-shrink-0">
      <Meter value={currentCount} max={limit}  />
    </div>
  );

  if (atLimit) {
    return (
      <div className={shell}>
        <p className="flex-1 min-w-[200px] text-muted-foreground">
          <span className="font-semibold text-foreground">{currentCount} of {limit} {label} used.</span> Upgrade to add more.
        </p>
        {meter}
        <Button size="sm" onClick={() => openUpgradeModal(featureKey || limitKey)} className="flex-shrink-0">
          See plans
        </Button>
      </div>
    );
  }

  // Near-limit warning (75–99%)
  return (
    <div className={shell}>
      <p className="flex-1 min-w-[200px] text-muted-foreground">
        <span className="font-semibold text-foreground">
          {remaining === 1 ? `1 ${label.replace(/s$/, '')} spot left` : `${remaining} ${label} spots left`}
        </span>{' '}
        on your plan, {currentCount} of {limit} used.
      </p>
      {meter}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => openUpgradeModal(featureKey || limitKey)}
          className="touch-compact text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2"
        >
          See plans
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="touch-compact p-1 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
