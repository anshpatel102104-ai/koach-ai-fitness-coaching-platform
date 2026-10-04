import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO, differenceInDays, subWeeks, getDay } from 'date-fns';
import { X, Settings, Calendar, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { averageAdherenceScore, calculateStreak, checkInScore } from '@/lib/adherence';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const TABS = ['Overview', 'Workout', 'Nutrition', 'Check-ins'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PIE_COLORS = ['var(--tc-primary)', 'var(--tc-warning)', 'var(--tc-ai)', 'var(--tc-success)'];

function calcCheckInAdherence(checkIns, weeksBack = 4) {
  const cutoff = subWeeks(new Date(), weeksBack);
  const recent = checkIns.filter(ci => parseISO(ci.date) >= cutoff);
  return Math.min(100, Math.round((recent.length / weeksBack) * 100));
}

function ScoreDonut({ workout, nutrition, checkin }) {
  const data = [
    { name: 'Workout', value: 40 * (workout ?? 0) / 100 },
    { name: 'Nutrition', value: 30 * (nutrition ?? 0) / 100 },
    { name: 'Check-ins', value: 20 * (checkin ?? 0) / 100 },
    { name: 'Engagement', value: 10 },
  ];
  const total = Math.round(data.reduce((s, d) => s + d.value, 0));
  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={38} outerRadius={52} dataKey="value" strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold', total >= 80 ? 'text-success' : total >= 50 ? 'text-warning' : 'text-destructive')}>{total}</span>
        <span className="text-[9px] text-muted-foreground uppercase">Score</span>
      </div>
    </div>
  );
}

export default function AdherenceDetailDrawer({ client, checkIns, open, onClose }) {
  const [tab, setTab] = useState('Overview');
  const [sendingNudge, setSendingNudge] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client flagged as At-Risk'); },
  });

  const sorted = useMemo(() =>
    [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [checkIns]
  );

  const workout = useMemo(() => {
    const vals = sorted.slice(0, 4).map(ci => ci.compliance_training).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [sorted]);

  const nutrition = useMemo(() => {
    const vals = sorted.slice(0, 4).map(ci => ci.compliance_nutrition).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [sorted]);

  const checkin = calcCheckInAdherence(sorted);
  const streak = calculateStreak(sorted);
  const overall = averageAdherenceScore(sorted);

  const handleNudge = async () => {
    setSendingNudge(true);
    let message;
    if (workout !== null && workout < 60)
      message = `Hey ${client.name}! I noticed you missed a few workouts this week — let's talk about what's getting in the way 💪`;
    else if (nutrition !== null && nutrition < 60)
      message = `Hey ${client.name}! Your nutrition logging has been low — even tracking one meal a day helps! 🥗`;
    else
      message = `Hey ${client.name}! Your weekly check-in is due — only takes 2 minutes! 📋`;

    try {
      await db.entities.Message.create({ client_id: client.id, client_name: client.name, sender: 'coach', content: message });
      toast.success('Nudge sent!');
    } catch { toast.error('Failed to send nudge'); }
    setSendingNudge(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg h-full bg-card shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-shrink-0"
          style={{ background: 'var(--tc-sidebar)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            {client.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white">{client.name}</p>
            <p className="text-xs text-white/50">{sorted.length} check-ins · Streak: {streak}w {streak >= 7 ? '🔥' : ''}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--kc-w-10)] flex items-center justify-center hover:bg-[var(--kc-w-20)]">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border px-4 bg-card flex-shrink-0 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'Overview' && (
            <>
              {/* Score donut + breakdown */}
              <div className="flex gap-4 items-center">
                <ScoreDonut workout={workout} nutrition={nutrition} checkin={checkin} />
                <div className="flex-1 space-y-2">
                  {[
                    { label: 'Workout (40%)', val: workout, color: 'var(--tc-primary)' },
                    { label: 'Nutrition (30%)', val: nutrition, color: 'var(--tc-warning)' },
                    { label: 'Check-ins (20%)', val: checkin, color: 'var(--tc-ai)' },
                    { label: 'Engagement (10%)', val: 70, color: 'var(--tc-success)' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-[10px] mb-0.5 text-foreground">
                        <span>{label}</span>
                        <span className="font-semibold">{val ?? '—'}{val != null ? '%' : ''}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${val ?? 0}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-2 text-[10px]">
                {[['var(--tc-primary)', 'Workout'], ['var(--tc-warning)', 'Nutrition'], ['var(--tc-ai)', 'Check-ins'], ['var(--tc-success)', 'Engagement']].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: color }} />{label}</span>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Overall Score', value: overall !== null ? `${overall}%` : '—' },
                  { label: 'Check-in Streak', value: `${streak}w` },
                  { label: 'Check-ins', value: sorted.length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-background rounded-xl p-3 border border-border">
                    <p className="text-base font-bold text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Coach tools */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Coach Tools</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleNudge} disabled={sendingNudge}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    <Sparkles className="w-3.5 h-3.5" /> {sendingNudge ? 'Sending...' : 'Send Nudge'}
                  </button>
                  <button onClick={() => navigate(`/program-builder?clientId=${client.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-background">
                    <Settings className="w-3.5 h-3.5" /> Adjust Program
                  </button>
                  <button onClick={() => navigate(`/schedule?clientId=${client.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-background">
                    <Calendar className="w-3.5 h-3.5" /> Schedule Call
                  </button>
                  <button onClick={() => updateMutation.mutate({ id: client.id, data: { lifecycle_status: 'at_risk' } })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-destructive bg-destructive/10 text-destructive hover:bg-destructive/10">
                    Flag At-Risk
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'Workout' && <WorkoutTab checkIns={sorted} />}
          {tab === 'Nutrition' && <NutritionTab checkIns={sorted} />}
          {tab === 'Check-ins' && <CheckInTab checkIns={sorted} />}
        </div>
      </div>
    </div>
  );
}

function WorkoutTab({ checkIns }) {
  const recent = checkIns.slice(0, 12);
  const avgPerWeek = useMemo(() => {
    const vals = recent.map(ci => ci.compliance_training).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [recent]);

  const dayFreq = useMemo(() => {
    const freq = Array(7).fill(0);
    recent.forEach(ci => { if (ci.date) freq[getDay(parseISO(ci.date))]++; });
    return freq;
  }, [recent]);

  const favoriteDay = DAYS[dayFreq.indexOf(Math.max(...dayFreq))];
  const skippedDay = DAYS[dayFreq.indexOf(Math.min(...dayFreq))];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Avg Compliance" value={avgPerWeek !== null ? `${avgPerWeek}%` : '—'} />
        <Stat label="Fav Day" value={favoriteDay} />
        <Stat label="Most Skipped" value={skippedDay} />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Weekly Completion</p>
        <div className="space-y-1.5">
          {recent.slice(0, 8).map((ci, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{format(parseISO(ci.date), 'MMM d')}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${ci.compliance_training ?? 0}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-foreground w-8 text-right">{ci.compliance_training ?? '—'}{ci.compliance_training != null ? '%' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NutritionTab({ checkIns }) {
  const recent = checkIns.slice(0, 8);
  const avgNutrition = useMemo(() => {
    const vals = recent.map(ci => ci.compliance_nutrition).filter(v => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }, [recent]);

  const fullyTracked = recent.filter(ci => ci.compliance_nutrition !== null && ci.compliance_nutrition >= 90).length;
  const notTracked = recent.filter(ci => ci.compliance_nutrition === null || ci.compliance_nutrition < 20).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Avg Adherence" value={avgNutrition !== null ? `${avgNutrition}%` : '—'} />
        <Stat label="Fully On Track" value={`${fullyTracked}d`} />
        <Stat label="Not Tracked" value={`${notTracked}d`} />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Nutrition Log Rate</p>
        <div className="space-y-1.5">
          {recent.map((ci, i) => {
            const val = ci.compliance_nutrition;
            const color = val == null ? 'var(--tc-border)' : val >= 80 ? 'var(--tc-success)' : val >= 50 ? 'var(--tc-warning)' : 'var(--tc-destructive)';
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{format(parseISO(ci.date), 'MMM d')}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${val ?? 0}%`, background: color }} />
                </div>
                <span className="text-[10px] font-semibold text-foreground w-8 text-right">{val ?? '—'}{val != null ? '%' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CheckInTab({ checkIns }) {
  const streak = calculateStreak(checkIns);
  const last5 = checkIns.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total Check-ins" value={checkIns.length} />
        <Stat label="Current Streak" value={`${streak}w`} />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Submission History</p>
        <div className="space-y-2">
          {last5.map((ci, i) => {
            const score = checkInScore(ci);
            const daysSince = differenceInDays(new Date(), parseISO(ci.date));
            const isLate = daysSince > 10;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0',
                  isLate ? 'bg-warning' : score !== null ? 'bg-success' : 'bg-border')} />
                <span className="text-xs text-foreground flex-1">{format(parseISO(ci.date), 'MMM d, yyyy')}</span>
                {score !== null && (
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                    score >= 80 ? 'bg-success/10 text-success' : score >= 50 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive')}>
                    {score}%
                  </span>
                )}
                {isLate && <span className="text-[10px] text-warning font-semibold">Late</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-background rounded-xl p-2.5 border border-border">
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}