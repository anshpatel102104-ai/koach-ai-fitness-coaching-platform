import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 1–10 scale as a row of number tiles (selected = ink), or a plain big
 * number field when isNumber is set.
 */
export default function CheckInQuestionScale({ value, onChange, min = 1, max = 10, isNumber = false, lastValue, unit, lowLabel = 'Low', highLabel = 'High' }) {
  const numVal = value === '' || value === null || value === undefined ? '' : parseFloat(value);

  if (isNumber) {
    return (
      <div>
        <div className="flex items-end gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={numVal}
            onChange={e => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder="0"
            className="num h-20 w-40 rounded-xl border-2 border-foreground bg-card text-center text-[48px] text-foreground focus:outline-none"
          />
          {unit && <span className="pb-3 text-lg font-semibold text-muted-foreground">{unit}</span>}
        </div>
        {lastValue !== undefined && lastValue !== null && lastValue !== '' && (
          <p className="mt-3 text-[15px] text-muted-foreground">Last time: <span className="font-semibold text-foreground">{lastValue}{unit ? ` ${unit}` : ''}</span></p>
        )}
      </div>
    );
  }

  const values = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(values.length, 5)}, minmax(0, 1fr))` }} role="radiogroup">
        {values.map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={numVal === n}
            onClick={() => onChange(n)}
            className={cn(
              'touch-compact num h-14 rounded-lg text-[24px] transition-colors',
              numVal === n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-muted-foreground">
        <span>{min} = {lowLabel.toLowerCase()}</span>
        <span>{max} = {highLabel.toLowerCase()}</span>
      </div>
      {lastValue !== undefined && lastValue !== null && (
        <p className="mt-3 text-[15px] text-muted-foreground">Last week: <span className="font-semibold text-foreground">{lastValue} of {max}</span></p>
      )}
    </div>
  );
}
