import React from 'react';
import { format, addDays } from 'date-fns';

export default function UpcomingSchedule({ program }) {
  if (!program?.workouts?.length) return null;

  const workouts = program.workouts;
  const today = new Date();
  const dayOfWeek = today.getDay();

  const upcomingDays = Array.from({ length: 3 }, (_, i) => {
    const day = addDays(today, i + 1);
    const idx = (dayOfWeek + i + 1) % workouts.length;
    return { day, workout: workouts[idx] };
  });

  return (
    <section className="panel px-4 pt-4 pb-1">
      <h2 className="text-xl text-foreground">Coming up</h2>
      <ul className="mt-1 divide-y divide-border">
        {upcomingDays.map(({ day, workout }, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <span className="w-11 flex-shrink-0 text-center">
              <span className="block text-[12px] text-muted-foreground">{format(day, 'EEE')}</span>
              <span className="num block text-[22px] text-foreground">{format(day, 'd')}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-foreground">{workout?.day_name || 'Rest day'}</span>
              {workout && <span className="block text-[13px] text-muted-foreground">{workout.exercises?.length || 0} exercises</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
