import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';
import { Page, PageHeader, Panel, PanelHeader, Initials } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InsightsNav, StatusDot, Meter } from '@/components/business/ui';
import AnalyticsStatCard from '@/components/analytics/AnalyticsStatCard';
import AnalyticsTrendCard from '@/components/analytics/AnalyticsTrendCard';
import { getMonthRanges, calcRetentionTrend, calcChurnTrend, calcAdherenceTrend, calcWeightProgressTrend, calcSummaryStats } from '@/lib/analyticsEngine';
import { averageAdherenceScore, calculateStreak } from '@/lib/adherence';
import { differenceInDays, parseISO, format, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const INK = 'var(--tc-foreground)';

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

  const STATUS = {
    active: { label: 'Active', tone: 'success' },
    at_risk: { label: 'At risk', tone: 'danger' },
    completed: { label: 'Completed', tone: 'muted' },
    alumni: { label: 'Alumni', tone: 'muted' },
    lead: { label: 'Lead', tone: 'muted' },
  };
  const th = 'px-3 py-2.5 text-[13px] font-normal text-muted-foreground whitespace-nowrap';

  if (rows.length === 0) return null;

  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Every client" subtitle="Sorted by adherence, best first." />
      <div className="overflow-x-auto px-2 sm:px-3 pb-3">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border">
              <th className={cn(th, 'text-left')}>Client</th>
              <th className={cn(th, 'text-left')}>Status</th>
              <th className={cn(th, 'text-left')}>Last check-in</th>
              <th className={cn(th, 'text-right')}>Adherence</th>
              <th className={cn(th, 'text-right')}>Streak</th>
              <th className={cn(th, 'text-right')}>Last 2 vs prior 2</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ client, adherence, streak, lastDate, daysSince, trend }) => {
              const st = STATUS[client.lifecycle_status] || { label: client.lifecycle_status?.replace('_', ' ') || 'Unknown', tone: 'muted' };
              return (
                <tr key={client.id} className="border-b border-border last:border-0 hover:bg-accent/60 transition-colors">
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-3">
                      <Initials name={client.name} size={32} tone={client.lifecycle_status === 'at_risk' ? 'alert' : 'default'} />
                      <span className="text-[15px] font-semibold text-foreground">{client.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3"><StatusDot tone={st.tone}>{st.label}</StatusDot></td>
                  <td className="px-3 py-3 text-sm">
                    {lastDate ? (
                      <span className={daysSince > 14 ? 'text-destructive font-semibold' : 'text-foreground'}>
                        {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`}
                      </span>
                    ) : <span className="text-muted-foreground">Never</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('num text-[17px]', adherence < 50 ? 'text-destructive' : 'text-foreground')}>{adherence}%</span>
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-foreground tabular-nums">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : '—'}</td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums">
                    {trend === null ? <span className="text-muted-foreground">—</span>
                      : <span className={trend < -3 ? 'text-destructive font-semibold' : 'text-foreground'}>{trend > 0 ? '+' : ''}{Math.round(trend)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
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

  const today = format(new Date(), 'yyyy-MM-dd');
  const total = days.reduce((n, d) => n + d.count, 0);

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">This week</h2>
      <p className="text-sm text-muted-foreground mt-1">{total} check-ins so far. Number is check-ins that day, percent is their average compliance.</p>
      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {days.map(d => {
          const isToday = d.dateStr === today;
          return (
            <div
              key={d.dateStr}
              className={cn('rounded-lg px-1 py-2.5 text-center', isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}
            >
              <p className={cn('text-[13px]', isToday ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{d.label}</p>
              <p className="num text-[24px] leading-none mt-1">{d.count}</p>
              <p className={cn('text-xs mt-1 tabular-nums', isToday ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{d.count > 0 ? `${d.avgComp}%` : '—'}</p>
            </div>
          );
        })}
      </div>
    </Panel>
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
      { label: 'Most improved', ...mostImproved },
      { label: 'Longest streak', ...highestStreak },
      { label: 'Most recent check-in', ...mostConsistent },
      { label: 'Lowest adherence', alert: true, ...churnRisk },
    ];
  }, [clients, checkIns]);

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Standouts</h2>
      <p className="text-sm text-muted-foreground mt-1">Among active clients, from their recent check-ins.</p>
      <div className="mt-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
            <Initials name={m.client?.name || '?'} tone={m.alert && m.client ? 'alert' : 'default'} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-muted-foreground">{m.label}</p>
              <p className="text-[15px] font-semibold text-foreground truncate">{m.client?.name || 'Not enough data'}</p>
            </div>
            <p className={cn('text-sm font-semibold text-right', m.alert && m.client ? 'text-destructive' : 'text-foreground')}>{m.value || '—'}</p>
          </div>
        ))}
      </div>
    </Panel>
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
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Where clients are</h2>
      <p className="text-sm text-muted-foreground mt-1">Everyone by lifecycle stage, with the share that reached the next one.</p>
      <div className="mt-4">
        {stages.map((s, i) => {
          const conversion = i > 0 && stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : null;
          return (
            <div key={s.label} className="grid grid-cols-[88px_1fr_auto] sm:grid-cols-[110px_1fr_90px_110px] items-center gap-3 py-2.5 border-b border-border last:border-b-0">
              <p className="text-sm text-foreground">{s.label}</p>
              <Meter value={s.count} max={maxCount} />
              <p className="text-sm text-right tabular-nums"><span className="num text-[17px] text-foreground">{s.count}</span><span className="text-muted-foreground"> · {s.pct}%</span></p>
              <p className="hidden sm:block text-[13px] text-muted-foreground text-right">{conversion !== null ? `${conversion}% of previous` : ''}</p>
            </div>
          );
        })}
      </div>
    </Panel>
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
    if (Math.abs(delta) < 1) return 'Flat on last month';
    const n = Math.abs(Math.round(delta));
    return `${delta > 0 ? 'Up' : 'Down'} ${n} point${n === 1 ? '' : 's'} on last month`;
  };
  const trendPositive = (delta) => delta === null || Math.abs(delta) < 1 ? null : delta >= 0;

  const handleExport = () => {
    const rows = [['Name', 'Status', 'Adherence', 'Goal']];
    clients.forEach(c => rows.push([c.name, c.lifecycle_status, '', c.goal]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'analytics.csv'; a.click();
  };

  const subtitle = `${stats.retentionRate}% of clients are staying, adherence averages ${stats.avgAdherence}%. ${stats.atRisk ? `${stats.atRisk} at risk.` : 'Nobody at risk.'}`;

  return (
    <Page>
      <PageHeader
        title="Insights"
        subtitle={subtitle}
        actions={(
          <>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}><Download /> Export</Button>
          </>
        )}
      />
      <InsightsNav className="mb-5" />

      <div className="flex flex-col gap-5">
        {/* Stat row: one panel, hairline dividers */}
        <Panel className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden [&>*]:border-border [&>*:nth-child(2n)]:border-l [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-t-0 lg:[&>*:nth-child(n+2)]:border-l">
          <AnalyticsStatCard title="Retention" value={`${stats.retentionRate}%`} subtitle={`${stats.active} active clients`}
            trendLabel={trendLabel(retentionDelta)} trendPositive={trendPositive(retentionDelta)} />
          <AnalyticsStatCard title="Adherence" value={`${stats.avgAdherence}%`} subtitle="Training and nutrition"
            trendLabel={trendLabel(adherenceDelta)} trendPositive={trendPositive(adherenceDelta)} />
          <AnalyticsStatCard title="Weight change" value={stats.avgWeightDelta != null ? `${stats.avgWeightDelta > 0 ? '+' : ''}${stats.avgWeightDelta} lb` : '—'} subtitle="Average across clients"
            trendLabel={stats.avgWeightDelta != null ? (stats.avgWeightDelta < 0 ? 'Trending down' : stats.avgWeightDelta === 0 ? 'Holding steady' : 'Trending up') : 'Not enough weigh-ins'}
            trendPositive={null} />
          <AnalyticsStatCard title="At risk" value={`${stats.churnRate}%`} subtitle={`${stats.atRisk} client${stats.atRisk !== 1 ? 's' : ''}`}
            trendLabel={stats.atRisk > 0 ? 'Worth a message this week' : 'Everyone on track'} trendPositive={stats.atRisk === 0 ? null : false} />
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnalyticsTrendCard title="Retention" subtitle="Share of enrolled clients still active. Dashed line is 80%." data={retentionTrend} unit="%" color={INK} referenceValue={80}
            badge={`${stats.retentionRate}%`} />
          <AnalyticsTrendCard title="Adherence" subtitle="Training and nutrition compliance. Dashed line is 70%." data={adherenceTrend} unit="%" color={INK} referenceValue={70}
            badge={`${stats.avgAdherence}%`} />
          <AnalyticsTrendCard title="Weight progress" subtitle="Average change from each client's starting weight" data={weightTrend} unit=" lb" color={INK} referenceValue={0}
            formatter={v => `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10} lb`} badge={stats.avgWeightDelta != null ? `${stats.avgWeightDelta > 0 ? '+' : ''}${stats.avgWeightDelta} lb` : '—'} />
          <AnalyticsTrendCard title="At risk" subtitle="Share of clients flagged each month. Dashed line is 10%." data={churnTrend} unit="%" color={INK} referenceValue={10} lowerIsBetter
            badge={`${stats.churnRate}%`} badgeColor={stats.churnRate > 10 ? 'text-destructive' : undefined} />
        </div>

        <ClientActivityTable clients={clients} checkIns={checkIns} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WeeklyGrid checkIns={checkIns} />
          <TopMetricCards clients={clients} checkIns={checkIns} />
        </div>

        <RetentionFunnel clients={clients} />
      </div>
    </Page>
  );
}
