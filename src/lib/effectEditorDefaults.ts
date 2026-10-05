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
import type { CardEffects, ProfileCardVariant, TextFont, TextRole, RoleTextEffect } from "@/types";
import { withOpacity } from "./cardColors";
import { GLOW_NEUTRAL_COLOR } from "./neutralGlow";

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
/** textEffects.ts glow color default — the same neutral the editor writes
 * for new glows (neutralGlow.ts, O3). */
export const TEXT_GLOW_DEFAULT_COLOR = GLOW_NEUTRAL_COLOR;
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

/** ProfileCard.tsx avatar glow color default (== GLOW_NEUTRAL_COLOR). */
export const PFP_GLOW_DEFAULT_COLOR = GLOW_NEUTRAL_COLOR;
/** ProfileCard.tsx: `glow.radius ?? Math.round(intensity * 24)`. */
export function pfpGlowRadius(glow: PfpEffects["glow"]): number {
  return glow?.radius ?? Math.round((glow?.intensity ?? 0) * 24);
}

// ── Iteration 0: shared "on" rule + per-owner display defaults ─────────────

/** Intensity-driven effects (shadow/glow of card, PFP, text, Music) render
 * only with intensity > 0 — that, not mere presence of the object, is what
 * a switch shows as "on". */
export function isIntensityEffectVisible(e: { intensity?: number } | undefined | null): boolean {
  return (e?.intensity ?? 0) > 0;
}

/** Card/Music glow: visible when a flag is on AND intensity > 0 (CardLayers). */
export function isCardGlowFlagVisible(glow: CardEffects["glow"], flag: "outer" | "inner"): boolean {
  return !!glow?.[flag] && (glow?.intensity ?? 0) > 0;
}

/**
 * Display defaults per effect owner — the values the renderer uses when the
 * field is absent, so a menu never shows an invented value. One object per
 * owner (what Iteration 1's EffectBinding will consume).
 * - card: ProfileCard (CardLayers + useCardInteractions(isProfileCard)).
 * - music: Music (getModuleCardEffects(card, 10) + useCardInteractions
 *   WITHOUT isProfileCard → tilt default 5, not 6 as the old menu showed).
 */
export const EFFECT_DISPLAY_DEFAULTS = {
  card: {
    radius: CARD_RADIUS_FALLBACK,
    borderWidth: CARD_BORDER_DEFAULT_WIDTH,
    borderColor: CARD_BORDER_DEFAULT_COLOR,
    bgColor: CARD_BG_DEFAULT_COLOR,
    glowColor: CARD_GLOW_DEFAULT_COLOR,
    tilt: PROFILE_TILT_DEFAULT,
    spotlightSize: CARD_SPOTLIGHT_DEFAULT_SIZE,
    spotlightColor: CARD_SPOTLIGHT_DEFAULT_COLOR,
  },
  music: {
    radius: 10,
    borderWidth: CARD_BORDER_DEFAULT_WIDTH,
    borderColor: CARD_BORDER_DEFAULT_COLOR,
    bgColor: CARD_BG_DEFAULT_COLOR,
    glowColor: CARD_GLOW_DEFAULT_COLOR,
    /** useCardInteractions: `tiltIntensity ?? (isProfileCard ? 10 : 5)`. */
    tilt: 5,
    spotlightSize: CARD_SPOTLIGHT_DEFAULT_SIZE,
    spotlightColor: CARD_SPOTLIGHT_DEFAULT_COLOR,
    floatHeight: 8,
    floatSpeed: 3,
  },
  pfp: { glowColor: PFP_GLOW_DEFAULT_COLOR },
  text: { glowColor: TEXT_GLOW_DEFAULT_COLOR },
} as const;

/**
 * Card / Music glow flag toggle — the raw glow patch (shared by
 * ProfileEffectsMenu and Music; Iteration 1's EffectBinding.setEnabled).
 * - off: the flag is written `false` explicitly (for Music, absence means
 *   `outer: true` — getModuleCardEffects' legacy default).
 * - on over an invisible glow (intensity <= 0): intensity becomes
 *   CARD_EFFECT_ON_INTENSITY so "on" is never invisible, and the OTHER flag,
 *   if it was set but invisible (e.g. Music's default outer:true), is
 *   written false — raising the intensity must not silently light it too.
 * The neutral color (O3) is added separately by neutralGlowPatch.
 */
export function glowFlagPatch(glow: CardEffects["glow"], flag: "outer" | "inner", on: boolean): Partial<NonNullable<CardEffects["glow"]>> {
  if (!on) return { [flag]: false };
  const patch: Partial<NonNullable<CardEffects["glow"]>> = { [flag]: true };
  if (!((glow?.intensity ?? 0) > 0)) {
    patch.intensity = CARD_EFFECT_ON_INTENSITY;
    const other = flag === "outer" ? "inner" : "outer";
    if (glow?.[other]) patch[other] = false;
  }
  return patch;
}

/** Default gradient the editors start from (ProfileCard Fondo + Music). */
export const GRADIENT_DEFAULT: NonNullable<CardEffects["gradient"]> = { from: "#0f0f0f", to: "#1a1a2e", angle: 135, opacity: 0.6 };

// ── Menu redesign, Phase 1 (Cimientos): role typography defaults ───────────
// Moved out of ProfileTypographyMenu.tsx / RoleTypographyFields.tsx, where
// they were hardcoded per call site. Same values — Phase 1 changes no UI.

/** ProfileCard.tsx: `card.nameFont ?? card.font ?? "DM Sans"`. */
export const NAME_FONT_DEFAULT: TextFont = "DM Sans";
/** ProfileCard.tsx: `fontStyle(card.<role>Font, MONO)` for every role but
 * Name — absent = Space Mono. */
export const MONO_ROLE_FONT_DEFAULT: TextFont = "Space Mono";
/** Slider position shown while monoLineHeight is unset. Verified: with the
 * field absent these four lines get NO line-height anywhere up the tree —
 * globals.css has `@tailwind base` but Tailwind isn't installed (no
 * preflight emitted in the build CSS), and no ancestor sets one — so they
 * render with CSS `normal`, which depends on the font: ~1.48 for the
 * default Space Mono (ascent 1.12 + descent 0.36 em). Shown as "normal",
 * slider parked at the nearest step; never written until the user edits. */
export const MONO_LINE_HEIGHT_NORMAL = 1.5;
/** Weight shown when a role has no explicit weight (browser default 400). */
export const ROLE_WEIGHT_FALLBACK = 400;

type Range = readonly [min: number, max: number];
/** Slider ranges per role (what the editor lets a user reach). */
export const ROLE_TYPOGRAPHY_RANGES: Record<TextRole, { fontSize: Range; lineHeight?: Range }> & { monoLineHeight: Range } = {
  name:       { fontSize: [10, 32], lineHeight: [0.9, 2] },
  handle:     { fontSize: [7, 18] },
  descriptor: { fontSize: [7, 18] },
  location:   { fontSize: [7, 18] },
  bio:        { fontSize: [7, 18], lineHeight: [1, 2.4] },
  views:      { fontSize: [7, 18] },
  monoLineHeight: [0.9, 2],
};

// ── "On" defaults: what the editor writes when an effect is switched on
// with nothing paused (effectBinding.ts consumes these). NOT render
// defaults — the renderer's own fallbacks are the display defaults above.

/** Fallback color for a new gradient stop (GradientStops) — also the 2nd
 * stop of a new text gradient. */
export const GRADIENT_NEW_STOP_FALLBACK = "#8a8a96";

export const EFFECT_ON_DEFAULTS = {
  /** Card / Music background gradient. */
  gradient:        GRADIENT_DEFAULT,
  textShadow:      {},
  textStroke:      { width: 1 },
  /** textRoles.<role>.gradient */
  textGradient:    { colors: ["#ffffff", GRADIENT_NEW_STOP_FALLBACK], angle: 90 },
  /** textRoles.<role>.shimmer — intensity mirrors textEffects.ts's
   * DEFAULT_SHIMMER_INTENSITY (parity-tested). */
  textShimmer:     { intensity: 0.45, speed: 1 },
  /** textRoles.name.letterAnimation — mirrors textEffects.ts's
   * `amplitude ?? 4`, `speed ?? 1`, `stagger ?? 0.05` (parity-tested). */
  letterAnimation: { amplitude: 4, speed: 1, stagger: 0.05 },
  /** interactions.hoverScale */
  hoverScale:      1.05,
} as const satisfies {
  gradient: NonNullable<CardEffects["gradient"]>;
  textShadow: NonNullable<NonNullable<CardEffects["text"]>["shadow"]>;
  textStroke: NonNullable<NonNullable<CardEffects["text"]>["stroke"]>;
  textGradient: { colors: readonly string[]; angle: number };
  textShimmer: NonNullable<RoleTextEffect["shimmer"]>;
  letterAnimation: NonNullable<RoleTextEffect["letterAnimation"]>;
  hoverScale: number;
};
