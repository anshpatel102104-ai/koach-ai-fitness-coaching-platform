import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
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
    <Collapsible open={expanded} onOpenChange={setExpanded} className="border rounded-lg">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
          <div className="flex items-center gap-3 flex-1">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <div className="text-left">
              <p className="font-semibold">{day.day_name}</p>
              <p className="text-xs text-muted-foreground">{day.exercises?.length || 0} exercises</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t p-4 space-y-3">
        {/* Exercises List */}
        <div className="space-y-2">
          {day.exercises?.map((ex, idx) => (
            <div key={idx} className="flex items-start justify-between p-2 bg-secondary rounded">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{ex.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ex.sets}x{ex.reps} • {ex.rest_seconds}s rest
                </p>
              </div>
              <button
                onClick={() => handleRemoveExercise(idx)}
                className="flex-shrink-0 ml-2 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Exercise Form */}
        {showExerciseForm ? (
          <div className="space-y-3 p-3 bg-accent rounded border">
            <div>
              <Label className="text-xs">Exercise</Label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select exercise" /></SelectTrigger>
                <SelectContent>
                  {exercises.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Sets</Label>
                <Input
                  type="number"
                  min="1"
                  value={exerciseForm.sets}
                  onChange={e => setExerciseForm(f => ({ ...f, sets: parseInt(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Reps</Label>
                <Input
                  value={exerciseForm.reps}
                  onChange={e => setExerciseForm(f => ({ ...f, reps: e.target.value }))}
                  className="h-8 text-xs"
                  placeholder="e.g. 8-10"
                />
              </div>
              <div>
                <Label className="text-xs">Rest (s)</Label>
                <Input
                  type="number"
                  value={exerciseForm.rest_seconds}
                  onChange={e => setExerciseForm(f => ({ ...f, rest_seconds: parseInt(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddExercise}
                disabled={!selectedExercise}
                className="text-xs"
              >
                Add Exercise
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExerciseForm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowExerciseForm(true)}
            className="w-full gap-1 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Exercise
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}