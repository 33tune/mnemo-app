-- Crews (2026-10-29): closed circles with their own public house
-- (myland.lol/c/<slug>), joined only by invite link ("el Pacto"); each
-- member gets a number in join order and may feature one crew on their card.
--
-- Self-contained: every crew object lives here (tables crews, crew_members,
-- crew_invites and the crew_* functions). Every write goes through a
-- SECURITY DEFINER function that checks the caller; the tables only allow
-- reading (the invite codes not even that). To remove the feature:
-- supabase/rollback/crews_down.sql.

create table public.crews (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9_-]{3,24}$'),
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  motto       text not null default '' check (char_length(motto) <= 120),
  notice      text not null default '' check (char_length(notice) <= 280),
  emblem_url  text,
  color       text not null default '#FF4F94' check (color ~ '^#[0-9a-fA-F]{6}$'),
  font        text not null default 'Unbounded' check (char_length(font) between 1 and 40),
  bg_color    text not null default '#0E0C12' check (bg_color ~ '^#[0-9a-fA-F]{6}$'),
  bg_image    text,
  music_url   text,
  discord_url text,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  next_number integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.crew_members (
  crew_id    uuid not null references public.crews(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  number     integer not null,
  joined_at  timestamptz not null default now(),
  featured   boolean not null default false,
  badge_x    real not null default 0.5 check (badge_x between 0 and 1),
  badge_y    real not null default 1   check (badge_y between 0 and 1),
  badge_size real not null default 1   check (badge_size between 0.6 and 2),
  primary key (crew_id, user_id),
  unique (crew_id, number)
);
create index crew_members_user_idx on public.crew_members (user_id);
create unique index crew_members_one_featured on public.crew_members (user_id) where featured;

-- Separate so the public can read crews without ever seeing the code.
create table public.crew_invites (
  crew_id uuid primary key references public.crews(id) on delete cascade,
  code    text not null
);

alter table public.crews        enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_invites enable row level security;
create policy crews_read        on public.crews        for select using (true);
create policy crew_members_read on public.crew_members for select using (true);
-- crew_invites: no policy at all (only the functions below read it).

-- ── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.crew_new_code() returns text
language sql volatile set search_path = '' as $$
  select substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', 'xyz'), 1, 14)
$$;

-- Only files of this project's bucket (no outside images on teens' pages).
create or replace function public.crew_asset_ok(u text) returns boolean
language sql immutable set search_path = '' as $$
  select u is null or u = '' or u like 'https://xfefrruwyrhkiijrhxtp.supabase.co/storage/v1/object/public/canvas-assets/%'
$$;

create or replace function public.crew_discord_ok(u text) returns boolean
language sql immutable set search_path = '' as $$
  select u is null or u = '' or u ~ '^https://(www\.)?(discord\.gg|discord\.com/invite)/[A-Za-z0-9_-]{2,40}/?$'
$$;

-- ── Owner: create / edit / delete ───────────────────────────────────────────

create or replace function public.crew_create(p_slug text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'auth'; end if;
  if (select count(*) from public.crew_members where user_id = v_uid) >= 3 then raise exception 'max_crews'; end if;
  if p_slug !~ '^[a-z0-9_-]{3,24}$' then raise exception 'bad_slug'; end if;
  if exists (select 1 from public.crews where slug = p_slug) then raise exception 'slug_taken'; end if;
  insert into public.crews (slug, name, owner_id, next_number) values (p_slug, btrim(p_name), v_uid, 2) returning id into v_id;
  insert into public.crew_members (crew_id, user_id, number) values (v_id, v_uid, 1);
  insert into public.crew_invites (crew_id, code) values (v_id, public.crew_new_code());
  return v_id;
end $$;

create or replace function public.crew_update(p_id uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.crews where id = p_id and owner_id = auth.uid()) then raise exception 'forbidden'; end if;
  if not public.crew_asset_ok(p->>'emblem_url') or not public.crew_asset_ok(p->>'bg_image') or not public.crew_asset_ok(p->>'music_url') then
    raise exception 'bad_asset';
  end if;
  if not public.crew_discord_ok(p->>'discord_url') then raise exception 'bad_discord'; end if;
  update public.crews set
    name        = case when p ? 'name'        then btrim(p->>'name')                 else name end,
    motto       = case when p ? 'motto'       then coalesce(p->>'motto', '')         else motto end,
    notice      = case when p ? 'notice'      then coalesce(p->>'notice', '')        else notice end,
    emblem_url  = case when p ? 'emblem_url'  then nullif(p->>'emblem_url', '')      else emblem_url end,
    color       = case when p ? 'color'       then p->>'color'                       else color end,
    font        = case when p ? 'font'        then p->>'font'                        else font end,
    bg_color    = case when p ? 'bg_color'    then p->>'bg_color'                    else bg_color end,
    bg_image    = case when p ? 'bg_image'    then nullif(p->>'bg_image', '')        else bg_image end,
    music_url   = case when p ? 'music_url'   then nullif(p->>'music_url', '')       else music_url end,
    discord_url = case when p ? 'discord_url' then nullif(p->>'discord_url', '')     else discord_url end,
    updated_at  = now()
  where id = p_id;
end $$;

create or replace function public.crew_delete(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.crews where id = p_id and owner_id = auth.uid();
  if not found then raise exception 'forbidden'; end if;
end $$;

create or replace function public.crew_invite_code(p_id uuid, p_renew boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not exists (select 1 from public.crews where id = p_id and owner_id = auth.uid()) then raise exception 'forbidden'; end if;
  if p_renew then
    update public.crew_invites set code = public.crew_new_code() where crew_id = p_id;
  end if;
  select code into v_code from public.crew_invites where crew_id = p_id;
  return v_code;
end $$;

create or replace function public.crew_kick(p_id uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.crews where id = p_id and owner_id = auth.uid()) then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'owner'; end if;
  delete from public.crew_members where crew_id = p_id and user_id = p_user;
end $$;

-- ── Members: join (el Pacto) / leave / feature ──────────────────────────────

create or replace function public.crew_join(p_slug text, p_code text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_crew public.crews%rowtype;
  v_num integer;
begin
  if v_uid is null then raise exception 'auth'; end if;
  -- One join at a time per crew: numbers and the 30 cap stay exact.
  select * into v_crew from public.crews where slug = p_slug for update;
  if not found then raise exception 'not_found'; end if;
  select number into v_num from public.crew_members where crew_id = v_crew.id and user_id = v_uid;
  if found then return v_num; end if;
  if not exists (select 1 from public.crew_invites where crew_id = v_crew.id and code = p_code) then raise exception 'bad_code'; end if;
  if (select count(*) from public.crew_members where crew_id = v_crew.id) >= 30 then raise exception 'crew_full'; end if;
  if (select count(*) from public.crew_members where user_id = v_uid) >= 3 then raise exception 'max_crews'; end if;
  v_num := v_crew.next_number;
  update public.crews set next_number = next_number + 1 where id = v_crew.id;
  insert into public.crew_members (crew_id, user_id, number) values (v_crew.id, v_uid, v_num);
  return v_num;
end $$;

create or replace function public.crew_leave(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.crews where id = p_id and owner_id = auth.uid()) then raise exception 'owner'; end if;
  delete from public.crew_members where crew_id = p_id and user_id = auth.uid();
end $$;

-- p_id null = feature none.
create or replace function public.crew_feature(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  update public.crew_members set featured = false where user_id = auth.uid() and featured and crew_id is distinct from p_id;
  if p_id is not null then
    update public.crew_members set featured = true where user_id = auth.uid() and crew_id = p_id;
    if not found then raise exception 'not_member'; end if;
  end if;
end $$;

create or replace function public.crew_set_badge(p_id uuid, p_x real, p_y real, p_size real)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.crew_members set
    badge_x = greatest(0, least(1, p_x)), badge_y = greatest(0, least(1, p_y)),
    badge_size = greatest(0.6, least(2, p_size))
  where crew_id = p_id and user_id = auth.uid();
end $$;

-- ── Reads ───────────────────────────────────────────────────────────────────

-- The house: the crew and its members, each with the card they published
-- (only for public rooms, as the profile page itself).
create or replace function public.crew_house(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'crew', to_jsonb(c) - 'next_number',
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'number', m.number, 'joined_at', m.joined_at,
        'handle', p.handle, 'display_name', p.display_name,
        'card', (select coalesce(v.data->'published'->'profiles'->0, v.data->'profiles'->0)
                 from public.canvases v where v.user_id = m.user_id and v.type = 'space' and v.is_public
                 order by v.created_at limit 1)
      ) order by m.number)
      from public.crew_members m
      join public.profiles p on p.user_id = m.user_id
      where m.crew_id = c.id and p.onboarding_completed is not false and p.handle not like 'temp\_%'
    ), '[]'::jsonb)
  )
  from public.crews c where c.slug = p_slug
$$;

-- The crew a user features on their card (null when none).
create or replace function public.crew_badge_of(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'crew_id', c.id, 'slug', c.slug, 'name', c.name, 'emblem_url', c.emblem_url,
    'color', c.color, 'font', c.font, 'number', m.number,
    'x', m.badge_x, 'y', m.badge_y, 'size', m.badge_size)
  from public.crew_members m join public.crews c on c.id = m.crew_id
  where m.user_id = p_user and m.featured
$$;

-- The pact screen: what the invite link shows before joining.
create or replace function public.crew_pact(p_slug text, p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'crew', to_jsonb(c) - 'next_number' - 'notice',
    'valid', exists (select 1 from public.crew_invites i where i.crew_id = c.id and i.code = p_code),
    'members', (select count(*) from public.crew_members m where m.crew_id = c.id),
    'mine', (select m.number from public.crew_members m where m.crew_id = c.id and m.user_id = auth.uid()))
  from public.crews c where c.slug = p_slug
$$;

revoke all on function public.crew_new_code() from public, anon, authenticated;
revoke all on function public.crew_create(text, text), public.crew_update(uuid, jsonb), public.crew_delete(uuid),
  public.crew_invite_code(uuid, boolean), public.crew_kick(uuid, uuid), public.crew_join(text, text),
  public.crew_leave(uuid), public.crew_feature(uuid), public.crew_set_badge(uuid, real, real, real) from public, anon;
grant execute on function public.crew_create(text, text), public.crew_update(uuid, jsonb), public.crew_delete(uuid),
  public.crew_invite_code(uuid, boolean), public.crew_kick(uuid, uuid), public.crew_join(text, text),
  public.crew_leave(uuid), public.crew_feature(uuid), public.crew_set_badge(uuid, real, real, real) to authenticated;
grant execute on function public.crew_house(text), public.crew_badge_of(uuid), public.crew_pact(text, text) to anon, authenticated;

-- ── Daily storage cleanup: crew files are in use too ────────────────────────
create or replace function public.storage_gc_candidates(p_secret text, p_limit integer default 500)
returns setof text language plpgsql stable security definer set search_path = '' as $function$
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
    union all select row_to_json(c)::text from public.crews c
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
