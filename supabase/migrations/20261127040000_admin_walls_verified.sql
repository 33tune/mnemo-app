-- Panel de admin v3 (2026-11-27, pedido del usuario): what people post on the
-- walls, verified vs unverified accounts, and a manual verify / unverify.
-- New functions only (nothing dropped); each checks admin_guard().

-- Users list with verification, posts and files; filter all | verified | unverified.
create or replace function public.admin_users_v2(p_q text default '', p_filter text default 'all', p_limit integer default 50, p_offset integer default 0)
 returns table(user_id uuid, handle text, display_name text, email text, provider text, created_at timestamptz, last_sign_in_at timestamptz,
   onboarding_completed boolean, banned boolean, ban_reason text, views bigint, favorites bigint, has_note boolean,
   verified boolean, verify_method text, verified_at timestamptz, posts bigint, files bigint, total bigint)
 language plpgsql stable security definer set search_path to 'public', 'auth' as $function$
#variable_conflict use_column
declare q text := '%' || replace(replace(lower(coalesce(p_q, '')), '%', '\%'), '_', '\_') || '%';
begin
  perform public.admin_guard();
  return query
  with u as (
    select au.id, p.handle, p.display_name, au.email::text as email,
           coalesce(au.raw_app_meta_data->>'provider', 'email') as provider,
           au.created_at, au.last_sign_in_at, p.onboarding_completed, v.method as vmethod, v.verified_at as vat
    from auth.users au left join public.profiles p on p.user_id = au.id
    left join public.verified_users v on v.user_id = au.id
    where (coalesce(p_q, '') = ''
       or lower(coalesce(p.handle, '')) like q or lower(coalesce(p.display_name, '')) like q
       or lower(coalesce(au.email, '')) like q)
      and (coalesce(p_filter, 'all') = 'all'
       or (p_filter = 'verified' and v.user_id is not null)
       or (p_filter = 'unverified' and v.user_id is null))
  )
  select u.id, u.handle, u.display_name, u.email, u.provider, u.created_at, u.last_sign_in_at,
         u.onboarding_completed,
         b.user_id is not null, b.reason,
         (select count(*) from public.profile_views pv where pv.profile_user_id = u.id),
         (select count(*) from public.favorites f where f.target_user_id = u.id),
         exists (select 1 from public.notes n where n.user_id = u.id and n.expires_at > now()),
         u.vmethod is not null, u.vmethod, u.vat,
         (select count(*) from public.comments c where c.author_user_id = u.id),
         (select count(*) from storage.objects o where o.bucket_id = 'canvas-assets' and (storage.foldername(o.name))[1] = u.id::text),
         count(*) over ()
  from u left join public.banned_users b on b.user_id = u.id
  order by u.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end $function$;
grant execute on function public.admin_users_v2(text, text, integer, integer) to authenticated;

-- Wall posts, newest first. Filter: all | others (on someone else's wall) | reported | unverified (author).
create or replace function public.admin_wall(p_q text default '', p_filter text default 'all', p_limit integer default 60, p_before timestamptz default null)
 returns table(id uuid, created_at timestamptz, body text, parent_id uuid, pinned boolean,
   author_id uuid, author_handle text, author_verified boolean, owner_id uuid, owner_handle text,
   likes bigint, reports bigint, replies bigint)
 language plpgsql stable security definer set search_path to 'public' as $function$
declare q text := '%' || replace(replace(lower(coalesce(p_q, '')), '%', '\%'), '_', '\_') || '%';
begin
  perform public.admin_guard();
  return query
  select c.id, c.created_at, c.body, c.parent_id, coalesce(c.pinned, false),
    c.author_user_id, pa.handle, exists (select 1 from public.verified_users v where v.user_id = c.author_user_id),
    c.profile_user_id, po.handle,
    (select count(*) from public.comment_likes l where l.comment_id = c.id),
    (select count(*) from public.comment_reports r where r.comment_id = c.id),
    (select count(*) from public.comments x where x.parent_id = c.id)
  from public.comments c
  left join public.profiles pa on pa.user_id = c.author_user_id
  left join public.profiles po on po.user_id = c.profile_user_id
  where (p_before is null or c.created_at < p_before)
    and (coalesce(p_q, '') = '' or lower(c.body) like q or lower(coalesce(pa.handle, '')) like q or lower(coalesce(po.handle, '')) like q)
    and (coalesce(p_filter, 'all') = 'all'
      or (p_filter = 'others' and c.author_user_id <> c.profile_user_id)
      or (p_filter = 'reported' and exists (select 1 from public.comment_reports r where r.comment_id = c.id))
      or (p_filter = 'unverified' and not exists (select 1 from public.verified_users v where v.user_id = c.author_user_id)))
  order by c.created_at desc
  limit greatest(1, least(p_limit, 200));
end $function$;
grant execute on function public.admin_wall(text, text, integer, timestamptz) to authenticated;

-- Numbers for the summary.
create or replace function public.admin_verify_stats() returns jsonb
 language plpgsql stable security definer set search_path to 'public', 'auth' as $function$
declare r jsonb;
begin
  perform public.admin_guard();
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'verified', (select count(*) from public.verified_users),
    'unverified', (select count(*) from auth.users au where not exists (select 1 from public.verified_users v where v.user_id = au.id)),
    'new_24h', (select count(*) from auth.users where created_at > now() - interval '24 hours'),
    'new_unverified_24h', (select count(*) from auth.users au where au.created_at > now() - interval '24 hours'
        and not exists (select 1 from public.verified_users v where v.user_id = au.id)),
    'verified_24h', (select count(*) from public.verified_users where verified_at > now() - interval '24 hours' and method <> 'existing'),
    'by_method', (select coalesce(jsonb_object_agg(method, n), '{}'::jsonb) from (select coalesce(method, '?') as method, count(*) n from public.verified_users group by 1) m),
    'posts_total', (select count(*) from public.comments),
    'posts_24h', (select count(*) from public.comments where created_at > now() - interval '24 hours'),
    'posts_others_24h', (select count(*) from public.comments where created_at > now() - interval '24 hours' and author_user_id <> profile_user_id),
    'reports_open', (select count(distinct comment_id) from public.comment_reports r where exists (select 1 from public.comments c where c.id = r.comment_id))
  ) into r;
  return r;
end $function$;
grant execute on function public.admin_verify_stats() to authenticated;

-- Verify / unverify an account by hand (logged in the history).
create or replace function public.admin_set_verified(p_user uuid, p_on boolean) returns void
 language plpgsql security definer set search_path to 'public' as $function$
begin
  perform public.admin_guard();
  if p_on then
    insert into public.verified_users (user_id, method) values (p_user, 'admin') on conflict do nothing;
  else
    delete from public.verified_users where user_id = p_user;
  end if;
  insert into public.admin_actions (admin_id, action, target_user, target_handle, detail)
  values (auth.uid(), case when p_on then 'verify' else 'unverify' end, p_user,
          (select handle from public.profiles where user_id = p_user), null);
end $function$;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
