import React, { useMemo } from 'react';
import { Pencil, Trash2, Flame, EyeOff } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// Last N days as YYYY-MM-DD strings (today first in reverse, or oldest-first for display)
function getRecentDays(n = 7) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }
  return days; // oldest → newest (left → right)
}

// Is this date a scheduled day for this habit?
function isScheduled(habit, dateStr) {
  if (habit.frequency === 'daily') return true;
  const dow = parseISO(dateStr).getDay(); // 0=Sun
  return (habit.days_of_week || []).includes(dow);
}

// Compute streak (consecutive scheduled days completed, counting back from today)
function computeStreak(habit, completionsMap) {
  let streak = 0;
  let cursor = new Date();
  // Walk back up to 365 days
  for (let i = 0; i < 365; i++) {
    const dateStr = format(cursor, 'yyyy-MM-dd');
    if (!isScheduled(habit, dateStr)) {
      cursor = subDays(cursor, 1);
      continue;
    }
    if (completionsMap[dateStr]) {
      streak++;
      cursor = subDays(cursor, 1);
    } else {
      break;
    }
  }
  return streak;
}

// Completion % over the last 7 scheduled days
function computeAdherence(habit, completionsMap, windowDays = 7) {
  const days = getRecentDays(windowDays);
  const scheduled = days.filter(d => isScheduled(habit, d));
  if (scheduled.length === 0) return 0;
  const done = scheduled.filter(d => completionsMap[d]).length;
  return Math.round((done / scheduled.length) * 100);
}

export default function HabitCard({ habit, completions, onToggleDay, onEdit, onDelete }) {
  const recentDays = useMemo(() => getRecentDays(7), []);

  // Map date → completed boolean for quick lookup
  const completionsMap = useMemo(() => {
    const m = {};
    (completions || []).forEach(c => { if (c.completed) m[c.date] = true; });
    return m;
  }, [completions]);

  const streak    = useMemo(() => computeStreak(habit, completionsMap), [habit, completionsMap]);
  const adherence = useMemo(() => computeAdherence(habit, completionsMap), [habit, completionsMap]);

  const isInactive = habit.is_active === false;

  // Frequency label
  const freqLabel = habit.frequency === 'daily'
    ? 'Every day'
    : (habit.days_of_week || []).sort().map(d => DAY_LABELS[d]).join(' · ');

  return (
    <div className={`bg-card rounded-xl border p-4 transition-opacity ${isInactive ? 'opacity-50 border-border' : 'border-border'}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {habit.emoji && <span className="text-xl flex-shrink-0">{habit.emoji}</span>}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">{habit.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{freqLabel}</p>
          </div>
          {isInactive && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
              <EyeOff className="w-2.5 h-2.5" /> Inactive
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Streak */}
          <div className="text-center">
            <div className="flex items-center gap-0.5 justify-center">
              <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'text-warning' : 'text-border'}`} />
              <span className={`text-sm font-bold ${streak > 0 ? 'text-warning' : 'text-border'}`}>{streak}</span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold">Streak</p>
          </div>
          {/* Adherence */}
          <div className="text-center">
            <p className={`text-sm font-bold ${adherence >= 70 ? 'text-success' : adherence >= 40 ? 'text-warning' : 'text-destructive'}`}>{adherence}%</p>
            <p className="text-xs text-muted-foreground font-semibold">7-day</p>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={() => onEdit(habit)} title="Edit"
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(habit)} title="Delete"
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Day dots row */}
      <div className="flex items-end gap-1.5">
        {recentDays.map(dateStr => {
          const scheduled = isScheduled(habit, dateStr);
          const done      = !!completionsMap[dateStr];
          const today     = dateStr === format(new Date(), 'yyyy-MM-dd');
          const dow       = parseISO(dateStr).getDay();
          const label     = DAY_LABELS[dow];

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1 flex-1">
              <span className={`text-[11px] font-semibold ${today ? 'text-ai' : 'text-border'}`}>{label}</span>
              <button
                onClick={() => scheduled && onToggleDay(habit, dateStr, done)}
                disabled={!scheduled}
                title={scheduled ? (done ? 'Mark incomplete' : 'Mark complete') : 'Not scheduled'}
                className={`w-full aspect-square max-w-[28px] rounded-full border-2 transition-all ${
                  !scheduled
                    ? 'border-border bg-muted cursor-default'
                    : done
                    ? 'border-ai bg-ai hover:bg-ai'
                    : today
                    ? 'border-ai bg-card hover:bg-ai/10'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                {done && scheduled && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-card rounded-full" />
                  </div>
                )}
              </button>
              {today && (
                <span className="text-xs font-semibold text-ai">Today</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Adherence bar */}
      <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${adherence}%`,
            background: adherence >= 70 ? 'var(--tc-success)' : adherence >= 40 ? 'var(--tc-warning)' : 'var(--tc-destructive)',
          }}
        />
      </div>
    </div>
  );
}