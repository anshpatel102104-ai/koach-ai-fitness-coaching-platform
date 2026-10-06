import React from 'react';
import { Bar } from '@/components/portal/PortalUI';

/** Current program: title, week x of y, a thin progress bar and session counts. */
export default function WorkoutProgramHeader({ program, client, sessions = [] }) {
  if (!program) return null;

  const totalWeeks = program.duration_weeks || 12;
  const start = client?.start_date ? new Date(client.start_date) : new Date();
  const weeksPassed = Math.min(Math.max(1, Math.ceil((new Date() - start) / (7 * 24 * 60 * 60 * 1000))), totalWeeks);
  const pct = Math.round((weeksPassed / totalWeeks) * 100);

  // Count actual workout days in the program (excluding rest days)
  const allWorkouts = program.workouts || [];
  const totalWorkouts = allWorkouts.filter(w => !w.day_name?.toLowerCase().includes('rest')).length;

  // Completed = actual workout sessions logged
  const completed = sessions.length;

  // Remaining = total workouts - completed, never below 0
  const remaining = Math.max(0, totalWorkouts - completed);

  return (
    <section className="panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl text-foreground truncate">{program.title}</h2>
        <p className="num text-lg text-foreground flex-shrink-0">Week {weeksPassed}<span className="text-muted-foreground"> of {totalWeeks}</span></p>
      </div>
      <Bar pct={pct} className="mt-3" />
      <p className="mt-2 text-[13px] text-muted-foreground">
        {completed} workout{completed !== 1 ? 's' : ''} logged, {remaining} left this cycle
      </p>
    </section>
  );
}
