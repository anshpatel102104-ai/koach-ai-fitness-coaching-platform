import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { TrendingDown, TrendingUp, Activity, Weight, BarChart3, UserCheck, ArrowUp, ArrowDown, Minus, AlertTriangle, Zap, Shield } from 'lucide-react';
import AnalyticsStatCard from '@/components/analytics/AnalyticsStatCard';
import AnalyticsTrendCard from '@/components/analytics/AnalyticsTrendCard';
import { getMonthRanges, calcRetentionTrend, calcChurnTrend, calcAdherenceTrend, calcWeightProgressTrend, calcSummaryStats } from '@/lib/analyticsEngine';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { differenceInDays, parseISO, format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const BLUE = 'var(--tc-primary)';

// ── Client Activity Table ──────────────────────────────────────────────────
function ClientActivityTable({ clients, checkIns }) {
  const rows = useMemo(() => clients
    .filter(c => c.lifecycle_status !== 'lead')
    .map(c => {
      const cis = checkIns.filter(ci => ci.client_id === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const adherence = averageAdherenceScore(cis) ?? 0;
      const streak = calculateStreak(cis);
      const lastDate = cis[0]?.date;
      const daysSince = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : 999;
      const recentAdh = averageAdherenceScore(cis.slice(0, 2));
      const prevAdh = averageAdherenceScore(cis.slice(2, 4));
      const trend = recentAdh != null && prevAdh != null ? recentAdh - prevAdh : null;
      return { client: c, adherence: Math.round(adherence), streak, lastDate, daysSince, trend };
    })
    .sort((a, b) => b.adherence - a.adherence),
  [clients, checkIns]);

  const adherenceColor = (v) => v >= 80 ? 'text-success bg-success/10' : v >= 60 ? 'text-warning bg-warning/10' : 'text-destructive bg-destructive/10';
  const statusColors = { active: 'bg-success/10 text-success', at_risk: 'bg-destructive/10 text-destructive', completed: 'bg-ai/10 text-ai', alumni: 'bg-muted text-muted-foreground', lead: 'bg-accent text-primary' };

  if (rows.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Client Activity Summary</p>
        <p className="text-xs text-muted-foreground mt-0.5">All clients sorted by adherence score</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Client</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Last Check-In</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Adherence</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Streak</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, adherence, streak, lastDate, daysSince, trend }) => (
              <tr key={client.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {client.name?.[0]}
                    </div>
                    <span className="font-medium text-foreground text-sm">{client.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', statusColors[client.lifecycle_status] || 'bg-muted text-muted-foreground')}>
                    {client.lifecycle_status?.replace('_', ' ') || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {lastDate ? (
                    <span className={daysSince > 14 ? 'text-destructive font-medium' : daysSince > 7 ? 'text-warning' : 'text-muted-foreground'}>
                      {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', adherenceColor(adherence))}>
                    {adherence}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-semibold text-foreground">{streak > 0 ? `🔥 ${streak}d` : '—'}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {trend === null ? <span className="text-muted-foreground">—</span>
                    : trend > 3 ? <ArrowUp className="w-4 h-4 text-success mx-auto" />
                    : trend < -3 ? <ArrowDown className="w-4 h-4 text-destructive mx-auto" />
                    : <Minus className="w-4 h-4 text-muted-foreground mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Weekly Performance Grid ────────────────────────────────────────────────
function WeeklyGrid({ checkIns }) {
  const days = useMemo(() => {
    const week = [];
    const mon = startOfWeek(new Date(), { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayCIs = checkIns.filter(ci => ci.date === dateStr);
      const avgComp = dayCIs.length ? Math.round(dayCIs.reduce((s, ci) => s + ((ci.compliance_training || 0) + (ci.compliance_nutrition || 0)) / 2, 0) / dayCIs.length) : 0;
      week.push({ label: format(d, 'EEE'), dateStr, count: dayCIs.length, avgComp });
    }
    return week;
  }, [checkIns]);

  const maxCount = Math.max(...days.map(d => d.count), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-sm font-semibold text-foreground mb-1">Weekly Performance Grid</p>
      <p className="text-xs text-muted-foreground mb-4">Check-in activity this week (Mon–Sun)</p>
      <div className="grid grid-cols-7 gap-2">
        {days.map(d => {
          const intensity = d.count === 0 ? 0 : Math.round((d.count / maxCount) * 5);
          const bgMap = ['bg-muted', 'bg-accent', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary'];
          const textMap = ['text-muted-foreground', 'text-primary', 'text-primary', 'text-white', 'text-white', 'text-white'];
          return (
            <div key={d.dateStr} className="flex flex-col items-center gap-1.5">
              <div className={cn('w-full aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all', bgMap[intensity], textMap[intensity])}>
                {d.count || '0'}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
              {d.count > 0 && <span className="text-[10px] text-muted-foreground">{d.avgComp}%</span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {['bg-muted', 'bg-accent', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary'].map((bg, i) => (
          <div key={i} className={cn('w-3.5 h-3.5 rounded', bg)} />
        ))}
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}

// ── Top Metric Cards ───────────────────────────────────────────────────────
function TopMetricCards({ clients, checkIns }) {
  const metrics = useMemo(() => {
    const active = clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active');

    let mostImproved = null, highestStreak = null, mostConsistent = null, churnRisk = null;
    let bestImprovement = -Infinity, bestStreak = 0, bestConsistency = -Infinity, worstScore = Infinity;

    for (const c of active) {
      const cis = checkIns.filter(ci => ci.client_id === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const streak = calculateStreak(cis);
      const recentScore = averageAdherenceScore(cis.slice(0, 2));
      const olderScore = averageAdherenceScore(cis.slice(2, 4));
      const improvement = recentScore != null && olderScore != null ? recentScore - olderScore : null;
      const missed = cis.length > 0 ? differenceInDays(new Date(), parseISO(cis[0].date)) : 999;

      if (improvement !== null && improvement > bestImprovement) { bestImprovement = improvement; mostImproved = { client: c, value: `+${Math.round(improvement)}%` }; }
      if (streak > bestStreak) { bestStreak = streak; highestStreak = { client: c, value: `${streak} days` }; }
      if (missed < bestConsistency || bestConsistency === -Infinity) { bestConsistency = missed; mostConsistent = { client: c, value: missed === 0 ? 'Today' : `${missed}d ago` }; }
      if (recentScore !== null && recentScore < worstScore) { worstScore = recentScore; churnRisk = { client: c, value: `${Math.round(recentScore)}% adherence` }; }
    }

    return [
      { icon: <TrendingUp className="w-4 h-4 text-success" />, label: 'Most Improved', bg: 'bg-success/10', ...mostImproved },
      { icon: <Zap className="w-4 h-4 text-warning" />, label: 'Highest Streak', bg: 'bg-warning/10', ...highestStreak },
      { icon: <Shield className="w-4 h-4 text-primary" />, label: 'Most Consistent', bg: 'bg-accent', ...mostConsistent },
      { icon: <AlertTriangle className="w-4 h-4 text-destructive" />, label: 'Churn Risk', bg: 'bg-destructive/10', ...churnRisk },
    ];
  }, [clients, checkIns]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', m.bg)}>{m.icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
            <p className="text-sm font-bold text-foreground mt-0.5 truncate">{m.client?.name || '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.value || 'No data'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Retention Funnel ───────────────────────────────────────────────────────
function RetentionFunnel({ clients }) {
  const stages = useMemo(() => {
    const total = clients.length || 1;
    const counts = {
      lead: clients.filter(c => c.lifecycle_status === 'lead').length,
      active: clients.filter(c => c.lifecycle_status === 'active').length,
      completed: clients.filter(c => c.lifecycle_status === 'completed').length,
      alumni: clients.filter(c => c.lifecycle_status === 'alumni').length,
    };
    return [
      { label: 'Lead', count: counts.lead, pct: Math.round((counts.lead / total) * 100) },
      { label: 'Active', count: counts.active, pct: Math.round((counts.active / total) * 100) },
      { label: 'Completed', count: counts.completed, pct: Math.round((counts.completed / total) * 100) },
      { label: 'Alumni', count: counts.alumni, pct: Math.round((counts.alumni / total) * 100) },
    ];
  }, [clients]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-sm font-semibold text-foreground mb-1">Retention Funnel</p>
      <p className="text-xs text-muted-foreground mb-4">Client lifecycle stage distribution</p>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const barPct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
          const conversion = i > 0 && stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : null;
          return (
            <div key={s.label}>
              {i > 0 && conversion !== null && (
                <div className="flex items-center gap-2 my-1 pl-1">
                  <div className="w-px h-3 bg-border ml-3" />
                  <span className="text-[10px] text-muted-foreground">{conversion}% conversion</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground w-20 shrink-0 font-medium">{s.label}</span>
                <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden relative">
                  <div className="h-full bg-border rounded-full transition-all" style={{ width: `${Math.max(barPct, 2)}%` }} />
                  <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-foreground">
                    {s.count} clients
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground w-10 text-right">{s.pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30');

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => db.entities.Client.list() });
  const { data: checkIns = [] } = useQuery({ queryKey: ['checkins-analytics'], queryFn: () => db.entities.CheckIn.list('-date', 500) });

  const months = useMemo(() => getMonthRanges(6), []);
  const retentionTrend = useMemo(() => calcRetentionTrend(clients, months), [clients, months]);
  const churnTrend = useMemo(() => calcChurnTrend(clients, checkIns, months), [clients, checkIns, months]);
  const adherenceTrend = useMemo(() => calcAdherenceTrend(checkIns, months), [checkIns, months]);
  const weightTrend = useMemo(() => calcWeightProgressTrend(checkIns, clients, months), [checkIns, clients, months]);
  const stats = useMemo(() => calcSummaryStats(clients, checkIns), [clients, checkIns]);

  const retentionDelta = retentionTrend.length >= 2 ? retentionTrend[retentionTrend.length - 1].value - retentionTrend[retentionTrend.length - 2].value : null;
  const adherenceDelta = adherenceTrend.length >= 2 ? adherenceTrend[adherenceTrend.length - 1].value - adherenceTrend[adherenceTrend.length - 2].value : null;

  const trendLabel = (delta) => {
    if (delta === null) return 'No data yet';
    if (Math.abs(delta) < 1) return '—';
    return `${delta > 0 ? '+' : ''}${Math.round(delta)}% vs last month`;
  };
  const trendPositive = (delta) => delta === null || Math.abs(delta) < 1 ? null : delta >= 0;

  const handleExport = () => {
    const rows = [['Name', 'Status', 'Adherence', 'Goal']];
    clients.forEach(c => rows.push([c.name, c.lifecycle_status, '', c.goal]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'analytics.csv'; a.click();
  };

  return (
    <div className="p-3 sm:p-6 lg:p-6 max-w-6xl mx-auto space-y-5 w-full">
      {/* ── Dark header ── */}
      <div className="bg-sidebar rounded-xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--kc-w-10)] flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white leading-tight">Coach Analytics</h1>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">Track retention, adherence, and client progress trends</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="bg-[var(--kc-w-10)] text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="all">All time</option>
          </select>
          <button onClick={handleExport} className="px-4 py-1.5 bg-card text-foreground rounded-lg text-sm font-semibold hover:bg-[var(--kc-w-90)] transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <AnalyticsStatCard dark title="Retention Rate" value={`${stats.retentionRate}%`} subtitle={`${stats.active} active clients`} icon={UserCheck}
          trendLabel={trendLabel(retentionDelta)} trendPositive={trendPositive(retentionDelta)} />
        <AnalyticsStatCard dark title="Avg Adherence" value={`${stats.avgAdherence}%`} subtitle="Training + nutrition avg" icon={Activity}
          trendLabel={trendLabel(adherenceDelta)} trendPositive={trendPositive(adherenceDelta)} />
        <AnalyticsStatCard dark title="Avg Weight Change" value={stats.avgWeightDelta != null ? `${stats.avgWeightDelta > 0 ? '+' : ''}${stats.avgWeightDelta} lbs` : '—'} subtitle="Across all clients" icon={Weight}
          trendLabel={stats.avgWeightDelta != null ? (stats.avgWeightDelta < 0 ? 'On track' : stats.avgWeightDelta === 0 ? 'Stable' : 'Gaining') : 'Not enough data'}
          trendPositive={stats.avgWeightDelta != null ? stats.avgWeightDelta <= 0 : null} />
        <AnalyticsStatCard dark title="Churn Risk" value={`${stats.churnRate}%`} subtitle={`${stats.atRisk} at-risk client${stats.atRisk !== 1 ? 's' : ''}`} icon={TrendingDown}
          trendLabel={stats.atRisk > 0 ? 'Needs attention' : 'All good'} trendPositive={stats.atRisk === 0} />
      </div>

      {/* ── Trend charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnalyticsTrendCard title="Client Retention Rate" subtitle="% of enrolled clients staying active" data={retentionTrend} unit="%" color={BLUE} referenceValue={80}
          badge={`${stats.retentionRate}%`} badgeColor="bg-accent text-primary" />
        <AnalyticsTrendCard title="Avg Adherence Score" subtitle="Training + nutrition compliance" data={adherenceTrend} unit="%" color={BLUE} referenceValue={70}
          badge={`${stats.avgAdherence}%`} badgeColor="bg-accent text-primary" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnalyticsTrendCard title="Avg Weight Progress" subtitle="Mean lbs change from each client's baseline" data={weightTrend} unit=" lbs" color={BLUE} referenceValue={0}
          formatter={v => `${v > 0 ? '+' : ''}${v} lbs`} badge={stats.avgWeightDelta != null ? `${stats.avgWeightDelta > 0 ? '+' : ''}${stats.avgWeightDelta} lbs` : '—'} badgeColor="bg-accent text-primary" />
        <AnalyticsTrendCard title="Churn Rate" subtitle="% of clients flagged at-risk each month" data={churnTrend} unit="%" color={BLUE} referenceValue={10}
          badge={`${stats.churnRate}%`} badgeColor={stats.churnRate > 10 ? 'bg-destructive/10 text-destructive' : 'bg-accent text-primary'} />
      </div>

      {/* ── Client Activity Table ── */}
      <ClientActivityTable clients={clients} checkIns={checkIns} />

      {/* ── Weekly Grid + Top Metrics (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WeeklyGrid checkIns={checkIns} />
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Top Metrics</p>
          <TopMetricCards clients={clients} checkIns={checkIns} />
        </div>
      </div>

      {/* ── Retention Funnel ── */}
      <RetentionFunnel clients={clients} />
    </div>
  );
}