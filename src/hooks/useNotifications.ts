"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotifType = "follow" | "favorite";

export type AppNotification = {
  id:          string;
  type:        NotifType;
  actorUserId: string;
  actorHandle: string;
  actorName:   string | null;
  createdAt:   string;
  read:        boolean;
};

const STORAGE_KEY = "mnemo:last_signals_viewed";

function getLastViewed(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function setLastViewed() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

export function useNotifications(currentUserId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    if (!currentUserId) { setNotifications([]); setUnreadCount(0); return; }
    setLoading(true);

    const sb = createClient();
    const lastViewed = getLastViewed();

    const [{ data: followRows }, { data: favRows }] = await Promise.all([
      sb.from("followers")
        .select("id, follower_id, created_at")
        .eq("following_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(40),
      sb.from("favorites")
        .select("id, user_id, created_at")
        .eq("target_user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const allFollows = followRows ?? [];
    const allFavs    = favRows   ?? [];

    const actorIds = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...allFollows.map((r: any) => r.follower_id as string),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...allFavs.map((r: any) => r.user_id as string),
    ];
    const uniqueIds = [...new Set(actorIds)];

    const profileMap: Record<string, { handle: string; display_name: string | null }> = {};
    if (uniqueIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, handle, display_name")
        .in("user_id", uniqueIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.user_id] = { handle: p.handle ?? "", display_name: p.display_name ?? null };
      });
    }

    const notifs: AppNotification[] = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...allFollows.map((r: any) => {
        const prof = profileMap[r.follower_id] ?? { handle: r.follower_id.slice(0, 8), display_name: null };
        return {
          id:          r.id as string,
          type:        "follow" as const,
          actorUserId: r.follower_id as string,
          actorHandle: prof.handle,
          actorName:   prof.display_name,
          createdAt:   r.created_at as string,
          read:        lastViewed ? (r.created_at as string) <= lastViewed : false,
        };
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...allFavs.map((r: any) => {
        const prof = profileMap[r.user_id] ?? { handle: r.user_id.slice(0, 8), display_name: null };
        return {
          id:          r.id as string,
          type:        "favorite" as const,
          actorUserId: r.user_id as string,
          actorHandle: prof.handle,
          actorName:   prof.display_name,
          createdAt:   r.created_at as string,
          read:        lastViewed ? (r.created_at as string) <= lastViewed : false,
        };
      }),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (cancelledRef.current) return;
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const markAllRead = useCallback(() => {
    setLastViewed();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, loading, unreadCount, markAllRead, refresh: load };
}
