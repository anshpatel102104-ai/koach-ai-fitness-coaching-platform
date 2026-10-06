import React, { useState, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { differenceInWeeks, differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/kit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ── Compute local stats to feed the AI ── */
function buildContext(client, checkIns, workoutSessions, program) {
  const sorted = [...checkIns].filter(ci => ci.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-8);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const weeks = first ? Math.max(1, differenceInWeeks(new Date(), parseISO(first.date)) + 1) : 1;
  const weightChange = first?.weight && last?.weight ? +(last.weight - first.weight).toFixed(1) : null;
  const weeklyWeightRate = weightChange && weeks ? +(weightChange / weeks).toFixed(2) : null;

  // Weight trend direction: last 4 check-ins
  const last4Weights = recent.slice(-4).filter(ci => ci.weight).map(ci => ci.weight);
  let weightTrend = 'stable';
  if (last4Weights.length >= 3) {
    const diffs = last4Weights.slice(1).map((w, i) => w - last4Weights[i]);
    const allDown = diffs.every(d => d < -0.1);
    const allUp = diffs.every(d => d > 0.1);
    if (allDown) weightTrend = 'consistently declining';
    else if (allUp) weightTrend = 'consistently increasing';
    else weightTrend = 'fluctuating';
  }

  // Mood trend
  const moodMap = { great: 5, good: 4, okay: 3, tired: 2, stressed: 1 };
  const recentMoods = recent.slice(-4).filter(ci => ci.mood).map(ci => moodMap[ci.mood]);
  const avgMood = recentMoods.length ? (recentMoods.reduce((s, m) => s + m, 0) / recentMoods.length).toFixed(1) : null;

  const avgTraining = recent.length ? Math.round(recent.reduce((s, ci) => s + (ci.compliance_training || 0), 0) / recent.length) : null;
  const avgNutrition = recent.length ? Math.round(recent.reduce((s, ci) => s + (ci.compliance_nutrition || 0), 0) / recent.length) : null;
  const avgEnergy = recent.length ? +(recent.filter(ci => ci.energy_level).reduce((s, ci) => s + ci.energy_level, 0) / Math.max(1, recent.filter(ci => ci.energy_level).length)).toFixed(1) : null;
  const avgStress = recent.length ? +(recent.filter(ci => ci.stress_level).reduce((s, ci) => s + ci.stress_level, 0) / Math.max(1, recent.filter(ci => ci.stress_level).length)).toFixed(1) : null;
  const avgSleep = recent.length ? +(recent.filter(ci => ci.sleep_hours).reduce((s, ci) => s + ci.sleep_hours, 0) / Math.max(1, recent.filter(ci => ci.sleep_hours).length)).toFixed(1) : null;

  // Workout completions this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const workoutsThisWeek = workoutSessions.filter(s => new Date(s.completed_at) >= weekAgo).length;

  // Goal pace
  let paceStatus = null;
  let weeksToGoal = null;
  if (client?.target_weight && last?.weight && weeklyWeightRate && weeklyWeightRate !== 0) {
    const remaining = last.weight - client.target_weight;
    weeksToGoal = Math.abs(Math.round(remaining / weeklyWeightRate));
    paceStatus = weeksToGoal <= 14 ? 'ahead' : weeksToGoal <= 20 ? 'on_track' : 'behind';
  }

  // Plateau detection
  const isWeightPlateau = last4Weights.length >= 4 && Math.max(...last4Weights) - Math.min(...last4Weights) < 0.5;

  // Churn risk factors
  const daysSinceLastCI = last ? differenceInDays(new Date(), parseISO(last.date)) : 999;
  const churnRisk = daysSinceLastCI > 14 ? 'high' : daysSinceLastCI > 7 ? 'moderate' : avgTraining !== null && avgTraining < 50 ? 'moderate' : 'low';

  return {
    weeks, weightChange, weeklyWeightRate, weightTrend, avgMood, avgTraining, avgNutrition,
    avgEnergy, avgStress, avgSleep, workoutsThisWeek, paceStatus, weeksToGoal,
    isWeightPlateau, churnRisk, checkInCount: sorted.length, daysSinceLastCI,
    currentWeight: last?.weight, startWeight: first?.weight,
    programTitle: program?.title, programWeeks: program?.duration_weeks,
    programPhase: weeks <= 4 ? 'early' : weeks <= 8 ? 'middle' : 'advanced',
  };
}


/* ── Trend line ── */
function TrendLine({ type, text }) {
  const dot = type === 'positive' ? 'bg-success' : type === 'negative' ? 'bg-destructive' : 'bg-muted-foreground';
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span className={cn('mt-[7px] h-2 w-2 rounded-full flex-shrink-0', dot)} />
      <span className="text-[15px] text-foreground leading-snug">{text}</span>
    </li>
  );
}

const READINESS = {
  progress: { label: 'Ready to progress', variant: 'success' },
  maintain: { label: 'Keep the current plan', variant: 'secondary' },
  deload: { label: 'Deload next week', variant: 'warning' },
  switch_program: { label: 'Time for a new program', variant: 'outline' },
};

const PACE = {
  ahead: { label: 'Ahead of pace', variant: 'success' },
  on_track: { label: 'On pace', variant: 'secondary' },
  behind: { label: 'Behind pace', variant: 'warning' },
};

/* ── Coach-facing detail panels ── */
function CoachAnalysisDetails({ analysis, ctx }) {
  const [showRecs, setShowRecs] = useState(true);
  const readiness = READINESS[analysis.readiness];
  const pace = PACE[ctx.paceStatus];
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Panel className="p-4 sm:p-5">
          <p className="text-[13px] text-muted-foreground mb-2">Program readiness</p>
          {readiness ? <Badge variant={readiness.variant}>{readiness.label}</Badge> : <p className="text-sm text-muted-foreground">Not enough signal yet</p>}
          {analysis.readiness_reason && <p className="text-sm text-foreground/80 mt-2 leading-snug">{analysis.readiness_reason}</p>}
        </Panel>
        <Panel className="p-4 sm:p-5">
          <p className="text-[13px] text-muted-foreground mb-2">Goal pace</p>
          {pace ? <Badge variant={pace.variant}>{pace.label}</Badge> : <p className="text-sm text-muted-foreground">No goal weight set</p>}
          {analysis.pace_analysis && <p className="text-sm text-foreground/80 mt-2 leading-snug">{analysis.pace_analysis}</p>}
        </Panel>
      </div>

      {analysis.trends?.length > 0 && (
        <Panel className="p-4 sm:p-5">
          <p className="text-[13px] text-muted-foreground">Trends</p>
          <ul className="divide-y divide-border">
            {analysis.trends.map((t, i) => <TrendLine key={i} type={t.type} text={t.text} />)}
          </ul>
        </Panel>
      )}

      {(analysis.plateau_warning || analysis.churn_insight) && (
        <Panel className="p-4 sm:p-5 border-l-[3px] border-l-destructive rounded-l-md">
          <p className="text-[13px] text-destructive font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Watch for
          </p>
          {analysis.plateau_warning && <p className="text-[15px] text-foreground mt-1.5">{analysis.plateau_warning}</p>}
          {analysis.churn_insight && <p className="text-[15px] text-foreground mt-1.5">{analysis.churn_insight}</p>}
        </Panel>
      )}

      {analysis.recommendations?.length > 0 && (
        <Panel className="p-4 sm:p-5">
          <button className="touch-compact flex items-center justify-between w-full" onClick={() => setShowRecs(s => !s)} aria-expanded={showRecs}>
            <p className="text-[13px] text-muted-foreground">What to do next</p>
            {showRecs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showRecs && (
            <ol className="mt-2 space-y-2">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-foreground leading-snug">
                  <span className="num text-[15px] text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  );
}

/* ── Client-facing simplified panel ── */
function ClientAnalysisPanel({ analysis }) {
  return (
    <div className="space-y-3">
      {analysis.headline && <p className="text-[17px] font-semibold">{analysis.headline}</p>}
      <p className="text-[15px] text-ai-foreground/85 leading-relaxed">{analysis.summary}</p>
      {analysis.insights?.length > 0 && (
        <ul className="space-y-2">
          {analysis.insights.map((ins, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[15px] text-ai-foreground/85 leading-relaxed">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-ai-foreground/60 flex-shrink-0" />
              {ins}
            </li>
          ))}
        </ul>
      )}
      {analysis.prediction && <p className="text-[15px] font-semibold">{analysis.prediction}</p>}
      {analysis.tip && <p className="text-sm text-ai-foreground/75">This week: {analysis.tip}</p>}
    </div>
  );
}

/* ── MAIN EXPORT ── */
export default function AIProgressAnalyzer({
  client, checkIns = [], workoutSessions = [], program = null,
  isClientFacing = false, autoGenerate = false, compact = false
}) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const ctx = buildContext(client, checkIns, workoutSessions, program);
  const hasEnoughData = checkIns.length >= 3;

  const generate = useCallback(async () => {
    if (!hasEnoughData) return;
    setLoading(true);
    setAnalysis(null);
    const res = await db.functions.invoke('aiProgressInsights', {
      action: 'progressAnalysis', client, ctx, isClientFacing,
    });
    setAnalysis(res.data);
    setGenerated(true);
    setLoading(false);
  }, [client, checkIns, workoutSessions, program, isClientFacing]);

  // Client-facing wrapper
  if (isClientFacing) {
    return (
      <section className="rounded-xl bg-ai text-ai-foreground p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[20px]">How it&apos;s going</h3>
          {generated && (
            <button onClick={generate} disabled={loading} className="touch-compact text-ai-foreground/60 hover:text-ai-foreground transition-colors" aria-label="Refresh">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          )}
        </div>

        {!hasEnoughData && (
          <p className="text-sm text-ai-foreground/70">After your third check-in you&apos;ll get a short read on your progress here.</p>
        )}

        {hasEnoughData && !generated && !loading && (
          <div>
            <p className="text-sm text-ai-foreground/70 mb-4">A short read on your weight, training and habits so far.</p>
            <Button variant="outline" className="bg-card text-foreground border-transparent hover:bg-card/90" onClick={generate}>Read my progress</Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm text-ai-foreground/70">Reading your check-ins</p>
          </div>
        )}

        {analysis && !loading && <ClientAnalysisPanel analysis={analysis} />}
      </section>
    );
  }

  // Coach-facing wrapper
  return (
    <div className="space-y-3">
      <section className="rounded-xl bg-ai text-ai-foreground">
        <button
          className="touch-compact w-full flex items-center justify-between gap-3 px-5 pt-5 pb-3 text-left"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          <h3 className="text-[22px]">What the AI sees</h3>
          <span className="flex items-center gap-2 text-ai-foreground/60">
            {generated && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Run the analysis again"
                onClick={e => { e.stopPropagation(); generate(); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); generate(); } }}
                className="p-1 rounded-md hover:text-ai-foreground"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </span>
            )}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {expanded && (
          <div className="px-5 pb-5">
            {!hasEnoughData && (
              <p className="text-[15px] text-ai-foreground/80">Needs three check-ins before there&apos;s anything worth reading. {checkIns.length} so far.</p>
            )}

            {hasEnoughData && !generated && !loading && (
              <>
                <p className="text-[15px] text-ai-foreground/80 mb-4">Reads all {checkIns.length} check-ins and their workouts, then says what changed and what to do about it.</p>
                <Button variant="outline" className="bg-card text-foreground border-transparent hover:bg-card/90" onClick={generate}>Analyze progress</Button>
              </>
            )}

            {loading && (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-[15px] text-ai-foreground/80">Reading {checkIns.length} check-ins</p>
              </div>
            )}

            {analysis && !loading && (
              <>
                <p className="text-[15px] leading-relaxed text-ai-foreground/90">{analysis.summary}</p>
                {analysis.coaching_priority && (
                  <p className="mt-3 text-[15px] font-semibold">Focus: {analysis.coaching_priority}</p>
                )}
                <p className="mt-3 text-[13px] text-ai-foreground/60">Based on {ctx.checkInCount} check-ins over {ctx.weeks} weeks.</p>
              </>
            )}
          </div>
        )}
      </section>

      {expanded && analysis && !loading && <CoachAnalysisDetails analysis={analysis} ctx={ctx} />}
    </div>
  );
}
