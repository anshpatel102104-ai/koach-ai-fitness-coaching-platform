import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* ── helpers ─────────────────────────────────────────────────────────────── */

export const newExercise = (section = 'main') => ({
  name: '', sets: 3, reps: '10', rest_seconds: 60, tempo: '', notes: '', video_url: '',
  set_type: 'straight', rpe: '', rir: '', superset_group: '', dropset_scheme: '',
  stretch_type: 'static', duration_seconds: 30, section,
  progression_type: 'none', progression_value: 5,
  prescription: '',
});
export const newSectionLabel = (title = 'Warmup') => ({ _type: 'section_label', title });
export const newNoteBlock = () => ({ _type: 'note', text: '' });
export const newSupersetGroup = () => ({ _type: 'superset_header', label: 'A', rest_note: 'Rest 2 min between supersets' });

const FIELD_SIZING = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('field-sizing', 'content');

const LINK_BTN = 'touch-compact py-1 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline';

const SET_TYPE_LABEL = { superset: 'Superset', dropset: 'Drop set', amrap: 'AMRAP', failure: 'To failure' };

const restLabel = (s) => {
  const n = Number(s);
  if (!n) return '';
  if (n >= 120 && n % 60 === 0) return `${n / 60} min rest`;
  if (n >= 90) return `${Math.round((n / 60) * 2) / 2} min rest`;
  return `${n}s rest`;
};

/** Rough session length: ~40s of work per set plus the prescribed rest. */
export function estimateMinutes(exercises = []) {
  const secs = exercises
    .filter(e => !e._type && e.name)
    .reduce((sum, e) => sum + (Number(e.sets) || 3) * (40 + (Number(e.rest_seconds) || 60)), 0);
  if (!secs) return 0;
  return Math.max(5, Math.round(secs / 60 / 5) * 5);
}

export const prescriptionOf = (ex) => ex.prescription || (ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : '');

/* ── Exercise tile: grey cell with name, "4 × 6" + RPE ─────────────────────── */

function ExerciseTile({ ex, dragProvided, isDragging, isSelected, flaggedFor, onClick, onRemove, onPrescriptionChange }) {
  const prescription = prescriptionOf(ex);
  const meta = [
    ex.rpe ? `RPE ${ex.rpe}` : restLabel(ex.rest_seconds !== 60 ? ex.rest_seconds : null),
    SET_TYPE_LABEL[ex.set_type],
  ].filter(Boolean).join(', ');

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      {...dragProvided.dragHandleProps}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-lg bg-secondary px-3 py-2.5 transition-shadow',
        isSelected && 'ring-2 ring-foreground',
        !isSelected && flaggedFor && 'ring-1 ring-destructive/70',
        isDragging && 'shadow-[0_10px_28px_-12px_rgb(0_0_0/0.45)] ring-1 ring-border'
      )}
    >
      <p className="pr-5 text-[15px] font-semibold leading-snug text-foreground">
        {ex.name || <span className="font-normal text-muted-foreground">Unnamed exercise</span>}
      </p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <input
          type="text"
          value={prescription}
          onClick={e => e.stopPropagation()}
          onChange={e => onPrescriptionChange(e.target.value)}
          placeholder="3 × 10"
          size={Math.max(3, prescription.length)}
          style={FIELD_SIZING ? { fieldSizing: 'content', minWidth: '3ch' } : { width: `${Math.max(4, prescription.length) + 1}ch` }}
          aria-label={`Sets and reps for ${ex.name || 'exercise'}`}
          className="-mx-1 max-w-full rounded bg-transparent px-1 text-[15px] font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground hover:bg-card/60 focus:bg-card focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {meta && <span className="text-[13px] text-muted-foreground">{meta}</span>}
      </div>
      {ex.notes && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{ex.notes}</p>}
      {flaggedFor && <p className="mt-0.5 text-[13px] font-medium text-destructive">Flagged for {flaggedFor}</p>}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="touch-compact absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-destructive focus:opacity-100 group-hover:opacity-100"
        aria-label={`Remove ${ex.name || 'exercise'}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Day column ──────────────────────────────────────────────────────────── */

export default function DayColumn({
  day, dayLabel, globalDayIdx, isActiveDayForEx, selectedExIdx, limitationCheck,
  onSelectExercise, onOpenPicker, onRemoveExercise, onRemoveDay, onDuplicateDay, onUpdateDay,
  className,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const exercises = day.exercises || [];
  const exCount = exercises.filter(e => !e._type && e.name).length;
  const mins = estimateMinutes(exercises);
  const sessionLine = [
    `${exCount} ${exCount === 1 ? 'exercise' : 'exercises'}`,
    day.session_time ? day.session_time : mins ? `about ${mins} min` : null,
  ].filter(Boolean).join(', ');

  const setItem = (origIdx, patch) => {
    const updated = [...exercises];
    updated[origIdx] = { ...updated[origIdx], ...patch };
    onUpdateDay({ exercises: updated });
  };
  const dropItem = (origIdx) => onUpdateDay({ exercises: exercises.filter((_, idx) => idx !== origIdx) });

  const renderTile = (item, origIdx) => (
    <Draggable key={`ex-${globalDayIdx}-${origIdx}`} draggableId={`ex-${globalDayIdx}-${origIdx}`} index={origIdx}>
      {(drag, snap) => (
        <ExerciseTile
          ex={item}
          dragProvided={drag}
          isDragging={snap.isDragging}
          isSelected={isActiveDayForEx && selectedExIdx === origIdx}
          flaggedFor={limitationCheck ? limitationCheck(item.name) : null}
          onClick={() => onSelectExercise(origIdx)}
          onRemove={() => onRemoveExercise(origIdx)}
          onPrescriptionChange={val => setItem(origIdx, { prescription: val })}
        />
      )}
    </Draggable>
  );

  // Exercises, section labels, notes and superset groups, in order.
  const rows = [];
  let i = 0;
  while (i < exercises.length) {
    const item = exercises[i];
    const origIdx = i;

    if (item._type === 'section_label') {
      rows.push(
        <div key={`sl-${origIdx}`} className="group/sl flex items-center gap-2 pt-1">
          <input
            type="text"
            value={item.title || ''}
            onChange={e => setItem(origIdx, { title: e.target.value })}
            aria-label="Section label"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-muted-foreground focus:text-foreground focus:outline-none"
          />
          <button onClick={() => dropItem(origIdx)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/sl:opacity-100" aria-label="Remove label">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
      i++;
      continue;
    }

    if (item._type === 'note') {
      rows.push(
        <div key={`note-${origIdx}`} className="group/note relative rounded-lg bg-warning-soft px-3 py-2">
          <textarea
            rows={2}
            value={item.text || ''}
            onChange={e => setItem(origIdx, { text: e.target.value })}
            placeholder="Coaching note, form cue or instruction"
            className="w-full resize-none bg-transparent pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={() => dropItem(origIdx)} className="absolute right-1.5 top-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/note:opacity-100" aria-label="Remove note">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      );
      i++;
      continue;
    }

    if (item._type === 'superset_header') {
      const members = [];
      let j = i + 1;
      while (j < exercises.length && !exercises[j]._type) {
        members.push({ ex: exercises[j], origIdx: j });
        j++;
      }
      rows.push(
        <div key={`ss-${origIdx}`}>
          <div className="group/ssh mb-1.5 flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-foreground">Superset {item.label || 'A'}</span>
            <input
              type="text"
              value={item.rest_note || ''}
              onChange={e => setItem(origIdx, { rest_note: e.target.value })}
              placeholder="Rest note"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-muted-foreground focus:text-foreground focus:outline-none"
            />
            <button onClick={() => dropItem(origIdx)} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/ssh:opacity-100" aria-label="Remove superset">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2 border-l-2 border-foreground/20 pl-2.5">
            {members.map(({ ex, origIdx: oi }) => renderTile(ex, oi))}
          </div>
        </div>
      );
      i = j;
      continue;
    }

    rows.push(renderTile(item, origIdx));
    i++;
  }

  const addSuperset = () => {
    const grpLabel = String.fromCharCode(65 + exercises.filter(e => e._type === 'superset_header').length);
    onUpdateDay({ exercises: [...exercises, { ...newSupersetGroup(), label: grpLabel }, { ...newExercise('main'), superset_group: grpLabel }] });
  };

  return (
    <section className={cn('panel flex min-w-0 flex-col', className)}>
      {/* Header */}
      <div className="border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">{dayLabel}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="touch-compact -mr-1.5 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Options for ${day.day_name || 'this day'}`}>
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditingTitle(true)}>Rename day</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}>Session length and notes</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicateDay}>Duplicate day</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemoveDay} className="text-destructive focus:text-destructive">Delete day</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={day.day_name || ''}
            onChange={e => onUpdateDay({ day_name: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
            className="display w-full bg-transparent text-[22px] leading-tight text-foreground focus:outline-none"
          />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="block max-w-full text-left" title="Rename">
            <h3 className="truncate text-[22px] text-foreground">{day.day_name || 'Untitled day'}</h3>
          </button>
        )}

        <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
          <PopoverTrigger asChild>
            <button className="mt-0.5 text-left text-[13px] text-muted-foreground hover:text-foreground">{sessionLine}</button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-3 p-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-muted-foreground">Session length</span>
              <input
                type="text"
                value={day.session_time || ''}
                onChange={e => onUpdateDay({ session_time: e.target.value })}
                placeholder={mins ? `about ${mins} min` : '45 min'}
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:border-foreground focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-muted-foreground">Notes for the client</span>
              <textarea
                rows={3}
                value={day.workout_notes || ''}
                onChange={e => onUpdateDay({ workout_notes: e.target.value })}
                placeholder="Warm-up, focus for the day, cues"
                className="w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-foreground focus:outline-none"
              />
            </label>
          </PopoverContent>
        </Popover>
        {day.workout_notes && <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{day.workout_notes}</p>}
      </div>

      {/* Exercises */}
      <Droppable droppableId={`ex-${globalDayIdx}`}>
        {(prov, snap) => (
          <div
            ref={prov.innerRef}
            {...prov.droppableProps}
            className={cn('flex-1 space-y-2 p-2.5 transition-colors', snap.isDraggingOver && 'bg-accent/60')}
          >
            {exercises.length === 0 && !snap.isDraggingOver && (
              <p className="px-1.5 py-3 text-[13px] text-muted-foreground">No exercises yet. Drag one in from the library.</p>
            )}
            {rows}
            {prov.placeholder}
          </div>
        )}
      </Droppable>

      {/* Footer */}
      <div className="px-2.5 pb-2.5">
        <button
          onClick={() => onOpenPicker('main')}
          className="h-11 w-full rounded-lg border border-dashed border-input text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Add exercise
        </button>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button onClick={addSuperset} className={LINK_BTN}>Superset</button>
          <button onClick={() => onUpdateDay({ exercises: [...exercises, newNoteBlock()] })} className={LINK_BTN}>Note</button>
          <button onClick={() => onUpdateDay({ exercises: [...exercises, newSectionLabel('Section')] })} className={LINK_BTN}>Label</button>
        </div>
      </div>
    </section>
  );
}
