import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Search, Dumbbell, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const MUSCLE_OPTIONS = ['chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'];
const EQUIPMENT_OPTIONS = ['barbell','dumbbell','cable','machine','bodyweight','kettlebell','resistance_band','trx'];
const DIFFICULTY_OPTIONS = ['beginner','intermediate','advanced'];

const MUSCLE_COLORS = {
  chest:     'bg-destructive/10 text-destructive border-destructive',
  back:      'bg-success/10 text-success border-success',
  shoulders: 'bg-ai/10 text-ai border-ai',
  biceps:    'bg-accent text-primary border-accent',
  triceps:   'bg-accent text-primary border-accent',
  legs:      'bg-orange-50 text-orange-700 border-orange-100',
  glutes:    'bg-orange-50 text-orange-700 border-orange-100',
  core:      'bg-warning/10 text-warning border-warning',
  full_body: 'bg-accent text-primary border-accent',
  cardio:    'bg-teal-50 text-teal-700 border-teal-100',
};

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap transition-all flex-shrink-0 capitalize"
      style={{
        background: active ? 'var(--tc-primary)' : 'var(--tc-muted)',
        color: active ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
      }}
    >
      {label.replace(/_/g, ' ')}
    </button>
  );
}

function ExerciseCard({ ex, onAdd }) {
  const thumb = ex.thumbnail_url || ex.image_url;
  const muscleClass = MUSCLE_COLORS[ex.muscle_group] || 'bg-muted text-muted-foreground border-border';

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-transparent hover:border-primary hover:bg-accent/40 transition-all text-left group cursor-pointer">
      {/* Thumbnail */}
      <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden" style={{ background: 'var(--tc-sidebar)' }}>
        {thumb ? (
          <SignedImg src={thumb} alt={ex.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-[var(--tc-muted-foreground)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{ex.name}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {ex.muscle_group && (
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border capitalize', muscleClass)}>
              {ex.muscle_group.replace(/_/g, ' ')}
            </span>
          )}
          {ex.equipment && (
            <span className="text-[9px] text-muted-foreground capitalize">{ex.equipment.replace(/_/g, ' ')}</span>
          )}
        </div>
      </div>

      {/* Click-to-add button */}
      {onAdd && (
        <button
          onClick={e => { e.stopPropagation(); onAdd(ex); }}
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all text-primary-foreground text-sm font-bold"
          style={{ background: 'var(--tc-primary)' }}
          title="Add to selected day"
        >+</button>
      )}
    </div>
  );
}

export default function ExerciseLibraryPanel({ onAddExercise, targetDayName }) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipFilter, setEquipFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [showEquip, setShowEquip] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

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
    <div className="flex flex-col h-full bg-card" style={{ borderRight: '0.5px solid var(--tc-border)' }}>

      {/* ── HEADER ── */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--tc-muted)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exercise Library</p>
          {activeFilters > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:text-primary transition-colors">
              <X className="w-2.5 h-2.5" /> Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-7 text-xs pl-7 pr-2 rounded-lg border border-border bg-muted focus:outline-none focus:border-primary placeholder:text-[var(--tc-muted-foreground)]"
          />
        </div>

        {/* Muscle group filter chips */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          <FilterChip label="All" active={!muscleFilter} onClick={() => setMuscleFilter('')} />
          {MUSCLE_OPTIONS.map(m => (
            <FilterChip key={m} label={m} active={muscleFilter === m} onClick={() => setMuscleFilter(muscleFilter === m ? '' : m)} />
          ))}
        </div>

        {/* Equipment + Difficulty dropdowns */}
        <div className="flex gap-1.5 mt-1.5">
          {/* Equipment */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowEquip(v => !v); setShowDiff(false); }}
              className="w-full h-6 flex items-center justify-between px-2 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                border: '0.5px solid var(--tc-border)',
                background: equipFilter ? 'var(--tc-accent)' : 'var(--tc-muted)',
                color: equipFilter ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)',
              }}
            >
              <span className="truncate capitalize">{equipFilter ? equipFilter.replace(/_/g, ' ') : 'Equipment'}</span>
              <ChevronDown className="w-2.5 h-2.5 flex-shrink-0 ml-1" />
            </button>
            {showEquip && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 py-1 max-h-40 overflow-y-auto">
                <button onClick={() => { setEquipFilter(''); setShowEquip(false); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted">All Equipment</button>
                {EQUIPMENT_OPTIONS.map(e => (
                  <button key={e} onClick={() => { setEquipFilter(e); setShowEquip(false); }}
                    className={cn('w-full text-left px-3 py-1.5 text-[10px] capitalize font-medium hover:bg-muted',
                      equipFilter === e ? 'text-primary font-semibold' : 'text-foreground')}>
                    {e.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div className="relative flex-1">
            <button
              onClick={() => { setShowDiff(v => !v); setShowEquip(false); }}
              className="w-full h-6 flex items-center justify-between px-2 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                border: '0.5px solid var(--tc-border)',
                background: diffFilter ? 'var(--tc-accent)' : 'var(--tc-muted)',
                color: diffFilter ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)',
              }}
            >
              <span className="truncate capitalize">{diffFilter || 'Difficulty'}</span>
              <ChevronDown className="w-2.5 h-2.5 flex-shrink-0 ml-1" />
            </button>
            {showDiff && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-30 py-1">
                <button onClick={() => { setDiffFilter(''); setShowDiff(false); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted">All Levels</button>
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d} onClick={() => { setDiffFilter(d); setShowDiff(false); }}
                    className={cn('w-full text-left px-3 py-1.5 text-[10px] capitalize font-medium hover:bg-muted',
                      diffFilter === d ? 'text-primary font-semibold' : 'text-foreground')}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Target day hint */}
        {targetDayName && (
          <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
            Adding to <span className="text-primary font-semibold">{targetDayName}</span> · click <span className="font-semibold">+</span> or drag onto day
          </p>
        )}
      </div>

      {/* ── EXERCISE LIST ── */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-blue-500 rounded-full animate-spin" />
            <p className="text-[10px] text-muted-foreground">Loading library...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <Dumbbell className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No exercises found</p>
            {(search || activeFilters > 0) && (
              <button onClick={clearFilters} className="text-[10px] text-primary font-semibold">Clear filters</button>
            )}
          </div>
        ) : (
          filtered.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} onAdd={onAddExercise} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: '0.5px solid var(--tc-muted)' }}>
        <p className="text-[9px] text-[var(--tc-muted-foreground)] text-center">
          {filtered.length} of {exercises.length} exercises
        </p>
      </div>
    </div>
  );
}