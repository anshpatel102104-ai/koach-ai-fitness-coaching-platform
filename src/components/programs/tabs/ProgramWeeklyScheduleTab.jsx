import React, { useState, useMemo } from 'react';
import { Segmented } from '@/components/kit';
import { estimateMinutes, prescriptionOf } from '../builder/DayColumn';

function ReadOnlyTile({ ex }) {
  const meta = ex.rpe ? `RPE ${ex.rpe}` : ex.rest_seconds ? `${ex.rest_seconds}s rest` : '';
  return (
    <div className="rounded-lg bg-secondary px-3 py-2.5">
      <p className="text-[15px] font-semibold leading-snug text-foreground">{ex.name}</p>
      <p className="mt-0.5">
        <span className="text-[15px] font-bold tabular-nums text-foreground">{prescriptionOf(ex) || `${ex.sets || 3} × ${ex.reps || '8-10'}`}</span>
        {meta && <span className="ml-2 text-[13px] text-muted-foreground">{meta}</span>}
      </p>
      {ex.tempo && <p className="text-[13px] text-muted-foreground">Tempo {ex.tempo}</p>}
      {ex.notes && <p className="mt-0.5 text-[13px] text-muted-foreground">{ex.notes}</p>}
    </div>
  );
}

export default function ProgramWeeklyScheduleTab({ program }) {
  const dpw = Number(program.days_per_week) || 0;
  const workouts = program.workouts || [];
  const weekCount = program.duration_weeks || 1;

  // Workouts are stored either as one template week or expanded per week.
  const weeks = useMemo(() => {
    if (!dpw || workouts.length <= dpw) return Array.from({ length: weekCount }, () => workouts);
    const out = [];
    for (let i = 0; i < workouts.length; i += dpw) out.push(workouts.slice(i, i + dpw));
    return out;
  }, [workouts, dpw, weekCount]);

  const sameEveryWeek = useMemo(() => {
    const sig = (w) => JSON.stringify(w.map(d => (d.exercises || []).map(e => [e.name, e.sets, e.reps, e.prescription])));
    return weeks.every(w => sig(w) === sig(weeks[0]));
  }, [weeks]);

  const [week, setWeek] = useState(0);
  const days = weeks[Math.min(week, weeks.length - 1)] || [];
  const restDaysPerWeek = Math.max(0, 7 - (dpw || days.length));

  if (workouts.length === 0) {
    return <p className="text-sm text-muted-foreground">No training days in this program yet. Open it in the builder to add some.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {sameEveryWeek ? (
          <p className="text-sm text-muted-foreground">
            The same week, repeated for all <span className="font-semibold text-foreground">{weekCount}</span> weeks.
            {restDaysPerWeek > 0 && ` ${restDaysPerWeek} rest day${restDaysPerWeek !== 1 ? 's' : ''} a week.`}
          </p>
        ) : (
          <Segmented
            options={weeks.map((_, i) => ({ value: i, label: `Week ${i + 1}` }))}
            value={Math.min(week, weeks.length - 1)}
            onChange={setWeek}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-flow-col sm:auto-cols-[minmax(172px,1fr)] sm:overflow-x-auto sm:pb-2">
        {days.map((day, i) => {
          const exercises = (day.exercises || []).filter(e => !e._type && e.name);
          const mins = estimateMinutes(day.exercises || []);
          return (
            <section key={i} className="panel flex min-w-0 flex-col">
              <div className="border-b border-border px-4 pb-3 pt-4">
                <p className="text-[13px] text-muted-foreground">{day.weekday || `Day ${i + 1}`}</p>
                <h3 className="truncate text-[22px] text-foreground">{day.day_name || `Day ${i + 1}`}</h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}{day.session_time ? `, ${day.session_time}` : mins ? `, about ${mins} min` : ''}
                </p>
              </div>
              <div className="flex-1 space-y-2 p-2.5">
                {exercises.length === 0
                  ? <p className="px-1.5 py-2 text-[13px] text-muted-foreground">Nothing planned.</p>
                  : exercises.map((ex, k) => <ReadOnlyTile key={k} ex={ex} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
