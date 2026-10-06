import React from 'react';
import { NSection, NRow, NDelivery, NMultiCheck } from './NotifsHelpers';
import { toast } from 'sonner';

const REMINDER_OPTIONS = [
  { value: '24h', label: '24 hrs' },
  { value: '1h', label: '1 hr' },
  { value: '15m', label: '15 min' },
];

const DEFAULTS = {
  session_request: { enabled: true, delivery: 'push_email' },
  session_reminder: { enabled: true, delivery: 'push', when: ['1h'] },
  session_noshow: { enabled: true, delivery: 'push' },
  daily_sessions: { enabled: true, delivery: 'push_email', time: '07:00' },
};

export default function NotifsScheduling({ s, set }) {
  const d = { ...DEFAULTS, ...(s.scheduling || {}) };
  const upd = (key, val) => set('scheduling', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="Scheduling"
      onReset={() => set('scheduling', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for scheduling')}>

      <NRow enabled={d.session_request.enabled} onToggle={v => upd('session_request', { enabled: v })}
        title="New session request"
        description="Alert when a client requests to book a session">
        <NDelivery value={d.session_request.delivery} onChange={v => upd('session_request', { delivery: v })} />
      </NRow>

      <NRow enabled={d.session_reminder.enabled} onToggle={v => upd('session_reminder', { enabled: v })}
        title="Session starting soon"
        description="Reminder before an upcoming session">
        <NDelivery value={d.session_reminder.delivery} onChange={v => upd('session_reminder', { delivery: v })} />
        <NMultiCheck values={d.session_reminder.when || []} onChange={v => upd('session_reminder', { when: v })} options={REMINDER_OPTIONS} />
      </NRow>

      <NRow enabled={d.session_noshow.enabled} onToggle={v => upd('session_noshow', { enabled: v })}
        title="Session no-show"
        description="Notify when a client misses a scheduled session">
        <NDelivery value={d.session_noshow.delivery} onChange={v => upd('session_noshow', { delivery: v })} />
      </NRow>

      <NRow enabled={d.daily_sessions.enabled} onToggle={v => upd('daily_sessions', { enabled: v })}
        title="Daily sessions digest"
        description="Morning summary of today's scheduled sessions">
        <NDelivery value={d.daily_sessions.delivery} onChange={v => upd('daily_sessions', { delivery: v })} />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">at</span>
          <input type="time" value={d.daily_sessions.time || '07:00'} onChange={e => upd('daily_sessions', { time: e.target.value })}
            className="px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:border-primary font-semibold text-foreground" />
        </div>
      </NRow>
    </NSection>
  );
}