-- Section 4 / storage: two buckets.
--
--   branding (PUBLIC)  logos, app icon, coach avatar, store/product + email
--                      images. Served via getPublicUrl() — anonymous viewers
--                      (public store, referral/package landing pages, emails)
--                      must be able to load them. Writes are owner-scoped to a
--                      `<auth.uid()>/...` key; there is deliberately NO select
--                      policy, so the bucket can be fetched by URL but not
--                      listed/enumerated through the Storage API.
--
--   uploads  (PRIVATE) client photos, progress pics, documents, message
--                      attachments, exercise/community media. Read only through
--                      short-lived signed URLs created at display time.
--
-- `uploads` keeps the owner-scoped insert/update/delete policies from
-- 20260823000100. This migration widens READ so the right people can sign URLs:
--   a) the uploader (already covered by uploads_read_own)
--   b) the owning coach / team members of the uploader's client record
--   c) a portal client reading what their coach shared: `<coach>/shared/...`
--      (exercise media, meal images, PDFs, group covers — all of the coach's
--      clients) or `<coach>/client/<client id>/...` (message attachments for
--      that one client). The rest of the coach's folder (e.g. other clients'
--      scans) is NOT readable by clients — the select policy also governs
--      Storage list(), so a whole-folder grant would leak it.
--   d) group media under `<uid>/community/...` for clients of the same coach
-- Another coach (or an unrelated client) matches none of these.
--
-- Idempotent: safe to re-run (it may be applied live before the repo migration
-- runs on merge). Policies are guarded on the storage schema so the local
-- rehearsal Postgres (no Storage stack) no-ops them.

create or replace function app.can_read_upload(obj_name text)
 returns boolean language plpgsql stable security definer set search_path to ''
as $$
declare
  owner_txt text := split_part(obj_name, '/', 1);
  owner_id uuid;
  me uuid := (select auth.uid());
begin
  if me is null or owner_txt !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  owner_id := owner_txt::uuid;

  -- a) own folder
  if owner_id = me then return true; end if;

  -- b) coach / team reading their client's folder
  if exists (
    select 1 from public.clients c
    where c.portal_user_id = owner_id
      and (c.user_id = me or c.created_by = me or app.is_team_member(c.team_id))
  ) then return true; end if;

  -- c) portal client reading what their coach shared with them. NOT the whole
  --    coach folder (it holds other clients' files, e.g. scans): only
  --      <coach>/shared/...              visible to every client of that coach
  --      <coach>/client/<client id>/...  visible to that one client
  if split_part(obj_name, '/', 2) = 'shared' and exists (
    select 1 from public.clients c
    where c.portal_user_id = me and (c.user_id = owner_id or c.created_by = owner_id)
  ) then return true; end if;
  if split_part(obj_name, '/', 2) = 'client'
     and split_part(obj_name, '/', 3) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     and exists (
       select 1 from public.clients c
       where c.id = split_part(obj_name, '/', 3)::uuid
         and c.portal_user_id = me
         and (c.user_id = owner_id or c.created_by = owner_id)
     ) then return true; end if;

  -- d) community media shared inside one coach's client group
  if split_part(obj_name, '/', 2) = 'community' and exists (
    select 1
    from public.clients mine
    join public.clients theirs on theirs.user_id = mine.user_id
    where mine.portal_user_id = me
      and (theirs.portal_user_id = owner_id or theirs.user_id = owner_id)
  ) then return true; end if;

  return false;
end;
$$;

revoke all on function app.can_read_upload(text) from public, anon;
grant execute on function app.can_read_upload(text) to authenticated;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    -- Public branding bucket (raster images only — no SVG, which can carry script).
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('branding', 'branding', true, 5242880,
              array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
      on conflict (id) do update
        set public = true,
            file_size_limit = excluded.file_size_limit,
            allowed_mime_types = excluded.allowed_mime_types;

    drop policy if exists branding_insert_own on storage.objects;
    create policy branding_insert_own on storage.objects
      for insert to authenticated
      with check (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.uid())::text);

    drop policy if exists branding_update_own on storage.objects;
    create policy branding_update_own on storage.objects
      for update to authenticated
      using (bucket_id = 'branding' and owner = (select auth.uid()));

    drop policy if exists branding_delete_own on storage.objects;
    create policy branding_delete_own on storage.objects
      for delete to authenticated
      using (bucket_id = 'branding' and owner = (select auth.uid()));

    -- Private uploads: coach / client / group read access (see header).
    drop policy if exists uploads_read_related on storage.objects;
    create policy uploads_read_related on storage.objects
      for select to authenticated
      using (bucket_id = 'uploads' and app.can_read_upload(name));
  end if;
end $$;
