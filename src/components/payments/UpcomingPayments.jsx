import React, { useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { Panel, PanelHeader } from '@/components/kit';
import { money } from '@/components/business/ui';

export default function UpcomingPayments({ invoices = [] }) {
  const now = new Date();
  const in30 = addDays(now, 30);

  const upcoming = useMemo(() => {
    return invoices
      .filter(inv => ['sent', 'viewed', 'draft'].includes(inv.status) && inv.due_date)
      .filter(inv => {
        try {
          const d = parseISO(inv.due_date);
          return isAfter(d, now) && isBefore(d, in30);
        } catch { return false; }
      })
      .sort((a, b) => (a.due_date > b.due_date ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const total = upcoming.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <Panel>
      <PanelHeader
        title="Due in 30 days"
        subtitle={upcoming.length ? `${money(total)} expected` : 'Nothing due in the next 30 days.'}
      />
      {upcoming.length > 0 && (
        <div className="px-5 sm:px-6 pb-3">
          {upcoming.map(inv => {
            const daysLeft = Math.ceil((parseISO(inv.due_date) - now) / 86400000);
            const soon = daysLeft <= 3;
            return (
              <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{inv.client_name}</p>
                  <p className={soon ? 'text-[13px] text-warning font-medium' : 'text-[13px] text-muted-foreground'}>
                    {format(parseISO(inv.due_date), 'EEE, MMM d')} · {daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}
                  </p>
                </div>
                <p className="num text-[17px] text-foreground">{money(inv.amount)}</p>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
