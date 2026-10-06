import React from 'react';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Initials } from '@/components/kit';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusDot, money } from '@/components/business/ui';

const STATUS_CFG = {
  paid:           { label: 'Paid',           tone: 'success' },
  pending:        { label: 'Pending',        tone: 'muted' },
  failed:         { label: 'Failed',         tone: 'danger' },
  refunded:       { label: 'Refunded',       tone: 'muted' },
  partial_refund: { label: 'Part refunded',  tone: 'muted' },
  disputed:       { label: 'Disputed',       tone: 'danger' },
};

export default function PaymentFeedItem({ payment, onViewInvoice, onRefund }) {
  const cfg = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const isNegative = ['refunded', 'partial_refund'].includes(payment.status);
  const isFailed = ['failed', 'disputed'].includes(payment.status);

  const fmtDate = (d) => { try { return format(parseISO(d), 'MMM d, h:mm a'); } catch { return d || '—'; } };
  const method = payment.payment_method ? payment.payment_method.replace(/_/g, ' ') : null;

  return (
    <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 pl-5 pr-12 md:pr-6 sm:pl-6 py-3.5 border-b border-border last:border-b-0 hover:bg-accent/60 transition-colors md:grid md:grid-cols-[minmax(0,1fr)_120px_130px_96px]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Initials name={payment.client_name} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate">{payment.client_name}</p>
          <p className="text-[13px] text-muted-foreground truncate">
            {[payment.description, fmtDate(payment.paid_date || payment.created_date), method].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <p className={cn('num text-[18px] text-right ml-auto md:ml-0', isFailed ? 'text-destructive' : isNegative ? 'text-muted-foreground' : 'text-foreground')}>
        {isNegative ? '−' : ''}{money(payment.amount, { cents: true })}
      </p>

      <div className="w-full pl-12 md:w-auto md:pl-0">
        <StatusDot tone={cfg.tone}>{cfg.label}</StatusDot>
      </div>

      <div className="absolute right-3 top-3 md:static md:flex md:justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="touch-compact h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Payment actions">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewInvoice}>View invoice</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>Receipt</DropdownMenuItem>
            {payment.status === 'paid' && <DropdownMenuItem onClick={onRefund}>Refund…</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
