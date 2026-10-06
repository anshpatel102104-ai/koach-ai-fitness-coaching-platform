import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ring } from '@/components/portal/PortalUI';

const GOALS = [
  { key: 'workout', label: 'Workout' },
  { key: 'meals',   label: 'Meals' },
  { key: 'water',   label: 'Water' },
  { key: 'steps',   label: 'Steps' },
];

export default function DailyGoalRings({ log, completed, total, pct }) {
  const doneMap = {
    workout: log.workout_done,
    meals:   (log.meals_logged || 0) >= 3,
    water:   (log.water_glasses || 0) >= 6,
    steps:   (log.steps || 0) >= 8000,
  };

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-5">
        <Ring pct={pct} size={80} stroke={9}>
          <span className="num text-xl text-foreground">{pct}%</span>
        </Ring>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {GOALS.map(g => {
            const done = doneMap[g.key];
            return (
              <div key={g.key} className="flex items-center gap-2">
                <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full', done ? 'bg-success text-white' : 'border-[1.5px] border-input')}>
                  {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="text-sm text-foreground">{g.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">Goals done</p>
        <span className="text-sm font-semibold tabular-nums text-foreground">{completed}/{total}</span>
      </div>
    </section>
  );
}
