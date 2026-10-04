import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, CheckCircle2, AlertCircle, Lock, ChevronRight } from 'lucide-react';
import { portalDb } from '@/api/supabaseClient';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Step 1 — Summary
function PaymentSummary({ invoice, onNext, onClose }) {
  const lineItems = invoice.line_items || [{ description: invoice.description || 'Coaching Services', qty: 1, price: invoice.amount }];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-white font-bold text-lg">Payment Summary</h2>
        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-4 border-b border-white/10">
            <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">Invoice {invoice.invoice_number}</p>
          </div>
          <div className="p-4 space-y-3">
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <p className="text-white text-sm">{item.description || 'Service'}</p>
                <p className="text-white font-semibold text-sm">{fmt((item.price || 0) * (item.qty || 1))}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-white font-bold">Total due</p>
            <p className="text-white font-black text-xl">{fmt(invoice.amount)}</p>
          </div>
        </div>

        {/* Saved card option */}
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Pay with</p>
          <div className="p-4 rounded-2xl" style={{ background: 'rgb(var(--primary) / 0.1)', border: '1px solid rgb(var(--primary) / 0.25)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-white text-sm font-semibold">●●●● 4242</p>
                  <p className="text-white/40 text-xs">Visa · Default</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-card" />
              </div>
            </div>
          </div>
          <button className="w-full mt-2 py-3 text-xs font-semibold text-white/40 flex items-center justify-center gap-1">
            Use a different card <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-8 pt-3">
        <button onClick={onNext}
          className="w-full py-4 rounded-2xl text-base font-black text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))', boxShadow: '0 8px 24px rgb(var(--primary) / 0.35)' }}>
          Continue — {fmt(invoice.amount)}
        </button>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Lock className="w-3 h-3 text-white/30" />
          <p className="text-white/30 text-xs">Secured by Stripe · PCI Compliant</p>
        </div>
      </div>
    </div>
  );
}

// Step 2 — Card input
function PaymentMethod({ invoice, onPay, onClose }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '', zip: '' });
  const [saveCard, setSaveCard] = useState(true);
  const isValid = card.name && card.number.length >= 16 && card.expiry && card.cvc.length >= 3;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-white font-bold text-lg">Payment Method</h2>
        <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-3">
        <div className="p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="p-3 space-y-3">
            <input
              value={card.number}
              onChange={e => setCard(c => ({ ...c, number: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
              placeholder="Card number"
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <div className="flex gap-3">
              <input
                value={card.expiry}
                onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))}
                placeholder="MM/YY"
                className="flex-1 px-4 py-3.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <input
                value={card.cvc}
                onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                placeholder="CVC"
                className="flex-1 px-4 py-3.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <input
              value={card.name}
              onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
              placeholder="Name on card"
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <input
              value={card.zip}
              onChange={e => setCard(c => ({ ...c, zip: e.target.value }))}
              placeholder="Billing zip code"
              className="w-full px-4 py-3.5 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-white text-sm font-semibold">Save for future payments</p>
            <p className="text-white/30 text-xs mt-0.5">Pay faster next time</p>
          </div>
          <button onClick={() => setSaveCard(s => !s)}
            className="w-11 h-6 rounded-full transition-all flex-shrink-0"
            style={{ background: saveCard ? 'rgb(var(--primary))' : 'rgba(255,255,255,0.1)' }}>
            <div className="w-4.5 h-4.5 bg-card rounded-full transition-all mx-1 mt-[3px]" style={{ transform: saveCard ? 'translateX(18px)' : 'translateX(0)' }} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-8 pt-3">
        <button onClick={() => onPay(card)} disabled={!isValid}
          className="w-full py-4 rounded-2xl text-base font-black text-white transition-all"
          style={{ background: isValid ? 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' : 'rgba(255,255,255,0.06)', color: isValid ? 'rgb(var(--card))' : 'rgba(255,255,255,0.3)' }}>
          Pay {fmt(invoice.amount)}
        </button>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Lock className="w-3 h-3 text-white/30" />
          <p className="text-white/30 text-xs">Secured by Stripe · PCI Compliant</p>
        </div>
      </div>
    </div>
  );
}

// Step 3 — Processing / result
function PaymentConfirmation({ invoice, status, error, user, onBack }) {
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-5 pb-16">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-blue-500 rounded-full animate-spin mb-6" />
        <p className="text-white font-bold text-xl">Processing payment...</p>
        <p className="text-white/40 text-sm mt-2">Please don't close this screen</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full px-5 pb-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgb(var(--success) / 0.2)' }}>
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>
        <h2 className="text-white font-black text-2xl mb-2">Payment Successful! 🎉</h2>
        <p className="text-success font-bold text-xl mb-1">{fmt(invoice.amount)}</p>
        <p className="text-white/40 text-sm mb-1">{invoice.invoice_number}</p>
        <p className="text-white/30 text-xs mb-8">Receipt sent to {user?.email}</p>
        <button onClick={onBack}
          className="w-full py-4 rounded-2xl text-base font-bold text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--ai)))' }}>
          Back to Billing
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full px-5 pb-16 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'rgb(var(--destructive) / 0.15)' }}>
        <AlertCircle className="w-10 h-10 text-destructive" />
      </div>
      <h2 className="text-white font-black text-2xl mb-2">Payment Failed</h2>
      <p className="text-destructive text-sm mb-1">{error || 'Your card was declined'}</p>
      <p className="text-white/30 text-xs mb-8">Please check your card details or contact your bank</p>
      <button onClick={onBack}
        className="w-full py-4 rounded-2xl text-base font-bold text-white mb-3"
        style={{ background: 'rgba(255,255,255,0.08)' }}>
        Try a Different Card
      </button>
    </motion.div>
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.85)' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28 }}
        className="w-full"
        style={{ background: 'rgb(var(--sidebar))', borderRadius: '24px 24px 0 0', height: '90vh', paddingBottom: 'env(safe-area-inset-bottom)', display: 'flex', flexDirection: 'column' }}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
                <PaymentSummary invoice={invoice} onNext={() => setStep('method')} onClose={onClose} />
              </motion.div>
            )}
            {step === 'method' && (
              <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full flex flex-col">
                <PaymentMethod invoice={invoice} onPay={handlePay} onClose={onClose} />
              </motion.div>
            )}
            {(step === 'processing' || step === 'success' || step === 'error') && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                <PaymentConfirmation
                  invoice={invoice}
                  status={step}
                  error={error}
                  user={user}
                  onBack={() => { step === 'success' ? onComplete() : setStep('method'); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}