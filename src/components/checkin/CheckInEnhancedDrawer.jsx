import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { format, parseISO } from 'date-fns';
import {
  ChevronLeft, ChevronRight, Moon, Zap, Heart, Smile, Dumbbell,
  Salad, Scale, CheckCircle2, AlertTriangle, X, Mic, MicOff,
  Lock, Send, Sparkles, Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreColor, checkInScore } from '@/lib/adherence';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };

const REACTIONS = [
  { emoji: '🎉', label: 'Great week!' },
  { emoji: '💪', label: 'Keep pushing!' },
  { emoji: '📈', label: 'Progress!' },
  { emoji: '🔥', label: 'On fire!' },
];

function MetricTile({ icon: IconComp, label, value, unit, color }) {
  const Icon = IconComp;
  return (
    <div className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-3.5 h-3.5', color || 'text-muted-foreground')} />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">
        {value ?? '–'}
        {value != null && unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function AIAnalysis({ checkIn, clientName }) {
  const [analysis, setAnalysis] = useState(checkIn.ai_summary || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnalysis(checkIn.ai_summary || null);
  }, [checkIn.id, checkIn.ai_summary]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('aiCheckInInsights', {
        action: 'reviewCheckIn', checkIn, clientName,
      });
      const result = res.data;
      setAnalysis(result);
      await base44.entities.CheckIn.update(checkIn.id, { ai_summary: result });
    } catch (e) {
      toast.error('AI analysis failed');
    }
    setLoading(false);
  };

  if (!analysis) {
    return (
      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-ai bg-ai/50 text-ai text-sm font-semibold hover:bg-ai/10 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {loading ? 'Analyzing...' : 'Generate AI Analysis'}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-ai bg-ai/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-ai/60 border-b border-ai">
        <Sparkles className="w-3.5 h-3.5 text-ai" />
        <span className="text-xs font-bold text-ai uppercase tracking-wide">AI Analysis</span>
        <button onClick={() => setAnalysis(null)} className="ml-auto text-ai hover:text-ai transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
        {analysis.flags?.length > 0 && (
          <div className="space-y-1">
            {analysis.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {flag}
              </div>
            ))}
          </div>
        )}
        {analysis.suggested_response && (
          <div className="bg-[var(--kc-w-80)] border border-ai rounded-lg p-3">
            <p className="text-[10px] font-bold text-ai uppercase tracking-wide mb-1">Suggested Response</p>
            <p className="text-xs text-foreground leading-relaxed italic">"{analysis.suggested_response}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckInEnhancedDrawer({ checkIn, client, allCheckIns, currentIndex, total, onNavigate, open, onOpenChange }) {
  const [coachResponse, setCoachResponse] = useState(checkIn?.coach_notes || '');
  const [internalNotes, setInternalNotes] = useState(checkIn?.internal_notes || '');
  const [activeTab, setActiveTab] = useState('response');
  const [isRecording, setIsRecording] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCoachResponse(checkIn?.coach_notes || '');
    setInternalNotes(checkIn?.internal_notes || '');
  }, [checkIn?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CheckIn.update(checkIn.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
      toast.success('Check-in updated');
    },
  });

  if (!checkIn) return null;

  const score = checkInScore(checkIn);
  const clientName = client?.name || checkIn.client_name || 'Client';
  const prevCI = allCheckIns?.find(ci => ci.id !== checkIn.id);

  const handleSendResponse = () => {
    if (!coachResponse.trim()) return;
    updateMutation.mutate({ coach_notes: coachResponse, coach_responded: true, review_status: 'reviewed' });
  };

  const handleSendReaction = (reaction) => {
    const msg = `${reaction.emoji} ${reaction.label}`;
    updateMutation.mutate({ coach_notes: msg, coach_responded: true, review_status: 'reviewed' });
    toast.success('Reaction sent!');
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

  const handleUseSuggested = (suggested) => {
    setCoachResponse(suggested);
    setActiveTab('response');
  };

  const TABS = [
    { key: 'response', label: 'Response' },
    { key: 'notes', label: 'Private Notes' },
    { key: 'compare', label: 'Compare' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0"
          style={{ background: 'var(--tc-sidebar)' }}>
          <div className="w-10 h-10 rounded-full bg-[var(--kc-w-10)] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {clientName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">{clientName}</p>
            <p className="text-xs text-white/60">
              {format(parseISO(checkIn.date), 'EEEE, MMM d, yyyy')}
              {checkIn.mood && <span className="ml-1.5">{MOOD_EMOJI[checkIn.mood]}</span>}
            </p>
          </div>
          {score !== null && (
            <div className="text-center">
              <div className={cn('text-2xl font-black', scoreColor(score))}>{score}</div>
              <div className="text-[10px] text-white/50">score</div>
            </div>
          )}
          <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-[var(--kc-w-10)] transition-colors ml-1">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Navigation */}
        {total > 1 && (
          <div className="flex items-center justify-between px-5 py-2 bg-muted border-b border-border flex-shrink-0">
            <button disabled={currentIndex === 0} onClick={() => onNavigate(currentIndex - 1)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs text-muted-foreground">{currentIndex + 1} / {total}</span>
            <button disabled={currentIndex === total - 1} onClick={() => onNavigate(currentIndex + 1)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* AI Analysis */}
          <AIAnalysis checkIn={checkIn} clientName={clientName} onUseSuggested={handleUseSuggested} />

          {/* Metrics */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Metrics</p>
            <div className="grid grid-cols-2 gap-2">
              <MetricTile icon={Moon} label="Sleep" value={checkIn.sleep_hours} unit="hrs"
                color={checkIn.sleep_hours >= 7 ? 'text-primary' : checkIn.sleep_hours >= 6 ? 'text-warning' : 'text-destructive'} />
              <MetricTile icon={Zap} label="Energy" value={checkIn.energy_level} unit="/10"
                color={checkIn.energy_level >= 7 ? 'text-success' : checkIn.energy_level >= 4 ? 'text-warning' : 'text-destructive'} />
              <MetricTile icon={Heart} label="Stress" value={checkIn.stress_level} unit="/10"
                color={checkIn.stress_level <= 3 ? 'text-success' : checkIn.stress_level <= 6 ? 'text-warning' : 'text-destructive'} />
              <MetricTile icon={Smile} label="Mood" value={checkIn.mood ? MOOD_EMOJI[checkIn.mood] + ' ' + checkIn.mood : null} color="text-warning" />
              <MetricTile icon={Dumbbell} label="Training" value={checkIn.compliance_training} unit="%"
                color={checkIn.compliance_training >= 75 ? 'text-success' : checkIn.compliance_training >= 50 ? 'text-warning' : 'text-destructive'} />
              <MetricTile icon={Salad} label="Nutrition" value={checkIn.compliance_nutrition} unit="%"
                color={checkIn.compliance_nutrition >= 75 ? 'text-success' : checkIn.compliance_nutrition >= 50 ? 'text-warning' : 'text-destructive'} />
              {checkIn.weight != null && <MetricTile icon={Scale} label="Weight" value={checkIn.weight} unit="lbs" color="text-primary" />}
            </div>
          </div>

          {/* Photos */}
          {checkIn.photo_urls?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Progress Photos</p>
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
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Measurements</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(checkIn.measurements).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="bg-muted border border-border rounded-lg p-2.5 text-center">
                    <p className="text-xs font-bold text-foreground">{v}"</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{k}</p>
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
          <div>
            <div className="flex gap-1 mb-3 bg-muted rounded-xl p-1">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                    activeTab === tab.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'response' && (
              <div className="space-y-3">
                {/* Voice note placeholder */}
                <button
                  onMouseDown={() => setIsRecording(true)}
                  onMouseUp={() => { setIsRecording(false); toast.info('Voice notes coming soon!'); }}
                  onTouchStart={() => setIsRecording(true)}
                  onTouchEnd={() => { setIsRecording(false); toast.info('Voice notes coming soon!'); }}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    isRecording
                      ? 'border-destructive bg-destructive/10 text-destructive animate-pulse'
                      : 'border-dashed border-muted-foreground text-muted-foreground hover:border-muted-foreground'
                  )}>
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Recording... release to stop' : 'Hold to record voice note'}
                </button>

                <textarea
                  rows={4}
                  value={coachResponse}
                  onChange={e => setCoachResponse(e.target.value)}
                  placeholder="Type your feedback and coaching response to the client..."
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/40"
                />

                {/* Quick reactions */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick Reactions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REACTIONS.map(r => (
                      <button key={r.emoji} onClick={() => handleSendReaction(r)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted hover:bg-card hover:border-primary/30 transition-all text-xs font-semibold text-foreground">
                        <span className="text-base">{r.emoji}</span> {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSendResponse}
                  disabled={!coachResponse.trim() || updateMutation.isPending}
                  className="w-full gap-2"
                >
                  <Send className="w-3.5 h-3.5" /> Send Response
                </Button>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted border border-border rounded-lg px-3 py-2">
                  <Lock className="w-3.5 h-3.5" /> These notes are private — not visible to the client
                </div>
                <textarea
                  rows={6}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Add private coaching notes, observations, or action items..."
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/40"
                />
                <Button variant="outline" onClick={() => updateMutation.mutate({ internal_notes: internalNotes })}
                  disabled={updateMutation.isPending} className="w-full">
                  Save Private Notes
                </Button>
              </div>
            )}

            {activeTab === 'compare' && prevCI && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Comparing to previous check-in ({format(parseISO(prevCI.date), 'MMM d')})
                </p>
                {[
                  { label: 'Weight', curr: checkIn.weight, prev: prevCI.weight, unit: 'lbs', lower: false },
                  { label: 'Energy', curr: checkIn.energy_level, prev: prevCI.energy_level, unit: '/10', lower: false },
                  { label: 'Sleep', curr: checkIn.sleep_hours, prev: prevCI.sleep_hours, unit: 'hrs', lower: false },
                  { label: 'Stress', curr: checkIn.stress_level, prev: prevCI.stress_level, unit: '/10', lower: true },
                  { label: 'Training', curr: checkIn.compliance_training, prev: prevCI.compliance_training, unit: '%', lower: false },
                  { label: 'Nutrition', curr: checkIn.compliance_nutrition, prev: prevCI.compliance_nutrition, unit: '%', lower: false },
                ].filter(r => r.curr != null || r.prev != null).map(row => {
                  const diff = row.curr != null && row.prev != null ? Number((row.curr - row.prev).toFixed(1)) : null;
                  const improved = diff !== null ? (row.lower ? diff < 0 : diff > 0) : null;
                  return (
                    <div key={row.label} className="flex items-center gap-3 py-2 border-b border-muted last:border-0">
                      <span className="text-xs text-muted-foreground w-20">{row.label}</span>
                      <span className="text-sm font-semibold text-foreground">{row.prev ?? '–'}{row.unit}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm font-semibold text-foreground">{row.curr ?? '–'}{row.unit}</span>
                      {diff !== null && diff !== 0 && (
                        <span className={cn('text-xs font-bold ml-auto',
                          improved ? 'text-success' : 'text-destructive')}>
                          {diff > 0 ? '+' : ''}{diff}{row.unit}
                        </span>
                      )}
                      {diff === 0 && <span className="text-xs text-muted-foreground ml-auto">no change</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'compare' && !prevCI && (
              <p className="text-sm text-muted-foreground text-center py-8">No previous check-in to compare</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border px-5 py-3 flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={handleFlag} disabled={updateMutation.isPending}>
            <Flag className="w-3.5 h-3.5" /> Flag
          </Button>
          <Button size="sm" className="flex-1 gap-1.5 bg-success hover:bg-success"
            onClick={handleMarkReviewed}
            disabled={updateMutation.isPending || (checkIn.coach_responded && checkIn.review_status === 'reviewed')}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {checkIn.coach_responded && checkIn.review_status === 'reviewed' ? 'Reviewed ✓' : 'Mark Reviewed'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}