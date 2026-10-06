import React from 'react';
import { startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { StatStrip, money, plural } from '@/components/business/ui';

/** Invoice totals derived from the invoice list. Exposed for the page sentence. */
export function invoiceTotals(invoices = []) {
  const now = new Date();
  const inRange = (dateStr, start, end) => {
    try { return isWithinInterval(parseISO(dateStr), { start, end }); } catch { return false; }
  };
  const paid = invoices.filter(i => i.status === 'paid');
  const totalRevenue = paid.reduce((s, i) => s + Number(i.amount || 0), 0);
  const thisMonthRev = paid.filter(i => i.paid_date && inRange(i.paid_date, startOfMonth(now), endOfMonth(now)))
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const lastMonthRev = paid.filter(i => i.paid_date && inRange(i.paid_date, startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))))
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const moPct = lastMonthRev === 0 ? null : Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100);
  const open = invoices.filter(i => ['sent', 'viewed', 'draft'].includes(i.status));
  const outstanding = open.reduce((s, i) => s + Number(i.amount || 0), 0);
  const overdue = invoices.filter(i => i.status === 'overdue');
  const overdueAmt = overdue.reduce((s, i) => s + Number(i.amount || 0), 0);
  const allAmounts = invoices.filter(i => i.amount).map(i => Number(i.amount));
  const avgInvoice = allAmounts.length ? allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length : 0;
  return { paid, totalRevenue, thisMonthRev, lastMonthRev, moPct, open, outstanding, overdue, overdueAmt, avgInvoice };
}

export default function InvoiceStatCards({ invoices = [] }) {
  const t = invoiceTotals(invoices);
  return (
    <StatStrip
      items={[
        { label: 'Collected this month', value: money(t.thisMonthRev), sub: t.moPct === null ? 'Nothing last month to compare' : `${t.moPct >= 0 ? 'Up' : 'Down'} ${Math.abs(t.moPct)}% on last month` },
        { label: 'Outstanding', value: money(t.outstanding), sub: `${plural(t.open.length, 'invoice')} not paid yet` },
        { label: 'Overdue', value: money(t.overdueAmt), sub: plural(t.overdue.length, 'invoice'), tone: t.overdue.length ? 'danger' : undefined },
        { label: 'Collected all time', value: money(t.totalRevenue, { compact: true }), sub: plural(t.paid.length, 'payment') },
        { label: 'Average invoice', value: money(t.avgInvoice) },
      ]}
    />
  );
}
