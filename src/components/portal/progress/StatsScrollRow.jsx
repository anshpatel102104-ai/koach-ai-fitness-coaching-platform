import React, { useMemo } from 'react';

function StatCard({ emoji, label, value, sub, color = 'rgb(var(--primary))' }) {
  return (
    <div className="flex-shrink-0 w-32 p-3 rounded-xl" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
      <div className="text-xl mb-1">{emoji}</div>
      <p className="text-foreground font-bold text-lg leading-none" style={{ color }}>{value ?? '—'}</p>
      {sub && <p className="text-[12px] mt-0.5" style={{ color: sub.startsWith('-') ? 'rgb(var(--success))' : sub.startsWith('+') ? 'rgb(var(--warning))' : 'rgb(var(--muted-foreground))' }}>{sub}</p>}
      <p className="text-muted-foreground text-xs mt-0.5 font-semibold">{label}</p>
    </div>
  );
}

export default function StatsScrollRow({ client, checkIns, workoutSessions, badges }) {
  const stats = useMemo(() => {
    const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const currentWeight = last?.weight ?? client?.current_weight;
    const startWeight = first?.weight;
    const change = startWeight && currentWeight ? (currentWeight - startWeight) : null;
    const changeStr = change != null ? `${change > 0 ? '+' : ''}${change.toFixed(1)} lbs` : null;

    // Streak: consecutive weeks with check-ins
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 52; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const hasCI = checkIns.some(ci => {
        const d = new Date(ci.date);
        return d >= weekStart && d < weekEnd;
      });
      if (hasCI) streak++;
      else break;
    }

    return {
      currentWeight: currentWeight ? `${currentWeight} lbs` : null,
      change: changeStr,
      streak,
      workouts: workoutSessions.length,
      checkIns: checkIns.length,
      achievements: badges.length,
    };
  }, [client, checkIns, workoutSessions, badges]);

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
      <StatCard emoji="" label="Current Weight" value={stats.currentWeight} sub={stats.change} color="rgb(var(--primary))" />
      <StatCard emoji="" label="Total Change" value={stats.change || '—'} color={stats.change?.startsWith('-') ? 'rgb(var(--success))' : 'rgb(var(--warning))'} />
      <StatCard emoji="" label="Week Streak" value={stats.streak} color="rgb(var(--foreground))" />
      <StatCard emoji="" label="Workouts Done" value={stats.workouts} color="rgb(var(--foreground))" />
      <StatCard emoji="" label="Check-ins" value={stats.checkIns} color="rgb(var(--success))" />
      <StatCard emoji="" label="Achievements" value={stats.achievements} color="rgb(var(--warning))" />
    </div>
  );
}