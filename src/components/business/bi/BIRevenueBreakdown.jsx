import React, { useMemo } from 'react';
import { Panel, Initials } from '@/components/kit';
import { Meter, money } from '@/components/business/ui';

export default function BIRevenueBreakdown({ clients, payments }) {
  const activeClients = useMemo(() => clients.filter(c => c.lifecycle_status === 'active' || c.status === 'active'), [clients]);
  const mrr = useMemo(() => activeClients.reduce((s, c) => s + (c.monthly_rate || 0), 0), [activeClients]);

  const topClients = useMemo(() =>
    [...activeClients].filter(c => c.monthly_rate > 0)
      .sort((a, b) => (b.monthly_rate || 0) - (a.monthly_rate || 0))
      .slice(0, 5),
    [activeClients]);

  const top3Revenue = topClients.slice(0, 3).reduce((s, c) => s + (c.monthly_rate || 0), 0);
  const concentrationPct = mrr > 0 ? Math.round((top3Revenue / mrr) * 100) : 0;

  const avgRevenue = activeClients.length > 0 ? Math.round(mrr / activeClients.length) : 0;

  const failedPayments = payments.filter(p => p.status === 'failed').length;

  return (
    <Panel className="px-5 py-5 sm:px-6 sm:py-6">
      <h2 className="text-[22px] text-foreground">Where revenue comes from</h2>

      <div className="grid grid-cols-2 mt-4 border-y border-border divide-x divide-border">
        <div className="py-3.5 pr-3">
          <p className="text-[13px] text-muted-foreground">Monthly recurring</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{money(mrr)}</p>
        </div>
        <div className="py-3.5 pl-4">
          <p className="text-[13px] text-muted-foreground">Per client</p>
          <p className="num text-[26px] leading-none mt-1 text-foreground">{money(avgRevenue)}</p>
        </div>
      </div>

      {(concentrationPct > 40 || failedPayments > 0) && (
        <div className="mt-4 space-y-2">
          {concentrationPct > 40 && (
            <p className="text-sm text-foreground border-l-2 border-warning pl-3">
              Your top 3 clients bring in <span className="font-semibold">{concentrationPct}%</span> of revenue. Losing one would hurt.
            </p>
          )}
          {failedPayments > 0 && (
            <p className="text-sm text-destructive border-l-2 border-destructive pl-3 font-medium">
              {failedPayments} failed payment{failedPayments !== 1 ? 's' : ''} to chase in Billing.
            </p>
          )}
        </div>
      )}

      <div className="mt-5">
        <p className="text-[13px] text-muted-foreground mb-1">Top clients by rate</p>
        {topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rates yet. Add a monthly rate to each client.</p>
        ) : (
          topClients.map((c) => {
            const pct = mrr > 0 ? Math.round(((c.monthly_rate || 0) / mrr) * 100) : 0;
            return (
              <div key={c.id} className="grid grid-cols-[28px_1fr_64px_64px] items-center gap-3 py-2 border-b border-border last:border-b-0">
                <Initials name={c.name} size={28} />
                <p className="text-sm text-foreground truncate">{c.name}</p>
                <Meter value={pct} />
                <p className="num text-[17px] text-foreground text-right">{money(c.monthly_rate || 0)}</p>
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
