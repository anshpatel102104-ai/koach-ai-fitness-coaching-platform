import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Panel, Segmented, EmptyState, Initials } from '@/components/kit';

const STATUS_BADGE = { trial: 'warning', active: 'success', churned: 'destructive', paused: 'secondary' };

export default function AffiliateReferralTable({ profile }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const { data: referrals = [] } = useQuery({
    queryKey: ['affiliate-commissions', profile.coach_id],
    queryFn: () => db.entities.AffiliateCommission.filter({ affiliate_id: profile.coach_id }, '-signup_date'),
  });

  const filtered = filterStatus === 'all' ? referrals : referrals.filter(r => r.status === filterStatus);
  
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.signup_date) - new Date(a.signup_date);
    if (sortBy === 'highest_value') return b.monthly_value - a.monthly_value;
    if (sortBy === 'longest_active') return new Date(b.status_changed_at) - new Date(a.status_changed_at);
    return 0;
  });

  const handleExport = () => {
    const csv = [
      ['Coach', 'Sign Up Date', 'Plan', 'Monthly Value', 'Commission %', 'This Month', 'Status'],
      ...sorted.map(r => [
        r.coach_name,
        r.signup_date,
        r.current_plan,
        `$${r.monthly_value.toFixed(2)}`,
        `${r.commission_rate}%`,
        `$${r.monthly_commission.toFixed(2)}`,
        r.status,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'referrals.csv';
    a.click();
  };

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4">
        <Segmented size="sm" value={filterStatus} onChange={setFilterStatus}
          options={['all', 'active', 'trial', 'churned'].map(st => ({ value: st, label: st.charAt(0).toUpperCase() + st.slice(1), count: st === 'all' ? referrals.length : referrals.filter(r => r.status === st).length }))} />
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort"
            className="h-8 px-2 rounded-md border border-input bg-card text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="newest">Newest first</option>
            <option value="highest_value">Highest value</option>
            <option value="longest_active">Longest active</option>
          </select>
          <Button size="sm" variant="outline" onClick={handleExport}><Download /> Export CSV</Button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState className="border-t border-border" title="No referrals yet" body="Coaches who sign up through your link show up here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-border">
              <tr className="text-[13px] text-muted-foreground">
                <th className="text-left font-medium py-3 pl-5 sm:pl-6 pr-3">Coach</th>
                <th className="text-left font-medium py-3 px-3 hidden sm:table-cell">Joined</th>
                <th className="text-left font-medium py-3 px-3 hidden md:table-cell">Plan</th>
                <th className="text-right font-medium py-3 px-3 hidden md:table-cell">They pay</th>
                <th className="text-right font-medium py-3 px-3">You earn</th>
                <th className="text-right font-medium py-3 pr-5 sm:pr-6 pl-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((ref) => (
                <tr key={ref.id}>
                  <td className="py-3 pl-5 sm:pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <Initials name={ref.coach_name.split('@')[0]} size={32} />
                      <span className="text-[15px] font-semibold text-foreground">{ref.coach_name.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell">{new Date(ref.signup_date).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-foreground capitalize hidden md:table-cell">{ref.current_plan}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground hidden md:table-cell">${ref.monthly_value.toFixed(2)}/mo</td>
                  <td className="py-3 px-3 text-right"><span className="num text-base">${ref.monthly_commission.toFixed(2)}</span></td>
                  <td className="py-3 pr-5 sm:pr-6 pl-3 text-right">
                    <Badge variant={STATUS_BADGE[ref.status] || 'secondary'} className="capitalize">{ref.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
