import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Panel, PanelHeader, Segmented } from '@/components/kit';
import { CHART, ChartTooltip, ChartLegend, money, moneyAxis } from '@/components/business/ui';
import { subMonths, format, startOfMonth, parseISO, endOfMonth } from 'date-fns';

const RANGES = [
  { label: '3 mo', months: 3 },
  { label: '6 mo', months: 6 },
  { label: '1 yr', months: 12 },
];

export default function BIRevenueChart({ clients, payments }) {
  const [range, setRange] = useState(6);

  const data = useMemo(() => {
    const months = Array.from({ length: range }, (_, i) => {
      const d = subMonths(new Date(), range - 1 - i);
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);

      // Active clients in that month
      const activeThen = clients.filter(c => {
        const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
        return sd && sd <= monthEnd && (c.lifecycle_status === 'active' || c.lifecycle_status === 'at_risk' || !c.lifecycle_status || c.status === 'active');
      });

      const newClients = clients.filter(c => {
        const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
        return sd && sd >= monthStart && sd <= monthEnd;
      });

      const mrr = activeThen.reduce((s, c) => s + (c.monthly_rate || 0), 0);
      const newRevenue = newClients.reduce((s, c) => s + (c.monthly_rate || 0), 0);

      return {
        month: format(d, 'MMM'),
        full: format(d, 'MMMM yyyy'),
        mrr,
        newRevenue,
        existingRevenue: Math.max(0, mrr - newRevenue),
      };
    });
    return months;
  }, [clients, range, payments]);

  const maxMrr = Math.max(...data.map(d => d.mrr), 1);
  // Milestone markers
  const milestones = [1000, 5000, 10000].filter(m => m <= maxMrr * 1.2 && m > 0);

  const latest = data[data.length - 1]?.mrr || 0;
  const first = data[0]?.mrr || 0;
  const change = latest - first;

  return (
    <Panel>
      <PanelHeader
        title="Recurring revenue"
        subtitle={`${money(latest)} a month now, ${change === 0 ? 'flat' : `${change > 0 ? 'up' : 'down'} ${money(Math.abs(change))}`} over ${range} months.`}
        right={<Segmented className="hidden sm:inline-flex" size="sm" value={range} onChange={setRange} options={RANGES.map(r => ({ value: r.months, label: r.label }))} />}
      />
      <Segmented className="sm:hidden mx-5 mb-2" size="sm" value={range} onChange={setRange} options={RANGES.map(r => ({ value: r.months, label: r.label }))} />
      <div className="px-3 sm:px-4">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="month" tick={CHART.tick} axisLine={false} tickLine={false} />
            <YAxis tick={CHART.tick} axisLine={false} tickLine={false} width={48} tickFormatter={moneyAxis} />
            <Tooltip cursor={{ fill: 'var(--tc-accent)' }} content={<ChartTooltip format={(v) => money(v)} />} />
            {milestones.map(m => (
              <ReferenceLine key={m} y={m} stroke={CHART.grey} strokeDasharray="4 4" strokeWidth={1}
                label={{ value: moneyAxis(m), position: 'insideTopLeft', fontSize: 11, fill: CHART.grey }} />
            ))}
            <Bar isAnimationActive={false} dataKey="existingRevenue" name="Existing clients" stackId="mrr" fill={CHART.ink} maxBarSize={36} />
            <Bar isAnimationActive={false} dataKey="newRevenue" name="New this month" stackId="mrr" fill={CHART.newBar} radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        className="px-5 sm:px-6 pt-2 pb-5"
        items={[
          { color: CHART.ink, label: 'Existing clients' },
          { color: CHART.newBar, label: 'New clients that month' },
        ]}
      />
    </Panel>
  );
}
