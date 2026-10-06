import React, { useState, useMemo } from 'react';
import { format, parseISO, getWeek, startOfYear, eachDayOfInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

function buildHeatmap(sessions) {
  const dateSet = new Set();
  for (const s of sessions) {
    if (s.completed_at) dateSet.add(s.completed_at.slice(0, 10));
  }

  const year = new Date().getFullYear();
  const days = eachDayOfInterval({ start: startOfYear(new Date(year, 0, 1)), end: new Date() });
  const weeks = {};
  for (const d of days) {
    const w = getWeek(d, { weekStartsOn: 0 });
    if (!weeks[w]) weeks[w] = Array(7).fill(null);
    const dow = d.getDay();
    const ds = format(d, 'yyyy-MM-dd');
    weeks[w][dow] = { date: ds, active: dateSet.has(ds) };
  }
  return Object.values(weeks);
}

function WorkoutHeatmap({ sessions }) {
  const weeks = useMemo(() => buildHeatmap(sessions), [sessions]);
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div key={di}
                title={day?.date || ''}
                className={cn('w-3 h-3 rounded-sm',
                  day === null ? 'bg-transparent' :
                  day.active ? 'bg-success' : 'bg-border'
                )} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProgressPerformanceTab({ client, sessions, checkIns }) {
  const [selectedExercise, setSelectedExercise] = useState('');

  const sorted = useMemo(() =>
    [...sessions].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at)),
    [sessions]
  );

  const streak = useMemo(() => {
    const dates = [...new Set(sessions.map(s => s.completed_at?.slice(0, 10)).filter(Boolean))].sort();
    let count = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      const d = new Date(dates[i]);
      const expected = new Date();
      expected.setDate(expected.getDate() - (dates.length - 1 - i));
      if (d.toDateString() === expected.toDateString()) count++;
      else break;
    }
    return count;
  }, [sessions]);

  // Extract personal bests
  const personalBests = useMemo(() => {
    const bests = {};
    const thisMonth = new Date();
    thisMonth.setDate(1);
    for (const session of sorted) {
      for (const exLog of (session.exercise_logs || [])) {
        const name = exLog.exercise_name;
        if (!name) continue;
        for (const set of (exLog.sets_completed || [])) {
          if (!set.weight || !set.reps) continue;
          const vol = set.weight * set.reps;
          const isNew = new Date(session.completed_at) >= thisMonth;
          if (!bests[name] || vol > bests[name].vol) {
            bests[name] = { name, weight: set.weight, reps: set.reps, vol, date: session.completed_at, isNew };
          }
        }
      }
    }
    return Object.values(bests).sort((a, b) => b.vol - a.vol);
  }, [sorted]);

  const exercises = useMemo(() => {
    const set = new Set();
    for (const s of sorted) for (const e of (s.exercise_logs || [])) if (e.exercise_name) set.add(e.exercise_name);
    return Array.from(set);
  }, [sorted]);

  const exerciseChart = useMemo(() => {
    if (!selectedExercise) return [];
    return sorted
      .filter(s => s.exercise_logs?.some(e => e.exercise_name === selectedExercise))
      .map(s => {
        const exLog = s.exercise_logs.find(e => e.exercise_name === selectedExercise);
        const maxSet = (exLog.sets_completed || []).reduce((best, set) => {
          if (set.weight && set.reps && (set.weight * set.reps) > (best?.weight * best?.reps || 0)) return set;
          return best;
        }, null);
        if (!maxSet) return null;
        return { date: format(parseISO(s.completed_at.slice(0, 10)), 'MMM d'), weight: maxSet.weight, reps: maxSet.reps };
      }).filter(Boolean);
  }, [sorted, selectedExercise]);

  const TOOLTIP = {
    contentStyle: { background: 'var(--tc-card)', border: '1px solid var(--tc-border)', borderRadius: '8px', fontSize: 12 },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Personal Bests */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[18px] text-foreground">Personal bests</h3>
        </div>
        {personalBests.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-muted-foreground">No workout data logged yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-background">
                <tr>
                  {['Exercise', 'Best Weight', 'Best Reps', 'Volume (w×r)', 'Date', 'PR'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {personalBests.slice(0, 15).map((pb, i) => (
                  <tr key={i} className="border-t border-muted hover:bg-background">
                    <td className="px-4 py-2 text-foreground font-medium">{pb.name}</td>
                    <td className="px-4 py-2 text-foreground">{pb.weight} lbs</td>
                    <td className="px-4 py-2 text-foreground">{pb.reps}</td>
                    <td className="px-4 py-2 text-foreground">{Math.round(pb.vol)}</td>
                    <td className="px-4 py-2 text-foreground">{pb.date ? format(parseISO(pb.date.slice(0, 10)), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-2">
                      {pb.isNew && <span className="text-xs"><span className="text-warning font-bold">New PR</span></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exercise Strength Chart */}
      {exercises.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-[18px] text-foreground">Strength progress</h3>
            <select
              value={selectedExercise}
              onChange={e => setSelectedExercise(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select exercise...</option>
              {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          {exerciseChart.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={exerciseChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-muted)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP} formatter={(v, n) => [`${v} lbs`, 'Max Weight']} />
                <Line type="monotone" dataKey="weight" stroke="var(--tc-primary)" strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--tc-primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
              {selectedExercise ? 'Not enough data for this exercise' : 'Select an exercise above'}
            </div>
          )}
        </div>
      )}

      {/* Workout Consistency Heatmap */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] text-foreground">Workout consistency</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-border" />
              <span>Rest</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-success" />
              <span>Workout</span>
            </div>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">No workouts logged yet</div>
        ) : (
          <>
            <WorkoutHeatmap sessions={sessions} />
            <div className="mt-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              <span className="text-xs text-foreground font-medium">Current streak: <span className="font-bold text-foreground">{streak} day{streak !== 1 ? 's' : ''}</span></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}