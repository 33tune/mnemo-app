-- Muro v2 (2026-11-26, pedido del usuario): post fijado, efecto de texto en el estilo del post y
-- un Feed que solo muestra lo que cada persona publica en SU PROPIO muro (no lo que le escribe a otros).

alter table public.comments add column if not exists pinned boolean not null default false;
create unique index if not exists comments_one_pinned on public.comments (profile_user_id) where pinned;

-- Fijar / soltar un post (solo el dueño del muro; solo posts, no respuestas; uno por muro).
create or replace function public.pin_post(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare c public.comments;
begin
  select * into c from public.comments where id = p_id;
  if c.id is null or c.profile_user_id <> auth.uid() or c.parent_id is not null then raise exception 'not_allowed'; end if;
  update public.comments set pinned = false where profile_user_id = c.profile_user_id and pinned and id <> p_id;
  update public.comments set pinned = coalesce(p_on, false) where id = p_id;
end $$;
revoke all on function public.pin_post(uuid, boolean) from public, anon;
grant execute on function public.pin_post(uuid, boolean) to authenticated;

-- Estilo: suma el efecto de texto (nombres fijos).
create or replace function public.clean_post_style(s jsonb) returns jsonb
language sql immutable as $$
  select nullif(jsonb_strip_nulls(jsonb_build_object(
    'font', case when s->>'font' ~ '^[A-Za-z0-9 ]{1,40}$' then s->>'font' end,
    'color', case when s->>'color' ~ '^#[0-9a-fA-F]{6}$' then s->>'color' end,
    'bg', case when s->>'bg' ~ '^#[0-9a-fA-F]{6}$' then s->>'bg' end,
    'size', case when s->>'size' in ('12', '15', '18') then (s->>'size')::int end,
    'fx', case when s->>'fx' in ('glow', 'shimmer', 'rainbow', 'bounce', 'wave', 'shake') then s->>'fx' end
  )), '{}'::jsonb);
$$;

-- Feed: lo que publicaron en su propio muro las cards a las que les di corazón.
create or replace function public.my_feed(p_before timestamptz default null, p_limit int default 30)
returns setof public.comments language sql stable security definer set search_path = public as $$
  select c.* from public.comments c
  where c.parent_id is null
    and c.author_user_id = c.profile_user_id
    and c.author_user_id in (select target_user_id from public.favorites where user_id = auth.uid() and not coalesce(hidden, false))
    and not public.is_banned(c.author_user_id)
    and (p_before is null or c.created_at < p_before)
  order by c.created_at desc limit least(coalesce(p_limit, 30), 50);
$$;
