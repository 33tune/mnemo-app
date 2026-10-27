-- myLand security hardening (2026-10-27), applied to the project with the
-- user's OK. Based on docs/security/supabase-hardening.sql, adapted to what
-- the database actually had.

-- ── profiles ────────────────────────────────────────────────────────────────
-- "Service role bypass" was FOR ALL USING (true) WITH CHECK (true) for every
-- role: anyone, logged in or not, could create, edit or delete any profile.
-- The service role skips RLS on its own; this policy only opened the table.
drop policy if exists "Service role bypass" on public.profiles;

-- Handles: only the allowed shape ("temp_" + 15 hex = 20 chars fits).
-- Unique per handle and per user already existed.
alter table public.profiles drop constraint if exists profiles_handle_shape;
alter table public.profiles add constraint profiles_handle_shape check (handle ~ '^[a-z0-9_-]{3,25}$');

-- ── Removed features (social, chat, feed, pins, old guestbook) ──────────────
-- The app no longer reads these tables. Some let any logged-in user read every
-- chat message or create chats/participants. Their policies are dropped: with
-- RLS on and no policy, nobody but the service role can touch them. The data
-- stays (deleting the tables is a separate decision).
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('chats', 'chat_participants', 'chat_windows', 'messages', 'followers',
                        'favorites', 'element_pins', 'activity_feed', 'feed_comments', 'guestbook_entries')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── Storage cleanup queue (migration 20260520000000 was never applied) ──────
create table if not exists public.storage_cleanup_queue (
  id         uuid        primary key default gen_random_uuid(),
  path       text        not null unique,
  user_id    uuid        references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists storage_cleanup_queue_created_at_idx on public.storage_cleanup_queue (created_at);
alter table public.storage_cleanup_queue enable row level security;
drop policy if exists "Users can insert own cleanup entries" on public.storage_cleanup_queue;
drop policy if exists "Users can read own cleanup entries"   on public.storage_cleanup_queue;
drop policy if exists "Users can delete own cleanup entries" on public.storage_cleanup_queue;
create policy "Users can insert own cleanup entries" on public.storage_cleanup_queue for insert with check (auth.uid() = user_id);
create policy "Users can read own cleanup entries"   on public.storage_cleanup_queue for select using (auth.uid() = user_id);
create policy "Users can delete own cleanup entries" on public.storage_cleanup_queue for delete using (auth.uid() = user_id);

-- ── Storage bucket ──────────────────────────────────────────────────────────
-- Server-side backstop of uploadRules.ts: 20 MB (MP3s), only images, MP3s and
-- fonts. The app sends a content type for every file (storage.ts).
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/*', 'audio/mpeg', 'audio/mp3', 'font/*',
                               'application/font-woff', 'application/x-font-ttf', 'application/x-font-otf',
                               'application/vnd.ms-fontobject', 'application/octet-stream']
where id = 'canvas-assets';

-- Writes only inside one's own folder ("<user id>/…", every upload since
-- 2026-10-26). "Auth users can upload" let any user write anywhere in the
-- bucket. Older root files stay deletable by their owner ("Users can delete
-- own files", owner_id). "Public can read" let anyone LIST every file: the
-- bucket is public, so public URLs keep working without it.
drop policy if exists "Auth users can upload" on storage.objects;
drop policy if exists "Auth users can update" on storage.objects;
drop policy if exists "Public can read"       on storage.objects;
drop policy if exists "ml_assets_insert_own"  on storage.objects;
drop policy if exists "ml_assets_update_own"  on storage.objects;
drop policy if exists "ml_assets_delete_own"  on storage.objects;
drop policy if exists "ml_assets_list_own"    on storage.objects;
create policy "ml_assets_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ml_assets_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ml_assets_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
-- Listing one's own folder lets the daily cleanup find unused files.
create policy "ml_assets_list_own" on storage.objects for select to authenticated
  using (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = auth.uid()::text);
