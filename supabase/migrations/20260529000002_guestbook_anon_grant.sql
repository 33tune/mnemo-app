-- Fix anon role access for guestbook_messages
-- RLS policies alone are not enough; the anon role also needs explicit SQL privileges.

GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT ON TABLE guestbook_messages TO anon;
GRANT INSERT ON TABLE guestbook_messages TO anon;

-- authenticated users also need explicit grants (RLS still applies on top)
GRANT SELECT, INSERT, DELETE ON TABLE guestbook_messages TO authenticated;
