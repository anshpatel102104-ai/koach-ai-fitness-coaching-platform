import React, { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO, subWeeks } from 'date-fns';
import {
  AreaChart, Area, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';
import { NotebookPen, Trophy, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIProgressInsights from '../AIProgressInsights';
import LogWeightModal from '../LogWeightModal';

const RANGES = [
  { label: '4W', weeks: 4 },
  { label: '8W', weeks: 8 },
  { label: '3M', weeks: 13 },
  { label: '6M', weeks: 26 },
  { label: 'All', weeks: null },
];

function movingAverage(data, window = 3) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1).filter(x => x.value != null);
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length;
    return { ...d, ma: Math.round(avg * 10) / 10 };
  });
}

export default function ProgressOverviewTab({ client, checkIns, sessions, score, weeksActive, first, last }) {
  const [range, setRange] = useState('3M');
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checkins'] }); setShowLogWeight(false); },
  });

  const noteMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checkins'] }); setShowNoteModal(false); setNoteText(''); toast.success('Progress note saved'); },
  });

  const sorted = useMemo(() =>
    [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [checkIns]
  );

  const filteredCIs = useMemo(() => {
    const r = RANGES.find(r => r.label === range);
    if (!r?.weeks) return sorted;
    const cutoff = subWeeks(new Date(), r.weeks);
    return sorted.filter(ci => new Date(ci.date) >= cutoff);
  }, [sorted, range]);

  const chartData = useMemo(() => {
    const withWeight = filteredCIs.filter(ci => ci.weight);
    const raw = withWeight.map(ci => ({
      date: format(parseISO(ci.date), 'MMM d'),
      rawDate: ci.date,
      value: ci.weight,
    }));
    return movingAverage(raw);
  }, [filteredCIs]);

  const goalWeight = client.target_weight;
  const startWeight = first?.weight;
  const currentWeight = last?.weight;
  const totalChange = startWeight && currentWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : null;

  const scoreBreakdown = useMemo(() => {
    const avgTraining = sorted.length ? sorted.reduce((s, ci) => s + (ci.compliance_training ?? 0), 0) / sorted.length : 0;
    const avgNutrition = sorted.length ? sorted.reduce((s, ci) => s + (ci.compliance_nutrition ?? 0), 0) / sorted.length : 0;
    const consistency = sorted.length > 0 ? Math.min(100, (sorted.length / Math.max(weeksActive, 1)) * 100) : 0;
    const weightPct = startWeight && currentWeight && goalWeight && startWeight !== goalWeight
      ? Math.min(100, Math.abs(currentWeight - startWeight) / Math.abs(goalWeight - startWeight) * 100) : 0;
    return {
      weight: Math.round(weightPct),
      training: Math.round(avgTraining),
      nutrition: Math.round(avgNutrition),
      consistency: Math.round(consistency),
    };
  }, [sorted, startWeight, currentWeight, goalWeight, weeksActive]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value} lbs</p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Starting Weight', value: startWeight ? `${startWeight} lbs` : '—' },
          { label: 'Current Weight', value: currentWeight ? `${currentWeight} lbs` : '—', blue: true },
          { label: 'Goal Weight', value: goalWeight ? `${goalWeight} lbs` : '—', green: true },
          { label: 'Total Change', value: totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange} lbs` : '—', color: totalChange < 0 ? 'text-success' : totalChange > 0 ? 'text-destructive' : '' },
          { label: 'Weeks Active', value: weeksActive || '—' },
          { label: 'Check-ins', value: checkIns.length },
          { label: 'Workouts', value: sessions.length },
        ].map(({ label, value, blue, green, color }) => (
          <div key={label} className="bg-background rounded-xl p-3 border border-border">
            <p className={cn('text-base font-bold', blue ? 'text-primary' : green ? 'text-success' : color || 'text-foreground')}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Weight Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Weight Progress</h3>
            {goalWeight && <p className="text-xs text-muted-foreground">Goal: {goalWeight} lbs</p>}
          </div>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r.label)}
                className={cn('px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all',
                  range === r.label ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:border-primary')}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.length < 2 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Not enough weight data — log at least 2 entries to see the chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--tc-primary)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--tc-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--tc-muted)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--tc-muted-foreground)' }} axisLine={false} tickLine={false}
                domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              {goalWeight && (
                <ReferenceLine y={goalWeight} stroke="var(--tc-success)" strokeDasharray="5 5" strokeWidth={1.5}
                  label={{ value: `Goal ${goalWeight}`, position: 'right', fontSize: 10, fill: 'var(--tc-success)' }} />
              )}
              <Area type="monotone" dataKey="value" name="Weight" stroke="var(--tc-primary)" strokeWidth={2.5}
                fill="url(#wGrad)" dot={{ r: 3, fill: 'var(--tc-primary)', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
              <Line type="monotone" dataKey="ma" name="Trend" stroke="var(--tc-ai)" strokeWidth={1.5}
                strokeDasharray="4 2" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Progress Score Breakdown */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Progress Score Breakdown</h3>
          <div className={cn('text-2xl font-bold', score >= 70 ? 'text-success' : score >= 50 ? 'text-orange-500' : 'text-destructive')}>
            {score}<span className="text-xs font-normal text-muted-foreground ml-1">/100</span>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Weight Progress', value: scoreBreakdown.weight, color: 'var(--tc-success)' },
            { label: 'Training Compliance', value: scoreBreakdown.training, color: 'var(--tc-primary)' },
            { label: 'Nutrition Compliance', value: scoreBreakdown.nutrition, color: 'var(--tc-warning)' },
            { label: 'Check-in Consistency', value: scoreBreakdown.consistency, color: 'var(--tc-ai)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach Tools */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowLogWeight(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          + Log Weight
        </button>
        <button onClick={() => setShowNoteModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-background transition-colors">
          <NotebookPen className="w-3.5 h-3.5" /> Add Progress Note
        </button>
        <button
          onClick={() => toast.success('Progress report generation coming soon!')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-background transition-colors">
          <FileText className="w-3.5 h-3.5" /> Generate Report
        </button>
        <button
          onClick={() => {
            db.functions.invoke('sendEmailNotification', { to: client.email, subject: '🎉 You\'re crushing it!', html: `Hi ${client.name}! Your coach wants to celebrate your progress. Keep up the amazing work! 💪` }).then(() => toast.success('Celebration message sent!')).catch(() => toast.error('Could not send message'));
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-success bg-success/10 text-success hover:bg-success/10 transition-colors">
          <Trophy className="w-3.5 h-3.5" /> Celebrate Win
        </button>
      </div>

      {/* AI Insights */}
      <AIProgressInsights client={client} checkIns={checkIns} sessions={sessions} />

      {/* Log Weight Modal */}
      {showLogWeight && (
        <LogWeightModal
          client={client}
          onSave={(w, d, n) => logMutation.mutate({ client_id: client.id, client_name: client.name, date: d, weight: w, notes: n })}
          onClose={() => setShowLogWeight(false)}
          loading={logMutation.isPending}
        />
      )}

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Add Progress Note</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Note (private — coach only)</label>
              <textarea rows={4} value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="e.g. Client mentioned stress at work this week — may explain weight fluctuation"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-xs rounded-lg border border-border text-foreground">Cancel</button>
              <button onClick={() => noteMutation.mutate({ client_id: client.id, client_name: client.name, date: noteDate, internal_notes: noteText })}
                disabled={!noteText.trim() || noteMutation.isPending}
                className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {noteMutation.isPending ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}