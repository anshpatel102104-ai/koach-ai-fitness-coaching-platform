import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Step 2 cutover: Clients/CRM surface runs on Supabase via the entity-shaped
// facade — call sites unchanged.
import { db } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, MessageSquare, Dumbbell, ClipboardCheck,
  Scale, Activity, Calendar, Mail, Phone, AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compositeAdherenceScore } from '@/lib/adherence';
import LifecycleBadge from '@/components/clients/LifecycleBadge';
import ClientForm from '@/components/clients/ClientForm';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

import ProfileOverviewTab from '@/components/client-profile/ProfileOverviewTab';
import ProfileProgramsTab from '@/components/client-profile/ProfileProgramsTab';
import ProfileNutritionTab from '@/components/client-profile/ProfileNutritionTab';
import ProfileCheckInsTab from '@/components/client-profile/ProfileCheckInsTab';
import ProfileProgressTab from '@/components/client-profile/ProfileProgressTab';
import ProfileMessagesTab from '@/components/client-profile/ProfileMessagesTab';
import ProfileConnectedAppsTab from '@/components/client-profile/ProfileConnectedAppsTab';
import { SignedImg } from '@/components/shared/SignedImage';

const TABS = [
  { key: 'overview',       label: 'Overview',   short: 'Overview' },
  { key: 'programs',       label: 'Programs',   short: 'Programs' },
  { key: 'nutrition',      label: 'Nutrition',  short: 'Nutrition' },
  { key: 'checkins',       label: 'Check-ins',  short: 'Check-ins' },
  { key: 'progress',       label: 'Progress',   short: 'Progress' },
  { key: 'messages',       label: 'Messages',   short: 'Messages' },
  { key: 'connected_apps', label: 'Apps',       short: 'Apps' },
];

const goalLabels = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness',
};

function StatCard({ label, value, sub, color = 'text-foreground', icon: Icon, iconColor }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-muted rounded-2xl p-3 gap-0.5 text-center">
      {Icon && <Icon className={cn('w-3.5 h-3.5 mb-1', iconColor || 'text-muted-foreground')} />}
      <span className={cn('text-[15px] font-bold tabular-nums leading-tight', color)}>{value ?? '—'}</span>
      <span className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{label}</span>
      {sub && <span className="text-[9px] text-[var(--tc-muted-foreground)]">{sub}</span>}
    </div>
  );
}

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

  const daysSinceCI = lastCI ? differenceInDays(new Date(), new Date(lastCI.date)) : null;
  const isOverdue = daysSinceCI !== null && daysSinceCI > 7;

  const pendingCheckins = checkIns.filter(ci => ci.review_status === 'pending' || !ci.review_status).length;
  const flaggedCheckins = checkIns.filter(ci => ci.review_status === 'flagged').length;

  // Weight delta
  const sorted = [...checkIns].filter(ci => ci.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstWeight = sorted[0]?.weight;
  const latestWeight = sorted[sorted.length - 1]?.weight;
  const weightDelta = firstWeight && latestWeight ? +(latestWeight - firstWeight).toFixed(1) : null;

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!client) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-foreground font-medium">Client not found.</p>
      <Button variant="outline" onClick={() => navigate('/clients')}>
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Button>
    </div>
  );

  const initials = client.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const scoreColor = score === null ? 'text-muted-foreground' : score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
  const scoreIconColor = score === null ? 'text-muted-foreground' : score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';

  return (
    <div className="min-h-screen bg-muted flex flex-col">

      {/* ── Sticky top bar ── */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Clients</span>
        </button>
        <span className="text-muted-foreground hidden sm:inline">/</span>
        <span className="text-sm font-semibold text-foreground truncate flex-1">{client.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(pendingCheckins > 0 || flaggedCheckins > 0) && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold bg-warning/10 border border-warning text-warning px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {pendingCheckins + flaggedCheckins} need review
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowEdit(true)} className="gap-1.5 text-muted-foreground">
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Edit</span>
          </Button>
        </div>
      </div>

      {/* ── Hero header ── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

          {/* Avatar + Info row */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/10 text-primary flex items-center justify-center font-bold text-2xl overflow-hidden border border-border shadow-sm">
                {client.avatar_url
                  ? <SignedImg src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                  : initials}
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success border-2 border-white rounded-full" title="Active client" />
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{client.name}</h1>
                <LifecycleBadge status={client.lifecycle_status || 'lead'} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{goalLabels[client.goal] || 'General Fitness'}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-3 h-3" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-3 h-3" /> {client.phone}
                  </a>
                )}
                {client.start_date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" /> Since {format(new Date(client.start_date), 'MMM yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
            <StatCard
              label="Adherence"
              value={score !== null ? `${score}%` : '—'}
              color={scoreColor}
              icon={Activity}
              iconColor={scoreIconColor}
            />
            <StatCard
              label="Weight"
              value={latestWeight ? `${latestWeight}` : '—'}
              sub={weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta} lbs total` : undefined}
              icon={Scale}
            />
            <StatCard
              label="Check-ins"
              value={checkIns.length}
              sub={pendingCheckins > 0 ? `${pendingCheckins} pending` : undefined}
              color={pendingCheckins > 0 ? 'text-warning' : 'text-foreground'}
              icon={ClipboardCheck}
            />
            <StatCard
              label="Last Check-in"
              value={lastCI ? formatDistanceToNow(new Date(lastCI.date), { addSuffix: false }) : 'Never'}
              sub={lastCI ? 'ago' : undefined}
              color={isOverdue ? 'text-destructive' : 'text-foreground'}
              icon={Calendar}
              iconColor={isOverdue ? 'text-destructive' : 'text-muted-foreground'}
            />
          </div>

          {/* Alert banner if overdue */}
          {isOverdue && (
            <div className="flex items-center gap-2.5 bg-warning/10 border border-warning rounded-xl px-3.5 py-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-xs font-medium text-warning flex-1">No check-in for {daysSinceCI} days — consider reaching out</p>
              <button
                onClick={() => setActiveTab('messages')}
                className="text-xs font-semibold text-warning hover:text-warning flex items-center gap-0.5 flex-shrink-0"
              >
                Message <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setActiveTab('messages')}
              className="gap-1.5 bg-primary text-primary-foreground h-9 px-4 text-xs font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('programs')}
              className="gap-1.5 h-9 px-4 text-xs font-semibold border-border text-foreground"
            >
              <Dumbbell className="w-3.5 h-3.5" /> Assign Program
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('checkins')}
              className="gap-1.5 h-9 px-4 text-xs font-semibold border-border text-foreground"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Review Check-in
              {pendingCheckins > 0 && (
                <span className="ml-0.5 min-w-[18px] text-center text-[10px] bg-warning text-white rounded-full px-1.5">
                  {pendingCheckins}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-card border-b border-border sticky top-[57px] z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative px-3 sm:px-4 py-3.5 text-xs sm:text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {/* Notification dots */}
                {tab.key === 'checkins' && pendingCheckins > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold bg-warning text-white rounded-full px-1">
                    {pendingCheckins}
                  </span>
                )}
                {tab.key === 'messages' && messages.filter(m => !m.is_read && m.sender === 'client').length > 0 && (
                  <span className="ml-1.5 inline-block w-2 h-2 bg-destructive rounded-full align-top mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'overview'       && <ProfileOverviewTab client={client} checkIns={checkIns} score={score} />}
        {activeTab === 'programs'       && <ProfileProgramsTab client={client} />}
        {activeTab === 'nutrition'      && <ProfileNutritionTab client={client} />}
        {activeTab === 'checkins'       && <ProfileCheckInsTab client={client} checkIns={checkIns} />}
        {activeTab === 'progress'       && <ProfileProgressTab client={client} checkIns={checkIns} />}
        {activeTab === 'messages'       && <ProfileMessagesTab client={client} messages={messages} />}
        {activeTab === 'connected_apps' && <ProfileConnectedAppsTab client={client} />}
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