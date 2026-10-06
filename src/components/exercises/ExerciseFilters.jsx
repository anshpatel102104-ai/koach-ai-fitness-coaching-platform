import React, { useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'legs', label: 'Legs' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
];

const EQUIPMENT = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'resistance_band', label: 'Band' },
  { value: 'trx', label: 'TRX' },
  { value: 'other', label: 'Other' },
];

const PATTERNS = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'hinge', label: 'Hinge' },
  { value: 'squat', label: 'Squat' },
  { value: 'carry', label: 'Carry' },
  { value: 'rotation', label: 'Rotation' },
  { value: 'isometric', label: 'Isometric' },
  { value: 'cardio', label: 'Cardio' },
];

const DIFFICULTY = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function FilterPills({ label, items, value, onChange, colorFn }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);
  const hasMore = items.length > 5;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {hasMore && (
          <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
            {expanded ? 'less' : `+${items.length - 5} more`}
            <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(item => {
          const active = value === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onChange(active ? 'all' : item.value)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-glow-sm'
                  : 'bg-secondary/60 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ExerciseFilters({
  search, onSearch,
  muscleFilter, onMuscle,
  equipmentFilter, onEquipment,
  patternFilter, onPattern,
  difficultyFilter, onDifficulty,
  resultCount,
}) {
  const activeFilters = [
    muscleFilter !== 'all' && { label: muscleFilter.replace('_', ' '), clear: () => onMuscle('all') },
    equipmentFilter !== 'all' && { label: equipmentFilter.replace('_', ' '), clear: () => onEquipment('all') },
    patternFilter !== 'all' && { label: patternFilter, clear: () => onPattern('all') },
    difficultyFilter !== 'all' && { label: difficultyFilter, clear: () => onDifficulty('all') },
  ].filter(Boolean);

  const clearAll = () => { onMuscle('all'); onEquipment('all'); onPattern('all'); onDifficulty('all'); onSearch(''); };

  return (
    <div className="glass-card rounded-2xl p-5 mb-8">
      {/* Search + active filter chips */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="pl-9 bg-secondary/40"
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">{resultCount} exercises</span>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilters.map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20"
              >
                {f.label}
                <button onClick={f.clear} className="hover:text-primary/60">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Filter rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <FilterPills label="Muscle Group" items={MUSCLE_GROUPS} value={muscleFilter} onChange={onMuscle} />
        <FilterPills label="Equipment" items={EQUIPMENT} value={equipmentFilter} onChange={onEquipment} />
        <FilterPills label="Movement Pattern" items={PATTERNS} value={patternFilter} onChange={onPattern} />
        <FilterPills label="Difficulty" items={DIFFICULTY} value={difficultyFilter} onChange={onDifficulty} />
      </div>
    </div>
  );
}