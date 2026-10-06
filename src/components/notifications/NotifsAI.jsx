import React from 'react';
import { NSection, NRow, NDelivery, NSelect } from './NotifsHelpers';
import { toast } from 'sonner';

const INSIGHT_OPTIONS = [
  { value: 'all', label: 'All insights' },
  { value: 'critical', label: 'Critical only' },
  { value: 'digest', label: 'Weekly digest only' },
];

const DEFAULTS = {
  new_insight: { enabled: true, delivery: 'push', scope: 'critical' },
  weekly_digest: { enabled: true, delivery: 'email', time: '08:00' },
  at_risk_flagged: { enabled: true, delivery: 'push_email' },
  churn_prediction: { enabled: true, delivery: 'push' },
};

export default function NotifsAI({ s, set }) {
  const d = { ...DEFAULTS, ...(s.ai_insights || {}) };
  const upd = (key, val) => set('ai_insights', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="AI and insights"
      onReset={() => set('ai_insights', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for AI insights')}>

      <NRow enabled={d.new_insight.enabled} onToggle={v => upd('new_insight', { enabled: v })}
        title="New AI insight available"
        description="Get notified when AI identifies something important about your clients">
        <NDelivery value={d.new_insight.delivery} onChange={v => upd('new_insight', { delivery: v })} />
        <NSelect value={d.new_insight.scope} onChange={v => upd('new_insight', { scope: v })} options={INSIGHT_OPTIONS} />
      </NRow>

      <NRow enabled={d.weekly_digest.enabled} onToggle={v => upd('weekly_digest', { enabled: v })}
        title="Weekly AI digest ready"
        description="Your Monday morning business and client summary">
        <NDelivery value={d.weekly_digest.delivery} onChange={v => upd('weekly_digest', { delivery: v })} options={['off', 'push', 'email', 'push_email']} />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">at</span>
          <input type="time" value={d.weekly_digest.time || '08:00'} onChange={e => upd('weekly_digest', { time: e.target.value })}
            className="px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:border-primary font-semibold text-foreground" />
          <span className="text-xs text-muted-foreground">Monday</span>
        </div>
      </NRow>

      <NRow enabled={d.at_risk_flagged.enabled} onToggle={v => upd('at_risk_flagged', { enabled: v })}
        title="At-risk client flagged"
        description="Immediate alert when a client is automatically flagged as at-risk">
        <NDelivery value={d.at_risk_flagged.delivery} onChange={v => upd('at_risk_flagged', { delivery: v })} />
      </NRow>

      <NRow enabled={d.churn_prediction.enabled} onToggle={v => upd('churn_prediction', { enabled: v })}
        title="Client churn prediction"
        description="Early warning when AI predicts a client may cancel">
        <NDelivery value={d.churn_prediction.delivery} onChange={v => upd('churn_prediction', { delivery: v })} />
      </NRow>
    </NSection>
  );
}