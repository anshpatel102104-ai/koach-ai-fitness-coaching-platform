import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portalDb } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInWeeks, startOfWeek, subWeeks, addDays } from 'date-fns';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stat, Segmented, ComplianceStrip, complianceState } from '@/components/kit';
import { cn } from '@/lib/utils';
import { PortalScreen, PortalHeader, Sheet, Bar } from '@/components/portal/PortalUI';
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
  if (s >= 80) return 'On a roll. Keep doing what you are doing.';
  if (s >= 60) return 'Good momentum. Consistency is paying off.';
  if (s >= 40) return 'Habits are forming. Stack a few good weeks.';
  return 'Just getting started. Every check-in counts.';
}

/* ── Weight chart: ink line, dashed goal, brand dot on the latest weigh-in ── */
const TIME_RANGES = ['4W', '8W', '3M', '6M', 'All'];

function LastDot({ cx, cy, index, dataLength }) {
  if (index !== dataLength - 1 || cx == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill="rgb(var(--brand))" stroke="rgb(var(--card))" strokeWidth={2} />;
}

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
  const change = startW && currentW ? currentW - startW : null;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Start" value={startW ? Number(startW).toFixed(1) : '–'} unit={startW ? 'lb' : ''} />
        <Stat label="Now" value={currentW ? Number(currentW).toFixed(1) : '–'} unit={currentW ? 'lb' : ''}
          sub={change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)} lb` : null} />
        <Stat label="Goal" value={goalW || '–'} unit={goalW ? 'lb' : ''}
          sub={goalW && currentW ? `${Math.abs(currentW - goalW).toFixed(1)} lb to go` : null} />
      </div>

      {!data.length ? (
        <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          No weigh-ins in this range. Log your weight to start the line.
        </p>
      ) : (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={{ fill: 'rgb(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))', borderRadius: 8, color: 'rgb(var(--foreground))', fontSize: 13 }}
                formatter={(v) => [`${v} lb`, 'Weight']}
              />
              {goalW && <ReferenceLine y={goalW} stroke="rgb(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Goal', position: 'insideTopRight', fill: 'rgb(var(--muted-foreground))', fontSize: 11 }} />}
              <Line type="monotone" dataKey="weight" stroke="rgb(var(--foreground))" strokeWidth={2}
                dot={({ key, ...props }) => <LastDot key={key ?? props.index} {...props} dataLength={data.length} />}
                activeDot={{ r: 4, fill: 'rgb(var(--foreground))' }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Segmented size="sm" className="mt-3 w-full [&>button]:flex-1 [&>button]:justify-center" value={range} onChange={setRange}
        options={TIME_RANGES.map(r => ({ value: r, label: r === 'All' ? 'All' : r.replace('W', ' wk').replace('M', ' mo') }))} />
    </div>
  );
}

/* ── Achievements ── */
const ACHIEVEMENTS = [
  { id: 'first_checkin', name: 'First check-in', desc: 'Sent your first weekly check-in.', req: (cis) => cis.length >= 1 },
  { id: '5_checkins', name: '5 check-ins', desc: 'Sent five weekly check-ins.', req: (cis) => cis.length >= 5 },
  { id: '10_checkins', name: '10 check-ins', desc: 'Sent ten weekly check-ins.', req: (cis) => cis.length >= 10 },
  { id: 'first_workout', name: 'First workout', desc: 'Logged your first session.', req: (_, sessions) => sessions.length >= 1 },
  { id: '10_workouts', name: '10 workouts', desc: 'Logged ten sessions.', req: (_, sessions) => sessions.length >= 10 },
  { id: '50_workouts', name: '50 workouts', desc: 'Logged fifty sessions.', req: (_, sessions) => sessions.length >= 50 },
  { id: 'first_lb', name: 'First pound', desc: 'Your latest weigh-in is below your first.', req: (cis) => { const sorted = cis.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date)); return sorted.length >= 2 && sorted[sorted.length - 1].weight < sorted[0].weight; } },
  { id: '5_lbs', name: '5 lb down', desc: 'Down five pounds from your first weigh-in.', req: (cis) => { const sorted = cis.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date)); return sorted.length >= 2 && sorted[0].weight - sorted[sorted.length - 1].weight >= 5; } },
  { id: '10_lbs', name: '10 lb down', desc: 'Down ten pounds from your first weigh-in.', req: (cis) => { const sorted = cis.filter(c => c.weight).sort((a, b) => new Date(a.date) - new Date(b.date)); return sorted.length >= 2 && sorted[0].weight - sorted[sorted.length - 1].weight >= 10; } },
];

function AchievementBadge({ badge, earned, onClick }) {
  return (
    <button type="button" onClick={() => onClick(badge)}
      className={cn('flex min-h-[64px] flex-col items-start justify-between gap-1 rounded-lg px-3 py-2.5 text-left transition-colors',
        earned ? 'bg-card shadow-[inset_0_0_0_1.5px_rgb(var(--foreground))]' : 'bg-secondary')}>
      <span className={cn('text-[13px] font-semibold leading-tight', earned ? 'text-foreground' : 'text-muted-foreground')}>{badge.name}</span>
      {earned
        ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>
        : <span className="text-[12px] text-muted-foreground">Not yet</span>}
    </button>
  );
}

/* ── Log sheet ── */
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
    <Sheet open onClose={onClose} title="Log an update"
      footer={<Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={save}>Save</Button>}>
      <Segmented className="w-full [&>button]:flex-1 [&>button]:justify-center" value={tab} onChange={setTab}
        options={[{ value: 'weight', label: 'Weight' }, { value: 'measurements', label: 'Measurements' }]} />
      {tab === 'weight' && (
        <div className="mt-4 flex items-end gap-2">
          <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="0" aria-label="Weight in lb"
            className="num h-20 w-44 rounded-xl border-2 border-foreground bg-card text-center text-[44px] text-foreground focus:outline-none" />
          <span className="pb-3 text-lg font-semibold text-muted-foreground">lb</span>
        </div>
      )}
      {tab === 'measurements' && (
        <div className="mt-3 divide-y divide-border">
          {['chest', 'waist', 'hips', 'arms', 'thighs'].map(f => (
            <label key={f} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 text-[15px] font-semibold capitalize text-foreground">{f}</span>
              <input type="number" inputMode="decimal" value={measurements[f] || ''} placeholder="–"
                onChange={e => setMeasurements(prev => ({ ...prev, [f]: e.target.value ? Number(e.target.value) : null }))}
                className="num h-11 w-24 rounded-lg border border-input bg-card text-center text-xl text-foreground focus:outline-none focus:border-foreground" />
              <span className="w-5 text-[13px] text-muted-foreground">in</span>
            </label>
          ))}
        </div>
      )}
    </Sheet>
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

  // Last 8 weeks from weekly check-ins (oldest first)
  const last8 = (() => {
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 8 }, (_, idx) => {
      const ws = subWeeks(thisWeek, 7 - idx);
      const we = addDays(ws, 7);
      const ci = sorted.find(c => { const d = parseISO(c.date); return d >= ws && d < we; });
      if (!ci) return idx === 7 ? 'none' : (firstCI && we <= parseISO(firstCI.date) ? 'none' : 'missed');
      const parts = [ci.compliance_training, ci.compliance_nutrition].filter(v => typeof v === 'number');
      return parts.length ? complianceState(parts.reduce((x, y) => x + y, 0) / parts.length) : 'on';
    });
  })();

  const breakdown = [
    { label: 'Training', pct: Math.min(100, sessions.length * 2) },
    { label: 'Nutrition', pct: Math.round(nutritionAdh) },
    { label: 'Consistency', pct: Math.round(ciAdh) },
    { label: 'Energy', pct: sorted.length ? Math.round(sorted.slice(0, 4).reduce((s, ci) => s + (ci.energy_level || 5) * 10, 0) / Math.min(4, sorted.length)) : 50 },
  ];

  const goalW = myClient?.target_weight;
  const headline = totalLost > 0 && Math.abs(totalLost) < 200
    ? `Down ${totalLost.toFixed(1)} lb since your first check-in.${goalW && lastCI?.weight ? ` ${Math.abs(lastCI.weight - goalW).toFixed(1)} lb to your goal.` : ''}`
    : sorted.length ? `${sorted.length} check-in${sorted.length === 1 ? '' : 's'} and ${sessions.length} workout${sessions.length === 1 ? '' : 's'} so far.` : 'Your weigh-ins, workouts and check-ins add up here.';

  return (
    <PortalScreen>
      <PortalHeader
        title="Progress"
        subtitle={headline}
        right={<Button size="sm" onClick={() => setShowLog(true)}><Plus /> Log</Button>}
      />

      <div className="space-y-3">
        {/* Weight */}
        <section className="panel p-4">
          <h2 className="mb-3 text-xl text-foreground">Weight</h2>
          <WeightChart checkIns={sorted} client={myClient} />
        </section>

        {/* Last 8 weeks + consistency */}
        <section className="panel p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl text-foreground">Your last 8 weeks</h2>
            <span className="text-[13px] font-semibold text-success">{last8.filter(w => w === 'on').length} on plan</span>
          </div>
          <ComplianceStrip weeks={last8} className="mt-3 w-full [&>span]:w-auto [&>span]:flex-1" />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <Stat size="sm" label="Workouts" value={`${Math.round(trainingAdh)}%`} />
            <Stat size="sm" label="Nutrition" value={`${Math.round(nutritionAdh)}%`} />
            <Stat size="sm" label="Check-ins" value={`${Math.round(ciAdh)}%`} />
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">Averages from your last four check-ins.</p>
        </section>

        {/* Numbers */}
        <section className="panel grid grid-cols-3 gap-px overflow-hidden bg-border">
          {[
            { label: 'Change', value: totalLost > 0 ? `−${totalLost.toFixed(1)}` : totalLost < 0 ? `+${Math.abs(totalLost).toFixed(1)}` : '–', unit: totalLost ? 'lb' : '' },
            { label: 'Streak', value: streak, unit: streak === 1 ? 'day' : 'days' },
            { label: 'Workouts', value: sessions.length },
            { label: 'Check-ins', value: sorted.length },
            { label: 'Badges', value: `${achievements.filter(a => a.earned).length}/${achievements.length}` },
            { label: 'Current', value: lastCI?.weight && lastCI.weight < 999 ? Number(lastCI.weight).toFixed(1) : '–', unit: lastCI?.weight ? 'lb' : '' },
          ].map(st => (
            <div key={st.label} className="bg-card px-4 py-3">
              <Stat size="sm" label={st.label} value={st.value} unit={st.unit} />
            </div>
          ))}
        </section>

        {/* Score */}
        <section className="panel p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl text-foreground">Progress score</h2>
            <p className="num text-[32px] text-foreground">{score}<span className="text-lg text-muted-foreground">/100</span></p>
          </div>
          <p className="text-[13px] text-muted-foreground">{scoreLabel(score)}</p>
          <div className="mt-3 space-y-2.5">
            {breakdown.map(({ label, pct }) => (
              <div key={label} className="grid grid-cols-[96px_1fr_40px] items-center gap-3">
                <span className="text-[13px] text-muted-foreground">{label}</span>
                <Bar pct={pct} />
                <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">{pct}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Program */}
        {myProgram && (
          <section className="panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="truncate text-xl text-foreground">{myProgram.title}</h2>
              <span className="flex-shrink-0 text-[13px] text-muted-foreground">{myProgram.duration_weeks} weeks</span>
            </div>
            <Bar className="mt-3" pct={Math.min(100, (sessions.length / Math.max(1, (myProgram.workouts?.length || 4) * (myProgram.duration_weeks || 8))) * 100)} />
            <p className="mt-2 text-[13px] text-muted-foreground">{sessions.length} sessions logged on this program</p>
          </section>
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
        <section className="panel p-4">
          <h2 className="text-xl text-foreground">Milestones</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {achievements.map(a => (
              <AchievementBadge key={a.id} badge={a} earned={a.earned} onClick={setBadgeDetail} />
            ))}
          </div>
        </section>
      </div>

      {/* Badge detail */}
      <AnimatePresence>
        {badgeDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-8"
            onClick={() => setBadgeDetail(null)}>
            <div className="panel w-full max-w-xs p-5" onClick={e => e.stopPropagation()} role="dialog">
              <h2 className="text-[22px] text-foreground">{badgeDetail.name}</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">{badgeDetail.desc}</p>
              <p className={cn('mt-3 text-sm font-semibold', badgeDetail.earned ? 'text-success' : 'text-muted-foreground')}>
                {badgeDetail.earned ? 'Earned' : 'Not earned yet'}
              </p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setBadgeDetail(null)}>Close</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log sheet */}
      {showLog && myClient && (
        <LogModal client={myClient} onClose={() => setShowLog(false)} onSaved={() => setShowLog(false)} />
      )}
    </PortalScreen>
  );
}
