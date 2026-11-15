-- Admin insights (2026-11-15, pedido del usuario): who is online and since when, sessions, who favorites /
-- visits whom, what each person does (a unified activity feed), a per-user detail and the database space.
--
-- * presence_sessions: one row per visit (a "session"). The app pings every minute while a page is open and
--   visible (public.ping); a ping within 5 min of the last one extends the session, otherwise a new one starts.
--   Kept 120 days (daily cron). No policies: written by ping(), read only by the admin_* functions.
-- * Every admin_* function checks is_admin() itself (admin_guard) and returns jsonb.

create table if not exists public.presence_sessions (
  id          bigserial primary key,
  actor       text not null,
  user_id     uuid,
  started_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  first_path  text,
  last_path   text,
  pings       int not null default 1,
  device      text
);
create index if not exists presence_actor_idx on public.presence_sessions (actor, last_seen desc);
create index if not exists presence_user_idx on public.presence_sessions (user_id, started_at desc) where user_id is not null;
create index if not exists presence_started_idx on public.presence_sessions (started_at);
create index if not exists presence_last_idx on public.presence_sessions (last_seen);
alter table public.presence_sessions enable row level security;

create or replace function public.ping(p_actor text, p_path text default null, p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.presence_sessions%rowtype;
begin
  if p_actor is null or length(p_actor) < 8 or length(p_actor) > 64 then return; end if;
  p_path := left(coalesce(p_path, ''), 120);
  p_device := case when p_device in ('mobile', 'desktop', 'tablet') then p_device else null end;
  select * into s from public.presence_sessions where actor = p_actor order by last_seen desc limit 1;
  if found and s.last_seen > now() - interval '5 minutes' then
    if s.last_seen > now() - interval '20 seconds' and s.last_path = p_path then return; end if; -- cheap: nothing new
    update public.presence_sessions
       set last_seen = now(), last_path = p_path, pings = pings + 1, user_id = coalesce(user_id, auth.uid())
     where id = s.id;
  else
    insert into public.presence_sessions (actor, user_id, first_path, last_path, device)
    values (p_actor, auth.uid(), p_path, p_path, p_device);
  end if;
end $$;
grant execute on function public.ping(text, text, text) to anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'presence-gc';
    perform cron.schedule('presence-gc', '41 7 * * *', $c$delete from public.presence_sessions where last_seen < now() - interval '120 days'$c$);
  end if;
end $$;

-- handle of a user (or null)
create or replace function public.admin_handle(p uuid) returns text
language sql stable security definer set search_path = public as $$ select handle from public.profiles where user_id = p $$;
revoke execute on function public.admin_handle(uuid) from public, anon, authenticated;

-- ── who is online now, when people come, the latest sessions ─────────────────
create or replace function public.admin_online(p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 120)));
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'now', (select coalesce(jsonb_agg(x order by x->>'last_seen' desc), '[]') from (
      select jsonb_build_object('handle', public.admin_handle(s.user_id), 'actor', left(s.actor, 6), 'device', s.device,
        'path', s.last_path, 'since', s.started_at, 'last_seen', s.last_seen) x
      from public.presence_sessions s where s.last_seen > now() - interval '3 minutes') q),
    'sessions', (select coalesce(jsonb_agg(x), '[]') from (
      select jsonb_build_object('handle', public.admin_handle(s.user_id), 'actor', left(s.actor, 6), 'device', s.device,
        'first_path', s.first_path, 'last_path', s.last_path, 'started_at', s.started_at, 'last_seen', s.last_seen,
        'minutes', round(extract(epoch from (s.last_seen - s.started_at)) / 60.0 + 0.5)) x
      from public.presence_sessions s where s.started_at >= since order by s.started_at desc limit 150) q),
    -- distinct people by weekday (0 = Sunday) and hour, Buenos Aires time
    'heat', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'n', n)), '[]') from (
      select extract(dow from t)::int dow, extract(hour from t)::int hr, count(distinct who) n from (
        select (s.started_at at time zone 'America/Argentina/Buenos_Aires') t, s.actor who from public.presence_sessions s where s.started_at >= since
        union all select (e.at at time zone 'America/Argentina/Buenos_Aires'), e.actor from public.events e where e.at >= since
        union all select (o.created_at at time zone 'America/Argentina/Buenos_Aires'), o.user_id::text from public.canvas_ops o where o.created_at >= since
      ) a group by 1, 2) h),
    'avg_minutes', (select round(avg(extract(epoch from (last_seen - started_at)) / 60.0)::numeric, 1) from public.presence_sessions where started_at >= since),
    'sessions_count', (select count(*) from public.presence_sessions where started_at >= since),
    'tracking_since', (select min(started_at) from public.presence_sessions)
  );
end $$;

-- ── unified activity feed (optionally one user) ──────────────────────────────
create or replace function public.admin_feed(p_limit int default 200, p_user uuid default null, p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 120)));
begin
  perform public.admin_guard();
  return (select coalesce(jsonb_agg(x order by (x->>'at') desc), '[]') from (
    select x from (
      -- app events (opened the editor, published, gave a favorite, …)
      select jsonb_build_object('at', e.at, 'kind', 'event', 'name', e.name, 'who', public.admin_handle(e.user_id),
        'actor', left(e.actor, 6), 'path', e.path, 'props', e.props) x, e.at
      from public.events e where e.at >= since and (p_user is null or e.user_id = p_user)
      union all
      -- edits, grouped in 10-minute blocks per person
      select jsonb_build_object('at', min(o.created_at), 'until', max(o.created_at), 'kind', 'edits', 'who', public.admin_handle(o.user_id),
        'count', count(*), 'types', jsonb_agg(distinct o.op->>'type')), min(o.created_at)
      from public.canvas_ops o where o.created_at >= since and (p_user is null or o.user_id = p_user)
      group by o.user_id, date_bin('10 minutes', o.created_at, timestamptz '2026-01-01')
      union all
      -- profile visits (who → whom)
      select jsonb_build_object('at', v.viewed_at, 'kind', 'view', 'who', public.admin_handle(v.viewer_user_id),
        'target', public.admin_handle(v.profile_user_id), 'device', v.device_type), v.viewed_at
      from public.profile_views v where v.viewed_at >= since and (p_user is null or v.viewer_user_id = p_user or v.profile_user_id = p_user)
      union all
      -- favorites (who → whom)
      select jsonb_build_object('at', f.created_at, 'kind', 'favorite', 'who', public.admin_handle(f.user_id),
        'target', public.admin_handle(f.target_user_id)), f.created_at
      from public.favorites f where f.created_at >= since and (p_user is null or f.user_id = p_user or f.target_user_id = p_user)
      union all
      -- link clicks on a profile
      select jsonb_build_object('at', c.clicked_at, 'kind', 'click', 'target', public.admin_handle(c.profile_user_id),
        'label', c.link_label, 'url', c.link_url, 'device', c.device_type), c.clicked_at
      from public.link_clicks c where c.clicked_at >= since and (p_user is null or c.profile_user_id = p_user)
      union all
      -- sessions (came online)
      select jsonb_build_object('at', s.started_at, 'kind', 'session', 'who', public.admin_handle(s.user_id), 'actor', left(s.actor, 6),
        'device', s.device, 'path', s.first_path, 'last_path', s.last_path,
        'minutes', round(extract(epoch from (s.last_seen - s.started_at)) / 60.0 + 0.5)), s.started_at
      from public.presence_sessions s where s.started_at >= since and (p_user is null or s.user_id = p_user)
    ) u order by u.at desc limit greatest(1, least(p_limit, 1000))
  ) q);
end $$;

-- ── who favorites whom, who visits whom ──────────────────────────────────────
create or replace function public.admin_relations(p_days int default 90) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'favorites', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]') from (
      select jsonb_build_object('from', public.admin_handle(f.user_id), 'to', public.admin_handle(f.target_user_id),
        'at', f.created_at, 'pinned', f.pinned, 'hidden', f.hidden) x from public.favorites f) q),
    'visits', (select coalesce(jsonb_agg(x order by (x->>'n')::int desc), '[]') from (
      select jsonb_build_object('from', public.admin_handle(v.viewer_user_id), 'to', public.admin_handle(v.profile_user_id),
        'n', count(*), 'last', max(v.viewed_at), 'mobile', count(*) filter (where v.device_type = 'mobile')) x
      from public.profile_views v where v.viewed_at >= since and v.viewer_user_id is not null and v.viewer_user_id <> v.profile_user_id
      group by v.viewer_user_id, v.profile_user_id) q),
    'anonymous', (select coalesce(jsonb_agg(x order by (x->>'n')::int desc), '[]') from (
      select jsonb_build_object('to', public.admin_handle(v.profile_user_id), 'n', count(*),
        'mobile', count(*) filter (where v.device_type = 'mobile'), 'last', max(v.viewed_at)) x
      from public.profile_views v where v.viewed_at >= since and v.viewer_user_id is null group by v.profile_user_id) q),
    'clicks', (select coalesce(jsonb_agg(x order by (x->>'n')::int desc), '[]') from (
      select jsonb_build_object('to', public.admin_handle(c.profile_user_id), 'label', c.link_label, 'url', c.link_url, 'n', count(*)) x
      from public.link_clicks c where c.clicked_at >= since group by c.profile_user_id, c.link_label, c.link_url) q)
  );
end $$;

-- ── everything about one person ──────────────────────────────────────────────
create or replace function public.admin_user_detail(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'last_seen', greatest(
      (select max(last_seen) from public.presence_sessions where user_id = p_user),
      (select max(at) from public.events where user_id = p_user),
      (select max(created_at) from public.canvas_ops where user_id = p_user),
      (select last_sign_in_at from auth.users where id = p_user)),
    'days_active', (select count(distinct day) from public.activity_days where user_id = p_user),
    'edits', (select count(*) from public.canvas_ops where user_id = p_user),
    'edit_types', (select coalesce(jsonb_object_agg(t, n), '{}') from (select op->>'type' t, count(*) n from public.canvas_ops where user_id = p_user group by 1) q),
    'publishes', (select count(*) from public.events where user_id = p_user and name = 'publish'),
    'published', (select (data ? 'published') from public.canvases where user_id = p_user and type = 'space' limit 1),
    'sessions', (select coalesce(jsonb_agg(x), '[]') from (
      select jsonb_build_object('started_at', started_at, 'minutes', round(extract(epoch from (last_seen - started_at)) / 60.0 + 0.5),
        'device', device, 'first_path', first_path, 'last_path', last_path) x
      from public.presence_sessions where user_id = p_user order by started_at desc limit 30) q),
    'hours', (select coalesce(jsonb_object_agg(h, n), '{}') from (
      select extract(hour from (t at time zone 'America/Argentina/Buenos_Aires'))::int h, count(*) n from (
        select started_at t from public.presence_sessions where user_id = p_user
        union all select at from public.events where user_id = p_user
        union all select created_at from public.canvas_ops where user_id = p_user) a group by 1) q),
    'fav_given', (select coalesce(jsonb_agg(jsonb_build_object('handle', public.admin_handle(target_user_id), 'at', created_at) order by created_at desc), '[]') from public.favorites where user_id = p_user),
    'fav_received', (select coalesce(jsonb_agg(jsonb_build_object('handle', public.admin_handle(user_id), 'at', created_at) order by created_at desc), '[]') from public.favorites where target_user_id = p_user),
    'visited', (select coalesce(jsonb_agg(x order by (x->>'n')::int desc), '[]') from (
      select jsonb_build_object('handle', public.admin_handle(profile_user_id), 'n', count(*), 'last', max(viewed_at)) x
      from public.profile_views where viewer_user_id = p_user and profile_user_id <> p_user group by profile_user_id) q),
    'visitors', (select coalesce(jsonb_agg(x order by (x->>'n')::int desc), '[]') from (
      select jsonb_build_object('handle', public.admin_handle(viewer_user_id), 'n', count(*), 'last', max(viewed_at)) x
      from public.profile_views where profile_user_id = p_user and viewer_user_id is not null and viewer_user_id <> p_user group by viewer_user_id) q),
    'anon_visits', (select count(*) from public.profile_views where profile_user_id = p_user and viewer_user_id is null),
    'devices', (select coalesce(jsonb_object_agg(coalesce(device, '?'), n), '{}') from (select device, count(*) n from public.presence_sessions where user_id = p_user group by 1) q)
  );
end $$;

-- ── database space, table by table, and files per person ─────────────────────
create or replace function public.admin_space() returns jsonb
language plpgsql stable security definer set search_path = public, auth, storage as $$
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'db', pg_database_size(current_database()),
    'tables', (select coalesce(jsonb_agg(x order by (x->>'bytes')::bigint desc), '[]') from (
      select jsonb_build_object('name', n.nspname || '.' || c.relname, 'bytes', pg_total_relation_size(c.oid), 'rows', coalesce(s.n_live_tup, 0)) x
      from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_stat_user_tables s on s.relid = c.oid
      where n.nspname in ('public', 'auth', 'storage') and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc limit 20) q),
    'files', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects),
    'file_count', (select count(*) from storage.objects),
    'by_user', (select coalesce(jsonb_agg(x order by (x->>'bytes')::bigint desc), '[]') from (
      select jsonb_build_object('handle', public.admin_handle(case when f ~ '^[0-9a-f-]{36}$' then f::uuid end), 'folder', f,
        'bytes', sum((metadata->>'size')::bigint), 'files', count(*)) x
      from (select split_part(name, '/', 1) f, metadata from storage.objects where bucket_id = 'canvas-assets' and name like '%/%') o
      group by f order by sum((metadata->>'size')::bigint) desc limit 20) q),
    'root_files', (select count(*) from storage.objects where bucket_id = 'canvas-assets' and name not like '%/%')
  );
end $$;
