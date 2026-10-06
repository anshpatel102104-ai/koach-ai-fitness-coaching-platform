import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WaterTracker({ glasses = 0, goal = 8, onUpdate }) {
  const toggleGlass = (index) => {
    if (index < glasses) {
      onUpdate(index);
    } else if (index === glasses) {
      onUpdate(glasses + 1);
    }
  };
  const btn = 'touch-compact inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-card text-foreground hover:bg-accent';

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl text-foreground">Water</h2>
          <p className="text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{glasses} of {goal}</span> glasses, {goal * 250} ml goal
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="One glass less" onClick={() => onUpdate(Math.max(0, glasses - 1))} className={btn}><Minus className="h-4 w-4" /></button>
          <button type="button" aria-label="One more glass" onClick={() => onUpdate(glasses + 1)} className={btn}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${goal}, minmax(0, 1fr))` }}>
        {Array.from({ length: goal }).map((_, i) => (
          <button key={i} type="button" onClick={() => toggleGlass(i)} aria-label={`Glass ${i + 1}`}
            className={cn('touch-compact h-8 rounded-md !p-0 transition-colors', i < glasses ? 'bg-foreground' : 'border border-dashed border-input bg-transparent')} />
        ))}
      </div>
      {glasses > goal && <p className="mt-2 text-[13px] text-muted-foreground">{glasses - goal} over goal.</p>}
    </section>
  );
}
