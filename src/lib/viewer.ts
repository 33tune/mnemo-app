"use client";
/**
 * Who is looking (2026-11-06): the signed-in user's id, or null — read once
 * per page from the browser session (favorites, notes, the shortcuts bar).
 * Works on phones too (the server only passes `viewerLoggedIn` on computers).
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

let viewerPromise: Promise<string | null> | null = null;
export function getViewerId(): Promise<string | null> {
  if (!viewerPromise) {
    // The local session (no network round trip); the database checks the
    // real user on every write anyway (RLS).
    viewerPromise = createClient().auth.getSession()
      .then(({ data }) => data.session?.user?.id ?? null)
      .catch(() => null);
  }
  return viewerPromise;
}

/** undefined while loading, then the id or null. */
export function useViewerId(): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getViewerId().then(v => { if (alive) setId(v); });
    return () => { alive = false; };
  }, []);
  return id;
}

/** A random id for this device (note views without a session). */
export function deviceKey(): string {
  try {
    let k = localStorage.getItem("mnemo_device");
    if (!k) { k = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("mnemo_device", k); }
    return k;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2, 14);
  }
}
