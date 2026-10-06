import React, { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Panel, PanelHeader, Stat } from '@/components/kit';
import { Meter, money } from '@/components/business/ui';

export default function InvoiceSidebar({ invoices = [] }) {
  const topClients = useMemo(() => {
    const byClient = {};
    invoices.filter(i => i.status === 'paid').forEach(i => {
      if (!byClient[i.client_name]) byClient[i.client_name] = 0;
      byClient[i.client_name] += Number(i.amount || 0);
    });
    return Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [invoices]);

  const avgDaysToPay = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid' && i.issue_date && i.paid_date);
    if (!paid.length) return null;
    const total = paid.reduce((sum, i) => {
      try { return sum + differenceInDays(parseISO(i.paid_date), parseISO(i.issue_date)); } catch { return sum; }
    }, 0);
    return Math.round(total / paid.length);
  }, [invoices]);

  const paymentMethods = useMemo(() => {
    const counts = {};
    invoices.filter(i => i.payment_method).forEach(i => {
      counts[i.payment_method] = (counts[i.payment_method] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([k, v]) => ({ method: k, pct: Math.round((v / total) * 100) })).sort((a, b) => b.pct - a.pct);
  }, [invoices]);

  const onTimeRate = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid' && i.paid_date && i.due_date);
    if (!paid.length) return null;
    const onTime = paid.filter(i => {
      try { return parseISO(i.paid_date) <= parseISO(i.due_date); } catch { return false; }
    }).length;
    return Math.round((onTime / paid.length) * 100);
  }, [invoices]);

  return (
    <div className="flex flex-col gap-4">
      {/* Payment habits */}
      <Panel className="px-5 py-5 sm:px-6">
        <h2 className="text-[22px] text-foreground mb-4">How clients pay</h2>
        <div className="grid grid-cols-2 divide-x divide-border">
          <Stat label="Days to pay" value={avgDaysToPay ?? '—'} sub="on average" />
          <Stat className="pl-5" label="On time" value={onTimeRate !== null ? `${onTimeRate}%` : '—'} tone={onTimeRate !== null && onTimeRate < 80 ? 'warning' : undefined} sub="paid by the due date" />
        </div>
        {paymentMethods.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border space-y-3">
            {paymentMethods.map(({ method, pct }) => (
              <div key={method}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-foreground capitalize">{method.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
                </div>
                <Meter value={pct} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Top clients */}
      <Panel>
        <PanelHeader title="Top clients" subtitle="By amount paid" />
        <div className="px-5 sm:px-6 pb-4">
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground pb-2">No paid invoices yet.</p>
          ) : topClients.map(([name, amount]) => (
            <div key={name} className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-b-0">
              <span className="text-sm text-foreground truncate">{name}</span>
              <span className="num text-[17px] text-foreground">{money(amount)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
