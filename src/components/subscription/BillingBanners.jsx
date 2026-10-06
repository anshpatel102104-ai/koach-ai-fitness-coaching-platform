import React, { useState } from 'react';
import { differenceInDays } from 'date-fns';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const bar = (key, children, { alert = false } = {}) => (
    <div
      key={key}
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-card px-4 py-2.5 text-sm shadow-[0_0_0_1px_rgb(var(--border)/0.6)]',
        alert && 'border-l-[3px] border-destructive'
      )}
    >
      {children}
    </div>
  );
  const link = 'touch-compact text-sm font-semibold text-foreground underline underline-offset-4 decoration-1 hover:decoration-2 flex-shrink-0 disabled:opacity-50';

  if (access.reason === 'grace') {
    banners.push(bar('pastdue', (
      <>
        <p className="flex-1 min-w-[220px]">
          <span className="font-semibold text-destructive">Your payment failed.</span>{' '}
          <span className="text-muted-foreground">Fix it by {fmt(access.graceEndsAt)} to keep access.</span>
        </p>
        <button onClick={fixPayment} disabled={opening} className={link}>{opening ? 'Opening…' : 'Fix payment'}</button>
      </>
    ), { alert: true }));
  }

  const trialEnd = user.billing_status === 'trialing' ? (user.trial_ends_at || user.current_period_end || user.subscription_renewal_date)
    : access.reason === 'trial' ? access.trialEndsAt : null;
  if (trialEnd && !dismissedTrial) {
    const daysLeft = differenceInDays(new Date(trialEnd), new Date());
    if (daysLeft >= 0) {
      const urgent = daysLeft <= 3;
      const isStripeTrial = user.billing_status === 'trialing';
      banners.push(bar('trial', (
        <>
          <p className="flex-1 min-w-[220px] text-muted-foreground">
            <span className="font-semibold text-foreground">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your free trial.</span>
            {!isStripeTrial && ' Subscribe to keep access.'}
            {urgent && isStripeTrial && ' Your plan starts when it ends.'}
          </p>
          <button onClick={() => navigate('/subscription')} className={link}>
            {isStripeTrial ? 'Manage plan' : 'Subscribe'}
          </button>
          <button onClick={() => setDismissedTrial(true)} className="touch-compact p-1 -mr-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </>
      )));
    }
  }

  // Over the cap: existing clients are kept (never deleted or hidden).
  if (!exempt && cap !== -1 && clients.length > cap) {
    const readOnly = !!user.stripe_subscription_id; // mirrors app.enforce_client_cap
    banners.push(bar('cap', (
      <>
        <p className="flex-1 min-w-[220px] text-muted-foreground">
          <span className="font-semibold text-foreground">{clients.length} clients on a {tier.name} plan that allows {cap}.</span>{' '}
          {readOnly
            ? 'Existing clients are safe but read-only, and new ones wait until you upgrade or drop under the limit.'
            : 'Existing clients are safe. New ones wait until you upgrade or drop under the limit.'}
        </p>
        <button onClick={() => navigate('/subscription')} className={link}>See plans</button>
      </>
    )));
  }

  if (!banners.length) return null;
  return <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 space-y-2">{banners}</div>;
}
