"use client";
/**
 * Claro / oscuro of the social panels (Feed, Explorar, the resource viewer,
 * the floating buttons) — "Grafito" v2 (2026-11-28). Stored on this device
 * (`myland.gfTheme`), applied as `<html data-gf-theme="dark">` (light = no
 * attribute value "light"); grafito.css reads it. Separate from the editor's
 * theme (each has its own switch).
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

export type GfTheme = "light" | "dark";
const KEY = "myland.gfTheme";
const ATTR = "data-gf-theme";
const EVENT = "myland:gftheme";

export function readGfTheme(): GfTheme {
  try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}
function apply(t: GfTheme) {
  if (typeof document !== "undefined") document.documentElement.setAttribute(ATTR, t);
}
function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { apply(readGfTheme()); cb(); } };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, cb); };
}
const snap = (): GfTheme => (document.documentElement.getAttribute(ATTR) === "dark" ? "dark" : readGfTheme());

export function useGfTheme(): [GfTheme, (t: GfTheme) => void] {
  const theme = useSyncExternalStore(subscribe, snap, () => "light" as GfTheme);
  useEffect(() => { apply(theme); }, [theme]);
  const set = useCallback((t: GfTheme) => {
    try { localStorage.setItem(KEY, t); } catch { /* the attribute still applies */ }
    apply(t);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [theme, set];
}

/** Ink / bubble-background pair for posts drawn on these panels. */
export const gfInk = (t: GfTheme) => (t === "dark" ? { ink: "#F3F4F5", bg: "#26282C" } : { ink: "#15171A", bg: "#ffffff" });
