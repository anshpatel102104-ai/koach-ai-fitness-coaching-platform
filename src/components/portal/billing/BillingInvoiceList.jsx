import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/portal/PortalUI';
import { fmtMoney as fmt, fmtDate, INVOICE_STATUS } from './shared';

export default function BillingInvoiceList({ invoices, onView, onPay }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...invoices].sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
  const displayed = showAll ? sorted : sorted.slice(0, 5);

  if (invoices.length === 0) {
    return (
      <section className="panel px-4 py-5">
        <p className="text-[15px] font-semibold text-foreground">No invoices yet</p>
        <p className="mt-1 text-sm text-muted-foreground">They'll show up here when your coach sends one.</p>
      </section>
    );
  }

  return (
    <section className="panel px-4 pt-4 pb-1">
      <h2 className="text-xl text-foreground">Invoices</h2>
      <ul className="mt-1 divide-y divide-border">
        {displayed.map(inv => {
          const cfg = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
          const isUnpaid = ['sent', 'viewed', 'overdue', 'draft'].includes(inv.status);
          return (
            <li key={inv.id} className="py-3">
              <button type="button" onClick={() => onView(inv)} className="flex w-full items-start gap-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{inv.description || inv.invoice_number || 'Invoice'}</span>
                  <span className="block text-[13px] text-muted-foreground">
                    {inv.invoice_number ? `${inv.invoice_number}, ` : ''}{fmtDate(inv.issue_date)}
                    {inv.due_date && isUnpaid ? `, due ${fmtDate(inv.due_date)}` : ''}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-[15px] font-semibold tabular-nums text-foreground">{fmt(inv.amount)}</span>
                  <Pill tone={cfg.tone} className="mt-1 text-[12px]">{cfg.label}</Pill>
                </span>
              </button>
              {(isUnpaid || inv.status === 'paid') && (
                <div className="mt-2 flex gap-2">
                  {isUnpaid && <Button size="sm" onClick={() => onPay(inv)}>Pay now</Button>}
                  {inv.status === 'paid' && <Button size="sm" variant="outline">Receipt</Button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {invoices.length > 5 && (
        <div className="border-t border-border py-2.5">
          <button type="button" onClick={() => setShowAll(s => !s)} className="text-sm font-semibold text-foreground underline underline-offset-4">
            {showAll ? 'Show fewer' : `Show all ${invoices.length} invoices`}
          </button>
        </div>
      )}
    </section>
  );
}
