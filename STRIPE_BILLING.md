# Stripe billing (production)

## Pieces
| What | Where |
| --- | --- |
| Plans ↔ Stripe prices (by `lookup_key`) | `supabase/functions/_shared/stripePlans.js` |
| Webhook (signature, idempotency, sync) | `supabase/functions/stripeWebhook`, `_shared/stripeSync.js`, ledger table `processed_stripe_events` |
| Checkout / in-place upgrade / cancel | `supabase/functions/stripeCheckout` |
| Customer portal session | `supabase/functions/createPortalSession` (returns to `https://app.koachai.net/subscription`) |
| Access rules | `_shared/billingAccess.js` = `src/lib/billingAccess.js` = SQL `app.billing_access_direct` |
| Access gate in the UI | `src/components/subscription/BillingGate.jsx`, banners in `BillingBanners.jsx` |
| Billing columns + client cap triggers | `supabase/migrations/20261006000100_stripe_production_billing.sql` |

Lookup keys: `koach_{starter|pro|elite|enterprise}_{monthly|yearly}`. Displayed prices live in
`src/lib/planPricing.js` (Stripe is what actually charges — change both).

## Access
`comped` / `admin` → always · `trialing`/`active` → yes · `past_due` → 3 days from `past_due_since`
· `none` + `trial_ends_at` in the future → yes (14-day migration trial) · anything else → billing page.
New accounts default to `billing_status = 'none'` (no access until checkout).

## Over the client cap (after a downgrade)
Nothing is deleted or hidden. `app.enforce_client_cap` blocks inserting clients at/over the cap, and — for
coaches with a Stripe subscription who are *over* the cap — blocks updating existing client rows (read-only)
until they upgrade or delete clients themselves. A banner explains it. Comped/admin are exempt.

## Deploy
Edge functions do not auto-deploy: `stripeWebhook` (`--no-verify-jwt`, pinned in `supabase/config.toml`),
`stripeCheckout`, `createPortalSession`, `validateSubscription` (and the AI functions that import
`_shared/aiMetering.js`: `generateAIProgram`, `generateMealPlan`, `generateSmartMeals`).
Merge first (the migration adds the columns the functions write), then deploy the functions.
