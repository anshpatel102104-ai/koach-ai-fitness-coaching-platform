import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as base44 } from '@/api/supabaseClient';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingDown, TrendingUp, Minus, ChevronLeft, ChevronRight,
  Moon, Zap, Brain, CheckCircle2, ClipboardCheck,
  MessageSquare, Flame, Footprints, Loader2, Check, Dumbbell, Utensils
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { checkInScore, averageAdherenceScore, scoreColor } from '@/lib/adherence';
import CheckInResponseBox from '@/components/checkin/CheckInResponseBox';
import AIProgramSuggestions from '@/components/checkin/AIProgramSuggestions';
import CheckInNutritionTab from '@/components/checkin/CheckInNutritionTab';
import { SignedImg, SignedLink } from '@/components/shared/SignedImage';

const MOOD_EMOJI = { great: '😄', good: '🙂', okay: '😐', tired: '😴', stressed: '😰' };
const MOOD_LABEL = { great: 'Great', good: 'Good', okay: 'Okay', tired: 'Tired', stressed: 'Stressed' };

/* ── Swipeable photo gallery ── */
function PhotoGallery({ urls }) {
  const [idx, setIdx] = useState(0);
  if (!urls?.length) return null;
  const labels = ['Front', 'Side', 'Back'];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progress Photos</p>
      <div className="relative bg-secondary/30 rounded-2xl overflow-hidden aspect-[4/3]">
        <SignedLink href={urls[idx]} target="_blank" rel="noreferrer">
          <SignedImg
            src={urls[idx]}
            alt={labels[idx] || `Photo ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </SignedLink>
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + urls.length) % urls.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % urls.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {urls.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === idx ? 'bg-card scale-125' : 'bg-[var(--kc-w-40)]'
                )} />
              ))}
            </div>
            <div className="absolute top-3 left-3 bg-black/50 text-white text-[11px] font-medium px-2 py-1 rounded-full">
              {labels[idx] || `${idx + 1}/${urls.length}`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Score bar ── */
function ScoreBar({ label, value, max = 10, icon: Icon, good = v => v >= 7, warn = v => v >= 4 }) {
  if (value == null) return null;
  const pct = Math.round((value / max) * 100);
  const color = good(value) ? 'bg-success' : warn(value) ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{value}<span className="text-xs font-normal text-muted-foreground">/{max}</span></span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Compliance row ── */
function ComplianceRow({ label, value, icon: Icon }) {
  if (value == null) return null;
  const color = value >= 80 ? 'text-success' : value >= 60 ? 'text-warning' : 'text-destructive';
  const bg = value >= 80 ? 'bg-success/10 border-success/20' : value >= 60 ? 'bg-warning/10 border-warning/20' : 'bg-destructive/10 border-destructive/20';
  return (
    <div className={cn('flex items-center justify-between p-3 rounded-xl border', bg)}>
      <div className="flex items-center gap-2.5">
        <Icon className={cn('w-4 h-4', color)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full', value >= 80 ? 'bg-success' : value >= 60 ? 'bg-warning' : 'bg-destructive')}
            style={{ width: `${value}%` }} />
        </div>
        <span className={cn('text-sm font-bold tabular-nums w-10 text-right', color)}>{value}%</span>
      </div>
    </div>
  );
}

export default function CheckInDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get checkin ID + client ID from URL params
  const params = new URLSearchParams(window.location.search);
  const checkInId = params.get('id');
  const clientId = params.get('clientId');

  const [activeTab, setActiveTab] = useState('overview');
  const [markSaving, setMarkSaving] = useState(false);
  const [marked, setMarked] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [calAdjSaving, setCalAdjSaving] = useState(false);
  const [calAdjDone, setCalAdjDone] = useState(false);
  const [cardioSaving, setCardioSaving] = useState(false);
  const [cardioDone, setCardioDone] = useState(false);

  const { data: checkIn, isLoading: ciLoading } = useQuery({
    queryKey: ['checkin', checkInId],
    queryFn: () => base44.entities.CheckIn.filter({ id: checkInId }).then(r => r[0]),
    enabled: !!checkInId,
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: allClientCIs = [] } = useQuery({
    queryKey: ['client-checkins', clientId],
    queryFn: () => base44.entities.CheckIn.filter({ client_id: clientId }, '-date', 20),
    enabled: !!clientId,
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-plan', client?.assigned_nutrition_id],
    queryFn: () => base44.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id }).then(r => r[0]),
    enabled: !!client?.assigned_nutrition_id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CheckIn.update(checkInId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins-review'] });
      queryClient.invalidateQueries({ queryKey: ['checkin', checkInId] });
    },
  });

  const prevCI = useMemo(() => {
    if (!checkIn) return null;
    return allClientCIs.find(ci => ci.id !== checkInId && ci.weight != null) || null;
  }, [allClientCIs, checkIn, checkInId]);

  const avgScore = useMemo(() => averageAdherenceScore(allClientCIs, 3), [allClientCIs]);
  const thisScore = checkIn ? checkInScore(checkIn) : null;

  const weightDiff = checkIn?.weight && prevCI?.weight
    ? (checkIn.weight - prevCI.weight).toFixed(1)
    : null;

  const handleMarkReviewed = async () => {
    setMarkSaving(true);
    await updateMutation.mutateAsync({ coach_responded: true });
    setMarkSaving(false);
    setMarked(true);
  };

  const handleAdjustCalories = async () => {
    if (!nutritionPlan || calAdjDone) return;
    setCalAdjSaving(true);
    const delta = -150;
    await base44.entities.NutritionPlan.update(nutritionPlan.id, {
      calories: (nutritionPlan.calories || 2000) + delta,
    });
    queryClient.invalidateQueries({ queryKey: ['nutrition-plan', client?.assigned_nutrition_id] });
    setCalAdjSaving(false);
    setCalAdjDone(true);
  };

  const handleIncreaseCardio = async () => {
    if (cardioDone) return;
    setCardioSaving(true);
    // Append a cardio note to coach_notes on the check-in as a record of the action
    const existing = checkIn.coach_notes || '';
    const note = existing
      ? existing + '\n[Action] Cardio increased — add 1 session or +20 min/week.'
      : '[Action] Cardio increased — add 1 session or +20 min/week.';
    await updateMutation.mutateAsync({ coach_notes: note });
    setCardioSaving(false);
    setCardioDone(true);
  };

  if (ciLoading || !checkIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const daysAgo = differenceInDays(new Date(), parseISO(checkIn.date));
  const isReviewed = marked || checkIn.coach_responded || !!checkIn.coach_notes;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{client?.name || checkIn.client_name}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(checkIn.date), 'MMMM d, yyyy')} · {daysAgo}d ago
          </p>
        </div>
        {isReviewed && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 border border-success/20 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Reviewed
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur sticky top-[57px] z-10">
        <div className="max-w-xl mx-auto px-4 flex gap-1 pt-2">
          {[
            { id: 'overview',   label: 'Overview' },
            { id: 'nutrition',  label: 'Nutrition' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5 pb-32">

        {/* ── Nutrition Tab ── */}
        {activeTab === 'nutrition' && (
          <CheckInNutritionTab
            clientId={clientId}
            checkInDate={checkIn.date}
            nutritionPlan={nutritionPlan}
          />
        )}

        {activeTab === 'overview' && <>

        {/* ── Adherence Score Hero ── */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-5">
          <div className={cn(
            'w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border-2',
            thisScore >= 75 ? 'bg-success/10 border-success/30' :
            thisScore >= 50 ? 'bg-warning/10 border-warning/30' :
            thisScore !== null ? 'bg-destructive/10 border-destructive/30' :
            'bg-secondary border-border'
          )}>
            <span className={cn('text-3xl font-bold font-heading tabular-nums', scoreColor(thisScore))}>
              {thisScore ?? '–'}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">score</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight">
              {thisScore >= 85 ? 'Excellent week 🔥' :
               thisScore >= 75 ? 'Solid check-in 💪' :
               thisScore >= 50 ? 'Needs attention ⚠️' :
               thisScore !== null ? 'At risk 🚨' : 'Check-in submitted'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              3-check-in avg: <span className={cn('font-bold', scoreColor(avgScore))}>{avgScore ?? '–'}%</span>
            </p>
            {checkIn.mood && (
              <p className="text-sm mt-1">{MOOD_EMOJI[checkIn.mood]} Feeling {MOOD_LABEL[checkIn.mood]?.toLowerCase()}</p>
            )}
          </div>
        </div>

        {/* ── Weight ── */}
        {checkIn.weight && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weight</p>
            <div className="flex items-end gap-3">
              <div>
                <span className="text-4xl font-bold font-heading tabular-nums">{checkIn.weight}</span>
                <span className="text-lg text-muted-foreground ml-1">lbs</span>
              </div>
              {weightDiff !== null && (
                <div className={cn(
                  'flex items-center gap-1 text-base font-bold mb-1',
                  Number(weightDiff) < 0 ? 'text-success' :
                  Number(weightDiff) > 0 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {Number(weightDiff) < 0 ? <TrendingDown className="w-5 h-5" /> :
                   Number(weightDiff) > 0 ? <TrendingUp className="w-5 h-5" /> :
                   <Minus className="w-5 h-5" />}
                  {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} lbs
                  <span className="text-xs font-normal text-muted-foreground ml-1">vs last</span>
                </div>
              )}
            </div>
            {checkIn.body_fat_pct && (
              <p className="text-sm text-muted-foreground mt-1">Body fat: <span className="font-semibold text-foreground">{checkIn.body_fat_pct}%</span></p>
            )}
          </div>
        )}

        {/* ── Progress Photos ── */}
        {checkIn.photo_urls?.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <PhotoGallery urls={checkIn.photo_urls} />
          </div>
        )}

        {/* ── Sleep / Energy / Stress sliders ── */}
        {(checkIn.sleep_hours != null || checkIn.energy_level != null || checkIn.stress_level != null) && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wellness Scores</p>
            <ScoreBar
              label="Sleep"
              value={checkIn.sleep_hours}
              max={10}
              icon={Moon}
              good={v => v >= 7}
              warn={v => v >= 6}
            />
            <ScoreBar
              label="Energy"
              value={checkIn.energy_level}
              max={10}
              icon={Zap}
              good={v => v >= 7}
              warn={v => v >= 4}
            />
            <ScoreBar
              label="Stress"
              value={checkIn.stress_level}
              max={10}
              icon={Brain}
              good={v => v <= 3}
              warn={v => v <= 6}
            />
          </div>
        )}

        {/* ── Compliance ── */}
        {(checkIn.compliance_training != null || checkIn.compliance_nutrition != null) && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Compliance</p>
            <ComplianceRow label="Training" value={checkIn.compliance_training} icon={Dumbbell} />
            <ComplianceRow label="Nutrition" value={checkIn.compliance_nutrition} icon={Utensils} />
          </div>
        )}

        {/* ── Measurements ── */}
        {checkIn.measurements && Object.values(checkIn.measurements).some(v => v) && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Measurements (in)</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(checkIn.measurements).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="bg-secondary/40 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-muted-foreground capitalize mb-1">{k}</p>
                  <p className="font-bold text-sm">{v}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Program Suggestions ── */}
        <AIProgramSuggestions
          checkIn={checkIn}
          client={client}
          allClientCIs={allClientCIs}
          nutritionPlan={nutritionPlan}
        />

        {/* ── Client Notes ── */}
        {checkIn.notes && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Client Notes</p>
            <p className="text-sm leading-relaxed text-foreground">{checkIn.notes}</p>
          </div>
        )}

        {/* ── Existing Coach Response ── */}
        {checkIn.coach_notes && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Your Response</p>
            <p className="text-sm leading-relaxed">{checkIn.coach_notes}</p>
          </div>
        )}

        {/* ── Feedback box ── */}
        {showFeedback && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <CheckInResponseBox
              checkIn={checkIn}
              client={client}
              onSave={(data) => updateMutation.mutateAsync(data)}
              saving={updateMutation.isPending}
            />
          </div>
        )}

        </> /* end overview tab */}
      </div>

      {/* ── Sticky action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[240px] z-20 bg-card/90 backdrop-blur border-t border-border px-4 py-3">
        <div className="max-w-xl mx-auto grid grid-cols-2 gap-2">
          {/* Send Feedback */}
          <Button
            variant="outline"
            className="h-11 gap-2 text-sm"
            onClick={() => { setShowFeedback(v => !v); setTimeout(() => window.scrollTo({ top: 99999, behavior: 'smooth' }), 100); }}
          >
            <MessageSquare className="w-4 h-4" />
            {showFeedback ? 'Hide Feedback' : 'Send Feedback'}
          </Button>

          {/* Adjust Calories */}
          <Button
            variant="outline"
            className="h-11 gap-2 text-sm"
            onClick={handleAdjustCalories}
            disabled={calAdjSaving || calAdjDone || !nutritionPlan}
            title={!nutritionPlan ? 'No nutrition plan assigned' : 'Decrease calories by 150'}
          >
            {calAdjSaving ? <Loader2 className="w-4 h-4 animate-spin" /> :
             calAdjDone ? <Check className="w-4 h-4 text-success" /> :
             <Flame className="w-4 h-4" />}
            {calAdjDone ? 'Calories Adjusted' : 'Adjust Calories'}
          </Button>

          {/* Increase Cardio */}
          <Button
            variant="outline"
            className="h-11 gap-2 text-sm"
            onClick={handleIncreaseCardio}
            disabled={cardioSaving || cardioDone}
          >
            {cardioSaving ? <Loader2 className="w-4 h-4 animate-spin" /> :
             cardioDone ? <Check className="w-4 h-4 text-success" /> :
             <Footprints className="w-4 h-4" />}
            {cardioDone ? 'Cardio Updated' : 'Increase Cardio'}
          </Button>

          {/* Mark Reviewed */}
          <Button
            className="h-11 gap-2 text-sm"
            onClick={handleMarkReviewed}
            disabled={markSaving || isReviewed}
          >
            {markSaving ? <Loader2 className="w-4 h-4 animate-spin" /> :
             isReviewed ? <CheckCircle2 className="w-4 h-4" /> :
             <ClipboardCheck className="w-4 h-4" />}
            {isReviewed ? 'Reviewed' : 'Mark Reviewed'}
          </Button>
        </div>
      </div>
    </div>
  );
}