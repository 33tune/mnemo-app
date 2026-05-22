"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PinItem {
  id:            string;
  element_id:    string;
  element_type:  "image" | "text";
  owner_user_id: string;
  created_at:    string;
  content:       Record<string, unknown>; // snapshot stored at pin time
  owner_handle?: string;
}

export function useElementPins(ownerUserId?: string, currentUserId?: string) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinCounts, setPinCounts] = useState<Map<string, number>>(new Map());
  const [loading,   setLoading]   = useState(false);
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    if (!ownerUserId) return;
    cancelRef.current = false;
    setLoading(true);
    const sb = createClient();

    // Pin counts for all elements belonging to this owner
    const { data: counts } = await sb
      .from("element_pins")
      .select("element_id")
      .eq("owner_user_id", ownerUserId);

    if (cancelRef.current) return;
    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      countMap.set(row.element_id, (countMap.get(row.element_id) ?? 0) + 1);
    }
    setPinCounts(countMap);

    // Which of these elements the current user has pinned
    if (currentUserId) {
      const { data: myPins } = await sb
        .from("element_pins")
        .select("element_id")
        .eq("owner_user_id", ownerUserId)
        .eq("pinner_user_id", currentUserId);

      if (cancelRef.current) return;
      setPinnedIds(new Set((myPins ?? []).map(p => p.element_id as string)));
    }

    setLoading(false);
  }, [ownerUserId, currentUserId]);

  useEffect(() => {
    load();
    return () => { cancelRef.current = true; };
  }, [load]);

  const togglePin = useCallback(async (
    elementId:   string,
    elementType: "image" | "text",
    snapshot:    Record<string, unknown>,
  ) => {
    if (!currentUserId || !ownerUserId) return;

    const alreadyPinned = pinnedIds.has(elementId);
    const sb = createClient();

    // Optimistic update
    setPinnedIds(prev => {
      const ns = new Set(prev);
      alreadyPinned ? ns.delete(elementId) : ns.add(elementId);
      return ns;
    });
    setPinCounts(prev => {
      const ns = new Map(prev);
      const cur = ns.get(elementId) ?? 0;
      ns.set(elementId, Math.max(0, alreadyPinned ? cur - 1 : cur + 1));
      return ns;
    });

    if (alreadyPinned) {
      const { error } = await sb
        .from("element_pins")
        .delete()
        .eq("element_id",    elementId)
        .eq("pinner_user_id", currentUserId);
      if (error) {
        // Revert
        setPinnedIds(prev => new Set([...prev, elementId]));
        setPinCounts(prev => { const ns = new Map(prev); ns.set(elementId, (ns.get(elementId) ?? 0) + 1); return ns; });
      }
    } else {
      const { error } = await sb.from("element_pins").insert({
        element_id:    elementId,
        element_type:  elementType,
        owner_user_id: ownerUserId,
        pinner_user_id: currentUserId,
        content:       snapshot,
      });
      if (error) {
        // Revert
        setPinnedIds(prev => { const ns = new Set(prev); ns.delete(elementId); return ns; });
        setPinCounts(prev => { const ns = new Map(prev); ns.set(elementId, Math.max(0, (ns.get(elementId) ?? 1) - 1)); return ns; });
      }
    }
  }, [currentUserId, ownerUserId, pinnedIds]);

  return { pinnedIds, pinCounts, loading, togglePin };
}

// ── Fetch user's saved pins (for PINNED tab in SocialView) ──────────────────────
export function useMyPins(currentUserId?: string) {
  const [pins,    setPins]    = useState<PinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) { setPins([]); return; }
    cancelRef.current = false;
    setLoading(true);

    const sb = createClient();
    (async () => {
      try {
        const { data } = await sb
          .from("element_pins")
          .select("id, element_id, element_type, owner_user_id, created_at, content")
          .eq("pinner_user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(60);

        if (cancelRef.current) return;
        if (!data?.length) { setPins([]); setLoading(false); return; }

        const ownerIds = [...new Set(data.map(p => p.owner_user_id))];
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, handle")
          .in("user_id", ownerIds);

        if (cancelRef.current) return;
        const hMap = new Map((profiles ?? []).map(p => [p.user_id, p.handle as string]));

        setPins(data.map(p => ({
          id:            p.id,
          element_id:    p.element_id,
          element_type:  p.element_type as "image" | "text",
          owner_user_id: p.owner_user_id,
          created_at:    p.created_at,
          content:       (p.content ?? {}) as Record<string, unknown>,
          owner_handle:  hMap.get(p.owner_user_id),
        })));
        setLoading(false);
      } catch {
        if (!cancelRef.current) setLoading(false);
      }
    })();

    return () => { cancelRef.current = true; };
  }, [currentUserId]);

  return { pins, loading };
}
