import { differenceInDays, parseISO } from 'date-fns';
import { checkInScore, averageAdherenceScore } from './adherence';

// `icon` values are lucide icon names (kebab-case), not emoji.

/**
 * Condition definitions: each returns { triggered: boolean, detail: string, affectedClients: [] }
 */

export const CONDITION_META = {
  missed_checkin: {
    label: 'Missed check-in',
    description: 'Client has not submitted a check-in',
    icon: 'clipboard',
    defaultThreshold: 10,
    thresholdLabel: 'days without check-in',
    thresholdType: 'days',
  },
  missed_workouts: {
    label: 'Missed workouts',
    description: 'Training compliance drops below threshold',
    icon: 'dumbbell',
    defaultThreshold: 60,
    thresholdLabel: '% training compliance',
    thresholdType: 'percent',
  },
  low_adherence: {
    label: 'Low adherence score',
    description: 'Overall adherence average falls below threshold',
    icon: 'trending-down',
    defaultThreshold: 60,
    thresholdLabel: '% average adherence',
    thresholdType: 'percent',
  },
  weight_plateau: {
    label: 'Weight plateau',
    description: 'No weight change over recent check-ins',
    icon: 'scale',
    defaultThreshold: 3,
    thresholdLabel: 'consecutive check-ins with <1 lb change',
    thresholdType: 'count',
  },
  low_nutrition: {
    label: 'Low nutrition compliance',
    description: 'Nutrition compliance below threshold',
    icon: 'utensils',
    defaultThreshold: 60,
    thresholdLabel: '% nutrition compliance',
    thresholdType: 'percent',
  },
  mood_low: {
    label: 'Low mood reported',
    description: 'Client reports stressed or tired mood',
    icon: 'frown',
    defaultThreshold: 2,
    thresholdLabel: 'consecutive low-mood check-ins',
    thresholdType: 'count',
  },
  no_progress: {
    label: 'No progress',
    description: 'Weight stalled for weight-loss clients',
    icon: 'ban',
    defaultThreshold: 4,
    thresholdLabel: 'check-ins with <1 lb change',
    thresholdType: 'count',
  },
  declining_trend: {
    label: 'Declining trend',
    description: 'Adherence scores dropping consecutively',
    icon: 'arrow-down-right',
    defaultThreshold: 3,
    thresholdLabel: 'consecutive declining check-ins',
    thresholdType: 'count',
  },
};

export const ACTION_META = {
  send_message: {
    label: 'Send message to client',
    icon: 'message',
    description: 'Send a pre-written message directly to the client',
    needsMessage: true,
  },
  send_template: {
    label: 'Send template message',
    icon: 'file-text',
    description: 'Send a coaching template message',
    needsMessage: true,
  },
  notify_coach: {
    label: 'Notify coach',
    icon: 'bell',
    description: 'Add a dashboard alert for the coach to review',
    needsMessage: false,
  },
  adjust_calories: {
    label: 'Adjust calorie target',
    icon: 'flame',
    description: 'Automatically adjust client calorie target',
    needsCalorieDelta: true,
  },
  flag_client: {
    label: 'Flag client as at risk',
    icon: 'flag',
    description: 'Mark client lifecycle status as at_risk',
    needsMessage: false,
  },
  suggest_adjustment: {
    label: 'Suggest plan adjustment',
    icon: 'lightbulb',
    description: 'Notify coach to review and adjust the client\'s plan',
    needsMessage: true,
  },
};

/**
 * Evaluate whether a single client triggers a rule's condition.
 * Returns { triggered: boolean, detail: string }
 */
export function evaluateCondition(rule, client, clientCheckIns) {
  const sorted = [...clientCheckIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];
  const threshold = rule.condition_threshold ?? CONDITION_META[rule.condition_type]?.defaultThreshold;

  switch (rule.condition_type) {
    case 'missed_checkin': {
      if (!latest) return { triggered: true, detail: 'No check-ins on record' };
      const days = differenceInDays(new Date(), parseISO(latest.date));
      return { triggered: days >= threshold, detail: `${days} days since last check-in (threshold: ${threshold})` };
    }
    case 'missed_workouts': {
      const recent = sorted.slice(0, 3);
      if (!recent.length) return { triggered: false, detail: 'No data' };
      const avg = recent.reduce((s, ci) => s + (ci.compliance_training ?? 100), 0) / recent.length;
      return { triggered: avg < threshold, detail: `Avg training compliance: ${Math.round(avg)}% (threshold: ${threshold}%)` };
    }
    case 'low_adherence': {
      const avg = averageAdherenceScore(sorted, 3);
      if (avg === null) return { triggered: false, detail: 'No data' };
      return { triggered: avg < threshold, detail: `Avg adherence: ${avg}% (threshold: ${threshold}%)` };
    }
    case 'weight_plateau': {
      const withWeight = sorted.filter(ci => ci.weight != null).slice(0, threshold + 1);
      if (withWeight.length < threshold) return { triggered: false, detail: 'Not enough weight data' };
      const range = Math.max(...withWeight.map(ci => ci.weight)) - Math.min(...withWeight.map(ci => ci.weight));
      return { triggered: range < 1, detail: `Weight range over last ${threshold} check-ins: ${range.toFixed(1)} lbs` };
    }
    case 'low_nutrition': {
      const recent = sorted.slice(0, 3);
      if (!recent.length) return { triggered: false, detail: 'No data' };
      const avg = recent.reduce((s, ci) => s + (ci.compliance_nutrition ?? 100), 0) / recent.length;
      return { triggered: avg < threshold, detail: `Avg nutrition compliance: ${Math.round(avg)}% (threshold: ${threshold}%)` };
    }
    case 'mood_low': {
      const lowMoodCount = sorted.slice(0, threshold).filter(ci => ci.mood === 'stressed' || ci.mood === 'tired').length;
      return { triggered: lowMoodCount >= threshold, detail: `${lowMoodCount} consecutive low-mood check-ins` };
    }
    case 'no_progress': {
      if (client.goal !== 'weight_loss') return { triggered: false, detail: 'Not a weight-loss client' };
      const withWeight = sorted.filter(ci => ci.weight != null).slice(0, threshold);
      if (withWeight.length < threshold) return { triggered: false, detail: 'Not enough data' };
      const range = Math.max(...withWeight.map(ci => ci.weight)) - Math.min(...withWeight.map(ci => ci.weight));
      return { triggered: range < 1, detail: `Weight stalled: ${range.toFixed(1)} lbs change` };
    }
    case 'declining_trend': {
      const scores = sorted.slice(0, threshold + 1).map(checkInScore).filter(s => s !== null);
      if (scores.length < threshold) return { triggered: false, detail: 'Not enough data' };
      let declining = 0;
      for (let i = 0; i < scores.length - 1; i++) {
        if (scores[i] < scores[i + 1]) declining++;
      }
      return { triggered: declining >= threshold - 1, detail: `${declining + 1} consecutive declining scores` };
    }
    default:
      return { triggered: false, detail: 'Unknown condition' };
  }
}

/**
 * Run all active rules against all clients. Returns array of { rule, client, detail }.
 */
export function runAutomations(rules, clients, checkIns) {
  const results = [];
  const activeRules = rules.filter(r => r.is_active);

  for (const rule of activeRules) {
    for (const client of clients) {
      if (client.lifecycle_status !== 'active' && client.status !== 'active') continue;
      const clientCheckIns = checkIns.filter(ci => ci.client_id === client.id);
      const result = evaluateCondition(rule, client, clientCheckIns);
      if (result.triggered) {
        results.push({ rule, client, detail: result.detail });
      }
    }
  }
  return results;
}

export const AUTOMATION_TEMPLATES = [
  {
    name: 'Missed Check-in Alert',
    description: 'Automatically message clients who miss their weekly check-in',
    condition_type: 'missed_checkin',
    condition_threshold: 10,
    action_type: 'send_message',
    action_message: "Hey, I noticed your weekly check-in didn't come in. How has training been going? Send me a message when you get a chance.",
    icon: 'clipboard',
    color: 'bg-secondary border-border text-foreground',
  },
  {
    name: 'Low Adherence Coach Alert',
    description: "Notify yourself when a client's adherence drops below 60%",
    condition_type: 'low_adherence',
    condition_threshold: 60,
    action_type: 'notify_coach',
    action_message: '',
    icon: 'trending-down',
    color: 'bg-destructive/10 border-destructive/20 text-destructive',
  },
  {
    name: 'Missed Workouts Message',
    description: 'Send a note when training compliance is below 60%',
    condition_type: 'missed_workouts',
    condition_threshold: 60,
    action_type: 'send_message',
    action_message: "Training has been a bit light recently. Life gets busy, so let's talk about adjusting the schedule to fit your week.",
    icon: 'dumbbell',
    color: 'bg-secondary border-border text-foreground',
  },
  {
    name: 'Weight Plateau Calorie Adjust',
    description: 'Reduce calories by 100 when weight stalls for 3 check-ins',
    condition_type: 'weight_plateau',
    condition_threshold: 3,
    action_type: 'adjust_calories',
    action_calorie_delta: -100,
    icon: 'scale',
    color: 'bg-secondary border-border text-foreground',
  },
  {
    name: 'Flag At-Risk Client',
    description: 'Auto-flag client when adherence and workouts both decline',
    condition_type: 'declining_trend',
    condition_threshold: 3,
    action_type: 'flag_client',
    action_message: '',
    icon: 'flag',
    color: 'bg-destructive/10 border-destructive/20 text-destructive',
  },
  {
    name: 'Low Mood Check-in',
    description: 'Send a supportive message when client reports stressed/tired',
    condition_type: 'mood_low',
    condition_threshold: 2,
    action_type: 'send_message',
    action_message: "Hey, it sounds like things have felt heavy lately, and that's normal. I'm here if you want to talk it through or ease off the plan for a week.",
    icon: 'frown',
    color: 'bg-secondary border-border text-foreground',
  },
];