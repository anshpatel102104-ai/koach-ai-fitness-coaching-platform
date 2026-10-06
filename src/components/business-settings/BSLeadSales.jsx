import React from 'react';
import { TrendingUp, GripVertical, Plus, X } from 'lucide-react';
import { BSSection, BSRow, BSToggle, BSInput } from './BSSection';
import { cn } from '@/lib/utils';
import { fieldClass } from '@/components/settings/SettingsLayout';

const DEFAULT_STAGES = [
  { id: '1', label: 'New Lead' }, { id: '2', label: 'DM\'d' },
  { id: '3', label: 'Call Booked' }, { id: '4', label: 'Proposal Sent' },
  { id: '5', label: 'Closed / Won' }, { id: '6', label: 'Lost' },
];

const DEFAULTS = {
  pipeline_stages: DEFAULT_STAGES, auto_move_pipeline_enabled: false, auto_move_pipeline_days: 7,
  followup_reminder_enabled: true, followup_reminder_days: 3,
};

export default function BSLeadSales({ s, set }) {
  const stages = s.pipeline_stages?.length ? s.pipeline_stages : DEFAULT_STAGES;

  const updateStage = (id, label) => set('pipeline_stages', stages.map(st => st.id === id ? { ...st, label } : st));
  const removeStage = (id) => set('pipeline_stages', stages.filter(st => st.id !== id));
  const addStage = () => set('pipeline_stages', [...stages, { id: Date.now().toString(), label: 'New Stage' }]);

  return (
    <BSSection icon={TrendingUp} title="Leads and sales" subtitle="Your pipeline stages and follow-up reminders." onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      <BSGroup>Lead pipeline</BSGroup>
      <BSRow label="Pipeline stages" hint="Click a stage to rename it.">
        <div className="space-y-2">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-input text-[13px] font-semibold tabular-nums text-foreground">{i + 1}</span>
              <input value={stage.label} onChange={e => updateStage(stage.id, e.target.value)}
                className={cn(fieldClass, 'flex-1')} />
              <button onClick={() => removeStage(stage.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <BSAddButton onClick={addStage}><Plus className="w-4 h-4" /> Add stage</BSAddButton>
        </div>
      </BSRow>
      <BSRow label="Auto-move to next stage" hint="Moves a lead on after days with no activity.">
        <div className="space-y-2">
          <BSToggle value={s.auto_move_pipeline_enabled} onChange={v => set('auto_move_pipeline_enabled', v)} />
          {s.auto_move_pipeline_enabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">After</span>
              <BSInput type="number" value={s.auto_move_pipeline_days} onChange={v => set('auto_move_pipeline_days', v)} min={1} className="w-20" />
              <span className="text-sm text-muted-foreground">days of inactivity</span>
            </div>
          )}
        </div>
      </BSRow>
      <BSRow label="Follow-up reminder">
        <div className="space-y-2">
          <BSToggle value={s.followup_reminder_enabled} onChange={v => set('followup_reminder_enabled', v)} />
          {s.followup_reminder_enabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">After</span>
              <BSInput type="number" value={s.followup_reminder_days} onChange={v => set('followup_reminder_days', v)} min={1} className="w-20" />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          )}
        </div>
      </BSRow>
    </BSSection>
  );
}