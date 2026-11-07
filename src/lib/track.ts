"use client";
/**
 * The app's own analytics (2026-11-07): a few named events to public.track()
 * — no recordings, no third party, nothing personal beyond the user id the
 * database already knows. The actor is this device's key (deviceKey), so the
 * sign-up funnel follows the same person before and after logging in.
 * "visit" marks the device active today (once a day, remembered locally).
 * Never throws and never waits: a failed track is simply lost.
 */
import { createClient } from "@/lib/supabase/client";
import { deviceKey } from "@/lib/viewer";

export type TrackEvent =
  | "landing_view" | "claim_click" | "login_view" | "signup_submit" | "signup_google" | "login_done"
  | "setup_view" | "setup_done" | "editor_open" | "tour_done" | "tour_skip" | "publish"
  | "note_post" | "favorite_add" | "favorite_remove" | "share_open" | "share_save" | "share_copy_link"
  | "search" | "profile_view" | "bug_report";

function send(name: string, props?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    void createClient().rpc("track", { p_name: name, p_actor: deviceKey(), p_path: path, p_props: props ?? null })
      .then(() => undefined, () => undefined);
  } catch { /* analytics never breaks the app */ }
}

export function track(name: TrackEvent, props?: Record<string, unknown>) {
  markVisit();
  send(name, props);
}

/** Once per day per device (and again after signing in, so the day counts
 * for the user too). */
export function markVisit(signedIn?: boolean) {
  try {
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const key = `mnemo_visit_${signedIn ? "u" : "a"}`;
    if (localStorage.getItem(key) === day) return;
    localStorage.setItem(key, day);
  } catch { /* storage blocked: count it anyway */ }
  send("visit");
}

/** Once per page load (React strict mode / remounts don't double it). */
const once = new Set<string>();
export function trackOnce(name: TrackEvent, props?: Record<string, unknown>) {
  const k = name + (props ? JSON.stringify(props) : "");
  if (once.has(k)) return;
  once.add(k);
  track(name, props);
}
