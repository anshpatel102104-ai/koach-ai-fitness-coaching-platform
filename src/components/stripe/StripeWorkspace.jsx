import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/supabaseClient';
import { Panel, KeyValue } from '@/components/kit';
import StripeRevenueSummary from './StripeRevenueSummary';
import StripeRevenueChart from './StripeRevenueChart';
import StripeSubscriptionTable from './StripeSubscriptionTable';
import CreateSubscriptionDialog from './CreateSubscriptionDialog';
import PaymentLinksPanel from './PaymentLinksPanel';
import SubscriptionPlansPanel from './SubscriptionPlansPanel';

/** Stripe revenue, payment health, subscriptions, links and plans. Used by /revenue and /business. */
export function useStripeDashboard(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['stripe-dashboard'],
    queryFn: async () => {
      const res = await db.functions.invoke('stripeGetDashboard', {});
      return res.data;
    },
    refetchInterval: 60000,
  });
}

export default function StripeWorkspace({ showCreate, setShowCreate }) {
  const { data: dashData, isLoading, refetch } = useStripeDashboard();
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
  });

  return (
    <>
      {isLoading ? (
        <p className="py-16 text-sm text-muted-foreground">Loading Stripe…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <StripeRevenueSummary data={dashData} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2"><StripeRevenueChart data={dashData?.monthly_revenue || []} /></div>
            <Panel className="px-5 py-5 sm:px-6 sm:py-6">
              <h2 className="text-[22px] text-foreground mb-2">Payment health</h2>
              <KeyValue label="Active subscriptions" value={dashData?.active_subscriptions || 0} />
              <KeyValue label="Past due" value={<span className={dashData?.past_due ? 'text-destructive' : ''}>{dashData?.past_due || 0}</span>} />
              <KeyValue label="Canceled" value={dashData?.canceled || 0} />
              <KeyValue label="Failed charges" value={<span className={dashData?.failed_charges ? 'text-destructive' : ''}>{dashData?.failed_charges || 0}</span>} />
            </Panel>
          </div>
          <StripeSubscriptionTable subscriptions={dashData?.subscriptions || []} clients={clients} onRefresh={refetch} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PaymentLinksPanel />
            <SubscriptionPlansPanel />
          </div>
        </div>
      )}

      <CreateSubscriptionDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        clients={clients}
        onSuccess={() => { setShowCreate(false); refetch(); }}
      />
    </>
  );
}
