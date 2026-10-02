import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Play, BookOpen, ChevronDown, ChevronUp, Link, Timer, Zap, Layers, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExerciseDetailModal from '@/components/exercises/ExerciseDetailModal';
import ExercisePickerModal from '@/components/exercises/ExercisePickerModal';
import { openFileUrl } from '@/lib/storageUrls';

const SET_TYPES = [
  { value: 'straight', label: 'Straight Set' },
  { value: 'superset', label: 'Superset' },
  { value: 'dropset', label: 'Dropset' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'failure', label: 'To Failure' },
];

const SECTIONS = [
  { value: 'warmup', label: '🔥 Warm-Up' },
  { value: 'main', label: '💪 Main Work' },
  { value: 'finisher', label: '⚡ Finisher' },
  { value: 'cooldown', label: '🧘 Cooldown' },
];

const defaultForm = {
  title: '', description: '', duration_weeks: 8, difficulty: 'intermediate',
  category: 'custom', days_per_week: 4, is_template: false, workouts: []
};

const newExercise = (section = 'main') => ({
  name: '', sets: 3, reps: '10', rest_seconds: 60,
  tempo: '', notes: '', video_url: '',
  set_type: 'straight', rpe: '', superset_group: '', section,
});

function ExerciseFormRow({ ex, drag, isDragging, onUpdate, onRemove, onPickLibrary, onWatchDemo }) {
  const [expanded, setExpanded] = useState(false);
  const setTypeColor = ex.set_type === 'superset' ? 'border-l-purple-400' : ex.set_type === 'dropset' ? 'border-l-orange-400' : ex.set_type === 'amrap' ? 'border-l-red-400' : 'border-l-transparent';

  return (
    <div ref={drag.innerRef} {...drag.draggableProps}
      className={cn('bg-card border border-border rounded-xl overflow-hidden border-l-2', isDragging && 'shadow-md', setTypeColor)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div {...drag.dragHandleProps}><GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab" /></div>
        {ex.set_type && ex.set_type !== 'straight' && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-ai/10 text-ai flex-shrink-0">{ex.set_type.toUpperCase()}</span>
        )}
        <Input className="h-8 text-xs flex-1" placeholder="Exercise name" value={ex.name} onChange={e => onUpdate('name', e.target.value)} />
        <button type="button" onClick={onPickLibrary} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary flex-shrink-0">
          <BookOpen className="w-3.5 h-3.5" />
        </button>
        {(ex.video_url || ex._library_exercise?.video_url) && (
          <button type="button" onClick={onWatchDemo} className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent text-primary flex-shrink-0">
            <Play className="w-3 h-3" fill="currentColor" />
          </button>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col items-center">
            <Input type="number" value={ex.sets} onChange={e => onUpdate('sets', Number(e.target.value))} className="h-7 w-11 text-xs text-center p-1" />
            <span className="text-[9px] text-muted-foreground">sets</span>
          </div>
          <div className="flex flex-col items-center">
            <Input value={ex.reps} onChange={e => onUpdate('reps', e.target.value)} className="h-7 w-14 text-xs text-center p-1" placeholder="10" />
            <span className="text-[9px] text-muted-foreground">reps</span>
          </div>
          <div className="flex flex-col items-center">
            <Input type="number" value={ex.rest_seconds} onChange={e => onUpdate('rest_seconds', Number(e.target.value))} className="h-7 w-12 text-xs text-center p-1" placeholder="60" />
            <span className="text-[9px] text-muted-foreground">rest s</span>
          </div>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)}
          className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0', (ex.tempo || ex.notes || ex.video_url || ex.rpe) ? 'bg-warning/10 text-warning' : 'hover:bg-secondary text-muted-foreground')}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-muted bg-muted px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Layers className="w-3 h-3" />Set Type</Label>
              <select value={ex.set_type || 'straight'} onChange={e => onUpdate('set_type', e.target.value)}
                className="mt-1 h-8 w-full text-xs rounded-lg border border-border bg-card px-2 focus:outline-none focus:border-primary/40">
                {SET_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Tag className="w-3 h-3" />Group</Label>
              <Input className="h-8 text-sm mt-1 border-border font-mono text-center" placeholder="A/B/C"
                value={ex.superset_group || ''} onChange={e => onUpdate('superset_group', e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Timer className="w-3 h-3" />Tempo</Label>
              <Input className="h-8 text-sm mt-1 border-border font-mono" placeholder="3-1-2-0"
                value={ex.tempo || ''} onChange={e => onUpdate('tempo', e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3" />RPE (1–10)</Label>
              <Input type="number" min="1" max="10" className="h-8 text-sm mt-1 border-border text-center" placeholder="8"
                value={ex.rpe || ''} onChange={e => onUpdate('rpe', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Section</Label>
              <select value={ex.section || 'main'} onChange={e => onUpdate('section', e.target.value)}
                className="mt-1 h-8 w-full text-xs rounded-lg border border-border bg-card px-2 focus:outline-none focus:border-primary/40">
                {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Link className="w-3 h-3" />Video / YouTube URL</Label>
              <Input className="h-8 text-xs mt-1 border-border" placeholder="https://youtube.com/..."
                value={ex.video_url || ''} onChange={e => onUpdate('video_url', e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coaching Notes / Instructions</Label>
            <textarea rows={2}
              className="w-full mt-1 px-3 py-2 text-xs rounded-lg border border-border bg-card resize-none focus:outline-none focus:border-primary/40"
              placeholder="Form cues, modifications, client instructions..."
              value={ex.notes || ''} onChange={e => onUpdate('notes', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProgramForm({ open, onOpenChange, onSubmit, program }) {
  const [form, setForm] = useState(defaultForm);
  const [demoExercise, setDemoExercise] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null); // { wIdx, eIdx }

  useEffect(() => {
    setForm(program ? { ...defaultForm, ...program } : defaultForm);
  }, [program, open]);

  const addWorkout = () => {
    setForm(f => ({
      ...f,
      workouts: [...(f.workouts || []), {
        day_name: `Day ${(f.workouts?.length || 0) + 1}`,
        day_number: (f.workouts?.length || 0) + 1,
        exercises: [newExercise('main')]
      }]
    }));
  };

  const addExercise = (workoutIdx, section = 'main') => {
    const workouts = [...form.workouts];
    workouts[workoutIdx].exercises.push(newExercise(section));
    setForm({ ...form, workouts });
  };

  const selectFromLibrary = (libraryExercise) => {
    if (!pickerTarget) return;
    const { wIdx, eIdx } = pickerTarget;
    const workouts = form.workouts.map((w, wi) => wi !== wIdx ? w : {
      ...w,
      exercises: w.exercises.map((e, ei) => ei !== eIdx ? e : {
        ...e,
        name: libraryExercise.name,
        rest_seconds: libraryExercise.default_rest_seconds || e.rest_seconds,
        _library_id: libraryExercise.id,
        _library_exercise: libraryExercise,
      })
    });
    setForm({ ...form, workouts });
    setPickerTarget(null);
  };

  const updateExercise = (wIdx, eIdx, field, value) => {
    const workouts = form.workouts.map((w, wi) => wi !== wIdx ? w : {
      ...w,
      exercises: w.exercises.map((e, ei) => ei !== eIdx ? e : { ...e, [field]: value })
    });
    setForm({ ...form, workouts });
  };

  const removeExercise = (wIdx, eIdx) => {
    const workouts = form.workouts.map((w, wi) => wi !== wIdx ? w : {
      ...w,
      exercises: w.exercises.filter((_, ei) => ei !== eIdx)
    });
    setForm({ ...form, workouts });
  };

  const removeWorkout = (wIdx) => {
    setForm({ ...form, workouts: form.workouts.filter((_, i) => i !== wIdx) });
  };

  const updateWorkout = (wIdx, field, value) => {
    const workouts = form.workouts.map((w, wi) => wi !== wIdx ? w : { ...w, [field]: value });
    setForm({ ...form, workouts });
  };

  const onDragEnd = (wIdx, result) => {
    if (!result.destination) return;
    const workouts = [...form.workouts];
    const exercises = [...workouts[wIdx].exercises];
    const [moved] = exercises.splice(result.source.index, 1);
    exercises.splice(result.destination.index, 0, moved);
    workouts[wIdx] = { ...workouts[wIdx], exercises };
    setForm({ ...form, workouts });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, duration_weeks: Number(form.duration_weeks), days_per_week: Number(form.days_per_week) });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{program ? 'Edit Program' : 'Create Program'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Program Name *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g., 12-Week Shred" />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
            </div>
            <div>
              <Label>Duration (weeks)</Label>
              <Input type="number" value={form.duration_weeks} onChange={e => setForm({...form, duration_weeks: e.target.value})} />
            </div>
            <div>
              <Label>Days/Week</Label>
              <Input type="number" value={form.days_per_week} onChange={e => setForm({...form, days_per_week: e.target.value})} />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => setForm({...form, difficulty: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                  <SelectItem value="fat_loss">Fat Loss</SelectItem>
                  <SelectItem value="athletic">Athletic</SelectItem>
                  <SelectItem value="mobility">Mobility</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save as template toggle */}
          <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl">
            <Switch checked={!!form.is_template} onCheckedChange={v => setForm({...form, is_template: v})} />
            <div>
              <p className="text-sm font-medium">Save as Template</p>
              <p className="text-xs text-muted-foreground">Templates can be cloned to any client instantly</p>
            </div>
          </div>

          {/* Workout Days */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold">Workout Days</h3>
              <Button type="button" variant="outline" size="sm" onClick={addWorkout}>
                <Plus className="w-4 h-4 mr-1" /> Add Day
              </Button>
            </div>
            <div className="space-y-4">
              {form.workouts?.map((workout, wIdx) => (
                <div key={wIdx} className="border border-border rounded-xl p-4 bg-secondary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={workout.day_name}
                      onChange={e => updateWorkout(wIdx, 'day_name', e.target.value)}
                      className="font-medium h-8 max-w-[200px]"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 ml-auto text-destructive" onClick={() => removeWorkout(wIdx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <DragDropContext onDragEnd={(r) => onDragEnd(wIdx, r)}>
                    <Droppable droppableId={`workout-${wIdx}`}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                          {workout.exercises.map((ex, eIdx) => (
                            <Draggable key={eIdx} draggableId={`w${wIdx}-e${eIdx}`} index={eIdx}>
                              {(drag, snapshot) => (
                                <ExerciseFormRow
                                  key={eIdx}
                                  ex={ex}
                                  drag={drag}
                                  isDragging={snapshot.isDragging}
                                  onUpdate={(field, val) => updateExercise(wIdx, eIdx, field, val)}
                                  onRemove={() => removeExercise(wIdx, eIdx)}
                                  onPickLibrary={() => setPickerTarget({ wIdx, eIdx })}
                                  onWatchDemo={() => {
                                    if (ex.video_url) openFileUrl(ex.video_url);
                                    else if (ex._library_exercise) setDemoExercise(ex._library_exercise);
                                  }}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  <Button type="button" variant="ghost" size="sm" className="text-primary text-xs mt-2" onClick={() => addExercise(wIdx)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Exercise
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div />
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{program ? 'Update' : 'Create Program'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <ExerciseDetailModal
      exercise={demoExercise}
      open={!!demoExercise}
      onClose={() => setDemoExercise(null)}
      onEdit={() => {}}
    />

    <ExercisePickerModal
      open={!!pickerTarget}
      onOpenChange={(v) => !v && setPickerTarget(null)}
      onSelect={selectFromLibrary}
    />
  </>
  );
}