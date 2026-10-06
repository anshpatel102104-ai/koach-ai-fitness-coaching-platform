import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader, EmptyState, Initials } from '@/components/kit';
import { StatusDot, money } from '@/components/business/ui';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  active:   { label: 'Active',   tone: 'success' },
  past_due: { label: 'Past due', tone: 'danger' },
  canceled: { label: 'Canceled', tone: 'muted' },
  trialing: { label: 'Trial',    tone: 'muted' },
  unpaid:   { label: 'Unpaid',   tone: 'danger' },
};

export default function StripeSubscriptionTable({ subscriptions, clients, onRefresh }) {
  const [canceling, setCanceling] = useState(null);

  const handleCancel = async (sub) => {
    if (!confirm(`Cancel subscription ${sub.id}? This cannot be undone.`)) return;
    setCanceling(sub.id);
    await db.functions.invoke('stripeCancelSubscription', { subscription_id: sub.id });
    toast.success('Subscription canceled');
    onRefresh();
    setCanceling(null);
  };

  const getClientName = (sub) => {
    if (sub.metadata?.client_id) {
      const c = clients.find(c => c.id === sub.metadata.client_id);
      if (c) return c.name;
    }
    return sub.customer_email || sub.id;
  };

  const th = 'px-3 py-2.5 text-[13px] font-normal text-muted-foreground text-left whitespace-nowrap';

  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Subscriptions" subtitle={subscriptions.length ? `${subscriptions.length} in Stripe` : undefined} />
      {subscriptions.length === 0 ? (
        <EmptyState className="pt-2" title="No subscriptions yet" body="Start one with New subscription and it shows up here." />
      ) : (
        <div className="overflow-x-auto px-2 sm:px-3 pb-3">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Client</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={th}>Status</th>
                <th className={th}>Next payment</th>
                <th className={th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => {
                const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.unpaid;
                const nextDate = sub.current_period_end
                  ? new Date(sub.current_period_end * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—';
                const name = getClientName(sub);
                return (
                  <tr key={sub.id} className="border-b border-border last:border-b-0 hover:bg-accent/60 transition-colors">
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-3 min-w-0">
                        <Initials name={name} size={32} tone={cfg.tone === 'danger' ? 'alert' : 'default'} />
                        <span className="text-[15px] font-semibold text-foreground truncate">{name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="num text-[17px] text-foreground">{money(sub.amount || 0)}</span>
                      <span className="text-[13px] text-muted-foreground"> / {sub.interval || 'month'}</span>
                    </td>
                    <td className="px-3 py-3"><StatusDot tone={cfg.tone}>{cfg.label}</StatusDot></td>
                    <td className="px-3 py-3 text-sm text-foreground">{nextDate}</td>
                    <td className="px-3 py-3 text-right">
                      {sub.status === 'active' && (
                        <Button
                          size="sm"
                          variant="link"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={canceling === sub.id}
                          onClick={() => handleCancel(sub)}
                        >
                          {canceling === sub.id ? 'Canceling…' : 'Cancel'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
