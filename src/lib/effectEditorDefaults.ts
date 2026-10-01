/**
 * Block 1 ("estado efectivo"): the render-side defaults the ProfileCard
 * editor needs to DISPLAY, for values no resolver exposes on its own.
 *
 * Editor-only — nothing in the render path imports this file. The
 * renderer keeps its own inline formulas (CardLayers.tsx, textEffects.ts,
 * ProfileCard.tsx's avatar block); this module mirrors them so a slider
 * or swatch shows what the card actually looks like instead of a
 * placeholder. effectEditorDefaults.test.ts is the parity check: it
 * exercises the real renderers (CardLayers via server render,
 * resolveTextEffectStyle directly) against these numbers, so if a render
 * formula changes, that test fails instead of the menu silently drifting.
 *
 * Read-effective / write-raw: menus DISPLAY values derived from these +
 * getProfileCardEffects(card), but only ever WRITE the specific field the
 * user touched into card.effects — never the merged/derived value (e.g.
 * persisting `bg.glass: true` would freeze what is today a derived default
 * of "no bgColor and no bgImage").
 */
import type { CardEffects, ProfileCardVariant } from "@/types";
import { withOpacity } from "./cardColors";

// ── Card (CardLayers.tsx) ───────────────────────────────────────────────────

/** CardLayers: `glow?.color ?? "#a855f7"`. */
export const CARD_GLOW_DEFAULT_COLOR = "#a855f7";
/** CardLayers: `bord?.width ?? 1`. */
export const CARD_BORDER_DEFAULT_WIDTH = 1;
/** CardLayers: unselected `bord?.color ?? "rgba(255,255,255,0.08)"`. */
export const CARD_BORDER_DEFAULT_COLOR = "rgba(255,255,255,0.08)";
/** CardLayers: `bg?.color ?? "rgba(255,255,255,0.055)"`. */
export const CARD_BG_DEFAULT_COLOR = "rgba(255,255,255,0.055)";
/** Last-resort radius when neither effects.border.radius nor card.borderRadius
 * is set (card.borderRadius is a required field, so this is defensive only). */
export const CARD_RADIUS_FALLBACK = 14;
/** CardLayers: `interactions.spotlightSize ?? 65`. */
export const CARD_SPOTLIGHT_DEFAULT_SIZE = 65;
/** CardLayers: `interactions.spotlightColor ?? "rgba(255,255,255,0.12)"`. */
export const CARD_SPOTLIGHT_DEFAULT_COLOR = "rgba(255,255,255,0.12)";
/** useCardInteractions: `tiltIntensity ?? (isProfileCard ? 10 : 5)`. */
export const PROFILE_TILT_DEFAULT = 10;
/** What the editor writes when a card shadow/glow is turned on with no
 * previous (paused) config — not a render default. */
export const CARD_EFFECT_ON_INTENSITY = 0.5;

/** CardLayers' shadow layer, resolved per field exactly as rendered. Only
 * meaningful while `intensity > 0` (otherwise CardLayers draws its fixed
 * baseline "0 4px 20px rgba(0,0,0,0.2)" instead). */
export function cardShadowDisplay(sh: CardEffects["shadow"]) {
  const intensity = sh?.intensity ?? 0;
  return {
    color:   sh?.color ?? "#000000",
    opacity: sh?.opacity ?? (sh?.color ? 1 : 0.5),
    blur:    sh?.blur    ?? Math.round(intensity * 40),
    offsetX: sh?.offsetX ?? 0,
    offsetY: sh?.offsetY ?? Math.round(intensity * 8),
  };
}

/** CardLayers: `glow.radius ?? intensity * 30` (rounded at use). */
export function cardGlowRadius(glow: CardEffects["glow"]): number {
  return Math.round(glow?.radius ?? (glow?.intensity ?? 0) * 30);
}

// ── Text (textEffects.ts) ───────────────────────────────────────────────────

export const TEXT_SHADOW_DEFAULTS = { color: "#000000", blur: 4, offsetX: 0, offsetY: 2 } as const;
/** textEffects.ts resolveShadowColor: `opacity ?? (color ? 1 : 0.5)`. */
export function textShadowOpacity(color: string | undefined, opacity: number | undefined): number {
  return opacity ?? (color ? 1 : 0.5);
}
export const TEXT_GLOW_DEFAULT_COLOR = "#ffffff";
/** textEffects.ts: `glow.radius ?? Math.round(intensity * 16)`. */
export function textGlowRadius(radius: number | undefined, intensity: number | undefined): number {
  return radius ?? Math.round((intensity ?? 0) * 16);
}
export const TEXT_STROKE_DEFAULT_COLOR = "#000000";

// ── Typography (ProfileCard.tsx) ────────────────────────────────────────────

/** ProfileCard.tsx: `card.nameFontSize ?? (guns|poster ? 17 : 15)`. */
export function nameFontSizeDefault(variant: ProfileCardVariant | undefined): number {
  return variant === "guns" || variant === "poster" ? 17 : 15;
}

// ── PFP (ProfileCard.tsx avatar block) ──────────────────────────────────────

type PfpEffects = NonNullable<CardEffects["pfp"]>;

/** ProfileCard.tsx's pfpBorderWidth/pfpBorderColorBase: an explicit
 * `pfp.border` object switches width to `border.width ?? 2`; absent, the
 * variant decides (minimal = 0, else 2). Color = `border.color ??` the
 * variant's baseColor-derived rgba (before border.opacity, which the menu
 * shows as its own slider). */
export function pfpBorderDisplay(variant: ProfileCardVariant | undefined, baseColor: string, border: PfpEffects["border"]) {
  const v = variant ?? "classic";
  return {
    width: border ? (border.width ?? 2) : (v === "minimal" ? 0 : 2),
    color: border?.color ?? (v === "guns" || v === "poster" ? withOpacity(baseColor, 0.22) : withOpacity(baseColor, 0.14)),
    opacity: border?.opacity ?? 1,
  };
}

/** ProfileCard.tsx: absent `pfp.shadow`, guns/poster draw a variant shadow
 * ("0 6px 28px baseColor@0.14"); every other variant draws none. */
export function pfpVariantShadowOn(variant: ProfileCardVariant | undefined): boolean {
  return variant === "guns" || variant === "poster";
}

/** Whether the PFP shadow is visible right now (effective, not raw). */
export function pfpShadowOn(variant: ProfileCardVariant | undefined, shadow: PfpEffects["shadow"]): boolean {
  return shadow ? (shadow.intensity ?? 0) > 0 : pfpVariantShadowOn(variant);
}

/** ProfileCard.tsx: `pfp.shadow.color ?? withOpacity(baseColor, 0.14)`. */
export function pfpShadowColor(baseColor: string, shadow: PfpEffects["shadow"]): string {
  return shadow?.color ?? withOpacity(baseColor, 0.14);
}

export const PFP_GLOW_DEFAULT_COLOR = "#ffffff";
/** ProfileCard.tsx: `glow.radius ?? Math.round(intensity * 24)`. */
export function pfpGlowRadius(glow: PfpEffects["glow"]): number {
  return glow?.radius ?? Math.round((glow?.intensity ?? 0) * 24);
}
