-- Undoes migrations/20261031000000_crews_v3.sql only (crews go back to the
-- v2 behavior of 20261029000000_crews.sql). Run crews_down.sql after it to
-- remove Crews entirely.
select cron.unschedule('crew-posts-gc') where exists (select 1 from cron.job where jobname = 'crew-posts-gc');
drop function if exists public.crew_ban(uuid, uuid), public.crew_unban(uuid, uuid), public.crew_bans_list(uuid),
  public.crew_set_role(uuid, uuid, text), public.crew_pin(uuid, boolean), public.crew_post_create(uuid, text, text, boolean),
  public.crew_post_delete(uuid), public.crew_mark_read(uuid[]), public.crew_inbox(), public.crew_mine(),
  public.crew_members_page(text, text, text, integer), public.crew_member_json(uuid, uuid, integer, text, timestamptz),
  public.crew_can_moderate(uuid, uuid), public.crew_links_ok(jsonb);
drop table if exists public.crew_post_reads, public.crew_posts, public.crew_bans;
alter table public.crew_members drop column if exists role, drop column if exists pinned;
alter table public.crews drop column if exists tag, drop column if exists body_font, drop column if exists links;
-- Then re-run the function definitions of 20261029000000_crews.sql (crew_create,
-- crew_update, crew_invite_code, crew_kick, crew_join, crew_house, crew_pact),
-- which drop crew_role_of / crew_is_admin usage; finally:
-- drop function if exists public.crew_role_of(uuid, uuid), public.crew_is_admin(uuid);
