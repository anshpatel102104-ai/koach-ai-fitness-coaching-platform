import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { X, Edit, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LIFECYCLE_CONFIG } from '../LifecycleBadge';
import LeadPipelinePanel from '../LeadPipelinePanel';
import SummaryTab from './SummaryTab';
import NotesTab from './NotesTab';
import ProgramsTab from './ProgramsTab';
import SessionsTab from './SessionsTab';
import PaymentsTab from './PaymentsTab';
import GoalsTab from './goals/GoalsTab';
import GoalsHabitsTab from './GoalsHabitsTab';
import MetricsTab from './MetricsTab';
import ClientNutritionTab from './ClientNutritionTab';
import ClientCalendarTab from './ClientCalendarTab';
import { useSignedUrl } from '@/components/shared/SignedImage';
import { Initials, Segmented } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Two-level navigation structure ──────────────────────────────────────────
// Each section has a list of sub-tabs. 'key' matches the original tab keys so
// all existing content rendering is unchanged.
const NAV_GROUPS = [
  {
    key: 'overview',
    label: 'Overview',
    subs: [
      { key: 'summary',      label: 'Summary' },
      { key: 'pipeline',     label: 'Pipeline', leadOnly: true },
    ],
  },
  {
    key: 'calendar',
    label: 'Calendar',
    subs: [
      { key: 'calendar_tab', label: 'Calendar' },
    ],
  },
  {
    key: 'training',
    label: 'Training',
    subs: [
      { key: 'programs',   label: 'Programs' },
      { key: 'sessions',   label: 'Sessions' },
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement',
    subs: [
      { key: 'notes',         label: 'Notes' },
      { key: 'goals',         label: 'Goals' },
      { key: 'consultation',  label: 'Consultation' },
      { key: 'forms',         label: 'Forms' },
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    subs: [
      { key: 'nutrition_overview', label: 'Overview' },
    ],
  },
  {
    key: 'business',
    label: 'Business',
    subs: [
      { key: 'payments',  label: 'Payments' },
      { key: 'invoices',  label: 'Invoices' },
      { key: 'sales',     label: 'Sales' },
    ],
  },
  {
    key: 'goals_habits',
    label: 'Goals and habits',
    subs: [
      { key: 'goals_habits_tab', label: 'Goals and habits' },
    ],
  },
  {
    key: 'metrics',
    label: 'Metrics',
    subs: [
      { key: 'metrics_tab', label: 'All metrics' },
    ],
  },
  {
    key: 'files',
    label: 'Files',
    subs: [
      { key: 'attachments', label: 'Attachments' },
    ],
  },
];

// Given an active sub-tab key, find which group it belongs to.
function findGroupForTab(tabKey) {
  for (const g of NAV_GROUPS) {
    if (g.subs.some(s => s.key === tabKey)) return g.key;
  }
  return 'overview';
}

// Placeholder for sections that have no content yet.
function ComingSoon({ label }) {
  const name = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <div className="p-5 sm:p-6">
      <div className="panel px-5 py-8 sm:px-6">
        <p className="text-[15px] font-semibold text-foreground">{name} isn&apos;t built yet</p>
        <p className="text-sm text-muted-foreground mt-1">This section is on the roadmap. Nothing to do here for now.</p>
      </div>
    </div>
  );
}

export default function ClientDashboardModal({ client, checkIns = [], onClose, onEdit }) {
  const isLead = (client?.lifecycle_status || 'lead') === 'lead';

  // Default sub-tab: leads land on pipeline, others on summary.
  const defaultTab = isLead ? 'pipeline' : 'summary';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [activeGroup, setActiveGroup] = useState(findGroupForTab(defaultTab));

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local client copy so metric saves reflect immediately.
  const [localClient, setLocalClient] = useState(client);
  useEffect(() => { setLocalClient(client); }, [client?.id]);

  const handleClientUpdated = async () => {
    const fresh = await db.entities.Client.filter({ id: client.id });
    if (fresh?.[0]) setLocalClient(fresh[0]);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-modal', localClient?.id],
    queryFn: () => db.entities.Message.filter({ client_id: localClient.id }),
    enabled: !!localClient?.id,
    select: d => [...d].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
  });

  const { data: program } = useQuery({
    queryKey: ['program-modal', localClient?.assigned_program_id],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: localClient.assigned_program_id }),
    enabled: !!localClient?.assigned_program_id,
    select: d => d[0],
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-modal', localClient?.assigned_nutrition_id],
    queryFn: () => db.entities.NutritionPlan.filter({ id: localClient.assigned_nutrition_id }),
    enabled: !!localClient?.assigned_nutrition_id,
    select: d => d[0],
  });

  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['workout-sessions-modal', localClient?.id],
    queryFn: () => db.entities.WorkoutSession.filter({ client_id: localClient.id }),
    enabled: !!localClient?.id,
  });

  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['badges-modal', localClient?.id],
    queryFn: () => db.entities.ClientBadge.filter({ client_id: localClient.id }),
    enabled: !!localClient?.id,
    select: d => [...d].sort((a, b) => new Date(b.earned_date) - new Date(a.earned_date)),
  });

  const avatarSrc = useSignedUrl(localClient?.avatar_url);

  if (!localClient) return null;

  // When clicking a main group, switch to that group and jump to its first
  // visible sub-tab (respecting leadOnly filter).
  const handleGroupClick = (groupKey) => {
    const group = NAV_GROUPS.find(g => g.key === groupKey);
    if (!group) return;
    setActiveGroup(groupKey);
    const visibleSubs = group.subs.filter(s => !s.leadOnly || isLead);
    if (visibleSubs.length > 0) setActiveTab(visibleSubs[0].key);
  };

  // When clicking a sub-tab directly.
  const handleSubTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setActiveGroup(findGroupForTab(tabKey));
  };

  // Sub-tabs for the currently active group (filtered by lead status).
  const currentGroup = NAV_GROUPS.find(g => g.key === activeGroup);
  const visibleSubs = (currentGroup?.subs || []).filter(s => !s.leadOnly || isLead);

  const lifeLabel = LIFECYCLE_CONFIG[localClient.lifecycle_status || 'lead']?.label;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${localClient.name} dashboard`}
        className="relative w-full h-[95dvh] sm:h-[90vh] sm:max-w-[90vw] sm:rounded-xl rounded-t-xl bg-background flex flex-col overflow-hidden ring-1 ring-border"
        style={{ maxWidth: 1100 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-card border-b border-border">
          <div className="flex items-center gap-4 px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
            <Initials name={localClient.name || ''} src={avatarSrc || undefined} tone="ink" size={44} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[24px] sm:text-[26px] leading-tight text-foreground truncate">{localClient.name}</h2>
              <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                {[lifeLabel, localClient.email].filter(Boolean).join(' \u00b7 ')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate(`/client-profile?id=${client.id}`)}>
                Full profile
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} title="Edit client" aria-label="Edit client">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden" onClick={() => navigate(`/client-profile?id=${client.id}`)} title="Full profile" aria-label="Open full profile">
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Close">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── Primary nav: sections ── */}
          <div className="flex gap-5 overflow-x-auto px-4 sm:px-6 scrollbar-hide" role="tablist">
            {NAV_GROUPS.map(g => {
              // Hide a group entirely if all its subs are lead-only and this isn't a lead.
              const allLeadOnly = g.subs.every(s => s.leadOnly);
              if (allLeadOnly && !isLead) return null;
              const isActive = activeGroup === g.key;
              return (
                <button
                  key={g.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleGroupClick(g.key)}
                  className={cn(
                    'touch-compact relative pb-3 pt-1 text-sm whitespace-nowrap transition-colors flex-shrink-0 border-b-2 -mb-px',
                    isActive ? 'border-foreground text-foreground font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium'
                  )}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Secondary nav: sub-tabs for the active section ── */}
        {visibleSubs.length > 1 && (
          <div className="flex-shrink-0 px-4 sm:px-6 pt-4">
            <Segmented
              size="sm"
              value={activeTab}
              onChange={handleSubTabClick}
              options={visibleSubs.map(s => ({ value: s.key, label: s.label }))}
            />
          </div>
        )}

        {/* ── Tab content — all original renderers untouched ── */}
        <div className="flex-1 overflow-hidden">

          {activeTab === 'pipeline' && (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <div className="panel p-5 sm:p-6 max-w-xl">
                <h3 className="text-[22px] text-foreground mb-1">Lead pipeline</h3>
                <p className="text-sm text-muted-foreground mb-5">Where this lead stands and when to follow up.</p>
                <LeadPipelinePanel client={localClient} onUpdate={handleClientUpdated} />
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <SummaryTab
              client={localClient}
              checkIns={checkIns}
              messages={messages}
              program={program}
              nutritionPlan={nutritionPlan}
              workoutSessions={workoutSessions}
              earnedBadges={earnedBadges}
              onClientUpdated={handleClientUpdated}
            />
          )}

          {activeTab === 'programs'  && <ProgramsTab  client={localClient} />}
          {activeTab === 'sessions'  && <SessionsTab  client={localClient} />}
          {activeTab === 'nutrition_overview' && <ClientNutritionTab client={localClient} nutritionPlan={nutritionPlan} checkIns={checkIns} />}
          {activeTab === 'notes'     && <NotesTab      client={localClient} />}
          {activeTab === 'goals'         && <GoalsTab         client={localClient} />}
          {activeTab === 'goals_habits_tab' && <GoalsHabitsTab client={localClient} />}
          {activeTab === 'metrics_tab'  && <MetricsTab client={localClient} onClientUpdated={handleClientUpdated} />}
          {activeTab === 'payments'  && <PaymentsTab   client={localClient} />}
          {activeTab === 'calendar_tab' && <ClientCalendarTab client={localClient} />}

          {(activeTab === 'consultation' || activeTab === 'forms' || activeTab === 'invoices' ||
            activeTab === 'sales' || activeTab === 'attachments') && (
            <ComingSoon label={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}