import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Check, ChevronDown, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';
import { averageAdherenceScore, checkInScore } from '@/lib/adherence';
import { Initials, ComplianceStrip } from '@/components/kit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { describeFlag, weeklyCompliance } from '@/components/dashboard/todayModel';
import { inkPrimaryBtn, inkOutlineBtn } from '@/components/dashboard/AIInsightsFeed';
import { riskLevel, RISK_LEVELS } from './RiskBreakdown';

const SEVERITY_TEXT = { high: 'text-destructive', medium: 'text-warning', low: 'text-muted-foreground' };
const SEVERITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

function recommendedAction(flags, lastMsgDays) {
  if (lastMsgDays === null || lastMsgDays > 5) return 'Send a check-in message';
  const top = flags[0];
  if (top?.key === 'missed_checkin') return 'Ask for their check-in';
  if (top?.key === 'low_adherence' || top?.key === 'missed_workouts') return 'Book a call';
  if (top?.key === 'mood_low' || top?.key === 'negative_notes') return 'Send a personal note';
  return 'Review their program';
}

/** Drafts an intervention plan with the AI. Ink panel; coach edits before sending. */
function AIInterventionPanel({ entry, client, onClose, onSend }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [message, setMessage] = useState('');

  const generate = async () => {
    setLoading(true);
    const flagSummary = entry.flags.map(f => f.label + (f.detail ? `: ${f.detail}` : '')).join(', ');
    try {
      const res = await db.functions.invoke('aiBusinessInsights', {
        action: 'interventionPlan',
        clientName: client.name,
        riskFactors: flagSummary,
        goal: client.goal,
        riskScore: entry.riskScore,
      });
      setPlan(res.data);
      setMessage(res.data?.message_script || '');
    } catch { toast.error('Couldn\'t draft a plan. Try again in a moment.'); }
    setLoading(false);
  };

  const first = client.name?.split(' ')[0] || 'them';

  return (
    <div className="rounded-xl bg-ai p-5 text-ai-foreground">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[18px]">Plan for {first}</h3>
        <button onClick={onClose} className="text-[13px] text-ai-foreground/60 underline-offset-4 hover:text-ai-foreground hover:underline">Close</button>
      </div>
      {!plan ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ai-foreground/80">
            The AI reads {first}&apos;s {entry.flags.length} risk factor{entry.flags.length === 1 ? '' : 's'} and drafts a first step, a message and a program change. You edit anything before it goes out.
          </p>
          <button onClick={generate} disabled={loading} className={cn(inkPrimaryBtn, 'mt-4 disabled:opacity-60')}>
            {loading ? 'Drafting…' : 'Draft a plan'}
          </button>
        </>
      ) : (
        <div className="mt-3 space-y-4 text-sm">
          <div>
            <p className="text-[13px] text-ai-foreground/60">First step</p>
            <p className="mt-0.5 leading-relaxed">{plan.immediate_action}</p>
          </div>
          <div>
            <p className="text-[13px] text-ai-foreground/60">Message, drafted by AI. Edit before sending.</p>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-lg border border-ai-foreground/20 bg-ai-foreground/5 p-3 text-sm text-ai-foreground placeholder:text-ai-foreground/40 focus:outline-none focus:ring-1 focus:ring-ai-foreground/40"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={() => onSend(message)} className={inkPrimaryBtn}>Send to {first}</button>
              <button onClick={generate} disabled={loading} className={inkOutlineBtn}>{loading ? 'Drafting…' : 'Redraft'}</button>
            </div>
          </div>
          <div>
            <p className="text-[13px] text-ai-foreground/60">Program change</p>
            <p className="mt-0.5 leading-relaxed">{plan.program_adjustment}</p>
          </div>
          {plan.follow_up_timeline && (
            <p className="border-t border-ai-foreground/15 pt-3 text-[13px] text-ai-foreground/70">Follow up: {plan.follow_up_timeline}</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One at-risk client as a table row (Clients-list pattern): red-ring avatar,
 * name + the main reason, 8-week compliance strip, adherence, actions.
 * Expands to the full picture and the AI plan.
 */
export default function RiskClientCard({ entry, messages, onSendNudge, onResolve, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { client, flags, clientCheckIns } = entry;

  const level = riskLevel(entry);
  const levelCfg = RISK_LEVELS[level];
  const clientMsgs = messages.filter(m => m.client_id === client.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastMsg = clientMsgs[0];
  const lastMsgDays = lastMsg ? differenceInDays(new Date(), parseISO(lastMsg.created_date)) : null;
  const recommended = recommendedAction(flags, lastMsgDays);
  const avgScore = averageAdherenceScore(clientCheckIns, 4);
  const cells = weeklyCompliance(client, clientCheckIns, 8);

  const updateClientMutation = useMutation({
    mutationFn: ({ data }) => db.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client status updated');
    },
  });

  const sendMsgMutation = useMutation({
    mutationFn: (content) => db.entities.Message.create({ client_id: client.id, client_name: client.name, sender: 'coach', content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messages'] }); toast.success(`Sent to ${client.name}`); },
  });

  return (
    <div className={cn('border-t border-border first:border-t-0', selected && 'bg-accent/50')}>
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
        <button
          onClick={() => onSelect(client.id)}
          aria-pressed={selected}
          aria-label={selected ? `Deselect ${client.name}` : `Select ${client.name}`}
          className={cn('touch-compact flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border-[1.5px] transition-colors',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:border-foreground')}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>

        <button onClick={() => setExpanded(e => !e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Initials name={client.name} size={40} tone={level === 'watch' ? 'default' : 'alert'} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="truncate text-[15px] font-semibold text-foreground">{client.name}</span>
              <span className={cn('flex-shrink-0 text-[13px] font-semibold', levelCfg.text)}>{levelCfg.label}</span>
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {describeFlag(flags[0], clientCheckIns)}
              {flags.length > 1 && ` · ${flags.length - 1} more`}
            </span>
          </span>
        </button>

        <ComplianceStrip weeks={cells} size="sm" className="hidden md:flex" label={`${client.name}, last 8 weeks`} />

        <span className="num w-12 flex-shrink-0 text-right text-[19px] text-foreground">
          {avgScore !== null ? `${avgScore}%` : <span className="text-muted-foreground">—</span>}
        </span>

        <div className="hidden flex-shrink-0 items-center gap-1 sm:flex">
          <Button size="sm" variant="outline" onClick={() => onSendNudge(client.id, client.name)}>
            <MessageSquare /> Message
          </Button>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="touch-compact flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-6 border-t border-border bg-background/60 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-[13px] text-muted-foreground">Suggested next step</p>
              <p className="mt-0.5 text-[15px] font-semibold text-foreground">{recommended}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {lastMsgDays === null ? 'No messages with them yet.' : lastMsgDays === 0 ? 'Last message today.' : `Last message ${lastMsgDays} day${lastMsgDays === 1 ? '' : 's'} ago.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onSendNudge(client.id, client.name)}>Message {client.name?.split(' ')[0]}</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/schedule?clientId=${client.id}`)}>Book a call</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/client-profile?id=${client.id}`)}>Profile</Button>
              </div>
            </div>

            <div>
              <p className="mb-1 text-[13px] text-muted-foreground">Why they&apos;re flagged</p>
              <ul>
                {flags.map(f => (
                  <li key={f.key} className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
                    <span className="text-sm text-foreground">{describeFlag(f, clientCheckIns)}</span>
                    <span className={cn('flex-shrink-0 text-[13px] font-semibold', SEVERITY_TEXT[f.severity])}>{SEVERITY_LABEL[f.severity] || f.severity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-[13px] text-muted-foreground">Last check-ins</p>
              {clientCheckIns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No check-ins on record.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {clientCheckIns.slice(0, 3).map(ci => {
                    const s = checkInScore(ci);
                    return (
                      <div key={ci.id || ci.date} className="rounded-lg bg-card px-3 py-2.5 shadow-[0_0_0_1px_rgb(var(--border)/0.6)]">
                        <p className="text-[13px] text-muted-foreground">{format(parseISO(ci.date), 'MMM d')}</p>
                        <p className={cn('num text-[20px]', s === null ? 'text-muted-foreground' : s >= 80 ? 'text-foreground' : s >= 50 ? 'text-warning' : 'text-destructive')}>{s ?? '—'}{s !== null && '%'}</p>
                        <p className="text-[12px] leading-tight text-muted-foreground">
                          {ci.compliance_training != null && <>Training {Math.round(ci.compliance_training)}%<br /></>}
                          {ci.compliance_nutrition != null && <>Nutrition {Math.round(ci.compliance_nutrition)}%</>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            {showAI ? (
              <AIInterventionPanel
                entry={entry}
                client={client}
                onClose={() => setShowAI(false)}
                onSend={(msg) => { sendMsgMutation.mutate(msg); setShowAI(false); }}
              />
            ) : (
              <div className="rounded-xl bg-ai p-5 text-ai-foreground">
                <h3 className="text-[18px]">Need a plan?</h3>
                <p className="mt-1.5 text-sm text-ai-foreground/80">Let the AI draft a first step and a message from {client.name?.split(' ')[0]}&apos;s data.</p>
                <button onClick={() => setShowAI(true)} className={cn(inkPrimaryBtn, 'mt-4')}>Draft an intervention</button>
              </div>
            )}

            <div>
              <label htmlFor={`notes-${client.id}`} className="mb-1.5 block text-[13px] text-muted-foreground">Private notes</label>
              <Textarea
                id={`notes-${client.id}`}
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Only you see these"
                className="resize-none bg-card"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { updateClientMutation.mutate({ data: { lifecycle_status: 'active' } }); toast.success('Marked as improving'); }}>
                Improving
              </Button>
              <Button size="sm" variant="outline" onClick={() => { updateClientMutation.mutate({ data: { lifecycle_status: 'active' } }); onResolve(client.id); }}>
                Resolved
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => { updateClientMutation.mutate({ data: { lifecycle_status: 'at_risk' } }); toast.success('Escalated'); }}>
                Escalate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
