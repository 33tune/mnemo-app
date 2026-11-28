-- Recursos (2026-11-28): events for the new feature (what gets opened, reposted,
-- downloaded) and the Feed in Explorar.
do $$
declare def text := pg_get_functiondef('public.track(text,text,text,jsonb)'::regprocedure);
begin
  if position('''repost''' in def) = 0 then
    execute replace(def, '''wall_like'', ''visit_end''',
      '''wall_like'', ''visit_end'', ''repost'', ''resource_open'', ''resource_download'', ''resource_like'', ''resource_comment'', ''feed_open''');
  end if;
end $$;
