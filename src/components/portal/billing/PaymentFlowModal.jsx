import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle, Lock, Loader2, X } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FocusFooter } from '@/components/portal/PortalUI';
import { fmtMoney as fmt } from './shared';

function Secure() {
  return (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
      <Lock className="h-3.5 w-3.5" /> Payments are handled by Stripe
    </p>
  );
}

// Step 1 — Summary
function PaymentSummary({ invoice, onNext }) {
  const lineItems = invoice.line_items || [{ description: invoice.description || 'Coaching services', qty: 1, price: invoice.amount }];

  return (
    <>
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

        <p className="mt-5 text-[13px] text-muted-foreground">Pay with</p>
        <div className="mt-2 flex items-center gap-3 rounded-lg px-4 py-3 shadow-[inset_0_0_0_2px_rgb(var(--foreground))]">
          <CreditCard className="h-5 w-5 text-foreground" />
          <span className="flex-1">
            <span className="block text-[15px] font-semibold tabular-nums text-foreground">•••• 4242</span>
            <span className="block text-[13px] text-muted-foreground">Visa, default</span>
          </span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" strokeWidth={3} /></span>
        </div>
        <button type="button" onClick={onNext} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-4">
          Use a different card
        </button>
      </div>
      <FocusFooter>
        <Button variant="brand" size="lg" className="h-[52px] w-full text-base font-bold" onClick={onNext}>
          Continue to pay {fmt(invoice.amount)}
        </Button>
        <Secure />
      </FocusFooter>
    </>
  );
}

// Step 2 — Card input
function PaymentMethod({ invoice, onPay }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '', zip: '' });
  const [saveCard, setSaveCard] = useState(true);
  const isValid = card.name && card.number.length >= 16 && card.expiry && card.cvc.length >= 3;

  return (
    <>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pb-5">
        <Input value={card.number} inputMode="numeric"
          onChange={e => setCard(c => ({ ...c, number: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
          placeholder="Card number" className="h-12 text-base" />
        <div className="flex gap-2.5">
          <Input value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))} placeholder="MM/YY" className="h-12 text-base" />
          <Input value={card.cvc} inputMode="numeric"
            onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            placeholder="CVC" className="h-12 text-base" />
        </div>
        <Input value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} placeholder="Name on card" className="h-12 text-base" />
        <Input value={card.zip} onChange={e => setCard(c => ({ ...c, zip: e.target.value }))} placeholder="Billing zip code" className="h-12 text-base" />

        <label className="flex items-center justify-between gap-3 pt-2">
          <span>
            <span className="block text-[15px] font-semibold text-foreground">Save for next time</span>
            <span className="block text-[13px] text-muted-foreground">Skip typing it again</span>
          </span>
          <Switch checked={saveCard} onCheckedChange={setSaveCard} />
        </label>
      </div>
      <FocusFooter>
        <Button variant="brand" size="lg" className="h-[52px] w-full text-base font-bold" onClick={() => onPay(card)} disabled={!isValid}>
          Pay {fmt(invoice.amount)}
        </Button>
        <Secure />
      </FocusFooter>
    </>
  );
}

// Step 3 — Processing / result
function PaymentConfirmation({ invoice, status, error, user, onBack }) {
  if (status === 'processing') {
    return (
      <div className="flex flex-1 flex-col items-start justify-center px-5 pb-16">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        <h2 className="mt-4 text-[28px] text-foreground">Taking payment</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Keep this screen open for a moment.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <>
        <div className="flex-1 px-5 pt-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white"><Check className="h-7 w-7" strokeWidth={3} /></span>
          <h2 className="mt-5 text-[32px] text-foreground">Paid</h2>
          <p className="num mt-1 text-[28px] text-foreground">{fmt(invoice.amount)}</p>
          <p className="mt-1 text-[15px] text-muted-foreground">{invoice.invoice_number}. Receipt sent to {user?.email}.</p>
        </div>
        <FocusFooter>
          <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={onBack}>Back to billing</Button>
        </FocusFooter>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 px-5 pt-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertCircle className="h-7 w-7" /></span>
        <h2 className="mt-5 text-[32px] text-foreground">Payment didn't go through</h2>
        <p className="mt-1 text-[15px] text-destructive">{error || 'Your card was declined.'}</p>
        <p className="mt-1 text-[15px] text-muted-foreground">Check the card details or try another card.</p>
      </div>
      <FocusFooter>
        <Button size="lg" className="h-[52px] w-full text-base font-bold" onClick={onBack}>Try another card</Button>
      </FocusFooter>
    </>
  );
}

export default function PaymentFlowModal({ invoice, client, user, onClose, onComplete }) {
  const [step, setStep] = useState('summary'); // summary | method | processing | success | error
  const [error, setError] = useState(null);

  const handlePay = async (cardData) => {
    setStep('processing');
    // Simulate payment processing (in production, use Stripe)
    await new Promise(r => setTimeout(r, 2000));
    try {
      await portalDb.entities.Invoice.update(invoice.id, { status: 'paid', paid_date: new Date().toISOString().split('T')[0] });
      await portalDb.entities.Payment.create({
        client_id: client.id,
        client_name: client.name,
        amount: invoice.amount,
        status: 'paid',
        description: invoice.description || invoice.invoice_number,
        paid_date: new Date().toISOString().split('T')[0],
      });
      setStep('success');
    } catch (e) {
      setError(e.message || 'Payment failed');
      setStep('error');
    }
  };

  const title = step === 'summary' ? 'Pay invoice' : step === 'method' ? 'Card details' : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
      <div className="flex h-[90vh] w-full max-w-[480px] flex-col rounded-t-xl bg-card">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-[22px] text-foreground">{title || ''}</h2>
          {step !== 'processing' && (
            <button type="button" onClick={onClose} aria-label="Close"
              className="touch-compact inline-flex h-9 w-9 items-center justify-center rounded-lg bg-card text-foreground shadow-[0_0_0_1px_rgb(var(--border))] hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {step === 'summary' && <PaymentSummary invoice={invoice} onNext={() => setStep('method')} onClose={onClose} />}
        {step === 'method' && <PaymentMethod invoice={invoice} onPay={handlePay} onClose={onClose} />}
        {(step === 'processing' || step === 'success' || step === 'error') && (
          <PaymentConfirmation
            invoice={invoice}
            status={step}
            error={error}
            user={user}
            onBack={() => { step === 'success' ? onComplete() : setStep('method'); }}
          />
        )}
      </div>
    </div>
  );
}
