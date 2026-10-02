-- ============================================================================
-- Migration — schedule the adaptationEvaluator edge function (closed loop,
-- client side).
--
-- Same mechanism as the runAutomations runner (20260709000900): pg_cron in-DB
-- schedule → pg_net.http_post invokes the edge function with the service-role
-- bearer. The edge function holds the porting-sensitive logic (deviation
-- thresholds + Claude structured-diff proposal), so it stays JS, not plpgsql.
-- ============================================================================

-- Idempotent — extensions already enabled by 20260709000900; re-ensured here so
-- this migration is self-contained. No-op on local/dev Postgres without them.
do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_cron/pg_net not available here (%). Scheduling is a no-op; enable in Supabase.', sqlerrm;
end $$;

-- The schedule references the project URL + service-role key, which are SECRETS
-- and must not live in a committed migration. Apply this ONCE per environment
-- after deploy (values from project settings / Vault):
--
--   select cron.schedule(
--     'adaptation-evaluator-15min',
--     '*/15 * * * *',                     -- every 15 minutes
--     $$
--       select net.http_post(
--         url     := '<SUPABASE_URL>/functions/v1/adaptationEvaluator',
--         headers := jsonb_build_object(
--           'Content-Type',  'application/json',
--           'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
--         ),
--         body    := '{}'::jsonb
--       );
--     $$
--   );
--
-- Idempotency: the evaluator skips any (client, plan_kind) that already has an
-- open pending_approval row, and the plan_versions partial-unique index
-- (plan_versions_one_open_per_plan_idx) enforces at most one open proposal per
-- plan — so overlapping/retried sweeps never stack duplicate proposals.
