-- AI usage ledger: every AI credit charge, refund, refusal and model call is a row.
--
-- Before this, the only record of AI usage was profiles.ai_generation_count
-- (credits = credits + 1): no per-request trace, no tokens, no cost, no model,
-- no latency, and a credit was consumed even when the generation failed.
--
-- Rows (written by edge functions with the service role ONLY):
--   kind='charge'   one per counted request; credits = 1. Unique per request_id,
--                   so a retried request id can never charge twice.
--   kind='blocked'  a request refused by the plan/quota/billing gate; credits = 0.
--   kind='refund'   the charged request failed; credits = -1. Unique per request_id.
--   kind='llm_call' one per Anthropic call (a program generation makes several):
--                   model, tokens, latency, attempts, outcome, estimated cost.
-- The balance a coach sees (profiles.ai_generation_count for the month) equals
-- sum(credits) of that payer's charge/refund rows for the month.
--
-- Prompts, responses and client data are never stored here.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id text not null,
  kind text not null check (kind in ('charge', 'blocked', 'refund', 'llm_call')),
  feature text not null,                       -- AI_POLICY key, e.g. generateAIProgram
  user_id uuid references public.profiles(id) on delete set null,   -- who called
  payer_id uuid references public.profiles(id) on delete set null,  -- whose plan pays
  client_id uuid references public.clients(id) on delete set null,
  status text not null check (status in ('ok', 'error', 'blocked')),
  error_type text,
  credits integer not null default 0,
  charge_month text,                           -- YYYY-MM the charge counted against
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  latency_ms integer,
  attempts smallint,
  stop_reason text,
  http_status smallint,
  provider_request_id text,
  estimated_cost_usd numeric(12, 6)
);

create unique index if not exists ai_usage_events_one_charge_per_request
  on public.ai_usage_events (request_id) where kind = 'charge';
create unique index if not exists ai_usage_events_one_refund_per_request
  on public.ai_usage_events (request_id) where kind = 'refund';
create index if not exists ai_usage_events_payer_created
  on public.ai_usage_events (payer_id, created_at desc);
create index if not exists ai_usage_events_created
  on public.ai_usage_events (created_at desc);
create index if not exists ai_usage_events_errors
  on public.ai_usage_events (created_at desc) where status = 'error';

alter table public.ai_usage_events enable row level security;

drop policy if exists ai_usage_events_select on public.ai_usage_events;
create policy ai_usage_events_select on public.ai_usage_events
  for select to authenticated
  using (payer_id = (select auth.uid()) or user_id = (select auth.uid()) or app.is_admin());
-- No insert/update/delete policies: only the service role writes. Table grants
-- are explicit too (not left to the schema's default privileges).
revoke all on public.ai_usage_events from anon, authenticated;
grant select on public.ai_usage_events to authenticated;
grant all on public.ai_usage_events to service_role;

-- Charge one credit for a counted request, atomically with the quota check, and
-- record it. Returns duplicate=true (and charges nothing) when this request_id
-- was already charged. p_limit < 0 = unlimited, which is still recorded.
create or replace function public.charge_ai_generation(
  p_request_id text, p_profile uuid, p_user uuid, p_feature text,
  p_limit integer, p_month text
)
 returns table (allowed boolean, used integer, duplicate boolean)
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  v_used integer;
begin
  insert into public.ai_usage_events
    (request_id, kind, feature, user_id, payer_id, status, credits, charge_month)
  values (p_request_id, 'charge', p_feature, p_user, p_profile, 'ok', 1, p_month)
  on conflict (request_id) where kind = 'charge' do nothing;
  if not found then
    return query select false, 0, true;
    return;
  end if;

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
    return query select true, v_used, false;
    return;
  end if;

  -- Over the limit: the attempt is kept as a refusal, not a charge.
  update public.ai_usage_events
     set kind = 'blocked', status = 'blocked', credits = 0, error_type = 'QUOTA_EXCEEDED'
   where request_id = p_request_id and kind = 'charge';
  select case when p.ai_generation_month is not distinct from p_month
              then p.ai_generation_count else 0 end
    into v_used from public.profiles p where p.id = p_profile;
  return query select false, coalesce(v_used, 0), false;
end;
$$;

-- Give back the credit of a charged request that failed. Idempotent: a second
-- call for the same request does nothing. Never takes the counter below 0, and
-- only touches it while it is still counting the month the charge was made in.
create or replace function public.refund_ai_generation(p_request_id text, p_error_type text)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  c record;
begin
  select * into c from public.ai_usage_events
   where request_id = p_request_id and kind = 'charge' and credits = 1;
  if not found then return false; end if;

  insert into public.ai_usage_events
    (request_id, kind, feature, user_id, payer_id, status, error_type, credits, charge_month)
  values (p_request_id, 'refund', c.feature, c.user_id, c.payer_id, 'error', p_error_type, -1, c.charge_month)
  on conflict (request_id) where kind = 'refund' do nothing;
  if not found then return false; end if;

  update public.profiles p
     set ai_generation_count = greatest(p.ai_generation_count - 1, 0)
   where p.id = c.payer_id and p.ai_generation_month is not distinct from c.charge_month;
  return true;
end;
$$;

revoke all on function public.charge_ai_generation(text, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.refund_ai_generation(text, text) from public, anon, authenticated;
grant execute on function public.charge_ai_generation(text, uuid, uuid, text, integer, text) to service_role;
grant execute on function public.refund_ai_generation(text, text) to service_role;
