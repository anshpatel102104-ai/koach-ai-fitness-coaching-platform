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
import { SignedImg } from '@/components/shared/SignedImage';

const TABS = [
  { key: 'ai', label: '✨ AI Analysis' },
  { key: 'overview', label: 'Overview' },
  { key: 'body_stats', label: 'Body Stats' },
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
  const goalLabel = { weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength', endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness' }[client.goal] || 'General';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-4 flex-shrink-0"
          style={{ background: 'var(--tc-sidebar)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
            {client.avatar_url
              ? <SignedImg src={client.avatar_url} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
              : client.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">{client.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-white/50">{goalLabel}</span>
              {weeksActive > 0 && <span className="text-xs text-white/50">·  {weeksActive}w active</span>}
              <span className="text-xs text-white/50">· {checkIns.length} check-ins</span>
            </div>
          </div>
          {/* Score badge */}
          <div className="flex-shrink-0 text-center">
            <div className={cn('text-2xl font-bold',
              score >= 70 ? 'text-success' : score >= 50 ? 'text-orange-400' : 'text-destructive')}>
              {score}
            </div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide">Progress Score</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--kc-w-10)] hover:bg-[var(--kc-w-20)] transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-border px-6 flex-shrink-0 bg-card overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
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