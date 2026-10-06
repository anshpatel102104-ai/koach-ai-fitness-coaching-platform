import React, { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Panel, PanelHeader } from '@/components/kit';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const INSIGHT_TYPES = [
  { type: 'risk', label: 'Risk', desc: 'Burnout signs, plateaus, clients going quiet, weekend drop-offs' },
  { type: 'performance', label: 'Progress', desc: 'Weight pace, strength gains, workout consistency' },
  { type: 'opportunity', label: 'Opportunities', desc: 'Program switches, renewal moments, leads to follow up' },
  { type: 'celebration', label: 'Worth celebrating', desc: 'Milestones, PRs, long streaks' },
];

export default function InsightPreferences({ onClose }) {
  const getDisabled = () => {
    try { return new Set(JSON.parse(localStorage.getItem('koach_not_relevant_types') || '[]')); }
    catch { return new Set(); }
  };

  const [disabled, setDisabled] = useState(getDisabled);

  const toggle = (type) => {
    setDisabled(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      localStorage.setItem('koach_not_relevant_types', JSON.stringify([...next]));
      return next;
    });
  };

  const handleReset = () => {
    localStorage.removeItem('koach_not_relevant_types');
    localStorage.removeItem('koach_dismissed_insights');
    setDisabled(new Set());
    toast.success('Preferences reset. Dismissed notes will come back.');
  };

  return (
    <Panel>
      <PanelHeader
        title="Preferences"
        subtitle="Choose which kinds of notes you want. Hidden kinds stay out of Today and this page."
        right={
          <button onClick={onClose} className="touch-compact rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close preferences">
            <X className="h-4 w-4" />
          </button>
        }
      />
      <ul>
        {INSIGHT_TYPES.map(({ type, label, desc }) => (
          <li key={type} className="flex items-center gap-4 border-t border-border px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            <Switch checked={!disabled.has(type)} onCheckedChange={() => toggle(type)} aria-label={`Show ${label.toLowerCase()} notes`} />
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-5 py-4 sm:px-6">
        <Button variant="outline" onClick={handleReset}>Reset preferences and dismissed notes</Button>
      </div>
    </Panel>
  );
}
