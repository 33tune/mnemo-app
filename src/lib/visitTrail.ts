"use client";
/**
 * Rastro de la visita (2026-11-27, retención): what each visit did, to learn
 * what people like and where they get bored. Every crumb (crashProbe.crumb:
 * fixed short names — screen, part of the card, tool, section…) is also kept
 * here in memory; when the page is hidden or left, ONE "visit_end" event goes
 * out with how long it lasted, the distinct things used (in order) and the
 * last ones before leaving. A visit under 5 s is not sent. Sent with
 * fetch(keepalive) so it survives closing the tab. Never throws.
 */
import { createClient } from "@/lib/supabase/client";
import { deviceKey } from "@/lib/viewer";

let used: string[] = [];
let last: string[] = [];
let n = 0;
let shownAt = 0;
let token: string | null = null;
let started = false;

export function trail(name: string) {
  const k = name.replace(/@.*$/, "").slice(0, 24);
  n++;
  if (!used.includes(k) && used.length < 24) used.push(k);
  if (last[last.length - 1] !== k) last = [...last, k].slice(-4);
}

function flush() {
  if (!shownAt) return;
  const sec = Math.round((Date.now() - shownAt) / 1000);
  shownAt = 0;
  if (sec < 5) { used = []; last = []; n = 0; return; }
  const props = { sec, n, used, last, phone: /iPhone|Android/i.test(navigator.userAgent) || matchMedia("(pointer: coarse)").matches };
  used = []; last = []; n = 0;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    void fetch(`${url}/rest/v1/rpc/track`, {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${token ?? key}` },
      body: JSON.stringify({ p_name: "visit_end", p_actor: deviceKey(), p_path: location.pathname.slice(0, 120), p_props: props }),
    }).catch(() => undefined);
  } catch { /* analytics never breaks the app */ }
}

export function startVisitTrail(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  const sb = createClient();
  sb.auth.getSession().then(({ data }) => { token = data.session?.access_token ?? null; }).catch(() => undefined);
  const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { token = s?.access_token ?? null; });
  if (document.visibilityState === "visible") shownAt = Date.now();
  const onVis = () => { if (document.visibilityState === "visible") { if (!shownAt) shownAt = Date.now(); } else flush(); };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", onVis);
  return () => { started = false; sub.subscription.unsubscribe(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onVis); };
}
