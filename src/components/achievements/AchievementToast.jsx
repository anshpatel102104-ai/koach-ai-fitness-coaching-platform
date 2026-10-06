import React from 'react';
import { Check } from 'lucide-react';
import { BADGE_CONFIG } from '@/lib/badges';

export default function AchievementToast({ badge, clientName }) {
  return (
    <div className="flex min-w-[260px] max-w-[320px] items-center gap-3 rounded-xl bg-ai px-4 py-3 text-ai-foreground shadow-md">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ai-foreground/70">Milestone reached</p>
        <p className="text-[15px] font-semibold leading-tight">{badge.label}</p>
        {clientName && (
          <p className="mt-0.5 truncate text-[13px] text-ai-foreground/70">
            {clientName}{badge.desc ? `, ${badge.desc}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// Helper: fire a toast for a single badge
export function showAchievementToast(toastFn, badgeKey, clientName) {
  const cfg = BADGE_CONFIG[badgeKey];
  if (!cfg) return;
  toastFn.custom((t) => (
    <AchievementToast badge={cfg} clientName={clientName} />
  ), { duration: 4000 });
}