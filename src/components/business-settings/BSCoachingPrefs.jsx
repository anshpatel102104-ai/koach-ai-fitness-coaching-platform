import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { BSSection, BSRow, BSToggle, BSSelect, BSInput, BSTextarea, BSGroup } from './BSSection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/settings/SettingsLayout';

const FREQ_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' },
];
const REMINDER_HOURS = [2, 4, 6, 12, 24, 48].map(h => ({ value: h, label: `${h} hours before` }));

const DEFAULTS = {
  checkin_frequency: 'weekly', checkin_due_day: 1, checkin_reminder_hours: 24,
  auto_assign_checkin_form: false, auto_assign_program: false, auto_assign_meal_plan: false,
  welcome_message_enabled: true, welcome_message: '',
  max_clients_unlimited: true, max_clients: 50, waitlist_enabled: false, capacity_alerts: true,
  default_tags: [], auto_tag_at_risk_pct: 60, auto_tag_high_performer_pct: 90, auto_tag_new_client_days: 30,
};

export default function BSCoachingPrefs({ s, set, forms, programs, mealPlans }) {
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (!newTag.trim()) return;
    set('default_tags', [...(s.default_tags || []), newTag.trim()]);
    setNewTag('');
  };
  const removeTag = (i) => set('default_tags', (s.default_tags || []).filter((_, idx) => idx !== i));

  return (
    <BSSection icon={Users} title="Coaching" subtitle="Check-ins, automatic assignments, client limits and tags." onReset={() => Object.entries(DEFAULTS).forEach(([k, v]) => set(k, v))}>
      {/* Check-in */}
      <BSGroup>Client management</BSGroup>
      <BSRow label="Default check-in frequency">
        <BSSelect value={s.checkin_frequency} onChange={v => set('checkin_frequency', v)} options={FREQ_OPTIONS} />
      </BSRow>
      <BSRow label="Check-in due day">
        <BSSelect value={String(s.checkin_due_day)} onChange={v => set('checkin_due_day', Number(v))} options={DAY_OPTIONS.map(d => ({ value: String(d.value), label: d.label }))} />
      </BSRow>
      <BSRow label="Reminder timing">
        <BSSelect value={String(s.checkin_reminder_hours)} onChange={v => set('checkin_reminder_hours', Number(v))} options={REMINDER_HOURS.map(r => ({ value: String(r.value), label: r.label }))} />
      </BSRow>
      <BSRow label="Auto-assign check-in form">
        <div className="space-y-2">
          <BSToggle value={s.auto_assign_checkin_form} onChange={v => set('auto_assign_checkin_form', v)} />
          {s.auto_assign_checkin_form && (
            <BSSelect value={s.default_checkin_form_id || ''} onChange={v => set('default_checkin_form_id', v)}
              options={[{ value: '', label: 'Choose a form' }, ...forms.map(f => ({ value: f.id, label: f.name }))]} />
          )}
        </div>
      </BSRow>
      <BSRow label="Auto-assign program">
        <div className="space-y-2">
          <BSToggle value={s.auto_assign_program} onChange={v => set('auto_assign_program', v)} />
          {s.auto_assign_program && (
            <BSSelect value={s.default_program_id || ''} onChange={v => set('default_program_id', v)}
              options={[{ value: '', label: 'Choose a program' }, ...programs.map(p => ({ value: p.id, label: p.title }))]} />
          )}
        </div>
      </BSRow>
      <BSRow label="Auto-assign meal plan">
        <div className="space-y-2">
          <BSToggle value={s.auto_assign_meal_plan} onChange={v => set('auto_assign_meal_plan', v)} />
          {s.auto_assign_meal_plan && (
            <BSSelect value={s.default_meal_plan_id || ''} onChange={v => set('default_meal_plan_id', v)}
              options={[{ value: '', label: 'Choose a meal plan' }, ...mealPlans.map(m => ({ value: m.id, label: m.title }))]} />
          )}
        </div>
      </BSRow>
      <BSRow label="Welcome message" hint="Sent from you when a client joins.">
        <div className="space-y-2">
          <BSToggle value={s.welcome_message_enabled} onChange={v => set('welcome_message_enabled', v)} />
          {s.welcome_message_enabled && (
            <BSTextarea value={s.welcome_message} onChange={v => set('welcome_message', v)}
              placeholder="Welcome to [Business Name]. Your plan is ready in the app." rows={3} />
          )}
        </div>
      </BSRow>
      <BSGroup>Client limits</BSGroup>
      <BSRow label="Maximum active clients">
        <div className="flex items-center gap-3">
          <BSToggle value={s.max_clients_unlimited} onChange={v => set('max_clients_unlimited', v)} label="Unlimited" />
          {!s.max_clients_unlimited && (
            <BSInput type="number" value={s.max_clients} onChange={v => set('max_clients', v)} min={1} className="w-24" />
          )}
        </div>
      </BSRow>
      <BSRow label="Waitlist" hint="New requests wait in line once you are full.">
        <BSToggle value={s.waitlist_enabled} onChange={v => set('waitlist_enabled', v)} />
      </BSRow>
      <BSRow label="Capacity alerts" hint="We tell you at 80%, 90% and 100% of your limit.">
        <BSToggle value={s.capacity_alerts} onChange={v => set('capacity_alerts', v)} />
      </BSRow>
      <BSGroup>Client categorization</BSGroup>
      <BSRow label="Default client tags" hint="Added to every new client.">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(s.default_tags || []).map((tag, i) => (
              <span key={i} className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary pl-3 pr-1 text-sm font-medium text-foreground">
                {tag}
                <button onClick={() => removeTag(i)} aria-label={`Remove ${tag}`} className="touch-compact flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newTag} onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              placeholder="Add a tag" className={cn(fieldClass, 'flex-1')} />
            <Button variant="outline" onClick={addTag}>Add</Button>
          </div>
        </div>
      </BSRow>
      <BSRow label="At-risk threshold" hint="Tag a client as at risk at or below this adherence.">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.auto_tag_at_risk_pct} onChange={v => set('auto_tag_at_risk_pct', v)} min={0} max={100} className="w-24" />
          <span className="text-sm text-muted-foreground">% adherence or below</span>
        </div>
      </BSRow>
      <BSRow label="High performer threshold" hint="Tag a client as a high performer at or above this adherence.">
        <div className="flex items-center gap-2">
          <BSInput type="number" value={s.auto_tag_high_performer_pct} onChange={v => set('auto_tag_high_performer_pct', v)} min={0} max={100} className="w-24" />
          <span className="text-sm text-muted-foreground">% adherence or above</span>
        </div>
      </BSRow>
    </BSSection>
  );
}