import React, { useState, useEffect } from 'react';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { portalDb } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeeklySnapshot({ recentLogs, checkIns, program }) {
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  const getDayStatus = (day) => {
    const log = recentLogs.find(l => l.date === format(day, 'yyyy-MM-dd'));
    if (!log) return 'upcoming';
    if (log.workout_done) return 'done';
    return 'missed';
  };

  const doneCount = days.filter(d => getDayStatus(d) === 'done').length;
  const adherence = Math.round((doneCount / 7) * 100);

  // Weight change this week
  const weekCheckIns = checkIns.filter(ci => {
    const d = parseISO(ci.date);
    return d >= subDays(today, 7) && ci.weight;
  });
  const weightChange = weekCheckIns.length >= 2
    ? ((weekCheckIns[weekCheckIns.length - 1].weight) - weekCheckIns[0].weight).toFixed(1)
    : null;

  useEffect(() => {
    if (!insight && doneCount > 0) {
      setLoadingInsight(true);
      portalDb.functions.invoke('aiNutritionInsights', {
        action: 'weeklyInsight', doneCount, adherence,
      }).then(res => { setInsight(res.data?.text || ''); setLoadingInsight(false); }).catch(() => setLoadingInsight(false));
    }
  }, [doneCount]);

  return (
    <div className="mx-5 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-white font-bold text-sm mb-4">This Week</p>

      {/* Day dots */}
      <div className="flex gap-2 mb-4">
        {days.map((day, i) => {
          const status = getDayStatus(day);
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={cn('w-full aspect-square rounded-xl flex items-center justify-center',
                status === 'done' ? '' : status === 'missed' ? '' : '')}
                style={{
                  background: status === 'done' ? 'rgb(var(--success) / 0.2)' : status === 'missed' ? 'rgb(var(--destructive) / 0.15)' : 'rgba(255,255,255,0.05)',
                  border: isToday ? '1.5px solid rgb(var(--primary) / 0.6)' : '1px solid transparent',
                }}>
                {status === 'done' && <span className="text-success text-[10px]">✓</span>}
                {status === 'missed' && <span className="text-destructive text-[10px]">✕</span>}
                {status === 'upcoming' && <span className="text-white/20 text-[10px]">·</span>}
              </div>
              <p className={cn('text-[9px] font-semibold', isToday ? 'text-primary' : 'text-white/20')}>
                {DAY_LABELS[i]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
          <p className="text-white font-bold text-base">{adherence}%</p>
          <p className="text-white/30 text-[10px]">Adherence</p>
        </div>
        {weightChange !== null && (
          <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
            <p className={cn('font-bold text-base', parseFloat(weightChange) < 0 ? 'text-success' : 'text-white')}>
              {parseFloat(weightChange) > 0 ? '+' : ''}{weightChange} lbs
            </p>
            <p className="text-white/30 text-[10px]">Weight change</p>
          </div>
        )}
        <div className="flex-1 bg-white/5 rounded-xl p-2.5 text-center">
          <p className="text-white font-bold text-base">{doneCount}/7</p>
          <p className="text-white/30 text-[10px]">Workouts</p>
        </div>
      </div>

      {/* AI insight */}
      {(insight || loadingInsight) && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
          <p className="text-primary text-xs leading-relaxed">
            {loadingInsight ? '...' : insight}
          </p>
        </div>
      )}
    </div>
  );
}