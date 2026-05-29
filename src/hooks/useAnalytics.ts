"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type TopLink = { label: string; url: string; clicks: number };

export type AnalyticsData = {
  totalViews:     number;
  viewsToday:     number;
  uniqueVisitors: number;
  topLinks:       TopLink[];
  mobilePct:      number;
  desktopPct:     number;
  recentActivity: Date | null;
  loading:        boolean;
};

const EMPTY: AnalyticsData = {
  totalViews: 0, viewsToday: 0, uniqueVisitors: 0,
  topLinks: [], mobilePct: 0, desktopPct: 0,
  recentActivity: null, loading: false,
};

export function useAnalytics(userId?: string) {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    cancelledRef.current = false;
    setData(d => ({ ...d, loading: true }));

    const sb = createClient();
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [viewsRes, todayRes, uniqueRes, mobileRes, desktopRes, activityRes, linksRes] =
      await Promise.allSettled([
        sb.from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("profile_user_id", userId),

        sb.from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("profile_user_id", userId)
          .gte("viewed_at", todayStart),

        sb.from("profile_views")
          .select("viewer_user_id", { count: "exact", head: true })
          .eq("profile_user_id", userId)
          .not("viewer_user_id", "is", null),

        sb.from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("profile_user_id", userId)
          .eq("device_type", "mobile"),

        sb.from("profile_views")
          .select("*", { count: "exact", head: true })
          .eq("profile_user_id", userId)
          .eq("device_type", "desktop"),

        sb.from("profile_views")
          .select("viewed_at")
          .eq("profile_user_id", userId)
          .order("viewed_at", { ascending: false })
          .limit(1),

        sb.from("link_clicks")
          .select("link_label, link_url")
          .eq("profile_user_id", userId)
          .order("clicked_at", { ascending: false })
          .limit(500),
      ]);

    if (cancelledRef.current) return;

    const totalViews     = viewsRes.status     === "fulfilled" ? (viewsRes.value.count     ?? 0) : 0;
    const viewsToday     = todayRes.status     === "fulfilled" ? (todayRes.value.count     ?? 0) : 0;
    const uniqueVisitors = uniqueRes.status    === "fulfilled" ? (uniqueRes.value.count    ?? 0) : 0;
    const mobileCount    = mobileRes.status    === "fulfilled" ? (mobileRes.value.count    ?? 0) : 0;
    const desktopCount   = desktopRes.status   === "fulfilled" ? (desktopRes.value.count   ?? 0) : 0;

    const deviceTotal = mobileCount + desktopCount;
    const mobilePct   = deviceTotal > 0 ? Math.round((mobileCount / deviceTotal) * 100) : 0;
    const desktopPct  = deviceTotal > 0 ? 100 - mobilePct : 0;

    const recentRow      = activityRes.status  === "fulfilled" ? activityRes.value.data?.[0] : null;
    const recentActivity = recentRow?.viewed_at ? new Date(recentRow.viewed_at) : null;

    // Aggregate link clicks client-side
    const linkMap = new Map<string, TopLink>();
    if (linksRes.status === "fulfilled" && linksRes.value.data) {
      for (const row of linksRes.value.data) {
        const key      = row.link_label || row.link_url;
        const existing = linkMap.get(key);
        if (existing) existing.clicks++;
        else linkMap.set(key, { label: row.link_label, url: row.link_url, clicks: 1 });
      }
    }
    const topLinks = [...linkMap.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 5);

    setData({
      totalViews, viewsToday, uniqueVisitors,
      topLinks, mobilePct, desktopPct,
      recentActivity, loading: false,
    });
  }, [userId]);

  useEffect(() => {
    cancelledRef.current = false;
    refresh();
    // Auto-refresh every 60 seconds while mounted
    const id = setInterval(refresh, 60_000);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [refresh]);

  return { ...data, refresh };
}
