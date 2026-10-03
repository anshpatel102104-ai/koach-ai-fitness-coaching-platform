import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { X, Edit, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LifecycleBadge from '../LifecycleBadge';
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
import { motion } from 'framer-motion';
import { SignedImg } from '@/components/shared/SignedImage';

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
    label: 'Goals & Habits',
    subs: [
      { key: 'goals_habits_tab', label: 'Goals & Habits' },
    ],
  },
  {
    key: 'metrics',
    label: 'Metrics',
    subs: [
      { key: 'metrics_tab', label: 'All Metrics' },
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

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

// "Coming soon" placeholder — used for tabs without real content yet.
function ComingSoon({ label }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center mx-auto mb-3">
          <span className="text-lg">📋</span>
        </div>
        <p className="text-sm font-medium text-foreground capitalize">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
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
    const fresh = await base44.entities.Client.filter({ id: client.id });
    if (fresh?.[0]) setLocalClient(fresh[0]);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-modal', localClient?.id],
    queryFn: () => base44.entities.Message.filter({ client_id: localClient.id }),
    enabled: !!localClient?.id,
    select: d => [...d].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
  });

  const { data: program } = useQuery({
    queryKey: ['program-modal', localClient?.assigned_program_id],
    queryFn: () => base44.entities.WorkoutProgram.filter({ id: localClient.assigned_program_id }),
    enabled: !!localClient?.assigned_program_id,
    select: d => d[0],
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-modal', localClient?.assigned_nutrition_id],
    queryFn: () => base44.entities.NutritionPlan.filter({ id: localClient.assigned_nutrition_id }),
    enabled: !!localClient?.assigned_nutrition_id,
    select: d => d[0],
  });

  const { data: workoutSessions = [] } = useQuery({
    queryKey: ['workout-sessions-modal', localClient?.id],
    queryFn: () => base44.entities.WorkoutSession.filter({ client_id: localClient.id }),
    enabled: !!localClient?.id,
  });

  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['badges-modal', localClient?.id],
    queryFn: () => base44.entities.ClientBadge.filter({ client_id: localClient.id }),
    enabled: !!localClient?.id,
    select: d => [...d].sort((a, b) => new Date(b.earned_date) - new Date(a.earned_date)),
  });

  if (!localClient) return null;

  const initials = getInitials(localClient.name);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full h-[95dvh] sm:h-[90vh] sm:max-w-[90vw] sm:rounded-xl rounded-t-2xl bg-card border border-border flex flex-col overflow-hidden"
        style={{ maxWidth: 1100 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Navy header ── */}
        <div className="flex-shrink-0" style={{ background: 'var(--tc-sidebar)' }}>

          {/* Client info row */}
          <div className="flex items-center gap-4 px-6 pt-5 pb-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
              style={{ background: 'var(--kc-1e2d45)', border: '1.5px solid color-mix(in srgb, white 12%, transparent)', color: 'var(--tc-primary)' }}>
              {localClient.avatar_url
                ? <SignedImg src={localClient.avatar_url} alt={localClient.name} className="w-full h-full object-cover" />
                : <span>{initials}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-white leading-tight">{localClient.name}</h2>
                <LifecycleBadge status={localClient.lifecycle_status || 'lead'} />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tc-muted-foreground)' }}>{localClient.email}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={onEdit} title="Edit client"
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--tc-muted-foreground)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, white 8%, transparent)'; e.currentTarget.style.color = 'var(--tc-sidebar-accent-foreground)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tc-muted-foreground)'; }}>
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => navigate(`/client-profile?id=${client.id}`)} title="Full Profile"
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--tc-muted-foreground)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, white 8%, transparent)'; e.currentTarget.style.color = 'var(--tc-sidebar-accent-foreground)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tc-muted-foreground)'; }}>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors ml-1"
                style={{ color: 'var(--tc-muted-foreground)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, white 8%, transparent)'; e.currentTarget.style.color = 'var(--tc-sidebar-accent-foreground)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tc-muted-foreground)'; }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── PRIMARY nav: 5 main groups ── */}
          <div className="flex overflow-x-auto px-4 scrollbar-hide" style={{ borderTop: '1px solid color-mix(in srgb, white 6%, transparent)' }}>
            {NAV_GROUPS.map(g => {
              // Hide Overview's Pipeline sub-tab group entirely for non-leads? No —
              // always show Overview. But hide entire group if all its subs are leadOnly and not a lead.
              const allLeadOnly = g.subs.every(s => s.leadOnly);
              if (allLeadOnly && !isLead) return null;
              const isActive = activeGroup === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => handleGroupClick(g.key)}
                  className="relative px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                  style={{ color: isActive ? 'var(--tc-primary-foreground)' : 'var(--tc-muted-foreground)' }}
                >
                  {g.label}
                  {isActive && (
                    <motion.div
                      layoutId="group-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                      style={{ background: 'var(--tc-primary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── SECONDARY nav: sub-tabs for the active group ── */}
          {visibleSubs.length > 1 && (
            <div className="flex overflow-x-auto px-4 scrollbar-hide" style={{ background: 'color-mix(in srgb, white 4%, transparent)', borderTop: '1px solid color-mix(in srgb, white 4%, transparent)' }}>
              {visibleSubs.map(s => {
                const isActive = activeTab === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => handleSubTabClick(s.key)}
                    className="relative px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-colors flex-shrink-0"
                    style={{ color: isActive ? 'var(--tc-primary)' : 'var(--tc-muted-foreground)' }}
                  >
                    {s.label}
                    {isActive && (
                      <motion.div
                        layoutId="sub-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-t-full"
                        style={{ background: 'var(--tc-primary)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Tab content — all original renderers untouched ── */}
        <div className="flex-1 overflow-hidden bg-background">

          {activeTab === 'pipeline' && (
            <div className="h-full overflow-y-auto p-6 max-w-lg">
              <LeadPipelinePanel client={localClient} onUpdate={handleClientUpdated} />
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