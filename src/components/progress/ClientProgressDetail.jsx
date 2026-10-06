import React, { useState } from 'react';
import { X } from 'lucide-react';
import { differenceInWeeks, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import ProgressOverviewTab from './tabs/ProgressOverviewTab';
import AIProgressAnalyzer from './AIProgressAnalyzer';
import ProgressBodyStatsTab from './tabs/ProgressBodyStatsTab';
import ProgressMeasurementsTab from './tabs/ProgressMeasurementsTab';
import ProgressPhotosTab from './tabs/ProgressPhotosTab';
import ProgressPerformanceTab from './tabs/ProgressPerformanceTab';
import { useSignedUrl } from '@/components/shared/SignedImage';
import { Initials } from '@/components/kit';
import { Button } from '@/components/ui/button';

const TABS = [
  { key: 'ai', label: 'AI read' },
  { key: 'overview', label: 'Overview' },
  { key: 'body_stats', label: 'Body stats' },
  { key: 'measurements', label: 'Measurements' },
  { key: 'photos', label: 'Photos' },
  { key: 'performance', label: 'Performance' },
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
  const avgAdh = recentCIs.reduce((s, ci) => s + ((ci.compliance_training ?? 70) + (ci.compliance_nutrition ?? 70)) / 2, 0) / recentCIs.length;
  score += (avgAdh / 100) * 40 - 20;
  const weeksActive = differenceInWeeks(new Date(last.date), new Date(first.date)) + 1;
  const consistency = Math.min(1, checkIns.length / weeksActive);
  score += consistency * 20 - 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function ClientProgressDetail({ client, checkIns, sessions, allClients, onClose }) {
  const [tab, setTab] = useState('ai');

  const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startDate = client.start_date || first?.date;
  const weeksActive = startDate ? differenceInWeeks(new Date(), parseISO(startDate)) + 1 : 0;
  const score = calcProgressScore(client, checkIns);
  const goalLabel = { weight_loss: 'Fat loss', muscle_gain: 'Muscle gain', strength: 'Strength', endurance: 'Endurance', flexibility: 'Mobility', general_fitness: 'General fitness' }[client.goal] || 'General fitness';
  const avatar = useSignedUrl(client.avatar_url);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${client.name} progress`} className="bg-background rounded-t-xl sm:rounded-xl w-full max-w-5xl h-[95dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden ring-1 ring-border" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 bg-card border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <Initials name={client.name || ''} src={avatar || undefined} tone="ink" size={44} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[24px] leading-tight text-foreground truncate">{client.name}</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {[goalLabel, weeksActive > 0 ? `week ${weeksActive}` : null, `${checkIns.length} check-ins`].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className={cn('num text-[28px] leading-none', score < 50 ? 'text-destructive' : 'text-foreground')}>{score}</p>
              <p className="text-[13px] text-muted-foreground mt-1">Progress score</p>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-5 mt-4 overflow-x-auto scrollbar-hide" role="tablist">
            {TABS.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'touch-compact pb-3 pt-1 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
                  tab === t.key ? 'border-foreground text-foreground font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'ai' && (
            <div className="p-6">
              <AIProgressAnalyzer client={client} checkIns={checkIns} workoutSessions={sessions} isClientFacing={false} compact={false} />
            </div>
          )}
          {tab === 'overview' && (
            <ProgressOverviewTab client={client} checkIns={checkIns} sessions={sessions} score={score} weeksActive={weeksActive} first={first} last={last} />
          )}
          {tab === 'body_stats' && (
            <ProgressBodyStatsTab client={client} checkIns={checkIns} />
          )}
          {tab === 'measurements' && (
            <ProgressMeasurementsTab client={client} checkIns={checkIns} />
          )}
          {tab === 'photos' && (
            <ProgressPhotosTab client={client} checkIns={checkIns} />
          )}
          {tab === 'performance' && (
            <ProgressPerformanceTab client={client} sessions={sessions} checkIns={checkIns} />
          )}
        </div>
      </div>
    </div>
  );
}