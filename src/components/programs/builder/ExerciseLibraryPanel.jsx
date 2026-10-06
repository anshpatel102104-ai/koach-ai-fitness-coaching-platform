import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { db } from '@/api/supabaseClient';
import { Search, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MUSCLE_OPTIONS = ['chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'];
const EQUIPMENT_OPTIONS = ['barbell','dumbbell','cable','machine','bodyweight','kettlebell','resistance_band','trx'];
const DIFFICULTY_OPTIONS = ['beginner','intermediate','advanced'];

const label = (v = '') => {
  const s = v.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={value || 'all'} onValueChange={v => onChange(v === 'all' ? '' : v)}>
      <SelectTrigger className={cn('h-8 flex-1 min-w-0 px-2.5 text-[13px]', value ? 'text-foreground' : 'text-muted-foreground')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{label(o)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function LibraryRow({ ex, flaggedFor, onAdd, provided, isDragging }) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={cn(
        'group flex items-center gap-2 border-b border-border py-3 last:border-b-0 cursor-grab active:cursor-grabbing',
        isDragging && 'rounded-lg border-b-0 bg-card px-3 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)] ring-1 ring-border'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-foreground">{ex.name}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {ex.muscle_group ? label(ex.muscle_group) : 'No muscle group'}
          {flaggedFor && <span className="text-destructive">, flagged for {flaggedFor}</span>}
        </p>
      </div>
      {onAdd && (
        <button
          onClick={e => { e.stopPropagation(); onAdd(ex); }}
          className="touch-compact flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          title="Add to the selected day"
          aria-label={`Add ${ex.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function ExerciseLibraryPanel({ onAddExercise, targetDayName, limitationCheck, className }) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercise-library'],
    queryFn: () => db.entities.ExerciseLibrary.list(),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      if (muscleFilter && ex.muscle_group !== muscleFilter) return false;
      if (equipFilter && ex.equipment !== equipFilter) return false;
      if (diffFilter && ex.difficulty !== diffFilter) return false;
      if (search && !ex.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [exercises, muscleFilter, equipFilter, diffFilter, search]);

  const activeFilters = [muscleFilter, equipFilter, diffFilter].filter(Boolean).length;
  const clearFilters = () => { setMuscleFilter(''); setEquipFilter(''); setDiffFilter(''); setSearch(''); };

  return (
    <div className={cn('panel flex h-full flex-col overflow-hidden', className)}>
      <div className="flex-shrink-0 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-[22px] text-foreground">Library</h2>
          {(activeFilters > 0 || search) && (
            <button onClick={clearFilters} className="text-[13px] font-semibold text-foreground underline underline-offset-4">
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${exercises.length.toLocaleString()} exercises`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg bg-secondary pl-9 pr-8 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex gap-1.5">
          <FilterSelect value={muscleFilter} onChange={setMuscleFilter} placeholder="Muscle" options={MUSCLE_OPTIONS} />
          <FilterSelect value={equipFilter} onChange={setEquipFilter} placeholder="Gear" options={EQUIPMENT_OPTIONS} />
          <FilterSelect value={diffFilter} onChange={setDiffFilter} placeholder="Level" options={DIFFICULTY_OPTIONS} />
        </div>

        {targetDayName && (
          <p className="mt-2 text-[13px] text-muted-foreground">
            Adding to <span className="font-semibold text-foreground">{targetDayName}</span>.
          </p>
        )}
      </div>

      <Droppable droppableId="lib-panel" isDropDisabled>
        {(prov) => (
          <div ref={prov.innerRef} {...prov.droppableProps} className="mt-2 min-h-0 flex-1 overflow-y-auto px-4 sm:px-5">
            {isLoading ? (
              <p className="py-8 text-sm text-muted-foreground">Loading the library…</p>
            ) : filtered.length === 0 ? (
              <div className="py-8">
                <p className="text-sm text-muted-foreground">Nothing matches that search.</p>
                {(search || activeFilters > 0) && (
                  <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4">Clear filters</button>
                )}
              </div>
            ) : (
              filtered.map((ex, idx) => (
                <Draggable key={ex.id} draggableId={`lib-${ex.id}`} index={idx}>
                  {(drag, snap) => (
                    <LibraryRow
                      ex={ex}
                      flaggedFor={limitationCheck ? limitationCheck(ex.name) : null}
                      onAdd={onAddExercise}
                      provided={drag}
                      isDragging={snap.isDragging}
                    />
                  )}
                </Draggable>
              ))
            )}
            {prov.placeholder}
          </div>
        )}
      </Droppable>

      <div className="flex-shrink-0 px-4 py-3 sm:px-5">
        <p className="text-[13px] text-muted-foreground">
          Drag onto a day to add it.
          {filtered.length !== exercises.length && <span> Showing {filtered.length} of {exercises.length}.</span>}
        </p>
      </div>
    </div>
  );
}
