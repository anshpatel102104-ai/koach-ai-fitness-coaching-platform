import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Play, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FocusScreen, FocusFooter } from '@/components/portal/PortalUI';
import ExerciseInfoSheet from './ExerciseInfoSheet';

/* ── Wake Lock ── */
function useWakeLock() {
  const ref = useRef(null);
  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => { ref.current = lock; }).catch(() => {});
    }
    return () => { ref.current?.release().catch(() => {}); };
  }, []);
}

/* ── Haptic ── */
function haptic(type = 'light') {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(30);
    else if (type === 'medium') navigator.vibrate(60);
    else if (type === 'heavy') navigator.vibrate([40, 20, 40]);
    else if (type === 'success') navigator.vibrate([30, 20, 60, 20, 30]);
  }
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/* ── Elapsed timer ── */
function WorkoutTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return <span className="num text-[30px] text-foreground" aria-label="Elapsed time">{m}:{s}</span>;
}

/* ── Rest timer: ink bar under the set table ── */
function RestTimerBar({ seconds, nextSetNumber, onSkip, onDone }) {
  const [rem, setRem] = useState(seconds);
  const doneRef = useRef(false);
  useEffect(() => {
    const iv = setInterval(() => {
      setRem(r => {
        if (r <= 1) {
          clearInterval(iv);
          if (!doneRef.current) { doneRef.current = true; haptic('heavy'); onDone?.(); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-sidebar px-4 py-3 text-white dark:ring-1 dark:ring-inset dark:ring-white/10" role="timer" aria-live="polite">
      <p className="flex-1 text-[15px] text-white/90">Rest before set {nextSetNumber}</p>
      <span className="num text-[30px] text-white">{mmss(rem)}</span>
      <button type="button" onClick={() => { haptic('light'); setRem(r => r + 30); }}
        className="touch-compact h-9 rounded-md border border-white/25 px-2.5 text-[13px] font-semibold hover:bg-white/10">
        +30 s
      </button>
      <button type="button" onClick={() => { haptic('light'); onSkip(); }}
        className="touch-compact h-9 rounded-md px-1.5 text-[13px] font-semibold text-white/80 underline underline-offset-4">
        Skip
      </button>
    </div>
  );
}

/* ── End workout confirm (bottom sheet) ── */
function EndConfirmModal({ onConfirm, onCancel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
      onClick={onCancel}>
      <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} transition={{ type: 'tween', duration: 0.2 }}
        className="w-full max-w-[480px] rounded-t-xl bg-card px-5 pt-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-[26px] text-foreground">End this workout?</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">The sets you've logged so far are kept and sent to your coach.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={onCancel}>Keep going</Button>
          <Button size="lg" onClick={onConfirm}>End workout</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── −/+ stepper with long-press and quick chips ── */
function Stepper({ label, onChange, chips }) {
  const pressRef = useRef(null);
  const startLongPress = (delta) => {
    let speed = 1;
    let count = 0;
    pressRef.current = setInterval(() => {
      count++;
      if (count > 10) speed = 3;
      if (count > 25) speed = 5;
      onChange(v => Math.max(0, v + delta * speed));
      haptic('light');
    }, 80);
  };
  const stopLongPress = () => clearInterval(pressRef.current);
  const btn = 'touch-compact inline-flex h-9 items-center justify-center rounded-md border border-input bg-card text-foreground hover:bg-accent';

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 text-[13px] text-muted-foreground">{label}</span>
      <button type="button" aria-label={`Less ${label.toLowerCase()}`}
        onPointerDown={() => startLongPress(-1)} onPointerUp={stopLongPress} onPointerLeave={stopLongPress}
        onClick={() => { onChange(v => Math.max(0, v - 1)); haptic('light'); }}
        className={cn(btn, 'w-9')}><Minus className="h-4 w-4" /></button>
      <button type="button" aria-label={`More ${label.toLowerCase()}`}
        onPointerDown={() => startLongPress(1)} onPointerUp={stopLongPress} onPointerLeave={stopLongPress}
        onClick={() => { onChange(v => v + 1); haptic('light'); }}
        className={cn(btn, 'w-9')}><Plus className="h-4 w-4" /></button>
      <span className="ml-1 flex gap-1.5">
        {chips.map(c => (
          <button key={c} type="button" onClick={() => { onChange(v => v + c); haptic('light'); }}
            className={cn(btn, 'px-2.5 text-[13px] font-semibold tabular-nums')}>
            +{c}
          </button>
        ))}
      </span>
    </div>
  );
}

/* ── One exercise: header, set table, rest bar, footer ── */
function ExercisePanel({ exercise, exIdx, totalEx, exerciseLogs, prevBest, extraSets, onAddSet, onLogSet, onPrev, onNext, onFinish, onEnd }) {
  const log = exerciseLogs[exIdx] || {};
  const setsDone = (log.sets_completed || []).filter(s => s.completed).length;
  const totalSets = (exercise.sets || 3) + (extraSets || 0);
  const currentSetIdx = Math.min(setsDone, totalSets - 1);
  const allDone = setsDone >= totalSets;
  const isLast = exIdx >= totalEx - 1;

  const [weight, setWeight] = useState(() => {
    const prev = log.sets_completed?.[currentSetIdx];
    return prev?.weight || (prevBest?.weight || 0);
  });
  const [reps, setReps] = useState(() => {
    const prev = log.sets_completed?.[currentSetIdx];
    return prev?.reps || (prevBest?.reps || (parseInt(exercise.reps, 10) || 10));
  });
  const [showRest, setShowRest] = useState(false);
  const [logFlash, setLogFlash] = useState(false);
  const [unit, setUnit] = useState('lb');
  const [showInfo, setShowInfo] = useState(false);

  const restSec = exercise.rest_seconds || 90;
  const hasMedia = !!(exercise.video_url || exercise.image_url);

  const handleLogSet = () => {
    if (allDone) return;
    haptic('success');
    setLogFlash(true);
    setTimeout(() => setLogFlash(false), 600);
    onLogSet(exIdx, currentSetIdx, weight, reps);
    if (currentSetIdx < totalSets - 1) {
      setTimeout(() => setShowRest(true), 200);
    }
  };

  const prescription = [
    `${exercise.sets || 3} sets of ${exercise.reps || 10}`,
    exercise.rpe ? `aim for RPE ${exercise.rpe}` : null,
  ].filter(Boolean).join(', ');

  const primary = !allDone
    ? { label: logFlash ? 'Logged' : `Log set ${currentSetIdx + 1}`, onClick: handleLogSet }
    : isLast
      ? { label: 'Finish workout', onClick: onFinish }
      : { label: 'Next exercise', onClick: onNext };

  const cellInput = 'num h-11 w-full rounded-lg border-2 border-foreground bg-card text-center text-[20px] text-foreground focus:outline-none focus:border-brand';

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Demo tile (only when the exercise has media) */}
        {hasMedia && (
          <button type="button" onClick={() => setShowInfo(true)}
            className="relative mt-4 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-xl bg-sidebar text-white">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
            </span>
            <span className="absolute bottom-3 left-3 text-[13px] text-white/85">
              {exercise.video_url ? 'Demo video' : 'How to do it'}
            </span>
          </button>
        )}

        <h1 className="mt-5 text-[32px] text-foreground">{exercise.name}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {prescription}. Rest {restSec} s.
          {prevBest ? ` Last time: ${prevBest.weight} lb × ${prevBest.reps}.` : ''}
          {exercise.tempo ? ` Tempo ${exercise.tempo}.` : ''}
        </p>

        {exercise.notes && (
          <div className="mt-4 rounded-lg bg-secondary px-4 py-3 text-[15px] leading-snug text-foreground">
            <span className="font-bold">Coach note:</span> {exercise.notes}
          </div>
        )}

        {/* Set table */}
        <div className="mt-5" role="table" aria-label="Sets">
          <div role="row" className="grid grid-cols-[28px_1fr_76px_64px_44px] items-center gap-2 pb-2 text-[13px] text-muted-foreground">
            <span role="columnheader">Set</span>
            <span role="columnheader">Last time</span>
            <button type="button" role="columnheader" onClick={() => setUnit(u => u === 'lb' ? 'kg' : 'lb')}
              className="touch-compact text-left underline decoration-dotted underline-offset-4" title="Switch unit">
              {unit}
            </button>
            <span role="columnheader">Reps</span>
            <span role="columnheader" className="text-right">Done</span>
          </div>
          {Array.from({ length: totalSets }).map((_, i) => {
            const setLog = log.sets_completed?.[i];
            const done = !!setLog?.completed;
            const isCurrent = !allDone && i === currentSetIdx;
            const isPR = done && prevBest?.weight && setLog.weight > prevBest.weight;
            return (
              <div key={i} role="row" className="grid grid-cols-[28px_1fr_76px_64px_44px] items-center gap-2 border-t border-border py-2.5">
                <span className="num text-[20px] text-foreground">{i + 1}</span>
                <span className="text-[15px] text-muted-foreground tabular-nums truncate">
                  {prevBest ? `${prevBest.weight} × ${prevBest.reps}` : '–'}
                  {isPR && <span className="ml-1.5 text-[13px] font-semibold text-success">PR</span>}
                </span>
                {isCurrent ? (
                  <>
                    <input type="number" inputMode="decimal" aria-label={`Weight in ${unit}`}
                      value={weight || ''} placeholder="0"
                      onChange={e => setWeight(parseFloat(e.target.value) || 0)} className={cellInput} />
                    <input type="number" inputMode="numeric" aria-label="Reps"
                      value={reps || ''} placeholder="0"
                      onChange={e => setReps(parseFloat(e.target.value) || 0)} className={cellInput} />
                  </>
                ) : (
                  <>
                    <span className={cn('text-[15px] font-semibold tabular-nums', done ? 'text-foreground' : 'text-muted-foreground')}>
                      {done ? (setLog.weight || 0) : (weight || '–')}
                    </span>
                    <span className={cn('text-[15px] font-semibold tabular-nums', done ? 'text-foreground' : 'text-muted-foreground')}>
                      {done ? (setLog.reps || 0) : (exercise.reps || reps)}
                    </span>
                  </>
                )}
                <span className="flex justify-end">
                  {done ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-white" aria-label="Done">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : isCurrent ? (
                    <button type="button" onClick={handleLogSet} aria-label={`Log set ${i + 1}`}
                      className="touch-compact h-9 w-9 rounded-full border-2 border-input hover:border-foreground" />
                  ) : (
                    <span className="h-9 w-9 rounded-full border-2 border-input" aria-hidden />
                  )}
                </span>
              </div>
            );
          })}
          <div className="border-t border-border pt-2.5">
            <button type="button" onClick={onAddSet} className="touch-compact text-sm font-semibold text-foreground underline underline-offset-4">
              Add a set
            </button>
          </div>
        </div>

        {/* Rest timer */}
        <AnimatePresence>
          {showRest && (
            <RestTimerBar
              seconds={restSec}
              nextSetNumber={currentSetIdx + 1}
              onSkip={() => setShowRest(false)}
              onDone={() => setShowRest(false)}
            />
          )}
        </AnimatePresence>

        {/* Fine adjust for the current set */}
        {!allDone && (
          <div className="mt-4 space-y-2 rounded-xl border border-border p-3">
            <Stepper label="Weight" onChange={setWeight} chips={[2.5, 5, 10]} />
            <Stepper label="Reps" onChange={setReps} chips={[1, 2, 5]} />
          </div>
        )}

        {allDone && (
          <p className="mt-4 text-[15px] font-semibold text-success">
            All {totalSets} sets logged.{isLast ? ' That was the last exercise.' : ''}
          </p>
        )}
      </div>

      <FocusFooter>
        <Button
          variant="brand" size="lg"
          className={cn('h-[52px] w-full text-base font-bold', logFlash && 'bg-success text-white hover:bg-success')}
          onClick={primary.onClick}
        >
          {logFlash && <Check className="h-4 w-4" strokeWidth={3} />}
          {primary.label}
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={onPrev} disabled={exIdx === 0}>Previous</Button>
          {isLast
            ? <Button variant="outline" size="lg" onClick={onEnd}>End workout</Button>
            : <Button variant="outline" size="lg" onClick={onNext}>Next exercise</Button>}
        </div>
      </FocusFooter>

      <ExerciseInfoSheet exercise={exercise} open={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
}

/* ── MAIN ACTIVE WORKOUT ── */
export default function ActiveWorkout({ workout, onFinish, onExit }) {
  useWakeLock();
  const exercises = workout?.exercises || [];
  const [exIdx, setExIdx] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState({});
  const [extraSets, setExtraSets] = useState({});
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const startTime = useRef(Date.now());

  const logSet = useCallback((eIdx, setIdx, weight, reps) => {
    setExerciseLogs(prev => {
      const exLog = prev[eIdx] || { sets_completed: [] };
      const sets = [...(exLog.sets_completed || [])];
      sets[setIdx] = { set_number: setIdx + 1, weight, reps, completed: true };
      return { ...prev, [eIdx]: { ...exLog, sets_completed: sets } };
    });
  }, []);

  const setsFor = (i) => (exercises[i]?.sets || 3) + (extraSets[i] || 0);
  const isExerciseDone = (i) => ((exerciseLogs[i]?.sets_completed || []).filter(s => s.completed).length) >= setsFor(i);

  const currentEx = exercises[exIdx];

  return (
    <FocusScreen>
      {/* Top bar */}
      <div className="flex-shrink-0 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowEndConfirm(true)} aria-label="End or leave workout"
            className="touch-compact inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-accent">
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold text-foreground">{workout?.day_name || 'Workout'}</p>
            <p className="text-[13px] text-muted-foreground">Exercise {Math.min(exIdx + 1, exercises.length)} of {exercises.length}</p>
          </div>
          <WorkoutTimer startTime={startTime.current} />
        </div>

        {/* Progress segments: ink = done or current, grey = to come */}
        <div className="mt-3 flex gap-1.5 pb-3">
          {exercises.map((ex, i) => (
            <button key={i} type="button" onClick={() => setExIdx(i)} aria-label={`Go to ${ex.name}`}
              className={cn('touch-compact h-1.5 flex-1 rounded-full !p-0 transition-colors',
                isExerciseDone(i) || i === exIdx ? 'bg-foreground' : 'bg-secondary')} />
          ))}
        </div>
      </div>
      <div className="h-px flex-shrink-0 bg-border" />

      {currentEx ? (
        <ExercisePanel
          key={exIdx}
          exercise={currentEx}
          exIdx={exIdx}
          totalEx={exercises.length}
          exerciseLogs={exerciseLogs}
          prevBest={null}
          extraSets={extraSets[exIdx] || 0}
          onAddSet={() => setExtraSets(prev => ({ ...prev, [exIdx]: (prev[exIdx] || 0) + 1 }))}
          onLogSet={logSet}
          onPrev={() => setExIdx(i => Math.max(0, i - 1))}
          onNext={() => { haptic('medium'); setExIdx(i => Math.min(exercises.length - 1, i + 1)); }}
          onFinish={() => onFinish(exerciseLogs)}
          onEnd={() => setShowEndConfirm(true)}
        />
      ) : (
        <div className="flex-1 px-4 py-8">
          <p className="text-[15px] text-muted-foreground">This session has no exercises yet. Ask your coach to add some.</p>
          <Button variant="outline" className="mt-4" onClick={onExit}>Back to Train</Button>
        </div>
      )}

      {/* End confirm */}
      <AnimatePresence>
        {showEndConfirm && (
          <EndConfirmModal
            onConfirm={() => { setShowEndConfirm(false); onFinish(exerciseLogs); }}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}
      </AnimatePresence>
    </FocusScreen>
  );
}
