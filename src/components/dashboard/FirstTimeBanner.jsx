import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/kit';
import { cn } from '@/lib/utils';

const CHECKLIST = [
  { id: 'client',     label: 'Add your first client',        path: '/clients' },
  { id: 'intake',     label: 'Make a client intake link',    path: '/onboarding-manager' },
  { id: 'program',    label: 'Build a workout program',      path: '/program-builder' },
  { id: 'meal',       label: 'Create a meal plan',           path: '/nutrition' },
  { id: 'automation', label: 'Set up an automation',         path: '/automations' },
  { id: 'stripe',     label: 'Connect payments',             path: '/revenue' },
  { id: 'analytics',  label: 'Look through analytics',       path: '/analytics' },
];

/** Set-up checklist shown under Today until the coach dismisses it. */
export default function FirstTimeBanner({ onDismiss }) {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('koach_checklist') || '[]'); } catch { return []; }
  });

  const toggle = (id) => {
    setChecked(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem('koach_checklist', JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });
  };

  const done = checked.length;
  const total = CHECKLIST.length;
  const pct = Math.round((done / total) * 100);

  return (
    <Panel>
      <PanelHeader
        title="Finish setting up"
        subtitle={`${done} of ${total} done. Tick things off as you go.`}
        right={
          <button
            onClick={onDismiss}
            className="touch-compact rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Hide set-up checklist"
            title="Hide"
          >
            <X className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-5 sm:px-6">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-x-6 px-5 pb-4 pt-2 sm:grid-cols-2 sm:px-6">
        {CHECKLIST.map(item => {
          const isDone = checked.includes(item.id);
          return (
            <li key={item.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
              <button
                onClick={() => toggle(item.id)}
                aria-pressed={isDone}
                aria-label={isDone ? `Mark "${item.label}" as not done` : `Mark "${item.label}" as done`}
                className={cn(
                  'touch-compact flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                  isDone ? 'border-success bg-success text-white' : 'border-input hover:border-foreground'
                )}
              >
                {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
              </button>
              <span className={cn('flex-1 text-sm', isDone ? 'text-muted-foreground line-through' : 'text-foreground')}>
                {item.label}
              </span>
              {!isDone && (
                <Link to={item.path} className="text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
                  Open
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
