import React, { useState, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, parseISO, subWeeks } from 'date-fns';
import { generateInsights, dismissInsight, markNotRelevant } from '@/lib/insightEngine';
import { cn } from '@/lib/utils';
import { calmCopy, groupCheckIns, sentenceCase } from './todayModel';

/** Where an insight's main action should land, with the client pre-selected. */
export function insightHref(path, clientId) {
  if (!path) return '/ai-insights';
  if (!clientId) return path;
  if (path === '/messages' || path === '/schedule') return `${path}?clientId=${clientId}`;
  return path;
}

/** "Based on …" evidence line, built from the client's actual records. */
export function insightEvidence(insight, ciMap, clients) {
  if (!insight.clientId) {
    const leads = clients.filter(c => c.lifecycle_status === 'lead').length;
    return leads ? `Based on ${leads} lead${leads === 1 ? '' : 's'} in your pipeline.` : `Based on ${clients.length} client records.`;
  }
  const cis = ciMap[insight.clientId] || [];
  if (!cis.length) return 'Based on no check-ins on record.';
  const cutoff = subWeeks(new Date(), 4);
  const recent = cis.filter(ci => parseISO(ci.date) >= cutoff).length;
  const last = parseISO(cis[0].date);
  const lastLabel = differenceInDays(new Date(), last) > 300 ? format(last, 'MMM d, yyyy') : format(last, 'MMM d');
  return `Based on ${recent} check-in${recent === 1 ? '' : 's'} in the last 4 weeks, the latest on ${lastLabel}.`;
}

export const inkPrimaryBtn = 'inline-flex h-9 items-center rounded-md bg-ai-foreground px-3.5 text-sm font-semibold text-ai transition-colors hover:bg-ai-foreground/90';
export const inkOutlineBtn = 'inline-flex h-9 items-center rounded-md border border-ai-foreground/30 px-3.5 text-sm font-semibold text-ai-foreground transition-colors hover:bg-ai-foreground/10';

/**
 * "Your AI briefing" — the ink panel on Today. Shows the two most important
 * insights from the insight engine, each with one action, Dismiss, and the
 * evidence it's based on.
 */
export default function AIInsightsFeed({ clients = [], checkIns = [], messages = [], limit = 2, className }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [dismissed, setDismissed] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const allInsights = useMemo(
    () => generateInsights(clients, checkIns, messages),
    [clients, checkIns, messages, refreshKey] // eslint-disable-line
  );
  const ciMap = useMemo(() => groupCheckIns(checkIns), [checkIns]);

  const remaining = useMemo(() => allInsights.filter(i => !dismissed.has(i.id)), [allInsights, dismissed]);
  const visible = remaining.slice(0, limit);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setDismissed(new Set());
    setTimeout(() => { setRefreshKey(k => k + 1); setIsRefreshing(false); }, 700);
  }, []);

  const handleDismiss = useCallback((id) => {
    dismissInsight(id);
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  const handleNotRelevant = useCallback((id, type) => {
    markNotRelevant(id, type);
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  return (
    <section className={cn('flex flex-col rounded-xl bg-ai p-5 text-ai-foreground sm:p-6', className)}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="text-[22px]">Your AI briefing</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Re-run the briefing"
          aria-label="Re-run the briefing"
          className="touch-compact -mr-1.5 rounded-md p-1.5 text-ai-foreground/60 transition-colors hover:bg-ai-foreground/10 hover:text-ai-foreground disabled:opacity-40"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {isRefreshing ? (
        <div className="space-y-3 py-4" aria-busy="true">
          <div className="h-4 w-11/12 rounded bg-ai-foreground/10" />
          <div className="h-4 w-8/12 rounded bg-ai-foreground/10" />
          <div className="h-3 w-6/12 rounded bg-ai-foreground/10" />
        </div>
      ) : visible.length === 0 ? (
        <p className="py-3 text-[15px] leading-relaxed text-ai-foreground/80">
          Nothing to flag today. The briefing fills in as check-ins and messages come in.
        </p>
      ) : (
        <div className="divide-y divide-ai-foreground/15">
          {visible.map(insight => (
            <article key={insight.id} className="py-4 first:pt-3 last:pb-1">
              <p className="text-[15px] leading-relaxed">
                {calmCopy(insight.headline).replace(/([^.?])$/, '$1.')}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-ai-foreground/60">
                {insightEvidence(insight, ciMap, clients)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => navigate(insightHref(insight.actionPath, insight.clientId))} className={inkPrimaryBtn}>
                  {sentenceCase(insight.actionLabel || 'Review')}
                </button>
                <button onClick={() => handleDismiss(insight.id)} className={inkOutlineBtn}>Dismiss</button>
                <button
                  onClick={() => handleNotRelevant(insight.id, insight.type)}
                  className="ml-auto text-[13px] text-ai-foreground/50 underline-offset-4 hover:text-ai-foreground/80 hover:underline"
                >
                  Not useful
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {remaining.length > visible.length && (
        <button
          onClick={() => navigate('/ai-insights')}
          className="mt-4 self-start text-sm font-semibold text-ai-foreground underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          See all {remaining.length} notes
        </button>
      )}
    </section>
  );
}
