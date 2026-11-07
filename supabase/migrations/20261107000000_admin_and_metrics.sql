-- Admin panel + own usage metrics (2026-11-07, pedido del usuario).
--
-- * admins: who can open /admin (only the owner, by user id — a handle can change).
-- * banned_users: a banned account "deja de existir": RLS hides its profile,
--   rooms and notes from everyone (the page 404s, search / bar / OG skip it)
--   and it can't sign in (auth.users.banned_until + sessions removed).
-- * admin_* functions (security definer, each checks is_admin()): list users,
--   ban / unban, delete account, rename (the old name is free at once), delete
--   the current note, read reports and the action log, metrics.
-- * events + activity_days: the app's own analytics (no recordings, no
--   personal data beyond the user id): track() inserts a whitelisted event;
--   "visit" also marks the device / user active that day (DAU, retention).
--   Raw events are kept 90 days, active days 400 days (daily cron) so the
--   database doesn't fill up.

-- ── who is admin ─────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- no policies: only definer functions read it

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ── bans ─────────────────────────────────────────────────────────────────────
create table if not exists public.banned_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  banned_at timestamptz not null default now()
);
alter table public.banned_users enable row level security;

create or replace function public.is_banned(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.banned_users where user_id = uid);
$$;

-- A banned account doesn't exist for anyone else.
drop policy if exists "Cualquiera puede leer perfiles" on public.profiles;
create policy "Cualquiera puede leer perfiles" on public.profiles for select
  using (not public.is_banned(user_id) or auth.uid() = user_id or public.is_admin());

drop policy if exists "Cualquiera lee canvases públicos" on public.canvases;
create policy "Cualquiera lee canvases públicos" on public.canvases for select
  using (is_public = true and not public.is_banned(user_id));

drop policy if exists notes_read_active on public.notes;
create policy notes_read_active on public.notes for select to anon, authenticated
  using ((expires_at > now() and not public.is_banned(user_id)) or user_id = auth.uid());

-- Is myland.lol/<h> free? (also sees banned profiles, which RLS hides)
create or replace function public.handle_available(h text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where handle = lower(h));
$$;
grant execute on function public.handle_available(text) to anon, authenticated;

-- ── action log ───────────────────────────────────────────────────────────────
create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_id uuid,
  action text not null,
  target_user uuid,
  target_handle text,
  detail jsonb
);
alter table public.admin_actions enable row level security;

create or replace function public.admin_guard() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_log(p_action text, p_user uuid, p_detail jsonb default null) returns void
language sql security definer set search_path = public as $$
  insert into public.admin_actions (admin_id, action, target_user, target_handle, detail)
  values (auth.uid(), p_action, p_user, (select handle from public.profiles where user_id = p_user), p_detail);
$$;
revoke execute on function public.admin_log(text, uuid, jsonb) from public, anon, authenticated;

-- ── users list ───────────────────────────────────────────────────────────────
create or replace function public.admin_users(p_q text default '', p_limit int default 50, p_offset int default 0)
returns table (
  user_id uuid, handle text, display_name text, email text, provider text,
  created_at timestamptz, last_sign_in_at timestamptz, onboarding_completed boolean,
  banned boolean, ban_reason text, views bigint, favorites bigint, has_note boolean, total bigint
)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
declare q text := '%' || replace(replace(lower(coalesce(p_q, '')), '%', '\%'), '_', '\_') || '%';
begin
  perform public.admin_guard();
  return query
  with u as (
    select au.id, p.handle, p.display_name, au.email::text as email,
           coalesce(au.raw_app_meta_data->>'provider', 'email') as provider,
           au.created_at, au.last_sign_in_at, p.onboarding_completed
    from auth.users au left join public.profiles p on p.user_id = au.id
    where coalesce(p_q, '') = ''
       or lower(coalesce(p.handle, '')) like q or lower(coalesce(p.display_name, '')) like q
       or lower(coalesce(au.email, '')) like q
  )
  select u.id, u.handle, u.display_name, u.email, u.provider, u.created_at, u.last_sign_in_at,
         u.onboarding_completed,
         b.user_id is not null, b.reason,
         (select count(*) from public.profile_views v where v.profile_user_id = u.id),
         (select count(*) from public.favorites f where f.target_user_id = u.id),
         exists (select 1 from public.notes n where n.user_id = u.id and n.expires_at > now()),
         count(*) over ()
  from u left join public.banned_users b on b.user_id = u.id
  order by u.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $$;

-- ── ban / unban ──────────────────────────────────────────────────────────────
create or replace function public.admin_ban(p_user uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.admin_guard();
  if p_user = auth.uid() then raise exception 'cannot_ban_self'; end if;
  insert into public.banned_users (user_id, reason) values (p_user, nullif(trim(p_reason), ''))
    on conflict (user_id) do update set reason = excluded.reason, banned_at = now();
  update auth.users set banned_until = 'infinity' where id = p_user;
  delete from auth.sessions where user_id = p_user;        -- refresh tokens go with them
  delete from public.notes where user_id = p_user;
  perform public.admin_log('ban', p_user, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_unban(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.admin_guard();
  delete from public.banned_users where user_id = p_user;
  update auth.users set banned_until = null where id = p_user;
  perform public.admin_log('unban', p_user, null);
end $$;

-- ── delete account ───────────────────────────────────────────────────────────
-- Removes the user and everything that hangs from it (FK cascades: profile,
-- rooms, notes, favorites given and received, views…). Its files have no
-- reference left, so the daily storage-gc deletes them (after 24 h).
create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare h text;
begin
  perform public.admin_guard();
  if p_user = auth.uid() then raise exception 'cannot_delete_self'; end if;
  if exists (select 1 from public.admins where user_id = p_user) then raise exception 'cannot_delete_admin'; end if;
  select handle into h from public.profiles where user_id = p_user;
  perform public.admin_log('delete', p_user, jsonb_build_object('email', (select email from auth.users where id = p_user)));
  delete from public.canvas_ops where user_id = p_user;    -- its FK has no cascade
  delete from auth.users where id = p_user;
end $$;

-- ── rename ───────────────────────────────────────────────────────────────────
create or replace function public.admin_rename(p_user uuid, p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare h text := lower(trim(p_handle)); old text;
begin
  perform public.admin_guard();
  if h !~ '^[a-z0-9_-]{3,20}$' or h like 'temp\_%'
     or h = any (array['login','dashboard','auth','api','admin','settings','myland','browse','setup','space','reset-password','landing']) then
    raise exception 'invalid_handle';
  end if;
  select handle into old from public.profiles where user_id = p_user;
  if old is null then raise exception 'no_profile'; end if;
  if exists (select 1 from public.profiles where handle = h and user_id <> p_user) then raise exception 'handle_taken'; end if;
  update public.profiles set handle = h where user_id = p_user;
  perform public.admin_log('rename', p_user, jsonb_build_object('from', old, 'to', h));
end $$;

-- ── moderation ───────────────────────────────────────────────────────────────
create or replace function public.admin_delete_note(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard();
  perform public.admin_log('delete_note', p_user, (select jsonb_build_object('body', body) from public.notes where user_id = p_user limit 1));
  delete from public.notes where user_id = p_user;
end $$;

create or replace function public.admin_reports(p_limit int default 100)
returns table (id bigint, created_at timestamptz, handle text, email text, message text, page text, user_agent text)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  perform public.admin_guard();
  return query
  select r.id, r.created_at, p.handle, au.email::text, r.message, r.page, r.user_agent
  from public.bug_reports r
  left join public.profiles p on p.user_id = r.user_id
  left join auth.users au on au.id = r.user_id
  order by r.created_at desc limit greatest(1, least(p_limit, 500));
end $$;

create or replace function public.admin_action_log(p_limit int default 100)
returns setof public.admin_actions
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return query select * from public.admin_actions order by at desc limit greatest(1, least(p_limit, 500));
end $$;

-- ── events (own analytics) ───────────────────────────────────────────────────
create table if not exists public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  name text not null,
  actor text not null,          -- device key (same device before and after logging in)
  user_id uuid,                 -- when signed in
  path text,
  props jsonb
);
create index if not exists events_at_idx on public.events (at);
create index if not exists events_name_at_idx on public.events (name, at);
alter table public.events enable row level security; -- no policies: written by track(), read by admin_metrics()

create table if not exists public.activity_days (
  actor text not null,
  day date not null,
  user_id uuid,
  primary key (actor, day)
);
create index if not exists activity_days_day_idx on public.activity_days (day);
create index if not exists activity_days_user_idx on public.activity_days (user_id, day) where user_id is not null;
alter table public.activity_days enable row level security;

create or replace function public.track(p_name text, p_actor text, p_path text default null, p_props jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if p_name is null or p_name not in (
    'visit', 'landing_view', 'claim_click', 'login_view', 'signup_submit', 'signup_google', 'login_done',
    'setup_view', 'setup_done', 'editor_open', 'tour_done', 'tour_skip', 'publish',
    'note_post', 'favorite_add', 'favorite_remove', 'share_open', 'share_save', 'share_copy_link',
    'search', 'profile_view', 'bug_report'
  ) then return; end if;
  if p_actor is null or length(p_actor) < 8 or length(p_actor) > 64 then return; end if;
  if p_props is not null and length(p_props::text) > 600 then p_props := null; end if;
  if p_path is not null then p_path := left(p_path, 120); end if;
  if p_name = 'visit' then
    insert into public.activity_days (actor, day, user_id) values (p_actor, d, auth.uid())
      on conflict (actor, day) do update set user_id = coalesce(public.activity_days.user_id, excluded.user_id);
    return; -- a visit is only "active today", not an event row
  end if;
  insert into public.events (name, actor, user_id, path, props) values (p_name, p_actor, auth.uid(), p_path, p_props);
end $$;
grant execute on function public.track(text, text, text, jsonb) to anon, authenticated;

-- ── metrics for the panel ────────────────────────────────────────────────────
create or replace function public.admin_metrics(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  r jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'real_profiles', (select count(*) from public.profiles where onboarding_completed and handle not like 'temp\_%'),
      'banned', (select count(*) from public.banned_users),
      'new_in_range', (select count(*) from auth.users where created_at >= since),
      'notes_active', (select count(*) from public.notes where expires_at > now()),
      'favorites', (select count(*) from public.favorites),
      'views_in_range', (select count(*) from public.profile_views where viewed_at >= since)
    ),
    'active', jsonb_build_object(
      'dau', (select count(*) from public.activity_days where day = today),
      'wau', (select count(distinct actor) from public.activity_days where day > today - 7),
      'mau', (select count(distinct actor) from public.activity_days where day > today - 30),
      'dau_users', (select count(distinct user_id) from public.activity_days where day = today and user_id is not null),
      'wau_users', (select count(distinct user_id) from public.activity_days where day > today - 7 and user_id is not null),
      'mau_users', (select count(distinct user_id) from public.activity_days where day > today - 30 and user_id is not null)
    ),
    'daily', (select coalesce(jsonb_agg(x order by x.day), '[]') from (
      select g.day::date as day,
        (select count(*) from public.activity_days a where a.day = g.day) as active,
        (select count(*) from public.activity_days a where a.day = g.day and a.user_id is not null) as active_users,
        (select count(*) from auth.users u where (u.created_at at time zone 'America/Argentina/Buenos_Aires')::date = g.day) as signups,
        (select count(*) from public.profile_views v where (v.viewed_at at time zone 'America/Argentina/Buenos_Aires')::date = g.day) as views
      from generate_series(today - (greatest(1, least(p_days, 365)) - 1), today, interval '1 day') g(day)
    ) x),
    -- distinct devices that reached each step in the range
    'funnel', (select coalesce(jsonb_agg(jsonb_build_object('step', s.step, 'n', s.n) order by s.ord), '[]') from (
      select f.ord, f.step, (select count(distinct e.actor) from public.events e where e.name = f.step and e.at >= since) as n
      from (values (1,'landing_view'),(2,'claim_click'),(3,'login_view'),(4,'signup_submit'),(5,'setup_done'),
                   (6,'editor_open'),(7,'tour_done'),(8,'publish')) f(ord, step)
    ) s),
    'events', (select coalesce(jsonb_object_agg(name, n), '{}') from (
      select name, count(*) as n from public.events where at >= since group by name
    ) e),
    -- weekly cohorts by sign-up week: % of them signed in and active N weeks later
    'retention', (with co as (
        select id, date_trunc('week', created_at) as wk from auth.users
        where created_at >= date_trunc('week', now()) - interval '9 weeks'),
      cell as (
        select co.wk, w.n, count(distinct a.user_id) as act
        from co cross join generate_series(1, 4) w(n)
        left join public.activity_days a on a.user_id = co.id
          and a.day >= (co.wk + make_interval(weeks => w.n))::date
          and a.day <  (co.wk + make_interval(weeks => w.n + 1))::date
        where co.wk + make_interval(weeks => w.n) <= now()
        group by co.wk, w.n),
      sz as (select wk, count(*) as size from co group by wk)
      select coalesce(jsonb_agg(jsonb_build_object('week', sz.wk::date, 'size', sz.size,
        'weeks', (select coalesce(jsonb_agg(round(100.0 * cell.act / sz.size) order by cell.n), '[]'::jsonb)
                  from cell where cell.wk = sz.wk)) order by sz.wk), '[]'::jsonb) from sz),
    'top_profiles', (select coalesce(jsonb_agg(t), '[]') from (
      select p.handle, count(*) as views from public.profile_views v join public.profiles p on p.user_id = v.profile_user_id
      where v.viewed_at >= since group by p.handle order by count(*) desc limit 10
    ) t),
    'storage', jsonb_build_object(
      'db', pg_database_size(current_database()),
      'events', pg_total_relation_size('public.events'),
      'activity', pg_total_relation_size('public.activity_days'),
      'files', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects where bucket_id = 'canvas-assets'),
      'file_count', (select count(*) from storage.objects where bucket_id = 'canvas-assets')
    )
  ) into r;
  return r;
end $$;

-- Only signed-in callers reach the admin functions (and then admin_guard()).
do $$ declare f text; begin
  foreach f in array array[
    'admin_users(text,int,int)', 'admin_ban(uuid,text)', 'admin_unban(uuid)', 'admin_delete_user(uuid)',
    'admin_rename(uuid,text)', 'admin_delete_note(uuid)', 'admin_reports(int)', 'admin_action_log(int)',
    'admin_metrics(int)', 'admin_guard()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ── keep it small ────────────────────────────────────────────────────────────
do $$ begin
  perform cron.unschedule('metrics-gc') where exists (select 1 from cron.job where jobname = 'metrics-gc');
  perform cron.schedule('metrics-gc', '41 6 * * *', $job$
    delete from public.events where at < now() - interval '90 days';
    delete from public.activity_days where day < current_date - 400;
  $job$);
end $$;

-- ── the owner ────────────────────────────────────────────────────────────────
insert into public.admins (user_id)
  select user_id from public.profiles where handle = 'nico'
  on conflict do nothing;
