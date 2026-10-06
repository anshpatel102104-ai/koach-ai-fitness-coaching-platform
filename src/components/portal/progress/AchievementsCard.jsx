import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_ACHIEVEMENTS = [
  // Streaks
  { id: 'streak_7', emoji: '', name: '7-Day Streak', desc: 'Check in 7 weeks in a row', cat: 'Streaks', req: (_, cis) => streakWeeks(cis) >= 7 },
  { id: 'streak_30', emoji: '', name: '30-Day Streak', desc: 'Check in 30 weeks in a row', cat: 'Streaks', req: (_, cis) => streakWeeks(cis) >= 30 },
  { id: 'streak_90', emoji: '', name: '90-Day Streak', desc: 'Check in 90 weeks in a row', cat: 'Streaks', req: (_, cis) => streakWeeks(cis) >= 90 },
  // Workouts
  { id: 'workout_first', emoji: '', name: 'First Workout', desc: 'Complete your first workout', cat: 'Workouts', req: (sessions) => sessions.length >= 1 },
  { id: 'workout_10', emoji: '', name: '10 Workouts', desc: 'Complete 10 workouts', cat: 'Workouts', req: (sessions) => sessions.length >= 10 },
  { id: 'workout_50', emoji: '', name: '50 Workouts', desc: 'Complete 50 workouts', cat: 'Workouts', req: (sessions) => sessions.length >= 50 },
  { id: 'workout_100', emoji: '', name: '100 Workouts', desc: 'Complete 100 workouts', cat: 'Workouts', req: (sessions) => sessions.length >= 100 },
  // Weight
  { id: 'weight_1', emoji: '', name: 'First lb Lost', desc: 'Lose your first pound', cat: 'Weight', req: (_, cis, client) => weightLost(cis, client) >= 1 },
  { id: 'weight_5', emoji: '', name: '5 lbs Lost', desc: 'Lose 5 pounds', cat: 'Weight', req: (_, cis, client) => weightLost(cis, client) >= 5 },
  { id: 'weight_10', emoji: '', name: '10 lbs Lost', desc: 'Lose 10 pounds', cat: 'Weight', req: (_, cis, client) => weightLost(cis, client) >= 10 },
  { id: 'weight_25', emoji: '', name: '25 lbs Lost', desc: 'Lose 25 pounds', cat: 'Weight', req: (_, cis, client) => weightLost(cis, client) >= 25 },
  // Check-ins
  { id: 'checkin_first', emoji: '', name: 'First Check-in', desc: 'Submit your first check-in', cat: 'Check-ins', req: (_, cis) => cis.length >= 1 },
  { id: 'checkin_5', emoji: '', name: '5 Check-ins', desc: 'Submit 5 check-ins', cat: 'Check-ins', req: (_, cis) => cis.length >= 5 },
  { id: 'checkin_10', emoji: '', name: '10 Check-ins', desc: 'Submit 10 check-ins', cat: 'Check-ins', req: (_, cis) => cis.length >= 10 },
  { id: 'checkin_50', emoji: '', name: '50 Check-ins', desc: 'Submit 50 check-ins', cat: 'Check-ins', req: (_, cis) => cis.length >= 50 },
  // Performance
  { id: 'pr_first', emoji: '', name: 'First PR', desc: 'Set your first personal record', cat: 'Performance', req: (sessions) => hasPR(sessions) },
];

function streakWeeks(checkIns) {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 200; i++) {
    const start = new Date(now); start.setDate(now.getDate() - (i + 1) * 7);
    const end = new Date(now); end.setDate(now.getDate() - i * 7);
    if (checkIns.some(ci => { const d = new Date(ci.date); return d >= start && d < end; })) streak++;
    else break;
  }
  return streak;
}

function weightLost(checkIns, client) {
  const withWeight = checkIns.filter(ci => ci.weight);
  if (!withWeight.length) return 0;
  const first = withWeight[0].weight;
  const last = withWeight[withWeight.length - 1].weight;
  return Math.max(0, first - last);
}

function hasPR(sessions) {
  const bests = {};
  for (const s of sessions) {
    for (const log of (s.exercise_logs || [])) {
      for (const set of (log.sets_completed || [])) {
        if (!set.weight) continue;
        if (!bests[log.exercise_name] || set.weight > bests[log.exercise_name]) {
          bests[log.exercise_name] = set.weight;
        }
      }
    }
  }
  return Object.keys(bests).length > 0;
}

function BadgeModal({ badge, earned, onClose }) {
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="w-full max-w-sm m-4 p-6 rounded-xl text-center"
          style={{ background: 'rgb(var(--sidebar))', border: '1px solid rgb(var(--border))' }}
          initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
          onClick={e => e.stopPropagation()}>
          <div className="text-5xl mb-3" style={{ filter: earned ? 'none' : 'grayscale(100%)' }}>{badge.emoji}</div>
          <p className="text-foreground font-bold text-lg">{badge.name}</p>
          <p className="text-muted-foreground text-sm mt-1">{badge.desc}</p>
          {earned ? (
            <p className="text-success text-xs mt-2 font-semibold">Earned</p>
          ) : (
            <p className="text-muted-foreground text-xs mt-2">Keep going to unlock this achievement</p>
          )}
          <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl text-sm font-bold text-foreground"
            style={{ background: 'rgb(var(--border))' }}>Close</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AchievementsCard({ badges, checkIns, workoutSessions, client }) {
  const [selectedBadge, setSelectedBadge] = useState(null);

  const earnedIds = useMemo(() =>
    new Set(badges.map(b => b.badge_key || b.badge_id || b.name)),
    [badges]
  );

  const achievements = useMemo(() =>
    ALL_ACHIEVEMENTS.map(a => ({
      ...a,
      earned: a.req(workoutSessions, checkIns, client),
    })),
    [workoutSessions, checkIns, client, badges]
  );

  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgb(var(--secondary))', border: '1px solid rgb(var(--secondary))' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-foreground font-bold text-sm">My Achievements</p>
        <span className="text-muted-foreground text-xs">{earned.length}/{achievements.length}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[...earned, ...locked].map(a => (
          <button key={a.id} onClick={() => setSelectedBadge(a)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
            style={{ background: a.earned ? 'rgba(252,211,77,0.08)' : 'rgb(var(--secondary))' }}>
            <div className="text-2xl" style={{ filter: a.earned ? 'none' : 'grayscale(100%) opacity(0.3)' }}>{a.emoji}</div>
            <p className="text-[12px] font-semibold text-center leading-tight"
              style={{ color: a.earned ? 'rgba(252,211,77,0.8)' : 'rgb(var(--muted-foreground))' }}>
              {a.name}
            </p>
          </button>
        ))}
      </div>

      {selectedBadge && (
        <BadgeModal badge={selectedBadge} earned={selectedBadge.earned} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}