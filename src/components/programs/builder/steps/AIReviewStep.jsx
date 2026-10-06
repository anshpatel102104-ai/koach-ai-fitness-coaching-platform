import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InkPanel, Stat } from '@/components/kit';

const SECTION_LABEL = { warmup: 'Warm-up', main: 'Main', finisher: 'Finisher', cooldown: 'Cool-down' };

function RationaleCard({ rationale }) {
  if (!rationale) return null;
  const parts = [
    ['Split', rationale.split],
    ['Weekly volume', rationale.weekly_volume],
    ['Rep ranges', rationale.rep_range_rationale],
    ['Progression', rationale.progression_approach],
  ].filter(([, v]) => v);
  if (parts.length === 0) return null;
  return (
    <InkPanel title="Why it's built this way" className="min-w-0 break-words">
      <div className="space-y-3">
        {parts.map(([label, text]) => (
          <div key={label}>
            <p className="text-[13px] font-semibold text-ai-foreground">{label}</p>
            <p className="whitespace-pre-wrap text-sm text-ai-foreground/80">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ai-foreground/60">Drafted by AI from your answers. Edit anything in the builder after saving.</p>
    </InkPanel>
  );
}

function DayCard({ workout }) {
  const [open, setOpen] = useState(false);
  const exercises = (workout.exercises || []).filter(e => !e._type);
  const exCount = exercises.length;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
        aria-expanded={open}
      >
        <span className="num w-6 flex-shrink-0 text-[17px] text-muted-foreground">{workout.day_number}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">{workout.day_name}</span>
          {workout.workout_notes && <span className="block truncate text-[13px] text-muted-foreground">{workout.workout_notes}</span>}
        </span>
        <span className="flex-shrink-0 text-[13px] text-muted-foreground">{exCount} exercises</span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-2 px-4 pb-4 sm:pl-[52px]">
          {exercises.map((ex, i) => (
            <div key={i} className="rounded-lg bg-secondary px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[15px] font-semibold text-foreground">{ex.name}</p>
                {ex.section && ex.section !== 'main' && (
                  <span className="flex-shrink-0 text-[13px] text-muted-foreground">{SECTION_LABEL[ex.section] || ex.section}</span>
                )}
              </div>
              <p className="text-[15px] font-bold tabular-nums text-foreground">
                {ex.prescription || `${ex.sets} × ${ex.reps}`}
                {!ex.prescription && ex.rpe && <span className="ml-2 text-[13px] font-normal text-muted-foreground">RPE {ex.rpe}</span>}
              </p>
              {ex.notes && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{ex.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIReviewStep({
  program,
  onProgramChange,
  onRating,
  currentRating,
}) {
  const [title, setTitle] = useState(program.title || '');
  const [description, setDescription] = useState(program.description || '');

  const totalExercises = (program.workouts || []).reduce((s, w) => s + (w.exercises || []).length, 0);

  const handleChange = (field, value) => {
    if (field === 'title') setTitle(value);
    if (field === 'description') setDescription(value);
    onProgramChange?.({ ...program, title: field === 'title' ? value : title, description: field === 'description' ? value : description });
  };

  return (
    <div className="min-w-0 space-y-6 pb-4">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Days a week" value={program.days_per_week || '—'} size="sm" />
        <Stat label="Length" value={program.duration_weeks || '—'} unit="weeks" size="sm" />
        <Stat label="Exercises" value={totalExercises} size="sm" />
      </div>

      {program.coach_rationale && <RationaleCard rationale={program.coach_rationale} />}

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted-foreground">Program name</span>
          <Input value={title} onChange={e => handleChange('title', e.target.value)} className="font-semibold" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-muted-foreground">Description</span>
          <Textarea value={description} onChange={e => handleChange('description', e.target.value)} rows={2} className="text-sm" />
        </label>
      </div>

      <div>
        <p className="mb-2 text-[13px] text-muted-foreground">Training days</p>
        <div className="overflow-hidden rounded-xl border border-border">
          {(program.workouts || []).map((workout, idx) => (
            <DayCard key={idx} workout={workout} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-[13px] text-muted-foreground">How was this draft?</p>
        {[
          { v: 'up', label: 'Good' },
          { v: 'down', label: 'Needs work' },
        ].map(o => (
          <button
            key={o.v}
            onClick={() => onRating(o.v)}
            aria-pressed={currentRating === o.v}
            className={cn(
              'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
              currentRating === o.v ? 'bg-primary text-primary-foreground' : 'border border-input bg-card text-foreground hover:bg-accent'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
