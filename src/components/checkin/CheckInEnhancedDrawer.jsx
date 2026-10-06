/**
 * Check-in review detail pane (was a side drawer; now the canvas half of the
 * Check-ins screen). Name + week, stat row, photo comparison, answers, the
 * AI-drafted reply with tone control, then secondary tools tucked into
 * disclosures. Mobile gets the stacked layout with a sticky Skip / Send bar.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { db } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Panel, InkPanel, Segmented } from '@/components/kit';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateRecommendations } from '@/lib/decisionEngine';
import {
  firstName, possessive, submittedLabel, sentLabel, weekNumber, previousCheckIn,
  ReviewStats, ReviewStatTiles, PhotoCompare, PhotoStrip, AnswersPanel, checkInAnswers,
  Disclosure, CompareRows, MeasurementRows, RecommendationList,
} from './reviewParts';

const QUICK_REPLIES = [
  'Great week. Keep it going.',
  'Keep pushing. You are close.',
  'Progress is showing. Same plan next week.',
  'You are on a roll. Nothing to change.',
];

const TONES = [
  { value: 'warm', label: 'Warm' },
  { value: 'direct', label: 'Direct' },
  { value: 'detailed', label: 'Detailed' },
];

export default function CheckInEnhancedDrawer({
  checkIn, client, allCheckIns = [], currentIndex = 0, total = 0,
  onNavigate, onOpenChange, onDone, overdueCount = 0,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [coachResponse, setCoachResponse] = useState('');
  const [draftSource, setDraftSource] = useState(null); // 'ai' | 'saved' | null
  const [lastAiDraft, setLastAiDraft] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [tone, setTone] = useState('direct');
  const [analysis, setAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);

  useEffect(() => {
    if (!checkIn) return;
    const suggested = checkIn.ai_summary?.suggested_response || '';
    if (checkIn.coach_notes) {
      setCoachResponse(checkIn.coach_notes);
      setDraftSource('saved');
    } else if (suggested) {
      setCoachResponse(suggested);
      setDraftSource('ai');
    } else {
      setCoachResponse('');
      setDraftSource(null);
    }
    setLastAiDraft(suggested);
    setInternalNotes(checkIn.internal_notes || '');
    setAnalysis(checkIn.ai_summary || null);
    setAnswersOpen(false);
  }, [checkIn?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.update(checkIn.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
      toast.success('Check-in updated');
    },
  });

  const prevCI = useMemo(() => previousCheckIn(checkIn, allCheckIns), [checkIn, allCheckIns]);
  const recommendations = useMemo(
    () => (checkIn ? generateRecommendations(checkIn, client, allCheckIns) : []),
    [checkIn, client, allCheckIns]
  );

  if (!checkIn) return null;

  const clientName = client?.name || checkIn.client_name || 'Client';
  const first = firstName(client, checkIn);
  const week = weekNumber(checkIn, client, allCheckIns);
  const answers = checkInAnswers(checkIn);
  const flaggedCount = answers.filter(a => a.flagged).length;
  const isReviewed = checkIn.coach_responded && checkIn.review_status === 'reviewed';
  const isFlagged = checkIn.review_status === 'flagged';
  const busy = updateMutation.isPending;

  /* ── AI draft (aiCheckInInsights → reviewCheckIn, cached on the check-in) ── */
  const generate = async (toneKey = tone) => {
    setAiLoading(true);
    try {
      const res = await db.functions.invoke('aiCheckInInsights', {
        action: 'reviewCheckIn', checkIn, clientName, tone: toneKey,
      });
      const result = res.data;
      setAnalysis(result);
      if (result?.suggested_response) {
        setCoachResponse(result.suggested_response);
        setLastAiDraft(result.suggested_response);
        setDraftSource('ai');
      }
      await db.entities.CheckIn.update(checkIn.id, { ai_summary: result });
    } catch (e) {
      toast.error('Could not draft a reply. Try again in a moment.');
    }
    setAiLoading(false);
  };

  const handleTone = (next) => {
    setTone(next);
    // Redraft only when the coach hasn't edited the AI draft.
    if (!coachResponse.trim() || (draftSource === 'ai' && coachResponse === lastAiDraft)) generate(next);
  };

  /* ── Writes ── */
  const handleSendResponse = async () => {
    if (!coachResponse.trim()) return;
    await updateMutation.mutateAsync({ coach_notes: coachResponse, coach_responded: true, review_status: 'reviewed' });
    onDone?.({ sent: true });
  };

  const handleSendReaction = (text) => {
    updateMutation.mutate({ coach_notes: text, coach_responded: true, review_status: 'reviewed' });
    toast.success(`Sent to ${first}`);
  };

  const handleMarkReviewed = () => {
    updateMutation.mutate({
      coach_responded: true,
      review_status: 'reviewed',
      coach_notes: coachResponse || checkIn.coach_notes,
      internal_notes: internalNotes || checkIn.internal_notes,
    });
  };

  const handleFlag = () => {
    updateMutation.mutate({ review_status: 'flagged' });
    toast.success('Flagged for follow-up');
  };

  const voiceHandlers = {
    onMouseDown: () => setIsRecording(true),
    onMouseUp: () => { setIsRecording(false); toast.info('Voice notes are not available yet.'); },
    onTouchStart: () => setIsRecording(true),
    onTouchEnd: () => { setIsRecording(false); toast.info('Voice notes are not available yet.'); },
  };

  const disclosure = draftSource === 'ai'
    ? `Drafted by AI from ${possessive(client)} answers. Edit anything before sending.`
    : draftSource === 'saved'
      ? `Already sent to ${first}. Edit and send again to update it.`
      : `Only ${first} sees this reply.`;

  const toneLabel = TONES.find(t => t.value === tone)?.label.toLowerCase();

  /* ── Header menu (secondary actions) ── */
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions" className="h-8 w-8 flex-shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={handleFlag} disabled={busy || isFlagged}>
          {isFlagged ? 'Flagged for follow-up' : 'Flag for follow-up'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMarkReviewed} disabled={busy || isReviewed}>
          {isReviewed ? 'Reviewed' : 'Mark reviewed without replying'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[13px] font-medium text-muted-foreground">Send a quick reply</DropdownMenuLabel>
        {QUICK_REPLIES.map(text => (
          <DropdownMenuItem key={text} onClick={() => handleSendReaction(text)} disabled={busy}>
            {text}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(`/checkin-detail?id=${checkIn.id}&clientId=${checkIn.client_id}`)}>
          Open full check-in
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/messages?clientId=${checkIn.client_id}`)}>
          Message {first}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="px-4 pt-4 pb-40 sm:px-6 lg:px-8 lg:py-7 space-y-4 max-w-[1120px]">

      {/* Mobile: back + position */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={() => onOpenChange?.(false)}
          aria-label="Back to the queue"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-card ring-1 ring-border"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-[15px] text-muted-foreground">Check-in {Math.min(currentIndex + 1, Math.max(total, 1))} of {Math.max(total, 1)}</span>
        {overdueCount > 0 && <span className="ml-auto text-sm font-semibold text-destructive">{overdueCount} overdue</span>}
      </div>

      {/* Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[32px] lg:text-[38px] leading-[1.05] text-foreground">
            {clientName}<span className="hidden lg:inline">{week ? `, week ${week}` : ''}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[15px] text-muted-foreground min-w-0">
              <span className="lg:hidden">{week ? `Week ${week}, ` : ''}{sentLabel(checkIn)}</span>
              <span className="hidden lg:inline">{submittedLabel(checkIn)}</span>
              {isReviewed && <span className="text-success font-medium"> · Reviewed</span>}
              {isFlagged && <span className="text-destructive font-medium"> · Flagged for follow-up</span>}
            </p>
            <div className="ml-auto xl:ml-2 flex items-center gap-0.5 flex-shrink-0">
              {total > 1 && (
                <span className="hidden lg:flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous check-in"
                    disabled={currentIndex <= 0} onClick={() => onNavigate?.(currentIndex - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Next check-in"
                    disabled={currentIndex >= total - 1} onClick={() => onNavigate?.(currentIndex + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </span>
              )}
              {menu}
            </div>
          </div>
        </div>
        <ReviewStats checkIn={checkIn} prev={prevCI} className="hidden lg:flex flex-shrink-0 pt-1" />
      </header>

      {/* Mobile stat tiles */}
      <ReviewStatTiles checkIn={checkIn} prev={prevCI} className="lg:hidden" />

      {/* Photos */}
      <PhotoCompare checkIn={checkIn} clientCIs={allCheckIns} className="hidden lg:grid" />
      <PhotoStrip urls={checkIn.photo_urls || []} className="lg:hidden" />

      {/* Answers: full on desktop, one summary row on mobile */}
      <AnswersPanel checkIn={checkIn} client={client} className="hidden lg:block" />
      {(answers.length > 0 || checkIn.notes) && (
        <div className="lg:hidden">
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

      {/* What the AI noticed */}
      {analysis?.summary && (
        <InkPanel
          title="What the AI noticed"
          footer={
            <div className="flex flex-wrap gap-2">
              {analysis.suggested_response && coachResponse !== analysis.suggested_response && (
                <Button
                  size="sm"
                  className="bg-ai-foreground text-ai hover:bg-ai-foreground/90"
                  onClick={() => { setCoachResponse(analysis.suggested_response); setLastAiDraft(analysis.suggested_response); setDraftSource('ai'); }}
                >
                  Use its reply
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-ai-foreground hover:bg-ai-foreground/10 border border-ai-foreground/25" onClick={() => setAnalysis(null)}>
                Dismiss
              </Button>
            </div>
          }
        >
          <p>{analysis.summary}</p>
          {analysis.flags?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {analysis.flags.map((flag, i) => (
                <li key={i} className="flex gap-2 text-[14px]">
                  <span aria-hidden className="mt-[8px] h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          )}
        </InkPanel>
      )}

      {/* Your reply */}
      <Panel className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h2 className="hidden sm:block text-[22px] text-foreground">Your reply</h2>
          <p className="sm:hidden text-[15px] font-semibold text-foreground">Reply</p>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Tone</span>
            <Segmented size="sm" options={TONES} value={tone} onChange={handleTone} />
          </div>
          <span className="sm:hidden text-[13px] text-muted-foreground">
            {aiLoading ? 'Drafting…' : draftSource === 'ai' ? `AI draft, ${toneLabel} tone` : draftSource === 'saved' ? 'Sent' : 'Not drafted'}
          </span>
        </div>

        <div className="relative">
          <textarea
            value={coachResponse}
            onChange={e => { setCoachResponse(e.target.value); if (draftSource === 'saved') setDraftSource(null); }}
            placeholder={`Write to ${first}, or let the AI draft it from ${possessive(client)} answers.`}
            className="w-full min-h-[200px] lg:min-h-[260px] resize-y rounded-lg border border-input bg-card px-4 py-3.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
          />
          {!coachResponse.trim() && !aiLoading && (
            <Button className="absolute left-4 bottom-4" size="sm" onClick={() => generate()}>
              Draft with AI
            </Button>
          )}
          {aiLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/80">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Drafting from {possessive(client)} answers…
              </span>
            </div>
          )}
        </div>

        {/* Mobile adjust chips */}
        <div className="flex flex-wrap gap-2 mt-3 sm:hidden">
          <Button variant="outline" size="sm" disabled={aiLoading} onClick={() => generate('shorter')}>Shorter</Button>
          <Button variant="outline" size="sm" disabled={aiLoading} onClick={() => { setTone('warm'); generate('warm'); }}>Warmer</Button>
          <Button variant="outline" size="sm" {...voiceHandlers}
            className={cn(isRecording && 'border-destructive text-destructive')}>
            {isRecording ? 'Recording…' : 'Voice note'}
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {disclosure}
            {coachResponse.trim() && !aiLoading && (
              <>
                {' '}
                <button onClick={() => generate()} className="font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2">
                  Draft again
                </button>
              </>
            )}
          </p>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" className="h-11 px-5" onClick={() => onDone?.({ sent: false })}>Skip for now</Button>
            <Button className="h-11 px-5" onClick={handleSendResponse} disabled={!coachResponse.trim() || busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send and open next
            </Button>
          </div>
        </div>
      </Panel>

      {/* Secondary tools */}
      <Panel className="overflow-hidden">
        <Disclosure
          title="Suggested changes"
          meta={recommendations.length ? `${recommendations.length} from this week's numbers` : 'None this week'}
          defaultOpen={recommendations.some(r => r.priority === 'critical')}
        >
          <RecommendationList recommendations={recommendations} checkIn={checkIn} client={client} />
        </Disclosure>
        <Disclosure title="Compared with last check-in" meta={prevCI ? format(parseISO(prevCI.date), 'MMM d') : undefined}>
          <CompareRows checkIn={checkIn} prev={prevCI} />
        </Disclosure>
        {checkIn.measurements && Object.values(checkIn.measurements).some(Boolean) && (
          <Disclosure title="Measurements">
            <MeasurementRows measurements={checkIn.measurements} />
          </Disclosure>
        )}
        <Disclosure title="Private notes" meta={checkIn.internal_notes ? 'Saved' : 'Only you can see these'}>
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-2">
            <Lock className="h-3.5 w-3.5" /> {first} never sees these.
          </p>
          <textarea
            rows={4}
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Observations, things to watch next week, reminders for yourself."
            className="w-full rounded-lg border border-input bg-card px-3.5 py-3 text-[15px] leading-relaxed resize-y focus:outline-none focus:border-foreground"
          />
          <Button variant="outline" className="mt-3" onClick={() => updateMutation.mutate({ internal_notes: internalNotes })} disabled={busy}>
            Save notes
          </Button>
        </Disclosure>
      </Panel>

      {/* Mobile sticky action bar (sits above the bottom tab bar) */}
      <div
        className="fixed inset-x-0 z-30 flex gap-3 border-t border-border bg-card px-4 py-3 lg:hidden"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      >
        <Button variant="outline" className="h-12 px-5 text-[15px]" onClick={() => onDone?.({ sent: false })}>Skip</Button>
        <Button className="h-12 flex-1 text-[15px]" onClick={handleSendResponse} disabled={!coachResponse.trim() || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Send and next
        </Button>
      </div>
    </div>
  );
}
