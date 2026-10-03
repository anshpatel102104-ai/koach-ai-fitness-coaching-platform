import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO, format, startOfWeek, endOfWeek } from 'date-fns';
import {
  Users, AlertTriangle, CheckCircle2,
  Dumbbell, Search, X, RefreshCw, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import ClientSummaryCard from '@/components/weekly-summary/ClientSummaryCard';

const FILTERS = [
  { key: 'all',       label: 'All Clients' },
  { key: 'attention', label: 'Needs Attention' },
  { key: 'on_track',  label: 'On Track' },
  { key: 'missed',    label: 'Missed Check-in' },
];

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border p-4 bg-card shadow-sm', color)}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-current/10 flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none mb-0.5">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

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

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6 rounded-2xl px-5 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ background: 'var(--tc-sidebar)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Weekly Summary</h1>
          </div>
          <p className="text-xs text-white/50">
            Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')} · {clients.length} active clients
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-white/20 text-white/70 hover:text-white hover:bg-[var(--kc-w-10)] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatPill icon={Users}        label="Active Clients"      value={clients.length}       color="text-primary border-accent" />
        <StatPill icon={CheckCircle2} label="On Track"            value={stats.onTrack}        color="text-success border-success" />
        <StatPill icon={AlertTriangle}label="Needs Attention"     value={stats.attention}      color="text-warning border-warning" />
        <StatPill icon={Dumbbell}     label="Workouts This Week"  value={stats.weekWorkouts}   color="text-ai border-ai" />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={cn(
                'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:border-border'
              )}>
              {f.label}
              {f.key === 'attention' && stats.attention > 0 && (
                <span className={cn('ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  filter === f.key ? 'bg-[var(--kc-w-20)] text-white' : 'bg-warning/10 text-warning')}>
                  {stats.attention}
                </span>
              )}
              {f.key === 'missed' && stats.missed > 0 && (
                <span className={cn('ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  filter === f.key ? 'bg-[var(--kc-w-20)] text-white' : 'bg-destructive/10 text-destructive')}>
                  {stats.missed}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Client cards grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Users className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No clients match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
    </div>
  );
}