import React, { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Zap, X, AlertTriangle, ExternalLink, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db } from '@/api/supabaseClient';
import { openBillingPortal } from '@/lib/billing';
import { billingAccess } from '@/lib/billingAccess';
import { getUserTier } from '@/lib/subscription';

const fmt = (v) => new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/**
 * Global billing banners (rendered by AppLayout above every coach page):
 *  - payment failed, inside the 3-day grace period → "fix your payment"
 *  - free trial running (Stripe trial or the 14-day migration trial)
 *  - over the plan's client cap after a downgrade → existing clients read-only
 */
export default function BillingBanners({ user }) {
  const navigate = useNavigate();
  const [dismissedTrial, setDismissedTrial] = useState(false);
  const [opening, setOpening] = useState(false);

  const tier = getUserTier(user);
  const cap = tier.limits.max_clients;
  const exempt = !user || user.is_comped || user.role === 'admin';
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => db.entities.Client.list(),
    enabled: !exempt && cap !== -1,
  });

  if (!user) return null;
  const access = billingAccess(user);

  const fixPayment = async () => {
    setOpening(true);
    try { await openBillingPortal(db); } catch (e) { setOpening(false); toast.error(e.message); }
  };

  const banners = [];

  if (access.reason === 'grace') {
    banners.push(
      <div key="pastdue" className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm mb-5 bg-destructive/10 border border-destructive/30">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            Payment failed — fix your payment by {fmt(access.graceEndsAt)} to keep your access.
          </span>
        </div>
        <button
          onClick={fixPayment}
          disabled={opening}
          className="flex items-center gap-1.5 text-xs font-bold text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0 disabled:opacity-50"
        >
          <ExternalLink className="w-3 h-3" /> {opening ? 'Opening…' : 'Fix payment'}
        </button>
      </div>
    );
  }

  const trialEnd = user.billing_status === 'trialing' ? (user.trial_ends_at || user.current_period_end || user.subscription_renewal_date)
    : access.reason === 'trial' ? access.trialEndsAt : null;
  if (trialEnd && !dismissedTrial) {
    const daysLeft = differenceInDays(new Date(trialEnd), new Date());
    if (daysLeft >= 0) {
      const urgent = daysLeft <= 3;
      const isStripeTrial = user.billing_status === 'trialing';
      banners.push(
        <div key="trial" className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm mb-5 ${urgent ? 'bg-warning/10 border border-warning/30' : 'bg-primary/10 border border-primary/20'}`}>
          <div className={`flex items-center gap-2 ${urgent ? 'text-warning' : 'text-primary'}`}>
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">
              You're on a free trial —{' '}
              <span className="font-bold">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</span>
              {!isStripeTrial && ' · subscribe to keep your access'}
              {urgent && ' · Trial ending soon!'}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/subscription')}
              className="text-xs font-bold text-primary-foreground px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-ai))' }}
            >
              {isStripeTrial ? 'Manage plan' : 'Subscribe'}
            </button>
            <button onClick={() => setDismissedTrial(true)} className="text-muted-foreground hover:text-border" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }
  }

  // Over the cap: existing clients are kept (never deleted or hidden).
  if (!exempt && cap !== -1 && clients.length > cap) {
    const readOnly = !!user.stripe_subscription_id; // mirrors app.enforce_client_cap
    banners.push(
      <div key="cap" className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm mb-5 bg-warning/10 border border-warning/30">
        <div className="flex items-center gap-2 text-warning">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            You have {clients.length} clients but your {tier.name} plan allows {cap}.{' '}
            {readOnly
              ? 'Your existing clients are safe but read-only, and you can’t add new ones until you upgrade or are back under the limit.'
              : 'Your existing clients are safe, but you can’t add new ones until you upgrade or are back under the limit.'}
          </span>
        </div>
        <button
          onClick={() => navigate('/subscription')}
          className="text-xs font-bold text-warning border border-warning/30 px-3 py-1.5 rounded-lg hover:bg-warning/10 transition-colors flex-shrink-0"
        >
          Upgrade
        </button>
      </div>
    );
  }

  if (!banners.length) return null;
  return <div className="px-4 sm:px-6 pt-4">{banners}</div>;
}
