import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MESSAGES = [
  [0,  'Log something today to start a streak.'],
  [1,  'Day one. Do it again tomorrow.'],
  [3,  'Three days in. This is how habits form.'],
  [7,  'A full week without a gap.'],
  [14, 'Two weeks in a row.'],
  [30, 'Thirty days straight.'],
];

function getMessage(streak) {
  let msg = MESSAGES[0][1];
  for (const [min, m] of MESSAGES) {
    if (streak >= min) msg = m;
  }
  return msg;
}

export default function HeroStreak({ streak = 0, recentLogs = [] }) {
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const dots = Array.from({ length: 7 }, (_, i) => {
    const log = recentLogs[6 - i];
    return log && (log.workout_done || log.meals_logged >= 2 || log.water_glasses >= 4);
  });

  return (
    <section className="panel p-4">
      <p className="num text-[32px] text-foreground">{streak}<span className="ml-1.5 text-[15px] text-muted-foreground">day streak</span></p>
      <p className="text-sm text-muted-foreground">{getMessage(streak)}</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {dots.map((on, i) => {
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={cn('flex h-8 w-full items-center justify-center rounded-md',
                on ? 'bg-success text-white' : 'bg-secondary', isToday && !on && 'ring-2 ring-inset ring-brand')}>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="text-[12px] text-muted-foreground">{DAYS[i]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
