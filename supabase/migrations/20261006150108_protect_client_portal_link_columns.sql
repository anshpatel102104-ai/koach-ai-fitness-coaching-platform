-- SECURITY (audit 2026-10-05, Critical): coaches could write the invite /
-- portal-link columns on their own client rows directly through PostgREST.
--
--   * invite_token_hash / invite_token_expires: a coach could set a hash of a
--     token they chose, then call setupPortalAccount to create a CONFIRMED auth
--     account for any email address with a password they control (account
--     pre-hijack; also auto-joins teams that invited that address).
--   * portal_user_id: a coach could point their client row at any user's uid,
--     which makes app.can_read_upload grant them that user's private uploads.
--
-- Table-level UPDATE/INSERT grants make column REVOKEs ineffective, so enforce
-- with a trigger. Only server-side code (service_role / postgres / supabase
-- admin roles — i.e. sendClientInvite + setupPortalAccount) may set these.

create or replace function app.protect_client_portal_link_columns()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.invite_token_hash is not null
       or new.invite_token_expires is not null
       or new.portal_user_id is not null then
      raise exception 'invite/portal columns are server-managed'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: clearing the invite is allowed (e.g. a coach revoking it, and the
  -- clear_invite_on_email_change trigger); setting or changing it is not.
  if (new.invite_token_hash is distinct from old.invite_token_hash
        and new.invite_token_hash is not null)
     or (new.invite_token_expires is distinct from old.invite_token_expires
        and new.invite_token_expires is not null)
     or new.portal_user_id is distinct from old.portal_user_id then
    raise exception 'invite/portal columns are server-managed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_client_portal_link_columns on public.clients;
-- Name sorts after clear_invite_on_email_change so that trigger's nulling runs
-- first (BEFORE triggers fire alphabetically).
create trigger protect_client_portal_link_columns
  before insert or update on public.clients
  for each row execute function app.protect_client_portal_link_columns();
