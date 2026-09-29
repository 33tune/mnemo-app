/**
 * Centralized motion-effect keyframes for ProfileCard (Stage FASE 3 — Text &
 * Motion Effects). Two effects share this file: text shimmer (a highlight
 * band sweeping across gradient text) and glow pulse (opacity breathing,
 * reused identically by the card's own glow — "border animation" in the UI
 * — and the PFP's glow). Neither keyframe bakes in any per-card value (no
 * color, no size) — only `animation-duration` varies per card, via the
 * plain `animation` shorthand string these resolvers return — so both
 * keyframes are injected ONCE, globally, not per-card the way floating's
 * @keyframes (CardLayers.tsx's useCardAnimations, which DOES bake in
 * floatHeight) already had to be. That's the whole reason this file exists:
 * shimmer and glow-pulse would otherwise mean three near-identical
 * "check if my <style> tag exists, inject if not" blocks spread across
 * ProfileCard.tsx and CardLayers.tsx — this is the one place that does it.
 *
 * Respects prefers-reduced-motion the same way CanvasBoard.tsx's own
 * el-reveal/land-reveal entrance keyframes already do: a media query
 * redefines both keyframes to their static end-state.
 */
import { useEffect } from "react";

export const SHIMMER_ANIMATION_NAME = "mnemo-text-shimmer";
export const GLOW_PULSE_ANIMATION_NAME = "mnemo-glow-pulse";

const KEYFRAMES_STYLE_ID = "mnemo-motion-keyframes";

const KEYFRAMES_CSS = `
@keyframes ${SHIMMER_ANIMATION_NAME} {
  0%   { background-position: -100% 0, 0 0; }
  100% { background-position: 200% 0, 0 0; }
}
@keyframes ${GLOW_PULSE_ANIMATION_NAME} {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes ${SHIMMER_ANIMATION_NAME}    { from, to { background-position: 0 0, 0 0; } }
  @keyframes ${GLOW_PULSE_ANIMATION_NAME} { from, to { opacity: 0.85; } }
}
`;

/** Injects the shared keyframes into <head> exactly once, regardless of how
 * many cards/callers request it — idempotent by design (checked by a fixed
 * element id), same pattern CardLayers.tsx's useCardAnimations already uses
 * per-card, just at module scope here since nothing here is per-card. */
export function ensureMotionKeyframesInjected(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = KEYFRAMES_STYLE_ID;
  el.textContent = KEYFRAMES_CSS;
  document.head.appendChild(el);
}

/** Call from any component that renders an element using one of these
 * animations — safe to call from multiple components simultaneously (e.g.
 * ProfileCard.tsx for text shimmer/PFP glow-pulse, CardLayers.tsx for the
 * card's own glow-pulse), since injection itself is idempotent. */
export function useMotionKeyframes(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    ensureMotionKeyframesInjected();
  }, [active]);
}

function clampDuration(seconds: number): number {
  return Math.max(0.4, Math.min(20, seconds));
}

const SHIMMER_BASE_DURATION_S = 3;
const GLOW_PULSE_BASE_DURATION_S = 2.5;

/** Pure — the `animation` shorthand string to apply inline. `speed` is a
 * unitless multiplier (1 = default pace, higher = faster), matching the
 * slider contract in ProfileTypographyMenu.tsx. */
export function resolveShimmerAnimation(speed = 1): string {
  const duration = clampDuration(SHIMMER_BASE_DURATION_S / Math.max(0.1, speed));
  return `${SHIMMER_ANIMATION_NAME} ${duration.toFixed(2)}s linear infinite`;
}

/** Same contract as resolveShimmerAnimation, shared by card glow (border
 * section) and PFP glow. */
export function resolveGlowPulseAnimation(speed = 1): string {
  const duration = clampDuration(GLOW_PULSE_BASE_DURATION_S / Math.max(0.1, speed));
  return `${GLOW_PULSE_ANIMATION_NAME} ${duration.toFixed(2)}s ease-in-out infinite`;
}
