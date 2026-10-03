import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ClipboardList, Search, X, Plus, Bell, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkInScore } from '@/lib/adherence';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

import CheckInStatsRow from '@/components/checkin/CheckInStatsRow';
import CheckInReviewRow from '@/components/checkin/CheckInReviewRow';
import CheckInEnhancedDrawer from '@/components/checkin/CheckInEnhancedDrawer';
import FormBuilderTab from '@/components/checkin/FormBuilderTab';

/* ── helpers ── */
function isPending(ci) {
  return !ci.coach_responded && ci.review_status !== 'reviewed';
}
function isFlagged(ci) {
  if (ci.review_status === 'flagged') return true;
  const s = checkInScore(ci);
  if (s !== null && s < 55) return true;
  if (ci.compliance_training != null && ci.compliance_training < 60) return true;
  if (ci.compliance_nutrition != null && ci.compliance_nutrition < 60) return true;
  if (ci.sleep_hours != null && ci.sleep_hours < 6) return true;
  if (ci.mood === 'stressed' || ci.mood === 'tired') return true;
  return false;
}
function isOverdue(ci) { return differenceInDays(new Date(), parseISO(ci.date)) > 14; }

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'missed', label: 'Missed' },
];

const MAIN_TABS = [
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'form_builder', label: 'Form Builder' },
];

export default function CheckInReview() {
  const [mainTab, setMainTab] = useState('pending_review');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [drawerCheckIn, setDrawerCheckIn] = useState(null);
  const [drawerIndex, setDrawerIndex] = useState(0);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Real-time subscription
  useEffect(() => {
    const unsub = db.entities.CheckIn.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
    });
    return unsub;
  }, [queryClient]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['checkins-review'],
    queryFn: () => db.entities.CheckIn.list('-date', 400),
  });

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c])),
    [clients]
  );

  const latestPerClient = useMemo(() => {
    const seen = new Map();
    for (const ci of checkIns) {
      if (!seen.has(ci.client_id)) seen.set(ci.client_id, ci);
    }
    return Array.from(seen.values());
  }, [checkIns]);

  const cisByClient = useMemo(() => {
    const map = {};
    for (const ci of checkIns) {
      (map[ci.client_id] = map[ci.client_id] || []).push(ci);
    }
    return map;
  }, [checkIns]);

  const missedClients = useMemo(() => {
    const active = clients.filter(c => c.status === 'active' || c.lifecycle_status === 'active');
    return active.filter(client => {
      const cis = checkIns.filter(ci => ci.client_id === client.id);
      if (!cis.length) return true;
      const latest = cis.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return differenceInDays(new Date(), parseISO(latest.date)) >= 7;
    }).map(client => {
      const cis = checkIns.filter(ci => ci.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastCI = cis[0];
      const daysAgo = lastCI ? differenceInDays(new Date(), parseISO(lastCI.date)) : null;
      return { client, lastCI, daysAgo };
    }).sort((a, b) => (b.daysAgo ?? 999) - (a.daysAgo ?? 999));
  }, [clients, checkIns]);

  const counts = useMemo(() => ({
    pending: latestPerClient.filter(isPending).length,
    flagged: latestPerClient.filter(isFlagged).length,
    reviewed: latestPerClient.filter(ci => ci.coach_responded || ci.review_status === 'reviewed').length,
    missed: missedClients.length,
  }), [latestPerClient, missedClients]);

  const visible = useMemo(() => {
    let list = latestPerClient;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ci => (clientMap[ci.client_id]?.name || ci.client_name || '').toLowerCase().includes(q));
    }
    if (filter === 'pending') list = list.filter(isPending);
    if (filter === 'flagged') list = list.filter(isFlagged);
    if (filter === 'reviewed') list = list.filter(ci => ci.coach_responded || ci.review_status === 'reviewed');
    if (filter === 'missed') return [];
    return [...list].sort((a, b) => {
      const aFlag = isFlagged(a) ? 1 : 0;
      const bFlag = isFlagged(b) ? 1 : 0;
      if (bFlag !== aFlag) return bFlag - aFlag;
      return new Date(b.date) - new Date(a.date);
    });
  }, [latestPerClient, filter, search, clientMap]);

  const openDrawer = (ci, idx) => {
    setDrawerCheckIn(ci);
    setDrawerIndex(idx);
  };

  const navigateDrawer = (newIdx) => {
    if (newIdx >= 0 && newIdx < visible.length) {
      setDrawerCheckIn(visible[newIdx]);
      setDrawerIndex(newIdx);
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl px-5 py-4"
        style={{ background: 'var(--tc-sidebar)' }}>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Check-ins</h1>
          <p className="text-xs sm:text-sm mt-0.5 text-white/50">
            {format(new Date(), 'EEE, MMM d')} · {latestPerClient.length} total · {counts.pending} pending review
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors"
            style={{ background: 'color-mix(in srgb, white 10%, transparent)', color: 'var(--tc-sidebar-accent-foreground)', borderColor: 'color-mix(in srgb, white 20%, transparent)' }}
            onClick={() => navigate(`/messages?message=${encodeURIComponent("Hey! Just a reminder to submit your weekly check-in 📋")}`)}
          >
            <Bell className="w-3.5 h-3.5" /> Send Bulk Reminder
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-primary-foreground transition-colors"
            style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}
            onClick={() => setMainTab('form_builder')}
          >
            <Plus className="w-3.5 h-3.5" /> New Check-in Form
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <CheckInStatsRow checkIns={checkIns} clients={clients} latestPerClient={latestPerClient} />

      {/* ── Main Tabs ── */}
      <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {MAIN_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              mainTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.key === 'pending_review' && counts.pending > 0 && (
              <span className={cn(
                'ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                mainTab === tab.key ? 'bg-orange-100 text-orange-600' : 'bg-border text-muted-foreground'
              )}>{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Pending Review Tab ── */}
      {mainTab === 'pending_review' && (
        <div>
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={cn(
                    'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    filter === f.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-muted-foreground'
                  )}>
                  {f.label}
                  {f.key !== 'all' && counts[f.key] > 0 && (
                    <span className={cn('ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      filter === f.key ? 'bg-[var(--kc-w-20)] text-white' : 'bg-muted')}>
                      {counts[f.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
            </div>
          </div>

          {/* Check-in list */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filter === 'missed' ? (
            /* Missed clients list */
            missedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <ClipboardList className="w-12 h-12 opacity-30" />
                <p className="text-sm font-medium">All active clients checked in this week 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">{missedClients.length} client{missedClients.length !== 1 ? 's' : ''} haven't submitted this week</p>
                {missedClients.map(({ client, lastCI, daysAgo }) => (
                  <div key={client.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center text-warning font-bold text-sm flex-shrink-0">
                      {client.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {daysAgo !== null ? `Last check-in ${daysAgo}d ago` : 'No check-ins yet'}
                      </p>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      daysAgo === null || daysAgo > 21 ? 'bg-destructive/10 text-destructive border-destructive' : 'bg-warning/10 text-warning border-warning')}>
                      {daysAgo !== null ? `${daysAgo}d` : 'Never'}
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/messages?clientId=${client.id}&message=${encodeURIComponent("Hey! Just a reminder to submit your weekly check-in 📋")}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-[36px]">
                        <Send className="w-3 h-3" /> <span className="hidden sm:inline">Remind</span>
                      </button>
                      <button
                        onClick={() => navigate(`/messages?clientId=${client.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border text-foreground hover:bg-border transition-colors min-h-[36px]">
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <ClipboardList className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">
                {filter === 'pending' ? 'All caught up! No pending check-ins 🎉' :
                 filter === 'flagged' ? 'No flagged check-ins' :
                 filter === 'reviewed' ? 'No reviewed check-ins yet' :
                 search ? 'No clients found' : 'No check-ins submitted yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((ci, i) => (
                <CheckInReviewRow
                  key={ci.id}
                  checkIn={ci}
                  client={clientMap[ci.client_id]}
                  onReview={() => openDrawer(ci, i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Form Builder Tab ── */}
      {mainTab === 'form_builder' && (
        <FormBuilderTab clients={clients} />
      )}

      {/* ── Enhanced Review Drawer ── */}
      {drawerCheckIn && (
        <CheckInEnhancedDrawer
          checkIn={drawerCheckIn}
          client={clientMap[drawerCheckIn.client_id]}
          allCheckIns={cisByClient[drawerCheckIn.client_id] || []}
          currentIndex={drawerIndex}
          total={visible.length}
          onNavigate={navigateDrawer}
          open={!!drawerCheckIn}
          onOpenChange={(v) => { if (!v) setDrawerCheckIn(null); }}
        />
      )}
    </div>
  );
}