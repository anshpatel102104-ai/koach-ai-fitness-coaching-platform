import React from 'react';
import { cn } from '@/lib/utils';
import { Ring } from '@/components/portal/PortalUI';

function MacroRow({ label, consumed, target }) {
  const pct = target > 0 ? (consumed / target) * 100 : 0;
  const over = pct > 100;
  return (
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn('h-full rounded-full transition-[width] duration-500', over ? 'bg-destructive' : 'bg-foreground')} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[13px] tabular-nums text-foreground">
        <span className="font-semibold">{Math.round(consumed)}</span>
        <span className="text-muted-foreground"> / {target} g</span>
      </span>
    </div>
  );
}

/** Day summary: calories left (ink ring) + protein / carbs / fat bars. */
export default function DailyMacroHeader({ totals, targets }) {
  const calPct = targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0;
  const left = targets.calories - totals.calories;

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-4">
        <Ring pct={calPct} size={72} stroke={9} barClass={left < 0 ? 'text-destructive' : 'text-foreground'} />
        <div className="min-w-0">
          <p className="num text-[30px] text-foreground">
            {left >= 0 ? `${Math.round(left).toLocaleString()} left` : `${Math.round(-left).toLocaleString()} over`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {Math.round(totals.calories).toLocaleString()} of {targets.calories.toLocaleString()} calories
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5 border-t border-border pt-4">
        <MacroRow label="Protein" consumed={totals.protein} target={targets.protein} />
        <MacroRow label="Carbs" consumed={totals.carbs} target={targets.carbs} />
        <MacroRow label="Fat" consumed={totals.fats} target={targets.fats} />
      </div>
    </section>
  );
}
