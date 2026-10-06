import { differenceInDays, parseISO, subWeeks } from 'date-fns';

/**
 * Sleep score: 7–9h = 100, 6–7h = 70, >9h = 80, <6h = 40
 */
function sleepScore(hours) {
  if (hours == null) return null;
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6) return 70;
  if (hours > 9) return 80;
  return 40;
}

/**
 * Check-in completion rate over the last N weeks.
 * Expects full client checkIn list sorted newest-first.
 * Returns 0–100.
 */
function checkInCompletionScore(checkIns, weeksBack = 4) {
  if (!checkIns.length) return 0;
  const cutoff = subWeeks(new Date(), weeksBack);
  const recent = checkIns.filter(ci => ci.date && parseISO(ci.date) >= cutoff);
  // Ideal: 1 check-in per week
  const expectedCount = weeksBack;
  return Math.min(100, Math.round((recent.length / expectedCount) * 100));
}

/**
 * Calculate composite adherence score (0–100) from a single check-in.
 * Weights: training 35%, nutrition 30%, sleep 20%, check-in streak 15%
 * (check-in streak not available at single-record level – falls back to 3 components)
 */
export function checkInScore(ci) {
  let score = 0;
  let weight = 0;

  if (ci.compliance_training != null) { score += ci.compliance_training * 0.35; weight += 0.35; }
  if (ci.compliance_nutrition != null) { score += ci.compliance_nutrition * 0.30; weight += 0.30; }
  const sl = sleepScore(ci.sleep_hours);
  if (sl !== null) { score += sl * 0.20; weight += 0.20; }

  if (weight === 0) return null;
  return Math.round(score / weight);
}

/**
 * Full composite adherence score using all four components:
 *  - workouts completed (35%)
 *  - nutrition compliance (30%)
 *  - sleep score (20%)
 *  - check-in completion (15%)
 */
export function compositeAdherenceScore(checkIns) {
  if (!checkIns.length) return null;

  const recent = checkIns.slice(0, 4);

  // Workout compliance (avg)
  const trainingVals = recent.map(ci => ci.compliance_training).filter(v => v != null);
  const trainingAvg = trainingVals.length ? trainingVals.reduce((a, b) => a + b, 0) / trainingVals.length : null;

  // Nutrition compliance (avg)
  const nutritionVals = recent.map(ci => ci.compliance_nutrition).filter(v => v != null);
  const nutritionAvg = nutritionVals.length ? nutritionVals.reduce((a, b) => a + b, 0) / nutritionVals.length : null;

  // Sleep score (avg)
  const sleepVals = recent.map(ci => sleepScore(ci.sleep_hours)).filter(v => v != null);
  const sleepAvg = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null;

  // Check-in completion
  const ciCompletion = checkInCompletionScore(checkIns);

  let score = 0;
  let weight = 0;

  if (trainingAvg != null) { score += trainingAvg * 0.35; weight += 0.35; }
  if (nutritionAvg != null) { score += nutritionAvg * 0.30; weight += 0.30; }
  if (sleepAvg != null)     { score += sleepAvg * 0.20; weight += 0.20; }
  score += ciCompletion * 0.15; weight += 0.15;

  if (weight === 0) return null;
  return Math.round(score / weight);
}

/**
 * Get the latest adherence score for a client from their check-ins.
 */
export function latestAdherenceScore(checkIns) {
  for (const ci of checkIns) {
    const s = checkInScore(ci);
    if (s !== null) return s;
  }
  return null;
}

/**
 * Average score over last N check-ins (single-check-in scores).
 * Use compositeAdherenceScore for the full 4-component score.
 */
export function averageAdherenceScore(checkIns, n = 4) {
  const recent = checkIns.slice(0, n).map(checkInScore).filter(s => s !== null);
  if (!recent.length) return null;
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

/**
 * Score colour class (design tokens) — success 80+, warning 60–79, destructive <60
 */
export function scoreColor(score) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

export function scoreBg(score) {
  if (score === null) return 'bg-secondary';
  if (score >= 80) return 'bg-success-soft border-success/30';
  if (score >= 60) return 'bg-warning-soft border-warning/30';
  return 'bg-destructive/10 border-destructive/30';
}

export function scoreLabel(score) {
  if (score === null) return 'No data';
  if (score >= 80) return 'On plan';
  if (score >= 60) return 'Partial';
  return 'At risk';
}

/**
 * Score breakdown for display (each component 0–100 + weight)
 */
export function scoreBreakdown(checkIns) {
  if (!checkIns.length) return null;
  const recent = checkIns.slice(0, 4);

  const trainingVals = recent.map(ci => ci.compliance_training).filter(v => v != null);
  const nutritionVals = recent.map(ci => ci.compliance_nutrition).filter(v => v != null);
  const sleepVals = recent.map(ci => sleepScore(ci.sleep_hours)).filter(v => v != null);
  const ciScore = checkInCompletionScore(checkIns);

  return {
    training:  { score: trainingVals.length  ? Math.round(trainingVals.reduce((a,b)=>a+b,0)/trainingVals.length) : null, weight: 35, label: 'Workouts' },
    nutrition: { score: nutritionVals.length ? Math.round(nutritionVals.reduce((a,b)=>a+b,0)/nutritionVals.length) : null, weight: 30, label: 'Nutrition' },
    sleep:     { score: sleepVals.length     ? Math.round(sleepVals.reduce((a,b)=>a+b,0)/sleepVals.length) : null,     weight: 20, label: 'Sleep' },
    checkin:   { score: ciScore, weight: 15, label: 'Check-ins' },
  };
}

/**
 * Calculate current streak: consecutive weekly check-ins.
 */
export function calculateStreak(checkIns) {
  if (!checkIns.length) return 0;
  const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = differenceInDays(parseISO(sorted[i].date), parseISO(sorted[i + 1].date));
    if (gap <= 8) streak++;
    else break;
  }
  return streak;
}

/**
 * Detect which badges a client should have earned (not yet persisted).
 */
export function detectEarnedBadges(checkIns) {
  const badges = [];
  const streak = calculateStreak(checkIns);

  if (streak >= 7) badges.push('streak_7');
  if (streak >= 14) badges.push('streak_14');
  if (streak >= 30) badges.push('streak_30');

  const recentScores = checkIns.slice(0, 4).map(checkInScore).filter(s => s !== null);
  if (recentScores.length >= 4 && recentScores.every(s => s >= 80)) badges.push('perfect_week');

  if (checkIns.length >= 2) {
    const latest = checkInScore(checkIns[0]);
    const prev = checkInScore(checkIns[1]);
    if (prev !== null && latest !== null && prev < 50 && latest >= 70) badges.push('comeback');
  }

  return badges;
}