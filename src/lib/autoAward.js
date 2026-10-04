import { db } from '@/api/supabaseClient';
import { calculateStreak, checkInScore } from '@/lib/adherence';
import { format } from 'date-fns';

export const AUTO_AWARD_CHECKS = [
  { key: 'first_checkin',  check: (cis) => cis.length >= 1 },
  { key: 'checkin_3',      check: (cis) => cis.length >= 3 },
  { key: 'checkin_5',      check: (cis) => cis.length >= 5 },
  { key: 'checkin_10',     check: (cis) => cis.length >= 10 },
  { key: 'streak_7',       check: (cis) => calculateStreak(cis) >= 7 },
  { key: 'streak_14',      check: (cis) => calculateStreak(cis) >= 14 },
  { key: 'streak_30',      check: (cis) => calculateStreak(cis) >= 30 },
  { key: 'streak_60',      check: (cis) => calculateStreak(cis) >= 60 },
  { key: 'streak_90',      check: (cis) => calculateStreak(cis) >= 90 },
  { key: 'perfect_week',   check: (cis) => {
    const recent = cis.slice(0, 4);
    return recent.length >= 4 && recent.every(ci => (checkInScore(ci) ?? 0) >= 80);
  }},
  { key: 'compliance_80',  check: (cis) => cis[0] != null && (checkInScore(cis[0]) ?? 0) >= 80 },
  { key: 'compliance_100', check: (cis) => cis[0] != null && (checkInScore(cis[0]) ?? 0) >= 100 },
  { key: 'sleep_7hrs',     check: (cis) => cis[0]?.sleep_hours >= 7 },
  { key: 'energy_high',    check: (cis) => cis[0]?.energy_level >= 8 },
  { key: 'mood_great',     check: (cis) => cis[0]?.mood === 'great' },
  { key: 'weight_logged',  check: (cis) => cis.some(ci => ci.weight != null) },
  { key: 'comeback',       check: (cis) => {
    if (cis.length < 2) return false;
    const latest = checkInScore(cis[0]);
    const prev   = checkInScore(cis[1]);
    return prev !== null && latest !== null && prev < 50 && latest >= 70;
  }},
];

/**
 * For a single client, compute which badges are newly eligible and create them.
 * Returns array of awarded badge keys.
 */
export async function runAutoAwardForClient(client, checkIns, existingBadges) {
  const awarded = new Set(existingBadges.map(b => b.badge_key));
  const today = format(new Date(), 'yyyy-MM-dd');
  const newKeys = [];

  for (const { key, check } of AUTO_AWARD_CHECKS) {
    if (!awarded.has(key) && check(checkIns)) {
      await db.entities.ClientBadge.create({
        client_id:   client.id,
        client_name: client.name,
        badge_key:   key,
        earned_date: today,
        notes:       'Auto-awarded',
      });
      newKeys.push(key);
    }
  }
  return newKeys;
}