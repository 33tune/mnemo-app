-- Favoritos anónimos + notas de 24 h + avisos (2026-11-06, pedido del usuario).
--
-- Favoritos: solo con sesión, uno por cuenta y perfil. ANÓNIMOS: nadie puede
-- leer quién le dio favorito; cada uno ve solo los que dio. El número sale de
-- favorite_counts() (security definer, solo cuenta).
-- Notas: una activa por usuario, 60 caracteres, 24 h. Cualquiera lee las
-- activas. Las vistas cuentan personas distintas (con o sin sesión, por una
-- clave del dispositivo); el dueño no se cuenta.
-- Avisos: al publicar una nota, a cada persona que le dio favorito, como
-- máximo uno por autor cada 24 h. Cada uno lee solo los suyos (Realtime).

-- ── Favoritos (la tabla vieja, sin uso desde 2026-10-26, se reusa) ─────────
alter table public.favorites enable row level security;
alter table public.favorites add column if not exists pinned boolean not null default false;
alter table public.favorites add column if not exists hidden boolean not null default false;
alter table public.favorites alter column created_at set default now();
alter table public.favorites alter column id set default gen_random_uuid();
delete from public.favorites where user_id = target_user_id;
alter table public.favorites drop constraint if exists favorites_not_self;
alter table public.favorites add constraint favorites_not_self check (user_id <> target_user_id);
create index if not exists favorites_target on public.favorites (target_user_id);

drop policy if exists fav_select_own on public.favorites;
drop policy if exists fav_insert_own on public.favorites;
drop policy if exists fav_update_own on public.favorites;
drop policy if exists fav_delete_own on public.favorites;
create policy fav_select_own on public.favorites for select to authenticated using (user_id = auth.uid());
create policy fav_insert_own on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy fav_update_own on public.favorites for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fav_delete_own on public.favorites for delete to authenticated using (user_id = auth.uid());

create or replace function public.favorite_counts(targets uuid[])
returns table (target_user_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select f.target_user_id, count(*) from public.favorites f
  where f.target_user_id = any(targets) group by f.target_user_id;
$$;
revoke all on function public.favorite_counts(uuid[]) from public;
grant execute on function public.favorite_counts(uuid[]) to anon, authenticated;

-- ── Notas ─────────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 60),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
alter table public.notes enable row level security;
drop policy if exists notes_read_active on public.notes;
drop policy if exists notes_insert_own on public.notes;
drop policy if exists notes_delete_own on public.notes;
create policy notes_read_active on public.notes for select to anon, authenticated
  using (expires_at > now() or user_id = auth.uid());
create policy notes_insert_own on public.notes for insert to authenticated with check (user_id = auth.uid());
create policy notes_delete_own on public.notes for delete to authenticated using (user_id = auth.uid());

-- Publicar = reemplazar la nota anterior (una sola, 24 h desde ahora).
create or replace function public.post_note(p_body text)
returns public.notes language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n public.notes;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  delete from public.notes where user_id = me;
  insert into public.notes (user_id, body) values (me, btrim(p_body)) returning * into n;
  return n;
end $$;
revoke all on function public.post_note(text) from public;
grant execute on function public.post_note(text) to authenticated;

create table if not exists public.note_views (
  note_id uuid not null references public.notes(id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) between 8 and 64),
  viewed_at timestamptz not null default now(),
  primary key (note_id, viewer_key)
);
alter table public.note_views enable row level security; -- solo por las funciones

-- Una vista por persona; con sesión la clave es el usuario (así "ya la vi"
-- vale en cualquier dispositivo). El dueño no cuenta.
create or replace function public.view_note(p_note uuid, p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); author uuid;
begin
  select user_id into author from public.notes where id = p_note and expires_at > now();
  if author is null or author = me then return; end if;
  insert into public.note_views (note_id, viewer_key)
  values (p_note, coalesce(me::text, left(p_key, 64)))
  on conflict do nothing;
end $$;
revoke all on function public.view_note(uuid, text) from public;
grant execute on function public.view_note(uuid, text) to anon, authenticated;

create or replace function public.note_view_count(p_note uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.note_views where note_id = p_note;
$$;
revoke all on function public.note_view_count(uuid) from public;
grant execute on function public.note_view_count(uuid) to anon, authenticated;

-- Las notas activas que yo ya vi (para el anillo del acceso directo).
create or replace function public.my_seen_notes(p_notes uuid[])
returns setof uuid language sql stable security definer set search_path = public as $$
  select note_id from public.note_views where note_id = any(p_notes) and viewer_key = auth.uid()::text;
$$;
revoke all on function public.my_seen_notes(uuid[]) from public;
grant execute on function public.my_seen_notes(uuid[]) to authenticated;

-- ── Avisos ────────────────────────────────────────────────────────────────
create table if not exists public.note_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,      -- quien recibe
  author_user_id uuid not null references auth.users(id) on delete cascade,
  -- set null (no cascade): borrar y volver a publicar no vuelve a avisar.
  note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists note_alerts_user on public.note_alerts (user_id, created_at desc);
alter table public.note_alerts enable row level security;
drop policy if exists alerts_read_own on public.note_alerts;
create policy alerts_read_own on public.note_alerts for select to authenticated using (user_id = auth.uid());

create or replace function public.alert_note_favoriters()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.note_alerts (user_id, author_user_id, note_id)
  select f.user_id, new.user_id, new.id from public.favorites f
  where f.target_user_id = new.user_id
    and not exists (
      select 1 from public.note_alerts a
      where a.user_id = f.user_id and a.author_user_id = new.user_id
        and a.created_at > now() - interval '24 hours');
  return new;
end $$;
drop trigger if exists notes_alert on public.notes;
create trigger notes_alert after insert on public.notes for each row execute function public.alert_note_favoriters();

do $$ begin
  alter publication supabase_realtime add table public.note_alerts;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ── Limpieza diaria: notas vencidas (y sus vistas) y avisos de +7 días ──
do $$ begin
  perform cron.unschedule('notes-gc');
exception when others then null; end $$;
do $$ begin
  perform cron.schedule('notes-gc', '41 6 * * *', $c$delete from public.notes where expires_at < now() - interval '1 hour'; delete from public.note_alerts where created_at < now() - interval '7 days'$c$);
exception when others then null; end $$;
