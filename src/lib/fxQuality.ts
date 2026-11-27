"use client";
/**
 * Calidad automática de la página (2026-11-27, "drakovin le va lageado en un
 * Honor 400"): the per-card watcher in useCardInteractions only runs while the
 * card's light moves by itself, so a card full of effects that never moves its
 * light (holo + glare + dust + sweep + retro…) could lag forever on a mid-range
 * phone. This watches the PAGE for the first seconds of each visit (and after
 * coming back to the tab): three 1-second windows in a row under ~35 fps →
 * <html data-fxq="low">: the heavy layers go away ([data-fx-heavy]) and the
 * ambient loops inside the effect layers stop where they are (a frozen
 * sparkle looks the same in a still frame). Only on pages with a card; it
 * never comes back up during the visit. Never throws.
 */
import { crumb } from "@/lib/crashProbe";

const WATCH_MS = 15_000;
let started = false;

export function startFxQuality(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  let raf = 0, until = 0, winStart = 0, frames = 0, bad = 0, last = 0;
  const html = document.documentElement;
  const tick = (t: number) => {
    raf = 0;
    if (html.dataset.fxq === "low" || document.hidden) return;
    // A gap (tab away, page busy loading) is not a frame rate.
    if (last && t - last > 400) { winStart = t; frames = 0; }
    last = t;
    if (document.querySelector("[data-profile-card]")) {
      if (!winStart) winStart = t;
      frames++;
      if (t - winStart >= 1000) {
        const fps = (frames * 1000) / (t - winStart);
        bad = fps < 35 ? bad + 1 : 0;
        winStart = t; frames = 0;
        if (bad >= 3) { html.dataset.fxq = "low"; crumb("fx:low"); return; }
      }
    }
    if (t < until) raf = requestAnimationFrame(tick);
  };
  const watch = () => {
    if (document.hidden || html.dataset.fxq === "low") return;
    until = performance.now() + WATCH_MS; winStart = 0; frames = 0; bad = 0; last = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  watch();
  const onVis = () => { if (!document.hidden) watch(); };
  document.addEventListener("visibilitychange", onVis);
  // A route change inside the app (another profile) gets its own look.
  const onNav = () => watch();
  window.addEventListener("popstate", onNav);
  return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("popstate", onNav); started = false; };
}
