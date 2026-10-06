import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { BADGE_CONFIG } from '@/lib/badges';
import { cn } from '@/lib/utils';
import { describeTrigger, describeActions } from './ruleText';

const TRIGGER_TYPES = [
  { value: 'no_checkin', label: 'No check-in for X days', unit: 'days', default: 7 },
  { value: 'low_compliance', label: 'Compliance drops below X%', unit: '%', default: 60 },
  { value: 'high_compliance', label: 'Compliance is X% or higher', unit: '%', default: 90 },
  { value: 'streak', label: 'Streak reaches X days', unit: 'days', default: 7 },
  { value: 'weight_plateau', label: 'Weight unchanged for X check-ins', unit: 'check-ins', default: 3 },
  { value: 'weight_loss_fast', label: 'Weight loss exceeds X lb a week', unit: 'lb', default: 2 },
  { value: 'status_change', label: 'Client status changes', unit: null, default: null },
  { value: 'program_ends', label: 'Program ends', unit: null, default: null },
  { value: 'new_client', label: 'New client added', unit: null, default: null },
];

const ACTION_TYPES = [
  { value: 'send_message', label: 'Send the client a message', needsMessage: true },
  { value: 'notify_coach', label: 'Notify me', needsMessage: true },
  { value: 'award_badge', label: 'Award a badge', needsBadge: true },
  { value: 'update_status', label: 'Change client status', needsStatus: true },
  { value: 'adjust_calories', label: 'Adjust nutrition calories', needsCalories: true },
  { value: 'flag_at_risk', label: 'Flag as at risk', needsMessage: false },
];

const CLIENT_STATUSES = ['lead', 'active', 'at_risk', 'completed', 'alumni'];

const DEFAULT_ACTION = { type: 'send_message', value: '', message: '' };
const DEFAULT_FORM = {
  name: '',
  trigger_type: 'no_checkin',
  trigger_value: 7,
  actions: [{ ...DEFAULT_ACTION }],
  is_active: true,
  run_once: false,
  apply_to: 'all',
};

export default function RuleBuilderModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) {
      if (initial) {
        // Map legacy format
        const actions = initial.actions?.length
          ? initial.actions
          : initial.action_type
            ? [{ type: initial.action_type === 'flag_client' ? 'flag_at_risk' : initial.action_type, value: initial.action_calorie_delta?.toString() || '', message: initial.action_message || '' }]
            : [{ ...DEFAULT_ACTION }];
        setForm({
          ...DEFAULT_FORM,
          ...initial,
          trigger_type: initial.trigger_type || (initial.condition_type === 'missed_checkin' ? 'no_checkin' : initial.condition_type === 'low_adherence' ? 'low_compliance' : initial.condition_type || 'no_checkin'),
          trigger_value: initial.trigger_value ?? initial.condition_threshold ?? 7,
          actions,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setStep(1);
    }
  }, [open, initial]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updateAction = (i, key, val) => {
    setForm(f => {
      const actions = [...f.actions];
      actions[i] = { ...actions[i], [key]: val };
      return { ...f, actions };
    });
  };
  const addAction = () => setForm(f => ({ ...f, actions: [...f.actions, { ...DEFAULT_ACTION }] }));
  const removeAction = (i) => setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));

  const triggerMeta = TRIGGER_TYPES.find(t => t.value === form.trigger_type);

  const handleSave = async () => {
    if (!form.name || !form.trigger_type || form.actions.length === 0) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  const badgeOptions = Object.entries(BADGE_CONFIG).slice(0, 30);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit rule' : 'New rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Step indicator */}
          <ol className="grid grid-cols-3 gap-2">
            {['When', 'Then', 'Name and save'].map((s, i) => (
              <li key={s}>
                <button type="button" onClick={() => setStep(i + 1)} className="w-full text-left group">
                  <span className={cn('block h-1 rounded-full transition-colors', step >= i + 1 ? 'bg-primary' : 'bg-secondary')} />
                  <span className={cn('block text-[13px] mt-2', step === i + 1 ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                    {i + 1}. {s}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {/* STEP 1 — Trigger */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>When this happens</Label>
                  <Select value={form.trigger_type} onValueChange={v => {
                    const meta = TRIGGER_TYPES.find(t => t.value === v);
                    set('trigger_type', v);
                    if (meta?.default) set('trigger_value', meta.default);
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {triggerMeta?.unit && (
                  <div>
                    <Label>Threshold, in {triggerMeta.unit}</Label>
                    <Input type="number" value={form.trigger_value || ''} onChange={e => set('trigger_value', Number(e.target.value))} className="mt-1 w-28" min={1} />
                  </div>
                )}
                {form.trigger_type === 'status_change' && (
                  <div>
                    <Label>Changes to status</Label>
                    <Select value={form.trigger_value?.toString() || 'active'} onValueChange={v => set('trigger_value', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CLIENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">When {describeTrigger(form.trigger_type, form.trigger_value)}.</p>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Next</Button>
              </div>
            </div>
          )}

          {/* STEP 2 — Actions */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {form.actions.map((action, i) => {
                  const meta = ACTION_TYPES.find(a => a.value === action.type);
                  return (
                    <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{form.actions.length > 1 ? `Action ${i + 1}` : 'Then'}</p>
                        {form.actions.length > 1 && (
                          <button type="button" onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove action">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div>
                        <Label>Do this</Label>
                        <Select value={action.type} onValueChange={v => updateAction(i, 'type', v)}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {meta?.needsMessage && (
                        <div>
                          <Label>Message <span className="text-muted-foreground font-normal text-[13px]">You can use {'{client_name}'}, {'{streak}'} and {'{compliance}'}</span></Label>
                          <Textarea value={action.message} onChange={e => updateAction(i, 'message', e.target.value)}
                            placeholder="What should it say?" rows={3} className="mt-1 text-sm resize-none" />
                        </div>
                      )}
                      {meta?.needsBadge && (
                        <div>
                          <Label>Badge to award</Label>
                          <Select value={action.value} onValueChange={v => updateAction(i, 'value', v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a badge" /></SelectTrigger>
                            <SelectContent>
                              {badgeOptions.map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {meta?.needsStatus && (
                        <div>
                          <Label>New status</Label>
                          <Select value={action.value} onValueChange={v => updateAction(i, 'value', v)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a status" /></SelectTrigger>
                            <SelectContent>
                              {CLIENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {meta?.needsCalories && (
                        <div>
                          <Label>Calorie change, like -100 or 150</Label>
                          <Input type="number" value={action.value} onChange={e => updateAction(i, 'value', e.target.value)}
                            className="mt-1 w-32" placeholder="-100" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addAction} className="w-full h-10 rounded-lg border border-dashed border-input text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-accent/60 transition-colors inline-flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Add another action
              </button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Next</Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Settings */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Rule name</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Missed check-in nudge" className="mt-1" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-[13px] text-muted-foreground">Runs on its own every day</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium">Run once per client</p>
                  <p className="text-[13px] text-muted-foreground">Won't fire again for someone it already caught</p>
                </div>
                <Switch checked={form.run_once} onCheckedChange={v => set('run_once', v)} />
              </div>
              <div>
                <Label>Apply to</Label>
                <Select value={form.apply_to} onValueChange={v => set('apply_to', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All active clients</SelectItem>
                    <SelectItem value="active">Active clients only</SelectItem>
                    <SelectItem value="at_risk">At-risk clients only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="bg-secondary rounded-lg px-4 py-3">
                <p className="text-[13px] text-muted-foreground">This rule will</p>
                <p className="text-[15px] font-semibold text-foreground mt-0.5">
                  When {describeTrigger(form.trigger_type, form.trigger_value)} → {describeActions(form.actions)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                  {saving && <Loader2 className="animate-spin" />}
                  {initial?.id ? 'Save changes' : 'Create rule'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}