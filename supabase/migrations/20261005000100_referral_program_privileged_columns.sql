-- SECURITY: referral_programs money/stat columns are platform-managed.
--
-- The "insert own" / "update own or admin" RLS policies let a coach write their
-- own row, so a coach could set pending_balance / total_earned directly and
-- request a payout for money they never earned. RLS cannot restrict columns, so
-- (same pattern as app.protect_profile_privileged_columns on profiles) a trigger
-- rejects changes to those columns unless the writer is the service role, the
-- database owner (which includes the SECURITY DEFINER reward trigger
-- app.process_referral_reward, owned by postgres) or an app admin.
-- Non-privileged inserts must leave the columns at their defaults.
create or replace function app.protect_referral_program_columns()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') or app.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.total_referrals <> 0 or new.total_earned <> 0 or new.pending_balance <> 0
       or new.month_earnings <> 0 or new.current_tier <> 1 or new.active_referrals <> 0
       or new.expired_referrals <> 0 then
      raise exception 'not allowed to set referral program balances or counters';
    end if;
  elsif new.total_referrals is distinct from old.total_referrals
     or new.total_earned is distinct from old.total_earned
     or new.pending_balance is distinct from old.pending_balance
     or new.month_earnings is distinct from old.month_earnings
     or new.current_tier is distinct from old.current_tier
     or new.active_referrals is distinct from old.active_referrals
     or new.expired_referrals is distinct from old.expired_referrals
  then
    raise exception 'not allowed to modify referral program balances or counters';
  end if;
  return new;
end;
$$;

revoke all on function app.protect_referral_program_columns() from public, anon, authenticated;

create trigger trg_protect_referral_program_columns
  before insert or update on public.referral_programs
  for each row execute function app.protect_referral_program_columns();
