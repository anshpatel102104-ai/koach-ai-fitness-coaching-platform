import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import {
  Plus, Dumbbell, Star, Search, X, List,
  ChevronDown, LayoutGrid
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import ExerciseCard from '@/components/exercises/ExerciseCard';
import ExerciseDetailModal from '@/components/exercises/ExerciseDetailModal';
import ExerciseFormModal from '@/components/exercises/ExerciseFormModal';

const MUSCLE_GROUPS = [
  { value: 'chest', label: '🫁 Chest' },
  { value: 'back', label: '🏋️ Back' },
  { value: 'shoulders', label: '🦾 Shoulders' },
  { value: 'biceps', label: '💪 Biceps' },
  { value: 'triceps', label: '💪 Triceps' },
  { value: 'core', label: '🔥 Core/Abs' },
  { value: 'glutes', label: '🍑 Glutes' },
  { value: 'legs', label: '🦵 Quads' },
  { value: 'hamstrings', label: '🦵 Hamstrings' },
  { value: 'calves', label: '🦶 Calves' },
  { value: 'full_body', label: '🏋️ Full Body' },
  { value: 'cardio', label: '🏃 Cardio' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'all', label: 'All Equipment' },
  { value: 'bodyweight', label: 'No Equipment' },
  { value: 'dumbbell', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'cable', label: 'Cables' },
  { value: 'machine', label: 'Machines' },
  { value: 'resistance_band', label: 'Resistance Bands' },
  { value: 'kettlebell', label: 'Kettlebells' },
  { value: 'trx', label: 'TRX' },
  { value: 'other', label: 'Other' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'A–Z' },
  { value: 'name_desc', label: 'Z–A' },
  { value: 'newest', label: 'Recently Added' },
  { value: 'difficulty', label: 'Difficulty' },
];

const CATEGORY_SHORTCUTS = [
  { label: '💪 Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { label: '🦵 Lower Body', muscles: ['legs', 'glutes', 'hamstrings', 'calves'] },
  { label: '🏋️ Full Body', muscles: ['full_body'] },
  { label: '🔥 Core', muscles: ['core'] },
  { label: '🏃 Cardio', muscles: ['cardio'] },
];

const MUSCLE_COLORS = {
  chest: 'var(--tc-primary)', back: 'var(--tc-success)', shoulders: 'var(--tc-warning)', biceps: 'var(--tc-ai)',
  triceps: 'var(--tc-ai)', core: 'var(--tc-destructive)', glutes: 'var(--kc-ec4899)', legs: 'var(--kc-06b6d4)',
  hamstrings: 'var(--kc-06b6d4)', calves: 'var(--kc-84cc16)', full_body: 'var(--kc-f97316)', cardio: 'var(--tc-ai)',
};

function ExerciseListRow({ exercise, onView, onEdit }) {
  return (
    <div onClick={onView} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${MUSCLE_COLORS[exercise.muscle_group] || 'var(--tc-foreground)'}18` }}>
        <Dumbbell className="w-4 h-4" style={{ color: MUSCLE_COLORS[exercise.muscle_group] || 'var(--tc-foreground)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{exercise.name}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {exercise.muscle_group && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${MUSCLE_COLORS[exercise.muscle_group] || 'var(--tc-foreground)'}18`, color: MUSCLE_COLORS[exercise.muscle_group] || 'var(--tc-foreground)' }}>
            {exercise.muscle_group.replace('_', ' ')}
          </span>
        )}
        {exercise.equipment && (
          <span className="text-[10px] text-muted-foreground hidden sm:inline">{exercise.equipment.replace('_', ' ')}</span>
        )}
        {exercise.difficulty && (
          <span className={cn('text-[10px] font-semibold hidden md:inline capitalize',
            exercise.difficulty === 'beginner' ? 'text-success' :
            exercise.difficulty === 'intermediate' ? 'text-warning' : 'text-destructive')}>
            {exercise.difficulty}
          </span>
        )}
        {exercise.is_coach_branded && (
          <Star className="w-3.5 h-3.5 text-warning flex-shrink-0" fill="currentColor" />
        )}
      </div>
    </div>
  );
}

export default function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [activeShortcut, setActiveShortcut] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const queryClient = useQueryClient();

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => db.entities.ExerciseLibrary.list('-created_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ExerciseLibrary.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  });



  // Stats
  const stats = useMemo(() => {
    const custom = exercises.filter(e => e.is_coach_branded || e.created_by);
    const recent = exercises.filter(e => {
      if (!e.created_date) return false;
      return differenceInDays(new Date(), parseISO(e.created_date)) <= 30;
    });
    return { total: exercises.length, custom: custom.length, recent: recent.length };
  }, [exercises]);

  // Filtering + sorting
  const filtered = useMemo(() => {
    let list = [...exercises];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ex => ex.name?.toLowerCase().includes(q) || ex.muscle_group?.toLowerCase().includes(q) || ex.equipment?.toLowerCase().includes(q) || (ex.description || '').toLowerCase().includes(q));
    }
    if (activeShortcut) {
      list = list.filter(ex => activeShortcut.muscles.includes(ex.muscle_group));
    } else if (muscleFilter !== 'all') {
      list = list.filter(ex => ex.muscle_group === muscleFilter);
    }
    if (equipmentFilter !== 'all') list = list.filter(ex => ex.equipment === equipmentFilter);
    if (difficultyFilter !== 'all') list = list.filter(ex => ex.difficulty === difficultyFilter);

    list.sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'difficulty') {
        const order = { beginner: 0, intermediate: 1, advanced: 2 };
        return (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1);
      }
      // newest first
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });

    return list;
  }, [exercises, search, muscleFilter, equipmentFilter, difficultyFilter, sortBy, activeShortcut]);

  const activeFilterCount = [
    search.trim(), muscleFilter !== 'all', equipmentFilter !== 'all', difficultyFilter !== 'all', activeShortcut
  ].filter(Boolean).length;

  const clearAll = () => { setSearch(''); setMuscleFilter('all'); setEquipmentFilter('all'); setDifficultyFilter('all'); setActiveShortcut(null); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{ background: 'var(--tc-sidebar)', border: '1px solid color-mix(in srgb, white 7%, transparent)' }}>
        <div>
          <h1 className="text-xl font-bold text-white">Exercise Library</h1>
          <p className="text-xs mt-0.5 text-white/50">{exercises.length} exercises · {stats.custom} custom</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
<button onClick={() => { setEditingExercise(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))', color: 'var(--tc-primary-foreground)', boxShadow: '0 2px 12px color-mix(in srgb, var(--tc-primary) 40%, transparent)' }}>
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-card rounded-xl border border-accent p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <Dumbbell className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Exercises</p>
        </div>
        <div className="bg-card rounded-xl border border-ai p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-2 h-2 rounded-full bg-ai" />
            <Star className="w-4 h-4 text-ai" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.custom}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Custom Exercises</p>
        </div>
        <div className="bg-card rounded-xl border border-orange-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-orange-400 text-sm">🏆</span>
          </div>
          <p className="text-lg font-bold text-foreground truncate">{exercises.find(e => e.is_coach_branded)?.name || 'Bench Press'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Most Used</p>
        </div>
        <div className="bg-card rounded-xl border border-success p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-success text-sm">✨</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.recent}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Added This Month</p>
        </div>
      </div>

      {/* ── Category shortcuts ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
        {CATEGORY_SHORTCUTS.map(cat => (
          <button key={cat.label} onClick={() => setActiveShortcut(activeShortcut?.label === cat.label ? null : cat)}
            className={cn('flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
              activeShortcut?.label === cat.label ? 'bg-sidebar text-white border-foreground' : 'bg-card text-foreground border-border hover:border-muted-foreground')}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 space-y-3">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, muscle group, or equipment..."
              className="w-full pl-9 pr-9 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          {/* Sort */}
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-background')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-background')}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex gap-2 flex-wrap">
          {/* Muscle group chips */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap">
            {MUSCLE_GROUPS.map(mg => (
              <button key={mg.value} onClick={() => { setMuscleFilter(muscleFilter === mg.value ? 'all' : mg.value); setActiveShortcut(null); }}
                className={cn('flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all',
                  muscleFilter === mg.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary/30')}>
                {mg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <select value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              {EQUIPMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              {DIFFICULTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} exercises</span>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-primary hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Exercise grid / list ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <div key={i} className="h-64 bg-card rounded-2xl border border-border animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-foreground">No exercises found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or add a new exercise</p>

        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex}
              onView={() => setSelectedExercise(ex)}
              onEdit={() => { setEditingExercise(ex); setShowForm(true); }}
              onDelete={() => deleteMutation.mutate(ex.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ex => (
            <ExerciseListRow key={ex.id} exercise={ex}
              onView={() => setSelectedExercise(ex)}
              onEdit={() => { setEditingExercise(ex); setShowForm(true); }} />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <ExerciseDetailModal exercise={selectedExercise} open={!!selectedExercise} onClose={() => setSelectedExercise(null)}
        onEdit={() => { setEditingExercise(selectedExercise); setShowForm(true); setSelectedExercise(null); }} />

      <ExerciseFormModal open={showForm} onOpenChange={setShowForm} exercise={editingExercise}
        onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); setShowForm(false); }} />


    </div>
  );
}