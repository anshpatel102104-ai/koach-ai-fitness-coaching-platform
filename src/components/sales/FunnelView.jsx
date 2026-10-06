import React from 'react';
import { cn } from '@/lib/utils';
import { Panel, PanelHeader } from '@/components/kit';
import { KANBAN_STAGES } from './KanbanBoard';

// Funnel uses the live pipeline stages; "lost" is reported as a footnote.
const STAGES = KANBAN_STAGES.filter(s => s.key !== 'lost');

export default function FunnelView({ leads, onStageClick, selectedStage }) {
  const counts = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter(l => l.stage === s.key).length;
    return acc;
  }, {});
  const lost = leads.filter(l => l.stage === 'lost').length;
  const max = Math.max(1, ...Object.values(counts));
  const total = leads.length || 1;

  return (
    <Panel className="mb-4">
      <PanelHeader
        title="Funnel"
        subtitle={selectedStage ? 'Showing one stage below. Click it again to show everyone.' : 'Click a stage to filter the leads below.'}
        right={lost > 0 ? <span className="text-sm text-muted-foreground">{lost} lost</span> : null}
      />
      <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-1">
        {STAGES.map(stage => {
          const count = counts[stage.key];
          const pct = Math.round((count / total) * 100);
          const width = Math.max(count > 0 ? 4 : 0, Math.round((count / max) * 100));
          const isSelected = selectedStage === stage.key;
          return (
            <button
              key={stage.key}
              onClick={() => onStageClick(isSelected ? null : stage.key)}
              aria-pressed={isSelected}
              className={cn(
                'w-full grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_96px] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                isSelected ? 'bg-accent' : 'hover:bg-accent/60'
              )}
            >
              <span className={cn('text-sm truncate', isSelected ? 'font-semibold text-foreground' : 'text-foreground/90')}>{stage.label}</span>
              <span className="h-6 rounded-[4px] bg-secondary overflow-hidden">
                <span className={cn('block h-full rounded-[4px]', isSelected ? 'bg-brand' : 'bg-primary')} style={{ width: `${width}%` }} />
              </span>
              <span className="flex items-baseline justify-end gap-2">
                <span className="num text-lg text-foreground">{count}</span>
                <span className="text-[13px] text-muted-foreground w-9 text-right">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
