import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/kit';

function buildInsights(plans, clients) {
  const planById = Object.fromEntries(plans.map(p => [p.id, p]));
  const clientsWithPlan = clients.filter(c => c.assigned_nutrition_id);
  const now = Date.now();
  const ms48h = 48 * 60 * 60 * 1000;

  let underProtein = 0, lowAdherence = 0, readyForIncrease = 0, missedCheckins = 0;

  for (const client of clientsWithPlan) {
    const plan = planById[client.assigned_nutrition_id];
    if (!plan) continue;
    if ((plan.protein_g ?? 0) < 150) underProtein++;
    if (plan.adherence_rate != null && plan.adherence_rate < 70) lowAdherence++;
    const isConsistent = plan.consistent_weeks >= 2 || (plan.consistent_weeks == null && plan.adherence_rate >= 85);
    if (isConsistent) readyForIncrease++;
    const lastCheckin = plan.last_checkin ? new Date(plan.last_checkin).getTime() : null;
    if (!lastCheckin || now - lastCheckin > ms48h) missedCheckins++;
  }

  return [
    { key: 'checkin',   count: missedCheckins,   title: 'Not logging',            label: 'No food log in 48 hours',  tone: 'danger' },
    { key: 'adherence', count: lowAdherence,     title: 'Low adherence',          label: 'Under 70% of meals on plan', tone: 'warning' },
    { key: 'protein',   count: underProtein,     title: 'Low protein targets',    label: 'Plan sets under 150 g a day', tone: 'default' },
    { key: 'increase',  count: readyForIncrease, title: 'Ready for more food',    label: 'Two or more consistent weeks', tone: 'default' },
  ];
}

const TONE = { danger: 'text-destructive', warning: 'text-warning', default: 'text-foreground' };

/** "Needs you" strip for the nutrition landing: four counts, no decoration. */
export default function NutritionInsightCards() {
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['nutrition-plans-insights'],
    queryFn: () => db.entities.NutritionPlan.list(),
  });
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-insights'],
    queryFn: () => db.entities.Client.list(),
  });

  if (plansLoading || clientsLoading) {
    return <Panel className="h-[118px] animate-pulse" aria-hidden />;
  }

  const insights = buildInsights(plans, clients);
  const allClear = insights.every(i => i.count === 0);

  if (allClear) {
    return (
      <Panel className="px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        <p className="text-[15px] text-foreground">
          Every client on a meal plan is logging and on target. Nothing needs you here today.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="grid grid-cols-2 lg:grid-cols-4">
      {insights.map((item, i) => (
        <div
          key={item.key}
          className={cn(
            'px-5 py-4 sm:py-5 border-border',
            i % 2 === 1 && 'border-l',
            i >= 2 && 'border-t lg:border-t-0',
            i === 2 && 'lg:border-l'
          )}
        >
          <p className={cn('num text-[34px] leading-none', item.count > 0 ? TONE[item.tone] : 'text-muted-foreground')}>{item.count}</p>
          <p className="text-[15px] font-semibold text-foreground mt-2">{item.title}</p>
          <p className="text-[13px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </Panel>
  );
}
