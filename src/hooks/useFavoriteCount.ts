"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavoriteCount(targetUserId?: string) {
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!targetUserId) return;
    cancelledRef.current = false;
    setLoading(true);

    const sb = createClient();
    (sb.from("favorites").select("*", { count: "exact", head: true }).eq("target_user_id", targetUserId) as unknown as Promise<{ count: number | null }>)
      .then(res => {
        if (cancelledRef.current) return;
        setCount(res.count ?? 0);
        setLoading(false);
      })
      .catch(e => {
        console.error("[useFavoriteCount]", e);
        if (!cancelledRef.current) setLoading(false);
      });

    return () => { cancelledRef.current = true; };
  }, [targetUserId]);

  return { count, loading };
}
