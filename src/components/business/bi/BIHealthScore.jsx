import React, { useMemo } from 'react';
import { parseISO, subMonths, startOfMonth } from 'date-fns';
import { Panel } from '@/components/kit';
import { Meter } from '@/components/business/ui';
import { cn } from '@/lib/utils';

export default function BIHealthScore({ clients, checkIns, leads }) {
  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);

  const scores = useMemo(() => {
    // Revenue Health (0-100)
    const hasRevenue = mrr > 0 ? 40 : 0;
    const revenueGrowth = clients.filter(c => {
      const sd = c.start_date ? parseISO(c.start_date) : null;
      return sd && sd >= startOfMonth(subMonths(new Date(), 1));
    }).length > 0 ? 30 : 0;
    const paymentHealth = 30; // assume good without payment failure data
    const revenueScore = Math.min(100, hasRevenue + revenueGrowth + paymentHealth);

    // Client Health (0-100)
    const atRiskCount = clients.filter(c => c.lifecycle_status === 'at_risk').length;
    const atRiskPenalty = Math.min(40, atRiskCount * 10);
    const avgAdherence = checkIns.length > 0
      ? checkIns.reduce((s, ci) => s + ((ci.compliance_training || 0) + (ci.compliance_nutrition || 0)) / 2, 0) / checkIns.length
      : 50;
    const clientScore = Math.max(0, Math.min(100, Math.round(avgAdherence) - atRiskPenalty + 20));

    // Growth Health (0-100)
    const pipelineLeads = leads.filter(l => l.stage === 'lead' || l.stage === 'booked').length;
    const converted = leads.filter(l => l.stage === 'active_client').length;
    const convRate = leads.length > 0 ? converted / leads.length : 0;
    const growthScore = Math.min(100, Math.round(
      (pipelineLeads > 0 ? 30 : 0) +
      (convRate > 0.3 ? 40 : convRate > 0.15 ? 25 : 10) +
      (activeClients.length > 0 ? 30 : 0)
    ));

    // Operational Health (0-100)
    const reviewedCheckIns = checkIns.filter(ci => ci.review_status === 'reviewed').length;
    const reviewRate = checkIns.length > 0 ? reviewedCheckIns / checkIns.length : 0;
    const respondedCheckIns = checkIns.filter(ci => ci.coach_responded).length;
    const responseRate = checkIns.length > 0 ? respondedCheckIns / checkIns.length : 0;
    const operationalScore = Math.min(100, Math.round((reviewRate * 50) + (responseRate * 50)));

    const overall = Math.round((revenueScore + clientScore + growthScore + operationalScore) / 4);

    return { overall, revenueScore, clientScore, growthScore, operationalScore };
  }, [clients, checkIns, leads, mrr]);

  const tone = (v) => (v >= 70 ? 'ink' : v >= 40 ? 'warning' : 'danger');
  const categories = [
    { label: 'Revenue', score: scores.revenueScore, hint: 'Recurring income and new sign-ups' },
    { label: 'Clients', score: scores.clientScore, hint: 'Adherence, minus clients at risk' },
    { label: 'Growth', score: scores.growthScore, hint: 'Leads in the pipeline and conversion' },
    { label: 'Operations', score: scores.operationalScore, hint: 'Check-ins reviewed and replied to' },
  ];
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];

  const label = scores.overall >= 75 ? 'Strong' : scores.overall >= 60 ? 'Steady' : scores.overall >= 40 ? 'Needs work' : 'At risk';
  const sentence = scores.overall >= 75
    ? `Every area is holding up. ${weakest.label} is the lowest at ${weakest.score}.`
    : `${weakest.label} is pulling the score down at ${weakest.score}. ${weakest.hint}.`;

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col">
      <h2 className="text-[22px] text-foreground">Business health</h2>
      <div className="flex items-baseline gap-3 mt-3">
        <p className={cn('num text-[56px] leading-none', scores.overall < 40 ? 'text-destructive' : 'text-foreground')}>{scores.overall}</p>
        <p className="text-[15px] font-semibold text-foreground">{label}<span className="text-muted-foreground font-normal"> out of 100</span></p>
      </div>
      <p className="text-[15px] text-muted-foreground mt-2 max-w-md">{sentence}</p>

      <div className="mt-5 pt-4 border-t border-border space-y-3.5">
        {categories.map(c => (
          <div key={c.label} className="grid grid-cols-[96px_1fr_32px] items-center gap-3">
            <p className="text-sm text-foreground">{c.label}</p>
            <Meter value={c.score} tone={tone(c.score)} />
            <p className={cn('text-sm font-semibold text-right tabular-nums', c.score < 40 ? 'text-destructive' : 'text-foreground')}>{c.score}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
