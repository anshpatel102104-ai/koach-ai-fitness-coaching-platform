import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { getUserTier, getLimit } from '@/lib/subscription';
import { cn } from '@/lib/utils';
import { Users, Dumbbell, Utensils, TrendingUp } from 'lucide-react';
import { useUpgradeModal } from '@/components/layout/AppLayout';

function UsageBar({ label, icon: Icon, current, limit }) {
  if (limit === -1) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </span>
          <span className="text-accent font-semibold">Unlimited</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full w-full rounded-full bg-accent/40" />
        </div>
      </div>
    );
  }

  const pct = Math.min((current / limit) * 100, 100);
  const color =
    pct >= 90 ? 'bg-destructive' :
    pct >= 70 ? 'bg-warning' :
    'bg-success';
  const textColor =
    pct >= 90 ? 'text-destructive' :
    pct >= 70 ? 'text-warning' :
    'text-success';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className={cn('font-bold font-heading', textColor)}>
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function UsageSummaryCard({ user }) {
  const { openUpgradeModal } = useUpgradeModal();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-count'],
    queryFn: () => db.entities.Client.list(),
    refetchInterval: 30000,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-count'],
    queryFn: () => db.entities.WorkoutProgram.list(),
    refetchInterval: 30000,
  });

  const { data: nutrition = [] } = useQuery({
    queryKey: ['nutrition-count'],
    queryFn: () => db.entities.NutritionPlan.list(),
    refetchInterval: 30000,
  });

  const tier = getUserTier(user);
  const clientLimit = getLimit(user, 'max_clients');
  const programLimit = getLimit(user, 'max_programs');
  const nutritionLimit = getLimit(user, 'max_nutrition_plans');

  // If everything is unlimited, don't show the card
  if (clientLimit === -1 && programLimit === -1 && nutritionLimit === -1) return null;

  return (
    <div className="glass-card rounded-2xl p-5 card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading">Plan Usage</h3>
            <p className="text-xs text-muted-foreground">{tier.name} plan</p>
          </div>
        </div>
        <button
          onClick={() => openUpgradeModal('clients')}
          className="text-xs text-primary font-semibold hover:underline"
        >
          Upgrade →
        </button>
      </div>

      <div className="space-y-4">
        <UsageBar label="Clients" icon={Users} current={clients.length} limit={clientLimit} />
        <UsageBar label="Programs" icon={Dumbbell} current={programs.length} limit={programLimit} />
        <UsageBar label="Nutrition Plans" icon={Utensils} current={nutrition.length} limit={nutritionLimit} />
      </div>
    </div>
  );
}