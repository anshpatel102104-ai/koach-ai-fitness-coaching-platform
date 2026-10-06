import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Today's list: plain rows with a check circle. Rows that open another
 * screen show a chevron; counters (meals, water) tick up on tap.
 * tasks: [{ id, label, sublabel?, completed, navigates? }]
 */
export default function DailyTasks({ tasks, onToggle, title = "Today's list" }) {
  const done = tasks.filter(t => t.completed).length;

  return (
    <section className="panel px-4 pt-4 pb-1">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl text-foreground">{title}</h2>
        <span className="text-[13px] text-muted-foreground tabular-nums">{done} of {tasks.length} done</span>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {tasks.map(task => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                  task.completed ? 'bg-success text-white' : 'border-[1.5px] border-input',
                )}
              >
                {task.completed && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[15px] font-semibold', task.completed ? 'text-muted-foreground' : 'text-foreground')}>
                  {task.label}
                </span>
                {task.sublabel && <span className="block text-[13px] text-muted-foreground truncate">{task.sublabel}</span>}
              </span>
              {task.navigates && <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
