# SECURITY_AUDIT.md — Koach AI

_Audit date 2026-08-23. Verified against the repository and the live Supabase project `phjmcihgodvhbiaksvyl`. Malicious queries and deployment state were checked directly; documentation was not trusted._

## Verdict

Table-level RLS hygiene is genuinely strong: **all 66 public tables have RLS enabled with real policies** (verified live: `list_tables` shows `rls_enabled=true` on every table; no `using(true)`, no `SECURITY DEFINER` function in `public`). The RBAC and privileged-column triggers are well built. **The multi-tenant row model largely holds.**

The danger is concentrated in a handful of P0s that sit *beside* RLS: an account-takeover in the invite flow, secrets in the browser bundle, an open service-role automation endpoint, and a storage design that is world-readable by intent. These do not require defeating RLS — they route around it.

## P0 — block launch

### S1. Account takeover via `setupPortalAccount`
`supabase/functions/setupPortalAccount/index.ts:64-76`. When `createUser` fails because the email already exists, the function looks the user up and calls `admin.auth.admin.updateUserById(existing.id, { password })` — an **unauthenticated password reset of any existing account sharing that email**. Full self-service chain: create a client row with `email=victim@…` (free text) → `sendClientInvite` returns the **plaintext token in the HTTP response** (`sendClientInvite/index.ts:103`) → POST it to `setupPortalAccount` with a chosen password → own the victim's account (including another coach or a platform admin). The invite token proves control of an attacker-typed string, not of a mailbox.
**Fix:** never reset an existing user's password from the invite path; if the email already has an auth account, require an authenticated link or a real password-reset email. Stop returning the plaintext token in the response.

### S2. Progress photos / InBody scans — world-readable by design (and uploads currently broken)
Two facts, both true:
- **Current live state:** `storage.buckets` count = **0** — the `uploads` bucket does not exist on the live project, so every upload (progress photos, InBody scans, avatars, message attachments, exercise media) **fails today**.
- **Design/latent state:** migration `20260716000100_storage_uploads_bucket.sql:15-43` creates the bucket `public=true` with a SELECT policy that has **no `to` clause** (grants the `public`/anon role) and an INSERT policy scoped only to `bucket_id='uploads'` (no per-tenant path). `src/api/supabaseClient.js:420-429` uploads to a flat namespace and returns `getPublicUrl()`. The moment that bucket exists, **anon can read and enumerate every tenant's body photos** via `POST /storage/v1/object/list/uploads`, defeating the column-privacy work in migration 700.
**Fix:** make the bucket private; serve via short-lived signed URLs; scope INSERT/SELECT/UPDATE/DELETE to `(storage.foldername(name))[1] = auth.uid()::text` (or the client's tenant id); prefix object keys per tenant.

### S3. Live third-party secrets inlined into the browser bundle
`src/lib/sendgrid.js:4,8` (`VITE_RESEND_API_KEY`, sent as `Authorization: Bearer` to `api.resend.com` from the browser), `src/lib/calendly.js:4,9` (`VITE_CALENDLY_TOKEN`), `src/components/integrations/IntegrationsTab.jsx:362` (`VITE_STRIPE_SECRET_KEY`). Any `VITE_*` var is baked into `dist/` at build time. If set in production, every visitor can extract them (Resend = send mail as your domain; Calendly PAT = full account; Stripe secret = total billing compromise). Undocumented in `.env.example`. A server-side mailer already exists.
**Fix:** delete `src/lib/sendgrid.js` and the browser Calendly/Stripe key paths; route through edge functions; rotate any key ever set as `VITE_*`. (Git history is clean — no committed secrets — so rotation is the only exposure to close.)

### S4. `runAutomations` — internet-reachable service-role side effects
`supabase/functions/runAutomations/index.ts:38-60`: `verify_jwt=false` (verified live) **and** no in-code auth. It creates a service-role client, reads every tenant's clients/check-ins/plans, and executes actions (emails, messages, `at_risk` flagging, badge/calorie mutations). Its sibling cron functions gate with `isServiceRoleCall`; this one omits it.
**Fix:** add the `isServiceRoleCall(req)` guard its siblings use; keep it callable only by the service key / cron.

## P1

- **S5. `sendEmailNotification` is an authenticated open relay** (`index.ts:28-43`, `verify_jwt=false`): any session (or the service key) can send attacker-supplied `to`/`subject`/`html` from your verified domain. Phishing + denial-of-wallet. Add a recipient allowlist (must be one of the caller's clients), per-user rate cap, and a send ledger.
- **S6. Portal clients read coach-private columns on `clients`** (`20260709000100_core.sql:371-379`): no `clients_portal_view`, so `notes`, `lifecycle_notes` (AI at-risk rationale), `monthly_rate`, `stripe_customer_id`, `invite_token_hash` are all returned to the portal. Add a column-restricted portal view like migration 700 did for check-ins.
- **S7. `is_template` / `is_public` cross-tenant leak** (`20260709000200_coaching.sql:96-106`, `:166-177`): a bare `or is_template` in the SELECT predicate publishes a coach's program/macro plan to **every authenticated user** when they toggle "save as template." Scope templates to team/marketplace, not global.
- **S8. Storage INSERT unscoped** (`20260716000100:26-29`): any authenticated user (incl. a portal JWT) can write arbitrary content — including HTML/SVG served from your origin — to the public bucket. Scope by path prefix.

## P2

- **S9. `verifyProgramWorkoutCount` resolves client by email with service role, no ownership check** (`index.ts:16-31`) — cross-tenant, newest-row-wins. Use `ownsClient`.
- **S10. Plaintext OAuth secrets in a browser-readable table** — `coach_settings.google_refresh_token`/`zoom_access_token` (`20260715000100:53-56`, `20260709000500:357`); `app.is_admin()` can read every coach's. Encrypt at rest / move to a secrets vault; exclude from any client-readable view.
- **S11. No audit logging exists** (grep: no audit table). Admin cross-tenant reads, role changes, invite issuance/redemption, portal-JWT minting, and service-role writes are all unrecorded — a compromise (S1/S4) would be forensically invisible.
- **S12. `submitOnboardingIntake` unauthenticated write + email send** (`index.ts:21-53`): attacker-chosen `coachId` insert + attacker-controlled email body; coach-id oracle. Add CAPTCHA + rate limit + fixed templates.
- **S13. `ai_conversations` readable by portal clients** (`20260709000500:190-192`) — the coach's private AI/risk sessions about the client, contradicting the "never show risk to client" intent.
- **S14. Unmetered LLM proxy for any authenticated caller** — the AI-insight functions call `getCaller` then Claude with no metering; `nutritionQA` passes raw portal-client text into the prompt. (Also note these 5 are currently undeployed, so they 404 today — but the auth/metering gap is real for the deployed `aiMessageAssistant`.)
- **S15. No `supabase/config.toml`** — `verify_jwt` posture lives only in code comments; `verify_jwt=true` is satisfied by the public anon key, so in-function checks are the only real gate. Pin the config in the repo.
- **S16. `testimonials` exposes client PII to anon** (`20260709000300:429-432`).
- **S17. `profiles`/`team_members` INSERT not covered by the privilege trigger** (`20260709000100:110-112`; trigger is UPDATE-only at `:102-104`). Narrow precondition (row is normally pre-created by `handle_new_user`), but a self-insert of `role='admin'` is a total-compromise primitive if the row is ever absent. Add a `with check` column guard or a BEFORE INSERT trigger.

## P3
- **S18.** Realtime DELETE events aren't RLS-filtered → deleted-row PKs leak to channel subscribers (`20260716000200`).
- **S19.** `plan_listings.is_published` defaults `true` + anon-readable → products public on creation; `storeCheckout` fetches any listing regardless of publish state.
- **S20.** PostgREST filter-string interpolation of `email` values (`initializeReferralProgram:25`, `weeklyDigest:37`, `assistantTools.js:48`) — latent filter injection (UUID interpolations are safe).
- **S21.** Non-constant-time `token === serviceKey` comparisons (`onEntityEvent:25`, etc.).
- **S22.** Leaked-password protection (HaveIBeenPwned) disabled in Auth; `pg_net` installed in `public` schema (advisor WARN).

## Multi-tenant isolation — tested conclusions
- **Coach A vs Coach B (rows):** isolated. Every tenant table policy keys on `auth.uid()` via `created_by`/`user_id`/`team_id`/`owns_client`, with an `is_admin()` bypass for platform staff. No cross-coach row path found.
- **Client A vs Client B (rows):** isolated. `app.is_portal_client()` accepts the JWT `portal_client_id` claim or `clients.portal_user_id = auth.uid()`; no path to another client's rows. The two SECURITY DEFINER portal views correctly filter by `is_portal_client(client_id)`.
- **Residual exposure is column-level, not row-level** (S6, S13) and via shared-flag escape hatches (S7), plus the non-RLS vectors S1–S4.
- **Privilege escalation via `profiles.role` self-update:** **blocked** by the `protect_profile_privileged_columns` BEFORE-UPDATE trigger (verified live — `role`, `subscription_tier`, `billing_status`, `stripe_*` all in the blocklist). Residual: `had_trial` and `ai_generation_count` are *not* in the blocklist (see BUG_REPORT B-ENT), and INSERT isn't covered (S17).
