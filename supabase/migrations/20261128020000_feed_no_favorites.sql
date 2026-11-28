-- Feed (2026-11-28, pedido del usuario): only what people post and repost —
-- who favorites whom is not shown.
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
  ) x (kind, actor, at, post_id, owner_id, rkey, src, target)
  where not public.is_banned(x.actor)
    and (x.owner_id is null or not public.is_banned(x.owner_id))
    and (p_before is null or x.at < p_before)
  order by x.at desc limit least(coalesce(p_limit, 30), 50);
$$;
