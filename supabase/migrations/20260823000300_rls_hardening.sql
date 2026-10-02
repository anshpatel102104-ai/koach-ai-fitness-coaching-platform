-- SECURITY hardening (SECURITY_AUDIT S7, S13, S19).

-- ── S7: template cross-tenant leak ──────────────────────────────────────────
-- workout_programs / nutrition_plans SELECT policies carried a bare
-- `OR is_template`, with no coach/team scoping — so toggling "save as template"
-- published a coach's program / macro plan to EVERY authenticated user
-- (competing coaches and all portal clients). Remove the global branch;
-- templates now follow the same coach/team scoping as everything else. The
-- assigned-portal-client branch is preserved so a client keeps seeing the plan
-- actually assigned to them.
drop policy if exists "select own or team or template or assigned portal or admin" on public.workout_programs;
create policy "select own or team or assigned portal or admin" on public.workout_programs
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or app.is_team_member(team_id)
    or exists (
      select 1 from public.clients c
      where c.assigned_program_id = workout_programs.id and app.is_portal_client(c.id)
    )
    or app.is_admin()
  );

drop policy if exists "select own or team or template or portal or admin" on public.nutrition_plans;
create policy "select own or team or portal or admin" on public.nutrition_plans
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or app.is_team_member(team_id)
    or app.is_portal_client(client_id)
    or exists (
      select 1 from public.clients c
      where c.assigned_nutrition_id = nutrition_plans.id and app.is_portal_client(c.id)
    )
    or app.is_admin()
  );

-- ── S13: coach-private AI sessions readable by the client ────────────────────
-- ai_conversations are the coach's private AI/risk sessions ABOUT the client
-- (churn/at-risk rationale). The `OR app.is_portal_client(client_id)` branch
-- let the client read them — contradicting the product rule that risk data is
-- never shown to clients. Remove the portal branch.
drop policy if exists "select own or portal or admin" on public.ai_conversations;
create policy "select own or admin" on public.ai_conversations
  for select to authenticated
  using (created_by = (select auth.uid()) or app.is_admin());

-- ── S19: store listings public on creation ──────────────────────────────────
-- plan_listings.is_published defaulted to true while the SELECT policy makes
-- published rows anon-readable — so a draft product was public the moment it
-- was created. New listings now start unpublished; the coach publishes
-- deliberately.
alter table public.plan_listings alter column is_published set default false;
