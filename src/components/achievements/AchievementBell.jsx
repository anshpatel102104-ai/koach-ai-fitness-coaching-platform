import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Bell } from 'lucide-react';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Initials, CountBadge } from '@/components/kit';

export default function AchievementBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: recentBadges = [] } = useQuery({
    queryKey: ['recent-badges'],
    queryFn: async () => {
      const all = await db.entities.ClientBadge.list('-earned_date', 20);
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return all.filter(b => new Date(b.earned_date).getTime() > cutoff || new Date(b.created_date).getTime() > cutoff);
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasNew = recentBadges.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={hasNew ? `${recentBadges.length} new milestones` : 'Milestones'}
        className="touch-compact relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell size={16} />
        {hasNew && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-card" />}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[300px] overflow-hidden rounded-xl border border-border bg-popover shadow-md">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[15px] font-semibold text-foreground">Milestones, last 24 hours</p>
            {hasNew && <CountBadge count={recentBadges.length} />}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {recentBadges.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">No new milestones today.</p>
            ) : recentBadges.map(b => {
              const cfg = BADGE_CONFIG[b.badge_key];
              const tier = cfg ? TIER_STYLES[cfg.tier] : null;
              if (!cfg || !tier) return null;
              return (
                <div key={b.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                  <Initials name={b.client_name || 'Client'} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight text-foreground">{b.client_name || 'Client'}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{cfg.label}</p>
                  </div>
                  <p className="flex-shrink-0 text-[12px] text-muted-foreground">
                    {formatDistanceToNow(new Date(b.created_date || b.earned_date), { addSuffix: true })}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border px-4 py-2.5">
            <Link to="/adherence" onClick={() => setOpen(false)} className="text-sm font-semibold text-foreground underline underline-offset-4">
              See all milestones
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
