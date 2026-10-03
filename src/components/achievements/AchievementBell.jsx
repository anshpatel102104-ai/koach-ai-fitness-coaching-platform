import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Bell } from 'lucide-react';
import { BADGE_CONFIG, TIER_STYLES } from '@/lib/badges';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

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
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--kc-w-10)]"
      >
        <Bell size={16} className={hasNew ? 'text-[var(--kc-ffd700)]' : 'text-muted-foreground'} />
        {hasNew && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-destructive border border-[var(--kc-0a0a0a)]" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--kc-161820)',
            border: '1px solid color-mix(in srgb, white 8%, transparent)',
            minWidth: 280,
            maxWidth: 320,
          }}
        >
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Recent Achievements</p>
            {hasNew && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--kc-ffd700)]/20 text-[var(--kc-ffd700)]">
                {recentBadges.length} new
              </span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {recentBadges.length === 0 ? (
              <p className="text-xs text-[var(--tc-muted-foreground)] text-center py-6">No achievements in last 24h</p>
            ) : recentBadges.map(b => {
              const cfg = BADGE_CONFIG[b.badge_key];
              const tier = cfg ? TIER_STYLES[cfg.tier] : null;
              if (!cfg || !tier) return null;
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-[var(--kc-w-5)] transition-colors">
                  <span className="text-xl leading-none">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">{b.client_name || 'Client'}</p>
                    <p className="text-[11px] truncate" style={{ color: tier.accent }}>{cfg.label}</p>
                  </div>
                  <p className="text-[9px] text-[var(--tc-muted-foreground)] flex-shrink-0">
                    {formatDistanceToNow(new Date(b.created_date || b.earned_date), { addSuffix: true })}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-white/8">
            <Link
              to="/adherence"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-primary hover:text-primary transition-colors"
            >
              View all achievements →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}