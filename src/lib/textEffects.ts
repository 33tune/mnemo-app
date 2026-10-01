/**
 * Pure text-effect infrastructure (Stage FASE 1 — Personalization Core;
 * extended in Stage FASE 3 with blur/gradient/shimmer; extended again in
 * "Product closeout" with multicolor gradient and a real standalone
 * shimmer). Resolved into a plain CSSProperties fragment, meant to be
 * spread onto any text role's style object. Takes three independent
 * inputs — `effect` (card-wide shadow/glow/stroke/blur), `roleEffect`
 * (that one role's gradient/shimmer/letterAnimation), and `resolvedColor`
 * (that role's already-resolved solid color, from cardColors.ts) — see
 * RoleTextEffect's header in types/index.ts for why gradient/shimmer are
 * the only per-role pieces.
 *
 * `card.effects.text` flows to ProfileCard.tsx's `effectiveEffects.text`
 * automatically — getProfileCardEffects()'s `...card.effects` spread already
 * carries any field it doesn't explicitly override (bg/border/glow/
 * interactions are the only ones it rewrites), so this needed zero changes
 * there. See profileCardEffects.ts.
 *
 * Composability: shadow/glow/stroke all operate on the glyph's rendered
 * shape regardless of fill — they compose cleanly with gradient text
 * (`color: transparent` + `background-clip: text`) with no CSS-level
 * conflict. The ONLY real exclusion is gradient vs. a role's own solid
 * color, because gradient requires `color: transparent` to work at all —
 * see the `gradient` branch below, and RoleTypographyFields.tsx where the
 * solid ColorRow disables itself accordingly.
 *
 * Shimmer fix ("Product closeout"): FASE 3 required an explicit `gradient`
 * for shimmer to do anything — inert on solid color, which is what made it
 * feel broken/invisible for anyone who hadn't first set up a gradient.
 * Shimmer now ALWAYS has something to sweep across: when no gradient is
 * set, it synthesizes a flat two-stop "gradient" from the role's own
 * resolved solid color (`resolvedColor`), so background-clip:text has a
 * valid surface regardless. This is why `resolveTextEffectStyle` now takes
 * a third parameter it didn't have in FASE 3.
 *
 * Gradient-flow fix (later bug fix): with shimmer AND an explicit gradient
 * both set, shimmer used to just sweep a static highlight band over a
 * FROZEN gradient — the multicolor stops themselves never moved, which is
 * not what "shimmer" on multicolor text should look like. It now animates
 * the gradient's own stop offsets continuously, along its angle (GRADIENT_
 * FLOW_ANIMATION_NAME) instead of overlaying a highlight — see
 * resolveGradientFlowCss below and the branch in resolveTextEffectStyle.
 * The no-gradient sweeping-highlight case (shimmer on a flat resolved
 * color) is untouched — there's no hue to scroll through with one color.
 */
import type { CSSProperties } from "react";
import type { TextEffects, RoleTextEffect, TextGradientEffect } from "@/types";
import { withOpacity } from "./cardColors";
import { resolveShimmerAnimation, resolveGradientFlowAnimation, resolveLetterBounceAnimation, GRADIENT_FLOW_OFFSET_PROPERTY } from "./cardMotion";

const DEFAULT_SHADOW_COLOR = "#000000";
const DEFAULT_SHADOW_OPACITY_NO_COLOR = 0.5; // reproduces the pre-existing "rgba(0,0,0,0.5)" look when nothing is set
const DEFAULT_GLOW_COLOR = "#ffffff";
const DEFAULT_STROKE_COLOR = "#000000";
// Tuned down from FASE 3's 0.6 — "premium subtle", not a bright flash.
const DEFAULT_SHIMMER_INTENSITY = 0.45;

function resolveShadowColor(color: string | undefined, opacity: number | undefined): string {
  const base = color ?? DEFAULT_SHADOW_COLOR;
  const alpha = opacity ?? (color ? 1 : DEFAULT_SHADOW_OPACITY_NO_COLOR);
  return base.startsWith("#") ? withOpacity(base, alpha) : base;
}

function resolveGlowColor(color: string | undefined, intensity: number): string {
  const base = color ?? DEFAULT_GLOW_COLOR;
  return base.startsWith("#") ? withOpacity(base, Math.min(1, intensity)) : base;
}

/** Builds the `linear-gradient(...)` CSS string for a role's gradient,
 * multicolor-first with a defensive fallback to the pre-multicolor
 * {from,to} shape for any data saved before this stage — see
 * TextGradientEffect's header in types/index.ts. */
export function resolveGradientCss(gradient: TextGradientEffect): string {
  const stops = gradient.colors?.length ? gradient.colors
    : [gradient.from, gradient.to].filter((c): c is string => !!c);
  const safeStops = stops.length >= 2 ? stops : [...stops, ...stops]; // degenerate 1-color input still paints something
  const angle = gradient.angle ?? 90;
  return `linear-gradient(${angle}deg, ${safeStops.join(", ")})`;
}

/**
 * Bug fix — real animated gradient flow, along the gradient's OWN angle: a
 * `repeating-linear-gradient` whose period is exactly the full gradient
 * line (stops evenly spaced 0%→100%, closing back on the first color), with
 * every stop offset by the animated `--mnemo-flow-offset` custom property
 * (GRADIENT_FLOW_ANIMATION_NAME, cardMotion.ts — registered via @property so
 * it interpolates). Animating that offset by one full period (0% → -100%)
 * is seamless for any stop count, and — unlike the previous
 * `background-size:200%` + horizontal `background-position` sweep, which
 * only ever moved along X — it scrolls along whatever `angle` is set:
 * at 0°/180° the old approach produced no visible motion at all, and at
 * diagonal angles it jumped at every loop. Percentages here are relative to
 * the gradient line, so the visible density (one full period across the
 * element) is the same as before at the default 90°.
 */
export function resolveGradientFlowCss(gradient: TextGradientEffect): string {
  const stops = gradient.colors?.length ? gradient.colors
    : [gradient.from, gradient.to].filter((c): c is string => !!c);
  const safeStops = stops.length >= 2 ? stops : [...stops, ...stops];
  const angle = gradient.angle ?? 90;
  const n = safeStops.length;
  const positioned = [...safeStops, safeStops[0]].map((c, i) =>
    // `, 0%` fallback: before cardMotion's <style> is injected (SSR, first
    // frame) the property isn't registered/set yet — an unresolved var()
    // would invalidate the whole background-image and, with
    // `color: transparent`, leave the text invisible instead of static.
    `${c} calc(var(${GRADIENT_FLOW_OFFSET_PROPERTY}, 0%) + ${+(i * 100 / n).toFixed(4)}%)`);
  return `repeating-linear-gradient(${angle}deg, ${positioned.join(", ")})`;
}

/**
 * Resolves a text role's effects into a CSSProperties fragment. `effect` is
 * `card.effects.text` (card-wide shadow/glow/stroke/blur — same object for
 * every role). `roleEffect` is that ONE role's entry from
 * `card.effects.textRoles` (gradient/shimmer). `resolvedColor` is that
 * role's already-resolved solid color (cardColors.ts's resolveCardColors
 * output for this role) — used only to synthesize a shimmer surface when no
 * gradient is set. All absent returns `{}` — zero visual change for every
 * existing card, the entire compatibility contract.
 */
export function resolveTextEffectStyle(effect?: TextEffects, roleEffect?: RoleTextEffect, resolvedColor?: string): CSSProperties {
  const style: CSSProperties = {};

  if (effect) {
    const shadowLayers: string[] = [];
    if (effect.shadow) {
      const { blur = 4, offsetX = 0, offsetY = 2 } = effect.shadow;
      const color = resolveShadowColor(effect.shadow.color, effect.shadow.opacity);
      shadowLayers.push(`${offsetX}px ${offsetY}px ${blur}px ${color}`);
    }
    if (effect.glow && (effect.glow.intensity ?? 0) > 0) {
      const intensity = effect.glow.intensity ?? 0;
      const radius = effect.glow.radius ?? Math.round(intensity * 16);
      const color = resolveGlowColor(effect.glow.color, intensity);
      shadowLayers.push(`0 0 ${radius}px ${color}`);
    }
    if (shadowLayers.length > 0) style.textShadow = shadowLayers.join(", ");

    if (effect.stroke?.width) {
      const strokeColor = effect.stroke.color ?? DEFAULT_STROKE_COLOR;
      style.WebkitTextStroke = `${effect.stroke.width}px ${strokeColor}`;
    }
    if (effect.blur) {
      style.filter = `blur(${effect.blur}px)`;
    }
  }

  const hasGradient = !!roleEffect?.gradient;
  const hasShimmer  = !!roleEffect?.shimmer;

  // Gradient text — the one real exclusion (see file header). Shimmer no
  // longer requires an explicit gradient: absent one, it synthesizes a
  // flat two-stop "gradient" from the role's own resolved color so
  // background-clip:text still has a valid surface to sweep a highlight
  // across — same visible role color, just now animatable.
  if (hasGradient || hasShimmer) {
    if (hasShimmer && hasGradient) {
      // Bug fix — real gradient flow: with an EXPLICIT (possibly
      // multicolor) gradient configured, "Shimmer" no longer sweeps a
      // static highlight over a frozen gradient (that read as "barely
      // moving" / effectively static for anything but a plain 2-color
      // gradient, since only the highlight band — not the colors
      // themselves — ever animated). It now scrolls the gradient's own
      // colors continuously through the text — see resolveGradientFlowCss.
      style.backgroundImage = resolveGradientFlowCss(roleEffect!.gradient!);
      style.animation = resolveGradientFlowAnimation(roleEffect!.shimmer!.speed ?? 1);
    } else if (hasShimmer) {
      // No explicit gradient — shimmer on a solid color. Nothing to
      // "flow" (a flat color has no hue to scroll through), so this stays
      // the original sweeping-highlight-over-a-flat-surface treatment.
      const intensity = roleEffect!.shimmer!.intensity ?? DEFAULT_SHIMMER_INTENSITY;
      const flatGradient = `linear-gradient(90deg, ${resolvedColor ?? "#ffffff"}, ${resolvedColor ?? "#ffffff"})`;
      const shimmerBand = `linear-gradient(100deg, transparent 38%, rgba(255,255,255,${intensity}) 50%, transparent 62%)`;
      style.backgroundImage = `${shimmerBand}, ${flatGradient}`;
      style.backgroundSize = "250% 100%, 100% 100%";
      style.backgroundPosition = "-120% 0, 0 0";
      style.backgroundRepeat = "no-repeat, no-repeat";
      style.animation = resolveShimmerAnimation(roleEffect!.shimmer!.speed ?? 1);
    } else {
      style.backgroundImage = resolveGradientCss(roleEffect!.gradient!);
    }
    style.backgroundClip = "text";
    style.WebkitBackgroundClip = "text";
    style.color = "transparent";
  }

  return style;
}

/**
 * Name's per-letter path: the style for ONE `<span>` (character `index` of
 * `total`), composing letter animation WITH the role's gradient/shimmer
 * instead of replacing them. Each effect owns its own property:
 *
 * - Letter animation: `transform` (mnemo-letter-bounce keyframe) + `--letter-amp`.
 * - Gradient/shimmer fill: the exact same resolveTextEffectStyle output the
 *   non-animated path uses (so dd816a9's angle-following flow is preserved
 *   as-is), applied PER SPAN — not on the parent. `background-clip:text` on
 *   the parent does not clip to children that run their own transform
 *   animation (Chrome paints those in separate layers and the text comes
 *   out invisible), which is why the fill has to live on each letter.
 * - Gradient continuity across the word: each span's background is sized to
 *   `total` letter-widths and positioned at its own slice (i/(total-1)), so
 *   the letters together show one gradient spanning the word, with the
 *   gradient's own angle. This is free to do because the flow animates
 *   `--mnemo-flow-offset`, not `background-position` (dd816a9) — and the
 *   flow runs with no per-letter delay so every slice stays in phase.
 *   Slices assume roughly equal glyph widths (no layout measurement).
 * - Shimmer without gradient: the flat-color sweep, per span, delayed by the
 *   same stagger as the bounce so the band travels across the word.
 *
 * Card-wide shadow/glow/stroke/blur are NOT included — they stay on the
 * parent (inherited by the spans / `filter` on the subtree), unchanged.
 */
export function resolveLetterEffectStyle(
  roleEffect: RoleTextEffect | undefined,
  resolvedColor: string | undefined,
  index: number,
  total: number,
): CSSProperties {
  const letter = roleEffect?.letterAnimation;
  const speed = letter?.speed ?? 1;
  const delay = index * (letter?.stagger ?? 0.05);
  const fill = resolveTextEffectStyle(undefined, roleEffect, resolvedColor);
  const style: CSSProperties = {
    display: "inline-block",
    ...fill,
    ["--letter-amp" as string]: `${letter?.amplitude ?? 4}px`,
  } as CSSProperties;

  if (roleEffect?.gradient) {
    style.backgroundSize = `${total * 100}% 100%`;
    style.backgroundPosition = `${total > 1 ? +(index / (total - 1) * 100).toFixed(4) : 0}% 0`;
    style.backgroundRepeat = "no-repeat";
  }

  const animations = [resolveLetterBounceAnimation(speed, delay)];
  if (roleEffect?.shimmer) {
    animations.push(roleEffect.gradient
      ? String(fill.animation)
      : resolveShimmerAnimation(roleEffect.shimmer.speed ?? 1, delay));
  }
  style.animation = animations.join(", ");
  return style;
}
