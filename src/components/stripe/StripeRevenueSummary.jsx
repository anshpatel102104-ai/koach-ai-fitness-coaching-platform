import React from 'react';
import { StatStrip, money } from '@/components/business/ui';

export default function StripeRevenueSummary({ data }) {
  const atRisk = (data?.past_due || 0) + (data?.failed_charges || 0);
  return (
    <StatStrip
      items={[
        { label: 'Monthly recurring', value: money(data?.mrr || 0) },
        { label: 'Collected in Stripe', value: money(data?.total_revenue || 0, { compact: true }) },
        { label: 'Active subscriptions', value: data?.active_subscriptions || 0 },
        { label: 'Failed or past due', value: atRisk, tone: atRisk ? 'danger' : undefined },
      ]}
    />
  );
}
