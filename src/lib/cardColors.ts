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
