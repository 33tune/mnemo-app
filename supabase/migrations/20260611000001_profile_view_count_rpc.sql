-- Mobile Public's Stats module needs the same view counters that
-- Desktop/Editor Mobile already show to the profile owner, without
-- exposing individual profile_views rows (viewer_user_id, viewed_at,
-- and the visitor/profile relationship) to anonymous visitors.
--
-- Instead of relaxing the SELECT policy on profile_views, expose the
-- aggregates via a SECURITY DEFINER function. It runs with the
-- privileges of its owner (bypassing RLS internally for this query
-- only) but can only ever return counts - never rows.
--
-- profile_views RLS policies (including the existing owner-only SELECT)
-- and INSERT/UPDATE/DELETE are UNCHANGED.

CREATE OR REPLACE FUNCTION public.get_profile_view_stats(profile_id uuid)
RETURNS TABLE(total bigint, today bigint, week bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE viewed_at >= date_trunc('day', now())) AS today,
    count(*) FILTER (WHERE viewed_at >= now() - interval '7 days') AS week
  FROM profile_views
  WHERE profile_views.profile_user_id = profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_view_stats(uuid) TO anon, authenticated;
