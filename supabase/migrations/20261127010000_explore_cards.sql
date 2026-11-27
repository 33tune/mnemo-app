-- Explorar v2 (2026-11-27): each card's picture + its ranking numbers in one
-- small table, written when the owner saves (throttled) — Explorar reads
-- this, never every room. The picture is <uid>/explore-thumb.jpg in
-- canvas-assets (the card with its stickers and what touches it, over the
-- room's background, like the phone shows it).

create table if not exists public.explore_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  thumb text,
  content real not null default 0,
  finished boolean not null default false,
  collection boolean not null default false,
  name text,
  updated_at timestamptz not null default now()
);
alter table public.explore_cards enable row level security;
drop policy if exists explore_cards_read on public.explore_cards;
create policy explore_cards_read on public.explore_cards for select to anon, authenticated using (true);

-- The owner's own row (numbers computed by the app from the card it just saved).
create or replace function public.explore_index(p_thumb text, p_content real, p_finished boolean, p_collection boolean, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if p_thumb is not null and p_thumb !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/canvas-assets/' || uid::text || '/explore-thumb\.jpg(\?v=[0-9]+)?$') then
    p_thumb := null;
  end if;
  insert into public.explore_cards (user_id, thumb, content, finished, collection, name, updated_at)
  values (uid, p_thumb, greatest(0, least(coalesce(p_content, 0), 60)), coalesce(p_finished, false), coalesce(p_collection, false), left(p_name, 60), now())
  on conflict (user_id) do update set
    thumb = coalesce(excluded.thumb, explore_cards.thumb),
    content = excluded.content, finished = excluded.finished, collection = excluded.collection,
    name = excluded.name, updated_at = now();
end $$;
revoke all on function public.explore_index(text, real, boolean, boolean, text) from public, anon;
grant execute on function public.explore_index(text, real, boolean, boolean, text) to authenticated;

-- Everything Explorar ranks with, in one call: real profiles (no temp_, not
-- banned) with a picture, plus their activity numbers.
create or replace function public.explore_list()
returns table (user_id uuid, handle text, created_at timestamptz, updated_at timestamptz, thumb text, content real,
  finished boolean, collection boolean, name text, views14 bigint, favs bigint, favs14 bigint, posts14 bigint, edit_minutes numeric, edits bigint)
language sql stable security definer set search_path = public as $$
  with c as (
    select e.*, p.handle, p.created_at as pcreated from public.explore_cards e
    join public.profiles p on p.user_id = e.user_id
    where e.thumb is not null and e.finished
      and p.handle not like 'temp\_%' and coalesce(p.onboarding_completed, true)
      and not exists (select 1 from public.banned_users b where b.user_id = e.user_id)
  )
  select c.user_id, c.handle, c.pcreated, c.updated_at, c.thumb, c.content, c.finished, c.collection, c.name,
    coalesce(s.views14, 0)::bigint, coalesce(s.favs, 0)::bigint, coalesce(s.favs14, 0)::bigint, coalesce(s.posts14, 0)::bigint,
    coalesce(s.edit_minutes, 0)::numeric, coalesce(s.edits, 0)::bigint
  from c left join public.explore_signals(array(select user_id from c)) s on s.user_id = c.user_id
$$;
grant execute on function public.explore_list() to anon, authenticated;

-- The daily cleanup also sees the pictures Explorar uses.
create or replace function public.storage_gc_candidates(p_secret text, p_limit integer default 500)
returns setof text language plpgsql stable security definer set search_path to '' as $function$
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
    union all select coalesce(e.thumb, '') from public.explore_cards e
  ) s;
  return query
    select o.name from storage.objects o
    where o.bucket_id = 'canvas-assets'
      and o.created_at < now() - interval '24 hours'
      and strpos(v_blob, o.name) = 0
    order by o.created_at
    limit greatest(1, least(p_limit, 1000));
end;
$function$;
