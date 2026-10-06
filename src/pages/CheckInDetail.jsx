import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkInScore, averageAdherenceScore } from '@/lib/adherence';
import { Panel, Stat, Segmented } from '@/components/kit';
import CheckInResponseBox from '@/components/checkin/CheckInResponseBox';
import AIProgramSuggestions from '@/components/checkin/AIProgramSuggestions';
import CheckInNutritionTab from '@/components/checkin/CheckInNutritionTab';
import {
  ReviewStats, ReviewStatTiles, PhotoCompare, AnswersPanel, MeasurementRows, weekNumber, signed,
} from '@/components/checkin/reviewParts';

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
    queryFn: () => db.entities.CheckIn.filter({ id: checkInId }).then(r => r[0]),
    enabled: !!checkInId,
  });

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => db.entities.Client.filter({ id: clientId }).then(r => r[0]),
    enabled: !!clientId,
  });

  const { data: allClientCIs = [] } = useQuery({
    queryKey: ['client-checkins', clientId],
    queryFn: () => db.entities.CheckIn.filter({ client_id: clientId }, '-date', 20),
    enabled: !!clientId,
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-plan', client?.assigned_nutrition_id],
    queryFn: () => db.entities.NutritionPlan.filter({ id: client.assigned_nutrition_id }).then(r => r[0]),
    enabled: !!client?.assigned_nutrition_id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.CheckIn.update(checkInId, data),
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
    await db.entities.NutritionPlan.update(nutritionPlan.id, {
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
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const daysAgo = differenceInDays(new Date(), parseISO(checkIn.date));
  const isReviewed = marked || checkIn.coach_responded || !!checkIn.coach_notes;
  const week = weekNumber(checkIn, client, allClientCIs);
  const name = client?.name || checkIn.client_name || 'Client';
  const verdict = thisScore === null ? null
    : thisScore >= 85 ? 'A strong week.'
    : thisScore >= 75 ? 'A solid week.'
    : thisScore >= 50 ? 'Worth a closer look.'
    : 'This one needs you.';

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8 mx-auto w-full max-w-[960px] pb-48 lg:pb-32">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div className="min-w-0">
          <h1 className="text-[32px] sm:text-[38px] leading-[1.05] text-foreground">
            {name}{week ? <span className="hidden sm:inline">, week {week}</span> : null}
          </h1>
          <p className="text-[15px] text-muted-foreground mt-1">
            {format(parseISO(checkIn.date), 'EEEE, MMMM d')} · {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}
            {isReviewed && <span className="text-success font-medium"> · Reviewed</span>}
          </p>
        </div>
        <ReviewStats checkIn={checkIn} prev={prevCI} className="hidden sm:flex" />
      </header>

      <Segmented
        className="mb-5"
        value={activeTab}
        onChange={setActiveTab}
        options={[{ value: 'overview', label: 'Overview' }, { value: 'nutrition', label: 'Nutrition' }]}
      />

      {activeTab === 'nutrition' && (
        <CheckInNutritionTab
          clientId={clientId}
          checkInDate={checkIn.date}
          nutritionPlan={nutritionPlan}
        />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <ReviewStatTiles checkIn={checkIn} prev={prevCI} className="sm:hidden" />

          {(thisScore !== null || avgScore !== null) && (
            <Panel className="px-5 py-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <Stat label="This check-in" value={thisScore ?? '–'} sub={verdict} tone={thisScore !== null && thisScore < 50 ? 'danger' : undefined} />
              <Stat label="Last 3 check-ins" value={avgScore != null ? `${avgScore}%` : '–'} sub="average adherence" />
              {checkIn.weight && weightDiff !== null && (
                <Stat label="Weight change" value={signed(Number(weightDiff))} unit="lb" sub="since last check-in" className="sm:hidden" />
              )}
            </Panel>
          )}

          <PhotoCompare checkIn={checkIn} clientCIs={allClientCIs} />

          <AnswersPanel checkIn={checkIn} client={client} />

          {checkIn.measurements && Object.values(checkIn.measurements).some(v => v) && (
            <Panel className="px-5 py-3">
              <p className="text-[13px] text-muted-foreground pt-1">Measurements</p>
              <MeasurementRows measurements={checkIn.measurements} />
            </Panel>
          )}

          <AIProgramSuggestions
            checkIn={checkIn}
            client={client}
            allClientCIs={allClientCIs}
            nutritionPlan={nutritionPlan}
          />

          {checkIn.coach_notes && !showFeedback && (
            <Panel className="px-5 py-4">
              <p className="text-[13px] text-muted-foreground">Your reply</p>
              <p className="text-[15px] leading-relaxed text-foreground mt-1 whitespace-pre-line">{checkIn.coach_notes}</p>
            </Panel>
          )}

          {showFeedback && (
            <Panel className="p-5">
              <CheckInResponseBox
                checkIn={checkIn}
                client={client}
                onSave={(data) => updateMutation.mutateAsync(data)}
                saving={updateMutation.isPending}
              />
            </Panel>
          )}
        </div>
      )}

      {/* Sticky action bar */}
      <div
        className="fixed left-0 right-0 lg:left-[248px] z-20 bg-card border-t border-border px-4 py-3 bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-0"
      >
        <div className="max-w-[960px] mx-auto grid grid-cols-2 lg:flex lg:justify-end gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => { setShowFeedback(v => !v); setTimeout(() => window.scrollTo({ top: 99999, behavior: 'smooth' }), 100); }}
          >
            {showFeedback ? 'Hide reply' : checkIn.coach_notes ? 'Edit reply' : 'Write a reply'}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={handleAdjustCalories}
            disabled={calAdjSaving || calAdjDone || !nutritionPlan}
            title={!nutritionPlan ? 'No nutrition plan assigned' : 'Lower daily calories by 150'}
          >
            {calAdjSaving && <Loader2 className="animate-spin" />}
            {calAdjDone ? <><Check className="text-success" /> Calories lowered</> : 'Calories −150'}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={handleIncreaseCardio}
            disabled={cardioSaving || cardioDone}
          >
            {cardioSaving && <Loader2 className="animate-spin" />}
            {cardioDone ? <><Check className="text-success" /> Cardio added</> : 'Add a cardio session'}
          </Button>
          <Button
            className="h-11"
            onClick={handleMarkReviewed}
            disabled={markSaving || isReviewed}
          >
            {markSaving && <Loader2 className="animate-spin" />}
            {isReviewed ? 'Reviewed' : 'Mark reviewed'}
          </Button>
        </div>
      </div>
    </div>
  );
}
