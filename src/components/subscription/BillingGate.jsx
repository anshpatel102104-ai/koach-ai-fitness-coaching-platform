import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTeamRole } from '@/lib/useTeamRole';
import { isClientRole } from '@/lib/useRoleGuard';
import { billingAccess } from '@/lib/billingAccess';
import Subscription from '@/pages/Subscription';

const BILLING_PATH = '/subscription';

/**
 * Wraps the coach shell. A coach without access (no trialing/active
 * subscription, no running trial, no payment grace, not comped/admin) never sees
 * the app or a blank page: they land on the billing page with a subscribe
 * button. Team coaches ride on their owner's billing and are not gated here.
 *
 * Returning from Stripe Checkout, the webhook may land a moment after the
 * redirect — poll the profile briefly ("Activating your account…") before
 * falling back to the billing page.
 */
export default function BillingGate({ children }) {
  const { user, checkUserAuth } = useAuth();
  const location = useLocation();
  const { teamRole, isLoading: loadingRole } = useTeamRole();

  const params = new URLSearchParams(location.search);
  const returningFromCheckout = params.get('checkout') === 'success' || !!params.get('success');
  const access = billingAccess(user);
  const [pollsLeft, setPollsLeft] = useState(returningFromCheckout ? 10 : 0);

  const waiting = returningFromCheckout && !access.hasAccess && pollsLeft > 0;
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setTimeout(async () => {
      await checkUserAuth();
      setPollsLeft((n) => n - 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [waiting, pollsLeft]);

  if (!user || isClientRole(user)) return children; // AppLayout routes clients to /portal
  if (loadingRole) return <FullScreenSpinner />;
  if (access.hasAccess || teamRole === 'coach') return children;

  if (waiting) return <FullScreenSpinner label="Activating your account…" />;

  if (location.pathname !== BILLING_PATH) return <Navigate to={BILLING_PATH} replace />;
  return <Subscription gated accessReason={access.reason} />;
}

function FullScreenSpinner({ label }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
