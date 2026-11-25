-- Muro (2026-11-25, pedido del usuario): los comentarios pasan a ser el MURO de cada card (el dorso).
--
-- Un post vive en el muro de alguien (profile_user_id) y lo escribe alguien (author_user_id): el
-- dueño en su propio muro o cualquiera con sesión en uno ajeno (si el dueño no lo cerró). Hasta 280
-- caracteres, con el estilo que eligió quien escribe (fuente, color, globo, tamaño). Respuestas de un
-- solo nivel (parent_id) y likes de cualquiera (comment_likes; owner_liked queda por compatibilidad).
-- Moderación: el dueño bloquea a alguien de su muro (wall_blocks); cualquiera reporta un post
-- (comment_reports) y el admin lo ve y lo borra. Los comentarios que ya existían son posts del muro.

alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments drop constraint if exists comments_body_len;
alter table public.comments add constraint comments_body_len check (char_length(btrim(body)) between 1 and 280);
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists style jsonb;
create index if not exists comments_parent on public.comments (parent_id, created_at);

-- Estilo de post recordado entre dispositivos (último usado + recientes), del propio usuario.
alter table public.profiles add column if not exists post_style jsonb;

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_likes_user on public.comment_likes (user_id, created_at desc);
alter table public.comment_likes enable row level security;
drop policy if exists comment_likes_read on public.comment_likes;
create policy comment_likes_read on public.comment_likes for select to anon, authenticated
  using (not public.is_banned(user_id) or user_id = auth.uid());

create table if not exists public.wall_blocks (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, blocked_user_id)
);
alter table public.wall_blocks enable row level security;
drop policy if exists wall_blocks_own on public.wall_blocks;
create policy wall_blocks_own on public.wall_blocks for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.comments(id) on delete set null,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  body text, author_user_id uuid, profile_user_id uuid,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_user_id)
);
alter table public.comment_reports enable row level security; -- solo por funciones

-- Estilo seguro: solo fuente (nombre simple), colores hex y tamaño 12/15/18.
create or replace function public.clean_post_style(s jsonb) returns jsonb
language sql immutable as $$
  select nullif(jsonb_strip_nulls(jsonb_build_object(
    'font', case when s->>'font' ~ '^[A-Za-z0-9 ]{1,40}$' then s->>'font' end,
    'color', case when s->>'color' ~ '^#[0-9a-fA-F]{6}$' then s->>'color' end,
    'bg', case when s->>'bg' ~ '^#[0-9a-fA-F]{6}$' then s->>'bg' end,
    'size', case when s->>'size' in ('12', '15', '18') then (s->>'size')::int end
  )), '{}'::jsonb);
$$;

create or replace function public.post_wall(p_owner uuid, p_body text, p_parent uuid default null, p_style jsonb default null)
returns public.comments language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); c public.comments; par public.comments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if char_length(b) < 1 or char_length(b) > 280 then raise exception 'bad_length'; end if;
  if public.is_banned(me) or public.is_banned(p_owner) then raise exception 'unavailable'; end if;
  if not exists (select 1 from public.profiles where user_id = p_owner) then raise exception 'no_profile'; end if;
  if me <> p_owner then
    if exists (select 1 from public.profiles where user_id = p_owner and comments_off) then raise exception 'comments_off'; end if;
    if exists (select 1 from public.wall_blocks where owner_user_id = p_owner and blocked_user_id = me) then raise exception 'blocked'; end if;
  end if;
  if p_parent is not null then
    select * into par from public.comments where id = p_parent;
    if par.id is null or par.profile_user_id <> p_owner then raise exception 'bad_parent'; end if;
    if par.parent_id is not null then p_parent := par.parent_id; end if; -- un solo nivel
  end if;
  if (select count(*) from public.comments where author_user_id = me and created_at > now() - interval '30 seconds') >= 5
     or (select count(*) from public.comments where author_user_id = me and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too_fast';
  end if;
  insert into public.comments (profile_user_id, author_user_id, body, parent_id, style)
  values (p_owner, me, b, p_parent, public.clean_post_style(p_style)) returning * into c;
  return c;
end $$;
revoke all on function public.post_wall(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.post_wall(uuid, text, uuid, jsonb) to authenticated;

create or replace function public.toggle_post_like(p_id uuid)
returns table (liked boolean, n bigint) language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.comments where id = p_id) then raise exception 'no_post'; end if;
  if exists (select 1 from public.comment_likes where comment_id = p_id and user_id = me) then
    delete from public.comment_likes where comment_id = p_id and user_id = me; liked := false;
  else
    insert into public.comment_likes (comment_id, user_id) values (p_id, me); liked := true;
  end if;
  select count(*) into n from public.comment_likes l where l.comment_id = p_id and not public.is_banned(l.user_id);
  return next;
end $$;
revoke all on function public.toggle_post_like(uuid) from public, anon;
grant execute on function public.toggle_post_like(uuid) to authenticated;

create or replace function public.set_post_style(p_style jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare recent jsonb := '[]'::jsonb; s jsonb := public.clean_post_style(p_style);
begin
  if auth.uid() is null or s is null then return; end if;
  select coalesce(post_style->'recent', '[]'::jsonb) into recent from public.profiles where user_id = auth.uid();
  recent := (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select s as x union all
    select e from jsonb_array_elements(coalesce(recent, '[]'::jsonb)) e where e <> s limit 4) z);
  update public.profiles set post_style = jsonb_build_object('last', s, 'recent', recent) where user_id = auth.uid();
end $$;
revoke all on function public.set_post_style(jsonb) from public, anon;
grant execute on function public.set_post_style(jsonb) to authenticated;

create or replace function public.report_post(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.comments;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into c from public.comments where id = p_id; if c.id is null then return; end if;
  insert into public.comment_reports (comment_id, reporter_user_id, body, author_user_id, profile_user_id)
  values (c.id, auth.uid(), c.body, c.author_user_id, c.profile_user_id) on conflict do nothing;
end $$;
revoke all on function public.report_post(uuid) from public, anon;
grant execute on function public.report_post(uuid) to authenticated;

-- Contadores de una lista de posts: likes, respuestas y si yo di like.
create or replace function public.post_stats(ids uuid[])
returns table (id uuid, likes bigint, replies bigint, liked boolean)
language sql stable security definer set search_path = public as $$
  select c.id,
    (select count(*) from public.comment_likes l where l.comment_id = c.id and not public.is_banned(l.user_id)),
    (select count(*) from public.comments r where r.parent_id = c.id and not public.is_banned(r.author_user_id)),
    exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = auth.uid())
  from public.comments c where c.id = any(ids);
$$;
revoke all on function public.post_stats(uuid[]) from public;
grant execute on function public.post_stats(uuid[]) to anon, authenticated;

-- Feed: lo último que escribieron las cards a las que les di corazón (posts, no respuestas).
create or replace function public.my_feed(p_before timestamptz default null, p_limit int default 30)
returns setof public.comments language sql stable security definer set search_path = public as $$
  select c.* from public.comments c
  where c.parent_id is null
    and c.author_user_id in (select target_user_id from public.favorites where user_id = auth.uid() and not coalesce(hidden, false))
    and not public.is_banned(c.author_user_id) and not public.is_banned(c.profile_user_id)
    and (p_before is null or c.created_at < p_before)
  order by c.created_at desc limit least(coalesce(p_limit, 30), 50);
$$;
revoke all on function public.my_feed(timestamptz, int) from public, anon;
grant execute on function public.my_feed(timestamptz, int) to authenticated;

-- Avisos: posts en mi muro, respuestas a mis posts y likes a mis posts (de otros).
create or replace function public.my_activity(p_before timestamptz default null, p_limit int default 40)
returns table (kind text, actor uuid, post_id uuid, wall_owner uuid, body text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'wall'::text, c.author_user_id, c.id, c.profile_user_id, c.body, c.created_at from public.comments c
      where c.profile_user_id = auth.uid() and c.author_user_id <> auth.uid() and c.parent_id is null
    union all
    select 'reply', r.author_user_id, r.id, r.profile_user_id, r.body, r.created_at from public.comments r
      join public.comments p on p.id = r.parent_id
      where (p.author_user_id = auth.uid() or r.profile_user_id = auth.uid()) and r.author_user_id <> auth.uid()
    union all
    select 'like', l.user_id, c.id, c.profile_user_id, c.body, l.created_at from public.comment_likes l
      join public.comments c on c.id = l.comment_id
      where c.author_user_id = auth.uid() and l.user_id <> auth.uid()
  ) a (kind, actor, post_id, wall_owner, body, at)
  where not public.is_banned(a.actor) and (p_before is null or a.at < p_before)
  order by a.at desc limit least(coalesce(p_limit, 40), 80);
$$;
revoke all on function public.my_activity(timestamptz, int) from public, anon;
grant execute on function public.my_activity(timestamptz, int) to authenticated;

-- El punto: avisos nuevos desde la última vez que abrí mis avisos (comment_reads).
create or replace function public.my_unread_activity() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.my_activity(null, 80) a
  where a.at > coalesce((select seen_at from public.comment_reads where user_id = auth.uid()), '-infinity'::timestamptz);
$$;
revoke all on function public.my_unread_activity() from public, anon;
grant execute on function public.my_unread_activity() to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.comment_likes;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ── Admin: reportes ──────────────────────────────────────────────────────────
create or replace function public.admin_post_reports()
returns table (id uuid, comment_id uuid, body text, author_handle text, wall_handle text, reporter_handle text, created_at timestamptz, still_there boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return query select r.id, r.comment_id, r.body,
    (select handle from public.profiles where user_id = r.author_user_id),
    (select handle from public.profiles where user_id = r.profile_user_id),
    (select handle from public.profiles where user_id = r.reporter_user_id),
    r.created_at, exists (select 1 from public.comments c where c.id = r.comment_id)
  from public.comment_reports r order by r.created_at desc limit 200;
end $$;
revoke execute on function public.admin_post_reports() from public, anon;
grant execute on function public.admin_post_reports() to authenticated;
