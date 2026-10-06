import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Search, X, List, LayoutGrid } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Page, PageHeader, Panel, Segmented, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';
import ExerciseCard from '@/components/exercises/ExerciseCard';
import ExerciseRow, { EXERCISE_TABLE_COLS } from '@/components/exercises/ExerciseRow';
import ExerciseDetailModal from '@/components/exercises/ExerciseDetailModal';
import ExerciseFormModal from '@/components/exercises/ExerciseFormModal';

const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'core', label: 'Core' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'legs', label: 'Quads and legs' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'calves', label: 'Calves' },
  { value: 'full_body', label: 'Full body' },
  { value: 'cardio', label: 'Cardio' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'all', label: 'Any equipment' },
  { value: 'bodyweight', label: 'No equipment' },
  { value: 'dumbbell', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'cable', label: 'Cables' },
  { value: 'machine', label: 'Machines' },
  { value: 'resistance_band', label: 'Resistance bands' },
  { value: 'kettlebell', label: 'Kettlebells' },
  { value: 'trx', label: 'TRX' },
  { value: 'other', label: 'Other' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name, A to Z' },
  { value: 'name_desc', label: 'Name, Z to A' },
  { value: 'newest', label: 'Recently added' },
  { value: 'difficulty', label: 'Level' },
];

const CATEGORY_SHORTCUTS = [
  { label: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { label: 'Lower body', muscles: ['legs', 'glutes', 'hamstrings', 'calves'] },
  { label: 'Core', muscles: ['core'] },
  { label: 'Full body', muscles: ['full_body'] },
  { label: 'Cardio', muscles: ['cardio'] },
];

export default function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('list');
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

  const brandedCount = exercises.filter(e => e.is_coach_branded).length;
  const withDemo = exercises.filter(e => e.video_url || e.thumbnail_url || e.image_url).length;
  const subtitle = exercises.length === 0
    ? 'Your exercises, with the cues and demos clients see when they train.'
    : `${stats.total} exercises${brandedCount > 0 ? `, ${brandedCount} with your own demo` : ''}. ${withDemo === stats.total ? 'Every one has a demo.' : `${stats.total - withDemo} still need a demo.`}${stats.recent > 0 ? ` ${stats.recent} added in the last 30 days.` : ''}`;

  const areaOptions = [
    { value: 'all', label: 'All', count: exercises.length },
    ...CATEGORY_SHORTCUTS.map(c => ({ value: c.label, label: c.label, count: exercises.filter(e => c.muscles.includes(e.muscle_group)).length })),
  ].filter(o => o.value === 'all' || o.count > 0 || activeShortcut?.label === o.value);

  const filterTrigger = (active) => cn('h-11 w-full bg-card text-[15px] sm:w-auto sm:min-w-[150px]', !active && 'text-muted-foreground');

  return (
    <Page>
      <PageHeader
        title="Exercise library"
        subtitle={subtitle}
        actions={<Button onClick={() => { setEditingExercise(null); setShowForm(true); }}>Add exercise</Button>}
      />

      {/* Body area segments + search */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          className="self-start"
          options={areaOptions}
          value={activeShortcut ? activeShortcut.label : 'all'}
          onChange={v => {
            const sc = CATEGORY_SHORTCUTS.find(c => c.label === v) || null;
            setActiveShortcut(sc);
            if (sc) setMuscleFilter('all');
          }}
        />
        <div className="relative min-w-0 lg:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, muscle or equipment"
            className="h-11 w-full rounded-lg bg-card pl-10 pr-9 text-[15px] text-foreground shadow-[0_0_0_1px_rgb(var(--border)/0.6)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select value={muscleFilter} onValueChange={v => { setMuscleFilter(v); setActiveShortcut(null); }}>
          <SelectTrigger className={filterTrigger(muscleFilter !== 'all')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any muscle</SelectItem>
            {MUSCLE_GROUPS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
          <SelectTrigger className={filterTrigger(equipmentFilter !== 'all')}><SelectValue /></SelectTrigger>
          <SelectContent>
            {EQUIPMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className={filterTrigger(difficultyFilter !== 'all')}><SelectValue /></SelectTrigger>
          <SelectContent>
            {DIFFICULTY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className={filterTrigger(true)}><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="col-span-2 flex items-center gap-3 sm:ml-auto">
          <span className="text-sm text-muted-foreground">{filtered.length} shown</span>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-sm font-semibold text-foreground underline underline-offset-4">
              Clear {activeFilterCount === 1 ? 'filter' : `${activeFilterCount} filters`}
            </button>
          )}
          <Segmented
            size="sm"
            className="ml-auto h-11 sm:ml-0"
            options={[
              { value: 'list', label: <List className="h-4 w-4" aria-label="Table" /> },
              { value: 'grid', label: <LayoutGrid className="h-4 w-4" aria-label="Cards" /> },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      {/* Exercise table / cards */}
      {isLoading ? (
        <Panel className="divide-y divide-border">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
              <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          {exercises.length === 0 ? (
            <EmptyState
              title="No exercises yet"
              body="Add the lifts you program most, with a demo and two or three cues each."
              action={<Button onClick={() => { setEditingExercise(null); setShowForm(true); }}>Add exercise</Button>}
            />
          ) : (
            <EmptyState
              title="Nothing matches"
              body="No exercise fits that search and those filters."
              action={<Button variant="outline" onClick={clearAll}>Clear filters</Button>}
            />
          )}
        </Panel>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex}
              onView={() => setSelectedExercise(ex)}
              onEdit={() => { setEditingExercise(ex); setShowForm(true); }}
              onDelete={() => deleteMutation.mutate(ex.id)} />
          ))}
        </div>
      ) : (
        <Panel className="overflow-hidden">
          <div className={`hidden border-b border-border px-6 pb-3 pt-4 text-[13px] text-muted-foreground ${EXERCISE_TABLE_COLS}`}>
            <span>Exercise</span>
            <span>Muscle</span>
            <span>Equipment</span>
            <span>Level</span>
            <span>Demo</span>
            <span aria-hidden />
          </div>
          {filtered.map(ex => (
            <ExerciseRow key={ex.id} exercise={ex}
              onView={() => setSelectedExercise(ex)}
              onEdit={() => { setEditingExercise(ex); setShowForm(true); }}
              onDelete={() => deleteMutation.mutate(ex.id)} />
          ))}
        </Panel>
      )}

      {/* Modals */}
      <ExerciseDetailModal exercise={selectedExercise} open={!!selectedExercise} onClose={() => setSelectedExercise(null)}
        onEdit={() => { setEditingExercise(selectedExercise); setShowForm(true); setSelectedExercise(null); }} />

      <ExerciseFormModal open={showForm} onOpenChange={setShowForm} exercise={editingExercise}
        onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); setShowForm(false); }} />
    </Page>
  );
}
