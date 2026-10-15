"use client";
/**
 * Real text measurement for the card's composition engine (2026-10-15):
 * the width of each text with the font the user picked, and the bio's real
 * line count (its words, its line breaks), on an offscreen canvas. Without
 * it the engine estimates from an average character width that ignores the
 * font — wide fonts got cut with "…" and narrow ones wasted room.
 *
 * Browser only. A font that is still loading measures with its fallback;
 * when the browser finishes loading fonts the cache is cleared and
 * useFontsVersion() re-renders the cards that use it.
 */
import { useEffect, useState } from "react";
import type { MeasureFont, TextMeasurer } from "./profileCardLayout";

let ctx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();
let listening = false;

function context(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx;
  ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  return ctx;
}

function listen() {
  if (listening || typeof document === "undefined" || !document.fonts) return;
  listening = true;
  document.fonts.addEventListener("loadingdone", () => cache.clear());
}

function rawWidth(c: CanvasRenderingContext2D, text: string, f: MeasureFont): number {
  const t = f.uppercase ? text.toUpperCase() : text;
  const key = `${f.family}|${f.size}|${f.weight}|${f.letterSpacing}|${t}`;
  const hit = cache.get(key);
  if (hit != null) return hit;
  c.font = `${f.weight} ${f.size}px ${f.family}`;
  // letter-spacing is added after every character, the last one included,
  // exactly like CSS does.
  const w = c.measureText(t).width + [...t].length * f.letterSpacing;
  cache.set(key, w);
  return w;
}

/** Greedy wrap like the browser (white-space: pre-wrap): breaks at spaces,
 * keeps explicit line breaks, a word longer than the line overflows on its
 * own line. */
function wrapLines(c: CanvasRenderingContext2D, text: string, f: MeasureFont, availWidth: number): number {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let line = "";
    let count = 1;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || rawWidth(c, candidate, f) <= availWidth) { line = candidate; continue; }
      count += 1;
      line = word;
    }
    lines += count;
  }
  return Math.max(1, lines);
}

let measurer: TextMeasurer | undefined;

/** The shared measurer, or undefined outside the browser. */
export function getTextMeasurer(): TextMeasurer | undefined {
  if (measurer) return measurer;
  const c = context();
  if (!c) return undefined;
  listen();
  measurer = {
    width: (text, f) => rawWidth(c, text, f),
    lines: (text, f, availWidth) => wrapLines(c, text, f, availWidth),
  };
  return measurer;
}

/** Bumps every time the browser finishes loading fonts — a dependency for
 * anything laid out with getTextMeasurer(). */
export function useFontsVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    listen();
    const bump = () => setV(n => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    document.fonts.ready.then(bump).catch(() => {});
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return v;
}
