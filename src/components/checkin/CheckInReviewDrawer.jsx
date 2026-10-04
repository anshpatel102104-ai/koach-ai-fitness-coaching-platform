import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import {
  ChevronLeft, ChevronRight, X, CheckCircle2, AlertTriangle, Flag,
  Moon, Zap, Heart, Scale, Dumbbell, Salad, Mic, MicOff,
  MessageSquare, Lock, Loader2, Sparkles, ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreColor, checkInScore } from '@/lib/adherence';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CheckInResponseGenerator from './CheckInResponseGenerator';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };

const REACTIONS = [
  { emoji: '🎉', label: 'Great week!' },
  { emoji: '💪', label: 'Keep pushing!' },
  { emoji: '📈', label: 'Progress!' },
  { emoji: '🔥', label: 'On fire!' },
];

function MetricTile({ icon: Icon, label, value, unit, color }) {
  if (value == null) return null;
  return (
    <div className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-3.5 h-3.5', color || 'text-muted-foreground')} />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function AIAnalysisBlock({ checkIn, client }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (generated) return;
    setLoading(true);
    try {
      const clientName = client?.name || checkIn.client_name || 'the client';
      const res = await db.functions.invoke('aiCheckInInsights', {
        action: 'reviewCheckIn', client, checkIn, clientName,
      });
      setSummary(res.data);
      setGenerated(true);
    } catch {
      toast.error('AI analysis failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    generate();
  }, [checkIn.id]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-ai/10 to-accent border border-ai rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-ai" />
          <span className="text-xs font-bold text-ai uppercase tracking-wide">AI Analysis</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-ai">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing check-in...
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-gradient-to-br from-ai/10 to-accent border border-ai rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-ai" />
        <span className="text-xs font-bold text-ai uppercase tracking-wide">AI Analysis</span>
      </div>

      <p className="text-sm text-foreground leading-relaxed">{summary.summary}</p>

      {summary.flags?.length > 0 && (
        <div className="space-y-1">
          {summary.flags.map((flag, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 rounded-lg px-2.5 py-1.5 border border-orange-200">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {flag}
            </div>
          ))}
        </div>
      )}

      {summary.suggested_response && (
        <div className="bg-[var(--kc-w-70)] rounded-lg p-3 border border-ai">
          <p className="text-[10px] font-bold text-ai uppercase tracking-wide mb-1">Suggested Response</p>
          <p className="text-xs text-foreground leading-relaxed italic">"{summary.suggested_response}"</p>
        </div>
      )}
    </div>
  );
}

export default function CheckInReviewDrawer({ checkIn, client, allCheckIns, currentIndex, total, onNavigate, open, onOpenChange }) {
  const [coachResponse, setCoachResponse] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [activeTab, setActiveTab] = useState('response'); // response | notes | compare
  const [recording, setRecording] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (checkIn) {
      setCoachResponse(checkIn.coach_notes || '');
      setInternalNotes(checkIn.internal_notes || '');
    }
  }, [checkIn?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.update(checkIn.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
    },
  });

  if (!checkIn) return null;

  const score = checkInScore(checkIn);
  const clientName = client?.name || checkIn.client_name || 'Client';
  const prevCI = allCheckIns?.find(ci => ci.id !== checkIn.id && ci.date < checkIn.date);

  const handleMarkReviewed = () => {
    updateMutation.mutate({
      coach_responded: true,
      review_status: 'reviewed',
      coach_notes: coachResponse || checkIn.coach_notes,
    });
    toast.success('Marked as reviewed');
  };

  const handleSendResponse = () => {
    if (!coachResponse.trim()) return;
    updateMutation.mutate({
      coach_notes: coachResponse,
      coach_responded: true,
      review_status: 'reviewed',
    });
    toast.success('Response saved');
  };

  const handleFlag = () => {
    updateMutation.mutate({ review_status: 'flagged' });
    toast.success('Flagged for follow-up');
  };

  const handleReaction = (reaction) => {
    const msg = `${reaction.emoji} ${reaction.label}`;
    updateMutation.mutate({
      coach_notes: msg,
      coach_responded: true,
      review_status: 'reviewed',
    });
    toast.success(`Sent "${msg}"`);
    onOpenChange(false);
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ internal_notes: internalNotes });
    toast.success('Notes saved');
  };

  const isReviewed = checkIn.coach_responded || checkIn.review_status === 'reviewed';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0 bg-card">
          <div className="relative">
            {client?.avatar_url ? (
              <SignedImg src={client.avatar_url} alt={clientName} className="w-10 h-10 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {clientName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">{clientName}</p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(checkIn.date), 'EEEE, MMM d, yyyy')}
              {checkIn.mood && <span className="ml-1.5">{MOOD_EMOJI[checkIn.mood]}</span>}
            </p>
          </div>
          {isReviewed && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success">
              Reviewed
            </span>
          )}
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-auto">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        {total > 1 && (
          <div className="flex items-center justify-between px-5 py-2 bg-muted border-b border-border flex-shrink-0">
            <button
              disabled={currentIndex === 0}
              onClick={() => onNavigate(currentIndex - 1)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-muted-foreground">{currentIndex + 1} / {total}</span>
            <button
              disabled={currentIndex === total - 1}
              onClick={() => onNavigate(currentIndex + 1)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* AI Analysis */}
          <AIAnalysisBlock checkIn={checkIn} client={client} />

          {/* Score */}
          {score !== null && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
              <span className="text-sm font-semibold">Overall Score</span>
              <span className={cn('text-2xl font-extrabold', scoreColor(score))}>
                {score}<span className="text-sm font-normal text-muted-foreground">%</span>
              </span>
            </div>
          )}

          {/* Metrics */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">This Week's Metrics</p>
            <div className="grid grid-cols-2 gap-2">
              <MetricTile icon={Scale} label="Weight" value={checkIn.weight} unit="lbs" color="text-primary" />
              <MetricTile icon={Moon} label="Sleep" value={checkIn.sleep_hours} unit="hrs"
                color={checkIn.sleep_hours >= 7 ? 'text-primary' : 'text-warning'} />
              <MetricTile icon={Zap} label="Energy" value={checkIn.energy_level} unit="/10"
                color={checkIn.energy_level >= 7 ? 'text-success' : 'text-warning'} />
              <MetricTile icon={Heart} label="Stress" value={checkIn.stress_level} unit="/10"
                color={checkIn.stress_level <= 4 ? 'text-success' : 'text-destructive'} />
              <MetricTile icon={Dumbbell} label="Training" value={checkIn.compliance_training} unit="%"
                color={checkIn.compliance_training >= 75 ? 'text-success' : 'text-warning'} />
              <MetricTile icon={Salad} label="Nutrition" value={checkIn.compliance_nutrition} unit="%"
                color={checkIn.compliance_nutrition >= 75 ? 'text-success' : 'text-warning'} />
            </div>
          </div>

          {/* Compare to previous */}
          {prevCI && (
            <div className="bg-muted border border-border rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">vs Previous ({format(parseISO(prevCI.date), 'MMM d')})</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                {[
                  { label: 'Weight', curr: checkIn.weight, prev: prevCI.weight, unit: 'lbs', lower: true },
                  { label: 'Energy', curr: checkIn.energy_level, prev: prevCI.energy_level, unit: '/10', lower: false },
                  { label: 'Sleep', curr: checkIn.sleep_hours, prev: prevCI.sleep_hours, unit: 'h', lower: false },
                ].map(({ label, curr, prev, unit, lower }) => {
                  const diff = curr != null && prev != null ? (curr - prev).toFixed(1) : null;
                  const improved = diff !== null ? (lower ? diff < 0 : diff > 0) : null;
                  return (
                    <div key={label} className="text-center">
                      <p className="text-muted-foreground mb-1">{label}</p>
                      <p className="font-bold text-foreground">{curr ?? '–'}{curr != null && unit}</p>
                      {diff !== null && (
                        <p className={cn('text-[10px] font-medium', improved ? 'text-success' : diff == 0 ? 'text-muted-foreground' : 'text-destructive')}>
                          {diff > 0 ? '+' : ''}{diff}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photos */}
          {checkIn.photo_urls?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                <ImageIcon className="w-3 h-3 inline mr-1" />Progress Photos
              </p>
              <div className="flex gap-2 flex-wrap">
                {checkIn.photo_urls.map((url, i) => (
                  <SignedLink key={i} href={url} target="_blank" rel="noreferrer">
                    <SignedImg src={url} alt="progress" className="w-20 h-20 object-cover rounded-xl border border-border hover:scale-105 transition-transform" />
                  </SignedLink>
                ))}
              </div>
            </div>
          )}

          {/* Measurements */}
          {checkIn.measurements && Object.values(checkIn.measurements).some(Boolean) && (
            <div className="bg-muted border border-border rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Measurements (in)</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(checkIn.measurements).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-muted-foreground capitalize">{k}</p>
                    <p className="font-bold text-foreground">{v}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client notes */}
          {checkIn.notes && (
            <div className="bg-muted border border-border rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Client Notes</p>
              <p className="text-sm leading-relaxed">{checkIn.notes}</p>
            </div>
          )}

          {/* Coach tools tabs */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex border-b border-border">
              {[
                { key: 'response', label: 'Response', icon: MessageSquare },
                { key: 'notes', label: 'Private Notes', icon: Lock },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors',
                    activeTab === key
                      ? 'bg-card text-primary border-b-2 border-primary'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="p-3 bg-card">
              {activeTab === 'response' && (
                <div className="space-y-3">
                  {/* Reaction quick-sends */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2">Quick reaction</p>
                    <div className="flex gap-2 flex-wrap">
                      {REACTIONS.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => handleReaction(r)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium hover:bg-primary/5 hover:border-primary/20 transition-colors"
                        >
                          {r.emoji} {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice note placeholder */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Voice note</p>
                    <button
                      onMouseDown={() => setRecording(true)}
                      onMouseUp={() => { setRecording(false); toast.info('Voice notes coming soon'); }}
                      onTouchStart={() => setRecording(true)}
                      onTouchEnd={() => { setRecording(false); toast.info('Voice notes coming soon'); }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all w-full justify-center',
                        recording
                          ? 'bg-destructive/10 border-destructive text-destructive animate-pulse'
                          : 'bg-muted border-border text-foreground hover:bg-muted'
                      )}
                    >
                      {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {recording ? 'Recording… release to stop' : 'Hold to record voice note'}
                    </button>
                  </div>

                  {/* AI Response Generator */}
                  <CheckInResponseGenerator
                   client={client}
                   checkIn={checkIn}
                   previousCheckIns={allCheckIns?.filter(ci => ci.id !== checkIn.id) || []}
                   onInsert={(text, editMode) => {
                     setCoachResponse(text);
                     if (!editMode) {
                       // Auto-save if "Use This" (not "Edit First")
                     }
                   }}
                  />

                  {/* Text response */}
                  <div>
                   <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Text response</p>
                   <textarea
                     rows={4}
                     value={coachResponse}
                     onChange={e => setCoachResponse(e.target.value)}
                     placeholder="Type your coaching feedback..."
                     className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
                   />
                    <Button
                      size="sm"
                      onClick={handleSendResponse}
                      disabled={!coachResponse.trim() || updateMutation.isPending}
                      className="w-full mt-2"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Response'}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3 h-3" /> These notes are private and not visible to the client
                  </p>
                  <textarea
                    rows={5}
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    placeholder="Private coaching notes, observations, action items..."
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/40 focus:bg-card transition-colors"
                  />
                  <Button size="sm" onClick={handleSaveNotes} disabled={updateMutation.isPending} variant="outline" className="w-full">
                    Save Notes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Existing coach notes display */}
          {checkIn.coach_notes && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">Your Previous Response</p>
              <p className="text-sm leading-relaxed">{checkIn.coach_notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-5 py-3 flex gap-2 bg-card">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={handleFlag}
            disabled={updateMutation.isPending}
          >
            <Flag className="w-3.5 h-3.5" /> Flag
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-success hover:bg-success"
            onClick={handleMarkReviewed}
            disabled={updateMutation.isPending || isReviewed}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isReviewed ? 'Reviewed ✓' : 'Mark Reviewed'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}