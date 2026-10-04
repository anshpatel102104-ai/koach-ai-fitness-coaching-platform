import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Search, Dumbbell, X, ChevronDown, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const MUSCLE_OPTIONS = ['chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'];
const EQUIPMENT_OPTIONS = ['barbell','dumbbell','cable','machine','bodyweight','kettlebell','resistance_band','trx'];

const MUSCLE_COLORS = {
  chest:     'bg-destructive/10 text-destructive',
  back:      'bg-success/10 text-success',
  shoulders: 'bg-ai/10 text-ai',
  biceps:    'bg-accent text-primary',
  triceps:   'bg-accent text-primary',
  legs:      'bg-orange-50 text-orange-700',
  glutes:    'bg-orange-50 text-orange-700',
  core:      'bg-warning/10 text-warning',
  full_body: 'bg-accent text-primary',
  cardio:    'bg-teal-50 text-teal-700',
};

export default function ExercisePickerModal({ open, onClose, onPickExercise, onAddCustom, dayName }) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');
  const [showEquipDrop, setShowEquipDrop] = useState(false);

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

  if (!open) return null;

  const handlePick = (ex) => {
    onPickExercise(ex);
    onClose();
  };

  const handleCustom = () => {
    onAddCustom();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ height: '85vh', maxHeight: '640px', boxShadow: '0 -4px 40px color-mix(in srgb, black 15%, transparent)' }}>

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ background: 'var(--tc-sidebar)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Add Exercise</p>
              <h3 className="text-sm font-bold text-white">{dayName ? `→ ${dayName}` : 'Pick from library'}</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, white 10%, transparent)' }}>
              <X className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              autoFocus
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 text-sm pl-9 pr-3 rounded-xl text-white placeholder:text-white/30 focus:outline-none"
              style={{ background: 'color-mix(in srgb, white 8%, transparent)', border: '1px solid color-mix(in srgb, white 10%, transparent)' }}
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide"
          style={{ background: 'var(--tc-muted)', borderBottom: '0.5px solid var(--tc-border)' }}>

          {/* Muscle chips */}
          <button onClick={() => setMuscleFilter('')}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 transition-colors"
            style={{ background: !muscleFilter ? 'var(--tc-primary)' : 'var(--tc-muted)', color: !muscleFilter ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)' }}>
            All
          </button>
          {MUSCLE_OPTIONS.map(m => (
            <button key={m} onClick={() => setMuscleFilter(muscleFilter === m ? '' : m)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 capitalize transition-colors"
              style={{ background: muscleFilter === m ? 'var(--tc-primary)' : 'var(--tc-muted)', color: muscleFilter === m ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)' }}>
              {m.replace(/_/g, ' ')}
            </button>
          ))}

          {/* Equipment dropdown */}
          <div className="relative flex-shrink-0 ml-1">
            <button onClick={() => setShowEquipDrop(v => !v)}
              className="h-6 flex items-center gap-1 px-2.5 rounded-full text-[10px] font-semibold transition-colors"
              style={{ background: equipFilter ? 'var(--tc-primary)' : 'var(--tc-muted)', color: equipFilter ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)', border: '0.5px solid var(--tc-border)' }}>
              <span className="capitalize">{equipFilter ? equipFilter.replace(/_/g, ' ') : 'Equipment'}</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {showEquipDrop && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 py-1 min-w-[130px]">
                <button onClick={() => { setEquipFilter(''); setShowEquipDrop(false); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-muted-foreground font-semibold hover:bg-muted">All</button>
                {EQUIPMENT_OPTIONS.map(e => (
                  <button key={e} onClick={() => { setEquipFilter(e); setShowEquipDrop(false); }}
                    className={cn('w-full text-left px-3 py-1.5 text-[10px] capitalize font-medium hover:bg-muted',
                      equipFilter === e ? 'text-primary font-bold' : 'text-foreground')}>
                    {e.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Loading library...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <Dumbbell className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No exercises match your filters</p>
              <button onClick={() => { setSearch(''); setMuscleFilter(''); setEquipFilter(''); }}
                className="text-xs text-primary font-semibold">Clear filters</button>
            </div>
          ) : (
            <div className="divide-y divide-muted">
              {filtered.map(ex => {
                const thumb = ex.thumbnail_url || ex.image_url;
                const muscleClass = MUSCLE_COLORS[ex.muscle_group] || 'bg-muted text-muted-foreground';
                return (
                  <button
                    key={ex.id}
                    onClick={() => handlePick(ex)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: 'var(--tc-sidebar)' }}>
                      {thumb ? (
                        <SignedImg src={thumb} alt={ex.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Dumbbell className="w-5 h-5 text-[var(--tc-muted-foreground)]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ex.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ex.muscle_group && (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', muscleClass)}>
                            {ex.muscle_group.replace(/_/g, ' ')}
                          </span>
                        )}
                        {ex.equipment && (
                          <span className="text-[10px] text-muted-foreground capitalize">{ex.equipment.replace(/_/g, ' ')}</span>
                        )}
                        {ex.difficulty && (
                          <span className="text-[10px] text-[var(--tc-muted-foreground)] capitalize">· {ex.difficulty}</span>
                        )}
                      </div>
                    </div>

                    {/* Add indicator */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--tc-accent)' }}>
                      <span className="text-sm font-bold text-primary">+</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom exercise fallback */}
        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '0.5px solid var(--tc-border)', background: 'var(--tc-muted)' }}>
          <button
            onClick={handleCustom}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-card transition-all"
            style={{ border: '1.5px dashed var(--tc-muted-foreground)' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Add custom exercise (type a name manually)
          </button>
        </div>
      </div>
    </div>
  );
}