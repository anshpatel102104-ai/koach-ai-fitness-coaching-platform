import React, { useState } from 'react';
import { PLAN_PRICES, clientLimitLabel, aiLimitLabel, PLAN_HIGHLIGHTS } from '@/lib/planPricing';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeyValue, Segmented } from '@/components/kit';
import { TIERS, TIER_ORDER } from '@/lib/subscription';
import { db } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import SuccessScreen from './SuccessScreen';


// One source for plan features (lib/planPricing.js).
const TIER_FEATURES = PLAN_HIGHLIGHTS;


export default function UpgradeCompareModal({ fromTierKey, toTierKey, billing: initialBilling, clientCount = 0, user, onClose, onUserUpdate }) {
  const { me } = useAuth();
  const [billing, setBilling] = useState(initialBilling || 'monthly');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const fromTier = TIERS[fromTierKey];
  const toTier = TIERS[toTierKey];
  const fromPrices = PLAN_PRICES[fromTierKey];
  const toPrices = PLAN_PRICES[toTierKey];

  const fromPrice = billing === 'annual' ? fromPrices.annual : fromPrices.monthly;
  const toPrice = billing === 'annual' ? toPrices.annual : toPrices.monthly;
  const diff = toPrice - fromPrice;

  // Features gained (in toTier not in fromTier, only the unique new ones)
  const fromIdx = TIER_ORDER.indexOf(fromTierKey);
  const newFeatures = [
    clientLimitLabel(toTierKey),
    aiLimitLabel(toTierKey),
    ...TIER_ORDER.slice(fromIdx + 1, TIER_ORDER.indexOf(toTierKey) + 1).flatMap(k => TIER_FEATURES[k]),
  ];

  const billedAmount = billing === 'annual' ? `$${toPrices.yearly.toLocaleString('en-US')}/yr` : `$${toPrices.monthly}/mo`;

  const nextBillingDate = () => {
    const d = new Date();
    if (billing === 'annual') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleConfirm = async () => {
    setLoading(true);
    const res = await db.functions.invoke('stripeCheckout', {
      action: 'checkout',
      tier: toTierKey,
      billing_cycle: billing,
      success_url: `${window.location.origin}/subscription?success=1`,
      cancel_url: `${window.location.origin}/subscription`,
    });
    setLoading(false);

    if (res.data?.url) {
      window.location.href = res.data.url;
    } else if (res.data?.upgraded) {
      const updated = await me();
      if (onUserUpdate) onUserUpdate(updated);
      setSuccessData({ tier: toTierKey, price: toPrice, billing, nextDate: nextBillingDate(), email: user?.email });
      setShowSuccess(true);
    } else {
      toast.error(res.data?.error || 'Something went wrong. Please try again.');
    }
  };

  if (showSuccess && successData) {
    return <SuccessScreen {...successData} onClose={onClose} />;
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <div>
          <DialogTitle>Upgrade to {toTier.name}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            From {fromTier.name} at ${fromPrice} to {toTier.name} at ${toPrice} a month, ${Math.abs(diff)} more.
          </p>
        </div>

        <Segmented
          size="sm"
          className="self-start"
          value={billing}
          onChange={setBilling}
          options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Yearly, save 20%' }]}
        />

        <div>
          <p className="text-[13px] text-muted-foreground mb-2">What you add</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {newFeatures.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-[3px]" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-secondary px-4 py-2">
          <KeyValue label={`${toTier.name}, billed ${billing === 'annual' ? 'yearly' : 'monthly'}`} value={billedAmount} />
          <KeyValue label="Next bill" value={nextBillingDate()} />
          {billing === 'monthly' && toPrices.annualSave > 0 && (
            <p className="text-[13px] text-muted-foreground py-2">Yearly billing saves ${toPrices.annualSave} a year.</p>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground -mt-1">Upgrades are prorated. Promo codes go in at checkout. Payment is handled by Stripe.</p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Not now</Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing…' : `Start ${toTier.name}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
