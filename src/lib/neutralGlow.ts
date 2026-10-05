/**
 * Iteration 0 — O3 "Neutro solo para lo nuevo" (owner decision 2026-10-02).
 *
 * When the EDITOR creates a glow (or turns on hover glow) and no explicit
 * color exists, it writes an explicit neutral color instead of letting the
 * render fallback (#a855f7 violet in CardLayers.tsx) show. The render
 * fallback itself is untouched and nothing is migrated: existing profiles
 * look exactly the same.
 *
 * Why #ffffff: it is already the render default of the PFP glow and the
 * text glow (one neutral for every glow in the system), it is monochrome
 * (the editor is monochrome; the only color is the user's), and it is a
 * 6-digit hex, which CardLayers requires — it appends alpha suffixes
 * (`${color}40`) to the glow color.
 */
import type { CardEffects } from "@/types";
import { getActive, getPaused, type EffectPath } from "./effectPause";

export const GLOW_NEUTRAL_COLOR = "#ffffff";

/**
 * Card / Music glow (CardEffects.glow, whose color may come from a legacy
 * `glowColor` already merged into `effective`). Returns the patch to merge
 * into the RAW glow when a glow / hover glow is being turned on:
 * `{ color: GLOW_NEUTRAL_COLOR }` only if
 * - no color exists (raw nor legacy), and
 * - nothing visible is currently using the violet fallback (a static glow
 *   with intensity > 0, or hover glow already on) — turning a second glow
 *   on must never recolor one the user already sees.
 * Otherwise `{}`.
 */
export function neutralGlowPatch(effective: CardEffects | undefined): { color?: string } {
  const glow = effective?.glow;
  if (glow?.color) return {};
  const staticVisible = !!(glow?.outer || glow?.inner) && (glow?.intensity ?? 0) > 0;
  const hoverOn = !!effective?.interactions?.hoverGlow;
  if (staticVisible || hoverOn) return {};
  return { color: GLOW_NEUTRAL_COLOR };
}

/**
 * PFP / text glow (path-based, turned on via resumeWithIntensity). `before`
 * is the effects before the toggle, `after` the result. When the glow is
 * NEW (nothing active nor paused at `path` before) and has no color, the
 * neutral color is written explicitly. A resumed (paused) config is the
 * user's own and is restored untouched.
 */
export function withNeutralGlowOnCreate(before: CardEffects | undefined, path: EffectPath, after: CardEffects): CardEffects {
  const existed = getActive(before, path) !== undefined || getPaused(before, path) !== undefined;
  if (existed) return after;
  const glow = getActive<{ color?: string }>(after, path);
  if (!glow || glow.color) return after;
  const keys = path.split(".");
  // Rebuild the path with the color added (immutable).
  const setIn = (obj: Record<string, unknown>, i: number): Record<string, unknown> => {
    const k = keys[i];
    if (i === keys.length - 1) return { ...obj, [k]: { ...(obj[k] as object), color: GLOW_NEUTRAL_COLOR } };
    return { ...obj, [k]: setIn((obj[k] as Record<string, unknown>) ?? {}, i + 1) };
  };
  return setIn(after as Record<string, unknown>, 0) as CardEffects;
}
