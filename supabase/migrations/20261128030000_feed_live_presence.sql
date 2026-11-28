-- Feed propio, En vivo y presencia (2026-11-28, pedido del usuario).
--
-- user_presence: the last moment each signed-in person was on myLand (written
-- by ping(), which PresencePing already calls every 2 minutes). Shown on each
-- room ("En vivo" / "Activo hace 3 h") and in Explorar › En vivo, unless the
-- person turned it off (profiles.presence_hidden).

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);
create index if not exists user_presence_last_idx on public.user_presence (last_seen desc);
alter table public.user_presence enable row level security;
alter table public.profiles add column if not exists presence_hidden boolean not null default false;

insert into public.user_presence (user_id, last_seen)
select user_id, max(last_seen) from public.presence_sessions where user_id in (select id from auth.users) group by user_id
on conflict (user_id) do update set last_seen = greatest(public.user_presence.last_seen, excluded.last_seen);

-- ping(): also remember the person's last moment.
do $$
declare d text := pg_get_functiondef('public.ping(text,text,text)'::regprocedure);
begin
  if position('user_presence' in d) = 0 then
    d := replace(d, 'begin
  if p_actor is null', 'begin
  if auth.uid() is not null then
    insert into public.user_presence (user_id, last_seen) values (auth.uid(), now())
      on conflict (user_id) do update set last_seen = now()
      where public.user_presence.last_seen < now() - interval ''20 seconds'';
  end if;
  if p_actor is null');
    execute d;
  end if;
end $$;

-- When was this person last here? null = hidden, banned or never.
create or replace function public.last_seen_of(p_user uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select up.last_seen from public.user_presence up join public.profiles p on p.user_id = up.user_id
  where up.user_id = p_user and not p.presence_hidden and not public.is_banned(p_user);
$$;

-- Who is on myLand right now (last 3 minutes), newest first.
create or replace function public.live_now(p_limit int default 200)
returns table (user_id uuid, last_seen timestamptz)
language sql stable security definer set search_path = public as $$
  select up.user_id, up.last_seen from public.user_presence up join public.profiles p on p.user_id = up.user_id
  where up.last_seen > now() - interval '3 minutes' and not p.presence_hidden and not public.is_banned(up.user_id)
    and p.handle not like 'temp\_%'
  order by up.last_seen desc limit least(coalesce(p_limit, 200), 500);
$$;

create or replace function public.set_presence_hidden(p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  update public.profiles set presence_hidden = coalesce(p_hidden, false) where user_id = auth.uid();
end $$;

-- ── Feed: a few posts from people I don't keep in favorites ───────────────────
-- Own-wall posts of the last 7 days, scored by likes, replies and reposts, with
-- a big bonus when people I keep in favorites liked them. The app sprinkles
-- them between the feed (about 1 in 6).
create or replace function public.feed_suggested(p_limit int default 8)
returns table (id uuid, liked_by_favs bigint, score numeric)
language sql volatile security definer set search_path = public as $$
  with f as (select target_user_id u from public.favorites where user_id = auth.uid()),
  cand as (
    select c.id, c.author_user_id,
      (select count(*) from public.comment_likes l where l.comment_id = c.id) likes,
      (select count(*) from public.comments r where r.parent_id = c.id) replies,
      (select count(*) from public.reposts rp where rp.kind = 'post' and rp.post_id = c.id) reps,
      (select count(*) from public.comment_likes l where l.comment_id = c.id and l.user_id in (select u from f)) favl
    from public.comments c
    where c.parent_id is null and c.author_user_id = c.profile_user_id
      and c.created_at > now() - interval '7 days'
      and c.author_user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
      and c.author_user_id not in (select u from f)
      and not public.is_banned(c.author_user_id)
  )
  select id, favl, (likes + 2 * replies + 3 * reps + 6 * favl)::numeric * (0.6 + random() * 0.8) as score
  from cand where likes + replies + reps + favl >= 2
  order by score desc limit least(coalesce(p_limit, 8), 20);
$$;

-- How many new things are in my feed since a moment (the badge).
create or replace function public.feed_count_since(p_since timestamptz) returns bigint
language sql stable security definer set search_path = public as $$
  with f as (select target_user_id u from public.favorites where user_id = auth.uid() and not coalesce(hidden, false))
  select (select count(*) from public.comments c where c.parent_id is null and c.author_user_id = c.profile_user_id
            and c.author_user_id in (select u from f) and c.created_at > p_since)
       + (select count(*) from public.reposts r where r.user_id in (select u from f) and r.created_at > p_since);
$$;

-- ── Admin: how people use Fragmentos, reposts, the Feed and En vivo ──────────
create or replace function public.admin_community_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'reposts_resource_24h', (select count(*) from reposts where kind = 'resource' and created_at > now() - interval '24 hours'),
    'reposts_resource_7d', (select count(*) from reposts where kind = 'resource' and created_at > now() - interval '7 days'),
    'reposts_post_24h', (select count(*) from reposts where kind = 'post' and created_at > now() - interval '24 hours'),
    'reposts_post_7d', (select count(*) from reposts where kind = 'post' and created_at > now() - interval '7 days'),
    'reposters_7d', (select count(distinct user_id) from reposts where created_at > now() - interval '7 days'),
    'reposts_total', (select count(*) from reposts),
    'rlikes_7d', (select count(*) from resource_likes where created_at > now() - interval '7 days'),
    'rcomments_7d', (select count(*) from resource_comments where created_at > now() - interval '7 days'),
    'downloads_total', (select coalesce(sum(downloads), 0) from resource_meta),
    'locked_owners', (select count(*) from profiles where resources_locked),
    'hidden_owners', (select count(*) from profiles where resources_hidden),
    'presence_hidden', (select count(*) from profiles where presence_hidden),
    'live_now', (select count(*) from user_presence where last_seen > now() - interval '3 minutes'),
    'events_7d', (select coalesce(jsonb_object_agg(name, n), '{}') from (
        select name, count(*) n from events where at > now() - interval '7 days'
          and name in ('repost', 'resource_open', 'resource_download', 'resource_like', 'resource_comment', 'feed_open', 'feed_post', 'feed_refresh', 'feed_reply', 'live_open')
        group by name) e),
    'users_7d', (select coalesce(jsonb_object_agg(name, n), '{}') from (
        select name, count(distinct coalesce(user_id::text, actor)) n from events where at > now() - interval '7 days'
          and name in ('repost', 'resource_open', 'resource_download', 'feed_open', 'feed_post', 'live_open')
        group by name) e),
    'by_day', (select coalesce(jsonb_agg(d order by d->>'day'), '[]') from (
        select jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'),
          'reposts', (select count(*) from reposts where created_at::date = day),
          'opens', (select count(*) from events where name = 'resource_open' and at::date = day),
          'feed', (select count(*) from events where name = 'feed_open' and at::date = day),
          'downloads', (select count(*) from events where name = 'resource_download' and at::date = day)) d
        from generate_series((now() - interval '13 days')::date, now()::date, interval '1 day') day) q),
    'top_resources', (select coalesce(jsonb_agg(x), '[]') from (
        select jsonb_build_object('handle', admin_handle(owner_id), 'src', max(src), 'reposts', count(*)) x
        from reposts where kind = 'resource' group by owner_id, rkey order by count(*) desc limit 12) t),
    'top_reposters', (select coalesce(jsonb_agg(x), '[]') from (
        select jsonb_build_object('handle', admin_handle(user_id), 'reposts', count(*)) x
        from reposts group by user_id order by count(*) desc limit 10) t)
  ) into r;
  return r;
end $$;

-- Track: the new events.
do $$
declare def text := pg_get_functiondef('public.track(text,text,text,jsonb)'::regprocedure);
begin
  if position('''feed_post''' in def) = 0 then
    execute replace(def, '''feed_open''', '''feed_open'', ''feed_post'', ''feed_refresh'', ''feed_reply'', ''live_open''');
  end if;
end $$;

grant execute on function public.last_seen_of(uuid) to anon, authenticated;
grant execute on function public.live_now(int) to anon, authenticated;
revoke all on function public.admin_community_stats() from public, anon;
grant execute on function public.admin_community_stats() to authenticated;
