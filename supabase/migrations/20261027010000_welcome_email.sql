-- Welcome email (2026-10-27): when a profile becomes a real one (onboarding
-- done, not a temp_ handle) the database sends one welcome email through
-- Resend. Here and not in the app: profiles are completed in three places
-- (/auth/callback, the /login sign-up and /setup), Google or email.
--
-- * Once per user: public.welcome_emails holds who already got it, and the
--   Idempotency-Key makes a retry harmless on Resend's side too.
-- * Never blocks a sign-up: pg_net queues the request and returns at once;
--   any error is swallowed (the profile is saved anyway).
-- * The Resend key lives in Vault as 'resend_api_key' (sending-only key;
--   stored apart, never in this file). Without it nothing is sent.
-- * Users onboarded before this migration are marked as done: only new
--   sign-ups get the email.

create table if not exists public.welcome_emails (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  sent_at    timestamptz not null default now(),
  request_id bigint
);
alter table public.welcome_emails enable row level security;
-- No policies: only the trigger (security definer) touches it.

insert into public.welcome_emails (user_id)
select user_id from public.profiles
where onboarding_completed = true and user_id is not null
on conflict do nothing;

create or replace function public.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text;
  v_key   text;
  v_html  text;
  v_req   bigint;
begin
  if new.onboarding_completed is not true or new.handle like 'temp\_%' or new.user_id is null then
    return new;
  end if;
  begin
    insert into public.welcome_emails (user_id) values (new.user_id) on conflict do nothing;
    if not found then
      return new; -- already welcomed
    end if;

    select email into v_email from auth.users where id = new.user_id;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
    if v_email is null or v_key is null then
      return new;
    end if;

    v_html := format($html$
<div style="margin:0;padding:32px 16px;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#141118">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;padding:36px 32px">
    <div style="font-size:26px;font-weight:800;letter-spacing:-1px">myLand</div>
    <h1 style="margin:28px 0 0;font-size:24px;line-height:1.2;letter-spacing:-0.5px">¡Bienvenido a myLand!</h1>
    <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#3b3740">Tu nombre ya es tuyo: <b>myland.lol/%1$s</b></p>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:#3b3740">Armá tu tarjeta y tu sala desde una compu, y después pegá el link en tu bio de Instagram, TikTok o donde quieras.</p>
    <a href="https://myland.lol/dashboard" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#141118;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px">Armar mi tarjeta</a>
    <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#8a8590">myLand está en beta: estamos mejorándolo todos los días.</p>
  </div>
</div>$html$, new.handle);

    select net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key,
        'Idempotency-Key', 'welcome-' || new.user_id::text
      ),
      body    := jsonb_build_object(
        'from', 'myLand <hola@myland.lol>',
        'to', jsonb_build_array(v_email),
        'subject', '¡Bienvenido a myLand, ' || new.handle || '!',
        'html', v_html,
        'text', 'Bienvenido a myLand. Tu nombre ya es tuyo: myland.lol/' || new.handle ||
                E'\n\nArmá tu tarjeta desde una compu: https://myland.lol/dashboard'
      )
    ) into v_req;
    update public.welcome_emails set request_id = v_req where user_id = new.user_id;
  exception when others then
    -- A welcome email never breaks a sign-up.
    null;
  end;
  return new;
end;
$$;

revoke all on function public.send_welcome_email() from public, anon, authenticated;

create or replace trigger profiles_welcome_email
  after insert or update of onboarding_completed, handle on public.profiles
  for each row execute function public.send_welcome_email();
