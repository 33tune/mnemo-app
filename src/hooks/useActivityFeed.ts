"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type ActivityType = "canvas_update" | "new_image" | "status_change" | "new_guestbook" | "followed_you";

export interface ActivityFeedItem {
  id:            string;
  user_id:       string;
  activity_type: ActivityType;
  metadata:      Record<string, unknown>;
  created_at:    string;
  // joined from profiles
  handle?:       string;
  display_name?: string | null;
  avatar_url?:   string | null;
}

export function useActivityFeed(currentUserId?: string) {
  const [items,   setItems]   = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;
    cancelledRef.current = false;
    setLoading(true);

    async function load() {
      const sb = createClient();

      // Get who current user follows
      const { data: followsData } = await sb
        .from("followers")
        .select("following_id")
        .eq("follower_id", currentUserId);

      if (cancelledRef.current) return;

      const followedIds = (followsData ?? []).map(f => f.following_id as string);
      if (!followedIds.length) { setItems([]); setLoading(false); return; }

      // Fetch activity from followed users + their profiles
      const { data: actData } = await sb
        .from("activity_feed")
        .select("id, user_id, activity_type, metadata, created_at")
        .in("user_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelledRef.current) return;
      if (!actData?.length) { setItems([]); setLoading(false); return; }

      // Fetch profiles for the authors
      const userIds = [...new Set(actData.map(a => a.user_id))];
      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, handle, display_name, avatar_url")
        .in("user_id", userIds);

      if (cancelledRef.current) return;

      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

      const merged: ActivityFeedItem[] = actData.map(a => {
        const p = profileMap.get(a.user_id);
        return {
          id:            a.id,
          user_id:       a.user_id,
          activity_type: a.activity_type as ActivityType,
          metadata:      (a.metadata ?? {}) as Record<string, unknown>,
          created_at:    a.created_at,
          handle:        p?.handle,
          display_name:  p?.display_name ?? null,
          avatar_url:    p?.avatar_url ?? null,
        };
      });

      setItems(merged);
      setLoading(false);
    }

    load().catch(e => {
      console.error("[useActivityFeed]", e);
      if (!cancelledRef.current) setLoading(false);
    });

    return () => { cancelledRef.current = true; };
  }, [currentUserId]);

  // Realtime subscription — new activity from followed users
  useEffect(() => {
    if (!currentUserId) return;
    const sb = createClient();
    const channel = sb
      .channel(`activity-feed:${currentUserId}:${crypto.randomUUID()}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "activity_feed" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const row = payload.new as { id: string; user_id: string; activity_type: string; metadata: Record<string, unknown>; created_at: string };
          // Only care about activity from followed users
          const sb2 = createClient();
          const { data } = await sb2
            .from("followers")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", row.user_id)
            .maybeSingle();
          if (!data) return;

          const { data: profile } = await sb2
            .from("profiles")
            .select("handle, display_name, avatar_url")
            .eq("user_id", row.user_id)
            .maybeSingle();

          const newItem: ActivityFeedItem = {
            id:            row.id,
            user_id:       row.user_id,
            activity_type: row.activity_type as ActivityType,
            metadata:      row.metadata ?? {},
            created_at:    row.created_at,
            handle:        profile?.handle,
            display_name:  profile?.display_name ?? null,
            avatar_url:    profile?.avatar_url ?? null,
          };
          setItems(prev => {
            if (prev.some(i => i.id === newItem.id)) return prev;
            return [newItem, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [currentUserId]);

  return { items, loading };
}
