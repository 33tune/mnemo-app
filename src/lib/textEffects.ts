/**
 * Pure text-effect infrastructure (Stage FASE 1 — Personalization Core).
 * Shadow / glow / stroke for any text role in ProfileCard, resolved into a
 * plain CSSProperties fragment. No UI exposes this yet (see CLAUDE.md
 * checkpoint) — the resolver exists so a future menu only needs to write to
 * `card.effects.text`, no further render-side plumbing.
 *
 * `card.effects.text` flows to ProfileCard.tsx's `effectiveEffects.text`
 * automatically — getProfileCardEffects()'s `...card.effects` spread already
 * carries any field it doesn't explicitly override (bg/border/glow/
 * interactions are the only ones it rewrites), so this needed zero changes
 * there. See profileCardEffects.ts.
 */
import type { CSSProperties } from "react";
import type { TextEffects } from "@/types";
import { withOpacity } from "./cardColors";

const DEFAULT_SHADOW_COLOR = "#000000";
const DEFAULT_SHADOW_OPACITY_NO_COLOR = 0.5; // reproduces the pre-existing "rgba(0,0,0,0.5)" look when nothing is set
const DEFAULT_GLOW_COLOR = "#ffffff";
const DEFAULT_STROKE_COLOR = "#000000";

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
 * Resolves `card.effects.text` into a CSSProperties fragment (`textShadow` +
 * `WebkitTextStroke`), meant to be spread onto any text role's style object.
 * `undefined`/empty input returns `{}` — zero visual change for every
 * existing card, which is the entire compatibility contract for this stage.
 */
export function resolveTextEffectStyle(effect?: TextEffects): CSSProperties {
  if (!effect) return {};

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

  const style: CSSProperties = {};
  if (shadowLayers.length > 0) style.textShadow = shadowLayers.join(", ");
  if (effect.stroke?.width) {
    const strokeColor = effect.stroke.color ?? DEFAULT_STROKE_COLOR;
    style.WebkitTextStroke = `${effect.stroke.width}px ${strokeColor}`;
  }
  return style;
}
