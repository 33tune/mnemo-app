-- Retención (2026-11-27, admin panel): compiled stats about how people use
-- myLand and who comes back. Only reads; admin_guard() on every function.
--
-- admin_retention(): one jsonb with
--   cohorts     — per sign-up day (30 days): people, came back the next day, within
--                 3, 7, 30 days (null while the window hasn't passed);
--   status      — every account by its last activity: active (≤ 3 days), at risk
--                 (4–7), gone (8–30), dead (> 30), never did anything;
--   stages      — how far each new account (30 days) got on its first day × came back;
--   predictors  — first-day facts and the return rate with / without each one;
--   back_do     — what returning people did on their later days;
--   features    — what people edit (7 days): ops grouped by part of the card / room;
--   features_back — the same split by people who came back vs not (30-day sign-ups);
--   exits       — the last thing before leaving (visit_end, 7 days); used = what visits use;
--   visits      — visit_end lengths (phone / computer);
--   arrivals    — where devices came from (14 days) and how many signed up;
--   social      — Explorar / muro / compartir events (7 days).
-- admin_user_trails(p_user): that person's last visits (visit_end).
--
-- "Activity" of an account = any of: a day marked active (activity_days), an
-- edit (canvas_ops), a measured visit (presence_sessions), a post (comments),
-- a favorite given. Days in Buenos Aires time.

create or replace function public.admin_edit_part(p_key text) returns text
language sql immutable as $$
  select case
    when p_key in ('photo') or p_key like 'photo%' or p_key like 'pfp%' then 'Foto'
    when p_key in ('name', 'handle', 'descriptor', 'location', 'bio', 'status', 'aboutText', 'showViews', 'showLocation') then 'Textos (contenido)'
    when p_key ~ '(Font|FontSize|Color|Weight|LineHeight|LetterSpacing|Align|Uppercase)$' or p_key in ('textAlign', 'textColor', 'textX', 'textY') then 'Textos (estilo)'
    when p_key in ('contactLinks') or p_key like 'links%' then 'Redes / íconos'
    when p_key like 'linkButton%' then 'Botones con link'
    when p_key = 'stickers' then 'Stickers'
    when p_key in ('w', 'h', 'format') then 'Tamaño de la card'
    when p_key ~ 'Anchor[XY]$' or p_key in ('x', 'y', 'blockLayout') then 'Acomodar'
    when p_key in ('commentsBox', 'wallEffects') or p_key like 'wall%' then 'Muro'
    when p_key = 'blockStyle' then 'Estilo de bloques'
    when p_key = 'logo' then 'Logo'
    when p_key in ('bgColor', 'bgImage', 'opacity', 'radius') then 'Fondo de la card'
    when p_key in ('blockWidths', 'blockStylePaused') then 'Estilo de bloques'
    when p_key = 'noteBox' then null
    else 'Otros'
  end $$;

create or replace function public.admin_effect_part(p_key text) returns text
language sql immutable as $$
  select case p_key
    when 'holo' then 'Efecto: Holo' when 'glare' then 'Efecto: Reflejo' when 'glitter' then 'Efecto: Glitter'
    when 'strass' then 'Efecto: Strass' when 'dust' then 'Efecto: Polvo' when 'aura' then 'Efecto: Aura'
    when 'edge' then 'Efecto: Canto' when 'motion' then 'Efecto: Animaciones' when 'entrance' then 'Efecto: Entrada'
    when 'retro' then 'Efecto: Retro' when 'glow' then 'Efecto: Brillo' when 'shadow' then 'Efecto: Sombra'
    when 'border' then 'Efecto: Borde' when 'float' then 'Efecto: Flotar'
    when 'animations' then 'Efecto: Flotar / latir' when 'interactions' then 'Efecto: Al tocar (inclinar, foco)'
    when 'depth' then 'Efecto: Foto con profundidad'
    when 'tilt' then 'Efecto: Al tocar (inclinar, foco)' when 'spotlight' then 'Efecto: Al tocar (inclinar, foco)'
    when 'hoverGlow' then 'Efecto: Al pasar' when 'hoverScale' then 'Efecto: Al pasar'
    when 'text' then 'Efectos de texto' when 'textRoles' then 'Efectos de texto'
    when 'pfp' then 'Efecto: de la foto'
    else null end $$;

-- The editor sends the WHOLE effects object on every change, so an effect
-- "is used" when it is switched on in that object (not merely present).
create or replace function public.admin_fx_used(p_key text, p_val jsonb) returns text
language sql immutable as $$
  select case when jsonb_typeof(p_val) = 'object' and p_val::text like '%"enabled": true%' then public.admin_effect_part(p_key) end $$;

create or replace function public.admin_retention() returns jsonb
language plpgsql volatile security definer set search_path = public, auth as $$
declare
  today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  res jsonb;
begin
  perform public.admin_guard();

  create temp table if not exists _act (user_id uuid, day date) on commit drop;
  truncate _act;
  insert into _act
    select user_id, day from activity_days where user_id is not null and day > today - 120
    union select user_id, (created_at at time zone 'America/Argentina/Buenos_Aires')::date from canvas_ops where created_at > now() - interval '120 days'
    union select user_id, (started_at at time zone 'America/Argentina/Buenos_Aires')::date from presence_sessions where user_id is not null
    union select author_user_id, (created_at at time zone 'America/Argentina/Buenos_Aires')::date from comments where created_at > now() - interval '120 days'
    union select user_id, (created_at at time zone 'America/Argentina/Buenos_Aires')::date from favorites where created_at > now() - interval '120 days';

  create temp table if not exists _new (id uuid, created_at timestamptz, d0 date, back boolean, d1 boolean, r3 boolean, r7 boolean, r30 boolean,
    ops int, finished boolean, fav_given int, fav_recv int, posts_other int, posts_recv int, views_recv int,
    verified boolean, google boolean, phone boolean, mins numeric, shared boolean, explored boolean) on commit drop;
  truncate _new;
  insert into _new
    select u.id, u.created_at, (u.created_at at time zone 'America/Argentina/Buenos_Aires')::date d0,
      false, false, false, false, false, 0, false, 0, 0, 0, 0, 0, false, false, false, 0, false, false
    from auth.users u where u.created_at > now() - interval '30 days';
  update _new n set
    back = exists (select 1 from _act a where a.user_id = n.id and a.day > n.d0),
    d1   = exists (select 1 from _act a where a.user_id = n.id and a.day = n.d0 + 1),
    r3   = exists (select 1 from _act a where a.user_id = n.id and a.day between n.d0 + 1 and n.d0 + 3),
    r7   = exists (select 1 from _act a where a.user_id = n.id and a.day between n.d0 + 1 and n.d0 + 7),
    r30  = exists (select 1 from _act a where a.user_id = n.id and a.day between n.d0 + 1 and n.d0 + 30),
    ops  = (select count(*) from canvas_ops o where o.user_id = n.id and o.created_at < n.created_at + interval '24 hours'),
    finished = coalesce((select e.finished from explore_cards e where e.user_id = n.id), false),
    fav_given = (select count(*) from favorites x where x.user_id = n.id and x.created_at < n.created_at + interval '24 hours'),
    fav_recv  = (select count(*) from favorites x where x.target_user_id = n.id and x.created_at < n.created_at + interval '24 hours'),
    posts_other = (select count(*) from comments x where x.author_user_id = n.id and x.profile_user_id <> n.id and x.created_at < n.created_at + interval '24 hours'),
    posts_recv  = (select count(*) from comments x where x.profile_user_id = n.id and x.author_user_id <> n.id and x.created_at < n.created_at + interval '24 hours'),
    views_recv  = (select count(*) from profile_views x where x.profile_user_id = n.id and x.viewed_at < n.created_at + interval '24 hours'),
    verified = exists (select 1 from verified_users v where v.user_id = n.id),
    google   = exists (select 1 from auth.identities i where i.user_id = n.id and i.provider = 'google'),
    phone    = coalesce((select bool_or(p.device = 'mobile') from presence_sessions p where p.user_id = n.id), false),
    mins     = coalesce((select sum(extract(epoch from p.last_seen - p.started_at)) / 60 from presence_sessions p
                 where p.user_id = n.id and p.started_at < n.created_at + interval '24 hours'), 0),
    shared   = exists (select 1 from events e where e.user_id = n.id and e.name in ('share_open', 'share_copy_link', 'share_save') and e.at < n.created_at + interval '24 hours'),
    explored = exists (select 1 from events e where e.user_id = n.id and e.name in ('explore_open', 'search') and e.at < n.created_at + interval '24 hours');

  select jsonb_build_object(
    'today', today,
    'cohorts', (select coalesce(jsonb_agg(x order by x->>'day' desc), '[]') from (
      select jsonb_build_object('day', d0, 'n', count(*),
        'd1',  case when d0 <= today - 1  then count(*) filter (where d1) end,
        'r3',  case when d0 <= today - 3  then count(*) filter (where r3) end,
        'r7',  case when d0 <= today - 7  then count(*) filter (where r7) end,
        'r30', case when d0 <= today - 30 then count(*) filter (where r30) end,
        'finished', count(*) filter (where finished)) x
      from _new group by d0) q),
    'status', (select jsonb_build_object(
        'active', count(*) filter (where last >= today - 3),
        'risk',   count(*) filter (where last between today - 7 and today - 4),
        'gone',   count(*) filter (where last between today - 30 and today - 8),
        'dead',   count(*) filter (where last < today - 30),
        'never',  count(*) filter (where last is null))
      from (select u.id, (select max(day) from _act a where a.user_id = u.id) last from auth.users u) s),
    'stages', (select coalesce(jsonb_agg(x order by x->>'stage'), '[]') from (
      select jsonb_build_object('stage', st, 'n', count(*), 'back', count(*) filter (where back)) x from (
        select back, case when ops = 0 then '1' when ops < 10 then '2' when not finished then '3' else '4' end st
        from _new where d0 <= today - 1) s group by st) q),
    'predictors', (select jsonb_agg(jsonb_build_object('key', k, 'yes_n', yn, 'yes_back', yb, 'no_n', nn, 'no_back', nb)) from (
      select k,
        count(*) filter (where v) yn, count(*) filter (where v and back) yb,
        count(*) filter (where not v) nn, count(*) filter (where not v and back) nb
      from (select back, unnest(array['finished', 'fav_given', 'posts_other', 'fav_recv', 'posts_recv', 'views5', 'shared', 'explored', 'verified', 'google', 'phone', 'mins20']) k,
                   unnest(array[finished, fav_given > 0, posts_other > 0, fav_recv > 0, posts_recv > 0, views_recv >= 5, shared, explored, verified, google, phone, mins >= 20]) v
            from _new where d0 <= today - 1) s group by k) q),
    'back_do', (select jsonb_build_object(
        'people', count(*),
        'edited', count(*) filter (where ed), 'posted', count(*) filter (where po), 'faved', count(*) filter (where fa),
        'explored', count(*) filter (where ex), 'only_looked', count(*) filter (where not ed and not po and not fa))
      from (select n.id,
          exists (select 1 from canvas_ops o where o.user_id = n.id and (o.created_at at time zone 'America/Argentina/Buenos_Aires')::date > n.d0) ed,
          exists (select 1 from comments c where c.author_user_id = n.id and (c.created_at at time zone 'America/Argentina/Buenos_Aires')::date > n.d0) po,
          exists (select 1 from favorites f where f.user_id = n.id and (f.created_at at time zone 'America/Argentina/Buenos_Aires')::date > n.d0) fa,
          exists (select 1 from events e where e.user_id = n.id and e.name in ('explore_open', 'search') and (e.at at time zone 'America/Argentina/Buenos_Aires')::date > n.d0) ex
        from _new n where n.back) s),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('part', part, 'people', p, 'ops', o) order by p desc), '[]') from (
      select part, count(distinct user_id) p, case when part like 'Efecto%' or part = 'Efectos de texto' then null else count(*) end o from (
        select o.user_id, public.admin_edit_part(k) part from canvas_ops o, jsonb_object_keys(case when jsonb_typeof(o.op->'patch') = 'object' then o.op->'patch' else '{}' end) k
          where o.created_at > now() - interval '7 days' and o.op->>'type' = 'update_profile' and k <> 'effects'
        union all
        select o.user_id, public.admin_fx_used(e.key, e.value) from canvas_ops o, jsonb_each(case when jsonb_typeof(o.op->'patch'->'effects') = 'object' then o.op->'patch'->'effects' else '{}' end) e
          where o.created_at > now() - interval '7 days' and o.op->>'type' = 'update_profile'
        union all
        select o.user_id, case when o.op->>'type' like 'set_wallpaper%' or o.op->>'type' = 'set_bg' then 'Sala: fondo'
          when o.op->>'type' like '%_image' then 'Sala: imágenes' when o.op->>'type' like '%_text' then 'Sala: textos sueltos'
          when o.op->>'type' = 'set_space_music' then 'Sala: música' when o.op->>'type' in ('set_space_cursor', 'set_space_font') then 'Sala: cursor / fuente' end
          from canvas_ops o where o.created_at > now() - interval '7 days' and o.op->>'type' <> 'update_profile' and o.op->>'type' <> 'add_profile'
      ) s where part is not null group by part) q),
    'features_back', (select coalesce(jsonb_agg(jsonb_build_object('part', part, 'back', b, 'gone', g) order by b + g desc), '[]') from (
      select part, count(distinct user_id) filter (where back) b, count(distinct user_id) filter (where not back) g from (
        select n.id user_id, n.back, case when k = 'effects' then public.admin_fx_used(e.key, e.value) else public.admin_edit_part(k) end part
        from _new n join canvas_ops o on o.user_id = n.id and o.created_at < n.created_at + interval '24 hours' and o.op->>'type' = 'update_profile'
        cross join lateral jsonb_object_keys(case when jsonb_typeof(o.op->'patch') = 'object' then o.op->'patch' else '{}' end) k
        left join lateral jsonb_each(case when k = 'effects' and jsonb_typeof(o.op->'patch'->'effects') = 'object' then o.op->'patch'->'effects' else '{}' end) e on true
        where n.d0 <= today - 1 and (k <> 'effects' or e.key is not null)
      ) s where part is not null group by part) q),
    'exits', (select coalesce(jsonb_agg(jsonb_build_object('what', w, 'n', c) order by c desc), '[]') from (
      select props->'last'->>(jsonb_array_length(props->'last') - 1) w, count(*) c from events
      where name = 'visit_end' and at > now() - interval '7 days' and jsonb_typeof(props->'last') = 'array' and jsonb_array_length(props->'last') > 0
      group by 1 order by 2 desc limit 25) q),
    'used', (select coalesce(jsonb_agg(jsonb_build_object('what', w, 'visits', c, 'people', a) order by c desc), '[]') from (
      select w, count(*) c, count(distinct coalesce(user_id::text, actor)) a from events, jsonb_array_elements_text(props->'used') w
      where name = 'visit_end' and at > now() - interval '7 days' and jsonb_typeof(props->'used') = 'array'
      group by 1 order by 2 desc limit 40) q),
    'visits', (select coalesce(jsonb_agg(x), '[]') from (
      select jsonb_build_object('phone', coalesce((props->>'phone')::boolean, false), 'n', count(*),
        'median', percentile_cont(0.5) within group (order by (props->>'sec')::int),
        'p75', percentile_cont(0.75) within group (order by (props->>'sec')::int),
        'under30', count(*) filter (where (props->>'sec')::int < 30),
        'over5m', count(*) filter (where (props->>'sec')::int >= 300)) x
      from events where name = 'visit_end' and at > now() - interval '7 days' group by coalesce((props->>'phone')::boolean, false)) q),
    'arrivals', (select coalesce(jsonb_agg(jsonb_build_object('from', src, 'devices', d, 'signed_up', s) order by d desc), '[]') from (
      select src, count(*) d, count(*) filter (where su) s from (
        select coalesce(nullif(a.props->>'utm', ''), nullif(regexp_replace(a.props->>'ref', '^(www\.|m\.|l\.|lm\.)', ''), ''), 'directo') src,
          exists (select 1 from events b where b.actor = a.actor and b.name in ('signup_submit', 'signup_google', 'setup_done')) su
        from events a where a.name = 'arrive' and a.at > now() - interval '14 days') s group by src order by d desc limit 20) q),
    'social', (select jsonb_build_object(
        'explore_open', count(*) filter (where name = 'explore_open'),
        'explore_people', count(distinct coalesce(user_id::text, actor)) filter (where name = 'explore_open'),
        'explore_card', count(*) filter (where name = 'explore_card'),
        'explore_tabs', (select coalesce(jsonb_object_agg(t, c), '{}') from (select props->>'tab' t, count(*) c from events where name = 'explore_card' and at > now() - interval '7 days' group by 1) z),
        'wall_flip_own', count(*) filter (where name = 'wall_flip' and (props->>'own')::boolean),
        'wall_flip_other', count(*) filter (where name = 'wall_flip' and not coalesce((props->>'own')::boolean, false)),
        'wall_post_own', count(*) filter (where name = 'wall_post' and props->>'owner' = user_id::text),
        'wall_post_other', count(*) filter (where name = 'wall_post' and props->>'owner' is distinct from user_id::text),
        'wall_like', count(*) filter (where name = 'wall_like'),
        'favorite_add', count(*) filter (where name = 'favorite_add'),
        'share', count(*) filter (where name in ('share_open', 'share_copy_link', 'share_save')),
        'search', count(*) filter (where name = 'search'),
        'crash', count(*) filter (where name = 'crash'))
      from events where at > now() - interval '7 days')
  ) into res;
  return res;
end $$;

create or replace function public.admin_user_trails(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_guard();
  return (select coalesce(jsonb_agg(jsonb_build_object('at', at, 'path', path, 'props', props) order by at desc), '[]')
    from (select at, path, props from events where user_id = p_user and name = 'visit_end' order by at desc limit 20) q);
end $$;

revoke all on function public.admin_retention() from public, anon;
revoke all on function public.admin_user_trails(uuid) from public, anon;
grant execute on function public.admin_retention() to authenticated;
grant execute on function public.admin_user_trails(uuid) to authenticated;
