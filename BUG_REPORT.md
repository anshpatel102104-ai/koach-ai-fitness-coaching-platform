# BUG_REPORT.md — Koach AI

_Verified 2026-08-23 against repo + live Supabase project `phjmcihgodvhbiaksvyl`. Severity: P0 block launch · P1 must-fix before real users · P2 fix soon · P3 polish._

---

### B1 — Coach settings & notifications write email/strings into `uuid` columns (fail silently)
- **Severity:** P0 (data integrity / core screens dead)
- **Area:** Data layer
- **Repro:** Log in (Supabase mode). Open Notification Settings / Business Settings / White Label / Coach Profile. Change anything, save.
- **Expected:** Setting persists.
- **Actual:** DB rejects with `22P02 invalid input syntax for type uuid`; the facade's `update()` swallows it (`maybeSingle()` returns null, no throw) and the UI shows success. Nothing saved. Reads also return empty.
- **Cause:** Frontend passes `user.email` as `coach_id`; columns are `uuid` (verified live: `business_settings/coach_profiles/notification_settings/white_label_settings.coach_id` all `uuid`). Same bug: `notifications.recipient_id` (uuid) read with email in `useNotifications.js:16,46` and written with literal `'coach'` in `Automations.jsx:77` → notification system fully dead.
- **Files:** `NotificationSettings.jsx:59,72`, `WhiteLabel.jsx:66,79,131`, `BusinessSettings.jsx:49,79`, `CoachProfile.jsx:294,327`, `useNotifications.js:16,46`, `supabaseClient.js:219-229`.
- **Fix:** Pass `user.id` (auth uid). Make the facade `update()/delete()` surface zero-row RLS/validation failures instead of reporting success.
- **Regression test:** integration test asserting settings insert/read round-trips with a real uuid and that a denied update throws.

### B2 — Browser automation engine auto-runs on page load with no idempotency (calorie drift, dup messages)
- **Severity:** P0 (data corruption)
- **Area:** Automations
- **Repro:** Have ≥1 active rule + ≥1 client. Open `/automations`, refresh 3×.
- **Expected:** Rules evaluate once per window server-side.
- **Actual:** `useEffect([])` re-runs the inline engine every mount; no dedup against `automation_logs`. Duplicate client messages, duplicate log rows, and `adjust_calories` does read-modify-write (`calories + delta`) so each refresh permanently shifts the client's target; `flag_at_risk` re-flags.
- **Files:** `Automations.jsx:279-284,102-181,160-163`.
- **Fix:** Remove the auto-run; drive automations only from the idempotent server `runAutomations` (after B-AUTOSEC below). Never mutate calories by delta from the browser.

### B3 — Portal/workout identity resolved via wrong column → empty screens & FK failures
- **Severity:** P0 (core client journey broken)
- **Area:** Client portal
- **Repro:** As a real portal client, open portal shell / Calendar / Nutrition; log a workout from `/workout`.
- **Actual:** `ClientPortal.jsx:38`, `PortalCalendar.jsx:293`, `PortalNutrition.jsx:53` filter `clients` by `{user_id: auth.id}`, but `clients.user_id` is the **owning coach** → always empty (and for a coach visiting `/portal`, matches their own client rows). `ClientWorkoutView.jsx:305` writes `client_id: user.id || user.email || ''` into `workout_sessions.client_id` (uuid FK → clients.id) → `23503`/`22P02` on every logged workout. `ClientPortal.jsx:5` also imports the coach facade instead of `supabasePortal`.
- **Fix:** Resolve the client row by `{portal_user_id: auth.id}` (or email) once, thread `clients.id` to all reads/writes; use `supabasePortal` in the shell.

### B4 — Client invite always 400s (missing `clientId`)
- **Severity:** P1 (invite flow broken end-to-end)
- **Area:** Onboarding
- **Actual:** `Clients.jsx:104` and `MigrationInvites.jsx:32` call `sendClientInvite` with `{clientName, clientEmail}` only; function requires `clientId` (`sendClientInvite/index.ts:69`) → 400 → facade throws after the client row was already created. `OnboardingManager.jsx:186` separately writes the dropped `invite_token` column → throws.
- **Fix:** Pass the created client's id; align OnboardingManager to `invite_token_hash` via the function.

### B5 — Fake success UI: password change, refunds, sessions, notification history
- **Severity:** P1 (trust / correctness)
- **Actual (each shows success with no backend):**
  - Password change: `Settings.jsx:205-212`, `AccountSettings.jsx:83-89` toast success, no API call (a working `auth.updatePassword` exists at `supabaseClient.js:381`).
  - Refunds: `PaymentTracking.jsx:83-90` sets `Payment.status='refunded'`, no `stripe.refunds.create` anywhere.
  - Active sessions: `AccountSettings.jsx:286-317` `MOCK_SESSIONS`, fake sign-out.
  - Notification history: `NotifsHistory.jsx:6-17` `MOCK_HISTORY` (fabricated client names/amounts).
  - Portal "pause subscription": `ManageSubscriptionModal.jsx:23-30` is a `setTimeout`.
- **Fix:** Wire to real endpoints or remove the controls.

### B6 — 5 AI-insight edge functions called but not deployed → 404
- **Severity:** P1 (whole "AI insights" surface dead)
- **Actual:** `aiBusinessInsights`, `aiCheckInInsights`, `aiProgressInsights`, `aiNutritionInsights`, `aiInBodyScan` are invoked by 13+ components but return NotFound (verified live via `get_edge_function`). At-risk intervention, check-in AI review, progress analysis, nutrition insights/Q&A, InBody scan all fail.
- **Fix:** Deploy the functions (or gate the callers behind a feature flag until deployed).

### B7 — Realtime never fires (publication empty) → no live messaging/notifications
- **Severity:** P1
- **Actual:** `supabase_realtime` publication has **0 public tables** on the live DB, though migration `20260716000200` intends to add messages/notifications/etc. `entity.subscribe()` joins a channel that never delivers; chat/notifications only update on manual refresh.
- **Fix:** Re-apply the publication changes to the live project; add a `.subscribe(status)` callback so join failures aren't silent.

### B8 — CSV import dead on first write (`coach_id: 'me'`)
- **Severity:** P1
- **Actual:** `ImportClientsModal.jsx:39` sends `coach_id: 'me'` into a uuid column → `22P02`, surfaced as "AI mapping failed."
- **Fix:** Use `user.id`.

### B-AUTOSEC — `runAutomations` open + cross-tenant
- **Severity:** P0 (security; latent until cron enabled)
- **Actual:** `verify_jwt=false` and no in-code auth (`runAutomations/index.ts`); loads all tenants' rows with the service role and cross-joins rules×clients with no ownership filter. Callable by anyone with the anon key.
- **Fix:** Add `isServiceRoleCall` guard; scope rules to their `created_by` coach's own clients.

### B-PAY — SaaS paywall open by default (`billing_status` defaults `'active'`)
- **Severity:** P0 (broken payments / revenue)
- **Actual:** `core.sql:18` `billing_status default 'active'`; `App.jsx:118-120` admits `active/trialing/past_due`. Every free signup gets full access forever. Entitlement is frontend-only; `validateSubscription` is advisory then a plain RLS insert runs regardless.
- **Fix:** Default `billing_status='none'`; enforce entitlement server-side (RLS/edge) on gated actions.

### B-STRIPE-XT — Any authenticated user can read the whole platform's Stripe data
- **Severity:** P0 (cross-tenant financial data)
- **Actual:** `stripeClientProxy` `getCharges`/`listProducts` have no ownership/admin check (`index.ts:110-113`); `getClientInvoices` IDOR (`stripe.js:18` never sends `client_id`, guard is `if(client_id)`). Because all coaches share one Stripe account, any coach — or any portal client — can dump every coach's revenue/invoices.
- **Fix:** Mandatory ownership scoping on every client-touching action; restore admin gate on account-wide reads.

### B-CANCEL — "Cancel client subscription" cancels the coach's own KOACH plan
- **Severity:** P0
- **Actual:** `stripeCancelSubscription/index.ts:26-31` ignores the body and cancels `caller.profile.stripe_subscription_id` immediately; the table lists the coach's own sub too.
- **Fix:** Accept and ownership-validate the target subscription id.

### B-TRIAL — Infinite free trials (`had_trial` self-writable)
- **Severity:** P1
- **Actual:** `had_trial` is not in `protect_profile_privileged_columns` (verified live); `update profiles set had_trial=false` succeeds → `stripeCheckout:132` grants another 30-day trial. (`ai_generation_count` similarly unprotected → AI-quota reset.)
- **Fix:** Add `had_trial`, `ai_generation_count`, `ai_generation_month` to the trigger blocklist (write only via service role).

### B-STORE — Store purchases charge money and deliver nothing
- **Severity:** P1
- **Actual:** `storeCheckout` uses `mode:'payment'`; webhook `checkout.session.completed` only acts `if(subId)`; no purchases table, no fulfillment, `sales_count` never incremented.
- **Fix:** Add a `checkout.session.completed` fulfillment branch for one-time payments; record purchases and grant access.

### B-SAFETY — AI meal/program generation has no deterministic safety checks
- **Severity:** P0 (health safety)
- **Actual:** `generateSmartMeals` (main, DB-persisting) has no allergy input at all; injury avoidance is one prompt sentence with no output check; no calorie floor on the onboarding path; no allergen scan of output.
- **Fix:** Deterministic allergen + injury-contraindication validators on AI output before persist; calorie floors on all input paths.

### B-CI — CI does not gate quality; verify scripts don't run
- **Severity:** P2
- **Actual:** `.github/workflows/ci.yml` runs lint/typecheck with `continue-on-error: true`; no tests. The `scripts/verify-*` harnesses require a manual `POSTGRES_URL` and re-implement (rather than import) the functions they "verify," so B1–B8 all survived green runs.
- **Fix:** Make lint/typecheck blocking; run the verify scripts against a CI Postgres; add E2E for the P0 journeys.

_(Additional P2/P3 items — cache-key collisions across `['clients']`/`['checkins']`, singleton-settings duplicate-insert races, `mapImportColumns` invalid model id, downgrade/annual billing bugs, `verifyProgramWorkoutCount` email lookup, quiet-hours/unsubscribe theater — are enumerated in the domain audit sections of SYSTEM_AUDIT.md.)_
