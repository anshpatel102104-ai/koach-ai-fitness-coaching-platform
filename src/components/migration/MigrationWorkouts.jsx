import React, { useState } from 'react';
import { Dumbbell, CheckCircle2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';

const STARTER_TEMPLATES = [
  {
    title: '3-Day Full Body Strength',
    category: 'strength', difficulty: 'beginner', days_per_week: 3, duration_weeks: 8,
    workouts: [
      { day_name: 'Day A – Push', day_number: 1, exercises: [
        { name: 'Bench Press', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Overhead Press', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest_seconds: 60 },
      ]},
      { day_name: 'Day B – Pull', day_number: 2, exercises: [
        { name: 'Barbell Row', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest_seconds: 90 },
        { name: 'Bicep Curl', sets: 3, reps: '12-15', rest_seconds: 60 },
      ]},
      { day_name: 'Day C – Legs', day_number: 3, exercises: [
        { name: 'Squat', sets: 4, reps: '6-8', rest_seconds: 120 },
        { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Leg Press', sets: 3, reps: '12-15', rest_seconds: 90 },
      ]},
    ],
  },
  {
    title: '4-Day Upper/Lower Split',
    category: 'hypertrophy', difficulty: 'intermediate', days_per_week: 4, duration_weeks: 12,
    workouts: [
      { day_name: 'Upper A', day_number: 1, exercises: [
        { name: 'Bench Press', sets: 4, reps: '5', rest_seconds: 120 },
        { name: 'Barbell Row', sets: 4, reps: '5', rest_seconds: 120 },
        { name: 'Incline DB Press', sets: 3, reps: '10-12', rest_seconds: 90 },
      ]},
      { day_name: 'Lower A', day_number: 2, exercises: [
        { name: 'Squat', sets: 4, reps: '5', rest_seconds: 120 },
        { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Leg Curl', sets: 3, reps: '12', rest_seconds: 60 },
      ]},
      { day_name: 'Upper B', day_number: 3, exercises: [
        { name: 'Overhead Press', sets: 4, reps: '8', rest_seconds: 90 },
        { name: 'Cable Row', sets: 4, reps: '10', rest_seconds: 90 },
        { name: 'Lateral Raise', sets: 3, reps: '15', rest_seconds: 60 },
      ]},
      { day_name: 'Lower B', day_number: 4, exercises: [
        { name: 'Deadlift', sets: 4, reps: '5', rest_seconds: 120 },
        { name: 'Leg Press', sets: 3, reps: '12', rest_seconds: 90 },
        { name: 'Calf Raise', sets: 4, reps: '15', rest_seconds: 60 },
      ]},
    ],
  },
  {
    title: '5-Day Push/Pull/Legs',
    category: 'hypertrophy', difficulty: 'advanced', days_per_week: 5, duration_weeks: 16,
    workouts: [
      { day_name: 'Push', day_number: 1, exercises: [
        { name: 'Bench Press', sets: 4, reps: '8-10', rest_seconds: 90 },
        { name: 'Incline DB Press', sets: 3, reps: '10-12', rest_seconds: 90 },
        { name: 'Lateral Raise', sets: 4, reps: '15-20', rest_seconds: 60 },
        { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest_seconds: 60 },
      ]},
      { day_name: 'Pull', day_number: 2, exercises: [
        { name: 'Deadlift', sets: 3, reps: '5', rest_seconds: 120 },
        { name: 'Weighted Pull-ups', sets: 3, reps: '6-8', rest_seconds: 90 },
        { name: 'Cable Row', sets: 3, reps: '10-12', rest_seconds: 90 },
        { name: 'Hammer Curl', sets: 3, reps: '12', rest_seconds: 60 },
      ]},
      { day_name: 'Legs', day_number: 3, exercises: [
        { name: 'Squat', sets: 4, reps: '8-10', rest_seconds: 120 },
        { name: 'Leg Press', sets: 3, reps: '12-15', rest_seconds: 90 },
        { name: 'Bulgarian Split Squat', sets: 3, reps: '10', rest_seconds: 90 },
        { name: 'Leg Curl', sets: 3, reps: '12', rest_seconds: 60 },
      ]},
    ],
  },
];

export default function MigrationWorkouts({ onComplete, onSkip }) {
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (i) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const importSelected = async () => {
    setImporting(true);
    const toImport = [...selected].map(i => STARTER_TEMPLATES[i]);
    let count = 0;
    for (const t of toImport) {
      try { await db.entities.WorkoutProgram.create({ ...t, is_template: true }); count++; } catch {}
    }
    setImporting(false);
    setDone(true);
    toast.success(`${count} workout program${count !== 1 ? 's' : ''} imported`);
    setTimeout(() => onComplete(), 1000);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-6 gap-3">
        <CheckCircle2 className="w-10 h-10 text-success" />
        <p className="font-semibold text-foreground">{selected.size} programs imported</p>
        <button onClick={onComplete} className="px-6 h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select starter templates to import, or skip if you'll build programs manually.
      </p>

      <div className="space-y-3">
        {STARTER_TEMPLATES.map((t, i) => {
          const sel = selected.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={cn(
                'w-full text-left p-4 rounded-xl border-2 transition-all',
                sel ? 'border-foreground bg-accent' : 'border-border hover:border-input bg-card'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', sel ? 'bg-primary' : 'bg-secondary')}>
                  <Dumbbell className={cn('w-4 h-4', sel ? 'text-primary-foreground' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.days_per_week} days/week · {t.duration_weeks} weeks · {t.difficulty}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.workouts.length} workout days · {t.workouts.reduce((a, w) => a + w.exercises.length, 0)} exercises
                  </p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  sel ? 'bg-primary border-primary' : 'border-border'
                )}>
                  {sel && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onSkip} className="flex-1 h-11 rounded-lg border border-input bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
          Skip this step
        </button>
        {selected.size > 0 && (
          <button
            onClick={importSelected}
            disabled={importing}
            className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {importing
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importing...</>
              : <><Plus className="w-4 h-4" />Import {selected.size} Program{selected.size !== 1 ? 's' : ''}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}