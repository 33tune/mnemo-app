-- Grant anon role INSERT access to analytics tables.
-- Without this, anonymous visitor inserts are rejected by Postgres before RLS
-- even evaluates — same pattern fixed for guestbook_messages.

GRANT USAGE ON SCHEMA public TO anon;

-- Profile views: anonymous visitors must be able to record their visit
GRANT INSERT ON TABLE profile_views TO anon;

-- Link clicks: anonymous visitors must be able to record their clicks
GRANT INSERT ON TABLE link_clicks TO anon;
