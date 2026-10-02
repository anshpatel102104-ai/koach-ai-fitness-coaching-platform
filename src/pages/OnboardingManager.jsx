import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Link2, UserPlus, Check, Users, ChevronDown, ChevronUp, Send, Copy, CheckCircle2, Hourglass, Star, Sparkles, ChevronRight, X
} from 'lucide-react';
import { hasFeature } from '@/lib/subscription';
import { getMyTeamId } from '@/lib/teamUtils';
import AIOnboardingModal from '@/components/clients/ai-onboarding/AIOnboardingModal';
import AIOnboardingOverviewModal from '@/components/clients/ai-onboarding/AIOnboardingOverviewModal';

/* ─── Status config ─── */
const STATUS_CONFIG = {
  pending:   { label: 'Intake Started',    color: 'var(--tc-warning)', bg: 'var(--tc-warning)', icon: Hourglass },
  completed: { label: 'Intake Complete',   color: 'var(--tc-primary)', bg: 'var(--tc-accent)', icon: CheckCircle2 },
  converted: { label: 'Active Client',     color: 'var(--tc-success)', bg: 'var(--tc-success)', icon: Star },
};

const GOAL_LABEL = {
  fat_loss: '🔥 Fat Loss', muscle_gain: '💪 Muscle Gain', hybrid: '⚡ Hybrid',
  strength: '🏋️ Strength', endurance: '🏃 Endurance', general_fitness: '🎯 General',
};

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

/* ─── Intake Response Card ─── */
function ResponseCard({ response, onApprove, isApproving }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: 'var(--tc-accent)', color: 'var(--tc-primary)' }}>
          {response.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{response.name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground truncate">{response.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={response.status} />
          <button onClick={() => setExpanded(e => !e)} className="text-border hover:text-muted-foreground transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {response.goal && (
          <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
            {GOAL_LABEL[response.goal] || response.goal}
          </span>
        )}
        {response.age && (
          <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
            {response.age} yrs
          </span>
        )}
        {response.current_weight && (
          <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
            {response.current_weight} lbs
          </span>
        )}
        {response.training_days_per_week && (
          <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
            {response.training_days_per_week}x/week
          </span>
        )}
        <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full text-muted-foreground">
          {response.created_date ? new Date(response.created_date).toLocaleDateString() : ''}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-2.5 bg-muted/50">
          {[
            ['Height', response.height],
            ['Phone', response.phone],
            ['Experience', response.previous_experience],
            ['Food Preferences', response.food_preferences],
            ['Health Notes', response.health_conditions],
            ['Motivation', response.motivation],
            ['Schedule', response.schedule_preferences],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-[10px] font-bold text-muted-foreground w-28 flex-shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
              <span className="text-xs text-foreground leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action */}
      {response.status !== 'converted' && (
        <div className="border-t border-border px-4 py-3 bg-card flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-2 text-xs"
            onClick={() => onApprove(response)}
            disabled={isApproving}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isApproving ? 'Approving...' : 'Approve & Create Client'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Stats card ─── */
function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
      <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">{label}</p>
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
    queryFn: () => base44.entities.OnboardingResponse.list('-created_date', 100),
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
      const client = await base44.entities.Client.create({
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

      await base44.entities.OnboardingResponse.update(resp.id, { status: 'converted', client_id: client.id });

      const coachName = user?.full_name || 'Your Coach';
      // Generate the (hashed) invite token and send the branded setup email
      // server-side. Single source of truth for invites; no plaintext token in
      // the browser.
      await base44.functions.invoke('sendClientInvite', {
        clientId: client.id,
        clientName: resp.name,
        clientEmail: resp.email,
        welcomeMessage: `${coachName} approved your application — welcome to your coaching portal!`,
      });

      return client;
    },
    onSuccess: (client) => {
      qc.invalidateQueries({ queryKey: ['onboarding-responses'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`${client.name} approved! Setup email sent.`);
    },
    onError: () => toast.error('Failed to approve. Please try again.'),
  });

  const [aiClient, setAiClient] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showAIPicker, setShowAIPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const canAIOnboard = hasFeature(user, 'ai_onboarding');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
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
    toast.success('Intake link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const pending = responses.filter(r => r.status !== 'converted');
  const completed = responses.filter(r => r.status === 'completed');
  const converted = responses.filter(r => r.status === 'converted');

  const filtered = filterStatus === 'all' ? responses
    : filterStatus === 'pending' ? responses.filter(r => r.status !== 'converted')
    : responses.filter(r => r.status === filterStatus);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="bg-sidebar rounded-xl p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Client Onboarding</h1>
          <p className="text-sm mt-0.5" style={{ color: 'color-mix(in srgb, white 50%, transparent)' }}>Send your intake link and review submissions</p>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--tc-card)', color: 'var(--tc-foreground)' }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Intake Link'}
        </button>
      </div>

      {/* ── AI Onboarding Premium Card ── */}
      <button
        onClick={() => setShowOverview(true)}
        className="w-full text-left rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] relative"
        style={{ background: 'linear-gradient(135deg, var(--tc-sidebar) 0%, var(--kc-1a2744) 60%, var(--kc-1e1a3a) 100%)' }}
      >
        {/* Decorative glows */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--tc-ai), transparent 70%)' }} />
        <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--tc-primary), transparent 70%)' }} />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>

              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-1.5"
                  style={{ background: 'color-mix(in srgb, var(--tc-ai) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-ai) 35%, transparent)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--tc-ai)' }}>Pro &amp; Elite</span>
                </div>
                <p className="text-base font-bold text-white leading-tight">AI Onboarding</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'color-mix(in srgb, white 50%, transparent)' }}>
                  Generate a tailored program + meal plan for any client using AI — you review and approve before anything saves.
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
              style={{ background: 'color-mix(in srgb, white 8%, transparent)' }}>
              <ChevronRight className="w-4 h-4" style={{ color: 'color-mix(in srgb, white 50%, transparent)' }} />
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {['Training Program', 'Meal Plan', 'Goal-Matched', 'Review & Approve'].map(tag => (
              <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'color-mix(in srgb, white 7%, transparent)', color: 'color-mix(in srgb, white 50%, transparent)', border: '1px solid color-mix(in srgb, white 10%, transparent)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="px-5 py-3 flex items-center justify-between"
          style={{ background: 'color-mix(in srgb, black 30%, transparent)', borderTop: '1px solid color-mix(in srgb, white 6%, transparent)' }}>
          {canAIOnboard ? (
            <span className="text-xs font-semibold" style={{ color: 'color-mix(in srgb, white 60%, transparent)' }}>
              Click to get started →
            </span>
          ) : (
            <span className="text-xs font-semibold" style={{ color: 'color-mix(in srgb, var(--tc-ai) 80%, transparent)' }}>
              Upgrade to Pro or Elite to unlock →
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: canAIOnboard ? 'var(--tc-success)' : 'var(--tc-ai)' }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: canAIOnboard ? 'var(--tc-success)' : 'color-mix(in srgb, var(--tc-ai) 70%, transparent)' }}>
              {canAIOnboard ? 'Available' : 'Pro+'}
            </span>
          </div>
        </div>
      </button>

      {/* Overview modal */}
      {showOverview && (
        <AIOnboardingOverviewModal
          canUse={canAIOnboard}
          onClose={() => setShowOverview(false)}
          onGetStarted={() => { setShowOverview(false); setShowAIPicker(true); }}
          onUpgrade={() => { setShowOverview(false); window.location.href = '/subscription'; }}
        />
      )}

      {/* Client picker panel — slides in after "Get Started" */}
      {canAIOnboard && showAIPicker && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, var(--tc-sidebar), var(--kc-1a2744))' }}>
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--tc-ai)' }} />
              <p className="text-sm font-bold text-white">AI Onboarding — Select a Client</p>
            </div>
            <button onClick={() => { setShowAIPicker(false); setAiClient(null); setClientSearch(''); }}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, white 8%, transparent)', color: 'color-mix(in srgb, white 40%, transparent)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Search Client</p>
              <input
                autoFocus
                type="text"
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setAiClient(null); }}
                placeholder="Search clients by name or email…"
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary bg-muted"
              />
              {clientSearch && !aiClient && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-3">No clients found</p>
                  ) : filteredClients.slice(0, 8).map(c => (
                    <button key={c.id}
                      onClick={() => { setAiClient(c); setClientSearch(c.name); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent flex items-center justify-between gap-2 transition-colors border-b border-border last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'var(--tc-accent)', color: 'var(--tc-primary)' }}>
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-border" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {aiClient && (
              <div className="rounded-xl border border-accent bg-accent p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--tc-primary)', color: 'var(--tc-primary-foreground)' }}>
                    {aiClient.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{aiClient.name}</p>
                    <p className="text-[10px] text-primary">
                      {[aiClient.goal?.replace(/_/g, ' '), aiClient.current_weight && `${aiClient.current_weight} lbs`, aiClient.height].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setAiClient(null); setClientSearch(''); }}
                  className="text-primary hover:text-primary text-xs">✕</button>
              </div>
            )}
            <button
              onClick={() => aiClient && setShowAIModal(true)}
              disabled={!aiClient}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: aiClient ? 'linear-gradient(135deg, var(--tc-primary), var(--tc-ai))' : 'var(--tc-muted-foreground)' }}>
              <Sparkles className="w-4 h-4" />
              {aiClient ? `Generate AI Plan for ${aiClient.name}` : 'Select a client to continue'}
            </button>
            <p className="text-center text-[10px] text-muted-foreground">Nothing is saved until you review and approve</p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-accent border border-accent rounded-2xl p-4 space-y-2.5">
        <p className="text-xs font-bold text-primary uppercase tracking-widest">How it works</p>
        <div className="space-y-2">
          {[
            { n: '1', text: 'Copy your unique intake link below.' },
            { n: '2', text: 'Send it to a prospective client via text, email, or DM.' },
            { n: '3', text: 'Client completes the premium guided onboarding (no account needed yet).' },
            { n: '4', text: 'You review their intake here and click "Approve" to create their client profile.' },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.n}
              </span>
              <p className="text-xs text-primary leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Intake link card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <Link2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Your Private Intake Link</p>
            <p className="text-xs text-muted-foreground">Only share with prospective clients — do not post publicly</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2.5">
          <p className="text-xs text-muted-foreground flex-1 truncate font-mono">{onboardingUrl}</p>
          <button onClick={copyLink} className="text-primary hover:text-primary flex-shrink-0 p-1">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <Button className="w-full gap-2" onClick={copyLink} variant={copied ? 'secondary' : 'default'}>
          {copied
            ? <><Check className="w-4 h-4" /> Link Copied!</>
            : <><Link2 className="w-4 h-4" /> Copy Intake Link</>}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Send}        value={responses.length} label="Total Sent"  color="var(--tc-primary)" />
        <StatCard icon={Hourglass}   value={pending.length}   label="Pending"     color="var(--tc-warning)" />
        <StatCard icon={CheckCircle2}value={converted.length} label="Approved"    color="var(--tc-success)" />
      </div>

      {/* Filter tabs */}
      {responses.length > 0 && (
        <div className="flex gap-2">
          {[
            { id: 'all',       label: `All (${responses.length})` },
            { id: 'pending',   label: `Pending (${pending.length})` },
            { id: 'converted', label: `Active (${converted.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilterStatus(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filterStatus === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:border-border'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

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

      {/* Response list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-14 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Users className="w-5 h-5 text-border" />
          </div>
          <p className="text-sm font-semibold text-foreground">No intakes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Copy your link and share it with a prospective client.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <ResponseCard
              key={r.id}
              response={r}
              onApprove={approveMutation.mutate}
              isApproving={approveMutation.isPending && approveMutation.variables?.id === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}