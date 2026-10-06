/**
 * Decision Engine — analyzes client check-in data and returns ranked coaching recommendations.
 *
 * Each recommendation:
 *  { id, priority, category, title, reason, action, actionLabel, actionData }
 *
 * priority: 'critical' | 'high' | 'medium' | 'low'
 * category: 'nutrition' | 'cardio' | 'training' | 'recovery' | 'engagement'
 * action:   'adjust_calories' | 'adjust_cardio' | 'maintain' | 'message'
 */

import { compositeAdherenceScore, checkInScore } from './adherence';
import { differenceInDays, parseISO } from 'date-fns';

/* ─── helpers ─── */
function avg(arr) {
  const vals = arr.filter(v => v != null);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function weightTrend(checkIns, n = 4) {
  const weights = checkIns.slice(0, n).map(ci => ci.weight).filter(w => w != null);
  if (weights.length < 2) return null;
  const oldest = weights[weights.length - 1];
  const newest = weights[0];
  const delta = +(newest - oldest).toFixed(1);
  const weeks = weights.length;
  return {
    direction: delta < -0.5 ? 'down' : delta > 0.5 ? 'up' : 'flat',
    delta,
    weeks,
    lbsPerWeek: weeks > 1 ? +(delta / (weeks - 1)).toFixed(2) : 0,
  };
}

function stressAvg(checkIns, n = 3) {
  return avg(checkIns.slice(0, n).map(ci => ci.stress_level));
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/* ─── main export ─── */
export function generateRecommendations(checkIn, client, allClientCIs = []) {
  if (!checkIn) return [];
  const recs = [];
  const recent = allClientCIs.slice(0, 4);

  const adherence    = compositeAdherenceScore(allClientCIs);
  const avgTraining  = avg(recent.map(ci => ci.compliance_training));
  const avgNutrition = avg(recent.map(ci => ci.compliance_nutrition));
  const avgSleep     = avg(recent.map(ci => ci.sleep_hours));
  const avgEnergy    = avg(recent.map(ci => ci.energy_level));
  const avgStress    = stressAvg(allClientCIs);
  const trend        = weightTrend(allClientCIs);
  const goal         = client?.goal || 'general_fitness';
  const hasNutrition = !!client?.assigned_nutrition_id;

  // Days since last check-in
  const daysSinceCI = checkIn.date ? differenceInDays(new Date(), parseISO(checkIn.date)) : null;

  /* ── 1. Missed check-in / no engagement ── */
  if (daysSinceCI !== null && daysSinceCI > 10 && !checkIn.coach_responded) {
    recs.push({
      id: 'missed-checkin',
      priority: daysSinceCI > 14 ? 'critical' : 'high',
      category: 'engagement',
      title: `No reply in ${daysSinceCI} days`,
      reason: `Their check-in came in ${daysSinceCI} days ago and hasn't had a reply. Send a short note so they know you saw it.`,
      action: 'message',
      actionLabel: 'Send note',
      actionData: {
        content: `Hey, it's been a while since we connected. How are things going? Send me a quick update when you can so I can keep your plan on track.`,
        tag: 'check_in',
      },
    });
  }

  /* ── 2. Weight gaining on weight-loss goal ── */
  if (goal === 'weight_loss' && trend && trend.direction === 'up' && trend.delta > 1) {
    recs.push({
      id: 'weight-gaining',
      priority: 'critical',
      category: 'nutrition',
      title: `Up ${trend.delta} lb on a fat-loss goal`,
      reason: `Gained ${trend.delta} lb over ${trend.weeks} check-ins. Either the deficit is too small or nutrition is off plan.`,
      action: 'adjust_calories',
      actionLabel: 'Cut 250 kcal',
      actionData: { delta: -250 },
    });
  }

  /* ── 3. Low training compliance ── */
  if (avgTraining !== null && avgTraining < 60) {
    recs.push({
      id: 'low-training',
      priority: avgTraining < 40 ? 'critical' : 'high',
      category: 'training',
      title: `Training at ${Math.round(avgTraining)}%`,
      reason: `Training compliance has averaged ${Math.round(avgTraining)}% over 4 check-ins. Ask what's getting in the way.`,
      action: 'message',
      actionLabel: 'Send message',
      actionData: {
        content: `Hey, your training has been around ${Math.round(avgTraining)}% lately. What's been getting in the way of your workouts? Let's work out a plan you can stick to.`,
        tag: 'training',
      },
    });
  }

  /* ── 4. Weight plateau on weight-loss goal ── */
  if (goal === 'weight_loss' && trend && trend.direction === 'flat' && trend.weeks >= 2) {
    // If nutrition is great, add cardio; otherwise cut calories
    if (avgNutrition !== null && avgNutrition >= 85) {
      recs.push({
        id: 'plateau-add-cardio',
        priority: 'high',
        category: 'cardio',
        title: 'Weight flat, nutrition on plan',
        reason: `Weight flat for ${trend.weeks} check-ins with nutrition at ${Math.round(avgNutrition)}%. Add cardio to widen the deficit.`,
        action: 'adjust_cardio',
        actionLabel: 'Add cardio',
        actionData: { direction: 'up' },
      });
    } else {
      recs.push({
        id: 'weight-plateau',
        priority: 'high',
        category: 'nutrition',
        title: 'Weight flat',
        reason: `Weight has stayed flat for ${trend.weeks} check-ins. A small calorie cut should get it moving.`,
        action: 'adjust_calories',
        actionLabel: 'Cut 150 kcal',
        actionData: { delta: -150 },
      });
    }
  }

  /* ── 5. Low nutrition compliance → simplify the plan ── */
  if (avgNutrition !== null && avgNutrition < 65 && hasNutrition) {
    recs.push({
      id: 'low-nutrition',
      priority: avgNutrition < 50 ? 'high' : 'medium',
      category: 'nutrition',
      title: `Nutrition at ${Math.round(avgNutrition)}%`,
      reason: `Nutrition compliance has averaged ${Math.round(avgNutrition)}% over 4 weeks. The targets may be too ambitious; an easier target is easier to hit.`,
      action: 'adjust_calories',
      actionLabel: 'Cut 150 kcal',
      actionData: { delta: -150 },
    });
  }

  /* ── 6. Rapid weight loss → protect muscle ── */
  if (trend && trend.direction === 'down' && trend.lbsPerWeek < -1.2) {
    recs.push({
      id: 'rapid-loss',
      priority: 'high',
      category: 'nutrition',
      title: `Losing ${Math.abs(trend.lbsPerWeek)} lb a week`,
      reason: `About ${Math.abs(trend.lbsPerWeek)} lb a week, faster than the 0.5–1 lb range. Add calories to protect muscle.`,
      action: 'adjust_calories',
      actionLabel: 'Add 150 kcal',
      actionData: { delta: +150 },
    });
  }

  /* ── 7. Muscle gain: not in surplus ── */
  if (goal === 'muscle_gain' && trend && (trend.direction === 'flat' || trend.direction === 'down')) {
    recs.push({
      id: 'muscle-no-gain',
      priority: 'medium',
      category: 'nutrition',
      title: 'Not gaining on a muscle-gain goal',
      reason: `Weight is ${trend.direction}, so they aren't in a surplus. Add calories to support muscle gain.`,
      action: 'adjust_calories',
      actionLabel: 'Add 200 kcal',
      actionData: { delta: +200 },
    });
  }

  /* ── 8. Chronically poor sleep ── */
  if (avgSleep !== null && avgSleep < 6.5) {
    recs.push({
      id: 'poor-sleep',
      priority: 'medium',
      category: 'recovery',
      title: `Sleeping ${avgSleep.toFixed(1)} hours a night`,
      reason: `Sleep is averaging ${avgSleep.toFixed(1)} hours. Under 7 hours slows recovery and fat loss; ease the cardio load.`,
      action: 'message',
      actionLabel: 'Send sleep note',
      actionData: {
        content: `Your sleep has been averaging ${avgSleep.toFixed(1)} hours lately, and that's holding back your recovery. This week, aim for a consistent bedtime and no screens 30 minutes before bed. Let me know if stress is part of it.`,
        tag: 'general',
      },
    });
  }

  /* ── 9. Chronically high stress ── */
  if (avgStress !== null && avgStress >= 4) {
    recs.push({
      id: 'high-stress',
      priority: checkIn.stress_level >= 5 ? 'high' : 'medium',
      category: 'recovery',
      title: `Stress at ${avgStress.toFixed(1)}/10`,
      reason: `Stress has averaged ${avgStress.toFixed(1)}/10 over recent check-ins. That slows recovery and fat loss; ease training volume.`,
      action: 'message',
      actionLabel: 'Send support note',
      actionData: {
        content: `I can see stress has been high lately, and it matters. It makes fat loss harder and recovery slower, so let's keep this week light: movement you enjoy, solid sleep, and just showing up.`,
        tag: 'motivation',
      },
    });
  }

  /* ── 10. Low energy → reduce cardio ── */
  if (avgEnergy !== null && avgEnergy < 3) {
    recs.push({
      id: 'low-energy',
      priority: 'medium',
      category: 'recovery',
      title: `Energy at ${avgEnergy.toFixed(1)}/10`,
      reason: `Energy has averaged ${avgEnergy.toFixed(1)}/10, a sign of overtraining or under-eating. Cut back cardio this week.`,
      action: 'adjust_cardio',
      actionLabel: 'Reduce cardio',
      actionData: { direction: 'down' },
    });
  }

  /* ── 11. Everything looks great → maintain ── */
  if (recs.length === 0) {
    if (adherence !== null && adherence >= 80) {
      recs.push({
        id: 'maintain',
        priority: 'low',
        category: 'training',
        title: 'On plan, no changes',
        reason: `Adherence is ${adherence}% and every trend is steady. Keep the plan as it is.`,
        action: 'maintain',
        actionLabel: 'Mark reviewed',
        actionData: null,
      });
    } else {
      // Not enough data — send check-in prompt
      recs.push({
        id: 'check-in-prompt',
        priority: 'low',
        category: 'engagement',
        title: 'Not enough data yet',
        reason: 'There isn\'t enough history for a specific change. Ask for a check-in to fill the gaps.',
        action: 'message',
        actionLabel: 'Ask for check-in',
        actionData: {
          content: `Hey, how's this week going? Send me a quick update on your energy, workouts and how nutrition is feeling so I can adjust your plan.`,
          tag: 'check_in',
        },
      });
    }
  }

  return recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/* ─── Top recommendation summary (single line) ─── */
export function getTopRecommendation(checkIn, client, allClientCIs = []) {
  const recs = generateRecommendations(checkIn, client, allClientCIs);
  return recs[0] || null;
}

export const PRIORITY_STYLES = {
  critical: { bar: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30', dot: 'bg-destructive', text: 'text-destructive' },
  high:     { bar: 'bg-partial',     badge: 'bg-warning-soft text-warning border-warning/30',             dot: 'bg-partial',          text: 'text-warning' },
  medium:   { bar: 'bg-foreground',  badge: 'bg-secondary text-foreground border-border',                 dot: 'bg-foreground',       text: 'text-foreground' },
  low:      { bar: 'bg-success',     badge: 'bg-success-soft text-success border-success/30',             dot: 'bg-success',          text: 'text-success' },
};

// Plain-word category tags (no emoji). Callers render these as text.
export const CATEGORY_ICONS = {
  nutrition:  'Nutrition',
  cardio:     'Cardio',
  training:   'Training',
  recovery:   'Recovery',
  engagement: 'Check-in',
};