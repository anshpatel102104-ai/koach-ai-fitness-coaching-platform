import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { DragDropContext } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Check, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Page, Panel, Segmented, EmptyState } from '@/components/kit';
import { cn } from '@/lib/utils';
import ExerciseDetailModal from '@/components/exercises/ExerciseDetailModal';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ExerciseDetailsPanel from '@/components/programs/builder/ExerciseDetailsPanel';
import ExerciseLibraryPanel from '@/components/programs/builder/ExerciseLibraryPanel';
import ExercisePickerModal from '@/components/programs/builder/ExercisePickerModal';
import DayColumn, { newExercise } from '@/components/programs/builder/DayColumn';
import { SettingsModal, AssignClientModal } from '@/components/programs/builder/BuilderDialogs';
import { limitationText, buildLimitationCheck } from '@/components/programs/builder/limitations';
import ProgramCreationModal from '@/components/programs/ProgramCreationModal';

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const newDay = (idx) => ({ day_name: `Day ${idx + 1}`, day_number: idx + 1, exercises: [] });

const defaultMeta = {
  title: '', description: '', duration_weeks: 8, difficulty: 'intermediate',
  category: 'custom', days_per_week: 4, is_template: false,
  equipment: [], tags: [], estimated_session_length: '60',
  progression_model: 'linear', deload_frequency: 'never', rest_day_notes: '',
};

const metaFromProgram = (p) => ({
  title: p.title || '',
  description: p.description || '',
  duration_weeks: p.duration_weeks || 8,
  difficulty: p.difficulty || 'intermediate',
  category: p.category || 'custom',
  days_per_week: p.days_per_week || 4,
  is_template: p.is_template || false,
  equipment: p.equipment || [],
  tags: p.tags || [],
  estimated_session_length: p.estimated_session_length || '60',
  progression_model: p.progression_model || 'linear',
  deload_frequency: p.deload_frequency || 'never',
  rest_day_notes: p.rest_day_notes || '',
});

function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return match;
}

/* ─────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────── */
export default function ProgramBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const existingProgram = location.state?.program || null;
  const clientIdParam = searchParams.get('clientId');

  const [meta, setMeta] = useState(existingProgram ? metaFromProgram(existingProgram) : { ...defaultMeta });

  const [workouts, setWorkouts] = useState(existingProgram?.workouts || []);
  const [activeWeek, setActiveWeek] = useState(0); // 0-indexed
  const [selectedEx, setSelectedEx] = useState(null); // { dayIdx, exIdx }
  const [showSettings, setShowSettings] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [demoExercise, setDemoExercise] = useState(null);
  const [savedId, setSavedId] = useState(existingProgram?.id || null);
  const [pickerState, setPickerState] = useState(null); // { dayIdx, section } — null = closed
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Schedule mode: 'repeat' = one template week, 'progress' = per-week editing
  const [scheduleMode, setScheduleMode] = useState(
    existingProgram?.schedule_mode || 'repeat'
  );
  const [copyWeekOpen, setCopyWeekOpen] = useState(null); // weekIdx being copied
  const [copyTargets, setCopyTargets] = useState([]); // selected target week indices

  useEffect(() => {
    const handler = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Load a program into the builder (AI-generated, or the client's current one).
  const applyProgram = (p) => {
    setMeta(metaFromProgram(p));
    setWorkouts(p.workouts || []);
    setScheduleMode(p.schedule_mode || 'repeat');
    setSavedId(p.id || null);
    setActiveWeek(0);
    setSelectedEx(null);
    setHasUnsavedChanges(false);
    setLastSaved(null);
    navigate(`/program-builder${location.search}`, { replace: true, state: { program: p } });
  };

  /* ── Client context: ?clientId=… (e.g. "Adjust program") or a single assigned client ── */
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
  });
  const programId = savedId || existingProgram?.id || null;
  const paramClient = clientIdParam ? clients.find(c => c.id === clientIdParam) || null : null;
  const assignedClients = programId ? clients.filter(c => c.assigned_program_id === programId) : [];
  const linkedClient = paramClient || (assignedClients.length === 1 ? assignedClients[0] : null);
  const assignTarget = paramClient && paramClient.assigned_program_id !== programId ? paramClient : null;

  // Opened for a client with no program in hand: load the one they're on.
  const loadedForClient = useRef(false);
  useEffect(() => {
    if (loadedForClient.current || existingProgram || savedId || workouts.length > 0) return;
    if (!paramClient?.assigned_program_id) return;
    loadedForClient.current = true;
    db.entities.WorkoutProgram.get(paramClient.assigned_program_id)
      .then(p => { if (p) applyProgram(p); })
      .catch(() => {});
  }, [paramClient?.assigned_program_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const limitation = useMemo(() => limitationText(linkedClient, existingProgram), [linkedClient, existingProgram]);
  const limitationCheck = useMemo(() => buildLimitationCheck(limitation), [limitation]);

  const saveMutation = useMutation({
    mutationFn: (data) => existingProgram || savedId
      ? db.entities.WorkoutProgram.update(existingProgram?.id || savedId, data)
      : db.entities.WorkoutProgram.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      if (result?.id) setSavedId(result.id);
      setLastSaved(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setHasUnsavedChanges(false);
      toast.success(existingProgram || savedId ? 'Program saved' : 'Program created');
    },
  });

  const dpw = Number(meta.days_per_week) || 4;

  const handleSave = () => {
    if (!meta.title.trim()) { toast.error('Give the program a name first'); return; }
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
      const durationWeeks = Number(meta.duration_weeks) || 8;
      const template = workouts.slice(0, dpw);
      if (template.length === 0) {
        setScheduleMode(newMode);
        return;
      }
      const allWeeks = [];
      for (let w = 0; w < durationWeeks; w++) {
        template.forEach((day) => {
          allWeeks.push({ ...day, day_name: day.day_name, exercises: day.exercises.map(e => ({ ...e })) });
        });
      }
      setWorkouts(allWeeks);
      setActiveWeek(0);
    } else {
      // switching back to repeat — just keep first week as template
      setWorkouts(w => w.slice(0, dpw));
      setActiveWeek(0);
    }
    setScheduleMode(newMode);
    trackChange();
  };

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
    toast.success(`Week ${src.weekNum} duplicated as week ${weeks.length + 1}`);
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

  // Repeat mode: the template is the first `dpw` days, so a new day goes in at
  // the end of the template and the week gets one day longer.
  const addTemplateDay = () => {
    const insertAt = Math.min(dpw, workouts.length);
    setWorkouts(w => [...w.slice(0, insertAt), newDay(insertAt), ...w.slice(insertAt)]);
    if (insertAt >= dpw) setMeta(m => ({ ...m, days_per_week: Math.min(7, dpw + 1) }));
    trackChange();
  };

  const removeDay = (globalIdx) => {
    setWorkouts(w => w.filter((_, i) => i !== globalIdx));
    if (selectedEx?.dayIdx === globalIdx) setSelectedEx(null);
    if (scheduleMode === 'repeat' && dpw > 1) setMeta(m => ({ ...m, days_per_week: dpw - 1 }));
    trackChange();
  };

  const duplicateDay = (globalIdx) => {
    const copy = { ...workouts[globalIdx], exercises: workouts[globalIdx].exercises.map(e => ({ ...e })), day_name: `${workouts[globalIdx].day_name} (Copy)` };
    const next = [...workouts.slice(0, globalIdx + 1), copy, ...workouts.slice(globalIdx + 1)];
    setWorkouts(next);
    if (scheduleMode === 'repeat' && globalIdx < dpw) setMeta(m => ({ ...m, days_per_week: Math.min(7, dpw + 1) }));
    trackChange();
  };

  const libFields = (libEntry) => ({
    name: libEntry.name || '',
    video_url: libEntry.video_url || '',
    // store library metadata for thumbnail lookup + carry-through to client
    library_id: libEntry.id,
    muscle_group: libEntry.muscle_group || '',
    equipment: libEntry.equipment || '',
    image_url: libEntry.thumbnail_url || libEntry.image_url || '',
  });

  const addExercise = (dayIdx, section = 'main', libEntry = null) => {
    const base = newExercise(section);
    const ex = libEntry ? { ...base, ...libFields(libEntry) } : base;
    setWorkouts(w => w.map((wk, i) => i !== dayIdx ? wk : { ...wk, exercises: [...wk.exercises, ex] }));
    const newExIdx = (workouts[dayIdx]?.exercises || []).length;
    setSelectedEx({ dayIdx, exIdx: newExIdx });
    trackChange();
  };

  // Called when coach drags a library row onto a day's droppable zone
  const addExerciseFromDrag = (dayIdx, libEntry, insertIdx) => {
    const ex = { ...newExercise('main'), ...libFields(libEntry) };
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

  // Exercise library — for drag-to-add, demo lookup and click-to-add
  const { data: exLibrary = [] } = useQuery({
    queryKey: ['exercise-library-map'],
    queryFn: () => db.entities.ExerciseLibrary.list(),
    staleTime: 5 * 60 * 1000,
  });
  const exLibMap = useMemo(() => {
    const m = {};
    exLibrary.forEach(e => { if (e.name) m[e.name.toLowerCase()] = e; });
    return m;
  }, [exLibrary]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Drag from library panel → day
    if (source.droppableId === 'lib-panel' && destination.droppableId.startsWith('ex-')) {
      const dayIdx = parseInt(destination.droppableId.replace('ex-', ''));
      const libEntry = exLibrary.find(e => `lib-${e.id}` === draggableId);
      if (libEntry) addExerciseFromDrag(dayIdx, libEntry, destination.index);
      return;
    }

    // Reorder within a day / move between days
    if (source.droppableId.startsWith('ex-') && destination.droppableId.startsWith('ex-')) {
      const srcDayIdx = parseInt(source.droppableId.replace('ex-', ''));
      const dstDayIdx = parseInt(destination.droppableId.replace('ex-', ''));

      if (srcDayIdx === dstDayIdx) {
        const exs = [...workouts[srcDayIdx].exercises];
        const [moved] = exs.splice(source.index, 1);
        exs.splice(destination.index, 0, moved);
        setWorkouts(w => w.map((wk, i) => i !== srcDayIdx ? wk : { ...wk, exercises: exs }));
      } else {
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

  const updateDay = (globalIdx, patch) => {
    setWorkouts(w => w.map((wk, i) => i !== globalIdx ? wk : { ...wk, ...patch }));
    trackChange();
  };

  const selectedExData = selectedEx ? workouts[selectedEx.dayIdx]?.exercises?.[selectedEx.exIdx] || null : null;
  const selectedLibEntry = selectedExData?.name ? exLibMap[selectedExData.name.toLowerCase()] : null;
  const canAssign = !!(savedId || existingProgram?.id);

  /* ── Header copy ── */
  const durationWeeks = Number(meta.duration_weeks) || 0;
  const eyebrow = linkedClient
    ? `${linkedClient.name}, ${scheduleMode === 'progress' && weeks.length > 1 ? `week ${safeWeek + 1} of ${weeks.length}` : `weeks 1 to ${durationWeeks}`}`
    : `${durationWeeks} ${durationWeeks === 1 ? 'week' : 'weeks'}, ${dpw} ${dpw === 1 ? 'day' : 'days'} a week`;
  const status = saveMutation.isPending
    ? 'Saving…'
    : hasUnsavedChanges ? 'Unsaved changes.' : lastSaved ? `Saved at ${lastSaved}.` : canAssign ? 'Saved.' : 'Draft, not saved yet.';
  const summary = [
    meta.difficulty && meta.difficulty.charAt(0).toUpperCase() + meta.difficulty.slice(1),
    meta.category && meta.category !== 'custom' && meta.category.replace(/_/g, ' '),
    meta.estimated_session_length && `${meta.estimated_session_length} min sessions`,
  ].filter(Boolean).join(', ');

  const assignLabel = assignTarget ? `Assign to ${assignTarget.name.split(' ')[0]}` : 'Assign';

  const openGenerate = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Generate a new program anyway?')) return;
    setShowGenerate(true);
  };

  const onLibraryAdd = (libEntry) => {
    if (pickerState) {
      addExercise(pickerState.dayIdx, pickerState.section, libEntry);
      setPickerState(null);
    } else if (selectedEx) {
      addExercise(selectedEx.dayIdx, 'main', libEntry);
    } else {
      toast('Pick a day first: click any exercise on it, or drag this one onto the day.');
    }
  };

  const visibleDays = scheduleMode === 'repeat'
    ? workouts.slice(0, dpw).map((day, i) => ({ day, gIdx: i, i }))
    : (currentWeek?.days || []).map((day, i) => ({ day, gIdx: currentWeek.startIdx + i, i }));

  const detailsPanel = selectedExData ? (
    <ExerciseDetailsPanel
      exercise={selectedExData}
      onChange={updateSelectedExercise}
      onClose={() => setSelectedEx(null)}
      onViewDemo={selectedLibEntry ? () => setDemoExercise(selectedLibEntry) : undefined}
      flaggedFor={limitationCheck(selectedExData.name)}
    />
  ) : null;

  return (
    <Page wide className="pb-10">
      {/* ── Header ── */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <button onClick={() => navigate('/programs')} className="-ml-1 inline-flex items-center rounded hover:text-foreground" aria-label="Back to programs">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Programs</span>
            </button>
            <span aria-hidden className="hidden sm:inline">/</span>
            <span className="truncate">{eyebrow}</span>
          </p>
          <input
            value={meta.title}
            onChange={e => { setMeta(m => ({ ...m, title: e.target.value })); trackChange(); }}
            placeholder="Name this program"
            aria-label="Program name"
            className="display -mx-1 w-full rounded-md bg-transparent px-1 text-[32px] leading-[1.1] text-foreground placeholder:text-muted-foreground/60 hover:bg-card/60 focus:bg-card focus:outline-none sm:text-[40px]"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {status}{summary && <> {summary}.</>}{' '}
            <button onClick={() => setShowSettings(true)} className="font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
              Program settings
            </button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          <Button variant="outline" onClick={openGenerate}>Generate with AI</Button>
          <Button variant={canAssign ? 'outline' : 'default'} onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : canAssign ? 'Save' : 'Save program'}
          </Button>
          {canAssign && <Button onClick={() => setShowAssign(true)}>{assignLabel}</Button>}
        </div>
      </header>

      {/* ── Week selector + limitation flag ── */}
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {scheduleMode === 'progress' && weeks.length > 0 ? (
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <Segmented
                className="h-11 min-w-0"
                options={weeks.map((w, i) => ({ value: i, label: `Week ${w.weekNum}` }))}
                value={safeWeek}
                onChange={setActiveWeek}
              />
              <Popover
                open={copyWeekOpen === safeWeek}
                onOpenChange={open => { setCopyWeekOpen(open ? safeWeek : null); setCopyTargets([]); }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">Copy week</Button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-60 p-0">
                  <div className="px-3 pt-3 pb-1">
                    <p className="mb-2 text-sm font-semibold text-foreground">Copy week {safeWeek + 1} to</p>
                    <button
                      onClick={() => {
                        const others = weeks.map((_, idx) => idx).filter(idx => idx !== safeWeek);
                        setCopyTargets(copyTargets.length === others.length ? [] : others);
                      }}
                      className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <span className={cn('flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border', copyTargets.length === weeks.length - 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card')}>
                        {copyTargets.length === weeks.length - 1 && <Check className="h-3 w-3" />}
                      </span>
                      <span className="text-sm font-medium text-foreground">Every other week</span>
                    </button>
                    <div className="max-h-40 space-y-0.5 overflow-y-auto">
                      {weeks.map((tw, tIdx) => {
                        if (tIdx === safeWeek) return null;
                        const checked = copyTargets.includes(tIdx);
                        return (
                          <button
                            key={tIdx}
                            onClick={() => setCopyTargets(ct => checked ? ct.filter(x => x !== tIdx) : [...ct, tIdx])}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                          >
                            <span className={cn('flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card')}>
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="text-sm text-foreground">Week {tw.weekNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-border px-3 py-3">
                    <Button size="sm" className="w-full" onClick={() => copyWeekToTargets(safeWeek, copyTargets)} disabled={copyTargets.length === 0}>
                      Copy to {copyTargets.length > 0 ? `${copyTargets.length} week${copyTargets.length !== 1 ? 's' : ''}` : 'weeks'}
                    </Button>
                    <button onClick={() => { duplicateWeek(safeWeek); setCopyWeekOpen(null); }} className="w-full text-center text-[13px] font-semibold text-foreground underline underline-offset-4">
                      Duplicate as a new week
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" className="flex-shrink-0" onClick={addWeek}>Add week</Button>
              {currentWeek && <Button variant="outline" size="sm" className="flex-shrink-0" onClick={addDay}>Add a day</Button>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {workouts.length > 0 ? <>One week, repeated for all <span className="font-semibold text-foreground">{durationWeeks}</span> weeks.</> : 'Build one week first.'}
              {workouts.length > 0 && (
                <>{' '}<button onClick={addTemplateDay} className="font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">Add a day</button></>
              )}
            </p>
          )}

          {limitation && (
            <div className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-destructive/10 px-3.5 py-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{limitation.replace(/\.?\s*$/, '.')} Checked on every exercise.</span>
            </div>
          )}
        </div>

        <Segmented
          size="sm"
          className="self-start xl:self-auto"
          options={[{ value: 'repeat', label: 'Same every week' }, { value: 'progress', label: 'Week by week' }]}
          value={scheduleMode}
          onChange={switchScheduleMode}
        />
      </div>

      {/* ── Board ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {workouts.length === 0 ? (
              <Panel>
                <EmptyState
                  title="No training days yet"
                  body={scheduleMode === 'repeat'
                    ? `Build one week of ${dpw} days. It repeats for all ${durationWeeks} weeks, or switch to week by week to progress it.`
                    : 'Add week 1, then copy it forward and adjust the load each week.'}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => {
                        if (scheduleMode === 'repeat') {
                          setWorkouts(Array.from({ length: dpw }, (_, i) => newDay(i)));
                          trackChange();
                        } else {
                          addWeek();
                        }
                      }}>
                        {scheduleMode === 'repeat' ? `Start with ${dpw} days` : 'Add week 1'}
                      </Button>
                      <Button variant="outline" onClick={openGenerate}>Generate with AI</Button>
                    </div>
                  }
                />
              </Panel>
            ) : (
              <div className="grid gap-4 sm:grid-flow-col sm:auto-cols-[minmax(196px,1fr)] sm:overflow-x-auto sm:pb-2">
                {visibleDays.map(({ day, gIdx, i }) => (
                  <DayColumn
                    key={`${scheduleMode}-${gIdx}`}
                    className="sm:min-h-[min(640px,calc(100vh-330px))]"
                    day={day}
                    dayLabel={day.weekday || `Day ${i + 1}`}
                    globalDayIdx={gIdx}
                    isActiveDayForEx={selectedEx?.dayIdx === gIdx}
                    selectedExIdx={selectedEx?.exIdx}
                    limitationCheck={limitationCheck}
                    onSelectExercise={(exIdx) => setSelectedEx({ dayIdx: gIdx, exIdx })}
                    onOpenPicker={(section) => setPickerState({ dayIdx: gIdx, section })}
                    onRemoveExercise={(exIdx) => removeExercise(gIdx, exIdx)}
                    onRemoveDay={() => removeDay(gIdx)}
                    onDuplicateDay={() => duplicateDay(gIdx)}
                    onUpdateDay={(patch) => updateDay(gIdx, patch)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: library, or the selected exercise ── */}
          <aside className="sticky top-[92px] hidden h-[calc(100vh-108px)] max-h-[860px] w-[280px] flex-shrink-0 lg:block">
            {isDesktop && detailsPanel ? detailsPanel : (
              <ExerciseLibraryPanel
                onAddExercise={onLibraryAdd}
                limitationCheck={limitationCheck}
                targetDayName={
                  pickerState != null
                    ? workouts[pickerState.dayIdx]?.day_name
                    : selectedEx != null
                      ? workouts[selectedEx.dayIdx]?.day_name
                      : null
                }
              />
            )}
          </aside>
        </div>
      </DragDropContext>

      {/* Mobile: exercise details as a sheet */}
      {!isDesktop && (
        <Dialog open={!!selectedExData} onOpenChange={v => !v && setSelectedEx(null)}>
          <DialogContent className="h-[85dvh] p-0 sm:max-w-md sm:p-0 [&>button]:hidden">
            <DialogTitle className="sr-only">Exercise details</DialogTitle>
            {detailsPanel}
          </DialogContent>
        </Dialog>
      )}

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
        initialClientId={assignTarget?.id || null}
      />
      <ExerciseDetailModal
        exercise={demoExercise}
        open={!!demoExercise}
        onClose={() => setDemoExercise(null)}
      />
      <ProgramCreationModal
        open={showGenerate}
        initialMode="ai"
        onOpenChange={setShowGenerate}
        onProgramCreated={(program) => {
          queryClient.invalidateQueries({ queryKey: ['programs'] });
          setShowGenerate(false);
          if (program?.id) applyProgram(program);
        }}
      />

      {/* Exercise picker — "Add exercise" on any day */}
      <ExercisePickerModal
        open={!!pickerState}
        onClose={() => setPickerState(null)}
        dayName={pickerState != null ? workouts[pickerState?.dayIdx]?.day_name : ''}
        limitationCheck={limitationCheck}
        onPickExercise={(libEntry) => {
          if (pickerState) addExercise(pickerState.dayIdx, pickerState.section, libEntry);
        }}
        onAddCustom={() => {
          if (pickerState) addExercise(pickerState.dayIdx, pickerState.section, null);
        }}
      />
    </Page>
  );
}
