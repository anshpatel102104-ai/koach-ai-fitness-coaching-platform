# REMEDIATION_PLAN.md — Koach AI

_Prioritized engineering roadmap. Order follows the mandated fix strategy: P0 security → P0 data integrity → auth → authorization → core data layer → journeys → AI → payments → notifications → analytics → perf → UX. Prefer targeted fixes; preserve working functionality; small testable commits; reproduce → fix → verify → regression-test each._

## Phase 0 — P0 security (block launch)
1. **Invite account-takeover (S1).** Remove the password-overwrite of existing users in `setupPortalAccount`; stop returning the plaintext token in `sendClientInvite`'s response. Make invite tokens single-use at validate time or bind to the exact `clients.email`.
2. **Secrets in bundle (S3).** Delete `src/lib/sendgrid.js` and browser Calendly/Stripe key usage; route through edge functions; **rotate** any key ever set as `VITE_RESEND_API_KEY` / `VITE_CALENDLY_TOKEN` / `VITE_STRIPE_SECRET_KEY`.
3. **`runAutomations` open + cross-tenant (B-AUTOSEC).** Add `isServiceRoleCall` guard; scope rules to their owner's clients before enabling any schedule.
4. **`sendEmailNotification` open relay (S5).** Require recipient ∈ caller's clients; add per-user rate cap + send ledger.
5. **Stripe cross-tenant reads + wrong-subscription cancel (B-STRIPE-XT, B-CANCEL).** Mandatory ownership scoping on every `stripeClientProxy` action; make cancel accept and validate a target id.
6. **Storage (S2/S8).** Make `uploads` private; signed URLs; path-prefix RLS scoped to the uploader/tenant. (Also unblocks uploads, which are currently failing — no bucket exists.)
7. **Add `supabase/config.toml`** pinning `verify_jwt` per function (S15).

## Phase 1 — P0 data integrity
8. **Paywall open by default (B-PAY).** Default `billing_status='none'`; enforce entitlement server-side on gated actions.
9. **Privileged-column gaps (B-TRIAL).** Add `had_trial`, `ai_generation_count`, `ai_generation_month` to `protect_profile_privileged_columns`; add INSERT coverage / `with check` (S17).
10. **Facade honesty (B1 root).** Make `update()`/`delete()` surface zero-row RLS/validation failures instead of reporting success.
11. **AI health safety (B-SAFETY).** Deterministic allergen scanner + injury-contraindication check on AI output before persist; add allergy input to `generateSmartMeals`; calorie floors on all input paths.

## Phase 2 — authentication
12. **Default `VITE_AUTH_PROVIDER='supabase'`** and remove the Base44 auth path once verified; set `VITE_SUPABASE_URL`/`ANON_KEY` in the deploy env.
13. **Route protection.** Wire a real auth guard around coach routes (revive/replace `ProtectedRoute`); fix the dead redirect (`checkSupabaseAuth` must set `authError`).
14. **Coach signup (`/start`)** must call `signup()`; stop persisting the plaintext password to localStorage.

## Phase 3 — authorization / RLS hardening
15. **Column privacy:** add a `clients_portal_view` (drop coach-private columns) and stop portal SELECT on the base table (S6); restrict `ai_conversations` from portal (S13).
16. **Template leak (S7):** replace bare `or is_template` / `or is_public` with team/marketplace scoping.
17. Encrypt/relocate OAuth secrets in `coach_settings` (S10); add an **audit log** table for admin/cross-tenant/role/invite/service-role events (S11).

## Phase 4 — core data-layer bugs
18. **uuid/identity mismatches:** fix all `coach_id=email`, `recipient_id=email`, `client_id=user.id`, `coach_id='me'` sites (B1, B3, B8) and portal identity resolution (`portal_user_id`/email, not `user_id`).
19. **Invite send (B4):** pass `clientId`; align `OnboardingManager` to `invite_token_hash`.
20. Remove fake-success UIs or wire them (B5).
21. React Query: adopt a key convention (prefix + scope), fix `['clients']`/`['checkins']` collisions, set `staleTime`, add a global `onError`.

## Phase 5 — critical journeys
22. Deploy the 5 missing AI-insight functions or feature-flag their callers (B6).
23. Re-apply Realtime publication to the live project; add `.subscribe(status)` handling (B7).
24. Remove the browser automation auto-run; drive automations from the hardened server `runAutomations` on a schedule (B2).

## Phase 6 — AI architecture
25. Reintroduce `zod` output schemas server-side; reject on parse failure. Add `AbortController` timeout + one retry + `usage`/cost capture. Meter and rate-limit every AI function. Make `isClientFacing` server-derived.

## Phase 7 — RAG / context (only if the product needs it)
26. RAG is not implemented. Decide whether retrieval is actually required; if so, install pgvector, add embeddings for exercise/coach knowledge and client history, and a ranked retrieval step feeding the program/meal prompts. Otherwise, formalize the current direct-DB-context approach and rank the exercise-library grounding by client goal/equipment/injury.

## Phase 8 — payments
27. Implement Stripe Connect (or remove the client-billing surface — it currently routes coach revenue into the platform account with no payout path). Add store fulfillment to the webhook; implement or remove refunds/pause/mark-paid; fix downgrade proration/annual bugs; reconcile `payments` vs `invoices`.

## Phase 9 — notifications
28. Implement the web-push sender (VAPID private key + `web-push`) or remove the subscribe UI. Read `notification_settings` (quiet hours) in senders; add a real `/unsubscribe` route + `List-Unsubscribe` header; dedup the three client-creation email paths.

## Phase 10 — analytics
29. Integrate PostHog (or a `platform_events` pipeline). Emit the activation/retention funnel events; fire after success, include no PII, consistent naming.

## Phase 11 — performance
30. Code-split the 4.3MB bundle; paginate/limit unbounded list queries; move at-risk scoring server-side with persisted scores; add indexes as data grows; audit N+1 in dashboards.

## Phase 12 — UX / polish
31. Resolve the ~20 "coming soon" surfaces; fix portal sign-out dead-ends; remove dead scaffolding (`RoleRouter`, `useRoleGuard`, `base44/functions/*`); mobile QA of portal (mobile-first).

## Cross-cutting: testing & CI
- Make lint/typecheck **blocking**; run `scripts/verify-*` against a CI Postgres; add **E2E** for Journeys A–E and **adversarial RLS tests** (the current verify scripts re-implement functions rather than importing them, which is why the P0/P1 data bugs passed green).

## Suggested first commit set (highest ROI, low risk)
- Fix B1 identity mismatches (email→uuid) + facade silent-failure — instantly un-breaks settings & notifications.
- Fix B4 (`clientId`) + B3 (portal identity) — un-breaks invite + portal.
- Default `billing_status='none'` + add `had_trial` to trigger — closes the two revenue leaks.
- Remove `runAutomations` open access + browser auto-run — closes the automation security/corruption pair.
- Rotate + de-bundle secrets.
