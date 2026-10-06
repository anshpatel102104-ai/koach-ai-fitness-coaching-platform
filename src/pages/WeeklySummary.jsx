import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO, format, startOfWeek, endOfWeek } from 'date-fns';
import { Search, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Page, PageHeader, Panel, Stat, Segmented, EmptyState, ComplianceLegend } from '@/components/kit';
import ClientSummaryCard from '@/components/weekly-summary/ClientSummaryCard';

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'attention', label: 'Needs you' },
  { key: 'on_track',  label: 'On plan' },
  { key: 'missed',    label: 'No check-in' },
];

export default function WeeklySummary() {
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: clients = [], isLoading: loadingClients, refetch } = useQuery({
    queryKey: ['ws-clients'],
    queryFn:  () => db.entities.Client.filter({ lifecycle_status: 'active' }, 'name'),
  });

  const { data: allCheckIns = [], isLoading: loadingCI } = useQuery({
    queryKey: ['ws-checkins'],
    queryFn:  () => db.entities.CheckIn.list('-date', 500),
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['ws-sessions'],
    queryFn:  () => db.entities.WorkoutSession.list('-created_date', 300),
  });

  const loading = loadingClients || loadingCI;

  // Group check-ins and sessions by client
  const ciByClient      = useMemo(() => {
    const map = {};
    allCheckIns.forEach(ci => { (map[ci.client_id] = map[ci.client_id] || []).push(ci); });
    return map;
  }, [allCheckIns]);

  // Helper: is client flagged?
  const isAttention = (client) => {
    const cis = ciByClient[client.id] || [];
    const latest = cis.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysSinceCI = latest ? differenceInDays(new Date(), parseISO(latest.date)) : 999;
    if (daysSinceCI >= 7) return true;
    if (latest?.compliance_training != null && latest.compliance_training < 60) return true;
    if (latest?.compliance_nutrition != null && latest.compliance_nutrition < 60) return true;
    if (latest?.mood === 'stressed' || latest?.mood === 'tired') return true;
    return false;
  };

  const isMissed = (client) => {
    const cis = ciByClient[client.id] || [];
    if (!cis.length) return true;
    const latest = cis.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return differenceInDays(new Date(), parseISO(latest.date)) >= 7;
  };

  // Summary stats
  const stats = useMemo(() => {
    const attention = clients.filter(isAttention).length;
    const missed    = clients.filter(isMissed).length;
    const onTrack   = clients.length - attention;

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekWorkouts = allSessions.filter(s => new Date(s.completed_at || s.created_date) >= weekAgo).length;

    return { attention, missed, onTrack, weekWorkouts };
  }, [clients, allCheckIns, allSessions]);

  // Filtered + searched list
  const visible = useMemo(() => {
    let list = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q));
    }
    if (filter === 'attention') list = list.filter(isAttention);
    if (filter === 'on_track')  list = list.filter(c => !isAttention(c));
    if (filter === 'missed')    list = list.filter(isMissed);

    // Sort: attention clients first
    return list.sort((a, b) => (isAttention(b) ? 1 : 0) - (isAttention(a) ? 1 : 0));
  }, [clients, filter, search, ciByClient]);

  const filterCount = { all: clients.length, attention: stats.attention, on_track: stats.onTrack, missed: stats.missed };
  const subtitle = clients.length === 0
    ? 'No active clients this week.'
    : stats.attention === 0
      ? `All ${clients.length} active clients are on plan this week.`
      : `${stats.attention} of ${clients.length} clients need you this week${stats.missed ? `, ${stats.missed} haven't checked in` : ''}. They're at the top.`;

  return (
    <Page className="pb-24 lg:pb-12">
      <PageHeader
        eyebrow={`Week of ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d, yyyy')}`}
        title="Weekly summary"
        subtitle={subtitle}
        actions={<Button variant="outline" onClick={() => refetch()}><RefreshCw /> Refresh</Button>}
      />

      {/* Stats */}
      <Panel className="mb-5 grid grid-cols-2 lg:grid-cols-4">
        <Stat className="border-b border-r border-border px-5 py-4 sm:px-6 lg:border-b-0" label="Active clients" value={clients.length} />
        <Stat className="border-b border-border px-5 py-4 sm:px-6 lg:border-b-0 lg:border-r" label="On plan" value={stats.onTrack} />
        <Stat className="border-r border-border px-5 py-4 sm:px-6" label="Need you" value={stats.attention} tone={stats.attention ? 'warning' : undefined} />
        <Stat className="px-5 py-4 sm:px-6" label="Workouts logged" value={stats.weekWorkouts} sub="Last 7 days" />
      </Panel>

      {/* Filters + search */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={FILTERS.map(f => ({ value: f.key, label: f.label, count: filterCount[f.key] }))}
        />
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clients" value={search} onChange={e => setSearch(e.target.value)} className="h-10 bg-card pl-9" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Client rows */}
      <Panel>
        <div className="hidden grid-cols-[minmax(0,2.2fr)_auto_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-border px-6 py-2.5 text-[13px] text-muted-foreground lg:grid">
          <span>Client</span>
          <span className="w-[227px]">Last 8 weeks</span>
          <span>Weight</span>
          <span>Workouts</span>
          <span>Check-in</span>
          <span>Training / nutrition</span>
          <span className="w-[108px]" />
        </div>
        {loading ? (
          <div className="space-y-3 p-6" aria-busy="true">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-secondary" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={search || filter !== 'all' ? 'No clients match this filter.' : 'No active clients yet.'}
            action={search || filter !== 'all' ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</Button> : undefined}
          />
        ) : (
          <div>
            {visible.map(client => (
              <ClientSummaryCard
                key={client.id}
                client={client}
                checkIns={ciByClient[client.id] || []}
                sessions={allSessions}
              />
            ))}
          </div>
        )}
        <div className="border-t border-border px-5 py-3 sm:px-6">
          <ComplianceLegend />
        </div>
      </Panel>
    </Page>
  );
}
