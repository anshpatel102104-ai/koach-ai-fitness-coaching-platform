import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInWeeks, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import MetricsCard from './MetricsCard';
import BodyWeightChart from './BodyWeightChart';
import AIProgressAnalyzer from '@/components/progress/AIProgressAnalyzer';
import ProgressOverviewTab from '@/components/progress/tabs/ProgressOverviewTab';
import ProgressBodyStatsTab from '@/components/progress/tabs/ProgressBodyStatsTab';
import ProgressMeasurementsTab from '@/components/progress/tabs/ProgressMeasurementsTab';
import ProgressPhotosTab from '@/components/progress/tabs/ProgressPhotosTab';
import ProgressPerformanceTab from '@/components/progress/tabs/ProgressPerformanceTab';
import {
  Scale, Activity, Ruler, Camera, Zap, Sparkles, ChevronRight,
} from 'lucide-react';

// ── Metric categories — extensible list. Add more here later. ──
const CATEGORIES = [
  {
    key: 'body_weight',
    label: 'Body Weight',
    icon: Scale,
    description: 'Weight log & trend chart',
  },
  {
    key: 'body_metrics',
    label: 'Body Metrics',
    icon: Ruler,
    description: 'Height, sex, DOB, weight targets',
  },
  {
    key: 'overview',
    label: 'Progress Overview',
    icon: Activity,
    description: 'Goal progress & score summary',
  },
  {
    key: 'body_stats',
    label: 'Body Stats',
    icon: Scale,
    description: 'Check-in weight history',
  },
  {
    key: 'measurements',
    label: 'Measurements',
    icon: Ruler,
    description: 'Body measurement history',
  },
  {
    key: 'photos',
    label: 'Photos',
    icon: Camera,
    description: 'Before/after & progress photos',
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: Zap,
    description: 'Workout performance data',
  },
  {
    key: 'ai',
    label: 'AI Analysis',
    icon: Sparkles,
    description: 'AI-generated progress insights',
  },
];

function calcProgressScore(client, checkIns) {
  if (!checkIns.length) return 0;
  let score = 50;
  const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (client.target_weight && last.weight && first.weight) {
    const needed = Math.abs(client.target_weight - first.weight);
    const achieved = Math.abs(last.weight - first.weight);
    if (needed > 0) score += Math.min(30, (achieved / needed) * 30);
  }
  const recentCIs = sorted.slice(-4);
  const avgAdh = recentCIs.reduce(
    (s, ci) => s + ((ci.compliance_training ?? 70) + (ci.compliance_nutrition ?? 70)) / 2,
    0,
  ) / recentCIs.length;
  score += (avgAdh / 100) * 40 - 20;
  const weeksActive = differenceInWeeks(new Date(last.date), new Date(first.date)) + 1;
  const consistency = Math.min(1, checkIns.length / weeksActive);
  score += consistency * 20 - 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function MetricsTab({ client, onClientUpdated }) {
  const [activeCategory, setActiveCategory] = useState('body_weight');

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins-metrics', client?.id],
    queryFn: () => db.entities.CheckIn.filter({ client_id: client.id }),
    enabled: !!client?.id,
    select: d => [...d].sort((a, b) => new Date(b.date) - new Date(a.date)),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-metrics', client?.id],
    queryFn: () => db.entities.WorkoutSession.filter({ client_id: client.id }),
    enabled: !!client?.id,
  });

  const sortedCheckIns = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sortedCheckIns[0];
  const last = sortedCheckIns[sortedCheckIns.length - 1];
  const startDate = client.start_date || first?.date;
  const weeksActive = startDate ? differenceInWeeks(new Date(), parseISO(startDate)) + 1 : 0;
  const score = calcProgressScore(client, checkIns);

  const currentCat = CATEGORIES.find(c => c.key === activeCategory);

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--tc-muted)' }}>

      {/* ── LEFT: Category list (Trainerize-style) ── */}
      <div className="w-[220px] flex-shrink-0 bg-card border-r border-border overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Metrics</p>
        </div>
        <div className="py-2">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative',
                  isActive
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />
                )}
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-semibold leading-tight', isActive ? 'text-primary' : 'text-foreground')}>
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{cat.description}</p>
                </div>
                <ChevronRight className={cn('w-3.5 h-3.5 flex-shrink-0', isActive ? 'text-primary' : 'text-border')} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Detail panel ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Category header */}
        <div className="px-6 py-4 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
          {currentCat && (
            <>
              <currentCat.icon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">{currentCat.label}</p>
                <p className="text-xs text-muted-foreground">{currentCat.description}</p>
              </div>
            </>
          )}
        </div>

        <div className="p-5 space-y-4">

          {activeCategory === 'body_weight' && (
            <BodyWeightChart client={client} onCurrentWeightUpdated={onClientUpdated} />
          )}

          {activeCategory === 'body_metrics' && (
            <MetricsCard client={client} onUpdated={onClientUpdated} />
          )}

          {activeCategory === 'overview' && (
            <ProgressOverviewTab
              client={client}
              checkIns={checkIns}
              sessions={sessions}
              score={score}
              weeksActive={weeksActive}
              first={first}
              last={last}
            />
          )}

          {activeCategory === 'body_stats' && (
            <ProgressBodyStatsTab client={client} checkIns={checkIns} />
          )}

          {activeCategory === 'measurements' && (
            <ProgressMeasurementsTab client={client} checkIns={checkIns} />
          )}

          {activeCategory === 'photos' && (
            <ProgressPhotosTab client={client} checkIns={checkIns} />
          )}

          {activeCategory === 'performance' && (
            <ProgressPerformanceTab client={client} sessions={sessions} checkIns={checkIns} />
          )}

          {activeCategory === 'ai' && (
            <AIProgressAnalyzer
              client={client}
              checkIns={checkIns}
              workoutSessions={sessions}
              isClientFacing={false}
              compact={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}