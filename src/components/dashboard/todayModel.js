/**
 * Pure helpers that turn the coach's real data (clients, check-ins, messages)
 * into the shapes the Today screen and the roster pages draw: weekly
 * compliance strips, plain-language risk lines, unread threads.
 * Nothing in here invents data — every number comes from a record.
 */
import {
  addDays, differenceInDays, format, getISOWeek, isValid, parseISO, startOfWeek, subWeeks,
} from 'date-fns';
import { averageAdherenceScore, checkInScore, compositeAdherenceScore } from '@/lib/adherence';

export const isActiveClient = (c) => c?.status === 'active' || c?.lifecycle_status === 'active';

const toDate = (v) => {
  if (!v) return null;
  const d = typeof v === 'string' ? parseISO(v) : new Date(v);
  return isValid(d) ? d : null;
};

/** client_id -> check-ins sorted newest first. */
export function groupCheckIns(checkIns = []) {
  const map = {};
  for (const ci of checkIns) {
    if (!ci?.client_id) continue;
    (map[ci.client_id] = map[ci.client_id] || []).push(ci);
  }
  Object.values(map).forEach(list => list.sort((a, b) => new Date(b.date) - new Date(a.date)));
  return map;
}

/** Remove emoji and stray pictographs from engine-generated copy. */
export function stripEmoji(str = '') {
  return String(str)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

/** "View Progress" -> "View progress". Leaves the first letter alone. */
export function sentenceCase(str = '') {
  const s = String(str).trim();
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

/** Calm the engine copy: no emoji, no exclamation marks. */
export function calmCopy(str = '') {
  return stripEmoji(str)
    // The insight engine uses 999 as "never" for clients with no check-ins.
    .replace(/hasn't checked in for 999 days[^.]*/g, 'hasn\'t sent a first check-in yet')
    .replace(/in 999 days/g, 'since joining')
    .replace(/!+/g, '.')
    .replace(/\.\.+/g, '.');
}

/** ISO week labels for the last `weeks` weeks, oldest first: ["W35", … "W42"]. */
export function weekLabels(weeks = 8, now = new Date()) {
  return Array.from({ length: weeks }, (_, i) => `W${getISOWeek(subWeeks(now, weeks - 1 - i))}`);
}

/**
 * Weekly compliance cells for one client, oldest first.
 * - a week with check-ins -> its average check-in score (0–100) or 'on' if
 *   the check-in carried no compliance numbers
 * - a finished week after the client started with no check-in -> 'missed'
 * - weeks before they started, and the current week if nothing is in yet -> 'none'
 */
export function weeklyCompliance(client, clientCheckIns = [], weeks = 8, now = new Date()) {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const earliestCi = clientCheckIns.length ? toDate(clientCheckIns[clientCheckIns.length - 1].date) : null;
  const joined = toDate(client?.start_date) || toDate(client?.created_date);
  const startedAt = [earliestCi, joined].filter(Boolean).sort((a, b) => a - b)[0] || null;

  return Array.from({ length: weeks }, (_, i) => {
    const wkStart = subWeeks(thisWeek, weeks - 1 - i);
    const wkEnd = addDays(wkStart, 7);
    const inWeek = clientCheckIns.filter(ci => {
      const d = toDate(ci.date);
      return d && d >= wkStart && d < wkEnd;
    });
    if (inWeek.length) {
      const scores = inWeek.map(checkInScore).filter(s => s !== null);
      if (!scores.length) return 'on';
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    const isCurrent = i === weeks - 1;
    if (isCurrent) return 'none';
    if (!startedAt || addDays(wkStart, 6) < startedAt) return 'none';
    return 'missed';
  });
}

/** Roster rows for the compliance grid, best first, clients with no data last. */
export function rosterPulseRows(clients = [], ciMap = {}, weeks = 8, now = new Date()) {
  return clients
    .filter(isActiveClient)
    .map(client => {
      const cis = ciMap[client.id] || [];
      return {
        client,
        cells: weeklyCompliance(client, cis, weeks, now),
        score: compositeAdherenceScore(cis),
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

/** One plain sentence for a riskEngine flag. */
export function describeFlag(flag, clientCheckIns = []) {
  if (!flag) return '';
  const last = clientCheckIns[0];
  switch (flag.key) {
    case 'missed_checkin': {
      if (!last) return 'Hasn\'t sent a check-in yet';
      const d = differenceInDays(new Date(), parseISO(last.date));
      return `No check-in for ${d} days`;
    }
    case 'low_adherence': {
      const avg = averageAdherenceScore(clientCheckIns, 3);
      return avg !== null ? `Compliance fell to ${avg}%` : 'Compliance is slipping';
    }
    case 'low_sleep': return flag.detail ? flag.detail.replace(/^Avg /, 'Averaging ') : 'Sleeping under 6 hours';
    case 'negative_notes': return 'Sounded low in the last check-in';
    case 'missed_workouts': return 'Training under 60% two weeks running';
    case 'low_nutrition': return 'Nutrition under 55% lately';
    case 'no_progress': return 'Weight hasn\'t moved in 4 check-ins';
    case 'declining_trend': return flag.detail ? flag.detail.replace('Adherence dropping for', 'Scores down') : 'Scores trending down';
    case 'mood_low': return last?.mood ? `Says they feel ${last.mood}` : 'Mood is low';
    default: return flag.detail || flag.label || '';
  }
}

/** Short summary of a check-in for a queue row: "Down 1.4 lb, training 92%". */
export function describeCheckIn(ci, clientCheckIns = []) {
  if (!ci) return '';
  const parts = [];
  const idx = clientCheckIns.findIndex(x => x.id === ci.id);
  const prev = idx >= 0 ? clientCheckIns.slice(idx + 1).find(x => x.weight != null) : null;
  if (ci.weight != null && prev?.weight != null) {
    const diff = Math.round((Number(ci.weight) - Number(prev.weight)) * 10) / 10;
    parts.push(diff === 0 ? 'Weight steady' : `${diff < 0 ? 'Down' : 'Up'} ${Math.abs(diff)} lb`);
  }
  if (ci.compliance_training != null) parts.push(`training ${Math.round(ci.compliance_training)}%`);
  if (!parts.length && ci.notes) return ci.notes;
  if (!parts.length) {
    const d = toDate(ci.date);
    return d ? `Sent ${format(d, 'EEE, MMM d')}` : 'New check-in';
  }
  const s = parts.join(', ');
  return s[0].toUpperCase() + s.slice(1);
}

/** Unread client messages grouped into threads, newest thread first. */
export function unreadThreads(messages = [], clients = []) {
  const byClient = {};
  for (const m of messages) {
    if (m.sender !== 'client' || m.is_read) continue;
    (byClient[m.client_id] = byClient[m.client_id] || []).push(m);
  }
  return Object.entries(byClient)
    .map(([clientId, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const client = clients.find(c => c.id === clientId);
      const latest = sorted[0];
      return {
        clientId,
        name: client?.name || latest.client_name || 'Client',
        avatar: client?.avatar_url,
        count: sorted.length,
        latest,
        preview: latest.media_type === 'voice' ? 'Sent a voice note'
          : latest.media_type === 'video' ? 'Sent a video'
          : stripEmoji(latest.content || '') || 'New message',
      };
    })
    .sort((a, b) => new Date(b.latest.created_date) - new Date(a.latest.created_date));
}
