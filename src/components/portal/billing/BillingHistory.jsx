import React, { useState } from 'react';
import { subDays, isAfter } from 'date-fns';
import { Segmented } from '@/components/kit';
import { Pill } from '@/components/portal/PortalUI';
import { fmtMoney as fmt, fmtDate } from './shared';

const STATUS = {
  paid: { tone: 'success', label: 'Paid' },
  failed: { tone: 'danger', label: 'Failed' },
  pending: { tone: 'warning', label: 'Pending' },
  refunded: { tone: 'neutral', label: 'Refunded' },
};

export default function BillingHistory({ payments, invoices }) {
  const [filter, setFilter] = useState('all');

  // Combine paid invoices as history entries
  const paidInvoiceEntries = invoices.filter(i => i.status === 'paid').map(i => ({
    id: `inv-${i.id}`,
    date: i.paid_date || i.updated_date,
    description: i.description || i.invoice_number || 'Invoice',
    amount: i.amount,
    status: 'paid',
    method: i.payment_method || 'card',
    type: 'invoice',
  }));

  const paymentEntries = payments.map(p => ({
    id: `pay-${p.id}`,
    date: p.paid_date || p.created_date,
    description: p.description || 'Payment',
    amount: p.amount,
    status: p.status,
    method: 'card',
    type: 'payment',
  }));

  const all = [...paidInvoiceEntries, ...paymentEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
    { value: 'last30', label: 'Last 30 days' },
  ];

  const filtered = all.filter(entry => {
    if (filter === 'paid') return entry.status === 'paid';
    if (filter === 'failed') return entry.status === 'failed';
    if (filter === 'last30') return isAfter(new Date(entry.date), subDays(new Date(), 30));
    return true;
  });

  return (
    <div className="space-y-3">
      <Segmented size="sm" className="w-full" value={filter} onChange={setFilter} options={FILTERS} />

      {filtered.length === 0 ? (
        <section className="panel px-4 py-5">
          <p className="text-[15px] font-semibold text-foreground">No payments here</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another filter.</p>
        </section>
      ) : (
        <section className="panel px-4 py-1">
          <ul className="divide-y divide-border">
            {filtered.map(entry => {
              const cfg = STATUS[entry.status] || STATUS.pending;
              return (
                <li key={entry.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{entry.description}</span>
                    <span className="block text-[13px] text-muted-foreground">{fmtDate(entry.date)}, {entry.method}</span>
                  </span>
                  <span className="text-right">
                    <span className={`block text-[15px] font-semibold tabular-nums ${entry.status === 'failed' ? 'text-destructive' : 'text-foreground'}`}>
                      {entry.status === 'refunded' ? '−' : ''}{fmt(entry.amount)}
                    </span>
                    {entry.status === 'paid'
                      ? <button type="button" className="text-[13px] font-semibold text-foreground underline underline-offset-4">Receipt</button>
                      : <Pill tone={cfg.tone} className="text-[12px]">{cfg.label}</Pill>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
