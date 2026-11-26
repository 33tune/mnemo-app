-- No welcome email (2026-11-26, decision of the owner): the only email myLand sends on
-- sign-up is the confirmation code (send-email hook). Applied by hand in the SQL Editor.
drop trigger if exists profiles_welcome_email on public.profiles;
