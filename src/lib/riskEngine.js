import { differenceInDays, parseISO } from 'date-fns';
import { checkInScore, averageAdherenceScore } from './adherence';

const NEGATIVE_KEYWORDS = [
  'struggling', 'stressed', 'burnout', 'burned out', 'exhausted', 'overwhelmed',
  'giving up', 'can\'t', 'too hard', 'not motivated', 'depressed', 'anxious',
  'no energy', 'skipped', 'missed', 'failed', 'quit', 'tired', 'unmotivated',
];

function hasNegativeSentiment(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some(kw => lower.includes(kw));
}

const FLAGS = [
  {
    key: 'missed_checkin',
    label: 'Missed check-in',
    severity: 'high',
    icon: 'calendar',
    detect: ({ lastCheckIn }) => {
      if (!lastCheckIn) return { triggered: true, detail: 'No check-ins on record' };
      const days = differenceInDays(new Date(), parseISO(lastCheckIn.date));
      if (days >= 14) return { triggered: true, detail: `No check-in in ${days} days` };
      return { triggered: false };
    },
  },
  {
    key: 'low_adherence',
    label: 'Low adherence',
    severity: 'high',
    icon: 'zap',
    detect: ({ clientCheckIns }) => {
      const avg = averageAdherenceScore(clientCheckIns, 3);
      // Threshold updated to 70% per requirements
      if (avg !== null && avg < 70) return { triggered: true, detail: `Adherence averaging ${avg}%, under 70%` };
      return { triggered: false };
    },
  },
  {
    key: 'low_sleep',
    label: 'Poor sleep',
    severity: 'high',
    icon: 'moon',
    detect: ({ clientCheckIns }) => {
      const recent = clientCheckIns.slice(0, 3);
      const lowSleep = recent.filter(ci => ci.sleep_hours != null && ci.sleep_hours < 6);
      if (lowSleep.length >= 2) {
        const avg = (lowSleep.reduce((s, ci) => s + ci.sleep_hours, 0) / lowSleep.length).toFixed(1);
        return { triggered: true, detail: `Avg ${avg}h sleep in last ${recent.length} check-ins` };
      }
      if (recent.length > 0 && recent[0].sleep_hours != null && recent[0].sleep_hours < 5) {
        return { triggered: true, detail: `Last check-in: only ${recent[0].sleep_hours}h sleep` };
      }
      return { triggered: false };
    },
  },
  {
    key: 'negative_notes',
    label: 'Negative feedback',
    severity: 'high',
    icon: 'message',
    detect: ({ lastCheckIn }) => {
      if (!lastCheckIn) return { triggered: false };
      if (hasNegativeSentiment(lastCheckIn.notes)) {
        return { triggered: true, detail: 'Client notes contain signs of struggle or low motivation' };
      }
      return { triggered: false };
    },
  },
  {
    key: 'missed_workouts',
    label: 'Missed workouts',
    severity: 'medium',
    icon: 'dumbbell',
    detect: ({ clientCheckIns }) => {
      const recent = clientCheckIns.slice(0, 3);
      const lowTraining = recent.filter(ci => ci.compliance_training != null && ci.compliance_training < 60);
      if (lowTraining.length >= 2)
        return { triggered: true, detail: `Training compliance <60% in last ${recent.length} check-ins` };
      return { triggered: false };
    },
  },
  {
    key: 'low_nutrition',
    label: 'Nutrition off-track',
    severity: 'medium',
    icon: 'utensils',
    detect: ({ clientCheckIns }) => {
      const recent = clientCheckIns.slice(0, 3);
      const low = recent.filter(ci => ci.compliance_nutrition != null && ci.compliance_nutrition < 55);
      if (low.length >= 2) return { triggered: true, detail: `Nutrition compliance <55% recently` };
      return { triggered: false };
    },
  },
  {
    key: 'no_progress',
    label: 'No weight progress',
    severity: 'medium',
    icon: 'scale',
    detect: ({ clientCheckIns, client }) => {
      const withWeight = clientCheckIns.filter(ci => ci.weight != null);
      if (withWeight.length < 3) return { triggered: false };
      if (client.goal === 'weight_loss') {
        const weights = withWeight.slice(0, 4).map(ci => ci.weight);
        const range = Math.max(...weights) - Math.min(...weights);
        if (range < 1) return { triggered: true, detail: 'Weight stalled for last 4 check-ins' };
      }
      return { triggered: false };
    },
  },
  {
    key: 'declining_trend',
    label: 'Declining scores',
    severity: 'medium',
    icon: 'trending-down',
    detect: ({ clientCheckIns }) => {
      if (clientCheckIns.length < 3) return { triggered: false };
      const scores = clientCheckIns.slice(0, 4).map(checkInScore).filter(s => s !== null);
      if (scores.length < 3) return { triggered: false };
      let declining = 0;
      for (let i = 0; i < scores.length - 1; i++) {
        if (scores[i] < scores[i + 1]) declining++;
      }
      if (declining >= 2) return { triggered: true, detail: `Adherence dropping for ${declining + 1} check-ins` };
      return { triggered: false };
    },
  },
  {
    key: 'mood_low',
    label: 'Low mood reported',
    severity: 'low',
    icon: 'frown',
    detect: ({ lastCheckIn }) => {
      if (!lastCheckIn) return { triggered: false };
      if (lastCheckIn.mood === 'stressed' || lastCheckIn.mood === 'tired')
        return { triggered: true, detail: `Reported mood: ${lastCheckIn.mood}` };
      return { triggered: false };
    },
  },
];

export function evaluateClientRisk(client, allCheckIns) {
  const clientCheckIns = allCheckIns
    .filter(ci => ci.client_id === client.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const lastCheckIn = clientCheckIns[0] || null;
  const ctx = { client, clientCheckIns, lastCheckIn };

  const triggered = [];
  for (const flag of FLAGS) {
    const result = flag.detect(ctx);
    if (result.triggered) {
      triggered.push({ ...flag, detail: result.detail });
    }
  }

  if (!triggered.length) return null;

  const score = triggered.reduce((acc, f) => {
    return acc + (f.severity === 'high' ? 30 : f.severity === 'medium' ? 15 : 5);
  }, 0);

  return {
    client,
    flags: triggered,
    riskScore: Math.min(score, 100),
    lastCheckIn,
    lastCheckInDate: lastCheckIn?.date || null,
    clientCheckIns,
  };
}

export function getAtRiskClients(clients, checkIns) {
  return clients
    .filter(c => c.lifecycle_status === 'active' || c.status === 'active')
    .map(c => evaluateClientRisk(c, checkIns))
    .filter(Boolean)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export const SEVERITY_CONFIG = {
  high:   { color: 'text-destructive bg-destructive/10 border-destructive/20', dot: 'bg-destructive' },
  medium: { color: 'text-warning bg-warning-soft border-warning/20', dot: 'bg-partial' },
  low:    { color: 'text-muted-foreground bg-secondary border-border', dot: 'bg-muted-foreground' },
};

// Short plain-word tags for each flag's `icon` key (no emoji). Callers that
// want a pictogram should map the key to a lucide icon themselves.
export const FLAG_ICONS = {
  calendar: 'Check-in',
  zap: 'Adherence',
  moon: 'Sleep',
  message: 'Notes',
  dumbbell: 'Training',
  utensils: 'Nutrition',
  scale: 'Weight',
  'trending-down': 'Trend',
  frown: 'Mood',
};