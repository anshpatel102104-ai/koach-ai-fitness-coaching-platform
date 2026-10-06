import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/kit';

const cap = (s = '') => {
  const t = String(s).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function ProgramExercisesTab({ program }) {
  const [expandedExercises, setExpandedExercises] = useState(new Set());

  // Extract unique exercises with count
  const exercisesMap = useMemo(() => {
    const map = new Map();
    program.workouts?.forEach(w => {
      w.exercises?.forEach(e => {
        if (e._type || !e.name) return;
        if (!map.has(e.name)) map.set(e.name, { ...e, count: 0 });
        map.get(e.name).count++;
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [program.workouts]);

  const toggleExercise = (exerciseName) => {
    const next = new Set(expandedExercises);
    if (next.has(exerciseName)) next.delete(exerciseName);
    else next.add(exerciseName);
    setExpandedExercises(next);
  };

  if (!exercisesMap.length) {
    return <p className="text-sm text-muted-foreground">No exercises in this program yet.</p>;
  }

  return (
    <Panel className="max-w-3xl overflow-hidden">
      {exercisesMap.map((exercise) => {
        const isExpanded = expandedExercises.has(exercise.name);
        const sub = [exercise.muscle_group && cap(exercise.muscle_group), exercise.equipment && cap(exercise.equipment)].filter(Boolean).join(', ');
        const hasDetails = exercise.description || exercise.notes || exercise.form_cues?.length || exercise.common_mistakes?.length || exercise.movement_pattern || exercise.difficulty;

        return (
          <div key={exercise.name} className="border-b border-border last:border-b-0">
            <button
              onClick={() => hasDetails && toggleExercise(exercise.name)}
              className={cn('flex w-full items-center gap-3 px-5 py-3 text-left', hasDetails && 'hover:bg-accent/50')}
              aria-expanded={hasDetails ? isExpanded : undefined}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-foreground">{exercise.name}</span>
                {sub && <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>}
              </span>
              <span className="flex-shrink-0 text-sm text-muted-foreground">
                <span className="num text-[17px] text-foreground">{exercise.count}</span> {exercise.count === 1 ? 'time' : 'times'}
              </span>
              {hasDetails && <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />}
            </button>

            {isExpanded && (
              <div className="space-y-3 px-5 pb-4 text-sm">
                {exercise.description && <p className="text-muted-foreground">{exercise.description}</p>}
                {exercise.notes && <p className="text-foreground">{exercise.notes}</p>}

                {exercise.form_cues?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">Form cues</p>
                    <ol className="list-decimal space-y-0.5 pl-5 text-foreground">
                      {exercise.form_cues.map((cue, cIdx) => <li key={cIdx}>{cue}</li>)}
                    </ol>
                  </div>
                )}

                {exercise.common_mistakes?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">Common mistakes</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-foreground">
                      {exercise.common_mistakes.map((mistake, mIdx) => <li key={mIdx}>{mistake}</li>)}
                    </ul>
                  </div>
                )}

                {(exercise.movement_pattern || exercise.difficulty) && (
                  <p className="text-[13px] text-muted-foreground">
                    {[exercise.movement_pattern && `${cap(exercise.movement_pattern)} pattern`, exercise.difficulty && cap(exercise.difficulty)].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}
