import React, { useMemo } from 'react';
import { Panel } from '@/components/kit';
import { cn } from '@/lib/utils';

// Industry benchmarks (anonymous aggregate estimates)
const BENCHMARKS = {
  mrr_per_client: { value: 250, label: 'Avg MRR / Client', unit: '$' },
  retention_rate: { value: 78, label: 'Client Retention Rate', unit: '%' },
  checkin_completion: { value: 72, label: 'Check-in Completion', unit: '%' },
  adherence: { value: 68, label: 'Avg Adherence Score', unit: '%' },
  response_rate: { value: 85, label: 'Coach Response Rate', unit: '%' },
};

function BenchmarkRow({ label, coachVal, benchmarkVal, unit, isHigherBetter = true }) {
  const diff = coachVal - benchmarkVal;
  const isBetter = isHigherBetter ? diff >= 0 : diff <= 0;
  const fmt = (v) => (unit === '$' ? `$${v}` : `${v}${unit}`);

  return (
    <div className="grid grid-cols-[1fr_auto_56px] items-baseline gap-3 py-2.5 border-b border-border last:border-0">
      <p className="text-sm text-foreground">{label}</p>
      <p className={cn('num text-[18px] text-right', isBetter ? 'text-foreground' : 'text-destructive')}>{fmt(coachVal)}</p>
      <p className="text-[13px] text-muted-foreground text-right tabular-nums">{fmt(benchmarkVal)}</p>
    </div>
  );
}

export default function BIBenchmarks({ clients, checkIns }) {
  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);
  const mrrPerClient = activeClients.length > 0 ? Math.round(mrr / activeClients.length) : 0;

  const completedCount = clients.filter(c => c.lifecycle_status === 'completed' || c.lifecycle_status === 'alumni').length;
  const retentionRate = clients.length > 0 ? Math.round(((clients.length - completedCount) / clients.length) * 100) : 100;

  const totalCheckIns = checkIns.length;
  const reviewedCheckIns = checkIns.filter(ci => ci.review_status === 'reviewed' || ci.coach_responded).length;
  const checkinCompletionRate = totalCheckIns > 0 ? Math.round((reviewedCheckIns / totalCheckIns) * 100) : 0;

  const avgAdherence = checkIns.length > 0
    ? Math.round(checkIns.reduce((s, ci) => s + ((ci.compliance_training || 0) + (ci.compliance_nutrition || 0)) / 2, 0) / checkIns.length)
    : 0;

  const respondedCheckIns = checkIns.filter(ci => ci.coach_responded).length;
  const responseRate = totalCheckIns > 0 ? Math.round((respondedCheckIns / totalCheckIns) * 100) : 0;

  // Percentile estimation
  const overallPct = Math.round((
    (mrrPerClient / BENCHMARKS.mrr_per_client.value) * 25 +
    (retentionRate / BENCHMARKS.retention_rate.value) * 25 +
    (checkinCompletionRate / BENCHMARKS.checkin_completion.value) * 25 +
    (avgAdherence / BENCHMARKS.adherence.value) * 25
  ));

  const percentileLabel = overallPct >= 125 ? 'top 10%' : overallPct >= 110 ? 'top 25%' : overallPct >= 90 ? 'top 50%' : 'bottom 50%';

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Against other coaches</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Overall you're in the <span className="font-semibold text-foreground">{percentileLabel}</span>. Red is below the typical coach.
      </p>

      <div className="mt-3 grid grid-cols-[1fr_auto_56px] gap-3 text-[13px] text-muted-foreground pb-1.5 border-b border-border">
        <span />
        <span className="text-right">You</span>
        <span className="text-right">Typical</span>
      </div>
      <BenchmarkRow label="Revenue per client" coachVal={mrrPerClient} benchmarkVal={BENCHMARKS.mrr_per_client.value} unit="$" />
      <BenchmarkRow label="Retention" coachVal={retentionRate} benchmarkVal={BENCHMARKS.retention_rate.value} unit="%" />
      <BenchmarkRow label="Check-ins reviewed" coachVal={checkinCompletionRate} benchmarkVal={BENCHMARKS.checkin_completion.value} unit="%" />
      <BenchmarkRow label="Adherence" coachVal={avgAdherence} benchmarkVal={BENCHMARKS.adherence.value} unit="%" />
      <BenchmarkRow label="Replies sent" coachVal={responseRate} benchmarkVal={BENCHMARKS.response_rate.value} unit="%" />

      <p className="text-[13px] text-muted-foreground mt-3">Typical values are industry estimates, not live data.</p>
    </Panel>
  );
}
