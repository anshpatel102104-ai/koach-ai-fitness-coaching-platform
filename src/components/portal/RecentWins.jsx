import React from 'react';
import { format, parseISO } from 'date-fns';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';

export default function RecentWins({ badges }) {
  if (!badges?.length) return null;
  const recent = badges.slice(0, 3);

  return (
    <section className="panel px-4 pt-4 pb-1">
      <h2 className="text-xl text-foreground">Recent milestones</h2>
      <ul className="mt-1 divide-y divide-border">
        {recent.map(badge => {
          const cfg = BADGE_CONFIG[badge.badge_key];
          const tier = cfg ? TIER_STYLES[cfg.tier] : null;
          return (
            <li key={badge.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground">{cfg?.label || badge.badge_key}</p>
                <p className="text-[13px] text-muted-foreground">{badge.earned_date ? format(parseISO(badge.earned_date), 'MMM d') : ''}</p>
              </div>
              {tier && <span className="text-[13px] font-semibold text-muted-foreground">{tier.label}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
