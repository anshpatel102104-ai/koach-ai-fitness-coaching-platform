import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Dumbbell, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';


const SECTION_COLOR = {
  warmup:   'var(--tc-warning)',
  main:     'var(--tc-primary)',
  finisher: 'var(--tc-destructive)',
  cooldown: 'var(--tc-success)',
};

function RationaleCard({ rationale }) {
  if (!rationale) return null;
  return (
    <div className="rounded-xl p-4 space-y-3 w-full" style={{ background: 'var(--tc-sidebar)', wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0 }}>
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4" style={{ color: 'var(--tc-primary)' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--tc-primary)' }}>AI Coach Rationale</span>
      </div>
      {rationale.split && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tc-muted-foreground)] mb-0.5">Split</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{rationale.split}</p>
        </div>
      )}
      {rationale.weekly_volume && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tc-muted-foreground)] mb-0.5">Weekly Volume</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{rationale.weekly_volume}</p>
        </div>
      )}
      {rationale.rep_range_rationale && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tc-muted-foreground)] mb-0.5">Rep Ranges</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{rationale.rep_range_rationale}</p>
        </div>
      )}
      {rationale.progression_approach && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--tc-muted-foreground)] mb-0.5">Progression</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{rationale.progression_approach}</p>
        </div>
      )}
    </div>
  );
}

function DayCard({ workout }) {
  const [open, setOpen] = useState(false);
  const exCount = (workout.exercises || []).filter(e => !e._type).length;
  const mainEx = (workout.exercises || []).filter(e => e.section === 'main' || !e.section).slice(0, 3);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--tc-border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
        style={{ background: 'var(--tc-card)' }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
          style={{ background: 'var(--tc-sidebar)' }}>
          {workout.day_number}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{workout.day_name}</p>
          {workout.workout_notes && (
            <p className="text-[11px] text-muted-foreground truncate">{workout.workout_notes}</p>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground flex-shrink-0">{exCount} exercises</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[var(--tc-muted-foreground)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--tc-muted-foreground)]" />}
      </button>

      {open && (
        <div className="divide-y" style={{ borderTop: '0.5px solid var(--tc-muted)' }}>
          {(workout.exercises || []).map((ex, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-card">
              <div
                className="w-1 rounded-full flex-shrink-0 mt-1"
                style={{ height: 28, background: SECTION_COLOR[ex.section] || 'var(--tc-muted-foreground)' }}
              />
              {ex.image_url ? (
                <SignedImg src={ex.image_url} alt={ex.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-muted">
                  <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{ex.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {ex.prescription || `${ex.sets} × ${ex.reps}${ex.rpe ? ` @ RPE ${ex.rpe}` : ''}`}
                </p>
                {ex.notes && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{ex.notes}</p>
                )}
              </div>
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                style={{
                  background: (SECTION_COLOR[ex.section] || 'var(--tc-muted-foreground)') + '20',
                  color: SECTION_COLOR[ex.section] || 'var(--tc-muted-foreground)',
                }}
              >
                {ex.section || 'main'}
              </span>
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4 pb-4"
      style={{ minWidth: 0, width: '100%' }}
    >
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Days / Week', value: program.days_per_week || '—' },
          { label: 'Duration', value: `${program.duration_weeks || '—'} wks` },
          { label: 'Exercises', value: totalExercises },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--tc-muted)', border: '0.5px solid var(--tc-border)' }}>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI Rationale */}
      {program.coach_rationale && <RationaleCard rationale={program.coach_rationale} />}

      {/* Edit name / description */}
      <div className="space-y-3 pt-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Program Name</p>
          <Input
            value={title}
            onChange={e => handleChange('title', e.target.value)}
            className="h-9 text-sm font-semibold"
          />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Description</p>
          <Textarea
            value={description}
            onChange={e => handleChange('description', e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
      </div>

      {/* Schedule preview */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Training Schedule</p>
        <div className="space-y-2">
          {(program.workouts || []).map((workout, idx) => (
            <DayCard key={idx} workout={workout} />
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <p className="text-xs font-semibold text-muted-foreground">Rate this output:</p>
        <button
          onClick={() => onRating('up')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', currentRating === 'up' ? 'text-primary-foreground' : 'border border-border hover:border-primary')}
          style={currentRating === 'up' ? { background: 'var(--tc-primary)' } : {}}
        >
          <ThumbsUp className="w-3.5 h-3.5" /> Good
        </button>
        <button
          onClick={() => onRating('down')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', currentRating === 'down' ? 'text-white' : 'border border-border hover:border-destructive')}
          style={currentRating === 'down' ? { background: 'var(--tc-destructive)' } : {}}
        >
          <ThumbsDown className="w-3.5 h-3.5" /> Needs work
        </button>
      </div>
    </motion.div>
  );
}