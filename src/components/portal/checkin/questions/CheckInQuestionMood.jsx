import React from 'react';
import { cn } from '@/lib/utils';

export const MOODS = [
  { value: 'stressed', label: 'Stressed' },
  { value: 'tired', label: 'Tired' },
  { value: 'okay', label: 'Okay' },
  { value: 'good', label: 'Good' },
  { value: 'great', label: 'Great' },
];

/** Five plain-word choices, selected = ink. */
export default function CheckInQuestionMood({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Mood">
      {MOODS.map(m => {
        const on = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m.value)}
            className={cn(
              'touch-compact rounded-lg px-1 py-3.5 text-[14px] font-semibold transition-colors',
              on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
