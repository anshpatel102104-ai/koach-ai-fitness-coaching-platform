-- FIX (companion to 20260823000600_store_purchases):
-- stripeWebhook fulfils one-time store purchases with
--   svc.rpc('record_store_purchase', {...})
-- PostgREST resolves rpc() in the exposed `public` schema, but 600 created the
-- function as app.record_store_purchase — so the call would 404 and the
-- purchase would still not be recorded. Expose a thin public wrapper that only
-- the service role can execute (the webhook's client); authenticated / anon
-- callers cannot fabricate purchases.
create or replace function public.record_store_purchase(
  p_session text, p_listing uuid, p_coach uuid, p_email text, p_amount numeric
) returns void
 language sql
 security definer
 set search_path to ''
as $$
  select app.record_store_purchase(p_session, p_listing, p_coach, p_email, p_amount);
$$;

revoke all on function public.record_store_purchase(text, uuid, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.record_store_purchase(text, uuid, uuid, text, numeric) to service_role;
