import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO } from 'date-fns';
import { Search, X, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkInScore } from '@/lib/adherence';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TextLink, EmptyState, Panel } from '@/components/kit';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import CheckInStatsRow from '@/components/checkin/CheckInStatsRow';
import CheckInReviewRow from '@/components/checkin/CheckInReviewRow';
import CheckInEnhancedDrawer from '@/components/checkin/CheckInEnhancedDrawer';
import CheckInAnalyticsSidebar from '@/components/checkin/CheckInAnalyticsSidebar';
import FormBuilderTab from '@/components/checkin/FormBuilderTab';
import { previousCheckIn } from '@/components/checkin/reviewParts';

const REMINDER_TEXT = 'Hey, quick reminder to send in your weekly check-in when you get a minute.';

/* ── helpers ── */
function isPending(ci) {
  return !ci.coach_responded && ci.review_status !== 'reviewed';
}
function isReviewed(ci) {
  return ci.coach_responded || ci.review_status === 'reviewed';
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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'missed', label: 'Overdue' },
];

export default function CheckInReview() {
  // 'review' | 'overview' | 'forms'  (was: pending_review | form_builder tabs)
  const [mainTab, setMainTab] = useState('review');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // list | detail
  const [queueDone, setQueueDone] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const paramClientId = useMemo(() => new URLSearchParams(window.location.search).get('clientId'), []);

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
    reviewed: latestPerClient.filter(isReviewed).length,
    missed: missedClients.length,
  }), [latestPerClient, missedClients]);

  // Progress line: this week's check-ins (falls back to everything if none this week)
  const progress = useMemo(() => {
    const recent = latestPerClient.filter(ci => differenceInDays(new Date(), parseISO(ci.date)) <= 7);
    const pool = recent.length ? recent : latestPerClient;
    return { done: pool.filter(isReviewed).length, total: pool.length, thisWeek: recent.length > 0 };
  }, [latestPerClient]);

  const visible = useMemo(() => {
    let list = latestPerClient;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ci => (clientMap[ci.client_id]?.name || ci.client_name || '').toLowerCase().includes(q));
    }
    if (filter === 'pending') list = list.filter(isPending);
    if (filter === 'flagged') list = list.filter(isFlagged);
    if (filter === 'reviewed') list = list.filter(isReviewed);
    if (filter === 'missed') return [];
    return [...list].sort((a, b) => {
      // Waiting first, then flagged, then newest.
      const aw = isPending(a) ? 1 : 0;
      const bw = isPending(b) ? 1 : 0;
      if (bw !== aw) return bw - aw;
      const aFlag = isFlagged(a) ? 1 : 0;
      const bFlag = isFlagged(b) ? 1 : 0;
      if (bFlag !== aFlag) return bFlag - aFlag;
      return new Date(b.date) - new Date(a.date);
    });
  }, [latestPerClient, filter, search, clientMap]);

  // Default selection: ?clientId= deep link, else the first item in the queue.
  useEffect(() => {
    if (queueDone) return;
    if (selectedId && latestPerClient.some(ci => ci.id === selectedId)) return;
    if (paramClientId) {
      const target = latestPerClient.find(ci => ci.client_id === paramClientId);
      if (target) { setSelectedId(target.id); setMobileView('detail'); return; }
    }
    if (visible[0]) setSelectedId(visible[0].id);
  }, [visible, latestPerClient, selectedId, paramClientId, queueDone]);

  const selected = latestPerClient.find(ci => ci.id === selectedId) || null;
  const selectedIndex = Math.max(0, visible.findIndex(ci => ci.id === selectedId));

  const openDrawer = (ci) => {
    setSelectedId(ci.id);
    setQueueDone(false);
    setMainTab('review');
    setMobileView('detail');
  };

  const navigateDrawer = (newIdx) => {
    if (newIdx >= 0 && newIdx < visible.length) {
      setSelectedId(visible[newIdx].id);
    }
  };

  // After send or skip: move to the next check-in that still needs a reply.
  const openNext = () => {
    const idx = visible.findIndex(ci => ci.id === selectedId);
    const after = [...visible.slice(idx + 1), ...visible.slice(0, Math.max(idx, 0))];
    const next = after.find(isPending) || visible[idx + 1];
    if (next) setSelectedId(next.id);
    else { setSelectedId(null); setQueueDone(true); setMobileView('list'); }
  };

  const sendBulkReminder = () => navigate(`/messages?message=${encodeURIComponent(REMINDER_TEXT)}`);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  /* ── Queue column ── */
  const queue = (
    <aside className={cn(
      'bg-card flex-col lg:w-[320px] xl:w-[340px] lg:flex-shrink-0 lg:border-r lg:border-border lg:h-full min-h-[calc(100dvh-56px-64px)] lg:min-h-0',
      mobileView === 'detail' && mainTab === 'review' ? 'hidden lg:flex' : 'flex'
    )}>
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-[32px] lg:text-[36px] leading-none text-foreground">Check-ins</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 -mr-2" aria-label="Check-in options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={() => { setMainTab('review'); setMobileView('list'); }}>Review queue</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setMainTab('overview'); setMobileView('detail'); }}>Overview and trends</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setMainTab('forms'); setMobileView('detail'); }}>Check-in forms</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sendBulkReminder}>Send everyone a reminder</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-[15px] text-muted-foreground mt-2">
          {progress.total === 0 ? 'Nothing in yet' : `${progress.done} of ${progress.total} reviewed${progress.thisWeek ? '' : ' so far'}`}
        </p>
        <div className="mt-2.5 h-[3px] rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto scrollbar-hide border-b border-border" role="tablist">
          {FILTERS.map(f => {
            const n = f.key === 'all' || f.key === 'reviewed' ? null : counts[f.key];
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'touch-compact -mb-px whitespace-nowrap border-b-2 pb-2 text-[13px] font-medium transition-colors',
                  active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                {n ? <span className={cn('ml-1 tabular-nums', f.key === 'missed' && 'text-destructive')}>{n}</span> : null}
              </button>
            );
          })}
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients"
            className="h-10 w-full rounded-lg bg-secondary pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-border">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : filter === 'missed' ? (
          missedClients.length === 0 ? (
            <EmptyState title="Everyone checked in this week." body="No active client is more than 7 days late." />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border">
                <p className="text-sm text-destructive">{missedClients.length} haven't checked in this week</p>
                <TextLink onClick={sendBulkReminder}>Remind all</TextLink>
              </div>
              {missedClients.map(({ client, daysAgo }) => (
                <div key={client.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-foreground truncate">{client.name}</p>
                    <p className={cn('text-[13px]', daysAgo === null || daysAgo > 21 ? 'text-destructive' : 'text-muted-foreground')}>
                      {daysAgo !== null ? `Last check-in ${daysAgo} days ago` : 'No check-ins yet'}
                    </p>
                  </div>
                  <TextLink
                    onClick={() => navigate(`/messages?clientId=${client.id}&message=${encodeURIComponent(REMINDER_TEXT)}`)}
                  >
                    Remind
                  </TextLink>
                  <TextLink onClick={() => navigate(`/messages?clientId=${client.id}`)} className="text-muted-foreground">
                    Message
                  </TextLink>
                </div>
              ))}
            </>
          )
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              filter === 'pending' ? 'All caught up.' :
              filter === 'flagged' ? 'Nothing flagged.' :
              filter === 'reviewed' ? 'Nothing reviewed yet.' :
              search ? 'No clients match that search.' : 'No check-ins yet.'
            }
            body={
              filter === 'pending' ? 'Every check-in has a reply.' :
              !search && filter === 'all' ? 'They show up here as soon as a client submits one.' : undefined
            }
          />
        ) : (
          visible.map((ci) => (
            <CheckInReviewRow
              key={ci.id}
              checkIn={ci}
              client={clientMap[ci.client_id]}
              prev={previousCheckIn(ci, cisByClient[ci.client_id] || [])}
              selected={mainTab === 'review' && ci.id === selectedId}
              onReview={() => openDrawer(ci)}
            />
          ))
        )}
      </div>
    </aside>
  );

  /* ── Secondary views (overview, forms) ── */
  const secondaryHeader = (title, subtitle) => (
    <div className="mb-6">
      <button
        onClick={() => { setMainTab('review'); setMobileView('list'); }}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to the queue
      </button>
      <h1 className="text-[32px] sm:text-[38px] leading-none text-foreground">{title}</h1>
      {subtitle && <p className="text-[15px] text-muted-foreground mt-1.5">{subtitle}</p>}
    </div>
  );

  return (
    <div className="lg:flex lg:h-[calc(100dvh-76px)] lg:overflow-hidden">
      {queue}

      <section className={cn(
        'flex-1 min-w-0 lg:h-full lg:overflow-y-auto',
        mobileView === 'list' && mainTab === 'review' ? 'hidden lg:block' : 'block'
      )}>
        {mainTab === 'review' && (
          selected ? (
            <CheckInEnhancedDrawer
              checkIn={selected}
              client={clientMap[selected.client_id]}
              allCheckIns={cisByClient[selected.client_id] || []}
              currentIndex={selectedIndex}
              total={visible.length}
              onNavigate={navigateDrawer}
              onDone={openNext}
              overdueCount={counts.missed}
              open
              onOpenChange={(v) => { if (!v) setMobileView('list'); }}
            />
          ) : (
            <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Panel>
                <EmptyState
                  title={progress.total && progress.done === progress.total ? `That's everyone. ${progress.done} of ${progress.total} reviewed.` : 'Pick a check-in from the queue.'}
                  body={counts.missed ? `${counts.missed} client${counts.missed !== 1 ? 's are' : ' is'} overdue. A quick nudge usually does it.` : undefined}
                  action={counts.missed ? <Button variant="outline" onClick={() => setFilter('missed')}>See who's overdue</Button> : undefined}
                />
              </Panel>
            </div>
          )
        )}

        {mainTab === 'overview' && (
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-4">
            {secondaryHeader('Overview', 'How check-ins are going across your roster.')}
            <CheckInStatsRow checkIns={checkIns} clients={clients} latestPerClient={latestPerClient} />
            <CheckInAnalyticsSidebar checkIns={checkIns} clients={clients} latestPerClient={latestPerClient} clientMap={clientMap} />
          </div>
        )}

        {mainTab === 'forms' && (
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {secondaryHeader('Check-in forms', 'The questions clients answer each week.')}
            <FormBuilderTab clients={clients} />
          </div>
        )}
      </section>
    </div>
  );
}
