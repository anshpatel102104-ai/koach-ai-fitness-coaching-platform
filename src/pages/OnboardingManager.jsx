import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserPlus, Check, ChevronDown, ChevronUp, Copy, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Page, PageHeader, Panel, PanelHeader, InkPanel, Initials, KeyValue, Segmented, Stat, EmptyState } from '@/components/kit';
import { hasFeature } from '@/lib/subscription';
import { getMyTeamId } from '@/lib/teamUtils';
import AIOnboardingModal from '@/components/clients/ai-onboarding/AIOnboardingModal';
import AIOnboardingOverviewModal from '@/components/clients/ai-onboarding/AIOnboardingOverviewModal';

/* ─── Status config ─── */
const STATUS_CONFIG = {
  pending:   { label: 'Intake started',  variant: 'warning' },
  completed: { label: 'Ready to review', variant: 'brand' },
  converted: { label: 'Active client',   variant: 'success' },
};

const GOAL_LABEL = {
  fat_loss: 'Fat loss', muscle_gain: 'Muscle gain', hybrid: 'Hybrid',
  strength: 'Strength', endurance: 'Endurance', general_fitness: 'General fitness',
};

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

/* ─── Intake response row ─── */
function ResponseCard({ response, onApprove, isApproving }) {
  const [expanded, setExpanded] = useState(false);
  const facts = [
    response.goal && (GOAL_LABEL[response.goal] || response.goal),
    response.age && `${response.age} yrs`,
    response.current_weight && `${response.current_weight} lb`,
    response.training_days_per_week && `${response.training_days_per_week}x a week`,
    response.created_date && new Date(response.created_date).toLocaleDateString(),
  ].filter(Boolean);

  return (
    <div className="py-1">
      <div className="flex items-center gap-3 py-3">
        <Initials name={response.name || response.email || '?'} size={40} />
        <button onClick={() => setExpanded(e => !e)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[15px] font-semibold text-foreground">{response.name || 'Unknown'}</span>
          <span className="block truncate text-sm text-muted-foreground">{facts.join(' · ') || response.email}</span>
        </button>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="hidden sm:inline-flex"><StatusBadge status={response.status} /></span>
          <button onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Hide answers' : 'Show answers'}
            className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mb-3 rounded-lg bg-secondary px-4 py-1">
          <div className="py-2 sm:hidden"><StatusBadge status={response.status} /></div>
          <KeyValue label="Email" value={response.email || '—'} />
          {[
            ['Height', response.height],
            ['Phone', response.phone],
            ['Experience', response.previous_experience],
            ['Food preferences', response.food_preferences],
            ['Health notes', response.health_conditions],
            ['Motivation', response.motivation],
            ['Schedule', response.schedule_preferences],
          ].filter(([, v]) => v).map(([label, value]) => (
            <KeyValue key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {response.status !== 'converted' && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onClick={() => onApprove(response)} disabled={isApproving}>
            <UserPlus />
            {isApproving ? 'Approving' : 'Approve and create client'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function OnboardingManager() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => me(),
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['onboarding-responses'],
    queryFn: () => db.entities.OnboardingResponse.list('-created_date', 100),
  });

  const approveMutation = useMutation({
    mutationFn: async (resp) => {
      const goalMap = { fat_loss: 'weight_loss', hybrid: 'muscle_gain' };
      const teamId = await getMyTeamId(user?.id);

      // NOTE (B9 / S1): the invite token is generated + hashed + emailed by the
      // sendClientInvite edge function below — never built or stored in the
      // browser. The old code wrote a plaintext token into `invite_token`, a
      // column that was renamed to `invite_token_hash` (so the insert threw),
      // and emailed a link that nothing could validate.
      const client = await db.entities.Client.create({
        name: resp.name,
        email: resp.email,
        phone: resp.phone || '',
        goal: goalMap[resp.goal] || resp.goal || 'general_fitness',
        current_weight: resp.current_weight,
        height: resp.height,
        lifecycle_status: 'active',
        status: 'active',
        notes: [
          resp.food_preferences && `Food: ${resp.food_preferences}`,
          resp.health_conditions && `Health: ${resp.health_conditions}`,
          resp.motivation && `Motivation: ${resp.motivation}`,
          resp.schedule_preferences && `Schedule: ${resp.schedule_preferences}`,
        ].filter(Boolean).join('\n\n'),
        ...(teamId ? { team_id: teamId } : {}),
      });

      await db.entities.OnboardingResponse.update(resp.id, { status: 'converted', client_id: client.id });

      const coachName = user?.full_name || 'Your Coach';
      // Generate the (hashed) invite token and send the branded setup email
      // server-side. Single source of truth for invites; no plaintext token in
      // the browser.
      await db.functions.invoke('sendClientInvite', {
        clientId: client.id,
        clientName: resp.name,
        clientEmail: resp.email,
        welcomeMessage: `${coachName} approved your application. Welcome to your coaching app.`,
      });

      return client;
    },
    onSuccess: (client) => {
      qc.invalidateQueries({ queryKey: ['onboarding-responses'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`${client.name} approved. Setup email sent.`);
    },
    onError: () => toast.error('Could not approve. Try again.'),
  });

  const [aiClient, setAiClient] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showAIPicker, setShowAIPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const canAIOnboard = hasFeature(user, 'ai_onboarding');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => db.entities.Client.list('-created_date', 200),
    enabled: canAIOnboard,
  });

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Served from the app origin (app.koachai.net) — never the marketing site.
  const onboardingUrl = `${window.location.origin}/client-onboarding${user?.email ? `?coach=${encodeURIComponent(user.email)}` : ''}`;

  const copyLink = () => {
    navigator.clipboard.writeText(onboardingUrl);
    setCopied(true);
    toast.success('Intake link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const pending = responses.filter(r => r.status !== 'converted');
  const completed = responses.filter(r => r.status === 'completed');
  const converted = responses.filter(r => r.status === 'converted');

  const filtered = filterStatus === 'all' ? responses
    : filterStatus === 'pending' ? responses.filter(r => r.status !== 'converted')
    : responses.filter(r => r.status === filterStatus);

  const waitingCount = responses.filter(r => r.status === 'completed').length;

  return (
    <Page>
      <PageHeader
        title="Client intake"
        subtitle={waitingCount
          ? `${waitingCount} ${waitingCount === 1 ? 'intake is' : 'intakes are'} ready to review. Approve one to create the client and send their setup email.`
          : 'Send one link. New clients answer 13 short questions, then you approve them here.'}
        actions={
          <Button onClick={copyLink} variant={copied ? 'secondary' : 'default'}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy intake link'}
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Intakes */}
        <Panel>
          <PanelHeader
            title="Intakes"
            right={responses.length > 0 && (
              <Segmented
                size="sm"
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: 'all', label: 'All', count: responses.length },
                  { value: 'pending', label: 'Waiting', count: pending.length },
                  { value: 'converted', label: 'Active', count: converted.length },
                ]}
              />
            )}
          />
          <div className="divide-y divide-border px-5 pb-2 sm:px-6">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 py-4">
                  <div className="h-10 w-10 rounded-full bg-secondary" />
                  <div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-secondary" /><div className="h-3 w-1/2 rounded bg-secondary" /></div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <EmptyState
                className="px-0 sm:px-0"
                title={responses.length === 0 ? 'No intakes yet' : 'Nothing in this view'}
                body={responses.length === 0 ? 'Copy your link and send it to someone who wants coaching.' : 'Try another filter.'}
                action={responses.length === 0 && <Button variant="outline" onClick={copyLink}><Copy /> Copy intake link</Button>}
              />
            ) : (
              filtered.map(r => (
                <ResponseCard
                  key={r.id}
                  response={r}
                  onApprove={approveMutation.mutate}
                  isApproving={approveMutation.isPending && approveMutation.variables?.id === r.id}
                />
              ))
            )}
          </div>
        </Panel>

        {/* Side column */}
        <div className="space-y-5">
          <Panel className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Intakes" value={responses.length} size="sm" />
              <Stat label="Waiting" value={pending.length} size="sm" />
              <Stat label="Approved" value={converted.length} size="sm" />
            </div>
          </Panel>

          {/* Intake link */}
          <Panel>
            <PanelHeader title="Your intake link" subtitle="Send it by text, email or DM. Don't post it publicly." />
            <div className="space-y-4 px-5 pb-5 sm:px-6">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5">
                <p className="flex-1 truncate font-mono text-[13px] text-muted-foreground">{onboardingUrl}</p>
                <button onClick={copyLink} aria-label="Copy link" className="touch-compact flex-shrink-0 p-1 text-foreground">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <ol className="space-y-3">
                {[
                  'Copy the link.',
                  'Send it to someone who wants coaching.',
                  'They answer 13 short questions. No account needed.',
                  'Their answers land here. Approve to create the client.',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground text-[13px] font-bold text-foreground">{i + 1}</span>
                    <p className="pt-0.5 text-sm text-foreground">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Panel>

          {/* AI onboarding */}
          <InkPanel
            title="Draft a first plan with AI"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => setShowOverview(true)}>
                  {canAIOnboard ? 'Choose a client' : 'See how it works'}
                </Button>
                <span className="text-[13px] text-ai-foreground/70">{canAIOnboard ? 'Included in your plan' : 'Pro and Elite plans'}</span>
              </div>
            }
          >
            A training program and meal plan matched to the client's goal. You review and approve before anything is saved.
          </InkPanel>

          {/* Overview modal */}
          {showOverview && (
            <AIOnboardingOverviewModal
              canUse={canAIOnboard}
              onClose={() => setShowOverview(false)}
              onGetStarted={() => { setShowOverview(false); setShowAIPicker(true); }}
              onUpgrade={() => { setShowOverview(false); window.location.href = '/subscription'; }}
            />
          )}

          {/* Client picker panel — shown after "Get Started" */}
          {canAIOnboard && showAIPicker && (
            <Panel>
              <PanelHeader
                title="Pick a client"
                subtitle="Nothing is saved until you review and approve."
                right={
                  <button onClick={() => { setShowAIPicker(false); setAiClient(null); setClientSearch(''); }}
                    aria-label="Close" className="touch-compact flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
                    <X className="h-4 w-4" />
                  </button>
                }
              />
              <div className="space-y-3 px-5 pb-5 sm:px-6">
                <input
                  autoFocus
                  type="text"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setAiClient(null); }}
                  placeholder="Search by name or email"
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
                {clientSearch && !aiClient && (
                  <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
                    {filteredClients.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No clients match.</p>
                    ) : filteredClients.slice(0, 8).map(c => (
                      <button key={c.id}
                        onClick={() => { setAiClient(c); setClientSearch(c.name); }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent">
                        <Initials name={c.name || '?'} size={28} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">{c.name}</span>
                          <span className="block truncate text-[13px] text-muted-foreground">{c.email}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {aiClient && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Initials name={aiClient.name || '?'} size={32} tone="ink" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{aiClient.name}</p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {[aiClient.goal?.replace(/_/g, ' '), aiClient.current_weight && `${aiClient.current_weight} lb`, aiClient.height].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => { setAiClient(null); setClientSearch(''); }} aria-label="Clear"
                      className="touch-compact text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                  </div>
                )}
                <Button className="w-full" onClick={() => aiClient && setShowAIModal(true)} disabled={!aiClient}>
                  {aiClient ? `Draft a plan for ${aiClient.name}` : 'Pick a client first'}
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* AI Onboarding Modal */}
      {showAIModal && aiClient && (
        <AIOnboardingModal
          client={aiClient}
          onClose={() => setShowAIModal(false)}
          onSaved={() => {
            setShowAIModal(false);
            setShowAIPicker(false);
            setAiClient(null);
            setClientSearch('');
          }}
        />
      )}
    </Page>
  );
}
