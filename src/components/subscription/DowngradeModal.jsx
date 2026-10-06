import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TIERS, TIER_ORDER } from '@/lib/subscription';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { openBillingPortal } from '@/lib/billing';
import { clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';


const TIER_FEATURES = {
  starter: ['Workout program builder', 'Basic nutrition plans', 'Scheduling and calendar', 'In-app messaging', 'Basic progress tracking', 'Email support'],
  pro:     ['AI onboarding', 'Progress analytics and graphs', 'Check-in review', 'AI check-in summaries and drafted replies', 'Adherence scoring', 'Voice and video messages', 'Client mobile dashboard', 'Custom branding (logo)'],
  elite:   ['Full AI assistant', 'Auto progression rules', 'Sales pipeline', 'Revenue dashboard', 'White-label branding', 'Community module', 'Zapier integrations'],
  enterprise: ['API access', 'Custom integrations', 'Dedicated account manager', 'Team accounts', 'Custom contract and invoicing'],
};

export default function DowngradeModal({ fromTierKey, toTierKey, clientCount = 0, renewalDate, user, onClose, onUserUpdate }) {
  const { me } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fromTier = TIERS[fromTierKey];
  const toTier = TIERS[toTierKey];

  // Features being lost (from tiers between toTierKey and fromTierKey)
  const fromIdx = TIER_ORDER.indexOf(fromTierKey);
  const toIdx = TIER_ORDER.indexOf(toTierKey);
  const losingFeatures = [
    `Limits drop to ${clientLimitLabel(toTierKey).toLowerCase()}, ${aiLimitLabel(toTierKey)}`,
    ...TIER_ORDER.slice(toIdx + 1, fromIdx + 1).flatMap(k => TIER_FEATURES[k]),
  ];

  const newClientLimit = toTier.limits.max_clients;
  const clientOverLimit = newClientLimit !== -1 && clientCount > newClientLimit;

  const effectiveDate = renewalDate || (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  // Downgrades are made in the Stripe customer portal, which is configured to
  // apply them at the end of the billing period (and handles monthly/yearly).
  const handleDowngrade = async () => {
    setLoading(true);
    try {
      await openBillingPortal(db);
    } catch (e) {
      setLoading(false);
      toast.error(e.message || 'Something went wrong.');
    }
  };

  const handleUndo = async () => {
    setLoading(true);
    await db.functions.invoke('stripeCheckout', { action: 'reactivate' });
    setLoading(false);
    const updated = await me();
    if (onUserUpdate) onUserUpdate(updated);
    toast.success('Downgrade cancelled. Your plan is unchanged.');
    onClose();
  };

  if (confirmed) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Downgrade booked</DialogTitle>
          <p className="text-sm text-muted-foreground">
            You move to <span className="font-semibold text-foreground">{toTier.name}</span> on <span className="text-foreground">{effectiveDate}</span>. {fromTier.name} features stay on until then.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button variant="link" className="sm:mr-auto" onClick={handleUndo} disabled={loading}>
              {loading ? 'Undoing…' : 'Undo the downgrade'}
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <div>
          <DialogTitle>Downgrade to {toTier.name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Takes effect {effectiveDate}. You keep {fromTier.name} until the end of this billing period.
          </p>
        </div>

        {clientOverLimit && (
          <p className="text-sm text-foreground border-l-2 border-warning pl-3">
            <span className="font-semibold">You have {clientCount} clients; {toTier.name} allows {newClientLimit}.</span>{' '}
            Nobody is deleted, but existing clients go read-only and you can't add new ones until you're under the limit.
          </p>
        )}

        <div>
          <p className="text-[13px] text-muted-foreground mb-2">What you lose</p>
          <ul className="space-y-1.5">
            {losingFeatures.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-[9px] h-px w-2.5 bg-muted-foreground flex-shrink-0" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleDowngrade} disabled={loading}>
            {loading ? 'Opening Stripe…' : 'Continue in Stripe'}
          </Button>
          <Button onClick={onClose}>Keep {fromTier.name}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
