import React, { useState } from 'react';
import { db } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { XCircle, CheckCircle2, Clock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  active:   { label: 'Active',    cls: 'bg-success/10 text-success border border-success', icon: CheckCircle2 },
  past_due: { label: 'Past Due',  cls: 'bg-warning/10 text-warning border border-warning',       icon: Clock },
  canceled: { label: 'Canceled',  cls: 'bg-muted text-foreground border border-border',     icon: Ban },
  trialing: { label: 'Trialing',  cls: 'bg-accent text-primary border border-accent',          icon: Clock },
  unpaid:   { label: 'Unpaid',    cls: 'bg-destructive/10 text-destructive border border-destructive',             icon: XCircle },
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

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">Stripe Subscriptions</h3>
      </div>
      {subscriptions.length === 0 ? (
        <p className="text-sm text-foreground text-center py-10">No subscriptions found. Create your first one above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-muted">
                <th className="px-6 py-3 text-xs text-foreground font-semibold">Client</th>
                <th className="px-6 py-3 text-xs text-foreground font-semibold">Amount</th>
                <th className="px-6 py-3 text-xs text-foreground font-semibold">Status</th>
                <th className="px-6 py-3 text-xs text-foreground font-semibold">Next Payment</th>
                <th className="px-6 py-3 text-xs text-foreground font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => {
                const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.unpaid;
                const Icon = cfg.icon;
                const nextDate = sub.current_period_end
                  ? new Date(sub.current_period_end * 1000).toLocaleDateString()
                  : '—';
                return (
                  <tr key={sub.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="px-6 py-3.5 font-medium">{getClientName(sub)}</td>
                    <td className="px-6 py-3.5">${(sub.amount || 0).toLocaleString()}/{sub.interval || 'mo'}</td>
                    <td className="px-6 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.cls)}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-foreground">{nextDate}</td>
                    <td className="px-6 py-3.5">
                      {sub.status === 'active' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                          disabled={canceling === sub.id}
                          onClick={() => handleCancel(sub)}
                        >
                          {canceling === sub.id ? 'Canceling...' : 'Cancel'}
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
    </div>
  );
}