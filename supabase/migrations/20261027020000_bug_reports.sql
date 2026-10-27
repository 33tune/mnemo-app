-- Bug reports (2026-10-27): the editor's "Reportar un error" button. Each
-- report is a row here AND an email to the owner (Resend through pg_net with
-- the Vault key 'resend_api_key', like the welcome email). Plain-text email
-- only: the message is user input, it never becomes HTML.

create table if not exists public.bug_reports (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null default auth.uid(),
  message    text not null check (char_length(message) between 3 and 2000),
  page       text check (char_length(page) <= 500),
  user_agent text check (char_length(user_agent) <= 500),
  created_at timestamptz not null default now()
);
alter table public.bug_reports enable row level security;

-- Signed-in users report as themselves; nobody reads the table from the app.
create policy "Users report bugs as themselves" on public.bug_reports
  for insert to authenticated with check (user_id = auth.uid());

create or replace function public.mail_bug_report()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key    text;
  v_email  text;
  v_handle text;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
    if v_key is null then return new; end if;
    select email into v_email from auth.users where id = new.user_id;
    select handle into v_handle from public.profiles where user_id = new.user_id;
    perform net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body    := jsonb_strip_nulls(jsonb_build_object(
        'from', 'myLand <hola@myland.lol>',
        'to', jsonb_build_array('bautistagutierrezdead@gmail.com'),
        'subject', 'Error reportado #' || new.id || coalesce(' · @' || v_handle, ''),
        'reply_to', v_email,
        'text', new.message ||
                E'\n\n— — —\nUsuario: ' || coalesce('@' || v_handle, '(sin perfil)') || coalesce(' <' || v_email || '>', '') ||
                E'\nPágina: ' || coalesce(new.page, '?') ||
                E'\nNavegador: ' || coalesce(new.user_agent, '?') ||
                E'\nFecha: ' || to_char(new.created_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI')
      ))
    );
  exception when others then
    null; -- the report is saved anyway
  end;
  return new;
end;
$$;

revoke all on function public.mail_bug_report() from public, anon, authenticated;

create or replace trigger bug_reports_mail
  after insert on public.bug_reports
  for each row execute function public.mail_bug_report();
