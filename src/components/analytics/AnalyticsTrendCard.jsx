import React from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/kit';
import TrendChart from './TrendChart';

/** Panel: title, latest value as a big number, change vs last month, line chart. */
export default function AnalyticsTrendCard({ title, subtitle, data, unit, color, referenceValue, formatter, badge, badgeColor, className, lowerIsBetter }) {
  const last = data?.[data.length - 1]?.value;
  const prev = data?.[data.length - 2]?.value;
  const delta = last != null && prev != null ? last - prev : null;
  const fmt = (v) => (typeof formatter === 'function' ? formatter(v) : `${Math.round(v * 10) / 10}${unit || ''}`);
  const bad = delta != null && (lowerIsBetter ? delta > 0 : delta < 0);
  const danger = badgeColor && badgeColor.includes('destructive');

  return (
    <Panel className={cn('px-5 pt-5 pb-3 sm:px-6 sm:pt-6', className)}>
      <h2 className="text-[20px] text-foreground">{title}</h2>
      {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
      <div className="flex items-baseline gap-3 mt-3 mb-2">
        <p className={cn('num text-[34px] leading-none', danger ? 'text-destructive' : 'text-foreground')}>
          {last != null ? fmt(last) : (badge || '—')}
        </p>
        {delta != null && Math.abs(delta) >= 1 && (
          <p className={cn('text-[13px]', bad ? 'text-destructive' : 'text-muted-foreground')}>
            {delta > 0 ? '+' : ''}{fmt(delta)} on last month
          </p>
        )}
      </div>
      <TrendChart data={data} unit={unit} color={color} referenceValue={referenceValue} formatter={formatter} />
    </Panel>
  );
}
