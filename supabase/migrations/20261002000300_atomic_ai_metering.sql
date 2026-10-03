-- Atomic AI-quota metering.
--
-- meterAiGeneration used to read ai_generation_count, compare, then write
-- count+1 (read-then-write). Parallel requests all read the same count, so a
-- user could exceed their monthly quota by firing requests concurrently
-- (3 parallel calls were observed to increment the counter only twice).
--
-- This does check + increment in ONE statement: the row lock taken by UPDATE
-- serialises concurrent callers and each re-evaluates the WHERE clause against
-- the committed count, so exactly `limit` calls succeed per month.
--
-- p_limit < 0 means unlimited (enterprise). A new month restarts at 1.
-- SECURITY DEFINER (owner postgres) so the privileged-column guard on profiles
-- (app.protect_profile_privileged_columns) lets the write through; EXECUTE is
-- granted to service_role only — the edge functions call it with the service
-- client, never the browser.
create or replace function public.meter_ai_generation(p_profile uuid, p_limit integer, p_month text)
 returns table (allowed boolean, used integer)
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  v_used integer;
begin
  update public.profiles p
     set ai_generation_count = case when p.ai_generation_month is not distinct from p_month
                                    then p.ai_generation_count + 1 else 1 end,
         ai_generation_month = p_month
   where p.id = p_profile
     and (p_limit < 0
          or (case when p.ai_generation_month is not distinct from p_month
                   then p.ai_generation_count else 0 end) < p_limit)
  returning p.ai_generation_count into v_used;

  if found then
    return query select true, v_used;
    return;
  end if;

  select case when p.ai_generation_month is not distinct from p_month
              then p.ai_generation_count else 0 end
    into v_used from public.profiles p where p.id = p_profile;
  return query select false, coalesce(v_used, 0);
end;
$$;

revoke all on function public.meter_ai_generation(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.meter_ai_generation(uuid, integer, text) to service_role;
