import React, { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { TIERS, TIER_ORDER } from '@/lib/subscription';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { openBillingPortal } from '@/lib/billing';
import { clientLimitLabel, aiLimitLabel } from '@/lib/planPricing';


const TIER_FEATURES = {
  starter: ['Workout program builder', 'Basic nutrition plans', 'Scheduling & calendar', 'In-app messaging', 'Basic progress tracking', 'Email support'],
  pro:     ['AI onboarding', 'Progress analytics & graphs', 'Check-in review system', 'AI check-in summaries & AI-drafted replies', 'Adherence scoring', 'Voice & video messages', 'Client mobile dashboard', 'Custom branding (logo)'],
  elite:   ['Full AI assistant', 'Auto progression rules', 'Sales pipeline CRM', 'Revenue dashboard', 'White-label branding', 'Community module', 'Zapier integrations'],
  enterprise: ['API access', 'Custom integrations', 'Dedicated account manager', 'Team accounts', 'Custom contract & invoicing'],
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
    `Limits become: ${clientLimitLabel(toTierKey)}, ${aiLimitLabel(toTierKey)}`,
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
    toast.success('Downgrade cancelled — your plan is unchanged.');
    onClose();
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-sidebar p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-warning" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Downgrade Confirmed</h3>
          <p className="text-muted-foreground text-sm mb-1">
            Your plan will change to <span className="text-white font-semibold">{toTier.name}</span> on <span className="text-white">{effectiveDate}</span>.
          </p>
          <p className="text-muted-foreground text-sm mb-6">You'll keep all {fromTier.name} features until then.</p>
          <button
            onClick={handleUndo}
            disabled={loading}
            className="text-sm text-primary hover:text-primary transition-colors underline"
          >
            {loading ? 'Undoing...' : 'Changed your mind? Undo downgrade'}
          </button>
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white border border-white/10 hover:bg-[var(--kc-w-5)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-sidebar shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Downgrade to {toTier.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Client over-limit warning */}
          {clientOverLimit && (
            <div className="flex gap-3 bg-warning/10 border border-warning/30 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Client limit exceeded</p>
                <p className="text-xs text-warning/80 mt-0.5">
                  You have {clientCount} clients but {toTier.name} only allows {newClientLimit}. Your existing clients stay (nothing is deleted), but they become read-only and you can't add new clients until you're back under the limit.
                </p>
              </div>
            </div>
          )}

          {/* Effective date */}
          <div className="bg-card/[0.03] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Effective date</p>
            <p className="text-white font-semibold mt-0.5">{effectiveDate}</p>
            <p className="text-xs text-muted-foreground mt-1">You keep all {fromTier.name} features until the end of your billing period.</p>
          </div>

          {/* Features being lost */}
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground mb-3">Features you'll lose</p>
            <div className="space-y-2">
              {losingFeatures.map(f => (
                <div key={f} className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  <span className="text-destructive text-sm flex-shrink-0">❌</span>
                  <span className="text-xs text-sidebar-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            {/* Keep current — prominent */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-bold text-primary-foreground transition-all"
              style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))', boxShadow: '0 0 20px color-mix(in srgb, var(--tc-ai) 25%, transparent)' }}
            >
              Keep {fromTier.name} Plan
            </button>
            {/* Confirm downgrade — less prominent */}
            <button
              onClick={handleDowngrade}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {loading ? 'Opening portal...' : `Continue to billing portal`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}