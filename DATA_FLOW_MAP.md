# DATA_FLOW_MAP.md — Koach AI

_Frontend → service → function → database, as actually wired (verified 2026-08-23)._

## System architecture (as-is)

```
USER (coach browser / client portal browser)
  │
FRONTEND  React 18 + Vite SPA, served as static assets on Cloudflare Workers (wrangler.jsonc)
  │        single 4.3MB JS bundle (no code splitting)
AUTH      VITE_AUTH_PROVIDER switch (authConfig.js) — DEFAULT 'base44' (legacy, dead backend)
  │        Only when set to 'supabase': real Supabase Auth session. Data layer needs this session for RLS.
DATA LAYER  src/api/supabaseClient.js  — "facade": maps 63 Base44 entities → Supabase tables (ENTITY_TABLES)
  │          entities.X.list/filter/get/create/update/delete → PostgREST
  │          entities.X.subscribe → Realtime postgres_changes
  │          functions.invoke(name) → Supabase Edge Function
  │          uploadFile → Supabase Storage 'uploads' bucket
  │        src/api/base44Client.js — Base44 SDK; imported by ONE file (AuthContext.jsx) for .auth only
EDGE FNS  41 deployed Deno functions (Supabase). 5 called-but-undeployed (aiBusinessInsights, aiCheckInInsights,
  │        aiProgressInsights, aiNutritionInsights, aiInBodyScan) → 404.
DATABASE  Postgres 17, 66 public tables, RLS on all. Helpers in `app` schema. pg_cron installed (0 jobs).
STORAGE   'uploads' bucket — DOES NOT EXIST on live project (0 buckets). Migration would create it public.
AI        _shared/anthropic.js → api.anthropic.com (claude-sonnet-5). No RAG (pgvector not installed).
EXTERNAL  Stripe (single platform account, no Connect), Resend (email), USDA FoodData (searchFoods),
           Google Calendar / Zoom proxies. PostHog: NOT integrated (see ANALYTICS).
```

## Routing reality (the crux of the migration)
- `@/api/supabaseClient` imported by **272** files; `@/api/base44Client` by **1** (`AuthContext.jsx`).
- Most AI/stripe call sites use the alias `import { supabase as base44 }`, so `base44.functions.invoke(...)` resolves to **Supabase**, not Base44.
- Base44 SDK `.entities`/`.functions` are **never called** from `src/`. `base44/functions/*` and `base44/entities/*` are reference/dead code.
- **But `VITE_AUTH_PROVIDER` still defaults to `base44`** (`authConfig.js:13`, `.env.example:5`). With the default, the shell authenticates against the retired Base44 backend while every query hits Supabase — the app is only functional when the flag is flipped to `supabase` AND `VITE_SUPABASE_URL`/`ANON_KEY` are set.

## Screen → data source (major screens)

| Screen | Component | Service | Function/Table | Status |
|---|---|---|---|---|
| Coach Dashboard | Dashboard.jsx | facade | clients/check_ins/… + Realtime | REAL |
| Clients CRM | Clients.jsx | facade | clients (+ welcome email, invite) | REAL (invite 400s — B4) |
| Client Profile | ClientProfile.jsx | facade | clients/check_ins/programs | REAL |
| Program Builder | ProgramBuilder.jsx | facade + generateAIProgram | workout_programs | REAL (dup-insert risk) |
| Programs | Programs.jsx | facade | workout_programs | REAL |
| Messages | Messages.jsx | facade + Realtime | messages | REAL (Realtime dead — B7) |
| Check-in Review | CheckInReview.jsx | facade | check_ins | REAL |
| Nutrition | Nutrition.jsx | facade + generateSmartMeals | nutrition_plans | REAL (no allergy check) |
| Progress | Progress.jsx | facade | check_ins/workout_sessions | REAL (stale-cache) |
| At-Risk | AtRiskClients.jsx | riskEngine (browser) + aiBusinessInsights | — | PARTIAL (AI 404s) |
| Automations | Automations.jsx | browser engine | automation_rules/logs | PARTIAL/UNSAFE (B2) |
| Analytics | Analytics.jsx | facade (derived) | check_ins/… | REAL |
| Notification Settings | NotificationSettings.jsx | facade | notification_settings (coach_id=email) | BROKEN (B1) + MOCK history |
| Business/WhiteLabel/CoachProfile | resp. pages | facade | *_settings (coach_id=email) | BROKEN (B1) |
| Account Settings | AccountSettings.jsx | — | MOCK_SESSIONS; fake pw/email change | MOCK (B5) |
| Client Portal shell | ClientPortal.jsx | coach facade (bug) + `{user_id}` | clients | BROKEN (B3) |
| Portal pages (Workouts/Progress/Messages/Profile/Billing/CheckIn) | portal/* | supabasePortal `{email}` | via portal views | REAL |
| Portal Calendar/Nutrition | portal/* | `{user_id}` (coach column) | clients | BROKEN (B3) |
| Client Workout logging | ClientWorkoutView.jsx | facade | workout_sessions (client_id=profile uid) | BROKEN write (B3) |
| CSV Import | ImportClientsModal.jsx | commitClientImport | client_import_jobs (coach_id='me') | BROKEN (B8) |
| Revenue | RevenueDashboard.jsx | stripeGetDashboard (admin-only) | Stripe | BROKEN for non-admin coaches |
| Subscription/Billing | Subscription.jsx | stripeCheckout/webhook | profiles | REAL but paywall open (B-PAY) |

## Critical workflow traces

**Coach creates client → invite**
```
Clients.jsx form → createMutation → facade Client.create (RLS insert, OK)
  → invoke('sendClientInvite', {clientName, clientEmail})   ← MISSING clientId
  → function returns 400 "Missing clientId"  → facade throws → toast error
  → RESULT: client row created, NO invite sent. (B4)
```

**Client accepts invite → portal**
```
email link /client-setup/:token → validateInviteToken (hash lookup, expiry) → returns client
  → setupPortalAccount (createUser OR password-overwrite existing — S1 takeover)
  → supabase.auth.login → /portal
  → portal pages filter clients by email (REAL) — except shell/calendar/nutrition use user_id (BROKEN, B3)
```

**Check-in write → coach visibility**
```
portal check-in → check_ins insert (RLS OK) → DB trigger app.notify_entity_event → pg_net → onEntityEvent
  → welcome/notify email (if Vault secrets set)
  → in-app notification insert with recipient_id=UUID
  → coach bell reads notifications by recipient_id=EMAIL  → uuid=email error → 0 shown (B1)
  → Realtime: supabase_realtime publication empty on live DB → no live update (B7)
```

**Billing**
```
stripeCheckout → Stripe → webhook (sig verified, idempotent) → profiles.subscription_tier/billing_status
  BUT billing_status defaults 'active' → App.jsx paywall passes for everyone (B-PAY)
  entitlement gating is frontend-only (subscription.js); validateSubscription advisory, then plain RLS insert
```
