import React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const SET_TYPES = [
  { value: 'straight', label: 'Straight' },
  { value: 'superset', label: 'Superset' },
  { value: 'dropset', label: 'Drop set' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'failure', label: 'Failure' },
];

const SECTIONS = [
  { value: 'warmup', label: 'Warm-up' },
  { value: 'main', label: 'Main' },
  { value: 'finisher', label: 'Finisher' },
  { value: 'cooldown', label: 'Cool-down' },
];

function Field({ label, children, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[13px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function ExerciseDetailsPanel({ exercise, onChange, onClose, onViewDemo, flaggedFor, className }) {
  if (!exercise) {
    return (
      <div className={cn('panel flex h-full flex-col justify-center px-5 py-8', className)}>
        <p className="text-[15px] font-semibold text-foreground">No exercise selected</p>
        <p className="mt-1 text-sm text-muted-foreground">Click an exercise on any day to edit sets, reps, rest and notes.</p>
      </div>
    );
  }

  const u = (field, val) => onChange({ ...exercise, [field]: val });
  const timed = exercise.section === 'warmup' || exercise.section === 'cooldown';

  return (
    <div className={cn('panel flex h-full flex-col overflow-hidden', className)}>
      <div className="flex flex-shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">Exercise details</p>
          <h2 className="mt-0.5 truncate text-[22px] text-foreground">{exercise.name || 'Unnamed exercise'}</h2>
          {flaggedFor && (
            <p className="mt-1 text-[13px] font-medium text-destructive">Loads the {flaggedFor}. Check it against the client's limitation.</p>
          )}
          {onViewDemo && (
            <button onClick={onViewDemo} className="mt-1.5 text-[13px] font-semibold text-foreground underline underline-offset-4">
              View demo
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="touch-compact flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        <Field label="Name">
          <Input value={exercise.name || ''} onChange={e => u('name', e.target.value)} placeholder="Exercise name" className="h-9" />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Sets">
            <Input type="number" min="1" value={exercise.sets || 3} onChange={e => u('sets', Number(e.target.value))} className="h-9 text-center tabular-nums" />
          </Field>
          <Field label={timed ? 'Seconds' : 'Reps'}>
            {timed ? (
              <Input type="number" value={exercise.duration_seconds ?? 30} onChange={e => u('duration_seconds', Number(e.target.value))} className="h-9 text-center tabular-nums" />
            ) : (
              <Input value={exercise.reps || '10'} placeholder="10" onChange={e => u('reps', e.target.value)} className="h-9 text-center tabular-nums" />
            )}
          </Field>
          <Field label="Rest (s)">
            <Input type="number" value={exercise.rest_seconds || 60} onChange={e => u('rest_seconds', Number(e.target.value))} className="h-9 text-center tabular-nums" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Tempo">
            <Input className="h-9 font-mono" placeholder="3-1-2-0" value={exercise.tempo || ''} onChange={e => u('tempo', e.target.value)} />
          </Field>
          <Field label="RPE">
            <Input type="number" min="1" max="10" className="h-9 text-center tabular-nums" placeholder="8" value={exercise.rpe || ''} onChange={e => u('rpe', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Set type">
            <Select value={exercise.set_type || 'straight'} onValueChange={v => u('set_type', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{SET_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={exercise.section || 'main'} onValueChange={v => u('section', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{SECTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {exercise.set_type === 'superset' && (
          <Field label="Superset group (A, B, C)">
            <Input className="h-9 font-mono text-center" placeholder="A" value={exercise.superset_group || ''} onChange={e => u('superset_group', e.target.value)} />
          </Field>
        )}

        {exercise.set_type === 'dropset' && (
          <Field label="Drop set details">
            <Input className="h-9" placeholder="3 drops, 20% each" value={exercise.dropset_scheme || ''} onChange={e => u('dropset_scheme', e.target.value)} />
          </Field>
        )}

        <div className="grid grid-cols-[1fr_88px] gap-2">
          <Field label="Progression each week">
            <Select value={exercise.progression_type || 'none'} onValueChange={v => u('progression_type', v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="weight">Add weight (lb/kg)</SelectItem>
                <SelectItem value="reps">Add reps</SelectItem>
                <SelectItem value="sets">Add a set</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {exercise.progression_type && exercise.progression_type !== 'none' && (
            <Field label="By">
              <Input type="number" step="0.5" min="0.5" className="h-9 text-center tabular-nums"
                value={exercise.progression_value || 5}
                onChange={e => u('progression_value', Number(e.target.value))} />
            </Field>
          )}
        </div>

        <Field label="Video link">
          <Input className="h-9" placeholder="https://youtube.com/…" value={exercise.video_url || ''} onChange={e => u('video_url', e.target.value)} />
        </Field>

        <Field label="Notes for the client">
          <textarea
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            placeholder="Form cues, swaps, what to feel"
            value={exercise.notes || ''}
            onChange={e => u('notes', e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
