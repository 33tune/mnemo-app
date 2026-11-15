"use client";
/**
 * "Who is online and for how long" (2026-11-15, admin panel): while a page is
 * open AND visible, ping once a minute (public.ping). The database keeps one
 * row per visit (a ping within 5 min extends it), so this costs one tiny
 * request a minute and no rows of its own. Never throws, never blocks.
 * The admin panel itself is not counted.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deviceKey } from "@/lib/viewer";

function device(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
}

export default function PresencePing() {
  const path = usePathname() || "/";
  useEffect(() => {
    if (path.startsWith("/admin")) return;
    const send = () => {
      if (document.visibilityState !== "visible") return;
      try {
        void createClient().rpc("ping", { p_actor: deviceKey(), p_path: path, p_device: device() })
          .then(() => undefined, () => undefined);
      } catch { /* presence never breaks the app */ }
    };
    send();
    const iv = setInterval(send, 60_000);
    document.addEventListener("visibilitychange", send);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", send); };
  }, [path]);
  return null;
}
