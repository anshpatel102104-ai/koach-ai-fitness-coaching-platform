import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Play, Pause, RotateCcw, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Timer, Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/* ── Rest Timer ── */
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
  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex items-center gap-3 p-3 bg-sidebar rounded-2xl border border-white/10">
      {/* Circular progress */}
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="color-mix(in srgb, white 8%, transparent)" strokeWidth="4" />
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--tc-primary)" strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
            strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xs">{mins}:{secs.toString().padStart(2,'0')}</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-white text-xs font-semibold">Rest Timer</p>
        <p className="text-white/40 text-[10px]">{seconds}s programmed</p>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => setRunning(r => !r)}
          className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
        </button>
        <button onClick={reset} className="w-9 h-9 rounded-xl bg-[var(--kc-w-10)] flex items-center justify-center text-white/60">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Exercise Card (client view) ── */
function ExerciseCard({ ex, exIdx, log, onLogSet }) {
  const [expanded, setExpanded] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const completedSets = (log?.sets_completed || []).filter(s => s.completed).length;
  const allDone = completedSets === ex.sets;

  return (
    <div className={cn('rounded-2xl overflow-hidden border', allDone ? 'border-success bg-success/50' : 'border-border bg-card')}>
      {/* Header */}
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left" onClick={() => setExpanded(v => !v)}>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
          allDone ? 'bg-success text-white' : 'bg-accent/10 text-primary')}>
          {allDone ? <CheckCircle2 className="w-4 h-4" /> : exIdx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{ex.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ex.sets} sets × {ex.reps} reps
            {ex.tempo && ` · Tempo ${ex.tempo}`}
            {ex.rpe && ` · RPE ${ex.rpe}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
            allDone ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground')}>
            {completedSets}/{ex.sets}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--kc-f5f7fb)] px-4 pb-4 space-y-3">
          {/* Video embed */}
          {(ex.video_url || ex._library_exercise?.video_url) && (
            <div className="mt-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                {(ex.video_url || '').includes('youtube') || (ex._library_exercise?.video_url || '').includes('youtube') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(ex.video_url || ex._library_exercise?.video_url || '')}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    allowFullScreen
                  />
                ) : (
                  <video src={ex.video_url || ex._library_exercise?.video_url} controls className="w-full h-full object-cover" />
                )}
              </div>
            </div>
          )}

          {/* Coaching notes */}
          {ex.notes && (
            <div className="p-3 bg-warning/10 border border-warning rounded-xl">
              <p className="text-[10px] font-bold text-warning uppercase tracking-wider mb-1">Coach Notes</p>
              <p className="text-xs text-foreground leading-relaxed">{ex.notes}</p>
            </div>
          )}

          {/* Set logger */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Set</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Weight</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Reps</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Done</span>
            </div>
            {Array.from({ length: ex.sets }).map((_, setIdx) => {
              const setLog = log?.sets_completed?.[setIdx] || {};
              const done = !!setLog.completed;
              return (
                <div key={setIdx} className={cn('grid grid-cols-4 gap-2 items-center p-2 rounded-xl transition-colors',
                  done ? 'bg-success/10' : 'bg-muted')}>
                  <span className={cn('text-sm font-bold', done ? 'text-success' : 'text-muted-foreground')}>
                    {setIdx + 1}
                  </span>
                  <Input
                    type="number"
                    placeholder="lbs"
                    value={setLog.weight || ''}
                    onChange={e => onLogSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                    className={cn('h-8 text-center text-xs border-border p-1', done && 'border-success bg-success/10')}
                  />
                  <Input
                    type="number"
                    placeholder={ex.reps}
                    value={setLog.reps || ''}
                    onChange={e => onLogSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                    className={cn('h-8 text-center text-xs border-border p-1', done && 'border-success bg-success/10')}
                  />
                  <button onClick={() => onLogSet(exIdx, setIdx, 'completed', !done)}
                    className="flex justify-center">
                    {done
                      ? <CheckCircle2 className="w-6 h-6 text-success" />
                      : <Circle className="w-6 h-6 text-muted-foreground" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Rest timer */}
          {ex.rest_seconds > 0 && (
            <div>
              <button onClick={() => setShowTimer(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Timer className="w-3.5 h-3.5" />
                Rest timer ({ex.rest_seconds}s)
                {showTimer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showTimer && (
                <div className="mt-2">
                  <RestTimer seconds={ex.rest_seconds} onDone={() => toast.success('Rest done! Start your next set 💪')} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getYouTubeId(url = '') {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : '';
}

/* ── Session Complete Modal ── */
function CompleteModal({ open, onClose, onSubmit }) {
  const [rating, setRating] = useState(7);
  const [note, setNote] = useState('');
  return open ? (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <h2 className="font-bold text-xl text-foreground">Session Complete!</h2>
          <p className="text-sm text-muted-foreground mt-1">Great work. Log how it felt.</p>
        </div>

        {/* Rating */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2 text-center">How hard was today? <span className="text-primary">{rating}/10</span></p>
          <div className="flex gap-1.5 justify-center flex-wrap">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={cn('w-9 h-9 rounded-xl text-sm font-bold border transition-all',
                  n === rating ? 'bg-primary text-primary-foreground border-primary' :
                  n <= 3 ? 'border-success text-success hover:bg-success/10' :
                  n <= 7 ? 'border-warning text-warning hover:bg-warning/10' :
                  'border-destructive text-destructive hover:bg-destructive/10')}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Session note (optional) — how did it feel? any PRs?"
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-border resize-none focus:outline-none focus:border-primary/40 text-foreground"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Skip</Button>
          <Button className="flex-1 gap-2" onClick={() => onSubmit(rating, note)}>
            <CheckCircle2 className="w-4 h-4" /> Save Session
          </Button>
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
    queryFn: () => base44.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: () => base44.entities.WorkoutProgram.filter({ id: programId }).then(r => r[0]),
    enabled: !!programId,
  });

  const workout = program?.workouts?.[dayIdx];
  const exercises = workout?.exercises || [];

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkoutSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout_sessions'] });
      toast.success('Session logged! 🔥');
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
    if (!myClient?.id) { toast.error('Still loading your profile — try again in a moment'); return; }
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading workout…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-secondary">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{workout.day_name}</p>
            <p className="text-xs text-muted-foreground">{program.title} · {exercises.length} exercises</p>
          </div>
          <button onClick={() => setShowComplete(true)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
              progress === 1 ? 'bg-success text-white' : 'bg-primary text-primary-foreground')}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {progress === 1 ? 'Finish!' : 'Complete'}
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-accent/10">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="px-4 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{doneSets} of {totalSets} sets done</span>
          <span className="text-[10px] font-semibold text-primary">{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* Exercises */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={exIdx}
            ex={ex}
            exIdx={exIdx}
            log={exerciseLogs[exIdx]}
            onLogSet={logSet}
          />
        ))}

        {/* Finish CTA */}
        <div className="pt-2 pb-8">
          <Button className="w-full h-12 text-base gap-2 rounded-2xl" onClick={() => setShowComplete(true)}>
            <Trophy className="w-5 h-5" /> Finish Session
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