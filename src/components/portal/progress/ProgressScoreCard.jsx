import React, { useMemo } from 'react';
import { differenceInWeeks } from 'date-fns';

function calcScore(checkIns, workoutSessions, foodLogs) {
  if (!checkIns.length) return { total: 0, fitness: 0, nutrition: 0, consistency: 0, mindset: 0 };

  // Fitness: avg training compliance from check-ins
  const ciWithTraining = checkIns.filter(ci => ci.compliance_training != null);
  const fitness = ciWithTraining.length
    ? Math.min(100, ciWithTraining.reduce((s, ci) => s + ci.compliance_training, 0) / ciWithTraining.length)
    : Math.min(100, (workoutSessions.length / Math.max(1, differenceInWeeks(new Date(), new Date(checkIns[0]?.date || Date.now())) * 3)) * 100);

  // Nutrition: avg nutrition compliance
  const ciWithNutrition = checkIns.filter(ci => ci.compliance_nutrition != null);
  const nutrition = ciWithNutrition.length
    ? Math.min(100, ciWithNutrition.reduce((s, ci) => s + ci.compliance_nutrition, 0) / ciWithNutrition.length)
    : Math.min(100, (foodLogs.length / Math.max(1, differenceInWeeks(new Date(), new Date(checkIns[0]?.date || Date.now())) * 7)) * 100);

  // Consistency: check-in frequency
  const weeksActive = Math.max(1, differenceInWeeks(new Date(), new Date(checkIns[0]?.date || Date.now())) + 1);
  const consistency = Math.min(100, (checkIns.length / weeksActive) * 100);

  // Mindset: avg energy/mood score
  const moodMap = { great: 100, good: 80, okay: 60, tired: 40, stressed: 30 };
  const ciWithMood = checkIns.filter(ci => ci.mood);
  const mindset = ciWithMood.length
    ? ciWithMood.reduce((s, ci) => s + (moodMap[ci.mood] || 60), 0) / ciWithMood.length
    : 60;

  const total = Math.round((fitness * 0.3 + nutrition * 0.3 + consistency * 0.25 + mindset * 0.15));
  return { total, fitness: Math.round(fitness), nutrition: Math.round(nutrition), consistency: Math.round(consistency), mindset: Math.round(mindset) };
}

function getMotivationalLabel(score) {
  if (score >= 80) return "On a roll";
  if (score >= 60) return "Good momentum";
  if (score >= 40) return "Building habits ";
  return "Every journey starts here ";
}

function CircleRing({ score, size = 120, strokeWidth = 10, color = 'rgb(var(--primary))' }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--secondary))" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 1s ease' }} />
    </svg>
  );
}

function MiniBar({ label, value, color }) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground text-xs font-semibold">{label}</span>
        <span className="text-foreground text-[12px] font-bold">{value}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'rgb(var(--secondary))' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ProgressScoreCard({ checkIns, workoutSessions, foodLogs, client }) {
  const scores = useMemo(() => calcScore(checkIns, workoutSessions, foodLogs), [checkIns, workoutSessions, foodLogs]);

  // Compare to last week's check-ins
  const lastWeekCheckIns = checkIns.filter(ci => {
    const d = new Date(ci.date);
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 14);
    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
    return d >= oneWeekAgo && d < twoWeeksAgo;
  });
  const lastWeekScore = lastWeekCheckIns.length ? calcScore(lastWeekCheckIns, workoutSessions, foodLogs).total : null;
  const trend = lastWeekScore == null ? null : scores.total > lastWeekScore + 2 ? 'up' : scores.total < lastWeekScore - 2 ? 'down' : 'same';

  const label = getMotivationalLabel(scores.total);

  return (
    <div className="rounded-xl p-5" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--primary) / 0.2)' }}>
      <p className="text-muted-foreground text-xs font-semibold mb-4">Overall Score</p>

      <div className="flex items-center gap-5">
        {/* Big ring */}
        <div className="relative flex-shrink-0">
          <CircleRing score={scores.total} size={110} strokeWidth={9} color="rgb(var(--primary))" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-foreground font-black text-3xl leading-none">{scores.total}</span>
            <span className="text-muted-foreground text-[12px] font-semibold">/100</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-foreground text-sm font-bold leading-tight">{label}</p>
          {trend && (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold" style={{ color: trend === 'up' ? 'rgb(var(--success))' : trend === 'down' ? 'rgb(var(--destructive))' : 'rgb(var(--muted-foreground))' }}>
                {trend === 'up' ? '↑ Improved' : trend === 'down' ? '↓ Dropped' : '→ Same'} vs last week
              </span>
            </div>
          )}
          <div className="space-y-1.5 pt-1">
            <MiniBar label="Fitness" value={scores.fitness} color="rgb(var(--primary))" />
            <MiniBar label="Nutrition" value={scores.nutrition} color="rgb(var(--success))" />
            <MiniBar label="Consistency" value={scores.consistency} color="rgb(var(--warning))" />
            <MiniBar label="Mindset" value={scores.mindset} color="rgb(var(--foreground))" />
          </div>
        </div>
      </div>
    </div>
  );
}