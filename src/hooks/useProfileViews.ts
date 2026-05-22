"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useProfileViews(userId?: string) {
  const [total,   setTotal]   = useState(0);
  const [today,   setToday]   = useState(0);
  const [week,    setWeek]    = useState(0);
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    cancelledRef.current = false;
    setLoading(true);

    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sb = createClient();

    Promise.all([
      sb.from("profile_views").select("*", { count: "exact", head: true }).eq("profile_user_id", userId) as unknown as Promise<{ count: number | null }>,
      sb.from("profile_views").select("*", { count: "exact", head: true }).eq("profile_user_id", userId).gte("viewed_at", todayStart) as unknown as Promise<{ count: number | null }>,
      sb.from("profile_views").select("*", { count: "exact", head: true }).eq("profile_user_id", userId).gte("viewed_at", weekStart) as unknown as Promise<{ count: number | null }>,
    ]).then(([totalRes, todayRes, weekRes]) => {
      if (cancelledRef.current) return;
      setTotal(totalRes.count ?? 0);
      setToday(todayRes.count  ?? 0);
      setWeek(weekRes.count    ?? 0);
      setLoading(false);
    }).catch(e => {
      console.error("[useProfileViews]", e);
      if (!cancelledRef.current) setLoading(false);
    });

    return () => { cancelledRef.current = true; };
  }, [userId]);

  return { total, today, week, loading };
}
