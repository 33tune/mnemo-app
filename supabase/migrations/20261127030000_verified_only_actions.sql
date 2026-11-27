-- Sin verificar = solo tu card (2026-11-27, pedido del usuario: con el registro
-- sin mail, cualquiera podía escribir en muros, dar likes / favoritos y subir
-- archivos sin límite). Unverified accounts can still build their own card
-- (a few uploads) and post on their OWN wall; everything that reaches other
-- people needs a verified account (public.verified_users).

create or replace function public.is_verified(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid is not null and exists (select 1 from public.verified_users v where v.user_id = uid)
$$;
grant execute on function public.is_verified(uuid) to anon, authenticated;

create or replace function public.post_wall(p_owner uuid, p_body text, p_parent uuid default null::uuid, p_style jsonb default null::jsonb)
 returns comments language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); c public.comments; par public.comments;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if me <> p_owner and not public.is_verified(me) then raise exception 'verify_required'; end if;
  if char_length(b) < 1 or char_length(b) > 280 then raise exception 'bad_length'; end if;
  if public.is_banned(me) or public.is_banned(p_owner) then raise exception 'unavailable'; end if;
  if not exists (select 1 from public.profiles where user_id = p_owner) then raise exception 'no_profile'; end if;
  if me <> p_owner then
    if exists (select 1 from public.profiles where user_id = p_owner and comments_off) then raise exception 'comments_off'; end if;
    if exists (select 1 from public.wall_blocks where owner_user_id = p_owner and blocked_user_id = me) then raise exception 'blocked'; end if;
  end if;
  if p_parent is not null then
    select * into par from public.comments where id = p_parent;
    if par.id is null or par.profile_user_id <> p_owner then raise exception 'bad_parent'; end if;
    if par.parent_id is not null then p_parent := par.parent_id; end if;
  end if;
  if (select count(*) from public.comments where author_user_id = me and created_at > now() - interval '30 seconds') >= 5
     or (select count(*) from public.comments where author_user_id = me and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too_fast';
  end if;
  insert into public.comments (profile_user_id, author_user_id, body, parent_id, style)
  values (p_owner, me, b, p_parent, public.clean_post_style(p_style)) returning * into c;
  return c;
end $function$;

create or replace function public.toggle_post_like(p_id uuid)
 returns table(liked boolean, n bigint) language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.is_verified(me) then raise exception 'verify_required'; end if;
  if not exists (select 1 from public.comments where id = p_id) then raise exception 'no_post'; end if;
  if exists (select 1 from public.comment_likes where comment_id = p_id and user_id = me) then
    delete from public.comment_likes where comment_id = p_id and user_id = me; liked := false;
  else
    insert into public.comment_likes (comment_id, user_id) values (p_id, me); liked := true;
  end if;
  select count(*) into n from public.comment_likes l where l.comment_id = p_id and not public.is_banned(l.user_id);
  return next;
end $function$;

-- Favorites: only verified accounts give them (they notify the other person).
drop policy if exists fav_insert_own on public.favorites;
create policy fav_insert_own on public.favorites for insert to authenticated
  with check (user_id = auth.uid() and public.is_verified(auth.uid()));

-- Uploads: 8 files until verified (enough for a photo, a logo, stickers), then 100.
drop policy if exists ml_assets_insert_own on storage.objects;
create policy ml_assets_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'canvas-assets' and (storage.foldername(name))[1] = (auth.uid())::text
    and public.storage_user_file_count(auth.uid()) < case when public.is_verified(auth.uid()) then 100 else 8 end);
