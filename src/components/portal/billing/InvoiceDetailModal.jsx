import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, Pill } from '@/components/portal/PortalUI';
import { fmtMoney as fmt, fmtDate, INVOICE_STATUS } from './shared';

export default function InvoiceDetailModal({ invoice, onClose, onPay }) {
  const isUnpaid = ['sent', 'viewed', 'overdue', 'draft'].includes(invoice.status);
  const isPaid = invoice.status === 'paid';
  const cfg = INVOICE_STATUS[invoice.status] || INVOICE_STATUS.draft;

  const daysUntilDue = invoice.due_date ? differenceInDays(parseISO(invoice.due_date), new Date()) : null;
  const lineItems = invoice.line_items || [{ description: invoice.description, qty: 1, price: invoice.amount }];

  const statusLine = isPaid
    ? (invoice.paid_date ? `Paid on ${fmtDate(invoice.paid_date)}.` : 'Payment received.')
    : invoice.status === 'overdue'
      ? `Was due ${fmtDate(invoice.due_date)}.`
      : isUnpaid && daysUntilDue !== null && daysUntilDue <= 3
        ? `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.`
        : invoice.due_date ? `Due ${fmtDate(invoice.due_date)}.` : null;

  return (
    <Sheet open onClose={onClose} title={invoice.invoice_number || 'Invoice'}
      footer={(
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="flex-1" onClick={onClose}>Close</Button>
          {isUnpaid && (
            <Button variant="brand" size="lg" className="flex-[2] font-bold" onClick={() => { onClose(); onPay(invoice); }}>
              Pay {fmt(invoice.amount)}
            </Button>
          )}
          {isPaid && (
            <Button size="lg" className="flex-[2]"><Download /> Receipt</Button>
          )}
        </div>
      )}>
      <div className="flex items-center gap-2">
        <Pill tone={cfg.tone}>{cfg.label}</Pill>
        <span className="text-[13px] text-muted-foreground">Issued {fmtDate(invoice.issue_date)}</span>
      </div>
      {statusLine && <p className={`mt-2 text-[15px] ${invoice.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'}`}>{statusLine}</p>}

      <div className="mt-4 rounded-xl shadow-[0_0_0_1px_rgb(var(--border))]">
        <p className="border-b border-border px-4 py-3 text-[15px] font-semibold text-foreground">{invoice.description || 'Coaching services'}</p>
        <ul className="divide-y divide-border px-4">
          {lineItems.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-foreground">{item.description || 'Service'}{item.qty > 1 ? <span className="text-muted-foreground"> × {item.qty}</span> : null}</span>
              <span className="font-semibold tabular-nums text-foreground">{fmt((item.price || 0) * (item.qty || 1))}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-[15px] font-semibold text-foreground">Total</span>
          <span className="num text-[26px] text-foreground">{fmt(invoice.amount)}</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">Questions about this invoice? Message your coach.</p>
    </Sheet>
  );
}
