import React, { useState } from 'react';
import { Trash2, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';

export default function ManualDayBuilder({ day, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [exerciseForm, setExerciseForm] = useState({
    sets: 3, reps: '8-10', rest_seconds: 90
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => db.entities.ExerciseLibrary.list('name'),
  });

  const handleAddExercise = () => {
    if (!selectedExercise) return;
    const ex = exercises.find(e => e.id === selectedExercise);
    const newExercises = [
      ...(day.exercises || []),
      {
        ...ex,
        sets: exerciseForm.sets,
        reps: exerciseForm.reps,
        rest_seconds: exerciseForm.rest_seconds,
        section: 'main',
      },
    ];
    onUpdate({ ...day, exercises: newExercises });
    setSelectedExercise('');
    setExerciseForm({ sets: 3, reps: '8-10', rest_seconds: 90 });
    setShowExerciseForm(false);
  };

  const handleRemoveExercise = (idx) => {
    onUpdate({
      ...day,
      exercises: day.exercises.filter((_, i) => i !== idx),
    });
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">{day.day_name}</span>
            <span className="block text-[13px] text-muted-foreground">{day.exercises?.length || 0} exercises</span>
          </span>
        </CollapsibleTrigger>
        <button
          onClick={onRemove}
          className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${day.day_name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <CollapsibleContent className="space-y-2 border-t border-border p-3">
        {day.exercises?.map((ex, idx) => (
          <div key={idx} className="flex items-start justify-between rounded-lg bg-secondary px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">{ex.name}</p>
              <p className="text-[15px] font-bold tabular-nums text-foreground">
                {ex.sets} × {ex.reps}
                <span className="ml-2 text-[13px] font-normal text-muted-foreground">{ex.rest_seconds}s rest</span>
              </p>
            </div>
            <button
              onClick={() => handleRemoveExercise(idx)}
              className="touch-compact ml-2 flex-shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${ex.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {showExerciseForm ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div>
              <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Exercise</Label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick from your library" /></SelectTrigger>
                <SelectContent>
                  {exercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Sets</Label>
                <Input type="number" min="1" value={exerciseForm.sets}
                  onChange={e => setExerciseForm(f => ({ ...f, sets: parseInt(e.target.value) }))} className="h-9" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Reps</Label>
                <Input value={exerciseForm.reps} placeholder="8-10"
                  onChange={e => setExerciseForm(f => ({ ...f, reps: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-normal text-muted-foreground">Rest (s)</Label>
                <Input type="number" value={exerciseForm.rest_seconds}
                  onChange={e => setExerciseForm(f => ({ ...f, rest_seconds: parseInt(e.target.value) }))} className="h-9" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddExercise} disabled={!selectedExercise}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowExerciseForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowExerciseForm(true)}
            className="h-11 w-full rounded-lg border border-dashed border-input text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Add exercise
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
