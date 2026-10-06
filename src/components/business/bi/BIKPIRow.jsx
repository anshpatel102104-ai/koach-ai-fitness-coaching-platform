import React, { useMemo } from 'react';
import { StatStrip, money } from '@/components/business/ui';
import { differenceInMonths, subMonths, startOfMonth, parseISO } from 'date-fns';

export default function BIKPIRow({ clients, payments, checkIns }) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const lastMonthActive = useMemo(() => {
    return clients.filter(c => {
      if (c.lifecycle_status !== 'active' && c.status !== 'active') return false;
      const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
      return !sd || sd < thisMonthStart;
    });
  }, [clients, thisMonthStart]);

  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);
  const lastMrr = useMemo(() => lastMonthActive.reduce((s, c) => s + (c.monthly_rate || 0), 0), [lastMonthActive]);
  const mrrTrend = lastMrr > 0 ? ((mrr - lastMrr) / lastMrr) * 100 : 0;
  const projectedMrr = mrr + (mrr * (mrrTrend / 100));

  const newThisMonth = clients.filter(c => {
    const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
    return sd && sd >= thisMonthStart;
  }).length;

  const newLastMonth = clients.filter(c => {
    const sd = c.start_date ? parseISO(c.start_date) : c.created_date ? new Date(c.created_date) : null;
    return sd && sd >= lastMonthStart && sd < thisMonthStart;
  }).length;

  const clientTrend = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

  const avgLTV = useMemo(() => {
    const withRate = activeClients.filter(c => c.monthly_rate > 0);
    if (!withRate.length) return 0;
    const avg = withRate.reduce((sum, c) => {
      const months = c.start_date ? Math.max(1, differenceInMonths(now, parseISO(c.start_date))) : 3;
      return sum + (c.monthly_rate * months);
    }, 0) / withRate.length;
    return Math.round(avg);
  }, [activeClients]);

  const completedClients = clients.filter(c => c.lifecycle_status === 'completed' || c.lifecycle_status === 'alumni').length;
  const churnRate = clients.length > 0 ? ((completedClients / clients.length) * 100) : 0;

  const trendText = (t) => (!t ? 'Flat on last month' : `${t > 0 ? 'Up' : 'Down'} ${Math.abs(t).toFixed(1)}% on last month`);

  return (
    <StatStrip
      items={[
        {
          label: 'Monthly recurring revenue',
          value: money(mrr),
          sub: projectedMrr > mrr ? `${trendText(mrrTrend)}, ${money(projectedMrr)} next` : trendText(mrrTrend),
        },
        { label: 'Active clients', value: activeClients.length, sub: `${newThisMonth} new this month` },
        { label: 'Average lifetime value', value: avgLTV > 0 ? money(avgLTV) : '—', sub: 'Rate times months coached' },
        { label: 'Finished or left', value: `${churnRate.toFixed(1)}%`, sub: `${completedClients} of ${clients.length} clients`, tone: churnRate > 25 ? 'danger' : undefined },
      ]}
    />
  );
}
