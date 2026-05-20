"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceState } from "@/types";

function computePresence(
  lastActiveAt: string | null,
  lastProfileUpdateAt: string | null,
): PresenceState {
  if (!lastActiveAt) return "OFFLINE";
  const now = Date.now();
  const activeMins = (now - new Date(lastActiveAt).getTime()) / 60_000;
  const updateMins = lastProfileUpdateAt
    ? (now - new Date(lastProfileUpdateAt).getTime()) / 60_000
    : Infinity;

  if (updateMins < 15)  return "EDITING SPACE";
  if (activeMins < 5)   return "ACTIVE NOW";
  if (activeMins < 30)  return "AWAY";
  return "OFFLINE";
}

export function usePresence(userId?: string): PresenceState {
  const [state, setState] = useState<PresenceState>("OFFLINE");

  useEffect(() => {
    if (!userId) return;
    createClient()
      .from("profiles")
      .select("last_active_at, last_profile_update_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setState(computePresence(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any).last_active_at ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any).last_profile_update_at ?? null,
        ));
      });
  }, [userId]);

  return state;
}
