/**
 * Pure text-effect infrastructure (Stage FASE 1 — Personalization Core;
 * extended in Stage FASE 3 — Text & Motion Effects with blur, gradient and
 * shimmer). Resolved into a plain CSSProperties fragment, meant to be
 * spread onto any text role's style object. Takes two independent inputs —
 * `effect` (card-wide shadow/glow/stroke/blur) and `roleEffect` (that one
 * role's gradient/shimmer) — see RoleTextEffect's header in types/index.ts
 * for why gradient/shimmer are the only per-role pieces.
 *
 * `card.effects.text` flows to ProfileCard.tsx's `effectiveEffects.text`
 * automatically — getProfileCardEffects()'s `...card.effects` spread already
 * carries any field it doesn't explicitly override (bg/border/glow/
 * interactions are the only ones it rewrites), so this needed zero changes
 * there. See profileCardEffects.ts.
 *
 * FASE 3 note on composability: shadow/glow/stroke all operate on the
 * glyph's rendered shape regardless of fill — they compose cleanly with
 * gradient text (`color: transparent` + `background-clip: text`) with no
 * CSS-level conflict. The ONLY real exclusion is gradient vs. a role's own
 * solid color, because gradient requires `color: transparent` to work at
 * all — see the `gradient` branch below, and ProfileTypographyMenu.tsx
 * where the solid ColorRow disables itself accordingly.
 */
import type { CSSProperties } from "react";
import type { TextEffects, RoleTextEffect } from "@/types";
import { withOpacity } from "./cardColors";
import { resolveShimmerAnimation } from "./cardMotion";

const DEFAULT_SHADOW_COLOR = "#000000";
const DEFAULT_SHADOW_OPACITY_NO_COLOR = 0.5; // reproduces the pre-existing "rgba(0,0,0,0.5)" look when nothing is set
const DEFAULT_GLOW_COLOR = "#ffffff";
const DEFAULT_STROKE_COLOR = "#000000";
const DEFAULT_SHIMMER_INTENSITY = 0.6;

function resolveShadowColor(color: string | undefined, opacity: number | undefined): string {
  const base = color ?? DEFAULT_SHADOW_COLOR;
  const alpha = opacity ?? (color ? 1 : DEFAULT_SHADOW_OPACITY_NO_COLOR);
  return base.startsWith("#") ? withOpacity(base, alpha) : base;
}

function resolveGlowColor(color: string | undefined, intensity: number): string {
  const base = color ?? DEFAULT_GLOW_COLOR;
  return base.startsWith("#") ? withOpacity(base, Math.min(1, intensity)) : base;
}

/**
 * Resolves a text role's effects into a CSSProperties fragment, meant to be
 * spread onto that role's style object. `effect` is `card.effects.text`
 * (card-wide shadow/glow/stroke/blur — same object for every role).
 * `roleEffect` is that ONE role's entry from `card.effects.textRoles`
 * (gradient/shimmer — see RoleTextEffect's header for why these are
 * per-role while the rest are card-wide). Both absent returns `{}` — zero
 * visual change for every existing card, the entire compatibility contract.
 */
export function resolveTextEffectStyle(effect?: TextEffects, roleEffect?: RoleTextEffect): CSSProperties {
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

  // Gradient text — the one real exclusion (see file header). Shimmer
  // requires `gradient` to also be set on the SAME role: it has nothing to
  // sweep across otherwise, and there's deliberately no synthesized
  // fallback gradient from the role's solid color (would need this
  // function to also receive that color, widening its signature for a
  // case the UI already prevents by disabling the Shimmer toggle until
  // Gradient is on for that role).
  if (roleEffect?.gradient) {
    const { from, to, angle } = roleEffect.gradient;
    const baseGradient = `linear-gradient(${angle}deg, ${from}, ${to})`;
    if (roleEffect.shimmer) {
      const intensity = roleEffect.shimmer.intensity ?? DEFAULT_SHIMMER_INTENSITY;
      const shimmerBand = `linear-gradient(100deg, transparent 35%, rgba(255,255,255,${intensity}) 50%, transparent 65%)`;
      style.backgroundImage = `${shimmerBand}, ${baseGradient}`;
      style.backgroundSize = "250% 100%, 100% 100%";
      style.backgroundPosition = "-100% 0, 0 0";
      style.backgroundRepeat = "no-repeat, no-repeat";
      style.animation = resolveShimmerAnimation(roleEffect.shimmer.speed ?? 1);
    } else {
      style.backgroundImage = baseGradient;
    }
    style.backgroundClip = "text";
    style.WebkitBackgroundClip = "text";
    style.color = "transparent";
  }

  return style;
}
