-- Two trust fixes for columns that edge functions read with the service role.
--
-- 1. profiles.email was self-writable (the "update own" policy) and not in the
--    privileged-column guard. Several service-role paths trusted it as the
--    caller's verified address, e.g. stripeCheckout searched Stripe customers
--    by it (set it to another coach's email -> their Billing Portal),
--    verifyProgramWorkoutCount and setupPortalAccount looked clients/accounts up
--    by it, and weeklyDigest mailed it. It is now server-controlled: it can only
--    change through Supabase Auth's confirmed email change, which syncs it here.
--    (Checked before this migration: 0 of 13 live profiles differ from auth.users.)
--
-- 2. clients.assigned_program_id / assigned_nutrition_id were only foreign keys,
--    so a coach could point their own client at ANY program or plan id (ids leak
--    through published plan listings) and then read it through the portal or the
--    assistant. An assignment must now reference the coach's own or their team's
--    content. (Checked: all 9 live assignments already satisfy this.)
--    The service role (webhooks, store fulfilment, imports) is exempt.

-- ── 1. profiles.email ──────────────────────────────────────────────────────
create or replace function app.protect_profile_email()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role')
     or app.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.email is distinct from (select u.email from auth.users u where u.id = new.id) then
      raise exception 'profile email must match the account email';
    end if;
  elsif new.email is distinct from old.email then
    raise exception 'email can only be changed through account settings (confirmed email change)';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_email on public.profiles;
create trigger protect_profile_email
  before insert or update of email on public.profiles
  for each row execute function app.protect_profile_email();

-- Keep profiles.email equal to the verified auth email after a confirmed change.
create or replace function app.sync_profile_email_from_auth()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_profile_email_from_auth on auth.users;
create trigger sync_profile_email_from_auth
  after update of email on auth.users
  for each row execute function app.sync_profile_email_from_auth();

-- ── 2. client content assignments ──────────────────────────────────────────
-- True when p_user may assign content created by p_creator / scoped to p_team:
-- their own, or their team's.
create or replace function app.may_assign_content(p_user uuid, p_creator uuid, p_team uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public', 'pg_temp'
as $$
  select coalesce(p_creator = p_user, false)
      or (p_team is not null and app.is_team_member(p_team))
      or exists (
        -- content created by someone on a team the user belongs to (or owns)
        select 1
          from public.team_members tm
          join public.teams t on t.id = tm.team_id
         where tm.invite_status = 'accepted'
           and (tm.user_id = p_creator or t.owner_coach_id = p_creator)
           and (t.owner_coach_id = p_user or exists (
                 select 1 from public.team_members me
                  where me.team_id = t.id and me.user_id = p_user and me.invite_status = 'accepted'))
      );
$$;

create or replace function app.guard_client_assignments()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_creator uuid;
  v_team uuid;
  v_client uuid;
begin
  if current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role')
     or app.is_admin() then
    return new;
  end if;

  if new.assigned_program_id is not null
     and (tg_op = 'INSERT' or new.assigned_program_id is distinct from old.assigned_program_id) then
    select created_by, team_id into v_creator, v_team
      from public.workout_programs where id = new.assigned_program_id;
    -- Invoker rights on purpose: content the caller cannot even see (RLS) is not
    -- found, and an unknown creator is a denial, never a NULL that slips through.
    if not found or not coalesce(app.may_assign_content(auth.uid(), v_creator, v_team), false) then
      raise exception 'you can only assign your own or your team''s programs' using errcode = '42501';
    end if;
  end if;

  if new.assigned_nutrition_id is not null
     and (tg_op = 'INSERT' or new.assigned_nutrition_id is distinct from old.assigned_nutrition_id) then
    select created_by, team_id, client_id into v_creator, v_team, v_client
      from public.nutrition_plans where id = new.assigned_nutrition_id;
    if not found or (v_client is distinct from new.id
       and not coalesce(app.may_assign_content(auth.uid(), v_creator, v_team), false)) then
      raise exception 'you can only assign your own or your team''s nutrition plans' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_client_assignments on public.clients;
create trigger guard_client_assignments
  before insert or update of assigned_program_id, assigned_nutrition_id on public.clients
  for each row execute function app.guard_client_assignments();

revoke all on function app.may_assign_content(uuid, uuid, uuid) from public, anon;
grant execute on function app.may_assign_content(uuid, uuid, uuid) to authenticated, service_role;
