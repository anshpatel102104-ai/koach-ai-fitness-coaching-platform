# SYSTEM_AUDIT.md — Koach AI

_Principal-engineer / QA / security / AI / SaaS-architect audit. Date 2026-08-23. Source of truth: the repository and the live Supabase project `phjmcihgodvhbiaksvyl` ("KOACH AI", ACTIVE_HEALTHY, us-east-2). Documentation was explicitly not trusted; every material claim was verified against code, the running database, and deployment state._

Companion reports: `SECURITY_AUDIT.md`, `AI_ARCHITECTURE_AUDIT.md`, `DATA_FLOW_MAP.md`, `PRODUCT_GAP_ANALYSIS.md`, `BUG_REPORT.md`, `TEST_MATRIX.md`, `REMEDIATION_PLAN.md`.

## 1. What Koach AI actually is, right now

A React 18 + Vite SPA (served as static assets on Cloudflare Workers) on top of Supabase (Postgres 17, Auth, 41 Edge Functions), Stripe, Resend, and Anthropic. It is **mid-migration off Base44**, and that migration is **much further along than the repo's own docs claim**: 272 source files use the Supabase facade; exactly one still imports the Base44 SDK (`AuthContext.jsx`, and only for `.auth`). Base44 entity/function code is dead.

The database is essentially **pre-launch**: 66 tables, RLS on all of them, but 7 auth users (all test/`role=user`) and **zero rows** in clients/programs/check-ins/messages/etc. So this audit is code-, database-, and deployment-verified, not runtime-E2E (there is no realistic data to exercise, and production domains were unreachable from the audit environment).

## 2. Architecture map

```
USER ─▶ FRONTEND (React SPA, Cloudflare Workers static assets, 4.3MB single bundle)
        │
        ▼
AUTH  VITE_AUTH_PROVIDER (authConfig.js) — DEFAULT 'base44' (dead). Must be 'supabase' to function.
        │
        ▼
DATA/SERVICE LAYER  src/api/supabaseClient.js "facade": 63 entities → tables; list/get/create/update/delete;
        │            subscribe → Realtime; functions.invoke → Edge Fn; uploadFile → Storage
        ▼
EDGE FUNCTIONS  41 deployed (Deno). 5 called-but-undeployed AI-insight fns → 404.
        │
        ▼
DATABASE / STORAGE  Postgres 17 (RLS everywhere; app-schema helpers; pg_cron installed, 0 jobs).
        │            Storage 'uploads' bucket: DOES NOT EXIST live (0 buckets). Realtime publication: empty.
        ▼
AI SERVICES  _shared/anthropic.js → Anthropic (claude-sonnet-5). No RAG (pgvector absent).
        │
        ▼
EXTERNAL  Stripe (single platform account, no Connect) · Resend · USDA foods · Google/Zoom proxies · PostHog: absent
```

## 3. Reconnaissance highlights (Phase 1)
- **Legacy vs live:** `base44/` (entities + functions) and `src/api/base44Client.js` are legacy; the SDK, `@base44/vite-plugin`, and `package.json name:"base44-app"` remain but the data path is Supabase.
- **TODO/FIXME:** exactly **1** in `src/` (`telemetry.js`). Low. But ~20 "coming soon" surfaces and several `MOCK_*`/`Math.random()` data sources masquerade as live.
- **Secrets:** git history is **clean**; `.env` untracked. But `VITE_RESEND_API_KEY`, `VITE_CALENDLY_TOKEN`, `VITE_STRIPE_SECRET_KEY` are referenced in browser code → inlined into `dist/` if set (P0).
- **CI:** build is a hard gate; lint + typecheck are `continue-on-error`; no tests run. The `verify:*` scripts re-implement (not import) the functions they test, so real bugs pass green.
- **Live drift discovered:** 5 AI functions undeployed; storage bucket missing; realtime publication empty; 0 cron jobs; a ghost "adaptationEvaluator" cron migration with no corresponding function anywhere.

## 4. Findings by domain (detail in companion reports)

**Authentication.** Coach login/reset are real; but `VITE_AUTH_PROVIDER` defaults to the dead Base44 backend, there is **no route-level auth guard** (`ProtectedRoute` is never imported; the redirect branch is dead), the product signup path (`/start`) never calls `signup()`, and the invite flow carries a P0 account-takeover.

**Authorization / multi-tenant.** Row-level isolation is genuinely solid — all 66 tables have RLS; coach↔coach and client↔client row access is closed; `profiles.role` self-escalation is **blocked** by a privileged-column trigger (verified). Residual: column-level leaks to portal clients (`clients`, `ai_conversations`), a global `is_template` escape hatch, `had_trial`/`ai_generation_count` outside the trigger, and INSERT not covered.

**Data layer.** The facade is well built (63/63 entities mapped, correct translation), but a cluster of **string/email-into-uuid-column bugs** (`coach_id=email`, `recipient_id=email`/`'coach'`, `client_id=user.id`, `coach_id='me'`) fail at the DB and are **swallowed by the facade's silent `update()`/`delete()`**, so settings, notifications, portal shell, workout logging, and CSV import are broken while reporting success.

**AI.** No RAG. Safety is prompt-only (no allergen/injury/calorie-floor code checks; the main meal generator takes no allergy input yet persists plans). 9/11 functions do no output validation; none have timeouts/retries/cost tracking; most are unmetered (denial-of-wallet). 5 insight functions are undeployed → the whole "AI insights" surface 404s. The `*Engine.js` "AI" features are deterministic browser code.

**Payments.** Webhook is correct (signature + idempotency). But the **SaaS paywall is open by default** (`billing_status` defaults `'active'`), entitlement is frontend-only, any authenticated user can read the **whole platform's Stripe data** (shared account, no ownership checks), "cancel client subscription" cancels the coach's own plan, store purchases charge money and deliver nothing, and refunds are fake. Client→coach billing has no Stripe Connect / payout path.

**Automations / notifications / cron.** The only live automation path (entity-event DB triggers → `onEntityEvent`) works but its output is invisible (notification uuid/email bug). The scheduled functions (`runAutomations`, `sendCheckInReminders`, `weeklyDigest`) are **never scheduled** (0 cron jobs). The browser automation engine auto-fires on page load with no idempotency (calorie drift, dup messages). `runAutomations` is open + cross-tenant. Web push subscribes but nothing ever sends. Quiet-hours/unsubscribe are UI theater.

**Storage.** No `uploads` bucket exists live → all uploads (progress photos, InBody scans, avatars, attachments) fail today; the migration that would create it makes it **public and enumerable** — so the design is a photo-privacy P0 the moment it exists.

**Realtime.** `supabase_realtime` publication is empty on the live DB → live messaging/notifications don't update.

**Analytics.** Not implemented (no PostHog, no event pipeline).

**Audit logging.** Does not exist.

## 5. Dead / duplicate architecture (Phase 26)
- `base44/functions/*`, `base44/entities/*`, `src/api/base44Client.js` (except `.auth`) — dead; `@base44/sdk`/`@base44/vite-plugin` still installed.
- `src/components/ProtectedRoute.jsx`, `layout/RoleRouter.jsx`, `useRoleGuard()` hook — 0 importers.
- `src/lib/sendgrid.js` — misnamed (pure Resend), browser-side, should be deleted in favor of the server mailer.
- Three divergent risk-score implementations (`riskEngine.js`, `_shared/riskScoring.js`, `insightEngine.js`).
- Ghost "adaptationEvaluator"/`plan_versions` closed-loop feature: migrations + table exist, no function, no UI.
- Two Supabase projects on the org (one INACTIVE); ensure the app only ever targets `phjmcihgodvhbiaksvyl`.

## 6. Severity roll-up
- **P0 (block launch):** invite account-takeover; secrets in bundle; open `runAutomations`; open email relay; cross-tenant Stripe reads; wrong-subscription cancel; paywall open by default; storage design (public photos) / uploads broken; AI health-safety (no deterministic validators); notification system dead (data integrity).
- **P1:** portal identity + workout-logging bugs; invite send 400; 5 AI functions undeployed; Realtime off; CSV import; infinite free trials; store fulfillment; fake-success UIs; column-level portal leaks; template cross-tenant leak.
- **P2/P3:** cache-key collisions; duplicate-insert races; downgrade/annual billing bugs; no audit log; no analytics; bundle size/perf; ~20 "coming soon" surfaces; dead scaffolding.

## 7. FINAL ANSWER — if we gave Koach AI to 20 real coaches tomorrow

**What would break (immediately, for ordinary use):**
- **Signing up** through the real onboarding flow never creates an account. Coaches who find the `/signup` link get in; the rest can't.
- **Inviting clients** fails (400, missing `clientId`) — after the client row is already created, so coaches see errors and orphaned clients. The client onboarding funnel is dead at step one.
- **Uploading a progress photo or InBody scan** fails — there is no storage bucket on the live project.
- **In-app notifications and live chat/notification updates** never appear (uuid/email mismatch + empty Realtime publication).
- **Saving Notification/Business/White-Label/Coach-Profile settings** silently does nothing (email into uuid column; the UI lies "saved").
- **Logging a workout** from the standalone `/workout` view fails (bad `client_id`); the portal path works.
- **AI insights** (at-risk intervention, check-in AI review, progress/nutrition analysis, InBody vision) all 404 — those functions aren't deployed.
- **Scheduled work** (check-in reminders, weekly digests, automated at-risk detection) never runs — there are no cron jobs.

**What would expose us to security / data risk:**
- **Account takeover:** anyone who can sign up can reset any existing user's password (including another coach or an admin) through the invite flow, and the invite API even returns the plaintext token.
- **Secret leakage:** if Resend/Calendly/Stripe keys are set as `VITE_*`, they ship in the public JS bundle — domain-wide email spoofing, full Calendly account access, or total Stripe compromise.
- **Cross-tenant financial exposure:** every coach shares one Stripe account and any authenticated user (including a client) can dump all coaches' charges/invoices.
- **Photo privacy:** the storage design is a public, enumerable bucket — the moment it exists, every client's body photos are readable by anyone.
- **Denial-of-wallet / spam:** `runAutomations` and `sendEmailNotification` are callable without proper auth; most AI functions are unmetered.
- **Unsafe health output:** AI meal/program generation has no deterministic allergen or injury guardrails; the main meal generator doesn't even receive allergies and persists the plan.
- (Reassuring counterweight: core row-level tenant isolation and role/tier escalation are actually well defended — the risks above route *around* RLS, they don't defeat it.)

**What would make users churn:**
- Settings that don't save, notifications that never arrive, chat that doesn't update live, photos that won't upload, invites that error — the app *looks* finished but the everyday loop is broken.
- "AI insights" and "at-risk detection" — the headline differentiators — are 404 or a browser-only calculation that vanishes on refresh and is never surfaced proactively. The core promise ("spot at-risk clients before they disengage") is not delivered.
- Billing surprises: instant downgrades billed immediately despite UI promising otherwise; "cancel" hitting the wrong subscription; refunds that never happen.

**What is pretending to work rather than actually working:**
- Password change, refunds, active-session management, notification history, portal "pause subscription" — all show success with no backend.
- "AI Insights", "Needs Attention", At-Risk pages — branded AI, actually deterministic browser code (and the real AI parts 404).
- The SaaS paywall — present in the UI, but `billing_status` defaults to active so everyone is "subscribed" for free.
- Automations — a real, well-built server engine that is never scheduled, shadowed by an unsafe browser engine that double-fires.
- Web push, quiet hours, unsubscribe — UI exists; nothing sends, nothing reads them, the link 404s.
- The repo's own `AUDIT.md`/`SCHEMA_MIGRATION.md` status ("AI features WORKING", "only 3 files migrated") — inaccurate in both directions.

**Bottom line:** the foundations are better than they look (strong RLS, correct webhook, a clean and near-complete Supabase cutover), but the product is **not launch-ready**. A focused P0/P1 sweep — the "first commit set" in `REMEDIATION_PLAN.md` — would move it from "renders nicely and lies about working" to "core loop functional and safe." Do not put it in front of real coaches until at least Phases 0–2 there are complete.
