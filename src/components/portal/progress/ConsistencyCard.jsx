import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subWeeks } from 'date-fns';

function Ring({ pct, size = 72, color, label, value }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--secondary))" strokeWidth="7" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-foreground font-bold text-sm">{value}%</span>
        </div>
      </div>
      <span className="text-muted-foreground text-[12px] font-semibold text-center leading-tight">{label}</span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(13,17,28,0.95)', border: '1px solid rgb(var(--border))' }}>
      <p className="text-foreground font-bold">{Math.round(payload[0].value)}%</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

export default function ConsistencyCard({ checkIns, workoutSessions, foodLogs }) {
  const { workoutAdh, nutritionAdh, checkInAdh, weeklyData, bestWeek } = useMemo(() => {
    const totalWeeks = Math.max(4, Math.ceil(checkIns.length / 1));
    const expectedWorkoutsPerWeek = 3;

    // Workout adherence
    const sessionsLast4 = workoutSessions.filter(s => new Date(s.completed_at) >= subWeeks(new Date(), 4));
    const workoutAdh = Math.min(100, Math.round((sessionsLast4.length / (4 * expectedWorkoutsPerWeek)) * 100));

    // Nutrition adherence (days with food logs in last 4 weeks)
    const foodDates = new Set(foodLogs.map(f => f.logged_date));
    const totalDays = 28;
    const loggedDays = [...foodDates].filter(d => new Date(d) >= subWeeks(new Date(), 4)).length;
    const nutritionAdh = Math.min(100, Math.round((loggedDays / totalDays) * 100));

    // Check-in adherence (last 8 weeks)
    const checkInsLast8 = checkIns.filter(ci => new Date(ci.date) >= subWeeks(new Date(), 8));
    const checkInAdh = Math.min(100, Math.round((checkInsLast8.length / 8) * 100));

    // 4-week bar chart: overall adherence per week
    const weeklyData = [];
    let bestWeek = null;
    let bestPct = 0;
    for (let i = 3; i >= 0; i--) {
      const start = subWeeks(new Date(), i + 1);
      const end = subWeeks(new Date(), i);
      const wSessions = workoutSessions.filter(s => new Date(s.completed_at) >= start && new Date(s.completed_at) < end).length;
      const wFoods = new Set(foodLogs.filter(f => new Date(f.logged_date) >= start && new Date(f.logged_date) < end).map(f => f.logged_date)).size;
      const wCheckIns = checkIns.filter(ci => new Date(ci.date) >= start && new Date(ci.date) < end).length;
      const pct = Math.min(100, Math.round(((wSessions / expectedWorkoutsPerWeek) * 40 + (wFoods / 7) * 40 + wCheckIns * 20)));
      const label = format(start, 'MMM d');
      weeklyData.push({ week: label, pct });
      if (pct > bestPct) { bestPct = pct; bestWeek = label; }
    }

    return { workoutAdh, nutritionAdh, checkInAdh, weeklyData, bestWeek };
  }, [checkIns, workoutSessions, foodLogs]);

  const overall = Math.round((workoutAdh + nutritionAdh + checkInAdh) / 3);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
      <p className="text-foreground font-bold text-sm mb-4">My Consistency</p>

      {/* Rings row */}
      <div className="flex items-center justify-around mb-4">
        <Ring pct={workoutAdh} value={workoutAdh} color="rgb(var(--primary))" label="Workouts" />
        <div className="text-center">
          <p className="text-foreground font-black text-3xl">{overall}%</p>
          <p className="text-muted-foreground text-[12px] font-semibold">Overall</p>
        </div>
        <Ring pct={nutritionAdh} value={nutritionAdh} color="rgb(var(--success))" label="Nutrition" />
        <Ring pct={checkInAdh} value={checkInAdh} color="rgb(var(--warning))" label="Check-ins" />
      </div>

      {/* Best week */}
      {bestWeek && (
        <div className="p-2.5 rounded-xl mb-3 text-center"
          style={{ background: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.15)' }}>
          <p className="text-[12px] text-warning/70">
            Your best week was <strong className="text-warning">week of {bestWeek}</strong>!
          </p>
        </div>
      )}

      {/* 4-week bar chart */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
            <XAxis dataKey="week" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pct" fill="rgb(var(--primary) / 0.4)" radius={[4, 4, 0, 0]}
              label={{ position: 'top', formatter: v => `${Math.round(v)}%`, fill: 'rgb(var(--muted-foreground))', fontSize: 8 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}