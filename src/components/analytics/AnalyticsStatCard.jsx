import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Label over a big number with one line of context. Rendered without its own
 * surface so a row of them can sit in one panel with hairline dividers.
 * (`icon` and `dark` are accepted for older callers and ignored.)
 */
export default function AnalyticsStatCard({ title, value, subtitle, trendLabel, trendPositive, className }) {
  const isNeutral = trendPositive === null || trendPositive === undefined;
  return (
    <div className={cn('min-w-0 px-5 py-4 sm:px-6 sm:py-5', className)}>
      <p className="text-[13px] text-muted-foreground truncate">{title}</p>
      <p className="num text-[30px] leading-none mt-1.5 text-foreground">{value}</p>
      {subtitle && <p className="text-[13px] text-muted-foreground mt-1.5 truncate">{subtitle}</p>}
      {trendLabel && (
        <p className={cn('text-[13px] mt-0.5 truncate', isNeutral ? 'text-muted-foreground' : trendPositive ? 'text-foreground' : 'text-destructive font-medium')}>
          {trendLabel}
        </p>
      )}
    </div>
  );
}
