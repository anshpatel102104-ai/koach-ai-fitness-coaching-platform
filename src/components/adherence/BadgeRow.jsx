import React from 'react';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Earned badges as quiet chips. Tier and description live in the tooltip. */
export default function BadgeRow({ earnedKeys = [], max = 5, onAdd }) {
  const visible = earnedKeys.slice(0, max);
  const overflow = earnedKeys.length - max;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map(key => {
          const cfg = BADGE_CONFIG[key];
          if (!cfg) return null;
          const tier = TIER_STYLES[cfg.tier] || TIER_STYLES.bronze;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <span className="inline-flex h-7 cursor-default items-center rounded-md bg-secondary px-2.5 text-[13px] font-medium text-foreground">
                  {cfg.label}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-medium">{cfg.desc}</p>
                <p className="mt-0.5 text-[11px] opacity-70">{tier.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <span className="px-1 text-[13px] text-muted-foreground">+{overflow} more</span>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            aria-label="Award a badge"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-input text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            +
          </button>
        )}
        {earnedKeys.length === 0 && (
          <span className="text-[13px] text-muted-foreground">None yet</span>
        )}
      </div>
    </TooltipProvider>
  );
}
