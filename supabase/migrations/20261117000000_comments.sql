-- Comentarios (2026-11-17, pedido del usuario).
--
-- Solo con sesión; se muestran el @ y la foto de quien comenta; 150 caracteres.
-- El dueño puede borrar cualquiera y darle corazón a cada uno; quien comentó
-- puede borrar el suyo. Interruptor del dueño (profiles.comments_off). Un
-- usuario baneado y sus comentarios dejan de existir para los demás.
-- Aviso: el dueño ve un punto en el ícono de comentarios del editor cuando hay
-- comentarios nuevos desde la última vez que abrió el panel (comment_reads).

alter table public.profiles add column if not exists comments_off boolean not null default false;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid not null references auth.users(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 150),
  owner_liked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_profile on public.comments (profile_user_id, created_at desc);
create index if not exists comments_author on public.comments (author_user_id, created_at desc);
alter table public.comments enable row level security;

drop policy if exists comments_read on public.comments;
drop policy if exists comments_delete on public.comments;
create policy comments_read on public.comments for select to anon, authenticated
  using ((not public.is_banned(author_user_id) and not public.is_banned(profile_user_id))
         or author_user_id = auth.uid() or profile_user_id = auth.uid());
-- Borrar: quien lo escribió o el dueño del perfil.
create policy comments_delete on public.comments for delete to authenticated
  using (author_user_id = auth.uid() or profile_user_id = auth.uid());
-- Escribir y dar corazón solo por las funciones de abajo.

create or replace function public.post_comment(p_owner uuid, p_body text)
returns public.comments language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); c public.comments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if char_length(b) < 1 or char_length(b) > 150 then raise exception 'bad_length'; end if;
  if public.is_banned(me) or public.is_banned(p_owner) then raise exception 'unavailable'; end if;
  if not exists (select 1 from public.profiles where user_id = p_owner) then raise exception 'no_profile'; end if;
  if exists (select 1 from public.profiles where user_id = p_owner and comments_off) then raise exception 'comments_off'; end if;
  -- Contra el spam: 3 cada 30 s y 30 por hora por persona.
  if (select count(*) from public.comments where author_user_id = me and created_at > now() - interval '30 seconds') >= 3
     or (select count(*) from public.comments where author_user_id = me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_fast';
  end if;
  insert into public.comments (profile_user_id, author_user_id, body) values (p_owner, me, b) returning * into c;
  return c;
end $$;
revoke all on function public.post_comment(uuid, text) from public, anon;
grant execute on function public.post_comment(uuid, text) to authenticated;

-- Corazón del dueño en un comentario de su perfil.
create or replace function public.like_comment(p_id uuid, p_liked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.comments set owner_liked = coalesce(p_liked, false)
  where id = p_id and profile_user_id = auth.uid();
end $$;
revoke all on function public.like_comment(uuid, boolean) from public, anon;
grant execute on function public.like_comment(uuid, boolean) to authenticated;

create or replace function public.comment_counts(targets uuid[])
returns table (profile_user_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select c.profile_user_id, count(*) from public.comments c
  where c.profile_user_id = any(targets) and not public.is_banned(c.author_user_id)
  group by c.profile_user_id;
$$;
revoke all on function public.comment_counts(uuid[]) from public;
grant execute on function public.comment_counts(uuid[]) to anon, authenticated;

-- ── Aviso: comentarios nuevos en mi perfil ───────────────────────────────────
create table if not exists public.comment_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.comment_reads enable row level security; -- solo por las funciones

create or replace function public.my_unread_comments()
returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.comments c
  where c.profile_user_id = auth.uid() and c.author_user_id <> auth.uid()
    and not public.is_banned(c.author_user_id)
    and c.created_at > coalesce((select seen_at from public.comment_reads where user_id = auth.uid()), '-infinity'::timestamptz);
$$;
revoke all on function public.my_unread_comments() from public, anon;
grant execute on function public.my_unread_comments() to authenticated;

create or replace function public.mark_comments_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.comment_reads (user_id, seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set seen_at = now();
end $$;
revoke all on function public.mark_comments_seen() from public, anon;
grant execute on function public.mark_comments_seen() to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ── Admin ────────────────────────────────────────────────────────────────────
create or replace function public.admin_delete_comment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.comments;
begin
  perform public.admin_guard();
  select * into c from public.comments where id = p_id;
  if c.id is null then return; end if;
  perform public.admin_log('delete_comment', c.author_user_id, jsonb_build_object('body', c.body, 'on', c.profile_user_id));
  delete from public.comments where id = p_id;
end $$;
revoke execute on function public.admin_delete_comment(uuid) from public, anon;
grant execute on function public.admin_delete_comment(uuid) to authenticated;
