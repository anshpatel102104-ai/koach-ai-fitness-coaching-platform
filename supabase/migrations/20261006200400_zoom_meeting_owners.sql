-- Who created each Zoom meeting, written ONLY by the zoomProxy edge function
-- (service role) when it creates the meeting. All coaches share one Zoom
-- account, so get/delete must prove ownership; the proxy used to trust
-- coaching_sessions.zoom_meeting_id, which coaches can write, so any meeting id
-- (and its host start link) on the shared account could be read or deleted.
create table if not exists public.zoom_meeting_owners (
  meeting_id text primary key,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.zoom_meeting_owners enable row level security;
revoke all on public.zoom_meeting_owners from anon, authenticated;
grant all on public.zoom_meeting_owners to service_role;
-- No policies: service role only.

-- Existing meetings keep working: their sessions were created by the coach.
insert into public.zoom_meeting_owners (meeting_id, coach_id)
select distinct on (s.zoom_meeting_id) s.zoom_meeting_id, s.created_by
  from public.coaching_sessions s
 where s.zoom_meeting_id is not null and s.created_by is not null
 order by s.zoom_meeting_id, s.created_at
on conflict (meeting_id) do nothing;
