import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Panel, PanelHeader } from '@/components/kit';
import { CHART, ChartTooltip, money, moneyAxis } from '@/components/business/ui';

export default function StripeRevenueChart({ data }) {
  const rows = data || [];
  const last = rows[rows.length - 1];
  return (
    <Panel className="h-full">
      <PanelHeader
        title="Stripe revenue"
        subtitle={last ? `${money(last.revenue)} in ${last.month}. Last 6 months.` : 'Last 6 months.'}
      />
      {rows.length === 0 ? (
        <p className="px-5 sm:px-6 pb-6 text-sm text-muted-foreground">No Stripe charges in the last 6 months.</p>
      ) : (
      <div className="px-3 sm:px-4 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="month" tick={CHART.tick} axisLine={false} tickLine={false} />
            <YAxis tick={CHART.tick} axisLine={false} tickLine={false} width={48} tickFormatter={moneyAxis} />
            <Tooltip cursor={{ stroke: CHART.light }} content={<ChartTooltip format={(v) => money(v)} />} />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={CHART.ink}
              strokeWidth={2}
              dot={(props) => {
                const isLast = props.index === rows.length - 1;
                return <circle key={props.index} cx={props.cx} cy={props.cy} r={isLast ? 4.5 : 2.5} fill={isLast ? CHART.brand : CHART.ink} stroke="none" />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </Panel>
  );
}
