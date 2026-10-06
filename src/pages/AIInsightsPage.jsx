import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { subWeeks, parseISO } from 'date-fns';
import { generateInsights, dismissInsight, markNotRelevant, getNotRelevantTypes } from '@/lib/insightEngine';
import { Page, PageHeader, Panel, Segmented, EmptyState, InkPanel, KeyValue } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import InsightCard from '@/components/intelligence/InsightCard';
import InsightHistory from '@/components/intelligence/InsightHistory';
import InsightPreferences from '@/components/intelligence/InsightPreferences';
import { insightEvidence } from '@/components/dashboard/AIInsightsFeed';
import { groupCheckIns, isActiveClient } from '@/components/dashboard/todayModel';

const TABS = ['All', 'Risk', 'Performance', 'Opportunity', 'Celebration'];
const TAB_LABELS = { All: 'All', Risk: 'Risk', Performance: 'Progress', Opportunity: 'Opportunity', Celebration: 'Celebrate' };
const TYPE_MAP = { performance: 'Performance', risk: 'Risk', opportunity: 'Opportunity', celebration: 'Celebration' };

export default function AIInsightsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dismissed, setDismissed] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState('insights'); // insights | history | preferences

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('-created_date'),
  });
  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
  });
  const { data: messages = [] } = useQuery({
    queryKey: ['messages-insights'],
    queryFn: () => db.entities.Message.list('-created_date', 200),
  });

  const notRelevant = getNotRelevantTypes();

  const allInsights = useMemo(
    () => generateInsights(clients, checkIns, messages).filter(i => !notRelevant.includes(i.type)),
    [clients, checkIns, messages, refreshKey] // eslint-disable-line
  );
  const ciMap = useMemo(() => groupCheckIns(checkIns), [checkIns]);

  const visible = useMemo(() => {
    let ins = allInsights.filter(i => !dismissed.has(i.id));
    if (activeTab !== 'All') ins = ins.filter(i => TYPE_MAP[i.type] === activeTab);
    return ins;
  }, [allInsights, dismissed, activeTab]);

  const counts = useMemo(() => {
    const c = { All: allInsights.filter(i => !dismissed.has(i.id)).length };
    TABS.slice(1).forEach(t => {
      c[t] = allInsights.filter(i => !dismissed.has(i.id) && TYPE_MAP[i.type] === t).length;
    });
    return c;
  }, [allInsights, dismissed]);

  // What the engine read — real counts, shown in the ink "What the AI sees" panel.
  const sources = useMemo(() => {
    const cutoff = subWeeks(new Date(), 4);
    return {
      clients: clients.filter(isActiveClient).length,
      checkIns: checkIns.filter(ci => ci.date && parseISO(ci.date) >= cutoff).length,
      messages: messages.length,
      hidden: notRelevant.length,
    };
  }, [clients, checkIns, messages, notRelevant.length]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setDismissed(new Set());
    setTimeout(() => { setRefreshKey(k => k + 1); setIsRefreshing(false); }, 800);
  }, []);

  const handleDismiss = useCallback((id) => {
    dismissInsight(id);
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  const handleNotRelevant = useCallback((id, type) => {
    markNotRelevant(id, type);
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  const toggleView = (v) => setView(cur => (cur === v ? 'insights' : v));

  return (
    <Page className="pb-24 lg:pb-12">
      <PageHeader
        title="AI insights"
        subtitle="What the AI noticed in your clients' check-ins and messages. Nothing goes to a client until you send it."
        actions={
          <>
            <Button variant={view === 'history' ? 'default' : 'outline'} onClick={() => toggleView('history')}>History</Button>
            <Button variant={view === 'preferences' ? 'default' : 'outline'} onClick={() => toggleView('preferences')}>Preferences</Button>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} title="Re-run the analysis" aria-label="Re-run the analysis">
              <RefreshCw className={cn(isRefreshing && 'animate-spin')} />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {view === 'history' && <InsightHistory clients={clients} />}
          {view === 'preferences' && <InsightPreferences onClose={() => setView('insights')} />}

          {view === 'insights' && (
            <>
              <Segmented
                className="mb-4"
                value={activeTab}
                onChange={setActiveTab}
                options={TABS.map(t => ({ value: t, label: TAB_LABELS[t], count: counts[t] }))}
              />

              <Panel>
                {isRefreshing ? (
                  <div className="space-y-4 p-6" aria-busy="true">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 w-32 rounded bg-secondary" />
                        <div className="h-4 w-3/4 rounded bg-secondary" />
                        <div className="h-3 w-1/2 rounded bg-secondary" />
                      </div>
                    ))}
                  </div>
                ) : visible.length === 0 ? (
                  <EmptyState
                    title={activeTab === 'All' ? 'Nothing new to flag.' : `No ${TAB_LABELS[activeTab].toLowerCase()} notes right now.`}
                    body="New notes appear as check-ins and messages come in."
                    action={<Button variant="outline" size="sm" onClick={handleRefresh}>Run it again</Button>}
                  />
                ) : (
                  <AnimatePresence initial={false}>
                    {visible.map(insight => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        evidence={insightEvidence(insight, ciMap, clients)}
                        onDismiss={handleDismiss}
                        onNotRelevant={handleNotRelevant}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </Panel>
            </>
          )}
        </div>

        <aside className="space-y-5">
          <InkPanel title="What the AI sees">
            <p className="mb-3">These notes are worked out from your own records, refreshed each time you open this page.</p>
            <div className="[&>div]:border-ai-foreground/15 [&_span:first-child]:text-ai-foreground/70 [&_span:last-child]:text-ai-foreground">
              <KeyValue label="Active clients" value={sources.clients} />
              <KeyValue label="Check-ins, last 4 weeks" value={sources.checkIns} />
              <KeyValue label="Recent messages" value={sources.messages} />
              <KeyValue label="Kinds you've hidden" value={sources.hidden} />
            </div>
          </InkPanel>
        </aside>
      </div>
    </Page>
  );
}
