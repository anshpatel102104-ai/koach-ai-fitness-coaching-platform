-- FIX (BUG_REPORT B7): re-apply the Realtime publication membership.
--
-- Migration 20260716000200 is recorded as applied, but on the live project the
-- `supabase_realtime` publication contains ZERO public tables — so
-- entity.subscribe() (postgres_changes) never delivers, and coach/client chat +
-- notifications only update on manual refresh. This migration re-adds the
-- tables idempotently so a `supabase db push` restores Realtime.
--
-- NOTE: Realtime respects RLS — each subscriber only receives rows their SELECT
-- policies already expose. (DELETE events are not RLS-filtered; that is tracked
-- separately as S18.)
do $$
declare
  t text;
  wanted text[] := array[
    'notifications', 'check_ins', 'messages', 'clients',
    'leads', 'community_posts', 'food_logs'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return; -- local rehearsal: no Realtime stack
  end if;

  foreach t in array wanted loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
