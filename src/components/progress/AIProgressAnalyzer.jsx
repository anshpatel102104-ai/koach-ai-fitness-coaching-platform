import React, { useState, useCallback } from 'react';
import { db } from '@/api/supabaseClient';
import { differenceInWeeks, differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, TrendingUp, AlertTriangle,
  Target, Loader2, RefreshCw, ChevronDown, ChevronUp, Brain, BarChart2, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

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


/* ── Trend Badge ── */
function TrendBadge({ type, text }) {
  const config = {
    positive: { bg: 'bg-success/10 border-success text-success', icon: TrendingUp, iconColor: 'text-success' },
    negative: { bg: 'bg-destructive/10 border-destructive text-destructive', icon: AlertTriangle, iconColor: 'text-destructive' },
    neutral: { bg: 'bg-accent border-primary text-primary', icon: BarChart2, iconColor: 'text-primary' },
  }[type] || { bg: 'bg-muted border-border text-muted-foreground', icon: BarChart2, iconColor: 'text-muted-foreground' };
  const Icon = config.icon;
  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-xl border text-xs leading-relaxed', config.bg)}>
      <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <span>{text}</span>
    </div>
  );
}

/* ── Readiness Badge ── */
function ReadinessBadge({ readiness }) {
  const config = {
    progress: { label: '↑ Ready to Progress', bg: 'bg-success/10 text-success border-success' },
    maintain: { label: '→ Maintain Current', bg: 'bg-accent text-primary border-primary' },
    deload: { label: '↓ Recommend Deload', bg: 'bg-warning/10 text-warning border-warning' },
    switch_program: { label: '⟳ Time for New Program', bg: 'bg-ai/10 text-ai border-ai' },
  }[readiness] || { label: '— Unknown', bg: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={cn('text-xs font-bold px-3 py-1 rounded-full border', config.bg)}>{config.label}</span>
  );
}

/* ── Coach-facing full analysis panel ── */
function CoachAnalysisPanel({ analysis, ctx }) {
  const [showRecs, setShowRecs] = useState(false);
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">AI Summary</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
        {analysis.coaching_priority && (
          <div className="mt-3 flex items-start gap-2 bg-primary/5 rounded-xl p-3">
            <Target className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-primary">{analysis.coaching_priority}</p>
          </div>
        )}
      </div>

      {/* Readiness + Pace */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Program Readiness</p>
          {analysis.readiness && <ReadinessBadge readiness={analysis.readiness} />}
          {analysis.readiness_reason && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{analysis.readiness_reason}</p>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Goal Pace</p>
          <div className={cn('text-xs font-bold px-2.5 py-1 rounded-full inline-block',
            ctx.paceStatus === 'ahead' ? 'bg-success/10 text-success' :
            ctx.paceStatus === 'on_track' ? 'bg-accent text-primary' :
            ctx.paceStatus === 'behind' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
          )}>
            {ctx.paceStatus === 'ahead' ? '🟢 Ahead of Pace' :
             ctx.paceStatus === 'on_track' ? '🔵 On Pace' :
             ctx.paceStatus === 'behind' ? '🟡 Behind Pace' : '— No goal set'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{analysis.pace_analysis}</p>
        </div>
      </div>

      {/* Trends */}
      {analysis.trends?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Detected Trends</p>
          <div className="space-y-2">
            {analysis.trends.map((t, i) => <TrendBadge key={i} type={t.type} text={t.text} />)}
          </div>
        </div>
      )}

      {/* Warnings */}
      {(analysis.plateau_warning || analysis.churn_insight) && (
        <div className="bg-warning/10 border border-warning rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-warning uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Alerts
          </p>
          {analysis.plateau_warning && <p className="text-xs text-warning">{analysis.plateau_warning}</p>}
          {analysis.churn_insight && <p className="text-xs text-warning">{analysis.churn_insight}</p>}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <button className="flex items-center justify-between w-full" onClick={() => setShowRecs(s => !s)}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Recommendations</p>
            {showRecs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showRecs && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 mt-3">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-[10px]">{i + 1}</span>
                      {r}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── Client-facing simplified panel ── */
function ClientAnalysisPanel({ analysis }) {
  return (
    <div className="space-y-3">
      {analysis.headline && (
        <div className="text-center py-2">
          <p className="text-white font-bold text-base">{analysis.headline}</p>
        </div>
      )}
      <p className="text-white/70 text-sm leading-relaxed">{analysis.summary}</p>
      {analysis.insights?.map((ins, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-xl" style={{ background: 'color-mix(in srgb, white 6%, transparent)' }}>
          <span className="text-base flex-shrink-0">{'💡🎯🏆✨'[i] || '⭐'}</span>
          <p className="text-white/70 text-sm leading-relaxed">{ins}</p>
        </div>
      ))}
      {analysis.prediction && (
        <div className="px-3 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--tc-success) 15%, transparent), color-mix(in srgb, var(--tc-success) 10%, transparent))', border: '1px solid color-mix(in srgb, var(--tc-success) 25%, transparent)' }}>
          <p className="text-success text-sm font-semibold">🎯 {analysis.prediction}</p>
        </div>
      )}
      {analysis.tip && (
        <div className="px-3 py-2.5 rounded-xl" style={{ background: 'color-mix(in srgb, var(--tc-primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--tc-primary) 25%, transparent)' }}>
          <p className="text-primary text-xs font-semibold">💡 This week: {analysis.tip}</p>
        </div>
      )}
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
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--tc-ai) 12%, transparent), color-mix(in srgb, var(--tc-primary) 10%, transparent))', border: '1px solid color-mix(in srgb, var(--tc-ai) 20%, transparent)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ai" />
            <p className="text-white font-bold text-sm">AI Progress Insights</p>
          </div>
          {generated && (
            <button onClick={generate} disabled={loading} className="text-white/30 hover:text-white/60 transition-colors">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          )}
        </div>

        {!hasEnoughData && (
          <p className="text-white/30 text-xs text-center py-4">Submit at least 3 check-ins to unlock AI insights 📊</p>
        )}

        {hasEnoughData && !generated && !loading && (
          <div className="text-center py-4">
            <p className="text-white/30 text-xs mb-3">Get personalized AI insights based on your data</p>
            <button onClick={generate} className="px-5 py-2 rounded-xl text-xs font-bold text-primary-foreground" style={{ background: 'linear-gradient(135deg, var(--tc-ai), var(--tc-primary))' }}>
              ✨ Get My Insights
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <div className="w-4 h-4 border-2 border-ai/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="text-white/40 text-xs">Analyzing your progress...</p>
          </div>
        )}

        {analysis && !loading && <ClientAnalysisPanel analysis={analysis} />}
      </div>
    );
  }

  // Coach-facing wrapper
  return (
    <div className="bg-gradient-to-br from-accent/10 to-ai/10 border border-primary/20 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">AI Progress Analyzer</p>
            {analysis?.coaching_priority && (
              <p className="text-[10px] text-primary truncate max-w-xs">{analysis.coaching_priority}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generated && (
            <button onClick={e => { e.stopPropagation(); generate(); }} disabled={loading}
              className="p-1 rounded-lg hover:bg-[var(--kc-w-50)] transition-colors text-muted-foreground">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              {!hasEnoughData && (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Not enough data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">AI insights appear after 3+ check-ins (currently {checkIns.length})</p>
                </div>
              )}

              {hasEnoughData && !generated && !loading && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground mb-3">Generate an intelligent analysis of this client's full progress data</p>
                  <button onClick={generate}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                    <Sparkles className="w-4 h-4" /> Analyze Progress
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing {checkIns.length} check-ins...</p>
                </div>
              )}

              {analysis && !loading && <CoachAnalysisPanel analysis={analysis} ctx={ctx} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}