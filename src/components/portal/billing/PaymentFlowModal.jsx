import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Lock, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusFooter } from '@/components/portal/PortalUI';
import { fmtMoney as fmt } from './shared';

/**
 * Pay an invoice. Card details are never collected in KOACH: the client pays on
 * Stripe's hosted page (the invoice's stripe_payment_url). If the coach hasn't
 * attached a payment link, say so and point to the coach — never pretend.
 *
 * (This replaced a mock checkout that showed a fake saved card, accepted raw
 * card numbers, "processed" for 2 seconds and charged nothing.)
 */
export default function PaymentFlowModal({ invoice, onClose }) {
  const navigate = useNavigate();
  const lineItems = invoice.line_items || [{ description: invoice.description || 'Coaching services', qty: 1, price: invoice.amount }];
  const payUrl = typeof invoice.stripe_payment_url === 'string' && /^https:\/\//.test(invoice.stripe_payment_url)
    ? invoice.stripe_payment_url
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="pay-invoice-title">
      <div className="flex max-h-[90vh] w-full max-w-[480px] flex-col rounded-t-xl bg-card">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 id="pay-invoice-title" className="text-[22px] text-foreground">Pay invoice</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="touch-compact inline-flex h-9 w-9 items-center justify-center rounded-lg bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))] hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="rounded-xl shadow-[0_0_0_1px_rgb(var(--border))]">
            <p className="border-b border-border px-4 py-3 text-[13px] text-muted-foreground">Invoice {invoice.invoice_number}</p>
            <ul className="divide-y divide-border px-4">
              {lineItems.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-foreground">{item.description || 'Service'}</span>
                  <span className="font-semibold tabular-nums text-foreground">{fmt((item.price || 0) * (item.qty || 1))}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-[15px] font-semibold text-foreground">Total</span>
              <span className="num text-[28px] text-foreground">{fmt(invoice.amount)}</span>
            </div>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            {payUrl
              ? "You'll pay on Stripe's secure page. Once your coach receives the payment, this invoice shows as paid."
              : "Online payment isn't set up for this invoice yet. Message your coach to arrange how to pay."}
          </p>
        </div>

        <FocusFooter>
          {payUrl ? (
            <>
              <Button asChild variant="brand" size="lg" className="h-[52px] w-full text-base font-bold">
                <a href={payUrl} target="_blank" rel="noopener noreferrer">
                  Pay {fmt(invoice.amount)} with Stripe <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Card details go to Stripe, never to KOACH
              </p>
            </>
          ) : (
            <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={() => { onClose(); navigate('/portal/messages'); }}>
              <MessageCircle className="h-4 w-4" /> Message your coach
            </Button>
          )}
        </FocusFooter>
      </div>
    </div>
  );
}
