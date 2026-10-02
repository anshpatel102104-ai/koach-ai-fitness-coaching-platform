import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Step 2 cutover: Clients/CRM surface runs on Supabase via the base44-shaped
// facade — call sites unchanged. Other pages remain on base44Client for now.
import { supabase as base44 } from '@/api/supabaseClient';
import { Plus, Search, X, AlertTriangle, ArrowRight, Lock, SlidersHorizontal, AlignJustify, LayoutList, Upload, Trash2 } from 'lucide-react';
import ImportClientsModal from '../components/clients/import/ImportClientsModal';
import ErrorState from '@/components/shared/ErrorState';
import ImportCleanupModal from '../components/clients/import/ImportCleanupModal';
import IntelligenceBar from '@/components/intelligence/IntelligenceBar';
import { Link, useNavigate } from 'react-router-dom';
import { getAtRiskClients } from '@/lib/riskEngine';
import { compositeAdherenceScore } from '@/lib/adherence';
import { coachingPriorityScore } from '@/lib/insightEngine';
import { Input } from '@/components/ui/input';
import ClientForm from '../components/clients/ClientForm';
import ClientRow from '../components/clients/ClientRow';
import ClientDashboardModal from '../components/clients/dashboard/ClientDashboardModal';
import BulkActionBar from '../components/clients/BulkActionBar';
import LimitBanner from '@/components/subscription/LimitBanner';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getLimit } from '@/lib/subscription';
import { sendZapierEvent } from '@/lib/zapier';
import { sendEmail, isResendEnabled } from '@/lib/sendgrid';
import { templates } from '@/lib/emailTemplates';
import { getMyTeamId } from '@/lib/teamUtils';

const LIFECYCLE_ORDER = ['lead', 'active', 'at_risk', 'completed', 'alumni'];

export default function Clients() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_date');
  const [currentUser, setCurrentUser] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [goalFilter, setGoalFilter] = useState('');
  const [checkInFilter, setCheckInFilter] = useState('');
  const [quickPanelClient, setQuickPanelClient] = useState(null);
  const [leadPanelClient, setLeadPanelClient] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const queryClient = useQueryClient();

  // View mode: compact vs expanded. Persisted in localStorage.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [viewMode, setViewModeState] = useState(() => {
    if (isMobile) return 'compact';
    return localStorage.getItem('clients_view_mode') || 'expanded';
  });

  const setViewMode = (mode) => {
    if (!isMobile) localStorage.setItem('clients_view_mode', mode);
    setViewModeState(mode);
  };

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Once clients load, set smart default if no saved preference
  const { data: clients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  useEffect(() => {
    if (clients.length > 0 && !localStorage.getItem('clients_view_mode') && !isMobile) {
      setViewModeState(clients.length >= 10 ? 'compact' : 'expanded');
    }
  }, [clients.length]);

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins-clients'],
    queryFn: () => base44.entities.CheckIn.list('-date', 200),
  });

  // Pre-compute per-client check-in map
  const checkInMap = useMemo(() => {
    const map = {};
    allCheckIns.forEach(ci => {
      if (!map[ci.client_id]) map[ci.client_id] = [];
      map[ci.client_id].push(ci);
    });
    // sort each by date desc
    Object.keys(map).forEach(k => map[k].sort((a, b) => new Date(b.date) - new Date(a.date)));
    return map;
  }, [allCheckIns]);

  const createMutation = useMutation({
    mutationFn: async ({ data, sendInvite }) => {
      const res = await base44.functions.invoke('validateSubscription', { action: 'validate_create_client' });
      if (!res.data.allowed) { setUpgradeOpen(true); throw new Error(res.data.error); }
      const teamId = await getMyTeamId(currentUser?.id);
      const client = await base44.entities.Client.create({ ...data, ...(teamId ? { team_id: teamId } : {}) });
      if (sendInvite && data.email) {
        // clientId is required by the function (it stores the invite token hash
        // on THIS client row under the caller's RLS). Without it the invite 400s.
        await base44.functions.invoke('sendClientInvite', {
          clientId: client.id, clientName: data.name, clientEmail: data.email,
        });
      }
      return client;
    },
    onSuccess: async (result, { sendInvite }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(sendInvite ? 'Client added & invite sent!' : 'Client added');
      if (result?.id) {
        sendZapierEvent('client.created', {
          client_id: result.id,
          client_name: result.name,
          client_email: result.email,
          lifecycle_status: result.lifecycle_status,
        });
      }
      // Auto send welcome email if Resend connected
      if (result?.email && isResendEnabled()) {
        const settingsList = await base44.entities.CoachSettings.list();
        const rsSettings = settingsList[0];
        if (rsSettings?.resend_connected) {
          const tpl = templates.welcome(result, currentUser);
          sendEmail({ to: result.email, toName: result.name, ...tpl }).catch(() => {});
        }
      }
    },
    onError: (err) => { if (!err.message?.includes('limit')) toast.error(err.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: (result, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated');
      if (data?.lifecycle_status) {
        sendZapierEvent('client.status_changed', {
          client_id: result?.id,
          client_name: result?.name,
          lifecycle_status: data.lifecycle_status,
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Delete all related records in parallel before removing the client
      const deleteRelated = async (entityName, field) => {
        try {
          const records = await base44.entities[entityName].filter({ [field]: id });
          await Promise.all(records.map(r => base44.entities[entityName].delete(r.id)));
        } catch (e) {
          // Non-blocking: log and continue
          console.warn(`Failed to delete ${entityName} for client ${id}:`, e);
        }
      };

      await Promise.all([
        deleteRelated('Message', 'client_id'),
        deleteRelated('WeighIn', 'client_id'),
        deleteRelated('Goal', 'client_id'),
        deleteRelated('Habit', 'client_id'),
        deleteRelated('HabitCompletion', 'client_id'),
        deleteRelated('NutritionPlan', 'client_id'),
        deleteRelated('FoodLog', 'client_id'),
        deleteRelated('CheckIn', 'client_id'),
        deleteRelated('WorkoutSession', 'client_id'),
        deleteRelated('DailyLog', 'client_id'),
        deleteRelated('InBodyScan', 'client_id'),
        deleteRelated('OnboardingResponse', 'client_id'),
        deleteRelated('CommunityPost', 'author_id'),
      ]);

      await base44.entities.Client.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client and all associated data deleted');
    },
    onError: () => toast.error('Failed to delete client'),
  });

  const allTags = useMemo(() => {
    const set = new Set();
    clients.forEach(c => (c.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [clients]);

  const filteredClients = useMemo(() => {
    const now = Date.now();
    let result = clients.filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = !search || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || c.lifecycle_status === statusFilter;
      const matchesTag = !tagFilter || (c.tags || []).includes(tagFilter);
      const matchesGoal = !goalFilter || c.goal === goalFilter;
      let matchesCheckIn = true;
      if (checkInFilter) {
        const lastCi = checkInMap[c.id]?.[0];
        if (checkInFilter === 'this_week') matchesCheckIn = lastCi && (now - new Date(lastCi.date)) < 7 * 86400000;
        if (checkInFilter === 'overdue') matchesCheckIn = lastCi && (now - new Date(lastCi.date)) >= 7 * 86400000;
        if (checkInFilter === 'never') matchesCheckIn = !lastCi;
      }
      return matchesSearch && matchesStatus && matchesTag && matchesGoal && matchesCheckIn;
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'lifecycle') return LIFECYCLE_ORDER.indexOf(a.lifecycle_status || 'lead') - LIFECYCLE_ORDER.indexOf(b.lifecycle_status || 'lead');
      if (sortBy === 'adherence_high') {
        const sa = compositeAdherenceScore(checkInMap[a.id] || []) ?? -1;
        const sb = compositeAdherenceScore(checkInMap[b.id] || []) ?? -1;
        return sb - sa;
      }
      if (sortBy === 'adherence_low') {
        const sa = compositeAdherenceScore(checkInMap[a.id] || []) ?? 101;
        const sb = compositeAdherenceScore(checkInMap[b.id] || []) ?? 101;
        return sa - sb;
      }
      if (sortBy === 'last_checkin') {
        const da = checkInMap[a.id]?.[0] ? new Date(checkInMap[a.id][0].date) : new Date(0);
        const db = checkInMap[b.id]?.[0] ? new Date(checkInMap[b.id][0].date) : new Date(0);
        return db - da;
      }
      if (sortBy === 'priority') {
        const pa = coachingPriorityScore(a, checkInMap[a.id] || []);
        const pb = coachingPriorityScore(b, checkInMap[b.id] || []);
        return pb - pa;
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });
    return result;
  }, [clients, search, statusFilter, tagFilter, goalFilter, checkInFilter, sortBy, checkInMap]);

  const counts = useMemo(() => {
    const c = { all: clients.length };
    LIFECYCLE_ORDER.forEach(s => { c[s] = clients.filter(cl => (cl.lifecycle_status || 'lead') === s).length; });
    return c;
  }, [clients]);

  const handleSubmit = (data, sendInvite) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate({ data, sendInvite });
    }
    setEditingClient(null);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setQuickPanelClient(null);
    setLeadPanelClient(null);
    setShowForm(true);
  };

  const openQuickPanel = (client) => {
    setQuickPanelClient(client);
    setLeadPanelClient(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clientLimit = getLimit(currentUser, 'max_clients');
  const atLimit = clientLimit !== -1 && clients.length >= clientLimit;

  const atRiskClients = useMemo(() => getAtRiskClients(clients, allCheckIns), [clients, allCheckIns]);
  const highRiskCount = atRiskClients.filter(e => e.riskScore >= 60).length;

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (tagFilter ? 1 : 0) + (goalFilter ? 1 : 0) + (checkInFilter ? 1 : 0) + (sortBy !== 'created_date' ? 1 : 0);

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: 'var(--tc-sidebar)' }}>
        <div>
          <h1 className="text-base sm:text-lg font-heading font-bold text-white leading-tight">Clients</h1>
          <p className="text-xs" style={{ color: 'color-mix(in srgb, white 45%, transparent)' }}>{counts.active || 0} active · {counts.at_risk || 0} at-risk · {counts.lead || 0} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCleanup(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            style={{ background: 'color-mix(in srgb, var(--tc-destructive) 15%, transparent)', color: 'var(--tc-destructive)', border: '1px solid color-mix(in srgb, var(--tc-destructive) 25%, transparent)' }}
            title="Review & delete test import records"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Import Cleanup</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            style={{ background: 'color-mix(in srgb, white 10%, transparent)', color: 'var(--tc-sidebar-accent-foreground)', border: '1px solid color-mix(in srgb, white 15%, transparent)' }}
            title="Import clients from CSV"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          {/* HIDDEN: Add Client button — hidden per request, code preserved for easy restore */}
          {false && <button
            onClick={() => { if (atLimit) { setUpgradeOpen(true); return; } setEditingClient(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
            style={{ background: atLimit ? 'color-mix(in srgb, white 10%, transparent)' : 'var(--tc-card)', color: atLimit ? 'var(--tc-sidebar-accent-foreground)' : 'var(--tc-foreground)' }}
          >
            {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {atLimit ? 'Limit' : 'Add Client'}
          </button>}
        </div>
      </div>

      {/* ── Alerts ── */}
      <div className="px-5 pt-3 flex-shrink-0 space-y-2">
        <LimitBanner limitKey="max_clients" currentCount={clients.length} label="clients" featureKey="clients" />
        {atRiskClients.length > 0 && (
          <Link to="/at-risk">
            <div className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all hover:shadow-sm',
              highRiskCount > 0 ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-warning/10 border-warning text-warning'
            )}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{atRiskClients.length} clients need attention{highRiskCount > 0 && <span className="font-normal opacity-70 ml-1">· {highRiskCount} high risk</span>}</span>
              <ArrowRight className="w-4 h-4 opacity-60" />
            </div>
          </Link>
        )}
      </div>

      {/* ── Intelligence Bar ── */}
      <IntelligenceBar clients={clients} checkIns={allCheckIns} />

      {/* ── Filters ── */}
      <div className="px-5 pt-3 pb-3 flex-shrink-0 space-y-2">
        {/* Lifecycle tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide flex-nowrap">
          {[
            { key: 'all',       label: 'All',       active: 'bg-sidebar text-white border-foreground',        count: 'bg-[var(--kc-w-20)] text-white' },
            { key: 'lead',      label: 'Lead',      active: 'bg-primary text-primary-foreground border-primary',           count: 'bg-[var(--kc-w-20)] text-white' },
            { key: 'active',    label: 'Active',    active: 'bg-success text-white border-success',     count: 'bg-[var(--kc-w-20)] text-white' },
            { key: 'at_risk',   label: 'At Risk',   active: 'bg-orange-500 text-white border-orange-500',       count: 'bg-[var(--kc-w-20)] text-white' },
            { key: 'completed', label: 'Completed', active: 'bg-muted-foreground text-background border-border',           count: 'bg-[var(--kc-w-20)] text-white' },
            { key: 'alumni',    label: 'Alumni',    active: 'bg-ai text-ai-foreground border-ai',       count: 'bg-[var(--kc-w-20)] text-white' },
          ].map(({ key, label, active, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                statusFilter === key
                  ? active
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {label}
              <span className={cn('text-[10px] rounded-md px-1 tabular-nums', statusFilter === key ? count : 'bg-muted text-muted-foreground')}>
                {counts[key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search bar + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm bg-muted border-border"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              title="Compact view"
              onClick={() => setViewMode('compact')}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg border transition-all',
                viewMode === 'compact'
                  ? 'bg-sidebar text-white border-foreground'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              )}
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
            <button
              title="Expanded view"
              onClick={() => setViewMode('expanded')}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg border transition-all',
                viewMode === 'expanded'
                  ? 'bg-sidebar text-white border-foreground'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'h-8 w-8 flex items-center justify-center rounded-lg border text-xs transition-all flex-shrink-0',
              showFilters || activeFiltersCount > 0
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable filter chips */}
        {showFilters && (
          <div className="space-y-2">
            {/* Sort by */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sort by</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'created_date', label: 'Newest' },
                  { key: 'oldest', label: 'Oldest' },
                  { key: 'last_checkin', label: 'Last Check-in' },
                  { key: 'adherence_high', label: 'Adherence ↓' },
                  { key: 'adherence_low', label: 'Adherence ↑' },
                  { key: 'priority', label: '🧠 Priority Score' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all',
                      sortBy === key ? 'bg-sidebar text-white border-foreground' : 'bg-card text-muted-foreground border-border hover:border-foreground'
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Goal</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'weight_loss', label: 'Weight Loss' },
                  { key: 'muscle_gain', label: 'Muscle Gain' },
                  { key: 'strength', label: 'Strength' },
                  { key: 'general_fitness', label: 'General Fitness' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setGoalFilter(v => v === key ? '' : key)}
                    className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all',
                      goalFilter === key ? 'bg-success text-white border-success' : 'bg-card text-muted-foreground border-border hover:border-success'
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-in status */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Check-in Status</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: 'this_week', label: 'This week' },
                  { key: 'overdue', label: 'Overdue (7+ days)' },
                  { key: 'never', label: 'Never checked in' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setCheckInFilter(v => v === key ? '' : key)}
                    className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all',
                      checkInFilter === key ? 'bg-warning text-white border-warning' : 'bg-card text-muted-foreground border-border hover:border-warning'
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear link */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setSortBy('created_date'); setGoalFilter(''); setCheckInFilter(''); setTagFilter(''); setStatusFilter('all'); }}
                  className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Column headers ── */}
      <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-muted border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0">
        <div className="w-9 flex-shrink-0" />
        <div className="flex-1">Client</div>
        <div className="hidden sm:block w-24">Status</div>
        <div className="hidden md:block w-20 text-right">Adherence</div>
        <div className="hidden lg:block w-24 text-right">Last Check-in</div>
        <div className="w-20" />
      </div>

      {/* ── Client list ── */}
      <div className="flex-1 overflow-y-auto bg-card">
        {isError ? (
          <ErrorState
            title="Couldn't load your clients"
            message="There was a problem loading your roster. Try again in a moment."
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No clients found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredClients.map(client => {
            const cis = checkInMap[client.id] || [];
            const score = compositeAdherenceScore(cis);
            const priorityScore = sortBy === 'priority' ? coachingPriorityScore(client, cis) : null;
            return (
              <ClientRow
                key={client.id}
                client={client}
                score={score}
                priorityScore={priorityScore}
                lastCheckIn={cis[0]}
                checkInCount={cis.length}
                compact={isMobile || viewMode === 'compact'}
                selected={selectedIds.has(client.id)}
                onSelect={() => toggleSelect(client.id)}
                onView={() => openQuickPanel(client)}
                onEdit={() => openEdit(client)}
                onDelete={() => deleteMutation.mutate(client.id)}
                onStatusChange={(s) => updateMutation.mutate({ id: client.id, data: { ...client, lifecycle_status: s } })}
              />
            );
          })
        )}
      </div>

      <ClientForm open={showForm} onOpenChange={setShowForm} onSubmit={handleSubmit} client={editingClient} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureKey="clients" user={currentUser} />
      <ImportClientsModal
        open={showImport}
        onOpenChange={setShowImport}
        existingEmails={clients.map(c => c.email).filter(Boolean)}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
      />
      <ImportCleanupModal
        open={showCleanup}
        onOpenChange={setShowCleanup}
        clients={clients}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
      />

      {/* Client dashboard modal */}
      {quickPanelClient && (
        <ClientDashboardModal
          client={quickPanelClient}
          checkIns={checkInMap[quickPanelClient.id] || []}
          onClose={() => setQuickPanelClient(null)}
          onEdit={() => openEdit(quickPanelClient)}
        />
      )}



      {/* Bulk action bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        clients={clients}
        allCheckIns={allCheckIns}
        onClear={() => setSelectedIds(new Set())}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
      />
    </div>
  );
}