-- Crash probe (2026-11-27): public.track also accepts "crash" (the page was
-- killed by the browser while on screen; props = last screens / tools, no
-- personal data). Same function otherwise.
CREATE OR REPLACE FUNCTION public.track(p_name text, p_actor text, p_path text DEFAULT NULL::text, p_props jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if p_name is null or p_name not in (
    'visit', 'landing_view', 'claim_click', 'login_view', 'signup_submit', 'signup_google', 'login_done',
    'setup_view', 'setup_done', 'editor_open', 'tour_done', 'tour_skip', 'publish',
    'note_post', 'favorite_add', 'favorite_remove', 'share_open', 'share_save', 'share_copy_link',
    'search', 'profile_view', 'bug_report', 'crash'
  ) then return; end if;
  if p_actor is null or length(p_actor) < 8 or length(p_actor) > 64 then return; end if;
  if p_props is not null and length(p_props::text) > 600 then p_props := null; end if;
  if p_path is not null then p_path := left(p_path, 120); end if;
  if p_name = 'visit' then
    insert into public.activity_days (actor, day, user_id) values (p_actor, d, auth.uid())
      on conflict (actor, day) do update set user_id = coalesce(public.activity_days.user_id, excluded.user_id);
    return;
  end if;
  insert into public.events (name, actor, user_id, path, props) values (p_name, p_actor, auth.uid(), p_path, p_props);
end $function$;
