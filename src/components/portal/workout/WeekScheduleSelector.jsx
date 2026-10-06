import React from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });

/** Week strip of day tiles. Selected day = ink, today = brand dot, done = green check, missed = red dot. */
export default function WeekScheduleSelector({ program, workoutSessions, selectedDay, onSelectDay }) {
  const workouts = program?.workouts || [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getStatus = (day) => {
    const isToday = isSameDay(day, today);
    const isPast = day < today && !isToday;
    const done = workoutSessions?.some(s => {
      if (!s.completed_at) return false;
      const d = new Date(s.completed_at);
      return isSameDay(d, day);
    });
    if (done) return 'done';
    if (isToday) return 'today';
    if (isPast) return 'missed';
    return 'upcoming';
  };

  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="This week">
      {days.map((day, i) => {
        const w = workouts.length ? workouts[i % workouts.length] : null;
        const isRest = !w || w.day_name?.toLowerCase().includes('rest');
        const status = getStatus(day);
        const isSelected = selectedDay === i;
        const isTodayTile = isSameDay(day, today);
        const label = isRest ? 'Rest' : ((w?.day_name || '').split(/\s+/).filter(Boolean).map(p => p[0].toUpperCase()).join('').slice(0, 3) || 'Day');

        return (
          <button
            key={i}
            type="button"
            role="tab"
            title={isRest ? 'Rest' : w?.day_name}
            aria-selected={isSelected}
            onClick={() => onSelectDay(i)}
            className={cn(
              'touch-compact relative flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-0.5 pt-2 pb-2 transition-colors',
              isSelected ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))] hover:bg-accent',
            )}
          >
            <span className={cn('text-[12px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{format(day, 'EEE')}</span>
            <span className="num text-[22px]">{format(day, 'd')}</span>
            <span className={cn('w-full truncate text-center text-[11px] leading-tight', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{label}</span>
            <span className="mt-1 flex h-4 items-center justify-center">
              {status === 'done' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
              )}
              {status === 'missed' && !isRest && <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Missed" />}
              {isTodayTile && status !== 'done' && <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="Today" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
