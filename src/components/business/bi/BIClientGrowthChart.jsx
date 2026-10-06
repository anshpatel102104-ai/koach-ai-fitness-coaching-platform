import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Panel, PanelHeader } from '@/components/kit';
import { CHART, ChartTooltip, ChartLegend } from '@/components/business/ui';

export default function BIClientGrowthChart({ clients }) {
  const data = useMemo(() => {
    let runningTotal = 0;
    return Array.from({ length: 8 }, (_, i) => {
      const d = subMonths(new Date(), 7 - i);
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);

      const newClients = clients.filter(c => {
        const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
        return sd && sd >= monthStart && sd <= monthEnd;
      }).length;

      const churned = clients.filter(c => {
        if (c.lifecycle_status !== 'completed' && c.lifecycle_status !== 'alumni') return false;
        const ud = c.updated_date ? new Date(c.updated_date) : null;
        return ud && ud >= monthStart && ud <= monthEnd;
      }).length;

      runningTotal += newClients - churned;
      return {
        month: format(d, 'MMM'),
        full: format(d, 'MMMM yyyy'),
        new: newClients,
        churned: -churned,
        total: Math.max(0, runningTotal),
      };
    });
  }, [clients]);

  const added = data.reduce((s, d) => s + d.new, 0);
  const lost = data.reduce((s, d) => s - d.churned, 0);

  return (
    <Panel>
      <PanelHeader title="Client growth" subtitle={`${added} joined and ${lost} finished or left in the last 8 months.`} />
      <div className="px-3 sm:px-4">
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="month" tick={CHART.tick} axisLine={false} tickLine={false} />
            <YAxis tick={CHART.tick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--tc-accent)' }} content={<ChartTooltip format={(v) => Math.abs(v)} />} />
            <Bar isAnimationActive={false} dataKey="new" name="Joined" fill={CHART.ink} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar isAnimationActive={false} dataKey="churned" name="Left" fill={CHART.light} radius={[0, 0, 3, 3]} maxBarSize={28} />
            <Line isAnimationActive={false} type="monotone" dataKey="total" name="Net change" stroke={CHART.brand} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHART.brand }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        className="px-5 sm:px-6 pt-2 pb-5"
        items={[
          { color: CHART.ink, label: 'Joined' },
          { color: 'var(--tc-muted-foreground)', label: 'Finished or left' },
          { color: CHART.brand, label: 'Running total', dashed: false },
        ]}
      />
    </Panel>
  );
}
