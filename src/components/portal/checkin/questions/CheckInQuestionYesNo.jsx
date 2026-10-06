import React from 'react';
import { cn } from '@/lib/utils';

/** Two big tiles. values lets callers store booleans or 'yes'/'no'. */
export default function CheckInQuestionYesNo({ value, onChange, values = ['yes', 'no'] }) {
  const opts = [
    { val: values[0], label: 'Yes' },
    { val: values[1], label: 'No' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
      {opts.map(opt => {
        const on = value === opt.val;
        return (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.val)}
            className={cn(
              'h-24 rounded-xl text-xl font-bold transition-colors',
              on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
