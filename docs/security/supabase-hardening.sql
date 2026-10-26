-- ============================================================================
-- myLand — Supabase hardening (security audit 2026-10-26)
--
-- The app can't run this for you: paste it in Supabase › SQL Editor, ONE STEP
-- AT A TIME, reading each result. Steps 1 and 2 only READ. Steps 3–5 change
-- the database: run them after reading what 1–2 returned.
-- ============================================================================


-- ── STEP 1 (read only): which tables have RLS, and every policy in place ────
select tablename, rowsecurity as rls_on
from pg_tables where schemaname = 'public' order by tablename;

select tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies where schemaname = 'public' order by tablename, cmd;

-- What you want to see:
--   * rls_on = true on EVERY table.
--   * profiles:   select for everyone; insert/update only where auth.uid() = user_id.
--   * canvases:   select for everyone only where type = 'space'; insert/update/
--                 delete only where auth.uid() = user_id.
--   * canvas_ops: everything only where auth.uid() = user_id (no public read).
--   * storage_cleanup_queue: only where auth.uid() = user_id (migration 20260520).
-- Any policy with `true` (or no auth.uid() check) on insert/update/delete of
-- profiles / canvases / canvas_ops is a hole: drop it in step 3.


-- ── STEP 2 (read only): the storage bucket and its policies ─────────────────
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'canvas-assets';
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects';


-- ── STEP 3: the policies the app needs (safe to re-run) ─────────────────────
-- Drop first any policy from step 1 that is MORE permissive than these
-- (e.g.  drop policy "<name>" on public.canvases;) — policies add up with OR,
-- so creating these does not remove a wider one.

alter table public.profiles   enable row level security;
alter table public.canvases   enable row level security;
alter table public.canvas_ops enable row level security;

drop policy if exists "ml_profiles_read"   on public.profiles;
drop policy if exists "ml_profiles_insert" on public.profiles;
drop policy if exists "ml_profiles_update" on public.profiles;
create policy "ml_profiles_read"   on public.profiles for select using (true);
create policy "ml_profiles_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "ml_profiles_update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ml_canvases_public_read" on public.canvases;
drop policy if exists "ml_canvases_own"         on public.canvases;
create policy "ml_canvases_public_read" on public.canvases for select using (type = 'space');
create policy "ml_canvases_own"         on public.canvases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ml_canvas_ops_own" on public.canvas_ops;
create policy "ml_canvas_ops_own" on public.canvas_ops for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Handles: one per user, unique, and only the allowed shape (the app checks
-- this too; this is the guard nobody can skip). Fails if existing rows break
-- it — then fix those rows first.
-- create unique index if not exists profiles_handle_key on public.profiles (handle);
-- alter table public.profiles add constraint profiles_handle_shape check (handle ~ '^[a-z0-9_-]{3,25}$');


-- ── STEP 4: the storage bucket ──────────────────────────────────────────────
-- Size limit and file types (the app already refuses others; this is the
-- server-side backstop). 20 MB covers the app's largest (MP3s).
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/*', 'audio/mpeg', 'audio/mp3', 'font/*',
                               'application/font-woff', 'application/x-font-ttf',
                               'application/x-font-otf', 'application/octet-stream']
where id = 'canvas-assets';

-- Who may write: since 2026-10-26 every upload goes to "<user id>/…". These
-- let each user upload, replace and delete ONLY inside their own folder (the
-- public URLs keep working: the bucket is public). Before running, drop the
-- bucket's wider insert / update / delete policies seen in step 2.
-- NOTE: after this, nobody can upload to the bucket root — the app only falls
-- back to the root when the folder upload fails, so check uploads still work.
drop policy if exists "ml_assets_insert_own" on storage.objects;
drop policy if exists "ml_assets_update_own" on storage.objects;
drop policy if exists "ml_assets_delete_own" on storage.objects;
drop policy if exists "ml_assets_list_own"   on storage.objects;
create policy "ml_assets_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ml_assets_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ml_assets_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
-- Listing one's own folder lets the daily cleanup find unused files.
create policy "ml_assets_list_own" on storage.objects for select to authenticated
  using (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);


-- ── STEP 5 (optional, DELETES DATA): tables of removed features ─────────────
-- Social, chat, notifications and anonymous messages were removed from the
-- app on 2026-10-26; nothing reads these tables. anonymous_messages accepts
-- inserts from anyone. Export anything you want to keep first.
-- drop table if exists public.anonymous_messages cascade;
-- drop table if exists public.messages cascade;
-- drop table if exists public.chat_windows cascade;
-- drop table if exists public.chat_participants cascade;
-- drop table if exists public.chats cascade;
-- drop table if exists public.followers cascade;
-- drop table if exists public.favorites cascade;
-- drop table if exists public.element_pins cascade;
