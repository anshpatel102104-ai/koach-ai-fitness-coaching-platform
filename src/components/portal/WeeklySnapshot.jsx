import React, { useState, useEffect } from 'react';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { portalDb } from '@/api/supabaseClient';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stat, InkPanel } from '@/components/kit';

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
    <section className="panel p-4">
      <h2 className="text-xl text-foreground">This week</h2>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const status = getDayStatus(day);
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={cn('flex h-8 w-full items-center justify-center rounded-md',
                status === 'done' ? 'bg-success text-white' : status === 'missed' ? 'hatch-missed' : 'bg-secondary',
                isToday && status !== 'done' && 'ring-2 ring-inset ring-brand')}>
                {status === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className={cn('text-[12px]', isToday ? 'font-bold text-foreground' : 'text-muted-foreground')}>{DAY_LABELS[i]}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <Stat size="sm" label="On plan" value={`${adherence}%`} />
        {weightChange !== null
          ? <Stat size="sm" label="Weight" value={`${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange}`} unit="lb" tone={parseFloat(weightChange) < 0 ? 'success' : undefined} />
          : <span />}
        <Stat size="sm" label="Workouts" value={`${doneCount}/7`} />
      </div>

      {(insight || loadingInsight) && (
        <InkPanel className="mt-3 p-4 sm:p-4">
          <p className="text-[13px] text-ai-foreground/70">From your week</p>
          <p className="mt-1 text-sm">{loadingInsight ? 'Reading your week' : insight}</p>
        </InkPanel>
      )}
    </section>
  );
}
