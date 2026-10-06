-- Per-sender email ledger for sendEmailNotification's signed-in path.
-- Coaches can email their own clients and team, but there was no volume limit,
-- so an account could be used to send unlimited mail from the platform's
-- domain. Each send by a signed-in caller is recorded here (recipient as a
-- sha256 hash only — no address, subject or content) and the function refuses
-- past 60 per hour / 400 per day. Trigger/cron sends (service role) are not
-- limited or recorded here.
create table if not exists public.email_send_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_hash text not null,
  template_key text,
  status text not null check (status in ('sent', 'failed'))
);
create index if not exists email_send_events_sender_created on public.email_send_events (sender_id, created_at desc);
alter table public.email_send_events enable row level security;
revoke all on public.email_send_events from anon, authenticated;
grant all on public.email_send_events to service_role;
