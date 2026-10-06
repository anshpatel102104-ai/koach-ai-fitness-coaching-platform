import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/portal/PortalUI';
import ExerciseInfoSheet from './ExerciseInfoSheet';

function getEquipment(exercises = []) {
  const eq = new Set();
  exercises.forEach(ex => {
    const n = (ex.name || '').toLowerCase();
    if (n.includes('barbell') || n.includes('bench') || n.includes('squat bar')) eq.add('Barbell');
    else if (n.includes('dumbbell') || n.includes('db ') || n.includes('curl') || n.includes('lateral')) eq.add('Dumbbells');
    if (n.includes('cable') || n.includes('pulldown') || n.includes('pushdown')) eq.add('Cable');
    if (n.includes('bodyweight') || n.includes('push-up') || n.includes('plank') || n.includes('pull-up')) eq.add('Bodyweight');
  });
  return [...eq].slice(0, 3);
}

function ExerciseRow({ ex, idx, libraryExercises, onInfoClick }) {
  // Check if there's library data (photo/instructions)
  const libraryEx = libraryExercises?.find(le =>
    le.name?.toLowerCase().trim() === (ex.name || '').toLowerCase().trim()
  );
  const hasInfo = libraryEx && ((libraryEx.instructions?.length > 0) || libraryEx.image_url || libraryEx.video_url || (libraryEx.form_cues?.length > 0));

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="num w-5 flex-shrink-0 text-lg text-muted-foreground">{idx + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{ex.name}</p>
        <p className="text-[13px] text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">{ex.sets || 3} × {ex.reps || 10}</span>
          {ex.rpe ? <span>  RPE {ex.rpe}</span> : null}
          {ex.rest_seconds ? <span>, rest {ex.rest_seconds} s</span> : null}
        </p>
      </div>
      {hasInfo && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onInfoClick(libraryEx); }}
          className="touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4"
        >
          How to
        </button>
      )}
    </li>
  );
}

export default function WorkoutCard({ workout, isToday, dayDate, isDone, onStart }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const { data: libraryExercises = [] } = useQuery({
    queryKey: ['exercise-library'],
    queryFn: () => portalDb.entities.ExerciseLibrary.list('name', 200),
    staleTime: 5 * 60 * 1000,
  });

  const dayLabel = dayDate ? `${format(dayDate, 'EEEE, MMM d')}${isToday ? ', today' : ''}` : (isToday ? 'Today' : '');

  if (!workout || workout.day_name?.toLowerCase().includes('rest')) {
    return (
      <section className="panel p-5">
        {dayLabel && <p className="text-[13px] text-muted-foreground">{dayLabel}</p>}
        <h2 className="mt-1 text-[28px] text-foreground">Rest day</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Nothing to log. Recovery is part of the plan.</p>
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {['Drink your water target', 'Aim for 8 hours of sleep', '10 minutes of light stretching', 'Hit your protein for the day'].map(tip => (
            <li key={tip} className="py-2.5 text-[15px] text-foreground">{tip}</li>
          ))}
        </ul>
      </section>
    );
  }

  const exercises = workout.exercises || [];
  const estMin = Math.max(25, Math.round(exercises.reduce((t, ex) => t + (ex.sets || 3) * 2.5, 0)));
  const equipment = getEquipment(exercises);
  const previewExs = showAll ? exercises : exercises.slice(0, 4);

  return (
    <>
      <section className="panel">
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            {dayLabel && <p className="text-[13px] text-muted-foreground">{dayLabel}</p>}
            {isDone && <Pill tone="success"><Check className="h-3.5 w-3.5" strokeWidth={3} /> Done today</Pill>}
          </div>
          <h2 className="mt-1 text-[28px] text-foreground">{workout.day_name}</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {exercises.length} exercise{exercises.length === 1 ? '' : 's'}, about {estMin} minutes
            {equipment.length > 0 ? `. ${equipment.join(', ')}` : ''}
          </p>
        </div>

        <ul className="mx-5 mt-3 divide-y divide-border border-t border-border">
          {previewExs.map((ex, i) => (
            <ExerciseRow
              key={i} ex={ex} idx={i}
              libraryExercises={libraryExercises}
              onInfoClick={setSelectedExercise}
            />
          ))}
        </ul>
        {exercises.length > 4 && (
          <div className="mx-5 border-t border-border py-2.5">
            <button type="button" onClick={() => setShowAll(v => !v)} className="touch-compact text-sm font-semibold text-foreground underline underline-offset-4">
              {showAll ? 'Show fewer' : `Show all ${exercises.length} exercises`}
            </button>
          </div>
        )}

        <div className="px-5 pb-5 pt-3">
          <Button
            variant={isDone ? 'outline' : isToday ? 'brand' : 'default'}
            size="lg"
            className="h-[52px] w-full text-base font-bold"
            onClick={onStart}
          >
            {isDone ? 'Do it again' : isToday ? 'Start workout' : 'Start this session'}
          </Button>
        </div>
      </section>

      {/* Exercise info sheet */}
      <ExerciseInfoSheet
        exercise={selectedExercise}
        open={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </>
  );
}
