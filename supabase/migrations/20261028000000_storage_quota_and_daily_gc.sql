-- Storage at scale (2026-10-28).
-- 1) Per-user file cap, enforced by the bucket itself (the app's own limits
--    can be skipped by calling the API directly): an upload into a user's
--    folder is refused once it already holds 100 files. Unused files are
--    removed daily (below), so only what a room really uses counts for long.
-- 2) Daily cleanup for EVERY user (it used to run only when each one opened
--    the editor): files no room, pending op or profile mentions, older than a
--    day, go. pg_cron → edge function `storage-gc` (deletes through the
--    Storage API; direct deletes on storage.objects are blocked) → it asks
--    this database which files to delete, with a secret kept in Vault.

-- ── 1) Quota ────────────────────────────────────────────────────────────────
create or replace function public.storage_user_file_count(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from storage.objects
  where bucket_id = 'canvas-assets' and name like uid::text || '/%';
$$;
revoke all on function public.storage_user_file_count(uuid) from public, anon;
grant execute on function public.storage_user_file_count(uuid) to authenticated;

alter policy ml_assets_insert_own on storage.objects
  with check (
    bucket_id = 'canvas-assets'
    and (storage.foldername(name))[1] = (auth.uid())::text
    and public.storage_user_file_count(auth.uid()) < 100
  );

-- ── 2) Daily cleanup ────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'storage_gc_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'storage_gc_secret');
  end if;
end $$;

-- Which files to delete: not mentioned anywhere (file names are UUIDs, so a
-- text search over every row is exact), older than a day. Only with the secret.
create or replace function public.storage_gc_candidates(p_secret text, p_limit int default 500)
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_blob   text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'storage_gc_secret';
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'forbidden';
  end if;
  select coalesce(string_agg(t, ' '), '') into v_blob from (
    select data::text as t from public.canvases
    union all select row_to_json(o)::text from public.canvas_ops o
    union all select row_to_json(p)::text from public.profiles p
  ) s;
  return query
    select o.name from storage.objects o
    where o.bucket_id = 'canvas-assets'
      and o.created_at < now() - interval '24 hours'
      and strpos(v_blob, o.name) = 0
    order by o.created_at
    limit greatest(1, least(p_limit, 1000));
end;
$$;
revoke all on function public.storage_gc_candidates(text, int) from public, anon, authenticated;
grant execute on function public.storage_gc_candidates(text, int) to service_role;

create extension if not exists pg_cron;

select cron.unschedule('storage-gc-daily') where exists (select 1 from cron.job where jobname = 'storage-gc-daily');
-- 07:17 UTC = 04:17 in Argentina, the quietest hour.
select cron.schedule('storage-gc-daily', '17 7 * * *', $cron$
  select net.http_post(
    url     := 'https://xfefrruwyrhkiijrhxtp.supabase.co/functions/v1/storage-gc',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-gc-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'storage_gc_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);
