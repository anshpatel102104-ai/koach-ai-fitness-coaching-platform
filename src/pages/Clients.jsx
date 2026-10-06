import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Step 2 cutover: Clients/CRM surface runs on Supabase via the entity-shaped
// facade — call sites unchanged.
import { db } from '@/api/supabaseClient';
import { Search, X, Lock, SlidersHorizontal, MoreHorizontal } from 'lucide-react';
import ImportClientsModal from '../components/clients/import/ImportClientsModal';
import ErrorState from '@/components/shared/ErrorState';
import ImportCleanupModal from '../components/clients/import/ImportCleanupModal';
import IntelligenceBar from '@/components/intelligence/IntelligenceBar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAtRiskClients, evaluateClientRisk } from '@/lib/riskEngine';
import { compositeAdherenceScore } from '@/lib/adherence';
import { coachingPriorityScore } from '@/lib/insightEngine';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Page, PageHeader, Panel, Segmented, EmptyState, TextLink, ComplianceLegend } from '@/components/kit';
import ClientForm from '../components/clients/ClientForm';
import ClientRow, { ClientTableHeader } from '../components/clients/ClientRow';
import ClientDashboardModal from '../components/clients/dashboard/ClientDashboardModal';
import BulkActionBar from '../components/clients/BulkActionBar';
import { LIFECYCLE_CONFIG } from '../components/clients/LifecycleBadge';
import {
  GOAL_SHORT, programLine, statusLine, weeklyCompliance, weightChange, nextCheckIn, needsYou, checkInDue,
} from '../components/clients/clientSignals';
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
const DEFAULT_SORT = 'needs_you';

// Where each lifecycle stage sits when sorting by "who needs you most".
const NEEDS_GROUP = { at_risk: 0, active: 0, lead: 1, completed: 2, alumni: 2 };

const SORTS = [
  { key: 'needs_you', label: 'Who needs you most' },
  { key: 'created_date', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'name', label: 'Name' },
  { key: 'last_checkin', label: 'Last check-in' },
  { key: 'adherence_high', label: 'Compliance, high to low' },
  { key: 'adherence_low', label: 'Compliance, low to high' },
  { key: 'priority', label: 'Priority score' },
  { key: 'lifecycle', label: 'Stage' },
];

const SORT_SENTENCE = {
  needs_you: 'Sorted by who needs you most.',
  created_date: 'Newest first.',
  oldest: 'Oldest first.',
  name: 'Sorted by name.',
  last_checkin: 'Most recent check-in first.',
  adherence_high: 'Highest compliance first.',
  adherence_low: 'Lowest compliance first.',
  priority: 'Sorted by priority score.',
  lifecycle: 'Sorted by stage.',
};

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'touch-compact h-8 px-3 rounded-md text-[13px] font-medium border transition-colors',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground/80 border-border hover:bg-accent hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [currentUser, setCurrentUser] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [goalFilter, setGoalFilter] = useState('');
  const [checkInFilter, setCheckInFilter] = useState('');
  const [quickPanelClient, setQuickPanelClient] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const queryClient = useQueryClient();

  // Row density: compact vs comfortable. Persisted in localStorage.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [viewMode, setViewModeState] = useState(() => {
    if (isMobile) return 'compact';
    try { return localStorage.getItem('clients_view_mode') || 'expanded'; } catch { return 'expanded'; }
  });

  const setViewMode = (mode) => {
    if (!isMobile) { try { localStorage.setItem('clients_view_mode', mode); } catch { /* ignore */ } }
    setViewModeState(mode);
  };

  useEffect(() => {
    db.auth.me().then(setCurrentUser).catch(() => {}).finally(() => setMeLoaded(true));
  }, []);

  const { data: clients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('-created_date'),
  });

  const { data: allCheckIns = [] } = useQuery({
    queryKey: ['checkins-clients'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
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
      const res = await db.functions.invoke('validateSubscription', { action: 'validate_create_client' });
      if (!res.data.allowed) { setUpgradeOpen(true); throw new Error(res.data.error); }
      const teamId = await getMyTeamId(currentUser?.id);
      const client = await db.entities.Client.create({ ...data, ...(teamId ? { team_id: teamId } : {}) });
      if (sendInvite && data.email) {
        // clientId is required by the function (it stores the invite token hash
        // on THIS client row under the caller's RLS). Without it the invite 400s.
        await db.functions.invoke('sendClientInvite', {
          clientId: client.id, clientName: data.name, clientEmail: data.email,
        });
      }
      return client;
    },
    onSuccess: async (result, { sendInvite }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(sendInvite ? 'Client added and invite sent' : 'Client added');
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
        const settingsList = await db.entities.CoachSettings.list();
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
    mutationFn: ({ id, data }) => db.entities.Client.update(id, data),
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
          const records = await db.entities[entityName].filter({ [field]: id });
          await Promise.all(records.map(r => db.entities[entityName].delete(r.id)));
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

      await db.entities.Client.delete(id);
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

  // Everything the table shows per client, computed once.
  const rowData = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const cis = checkInMap[c.id] || [];
      const risk = evaluateClientRisk(c, cis);
      const last = cis[0];
      map[c.id] = {
        cis,
        last,
        risk,
        score: compositeAdherenceScore(cis),
        priority: coachingPriorityScore(c, cis),
        alert: needsYou(c, risk),
        due: checkInDue(c, last),
        status: statusLine(c, last, risk, cis.length),
        program: programLine(c),
        weeks: weeklyCompliance(c, cis),
        weight: weightChange(cis, c),
        next: nextCheckIn(c, last),
      };
    });
    return map;
  }, [clients, checkInMap]);

  const inSegment = (c, seg) => {
    const life = c.lifecycle_status || 'lead';
    const r = rowData[c.id];
    if (seg === 'needs_you') return !!r?.alert;
    if (seg === 'checkin_due') return !!r?.due;
    if (seg === 'new') return life === 'lead';
    if (seg === 'alumni') return life === 'alumni' || life === 'completed';
    return true;
  };

  const segmentCounts = useMemo(() => ({
    all: clients.length,
    needs_you: clients.filter(c => inSegment(c, 'needs_you')).length,
    checkin_due: clients.filter(c => inSegment(c, 'checkin_due')).length,
    new: clients.filter(c => inSegment(c, 'new')).length,
    alumni: clients.filter(c => inSegment(c, 'alumni')).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [clients, rowData]);

  const filteredClients = useMemo(() => {
    const now = Date.now();
    let result = clients.filter(c => {
      const q = search.toLowerCase();
      const goalText = (GOAL_SHORT[c.goal] || c.goal || '').toLowerCase();
      const matchesSearch = !search || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || goalText.includes(q);
      const matchesSegment = inSegment(c, segment);
      const matchesStatus = statusFilter === 'all' || (c.lifecycle_status || 'lead') === statusFilter;
      const matchesTag = !tagFilter || (c.tags || []).includes(tagFilter);
      const matchesGoal = !goalFilter || c.goal === goalFilter;
      let matchesCheckIn = true;
      if (checkInFilter) {
        const lastCi = checkInMap[c.id]?.[0];
        if (checkInFilter === 'this_week') matchesCheckIn = lastCi && (now - new Date(lastCi.date)) < 7 * 86400000;
        if (checkInFilter === 'overdue') matchesCheckIn = lastCi && (now - new Date(lastCi.date)) >= 7 * 86400000;
        if (checkInFilter === 'never') matchesCheckIn = !lastCi;
      }
      return matchesSearch && matchesSegment && matchesStatus && matchesTag && matchesGoal && matchesCheckIn;
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'needs_you') {
        const ga = NEEDS_GROUP[a.lifecycle_status || 'lead'] ?? 1;
        const gb = NEEDS_GROUP[b.lifecycle_status || 'lead'] ?? 1;
        if (ga !== gb) return ga - gb;
        const ra = rowData[a.id], rb = rowData[b.id];
        if (!!ra?.alert !== !!rb?.alert) return ra?.alert ? -1 : 1;
        const pa = (ra?.priority || 0) + (ra?.risk?.riskScore || 0) / 10;
        const pb = (rb?.priority || 0) + (rb?.risk?.riskScore || 0) / 10;
        return pb - pa;
      }
      if (sortBy === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'lifecycle') return LIFECYCLE_ORDER.indexOf(a.lifecycle_status || 'lead') - LIFECYCLE_ORDER.indexOf(b.lifecycle_status || 'lead');
      if (sortBy === 'adherence_high') {
        const sa = rowData[a.id]?.score ?? -1;
        const sb = rowData[b.id]?.score ?? -1;
        return sb - sa;
      }
      if (sortBy === 'adherence_low') {
        const sa = rowData[a.id]?.score ?? 101;
        const sb = rowData[b.id]?.score ?? 101;
        return sa - sb;
      }
      if (sortBy === 'last_checkin') {
        const da = checkInMap[a.id]?.[0] ? new Date(checkInMap[a.id][0].date) : new Date(0);
        const db = checkInMap[b.id]?.[0] ? new Date(checkInMap[b.id][0].date) : new Date(0);
        return db - da;
      }
      if (sortBy === 'priority') {
        return (rowData[b.id]?.priority || 0) - (rowData[a.id]?.priority || 0);
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, search, segment, statusFilter, tagFilter, goalFilter, checkInFilter, sortBy, checkInMap, rowData]);

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
    setShowForm(true);
  };

  const openQuickPanel = (client) => {
    setQuickPanelClient(client);
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

  const openNewClient = () => {
    if (atLimit) { setUpgradeOpen(true); return; }
    setEditingClient(null);
    setShowForm(true);
  };

  // `/clients?new=1` (topbar "Invite a client") opens the new-client form.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    if (isLoading || !meLoaded) return;
    openNewClient();
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading, meLoaded]);

  const atRiskClients = useMemo(() => getAtRiskClients(clients, allCheckIns), [clients, allCheckIns]);
  const highRiskCount = atRiskClients.filter(e => e.riskScore >= 60).length;

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (tagFilter ? 1 : 0) + (goalFilter ? 1 : 0) + (checkInFilter ? 1 : 0) + (sortBy !== DEFAULT_SORT ? 1 : 0);
  const clearFilters = () => { setSortBy(DEFAULT_SORT); setGoalFilter(''); setCheckInFilter(''); setTagFilter(''); setStatusFilter('all'); };

  const activeCount = (counts.active || 0) + (counts.at_risk || 0);
  const subtitle = isLoading
    ? 'Loading your roster.'
    : clients.length === 0
      ? 'No clients yet. Invite your first one or bring your roster over.'
      : `${activeCount} active, ${counts.lead || 0} lead${counts.lead === 1 ? '' : 's'} in onboarding. ${SORT_SENTENCE[sortBy] || ''}`;

  const segments = [
    { value: 'all', label: 'Everyone', count: segmentCounts.all },
    { value: 'needs_you', label: 'Needs you', count: segmentCounts.needs_you },
    { value: 'checkin_due', label: 'Check-in due', count: segmentCounts.checkin_due },
    { value: 'new', label: 'New', count: segmentCounts.new },
    { value: 'alumni', label: 'Alumni', count: segmentCounts.alumni },
  ];

  const compact = isMobile || viewMode === 'compact';

  return (
    <Page>
      <PageHeader
        title="Clients"
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowImport(true)}>Import from Trainerize</Button>
            <Button onClick={openNewClient}>
              {atLimit && <Lock className="w-4 h-4" />}
              {atLimit ? 'Client limit reached' : 'Invite client'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More roster actions">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowImport(true)}>Import from a CSV file</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCleanup(true)}>Clean up test imports</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/at-risk')}>Open the at-risk report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="space-y-3 empty:hidden mb-4">
        <LimitBanner limitKey="max_clients" currentCount={clients.length} label="clients" featureKey="clients" />
      </div>

      {/* ── Filters + search ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <Segmented options={segments} value={segment} onChange={setSegment} className="self-start" />
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-[320px] lg:flex-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Name, email or goal"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-9 h-11 bg-card"
              aria-label="Search clients"
            />
            {search && (
              <button onClick={() => setSearch('')} className="touch-compact absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 flex-shrink-0" aria-label="Sort and filter">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Sort and filter</span>
                {activeFiltersCount > 0 && <span className="tabular-nums text-muted-foreground">{activeFiltersCount}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <p className="text-[13px] text-muted-foreground mb-2">Sort by</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SORTS.map(s => <Chip key={s.key} active={sortBy === s.key} onClick={() => setSortBy(s.key)}>{s.label}</Chip>)}
                  </div>
                </div>
                <div>
                  <p className="text-[13px] text-muted-foreground mb-2">Stage</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Any <span className="tabular-nums opacity-70 ml-0.5">{counts.all}</span></Chip>
                    {LIFECYCLE_ORDER.map(s => (
                      <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                        {LIFECYCLE_CONFIG[s].label} <span className="tabular-nums opacity-70 ml-0.5">{counts[s] || 0}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[13px] text-muted-foreground mb-2">Goal</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'weight_loss', label: 'Fat loss' },
                      { key: 'muscle_gain', label: 'Muscle gain' },
                      { key: 'strength', label: 'Strength' },
                      { key: 'general_fitness', label: 'General fitness' },
                    ].map(({ key, label }) => (
                      <Chip key={key} active={goalFilter === key} onClick={() => setGoalFilter(v => v === key ? '' : key)}>{label}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[13px] text-muted-foreground mb-2">Last check-in</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'this_week', label: 'This week' },
                      { key: 'overdue', label: '7 or more days ago' },
                      { key: 'never', label: 'Never' },
                    ].map(({ key, label }) => (
                      <Chip key={key} active={checkInFilter === key} onClick={() => setCheckInFilter(v => v === key ? '' : key)}>{label}</Chip>
                    ))}
                  </div>
                </div>
                {allTags.length > 0 && (
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-2">Tag</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map(t => (
                        <Chip key={t} active={tagFilter === t} onClick={() => setTagFilter(v => v === t ? '' : t)}>#{t}</Chip>
                      ))}
                    </div>
                  </div>
                )}
                {!isMobile && (
                  <div>
                    <p className="text-[13px] text-muted-foreground mb-2">Row density</p>
                    <Segmented
                      size="sm"
                      value={viewMode === 'compact' ? 'compact' : 'expanded'}
                      onChange={setViewMode}
                      options={[{ value: 'expanded', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
                    />
                  </div>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <div className="flex justify-end border-t border-border px-4 py-3">
                  <TextLink onClick={clearFilters}>Clear sort and filters</TextLink>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {segment === 'needs_you' && atRiskClients.length > 0 && (
        <p className="text-sm text-muted-foreground mb-3">
          {atRiskClients.length} flagged by the risk check{highRiskCount > 0 ? `, ${highRiskCount} high risk` : ''}.{' '}
          <TextLink onClick={() => navigate('/at-risk')}>Open the at-risk report</TextLink>
        </p>
      )}

      {/* ── Client table ── */}
      <Panel className="overflow-hidden">
        {isError ? (
          <ErrorState
            title="Couldn't load your clients"
            message="There was a problem loading your roster. Try again in a moment."
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-3 px-6 py-4">
                <div className="h-9 w-9 rounded-full bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-secondary animate-pulse" />
                  <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            body="Invite someone by email, or import your roster from Trainerize or a CSV file."
            action={<Button onClick={openNewClient}>Invite client</Button>}
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            title="Nobody matches"
            body={search ? `No client matches "${search}" in this view.` : 'No clients in this view right now.'}
            action={<TextLink onClick={() => { setSearch(''); setSegment('all'); clearFilters(); }}>Show everyone</TextLink>}
          />
        ) : (
          <>
            <ClientTableHeader />
            {filteredClients.map(client => {
              const r = rowData[client.id] || {};
              return (
                <ClientRow
                  key={client.id}
                  client={client}
                  statusText={r.status}
                  programText={r.program}
                  weeks={r.weeks}
                  weight={r.weight}
                  next={r.next}
                  alert={r.alert}
                  priorityScore={sortBy === 'priority' || sortBy === 'needs_you' ? r.priority : null}
                  compact={compact}
                  selected={selectedIds.has(client.id)}
                  onSelect={() => toggleSelect(client.id)}
                  onView={() => openQuickPanel(client)}
                  onOpenProfile={() => navigate(`/client-profile?id=${client.id}`)}
                  onEdit={() => openEdit(client)}
                  onDelete={() => deleteMutation.mutate(client.id)}
                  onStatusChange={(s) => updateMutation.mutate({ id: client.id, data: { ...client, lifecycle_status: s } })}
                />
              );
            })}
          </>
        )}
      </Panel>

      {!isLoading && filteredClients.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <ComplianceLegend />
          <p className="text-[13px] text-muted-foreground">Click a row to open the client. Click an avatar to select.</p>
        </div>
      )}

      {/* ── Roster insights (program gaps, quiet clients, progression) ── */}
      {!isLoading && clients.length > 0 && (
        <div className="mt-8 -mx-5 [&_.text-xs.font-medium.text-muted-foreground]:text-[13px]">
          <IntelligenceBar clients={clients} checkIns={allCheckIns} />
        </div>
      )}

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
    </Page>
  );
}
