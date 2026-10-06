import React from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { fmtMoney as fmt } from './shared';

function DueBadge({ dueDate }) {
  if (!dueDate) return null;
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return <span className="text-[13px] font-semibold text-destructive">{Math.abs(days)} days late</span>;
  if (days <= 3) return <span className="text-[13px] font-semibold text-warning">Due in {days} day{days === 1 ? '' : 's'}</span>;
  return <span className="text-[13px] text-muted-foreground">Due {format(parseISO(dueDate), 'MMM d')}</span>;
}

export default function BillingOutstandingCard({ unpaidInvoices, totalDue, onPayAll, onPayInvoice, onViewInvoice }) {
  const anyOverdue = unpaidInvoices.some(i => i.status === 'overdue' || (i.due_date && differenceInDays(parseISO(i.due_date), new Date()) < 0));
  return (
    <section className="panel relative overflow-hidden py-4 pl-5 pr-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${anyOverdue ? 'bg-destructive' : 'bg-brand'}`} aria-hidden />
      <p className="text-[13px] text-muted-foreground">To pay</p>
      <p className="num mt-1 text-[40px] text-foreground">{fmt(totalDue)}</p>
      <p className="text-sm text-muted-foreground">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length > 1 ? 's' : ''}</p>

      <Button variant="brand" size="lg" className="mt-4 h-[52px] w-full text-base font-bold" onClick={onPayAll}>
        Pay {fmt(totalDue)}
      </Button>

      {unpaidInvoices.length > 1 && (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {unpaidInvoices.map(inv => (
            <li key={inv.id} className="flex items-center gap-3 py-2.5">
              <button type="button" onClick={() => onViewInvoice?.(inv)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-foreground">{inv.invoice_number || 'Invoice'}</span>
                <DueBadge dueDate={inv.due_date} />
              </button>
              <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(inv.amount)}</span>
              <Button size="sm" variant="outline" onClick={() => onPayInvoice(inv)}>Pay</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
