import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Step 2 cutover: Clients/CRM surface runs on Supabase via the entity-shaped
// facade — call sites unchanged.
import { db } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compositeAdherenceScore } from '@/lib/adherence';
import LifecycleBadge from '@/components/clients/LifecycleBadge';
import ClientForm from '@/components/clients/ClientForm';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO, subDays } from 'date-fns';
import { Initials, TextLink, KeyValue, CountBadge, EmptyState } from '@/components/kit';
import { useSignedUrl } from '@/components/shared/SignedImage';
import { GOAL_SHORT, programWeek } from '@/components/clients/clientSignals';

import ProfileOverviewTab from '@/components/client-profile/ProfileOverviewTab';
import ProfileProgramsTab from '@/components/client-profile/ProfileProgramsTab';
import ProfileNutritionTab from '@/components/client-profile/ProfileNutritionTab';
import ProfileCheckInsTab from '@/components/client-profile/ProfileCheckInsTab';
import ProfileProgressTab from '@/components/client-profile/ProfileProgressTab';
import ProfileMessagesTab from '@/components/client-profile/ProfileMessagesTab';
import ProfileConnectedAppsTab from '@/components/client-profile/ProfileConnectedAppsTab';
import PaymentsTab from '@/components/clients/dashboard/PaymentsTab';

const TABS = [
  { key: 'overview',       label: 'Overview' },
  { key: 'programs',       label: 'Program' },
  { key: 'nutrition',      label: 'Nutrition' },
  { key: 'checkins',       label: 'Check-ins' },
  { key: 'progress',       label: 'Progress' },
  { key: 'photos',         label: 'Photos' },
  { key: 'messages',       label: 'Messages' },
  { key: 'billing',        label: 'Billing' },
  { key: 'connected_apps', label: 'Apps' },
];

function StatPair({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className={cn('num text-[22px] leading-tight mt-0.5 truncate', tone === 'danger' ? 'text-destructive' : 'text-foreground')}>{value ?? '—'}</p>
    </div>
  );
}

const fmtInt = (n) => (n === null || n === undefined || Number.isNaN(n) ? null : Math.round(n).toLocaleString('en-US'));

export default function ClientProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  const [showEdit, setShowEdit] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => db.entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins', clientId],
    queryFn: () => db.entities.CheckIn.filter({ client_id: clientId }, '-date', 50),
    enabled: !!clientId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', clientId],
    queryFn: () => db.entities.Message.filter({ client_id: clientId }, '-created_date', 50),
    enabled: !!clientId,
  });

  // Read-only context for the identity column and the overview.
  const { data: program } = useQuery({
    queryKey: ['profile-program', client?.assigned_program_id],
    queryFn: () => db.entities.WorkoutProgram.filter({ id: client.assigned_program_id }).then(r => r[0] || null),
    enabled: !!client?.assigned_program_id,
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['profile-nutrition-plan', client?.assigned_nutrition_id],
    queryFn: () => db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id }).then(r => r[0] || null),
    enabled: !!client?.assigned_nutrition_id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['profile-sessions', clientId],
    queryFn: () => db.entities.WorkoutSession.filter({ client_id: clientId }, '-scheduled_date', 120),
    enabled: !!clientId,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['profile-daily-logs', clientId],
    queryFn: () => db.entities.DailyLog.filter({ client_id: clientId }, '-date', 14),
    enabled: !!clientId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.Client.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated');
    },
  });

  const score = useMemo(() => compositeAdherenceScore(checkIns), [checkIns]);
  const lastCI = checkIns[0];
  const avatar = useSignedUrl(client?.avatar_url);

  const daysSinceCI = lastCI ? differenceInDays(new Date(), new Date(lastCI.date)) : null;
  const isOverdue = daysSinceCI !== null && daysSinceCI > 7;

  const pendingCheckins = checkIns.filter(ci => ci.review_status === 'pending' || !ci.review_status).length;
  const flaggedCheckins = checkIns.filter(ci => ci.review_status === 'flagged').length;
  const unreadMessages = messages.filter(m => !m.is_read && m.sender === 'client').length;

  // Workouts done vs. due over the last 4 weeks.
  const workouts = useMemo(() => {
    const cutoff = subDays(new Date(), 28);
    const today = new Date();
    const due = sessions.filter(s => {
      const d = s.scheduled_date ? parseISO(s.scheduled_date) : (s.completed_at ? new Date(s.completed_at) : null);
      return d && d >= cutoff && d <= today;
    });
    const done = due.filter(s => s.status === 'completed').length;
    return due.length ? { done, total: due.length } : null;
  }, [sessions]);

  const avgSleep = useMemo(() => {
    const vals = checkIns.slice(0, 3).map(ci => ci.sleep_hours).filter(v => v != null);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }, [checkIns]);

  const avgSteps = useMemo(() => {
    const vals = dailyLogs.slice(0, 7).map(l => l.steps).filter(v => v != null && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [dailyLogs]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
    </div>
  );

  if (!client) return (
    <div className="px-4 py-10 sm:px-8">
      <EmptyState
        title="Client not found"
        body="They may have been removed, or the link is missing an id."
        action={<Button variant="outline" onClick={() => navigate('/clients')}><ArrowLeft className="w-4 h-4" /> All clients</Button>}
      />
    </div>
  );

  const goal = GOAL_SHORT[client.goal] || 'General fitness';
  const week = programWeek(client);
  const totalWeeks = program?.duration_weeks;
  const checkInDay = lastCI ? format(new Date(lastCI.date), 'EEEE') : null;
  const life = client.lifecycle_status || 'lead';
  const summaryLine = life === 'lead'
    ? `${goal}. Lead, not started yet.`
    : [
        week ? `${goal}, week ${week}${totalWeeks ? ` of ${totalWeeks}` : ''}.` : `${goal}.`,
        checkInDay ? `Checks in on ${checkInDay}s.` : 'No check-ins yet.',
      ].join(' ');

  const tabBadge = (key) => {
    if (key === 'checkins') return pendingCheckins + flaggedCheckins;
    if (key === 'messages') return unreadMessages;
    return 0;
  };

  return (
    <div className="lg:flex lg:items-start min-h-[calc(100vh-56px)] lg:min-h-[calc(100vh-76px)]">

      {/* ── Identity column ── */}
      <aside className="bg-card border-b border-border lg:border-b-0 lg:border-r lg:w-[300px] xl:w-[320px] lg:flex-shrink-0 lg:sticky lg:top-[76px] lg:h-[calc(100vh-76px)] lg:overflow-y-auto">
        <div className="px-4 py-6 sm:px-6 lg:py-8">
          <button
            onClick={() => navigate('/clients')}
            className="touch-compact inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All clients
          </button>

          <div className="mt-5 flex items-center gap-4 lg:block">
            <Initials name={client.name || ''} src={avatar || undefined} tone="ink" size={68} className="text-2xl" />
            <div className="min-w-0 lg:mt-4">
              <h1 className="text-[32px] lg:text-[36px] leading-[1.05] text-foreground break-words">{client.name}</h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <LifecycleBadge status={life} />
                {isOverdue && <span className="text-[13px] font-medium text-destructive">No check-in for {daysSinceCI} days</span>}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[15px] text-muted-foreground leading-snug">{summaryLine}</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setActiveTab('messages')}>Message</Button>
            <Button onClick={() => setActiveTab('programs')}>Adjust plan</Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
            <StatPair label="Compliance" value={score !== null ? `${score}%` : null} tone={score !== null && score < 50 ? 'danger' : undefined} />
            <StatPair label="Workouts" value={workouts ? `${workouts.done} of ${workouts.total}` : null} />
            <StatPair label="Calories" value={fmtInt(nutritionPlan?.calories)} />
            <StatPair label="Protein" value={nutritionPlan?.protein_g ? `${Math.round(nutritionPlan.protein_g)} g` : null} />
            <StatPair label="Steps" value={fmtInt(avgSteps)} />
            <StatPair label="Sleep" value={avgSleep !== null ? `${avgSleep} h` : null} />
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-sm font-semibold text-foreground">Coach notes</p>
            {client.notes
              ? <p className="mt-2 text-[15px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
              : <p className="mt-2 text-sm text-muted-foreground">Nothing yet. Add how they like feedback, schedule quirks, food rules.</p>}
            <TextLink className="mt-3 inline-block" onClick={() => setShowEdit(true)}>{client.notes ? 'Edit notes and details' : 'Add notes'}</TextLink>
          </div>

          <div className="mt-6 pt-2 border-t border-border">
            {client.email && <KeyValue label="Email" value={<a className="hover:underline break-all" href={`mailto:${client.email}`}>{client.email}</a>} />}
            {client.phone && <KeyValue label="Phone" value={<a className="hover:underline" href={`tel:${client.phone}`}>{client.phone}</a>} />}
            {client.start_date && <KeyValue label="Client since" value={format(new Date(client.start_date), 'MMM yyyy')} />}
            {client.tags?.length > 0 && <KeyValue label="Tags" value={client.tags.map(t => `#${t}`).join(' ')} />}
          </div>
        </div>
      </aside>

      {/* ── Tabs + content on canvas ── */}
      <div className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="border-b border-border overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-6 min-w-max" role="tablist">
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              const badge = tabBadge(tab.key);
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'touch-compact relative inline-flex items-center gap-1.5 pb-3 pt-1 text-[15px] whitespace-nowrap transition-colors border-b-2 -mb-px',
                    active ? 'border-foreground text-foreground font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground font-medium'
                  )}
                >
                  {tab.label}
                  {badge > 0 && <CountBadge count={badge} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-5">
          {activeTab === 'overview' && (
            <ProfileOverviewTab
              client={client}
              checkIns={checkIns}
              score={score}
              program={program}
              sessions={sessions}
              pendingCount={pendingCheckins}
              onOpenTab={setActiveTab}
            />
          )}
          {activeTab === 'programs'       && <ProfileProgramsTab client={client} />}
          {activeTab === 'nutrition'      && <ProfileNutritionTab client={client} />}
          {activeTab === 'checkins'       && <ProfileCheckInsTab client={client} checkIns={checkIns} />}
          {activeTab === 'progress'       && <ProfileProgressTab client={client} checkIns={checkIns} />}
          {activeTab === 'photos'         && <ProfileProgressTab client={client} checkIns={checkIns} initialSection="photos" />}
          {activeTab === 'messages'       && <ProfileMessagesTab client={client} messages={messages} />}
          {activeTab === 'billing'        && <div className="panel overflow-hidden"><PaymentsTab client={client} /></div>}
          {activeTab === 'connected_apps' && <ProfileConnectedAppsTab client={client} />}
        </div>
      </div>

      <ClientForm
        open={showEdit}
        onOpenChange={setShowEdit}
        onSubmit={(data) => { updateMutation.mutate(data); setShowEdit(false); }}
        client={client}
      />
    </div>
  );
}
