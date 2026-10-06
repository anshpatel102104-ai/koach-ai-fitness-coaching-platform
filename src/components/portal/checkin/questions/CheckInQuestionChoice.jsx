import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Option rows. Selected = ink border and a check. */
export default function CheckInQuestionChoice({ value, onChange, options = [], multi = false }) {
  const selected = multi
    ? (Array.isArray(value) ? value : [])
    : value;

  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(selected) ? [...selected] : [];
      const idx = arr.indexOf(opt);
      if (idx > -1) arr.splice(idx, 1); else arr.push(opt);
      onChange(arr);
    } else {
      onChange(opt);
    }
  };

  const isSelected = (opt) => multi ? selected.includes(opt) : selected === opt;

  return (
    <div className="space-y-2" role={multi ? 'group' : 'radiogroup'}>
      {multi && <p className="text-[13px] text-muted-foreground">Pick any that apply.</p>}
      {options.map(opt => {
        const on = isSelected(opt);
        return (
          <button
            key={opt}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={() => toggle(opt)}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3.5 text-left text-[15px] font-semibold transition-colors',
              on ? 'bg-card text-foreground shadow-[inset_0_0_0_2px_rgb(var(--foreground))]' : 'bg-secondary text-foreground hover:bg-accent',
            )}
          >
            {opt}
            <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full', on ? 'bg-primary text-primary-foreground' : 'border-[1.5px] border-input')}>
              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
