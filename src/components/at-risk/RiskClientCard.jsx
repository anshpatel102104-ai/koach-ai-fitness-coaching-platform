import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  ChevronDown, ChevronUp, MessageSquare, User, Calendar, CheckSquare,
  Sparkles, ArrowUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { averageAdherenceScore, checkInScore } from '@/lib/adherence';
import { SEVERITY_CONFIG, FLAG_ICONS } from '@/lib/riskEngine';
import { getRiskLevel } from './RiskBreakdown';
import { toast } from 'sonner';

const RISK_LEVEL_STYLES = {
  critical: { dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive', border: 'border-destructive ring-1 ring-destructive', label: 'Critical' },
  moderate: { dot: 'bg-warning', badge: 'bg-warning/10 text-warning border-warning', border: 'border-warning', label: 'Moderate' },
  watch:    { dot: 'bg-primary',  badge: 'bg-accent text-primary border-primary',   border: 'border-primary',  label: 'Watch' },
};

const RECOMMENDED_ACTIONS = {
  missed_checkin: '📋 Send check-in reminder',
  low_adherence:  '📞 Schedule a call',
  low_nutrition:  '🥗 Review nutrition plan',
  missed_workouts:'💪 Adjust workout program',
  negative_notes: '💬 Personal check-in message',
  mood_low:       '❤️ Wellness check-in',
  declining_trend:'📊 Review program difficulty',
  no_progress:    '⚖️ Reassess goals & plan',
  low_sleep:      '😴 Sleep coaching session',
};

export default function RiskClientCard({ entry, lastMessages, selected, onToggleSelect, onResolve }) {
  const { client, flags, riskScore, clientCheckIns } = entry;
  const [expanded, setExpanded] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [coachNote, setCoachNote] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const riskLevel = getRiskLevel(flags.length);
  const styles = RISK_LEVEL_STYLES[riskLevel];

  const avgScore = averageAdherenceScore(clientCheckIns, 3);
  const lastMsg = lastMessages.filter(m => m.client_id === client.id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const daysNoMsg = lastMsg ? differenceInDays(new Date(), parseISO(lastMsg.created_date)) : null;
  const lastCheckIn = clientCheckIns[0];
  const daysNoCheckIn = lastCheckIn ? differenceInDays(new Date(), parseISO(lastCheckIn.date)) : null;

  const topFlag = flags[0];
  const recommendedAction = RECOMMENDED_ACTIONS[topFlag?.key] || '💬 Check in with client';

  const messageMutation = useMutation({
    mutationFn: (content) => db.entities.Message.create({ client_id: client.id, client_name: client.name, sender: 'coach', content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messages'] }); toast.success('Message sent!'); },
  });

  const updateClientMutation = useMutation({
    mutationFn: (data) => db.entities.Client.update(client.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); },
  });

  const handleAISuggest = async () => {
    setLoadingAI(true);
    try {
      const factStr = flags.map(f => f.label + (f.detail ? ': ' + f.detail : '')).join('; ');
      const res = await db.functions.invoke('aiBusinessInsights', {
        action: 'interventionPlan',
        clientName: client.name,
        riskFactors: factStr,
        goal: client.goal,
        avgAdherence: avgScore,
      });
      setAiSuggestion(res.data);
    } catch { toast.error('AI suggestion failed'); }
    setLoadingAI(false);
  };

  const handleSendAIMessage = () => {
    if (!aiSuggestion?.message_script) return;
    messageMutation.mutate(aiSuggestion.message_script);
    setAiSuggestion(null);
  };

  const handleMarkImproving = () => {
    updateClientMutation.mutate({ lifecycle_status: 'active' });
    toast.success(`${client.name} marked as improving`);
    onResolve(client.id);
  };

  const handleMarkResolved = () => {
    updateClientMutation.mutate({ lifecycle_status: 'active' });
    toast.success(`${client.name} resolved from at-risk`);
    onResolve(client.id);
  };

  const handleEscalate = () => {
    updateClientMutation.mutate({ lifecycle_status: 'at_risk', lifecycle_notes: 'Escalated: ' + flags.map(f => f.label).join(', ') });
    toast.warning(`${client.name} escalated to critical`);
  };

  return (
    <div className={cn('bg-card border-2 rounded-xl overflow-hidden transition-all', styles.border)}>
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <input type="checkbox" checked={selected} onChange={onToggleSelect}
            className="mt-1 w-4 h-4 rounded accent-primary flex-shrink-0" onClick={e => e.stopPropagation()} />

          {/* Avatar with pulsing dot */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, var(--tc-sidebar), var(--tc-sidebar-accent))' }}>
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white animate-pulse', styles.dot)} />
          </div>

          {/* Client info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">{client.name}</span>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', styles.badge)}>
                {styles.label}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {client.goal?.replace(/_/g, ' ') || 'General fitness'}
              {daysNoCheckIn !== null && ` · No check-in: ${daysNoCheckIn}d`}
            </p>
            {/* Risk factors summary */}
            <p className="text-[10px] text-foreground mt-1 leading-relaxed">
              {flags.slice(0, 3).map(f => f.detail || f.label).join(' · ')}
              {flags.length > 3 && ` · +${flags.length - 3} more`}
            </p>
          </div>

          {/* Score + expand */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {avgScore !== null && (
              <span className={cn('text-sm font-bold', avgScore >= 80 ? 'text-success' : avgScore >= 50 ? 'text-warning' : 'text-destructive')}>
                {avgScore}%
              </span>
            )}
            <button onClick={() => setExpanded(e => !e)}
              className="p-1 rounded hover:bg-muted transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-foreground">
          {daysNoMsg !== null && (
            <span className={cn(daysNoMsg > 7 ? 'text-destructive' : '')}>
              Last contact: {daysNoMsg}d ago
            </span>
          )}
          {client.lifecycle_status === 'at_risk' && (
            <span className="text-orange-500">Manually flagged</span>
          )}
        </div>

        {/* Recommended action + quick buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-foreground font-medium flex-shrink-0">
            {recommendedAction}
          </span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button onClick={() => navigate(`/messages?clientId=${client.id}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-accent border border-primary text-primary hover:bg-accent">
            <MessageSquare className="w-3 h-3" /> Message
          </button>
          <button onClick={() => navigate(`/schedule?clientId=${client.id}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-border text-foreground hover:bg-background">
            <Calendar className="w-3 h-3" /> Schedule Call
          </button>
          <button onClick={() => navigate(`/client-profile?clientId=${client.id}`)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-border text-foreground hover:bg-background">
            <User className="w-3 h-3" /> Profile
          </button>
          <button onClick={handleMarkResolved}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-success bg-success/10 text-success hover:bg-success/10">
            <CheckSquare className="w-3 h-3" /> Resolve
          </button>
          <button onClick={handleAISuggest} disabled={loadingAI}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-ai bg-ai/10 text-ai hover:bg-ai/10 disabled:opacity-50 ml-auto">
            {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            ✨ AI Suggest
          </button>
        </div>

        {/* AI Suggestion panel */}
        {aiSuggestion && (
          <div className="mt-3 p-3 rounded-xl border border-ai bg-ai/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ai uppercase tracking-wide">AI Intervention Plan</span>
              <button onClick={() => setAiSuggestion(null)} className="text-[10px] text-ai hover:text-ai">✕</button>
            </div>
            <div className="space-y-1.5 text-[10px] text-foreground">
              <div><span className="font-semibold">Immediate:</span> {aiSuggestion.immediate_action}</div>
              {aiSuggestion.program_adjustment && <div><span className="font-semibold">Program:</span> {aiSuggestion.program_adjustment}</div>}
              <div><span className="font-semibold">Follow-up:</span> {aiSuggestion.followup}</div>
            </div>
            <div className="border border-ai rounded-lg p-2 bg-card">
              <p className="text-[10px] font-semibold text-ai mb-1">Suggested Message:</p>
              <textarea defaultValue={aiSuggestion.message_script} rows={2}
                className="w-full text-[10px] resize-none focus:outline-none bg-transparent text-foreground"
                onChange={e => setAiSuggestion({ ...aiSuggestion, message_script: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSendAIMessage}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold bg-ai text-ai-foreground hover:bg-ai">
                Send Message
              </button>
              <button onClick={() => setAiSuggestion(null)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-ai text-ai">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-muted px-4 pb-4 pt-3 space-y-4 bg-background">
          {/* All risk flags */}
          <div>
            <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2">Risk Factors</p>
            <div className="space-y-1.5">
              {flags.map(f => (
                <div key={f.key} className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border text-[10px]', SEVERITY_CONFIG[f.severity].color)}>
                  <span className="flex-shrink-0">{FLAG_ICONS[f.icon] || '⚠️'}</span>
                  <div><span className="font-semibold">{f.label}</span>{f.detail && <span className="ml-1 opacity-70">— {f.detail}</span>}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent check-ins */}
          {clientCheckIns.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2">Recent Check-ins</p>
              <div className="space-y-1.5">
                {clientCheckIns.slice(0, 3).map((ci, i) => {
                  const s = checkInScore(ci);
                  return (
                    <div key={i} className="flex items-center gap-2 text-[10px] bg-card border border-border rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground w-16 flex-shrink-0">{format(parseISO(ci.date), 'MMM d')}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s ?? 0}%`, background: s >= 80 ? 'var(--tc-success)' : s >= 50 ? 'var(--tc-warning)' : 'var(--tc-destructive)' }} />
                      </div>
                      <span className="font-semibold w-8 text-right">{s ?? '—'}{s !== null ? '%' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Adherence mini chart */}
          {clientCheckIns.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2">4-Week Trend</p>
              <div className="bg-card border border-border rounded-lg p-3">
                <MiniAdherenceChart checkIns={clientCheckIns} />
              </div>
            </div>
          )}

          {/* Coach note */}
          <div>
            <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-1.5">Private Notes</p>
            <textarea value={coachNote} onChange={e => setCoachNote(e.target.value)} rows={2}
              placeholder="Add a private coaching note..."
              className="w-full text-xs border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-card" />
          </div>

          {/* Resolution options */}
          <div>
            <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2">Resolution</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleMarkImproving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-success/10 border border-success text-success hover:bg-success/10">
                <ArrowUp className="w-3 h-3" /> Mark as Improving
              </button>
              <button onClick={handleMarkResolved}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-accent border border-primary text-primary hover:bg-accent">
                ✓ Mark as Resolved
              </button>
              <button onClick={handleEscalate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/10">
                🚨 Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniAdherenceChart({ checkIns }) {
  const recent = checkIns.slice(0, 4).reverse();
  if (!recent.length) return null;
  return (
    <div className="flex items-end gap-1 h-10">
      {recent.map((ci, i) => {
        const score = checkInScore(ci) ?? 0;
        const color = score >= 80 ? 'var(--tc-success)' : score >= 50 ? 'var(--tc-warning)' : 'var(--tc-destructive)';
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t" style={{ height: `${Math.max(4, score * 0.34)}px`, background: color }} />
            <span className="text-[8px] text-muted-foreground">W{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}