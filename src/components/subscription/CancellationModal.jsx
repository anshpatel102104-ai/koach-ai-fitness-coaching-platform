import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  expensive:       { headline: 'Would 30% off for the next 3 months help?', cta: 'Take 30% off', code: 'SAVE30' },
  not_using:       { headline: 'Would a free one-to-one setup call help?', cta: 'Book a free call', code: null },
  missing_feature: { headline: 'Tell us what you need. It may already be in the works.', cta: 'Request a feature', code: null },
  switching:       { headline: "What does the other platform do that we don't?", cta: 'Send feedback', code: null },
  break:           { headline: 'Pause for a month instead of cancelling?', cta: 'Pause for a month', code: 'PAUSE1' },
  other:           { headline: "Tell us what we could do better.", cta: 'Send feedback', code: null },
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
    toast.success('We will be in touch shortly');
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
    toast.success('Subscription reactivated');
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>
          {step === 'reason' && 'Cancel your plan'}
          {step === 'offer' && 'Before you go'}
          {step === 'done' && 'Cancellation confirmed'}
        </DialogTitle>

        {step === 'reason' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">What's the main reason? It helps us fix the right thing.</p>
            <div className="space-y-1">
              {REASONS.map(r => (
                <label
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer transition-colors',
                    selectedReason === r.id ? 'bg-secondary font-medium text-foreground' : 'text-foreground hover:bg-accent/60'
                  )}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    className="accent-[rgb(var(--foreground))]"
                    checked={selectedReason === r.id}
                    onChange={() => setSelectedReason(r.id)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleContinue} disabled={!selectedReason}>Continue cancelling</Button>
              <Button onClick={onClose}>Keep my plan</Button>
            </div>
          </div>
        )}

        {step === 'offer' && offer && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary px-4 py-4">
              <p className="text-[17px] font-semibold text-foreground">{offer.headline}</p>
              {offer.code && (
                <p className="text-[13px] text-muted-foreground mt-1">Code <span className="font-mono font-semibold text-foreground">{offer.code}</span></p>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="link" className="text-muted-foreground sm:mr-auto" onClick={handleCancelAnyway} disabled={loading}>
                {loading ? 'Cancelling…' : 'Cancel anyway'}
              </Button>
              <Button onClick={handleAcceptOffer}>{offer.cta}</Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">You keep every {userTier.name} feature until</p>
              <p className="num text-[28px] text-foreground mt-1">{renewalDate}</p>
              <p className="text-sm text-muted-foreground mt-2">Thanks for telling us why.</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={handleReactivate} disabled={loading}>
                {loading ? 'Reactivating…' : 'Reactivate subscription'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
