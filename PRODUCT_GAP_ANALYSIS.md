# PRODUCT_GAP_ANALYSIS.md — Koach AI

_Expected MVP vs. verified reality (2026-08-23). Legend: ✅ complete · 🟡 partial · 🔴 broken · ⚫ not implemented · 🟣 UI only · 🔵 backend only · 🟠 exists but not connected._

## Product Coverage Matrix

| Feature | UI | DB | API/Fn | AI | Security | E2E | Status | Note |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:--|---|
| Coach auth (login/reset) | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🟡 | Real, but `VITE_AUTH_PROVIDER` defaults to dead Base44; no route guard |
| Coach signup (product path) | ✓ | ✓ | ✗ | — | — | ✗ | 🔴 | `/start` never calls `signup()`; only `/signup` link works |
| Client magic-link portal | ✓ | ✓ | ✓ | — | 🔴 | ✗ | 🔴 | Works, but account-takeover P0 (S1) + multi-use tokens |
| Coach dashboard | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🟡 | Real; notification widgets dead (B1); risk recomputed client-side |
| Client CRM | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🟡 | Real reads; invite 400s (B4) |
| Client profiles | ✓ | ✓ | ✓ | — | ✓ | ✗ | ✅ | Works |
| Client invitation flow | ✓ | ✓ | 🔴 | — | 🔴 | ✗ | 🔴 | 400 missing clientId; takeover; plaintext token in response |
| Program builder | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🟡 | Works; dup-insert on double-save |
| AI program generation | ✓ | ✓ | ✓ | ✓ | 🟡 | ✗ | 🟡 | Deployed; injury safety prompt-only; no output validation |
| Workout delivery | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🟡 | Portal read OK |
| Workout/set logging | ✓ | ✓ | 🔴 | — | ✓ | ✗ | 🔴 | `/workout` writes bad `client_id` (B3); portal path OK |
| Check-ins | ✓ | ✓ | ✓ | 🟠 | ✓ | ✗ | 🟡 | Real; AI review 404 (undeployed) |
| Progress photos | ✓ | 🔴 | ✓ | — | 🔴 | ✗ | 🔴 | No storage bucket live (uploads fail); design = world-readable |
| Messaging | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🟡 | Persists; Realtime dead (B7) → no live updates |
| Nutrition plans | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 🟡 | Works |
| AI meal generation | ✓ | ✓ | ✓ | ✓ | 🔴 | ✗ | 🔴 | Main generator has no allergen input; persists unsafe plans |
| AI message drafting | ✓ | — | ✓ | ✓ | 🟡 | ✗ | 🟡 | Deployed & working; unmetered |
| AI client summaries | ✓ | ✓ | 🔴 | ✓ | 🟡 | ✗ | 🟠 | `aiProgressInsights` undeployed → 404 |
| At-risk detection | ✓ | 🟡 | 🔴 | — | ✓ | ✗ | 🟡 | Deterministic (browser), never persists; AI intervention 404 |
| Coach billing/subscriptions | ✓ | ✓ | ✓ | — | 🔴 | ✗ | 🔴 | Paywall open by default; cross-tenant Stripe reads |
| Client billing (client→coach) | ✓ | ✓ | 🟡 | — | 🔴 | ✗ | 🔴 | Charges real money, no Stripe Connect, no payout path |
| Automations | ✓ | ✓ | 🟡 | — | 🔴 | ✗ | 🔴 | Unsafe browser engine live; server runner never scheduled/open |
| Notifications (in-app) | ✓ | ✓ | ✓ | — | ✓ | ✗ | 🔴 | uuid/email mismatch → 0 shown (B1) |
| Notifications (email) | ✓ | — | ✓ | — | 🔴 | ✗ | 🟡 | Works if Vault set; open relay (S5); dead unsubscribe links |
| Web push | 🟡 | ✓ | 🔵 | — | ✓ | ✗ | 🟠 | Subscribe only; nothing ever sends (no VAPID private key/sender) |
| Client portal | ✓ | ✓ | ✓ | — | 🟡 | ✗ | 🟡 | Most pages real; shell/calendar/nutrition broken (B3) |
| AI insights | ✓ | ✓ | 🔴 | ✓ | 🟡 | ✗ | 🔴 | 5 functions undeployed → 404 |
| Multi-tenant isolation | — | ✓ | ✓ | — | 🟡 | ✗ | 🟡 | Row-level solid; column leaks (S6/S13), template leak (S7) |
| Analytics (product events) | 🟡 | 🟡 | — | — | — | ✗ | ⚫ | No PostHog, no event pipeline (see below) |
| Audit logging | — | ⚫ | — | — | ⚫ | ✗ | ⚫ | Does not exist |
| RAG / knowledge system | — | ⚫ | ⚫ | ⚫ | — | ✗ | ⚫ | Not implemented (no pgvector/embeddings) |
| Scheduled jobs (cron) | — | 🔴 | 🔵 | — | 🔴 | ✗ | 🔴 | pg_cron installed, 0 jobs; digests/reminders never run |

## Biggest gaps vs. the promise
"Manage more clients without more admin work; spot at-risk clients before they disengage."
- **At-risk detection is browser-only and never persisted**, and its AI intervention layer is 404. There is no server-side scoring, no history, no proactive surfacing outside an open tab.
- **Automations — the core "less admin work" engine — are either an unsafe client-side loop or an unscheduled/open server function.** Nothing fires reliably or safely.
- **Notifications (in-app + push) don't reach anyone** (uuid/email bug; no push sender; Realtime off).
- **Analytics that would prove activation/retention don't exist** (no PostHog, no `platform_events`).

## Analytics (Phase 16) — reality
No PostHog SDK, no analytics service, no `platform_events` table. The `telemetry.js` file is the only "analytics" module (1 TODO). None of the expected events (`coach_signed_up`, `trial_started`, `first_client_invited`, `first_program_generated`, `subscription_created`, `workout_logged`, …) are emitted. **Classification: ⚫ not implemented.**

## Notable "pretending to work"
Password change, refunds, active-session management, notification history, portal pause — all show success with no backend (B5). "AI Insights"/"Needs Attention"/At-Risk pages are branded AI but are deterministic and (for the AI parts) 404.
