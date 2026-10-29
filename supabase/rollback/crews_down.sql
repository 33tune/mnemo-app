-- Removes the Crews feature from the database (undoes
-- migrations/20261029000000_crews.sql). Run only if Crews is dropped.
-- Cards keep working: the badge just stops showing.
drop function if exists public.crew_create(text, text), public.crew_update(uuid, jsonb), public.crew_delete(uuid),
  public.crew_invite_code(uuid, boolean), public.crew_kick(uuid, uuid), public.crew_join(text, text),
  public.crew_leave(uuid), public.crew_feature(uuid), public.crew_set_badge(uuid, real, real, real),
  public.crew_house(text), public.crew_badge_of(uuid), public.crew_pact(text, text),
  public.crew_new_code(), public.crew_asset_ok(text), public.crew_discord_ok(text);
drop table if exists public.crew_invites, public.crew_members, public.crews;

-- Storage cleanup without crews (as in 20261028000000).
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
