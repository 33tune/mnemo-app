"use client";
/**
 * Favoritos (2026-11-06): the count of a profile (anyone sees it) and, for a
 * signed-in visitor, whether they gave it and a toggle. Anonymous: the owner
 * never learns who (favorites RLS: each one reads only the rows they made).
 */
import { track } from "@/lib/track";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useViewerId } from "@/lib/viewer";

export type FavoriteState = {
  count: number;
  /** The visitor gave it a favorite. */
  liked: boolean;
  /** Signed in and not the owner: the heart works. */
  canLike: boolean;
  /** Not signed in (the heart asks to log in). */
  signedOut: boolean;
  toggle: () => void;
};

const listeners = new Map<string, Set<(n: number, liked: boolean) => void>>();

export function useFavorite(ownerUserId?: string): FavoriteState {
  const viewer = useViewerId();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!ownerUserId) return;
    let alive = true;
    const sb = createClient();
    sb.rpc("favorite_counts", { targets: [ownerUserId] }).then(({ data }) => {
      const row = Array.isArray(data) ? (data[0] as { n?: number } | undefined) : undefined;
      if (alive) setCount(Number(row?.n ?? 0));
    });
    if (viewer && viewer !== ownerUserId) {
      sb.from("favorites").select("id").eq("user_id", viewer).eq("target_user_id", ownerUserId).maybeSingle()
        .then(({ data }) => { if (alive) setLiked(!!data); });
    }
    // Two hearts of the same profile on a page (card + the one by Compartir).
    const set = listeners.get(ownerUserId) ?? new Set();
    const on = (n: number, l: boolean) => { setCount(n); setLiked(l); };
    set.add(on);
    listeners.set(ownerUserId, set);
    return () => { alive = false; set.delete(on); };
  }, [ownerUserId, viewer]);

  const canLike = !!viewer && !!ownerUserId && viewer !== ownerUserId;
  const toggle = useCallback(() => {
    if (!canLike || !ownerUserId || !viewer) return;
    const next = !liked;
    const n = Math.max(0, count + (next ? 1 : -1));
    listeners.get(ownerUserId)?.forEach(f => f(n, next));
    track(next ? "favorite_add" : "favorite_remove");
    const sb = createClient();
    const q = next
      ? sb.from("favorites").insert({ user_id: viewer, target_user_id: ownerUserId })
      : sb.from("favorites").delete().eq("user_id", viewer).eq("target_user_id", ownerUserId);
    q.then(({ error }) => {
      // A duplicate (already given in another tab) is still "given".
      if (error && !(next && error.code === "23505")) listeners.get(ownerUserId)?.forEach(f => f(count, liked));
    });
  }, [canLike, ownerUserId, viewer, liked, count]);

  return { count, liked, canLike, signedOut: viewer === null, toggle };
}
