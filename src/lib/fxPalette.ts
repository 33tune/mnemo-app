/**
 * Color sets shared by the card effects (2026-11-11, user request: "que no
 * sean siempre arcoíris"). Holo, Glitter, Strass, Aura, Polvo, Sello and the
 * border light all take a `palette` (+ `colors` for "custom"); "card" uses
 * the colors the card already has (cardPalette.ts, passed in by the caller).
 *
 * Pure: no React, no DOM.
 */
import type { FxPaletteId } from "@/types";

export const FX_PALETTES: Record<Exclude<FxPaletteId, "card" | "custom">, string[]> = {
  rainbow: ["#ff6b8b", "#ffd36b", "#9bff7a", "#6bf3ff", "#7d8bff", "#e07bff"],
  pastel:  ["#ffc9de", "#fff1b8", "#c9f7d9", "#c2e9ff", "#dccbff"],
  gold:    ["#7a4f0c", "#e8b54a", "#fff3c4", "#c9952c"],
  silver:  ["#6f7a8c", "#e9eef7", "#ffffff", "#a9b4c6"],
  fire:    ["#ff2d55", "#ff8a1f", "#ffe14d", "#ff5a36"],
  ice:     ["#7fe7ff", "#e8fbff", "#8aa8ff", "#c8b8ff"],
  neon:    ["#ff2bd6", "#00f0ff", "#b6ff00", "#7a5cff"],
};

export const FX_PALETTE_OPTIONS: { id: FxPaletteId; label: string }[] = [
  { id: "rainbow", label: "Arcoíris" },
  { id: "pastel",  label: "Pastel" },
  { id: "gold",    label: "Oro" },
  { id: "silver",  label: "Plata" },
  { id: "fire",    label: "Fuego" },
  { id: "ice",     label: "Hielo" },
  { id: "neon",    label: "Neón" },
  { id: "card",    label: "Mi card" },
  { id: "custom",  label: "Míos" },
];

export const FX_CUSTOM_DEFAULT = ["#ff7ab8", "#7ad7ff"];
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Only "#rgb" / "#rrggbb(aa)" reach the CSS (the list is user data). */
export function cleanColors(colors: readonly unknown[] | undefined, max = 4): string[] {
  const out: string[] = [];
  for (const c of colors ?? []) {
    if (typeof c === "string" && HEX.test(c.trim())) out.push(c.trim());
    if (out.length >= max) break;
  }
  return out;
}

/**
 * The colors of a palette setting. `fallback` = what the effect uses when
 * nothing is chosen (its own look, so saved cards don't change); `cardColors`
 * = the card's own colors for "card".
 */
export function fxColors(
  cfg: { palette?: FxPaletteId; colors?: string[] } | undefined,
  fallback: readonly string[],
  cardColors?: readonly string[],
): string[] {
  const id = cfg?.palette;
  if (!id) return [...fallback];
  if (id === "custom") {
    const c = cleanColors(cfg?.colors);
    return c.length >= 2 ? c : c.length === 1 ? [c[0], "#ffffff"] : [...FX_CUSTOM_DEFAULT];
  }
  if (id === "card") {
    const c = cleanColors(cardColors, 5);
    return c.length >= 2 ? c : c.length === 1 ? [c[0], "#ffffff"] : [...fallback];
  }
  return [...(FX_PALETTES[id] ?? fallback)];
}

/** The palette as a loop (first color again at the end): seamless when repeated. */
export function loopColors(colors: readonly string[]): string[] {
  if (colors.length === 0) return ["#ffffff", "#ffffff"];
  return colors[colors.length - 1] === colors[0] && colors.length > 1 ? [...colors] : [...colors, colors[0]];
}

/** "#rgb" / "#rrggbb" -> [r, g, b] (0–255); anything else = white. */
export function hexRgb(hex: string): [number, number, number] {
  const m = HEX.exec(hex.trim());
  if (!m) return [255, 255, 255];
  const h = m[1].length === 3 ? m[1].split("").map(d => d + d).join("") : m[1].slice(0, 6);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
/** Mix two colors (t = 0 → a, 1 → b), as "#rrggbb". */
export function mixHex(a: string, b: string, t: number): string {
  const A = hexRgb(a), B = hexRgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
