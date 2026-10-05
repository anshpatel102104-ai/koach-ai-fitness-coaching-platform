/** Client helpers for Stripe billing. All Stripe calls happen in edge functions. */

/**
 * Open the Stripe customer portal (createPortalSession edge function). The
 * portal returns to https://app.koachai.net/subscription. Throws a user-facing
 * Error if the caller has no billing account or the call fails.
 */
export async function openBillingPortal(db, { newTab = false } = {}) {
  const res = await db.functions.invoke('createPortalSession', {});
  const url = res?.data?.url;
  if (!url) throw new Error(res?.data?.error || 'Could not open the billing portal. Please try again.');
  if (newTab) window.open(url, '_blank', 'noopener');
  else window.location.href = url;
}
