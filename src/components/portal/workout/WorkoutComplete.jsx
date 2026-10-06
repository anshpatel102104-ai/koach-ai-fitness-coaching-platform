import React, { useEffect, useState } from 'react';
import { Star, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FocusScreen, FocusFooter } from '@/components/portal/PortalUI';

/** One short burst in brand + success colours. Functional: marks the session as saved. */
function celebrate() {
  try {
    const css = getComputedStyle(document.documentElement);
    const toHex = (v) => {
      const [r, g, b] = (css.getPropertyValue(v).trim() || '0 0 0').split(/\s+/).map(Number);
      return `#${[r, g, b].map(n => (n || 0).toString(16).padStart(2, '0')).join('')}`;
    };
    confetti({
      particleCount: 50, spread: 60, startVelocity: 32, ticks: 120, origin: { y: 0.35 },
      colors: [toHex('--brand'), toHex('--success'), toHex('--partial')],
      disableForReducedMotion: true,
    });
  } catch { /* decorative only */ }
}

export default function WorkoutComplete({ workout, exerciseLogs, durationSeconds, onClose, onMessageCoach }) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 120]);
    celebrate();
  }, []);

  const totalSets = Object.values(exerciseLogs).reduce((s, log) =>
    s + (log.sets_completed || []).filter(s => s.completed).length, 0);
  const totalVolume = Object.values(exerciseLogs).reduce((total, log) =>
    total + (log.sets_completed || []).reduce((s, set) =>
      s + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0), 0), 0);
  const exercisesCompleted = Object.values(exerciseLogs).filter(log =>
    (log.sets_completed || []).some(s => s.completed)).length;
  const totalExercises = workout?.exercises?.length || exercisesCompleted;

  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationStr = mins > 0 ? `${mins} min` : `${secs} s`;

  const stats = [
    { label: 'Time', value: mins > 0 ? mins : secs, unit: mins > 0 ? 'min' : 's' },
    { label: 'Exercises', value: `${exercisesCompleted}/${totalExercises}` },
    { label: 'Sets logged', value: totalSets },
    { label: 'Volume', value: totalVolume > 0 ? totalVolume.toLocaleString() : '–', unit: totalVolume > 0 ? 'lb' : '' },
  ];

  return (
    <FocusScreen>
      <div className="flex-1 overflow-y-auto px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 32px)' }}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-7 w-7" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-[36px] text-foreground">Session logged</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {workout?.day_name ? `${workout.day_name}, ${durationStr}. ` : ''}Your coach sees every set.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border shadow-[0_0_0_1px_rgb(var(--border))]">
          {stats.map(({ label, value, unit }) => (
            <div key={label} className="bg-card px-4 py-3.5">
              <p className="text-[13px] text-muted-foreground">{label}</p>
              <p className="num mt-1 text-[28px] text-foreground">
                {value}{unit && <span className="ml-1 text-[15px] text-muted-foreground">{unit}</span>}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mt-7 text-xl text-foreground">How did it feel?</h2>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Rate this session">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} of 5`}
              onClick={() => setRating(n)} className="touch-compact p-1">
              <Star className={cn('h-8 w-8', n <= rating ? 'fill-foreground text-foreground' : 'text-input')} />
            </button>
          ))}
        </div>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Anything for your coach? A PR, a tweak, something that hurt."
          rows={3}
          className="mt-3 text-base"
        />
        <div className="h-6" />
      </div>

      <FocusFooter>
        <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={() => onClose(rating, note)}>
          Save and finish
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={onMessageCoach}>Message coach</Button>
          <Button variant="outline" size="lg" onClick={() => { onClose(rating, note); navigate('/portal/nutrition'); }}>Save and log food</Button>
        </div>
      </FocusFooter>
    </FocusScreen>
  );
}
