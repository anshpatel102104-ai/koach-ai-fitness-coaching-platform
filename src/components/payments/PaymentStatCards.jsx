import React from 'react';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { StatStrip, money, plural } from '@/components/business/ui';

export default function PaymentStatCards({ payments = [] }) {
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);

  const inMonth = (dateStr) => {
    try { return isWithinInterval(parseISO(dateStr), { start: mStart, end: mEnd }); }
    catch { return false; }
  };

  const collected = payments
    .filter(p => p.status === 'paid' && p.paid_date && inMonth(p.paid_date))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);
  const failedList = payments.filter(p => p.status === 'failed');
  const failed = failedList.reduce((s, p) => s + Number(p.amount || 0), 0);
  const refunded = payments.filter(p => p.status === 'refunded').reduce((s, p) => s + Number(p.amount || 0), 0);
  const allCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
  const net = allCollected - refunded;

  return (
    <StatStrip
      items={[
        { label: 'Collected this month', value: money(collected) },
        { label: 'Pending', value: money(pending), sub: 'On its way' },
        { label: 'Failed', value: money(failed), sub: plural(failedList.length, 'payment'), tone: failedList.length ? 'danger' : undefined },
        { label: 'Refunded', value: money(refunded) },
        { label: 'Net, all time', value: money(net, { compact: true }), sub: 'Collected minus refunds' },
      ]}
    />
  );
}
