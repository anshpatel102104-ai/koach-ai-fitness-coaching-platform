import React from 'react';
import { Panel, Stat } from '@/components/kit';

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AffiliateEarningsOverview({ profile }) {
  return (
    <Panel className="grid grid-cols-2 lg:grid-cols-5 gap-px overflow-hidden bg-border [&>*]:bg-card [&>*]:px-5 [&>*]:py-4 sm:[&>*]:px-6">
      <Stat label="Total earned" value={money(profile.total_earned)} />
      <Stat label="This month" value={money(profile.month_earnings)} />
      <Stat label="Clearing" value={money(profile.pending_balance)} sub="paid after 30 days" />
      <Stat label="Active referrals" value={profile.active_referrals || 0} />
      <Stat label="Conversion" value={`${Number(profile.conversion_rate || 0).toFixed(1)}%`} sub="clicks to sign-ups" />
    </Panel>
  );
}
