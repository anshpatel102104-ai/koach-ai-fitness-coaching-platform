-- SECURITY: make the read-only portal views actually read-only.
--
-- clients_portal_view (20260823000400) and coaching_sessions_portal_view
-- (20260709000700) are simple views, so Postgres makes them auto-updatable, and
-- Supabase's default privileges grant INSERT/UPDATE/DELETE on new public
-- relations to anon/authenticated. Both views are SECURITY DEFINER (owner
-- postgres), so writes through them run as the owner and BYPASS RLS on the base
-- table. Verified live before this fix: a portal client could
--   * UPDATE clients_portal_view SET billing_status = 'active' on their own row
--   * INSERT INTO clients_portal_view (...) — a brand-new clients row
-- and coaching_sessions_portal_view (no WITH CHECK OPTION) accepted inserts for
-- any client_id. The frontend facade already treats both as readOnly
-- (PORTAL_OVERRIDES in src/api/supabaseClient.js), so revoking writes changes
-- no legitimate behavior.
--
-- check_ins_portal_view is intentionally writable (portal check-in CRUD) and
-- carries WITH CASCADED CHECK OPTION, so it is left as is.

revoke all on public.clients_portal_view from anon, authenticated;
grant select on public.clients_portal_view to authenticated;

revoke all on public.coaching_sessions_portal_view from anon, authenticated;
grant select on public.coaching_sessions_portal_view to authenticated;
