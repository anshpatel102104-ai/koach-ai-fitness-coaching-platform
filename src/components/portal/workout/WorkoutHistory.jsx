import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronRight, ChevronDown } from 'lucide-react';

function SessionDetail({ session }) {
  const [open, setOpen] = useState(false);
  const volume = (session.exercise_logs || []).reduce((total, ex) => {
    return total + (ex.sets_completed || []).reduce((s, set) => {
      return s + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0);
    }, 0);
  }, 0);

  return (
    <li>
      <button type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">{session.workout_day_name || 'Workout'}</p>
          <p className="text-[13px] text-muted-foreground">
            {session.completed_at ? format(parseISO(session.completed_at), 'EEE, MMM d') : ''}
            {session.duration_minutes ? `, ${session.duration_minutes} min` : ''}
          </p>
        </div>
        {volume > 0 && <span className="num text-lg text-foreground">{volume.toLocaleString()}<span className="ml-1 text-[13px] text-muted-foreground">lb</span></span>}
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="space-y-1.5 pb-3">
          {(session.exercise_logs || []).map((ex, i) => {
            const doneSets = (ex.sets_completed || []).filter(s => s.completed);
            if (!doneSets.length) return null;
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary px-3 py-2">
                <p className="flex-1 text-sm font-semibold text-foreground">{ex.exercise_name}</p>
                <p className="text-right text-[13px] text-muted-foreground tabular-nums">
                  {doneSets.map(s => `${s.weight ? `${s.weight} × ` : ''}${s.reps}`).join(', ')}
                </p>
              </div>
            );
          })}
          {session.session_note && (
            <p className="px-1 pt-1 text-sm text-muted-foreground">Your note: {session.session_note}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function WorkoutHistory({ sessions }) {
  if (!sessions?.length) {
    return (
      <section className="panel px-4 py-6">
        <p className="text-[15px] font-semibold text-foreground">No workouts logged yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Finish your first session and it shows up here with every set.</p>
      </section>
    );
  }

  return (
    <section className="panel px-4 py-1">
      <ul className="divide-y divide-border">
        {sessions.map((s, i) => <SessionDetail key={s.id || i} session={s} />)}
      </ul>
    </section>
  );
}
