/**
 * Small, pure helpers that turn a client + their check-ins into the plain
 * one-liners the Clients table and profile show ("No check-in for 9 days",
 * "Fat loss, week 2", "−5.8 lb", "Friday"). No fetching here.
 */
import { differenceInDays, differenceInCalendarDays, addDays, format, parseISO } from 'date-fns';
import { checkInScore } from '@/lib/adherence';

const DAY = 86400000;

export const GOAL_SHORT = {
  weight_loss: 'Fat loss',
  muscle_gain: 'Muscle gain',
  strength: 'Strength',
  endurance: 'Endurance',
  flexibility: 'Mobility',
  general_fitness: 'General fitness',
  recomp: 'Recomp',
};

export const PIPELINE_LABEL = {
  new_lead: 'New lead',
  dmd: 'Messaged',
  call_booked: 'Call booked',
  proposal_sent: 'Proposal sent',
  closed: 'Closed, not started',
  lost: 'Lead lost',
};

function toDate(v) {
  if (!v) return null;
  try {
    const d = typeof v === 'string' ? parseISO(v) : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Formats a number with a real minus sign: −5.8 / +2.6 */
export function signed(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const v = Math.abs(n).toFixed(digits);
  if (Number(v) === 0) return `0`;
  return `${n < 0 ? '−' : '+'}${v}`;
}

/** Weeks since the client started (1-based), or null. */
export function programWeek(client) {
  const start = toDate(client?.start_date) || toDate(client?.created_date);
  if (!start) return null;
  const days = differenceInDays(new Date(), start);
  if (days < 0) return null;
  return Math.floor(days / 7) + 1;
}

/** "Fat loss, week 2" */
export function programLine(client) {
  const status = client?.lifecycle_status || 'lead';
  const goal = GOAL_SHORT[client?.goal] || (client?.goal ? String(client.goal).replace(/_/g, ' ') : null);
  if (status === 'lead') return goal ? `${goal}, not started` : 'Not started';
  if (status === 'alumni' || status === 'completed') return goal ? `${goal}, finished` : 'Finished';
  const week = programWeek(client);
  const base = goal || 'General fitness';
  if (!client?.assigned_program_id) return `${base}, no program`;
  return week ? `${base}, week ${week}` : base;
}

/**
 * Last N weekly compliance cells, oldest first. Each cell is a 0–100 score,
 * 'missed' (expected a check-in, none came) or 'none' (before they started).
 */
export function weeklyCompliance(client, checkIns = [], weeks = 8) {
  const now = Date.now();
  const status = client?.lifecycle_status || 'lead';
  const start = toDate(client?.start_date) || toDate(client?.created_date);
  const firstCi = checkIns.length ? toDate(checkIns[checkIns.length - 1]?.date) : null;
  const startedAt = [start, firstCi].filter(Boolean).sort((a, b) => a - b)[0] || null;
  const cells = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY;
    const begin = end - 7 * DAY;
    const inWeek = checkIns.filter(ci => {
      const t = toDate(ci.date)?.getTime();
      return t !== undefined && t >= begin && t < end;
    });
    if (inWeek.length) {
      const scores = inWeek.map(checkInScore).filter(s => s !== null);
      cells.push(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100);
      continue;
    }
    if (status === 'lead' || !startedAt || startedAt.getTime() > end) { cells.push('none'); continue; }
    // A week they had barely started in is not a miss.
    if (startedAt.getTime() > begin) { cells.push('none'); continue; }
    cells.push('missed');
  }
  return cells;
}

/** Weight change across the window, e.g. { delta: -5.8, latest: 184.2, weeks: 6 } */
export function weightChange(checkIns = [], client, weeks = 8) {
  const cutoff = Date.now() - weeks * 7 * DAY;
  const withW = checkIns
    .filter(ci => ci.weight != null && toDate(ci.date))
    .sort((a, b) => toDate(a.date) - toDate(b.date));
  const inWindow = withW.filter(ci => toDate(ci.date).getTime() >= cutoff);
  const series = inWindow.length >= 2 ? inWindow : withW;
  if (series.length < 2) {
    const latest = series[0]?.weight ?? client?.current_weight ?? null;
    return { delta: null, latest, weeks: null };
  }
  const first = series[0];
  const last = series[series.length - 1];
  const spanWeeks = Math.max(1, Math.round(differenceInDays(toDate(last.date), toDate(first.date)) / 7));
  return { delta: +(last.weight - first.weight).toFixed(1), latest: last.weight, weeks: spanWeeks };
}

/** Next check-in label: "Overdue", "Today", "Friday", "Next week". */
export function nextCheckIn(client, lastCheckIn) {
  const status = client?.lifecycle_status || 'lead';
  if (status === 'lead') return { label: '—', overdue: false };
  if (status === 'alumni' || status === 'completed') return { label: '—', overdue: false };
  if (!lastCheckIn) return { label: 'First one due', overdue: false };
  const next = addDays(toDate(lastCheckIn.date), 7);
  const diff = differenceInCalendarDays(next, new Date());
  if (diff < 0) return { label: 'Overdue', overdue: true };
  if (diff === 0) return { label: 'Today', overdue: false };
  if (diff <= 6) return { label: format(next, 'EEEE'), overdue: false };
  return { label: 'Next week', overdue: false };
}

const RISK_COPY = {
  low_adherence: () => 'Compliance under 70%',
  low_sleep: () => 'Sleeping under 6 hours',
  negative_notes: () => 'Sounded low in the last check-in',
  missed_workouts: () => 'Skipping workouts',
  low_nutrition: () => 'Nutrition slipping',
  no_progress: () => 'Weight stalled for 4 check-ins',
  declining_trend: (f) => {
    const m = /for (\d+)/.exec(f.detail || '');
    return m ? `Compliance down ${m[1]} check-ins running` : 'Compliance trending down';
  },
  mood_low: (f) => {
    const m = /mood: (\w+)/.exec(f.detail || '');
    return m ? `Said they feel ${m[1]}` : 'Low mood reported';
  },
};

/**
 * One plain line about where the client is. `risk` is the evaluateClientRisk()
 * entry for this client (or null).
 */
export function statusLine(client, lastCheckIn, risk, checkInCount = 0) {
  const status = client?.lifecycle_status || 'lead';
  if (status === 'lead') {
    if (client?.pipeline_stage && PIPELINE_LABEL[client.pipeline_stage]) return PIPELINE_LABEL[client.pipeline_stage];
    return 'Lead, onboarding';
  }
  if (status === 'alumni') return 'Alumni';
  if (status === 'completed') return 'Program completed';

  const days = lastCheckIn ? differenceInDays(new Date(), toDate(lastCheckIn.date)) : null;
  if (!lastCheckIn) return checkInCount === 0 ? 'No check-ins yet' : 'No recent check-in';
  if (days >= 8) return `No check-in for ${days} days`;

  const flag = (risk?.flags || []).find(f => f.key !== 'missed_checkin');
  if (flag && RISK_COPY[flag.key]) return RISK_COPY[flag.key](flag);
  if (!client?.assigned_program_id) return 'No program assigned';
  if (status === 'at_risk') return 'Marked at risk';
  if (days === 0) return 'Checked in today';
  if (days === 1) return 'Checked in yesterday';
  return `Checked in ${days} days ago`;
}

/** True when the client should wear the red ring. */
export function needsYou(client, risk) {
  const status = client?.lifecycle_status || 'lead';
  if (status === 'at_risk') return true;
  return !!risk && risk.riskScore >= 30;
}

/** Overdue or never checked in, for active clients. */
export function checkInDue(client, lastCheckIn) {
  const status = client?.lifecycle_status || 'lead';
  if (status !== 'active' && status !== 'at_risk') return false;
  if (!lastCheckIn) return true;
  return differenceInDays(new Date(), toDate(lastCheckIn.date)) >= 7;
}
