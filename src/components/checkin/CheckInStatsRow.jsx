import React, { useMemo } from 'react';
import { differenceInDays, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { Panel, Stat } from '@/components/kit';

function calcStreak(clientCIs) {
  const sorted = [...clientCIs].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const ci of sorted) {
    const d = differenceInDays(new Date(), parseISO(ci.date));
    if (d <= (streak + 1) * 7 + 3) streak++;
    else break;
  }
  return streak;
}

/** Four plain stat pairs in one panel: waiting, reviewed, response rate, streaks. */
export default function CheckInStatsRow({ checkIns, clients, latestPerClient }) {
  const stats = useMemo(() => {
    const pending = latestPerClient.filter(ci =>
      !ci.coach_responded && ci.review_status !== 'reviewed'
    ).length;

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const reviewedThisWeek = checkIns.filter(ci =>
      (ci.coach_responded || ci.review_status === 'reviewed') &&
      new Date(ci.updated_date || ci.date) >= weekStart
    ).length;

    const activeClients = clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active');
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const submitted = new Set(
      checkIns
        .filter(ci => { const d = parseISO(ci.date); return d >= lastWeekStart && d < weekStart; })
        .map(ci => ci.client_id)
    );
    const responseRate = activeClients.length > 0
      ? Math.round((submitted.size / activeClients.length) * 100) : 0;

    const cisByClient = {};
    for (const ci of checkIns) {
      (cisByClient[ci.client_id] = cisByClient[ci.client_id] || []).push(ci);
    }
    const streakLeaders = Object.values(cisByClient).filter(cis => calcStreak(cis) >= 3).length;

    return { pending, reviewedThisWeek, responseRate, streakLeaders };
  }, [checkIns, clients, latestPerClient]);

  return (
    <Panel className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 px-5 py-5 sm:px-6">
      <Stat label="Waiting on you" value={stats.pending} />
      <Stat label="Reviewed this week" value={stats.reviewedThisWeek} />
      <Stat label="Submitted last week" value={`${stats.responseRate}%`} sub="of active clients" />
      <Stat label="On a 3+ week streak" value={stats.streakLeaders} sub="clients" />
    </Panel>
  );
}
