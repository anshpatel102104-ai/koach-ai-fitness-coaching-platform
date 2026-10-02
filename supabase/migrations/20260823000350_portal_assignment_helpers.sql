-- FIX (prerequisite for 20260823000400_clients_portal_view):
-- the workout_programs / nutrition_plans SELECT policies (as rewritten by
-- 20260823000300) granted a portal client their ASSIGNED plan via
--   exists (select 1 from public.clients c where c.assigned_*_id = <row>.id
--           and app.is_portal_client(c.id))
-- That subquery runs with the INVOKER's RLS on public.clients. 20260823000400
-- removes the portal branch from the clients SELECT policy, so for a portal JWT
-- the subquery would see zero rows and the client would silently lose access to
-- the program / nutrition plan their coach assigned.
--
-- Move the assignment check into SECURITY DEFINER helpers (same pattern as
-- app.is_portal_client / app.owns_client) and re-point both policies at them.
-- Coach / team / admin branches are unchanged. (Applied live as below — the
-- policies are altered in place, keeping the names 20260823000300 gave them.)

create or replace function app.is_portal_assigned_program(target_program uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select target_program is not null and exists (
    select 1 from public.clients c
    where c.assigned_program_id = target_program and app.is_portal_client(c.id)
  );
$$;

create or replace function app.is_portal_assigned_nutrition(target_plan uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select target_plan is not null and exists (
    select 1 from public.clients c
    where c.assigned_nutrition_id = target_plan and app.is_portal_client(c.id)
  );
$$;

revoke all on function app.is_portal_assigned_program(uuid) from public, anon;
revoke all on function app.is_portal_assigned_nutrition(uuid) from public, anon;
grant execute on function app.is_portal_assigned_program(uuid) to authenticated;
grant execute on function app.is_portal_assigned_nutrition(uuid) to authenticated;

alter policy "select own or team or assigned portal or admin" on public.workout_programs
  using (
    created_by = (select auth.uid())
    or app.is_team_member(team_id)
    or app.is_portal_assigned_program(id)
    or app.is_admin()
  );

alter policy "select own or team or portal or admin" on public.nutrition_plans
  using (
    created_by = (select auth.uid())
    or app.is_team_member(team_id)
    or app.is_portal_client(client_id)
    or app.is_portal_assigned_nutrition(id)
    or app.is_admin()
  );
