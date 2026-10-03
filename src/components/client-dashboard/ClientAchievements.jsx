import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { BADGE_CONFIG } from '@/lib/badges';
import { format } from 'date-fns';
import { Trophy, ChevronRight } from 'lucide-react';
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
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <p className="text-base font-bold text-foreground">Achievements</p>
        </div>
        <button
          onClick={() => navigate('/adherence')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary transition-colors"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {recent.map(b => {
          const config = BADGE_CONFIG[b.badge_key] || {};
          return (
            <div key={b.id}
              className="flex flex-col items-center text-center p-3 rounded-xl border border-muted bg-background hover:border-warning hover:bg-warning/10 transition-all cursor-default">
              <div className="text-3xl mb-1.5">{config.emoji || '🏅'}</div>
              <p className="text-xs font-bold text-foreground leading-tight">{config.label || b.badge_key}</p>
              {b.created_date && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(b.created_date), 'MMM d')}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}