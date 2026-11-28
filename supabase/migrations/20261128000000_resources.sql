-- Recursos (2026-11-28): "Compartí fragmentos de tu alma".
--
-- A RESOURCE is a picture someone shows: a sticker of their card ("st:<id>") or
-- an image of their room ("im:<id>"). Nothing is uploaded twice: resources live
-- in the owner's room data; these tables only hold what people do with them.
--   resource_meta      — the owner's choices per resource: caption, downloads
--                        allowed or not, hidden from the Recursos row; and the
--                        admin's "removed".
--   reposts            — someone keeps a resource (kind 'resource', with its
--                        src for display) or a wall post (kind 'post') on their
--                        own card: it shows in their Recursos grid / on their
--                        wall, always crediting the original.
--   resource_likes / resource_comments / resource_reports.
--   profiles.resources_hidden   — "Mostrar mis recursos" off.
--   profiles.resources_locked   — default for "Permitir descargas" (Ninguna).
-- Your OWN resources can't be reposted (they are already on your card).
-- Files are never copied: a repost stores the original's URL. When the owner
-- removes a picture from the room, its reposts stop showing (resource_src_ok)
-- and the daily clean-up deletes the file as usual.
-- Everything is read through RLS-safe RPCs (security definer) that also check
-- bans, verification and rate limits like the wall does.

alter table public.profiles add column if not exists resources_hidden boolean not null default false;
alter table public.profiles add column if not exists resources_locked boolean not null default false;

create table if not exists public.resource_meta (
  owner_id uuid not null references auth.users(id) on delete cascade,
  rkey text not null check (rkey ~ '^(st|im):[A-Za-z0-9_-]{1,64}$'),
  caption text check (caption is null or char_length(caption) <= 200),
  no_download boolean,           -- null = follow profiles.resources_locked
  hidden boolean not null default false,
  removed boolean not null default false,
  downloads integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, rkey)
);

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('resource', 'post')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  rkey text check (rkey is null or rkey ~ '^(st|im):[A-Za-z0-9_-]{1,64}$'),
  src text check (src is null or char_length(src) <= 600),
  post_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((kind = 'resource' and rkey is not null and src is not null and post_id is null) or (kind = 'post' and post_id is not null and rkey is null))
);
create unique index if not exists reposts_resource_uniq on public.reposts (user_id, owner_id, rkey) where kind = 'resource';
create unique index if not exists reposts_post_uniq on public.reposts (user_id, post_id) where kind = 'post';
create index if not exists reposts_user_idx on public.reposts (user_id, created_at desc);
create index if not exists reposts_owner_idx on public.reposts (owner_id, rkey);

create table if not exists public.resource_likes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  rkey text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, rkey, user_id)
);

create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  rkey text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists resource_comments_idx on public.resource_comments (owner_id, rkey, created_at);

create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  rkey text not null,
  src text,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, rkey, reporter_id)
);

alter table public.resource_meta enable row level security;
alter table public.reposts enable row level security;
alter table public.resource_likes enable row level security;
alter table public.resource_comments enable row level security;
alter table public.resource_reports enable row level security;
-- Reads only through the functions below (no direct table access).

-- ── helpers ──────────────────────────────────────────────────────────────────
-- Is this src one of the owner's published resources?
create or replace function public.resource_src_ok(p_owner uuid, p_src text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_src is not null and char_length(p_src) between 8 and 600
    and exists (select 1 from public.canvases c where c.user_id = p_owner and c.type = 'space'
                and strpos(coalesce(c.data->'published', c.data)::text, p_src) > 0);
$$;

create or replace function public.resource_blocked(p_owner uuid, p_rkey text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select hidden or removed from public.resource_meta where owner_id = p_owner and rkey = p_rkey), false)
      or coalesce((select resources_hidden from public.profiles where user_id = p_owner), false);
$$;

-- ── viewing ──────────────────────────────────────────────────────────────────
-- Everything a card's Recursos tab needs about the given keys (the client sends
-- the keys it finds in the room), plus the owner's settings.
create or replace function public.resource_stats(p_owner uuid, p_keys text[])
returns table (rkey text, caption text, no_download boolean, hidden boolean, removed boolean, likes bigint, reposts bigint, comments bigint, downloads integer, liked boolean, reposted boolean)
language sql stable security definer set search_path = public as $$
  select k,
    m.caption,
    coalesce(m.no_download, pr.resources_locked, false),
    coalesce(m.hidden, false),
    coalesce(m.removed, false),
    (select count(*) from public.resource_likes l where l.owner_id = p_owner and l.rkey = k and not public.is_banned(l.user_id)),
    (select count(*) from public.reposts r where r.kind = 'resource' and r.owner_id = p_owner and r.rkey = k and not public.is_banned(r.user_id)),
    (select count(*) from public.resource_comments c where c.owner_id = p_owner and c.rkey = k and not public.is_banned(c.author_id)),
    coalesce(m.downloads, 0),
    exists (select 1 from public.resource_likes l where l.owner_id = p_owner and l.rkey = k and l.user_id = auth.uid()),
    exists (select 1 from public.reposts r where r.kind = 'resource' and r.owner_id = p_owner and r.rkey = k and r.user_id = auth.uid())
  from unnest(coalesce(p_keys, '{}'::text[])) k
  left join public.resource_meta m on m.owner_id = p_owner and m.rkey = k
  left join public.profiles pr on pr.user_id = p_owner
  where k ~ '^(st|im):[A-Za-z0-9_-]{1,64}$' and not public.is_banned(p_owner)
  limit 200;
$$;

create or replace function public.resource_settings(p_owner uuid)
returns table (hidden boolean, locked boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(resources_hidden, false), coalesce(resources_locked, false) from public.profiles where user_id = p_owner;
$$;

-- A card's reposts (its Recursos grid), newest first.
create or replace function public.reposts_of(p_user uuid, p_before timestamptz default null, p_limit int default 30)
returns table (id uuid, owner_id uuid, rkey text, src text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.owner_id, r.rkey, r.src, r.created_at from public.reposts r
  where r.user_id = p_user and r.kind = 'resource'
    and not public.is_banned(r.user_id) and not public.is_banned(r.owner_id)
    and not coalesce((select removed from public.resource_meta m where m.owner_id = r.owner_id and m.rkey = r.rkey), false)
    and public.resource_src_ok(r.owner_id, r.src)
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc limit least(coalesce(p_limit, 30), 60);
$$;

-- The wall posts a card reposted (shown on its wall).
create or replace function public.post_reposts_of(p_user uuid, p_before timestamptz default null, p_limit int default 21)
returns table (repost_id uuid, repost_at timestamptz, id uuid, profile_user_id uuid, author_user_id uuid, parent_id uuid, body text, style jsonb, created_at timestamptz, pinned boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.created_at, c.id, c.profile_user_id, c.author_user_id, c.parent_id, c.body, c.style, c.created_at, false
  from public.reposts r join public.comments c on c.id = r.post_id
  where r.user_id = p_user and r.kind = 'post'
    and not public.is_banned(c.author_user_id) and not public.is_banned(c.profile_user_id)
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc limit least(coalesce(p_limit, 21), 50);
$$;

create or replace function public.resource_comments_of(p_owner uuid, p_rkey text)
returns table (id uuid, author_id uuid, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.author_id, c.body, c.created_at from public.resource_comments c
  where c.owner_id = p_owner and c.rkey = p_rkey and not public.is_banned(c.author_id)
  order by c.created_at asc limit 200;
$$;

-- ── acting ───────────────────────────────────────────────────────────────────
create or replace function public.toggle_resource_repost(p_owner uuid, p_rkey text, p_src text)
returns table (reposted boolean, n bigint)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if me = p_owner then raise exception 'own_resource'; end if;
  if not public.is_verified(me) then raise exception 'verify_required'; end if;
  if public.is_banned(me) or public.is_banned(p_owner) then raise exception 'unavailable'; end if;
  if exists (select 1 from public.reposts where user_id = me and kind = 'resource' and owner_id = p_owner and rkey = p_rkey) then
    delete from public.reposts where user_id = me and kind = 'resource' and owner_id = p_owner and rkey = p_rkey;
    reposted := false;
  else
    if p_rkey !~ '^(st|im):[A-Za-z0-9_-]{1,64}$' then raise exception 'bad_key'; end if;
    if public.resource_blocked(p_owner, p_rkey) then raise exception 'unavailable'; end if;
    if not public.resource_src_ok(p_owner, p_src) then raise exception 'bad_src'; end if;
    if (select count(*) from public.reposts where user_id = me and created_at > now() - interval '1 minute') >= 20 then raise exception 'too_fast'; end if;
    insert into public.reposts (user_id, kind, owner_id, rkey, src) values (me, 'resource', p_owner, p_rkey, p_src);
    reposted := true;
  end if;
  select count(*) into n from public.reposts r where r.kind = 'resource' and r.owner_id = p_owner and r.rkey = p_rkey;
  return next;
end $$;

create or replace function public.toggle_post_repost(p_post uuid)
returns table (reposted boolean, n bigint)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c public.comments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.is_verified(me) then raise exception 'verify_required'; end if;
  select * into c from public.comments where id = p_post;
  if c.id is null or c.parent_id is not null then raise exception 'no_post'; end if;
  if public.is_banned(me) or public.is_banned(c.author_user_id) then raise exception 'unavailable'; end if;
  if exists (select 1 from public.reposts where user_id = me and kind = 'post' and post_id = p_post) then
    delete from public.reposts where user_id = me and kind = 'post' and post_id = p_post;
    reposted := false;
  else
    if (select count(*) from public.reposts where user_id = me and created_at > now() - interval '1 minute') >= 20 then raise exception 'too_fast'; end if;
    insert into public.reposts (user_id, kind, owner_id, post_id) values (me, 'post', c.author_user_id, p_post);
    reposted := true;
  end if;
  select count(*) into n from public.reposts r where r.kind = 'post' and r.post_id = p_post;
  return next;
end $$;

-- Which of these posts did I repost, and how many reposts each has.
create or replace function public.post_repost_stats(ids uuid[])
returns table (id uuid, reposts bigint, reposted boolean)
language sql stable security definer set search_path = public as $$
  select i, (select count(*) from public.reposts r where r.kind = 'post' and r.post_id = i and not public.is_banned(r.user_id)),
    exists (select 1 from public.reposts r where r.kind = 'post' and r.post_id = i and r.user_id = auth.uid())
  from unnest(coalesce(ids, '{}'::uuid[])) i limit 200;
$$;

create or replace function public.toggle_resource_like(p_owner uuid, p_rkey text)
returns table (liked boolean, n bigint)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if me <> p_owner and not public.is_verified(me) then raise exception 'verify_required'; end if;
  if p_rkey !~ '^(st|im):[A-Za-z0-9_-]{1,64}$' then raise exception 'bad_key'; end if;
  if public.is_banned(me) or public.is_banned(p_owner) then raise exception 'unavailable'; end if;
  if exists (select 1 from public.resource_likes where owner_id = p_owner and rkey = p_rkey and user_id = me) then
    delete from public.resource_likes where owner_id = p_owner and rkey = p_rkey and user_id = me; liked := false;
  else
    insert into public.resource_likes (owner_id, rkey, user_id) values (p_owner, p_rkey, me); liked := true;
  end if;
  select count(*) into n from public.resource_likes l where l.owner_id = p_owner and l.rkey = p_rkey;
  return next;
end $$;

create or replace function public.post_resource_comment(p_owner uuid, p_rkey text, p_body text)
returns public.resource_comments
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); c public.resource_comments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if me <> p_owner and not public.is_verified(me) then raise exception 'verify_required'; end if;
  if p_rkey !~ '^(st|im):[A-Za-z0-9_-]{1,64}$' then raise exception 'bad_key'; end if;
  if char_length(b) < 1 or char_length(b) > 280 then raise exception 'bad_length'; end if;
  if public.is_banned(me) or public.is_banned(p_owner) then raise exception 'unavailable'; end if;
  if me <> p_owner then
    if exists (select 1 from public.profiles where user_id = p_owner and comments_off) then raise exception 'comments_off'; end if;
    if exists (select 1 from public.wall_blocks where owner_user_id = p_owner and blocked_user_id = me) then raise exception 'blocked'; end if;
  end if;
  if (select count(*) from public.resource_comments where author_id = me and created_at > now() - interval '30 seconds') >= 5
     or (select count(*) from public.resource_comments where author_id = me and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too_fast';
  end if;
  insert into public.resource_comments (owner_id, rkey, author_id, body) values (p_owner, p_rkey, me, b) returning * into c;
  return c;
end $$;

create or replace function public.delete_resource_comment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.resource_comments where id = p_id and (author_id = auth.uid() or owner_id = auth.uid());
end $$;

-- A download: allowed? (and counted when it is).
create or replace function public.resource_download(p_owner uuid, p_rkey text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if p_rkey !~ '^(st|im):[A-Za-z0-9_-]{1,64}$' or public.is_banned(p_owner) then return false; end if;
  select not coalesce(m.no_download, pr.resources_locked, false) and not coalesce(m.removed, false) into ok
    from public.profiles pr left join public.resource_meta m on m.owner_id = p_owner and m.rkey = p_rkey
    where pr.user_id = p_owner;
  if not coalesce(ok, false) then return false; end if;
  insert into public.resource_meta (owner_id, rkey, downloads) values (p_owner, p_rkey, 1)
    on conflict (owner_id, rkey) do update set downloads = public.resource_meta.downloads + 1;
  return true;
end $$;

create or replace function public.report_resource(p_owner uuid, p_rkey text, p_src text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_rkey !~ '^(st|im):[A-Za-z0-9_-]{1,64}$' then raise exception 'bad_key'; end if;
  insert into public.resource_reports (owner_id, rkey, src, reporter_id) values (p_owner, p_rkey, left(p_src, 600), me)
    on conflict (owner_id, rkey, reporter_id) do nothing;
end $$;

-- ── the owner's choices ──────────────────────────────────────────────────────
create or replace function public.set_resource_meta(p_rkey text, p_caption text default null, p_set_caption boolean default false,
  p_no_download boolean default null, p_set_download boolean default false, p_hidden boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cap text := nullif(btrim(coalesce(p_caption, '')), '');
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_rkey !~ '^(st|im):[A-Za-z0-9_-]{1,64}$' then raise exception 'bad_key'; end if;
  if cap is not null and char_length(cap) > 200 then raise exception 'bad_length'; end if;
  insert into public.resource_meta (owner_id, rkey, caption, no_download, hidden)
  values (me, p_rkey, case when p_set_caption then cap end, case when p_set_download then p_no_download end, coalesce(p_hidden, false))
  on conflict (owner_id, rkey) do update set
    caption = case when p_set_caption then cap else public.resource_meta.caption end,
    no_download = case when p_set_download then p_no_download else public.resource_meta.no_download end,
    hidden = coalesce(p_hidden, public.resource_meta.hidden),
    updated_at = now();
end $$;

-- "Mostrar mis recursos" / "Permitir descargas: Todas | Ninguna" (the shortcut
-- clears every per-resource choice so all follow the new default).
create or replace function public.set_resource_settings(p_hidden boolean default null, p_locked boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_hidden is not null then update public.profiles set resources_hidden = p_hidden where user_id = me; end if;
  if p_locked is not null then
    update public.profiles set resources_locked = p_locked where user_id = me;
    update public.resource_meta set no_download = null, updated_at = now() where owner_id = me;
  end if;
end $$;

-- "Borrar" (the editor also removes it from the card / room): everything people
-- did with it goes too, reposts included.
create or replace function public.delete_resource_data(p_rkey text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  delete from public.reposts where kind = 'resource' and owner_id = me and rkey = p_rkey;
  delete from public.resource_likes where owner_id = me and rkey = p_rkey;
  delete from public.resource_comments where owner_id = me and rkey = p_rkey;
  delete from public.resource_reports where owner_id = me and rkey = p_rkey;
  delete from public.resource_meta where owner_id = me and rkey = p_rkey;
end $$;

-- ── feed (Explorar › Feed) ────────────────────────────────────────────────────
-- From the people I keep in favorites: what they wrote on their own walls, what
-- they reposted (posts and resources) and who they added to their favorites.
create or replace function public.my_feed_v2(p_before timestamptz default null, p_limit int default 30)
returns table (kind text, actor uuid, at timestamptz, post_id uuid, owner_id uuid, rkey text, src text, target uuid)
language sql stable security definer set search_path = public as $$
  with f as (select target_user_id u from public.favorites where user_id = auth.uid() and not coalesce(hidden, false))
  select * from (
    select 'post'::text, c.author_user_id, c.created_at, c.id, c.profile_user_id, null::text, null::text, null::uuid
      from public.comments c where c.parent_id is null and c.author_user_id = c.profile_user_id and c.author_user_id in (select u from f)
    union all
    select 'repost_post', r.user_id, r.created_at, r.post_id, r.owner_id, null, null, null
      from public.reposts r where r.kind = 'post' and r.user_id in (select u from f)
    union all
    select 'repost_resource', r.user_id, r.created_at, null, r.owner_id, r.rkey, r.src, null
      from public.reposts r where r.kind = 'resource' and r.user_id in (select u from f)
        and not coalesce((select removed from public.resource_meta m where m.owner_id = r.owner_id and m.rkey = r.rkey), false)
        and public.resource_src_ok(r.owner_id, r.src)
    union all
    select 'favorite', fv.user_id, fv.created_at, null, null, null, null, fv.target_user_id
      from public.favorites fv where fv.user_id in (select u from f) and fv.target_user_id <> auth.uid()
  ) x (kind, actor, at, post_id, owner_id, rkey, src, target)
  where not public.is_banned(x.actor) and (x.target is null or not public.is_banned(x.target))
    and (x.owner_id is null or not public.is_banned(x.owner_id))
    and (p_before is null or x.at < p_before)
  order by x.at desc limit least(coalesce(p_limit, 30), 50);
$$;

-- ── avisos: + reposts of my things, comments and likes on my resources ─────────
-- (for resources, body starts with the resource key: "<key>" or "<key> <comment>")
create or replace function public.my_activity(p_before timestamptz default null, p_limit integer default 40)
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
    union all
    select 'favorite', f.user_id, null::uuid, f.target_user_id, null::text, f.created_at from public.favorites f
      where f.target_user_id = auth.uid() and f.user_id <> auth.uid()
    union all
    select 'repost', r.user_id, r.post_id, r.owner_id, coalesce(c.body, r.rkey), r.created_at from public.reposts r
      left join public.comments c on c.id = r.post_id
      where r.owner_id = auth.uid() and r.user_id <> auth.uid()
    union all
    select 'rcomment', rc.author_id, null, rc.owner_id, rc.rkey || ' ' || rc.body, rc.created_at from public.resource_comments rc
      where rc.owner_id = auth.uid() and rc.author_id <> auth.uid()
    union all
    select 'rlike', rl.user_id, null, rl.owner_id, rl.rkey, rl.created_at from public.resource_likes rl
      where rl.owner_id = auth.uid() and rl.user_id <> auth.uid()
  ) a (kind, actor, post_id, wall_owner, body, at)
  where not public.is_banned(a.actor) and (p_before is null or a.at < p_before)
  order by a.at desc limit least(coalesce(p_limit, 40), 80);
$$;

-- ── admin ────────────────────────────────────────────────────────────────────
create or replace function public.admin_resource_reports(p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return (select coalesce(jsonb_agg(x order by (x->>'last')::timestamptz desc), '[]') from (
    select jsonb_build_object('owner', r.owner_id, 'handle', public.admin_handle(r.owner_id), 'rkey', r.rkey, 'src', max(r.src),
      'reports', count(*), 'last', max(r.created_at),
      'removed', coalesce((select removed from public.resource_meta m where m.owner_id = r.owner_id and m.rkey = r.rkey), false)) x
    from public.resource_reports r group by r.owner_id, r.rkey order by max(r.created_at) desc limit least(p_limit, 300)) q);
end $$;

create or replace function public.admin_remove_resource(p_owner uuid, p_rkey text, p_removed boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard();
  insert into public.resource_meta (owner_id, rkey, removed) values (p_owner, p_rkey, p_removed)
    on conflict (owner_id, rkey) do update set removed = p_removed, updated_at = now();
  if p_removed then delete from public.reposts where kind = 'resource' and owner_id = p_owner and rkey = p_rkey; end if;
  insert into public.admin_actions (admin_id, action, target_user, target_handle, detail)
    values (auth.uid(), case when p_removed then 'remove_resource' else 'restore_resource' end, p_owner, public.admin_handle(p_owner), jsonb_build_object('rkey', p_rkey));
end $$;

grant execute on function public.resource_stats(uuid, text[]) to anon, authenticated;
grant execute on function public.resource_settings(uuid) to anon, authenticated;
grant execute on function public.reposts_of(uuid, timestamptz, int) to anon, authenticated;
grant execute on function public.post_reposts_of(uuid, timestamptz, int) to anon, authenticated;
grant execute on function public.resource_comments_of(uuid, text) to anon, authenticated;
grant execute on function public.post_repost_stats(uuid[]) to anon, authenticated;
grant execute on function public.resource_download(uuid, text) to anon, authenticated;
revoke all on function public.resource_src_ok(uuid, text) from public, anon;
revoke all on function public.admin_resource_reports(int) from public, anon;
revoke all on function public.admin_remove_resource(uuid, text, boolean) from public, anon;
grant execute on function public.admin_resource_reports(int) to authenticated;
grant execute on function public.admin_remove_resource(uuid, text, boolean) to authenticated;
