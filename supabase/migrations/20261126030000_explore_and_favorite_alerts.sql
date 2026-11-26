-- Explorar + avisos de favoritos (2026-11-26, decisión del dueño).
-- 1) my_activity suma 'favorite': quién te agregó a favoritos (ahora con nombre; las visitas siguen anónimas).
-- 2) explore_signals: números agregados por perfil para ordenar Explorar (sin datos personales):
--    visitas y favoritos recientes, posts recibidos, minutos editando y cambios hechos.

create or replace function public.my_activity(p_before timestamptz default null, p_limit integer default 40)
returns table(kind text, actor uuid, post_id uuid, wall_owner uuid, body text, at timestamptz)
language sql stable security definer set search_path to 'public'
as $$
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
  ) a (kind, actor, post_id, wall_owner, body, at)
  where not public.is_banned(a.actor) and (p_before is null or a.at < p_before)
  order by a.at desc limit least(coalesce(p_limit, 40), 80);
$$;

create or replace function public.explore_signals(targets uuid[])
returns table(user_id uuid, views14 bigint, favs bigint, favs14 bigint, posts14 bigint, edit_minutes numeric, edits bigint, last_edit timestamptz)
language sql stable security definer set search_path to 'public'
as $$
  select t.uid,
    (select count(*) from public.profile_views v where v.profile_user_id = t.uid and v.viewed_at > now() - interval '14 days'
       and v.viewer_user_id is distinct from t.uid),
    (select count(*) from public.favorites f where f.target_user_id = t.uid),
    (select count(*) from public.favorites f where f.target_user_id = t.uid and f.created_at > now() - interval '14 days'),
    (select count(*) from public.comments c where c.profile_user_id = t.uid and c.author_user_id <> t.uid and c.created_at > now() - interval '14 days'),
    (select coalesce(round(sum(extract(epoch from (s.last_seen - s.started_at))) / 60.0, 1), 0) from public.presence_sessions s
       where s.user_id = t.uid and (s.first_path like '/dashboard%' or s.last_path like '/dashboard%')),
    (select count(*) from public.canvas_ops o where o.user_id = t.uid),
    (select max(o.created_at) from public.canvas_ops o where o.user_id = t.uid)
  from unnest(targets[1:300]) as t(uid)
  where not public.is_banned(t.uid);
$$;
revoke all on function public.explore_signals(uuid[]) from public;
grant execute on function public.explore_signals(uuid[]) to anon, authenticated;
