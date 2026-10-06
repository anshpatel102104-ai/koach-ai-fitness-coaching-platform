import React from 'react';
import { cn } from '@/lib/utils';

/** Flat stat tile: sentence-case label, big condensed figure, one line of context. */
export default function StatCard({ label, value, sub, trend, trendUp, className }) {
  return (
    <div className={cn('panel p-5', className)}>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="num text-[32px] leading-none text-foreground mt-2">{value}</p>
      {(sub || trend) && (
        <p className="text-[13px] text-muted-foreground mt-2">
          {trend && <span className={cn('font-semibold mr-1.5', trendUp ? 'text-success' : 'text-destructive')}>{trend}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
