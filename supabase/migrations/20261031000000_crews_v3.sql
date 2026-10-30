-- Crews v3 (2026-10-31): open circles for creators and the people who gather
-- others. Unlimited members and crews; a founder (owner) and admins; kick and
-- block; 24-hour notices (public or members only) that reach members as a
-- message on their dashboard; up to 10 crews pinned to the editor's rail;
-- a 2–4 character TAG; a second font; pinned links.
--
-- Builds on 20261029000000_crews.sql (every write still goes through a
-- SECURITY DEFINER function that checks the caller). To undo only this step:
-- supabase/rollback/crews_v3_down.sql.

-- ── Columns ─────────────────────────────────────────────────────────────────

alter table public.crews
  add column if not exists tag       text,
  add column if not exists body_font text,
  add column if not exists links     jsonb not null default '[]'::jsonb;
alter table public.crews drop constraint if exists crews_tag_check;
alter table public.crews add constraint crews_tag_check check (tag is null or tag ~ '^[A-Z0-9]{2,4}$');
alter table public.crews drop constraint if exists crews_body_font_check;
alter table public.crews add constraint crews_body_font_check check (body_font is null or char_length(body_font) between 1 and 40);
alter table public.crews drop constraint if exists crews_links_check;
alter table public.crews add constraint crews_links_check check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 6);
create unique index if not exists crews_tag_key on public.crews (tag) where tag is not null;

alter table public.crew_members
  add column if not exists role   text    not null default 'member',
  add column if not exists pinned boolean not null default false;
alter table public.crew_members drop constraint if exists crew_members_role_check;
alter table public.crew_members add constraint crew_members_role_check check (role in ('member', 'admin'));
create index if not exists crew_members_pinned_idx on public.crew_members (user_id) where pinned;
-- Whoever was already in a crew keeps it handy (the rail shows up to 10).
update public.crew_members m set pinned = true
from (
  select crew_id, user_id, row_number() over (partition by user_id order by joined_at) as n
  from public.crew_members
) x
where x.crew_id = m.crew_id and x.user_id = m.user_id and x.n <= 10 and not m.pinned;

-- Blocked people (no policy: only the functions read it).
create table if not exists public.crew_bans (
  crew_id   uuid not null references public.crews(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  banned_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
alter table public.crew_bans enable row level security;

-- Notices: 24 hours each.
create table if not exists public.crew_posts (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 280),
  link       text check (link is null or (char_length(link) <= 300 and link ~ '^https://')),
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists crew_posts_crew_idx on public.crew_posts (crew_id, created_at desc);
create index if not exists crew_posts_expires_idx on public.crew_posts (expires_at);
alter table public.crew_posts enable row level security;
-- No policy: posts are read through crew_house / crew_inbox, which apply
-- "public or member" and "not expired".

-- Who already read (or closed) a notice.
create table if not exists public.crew_post_reads (
  post_id uuid not null references public.crew_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.crew_post_reads enable row level security;

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- 'owner' | 'admin' | 'member' | null.
create or replace function public.crew_role_of(p_crew uuid, p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.crews c where c.id = p_crew and c.owner_id = p_user) then 'owner'
    else (select m.role from public.crew_members m where m.crew_id = p_crew and m.user_id = p_user)
  end
$$;

create or replace function public.crew_is_admin(p_crew uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.crew_role_of(p_crew, auth.uid()) in ('owner', 'admin'), false)
$$;

-- Pinned links: [{ "label": "YouTube", "url": "https://..." }], up to 6.
create or replace function public.crew_links_ok(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or (
    jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 6 and not exists (
      select 1 from jsonb_array_elements(p) e
      where jsonb_typeof(e) <> 'object'
         or char_length(btrim(coalesce(e->>'label', ''))) not between 1 and 30
         or char_length(coalesce(e->>'url', '')) > 300
         or coalesce(e->>'url', '') !~ '^https://[^[:space:]]+\.[^[:space:]]+$'
    )
  )
$$;

-- ── Create / edit / delete ──────────────────────────────────────────────────

create or replace function public.crew_create(p_slug text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'auth'; end if;
  -- Anyone may join any number of crews; founding is capped (no spam).
  if (select count(*) from public.crews where owner_id = v_uid) >= 10 then raise exception 'max_owned'; end if;
  if p_slug !~ '^[a-z0-9_-]{3,24}$' then raise exception 'bad_slug'; end if;
  if exists (select 1 from public.crews where slug = p_slug) then raise exception 'slug_taken'; end if;
  insert into public.crews (slug, name, owner_id, next_number) values (p_slug, btrim(p_name), v_uid, 2) returning id into v_id;
  insert into public.crew_members (crew_id, user_id, number, pinned)
  values (v_id, v_uid, 1, (select count(*) from public.crew_members where user_id = v_uid and pinned) < 10);
  insert into public.crew_invites (crew_id, code) values (v_id, public.crew_new_code());
  return v_id;
end $$;

create or replace function public.crew_update(p_id uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tag text;
begin
  if not public.crew_is_admin(p_id) then raise exception 'forbidden'; end if;
  if not public.crew_asset_ok(p->>'emblem_url') or not public.crew_asset_ok(p->>'bg_image') or not public.crew_asset_ok(p->>'music_url') then
    raise exception 'bad_asset';
  end if;
  if not public.crew_discord_ok(p->>'discord_url') then raise exception 'bad_discord'; end if;
  if p ? 'links' and not public.crew_links_ok(p->'links') then raise exception 'bad_links'; end if;
  if p ? 'tag' then
    v_tag := nullif(upper(btrim(coalesce(p->>'tag', ''))), '');
    if v_tag is not null and v_tag !~ '^[A-Z0-9]{2,4}$' then raise exception 'bad_tag'; end if;
    if v_tag is not null and exists (select 1 from public.crews where tag = v_tag and id <> p_id) then raise exception 'tag_taken'; end if;
  end if;
  update public.crews set
    name        = case when p ? 'name'        then btrim(p->>'name')                 else name end,
    motto       = case when p ? 'motto'       then coalesce(p->>'motto', '')         else motto end,
    emblem_url  = case when p ? 'emblem_url'  then nullif(p->>'emblem_url', '')      else emblem_url end,
    color       = case when p ? 'color'       then p->>'color'                       else color end,
    font        = case when p ? 'font'        then p->>'font'                        else font end,
    body_font   = case when p ? 'body_font'   then nullif(p->>'body_font', '')       else body_font end,
    bg_color    = case when p ? 'bg_color'    then p->>'bg_color'                    else bg_color end,
    bg_image    = case when p ? 'bg_image'    then nullif(p->>'bg_image', '')        else bg_image end,
    music_url   = case when p ? 'music_url'   then nullif(p->>'music_url', '')       else music_url end,
    discord_url = case when p ? 'discord_url' then nullif(p->>'discord_url', '')     else discord_url end,
    links       = case when p ? 'links'       then coalesce(p->'links', '[]'::jsonb) else links end,
    tag         = case when p ? 'tag'         then v_tag                             else tag end,
    updated_at  = now()
  where id = p_id;
exception when unique_violation then
  raise exception 'tag_taken';
end $$;

-- crew_delete stays owner-only (20261029000000).

create or replace function public.crew_invite_code(p_id uuid, p_renew boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not public.crew_is_admin(p_id) then raise exception 'forbidden'; end if;
  if p_renew then
    update public.crew_invites set code = public.crew_new_code() where crew_id = p_id;
  end if;
  select code into v_code from public.crew_invites where crew_id = p_id;
  return v_code;
end $$;

-- ── Members: roles, kick, block ─────────────────────────────────────────────

-- May the caller act on p_user (kick / block)? Admins act on members; only
-- the founder acts on admins; nobody on the founder.
create or replace function public.crew_can_moderate(p_id uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.crew_role_of(p_id, auth.uid())
    when 'owner' then p_user <> auth.uid()
    when 'admin' then coalesce(public.crew_role_of(p_id, p_user), 'member') = 'member' and p_user <> auth.uid()
    else false
  end
$$;

create or replace function public.crew_kick(p_id uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.crew_can_moderate(p_id, p_user) then raise exception 'forbidden'; end if;
  delete from public.crew_members where crew_id = p_id and user_id = p_user;
end $$;

create or replace function public.crew_ban(p_id uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.crew_can_moderate(p_id, p_user) then raise exception 'forbidden'; end if;
  delete from public.crew_members where crew_id = p_id and user_id = p_user;
  insert into public.crew_bans (crew_id, user_id) values (p_id, p_user) on conflict do nothing;
end $$;

create or replace function public.crew_unban(p_id uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.crew_is_admin(p_id) then raise exception 'forbidden'; end if;
  delete from public.crew_bans where crew_id = p_id and user_id = p_user;
end $$;

create or replace function public.crew_bans_list(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.crew_is_admin(p_id) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', b.user_id, 'handle', p.handle, 'display_name', p.display_name, 'banned_at', b.banned_at)
                     order by b.banned_at desc)
    from public.crew_bans b left join public.profiles p on p.user_id = b.user_id
    where b.crew_id = p_id
  ), '[]'::jsonb);
end $$;

-- Only the founder names or removes admins.
create or replace function public.crew_set_role(p_id uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.crew_role_of(p_id, auth.uid()) is distinct from 'owner' then raise exception 'forbidden'; end if;
  if p_role not in ('member', 'admin') then raise exception 'bad_role'; end if;
  if p_user = auth.uid() then raise exception 'owner'; end if;
  update public.crew_members set role = p_role where crew_id = p_id and user_id = p_user;
  if not found then raise exception 'not_member'; end if;
end $$;

-- ── Join / leave / pin ──────────────────────────────────────────────────────

create or replace function public.crew_join(p_slug text, p_code text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_crew public.crews%rowtype;
  v_num integer;
begin
  if v_uid is null then raise exception 'auth'; end if;
  -- One join at a time per crew: member numbers stay exact.
  select * into v_crew from public.crews where slug = p_slug for update;
  if not found then raise exception 'not_found'; end if;
  select number into v_num from public.crew_members where crew_id = v_crew.id and user_id = v_uid;
  if found then return v_num; end if;
  if exists (select 1 from public.crew_bans where crew_id = v_crew.id and user_id = v_uid) then raise exception 'banned'; end if;
  if not exists (select 1 from public.crew_invites where crew_id = v_crew.id and code = p_code) then raise exception 'bad_code'; end if;
  v_num := v_crew.next_number;
  update public.crews set next_number = next_number + 1 where id = v_crew.id;
  insert into public.crew_members (crew_id, user_id, number, pinned)
  values (v_crew.id, v_uid, v_num, (select count(*) from public.crew_members where user_id = v_uid and pinned) < 10);
  return v_num;
end $$;

-- crew_leave stays (the founder can't leave; they delete the crew).

create or replace function public.crew_pin(p_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if p_on and (select count(*) from public.crew_members where user_id = auth.uid() and pinned and crew_id <> p_id) >= 10 then
    raise exception 'max_pins';
  end if;
  update public.crew_members set pinned = p_on where crew_id = p_id and user_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
end $$;

-- ── Notices ─────────────────────────────────────────────────────────────────

create or replace function public.crew_post_create(p_id uuid, p_body text, p_link text, p_public boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_link text := nullif(btrim(coalesce(p_link, '')), '');
  v_id uuid;
begin
  if not public.crew_is_admin(p_id) then raise exception 'forbidden'; end if;
  if char_length(v_body) not between 1 and 280 then raise exception 'bad_body'; end if;
  -- Line breaks count as characters, and at most 6 lines.
  if array_length(regexp_split_to_array(v_body, E'\n'), 1) > 6 then raise exception 'too_many_lines'; end if;
  if v_link is not null and (char_length(v_link) > 300 or v_link !~ '^https://[^[:space:]]+$') then raise exception 'bad_link'; end if;
  if (select count(*) from public.crew_posts where crew_id = p_id and expires_at > now()) >= 10 then raise exception 'max_posts'; end if;
  insert into public.crew_posts (crew_id, author_id, body, link, is_public)
  values (p_id, auth.uid(), v_body, v_link, coalesce(p_public, false)) returning id into v_id;
  -- The author already "read" it (no message to themselves).
  insert into public.crew_post_reads (post_id, user_id) values (v_id, auth.uid());
  return v_id;
end $$;

create or replace function public.crew_post_delete(p_post uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_crew uuid;
begin
  select crew_id into v_crew from public.crew_posts where id = p_post;
  if v_crew is null then return; end if;
  if not public.crew_is_admin(v_crew) then raise exception 'forbidden'; end if;
  delete from public.crew_posts where id = p_post;
end $$;

create or replace function public.crew_mark_read(p_posts uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  insert into public.crew_post_reads (post_id, user_id)
  select p.id, auth.uid() from public.crew_posts p
  where p.id = any(p_posts)
    and exists (select 1 from public.crew_members m where m.crew_id = p.crew_id and m.user_id = auth.uid())
  on conflict do nothing;
end $$;

-- The caller's unread notices from their pinned crews (the dashboard messages).
create or replace function public.crew_inbox()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) from (
    select p.created_at, jsonb_build_object(
      'id', p.id, 'body', p.body, 'link', p.link, 'is_public', p.is_public,
      'created_at', p.created_at, 'expires_at', p.expires_at,
      'crew', jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color,
                                 'font', c.font, 'body_font', c.body_font, 'emblem_url', c.emblem_url, 'tag', c.tag)
    ) as j
    from public.crew_members m
    join public.crews c on c.id = m.crew_id
    join public.crew_posts p on p.crew_id = m.crew_id
    where m.user_id = auth.uid() and m.pinned and p.expires_at > now()
      and not exists (select 1 from public.crew_post_reads r where r.post_id = p.id and r.user_id = auth.uid())
    order by p.created_at desc
    limit 30
  ) x
$$;

-- ── Reads ───────────────────────────────────────────────────────────────────

-- A member as the house shows them (with the card they published, only for
-- public rooms, as the profile page itself).
create or replace function public.crew_member_json(p_owner uuid, p_user uuid, p_number integer, p_role text, p_joined timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', p_user, 'number', p_number, 'joined_at', p_joined,
    'role', case when p_user = p_owner then 'owner' else p_role end,
    'handle', p.handle, 'display_name', p.display_name,
    'card', (select coalesce(v.data->'published'->'profiles'->0, v.data->'profiles'->0)
             from public.canvases v where v.user_id = p_user and v.type = 'space' and v.is_public
             order by v.created_at limit 1))
  from public.profiles p where p.user_id = p_user
$$;

-- The house: the crew, how many members, the first ones (founder, admins,
-- then by arrival), the notices the viewer may see and the viewer's place.
create or replace function public.crew_house(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with c as (select * from public.crews where slug = p_slug),
  me as (select m.* from public.crew_members m, c where m.crew_id = c.id and m.user_id = auth.uid())
  select jsonb_build_object(
    'crew', to_jsonb(c) - 'next_number' - 'notice',
    'member_count', (select count(*) from public.crew_members m where m.crew_id = c.id),
    'me', (select jsonb_build_object('number', me.number, 'pinned', me.pinned,
                                      'role', case when me.user_id = c.owner_id then 'owner' else me.role end) from me),
    'members', coalesce((
      select jsonb_agg(public.crew_member_json(c.owner_id, x.user_id, x.number, x.role, x.joined_at) order by x.rk, x.number)
      from (
        select m.user_id, m.number, m.role, m.joined_at,
               case when m.user_id = c.owner_id then 0 when m.role = 'admin' then 1 else 2 end as rk
        from public.crew_members m
        join public.profiles p on p.user_id = m.user_id
        where m.crew_id = c.id and p.onboarding_completed is not false and p.handle not like 'temp\_%'
        order by rk, m.number
        limit 12
      ) x
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'body', p.body, 'link', p.link, 'is_public', p.is_public,
                                          'created_at', p.created_at, 'expires_at', p.expires_at,
                                          'author', (select pr.handle from public.profiles pr where pr.user_id = p.author_id))
                       order by p.created_at desc)
      from public.crew_posts p
      where p.crew_id = c.id and p.expires_at > now() and (p.is_public or exists (select 1 from me))
    ), '[]'::jsonb)
  )
  from c
$$;

-- The Members tab: 30 at a time, by arrival or by role, with a search.
create or replace function public.crew_members_page(p_slug text, p_q text default '', p_order text default 'joined', p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with c as (select * from public.crews where slug = p_slug),
  q as (select lower(btrim(regexp_replace(coalesce(p_q, ''), '^@', ''))) as s)
  select coalesce((
    select jsonb_agg(public.crew_member_json(c.owner_id, x.user_id, x.number, x.role, x.joined_at) order by x.rk, x.number)
    from (
      select m.user_id, m.number, m.role, m.joined_at,
             case when p_order = 'role' then (case when m.user_id = c.owner_id then 0 when m.role = 'admin' then 1 else 2 end) else 0 end as rk
      from c, q, public.crew_members m
      join public.profiles p on p.user_id = m.user_id
      where m.crew_id = c.id and p.onboarding_completed is not false and p.handle not like 'temp\_%'
        and (q.s = '' or lower(p.handle) like '%' || q.s || '%' or lower(coalesce(p.display_name, '')) like '%' || q.s || '%')
      order by rk, m.number
      offset greatest(0, p_offset) limit 30
    ) x, c
  ), '[]'::jsonb)
$$;

-- The caller's crews (the "Tus crews" list and the rail).
create or replace function public.crew_mine()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'crew', to_jsonb(c) - 'next_number' - 'notice',
    'number', m.number, 'pinned', m.pinned,
    'role', case when m.user_id = c.owner_id then 'owner' else m.role end,
    'members', (select count(*) from public.crew_members x where x.crew_id = c.id)
  ) order by m.joined_at), '[]'::jsonb)
  from public.crew_members m join public.crews c on c.id = m.crew_id
  where m.user_id = auth.uid()
$$;

-- The invite screen: no notices.
create or replace function public.crew_pact(p_slug text, p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'crew', to_jsonb(c) - 'next_number' - 'notice',
    'valid', exists (select 1 from public.crew_invites i where i.crew_id = c.id and i.code = p_code),
    'members', (select count(*) from public.crew_members m where m.crew_id = c.id),
    'mine', (select m.number from public.crew_members m where m.crew_id = c.id and m.user_id = auth.uid()),
    'banned', exists (select 1 from public.crew_bans b where b.crew_id = c.id and b.user_id = auth.uid()))
  from public.crews c where c.slug = p_slug
$$;

-- ── Permissions ─────────────────────────────────────────────────────────────

revoke all on function public.crew_role_of(uuid, uuid), public.crew_is_admin(uuid), public.crew_can_moderate(uuid, uuid),
  public.crew_member_json(uuid, uuid, integer, text, timestamptz) from public, anon, authenticated;
revoke all on function public.crew_update(uuid, jsonb), public.crew_invite_code(uuid, boolean), public.crew_kick(uuid, uuid),
  public.crew_ban(uuid, uuid), public.crew_unban(uuid, uuid), public.crew_bans_list(uuid), public.crew_set_role(uuid, uuid, text),
  public.crew_join(text, text), public.crew_pin(uuid, boolean), public.crew_post_create(uuid, text, text, boolean),
  public.crew_post_delete(uuid), public.crew_mark_read(uuid[]), public.crew_inbox(), public.crew_mine(),
  public.crew_create(text, text) from public, anon;
grant execute on function public.crew_update(uuid, jsonb), public.crew_invite_code(uuid, boolean), public.crew_kick(uuid, uuid),
  public.crew_ban(uuid, uuid), public.crew_unban(uuid, uuid), public.crew_bans_list(uuid), public.crew_set_role(uuid, uuid, text),
  public.crew_join(text, text), public.crew_pin(uuid, boolean), public.crew_post_create(uuid, text, text, boolean),
  public.crew_post_delete(uuid), public.crew_mark_read(uuid[]), public.crew_inbox(), public.crew_mine(),
  public.crew_create(text, text) to authenticated;
grant execute on function public.crew_house(text), public.crew_members_page(text, text, text, integer), public.crew_pact(text, text),
  public.crew_links_ok(jsonb) to anon, authenticated;

-- ── Expired notices go away (hourly) ────────────────────────────────────────
create extension if not exists pg_cron;
select cron.unschedule('crew-posts-gc') where exists (select 1 from cron.job where jobname = 'crew-posts-gc');
select cron.schedule('crew-posts-gc', '41 * * * *', $cron$ delete from public.crew_posts where expires_at < now() $cron$);
