-- ============================================================================
-- Stripe production billing: access rules, billing columns, comped flag,
-- 14-day trial for existing accounts, server-side client-cap enforcement.
--
-- BEFORE this migration profiles.billing_status defaulted to 'active', so every
-- new (and every existing) account looked "paid" without ever touching Stripe.
-- AFTER it, 'none' is the default and access requires a real signal:
--   comped / admin                         -> always
--   billing_status trialing | active       -> yes (written only by the webhook)
--   billing_status past_due                -> yes for 3 days after past_due_since
--   billing_status none + trial_ends_at    -> yes until trial_ends_at (14-day trial)
--   anything else                          -> no (billing page + subscribe button)
--
-- ORDER OF OPERATIONS: this must be applied BEFORE the new stripeWebhook /
-- stripeCheckout / createPortalSession functions are used (they write the new
-- columns), and BEFORE any live-mode checkout test: step 3 below resets every
-- non-comped account's billing state exactly once.
-- ============================================================================

-- --- 1. columns --------------------------------------------------------------
alter table public.profiles
  add column if not exists trial_ends_at timestamptz,        -- Stripe trial_end, or the 14-day migration trial
  add column if not exists current_period_end timestamptz,   -- Stripe current_period_end
  add column if not exists past_due_since timestamptz,       -- when status first became past_due (3-day grace anchor)
  add column if not exists is_comped boolean not null default false; -- full access without a subscription (owner/staff)

alter table public.profiles drop constraint if exists profiles_billing_status_check;
alter table public.profiles add constraint profiles_billing_status_check
  check (billing_status in ('none', 'active', 'past_due', 'canceled', 'trialing', 'unpaid', 'incomplete'));
alter table public.profiles alter column billing_status set default 'none';

-- --- 2. comped flag for the platform owner (set BEFORE the reset below) ------
update public.profiles
   set is_comped = true
 where lower(email) = lower('mylesharrisfitbusiness@gmail.com')
    or id in (select id from auth.users where lower(email) = lower('mylesharrisfitbusiness@gmail.com'));

-- --- 3. existing accounts: 14-day trial from today ---------------------------
-- The live Stripe account had no products until now, so any stripe_subscription_id
-- on an existing row is stale (test mode / old account) and must not keep
-- granting 'active'. Snapshot first so nothing is lost.
create table if not exists public.billing_backup_20261006 as
  select id, email, subscription_tier, billing_status, stripe_customer_id,
         stripe_subscription_id, stripe_price_id, subscription_renewal_date,
         subscription_cancel_at_period_end, billing_cycle, now() as backed_up_at
    from public.profiles;
alter table public.billing_backup_20261006 enable row level security; -- no policies: service role / owner only

update public.profiles
   set billing_status = 'none',
       trial_ends_at = now() + interval '14 days',
       stripe_subscription_id = null,
       stripe_price_id = null,
       subscription_renewal_date = null,
       subscription_cancel_at_period_end = false,
       current_period_end = null,
       past_due_since = null
 where is_comped = false;

-- --- 4. access + cap helpers (used by triggers and edge functions) -----------
create or replace function app.billing_access_direct(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select p.is_comped
        or p.role = 'admin'
        or p.billing_status in ('trialing', 'active')
        or (p.billing_status = 'past_due' and p.past_due_since is not null
            and now() < p.past_due_since + interval '3 days')
        or (p.billing_status = 'none' and p.trial_ends_at is not null
            and now() < p.trial_ends_at)
      from public.profiles p
     where p.id = p_user
  ), false);
$$;

-- Team coaches ride on their owner's billing (same rule as billingDeniedFor).
create or replace function app.coach_has_billing_access(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.billing_access_direct(p_user)
      or exists (
        select 1
          from public.team_members tm
          join public.teams t on t.id = tm.team_id
         where tm.user_id = p_user
           and tm.invite_status = 'accepted'
           and app.billing_access_direct(t.owner_coach_id)
      );
$$;

-- Mirrors TIER_LIMITS.max_clients in supabase/functions/_shared/subscriptionTiers.js
-- and src/lib/subscription.js (-1 = unlimited). Keep the three in sync.
create or replace function app.tier_client_cap(p_tier text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_tier
    when 'starter' then 10
    when 'pro' then 75
    when 'elite' then -1
    when 'enterprise' then -1
    else 10
  end;
$$;

revoke all on function app.billing_access_direct(uuid) from public, anon, authenticated;
revoke all on function app.coach_has_billing_access(uuid) from public, anon, authenticated;
grant execute on function app.billing_access_direct(uuid) to service_role;
grant execute on function app.coach_has_billing_access(uuid) to service_role;
grant execute on function app.tier_client_cap(text) to anon, authenticated, service_role;

-- --- 5. billing columns are server-only (extends the existing guard) ---------
create or replace function app.protect_profile_privileged_columns()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role')
     or app.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A self-inserted profile must start at the defaults: no pre-set plan,
    -- status, comp flag or trial. (handle_new_user runs as postgres and is exempt.)
    if new.role is distinct from 'user'
       or new.subscription_tier is distinct from 'starter'
       or new.billing_status is distinct from 'none'
       or new.stripe_customer_id is not null
       or new.stripe_subscription_id is not null
       or new.stripe_price_id is not null
       or new.subscription_renewal_date is not null
       or new.subscription_cancel_at_period_end is distinct from false
       or new.had_trial is distinct from false
       or new.ai_generation_count is distinct from 0
       or new.ai_generation_month is not null
       or new.billing_cycle is distinct from 'monthly'
       or new.trial_ends_at is not null
       or new.current_period_end is not null
       or new.past_due_since is not null
       or new.is_comped is distinct from false
    then
      raise exception 'not allowed to set privileged profile columns';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.subscription_tier is distinct from old.subscription_tier
     or new.billing_status is distinct from old.billing_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.stripe_price_id is distinct from old.stripe_price_id
     or new.subscription_renewal_date is distinct from old.subscription_renewal_date
     or new.subscription_cancel_at_period_end is distinct from old.subscription_cancel_at_period_end
     or new.had_trial is distinct from old.had_trial
     or new.ai_generation_count is distinct from old.ai_generation_count
     or new.ai_generation_month is distinct from old.ai_generation_month
     or new.billing_cycle is distinct from old.billing_cycle
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.current_period_end is distinct from old.current_period_end
     or new.past_due_since is distinct from old.past_due_since
     or new.is_comped is distinct from old.is_comped
  then
    raise exception 'not allowed to modify privileged profile columns';
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function app.protect_profile_privileged_columns();

-- --- 6. client cap, enforced in the database ---------------------------------
-- INSERT: a coach at/over their plan's cap cannot add clients.
-- UPDATE: when a Stripe plan change leaves a coach OVER the cap (downgrade),
--   existing clients become read-only until they get back under it (by upgrading
--   or by deleting clients themselves). Nothing is deleted or hidden. Coaches
--   without a Stripe subscription (migration trial) are not locked read-only;
--   they only cannot add. Admin / comped / service role are exempt.
create or replace function app.enforce_client_cap()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_profile public.profiles%rowtype;
  v_cap integer;
  v_count integer;
begin
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') or app.is_admin() then
    return new;
  end if;

  v_owner := coalesce(new.user_id, new.created_by, auth.uid());
  select * into v_profile from public.profiles where id = v_owner;
  if not found or v_profile.is_comped or v_profile.role = 'admin' then
    return new;
  end if;

  v_cap := app.tier_client_cap(v_profile.subscription_tier);
  if v_cap = -1 then
    return new;
  end if;

  select count(*) into v_count from public.clients where user_id = v_owner;

  if tg_op = 'INSERT' then
    if v_count >= v_cap then
      raise exception 'Client limit reached: your % plan allows % clients. Upgrade your plan to add more.',
        v_profile.subscription_tier, v_cap
        using errcode = 'P0001';
    end if;
  elsif v_count > v_cap and v_profile.stripe_subscription_id is not null then
    raise exception 'Client limit exceeded: you have % clients but your % plan allows %. Existing clients are read-only until you upgrade or remove clients.',
      v_count, v_profile.subscription_tier, v_cap
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_client_cap on public.clients;
create trigger trg_enforce_client_cap
  before insert or update on public.clients
  for each row execute function app.enforce_client_cap();
