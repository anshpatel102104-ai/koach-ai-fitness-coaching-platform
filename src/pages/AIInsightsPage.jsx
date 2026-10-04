import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, History, Settings } from 'lucide-react';
import { generateInsights, dismissInsight, markNotRelevant, getNotRelevantTypes } from '@/lib/insightEngine';
import InsightCard from '@/components/intelligence/InsightCard';
import InsightHistory from '@/components/intelligence/InsightHistory';
import InsightPreferences from '@/components/intelligence/InsightPreferences';

const TABS = ['All', 'Performance', 'Risk', 'Opportunity', 'Celebration'];
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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-5 h-5 text-ai" />
            <h1 className="text-lg font-bold text-foreground">AI Client Insights</h1>
          </div>
          <p className="text-xs text-muted-foreground">Automatically analyzed from your client data — updated daily</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === 'history' ? 'insights' : 'history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${view === 'history' ? 'bg-sidebar text-white border-border' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
            <History className="w-3.5 h-3.5" />
            History
          </button>
          <button onClick={() => setView(v => v === 'preferences' ? 'insights' : 'preferences')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${view === 'preferences' ? 'bg-sidebar text-white border-border' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
            <Settings className="w-3.5 h-3.5" />
            Preferences
          </button>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-muted-foreground hover:bg-muted transition-all disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {view === 'history' && <InsightHistory clients={clients} />}
      {view === 'preferences' && <InsightPreferences onClose={() => setView('insights')} />}

      {view === 'insights' && (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeTab === tab
                    ? 'bg-sidebar text-white border-border'
                    : 'bg-card text-muted-foreground border-border hover:border-border'
                }`}>
                {tab}
                {counts[tab] > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-[var(--kc-w-20)] text-white' : 'bg-muted text-muted-foreground'}`}>
                    {counts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Cards */}
          {isRefreshing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl px-6 py-16 text-center"
              style={{ background: 'linear-gradient(135deg, var(--tc-success), var(--tc-success))', border: '1px solid var(--tc-success)' }}>
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-base font-bold text-foreground">No new insights right now</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                Your clients are all on track! Check back after more check-ins come in, or click Refresh.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {visible.map((insight, i) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    index={i}
                    onDismiss={handleDismiss}
                    onNotRelevant={handleNotRelevant}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}