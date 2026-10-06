import React from 'react';
import { BookOpen, GripVertical, Plus, X } from 'lucide-react';
import { BSSection, BSRow, BSToggle, BSSelect, BSInput, BSTextarea, BSGroup, BSAddButton } from './BSSection';

const DEFAULT_ONBOARDING_ITEMS = [
  { id: '1', label: 'Complete profile setup', enabled: true },
  { id: '2', label: 'Review assigned program', enabled: true },
  { id: '3', label: 'Review nutrition plan', enabled: true },
  { id: '4', label: 'Submit first check-in', enabled: true },
  { id: '5', label: 'Send first message to coach', enabled: true },
  { id: '6', label: 'Log first workout', enabled: true },
  { id: '7', label: 'Set up payment method', enabled: true },
];

const DEFAULTS = {
  onboarding_items: DEFAULT_ONBOARDING_ITEMS, onboarding_deadline_days: 7,
  onboarding_remind_days: 3, onboarding_notify_coach: true,
  welcome_email_enabled: true, welcome_email_template: '',
  welcome_video_enabled: false, welcome_video_url: '',
  intake_form_id: '', require_intake_before_program: false, intake_reminder_days: 2,
};

export default function BSOnboarding({ s, set, forms }) {
  const items = s.onboarding_items?.length ? s.onboarding_items : DEFAULT_ONBOARDING_ITEMS;

  const toggleItem = (id) => set('onboarding_items', items.map(it => it.id === id ? { ...it, enabled: !it.enabled } : it));
  const removeItem = (id) => set('onboarding_items', items.filter(it => it.id !== id));
  const addCustom = () => set('onboarding_items', [...items, { id: Date.now().toString(), label: 'Custom step', enabled: true, custom: true }]);
  const updateLabel = (id, label) => set('onboarding_items', items.map(it => it.id === id ? { ...it, label } : it));

  return (
    <BSSection icon={BookOpen} title="Onboarding" subtitle="What a new client has to do in their first week." onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      <BSGroup>New client onboarding flow</BSGroup>
      <BSRow label="Onboarding checklist" hint="Turn steps on or off. Clients see them in this order.">
        <div className="space-y-2">
          <div className="divide-y divide-border rounded-lg bg-secondary px-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-1.5">
              <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              <BSToggle value={item.enabled} onChange={() => toggleItem(item.id)} />
              {item.custom ? (
                <input value={item.label} onChange={e => updateLabel(item.id, e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-foreground focus:outline-none" />
              ) : (
                <span className={`flex-1 text-[15px] ${item.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{item.label}</span>
              )}
              {item.custom && (
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          </div>
          <BSAddButton onClick={addCustom}><Plus className="w-4 h-4" /> Add custom step</BSAddButton>
        </div>
      </BSRow>
      <BSRow label="Completion deadline" hint="How long a new client has to finish onboarding.">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.onboarding_deadline_days} onChange={v => set('onboarding_deadline_days', v)} min={1} className="w-24" />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </BSRow>
      <BSRow label="Remind if incomplete after">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.onboarding_remind_days} onChange={v => set('onboarding_remind_days', v)} min={1} className="w-24" />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </BSRow>
      <BSRow label="Notify coach on completion">
        <BSToggle value={s.onboarding_notify_coach} onChange={v => set('onboarding_notify_coach', v)} />
      </BSRow>
      <BSGroup>Welcome package</BSGroup>
      <BSRow label="Auto-send welcome email">
        <div className="space-y-2">
          <BSToggle value={s.welcome_email_enabled} onChange={v => set('welcome_email_enabled', v)} />
          {s.welcome_email_enabled && (
            <BSTextarea value={s.welcome_email_template} onChange={v => set('welcome_email_template', v)}
              placeholder="Write the email new clients get on day one" rows={4} />
          )}
        </div>
      </BSRow>
      <BSRow label="Welcome video message">
        <div className="space-y-2">
          <BSToggle value={s.welcome_video_enabled} onChange={v => set('welcome_video_enabled', v)} />
          {s.welcome_video_enabled && (
            <BSInput value={s.welcome_video_url} onChange={v => set('welcome_video_url', v)} placeholder="https://youtube.com/..." />
          )}
        </div>
      </BSRow>
      <BSGroup>Intake form</BSGroup>
      <BSRow label="Default intake form">
        <BSSelect value={s.intake_form_id || ''} onChange={v => set('intake_form_id', v)}
          options={[{ value: '', label: 'None' }, ...forms.map(f => ({ value: f.id, label: f.name }))]} />
      </BSRow>
      <BSRow label="Require before program access">
        <BSToggle value={s.require_intake_before_program} onChange={v => set('require_intake_before_program', v)} />
      </BSRow>
      <BSRow label="Reminder if incomplete after">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.intake_reminder_days} onChange={v => set('intake_reminder_days', v)} min={1} className="w-24" />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </BSRow>
    </BSSection>
  );
}