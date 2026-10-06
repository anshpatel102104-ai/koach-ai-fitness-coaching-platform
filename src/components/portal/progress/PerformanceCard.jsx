import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Dumbbell } from 'lucide-react';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(13,17,28,0.95)', border: '1px solid rgb(var(--border))' }}>
      <p className="text-foreground font-bold">{payload[0].value} lbs</p>
      <p className="text-muted-foreground">{payload[0].payload.date}</p>
    </div>
  );
}

export default function PerformanceCard({ workoutSessions }) {
  const [selectedExercise, setSelectedExercise] = useState('');

  // Build personal bests and exercise history
  const { personalBests, exercises, chartData } = useMemo(() => {
    const pbs = {};
    const allExercises = new Set();

    workoutSessions.forEach(session => {
      (session.exercise_logs || []).forEach(log => {
        const name = log.exercise_name;
        allExercises.add(name);
        (log.sets_completed || []).forEach(set => {
          if (!set.weight || !set.reps) return;
          if (!pbs[name] || set.weight > pbs[name].weight || (set.weight === pbs[name].weight && set.reps > pbs[name].reps)) {
            pbs[name] = { weight: set.weight, reps: set.reps, date: session.completed_at };
          }
        });
      });
    });

    const sortedExercises = [...allExercises];
    const defaultEx = selectedExercise || sortedExercises[0] || '';

    // Chart data for selected exercise
    const chart = [];
    workoutSessions.forEach(session => {
      const log = (session.exercise_logs || []).find(l => l.exercise_name === defaultEx);
      if (!log) return;
      const maxSet = (log.sets_completed || []).reduce((best, s) => {
        if (!s.weight) return best;
        return !best || s.weight > best.weight ? s : best;
      }, null);
      if (maxSet) {
        chart.push({
          date: format(new Date(session.completed_at), 'MMM d'),
          weight: maxSet.weight,
        });
      }
    });

    return {
      personalBests: pbs,
      exercises: sortedExercises,
      chartData: chart.sort((a, b) => new Date(a.date) - new Date(b.date)),
    };
  }, [workoutSessions, selectedExercise]);

  const pbList = Object.entries(personalBests)
    .sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
    .slice(0, 6);

  const isNew = (date) => {
    const d = new Date(date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d > weekAgo;
  };

  if (!workoutSessions.length) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
        <p className="text-foreground font-bold text-sm mb-3">My Performance</p>
        <div className="py-8 text-center">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs">Complete your first workout to start building your performance history</p>
        </div>
      </div>
    );
  }

  const currentEx = selectedExercise || exercises[0] || '';

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
      <p className="text-foreground font-bold text-sm mb-3">My Performance</p>

      {/* Personal Bests */}
      {pbList.length > 0 && (
        <div className="space-y-1.5 mb-4">
          <p className="text-muted-foreground text-xs font-semibold">Personal Bests</p>
          {pbList.map(([name, pb]) => (
            <div key={name} className="flex items-center gap-3 py-2 px-3 rounded-xl"
              style={{ background: 'rgb(var(--secondary))' }}>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-xs font-semibold truncate">{name}</p>
                <p className="text-muted-foreground text-[12px]">{format(new Date(pb.date), 'MMM d, yyyy')}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-foreground font-bold text-sm">{pb.weight} lbs × {pb.reps}</span>
                {isNew(pb.date) && (
                  <span className="text-[12px] font-black px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(252,211,77,0.2)', color: 'rgb(var(--warning))' }}>NEW</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strength Progress Chart */}
      {exercises.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground text-xs font-semibold">Strength Progress</p>
            <select value={currentEx} onChange={e => setSelectedExercise(e.target.value)}
              className="text-[12px] text-foreground bg-transparent border border-border rounded-lg px-2 py-1 focus:outline-none">
              {exercises.map(ex => <option key={ex} value={ex} style={{ background: 'rgb(var(--foreground))' }}>{ex}</option>)}
            </select>
          </div>
          {chartData.length >= 2 ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 8 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="weight" stroke="rgb(var(--foreground))" strokeWidth={2} dot={false}
                    activeDot={{ r: 4, fill: 'rgb(var(--primary))', stroke: 'rgb(var(--card))', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-[12px] text-center py-4">Log more {currentEx} sessions to see your progress</p>
          )}
        </>
      )}

      {/* Consistency heatmap */}
      <div className="mt-4">
        <p className="text-muted-foreground text-xs font-semibold mb-2">Workout Heatmap</p>
        <WorkoutHeatmap sessions={workoutSessions} />
      </div>
    </div>
  );
}

function WorkoutHeatmap({ sessions }) {
  const sessionDates = useMemo(() => new Set(sessions.map(s => format(new Date(s.completed_at), 'yyyy-MM-dd'))), [sessions]);

  const weeks = 12;
  const days = [];
  const now = new Date();
  for (let w = weeks - 1; w >= 0; w--) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (w * 7 + (6 - d)));
      const key = format(date, 'yyyy-MM-dd');
      weekDays.push({ key, hasWorkout: sessionDates.has(key), isToday: key === format(now, 'yyyy-MM-dd') });
    }
    days.push(weekDays);
  }

  return (
    <div className="flex gap-0.5">
      {days.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map(day => (
            <div key={day.key} className="w-4 h-4 rounded-sm"
              style={{
                background: day.hasWorkout ? 'rgb(var(--primary))' : 'rgb(var(--secondary))',
                border: day.isToday ? '1px solid rgb(var(--primary) / 0.5)' : 'none',
              }} />
          ))}
        </div>
      ))}
    </div>
  );
}