import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bar } from '@/components/portal/PortalUI';

export default function ProfileCompletionCard({ client, user }) {
  const [dismissed, setDismissed] = useState(false);

  const items = [
    { id: 'photo', label: 'Add a profile photo', done: !!client?.avatar_url },
    { id: 'weight', label: 'Set a goal weight', done: !!client?.target_weight },
    { id: 'health', label: 'Connect Apple Health', done: false },
    { id: 'notifs', label: 'Choose your notifications', done: false },
  ];

  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  if (pct === 100 || dismissed) return null;

  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg text-foreground">Finish your profile</h2>
          <p className="text-[13px] text-muted-foreground">{done} of {items.length} done</p>
        </div>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="touch-compact text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Bar pct={pct} className="mt-3" />
      <ul className="mt-3 space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-2.5 text-sm">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full', item.done ? 'bg-success text-white' : 'border-[1.5px] border-input')}>
              {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
