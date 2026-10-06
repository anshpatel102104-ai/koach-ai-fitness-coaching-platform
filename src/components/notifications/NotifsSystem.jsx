import React from 'react';
import { NSection, NRow, NDelivery, NMultiCheck } from './NotifsHelpers';
import { toast } from 'sonner';

const LIMIT_OPTIONS = [
  { value: '80', label: '80%' },
  { value: '90', label: '90%' },
  { value: '100', label: '100%' },
];

const DEFAULTS = {
  security_alerts: { enabled: true, delivery: 'push_email' },
  plan_limit: { enabled: true, delivery: 'push_email', thresholds: ['80', '90', '100'] },
  feature_updates: { enabled: true, delivery: 'email' },
  maintenance: { enabled: true, delivery: 'email' },
};

export default function NotifsSystem({ s, set }) {
  const d = { ...DEFAULTS, ...(s.system || {}) };
  const upd = (key, val) => set('system', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="System and account"
      onReset={() => set('system', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for system')}>

      <NRow enabled={d.security_alerts.enabled} onToggle={v => upd('security_alerts', { enabled: v })}
        locked={true}
        title="Security alerts"
        description="New login from unrecognized device, password changes">
        <NDelivery value={d.security_alerts.delivery} onChange={v => upd('security_alerts', { delivery: v })} />
      </NRow>

      <NRow enabled={d.plan_limit.enabled} onToggle={v => upd('plan_limit', { enabled: v })}
        title="Plan limit approaching"
        description="Alert when approaching client or feature limits">
        <NDelivery value={d.plan_limit.delivery} onChange={v => upd('plan_limit', { delivery: v })} />
        <NMultiCheck values={d.plan_limit.thresholds || []} onChange={v => upd('plan_limit', { thresholds: v })} options={LIMIT_OPTIONS} />
      </NRow>

      <NRow enabled={d.feature_updates.enabled} onToggle={v => upd('feature_updates', { enabled: v })}
        title="Feature updates"
        description="Learn about new KOACH AI features and improvements">
        <NDelivery value={d.feature_updates.delivery} onChange={v => upd('feature_updates', { delivery: v })} options={['off', 'push', 'email', 'push_email']} />
      </NRow>

      <NRow enabled={d.maintenance.enabled} onToggle={v => upd('maintenance', { enabled: v })}
        title="Maintenance & downtime"
        description="Advance notice of scheduled maintenance">
        <NDelivery value={d.maintenance.delivery} onChange={v => upd('maintenance', { delivery: v })} options={['off', 'push', 'email', 'push_email']} />
      </NRow>
    </NSection>
  );
}