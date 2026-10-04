# Schema Migration: Base44 → Supabase (Steps 1–3)

This document covers **Step 1 only**: porting the 63 Base44 entities
(`base44/entities/*.jsonc`) to Postgres tables with row-level security, as
ordered SQL migrations in `supabase/migrations/`. No data is migrated, no
frontend or `base44Client.js` code is touched.

Migration files (apply in order):

| File | Contents |
|---|---|
| `20260709000000_init_helpers.sql` | `pgcrypto`, `app` schema, `set_updated_at`, portal-claim reader |
| `20260709000100_core.sql` | `profiles`, `teams`, `team_members`, `clients` + tenancy helper functions |
| `20260709000200_coaching.sql` | programs, nutrition, logs, check-ins, habits, goals, libraries, messages, scheduling, intake (23 tables) |
| `20260709000300_business.sql` | leads, packages, listings, invoices, payments, marketing, testimonials, referrals, affiliates (17 tables) |
| `20260709000400_community.sql` | groups, challenges, posts, comments, badges, community settings (6 tables) |
| `20260709000500_system.sql` | automation, notifications, logs, AI conversations, import jobs, per-coach settings singletons (13 tables) |
| `20260709000600_invite_token_hash.sql` | Step 1.5 Fix 1: `clients.invite_token` → `invite_token_hash` (sha256 hex), plaintext never stored |
| `20260709000700_portal_column_privacy.sql` | Step 1.5 Fix 2: portal views hide `check_ins.internal_notes` + `coaching_sessions.zoom_*`; portal paths removed from those base tables |
| `20260709000800_base44_observed_fields.sql` | Step 2 follow-up: columns observed in REAL Base44 data but undeclared in the .jsonc schemas (profiles coach-onboarding fields, check_in_forms counters, widened notifications.category CHECK) |

All six migrations were applied end-to-end against Postgres 16 (with an
`auth` schema shim) and exercised with a functional RLS test: coach↔coach
isolation, team access, portal-claim access, wrong-claim denial, anon
default-deny, and the admin-self-promotion guard.

## Step 2 — Data-access layer swap (facade + data migration)

### 2b. Facade: `src/api/supabaseClient.js`

Same shape as `base44Client`, so cutover is an import swap:
`import { supabase as base44 } from '@/api/supabaseClient'`.

- `entities.{Entity}.list(sort, limit) / filter(criteria, sort, limit) /
  get(id) / create(data) / update(id, data) / delete(id)` — wraps
  `.from(<table>)` using the entity→table map above (incl. `Session` →
  `coaching_sessions`, `User` → `profiles`). `subscribe()` is a warn+no-op
  until Realtime is ported.
- Field compatibility: outgoing `created_date`/`updated_date`/
  `created_by_id` (sort keys, filter keys, payloads) translate to
  `created_at`/`updated_at`/`created_by`; returned rows get read-only
  `created_date`/`updated_date`/`created_by_id` aliases.
- `auth.me()` = Supabase session user ⋈ `profiles` row. Divergences from
  base44.auth.me(): requires a Supabase Auth session (Step 3) and rejects
  when signed out (same contract, different login flow); `full_name` comes
  from profiles (seeded from signup metadata); everything else pages read
  (`id`, `email`, `role`, `subscription_tier`, `billing_status`,
  `stripe_*`, `subscription_renewal_date`,
  `subscription_cancel_at_period_end`, `created_date`) is present.
  `auth.updateMe()` updates the own profiles row (privileged columns still
  blocked by the DB trigger); `auth.logout()` = signOut + redirect;
  `auth.redirectToLogin()` targets `/login` (Step 3 defines the page).
- `functions.invoke(name, payload)` → Supabase Edge Functions, returning
  `{ data }` so `res.data.x` call sites keep working. Until Step 5 deploys
  a given function, invoking it rejects — intentionally not swallowed.
- **Portal context**: import `supabasePortal` (same shape) in
  `src/pages/portal/*` ONLY. It routes `CheckIn` →
  `check_ins_portal_view` (CRUD) and `Session`/`CoachingSession` →
  `coaching_sessions_portal_view` (read-only; `create/update/delete`
  throw). All other entities behave as in the coach facade.
- Env: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (lazily read on first
  call so pages still on base44 build/run without them).

### 2c. Cutover status

Migrated to the facade (import swap only, call sites untouched):
`src/pages/Clients.jsx`, `src/pages/ClientProfile.jsx`,
`src/components/clients/ClientQuickPanel.jsx`. Everything else remains on
`base44Client` pending review of this pattern. Known cross-backend seams
until the rest cuts over: `src/lib/teamUtils.js` (getMyTeamId),
`src/lib/zapier.js`, email helpers, and the shared modals opened from the
Clients page still read/write Base44 — during the transition window the
Clients list itself is Supabase-backed while those side features are not.

Facade verification without a live Supabase project:
`npm run verify:facade` (with `POSTGRES_URL`) injects a small PostgREST-style
driver into the facade's test seam and replays the Clients module's exact
call shapes against the migrated local database **with RLS enforced** —
including portal-view routing, read-only enforcement, and cross-tenant
denial. 21/21 checks pass.

## Step 3 — Auth migration

### What Base44's login flow actually was

A **hosted redirect**, not an in-app form. `base44.auth.redirectToLogin(next)`
(from `AuthContext.navigateToLogin` and the onboarding screens) sends the
browser to `${appBaseUrl}/login?from_url=…`; Base44 returns an `access_token`
in the URL, which `app-params.js` reads (and strips) into `appParams.token`,
and `AuthContext.checkAppState` hydrates via `base44.auth.me()`. The SDK also
supports email/password, email OTP, SSO/OAuth, and password reset, but the app
never called them directly — everything went through the hosted page. Signup =
`/start` (PremiumOnboarding) → same hosted redirect. Portal-client auth was
**half-built**: `ClientSetup.jsx`'s password submit was an explicit
placeholder, and portal pages resolved the client via `auth.me()` →
`Client.filter({ email })`.

### 3a. Coach auth (Supabase Auth), behind a feature flag

- Flag `VITE_AUTH_PROVIDER` = `base44` (default) | `supabase`
  (`src/lib/authConfig.js`). Auth is one session for the whole shell, so it
  flips **all at once**, never module-by-module. The switch lives in
  `src/api/base44Client.js`: a Proxy delegates `.auth` to the Supabase facade
  when the flag is `supabase`, while `.entities`/`.functions` stay on Base44 —
  so the Step 2 incremental data cutover is unaffected by the auth cutover.
- New in-app pages (`src/pages/auth/`): `Login`, `Signup`, `ForgotPassword`,
  `ResetPassword`, sharing an `AuthShell` that reuses the existing ClientSetup
  design tokens (no new styling system). Email/password only — magic-link and
  OAuth are supported by Supabase but deliberately **not built**, since the
  app doesn't use them today.
- Facade auth (`supabaseClient.js`) gained real-session methods: `login`,
  `signup` (full_name → user_metadata → picked up by `handle_new_user`),
  `requestPasswordReset`, `updatePassword`, `hasSession`,
  `onAuthStateChange`; `me()`/`logout()`/`redirectToLogin()` now drive a real
  Supabase session and route to `/login`.
- `AuthContext` branches on the flag: the Supabase path skips Base44's
  public-settings probe, treats the session as the source of truth, and
  subscribes to auth-state changes. Password reset / email confirmation use
  Supabase's built-in flows (`resetPasswordForEmail`, `signUp` confirmation).
- The `handle_new_user` trigger from Step 1 provisions the `profiles` row on
  signup — **verified firing** in the rehearsal (check below).

### 3b. Client portal — re-platformed invite-token exchange

Three Supabase Edge Functions under `supabase/functions/`, sharing
`_shared/portalToken.js` (portable Web-Crypto module — identical code runs in
Deno and the Node verifier). The legacy `base44/functions/{validateInviteToken,
sendClientInvite}` are **left in place**: they serve the `base44`-flag path
against Base44's own backend (which still holds plaintext tokens); the new
Supabase functions serve the `supabase`-flag path against Postgres.

- **`sendClientInvite`** (generation — the easy-to-miss half): mints a 32-byte
  token, stores **only** `sha256(token)` in `invite_token_hash`, and emails the
  plaintext solely inside the `/client-setup/<token>` link. Runs the client
  update under the **caller's** JWT so RLS enforces coach-owns-client. Without
  this, new invites would silently reintroduce the plaintext-token issue Step
  1.5 closed.
- **`validateInviteToken`** (validation): sha256-hashes the incoming token,
  service-role lookup by `invite_token_hash` + expiry check, then mints a
  short-lived (**1h**) portal JWT. Never logs/persists the plaintext.
- **`setupPortalAccount`** (bootstrap): validates the token, creates/links a
  real Supabase Auth user for the client's email + chosen password, sets
  `clients.portal_user_id`, and **single-uses** the token (clears hash +
  expiry). `ClientSetup.jsx`'s placeholder submit now calls this, then signs
  the client in.

**Minted portal JWT shape** (HS256, signed with `SUPABASE_JWT_SECRET`;
signature independently verified in the rehearsal):
```json
{ "role": "authenticated", "aud": "authenticated",
  "iat": <now>, "exp": <now+3600>,
  "portal_client_id": "<client uuid>", "portal": true }
```
`sub` is intentionally omitted on the claim-based token (no `auth.users` row in
that path), so `auth.uid()` stays null and access is granted solely via
`portal_client_id` → `app.portal_client_id()` → `app.is_portal_client()`. Both
paths the Step 1.5 helper supports are exercised.

**DECISION (3b.4): portal clients get a REAL Supabase Auth account**, linked
via `clients.portal_user_id`; the invite token is a one-time bootstrap, not a
per-session credential. Rationale: the ClientSetup UI already collects a
password; portal access must outlive the 7-day invite window; a real account
gives password reset + revocation for free; and `is_portal_client()` then
resolves via the durable `portal_user_id = auth.uid()` path instead of a
re-minted 1h claim. The claim-minting exchange is retained as the immediate,
first-access mechanism (and remains a valid fallback the helper supports).

### 3c. Verification

`npm run verify:auth` (with `POSTGRES_URL`) rehearses against local Postgres +
the auth shim, running the **real** `_shared/portalToken.js` for all hashing
and JWT minting. 22/22 checks pass, covering: signup → `handle_new_user`
provisions the profile (role defaults to `user`); coach-session RLS isolation
via a real session identity; generate-stores-hash-only (plaintext never in the
DB); validate re-hashes deterministically and mints a JWT whose
`portal_client_id` claim `app.is_portal_client()` accepts (read + write through
`check_ins_portal_view`); wrong-client claim sees nothing; and
`setupPortalAccount` linking `portal_user_id` + single-using the token, after
which the durable account path resolves. The JWT's HS256 signature was also
verified independently against the secret.

**Not yet exercisable locally:** the real GoTrue email flows (confirmation /
reset delivery) and PostgREST verifying the minted JWT signature over the wire
— both require a live Supabase project. The signing/claims are proven correct;
the transport is not.

## Global conventions

- **Base44 built-ins** → `id uuid primary key default gen_random_uuid()`,
  `created_date` → `created_at timestamptz`, `updated_date` → `updated_at`
  (maintained by a `BEFORE UPDATE` trigger on every table, not a static
  column), `created_by_id` → `created_by uuid default auth.uid()`.
- **Types**: `date-time` → `timestamptz`; `date` → `date`; `HH:MM` strings →
  `time`; money → `numeric(12,2)`; rates/percents → `numeric(5,2)`; enums →
  `text` + `CHECK`; arrays of scalars → native arrays (`text[]`, `uuid[]`);
  arrays of objects / free-form objects → `jsonb`.
- **Default-deny**: every table has `ENABLE ROW LEVEL SECURITY` and only the
  policies listed below. A table/operation with no policy is inaccessible to
  `anon`/`authenticated`. The service role (edge functions, Steps 4–5)
  bypasses RLS as usual.
- **Admin**: Base44's `role: admin` bypass becomes `app.is_admin()`
  (checks `profiles.role = 'admin'`), folded explicitly into each policy.
  A trigger on `profiles` blocks non-admins from changing `role` or any
  Stripe/subscription column (the function is intentionally *invoker*
  rights — as `security definer` the `current_user` allowlist would always
  match the function owner).

### Helper functions (schema `app`)

| Function | Meaning |
|---|---|
| `app.is_admin()` | current user has `profiles.role = 'admin'` |
| `app.is_team_member(team_id)` | accepted member of the team, or the team owner |
| `app.owns_client(client_id)` | coach path: `clients.user_id = auth.uid()` OR `clients.created_by = auth.uid()` OR member of `clients.team_id` |
| `app.portal_client_id()` | reads the `portal_client_id` claim from the JWT |
| `app.is_portal_client(client_id)` | client path: claim matches, or `clients.portal_user_id = auth.uid()` |
| `app.portal_coach_is(coach_id)` | current portal client belongs to that coach |
| `app.portal_client_in(uuid[])` | current portal client appears in a member/participant array |
| `app.can_read_post(post_id)` | shared read predicate for community posts/comments |

All are `SECURITY DEFINER` (except the profile guard) so they can consult
`clients`/`team_members`/`profiles` without RLS recursion.

## Invite-token client portal → RLS design (the tricky part)

**How it works today (Base44):** `sendClientInvite` stores a 64-hex random
`invite_token` + 7-day `invite_token_expires` on the Client row and emails a
`/client-setup/<token>` link. `validateInviteToken` looks the token up with
the Base44 **service role** and returns the client identity. Portal requests
then satisfied Base44 rules like `data.client_id == user.id`.

**The port** uses a *claim-based* approach, chosen over the two alternatives:

1. ~~Route every portal read/write through service-role edge functions~~ —
   works but makes RLS vacuous for the portal and bloats Step 5.
2. **Chosen: scoped JWT claim.** An edge function (re-platformed
   `validateInviteToken`, **implemented in Step 3b**) validates the token +
   expiry using the service role, then mints a short-lived JWT signed with the
   project's JWT secret carrying `role: "authenticated"` and a custom claim
   `portal_client_id: "<client uuid>"`. The portal uses that JWT as its
   Supabase session token. (See "Step 3 — Auth migration" for the exact JWT
   shape and the final account-model decision.)
3. Forward-compatible: `clients.portal_user_id` (new column) links a real
   Supabase Auth user once client auth lands in Step 3; the same helper
   `app.is_portal_client()` accepts either path, so **no policy changes were
   needed in Step 3** — confirmed.

Policies never read the invite token; portal access only ever routes through
`app.is_portal_client()` (verified by grep — no policy references the
column). Since Step 1.5, the column is `invite_token_hash` (`unique`, sha256
hex — see `20260709000600_invite_token_hash.sql`): the plaintext token
exists only inside the emailed `/client-setup/<token>` link. **Contract (now
implemented in Step 3b):** `sendClientInvite` stores `sha256(token)` while
emailing the plaintext, and `validateInviteToken` hashes the incoming token
before its service-role lookup, then checks `invite_token_expires`. Both use
the shared `supabase/functions/_shared/portalToken.js`. Because there is no
anon-readable path to `clients`, hashes are not enumerable through the API
either.

**What the portal claim grants** (exactly one client's data):
read/write own `daily_logs`, `food_logs`, `in_body_scans`,
`workout_sessions`, `messages`, `habit_completions`; CRUD own check-ins
**via `check_ins_portal_view` only** (base table is coach-only since Step
1.5 Fix 2 — the view hides `internal_notes` and its CHECK OPTION prevents
writing another client's rows); read own sessions **via
`coaching_sessions_portal_view` only** (hides `zoom_meeting_id`,
`zoom_join_url`, `zoom_start_url`, `zoom_password`; `meeting_link` — the
client-facing join link — remains); read own `clients` row, `habits`,
`goals`, `invoices`, `payments`, `client_badges`, `ai_conversations`,
assigned `workout_programs` / `nutrition_plans`, assigned active
`check_in_forms`; submit + read own `testimonials`; read/participate in
community groups/challenges/posts they're a member of.

**Portal-view naming convention:** `<base_table>_portal_view`. The views are
deliberately *not* `security_invoker`: coaches and portal clients share the
single `authenticated` role, so a table-level REVOKE or column grant cannot
separate them, and an invoker view would require keeping the base-table
portal SELECT policies — leaving the direct-read hole open. Instead the
views (definer semantics, `security_barrier = true`) carry the same
`app.is_portal_client(client_id)` predicate the base policies used, `WITH
CASCADED CHECK OPTION` on the writable one. Coach-facing base-table
policies are unchanged.

**Security note / second-look items:**
- ~~The invite token is stored in plaintext~~ — resolved in Step 1.5
  (`invite_token_hash`, see above).
- A minted portal JWT should be short-lived (≤ 1 hour, refresh via the same
  token exchange) since it can't be revoked server-side.
- ~~`check_ins.internal_notes` / `coaching_sessions.zoom_*` column
  exposure~~ — resolved in Step 1.5 Fix 2 via the portal views above.
- **Step 2 swap list (tracked here so it isn't silently missed):** portal
  pages must query the views instead of the base tables once the client
  swap happens — `src/pages/portal/PortalCheckIn.jsx`,
  `PortalProgress.jsx`, `PortalCalendar.jsx`, `PortalProfile.jsx` (CheckIn →
  `check_ins_portal_view`) and `src/pages/portal/PortalCalendar.jsx`
  (Session → `coaching_sessions_portal_view`). Coach-facing pages
  (`ClientProfile`, `ClientDashboard`, check-in review, etc.) keep using the
  base tables.

## Multi-coach teams

`TeamMember.jsonc` confirms a flat membership model: `team_id`, `user_id`
(null until invite accepted), `email`, `role_label` (`owner`/`coach` —
explicitly "no permission differences yet"), `invite_status`. Nine entities
carry `team_id` (`clients`, `goals`, `habits`, `habit_completions`,
`messages`, `nutrition_plans`, `weigh_ins`, `workout_programs`,
`workout_sessions`) and grant *accepted* team members (plus the team owner)
the same access as the row creator, via `app.is_team_member()` /
`app.owns_client()`. Membership rows themselves: only the team owner (or
admin) may insert; the invitee can read/update rows matching their
`user_id` or JWT email (to accept the invite). Base44 let *any* user insert
TeamMember rows — tightened (see deviations).

## Entity → table map

Legend for the RLS column: **C** = created_by (owning coach), **O** =
`owns_client()` (coach of the row's client, incl. team), **T** = team member,
**P** = portal client, **A** = admin, **pub** = public/anon read condition,
**svc** = service-role only (no user policy).

| Base44 entity | Table | Tenant/owner field | RLS (select / insert / update / delete) |
|---|---|---|---|
| User | `profiles` | `id` = auth user | self+A / self / self+A (privileged cols guarded) / — (via auth cascade) |
| Team | `teams` | `owner_coach_id` | owner+member+C+A / owner-self / owner+A / A |
| TeamMember | `team_members` | `team_id` → owner | C+self+email+owner+A / owner+A / C+self+email+owner+A / C+owner+A |
| Client | `clients` | **`user_id` (owning coach)**, `team_id` | C+user_id+T+P(self)+A / C (user_id self/team) / C+user_id+T+A / C+user_id+T+A |
| ExerciseLibrary | `exercise_library` | `created_by` | C+`is_public`+A / C / C+A / C+A |
| WorkoutProgram | `workout_programs` | `created_by`, `team_id` | C+T+`is_template`+P(assigned)+A / C(+team valid) / C+T+A / C+T+A |
| WorkoutSession | `workout_sessions` | client → `client_id` | C+O+T+P+A / O+P / O+P+A / C+O+T+P+A |
| NutritionPlan | `nutrition_plans` | `created_by`, `client_id`, `team_id` | C+T+`is_template`+P(own/assigned)+A / C(+client/team valid) / C+T+A / C+T+A |
| MealTemplate | `meal_templates` | `created_by` | C+A / C / C+A / C+A |
| FoodItem | `food_items` | `created_by`/`coach_id` | C+`is_approved`+A / C(coach self) / C+A / C+A |
| FoodLog | `food_logs` | client → `client_id` | C+O+P+A / O+P / O+P+A / C+O+P+A |
| CheckInForm | `check_in_forms` | `created_by` | C+A+P(assigned, active) / C / C+A / C+A |
| CheckIn | `check_ins` | client → `client_id` | base table coach-only: C+O+A / O / O+A / C+O+A; portal CRUD via `check_ins_portal_view` (no `internal_notes`) |
| DailyLog | `daily_logs` | client → `client_id` | C+O+P+A / O+P / O+P+A / C+O+P+A |
| WeighIn | `weigh_ins` | `created_by`, `team_id` | C+T+A / O / O+A / C+T+A (no portal access, as Base44) |
| InBodyScan | `in_body_scans` | client → `client_id` | C+O+P+A / O+P / O+P+A / C+O+P+A |
| Habit | `habits` | client, `team_id` | C+T+P+A / O / O+A / C+T+A |
| HabitCompletion | `habit_completions` | client, `team_id` | C+T+P+A / O+P / O+P+A / C+T+A |
| Goal | `goals` | client, `team_id` | C+T+P+A / O / O+A / C+T+A |
| GoalTemplate | `goal_templates` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| SupplementLibrary | `supplement_library` | `created_by` | C+`is_public`+A / C / **A only** / **A only** (as Base44) |
| Message | `messages` | client, `team_id` | C+O+T+P+A / O+P / O+P+A / C+A |
| Session | **`coaching_sessions`** (renamed) | `created_by`, client | base table coach-only: C+O+A / O / C+O+A / C+O+A; portal read via `coaching_sessions_portal_view` (no `zoom_*`) |
| BlockedTime | `blocked_times` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| BufferTime | `buffer_times` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| CoachAvailability | `coach_availability` | `coach_id` (unique per weekday) | C+coach+`is_public`(anon)+A / coach-self / C+coach+A / A |
| OnboardingResponse | `onboarding_responses` | `coach_id` | C+coach+A / **svc only** (public intake via edge fn) / C+coach+A / A |
| Lead | `leads` | `created_by` | C+A / C / C+A / C+A |
| CoachingPackage | `coaching_packages` | `created_by` | C+`visibility='public'`(anon)+A / C / C+A / C+A |
| PlanListing | `plan_listings` | `created_by`/`coach_id` | C+coach+`is_published`(anon)+A / C / C+coach+A / C+coach+A |
| Invoice | `invoices` | `created_by`, client | C+O+P+A / O / C(own client)+A / A |
| Payment | `payments` | `created_by`, client | C+O+P+A / O / C(own client)+A / A |
| EmailTemplate | `email_templates` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| MarketingCampaign | `marketing_campaigns` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| MarketingLink | `marketing_links` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| Testimonial | `testimonials` | `coach_id`, `client_id` | C+coach+P+`approved`(anon)+A / coach-self or P / C+coach+A / C+coach+A |
| ReferralProgram | `referral_programs` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| Referral | `referrals` | `referrer_id` | referrer+A / **A/svc** / **A/svc** / **A/svc** |
| ReferralPayout | `referral_payouts` | `coach_id` | coach+A / **A/svc** / **A/svc** / **A/svc** |
| AffiliateProfile | `affiliate_profiles` | `coach_id` (unique) | coach+A / coach-self / coach+A / A |
| AffiliateApplication | `affiliate_applications` | `coach_id` | C+coach+A / coach-self / C+coach+A / A |
| AffiliateLink | `affiliate_links` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| AffiliateCommission | `affiliate_commissions` | `affiliate_id` | affiliate+A / **A/svc** / **A/svc** / **A/svc** |
| AffiliatePayout | `affiliate_payouts` | `affiliate_id` | affiliate+A / **A/svc** / **A/svc** / **A/svc** |
| CommunityGroup | `community_groups` | `coach_id` | C+coach+P(member)+A / coach-self / C+coach+A / C+coach+A |
| Challenge | `challenges` | `created_by` | C+P(participant)+A / C / C+A / C+A |
| CommunityPost | `community_posts` | `coach_id` (tenant), `author_id` | `can_read_post` (author/coach/group-member/coach-wide portal/A) / C or P(author), tenant+group validated / C+P(author)+coach+A / same |
| PostComment | `post_comments` | `coach_id`, `post_id` | parent-post readable / author (coach or portal) on readable post / author+A / author+coach+A |
| ClientBadge | `client_badges` | client → `client_id` | C+O+P+A / O / **A only** / **A only** (as Base44) |
| CommunitySettings | `community_settings` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| AutomationRule | `automation_rules` | `created_by` | C+A / C / C+A / C+A |
| AutomationLog | `automation_logs` | via `rule_id` owner | rule-owner+A / **A/svc** / **A/svc** / **A/svc** |
| Notification | `notifications` | `recipient_id` (uuid, was email) | recipient+A / recipient-self or A (svc in practice) / recipient+A / recipient+A |
| NotificationSettings | `notification_settings` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| ReminderSettings | `reminder_settings` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| ZapierLog | `zapier_logs` | — (platform log) | **A/svc** all ops (as Base44) |
| AIConversation | `ai_conversations` | `created_by`, `client_id` | C+P+A / C(own client) / C+A / C+A |
| ClientImportJob | `client_import_jobs` | `coach_id` | C+coach+A / coach-self / C+coach+A / C+coach+A |
| BusinessSettings | `business_settings` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| CoachSettings | `coach_settings` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| CoachDefaults | `coach_defaults` | `coach_id` (unique) | C+coach+A / coach-self / C+coach+A / A |
| CoachProfile | `coach_profiles` | `coach_id` (unique) | C+coach+`is_public`(anon)+A / coach-self / C+coach+A / A |
| WhiteLabelSettings | `white_label_settings` | `coach_id` (unique) | C+coach+`is_published`(anon)+A / coach-self / C+coach+A / A |

### Key foreign-key / delete-behavior decisions

- **Cascade with the client**: check_ins, daily_logs, food_logs, weigh_ins,
  in_body_scans, workout_sessions, habits (+completions), goals, messages,
  coaching_sessions, client_badges, ai_conversations, zapier/automation logs.
- **RESTRICT (financial records block deletion)**: `invoices.client_id`,
  `payments.client_id`, `referrals.referrer_id/referred_coach_id`,
  `referral_payouts.coach_id`, `affiliate_commissions.affiliate_id`,
  `affiliate_payouts.affiliate_id`. Deleting a client/coach with money
  history requires an explicit archival decision first.
- **SET NULL (reference is informational)**: `food_logs.food_item_id`
  (name is denormalized), `workout_sessions.program_id`,
  `leads.converted_client_id`, `testimonials.client_id`,
  `onboarding_responses.client_id`, `challenges.group_id`, `*.team_id`,
  settings-table `default_*_id` pointers.
- **Cascade with the coach account** (`profiles` → `auth.users` cascade):
  all coach-owned content and settings (tenant teardown on account
  deletion).
- `clients.assigned_program_id` / `assigned_nutrition_id` FKs are added in
  the coaching migration (tables don't exist yet in core).

## Deviations from literal Base44 rules (deliberate, all flagged)

**Tightenings** (Base44's `create: {created_by_id: user.id}` effectively let
*any* signed-in user insert *anything*, including rows attached to another
coach's clients — verified as a live cross-tenant hole during testing):
1. Inserts/updates on client-scoped tables now require
   `app.owns_client(client_id)` (or the portal claim), not just a
   `created_by` stamp.
2. Inserts on `coach_id`-bearing tables require `coach_id = auth.uid()`, so
   a coach can't plant rows in another coach's settings/calendar/marketing.
3. `team_members` insert restricted to the team owner (Base44 allowed
   anyone to join any team).
4. `notifications` insert restricted to self/admin/service-role (Base44
   allowed any user to notify any user).
5. Community post/comment inserts validate the tenant (`coach_id`) and
   group membership.

**Additions** (features that only worked in Base44 through the loose create
rule or server-side reads; without them the app breaks under default-deny):
1. Portal read on `clients` (own row), `habits`, `goals`, `check_in_forms`
   (assigned + active), and portal write on `habit_completions`.
2. Portal read of `workout_programs`/`nutrition_plans` via
   `clients.assigned_program_id`/`assigned_nutrition_id` — Base44's rule
   referenced a `client_id` field that doesn't exist on WorkoutProgram.
3. Community: group members can read posts in their group and coach-wide
   posts from their own coach (Base44's literal rules made feeds unreadable
   to members).
4. `automation_logs`: coaches can read logs for their own rules (Base44 was
   admin-only, which would blank the automation-history UI).
5. `nutrition_plans` select restored `created_by` (Base44's read rule
   omitted the creator — a coach couldn't read their own unassigned,
   non-template plan).

**Renames**: `Session` → `coaching_sessions` (avoids collision with auth
terminology). `User` → `profiles` (Supabase convention, 1:1 with
`auth.users`).

## Fields materialized because Base44 RLS referenced them without defining them

- `exercise_library.is_public`, `supplement_library.is_public`,
  `coach_availability.is_public`, `coach_profiles.is_public` (default
  `false`)
- `food_items.is_approved` (default `false`)

## Non-relational / loosely-typed fields kept as jsonb (real-type decision deferred)

- `workout_programs.workouts` (day → exercise documents; a normalized
  `program_days`/`program_exercises` split is possible later but the builder
  UI reads/writes whole documents)
- `nutrition_plans.meals`, `rest_day_meals`, `hydration`, `coach_notes`,
  `supplements`
- `workout_sessions.exercises`, `exercise_logs`
- `check_in_forms.questions`, `settings`; `check_ins.measurements`,
  `ai_summary`
- `community_posts.reactions`; `leads.activity_log`; `daily_logs.focus_tasks`
- `client_import_jobs.sample_rows` / `all_rows` (staging CSV rows; consider
  moving to Storage — a large import will bloat the row)
- `business_settings.working_hours`, `onboarding_items`, `session_types`,
  `pipeline_stages`; `notification_settings.*` category objects;
  `white_label_settings.publish_history`, `custom_pages`
- `zapier_logs.payload` was a *JSON string* in Base44 → stored as `jsonb`
  (data migration must `::jsonb` it; malformed payloads need a fallback)

## Data-migration notes for Step 2+ (IDs and emails)

- Base44 string IDs → new uuids: build an old-id → uuid crosswalk during the
  data migration; `clients.external_id` pattern can be reused for other
  tables if needed.
- **Mixed email/ID owner fields**: `blocked_times.coach_id`,
  `buffer_times.coach_id`, `coach_availability.coach_id`,
  `coach_defaults.coach_id`, `reminder_settings.coach_id`,
  `onboarding_responses.coach_id` were documented as "coach email/ID" in
  Base44, and `notifications.recipient_id` matched on **email**. All are
  uuid columns now; the data migration must resolve emails → profile ids.
- `daily_logs`/`check_ins` have no unique `(client_id, date)` constraint —
  Base44 didn't enforce one and `food_logs` uses a sentinel-row convention;
  add constraints later if the app guarantees uniqueness.

## Open questions (need a product/owner decision — not guessed)

1. **`leads.stage` legacy values**: the enum contains both the new pipeline
   (`new_lead`…`closed_won`) and legacy values (`lead`, `booked`, `closed`,
   `active_client`). Kept both for importability; consolidate when?
2. **`clients.user_id` nullable**: Base44 didn't mark it required, and some
   legacy rows may rely on `created_by` alone. RLS accepts either; consider
   backfilling `user_id := created_by` during data migration and making it
   `NOT NULL`.
3. ~~**`check_ins.internal_notes` / zoom join secrets**~~ — **resolved
   (Step 1.5, Fix 2)**: portal access moved to `check_ins_portal_view` /
   `coaching_sessions_portal_view` (definer views with the portal predicate
   built in + CHECK OPTION), coach-only columns excluded, portal paths
   removed from the base-table policies; coaches unchanged.
4. **`community_posts.author_id` dual-typed** (client id or coach/profile
   id, so no FK): split into `author_client_id` + `author_user_id`? Same for
   `post_comments.author_id`, `likes` arrays.
5. **Platform-wide template reads**: Base44 let *every* authenticated user
   read any `is_template` workout/nutrition plan and `visibility='public'`
   packages. Preserved — confirm templates are meant to be cross-tenant.
6. **`coach_settings.zoom_access_token`** is a live OAuth secret in a
   user-readable row (as in Base44). Recommend moving to Supabase Vault or
   an edge-function-only store during Step 5.
7. ~~**Invite-token hashing**~~ — **resolved (Step 1.5, Fix 1)**: column
   renamed to `invite_token_hash` (sha256 hex, rename chosen over additive
   since no data exists yet); Step 4/5 functions must hash before compare
   (contract documented in the portal section and the migration header).
8. **`challenges.participants` spoofing**: a coach could list another
   coach's client ids as participants, making the challenge visible to those
   clients. Same class of (minor) injection existed in Base44; a validation
   trigger can close it if desired.
9. **Settings singletons**: unique on `coach_id` (where not null). Legacy
   data with multiple rows per coach (keyed only by `created_by`) would need
   dedup during data migration.
10. ~~**Base44 `role: 'admin'` migrates verbatim into `profiles.role`**~~
    **RESOLVED in Step 6** (migration `20260714000200_rbac.sql` + the
    migration script): `profiles.role='admin'` is PLATFORM STAFF ONLY —
    `app.is_admin()` grants cross-tenant read and is never handed to a
    customer. The migration script now maps Base44 `role:'admin'` (which
    meant "the coach" in the single-tenant app) to `'user'`; platform admin
    is granted deliberately post-migration. Team authority lives in
    `team_members.role_label` + `teams.owner_coach_id`, entirely separate
    from `profiles.role`:
    - `owner` — manage members/settings/billing; the founding owner
      (`owner_coach_id`) plus any accepted `role_label='owner'` co-owner
      (the Team page's "promote to owner" now grants what it displays via
      `app.is_team_owner()`).
    - `coach` — team-scoped client work via `app.is_team_member()`; no
      member management, no team settings, no billing (server-gated in the
      stripe* functions, not just hidden UI).
    A narrower `assistant` tier was consciously NOT added: no UI surface
    distinguishes one (the invite flow only creates 'coach'). Adding it
    later is a `role_label` CHECK + `app.team_role()` tweak.
    Verified by `npm run verify:rbac` (real RLS, three identities).
11. **Rows created by Base44 service functions** (`created_by_id:
    "service_..."` — 2 nutrition plans, 2 messages in real data) migrate
    with `created_by = null`; coaches reach them via client/team paths
    where those exist. Consider back-filling `created_by` from the
    client's owning coach during the production run.
12. **Notifications addressed to client emails** can't map until Step 3
    creates portal auth accounts — re-run the Notification entity after
    Step 3 (the script is idempotent, so this is safe).
