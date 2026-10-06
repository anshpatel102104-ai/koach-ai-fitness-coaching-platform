import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Search, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MUSCLE_OPTIONS = ['chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'];
const EQUIPMENT_OPTIONS = ['barbell','dumbbell','cable','machine','bodyweight','kettlebell','resistance_band','trx'];

const label = (v = '') => {
  const s = v.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function ExercisePickerModal({ open, onClose, onPickExercise, onAddCustom, dayName, limitationCheck }) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');

  useEffect(() => { if (!open) { setSearch(''); } }, [open]);

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercise-library'],
    queryFn: () => db.entities.ExerciseLibrary.list(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      if (muscleFilter && ex.muscle_group !== muscleFilter) return false;
      if (equipFilter && ex.equipment !== equipFilter) return false;
      if (search && !ex.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [exercises, muscleFilter, equipFilter, search]);

  const handlePick = (ex) => { onPickExercise(ex); onClose(); };
  const handleCustom = () => { onAddCustom(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:p-0 h-[85dvh] sm:h-[640px] sm:max-h-[85vh] sm:flex">
        <div className="flex-shrink-0 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle className="text-[22px] pr-8">{dayName ? `Add to ${dayName}` : 'Add an exercise'}</DialogTitle>
          <DialogDescription className="mt-1">Pick from your library, or type your own.</DialogDescription>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder={`Search ${exercises.length.toLocaleString()} exercises`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-11 w-full rounded-lg bg-secondary pl-9 pr-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <Select value={muscleFilter || 'all'} onValueChange={v => setMuscleFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className={cn('h-9 flex-1', !muscleFilter && 'text-muted-foreground')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any muscle</SelectItem>
                {MUSCLE_OPTIONS.map(m => <SelectItem key={m} value={m}>{label(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={equipFilter || 'all'} onValueChange={v => setEquipFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className={cn('h-9 flex-1', !equipFilter && 'text-muted-foreground')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any equipment</SelectItem>
                {EQUIPMENT_OPTIONS.map(e => <SelectItem key={e} value={e}>{label(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-5 sm:px-6">
          {isLoading ? (
            <p className="py-10 text-sm text-muted-foreground">Loading the library…</p>
          ) : filtered.length === 0 ? (
            <div className="py-10">
              <p className="text-sm text-muted-foreground">Nothing matches that search.</p>
              <button onClick={() => { setSearch(''); setMuscleFilter(''); setEquipFilter(''); }}
                className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4">Clear filters</button>
            </div>
          ) : (
            filtered.map(ex => {
              const flagged = limitationCheck ? limitationCheck(ex.name) : null;
              return (
                <button
                  key={ex.id}
                  onClick={() => handlePick(ex)}
                  className="group flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-b-0 hover:bg-accent/50 -mx-2 px-2 rounded-md"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{ex.name}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {[ex.muscle_group && label(ex.muscle_group), ex.equipment && label(ex.equipment), ex.difficulty && label(ex.difficulty)].filter(Boolean).join(', ')}
                      {flagged && <span className="text-destructive">, flagged for {flagged}</span>}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
                </button>
              );
            })
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border px-5 py-3 sm:px-6">
          <button
            onClick={handleCustom}
            className="w-full rounded-lg border border-dashed border-input py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Add a custom exercise
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
