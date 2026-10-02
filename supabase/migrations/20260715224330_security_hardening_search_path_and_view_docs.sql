-- Pin search_path on privileged app-schema functions (Supabase security advisor: WARN
-- function_search_path_mutable). All three functions only ever reference fully
-- schema-qualified objects (auth.jwt(), app.set_updated_at()) or none at all, so the
-- strictest possible setting (empty search_path) is safe and forces every future edit
-- to this function to use qualified names too.
alter function app.set_updated_at() set search_path = '';
alter function app.add_updated_at_trigger(regclass) set search_path = '';
alter function app.portal_client_id() set search_path = '';

comment on function app.portal_client_id() is
  'search_path pinned to empty (2026-07-15 security hardening) - only references auth.jwt(), fully qualified.';

-- Document why the two portal views are intentionally SECURITY DEFINER (Supabase
-- security advisor: ERROR security_definer_view). This is a deliberate design choice,
-- not an oversight: coaches and portal clients share the `authenticated` role, so a
-- security_invoker view sitting on the base check_ins/coaching_sessions tables would not
-- have isolated portal clients from coach-only columns (internal_notes, zoom credentials)
-- - the base table's own RLS would still apply and the invoker's session would already
-- have whatever access the base policy grants. Instead, the portal-facing SELECT paths
-- were removed from the base tables entirely (see migration 20260709000700), and these
-- views run with elevated (definer) privileges but independently re-apply the correct
-- row-level filter via `WHERE app.is_portal_client(client_id)` in the view body itself -
-- confirmed via pg_get_viewdef during the 2026-07-15 security review. A portal-scoped
-- JWT can only ever see its own client's row through this view; the view is the
-- enforcement mechanism, not RLS on the underlying table, by design.
comment on view public.check_ins_portal_view is
  'Intentional SECURITY DEFINER: re-scopes rows via app.is_portal_client(client_id) in the WHERE clause rather than relying on base-table RLS. See migration comment 20260715_security_hardening for full rationale.';
comment on view public.coaching_sessions_portal_view is
  'Intentional SECURITY DEFINER: re-scopes rows via app.is_portal_client(client_id) in the WHERE clause rather than relying on base-table RLS. See migration comment 20260715_security_hardening for full rationale.';
