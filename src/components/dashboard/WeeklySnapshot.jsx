import React, { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, subDays, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { Panel, PanelHeader, Segmented } from '@/components/kit';

const RANGE_OPTIONS = [
  { key: 'this_week',  label: 'This week' },
  { key: 'last_week',  label: 'Last week' },
  { key: 'last_30',   label: '30 days' },
  { key: 'last_90',   label: '90 days' },
];

function getDateRange(key) {
  const now = new Date();
  switch (key) {
    case 'this_week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week': {
      const s = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { start: s, end: endOfWeek(s, { weekStartsOn: 1 }) };
    }
    case 'last_30':
      return { start: subDays(now, 29), end: now };
    case 'last_90':
      return { start: subDays(now, 89), end: now };
    default:
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

function getBarLabel(key, date) {
  if (key === 'last_30' || key === 'last_90') return format(date, 'MMM d');
  return format(date, 'EEE').slice(0, 3);
}

function groupByDay(items, dateField, range, rangeKey) {
  const days = eachDayOfInterval({ start: range.start, end: range.end });
  // For 30/90 days, bucket by week
  if (rangeKey === 'last_30' || rangeKey === 'last_90') {
    const buckets = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      const count = items.filter(item => {
        const d = parseISO(item[dateField]);
        return weekDays.some(wd => format(wd, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'));
      }).length;
      buckets.push({ label: format(weekDays[0], 'MMM d'), count });
    }
    return buckets;
  }
  return days.map(day => ({
    label: format(day, 'EEE').slice(0, 3),
    count: items.filter(item => format(parseISO(item[dateField]), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length,
  }));
}

const INK = 'rgb(var(--foreground))';
const GREY = 'rgb(var(--muted-foreground))';
const tooltipStyle = {
  fontSize: 12, borderRadius: 8, border: '1px solid rgb(var(--border))',
  background: 'rgb(var(--card))', color: 'rgb(var(--foreground))', boxShadow: 'none',
};

function MiniChart({ title, summary, chart }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-[13px] text-muted-foreground">{summary}</p>
      <div className="h-28">{chart}</div>
    </div>
  );
}

export default function WeeklySnapshot({ checkIns = [], clients = [] }) {
  const [range, setRange] = useState('this_week');
  const dateRange = useMemo(() => getDateRange(range), [range]);

  // Chart 1 — Check-in adherence
  const checkInData = useMemo(() => {
    const items = checkIns.filter(ci => {
      const d = parseISO(ci.date);
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end });
    });
    return groupByDay(items, 'date', dateRange, range);
  }, [checkIns, dateRange, range]);

  const totalCheckIns = useMemo(() => checkInData.reduce((s, d) => s + d.count, 0), [checkInData]);

  // Chart 2 — New clients joined
  const newClientData = useMemo(() => {
    const items = clients.filter(c => {
      if (!c.created_date) return false;
      const d = parseISO(c.created_date);
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end });
    });
    return groupByDay(items, 'created_date', dateRange, range);
  }, [clients, dateRange, range]);

  const totalNewClients = useMemo(() => newClientData.reduce((s, d) => s + d.count, 0), [newClientData]);

  // Chart 3 — Avg training compliance
  const complianceData = useMemo(() => {
    const items = checkIns.filter(ci => {
      const d = parseISO(ci.date);
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end }) && ci.compliance_training != null;
    });
    if (range === 'last_30' || range === 'last_90') {
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const buckets = [];
      for (let i = 0; i < days.length; i += 7) {
        const weekDays = days.slice(i, i + 7);
        const bucket = items.filter(ci => weekDays.some(wd => format(parseISO(ci.date), 'yyyy-MM-dd') === format(wd, 'yyyy-MM-dd')));
        const avg = bucket.length ? Math.round(bucket.reduce((s, ci) => s + ci.compliance_training, 0) / bucket.length) : 0;
        buckets.push({ label: format(weekDays[0], 'MMM d'), count: avg });
      }
      return buckets;
    }
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map(day => {
      const bucket = items.filter(ci => format(parseISO(ci.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
      const avg = bucket.length ? Math.round(bucket.reduce((s, ci) => s + ci.compliance_training, 0) / bucket.length) : 0;
      return { label: format(day, 'EEE').slice(0, 3), count: avg };
    });
  }, [checkIns, dateRange, range]);

  const avgCompliance = useMemo(() => {
    const vals = complianceData.filter(d => d.count > 0);
    return vals.length ? Math.round(vals.reduce((s, d) => s + d.count, 0) / vals.length) : 0;
  }, [complianceData]);

  const axisStyle = { fontSize: 11, fill: GREY };

  return (
    <Panel>
      <PanelHeader
        title="By the numbers"
        subtitle="Check-ins, new clients and training compliance over the period."
        right={<Segmented size="sm" value={range} onChange={setRange} options={RANGE_OPTIONS.map(o => ({ value: o.key, label: o.label }))} className="hidden md:inline-flex" />}
      />
      <div className="px-5 pb-2 md:hidden">
        <Segmented size="sm" value={range} onChange={setRange} options={RANGE_OPTIONS.map(o => ({ value: o.key, label: o.label }))} />
      </div>

      <div className="flex flex-col divide-y divide-border px-5 pb-5 sm:px-6 md:flex-row md:divide-x md:divide-y-0">
        <div className="min-w-0 flex-1 py-4 md:py-0 md:pr-6">
          <MiniChart
            title="Check-ins received"
            summary={`${totalCheckIns} in this period`}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkInData} barSize={14} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgb(var(--accent))' }} contentStyle={tooltipStyle} formatter={(v) => [v, 'Check-ins']} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {checkInData.map((d, i) => (
                      <Cell key={i} fill={INK} fillOpacity={d.count === 0 ? 0.15 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          />
        </div>

        <div className="min-w-0 flex-1 py-4 md:px-6 md:py-0">
          <MiniChart
            title="New clients"
            summary={`${totalNewClients} added`}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={newClientData} barSize={14} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgb(var(--accent))' }} contentStyle={tooltipStyle} formatter={(v) => [v, 'New clients']} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {newClientData.map((entry, i) => (
                      <Cell key={i} fill={GREY} fillOpacity={entry.count === 0 ? 0.2 : 0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          />
        </div>

        <div className="min-w-0 flex-1 py-4 md:py-0 md:pl-6">
          <MiniChart
            title="Training compliance"
            summary={`${avgCompliance}% average`}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Compliance']} />
                  <Line type="monotone" dataKey="count" stroke={INK} strokeWidth={2} dot={{ r: 2.5, fill: INK }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            }
          />
        </div>
      </div>
    </Panel>
  );
}
