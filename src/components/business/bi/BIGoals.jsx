import React, { useState, useMemo } from 'react';
import { Panel } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Meter, money } from '@/components/business/ui';
import { parseISO, startOfMonth } from 'date-fns';

const GOAL_PRESETS = [
  { key: 'mrr', label: 'Monthly revenue', unit: '$', defaultVal: 5000 },
  { key: 'new_clients', label: 'New clients this month', unit: '', defaultVal: 3 },
  { key: 'retention', label: 'Retention', unit: '%', defaultVal: 90 },
];

function GoalRow({ preset, goal, current, unit, onEdit }) {
  const pct = Math.min(100, goal.target > 0 ? Math.round((current / goal.target) * 100) : 0);
  const achieved = pct >= 100;
  const fmt = (v) => (unit === '$' ? money(v) : `${v}${unit}`);

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-sm text-foreground">{preset.label}</p>
        <button onClick={onEdit} className="touch-compact text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
          Edit
        </button>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="num text-[24px] leading-none text-foreground">{fmt(current)}</span>
        <span className="text-[13px] text-muted-foreground">of {fmt(goal.target)}{achieved ? ', reached' : ''}</span>
      </div>
      <Meter value={pct} tone={achieved ? 'success' : 'ink'} />
    </div>
  );
}

export default function BIGoals({ clients, checkIns }) {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bi_goals') || 'null') || {}; } catch { return {}; }
  });
  const [editing, setEditing] = useState(null);
  const [tempVal, setTempVal] = useState('');

  const saveGoals = (updated) => {
    setGoals(updated);
    localStorage.setItem('bi_goals', JSON.stringify(updated));
  };

  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);
  const newThisMonth = clients.filter(c => {
    const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
    return sd && sd >= startOfMonth(new Date());
  }).length;
  const completedPct = clients.length > 0
    ? Math.round(((clients.length - clients.filter(c => c.lifecycle_status === 'completed' || c.lifecycle_status === 'alumni').length) / clients.length) * 100)
    : 100;

  const currentValues = { mrr, new_clients: newThisMonth, retention: completedPct };

  const startEdit = (key, defaultVal) => {
    setEditing(key);
    setTempVal(String(goals[key]?.target || defaultVal));
  };

  const saveEdit = () => {
    if (!editing) return;
    const preset = GOAL_PRESETS.find(g => g.key === editing);
    saveGoals({ ...goals, [editing]: { label: preset.label, target: Number(tempVal) } });
    setEditing(null);
  };

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Goals</h2>
      <p className="text-sm text-muted-foreground mt-1">Targets you set. Saved on this device.</p>

      {editing && (
        <div className="mt-4 rounded-lg bg-secondary p-3">
          <p className="text-[13px] text-muted-foreground mb-2">New target for {GOAL_PRESETS.find(g => g.key === editing)?.label.toLowerCase()}</p>
          <div className="flex gap-2">
            <Input type="number" value={tempVal} onChange={e => setTempVal(e.target.value)} className="flex-1 h-9 bg-card" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }} />
            <Button size="sm" className="h-9" onClick={saveEdit}>Save</Button>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mt-2">
        {GOAL_PRESETS.map(preset => (
          <GoalRow
            key={preset.key}
            preset={preset}
            goal={goals[preset.key] || { label: preset.label, target: preset.defaultVal }}
            current={currentValues[preset.key] || 0}
            unit={preset.unit}
            onEdit={() => startEdit(preset.key, preset.defaultVal)}
          />
        ))}
      </div>
    </Panel>
  );
}
