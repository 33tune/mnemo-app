/**
 * Centralized motion-effect keyframes for ProfileCard (Stage FASE 3 — Text &
 * Motion Effects; extended in "Product closeout" with letter-bounce and
 * flicker; extended again with a real animated multicolor gradient flow —
 * see GRADIENT_FLOW_ANIMATION_NAME). None of these keyframes bake in a
 * per-card value EXCEPT
 * letter-bounce's amplitude, which is read from a CSS custom property
 * (`--letter-amp`, set inline per element) rather than baked into the
 * keyframe rule itself — so every keyframe here can still be injected ONCE,
 * globally, not per-card the way floating's @keyframes (CardLayers.tsx's
 * useCardAnimations, which DOES bake in floatHeight literally) already had
 * to be. That's the whole reason this file exists: these animations would
 * otherwise mean a handful of near-identical "check if my <style> tag
 * exists, inject if not" blocks spread across ProfileCard.tsx and
 * CardLayers.tsx — this is the one place that does it.
 *
 * Respects prefers-reduced-motion the same way CanvasBoard.tsx's own
 * el-reveal/land-reveal entrance keyframes already do: a media query
 * redefines every keyframe here to its static end-state.
 */
import { useEffect } from "react";

export const SHIMMER_ANIMATION_NAME = "mnemo-text-shimmer";
export const GLOW_PULSE_ANIMATION_NAME = "mnemo-glow-pulse";
export const LETTER_BOUNCE_ANIMATION_NAME = "mnemo-letter-bounce";
export const LETTER_SHIMMER_PULSE_ANIMATION_NAME = "mnemo-letter-shimmer-pulse";
export const FLICKER_ANIMATION_NAME = "mnemo-flicker";
export const GRADIENT_FLOW_ANIMATION_NAME = "mnemo-text-gradient-flow";

const KEYFRAMES_STYLE_ID = "mnemo-motion-keyframes";

// Shimmer: sweep across in the first ~45% of the cycle, then hold at the
// end position for the rest — a "pulse of light passes, then pause" rhythm
// reads as more premium/subtle than a continuous back-and-forth sweep.
const KEYFRAMES_CSS = `
@keyframes ${SHIMMER_ANIMATION_NAME} {
  0%   { background-position: -120% 0, 0 0; }
  45%  { background-position: 160% 0, 0 0; }
  100% { background-position: 160% 0, 0 0; }
}
@keyframes ${GLOW_PULSE_ANIMATION_NAME} {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
@keyframes ${LETTER_BOUNCE_ANIMATION_NAME} {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(calc(var(--letter-amp, 4px) * -1)); }
}
@keyframes ${LETTER_SHIMMER_PULSE_ANIMATION_NAME} {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 1; }
}
@keyframes ${FLICKER_ANIMATION_NAME} {
  0%, 100% { opacity: 0; }
  92%      { opacity: 0; }
  93%      { opacity: 1; }
  94%      { opacity: 0; }
  96%      { opacity: 0.6; }
  97%      { opacity: 0; }
}
/* Real multicolor gradient flow (bug fix — "shimmer" used to only sweep a
 * static highlight OVER a fixed gradient; this actually scrolls the
 * gradient's own colors through the text). The CSS background-image this
 * animates is the color stop list DUPLICATED back-to-back with
 * background-size:200% — moving background-position from 0% to 100%
 * shifts by exactly one full copy of the (doubled) image, so the frame at
 * 100% is pixel-identical to the frame at 0% and the infinite loop has no
 * visible seam, regardless of how many stops or whether the first/last
 * colors match. See resolveGradientFlowCss in textEffects.ts.
 */
@keyframes ${GRADIENT_FLOW_ANIMATION_NAME} {
  0%   { background-position: 0% 0; }
  100% { background-position: 100% 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes ${SHIMMER_ANIMATION_NAME}              { from, to { background-position: 0 0, 0 0; } }
  @keyframes ${GLOW_PULSE_ANIMATION_NAME}           { from, to { opacity: 0.85; } }
  @keyframes ${LETTER_BOUNCE_ANIMATION_NAME}        { from, to { transform: translateY(0); } }
  @keyframes ${LETTER_SHIMMER_PULSE_ANIMATION_NAME} { from, to { opacity: 1; } }
  @keyframes ${FLICKER_ANIMATION_NAME}              { from, to { opacity: 0; } }
  @keyframes ${GRADIENT_FLOW_ANIMATION_NAME}        { from, to { background-position: 0% 0; } }
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
 * ProfileCard.tsx for text shimmer/PFP glow-pulse/letter-bounce,
 * CardLayers.tsx for the card's own glow-pulse/flicker), since injection
 * itself is idempotent. */
export function useMotionKeyframes(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    ensureMotionKeyframesInjected();
  }, [active]);
}

function clampDuration(seconds: number): number {
  return Math.max(0.4, Math.min(20, seconds));
}

const SHIMMER_BASE_DURATION_S = 3.2;
const GLOW_PULSE_BASE_DURATION_S = 2.5;
const LETTER_BOUNCE_BASE_DURATION_S = 1.2;
const FLICKER_BASE_DURATION_S = 4;
const GRADIENT_FLOW_BASE_DURATION_S = 6;

/** Pure — the `animation` shorthand string to apply inline. `speed` is a
 * unitless multiplier (1 = default pace, higher = faster), matching the
 * slider contract in RoleTypographyFields.tsx. */
export function resolveShimmerAnimation(speed = 1): string {
  const duration = clampDuration(SHIMMER_BASE_DURATION_S / Math.max(0.1, speed));
  return `${SHIMMER_ANIMATION_NAME} ${duration.toFixed(2)}s ease-in-out infinite`;
}

/** Same contract as resolveShimmerAnimation, shared by card glow (border
 * section) and PFP glow. */
export function resolveGlowPulseAnimation(speed = 1): string {
  const duration = clampDuration(GLOW_PULSE_BASE_DURATION_S / Math.max(0.1, speed));
  return `${GLOW_PULSE_ANIMATION_NAME} ${duration.toFixed(2)}s ease-in-out infinite`;
}

/** `delaySeconds` is the per-letter stagger offset (negative delay is NOT
 * used here — a plain positive `animation-delay` staggers each letter's
 * start, same idea as CardLayers.tsx's floating phase-sync but simpler
 * since letters don't need to stay in phase with each other, they're
 * meant to look staggered). */
export function resolveLetterBounceAnimation(speed = 1, delaySeconds = 0): string {
  const duration = clampDuration(LETTER_BOUNCE_BASE_DURATION_S / Math.max(0.1, speed));
  return `${LETTER_BOUNCE_ANIMATION_NAME} ${duration.toFixed(2)}s ease-in-out ${delaySeconds.toFixed(3)}s infinite`;
}

export function resolveLetterShimmerPulseAnimation(speed = 1, delaySeconds = 0): string {
  const duration = clampDuration(LETTER_BOUNCE_BASE_DURATION_S / Math.max(0.1, speed));
  return `${LETTER_SHIMMER_PULSE_ANIMATION_NAME} ${duration.toFixed(2)}s ease-in-out ${delaySeconds.toFixed(3)}s infinite`;
}

export function resolveFlickerAnimation(speed = 1): string {
  const duration = clampDuration(FLICKER_BASE_DURATION_S / Math.max(0.1, speed));
  return `${FLICKER_ANIMATION_NAME} ${duration.toFixed(2)}s steps(1, end) infinite`;
}

/** `linear` (not ease-in-out) is required here, not a style choice — any
 * easing would speed up/slow down around the loop seam, reading as a
 * stutter each cycle instead of a continuous, constant-speed color flow. */
export function resolveGradientFlowAnimation(speed = 1): string {
  const duration = clampDuration(GRADIENT_FLOW_BASE_DURATION_S / Math.max(0.1, speed));
  return `${GRADIENT_FLOW_ANIMATION_NAME} ${duration.toFixed(2)}s linear infinite`;
}
