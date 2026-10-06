import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { CHART, ChartTooltip } from '@/components/business/ui';

/** Ink line, dashed grey target, brand dot on the latest point. */
export default function TrendChart({ data, unit, color = CHART.ink, referenceValue, formatter, className }) {
  const rows = data || [];
  const fmt = (v) => (formatter ? formatter(v) : `${v}${unit || ''}`);
  const stroke = color === 'var(--tc-primary)' ? CHART.ink : color;
  return (
    <div className={cn('w-full h-40', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="label" tick={CHART.tick} axisLine={false} tickLine={false} />
          <YAxis tick={CHART.tick} axisLine={false} tickLine={false} width={36} />
          {referenceValue != null && (
            <ReferenceLine y={referenceValue} stroke={CHART.grey} strokeDasharray="4 4" strokeWidth={1} />
          )}
          <Tooltip cursor={{ stroke: CHART.light }} content={<ChartTooltip format={fmt} />} />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={(props) => {
              const isLast = props.index === rows.length - 1;
              if (props.cx == null || props.cy == null) return <g key={props.index} />;
              return <circle key={props.index} cx={props.cx} cy={props.cy} r={isLast ? 4.5 : 0} fill={CHART.brand} stroke="none" />;
            }}
            activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
