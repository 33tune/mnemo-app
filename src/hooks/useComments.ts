"use client";
/**
 * Muro (2026-11-25; was Comentarios): the number of posts on a profile's wall
 * (the bubble on the card's stats row) — shared by every place that shows it.
 * The wall itself lives in useWall.ts.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const countSubs = new Map<string, Set<(n: number) => void>>();
const counts = new Map<string, number>();
function publishCount(owner: string, n: number) {
  counts.set(owner, n);
  countSubs.get(owner)?.forEach(f => f(n));
}
/** A post was added (+1) or removed (−1) on that wall. */
export function bumpCommentCount(owner: string, d: number) {
  publishCount(owner, Math.max(0, (counts.get(owner) ?? 0) + d));
}

/** The number on the card (top-level posts, not replies). */
export function useCommentCount(ownerUserId?: string): number {
  const [n, setN] = useState(() => (ownerUserId ? counts.get(ownerUserId) ?? 0 : 0));
  useEffect(() => {
    if (!ownerUserId) return;
    const set = countSubs.get(ownerUserId) ?? new Set();
    set.add(setN);
    countSubs.set(ownerUserId, set);
    let alive = true;
    createClient().rpc("comment_counts", { targets: [ownerUserId] }).then(({ data }) => {
      const row = Array.isArray(data) ? (data[0] as { n?: number } | undefined) : undefined;
      if (alive) publishCount(ownerUserId, Number(row?.n ?? 0));
    });
    return () => { alive = false; set.delete(setN); };
  }, [ownerUserId]);
  return n;
}
