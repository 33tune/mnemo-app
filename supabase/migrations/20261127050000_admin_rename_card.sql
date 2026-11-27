-- Renombrar desde el panel (2026-11-27): the card keeps its own copy of the @
-- (profiles[].handle in the room, working copy and published), so renaming only
-- profiles.handle left the old @ on the card. Now both change together.
create or replace function public.admin_rename(p_user uuid, p_handle text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare h text := lower(trim(p_handle)); old text;
begin
  perform public.admin_guard();
  if h !~ '^[a-z0-9_-]{3,20}$' or h like 'temp\_%'
     or h = any (array['login','dashboard','auth','api','admin','settings','myland','browse','setup','space','reset-password','landing','crear']) then
    raise exception 'invalid_handle';
  end if;
  select handle into old from public.profiles where user_id = p_user;
  if old is null then raise exception 'no_profile'; end if;
  if exists (select 1 from public.profiles where handle = h and user_id <> p_user) then raise exception 'handle_taken'; end if;
  update public.profiles set handle = h where user_id = p_user;
  update public.canvases c set data = c.data
    || case when jsonb_typeof(c.data->'profiles') = 'array' then jsonb_build_object('profiles',
         (select jsonb_agg(case when e->>'handle' = old then jsonb_set(e, '{handle}', to_jsonb(h)) else e end) from jsonb_array_elements(c.data->'profiles') e))
       else '{}'::jsonb end
    || case when jsonb_typeof(c.data->'published'->'profiles') = 'array' then jsonb_build_object('published', jsonb_set(c.data->'published', '{profiles}',
         (select jsonb_agg(case when e->>'handle' = old then jsonb_set(e, '{handle}', to_jsonb(h)) else e end) from jsonb_array_elements(c.data->'published'->'profiles') e)))
       else '{}'::jsonb end
  where c.user_id = p_user and c.type = 'space';
  perform public.admin_log('rename', p_user, jsonb_build_object('from', old, 'to', h));
end $function$;
