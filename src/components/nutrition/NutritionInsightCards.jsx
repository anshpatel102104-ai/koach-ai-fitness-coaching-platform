import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, AlertTriangle, TrendingUp, Bell, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { cn } from '@/lib/utils';

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
    { key: 'protein',   count: underProtein,    title: 'Under protein target',       label: 'Missing daily protein goals',   icon: TrendingDown,  numColor: 'text-destructive' },
    { key: 'adherence', count: lowAdherence,     title: 'Low adherence',              label: 'Below 70% meal compliance',     icon: AlertTriangle, numColor: 'text-warning' },
    { key: 'increase',  count: readyForIncrease, title: 'Ready for calorie increase', label: 'Consistent adherence weeks',    icon: TrendingUp,    numColor: 'text-success' },
    { key: 'checkin',   count: missedCheckins,   title: 'Missed meal check-ins',      label: 'No log in 48+ hours',           icon: Bell,          numColor: 'text-foreground' },
  ];
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-muted" />
      <div className="w-10 h-6 rounded bg-muted" />
      <div className="space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="h-2.5 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

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
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  }

  const insights = buildInsights(plans, clients);
  const allClear = insights.every(i => i.count === 0);

  if (allClear) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3"
      >
        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">All clients on track</p>
          <p className="text-xs text-muted-foreground mt-0.5">No nutrition alerts at this time</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {insights.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className={cn('text-2xl font-semibold leading-none', item.numColor)}>{item.count}</div>
              <div className="text-sm font-medium text-foreground mt-1">{item.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}