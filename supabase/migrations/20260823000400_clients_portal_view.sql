-- SECURITY (S6): portal clients read coach-private columns on `clients`.
--
-- The base `clients` SELECT policy granted portal clients (app.is_portal_client)
-- SELECT on the WHOLE row — including notes, lifecycle_notes (which the AI
-- at-risk tool fills with the coach's private rationale), monthly_rate,
-- stripe_customer_id, external_id and invite_token_hash. This is exactly the
-- leak migration 20260709000700 closed for check_ins/coaching_sessions, left
-- open on the most sensitive table.
--
-- Fix (same pattern as migration 700): a column-restricted portal view that
-- exposes only client-facing fields, plus removal of the portal branch from the
-- base-table SELECT policy so portal JWTs can no longer read the base rows.
-- The frontend portal facade is routed to this view (PORTAL_OVERRIDES in
-- src/api/supabaseClient.js).
--
-- NOTE: like the migration-700 views this is a SECURITY DEFINER view (the
-- default), so it runs as owner and returns portal rows even though the base
-- RLS no longer grants the portal client. It is safe because the view body
-- filters `where app.is_portal_client(id)` — a portal client sees only their
-- own row. The linter flags SECURITY DEFINER views; this is the intentional,
-- reviewed pattern already used for the other two portal views.
--
-- DEPLOY NOTE: verify the client portal (profile, home, billing) against this
-- view on a seeded portal account before/after applying — removing the base
-- portal SELECT branch means anything still reading the base `clients` table as
-- a portal user returns empty.

create or replace view public.clients_portal_view
with (security_barrier = true) as
  select
    id, portal_user_id, name, email, avatar_url,
    lifecycle_status, status, tags, goal, start_date,
    current_weight, starting_weight, target_weight, height, sex, date_of_birth,
    assigned_program_id, assigned_nutrition_id, billing_status, description,
    created_at, updated_at
  from public.clients
  where app.is_portal_client(id);

grant select on public.clients_portal_view to authenticated;

-- Remove the portal branch from the base-table SELECT policy. Coaches, team
-- members and admins are unchanged; portal clients now read via the view.
drop policy if exists "select coach or team or portal self or admin" on public.clients;
create policy "select coach or team or admin" on public.clients
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or app.is_team_member(team_id)
    or app.is_admin()
  );
