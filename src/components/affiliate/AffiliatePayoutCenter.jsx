import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelHeader, Stat, KeyValue, EmptyState } from '@/components/kit';

export default function AffiliatePayoutCenter({ profile }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: payouts = [] } = useQuery({
    queryKey: ['affiliate-payouts', profile.coach_id],
    queryFn: () => db.entities.AffiliatePayout.filter({ affiliate_id: profile.coach_id }, '-payout_month'),
  });

  const selectedPayout = payouts.find(p => p.payout_month === selectedMonth);

  const totalYearToDate = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.net_amount, 0);

  const verified = profile.tax_form_status === 'verified';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
      <div className="lg:col-span-3 space-y-5">
        <Panel>
          <PanelHeader title="Monthly statement" right={
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} aria-label="Month"
              className="h-9 px-3 rounded-md border border-input bg-card text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          } />
          {selectedPayout ? (
            <div className="px-5 sm:px-6 pb-6">
              <div className="grid grid-cols-2 gap-6">
                <Stat label="Gross" value={`$${selectedPayout.gross_earnings.toFixed(2)}`} />
                <Stat label="Net payout" value={`$${selectedPayout.net_amount.toFixed(2)}`} sub={`Status: ${selectedPayout.status}`} />
              </div>
              {selectedPayout.commission_breakdown && selectedPayout.commission_breakdown.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-foreground mb-1">By coach</p>
                  {selectedPayout.commission_breakdown.map((item, i) => (
                    <KeyValue key={i} label={`${item.coach_id?.substring(0, 8)}… at ${item.rate}%`} value={`$${item.commission.toFixed(2)}`} />
                  ))}
                </div>
              )}
              {selectedPayout.statement_url && (
                <Button variant="outline" className="mt-5"><Download /> Download statement</Button>
              )}
            </div>
          ) : (
            <EmptyState title="No payout for this month" body="Pick another month, or check back after the 1st." />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="History" />
          {payouts.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-y border-border">
                <tr className="text-[13px] text-muted-foreground">
                  <th className="text-left font-medium py-3 pl-5 sm:pl-6 pr-3">Month</th>
                  <th className="text-right font-medium py-3 px-3">Gross</th>
                  <th className="text-right font-medium py-3 px-3">Net</th>
                  <th className="text-right font-medium py-3 pr-5 sm:pr-6 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pl-5 sm:pl-6 pr-3 font-semibold text-foreground">{p.payout_month}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">${p.gross_earnings.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right"><span className="num text-base">${p.net_amount.toFixed(2)}</span></td>
                    <td className="py-3 pr-5 sm:pr-6 pl-3 text-right">
                      <Badge variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'secondary'} className="capitalize">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No payouts yet" body="Your first one is sent on the 1st after you pass $100." />
          )}
        </Panel>
      </div>

      <div className="lg:col-span-2 space-y-5">
        <Panel className="p-5 sm:p-6">
          <Stat label={`Paid out in ${new Date().getFullYear()}`} value={`$${totalYearToDate.toFixed(2)}`} size="lg" />
        </Panel>
        <Panel>
          <PanelHeader title="How you get paid" />
          <div className="px-5 sm:px-6 pb-4">
            <KeyValue label="Method" value="Stripe Connect, bank transfer" />
            <KeyValue label="Schedule" value="Monthly, on the 1st" />
            <KeyValue label="Minimum" value="$100" />
            <KeyValue label="Tax form" value={<span className={verified ? 'text-success' : 'text-warning'}>{verified ? 'Verified, on file' : 'Needed before payouts'}</span>} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
