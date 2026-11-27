-- Verificación opcional (2026-11-27): an account is "verified" once its owner
-- proved the email is theirs (a code / link by mail) or signed in with Google.
-- Verified cards are the ones Explorar shows and recommends; the account can
-- be recovered by mail. The app calls mark_verified() after such a sign-in:
-- it reads HOW the current session was made (the JWT's amr), never a value
-- the app sends, so a password-only session cannot mark itself.

create table if not exists public.verified_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now(),
  method text
);
alter table public.verified_users enable row level security;
drop policy if exists verified_users_read on public.verified_users;
create policy verified_users_read on public.verified_users for select to anon, authenticated using (true);

create or replace function public.mark_verified() returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m text;
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.verified_users where user_id = uid) then return true; end if;
  select a->>'method' into m from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
    where a->>'method' in ('otp', 'oauth', 'magiclink', 'recovery', 'invite', 'email_change', 'email/signup', 'sso/saml')
    limit 1;
  if m is null then return false; end if;
  insert into public.verified_users (user_id, method) values (uid, m) on conflict do nothing;
  return true;
end $$;
revoke all on function public.mark_verified() from public, anon;
grant execute on function public.mark_verified() to authenticated;

-- Everyone who already confirmed their email (or came with Google) is verified.
insert into public.verified_users (user_id, method)
select u.id, 'existing' from auth.users u where u.email_confirmed_at is not null
on conflict do nothing;

-- Explorar shows verified accounts only.
create or replace function public.explore_list()
returns table (user_id uuid, handle text, created_at timestamptz, updated_at timestamptz, thumb text, content real,
  finished boolean, collection boolean, name text, views14 bigint, favs bigint, favs14 bigint, posts14 bigint, edit_minutes numeric, edits bigint)
language sql stable security definer set search_path = public as $$
  with c as (
    select e.*, p.handle, p.created_at as pcreated from public.explore_cards e
    join public.profiles p on p.user_id = e.user_id
    where e.thumb is not null and e.finished
      and p.handle not like 'temp\_%' and coalesce(p.onboarding_completed, true)
      and not exists (select 1 from public.banned_users b where b.user_id = e.user_id)
      and exists (select 1 from public.verified_users v where v.user_id = e.user_id)
  )
  select c.user_id, c.handle, c.pcreated, c.updated_at, c.thumb, c.content, c.finished, c.collection, c.name,
    coalesce(s.views14, 0)::bigint, coalesce(s.favs, 0)::bigint, coalesce(s.favs14, 0)::bigint, coalesce(s.posts14, 0)::bigint,
    coalesce(s.edit_minutes, 0)::numeric, coalesce(s.edits, 0)::bigint
  from c left join public.explore_signals(array(select user_id from c)) s on s.user_id = c.user_id
$$;
grant execute on function public.explore_list() to anon, authenticated;
