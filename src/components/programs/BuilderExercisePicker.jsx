import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Input } from '@/components/ui/input';
import { Search, Plus, Play, Dumbbell, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedImg } from '@/components/shared/SignedImage';

const MUSCLE_GROUPS = ['all','chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio'];
const EQUIPMENT = ['all','barbell','dumbbell','cable','machine','bodyweight','kettlebell','resistance_band','trx'];

const MUSCLE_COLORS = {
  chest: 'text-chart-1 bg-chart-1/10',
  back: 'text-chart-2 bg-chart-2/10',
  shoulders: 'text-chart-3 bg-chart-3/10',
  biceps: 'text-primary bg-primary/10',
  triceps: 'text-primary bg-primary/10',
  legs: 'text-chart-5 bg-chart-5/10',
  glutes: 'text-chart-5 bg-chart-5/10',
  core: 'text-chart-4 bg-chart-4/10',
  full_body: 'text-accent bg-accent/10',
  cardio: 'text-accent bg-accent/10',
};

export default function BuilderExercisePicker({ onAdd }) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipFilter, setEquipFilter] = useState('all');

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => db.entities.ExerciseLibrary.list('-created_date', 200),
  });

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    const matchEquip = equipFilter === 'all' || ex.equipment === equipFilter;
    return matchSearch && matchMuscle && matchEquip;
  });

  return (
    <div className="w-72 flex-shrink-0 border-l border-border bg-card/30 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Exercise Library</p>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-secondary/40"
          />
        </div>

        {/* Muscle filter pills */}
        <div className="flex flex-wrap gap-1 mb-2">
          {MUSCLE_GROUPS.slice(0, 6).map(m => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m === muscleFilter ? 'all' : m)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all",
                muscleFilter === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/60 text-muted-foreground border-border hover:border-primary/30"
              )}
            >
              {m === 'all' ? 'All' : m.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Equipment filter */}
        <div className="flex flex-wrap gap-1">
          {['all','barbell','dumbbell','cable','bodyweight','kettlebell'].map(e => (
            <button
              key={e}
              onClick={() => setEquipFilter(e === equipFilter ? 'all' : e)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all",
                equipFilter === e
                  ? "bg-secondary text-foreground border-primary/40"
                  : "bg-secondary/40 text-muted-foreground border-border hover:border-border/80"
              )}
            >
              {e === 'all' ? 'Any' : e.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No exercises found</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(ex => (
              <div
                key={ex.id}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/60 cursor-pointer group transition-colors"
                onClick={() => onAdd(ex)}
              >
                <div className="w-8 h-8 rounded-md bg-secondary/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {ex.thumbnail_url ? (
                    <SignedImg src={ex.thumbnail_url} alt="" className="w-full h-full object-cover rounded-md" />
                  ) : ex.video_url ? (
                    <Play className="w-3 h-3 text-primary" />
                  ) : (
                    <Dumbbell className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium truncate">{ex.name}</p>
                    {ex.is_coach_branded && <Star className="w-2.5 h-2.5 text-chart-4 flex-shrink-0" fill="currentColor" />}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {ex.muscle_group && (
                      <span className={cn("text-[9px] px-1.5 py-px rounded-full", MUSCLE_COLORS[ex.muscle_group] || 'bg-secondary text-muted-foreground')}>
                        {ex.muscle_group.replace('_', ' ')}
                      </span>
                    )}
                    {ex.equipment && (
                      <span className="text-[9px] px-1.5 py-px rounded-full bg-secondary text-muted-foreground">
                        {ex.equipment.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 text-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Click any exercise to add to current day
        </p>
      </div>
    </div>
  );
}