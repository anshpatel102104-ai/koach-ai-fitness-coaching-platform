import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Trophy, Dumbbell, Footprints, Flame, Target, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateStreak, averageAdherenceScore } from '@/lib/adherence';

const BOARDS = [
  { key: 'workouts',  label: 'Workouts',  icon: Dumbbell,   unit: 'sessions' },
  { key: 'steps',     label: 'Steps',     icon: Footprints, unit: 'steps' },
  { key: 'streak',    label: 'Streak',    icon: Flame,      unit: 'days' },
  { key: 'adherence', label: 'Adherence', icon: Target,     unit: '%' },
  { key: 'weight',    label: 'Wt Lost',   icon: TrendingDown, unit: 'lbs' },
];

function avatarColor(name) {
  const colors = ['bg-accent text-primary', 'bg-ai/10 text-ai', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-destructive/10 text-destructive'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

export default function Leaderboard({ clients }) {
  const [active, setActive] = useState('workouts');

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins-leaderboard'],
    queryFn: () => db.entities.CheckIn.list('-date', 500),
  });

  const ranked = useMemo(() => {
    return [...clients]
      .map(c => {
        const cis = checkIns.filter(ci => ci.client_id === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        let score = 0;
        if (active === 'workouts') score = cis.filter(ci => (ci.compliance_training || 0) > 0).length;
        else if (active === 'streak') score = calculateStreak(cis);
        else if (active === 'adherence') score = averageAdherenceScore(cis.slice(0, 4)) || 0;
        else if (active === 'weight') {
          const withW = cis.filter(ci => ci.weight != null);
          if (withW.length >= 2) score = Math.max(0, withW[withW.length - 1].weight - withW[0].weight);
        }
        return { ...c, score: Math.round(score * 10) / 10 };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [clients, checkIns, active]);

  const board = BOARDS.find(b => b.key === active);
  const BoardIcon = board.icon;
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {BOARDS.map(b => {
          const Icon = b.icon;
          return (
            <button key={b.key} onClick={() => setActive(b.key)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                active === b.key ? 'bg-sidebar text-white border-foreground' : 'bg-card border-border text-foreground hover:border-foreground')}>
              <Icon className="w-3.5 h-3.5" /> {b.label}
            </button>
          );
        })}
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <Trophy className="w-9 h-9 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Encourage clients to log check-ins!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 3 */}
          {top3.map((client, idx) => (
            <div key={client.id} className={cn(
              'flex items-center gap-3 p-4 rounded-xl border',
              idx === 0 ? 'bg-sidebar text-white border-foreground' : 'bg-card border-border'
            )}>
              <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0',
                idx === 0 ? 'bg-[var(--kc-w-20)] text-white' : idx === 1 ? 'bg-muted text-foreground' : 'bg-warning/10 text-warning')}>
                {idx + 1}
              </span>
              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                idx === 0 ? 'bg-[var(--kc-w-10)] text-white' : avatarColor(client.name))}>
                {client.name?.[0]?.toUpperCase()}
              </div>
              <p className={cn('flex-1 text-sm font-semibold truncate', idx === 0 ? 'text-white' : 'text-foreground')}>{client.name}</p>
              <div className={cn('flex items-center gap-1.5 font-bold text-sm', idx === 0 ? 'text-white' : 'text-foreground')}>
                <BoardIcon className="w-4 h-4 opacity-70" />
                {active === 'steps' ? client.score.toLocaleString() : client.score}
                <span className={cn('text-xs font-normal', idx === 0 ? 'text-white/60' : 'text-muted-foreground')}>{board.unit}</span>
              </div>
            </div>
          ))}

          {/* Rest as table */}
          {rest.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {rest.map((client, i) => (
                <div key={client.id} className={cn('flex items-center gap-3 px-4 py-2.5', i < rest.length - 1 && 'border-b border-muted')}>
                  <span className="w-6 text-xs text-muted-foreground font-bold text-center">{i + 4}</span>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0', avatarColor(client.name))}>
                    {client.name?.[0]?.toUpperCase()}
                  </div>
                  <p className="flex-1 text-sm text-foreground truncate">{client.name}</p>
                  <span className="text-sm font-semibold text-foreground">
                    {active === 'steps' ? client.score.toLocaleString() : client.score}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{board.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}