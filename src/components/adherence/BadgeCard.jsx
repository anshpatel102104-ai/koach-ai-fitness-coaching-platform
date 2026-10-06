import React from 'react';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * One badge in the gallery. Earned badges are solid white tiles; ones nobody
 * has yet are dashed, with progress when we can measure it. Click to award.
 */
export default function BadgeCard({ badgeKey, earned = false, earnedDate, clientCount = 0, onClick, progress, progressMax }) {
  const cfg = BADGE_CONFIG[badgeKey];
  if (!cfg) return null;
  const tier = TIER_STYLES[cfg.tier] || TIER_STYLES.bronze;
  const showProgress = !earned && progress != null && progressMax != null;
  const progressPct = showProgress ? Math.min(100, Math.round((progress / progressMax) * 100)) : 0;

  return (
    <button
      onClick={onClick}
      title={`Award "${cfg.label}"`}
      className={cn(
        'flex h-full w-full flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors',
        earned
          ? 'bg-card shadow-[0_0_0_1px_rgb(var(--border))] hover:bg-accent/60'
          : 'border border-dashed border-input bg-transparent hover:border-foreground/40 hover:bg-card'
      )}
    >
      <span className={cn('text-[14px] font-semibold leading-tight', earned ? 'text-foreground' : 'text-foreground/70')}>{cfg.label}</span>
      <span className="text-[12px] leading-snug text-muted-foreground">{cfg.desc}</span>
      <span className="mt-auto flex w-full items-center justify-between gap-2 pt-1.5 text-[12px]">
        <span className="text-muted-foreground">{tier.label}</span>
        {clientCount > 0 && <span className="font-semibold text-foreground">{clientCount} earned</span>}
      </span>
      {earned && earnedDate && (
        <span className="text-[12px] text-muted-foreground">Earned {format(new Date(earnedDate), 'MMM d')}</span>
      )}
      {showProgress && (
        <span className="mt-1 flex w-full items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <span className="block h-full rounded-full bg-foreground" style={{ width: `${progressPct}%` }} />
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{progress}/{progressMax}</span>
        </span>
      )}
    </button>
  );
}
