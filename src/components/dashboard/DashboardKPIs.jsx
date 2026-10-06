import React, { useMemo } from 'react';
import { differenceInDays, parseISO, startOfMonth, subMonths } from 'date-fns';
import { compositeAdherenceScore } from '@/lib/adherence';
import { useNavigate } from 'react-router-dom';
import { Panel, PanelHeader, Stat } from '@/components/kit';
import { cn } from '@/lib/utils';

/** A stat that becomes a button when it has somewhere to go. */
function Cell({ onClick, children }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn('min-w-0 px-5 py-4 text-left sm:px-6', onClick && 'transition-colors hover:bg-accent/60')}
    >
      {children}
    </Comp>
  );
}

/** "This month": four numbers that frame the day. */
export default function DashboardKPIs({ clients, checkIns, payments }) {
  const navigate = useNavigate();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

  // Active clients
  const active = useMemo(() =>
    clients.filter(c => c.status === 'active' || c.lifecycle_status === 'active').length,
    [clients]
  );

  // New active clients this month vs last
  const newThisMonth = useMemo(() =>
    clients.filter(c =>
      (c.status === 'active' || c.lifecycle_status === 'active') &&
      c.created_date && new Date(c.created_date) >= thisMonthStart
    ).length,
    [clients, thisMonthStart]
  );

  // Avg adherence
  const avgAdherence = useMemo(() => {
    const scores = clients
      .map(c => {
        const cis = checkIns.filter(ci => ci.client_id === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        return compositeAdherenceScore(cis);
      })
      .filter(s => s !== null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [clients, checkIns]);

  // Pending reviews
  const pendingReviews = useMemo(() =>
    checkIns.filter(ci => !ci.coach_responded && !ci.coach_notes &&
      differenceInDays(new Date(), parseISO(ci.date)) <= 14).length,
    [checkIns]
  );

  // Revenue
  const monthRevenue = useMemo(() => {
    return (payments || [])
      .filter(p => p.status === 'paid' && new Date(p.created_date) >= thisMonthStart)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, thisMonthStart]);

  const lastMonthRevenue = useMemo(() => {
    return (payments || [])
      .filter(p => p.status === 'paid' &&
        new Date(p.created_date) >= lastMonthStart &&
        new Date(p.created_date) <= lastMonthEnd)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, lastMonthStart, lastMonthEnd]);

  const revenueTrend = useMemo(() => {
    if (!lastMonthRevenue || !monthRevenue) return null;
    const pct = Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    return pct;
  }, [monthRevenue, lastMonthRevenue]);

  const adherenceTone = avgAdherence === null ? undefined : avgAdherence >= 80 ? 'success' : avgAdherence >= 50 ? undefined : 'danger';

  return (
    <Panel>
      <PanelHeader title="This month" />
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Cell>
          <Stat
            label="Active clients"
            value={active}
            sub={newThisMonth > 0 ? `${newThisMonth} new this month` : 'None new this month'}
          />
        </Cell>
        <Cell>
          <Stat
            label="Average adherence"
            value={avgAdherence !== null ? `${avgAdherence}%` : '—'}
            tone={adherenceTone}
            sub={avgAdherence === null ? 'Waiting on check-ins' : avgAdherence >= 80 ? 'Most clients on plan' : avgAdherence >= 50 ? 'Room to tighten up' : 'Below where it should be'}
          />
        </Cell>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <Cell onClick={pendingReviews > 0 ? () => navigate('/checkin-review') : undefined}>
          <Stat
            label="Check-ins waiting"
            value={pendingReviews}
            sub={pendingReviews === 0 ? 'All replied to' : `Oldest within 14 days`}
          />
        </Cell>
        <Cell onClick={monthRevenue === 0 ? () => navigate('/revenue') : undefined}>
          <Stat
            label="Revenue"
            value={monthRevenue > 0 ? `$${monthRevenue.toLocaleString()}` : '—'}
            sub={
              monthRevenue > 0 && revenueTrend !== null
                ? `${revenueTrend >= 0 ? '+' : ''}${revenueTrend}% on last month`
                : monthRevenue === 0
                ? 'Set up billing to track it'
                : 'So far this month'
            }
          />
        </Cell>
      </div>
    </Panel>
  );
}
