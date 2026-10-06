import React, { useState, useMemo } from 'react';
import { subWeeks, parseISO, format, startOfWeek } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import { averageAdherenceScore } from '@/lib/adherence';
import { Panel, PanelHeader, Segmented } from '@/components/kit';

const CHART_TABS = ['Overall', 'Workout', 'Nutrition'];
const INK = 'rgb(var(--foreground))';
const GREY = 'rgb(var(--muted-foreground))';
const BRAND = 'rgb(var(--brand))';

function buildWeeklyData(clients, cisByClient, key, rangeWeeks) {
  const weeks = [];
  for (let i = rangeWeeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const weekEnd = subWeeks(new Date(), i - 1);
    const point = { week: format(weekStart, 'MMM d') };
    let teamTotal = 0; let teamCount = 0;
    for (const client of clients) {
      const cis = (cisByClient[client.id] || []).filter(ci => {
        const d = parseISO(ci.date);
        return d >= weekStart && d < weekEnd;
      });
      if (!cis.length) { point[client.id] = null; continue; }
      let val;
      if (key === 'overall') val = averageAdherenceScore(cis);
      else if (key === 'workout') {
        const vals = cis.map(ci => ci.compliance_training).filter(v => v != null);
        val = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      } else {
        const vals = cis.map(ci => ci.compliance_nutrition).filter(v => v != null);
        val = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      }
      point[client.id] = val;
      if (val !== null) { teamTotal += val; teamCount++; }
    }
    point.team_avg = teamCount ? Math.round(teamTotal / teamCount) : null;
    weeks.push(point);
  }
  return weeks;
}

const CustomTooltip = ({ active, payload, label, clients }) => {
  if (!active || !payload?.length) return null;
  const rows = [...payload].filter(p => p.value !== null && p.value !== undefined).sort((a, b) => (a.dataKey === 'team_avg' ? -1 : b.dataKey === 'team_avg' ? 1 : b.value - a.value));
  return (
    <div className="min-w-[160px] rounded-lg bg-card px-3 py-2.5 text-[13px] shadow-[0_0_0_1px_rgb(var(--border))]">
      <p className="mb-1.5 font-semibold text-foreground">Week of {label}</p>
      {rows.map((p, i) => {
        const isTeam = p.dataKey === 'team_avg';
        const clientName = isTeam ? 'Roster average' : clients.find(c => c.id === p.dataKey)?.name || p.dataKey;
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className={cn(isTeam ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{clientName}</span>
            <span className="font-semibold tabular-nums text-foreground">{p.value}%</span>
          </div>
        );
      })}
    </div>
  );
};

export default function AdherenceTrends({ clients, checkIns, rangeWeeks }) {
  const [tab, setTab] = useState('Overall');
  const [hiddenClients, setHiddenClients] = useState(new Set());
  const [focusId, setFocusId] = useState(null);

  const cisByClient = useMemo(() => {
    const map = {};
    for (const ci of checkIns) (map[ci.client_id] = map[ci.client_id] || []).push(ci);
    return map;
  }, [checkIns]);

  const chartData = useMemo(() =>
    buildWeeklyData(clients, cisByClient, tab.toLowerCase(), Math.min(rangeWeeks, 12)),
    [clients, cisByClient, tab, rangeWeeks]
  );

  const toggleClient = (id) => {
    setHiddenClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Summary stats
  const summary = useMemo(() => {
    const key = tab === 'Overall' ? 'overall' : tab === 'Workout' ? 'workout' : 'nutrition';
    const scored = clients.map(client => {
      const cis = cisByClient[client.id] || [];
      const sorted = [...cis].sort((a, b) => new Date(b.date) - new Date(a.date));
      const cutoff = subWeeks(new Date(), rangeWeeks);
      const inRange = sorted.filter(ci => parseISO(ci.date) >= cutoff);
      const prevInRange = sorted.filter(ci => {
        const d = parseISO(ci.date);
        return d >= subWeeks(new Date(), rangeWeeks * 2) && d < cutoff;
      });
      let val;
      if (key === 'overall') val = inRange.length ? averageAdherenceScore(inRange) : null;
      else {
        const field = key === 'workout' ? 'compliance_training' : 'compliance_nutrition';
        const vals = inRange.map(ci => ci[field]).filter(v => v != null);
        val = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      }
      let prevVal = null;
      if (key === 'overall') prevVal = prevInRange.length ? averageAdherenceScore(prevInRange) : null;
      else {
        const field = key === 'workout' ? 'compliance_training' : 'compliance_nutrition';
        const vals = prevInRange.map(ci => ci[field]).filter(v => v != null);
        prevVal = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      }
      return { client, val, improvement: val !== null && prevVal !== null ? val - prevVal : null };
    }).filter(x => x.val !== null);

    const best = scored.sort((a, b) => b.val - a.val)[0];
    const mostImproved = scored.filter(x => x.improvement !== null).sort((a, b) => b.improvement - a.improvement)[0];
    const needsAttention = scored.sort((a, b) => a.val - b.val)[0];
    return { best, mostImproved, needsAttention };
  }, [clients, cisByClient, tab, rangeWeeks]);

  const visibleClients = clients.slice(0, 8);

  const Highlight = ({ label, entry, value, tone }) => (
    <div className="min-w-0 px-5 py-4 sm:px-6">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      {entry ? (
        <>
          <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{entry.client.name}</p>
          <p className={cn('num text-[22px]', tone)}>{value}</p>
        </>
      ) : <p className="mt-1 text-sm text-muted-foreground">Not enough data</p>}
    </div>
  );

  return (
    <Panel>
      <PanelHeader
        title="Trends"
        subtitle="Roster average in ink. Pick a client to compare them against it."
        right={<Segmented size="sm" value={tab} onChange={setTab} options={CHART_TABS.map(t => ({ value: t, label: t === 'Workout' ? 'Training' : t }))} className="hidden sm:inline-flex" />}
      />
      <div className="px-5 sm:hidden">
        <Segmented size="sm" value={tab} onChange={setTab} options={CHART_TABS.map(t => ({ value: t, label: t === 'Workout' ? 'Training' : t }))} />
      </div>

      <div className="px-5 pb-2 pt-3 sm:px-6">
        {/* Client toggles: click a name to highlight it, double-click to hide it */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {visibleClients.map(c => {
            const hidden = hiddenClients.has(c.id);
            const focused = focusId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFocusId(f => (f === c.id ? null : c.id))}
                onDoubleClick={() => toggleClient(c.id)}
                title="Click to highlight, double-click to hide"
                className={cn(
                  'touch-compact inline-flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium transition-colors',
                  focused ? 'bg-brand text-brand-foreground' : 'bg-secondary text-foreground hover:bg-accent',
                  hidden && 'opacity-40 line-through'
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {chartData.length < 2 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Trends appear once there are two weeks of check-ins.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: GREY }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: GREY }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip clients={visibleClients} />} />
              {visibleClients.map(c => (
                !hiddenClients.has(c.id) && (
                  <Line key={c.id} type="monotone" dataKey={c.id}
                    stroke={focusId === c.id ? BRAND : GREY}
                    strokeOpacity={focusId && focusId !== c.id ? 0.2 : focusId === c.id ? 1 : 0.35}
                    strokeWidth={focusId === c.id ? 2.5 : 1.25}
                    dot={focusId === c.id ? { r: 3, fill: BRAND, strokeWidth: 0 } : false}
                    activeDot={{ r: 4 }} connectNulls />
                )
              ))}
              <Line type="monotone" dataKey="team_avg" stroke={INK} strokeWidth={2.5}
                dot={false} connectNulls name="Roster average" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Highlight label="Best this period" entry={summary.best} value={summary.best ? `${summary.best.val}%` : ''} tone="text-foreground" />
        <Highlight label="Most improved" entry={summary.mostImproved} value={summary.mostImproved ? `${summary.mostImproved.improvement >= 0 ? '+' : ''}${summary.mostImproved.improvement} pts` : ''} tone="text-success" />
        <Highlight label="Needs attention" entry={summary.needsAttention} value={summary.needsAttention ? `${summary.needsAttention.val}%` : ''} tone="text-destructive" />
      </div>
    </Panel>
  );
}
