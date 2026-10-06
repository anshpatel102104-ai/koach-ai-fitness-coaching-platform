import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Segmented } from '@/components/kit';
import { cn } from '@/lib/utils';

/** Weight: −/+ around a big figure, lb/kg switch, last week and the change. */
export default function CheckInQuestionWeight({ value, onChange, lastValue }) {
  const [unit, setUnit] = useState('lb');
  const numVal = value === '' || value === null || value === undefined ? '' : parseFloat(value);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v ? parseFloat(v) : '');
  };
  const step = (d) => onChange(Math.max(0, Math.round(((parseFloat(numVal) || parseFloat(lastValue) || 0) + d) * 10) / 10));

  const diff = numVal !== '' && lastValue ? Number((numVal - lastValue).toFixed(1)) : null;
  const btn = 'touch-compact inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-input bg-card text-foreground hover:bg-accent';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label="Down 0.1" onClick={() => step(-0.1)} className={btn}><Minus className="h-5 w-5" /></button>
        <div className="flex min-w-0 items-end justify-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            value={numVal}
            onChange={handleChange}
            placeholder="0"
            aria-label={`Weight in ${unit}`}
            className="num w-full min-w-0 max-w-[180px] bg-transparent text-center text-[64px] text-foreground focus:outline-none"
          />
          <span className="pb-3 text-lg font-semibold text-muted-foreground">{unit}</span>
        </div>
        <button type="button" aria-label="Up 0.1" onClick={() => step(0.1)} className={btn}><Plus className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 flex justify-center">
        <Segmented size="sm" value={unit} onChange={setUnit} options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} />
      </div>
      {lastValue ? (
        <div className="mt-5 flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <span className="text-[15px] text-muted-foreground">Last week <span className="font-semibold text-foreground">{lastValue} {unit}</span></span>
          {diff !== null && (
            <span className={cn('num text-xl', diff < 0 ? 'text-success' : 'text-foreground')}>
              {diff > 0 ? '+' : ''}{diff} {unit}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
