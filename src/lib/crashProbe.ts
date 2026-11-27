"use client";
/**
 * Crash probe (2026-11-27): iPhone Safari sometimes kills the page ("Ocurrió un
 * problema varias veces en myland.lol") and reloads it; nothing in the page
 * runs when that happens, so it is noticed on the NEXT load: while a page is
 * open and visible, a flag lives in sessionStorage (it survives the reload of
 * the same tab); leaving the page normally (pagehide) or hiding it clears it.
 * Finding it at load = the previous page died while on screen → one "crash"
 * event with the last few things the person did (crumbs: screen, tool, sheet,
 * photo picker…), so the cause shows up in the data from real phones.
 * Never throws; nothing personal (only fixed names and the path).
 */
import { track } from "@/lib/track";

const KEY = "ml_alive";
const MAX_CRUMBS = 10;

type Alive = { path: string; t: number; crumbs: string[] };

function read(): Alive | null {
  try { const v = sessionStorage.getItem(KEY); return v ? (JSON.parse(v) as Alive) : null; } catch { return null; }
}
function write(a: Alive | null) {
  try { if (a) sessionStorage.setItem(KEY, JSON.stringify(a)); else sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

/** Something the person did, kept with the flag (only short fixed names). */
export function crumb(name: string) {
  if (typeof window === "undefined") return;
  const a = read();
  if (!a) return;
  a.crumbs = [...a.crumbs, `${name.slice(0, 24)}@${Math.round((Date.now() - a.t) / 1000)}s`].slice(-MAX_CRUMBS);
  write(a);
}

/** Starts the probe for this page load; returns the cleanup. */
export function startCrashProbe(): () => void {
  if (typeof window === "undefined") return () => {};
  const prev = read();
  if (prev) {
    const ua = navigator.userAgent;
    const ios = ua.match(/OS (\d+)_(\d+)/);
    track("crash", {
      path: prev.path.slice(0, 60),
      crumbs: prev.crumbs,
      alive: Math.round((Date.now() - prev.t) / 1000),
      ios: ios ? `${ios[1]}.${ios[2]}` : null,
      phone: /iPhone|Android/.test(ua),
      mem: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    });
  }
  const arm = () => write({ path: location.pathname, t: Date.now(), crumbs: [] });
  if (document.visibilityState === "visible") arm(); else write(null);
  const onVis = () => {
    if (document.visibilityState === "visible") { if (!read()) arm(); }
    else write(null);
  };
  const onHide = () => write(null);
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onHide);
  return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", onHide); };
}
