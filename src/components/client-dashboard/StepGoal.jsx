import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bar } from '@/components/portal/PortalUI';

const QUICK_ADDS = [1000, 2500, 5000];

export default function StepGoal({ steps = 0, goal = 10000, onChange }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const pct = Math.min(100, (steps / goal) * 100);
  const done = steps >= goal;
  const remaining = Math.max(0, goal - steps);

  const handleAdd = () => {
    const n = parseInt(input, 10);
    if (!isNaN(n) && n > 0) onChange(steps + n);
    setInput('');
    setAdding(false);
  };

  return (
    <section className="panel p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground">Steps today</p>
          <p className="num mt-1 text-[32px] text-foreground">{steps.toLocaleString()}<span className="ml-1 text-[15px] text-muted-foreground">/ {goal.toLocaleString()}</span></p>
        </div>
        <p className={done ? 'text-sm font-semibold text-success' : 'text-sm text-muted-foreground'}>
          {done ? 'Goal met' : `${remaining.toLocaleString()} to go`}
        </p>
      </div>
      <Bar pct={pct} className="mt-3 h-2" barClass={done ? 'bg-success' : 'bg-foreground'} />

      {adding ? (
        <div className="mt-4 flex gap-2">
          <Input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Steps to add" className="h-10 flex-1 text-base" />
          <Button onClick={handleAdd}>Add</Button>
          <Button variant="outline" size="icon" onClick={() => setAdding(false)} aria-label="Cancel"><X /></Button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          {QUICK_ADDS.map(n => (
            <Button key={n} variant="outline" size="sm" className="flex-1 tabular-nums" onClick={() => onChange(steps + n)}>
              +{n.toLocaleString()}
            </Button>
          ))}
          <Button variant="outline" size="sm" className="w-9 px-0" onClick={() => setAdding(true)} aria-label="Add a custom amount"><Plus /></Button>
        </div>
      )}
    </section>
  );
}
