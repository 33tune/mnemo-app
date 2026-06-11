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

    const sb = createClient();

    sb.rpc("get_profile_view_stats", { profile_id: userId })
      .then(({ data, error }: { data: { total: number; today: number; week: number }[] | { total: number; today: number; week: number } | null; error: unknown }) => {
        if (cancelledRef.current) return;
        if (error) {
          console.error("[useProfileViews]", error);
          setLoading(false);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        setTotal(Number(row?.total ?? 0));
        setToday(Number(row?.today ?? 0));
        setWeek(Number(row?.week  ?? 0));
        setLoading(false);
      });

    return () => { cancelledRef.current = true; };
  }, [userId]);

  return { total, today, week, loading };
}
