import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInWeeks } from 'date-fns';
import { Scale, Plus, X
} from 'lucide-react';
import AIProgressAnalyzer from '@/components/progress/AIProgressAnalyzer';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

/* ── Score helpers ── */
function calcScore(client, checkIns, sessions) {
  let score = 40;
  if (!checkIns.length) return score;
  const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0]; const last = sorted[sorted.length - 1];
  if (client?.target_weight && last.weight && first.weight) {
    const needed = Math.abs(client.target_weight - first.weight);
    const done = Math.abs(last.weight - first.weight);
    if (needed > 0) score += Math.min(25, (done / needed) * 25);
  }
  const recent = sorted.slice(-4);
  const avgAdh = recent.reduce((s, ci) => s + ((ci.compliance_training ?? 70) + (ci.compliance_nutrition ?? 70)) / 2, 0) / recent.length;
  score += (avgAdh / 100) * 30;
  if (sessions.length) score += Math.min(15, sessions.length * 0.5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(s) {
  if (s >= 80) return 'Crushing it! 🔥';
  if (s >= 60) return 'Great momentum! 💪';
  if (s >= 40) return 'Building habits 📈';
  return 'Every journey starts here 🌱';
}

/* ── Weight chart ── */
const TIME_RANGES = ['4W', '8W', '3M', '6M', 'All'];

function WeightChart({ checkIns, client }) {
  const [range, setRange] = useState('8W');
  const data = useMemo(() => {
    const sorted = [...checkIns].filter(ci => ci.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
    const days = range === '4W' ? 28 : range === '8W' ? 56 : range === '3M' ? 90 : range === '6M' ? 180 : Infinity;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return sorted.filter(ci => new Date(ci.date) >= cutoff).map(ci => ({
      date: format(parseISO(ci.date), 'MMM d'),
      weight: ci.weight,
    }));
  }, [checkIns, range]);

  const startW = checkIns.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.weight;
  const currentW = checkIns.filter(c => c.weight).sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight;
  const goalW = client?.target_weight;

  if (!data.length) return (
    <div className="p-8 text-center">
      <Scale className="w-10 h-10 text-border mx-auto mb-3" />
      <p className="text-muted-foreground text-sm font-semibold">Log your starting weight to begin tracking! 💪</p>
    </div>
  );

  return (
    <div>
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
        {TIME_RANGES.map(r => (
          <button key={r} onClick={() => setRange(r)}
            className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 transition-all"
            style={{
              background: range === r ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--muted))',
              color: range === r ? 'white' : 'rgb(var(--muted-foreground))',
              border: range === r ? 'none' : '1px solid rgb(var(--muted))',
            }}>
            {r}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ left: -20, right: 10 }}>
          <XAxis dataKey="date" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 9 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))', borderRadius: 12, color: 'rgb(var(--foreground))', fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
          {goalW && <ReferenceLine y={goalW} stroke="rgb(var(--success) / 0.4)" strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="weight" stroke="rgb(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'rgb(var(--primary))' }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between mt-4 text-xs">
        <div className="text-center">
          <p className="text-muted-foreground">Start</p>
          <p className="text-foreground font-black">{startW ? `${startW} lbs` : '—'}</p>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1">
          <div className="h-px flex-1 bg-border" />
          {startW && currentW && (
            <span className={`text-xs font-black px-2 ${currentW < startW ? 'text-success' : 'text-destructive'}`}>
              {currentW < startW ? '↓' : '↑'} {Math.abs(currentW - startW).toFixed(1)} lbs
            </span>
          )}
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Now</p>
          <p className="text-primary font-black">{currentW ? `${Number(currentW).toFixed(1)} lbs` : '—'}</p>
        </div>
        {goalW && (
          <>
            <div className="flex-1 flex items-center justify-center">
              <div className="h-px flex-1 bg-border" />
              <span className="text-border text-xs px-1">→</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Goal</p>
              <p className="text-success font-black">{goalW} lbs</p>
            </div>
          </>
        )}
      </div>
      {goalW && currentW && (
        <p className="text-muted-foreground text-xs text-center mt-2 font-semibold">
          {Math.abs(currentW - goalW).toFixed(1)} lbs to go
        </p>
      )}
    </div>
  );
}

/* ── Score Ring ── */
function ScoreRing({ score }) {
  const r = 52; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? 'rgb(var(--success))' : score >= 60 ? 'rgb(var(--primary))' : score >= 40 ? 'rgb(var(--warning))' : 'rgb(var(--destructive))';
  const trackColor = score >= 80 ? 'rgb(var(--success))' : score >= 60 ? 'rgb(var(--accent))' : score >= 40 ? 'rgb(var(--warning))' : 'rgb(var(--destructive))';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke={trackColor} strokeWidth="10" />
          <motion.circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: 'easeOut' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-foreground">{score}</span>
          <span className="text-muted-foreground text-[9px]">/100</span>
        </div>
      </div>
      <p className="text-muted-foreground text-sm font-semibold mt-2">{scoreLabel(score)}</p>
    </div>
  );
}

/* ── Stat Chip ── */
function StatChip({ emoji, value, label, sub }) {
  return (
    <div className="flex-shrink-0 bg-card p-4 rounded-2xl min-w-[100px] text-center"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
      <div className="text-xl mb-1">{emoji}</div>
      <p className="text-foreground font-black text-base leading-none">{value}</p>
      {sub && <p className="text-primary text-[9px] mt-0.5 font-semibold">{sub}</p>}
      <p className="text-muted-foreground text-[9px] mt-0.5">{label}</p>
    </div>
  );
}

/* ── Achievement Badge ── */
const ACHIEVEMENTS = [
  { id: 'first_checkin', emoji: '📋', name: 'First Check-in', desc: 'Submitted first check-in', req: (cis) => cis.length >= 1 },
  { id: '5_checkins', emoji: '📋', name: '5 Check-ins', desc: 'Submitted 5 check-ins', req: (cis) => cis.length >= 5 },
  { id: '10_checkins', emoji: '🏆', name: '10 Check-ins', desc: 'Submitted 10 check-ins', req: (cis) => cis.length >= 10 },
  { id: 'first_workout', emoji: '💪', name: 'First Workout', desc: 'Completed first workout', req: (_, sessions) => sessions.length >= 1 },
  { id: '10_workouts', emoji: '💪', name: '10 Workouts', desc: 'Completed 10 workouts', req: (_, sessions) => sessions.length >= 10 },
  { id: '50_workouts', emoji: '🔥', name: '50 Workouts', desc: 'Completed 50 workouts', req: (_, sessions) => sessions.length >= 50 },
  { id: 'first_lb', emoji: '⚖️', name: 'First Pound', desc: 'Lost first pound', req: (cis, _, client) => { const sorted = cis.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date)); return sorted.length >= 2 && sorted[sorted.length - 1].weight < sorted[0].weight; } },
  { id: '5_lbs', emoji: '⚖️', name: '5 lbs Lost', desc: 'Lost 5 lbs', req: (cis) => { const sorted = cis.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date)); return sorted.length >= 2 && sorted[0].weight - sorted[sorted.length - 1].weight >= 5; } },
  { id: '10_lbs', emoji: '🏆', name: '10 lbs Lost', desc: 'Lost 10 lbs', req: (cis) => { const sorted = cis.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date)); return sorted.length >= 2 && sorted[0].weight - sorted[sorted.length - 1].weight >= 10; } },
];

function AchievementBadge({ badge, earned, onClick }) {
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={() => onClick(badge)}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border"
      style={{
        borderColor: earned ? 'rgb(var(--warning))' : 'rgb(var(--muted))',
        background: earned ? 'rgb(var(--warning))' : 'rgb(var(--card))',
        boxShadow: earned ? '0 2px 12px rgb(var(--warning) / 0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
        filter: earned ? 'none' : 'grayscale(1) opacity(0.5)',
      }}>
      <span className="text-2xl">{badge.emoji}</span>
      <p className="text-muted-foreground text-[9px] font-bold text-center leading-tight">{badge.name}</p>
    </motion.button>
  );
}

/* ── Log Modal ── */
function LogModal({ client, onClose, onSaved }) {
  const [tab, setTab] = useState('weight');
  const [weight, setWeight] = useState('');
  const [measurements, setMeasurements] = useState({});
  const queryClient = useQueryClient();

  const save = async () => {
    const payload = { client_id: client.id, client_name: client.name, date: format(new Date(), 'yyyy-MM-dd'), review_status: 'pending' };
    if (weight) payload.weight = Number(weight);
    if (Object.keys(measurements).length) payload.measurements = measurements;
    await portalDb.entities.CheckIn.create(payload);
    queryClient.invalidateQueries({ queryKey: ['portal-checkins-prog'] });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="w-full rounded-t-3xl p-5 pb-8 bg-card" style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-black text-base">Log Update</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          {['weight', 'measurements'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-2xl text-xs font-bold capitalize transition-all"
              style={{
                background: tab === t ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgb(var(--muted))',
                color: tab === t ? 'white' : 'rgb(var(--muted-foreground))',
                border: tab === t ? 'none' : '1.5px solid rgb(var(--muted))',
              }}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'weight' && (
          <div className="space-y-3">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="Enter weight (lbs)"
              className="w-full px-4 py-4 rounded-2xl text-foreground bg-muted border border-border outline-none text-center text-2xl font-black placeholder-border focus:border-primary" />
          </div>
        )}
        {tab === 'measurements' && (
          <div className="space-y-2">
            {['chest', 'waist', 'hips', 'arms', 'thighs'].map(f => (
              <div key={f} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-muted border border-border">
                <span className="text-muted-foreground text-sm capitalize w-16 font-semibold">{f}</span>
                <input type="number" value={measurements[f] || ''} placeholder="—"
                  onChange={e => setMeasurements(prev => ({ ...prev, [f]: e.target.value ? Number(e.target.value) : null }))}
                  className="flex-1 bg-transparent text-foreground text-sm text-right outline-none font-bold" />
                <span className="text-muted-foreground text-xs">in</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={save}
          className="w-full py-4 rounded-2xl font-black text-white text-sm mt-4"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', boxShadow: '0 4px 16px rgb(var(--primary) / 0.3)' }}>
          Save Update
        </button>
      </motion.div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function PortalProgress({ user }) {
  const [showLog, setShowLog] = useState(false);
  const [badgeDetail, setBadgeDetail] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['portal-client-prog', user?.email],
    queryFn: () => portalDb.entities.Client.filter({ email: user.email }, '-created_date', 1),
    enabled: !!user?.email,
  });
  const myClient = clients[0];

  const { data: checkIns = [] } = useQuery({
    queryKey: ['portal-checkins-prog', myClient?.id],
    queryFn: () => portalDb.entities.CheckIn.filter({ client_id: myClient.id }, '-date', 100),
    enabled: !!myClient?.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['portal-sessions-prog', myClient?.id],
    queryFn: () => portalDb.entities.WorkoutSession.filter({ client_id: myClient.id }, '-completed_at', 200),
    enabled: !!myClient?.id,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['portal-program-prog', myClient?.assigned_program_id],
    queryFn: () => portalDb.entities.WorkoutProgram.filter({ id: myClient.assigned_program_id }, '-created_date', 1),
    enabled: !!myClient?.assigned_program_id,
  });
  const myProgram = programs[0];

  const sorted = useMemo(() => [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date)), [checkIns]);
  const score = useMemo(() => calcScore(myClient, checkIns, sessions), [myClient, checkIns, sessions]);

  const firstCI = sorted[sorted.length - 1];
  const lastCI = sorted[0];
  const totalLost = firstCI?.weight && lastCI?.weight ? (firstCI.weight - lastCI.weight) : 0;

  // Streak
  const streak = (() => {
    let count = 0;
    const wkSorted = [...sessions].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    for (const s of wkSorted) {
      const d = new Date(s.completed_at);
      const now = new Date();
      if (Math.abs(now - d) / 86400000 <= count + 1.5) count++;
      else break;
    }
    return count;
  })();

  const achievements = ACHIEVEMENTS.map(a => ({ ...a, earned: a.req(sorted, sessions, myClient) }));

  // Adherence rings
  const trainingAdh = sorted.length ? sorted.slice(0, 4).reduce((s, ci) => s + (ci.compliance_training || 70), 0) / Math.min(4, sorted.length) : 0;
  const nutritionAdh = sorted.length ? sorted.slice(0, 4).reduce((s, ci) => s + (ci.compliance_nutrition || 70), 0) / Math.min(4, sorted.length) : 0;
  const ciAdh = sorted.length > 0 ? Math.min(100, (sorted.length / Math.max(1, differenceInWeeks(new Date(), firstCI ? parseISO(firstCI.date) : new Date()) + 1)) * 100) : 0;

  return (
    <div className="pb-28 space-y-5" style={{ background: 'rgb(var(--muted))', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-card px-5 pt-14 pb-4 flex items-center justify-between" style={{ boxShadow: '0 1px 0 rgb(var(--muted))' }}>
        <div>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Progress</p>
          <h1 className="text-foreground text-2xl font-black mt-0.5">My Progress</h1>
        </div>
        <button onClick={() => setShowLog(true)}
          className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white flex items-center gap-1.5"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', boxShadow: '0 4px 12px rgb(var(--primary) / 0.25)' }}>
          <Plus className="w-4 h-4" /> Log Update
        </button>
      </div>

      <div className="px-5 space-y-5">

      {/* Score Card */}
      <div className="bg-card p-5 rounded-3xl" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-4">Overall Score</p>
        <div className="flex items-center justify-between">
          <ScoreRing score={score} />
          <div className="flex-1 ml-6 space-y-2.5">
            {[
              { label: 'Fitness', pct: Math.min(100, sessions.length * 2) },
              { label: 'Nutrition', pct: Math.round(nutritionAdh) },
              { label: 'Consistency', pct: Math.round(ciAdh) },
              { label: 'Mindset', pct: sorted.length ? Math.round(sorted.slice(0, 4).reduce((s, ci) => s + (ci.energy_level || 5) * 10, 0) / Math.min(4, sorted.length)) : 50 },
            ].map(({ label, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5 font-semibold">
                  <span>{label}</span><span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--ai)))' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        <StatChip emoji="⚖️" value={lastCI?.weight && lastCI.weight < 999 ? `${Number(lastCI.weight).toFixed(1)} lbs` : '—'} label="Current" sub={totalLost !== 0 && Math.abs(totalLost) < 200 ? `${totalLost > 0 ? '−' : '+'}${Math.abs(totalLost).toFixed(1)} lbs` : ''} />
        <StatChip emoji="📉" value={totalLost > 0 ? `−${totalLost.toFixed(1)}` : totalLost < 0 ? `+${Math.abs(totalLost).toFixed(1)}` : '—'} label="lbs total" />
        <StatChip emoji="🔥" value={`${streak}d`} label="Streak" />
        <StatChip emoji="💪" value={sessions.length} label="Workouts" />
        <StatChip emoji="📋" value={sorted.length} label="Check-ins" />
        <StatChip emoji="🏆" value={achievements.filter(a => a.earned).length} label="Badges" />
      </div>

      {/* Weight Journey */}
      <div className="bg-card p-5 rounded-3xl" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-bold text-sm">⚖️ Weight Journey</p>
          <button onClick={() => setShowLog(true)} className="text-primary text-xs font-semibold flex items-center gap-1">
            <Plus className="w-3 h-3" /> Log
          </button>
        </div>
        <WeightChart checkIns={sorted} client={myClient} />
      </div>

      {/* Consistency */}
      <div className="bg-card p-5 rounded-3xl" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
        <p className="text-foreground font-bold text-sm mb-4">📊 My Consistency</p>
        <div className="flex justify-around">
          {[
            { label: 'Workouts', pct: Math.round(trainingAdh), color: 'rgb(var(--primary))', track: 'rgb(var(--accent))' },
            { label: 'Nutrition', pct: Math.round(nutritionAdh), color: 'rgb(var(--success))', track: 'rgb(var(--success))' },
            { label: 'Check-ins', pct: Math.round(ciAdh), color: 'rgb(var(--ai))', track: 'rgb(var(--ai))' },
          ].map(({ label, pct, color, track }) => {
            const r = 28; const circ = 2 * Math.PI * r;
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r={r} fill="none" stroke={track} strokeWidth="6" />
                    <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
                      strokeLinecap="round" strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
                      transition={{ duration: 1 }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground text-xs font-black">{pct}%</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-[10px] font-semibold">{label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Program */}
      {myProgram && (
        <div className="bg-card p-5 rounded-3xl" style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgb(var(--muted))' }}>
          <p className="text-foreground font-bold text-sm mb-3">💪 My Program</p>
          <p className="text-foreground text-sm font-semibold">{myProgram.title}</p>
          <p className="text-muted-foreground text-xs mb-3">{myProgram.duration_weeks} week program</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (sessions.length / Math.max(1, (myProgram.workouts?.length || 4) * (myProgram.duration_weeks || 8))) * 100)}%`, background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--ai)))' }} />
            </div>
            <span className="text-muted-foreground text-xs">{sessions.length} sessions</span>
          </div>
        </div>
      )}

      {/* AI Progress Insights */}
      <AIProgressAnalyzer
        client={myClient}
        checkIns={sorted}
        workoutSessions={sessions}
        program={myProgram}
        isClientFacing={true}
      />

      {/* Achievements */}
      <div>
        <p className="text-foreground font-bold text-sm mb-3">🏆 My Achievements</p>
        <div className="grid grid-cols-4 gap-2">
          {achievements.map(a => (
            <AchievementBadge key={a.id} badge={a} earned={a.earned} onClick={setBadgeDetail} />
          ))}
        </div>
      </div>

      </div>{/* end px-5 wrapper */}

      {/* Badge detail popup */}
      <AnimatePresence>
        {badgeDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-8" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setBadgeDetail(null)}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              className="p-6 rounded-3xl text-center max-w-xs w-full bg-card"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <div className="text-5xl mb-3">{badgeDetail.emoji}</div>
              <p className="text-foreground font-black text-base">{badgeDetail.name}</p>
              <p className="text-muted-foreground text-sm mt-1">{badgeDetail.desc}</p>
              {badgeDetail.earned
                ? <p className="text-success text-xs mt-3 font-bold">✓ Earned!</p>
                : <p className="text-border text-xs mt-3">Keep going to unlock this!</p>
              }
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Modal */}
      <AnimatePresence>
        {showLog && myClient && (
          <LogModal client={myClient} onClose={() => setShowLog(false)} onSaved={() => setShowLog(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}