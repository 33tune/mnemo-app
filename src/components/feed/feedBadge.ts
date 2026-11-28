"use client";
/**
 * The Feed's badge (2026-11-28): how many new posts / reposts from my favorites
 * since I last opened the Feed. The moment is kept in this browser
 * (localStorage); the count comes from feed_count_since — on load, when the tab
 * comes back and every 3 minutes (no live channel: database load).
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "ml_feed_seen";
const subs = new Set<(n: number) => void>();
let current = 0;
const set = (n: number) => { current = n; subs.forEach(f => f(n)); };

function since(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v;
    // First time: count what came in the last day.
    const d = new Date(Date.now() - 86400000).toISOString();
    localStorage.setItem(KEY, d);
    return d;
  } catch { return new Date(Date.now() - 86400000).toISOString(); }
}

export function markFeedSeen() {
  try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* */ }
  set(0);
}

export function useFeedBadge(enabled: boolean): number {
  const [n, setN] = useState(current);
  // Always listening (markFeedSeen clears it while the Feed is open); counting only when enabled.
  useEffect(() => { subs.add(setN); setN(current); return () => { subs.delete(setN); }; }, []);
  useEffect(() => {
    if (!enabled) return;
    const read = () => createClient().rpc("feed_count_since", { p_since: since() }).then(({ data }) => set(Number(data ?? 0)), () => {});
    read();
    const onVis = () => { if (document.visibilityState === "visible") read(); };
    const iv = window.setInterval(onVis, 180_000);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [enabled]);
  return n;
}
