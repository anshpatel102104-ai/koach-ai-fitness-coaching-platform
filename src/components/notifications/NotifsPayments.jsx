import React from 'react';
import { NSection, NRow, NDelivery, NMultiCheck } from './NotifsHelpers';
import { toast } from 'sonner';

const OVERDUE_OPTIONS = [
  { value: 'on_due', label: 'On due date' },
  { value: 'after_3', label: '+3 days' },
  { value: 'after_7', label: '+7 days' },
];

const DEFAULTS = {
  payment_received: { enabled: true, delivery: 'push_email' },
  payment_failed: { enabled: true, delivery: 'push_email' },
  invoice_overdue: { enabled: true, delivery: 'push_email', when: ['on_due', 'after_3'] },
  package_purchase: { enabled: true, delivery: 'push_email' },
  subscription_cancelled: { enabled: true, delivery: 'push_email' },
  payout_sent: { enabled: true, delivery: 'email' },
  dispute_opened: { enabled: true, delivery: 'push_email' },
};

export default function NotifsPayments({ s, set }) {
  const d = { ...DEFAULTS, ...(s.payments || {}) };
  const upd = (key, val) => set('payments', { ...d, [key]: { ...d[key], ...val } });

  return (
    <NSection title="Payments and business"
      onReset={() => set('payments', DEFAULTS)}
      onTest={() => toast.success('Test notification sent for payments')}>

      <NRow enabled={d.payment_received.enabled} onToggle={v => upd('payment_received', { enabled: v })}
        title="Payment received"
        description="Instant notification when a client pays an invoice">
        <NDelivery value={d.payment_received.delivery} onChange={v => upd('payment_received', { delivery: v })} />
      </NRow>

      <NRow enabled={d.payment_failed.enabled} onToggle={v => upd('payment_failed', { enabled: v })}
        title="Payment failed"
        description="Alert when a client's payment fails">
        <NDelivery value={d.payment_failed.delivery} onChange={v => upd('payment_failed', { delivery: v })} />
      </NRow>

      <NRow enabled={d.invoice_overdue.enabled} onToggle={v => upd('invoice_overdue', { enabled: v })}
        title="Invoice overdue"
        description="Notify when an invoice passes its due date unpaid">
        <NDelivery value={d.invoice_overdue.delivery} onChange={v => upd('invoice_overdue', { delivery: v })} />
        <NMultiCheck values={d.invoice_overdue.when || []} onChange={v => upd('invoice_overdue', { when: v })} options={OVERDUE_OPTIONS} />
      </NRow>

      <NRow enabled={d.package_purchase.enabled} onToggle={v => upd('package_purchase', { enabled: v })}
        title="New package purchase"
        description="Alert when someone purchases one of your coaching packages">
        <NDelivery value={d.package_purchase.delivery} onChange={v => upd('package_purchase', { delivery: v })} />
      </NRow>

      <NRow enabled={d.subscription_cancelled.enabled} onToggle={v => upd('subscription_cancelled', { enabled: v })}
        title="Subscription cancelled"
        description="Notify when a client cancels their coaching subscription">
        <NDelivery value={d.subscription_cancelled.delivery} onChange={v => upd('subscription_cancelled', { delivery: v })} />
      </NRow>

      <NRow enabled={d.payout_sent.enabled} onToggle={v => upd('payout_sent', { enabled: v })}
        title="Payout sent to bank"
        description="Confirmation when Stripe sends your payout">
        <NDelivery value={d.payout_sent.delivery} onChange={v => upd('payout_sent', { delivery: v })} options={['off', 'push', 'email', 'push_email']} />
      </NRow>

      <NRow enabled={d.dispute_opened.enabled} onToggle={v => upd('dispute_opened', { enabled: v })}
        locked={true}
        title="Payment dispute opened"
        description="Urgent alert when a client opens a chargeback">
        <NDelivery value={d.dispute_opened.delivery} onChange={v => upd('dispute_opened', { delivery: v })} />
      </NRow>
    </NSection>
  );
}