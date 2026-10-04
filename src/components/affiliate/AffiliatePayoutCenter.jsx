import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Payout settings */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4">Payout Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Payment Method</label>
            <p className="px-4 py-2 rounded-lg bg-muted text-foreground font-semibold">Stripe Connect (Bank Transfer)</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Payout Schedule</label>
            <p className="px-4 py-2 rounded-lg bg-muted text-foreground font-semibold">Monthly (1st of each month)</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Minimum Payout</label>
            <p className="px-4 py-2 rounded-lg bg-muted text-foreground font-semibold">$100</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Tax Form Status</label>
            <p className={`px-4 py-2 rounded-lg font-semibold ${
              profile.tax_form_status === 'verified'
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            }`}>
              {profile.tax_form_status === 'verified' ? '✓ Verified (W-9/W-8BEN on file)' : 'Pending — Submit tax form to receive payouts'}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly statement */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4">Earnings Breakdown</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-bold text-foreground mb-2">Select Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {selectedPayout ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Gross Earnings</p>
              <p className="text-3xl font-black text-foreground">${selectedPayout.gross_earnings.toFixed(2)}</p>
            </div>

            {selectedPayout.commission_breakdown && selectedPayout.commission_breakdown.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Commissions by Coach:</p>
                {selectedPayout.commission_breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted">
                    <span className="text-foreground">{item.coach_id?.substring(0, 8)}... @ {item.rate}%</span>
                    <span className="font-bold text-foreground">${item.commission.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 rounded-lg bg-accent border border-primary">
              <p className="text-sm text-primary">Net Payout</p>
              <p className="text-3xl font-black text-primary">${selectedPayout.net_amount.toFixed(2)}</p>
              <p className="text-xs text-primary mt-1">Status: {selectedPayout.status}</p>
            </div>

            {selectedPayout.statement_url && (
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border text-foreground font-bold hover:bg-muted">
                <Download className="w-4 h-4" /> Download Statement
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No payout data for this month</p>
        )}
      </div>

      {/* Year to date */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4">Year to Date</h3>
        <div className="p-4 rounded-lg bg-gradient-to-r from-success/10 to-success/10 border border-success">
          <p className="text-sm text-success">Total Paid Out (2026)</p>
          <p className="text-4xl font-black text-success">${totalYearToDate.toFixed(2)}</p>
        </div>
      </div>

      {/* Payout history */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-bold text-foreground mb-4">Payout History</h3>
        {payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-3 font-bold text-foreground">Month</th>
                  <th className="text-right py-3 px-3 font-bold text-foreground">Gross</th>
                  <th className="text-right py-3 px-3 font-bold text-foreground">Net</th>
                  <th className="text-center py-3 px-3 font-bold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted">
                    <td className="py-3 px-3 font-semibold text-foreground">{p.payout_month}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">${p.gross_earnings.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">${p.net_amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                        p.status === 'paid' ? 'bg-success' : p.status === 'pending' ? 'bg-warning' : 'bg-muted-foreground'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No payout history yet</p>
        )}
      </div>
    </div>
  );
}