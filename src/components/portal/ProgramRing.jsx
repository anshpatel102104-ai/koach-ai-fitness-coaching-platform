import React from 'react';
import { Ring, Bar } from '@/components/portal/PortalUI';

/** Program progress: ink ring with % done, title, week x of y. */
export default function ProgramRing({ program, startDate }) {
  if (!program) return null;

  const totalWeeks = program.duration_weeks || 12;
  const start = startDate ? new Date(startDate) : new Date();
  const weeksPassed = Math.min(Math.max(0, Math.floor((new Date() - start) / (7 * 24 * 60 * 60 * 1000))), totalWeeks);
  const pct = Math.round((weeksPassed / totalWeeks) * 100);

  return (
    <section className="panel flex items-center gap-4 p-4">
      <Ring pct={pct} size={72} stroke={8}>
        <span className="num text-lg text-foreground">{pct}%</span>
      </Ring>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{program.title}</p>
        <p className="text-[13px] text-muted-foreground">Week {weeksPassed} of {totalWeeks}</p>
        <Bar pct={pct} className="mt-2" />
      </div>
    </section>
  );
}
