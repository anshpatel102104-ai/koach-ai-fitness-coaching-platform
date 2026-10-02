# MANUAL_TASKS.md — what a human must do to make the fixes live

All code fixes for the audit (Phases 0–11) are committed on branch
`claude/koach-ai-system-audit-sfdwc7`. **None of it is live yet** — I did not
deploy edge functions, apply migrations, rotate secrets, or change any live
config. The items below require access I don't have, or a decision, or
verification against real data. Ordered by priority.

---

## A. Rotate compromised secrets (do FIRST)
Any key ever set as a `VITE_*` variable was inlined into the public browser
bundle and must be treated as leaked.
1. **Rotate** in the provider dashboards: Resend API key, Calendly token, and any
   Stripe key that was ever set as `VITE_STRIPE_SECRET_KEY`.
2. Re-set them **server-side only** (never `VITE_`-prefixed):
   `supabase secrets set RESEND_API_KEY=… STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… ANTHROPIC_API_KEY=… SUPABASE_JWT_SECRET=… APP_URL=https://app.koachai.net FROM_EMAIL=… FROM_NAME=… USDA_API_KEY=… STRIPE_PRICE_STARTER=… STRIPE_PRICE_PRO=… STRIPE_PRICE_ELITE=… STRIPE_PRICE_ENTERPRISE=…`
3. Confirm the production **build env** sets NO `VITE_RESEND_API_KEY`,
   `VITE_CALENDLY_TOKEN`, or `VITE_STRIPE_SECRET_KEY`.

## B. Set required build/runtime env
4. Production build must set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (auth now defaults to Supabase; the app breaks without them). `VITE_AUTH_PROVIDER`
   can be left unset.
5. Set the Vault secrets used by the entity-event pg_net triggers
   (`project_url`, `service_role_key`) if not already present, or the only live
   automation path silently no-ops.

## C. Deploy edge functions
6. Deploy the functions I changed:
   `supabase functions deploy setupPortalAccount sendClientInvite sendEmailNotification runAutomations stripeClientProxy stripeCancelSubscription stripeWebhook generateSmartMeals generateMealPlan generateAIProgram`
   (shared helpers `_shared/anthropic.js`, `_shared/resendEmail.js`,
   `_shared/aiSafety.js` ship with them.) `supabase/config.toml` now pins
   `verify_jwt` per function — deploy with it present.
7. **Deploy the 5 AI-insight functions that were never deployed** and currently
   404 in production: `aiBusinessInsights aiCheckInInsights aiProgressInsights
   aiNutritionInsights aiInBodyScan`. (They exist in `supabase/functions/` but
   are absent from the live project.)

## D. Apply migrations
8. `supabase db push` the new migrations:
   - `20260823000100_storage_uploads_private.sql` (private uploads bucket)
   - `20260823000200_protect_trial_and_ai_quota.sql` (privileged-column trigger)
   - `20260823000300_rls_hardening.sql` (template leak, ai_conversations, plan_listings default)
   - `20260823000400_clients_portal_view.sql` (**test portal first — see below**)
   - `20260823000500_realtime_publication_reapply.sql` (restores Realtime)
   - `20260823000600_store_purchases.sql` (store fulfillment)
9. **Before/after migration 000400**: on a seeded portal account, verify the
   client portal (home, profile, calendar, nutrition, billing) still loads — it
   removes portal SELECT on the base `clients` table and routes reads to
   `clients_portal_view`.
10. **Storage frontend follow-up (required with 000100):** `src/api/supabaseClient.js`
    still uploads with `getPublicUrl()` under a flat key. After the bucket is
    private, change uploads to a per-user prefix `${auth.uid()}/…` and use
    `createSignedUrl()` for reads, or uploads/reads will fail.
11. Re-run the Supabase **security advisors** after applying.

## E. Schedule cron (nothing runs on a schedule today)
12. Register pg_cron jobs (via pg_net) for `runAutomations`,
    `sendCheckInReminders`, `weeklyDigest`. **Enable `runAutomations` only after
    its tenant-scoping fix is deployed (step 6)** — otherwise it would act
    across tenants. Schedule templates are documented in
    `20260709000900_automation_runner.sql`.

## F. Stripe
13. Register the `stripeWebhook` endpoint in Stripe and set `STRIPE_WEBHOOK_SECRET`
    (config.toml pins `verify_jwt=false` for it).
14. **Decide on client→coach billing:** implement Stripe **Connect**
    (`transfer_data`/`application_fee`) or disable the client-billing/store
    surface. Today client money lands in the single platform account with no
    payout path.
15. Verify test-vs-live keys match the `STRIPE_PRICE_*` IDs.

## G. Supabase Auth settings
16. Enable **Leaked Password Protection** (HaveIBeenPwned) — advisor WARN.
17. Confirm the **email-confirmation** policy. The new `/start` signup routes to
    `/login?confirm=1` when confirmation is required — verify the confirm email
    template + redirect URL.
18. Move the `pg_net` extension out of the `public` schema — advisor WARN.

## H. Analytics (Phase 10 — not implemented, no code added)
19. Integrate PostHog (needs a project key) or a `platform_events` pipeline and
    emit the activation/retention funnel (`coach_signed_up`, `trial_started`,
    `first_client_invited`, `first_program_generated`, `subscription_created`, …).

## I. Verify before real users
20. Seed a realistic tenant (coach + 15–60 clients with history) and run
    Journeys A–E from `TEST_MATRIX.md` in a **real browser** (desktop + mobile
    viewports). Re-test every ❌/🟡 against runtime.
21. Run `scripts/verify-*` against a CI Postgres; make CI lint/typecheck blocking
    once the known backlog is cleared.

---

## Deferred code follow-ups (I made the UI honest / safe; these are the real builds)
These were intentionally not implemented because they need infra, a product
decision, or runtime testing I can't do headless:
- **Web push sender** — the app only subscribes; nothing sends. Needs a web-push
  implementation + `VAPID_PRIVATE_KEY`.
- **Real Stripe refunds** (`stripeRefund`) and **client-initiated portal
  cancellation** (Stripe customer portal / portal-scoped cancel). The UIs now
  tell the user the truth instead of faking success.
- **Quiet-hours enforcement** — senders don't read `notification_settings` quiet
  hours; wire it when cron senders run.
- **Downgrade/annual billing bugs** — instant proration vs UI copy; annual→monthly
  on downgrade (`DowngradeModal` doesn't pass `billing_cycle`).
- **Route-based lazy loading** to cut the remaining ~2.6MB main JS chunk (vendor
  chunks are already split).
- **zod output schemas** server-side for AI functions (timeouts/retries + the
  deterministic allergen/injury validators are in; schema-validated decoding is
  the next step).
- **Testimonials public PII** (S16) — build a display-safe public view.
- **Portal profile editing** — clients currently can't update their `clients`
  row (no portal UPDATE policy); add one if self-edit is desired.
- **`SmartNutritionGenerator`** (macro-only tool) doesn't pass client allergies
  to the now-safety-checked generator — wire client allergy context if used
  per-client.
- **Dead-code removal** — `RoleRouter`, `useRoleGuard`, `base44/functions/*`,
  `@base44/sdk`/`@base44/vite-plugin` once dependencies are proven.
- **B-PAY paywall** — `billing_status` still defaults to `active` at the DB and
  entitlement is enforced only in the frontend. A safe fix is a coordinated
  change: default `billing_status='none'` + server-side entitlement checks on
  gated actions. Left for a dedicated change so it isn't a half-fix.
