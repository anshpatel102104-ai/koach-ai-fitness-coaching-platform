import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Initials } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { calmCopy, sentenceCase } from '@/components/dashboard/todayModel';
import { insightHref } from '@/components/dashboard/AIInsightsFeed';

export const INSIGHT_TYPE_LABELS = {
  risk: 'Risk',
  performance: 'Progress',
  opportunity: 'Opportunity',
  celebration: 'Worth celebrating',
};

const TYPE_TONE = {
  risk: 'text-destructive',
  performance: 'text-foreground',
  opportunity: 'text-foreground',
  celebration: 'text-success',
};

/**
 * One AI insight as a list row: who it's about, what the engine noticed,
 * the evidence, and one clear action. Lives inside a Panel.
 */
export default function InsightCard({ insight, onDismiss, onNotRelevant, evidence }) {
  const navigate = useNavigate();
  const typeLabel = INSIGHT_TYPE_LABELS[insight.type] || 'Note';

  return (
    <motion.article
      layout
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4 border-t border-border px-5 py-5 first:border-t-0 sm:px-6"
    >
      <Initials
        name={insight.clientName || 'Roster'}
        size={40}
        tone={insight.type === 'risk' ? 'alert' : 'default'}
        className="mt-0.5 hidden sm:inline-flex"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted-foreground">
          <span className={cn('font-semibold', TYPE_TONE[insight.type])}>{typeLabel}</span>
          {insight.clientName && <> · {insight.clientName}</>}
          {insight.confidence && <> · {insight.confidence.toLowerCase()} confidence</>}
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-snug text-foreground">{calmCopy(insight.headline)}</p>
        {insight.body && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{calmCopy(insight.body)}</p>}
        {evidence && <p className="mt-2 text-[13px] text-muted-foreground">{evidence}</p>}

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => navigate(insightHref(insight.actionPath, insight.clientId))}>
            {sentenceCase(insight.actionLabel || 'Open')}
          </Button>
          {insight.actionAlt && (
            <Button size="sm" variant="outline" onClick={() => navigate(insightHref(insight.actionAltPath, insight.clientId))}>
              {sentenceCase(insight.actionAlt)}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDismiss(insight.id)}>Dismiss</Button>
          <button
            onClick={() => onNotRelevant(insight.id, insight.type)}
            className="ml-auto text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Hide this kind
          </button>
        </div>
      </div>
    </motion.article>
  );
}
