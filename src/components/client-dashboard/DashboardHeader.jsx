import React from 'react';
import { Settings, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PILLS = [
  { key: 'workout', label: 'Workout', done: (log) => log.workout_done },
  { key: 'meals',   label: 'Meals',   done: (log) => (log.meals_logged || 0) >= 3 },
  { key: 'water',   label: 'Water',   done: (log) => (log.water_glasses || 0) >= 6 },
  { key: 'steps',   label: 'Steps',   done: (log) => (log.steps || 0) >= 8000 },
];

/** Graphite header: name, date, streak and today's four habits. */
export default function DashboardHeader({ user, streak, log, onSettings }) {
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const initial = user?.full_name?.[0]?.toUpperCase() || '?';

  return (
    <section className="rounded-xl bg-sidebar p-5 text-white">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-semibold">{initial}</span>
          <div>
            <p className="text-[13px] text-white/60">{format(new Date(), 'EEEE, MMMM d')}</p>
            <h1 className="text-[28px] text-white">Hi, {firstName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-right">
            <span className="num block text-[24px] text-white">{streak}</span>
            <span className="block text-[12px] text-white/60">day streak</span>
          </span>
          <button type="button" onClick={onSettings} aria-label="Settings"
            className="touch-compact flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PILLS.map(({ key, label, done }) => {
          const isDone = done(log);
          return (
            <div key={key} className={cn('flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold',
              isDone ? 'bg-white text-sidebar' : 'bg-white/10 text-white/70')}>
              {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {label}
            </div>
          );
        })}
      </div>
    </section>
  );
}
