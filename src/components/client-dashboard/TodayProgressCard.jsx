import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ring } from '@/components/portal/PortalUI';

const GOAL_ROWS = [
  { key: 'workout', label: 'Workout', getStatus: (log) => ({ done: log.workout_done, text: log.workout_done ? 'Done' : 'Not logged' }) },
  { key: 'meals', label: 'Meals logged', getStatus: (log) => ({ done: (log.meals_logged || 0) >= 3, text: `${log.meals_logged || 0} of 3` }) },
  { key: 'water', label: 'Water', getStatus: (log) => ({ done: (log.water_glasses || 0) >= 6, text: `${log.water_glasses || 0} of 8 glasses` }) },
  { key: 'steps', label: 'Steps', getStatus: (log) => ({ done: (log.steps || 0) >= 8000, text: `${(log.steps || 0).toLocaleString()} of 10,000` }) },
];

export default function TodayProgressCard({ log, completed, total, pct }) {
  const allDone = completed === total;

  return (
    <section className="panel p-5">
      <div className="flex items-center gap-4">
        <Ring pct={pct} size={76} stroke={9} barClass={allDone ? 'text-success' : 'text-foreground'} />
        <div>
          <p className="num text-[32px] text-foreground">{completed} of {total}</p>
          <p className="text-sm text-muted-foreground">{allDone ? 'Everything done today.' : `${total - completed} left for today.`}</p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border border-t border-border">
        {GOAL_ROWS.map(({ key, label, getStatus }) => {
          const { done, text } = getStatus(log);
          return (
            <li key={key} className="flex items-center gap-3 py-2.5">
              <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full', done ? 'bg-success text-white' : 'border-[1.5px] border-input')}>
                {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="flex-1 text-[15px] font-semibold text-foreground">{label}</span>
              <span className="text-[13px] tabular-nums text-muted-foreground">{text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
