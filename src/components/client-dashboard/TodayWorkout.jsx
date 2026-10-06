import React from 'react';
import { Check, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bar } from '@/components/portal/PortalUI';

export default function TodayWorkout({ workout, program, done, onToggle }) {
  const navigate = useNavigate();
  const exercises = workout?.exercises || [];
  const isRestDay = !workout || workout.day_name?.toLowerCase().includes('rest');
  const preview = exercises.slice(0, 3);
  const estMinutes = exercises.length > 0 ? exercises.length * 4 : null;

  const dayIndex = program?.workouts
    ? program.workouts.findIndex(w => w.day_name === workout?.day_name) + 1
    : null;
  const totalDays = program?.workouts?.length || 0;
  const progressPct = dayIndex && totalDays ? Math.round((dayIndex / totalDays) * 100) : 0;

  if (isRestDay && !program) return null;

  return (
    <section className="panel p-5">
      {program?.title && <p className="text-[13px] text-muted-foreground">{program.title}</p>}
      <div className="mt-0.5 flex items-start justify-between gap-3">
        <h2 className="text-[26px] text-foreground">{isRestDay ? 'Rest day' : (workout?.day_name || 'Today\'s workout')}</h2>
        {estMinutes && !isRestDay && <span className="mt-1 text-[13px] font-semibold text-muted-foreground">About {estMinutes} min</span>}
      </div>
      {isRestDay && <p className="mt-1 text-[15px] text-muted-foreground">Nothing scheduled. Recovery is part of the plan.</p>}

      {dayIndex > 0 && totalDays > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Day {dayIndex} of {totalDays}</span>
            <span className="font-semibold text-foreground">{progressPct}%</span>
          </div>
          <Bar pct={progressPct} />
        </div>
      )}

      {!isRestDay && preview.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {preview.map((ex, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5">
              <span className="num w-5 text-lg text-muted-foreground">{i + 1}</span>
              <span className="flex-1 text-[15px] font-semibold text-foreground">{ex.name}</span>
              {(ex.sets || ex.reps) && <span className="text-[13px] font-bold tabular-nums text-foreground">{ex.sets && `${ex.sets} × `}{ex.reps}</span>}
            </li>
          ))}
          {exercises.length > 3 && <li className="py-2.5 text-[13px] text-muted-foreground">{exercises.length - 3} more exercises</li>}
        </ul>
      )}

      {!program && !isRestDay && (
        <p className="mt-3 text-sm text-muted-foreground">No program yet. Your coach will add one.</p>
      )}

      {!isRestDay && (
        <div className="mt-4 flex gap-2">
          {done ? (
            <Button variant="outline" size="lg" className="flex-1" onClick={onToggle}>
              <Check className="text-success" strokeWidth={3} /> Logged. Tap to undo
            </Button>
          ) : (
            <Button variant="brand" size="lg" className="flex-1 font-bold" onClick={onToggle}>Start workout</Button>
          )}
          {program && (
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => navigate('/workout')} aria-label="Open workout logger">
              <Dumbbell />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
