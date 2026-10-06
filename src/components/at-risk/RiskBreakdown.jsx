import React from 'react';
import { Segmented } from '@/components/kit';

/** Risk level from the risk engine's score and flag count. */
export function riskLevel(entry) {
  const { riskScore, flags } = entry;
  if (flags.length >= 3 || riskScore >= 60) return 'critical';
  if (flags.length === 2 || riskScore >= 30) return 'moderate';
  return 'watch';
}

export const RISK_LEVELS = {
  critical: { label: 'Urgent', text: 'text-destructive', hint: 'Needs you today' },
  moderate: { label: 'This week', text: 'text-warning', hint: 'Get to them this week' },
  watch:    { label: 'Watch', text: 'text-muted-foreground', hint: 'Keep an eye on' },
};

/**
 * Segmented filter over the at-risk list: All / Urgent / This week / Watch,
 * each with its count. Replaces the old three coloured columns.
 */
export default function RiskBreakdown({ atRisk, onFilter, activeFilter }) {
  const count = (lvl) => atRisk.filter(e => riskLevel(e) === lvl).length;
  return (
    <Segmented
      value={activeFilter}
      onChange={onFilter}
      options={[
        { value: 'all', label: 'All', count: atRisk.length },
        { value: 'critical', label: RISK_LEVELS.critical.label, count: count('critical') },
        { value: 'moderate', label: RISK_LEVELS.moderate.label, count: count('moderate') },
        { value: 'watch', label: RISK_LEVELS.watch.label, count: count('watch') },
      ]}
    />
  );
}
