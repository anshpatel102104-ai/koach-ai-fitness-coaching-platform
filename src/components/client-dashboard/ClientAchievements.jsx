import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { BADGE_CONFIG } from '@/lib/badges';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function ClientAchievements({ clientId }) {
  const navigate = useNavigate();

  const { data: badges = [] } = useQuery({
    queryKey: ['client-badges', clientId],
    queryFn: () => db.entities.ClientBadge.filter({ client_id: clientId }, '-created_date', 10),
    enabled: !!clientId,
  });

  const recent = badges.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section className="panel px-5 pt-5 pb-1">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl text-foreground">Milestones</h2>
        <button type="button" onClick={() => navigate('/adherence')} className="text-sm font-semibold text-foreground underline underline-offset-4">
          See all
        </button>
      </div>
      <ul className="mt-1 divide-y divide-border">
        {recent.map(b => {
          const config = BADGE_CONFIG[b.badge_key] || {};
          return (
            <li key={b.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-[15px] font-semibold text-foreground">{config.label || b.badge_key}</span>
              {b.created_date && <span className="text-[13px] text-muted-foreground">{format(new Date(b.created_date), 'MMM d')}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
