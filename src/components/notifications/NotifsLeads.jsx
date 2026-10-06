import React from 'react';
import { NSection, NRow, NDelivery, NSelect } from './NotifsHelpers';
import { toast } from 'sonner';

const FOLLOWUP_DAYS = [
  { value: '3', label: 'After 3 days' }, { value: '5', label: 'After 5 days' },
  { value: '7', label: 'After 7 days' }, { value: '14', label: 'After 14 days' },
];

const DEFAULTS = {
  new_lead: { enabled: true, delivery: 'push' },
  followup_reminder: { enabled: true, delivery: 'push', days: '5' },
  lead_converted: { enabled: true, delivery: 'push_email' },
  proposal_viewed: { enabled: true, delivery: 'push' },
};

export default function NotifsLeads({ s, set }) {
  const d = { ...DEFAULTS, ...(s.leads || {}) };
  const upd = (key, val) => set('leads', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="Leads and sales"
      onReset={() => set('leads', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for leads')}>

      <NRow enabled={d.new_lead.enabled} onToggle={v => upd('new_lead', { enabled: v })}
        title="New lead added"
        description="Notify when a new lead enters your pipeline">
        <NDelivery value={d.new_lead.delivery} onChange={v => upd('new_lead', { delivery: v })} />
      </NRow>

      <NRow enabled={d.followup_reminder.enabled} onToggle={v => upd('followup_reminder', { enabled: v })}
        title="Lead follow-up reminder"
        description="Reminder to follow up with leads that have gone cold">
        <NDelivery value={d.followup_reminder.delivery} onChange={v => upd('followup_reminder', { delivery: v })} />
        <NSelect value={d.followup_reminder.days} onChange={v => upd('followup_reminder', { days: v })} options={FOLLOWUP_DAYS} />
      </NRow>

      <NRow enabled={d.lead_converted.enabled} onToggle={v => upd('lead_converted', { enabled: v })}
        title="Lead converted to client"
        description="Celebrate when a lead becomes a paying client">
        <NDelivery value={d.lead_converted.delivery} onChange={v => upd('lead_converted', { delivery: v })} />
      </NRow>

      <NRow enabled={d.proposal_viewed.enabled} onToggle={v => upd('proposal_viewed', { enabled: v })}
        title="Proposal viewed"
        description="Notify when a lead opens your coaching proposal">
        <NDelivery value={d.proposal_viewed.delivery} onChange={v => upd('proposal_viewed', { delivery: v })} />
      </NRow>
    </NSection>
  );
}