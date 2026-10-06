import React from 'react';
import { NSection, NRow, NDelivery, NSelect, NToggle } from './NotifsHelpers';
import { toast } from 'sonner';

const DAYS = [
  { value: '1', label: 'After 1 day' },
  { value: '2', label: 'After 2 days' },
  { value: '3', label: 'After 3 days' },
  { value: '7', label: 'After 7 days' },
];
const LOGIN_DAYS = [
  { value: '3', label: '3 days' }, { value: '5', label: '5 days' },
  { value: '7', label: '7 days' }, { value: '10', label: '10 days' },
  { value: '14', label: '14 days' },
];

const DEFAULTS = {
  checkin_submitted: { enabled: true, delivery: 'push_email' },
  checkin_overdue: { enabled: true, delivery: 'push', days: '2' },
  workout_logged: { enabled: false, delivery: 'push', prs_only: true },
  personal_best: { enabled: true, delivery: 'push' },
  milestone: { enabled: true, delivery: 'push_email' },
  no_login: { enabled: true, delivery: 'push', days: '7' },
  program_complete: { enabled: true, delivery: 'push_email' },
  new_client: { enabled: true, delivery: 'push_email' },
  profile_updated: { enabled: true, delivery: 'push' },
};

export default function NotifsClientActivity({ s, set }) {
  const d = { ...DEFAULTS, ...(s.client_activity || {}) };
  const upd = (key, val) => set('client_activity', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="Client activity"
      onReset={() => set('client_activity', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for client activity')}>

      <NRow enabled={d.checkin_submitted.enabled} onToggle={v => upd('checkin_submitted', { enabled: v })}
        title="New check-in submitted"
        description="Get notified immediately when a client submits their weekly check-in">
        <NDelivery value={d.checkin_submitted.delivery} onChange={v => upd('checkin_submitted', { delivery: v })} />
      </NRow>

      <NRow enabled={d.checkin_overdue.enabled} onToggle={v => upd('checkin_overdue', { enabled: v })}
        title="Check-in overdue"
        description="Alert when a client misses their check-in deadline">
        <NDelivery value={d.checkin_overdue.delivery} onChange={v => upd('checkin_overdue', { delivery: v })} />
        <NSelect value={d.checkin_overdue.days} onChange={v => upd('checkin_overdue', { days: v })} options={DAYS} />
      </NRow>

      <NRow enabled={d.workout_logged.enabled} onToggle={v => upd('workout_logged', { enabled: v })}
        title="Client logged a workout"
        description="Notify when any client completes a workout">
        <NDelivery value={d.workout_logged.delivery} onChange={v => upd('workout_logged', { delivery: v })} />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium cursor-pointer">
          <NToggle value={d.workout_logged.prs_only} onChange={v => upd('workout_logged', { prs_only: v })} />
          Only for new PRs
        </label>
      </NRow>

      <NRow enabled={d.personal_best.enabled} onToggle={v => upd('personal_best', { enabled: v })}
        title="Client hit a personal best"
        description="Get notified when a client breaks a personal record">
        <NDelivery value={d.personal_best.delivery} onChange={v => upd('personal_best', { delivery: v })} />
      </NRow>

      <NRow enabled={d.milestone.enabled} onToggle={v => upd('milestone', { enabled: v })}
        title="Client milestone achieved"
        description="Notify when client hits weight loss, streak, or completion milestones">
        <NDelivery value={d.milestone.delivery} onChange={v => upd('milestone', { delivery: v })} />
      </NRow>

      <NRow enabled={d.no_login.enabled} onToggle={v => upd('no_login', { enabled: v })}
        title="Client hasn't logged in"
        description="Alert when a client hasn't opened the app">
        <NDelivery value={d.no_login.delivery} onChange={v => upd('no_login', { delivery: v })} />
        <NSelect value={d.no_login.days} onChange={v => upd('no_login', { days: v })} options={LOGIN_DAYS} />
      </NRow>

      <NRow enabled={d.program_complete.enabled} onToggle={v => upd('program_complete', { enabled: v })}
        title="Client completed their program"
        description="Notify when a client finishes their assigned program">
        <NDelivery value={d.program_complete.delivery} onChange={v => upd('program_complete', { delivery: v })} />
      </NRow>

      <NRow enabled={d.new_client.enabled} onToggle={v => upd('new_client', { enabled: v })}
        title="New client joined"
        description="Alert when a new client accepts their invite and completes onboarding">
        <NDelivery value={d.new_client.delivery} onChange={v => upd('new_client', { delivery: v })} />
      </NRow>

      <NRow enabled={d.profile_updated.enabled} onToggle={v => upd('profile_updated', { enabled: v })}
        title="Client updated their profile"
        description="Notify when a client changes their goal, fitness level, or adds an injury">
        <NDelivery value={d.profile_updated.delivery} onChange={v => upd('profile_updated', { delivery: v })} />
      </NRow>
    </NSection>
  );
}