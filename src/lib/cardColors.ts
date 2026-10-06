/**
 * Pure color-resolution helpers for ProfileCard (Stage FASE 1 — Personalization
 * Core). Single home for `withOpacity`/`luminance` (moved from ProfileCard.tsx,
 * same implementation, now shared) and the new per-role text color resolver.
 *
 * Every existing card has none of the per-role overrides below set — the
 * defaults here are the EXACT opacity values ProfileCard.tsx already hardcoded
 * per role before this stage (see the "byte-identical with no overrides" test).
 * A block-level or per-role override, when present, always wins over the
 * derived default; nothing here talks to computeComposition()/
 * computeBlockLayout() — colors never affect layout/measurement.
 */
import type { CardEffects, ProfileCardData } from "@/types";
import { getProfileCardEffects } from "./profileCardEffects";

export function luminance(hex: string): number {
  if (!hex?.startsWith("#") || hex.length < 7) return 0;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function withOpacity(hex: string, alpha: number): string {
  if (!hex?.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Base color (menu redesign Phase 2) ───────────────────────────────────
// `card.textColor` is the color every role color (and the PFP border/shadow
// defaults, the Links icon default and the drag outlines) derives from. The
// fallback depends on the EFFECTIVE background: dark ink on a light card,
// white otherwise. Moved verbatim from ProfileCard.tsx so the render and the
// editor's "Color de todos los textos" row show the same value.
export const CARD_BASE_COLOR_ON_LIGHT = "#0f0f0f";
export const CARD_BASE_COLOR_ON_DARK = "#ffffff";

type BaseColorCard = Pick<ProfileCardData, "textColor" | "bgColor"> & Parameters<typeof getProfileCardEffects>[0];

/** Is the card's effective background light? (ProfileCard.tsx's `isLight`.) */
export function cardIsLight(card: BaseColorCard, effective: CardEffects = getProfileCardEffects(card)): boolean {
  return luminance((effective.bg?.color ?? card.bgColor) as string) > 0.5;
}

/** The effective base text color: `card.textColor`, else the background-
 * derived default. */
export function cardBaseColor(card: BaseColorCard, effective: CardEffects = getProfileCardEffects(card)): string {
  return card.textColor ?? (cardIsLight(card, effective) ? CARD_BASE_COLOR_ON_LIGHT : CARD_BASE_COLOR_ON_DARK);
}

/** Field state of a color that inherits from the base color when unset:
 * a stored override is "modified" (reset deletes the key), absence is
 * "inherited" (shown with the inherited chip). */
export function inheritableColorState(override: string | undefined | null): "modified" | "inherited" {
  return override ? "modified" : "inherited";
}

// Opacity applied to `baseColor` for each text role, absent an explicit
// override — exactly what ProfileCard.tsx hardcoded per role before this
// stage (name 0.95, handle/location/views 0.45 aka "faintColor", descriptor
// 0.72 aka "secondaryColor", bio 0.42 — bio's was always its own one-off,
// never shared with any named constant).
const DEFAULT_ROLE_OPACITY = {
  name: 0.95,
  handle: 0.45,
  descriptor: 0.72,
  location: 0.45,
  bio: 0.42,
  views: 0.45,
  linksIcon: 0.45,
} as const;

export interface CardColorOverrides {
  name?: string;
  handle?: string;
  descriptor?: string;
  location?: string;
  bio?: string;
  views?: string;
  linksIcon?: string;
}

export interface ResolvedCardColors {
  name: string;
  handle: string;
  descriptor: string;
  location: string;
  bio: string;
  views: string;
  linksIcon: string;
}

/**
 * Resolves the color for every independently-colorable text role. `overrides`
 * is whatever the card has explicitly set (absent fields fall back to the
 * opacity-derived default, same formula ProfileCard.tsx always used).
 */
export function resolveCardColors(baseColor: string, overrides?: CardColorOverrides): ResolvedCardColors {
  return {
    name:       overrides?.name       ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.name),
    handle:     overrides?.handle     ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.handle),
    descriptor: overrides?.descriptor ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.descriptor),
    location:   overrides?.location   ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.location),
    bio:        overrides?.bio        ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.bio),
    views:      overrides?.views      ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.views),
    linksIcon:  overrides?.linksIcon  ?? withOpacity(baseColor, DEFAULT_ROLE_OPACITY.linksIcon),
  };
}

// ── Multicolor gradient interpolation (per-letter animation) ───────────────
// Stage "Product closeout": when Name's gradient/multicolor is combined with
// per-letter animation, each letter gets a SOLID color sampled from these
// stops by its character index — not a sliced background-clip — because a
// position-fixed gradient visually shears once letters independently
// translate. See RoleTextEffect's header in types/index.ts.

function hexToRgbTuple(hex: string): [number, number, number] {
  if (!hex?.startsWith("#") || hex.length < 7) return [255, 255, 255];
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHexColors(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgbTuple(a);
  const [br, bg, bb] = hexToRgbTuple(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

/** `t` is 0-1 across the WHOLE stop list (0 = first color, 1 = last). */
export function interpolateMulticolor(colors: string[], t: number): string {
  if (colors.length === 0) return "#ffffff";
  if (colors.length === 1) return colors[0];
  const clamped = Math.max(0, Math.min(1, t));
  const segment = clamped * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(segment));
  return mixHexColors(colors[i], colors[i + 1], segment - i);
}

/** Convenience wrapper: the color for character `index` out of `total`
 * characters, evenly distributed across `colors`. */
export function colorForLetterIndex(colors: string[], index: number, total: number): string {
  if (colors.length === 0) return "#ffffff";
  if (total <= 1) return colors[0];
  return interpolateMulticolor(colors, index / (total - 1));
}

/**
 * Block 1 (editor): the `#rrggbb` an `<input type="color">` can show for
 * any color string the renderer produces — `#rgb`, `#rrggbb`, `#rrggbbaa`,
 * `rgb()`/`rgba()` (what withOpacity returns, so every derived role color
 * and most effective defaults). Alpha is dropped: the native picker has no
 * alpha channel, but showing the right hue beats the old blanket fallback.
 * Returns undefined for anything it can't parse (named colors, gradients).
 */
export function toHexInputValue(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const c = color.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(c);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    if (h.length === 6 || h.length === 8) return `#${h.slice(0, 6)}`;
    return undefined;
  }
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/.exec(c);
  if (rgb) {
    const parts = [rgb[1], rgb[2], rgb[3]].map(n => Math.min(255, Number(n)).toString(16).padStart(2, "0"));
    return `#${parts.join("")}`;
  }
  return undefined;
}

/** Alpha channel of a color string (rgba() 4th arg, #rrggbbaa, else 1). */
export function colorAlpha(color: string | undefined): number {
  if (!color) return 1;
  const c = color.trim().toLowerCase();
  const rgba = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/.exec(c);
  if (rgba) return Math.max(0, Math.min(1, Number(rgba[1])));
  const hex8 = /^#[0-9a-f]{6}([0-9a-f]{2})$/.exec(c);
  if (hex8) return parseInt(hex8[1], 16) / 255;
  return 1;
}

/**
 * Block 1 (until Block 2 adds a real alpha editor): the native color
 * picker only yields opaque `#rrggbb`, so picking a hue over a translucent
 * effective color (spotlight ~0.14, default border 0.08, default card bg
 * 0.055) used to turn it into a solid white blotch. This keeps the
 * previous effective alpha on the new hue; opaque previous colors pass the
 * new value through unchanged.
 */
export function keepAlphaOf(next: string, previous: string | undefined): string {
  const alpha = colorAlpha(previous);
  return alpha < 1 ? withOpacity(next, +alpha.toFixed(3)) : next;
}
