-- ============================================================================
-- Migration — Closed-loop plan mutations (plan_versions + auto-apply settings)
--
-- Adds the single-write-path audit/proposal ledger for coach- and AI-driven
-- changes to nutrition_plans / workout_programs, plus the per-coach auto-apply
-- toggle for AI adaptations. Additive only — no changes to existing tables
-- beyond two new nullable columns on coach_defaults.
--
-- Conventions follow the rest of the port: uuid PKs via gen_random_uuid(),
-- text + CHECK instead of enums, created_by uuid default auth.uid(), RLS
-- enabled default-deny with app.owns_client()/app.is_admin() folded in, and
-- the standard updated_at trigger via app.add_updated_at_trigger().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- plan_versions — append-only audit + proposal ledger.
--
-- Every mutation to a client's nutrition_plan or workout_program is recorded
-- here first (source = who/what proposed it), then applied by the shared
-- planMutationService. A proposal is either applied immediately
-- (coach_command, or ai_adaptation when the coach has auto-apply on) or left
-- pending_approval for the coach to review. `diff` is a structured before/after
-- document (never a full-plan snapshot); `base_updated_at` snapshots the target
-- plan's updated_at at propose time so a stale diff can't clobber a plan that
-- changed underneath it.
--
-- Polymorphic target: exactly one of nutrition_plan_id / workout_program_id is
-- set, matching plan_kind (workout_programs have no client_id — a program is
-- linked to a client via clients.assigned_program_id).
-- ---------------------------------------------------------------------------
create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  plan_kind text not null check (plan_kind in ('nutrition', 'workout')),
  nutrition_plan_id uuid references public.nutrition_plans (id) on delete cascade,
  workout_program_id uuid references public.workout_programs (id) on delete cascade,
  -- Exactly one target, and it must match plan_kind.
  constraint plan_versions_one_target check (
    (plan_kind = 'nutrition') = (nutrition_plan_id is not null)
    and (plan_kind = 'workout') = (workout_program_id is not null)
  ),
  source text not null check (source in ('ai_adaptation', 'coach_command', 'manual_edit')),
  trigger_type text,                       -- e.g. client_meal_swap_threshold; null for coach_command
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'applied', 'rejected', 'superseded')),
  diff jsonb not null,                     -- structured before/after (see planMutationService)
  rationale text,                          -- AI reasoning, or coach's raw command text
  proposed_by text not null,               -- 'ai' | coach user id (as text)
  base_updated_at timestamptz,             -- target plan updated_at at propose time (stale guard)
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  applied_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_versions enable row level security;
select app.add_updated_at_trigger('public.plan_versions');

create index plan_versions_client_status_idx on public.plan_versions (client_id, status);
create index plan_versions_created_by_status_idx on public.plan_versions (created_by, status);
create index plan_versions_nutrition_plan_idx on public.plan_versions (nutrition_plan_id);
create index plan_versions_workout_program_idx on public.plan_versions (workout_program_id);

-- At most one OPEN proposal per plan, so concurrent AI/coach proposals can't
-- pile up on the same plan (the evaluator relies on this for idempotency).
create unique index plan_versions_one_open_per_plan_idx
  on public.plan_versions (plan_kind, coalesce(nutrition_plan_id, workout_program_id))
  where status = 'pending_approval';

-- RLS: a coach sees/manages only versions for their own clients (owns_client
-- folds in team membership); admins see all. Deep writes happen service-role
-- inside planMutationService, which enforces ownership in code as well.
create policy "select own client or admin" on public.plan_versions
  for select to authenticated
  using (created_by = (select auth.uid()) or app.owns_client(client_id) or app.is_admin());
create policy "insert own client or admin" on public.plan_versions
  for insert to authenticated
  with check (app.owns_client(client_id) or app.is_admin());
create policy "update own client or admin" on public.plan_versions
  for update to authenticated
  using (created_by = (select auth.uid()) or app.owns_client(client_id) or app.is_admin())
  with check (created_by = (select auth.uid()) or app.owns_client(client_id) or app.is_admin());
create policy "delete own client or admin" on public.plan_versions
  for delete to authenticated
  using (created_by = (select auth.uid()) or app.owns_client(client_id) or app.is_admin());

-- ---------------------------------------------------------------------------
-- coach_defaults — per-coach auto-apply posture for AI adaptations.
--
-- Default false: AI-proposed adaptations land as pending_approval (approval
-- queue). When a coach opts in, ai_adaptation proposals apply immediately.
-- adaptation_thresholds is an optional per-coach override of the default
-- deviationThresholds config (jsonb; null = use defaults).
-- ---------------------------------------------------------------------------
alter table public.coach_defaults
  add column auto_apply_ai_adaptations boolean not null default false,
  add column adaptation_thresholds jsonb;
