-- Removes the Crews feature from the database (user decision, 2026-11-03).
-- Safe to run more than once. Nothing outside Crews depends on these objects.

-- The hourly notices cleanup.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'crew-posts-gc';
  end if;
end $$;

drop function if exists
  public.crew_create(text, text), public.crew_update(uuid, jsonb), public.crew_delete(uuid),
  public.crew_invite_code(uuid, boolean), public.crew_kick(uuid, uuid), public.crew_join(text, text),
  public.crew_leave(uuid), public.crew_feature(uuid), public.crew_set_badge(uuid, real, real, real),
  public.crew_house(text), public.crew_badge_of(uuid), public.crew_pact(text, text),
  public.crew_ban(uuid, uuid), public.crew_unban(uuid, uuid), public.crew_bans_list(uuid),
  public.crew_set_role(uuid, uuid, text), public.crew_pin(uuid, boolean),
  public.crew_post_create(uuid, text, text, boolean), public.crew_post_delete(uuid), public.crew_mark_read(uuid[]),
  public.crew_inbox(), public.crew_mine(), public.crew_members_page(text, text, text, integer),
  public.crew_member_json(uuid, uuid, integer, text, timestamptz), public.crew_can_moderate(uuid, uuid),
  public.crew_role_of(uuid, uuid), public.crew_is_admin(uuid), public.crew_links_ok(jsonb),
  public.crew_new_code(), public.crew_asset_ok(text), public.crew_discord_ok(text);

drop table if exists public.crew_post_reads, public.crew_posts, public.crew_bans,
  public.crew_invites, public.crew_members, public.crews;

-- Cards that showed a crew chip: drop the leftover keys (saved and published).
update public.canvases v set data = (
  select jsonb_set(d, '{profiles}', coalesce((
    select jsonb_agg(p - 'crew' - 'crewAnchorX' - 'crewAnchorY' order by i)
    from jsonb_array_elements(d->'profiles') with ordinality as t(p, i)), '[]'::jsonb))
  from (select case when jsonb_typeof(v.data->'published'->'profiles') = 'array'
    then jsonb_set(v.data, '{published,profiles}', coalesce((
      select jsonb_agg(p - 'crew' - 'crewAnchorX' - 'crewAnchorY' order by i)
      from jsonb_array_elements(v.data->'published'->'profiles') with ordinality as t(p, i)), '[]'::jsonb))
    else v.data end as d) s)
where jsonb_typeof(v.data->'profiles') = 'array' and v.data::text like '%"crew%';

-- Daily storage cleanup without crews (as in 20261028000000).
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
