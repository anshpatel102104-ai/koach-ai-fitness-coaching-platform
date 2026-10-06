import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { differenceInDays, parseISO } from 'date-fns';
import { Check, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Panel, EmptyState } from '@/components/kit';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { compositeAdherenceScore } from '@/lib/adherence';
import { evaluateClientRisk } from '@/lib/riskEngine';
import { generateRecommendations } from '@/lib/decisionEngine';
import { Link } from 'react-router-dom';
import {
  ReviewStatTiles, PhotoStrip, AnswersPanel, checkInAnswers, Disclosure, RecommendationList,
  weekNumber, sentLabel, previousCheckIn, possessive,
} from '@/components/checkin/reviewParts';

/* ─── Constants ─── */
const TEMPLATES = [
  { label: 'Good check-in', text: "Good check-in this week. The consistency is showing. Same plan, keep going." },
  { label: 'Hard week', text: "Some weeks are harder than others. You kept showing up, and that's what moves the needle." },
  { label: 'Nutrition nudge', text: "Quick nudge on nutrition this week. Hitting your targets 80% of the time is plenty. Aim for that." },
  { label: 'Missed check-in', text: "I didn't get your check-in this week. Everything okay? Let me know if something came up." },
  { label: 'Sleep', text: "Sleep has been under 7 hours lately. Let's make that the one thing to fix this week: lights out 30 minutes earlier." },
];

/* ─── Queue builder ─── */
function buildQueue(checkIns, clients) {
  const cisByClient = {};
  for (const ci of checkIns) {
    if (!cisByClient[ci.client_id]) cisByClient[ci.client_id] = [];
    cisByClient[ci.client_id].push(ci);
  }
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
  const seen = new Set();
  const items = [];

  for (const ci of checkIns) {
    if (seen.has(ci.client_id)) continue;
    seen.add(ci.client_id);
    if (ci.coach_responded && ci.review_status === 'reviewed') continue;
    const daysAgo = differenceInDays(new Date(), parseISO(ci.date));
    if (daysAgo > 21) continue;

    const client = clientMap[ci.client_id];
    const clientCIs = cisByClient[ci.client_id] || [];
    const riskEntry = client ? evaluateClientRisk(client, checkIns) : null;
    const riskScore = riskEntry?.riskScore || 0;
    const isOverdue = daysAgo > 7;

    let tier = 2; // new
    if (riskScore >= 40) tier = 0; // at-risk
    else if (isOverdue) tier = 1; // overdue

    items.push({ ci, client, clientCIs, riskScore, riskEntry, daysAgo, tier });
  }

  items.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 0) return b.riskScore - a.riskScore;
    if (a.tier === 1) return new Date(a.ci.date) - new Date(b.ci.date);
    return new Date(b.ci.date) - new Date(a.ci.date);
  });

  return items;
}

/* ─── Mini weight sparkline (ink line, last point marked) ─── */
function WeightSparkline({ clientCIs, target }) {
  const weights = clientCIs.filter(c => c.weight).slice(0, 6).reverse();
  if (weights.length < 2) return null;
  const vals = weights.map(c => c.weight);
  const min = Math.min(...vals) - 2;
  const max = Math.max(...vals) + 2;
  const range = max - min || 1;
  const W = 120, H = 36;
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const diff = (vals[vals.length - 1] - vals[0]).toFixed(1);

  return (
    <Panel className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <p className="text-[13px] text-muted-foreground">Weight, last {vals.length} check-ins</p>
        <p className="text-[15px] font-semibold text-foreground mt-0.5 tabular-nums">
          {Number(diff) > 0 ? '+' : Number(diff) < 0 ? '−' : ''}{Math.abs(diff)} lb
          {target ? <span className="font-normal text-muted-foreground"> · goal {target} lb</span> : null}
        </p>
      </div>
      <svg width={W} height={H} viewBox={`-3 -3 ${W + 6} ${H + 6}`} className="text-foreground flex-shrink-0">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" className="fill-brand" />
      </svg>
    </Panel>
  );
}

/* ─── Feedback composer ─── */
function FeedbackComposer({ checkIn, client, allCIs, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [fromAI, setFromAI] = useState(false);

  const generateAI = async () => {
    setAiLoading(true);
    const result = (await db.functions.invoke('aiMessageAssistant', { action: 'generateCheckInResponse', client, checkIn, recentCheckIns: allCIs })).data?.message || '';
    setText(result);
    setFromAI(!!result);
    setAiLoading(false);
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, { coach_notes: text, coach_responded: true, review_status: 'reviewed' }),
      db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: text.trim(), tag: 'check_in', is_read: false }),
    ]);
    setSending(false);
    toast.success('Reply sent');
    onSent();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={text} onChange={e => { setText(e.target.value); }}
          placeholder={`Write to ${client?.name?.split(' ')[0] || 'them'}, or let the AI draft it.`}
          className="resize-y min-h-[160px]" rows={6}
        />
        {aiLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-card/80">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Drafting…</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={generateAI} disabled={aiLoading}>
          {text.trim() ? 'Draft again' : 'Draft with AI'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Templates <ChevronDown /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {TEMPLATES.map((t, i) => (
              <DropdownMenuItem key={i} onClick={() => { setText(t.text); setFromAI(false); }} className="flex-col items-start gap-0.5">
                <span className="font-medium">{t.label}</span>
                <span className="text-[13px] text-muted-foreground line-clamp-1">{t.text}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {fromAI ? `Drafted by AI from ${possessive(client)} answers. Edit anything before sending.` : 'Sends to their inbox and saves on the check-in.'}
        </p>
        <Button onClick={send} disabled={sending || !text.trim()} className="flex-shrink-0">
          {sending && <Loader2 className="animate-spin" />}
          Send reply
        </Button>
      </div>
    </div>
  );
}

/* ─── Apply Changes Panel ─── */
function ApplyChangesPanel({ checkIn, client, onCalDone, onCardioDone }) {
  const [calResult, setCalResult] = useState(null);
  const [cardioResult, setCardioResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const adjustCal = async (delta) => {
    if (!client?.assigned_nutrition_id) { toast.error('No nutrition plan assigned'); return; }
    setSaving(true);
    const plans = await db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id });
    const plan = plans[0];
    if (plan) {
      const newCals = Math.max(1000, (plan.calories || 2000) + delta);
      await Promise.all([
        db.entities.NutritionPlan.update(plan.id, { calories: newCals }),
        db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: `Your daily calorie target has been updated to ${newCals} kcal (${delta > 0 ? '+' : ''}${delta} kcal adjustment).`, tag: 'nutrition', is_read: false }),
      ]);
      const label = `${delta > 0 ? '+' : ''}${delta} kcal, now ${newCals}`;
      toast.success(`Calories adjusted: ${label}`);
      setCalResult(label);
      onCalDone?.(label);
    }
    setSaving(false);
  };

  const adjustCardio = async (dir) => {
    setSaving(true);
    const msg = dir === 'up'
      ? 'Your cardio has been increased — add 1 extra session or 20 min to your current sessions this week.'
      : 'Your cardio has been reduced — drop 1 session or reduce duration by 15–20 min this week.';
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, { coach_notes: (checkIn.coach_notes ? checkIn.coach_notes + '\n' : '') + '[Cardio] ' + msg }),
      db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: msg, tag: 'training', is_read: false }),
    ]);
    const label = dir === 'up' ? 'One cardio session added' : 'One cardio session removed';
    toast.success(label);
    setCardioResult(label);
    onCardioDone?.(label);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-muted-foreground mb-2">Daily calories</p>
        {calResult ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><Check className="w-4 h-4" /> {calResult}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[[-250, '−250'], [-150, '−150'], [+150, '+150'], [+250, '+250']].map(([d, l]) => (
              <Button key={d} variant="outline" onClick={() => adjustCal(d)} disabled={saving} className="tabular-nums">
                {saving ? <Loader2 className="animate-spin" /> : l}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="text-[13px] text-muted-foreground mb-2">Cardio</p>
        {cardioResult ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><Check className="w-4 h-4" /> {cardioResult}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => adjustCardio('up')} disabled={saving}>Add a session</Button>
            <Button variant="outline" onClick={() => adjustCardio('down')} disabled={saving}>Drop a session</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main client review card
───────────────────────────────────────── */
function ClientReviewCard({ item, onMarkReviewed, markSaving, position, total, overdueCount }) {
  const { ci: checkIn, client, clientCIs, riskEntry, daysAgo, tier } = item;
  const [feedbackSent, setFeedbackSent] = useState(!!checkIn.coach_responded || !!checkIn.coach_notes);
  const [aiSending, setAiSending] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [isReviewedLocal, setIsReviewedLocal] = useState(checkIn.review_status === 'reviewed');
  const [answersOpen, setAnswersOpen] = useState(false);

  const avgScore = compositeAdherenceScore(clientCIs);
  const recommendations = useMemo(() => generateRecommendations(checkIn, client, clientCIs), [checkIn, client, clientCIs]);
  const prev = previousCheckIn(checkIn, clientCIs);
  const answers = checkInAnswers(checkIn);
  const flaggedCount = answers.filter(a => a.flagged).length;
  const week = weekNumber(checkIn, client, clientCIs);
  const name = client?.name || checkIn.client_name || 'Client';

  const sendAI = async () => {
    if (aiSending || aiDone || feedbackSent) return;
    setAiSending(true);
    const result = (await db.functions.invoke('aiMessageAssistant', { action: 'generateCheckInResponse', client, checkIn, recentCheckIns: clientCIs })).data?.message || '';
    await Promise.all([
      db.entities.CheckIn.update(checkIn.id, { coach_notes: result, coach_responded: true, review_status: 'reviewed' }),
      db.entities.Message.create({ client_id: checkIn.client_id, client_name: checkIn.client_name, sender: 'coach', content: result, tag: 'check_in', is_read: false }),
    ]);
    setAiDone(true);
    setFeedbackSent(true);
    setAiSending(false);
    toast.success('AI reply sent');
  };

  const handleMarkReviewed = async () => {
    if (isReviewedLocal) return;
    setIsReviewedLocal(true);
    await onMarkReviewed();
  };

  const status = tier === 0 ? { label: 'At risk', cls: 'text-destructive' }
    : tier === 1 ? { label: `${daysAgo} days waiting`, cls: 'text-destructive' }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[15px]">
        <span className="text-muted-foreground">Check-in {position} of {total}</span>
        {overdueCount > 0 && <span className="ml-auto text-sm font-semibold text-destructive">{overdueCount} overdue</span>}
      </div>

      <div>
        <h1 className="text-[32px] sm:text-[38px] leading-[1.05] text-foreground">{name}</h1>
        <p className="text-[15px] text-muted-foreground mt-1">
          {week ? `Week ${week}, ` : ''}{sentLabel(checkIn)}
          {status && <span className={cn('font-medium', status.cls)}> · {status.label}</span>}
          {avgScore !== null && <span> · {avgScore}% adherence</span>}
          {(feedbackSent || isReviewedLocal) && <span className="text-success font-medium"> · Reviewed</span>}
        </p>
      </div>

      {riskEntry?.flags?.length > 0 && (
        <p className="text-sm text-destructive">{riskEntry.flags.slice(0, 5).map(f => f.label).join(', ')}</p>
      )}

      <ReviewStatTiles checkIn={checkIn} prev={prev} />

      <PhotoStrip urls={checkIn.photo_urls || []} />

      {clientCIs.filter(c => c.weight).length >= 2 && (
        <WeightSparkline clientCIs={clientCIs} target={client?.target_weight} />
      )}

      {(answers.length > 0 || checkIn.notes) && (
        <div>
          <Panel>
            <button
              type="button"
              onClick={() => setAnswersOpen(o => !o)}
              aria-expanded={answersOpen}
              className="w-full flex items-center gap-2 px-4 py-3.5 text-left"
            >
              <span className="text-[15px] font-semibold text-foreground">
                {answers.length} answer{answers.length !== 1 ? 's' : ''}{flaggedCount > 0 ? `, ${flaggedCount} flagged` : ''}
              </span>
              <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', answersOpen && 'rotate-180')} />
            </button>
          </Panel>
          {answersOpen && <AnswersPanel checkIn={checkIn} client={client} className="mt-2" />}
        </div>
      )}

      {checkIn.coach_notes && (
        <Panel className="px-4 py-3.5">
          <p className="text-[13px] text-muted-foreground">Your last reply</p>
          <p className="text-[15px] text-foreground leading-relaxed mt-1 whitespace-pre-line">{checkIn.coach_notes}</p>
        </Panel>
      )}

      {/* Reply */}
      <Panel className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[15px] font-semibold text-foreground">Reply</p>
          {!feedbackSent && (
            <button onClick={sendAI} disabled={aiSending || aiDone} className="text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-1 disabled:opacity-50">
              {aiSending ? 'Sending AI reply…' : 'Send an AI reply as is'}
            </button>
          )}
        </div>
        {feedbackSent ? (
          <p className="text-sm text-muted-foreground">{aiDone ? 'AI reply sent.' : 'Replied.'} Mark it reviewed below, or move on.</p>
        ) : (
          <FeedbackComposer checkIn={checkIn} client={client} allCIs={clientCIs} onSent={() => setFeedbackSent(true)} />
        )}
      </Panel>

      {/* Secondary tools */}
      <Panel className="overflow-hidden">
        <Disclosure title="Suggested changes" meta={recommendations.length ? `${recommendations.length}` : 'None'}>
          <RecommendationList recommendations={recommendations} checkIn={checkIn} client={client} />
        </Disclosure>
        <Disclosure title="Adjust the plan" meta="Calories or cardio">
          <ApplyChangesPanel checkIn={checkIn} client={client} />
        </Disclosure>
      </Panel>

      <Button
        variant="outline"
        className="w-full h-12"
        onClick={handleMarkReviewed}
        disabled={markSaving || isReviewedLocal}
      >
        {markSaving ? <Loader2 className="animate-spin" /> : isReviewedLocal ? <><Check /> Reviewed</> : 'Mark reviewed'}
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */
export default function FastReview() {
  const [idx, setIdx] = useState(0);
  const [reviewed, setReviewed] = useState({});
  const [markSaving, setMarkSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list('name'),
  });

  const { data: checkIns = [], isLoading } = useQuery({
    queryKey: ['checkins-fast'],
    queryFn: () => db.entities.CheckIn.list('-date', 200),
  });

  const queue = useMemo(() => buildQueue(checkIns, clients), [checkIns, clients]);
  const activeQueue = useMemo(() => queue.filter(item => !reviewed[item.ci.id]), [queue, reviewed]);

  const total = queue.length;
  const completedCount = Object.values(reviewed).filter(Boolean).length;
  const safeIdx = Math.min(idx, Math.max(0, activeQueue.length - 1));
  const current = activeQueue[safeIdx];

  const overdueCount = activeQueue.filter(i => i.tier === 1).length;

  const handleMark = async () => {
    if (!current) return;
    setMarkSaving(true);
    await db.entities.CheckIn.update(current.ci.id, { coach_responded: true, review_status: 'reviewed' });
    setReviewed(r => ({ ...r, [current.ci.id]: true }));
    queryClient.invalidateQueries({ queryKey: ['checkins-fast'] });
    setMarkSaving(false);
    toast.success('Marked reviewed');
  };

  const goNext = () => { if (safeIdx < activeQueue.length - 1) setIdx(i => i + 1); };
  const goPrev = () => { if (safeIdx > 0) setIdx(i => i - 1); };

  if (isLoading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
    </div>
  );

  const allDone = activeQueue.length === 0;
  const isLast = safeIdx >= activeQueue.length - 1;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      {/* Progress segments */}
      {!allDone && total > 0 && (
        <div className="flex gap-1 px-4 pt-3 max-w-xl mx-auto" aria-label={`${completedCount} of ${total} done`}>
          {queue.map((item) => (
            <span
              key={item.ci.id}
              className={cn('h-1 flex-1 rounded-full', reviewed[item.ci.id] ? 'bg-success' : item.ci.id === current?.ci.id ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-5 pb-32">
        {allDone ? (
          <Panel className="mt-10">
            <EmptyState
              title={completedCount > 0 ? `That's everyone. ${completedCount} check-in${completedCount !== 1 ? 's' : ''} reviewed.` : 'Nothing waiting on you.'}
              body={completedCount > 0 ? 'Good session. New check-ins will show up here as clients send them.' : 'No check-ins from the last three weeks need a reply.'}
              action={<Button asChild><Link to="/">Back to Today</Link></Button>}
            />
          </Panel>
        ) : (
          current && (
            <ClientReviewCard
              key={current.ci.id}
              item={current}
              onMarkReviewed={handleMark}
              markSaving={markSaving}
              position={safeIdx + 1}
              total={activeQueue.length}
              overdueCount={overdueCount}
            />
          )
        )}
      </div>

      {/* Sticky bottom bar */}
      {!allDone && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-xl mx-auto px-4 py-3 flex gap-3">
            <Button variant="outline" className="h-12 px-5 text-[15px]" onClick={goPrev} disabled={safeIdx === 0}>
              Back
            </Button>
            <Button className="flex-1 h-12 text-[15px]" onClick={isLast ? undefined : goNext} disabled={isLast}>
              {isLast ? 'Last one' : 'Next client'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
