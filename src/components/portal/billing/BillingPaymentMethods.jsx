import React from 'react';
import { Lock } from 'lucide-react';

/**
 * KOACH stores no card details. Clients pay invoices on Stripe's hosted page,
 * where Stripe offers to remember the card. (This replaced a mock "saved cards"
 * list with an invented Visa •••• 4242 and a card form that saved nothing.)
 */
export default function BillingPaymentMethods() {
  return (
    <section className="panel p-4">
      <h2 className="text-xl text-foreground">Payment methods</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You enter your card on Stripe's secure page when you pay an invoice, and Stripe can remember it for next time.
        KOACH never sees or stores your card details.
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Payments are processed by Stripe.
      </p>
    </section>
  );
}
