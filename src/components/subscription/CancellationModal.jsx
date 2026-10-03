import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { getUserTier } from '@/lib/subscription';

const REASONS = [
  { id: 'expensive', label: 'Too expensive' },
  { id: 'not_using', label: "Not using it enough" },
  { id: 'missing_feature', label: 'Missing a feature I need' },
  { id: 'switching', label: 'Switching to another platform' },
  { id: 'break', label: 'Taking a break from coaching' },
  { id: 'other', label: 'Other' },
];

const RETENTION_OFFERS = {
  expensive:       { headline: 'How about 30% off for 3 months?', cta: 'Get 30% Discount', code: 'SAVE30' },
  not_using:       { headline: "Would a free 1-on-1 onboarding call help?", cta: 'Book Free Call', code: null },
  missing_feature: { headline: "Tell us what you need — we might be building it", cta: 'Request Feature', code: null },
  switching:       { headline: "What does the other platform offer that we don't?", cta: 'Give Feedback', code: null },
  break:           { headline: 'Pause your subscription instead of cancelling?', cta: 'Pause for 1 Month', code: 'PAUSE1' },
  other:           { headline: "We'd love to know how we can improve", cta: 'Share Feedback', code: null },
};

export default function CancellationModal({ user, onClose, onUserUpdate }) {
  const { me } = useAuth();
  const [step, setStep] = useState('reason'); // reason | offer | done
  const [selectedReason, setSelectedReason] = useState(null);
  const [loading, setLoading] = useState(false);

  const userTier = getUserTier(user);
  const renewalDate = user?.subscription_renewal_date || (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  const offer = selectedReason ? RETENTION_OFFERS[selectedReason] : null;

  const handleContinue = () => {
    if (!selectedReason) return;
    setStep('offer');
  };

  const handleAcceptOffer = () => {
    toast.success('Our team will reach out shortly!');
    onClose();
  };

  const handleCancelAnyway = async () => {
    setLoading(true);
    const res = await db.functions.invoke('stripeCheckout', { action: 'cancel' });
    setLoading(false);

    if (res.data?.canceled) {
      const updated = await me();
      if (onUserUpdate) onUserUpdate(updated);
      setStep('done');
    } else {
      toast.error(res.data?.error || 'Could not cancel. Please try again or contact support.');
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    await db.functions.invoke('stripeCheckout', { action: 'reactivate' });
    setLoading(false);
    const updated = await me();
    if (onUserUpdate) onUserUpdate(updated);
    toast.success('Subscription reactivated!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-sidebar shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">
            {step === 'reason' && "We're sorry to see you go 😢"}
            {step === 'offer' && 'Before you go...'}
            {step === 'done' && 'Cancellation confirmed'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1 — Reason */}
          {step === 'reason' && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">Help us improve by telling us why you're leaving:</p>
              <div className="space-y-2">
                {REASONS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                      selectedReason === r.id
                        ? 'border-primary/50 bg-primary/10 text-white'
                        : 'border-white/10 bg-card/[0.03] text-sidebar-foreground hover:border-white/20'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedReason === r.id ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {selectedReason === r.id && <div className="w-1.5 h-1.5 rounded-full bg-card" />}
                    </div>
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleContinue}
                  disabled={!selectedReason}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue with cancellation
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-primary-foreground transition-all"
                  style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))' }}
                >
                  Keep my plan
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Retention offer */}
          {step === 'offer' && offer && (
            <div className="space-y-5">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-lg font-bold text-white mb-2">{offer.headline}</p>
                {offer.code && (
                  <p className="text-xs text-muted-foreground">Use code: <span className="font-mono font-bold text-primary">{offer.code}</span></p>
                )}
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleAcceptOffer}
                  className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground transition-all"
                  style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 20px color-mix(in srgb, var(--tc-ai) 25%, transparent)' }}
                >
                  {offer.cta}
                </button>
                <button
                  onClick={handleCancelAnyway}
                  disabled={loading}
                  className="w-full text-center text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors py-2"
                >
                  {loading ? 'Cancelling...' : 'Cancel anyway'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 'done' && (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-sidebar border border-white/10 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-sidebar-foreground" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Your account remains active until</p>
                <p className="text-primary font-bold text-lg">{renewalDate}</p>
                <p className="text-muted-foreground text-sm mt-2">You keep all {userTier.name} features until then. Thank you for your feedback!</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleReactivate}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  {loading ? 'Reactivating...' : 'Reactivate subscription'}
                </button>
                <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-sidebar-foreground py-2 transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}