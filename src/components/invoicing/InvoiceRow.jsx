import React from 'react';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Initials } from '@/components/kit';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { INVOICE_GRID } from './InvoiceListHeader';
import { money } from '@/components/business/ui';

export default function InvoiceRow({ invoice, onView, onMarkPaid, onDuplicate, onDelete }) {
  const handleReminder = async () => {
    await db.functions.invoke('sendInvoiceReminder', { invoice_id: invoice.id });
    toast.success(`Reminder sent to ${invoice.client_name}`);
  };

  const fmt = (d) => { try { return format(parseISO(d), 'MMM d'); } catch { return d || '—'; } };
  const overdue = invoice.status === 'overdue';
  const canRemind = ['sent', 'viewed', 'overdue'].includes(invoice.status);
  const canMarkPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => { if (e.key === 'Enter') onView?.(); }}
      className={cn(
        'relative flex flex-wrap items-center gap-x-3 gap-y-1 pl-5 pr-12 md:pr-6 sm:pl-6 py-3.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-accent/60 transition-colors',
        INVOICE_GRID
      )}
    >
      {/* Client */}
      <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none">
        <Initials name={invoice.client_name} tone={overdue ? 'alert' : 'default'} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">{invoice.client_name || 'No client'}</p>
          <p className="text-[13px] text-muted-foreground truncate">
            {invoice.invoice_number}
            <span className="md:hidden">{invoice.due_date ? ` · due ${fmt(invoice.due_date)}` : ''}</span>
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="hidden md:block text-sm text-foreground/80 truncate">
        {invoice.description || '—'}
        {invoice.type === 'recurring' && <span className="text-muted-foreground"> · recurring</span>}
      </p>

      {/* Amount */}
      <p className="num text-[18px] text-foreground text-right ml-auto md:ml-0">{money(invoice.amount, { cents: Number(invoice.amount) % 1 !== 0 })}</p>

      {/* Due */}
      <p className={cn('hidden md:block text-sm', overdue ? 'text-destructive font-semibold' : 'text-foreground')}>{fmt(invoice.due_date)}</p>

      {/* Status */}
      <div className="w-full pl-12 md:w-auto md:pl-0">
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      {/* Actions */}
      <div className="absolute right-3 top-3 md:static" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="touch-compact h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Invoice actions">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>Open invoice</DropdownMenuItem>
            {canMarkPaid && <DropdownMenuItem onClick={onMarkPaid}>Mark as paid</DropdownMenuItem>}
            {canRemind && <DropdownMenuItem onClick={handleReminder}>Send a reminder</DropdownMenuItem>}
            <DropdownMenuItem onClick={onDuplicate}>Duplicate as draft</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
