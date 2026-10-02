-- SECURITY (S2): make the `uploads` bucket PRIVATE and tenant-scope its RLS.
--
-- The original bucket migration (20260716000100) created `uploads` with
-- public = true and a `for select using (bucket_id = 'uploads')` policy that
-- granted the PUBLIC (anon) role. Combined with a flat object namespace
-- (getPublicUrl, no per-tenant prefix), that made every progress photo,
-- InBody scan and message attachment world-readable AND enumerable via the
-- Storage list API — defeating the column-privacy work in migration 700.
--
-- This migration:
--   1. flips the bucket to private (reads now require a signed URL);
--   2. replaces the public read + unscoped write policies with owner-scoped
--      policies keyed on the object's first path segment = auth.uid().
--
-- NOTE (frontend follow-up): src/api/supabaseClient.js must (a) upload under a
-- per-user prefix `${auth.uid()}/...` so these policies match, and (b) use
-- createSignedUrl() instead of getPublicUrl(). Tracked in REMEDIATION_PLAN.
-- Guarded on the storage schema so local rehearsal Postgres no-ops.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    -- 1) Private bucket (create if missing, else flip existing to private).
    insert into storage.buckets (id, name, public)
      values ('uploads', 'uploads', false)
      on conflict (id) do update set public = false;

    -- 2) Drop the permissive policies from 20260716000100 if present.
    drop policy if exists uploads_read_public on storage.objects;
    drop policy if exists uploads_insert_authenticated on storage.objects;

    -- 3) Owner-scoped policies. Object key MUST be `<auth.uid()>/<...>`.
    if not exists (
      select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'uploads_read_own'
    ) then
      execute $p$
        create policy uploads_read_own on storage.objects
          for select to authenticated
          using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text)
      $p$;
    end if;

    if not exists (
      select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'uploads_insert_own'
    ) then
      execute $p$
        create policy uploads_insert_own on storage.objects
          for insert to authenticated
          with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text)
      $p$;
    end if;

    -- update/delete own already existed as uploads_modify_own / uploads_delete_own
    -- (owner = auth.uid()); leave them in place.
  end if;
end $$;
