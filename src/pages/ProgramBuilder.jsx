import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy,
  Check, X, Dumbbell, ArrowLeft, Save, Eye, Users,
  Calendar, Repeat, BarChart2, Clock, Wrench, Settings2,
  Play, AlignLeft, Zap, Type, RefreshCw, Layers,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import ExerciseDetailModal from '@/components/exercises/ExerciseDetailModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import ExerciseDetailsPanel from '@/components/programs/builder/ExerciseDetailsPanel';
import ExerciseLibraryPanel from '@/components/programs/builder/ExerciseLibraryPanel';
import ExercisePickerModal from '@/components/programs/builder/ExercisePickerModal';
import { SignedImg } from '@/components/shared/SignedImage';

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const SECTION_STYLES = {
  warmup:   { bar: 'var(--tc-warning)', label: '🔥 Warm-Up' },
  main:     { bar: 'var(--tc-primary)', label: '💪 Main Work' },
  finisher: { bar: 'var(--tc-destructive)', label: '⚡ Finisher' },
  cooldown: { bar: 'var(--tc-success)', label: '🧘 Cooldown' },
};

const SET_TYPE_BADGE = {
  superset: 'bg-ai/10 text-ai',
  dropset:  'bg-orange-100 text-orange-700',
  amrap:    'bg-destructive/10 text-destructive',
  failure:  'bg-destructive/10 text-destructive',
};

const EQUIPMENT_OPTIONS = ['No Equipment','Dumbbells','Barbell','Cables','Machines','Full Gym','Resistance Bands','Kettlebells'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'elite'];
const CATEGORIES = ['strength','hypertrophy','fat_loss','athletic','mobility','custom'];
const SESSION_LENGTHS = ['30','45','60','75','90+'];

const EQUIP_CHIPS = ['Barbell','Dumbbell','Cable','Machine','Body weight','Kettlebell','Resistance band','TRX'];

const newExercise = (section = 'main') => ({
  name: '', sets: 3, reps: '10', rest_seconds: 60, tempo: '', notes: '', video_url: '',
  set_type: 'straight', rpe: '', rir: '', superset_group: '', dropset_scheme: '',
  stretch_type: 'static', duration_seconds: 30, section,
  progression_type: 'none', progression_value: 5,
  prescription: '',
});

const newSectionLabel = (title = 'Warmup') => ({ _type: 'section_label', title });
const newNoteBlock = () => ({ _type: 'note', text: '' });
const newSupersetGroup = () => ({ _type: 'superset_header', label: 'A', rest_note: 'Rest 2 min between supersets' });

const newDay = (idx) => ({ day_name: `Day ${idx + 1}`, day_number: idx + 1, exercises: [] });

const defaultMeta = {
  title: '', description: '', duration_weeks: 8, difficulty: 'intermediate',
  category: 'custom', days_per_week: 4, is_template: false,
  equipment: [], tags: [], estimated_session_length: '60',
  progression_model: 'linear', deload_frequency: 'never', rest_day_notes: '',
};

/* ─────────────────────────────────────────────────
   Settings Modal — KOACH design system
───────────────────────────────────────────────── */
function SettingsModal({ open, onClose, meta, onMetaChange }) {
  // Local draft so changes only persist on Save
  const [draft, setDraft] = useState(meta);
  useEffect(() => { if (open) setDraft(meta); }, [open]);

  const u = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const toggleEquip = (eq) => {
    const list = draft.equipment || [];
    u('equipment', list.includes(eq) ? list.filter(e => e !== eq) : [...list, eq]);
  };
  const handleSave = () => { onMetaChange(draft); onClose(); };

  const FieldLabel = ({ children }) => (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{children}</p>
  );

  const Stepper = ({ label, value, min = 1, max = 99, onChange }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--tc-border)' }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-10 h-9 flex items-center justify-center text-base font-medium text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
          style={{ borderRight: '0.5px solid var(--tc-border)' }}
        >−</button>
        <span className="flex-1 text-center text-sm font-semibold text-foreground">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-10 h-9 flex items-center justify-center text-base font-medium text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
          style={{ borderLeft: '0.5px solid var(--tc-border)' }}
        >+</button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0" style={{ borderRadius: 16 }}>

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'var(--tc-sidebar)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--tc-primary) 15%, transparent)' }}>
            <Settings2 className="w-4 h-4" style={{ color: 'var(--tc-primary)' }} />
          </div>
          <DialogTitle className="flex-1 text-sm font-semibold text-white tracking-tight">Program settings</DialogTitle>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'color-mix(in srgb, white 8%, transparent)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="px-5 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)', background: 'var(--tc-card)' }}>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              rows={2}
              value={draft.description || ''}
              onChange={e => u('description', e.target.value)}
              placeholder="What's this program about?"
              className="w-full text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none transition-colors placeholder:text-[var(--tc-muted-foreground)] text-foreground"
              style={{ border: '0.5px solid var(--tc-border)', background: 'var(--tc-muted)' }}
            />
          </div>

          {/* Duration + Sessions per week — steppers */}
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Duration (weeks)" value={Number(draft.duration_weeks)} min={1} max={52} onChange={v => u('duration_weeks', v)} />
            <Stepper label="Sessions / week" value={Number(draft.days_per_week)} min={1} max={7} onChange={v => u('days_per_week', v)} />
          </div>

          {/* Difficulty — segmented control */}
          <div>
            <FieldLabel>Difficulty</FieldLabel>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--tc-border)' }}>
              {DIFFICULTIES.map((d, idx) => {
                const active = draft.difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => u('difficulty', d)}
                    className="flex-1 py-2 text-xs font-semibold capitalize transition-colors"
                    style={{
                      background: active ? 'var(--tc-primary)' : 'var(--tc-card)',
                      color: active ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
                      borderRight: idx < DIFFICULTIES.length - 1 ? '0.5px solid var(--tc-border)' : 'none',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category + Session length */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={draft.category} onValueChange={v => u('category', v)}>
                <SelectTrigger className="h-9 text-sm bg-muted" style={{ border: '0.5px solid var(--tc-border)', borderRadius: 10 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Session length</FieldLabel>
              <Select value={draft.estimated_session_length || '60'} onValueChange={v => u('estimated_session_length', v)}>
                <SelectTrigger className="h-9 text-sm bg-muted" style={{ border: '0.5px solid var(--tc-border)', borderRadius: 10 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_LENGTHS.map(m => <SelectItem key={m} value={m}>{m} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Equipment — toggle pills */}
          <div>
            <FieldLabel>Equipment</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(eq => {
                const on = (draft.equipment || []).includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() => toggleEquip(eq)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: on ? 'var(--tc-primary)' : 'var(--tc-muted)',
                      color: on ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
                      border: on ? '1px solid var(--tc-primary)' : '0.5px solid var(--tc-border)',
                    }}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progression model + Deload frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Progression Model</FieldLabel>
              <Select value={draft.progression_model || 'linear'} onValueChange={v => u('progression_model', v)}>
                <SelectTrigger className="h-9 text-sm bg-muted" style={{ border: '0.5px solid var(--tc-border)', borderRadius: 10 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['linear', 'undulating', 'block'].map(m => (
                    <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Deload Frequency</FieldLabel>
              <Select value={draft.deload_frequency || 'never'} onValueChange={v => u('deload_frequency', v)}>
                <SelectTrigger className="h-9 text-sm bg-muted" style={{ border: '0.5px solid var(--tc-border)', borderRadius: 10 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['never', 'every_4_weeks', 'every_6_weeks', 'every_8_weeks'].map(f => (
                    <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ background: 'var(--tc-muted)', borderTop: '0.5px solid var(--tc-border)' }}
        >
          {/* Save as template toggle */}
          <button
            onClick={() => u('is_template', !draft.is_template)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div
              className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0"
              style={{ background: draft.is_template ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}
            >
              <div
                className="w-4 h-4 rounded-full bg-card shadow transition-transform"
                style={{ transform: draft.is_template ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-xs font-medium text-foreground">Save as template</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              style={{ border: '0.5px solid var(--tc-border)', background: 'var(--tc-card)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              style={{ background: 'var(--tc-primary)' }}
            >
              Save
            </button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────
   Assign Client Modal
───────────────────────────────────────────────── */
function AssignClientModal({ open, onClose, programId, programTitle }) {
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'], queryFn: () => base44.entities.Client.list(), enabled: open,
  });
  const assignMutation = useMutation({
    mutationFn: () => base44.entities.Client.update(selected, { assigned_program_id: programId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); setDone(true); toast.success('Program assigned!'); },
  });
  const handleClose = () => { setSelected(null); setDone(false); onClose(); };
  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--tc-border)' }}>
          <DialogTitle className="text-base font-bold text-foreground">Assign to Client</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Select a client to assign <strong>"{programTitle}"</strong></p>
        </div>
        {done ? (
          <div className="flex flex-col items-center py-10 px-5 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm font-semibold text-foreground">Program assigned!</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto divide-y divide-muted px-2 py-2">
              {clients.map(c => (
                <button key={c.id} onClick={() => setSelected(c.id)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
                    selected === c.id ? 'bg-accent/10 border border-accent' : 'hover:bg-muted')}>
                  <div className="w-8 h-8 rounded-full bg-accent/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  {selected === c.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid var(--tc-border)' }}>
              <Button variant="outline" className="flex-1 text-xs" onClick={handleClose}>Cancel</Button>
              <Button className="flex-1 text-xs" disabled={!selected || assignMutation.isPending} onClick={() => assignMutation.mutate()}>
                {assignMutation.isPending ? 'Assigning...' : 'Assign Program'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────
   Exercise Row (rich)
───────────────────────────────────────────────── */
function ExerciseRow({ ex, exLibMap, dragProvided, isDragging, isSelected, onClick, onRemove, onPrescriptionChange }) {
  const libEntry = exLibMap?.[ex.name?.toLowerCase()] || null;
  const thumb = ex.image_url || libEntry?.thumbnail_url || libEntry?.image_url || null;
  const hasVideo = !!(libEntry?.video_url || ex.video_url);

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all group',
        isSelected ? 'border-primary bg-accent/10' : isDragging ? 'border-primary bg-card shadow-lg' : 'border-border bg-card hover:border-primary hover:bg-muted'
      )}
    >
      {/* Drag handle */}
      <div {...dragProvided.dragHandleProps} onClick={e => e.stopPropagation()} className="cursor-grab flex-shrink-0 text-muted-foreground hover:text-muted-foreground">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden relative"
        style={{ background: 'var(--tc-sidebar)' }}>
        {thumb ? (
          <SignedImg src={thumb} alt={ex.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-[var(--tc-muted-foreground)]" />
          </div>
        )}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="w-3 h-3 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="w-28 flex-shrink-0 text-sm font-medium text-foreground truncate">
        {ex.name || <span className="text-[var(--tc-muted-foreground)] font-normal">Unnamed</span>}
      </p>

      {/* Free-text prescription */}
      <input
        type="text"
        value={ex.prescription || (ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : '')}
        onClick={e => e.stopPropagation()}
        onChange={e => onPrescriptionChange(e.target.value)}
        placeholder="3 × 8–12 reps"
        className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg border border-border bg-muted text-foreground placeholder:text-[var(--tc-muted-foreground)] focus:outline-none focus:border-primary focus:bg-card transition-colors"
      />

      {/* Remove */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Day Card (full Trainerize-depth version)
───────────────────────────────────────────────── */
function DayCard({
  day, globalDayIdx, isActiveDayForEx, selectedExIdx,
  onSelectExercise, onAddExercise, onOpenPicker, onRemoveExercise, onRemoveDay, onDuplicateDay,
  onUpdateDay, exLibMap,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleRef = useRef(null);

  // Auto-derive equipment from exercises
  const derivedEquipment = React.useMemo(() => {
    const seen = new Set();
    (day.exercises || []).forEach(ex => {
      if (!ex._type) {
        const lib = exLibMap?.[ex.name?.toLowerCase()];
        if (lib?.equipment) {
          const label = lib.equipment.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          seen.add(label);
        }
      }
    });
    return [...seen];
  }, [day.exercises, exLibMap]);

  const exCount = (day.exercises || []).filter(e => !e._type && e.name).length;
  const sessionTime = day.session_time || '';
  const workoutType = day.workout_type || 'Regular workout';

  // Render the items array (exercises + section labels + notes + superset headers)
  const renderItems = (items) => {
    const rows = [];
    let i = 0;
    while (i < items.length) {
      const item = items[i];

      // Section label
      if (item._type === 'section_label') {
        rows.push(
          <div key={`sl-${i}`} className="flex items-center gap-2 my-2">
            <div className="h-px flex-1" style={{ background: 'var(--tc-border)' }} />
            <div className="flex items-center gap-1.5 group/sl">
              <input
                type="text"
                value={item.title || ''}
                onChange={e => {
                  const updated = [...(day.exercises || [])];
                  updated[items[i].__origIdx] = { ...item, title: e.target.value };
                  onUpdateDay({ exercises: updated });
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-transparent border-none focus:outline-none text-center w-20"
              />
              <button onClick={() => {
                const updated = (day.exercises || []).filter((_, idx) => idx !== items[i].__origIdx);
                onUpdateDay({ exercises: updated });
              }} className="opacity-0 group-hover/sl:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="h-px flex-1" style={{ background: 'var(--tc-border)' }} />
          </div>
        );
        i++;
        continue;
      }

      // Note block
      if (item._type === 'note') {
        rows.push(
          <div key={`note-${i}`} className="rounded-xl px-3 py-2.5 my-1.5 relative group/note"
            style={{ background: 'var(--tc-warning)', border: '1px solid var(--kc-fac775)' }}>
            <textarea
              rows={2}
              value={item.text || ''}
              onChange={e => {
                const updated = [...(day.exercises || [])];
                updated[items[i].__origIdx] = { ...item, text: e.target.value };
                onUpdateDay({ exercises: updated });
              }}
              placeholder="Add a coaching note, form cue, or instruction..."
              className="w-full text-xs bg-transparent border-none focus:outline-none resize-none"
              style={{ color: 'var(--kc-854f0b)' }}
            />
            <button onClick={() => {
              const updated = (day.exercises || []).filter((_, idx) => idx !== items[i].__origIdx);
              onUpdateDay({ exercises: updated });
            }} className="absolute top-2 right-2 opacity-0 group-hover/note:opacity-100 text-muted-foreground hover:text-destructive transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
        );
        i++;
        continue;
      }

      // Superset header
      if (item._type === 'superset_header') {
        // collect exercises until next non-superset item
        const ssItems = [];
        let j = i + 1;
        while (j < items.length && items[j]._type !== 'section_label' && items[j]._type !== 'note' && items[j]._type !== 'superset_header') {
          if (!items[j]._type) ssItems.push({ ex: items[j], origIdx: items[j].__origIdx });
          j++;
        }
        rows.push(
          <div key={`ss-${i}`} className="mb-2">
            <div className="flex items-center gap-2 mb-1.5 group/ssh">
              <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: 'var(--tc-primary)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--tc-primary)' }}>
                Superset {item.label || 'A'}
              </span>
              <input
                type="text"
                value={item.rest_note || ''}
                onChange={e => {
                  const updated = [...(day.exercises || [])];
                  updated[items[i].__origIdx] = { ...item, rest_note: e.target.value };
                  onUpdateDay({ exercises: updated });
                }}
                placeholder="Rest note..."
                className="ml-2 flex-1 text-[10px] text-muted-foreground bg-transparent border-none focus:outline-none"
              />
              <button onClick={() => {
                const updated = (day.exercises || []).filter((_, idx) => idx !== items[i].__origIdx);
                onUpdateDay({ exercises: updated });
              }} className="opacity-0 group-hover/ssh:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="pl-3 space-y-1.5" style={{ borderLeft: '2px solid var(--tc-primary)' }}>
              {ssItems.map(({ ex, origIdx }) => (
                <Draggable key={`ex-${globalDayIdx}-${origIdx}`} draggableId={`ex-${globalDayIdx}-${origIdx}`} index={origIdx}>
                  {(drag, snap) => (
                    <ExerciseRow
                      ex={ex} exLibMap={exLibMap} dragProvided={drag} isDragging={snap.isDragging}
                      isSelected={isActiveDayForEx && selectedExIdx === origIdx}
                      onClick={() => onSelectExercise(origIdx)}
                      onRemove={() => onRemoveExercise(origIdx)}
                      onPrescriptionChange={val => {
                        const updated = [...(day.exercises || [])];
                        updated[origIdx] = { ...ex, prescription: val };
                        onUpdateDay({ exercises: updated });
                      }}
                    />
                  )}
                </Draggable>
              ))}
            </div>
          </div>
        );
        i = j;
        continue;
      }

      // Regular exercise
      const origIdx = item.__origIdx;
      rows.push(
        <Draggable key={`ex-${globalDayIdx}-${origIdx}`} draggableId={`ex-${globalDayIdx}-${origIdx}`} index={origIdx}>
          {(drag, snap) => (
            <ExerciseRow
              ex={item} exLibMap={exLibMap} dragProvided={drag} isDragging={snap.isDragging}
              isSelected={isActiveDayForEx && selectedExIdx === origIdx}
              onClick={() => onSelectExercise(origIdx)}
              onRemove={() => onRemoveExercise(origIdx)}
              onPrescriptionChange={val => {
                const updated = [...(day.exercises || [])];
                updated[origIdx] = { ...item, prescription: val };
                onUpdateDay({ exercises: updated });
              }}
            />
          )}
        </Draggable>
      );
      i++;
    }
    return rows;
  };

  // Build flat items list with original indexes
  const allItems = (day.exercises || []).map((ex, origIdx) => ({ ...ex, __origIdx: origIdx }));

  return (
    <div className="bg-card rounded-2xl overflow-hidden mb-4" style={{ border: '0.5px solid var(--tc-border)', boxShadow: '0 1px 4px color-mix(in srgb, black 5%, transparent)' }}>

      {/* ── HEADER ── */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--tc-muted)' }}>
        <div className="flex items-start gap-2">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab flex-shrink-0 mt-1" />
          <button onClick={() => setCollapsed(v => !v)} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <div className="flex-1 min-w-0">
            {/* Editable title */}
            {editingTitle ? (
              <input
                ref={titleRef}
                autoFocus
                type="text"
                value={day.day_name || ''}
                onChange={e => onUpdateDay({ day_name: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                className="w-full text-sm font-bold text-foreground bg-transparent border-none focus:outline-none"
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="text-left group/title flex items-center gap-1">
                <span className="text-sm font-bold text-foreground">{day.day_name || 'Untitled Day'}</span>
                <span className="text-[10px] text-[var(--tc-muted-foreground)] opacity-0 group-hover/title:opacity-100 transition-opacity ml-1">edit</span>
              </button>
            )}

            {/* Meta line */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Session time — editable inline */}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  value={sessionTime}
                  onChange={e => onUpdateDay({ session_time: e.target.value })}
                  placeholder="45 min"
                  className="text-[11px] text-muted-foreground bg-transparent border-none focus:outline-none w-14"
                />
              </div>
              <span className="text-border text-[10px]">·</span>
              <span className="text-[11px] text-muted-foreground">{exCount} {exCount === 1 ? 'exercise' : 'exercises'}</span>
              <span className="text-border text-[10px]">·</span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{workoutType}</span>
            </div>

            {/* Equipment chips */}
            {derivedEquipment.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {derivedEquipment.map(eq => (
                  <span key={eq} className="text-[10px] font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">{eq}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onDuplicateDay} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--tc-muted-foreground)] hover:text-foreground hover:bg-muted transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemoveDay} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--tc-muted-foreground)] hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-3">

          {/* Workout notes */}
          <div className="mb-3">
            <textarea
              rows={2}
              value={day.workout_notes || ''}
              onChange={e => onUpdateDay({ workout_notes: e.target.value })}
              placeholder="Workout notes / bio — warmup intent, focus, coaching cues for the client..."
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-border bg-muted text-foreground placeholder:text-[var(--tc-muted-foreground)] focus:outline-none focus:border-primary resize-none transition-colors"
            />
          </div>

          {/* Exercises */}
          <Droppable droppableId={`ex-${globalDayIdx}`}>
            {(prov) => (
              <div ref={prov.innerRef} {...prov.droppableProps} className="space-y-1.5">
                {allItems.length === 0 ? (
                  <p className="text-xs text-[var(--tc-muted-foreground)] text-center py-4">No exercises yet — add one below</p>
                ) : renderItems(allItems)}
                {prov.placeholder}
              </div>
            )}
          </Droppable>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onOpenPicker ? onOpenPicker('main') : onAddExercise('main')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ border: '1.5px dashed var(--tc-accent)', color: 'var(--tc-primary)', background: 'transparent' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add exercise
            </button>
            <button
              onClick={() => {
                const grpLabel = String.fromCharCode(65 + (day.exercises || []).filter(e => e._type === 'superset_header').length);
                const updated = [...(day.exercises || []), newSupersetGroup(), { ...newExercise('main'), superset_group: grpLabel }];
                onUpdateDay({ exercises: updated });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary transition-all"
              style={{ border: '1.5px dashed var(--tc-accent)', background: 'transparent' }}
            >
              <Zap className="w-3.5 h-3.5" /> Superset
            </button>
            <button
              onClick={() => {
                const updated = [...(day.exercises || []), newNoteBlock()];
                onUpdateDay({ exercises: updated });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground transition-all"
              style={{ border: '1.5px dashed var(--tc-border)', background: 'transparent' }}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Note
            </button>
            <button
              onClick={() => {
                const updated = [...(day.exercises || []), newSectionLabel('Section')];
                onUpdateDay({ exercises: updated });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground transition-all"
              style={{ border: '1.5px dashed var(--tc-border)', background: 'transparent' }}
            >
              <Type className="w-3.5 h-3.5" /> Label
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────── */
export default function ProgramBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const existingProgram = location.state?.program || null;

  const [meta, setMeta] = useState(existingProgram ? {
    title: existingProgram.title || '',
    description: existingProgram.description || '',
    duration_weeks: existingProgram.duration_weeks || 8,
    difficulty: existingProgram.difficulty || 'intermediate',
    category: existingProgram.category || 'custom',
    days_per_week: existingProgram.days_per_week || 4,
    is_template: existingProgram.is_template || false,
    equipment: existingProgram.equipment || [],
    tags: existingProgram.tags || [],
    estimated_session_length: existingProgram.estimated_session_length || '60',
    progression_model: existingProgram.progression_model || 'linear',
    deload_frequency: existingProgram.deload_frequency || 'never',
    rest_day_notes: existingProgram.rest_day_notes || '',
  } : { ...defaultMeta });

  const [workouts, setWorkouts] = useState(existingProgram?.workouts || []);
  const [activeWeek, setActiveWeek] = useState(0); // 0-indexed
  const [selectedEx, setSelectedEx] = useState(null); // { dayIdx, exIdx }
  const [showSettings, setShowSettings] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [demoExercise, setDemoExercise] = useState(null);
  const [savedId, setSavedId] = useState(existingProgram?.id || null);
  const [showLibPanel, setShowLibPanel] = useState(true); // left library panel
  const [pickerState, setPickerState] = useState(null); // { dayIdx, section } — null = closed
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Schedule mode: 'repeat' = one template week, 'progress' = per-week editing
  const [scheduleMode, setScheduleMode] = useState(
    existingProgram?.schedule_mode || 'repeat'
  );
  // In repeat mode, only the first dpw workouts are the "template"
  // templateWorkouts = first week of workouts
  const [copyWeekOpen, setCopyWeekOpen] = useState(null); // weekIdx being copied
  const [copyTargets, setCopyTargets] = useState([]); // selected target week indices

  useEffect(() => {
    const handler = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const saveMutation = useMutation({
    mutationFn: (data) => existingProgram || savedId
      ? base44.entities.WorkoutProgram.update(existingProgram?.id || savedId, data)
      : base44.entities.WorkoutProgram.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      if (result?.id) setSavedId(result.id);
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setHasUnsavedChanges(false);
      toast.success(existingProgram || savedId ? 'Program updated!' : 'Program saved!');
    },
  });

  const handleSave = () => {
    if (!meta.title.trim()) { toast.error('Enter a program name'); return; }
    // In repeat mode, expand all weeks before saving
    let finalWorkouts = workouts;
    if (scheduleMode === 'repeat' && workouts.length > 0) {
      const durationWeeks = Number(meta.duration_weeks) || 8;
      const template = workouts.slice(0, dpw);
      finalWorkouts = [];
      for (let w = 0; w < durationWeeks; w++) {
        template.forEach(day => {
          finalWorkouts.push({ ...day, exercises: day.exercises.map(e => ({ ...e })) });
        });
      }
    }
    saveMutation.mutate({ ...meta, workouts: finalWorkouts, schedule_mode: scheduleMode, duration_weeks: Number(meta.duration_weeks), days_per_week: Number(meta.days_per_week) });
  };

  const trackChange = () => setHasUnsavedChanges(true);

  // Switch schedule mode
  const switchScheduleMode = (newMode) => {
    if (newMode === scheduleMode) return;
    if (newMode === 'progress') {
      // Seed all weeks from template (first week)
      const dpw = Number(meta.days_per_week) || 4;
      const durationWeeks = Number(meta.duration_weeks) || 8;
      const template = workouts.slice(0, dpw);
      if (template.length === 0) {
        setScheduleMode(newMode);
        return;
      }
      // Build all weeks as deep copies of the template
      const allWeeks = [];
      for (let w = 0; w < durationWeeks; w++) {
        template.forEach((day, d) => {
          allWeeks.push({
            ...day,
            day_name: day.day_name,
            exercises: day.exercises.map(e => ({ ...e })),
          });
        });
      }
      setWorkouts(allWeeks);
      setActiveWeek(0);
    } else {
      // switching back to repeat — just keep first week as template
      const dpw = Number(meta.days_per_week) || 4;
      setWorkouts(w => w.slice(0, dpw));
      setActiveWeek(0);
    }
    setScheduleMode(newMode);
    trackChange();
  };

  const dpw = Number(meta.days_per_week) || 4;

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < workouts.length; i += dpw) {
    weeks.push({ weekNum: Math.floor(i / dpw) + 1, days: workouts.slice(i, i + dpw), startIdx: i });
  }

  const safeWeek = Math.min(activeWeek, Math.max(weeks.length - 1, 0));
  const currentWeek = weeks[safeWeek] || null;

  // Operations
  const addWeek = () => {
    const newDays = Array.from({ length: dpw }, (_, i) => newDay(workouts.length + i));
    setWorkouts(w => [...w, ...newDays]);
    setActiveWeek(weeks.length); // new week index
    trackChange();
  };

  const duplicateWeek = (wIdx) => {
    const src = weeks[wIdx];
    if (!src) return;
    const copies = src.days.map(day => ({
      ...day,
      day_name: `${day.day_name} (Wk ${weeks.length + 1})`,
      exercises: day.exercises.map(e => ({ ...e })),
    }));
    setWorkouts(w => [...w, ...copies]);
    setActiveWeek(weeks.length);
    trackChange();
    toast.success(`Week ${src.weekNum} duplicated!`);
  };

  const copyWeekToTargets = (srcIdx, targetIdxs) => {
    const src = weeks[srcIdx];
    if (!src) return;
    setWorkouts(w => {
      const next = [...w];
      targetIdxs.forEach(tIdx => {
        const tw = weeks[tIdx];
        if (!tw) return;
        src.days.forEach((day, d) => {
          const globalIdx = tw.startIdx + d;
          if (next[globalIdx]) {
            next[globalIdx] = { ...day, day_name: next[globalIdx].day_name, exercises: day.exercises.map(e => ({ ...e })) };
          }
        });
      });
      return next;
    });
    trackChange();
    toast.success(`Week ${srcIdx + 1} copied to ${targetIdxs.length} week${targetIdxs.length !== 1 ? 's' : ''}`);
    setCopyWeekOpen(null);
    setCopyTargets([]);
  };

  const addDay = () => {
    if (!currentWeek) return;
    const insertAt = currentWeek.startIdx + currentWeek.days.length;
    const next = [...workouts.slice(0, insertAt), newDay(insertAt), ...workouts.slice(insertAt)];
    setWorkouts(next); trackChange();
  };

  const removeDay = (globalIdx) => {
    setWorkouts(w => w.filter((_, i) => i !== globalIdx));
    if (selectedEx?.dayIdx === globalIdx) setSelectedEx(null);
    trackChange();
  };

  const duplicateDay = (globalIdx) => {
    const copy = { ...workouts[globalIdx], exercises: workouts[globalIdx].exercises.map(e => ({ ...e })), day_name: `${workouts[globalIdx].day_name} (Copy)` };
    const next = [...workouts.slice(0, globalIdx + 1), copy, ...workouts.slice(globalIdx + 1)];
    setWorkouts(next); trackChange();
  };

  const addExercise = (dayIdx, section = 'main', libEntry = null) => {
    const base = newExercise(section);
    const ex = libEntry ? {
      ...base,
      name: libEntry.name || '',
      video_url: libEntry.video_url || '',
      // store library metadata for thumbnail lookup + carry-through to client
      library_id: libEntry.id,
      muscle_group: libEntry.muscle_group || '',
      equipment: libEntry.equipment || '',
      image_url: libEntry.thumbnail_url || libEntry.image_url || '',
    } : base;
    setWorkouts(w => w.map((wk, i) => i !== dayIdx ? wk : { ...wk, exercises: [...wk.exercises, ex] }));
    const newExIdx = (workouts[dayIdx]?.exercises || []).length;
    setSelectedEx({ dayIdx, exIdx: newExIdx });
    trackChange();
  };

  // Called when coach drags a library card onto a day's droppable zone
  const addExerciseFromDrag = (dayIdx, libEntry, insertIdx) => {
    const section = 'main';
    const ex = {
      ...newExercise(section),
      name: libEntry.name || '',
      video_url: libEntry.video_url || '',
      library_id: libEntry.id,
      muscle_group: libEntry.muscle_group || '',
      equipment: libEntry.equipment || '',
      image_url: libEntry.thumbnail_url || libEntry.image_url || '',
    };
    setWorkouts(w => w.map((wk, i) => {
      if (i !== dayIdx) return wk;
      const exs = [...wk.exercises];
      exs.splice(insertIdx, 0, ex);
      return { ...wk, exercises: exs };
    }));
    setSelectedEx({ dayIdx, exIdx: insertIdx });
    trackChange();
  };

  const removeExercise = (dayIdx, exIdx) => {
    setWorkouts(w => w.map((wk, i) => i !== dayIdx ? wk : { ...wk, exercises: wk.exercises.filter((_, ei) => ei !== exIdx) }));
    if (selectedEx?.dayIdx === dayIdx && selectedEx?.exIdx === exIdx) setSelectedEx(null);
    trackChange();
  };

  const updateSelectedExercise = (updatedEx) => {
    if (!selectedEx) return;
    setWorkouts(w => w.map((wk, i) => i !== selectedEx.dayIdx ? wk : {
      ...wk, exercises: wk.exercises.map((ex, ei) => ei !== selectedEx.exIdx ? ex : updatedEx)
    }));
    trackChange();
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Drag from library panel → day
    if (source.droppableId === 'lib-panel' && destination.droppableId.startsWith('ex-')) {
      const dayIdx = parseInt(destination.droppableId.replace('ex-', ''));
      const libEntry = exLibrary.find(e => `lib-${e.id}` === draggableId);
      if (libEntry) {
        addExerciseFromDrag(dayIdx, libEntry, destination.index);
      }
      return;
    }

    // Reorder within a day
    if (source.droppableId.startsWith('ex-') && destination.droppableId.startsWith('ex-')) {
      const srcDayIdx = parseInt(source.droppableId.replace('ex-', ''));
      const dstDayIdx = parseInt(destination.droppableId.replace('ex-', ''));

      if (srcDayIdx === dstDayIdx) {
        // Same day — reorder
        const exs = [...workouts[srcDayIdx].exercises];
        const [moved] = exs.splice(source.index, 1);
        exs.splice(destination.index, 0, moved);
        setWorkouts(w => w.map((wk, i) => i !== srcDayIdx ? wk : { ...wk, exercises: exs }));
      } else {
        // Move between days
        const srcExs = [...workouts[srcDayIdx].exercises];
        const dstExs = [...workouts[dstDayIdx].exercises];
        const [moved] = srcExs.splice(source.index, 1);
        dstExs.splice(destination.index, 0, moved);
        setWorkouts(w => w.map((wk, i) => {
          if (i === srcDayIdx) return { ...wk, exercises: srcExs };
          if (i === dstDayIdx) return { ...wk, exercises: dstExs };
          return wk;
        }));
        if (selectedEx?.dayIdx === srcDayIdx && selectedEx?.exIdx === source.index) {
          setSelectedEx({ dayIdx: dstDayIdx, exIdx: destination.index });
        }
      }
      trackChange();
    }
  };

  // Exercise library — for thumbnails, drag-to-add, and click-to-add
  const { data: exLibrary = [] } = useQuery({
    queryKey: ['exercise-library-map'],
    queryFn: () => base44.entities.ExerciseLibrary.list(),
    staleTime: 5 * 60 * 1000,
  });
  const exLibMap = useMemo(() => {
    const m = {};
    exLibrary.forEach(e => { if (e.name) m[e.name.toLowerCase()] = e; });
    return m;
  }, [exLibrary]);

  const updateDay = (globalIdx, patch) => {
    setWorkouts(w => w.map((wk, i) => i !== globalIdx ? wk : { ...wk, ...patch }));
    trackChange();
  };

  const selectedExData = selectedEx ? workouts[selectedEx.dayIdx]?.exercises?.[selectedEx.exIdx] || null : null;
  const canAssign = !!(savedId || existingProgram?.id);

  const diffColor = { beginner: 'var(--tc-success)', intermediate: 'var(--tc-primary)', advanced: 'var(--tc-ai)', elite: 'var(--tc-destructive)' };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--tc-muted)' }}>

      {/* ── TOP BAR ── */}
      <div className="bg-card flex-shrink-0" style={{ borderBottom: '0.5px solid var(--tc-border)' }}>
        <div className="flex items-start gap-4 px-6 py-4">
          {/* Back */}
          <button onClick={() => navigate('/programs')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mt-1 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <Input
              value={meta.title}
              onChange={e => { setMeta(m => ({ ...m, title: e.target.value })); trackChange(); }}
              placeholder="Program name..."
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-foreground font-semibold placeholder:text-[var(--tc-muted-foreground)]"
              style={{ fontSize: 18 }}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasUnsavedChanges ? 'Draft · unsaved changes' : lastSaved ? `Saved · ${lastSaved}` : 'Draft'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            {canAssign && (
              <button onClick={() => setShowAssign(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-muted-foreground transition-all">
                <Users className="w-3.5 h-3.5" /> Assign
              </button>
            )}
            <button
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-muted-foreground transition-all">
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'var(--tc-primary)' }}
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── SETTINGS CHIPS BAR ── */}
        <div className="flex items-center gap-2 px-6 pb-3 overflow-x-auto scrollbar-hide">
          {/* Chips */}
          {[
            { icon: Calendar,  text: `${meta.duration_weeks} weeks` },
            { icon: Repeat,    text: `${meta.days_per_week}× / week` },
            { icon: BarChart2, text: meta.difficulty, color: diffColor[meta.difficulty] },
            { icon: Clock,     text: `${meta.estimated_session_length} min` },
            ...(meta.category && meta.category !== 'custom' ? [{ icon: Wrench, text: meta.category.replace('_', ' ') }] : []),
          ].map((chip, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground flex-shrink-0">
              <chip.icon className="w-3 h-3 flex-shrink-0" style={{ color: chip.color || 'var(--tc-muted-foreground)' }} />
              <span className="text-xs font-medium capitalize" style={{ color: chip.color || 'var(--tc-foreground)' }}>{chip.text}</span>
            </div>
          ))}

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 ml-1 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--tc-primary)' }}
          >
            <Settings2 className="w-3.5 h-3.5" /> Edit settings
          </button>
        </div>
      </div>

      {/* ── SCHEDULE MODE + WEEK TABS ── */}
      <div className="bg-card flex-shrink-0" style={{ borderBottom: '0.5px solid var(--tc-border)' }}>

        {/* Schedule control row */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-4">
          {/* Segmented toggle */}
          <div className="flex rounded-xl overflow-hidden flex-shrink-0" style={{ border: '0.5px solid var(--tc-border)' }}>
            {[
              { mode: 'repeat',   label: 'Repeat weekly',   Icon: RefreshCw },
              { mode: 'progress', label: 'Progress weekly',  Icon: Layers },
            ].map(({ mode, label, Icon }) => {
              const active = scheduleMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => switchScheduleMode(mode)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: active ? 'var(--tc-primary)' : 'var(--tc-card)',
                    color: active ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
                    borderRight: mode === 'repeat' ? '0.5px solid var(--tc-border)' : 'none',
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Helper text */}
          {scheduleMode === 'repeat' ? (
            <p className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">
              Build one week — it repeats for all <strong className="text-foreground">{meta.duration_weeks}</strong> weeks. Edit once, applies everywhere.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground flex-1 min-w-0 truncate">
              Each week is independent — perfect for progressive overload.
            </p>
          )}
        </div>

        {/* Week tabs (progress mode only) or "Weekly template" pill (repeat mode) */}
        {scheduleMode === 'repeat' ? (
          <div className="px-6 pb-3 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0" style={{ background: 'var(--tc-sidebar)' }}>
              <RefreshCw className="w-3 h-3" />
              Weekly template
            </div>
            <span className="text-[10px] text-muted-foreground">repeats × {meta.duration_weeks}</span>
          </div>
        ) : (
          <div className="px-6 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {weeks.map((w, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => setActiveWeek(i)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: safeWeek === i ? 'var(--tc-foreground)' : 'var(--tc-muted)',
                    color: safeWeek === i ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)',
                  }}
                >
                  Week {w.weekNum}
                </button>
                {/* Copy week to... popover */}
                <Popover
                  open={copyWeekOpen === i}
                  onOpenChange={open => { setCopyWeekOpen(open ? i : null); setCopyTargets([]); }}
                >
                  <PopoverTrigger asChild>
                    <button
                      onClick={e => e.stopPropagation()}
                      className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[var(--tc-muted-foreground)] hover:text-foreground hover:bg-muted transition-colors"
                      title="Copy week to…"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" sideOffset={6} className="p-0 w-52">
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-xs font-bold text-foreground mb-2">Copy Week {w.weekNum} to…</p>
                      {/* Select all */}
                      <button
                        onClick={() => {
                          const others = weeks.map((_, idx) => idx).filter(idx => idx !== i);
                          setCopyTargets(copyTargets.length === others.length ? [] : others);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors mb-1"
                      >
                        <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                          style={{
                            background: copyTargets.length === weeks.length - 1 ? 'var(--tc-primary)' : 'var(--tc-card)',
                            borderColor: copyTargets.length === weeks.length - 1 ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)',
                          }}>
                          {copyTargets.length === weeks.length - 1 && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-xs text-foreground font-medium">Select all weeks</span>
                      </button>
                      <div className="space-y-0.5 max-h-36 overflow-y-auto">
                        {weeks.filter((_, idx) => idx !== i).map((tw, _) => {
                          const tIdx = weeks.findIndex(x => x.weekNum === tw.weekNum);
                          const checked = copyTargets.includes(tIdx);
                          return (
                            <button
                              key={tIdx}
                              onClick={() => setCopyTargets(ct => checked ? ct.filter(x => x !== tIdx) : [...ct, tIdx])}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                              <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: checked ? 'var(--tc-primary)' : 'var(--tc-card)',
                                  borderColor: checked ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)',
                                }}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-xs text-foreground">Week {tw.weekNum}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="px-3 py-2.5" style={{ borderTop: '0.5px solid var(--tc-border)' }}>
                      <button
                        onClick={() => copyWeekToTargets(i, copyTargets)}
                        disabled={copyTargets.length === 0}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
                        style={{ background: 'var(--tc-primary)' }}
                      >
                        Copy to {copyTargets.length > 0 ? `${copyTargets.length} week${copyTargets.length !== 1 ? 's' : ''}` : 'weeks'}
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
            <button
              onClick={addWeek}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
              style={{ border: '1.5px dashed var(--tc-accent)', color: 'var(--tc-primary)', background: 'transparent' }}
            >
              <Plus className="w-3 h-3" /> Week
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Exercise Library Panel ── */}
        <div className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 overflow-hidden" style={{ borderRight: '0.5px solid var(--tc-border)' }}>
          <ExerciseLibraryPanel
            onAddExercise={(libEntry) => {
              if (pickerState) {
                addExercise(pickerState.dayIdx, pickerState.section, libEntry);
                setPickerState(null);
              } else {
                // If no day selected, use most recently active day
                if (selectedEx) {
                  addExercise(selectedEx.dayIdx, 'main', libEntry);
                } else {
                  toast('Select a day first, then click + on an exercise', { icon: '👆' });
                }
              }
            }}
            targetDayName={
              pickerState != null
                ? workouts[pickerState.dayIdx]?.day_name
                : selectedEx != null
                  ? workouts[selectedEx.dayIdx]?.day_name
                  : null
            }
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto">
          {workouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-5 text-center py-24 px-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-[var(--kc-3730a3)]" />
              </div>
              <div>
                <h2 className="font-bold text-[17px] text-foreground">Start building</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {scheduleMode === 'repeat'
                    ? 'Add your weekly template to get started'
                    : 'Add your first week to get started'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (scheduleMode === 'repeat') {
                    // seed template with dpw days
                    const days = Array.from({ length: dpw }, (_, i) => newDay(i));
                    setWorkouts(days);
                    trackChange();
                  } else {
                    addWeek();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground"
                style={{ background: 'var(--tc-primary)' }}>
                <Plus className="w-4 h-4" /> {scheduleMode === 'repeat' ? 'Build template' : 'Add Week 1'}
              </button>
            </div>
          ) : scheduleMode === 'repeat' ? (
            /* ── REPEAT MODE: show the template week (first dpw workouts) ── */
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="px-6 py-5 max-w-2xl">
                {workouts.slice(0, dpw).map((day, i) => (
                  <DayCard
                    key={`tpl-${i}`}
                    day={day}
                    globalDayIdx={i}
                    isActiveDayForEx={selectedEx?.dayIdx === i}
                    selectedExIdx={selectedEx?.exIdx}
                    onSelectExercise={(exIdx) => setSelectedEx({ dayIdx: i, exIdx })}
                    onAddExercise={(section) => addExercise(i, section)}
                    onOpenPicker={(section) => setPickerState({ dayIdx: i, section })}
                    onRemoveExercise={(exIdx) => removeExercise(i, exIdx)}
                    onRemoveDay={() => removeDay(i)}
                    onDuplicateDay={() => duplicateDay(i)}
                    onUpdateDay={(patch) => updateDay(i, patch)}
                    exLibMap={exLibMap}
                  />
                ))}
                <button
                  onClick={() => { const days = [...workouts, newDay(workouts.length)]; setWorkouts(days); trackChange(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all mb-10"
                  style={{ border: '1.5px dashed var(--tc-accent)', color: 'var(--tc-primary)', background: 'transparent' }}
                >
                  <Plus className="w-4 h-4" /> Add training day
                </button>
              </div>
            </DragDropContext>
          ) : currentWeek ? (
            /* ── PROGRESS MODE: per-week editing ── */
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="px-6 py-5 max-w-2xl">
                {currentWeek.days.map((day, i) => {
                  const gIdx = currentWeek.startIdx + i;
                  return (
                    <DayCard
                      key={`day-${gIdx}`}
                      day={day}
                      globalDayIdx={gIdx}
                      isActiveDayForEx={selectedEx?.dayIdx === gIdx}
                      selectedExIdx={selectedEx?.exIdx}
                      onSelectExercise={(exIdx) => setSelectedEx({ dayIdx: gIdx, exIdx })}
                      onAddExercise={(section) => addExercise(gIdx, section)}
                      onOpenPicker={(section) => setPickerState({ dayIdx: gIdx, section })}
                      onRemoveExercise={(exIdx) => removeExercise(gIdx, exIdx)}
                      onRemoveDay={() => removeDay(gIdx)}
                      onDuplicateDay={() => duplicateDay(gIdx)}
                      onUpdateDay={(patch) => updateDay(gIdx, patch)}
                      exLibMap={exLibMap}
                    />
                  );
                })}
                <button
                  onClick={addDay}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all mb-10"
                  style={{ border: '1.5px dashed var(--tc-accent)', color: 'var(--tc-primary)', background: 'transparent' }}
                >
                  <Plus className="w-4 h-4" /> Add training day
                </button>
              </div>
            </DragDropContext>
          ) : null}
        </div>

        {/* ── RIGHT: Exercise detail panel ── */}
        {selectedExData && (
          <div className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 overflow-hidden" style={{ borderLeft: '0.5px solid var(--tc-border)' }}>
            <ExerciseDetailsPanel
              exercise={selectedExData}
              onChange={updateSelectedExercise}
              onClose={() => setSelectedEx(null)}
            />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        meta={meta}
        onMetaChange={m => { setMeta(m); trackChange(); }}
      />
      <AssignClientModal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        programId={savedId || existingProgram?.id}
        programTitle={meta.title}
      />
      <ExerciseDetailModal
        exercise={demoExercise}
        open={!!demoExercise}
        onClose={() => setDemoExercise(null)}
        onEdit={() => {}}
      />

      {/* Exercise picker modal — shown on mobile or when clicking Add exercise */}
      <ExercisePickerModal
        open={!!pickerState}
        onClose={() => setPickerState(null)}
        dayName={pickerState != null ? workouts[pickerState?.dayIdx]?.day_name : ''}
        onPickExercise={(libEntry) => {
          if (pickerState) addExercise(pickerState.dayIdx, pickerState.section, libEntry);
        }}
        onAddCustom={() => {
          if (pickerState) addExercise(pickerState.dayIdx, pickerState.section, null);
        }}
      />
    </div>
  );
}