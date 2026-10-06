import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Play, Pause, RotateCcw, Check, Loader2,
  ChevronDown, ChevronUp, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SignedVideo } from '@/components/shared/SignedImage';

/* ── Rest Timer: ink bar ── */
function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); onDone?.(); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setRemaining(seconds); };
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-sidebar px-4 py-3 text-white dark:ring-1 dark:ring-inset dark:ring-white/10">
      <p className="flex-1 text-[15px] text-white/90">Rest <span className="text-white/60">({seconds} s)</span></p>
      <span className="num text-[28px]">{mins}:{secs.toString().padStart(2, '0')}</span>
      <button type="button" onClick={() => setRunning(r => !r)} aria-label={running ? 'Pause' : 'Start'}
        className="touch-compact flex h-9 w-9 items-center justify-center rounded-md border border-white/25 hover:bg-white/10">
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </button>
      <button type="button" onClick={reset} aria-label="Reset"
        className="touch-compact flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/10">
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── Exercise card (client view) ── */
function ExerciseCard({ ex, exIdx, log, onLogSet }) {
  const [expanded, setExpanded] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const completedSets = (log?.sets_completed || []).filter(s => s.completed).length;
  const allDone = completedSets === ex.sets;

  return (
    <section className="panel overflow-hidden">
      {/* Header */}
      <button type="button" className="flex w-full items-center gap-3 px-4 py-3.5 text-left" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
        <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
          allDone ? 'bg-success text-white' : 'bg-secondary text-foreground')}>
          {allDone ? <Check className="h-4 w-4" strokeWidth={3} /> : exIdx + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold text-foreground">{ex.name}</span>
          <span className="block text-[13px] text-muted-foreground">
            {ex.sets} sets of {ex.reps}
            {ex.rpe && `, RPE ${ex.rpe}`}
            {ex.tempo && `, tempo ${ex.tempo}`}
          </span>
        </span>
        <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{completedSets}/{ex.sets}</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          {/* Video embed */}
          {(ex.video_url || ex._library_exercise?.video_url) && (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-sidebar">
              {(ex.video_url || '').includes('youtube') || (ex._library_exercise?.video_url || '').includes('youtube') ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(ex.video_url || ex._library_exercise?.video_url || '')}`}
                  className="h-full w-full"
                  title={`${ex.name} demo`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen
                />
              ) : (
                <SignedVideo src={ex.video_url || ex._library_exercise?.video_url} controls className="h-full w-full object-cover" />
              )}
            </div>
          )}

          {/* Coaching notes */}
          {ex.notes && (
            <div className="rounded-lg bg-secondary px-4 py-3 text-[15px] leading-snug text-foreground">
              <span className="font-bold">Coach note:</span> {ex.notes}
            </div>
          )}

          {/* Set logger */}
          <div role="table" aria-label={`${ex.name} sets`}>
            <div role="row" className="grid grid-cols-[32px_1fr_1fr_44px] items-center gap-2 pb-2 text-[13px] text-muted-foreground">
              <span role="columnheader">Set</span>
              <span role="columnheader">lb</span>
              <span role="columnheader">Reps</span>
              <span role="columnheader" className="text-right">Done</span>
            </div>
            {Array.from({ length: ex.sets }).map((_, setIdx) => {
              const setLog = log?.sets_completed?.[setIdx] || {};
              const done = !!setLog.completed;
              return (
                <div key={setIdx} role="row" className="grid grid-cols-[32px_1fr_1fr_44px] items-center gap-2 border-t border-border py-2">
                  <span className="num text-[20px] text-foreground">{setIdx + 1}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`Set ${setIdx + 1} weight`}
                    value={setLog.weight || ''}
                    onChange={e => onLogSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                    className="num h-11 text-center text-lg"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={String(ex.reps ?? '')}
                    aria-label={`Set ${setIdx + 1} reps`}
                    value={setLog.reps || ''}
                    onChange={e => onLogSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                    className="num h-11 text-center text-lg"
                  />
                  <button type="button" onClick={() => onLogSet(exIdx, setIdx, 'completed', !done)}
                    aria-label={done ? `Undo set ${setIdx + 1}` : `Mark set ${setIdx + 1} done`}
                    className={cn('touch-compact ml-auto flex h-9 w-9 items-center justify-center rounded-full',
                      done ? 'bg-success text-white' : 'border-2 border-input hover:border-foreground')}>
                    {done && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Rest timer */}
          {ex.rest_seconds > 0 && (
            <div>
              <button type="button" onClick={() => setShowTimer(v => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-foreground underline underline-offset-4">
                <Timer className="h-4 w-4" />
                {showTimer ? 'Hide rest timer' : `Rest timer, ${ex.rest_seconds} s`}
              </button>
              {showTimer && (
                <div className="mt-2">
                  <RestTimer seconds={ex.rest_seconds} onDone={() => toast.success('Rest is up. Start your next set.')} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function getYouTubeId(url = '') {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : '';
}

/* ── Session complete sheet ── */
function CompleteModal({ open, onClose, onSubmit }) {
  const [rating, setRating] = useState(7);
  const [note, setNote] = useState('');
  return open ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-[480px] rounded-t-xl bg-card p-5 sm:rounded-xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        <h2 className="text-[28px] text-foreground">Finish session</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Rate the effort and leave your coach a note.</p>

        <p className="mt-5 text-[13px] text-muted-foreground">How hard was it? <span className="font-semibold text-foreground">{rating} of 10</span></p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-pressed={n === rating}
              className={cn('touch-compact num h-11 rounded-lg text-xl transition-colors',
                n === rating ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent')}>
              {n}
            </button>
          ))}
        </div>

        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="How did it feel? Any PRs? Anything hurt?"
          rows={3}
          className="mt-4 text-base"
        />

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>Not yet</Button>
          <Button size="lg" className="flex-1" onClick={() => onSubmit(rating, note)}>Save session</Button>
        </div>
      </div>
    </div>
  ) : null;
}

/* ── Main client workout page ── */
export default function ClientWorkoutView() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const programId = urlParams.get('program');
  const dayIdx = parseInt(urlParams.get('day') || '0', 10);

  const [user, setUser] = useState(null);
  const [exerciseLogs, setExerciseLogs] = useState({}); // { exIdx: { sets_completed: [] } }
  const [startTime] = useState(Date.now());
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => { me().then(setUser).catch(() => {}); }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['cwv-client', user?.email],
    queryFn: () => db.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: programId }).then(r => r[0]),
    enabled: !!programId,
  });

  const workout = program?.workouts?.[dayIdx];
  const exercises = workout?.exercises || [];

  const saveMutation = useMutation({
    mutationFn: (data) => db.entities.WorkoutSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout_sessions'] });
      toast.success('Session logged');
      navigate(-1);
    },
  });

  const logSet = (exIdx, setIdx, field, value) => {
    setExerciseLogs(prev => {
      const exLog = prev[exIdx] || { sets_completed: [] };
      const sets = [...(exLog.sets_completed || [])];
      if (!sets[setIdx]) sets[setIdx] = { set_number: setIdx + 1, weight: 0, reps: 0, completed: false };
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      return { ...prev, [exIdx]: { ...exLog, sets_completed: sets } };
    });
  };

  const totalSets = exercises.reduce((s, ex) => s + (ex.sets || 0), 0);
  const doneSets = Object.values(exerciseLogs).reduce((s, log) =>
    s + (log.sets_completed || []).filter(s => s.completed).length, 0);
  const progress = totalSets > 0 ? doneSets / totalSets : 0;

  const handleComplete = (rating, note) => {
    if (!myClient?.id) { toast.error('Still loading your profile. Try again in a moment.'); return; }
    const durationMinutes = Math.round((Date.now() - startTime) / 60000);
    saveMutation.mutate({
      client_id: myClient.id,
      program_id: programId,
      workout_day_name: workout?.day_name || '',
      workout_day_index: dayIdx,
      completed_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      session_rating: rating,
      session_note: note,
      exercise_logs: exercises.map((ex, i) => ({
        exercise_name: ex.name,
        sets_completed: exerciseLogs[i]?.sets_completed || [],
      })),
    });
    setShowComplete(false);
  };

  if (!program || !workout) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading workout</p>
    </div>
  );

  const exDone = (i) => ((exerciseLogs[i]?.sets_completed || []).filter(x => x.completed).length) >= (exercises[i]?.sets || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto min-h-screen max-w-[560px] bg-background">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-border bg-card px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Back"
              className="touch-compact flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold text-foreground">{workout.day_name}</p>
              <p className="truncate text-[13px] text-muted-foreground">{program.title}, {exercises.length} exercises</p>
            </div>
            <p className="num text-[24px] text-foreground">{doneSets}<span className="text-muted-foreground">/{totalSets}</span></p>
          </div>
          <div className="mt-3 flex gap-1.5">
            {exercises.map((ex, i) => (
              <span key={i} className={cn('h-1.5 flex-1 rounded-full', exDone(i) ? 'bg-foreground' : 'bg-secondary')} />
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-3 px-4 py-4">
          {exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={exIdx}
              ex={ex}
              exIdx={exIdx}
              log={exerciseLogs[exIdx]}
              onLogSet={logSet}
            />
          ))}
        </div>

        {/* Finish */}
        <div className="sticky bottom-0 border-t border-border bg-card px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <Button variant="brand" size="lg" className="h-[52px] w-full text-base font-bold" onClick={() => setShowComplete(true)}>
            {progress === 1 ? 'Finish session' : `Finish session (${Math.round(progress * 100)}% logged)`}
          </Button>
        </div>
      </div>

      <CompleteModal
        open={showComplete}
        onClose={() => setShowComplete(false)}
        onSubmit={handleComplete}
      />
    </div>
  );
}
