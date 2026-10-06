-- Frontend error monitoring (src/lib/errorReporting.js).
--
-- Before this, a crash in the browser left no trace anywhere: no error tracker,
-- no error boundary, no log. Signed-in users insert their OWN reports; only
-- platform admins read them. Reports carry route, release, browser and the
-- edge-function request id (joins to edge logs and ai_usage_events), never
-- form contents or message bodies.
--
-- Volume: the browser dedupes and caps per page load; this table additionally
-- drops anything beyond 60 reports per user per hour (a looping error must not
-- become a write flood).

create table if not exists public.client_error_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  source text not null check (source in ('render', 'window', 'promise', 'chunk', 'edge_function', 'query', 'mutation', 'manual')),
  error_type text,
  message text not null check (length(message) <= 600),
  stack text check (length(stack) <= 2100),
  component_stack text check (length(component_stack) <= 2100),
  fn text check (length(fn) <= 80),
  request_id text check (length(request_id) <= 80),
  http_status smallint,
  route text check (length(route) <= 300),
  release text check (length(release) <= 64),
  environment text check (length(environment) <= 32),
  user_agent text check (length(user_agent) <= 400),
  viewport text check (length(viewport) <= 20)
);

create index if not exists client_error_events_created on public.client_error_events (created_at desc);
create index if not exists client_error_events_user_created on public.client_error_events (user_id, created_at desc);

alter table public.client_error_events enable row level security;

drop policy if exists client_error_events_insert_own on public.client_error_events;
create policy client_error_events_insert_own on public.client_error_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists client_error_events_admin_read on public.client_error_events;
create policy client_error_events_admin_read on public.client_error_events
  for select to authenticated
  using (app.is_admin());

revoke all on public.client_error_events from anon, authenticated;
grant insert on public.client_error_events to authenticated;
grant select on public.client_error_events to authenticated;  -- RLS: admins only
grant all on public.client_error_events to service_role;

create or replace function app.cap_client_error_events()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  if (select count(*) from public.client_error_events e
       where e.user_id = new.user_id and e.created_at > now() - interval '1 hour') >= 60 then
    return null;  -- silently drop: the reporter must never see an error from reporting
  end if;
  return new;
end;
$$;

drop trigger if exists cap_client_error_events on public.client_error_events;
create trigger cap_client_error_events
  before insert on public.client_error_events
  for each row execute function app.cap_client_error_events();
