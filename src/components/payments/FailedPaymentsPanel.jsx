import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Panel, Initials } from '@/components/kit';
import { money, plural } from '@/components/business/ui';

const FAILURE_REASONS = {
  card_declined: 'Card declined',
  insufficient_funds: 'Insufficient funds',
  expired_card: 'Card expired',
  incorrect_cvc: 'Incorrect CVC',
  processing_error: 'Processing error',
  do_not_honor: 'Card declined by the bank',
};

/** Failed payments: a red-ruled list, one row per client. */
export default function FailedPaymentsPanel({ payments = [], onRetry, onMessage }) {
  const [expanded, setExpanded] = useState(true);
  const failed = payments.filter(p => p.status === 'failed');
  if (failed.length === 0) return null;

  const daysSince = (d) => {
    try { return differenceInDays(new Date(), parseISO(d)); }
    catch { return 0; }
  };
  const total = failed.reduce((s, p) => s + Number(p.amount || 0), 0);

  const link = 'touch-compact text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2';

  return (
    <Panel className="overflow-hidden border-l-[3px] border-destructive">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className="touch-compact w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-left"
      >
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-semibold text-destructive">
            {plural(failed.length, 'payment')} failed
          </span>
          <span className="block text-sm text-muted-foreground">
            {money(total, { cents: true })} not collected. Stripe retries 3, 5 and 7 days after a failure.
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="border-t border-border">
          {failed.map(p => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 sm:px-6 py-3.5 border-b border-border last:border-b-0">
              <div className="flex items-center gap-3 min-w-0 flex-1 basis-[220px]">
                <Initials name={p.client_name} tone="alert" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{p.client_name}</p>
                  <p className="text-[13px] text-muted-foreground truncate">
                    <span className="text-destructive">{FAILURE_REASONS[p.failure_reason] || p.failure_reason || 'Payment failed'}</span>
                    {' · '}{daysSince(p.paid_date || p.created_date)} days ago{p.description ? ` · ${p.description}` : ''}
                  </p>
                </div>
              </div>
              <p className="num text-[18px] text-destructive">{money(p.amount, { cents: true })}</p>
              <div className="flex items-center gap-4 w-full sm:w-auto pl-12 sm:pl-0">
                <button type="button" className={link} onClick={() => onRetry(p)}>Retry</button>
                <button type="button" className={link} onClick={() => onMessage(p)}>Message</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
