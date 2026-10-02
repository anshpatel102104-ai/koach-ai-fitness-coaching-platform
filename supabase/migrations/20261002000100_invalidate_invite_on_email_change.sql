-- SECURITY (S1): an invite token must stay bound to the email it was sent to.
--
-- setupPortalAccount provisions the auth account for clients.email AT SETUP
-- TIME. Without this guard a coach could invite a client at an address they
-- control, then change the row's email to someone else's and redeem the token
-- they already received — creating a confirmed account (with a password they
-- chose) for an email they don't own. Any email change now voids a pending
-- invite; the coach simply re-sends it to the new address.
create or replace function app.clear_invite_on_email_change()
 returns trigger
 language plpgsql
 set search_path to ''
as $$
begin
  if new.email is distinct from old.email then
    new.invite_token_hash := null;
    new.invite_token_expires := null;
  end if;
  return new;
end;
$$;

create trigger clear_invite_on_email_change
  before update of email on public.clients
  for each row execute function app.clear_invite_on_email_change();
