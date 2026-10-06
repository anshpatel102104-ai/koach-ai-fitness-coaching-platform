import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { Panel, PanelHeader } from '@/components/kit';
import { CHART, ChartTooltip, money, moneyAxis } from '@/components/business/ui';

export default function RevenueChart({ invoices = [] }) {
  const data = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const revenue = invoices
        .filter(inv => inv.status === 'paid' && inv.paid_date)
        .filter(inv => { try { return isWithinInterval(parseISO(inv.paid_date), { start, end }); } catch { return false; } })
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
      return { month: format(d, 'MMM'), full: format(d, 'MMMM yyyy'), revenue };
    });
  }, [invoices]);

  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <Panel>
      <PanelHeader title="Collected by month" subtitle={`${money(total)} over the last 12 months. This month in blue.`} />
      <div className="px-3 sm:px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
            <XAxis dataKey="month" tick={CHART.tick} axisLine={false} tickLine={false} />
            <YAxis tick={CHART.tick} axisLine={false} tickLine={false} width={48} tickFormatter={moneyAxis} />
            <Tooltip
              cursor={{ fill: 'var(--tc-accent)' }}
              content={<ChartTooltip format={(v) => money(v)} />}
            />
            <Bar isAnimationActive={false} dataKey="revenue" radius={[3, 3, 0, 0]} maxBarSize={36}>
              {data.map((d, i) => <Cell key={d.month + i} fill={i === data.length - 1 ? CHART.brand : CHART.ink} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
