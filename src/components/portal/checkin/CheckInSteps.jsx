import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Short, lower-case step name from a question label ("Energy this week" -> "energy"). */
export function shortLabel(q) {
  if (!q) return '';
  if (q.short_label) return q.short_label;
  const base = (q.label || '').replace(/\(.*?\)/g, '').replace(/[?.:,;]/g, '').trim();
  const words = base.split(/\s+/).filter(Boolean);
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 18) break;
    out = (out + ' ' + w).trim();
  }
  return out || words[0] || 'Next';
}

/**
 * Check-in flow header: close button, "Weekly check-in, step n of t",
 * "Saves as you go", and the step progress (done = green, current = ink,
 * to come = grey). Labels show when there are five steps or fewer.
 */
export default function CheckInSteps({ current, steps, onClose, title = 'Weekly check-in' }) {
  const total = steps.length;
  const showLabels = total <= 5;
  return (
    <div className="flex-shrink-0 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Close check-in"
          className="touch-compact inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-accent">
          <X className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
          {title}, step {Math.min(current + 1, total)} of {total}
        </p>
        <p className="flex-shrink-0 text-[13px] text-muted-foreground">Saves as you go</p>
      </div>
      <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <div key={i} className="min-w-0">
            <div className={cn('h-1 rounded-full', i < current ? 'bg-success' : i === current ? 'bg-foreground' : 'bg-secondary')} />
            {showLabels && (
              <p className={cn('mt-1.5 truncate text-[13px] capitalize', i === current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
