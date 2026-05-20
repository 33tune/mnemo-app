import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";

export function useFollow(targetUserId: string, currentUserId?: string) {
  const supabase = createClient();

  const [isFollowing,    setIsFollowing]    = useState(false);
  const [followsYou,     setFollowsYou]     = useState(false);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [justFollowed,   setJustFollowed]   = useState(false);
  const followFlashRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followInFlight  = useRef(false);
  const unfollowInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!targetUserId) { setLoading(false); return; }

      setLoading(true);

      try {
        const queries: Promise<any>[] = [
          // How many people follow targetUserId
          supabase
            .from("followers")
            .select("*", { count: "exact", head: true })
            .eq("following_id", targetUserId) as unknown as Promise<any>,

          // How many people targetUserId follows
          supabase
            .from("followers")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", targetUserId) as unknown as Promise<any>,
        ];

        if (currentUserId) {
          // Do I follow them?
          queries.push(
            supabase
              .from("followers")
              .select("id")
              .eq("follower_id", currentUserId)
              .eq("following_id", targetUserId)
              .maybeSingle() as unknown as Promise<any>
          );

          // Do they follow me?
          queries.push(
            supabase
              .from("followers")
              .select("id")
              .eq("follower_id", targetUserId)
              .eq("following_id", currentUserId)
              .maybeSingle() as unknown as Promise<any>
          );
        }

        const results = await Promise.all(queries);
        if (cancelled) return;

        setFollowerCount(results[0].count  ?? 0);
        setFollowingCount(results[1].count ?? 0);

        if (currentUserId) {
          setIsFollowing(!!results[2]?.data);
          setFollowsYou(!!results[3]?.data);
        }
      } catch (e) {
        console.error("[useFollow]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [targetUserId, currentUserId]);

  const follow = async () => {
    if (!currentUserId || followInFlight.current) return;
    followInFlight.current = true;
    setIsFollowing(true);
    setFollowerCount(prev => prev + 1);
    try {
      const { error } = await supabase.from("followers").insert({
        follower_id:  currentUserId,
        following_id: targetUserId,
      });
      if (error) {
        console.error("[follow]", error);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        analytics.follow(targetUserId, currentUserId);
        setJustFollowed(true);
        if (followFlashRef.current) clearTimeout(followFlashRef.current);
        followFlashRef.current = setTimeout(() => setJustFollowed(false), 1400);
      }
    } finally {
      followInFlight.current = false;
    }
  };

  const unfollow = async () => {
    if (!currentUserId || unfollowInFlight.current) return;
    unfollowInFlight.current = true;
    setIsFollowing(false);
    setFollowerCount(prev => Math.max(0, prev - 1));
    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id",  currentUserId)
        .eq("following_id", targetUserId);
      if (error) {
        console.error("[unfollow]", error);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } finally {
      unfollowInFlight.current = false;
    }
  };

  return {
    isFollowing,
    isMutual: isFollowing && followsYou,
    followerCount,
    followingCount,
    follow,
    unfollow,
    loading,
    justFollowed,
  };
}
