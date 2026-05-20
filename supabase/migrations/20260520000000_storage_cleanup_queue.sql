-- Storage garbage-collection queue.
-- Paths land here when they disappear from a canvas save.
-- runStorageCleanup() reads entries older than 24 h, verifies no canvas
-- still references them, then deletes the file and removes the row.

create table if not exists storage_cleanup_queue (
  id         uuid        primary key default gen_random_uuid(),
  path       text        not null unique,
  user_id    uuid        references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists storage_cleanup_queue_created_at_idx
  on storage_cleanup_queue (created_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table storage_cleanup_queue enable row level security;

create policy "Users can insert own cleanup entries"
  on storage_cleanup_queue for insert
  with check (auth.uid() = user_id);

create policy "Users can read own cleanup entries"
  on storage_cleanup_queue for select
  using (auth.uid() = user_id);

create policy "Users can delete own cleanup entries"
  on storage_cleanup_queue for delete
  using (auth.uid() = user_id);
