import React, { useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { Page, PageHeader } from '@/components/kit';
import { Button } from '@/components/ui/button';
import StripeWorkspace, { useStripeDashboard } from '@/components/stripe/StripeWorkspace';
import { InsightsNav, money } from '@/components/business/ui';

export default function RevenueDashboard() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: dashData, refetch, isFetching } = useStripeDashboard();

  const atRisk = (dashData?.past_due || 0) + (dashData?.failed_charges || 0);
  const subtitle = dashData
    ? `${money(dashData.mrr || 0)} a month from ${dashData.active_subscriptions || 0} Stripe subscriptions. ${atRisk ? `${atRisk} need${atRisk === 1 ? 's' : ''} attention.` : 'Nothing failing.'}`
    : 'Subscriptions, recurring revenue and payment health from Stripe.';

  return (
    <Page>
      <PageHeader
        title="Insights"
        subtitle={subtitle}
        actions={(
          <>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> New subscription
            </Button>
          </>
        )}
      />
      <InsightsNav className="mb-5" />
      <StripeWorkspace showCreate={showCreate} setShowCreate={setShowCreate} />
    </Page>
  );
}
