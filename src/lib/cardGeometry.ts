/**
 * Single source of truth for ProfileCard geometry (format, size, aspect ratio).
 * Pure functions, no React, no DOM — same pattern as mobileMerge.ts.
 *
 * Derivation of the numbers below: MOBILE_CONTENT_W (358px) is the one truly
 * fixed, viewport-derived constant in the system — every public profile is
 * eventually viewed through it (mobileMerge.ts's defaultMobilePlacement scales
 * anything wider down to fit it, isotropically, and NEVER upscales). That
 * scaling only touches x/y/w/h — font sizes (nameFontSize, bioFontSize, ...)
 * are stored as absolute px and do NOT shrink with the box. So a card
 * authored much wider than MOBILE_CONTENT_W arrives on mobile with its box
 * shrunk but its type still full-size relative to that smaller box — the
 * wider the desktop card, the worse that mismatch gets. maxW per format is
 * therefore capped as a bounded multiple of MOBILE_CONTENT_W: close to 1x for
 * formats that are inherently narrow (phone), up to ~1.8x for formats whose
 * whole point is extra width (horizontal/card), which keeps the worst-case
 * mobile shrink ratio no lower than ~0.55 — never more than roughly 2x type
 * distortion. minW/minH are derived from fitting the smallest avatar
 * (PHOTO_SIZES.sm = 52px, see ProfileCard.tsx) plus its padding plus one line
 * of default-size text, which is where the pre-existing generic resize floor
 * (160x120, useDragDrop.ts) already landed for "vertical" — kept as-is there,
 * adjusted per format elsewhere. This is a one-time engineering read of the
 * current architecture, not arbitrary numbers — see the Stage 1 report for
 * the full reasoning per format.
 */
import type { CardFormat } from "@/types";
import { MOBILE_CONTENT_W } from "./mobileMerge";

export interface CardFormatConstraints {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  ratioKind: "fixed" | "range";
  /** w/h. Present when ratioKind === "fixed". */
  ratio?: number;
  /** [minRatio, maxRatio] as w/h. Present when ratioKind === "range". */
  ratioRange?: [number, number];
}

const PHONE_RATIO = 9 / 16;

export const CARD_FORMATS: Record<CardFormat, CardFormatConstraints> = {
  vertical: {
    minW: 160, maxW: 420, minH: 190, maxH: 560,
    ratioKind: "range", ratioRange: [0.55, 0.85],
  },
  horizontal: {
    minW: 220, maxW: 640, minH: 120, maxH: 360,
    ratioKind: "range", ratioRange: [1.3, 2.0],
  },
  square: {
    minW: 180, maxW: 480, minH: 180, maxH: 480,
    ratioKind: "fixed", ratio: 1,
  },
  // Capped at exactly MOBILE_CONTENT_W: a phone-shaped card never needs to
  // shrink for mobile by construction, zero type/box distortion possible.
  phone: {
    minW: 140, maxW: MOBILE_CONTENT_W,
    minH: Math.round(140 / PHONE_RATIO), maxH: Math.round(MOBILE_CONTENT_W / PHONE_RATIO),
    ratioKind: "fixed", ratio: PHONE_RATIO,
  },
  card: {
    minW: 200, maxW: 640, minH: 140, maxH: 420,
    ratioKind: "range", ratioRange: [0.9, 1.6],
  },
};

export function getCardConstraints(format: CardFormat | undefined): CardFormatConstraints {
  return CARD_FORMATS[format ?? "vertical"];
}

// ── Freeform width/height (Stage 4.2-C.2.2) ──────────────────────────────────
// CardFormat stays an internal concept (still feeds cardComposition.ts's
// FORMAT_BIAS topology tiebreaker, still the fallback for any card whose
// `format` was set before this stage) — it just stops being a user-facing
// picker or a hard ratio lock. Width and height become independently
// adjustable within a single unified envelope instead of a per-format box.

export interface FreeformCardBounds {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
}

/** Explicit product minimums for freeform ProfileCard sizing (Stage
 * 4.2-C.2.4) — deliberately NOT derived from CARD_FORMATS. An earlier
 * version of this bound computed minH from the format table (first
 * Math.min across all 5 formats, landing on horizontal's 120 and breaking
 * composition; then Math.max across the ratioKind:"range" formats, landing
 * on vertical's 190) — both were still an indirect, format-shaped number
 * standing in for "how small can this card actually get," not a real
 * product decision. These two constants ARE that decision. CARD_FORMATS
 * keeps existing for internal use (cardComposition.ts's FORMAT_BIAS
 * tiebreaker) and still supplies maxW/maxH below — only the floor changed. */
export const MIN_PROFILE_CARD_WIDTH = 240;
export const MIN_PROFILE_CARD_HEIGHT = 220;

/** Unified min/max envelope for freeform ProfileCard sizing. minW/minH are
 * the explicit product constants above; maxW/maxH stay the union of every
 * format's own max in CARD_FORMATS (unchanged — no reported issue with the
 * ceiling, only the floor), so the user can still resize up to whatever
 * any existing format allowed. */
export function getFreeformCardBounds(): FreeformCardBounds {
  const all = Object.values(CARD_FORMATS);
  return {
    minW: MIN_PROFILE_CARD_WIDTH,
    maxW: Math.max(...all.map(c => c.maxW)),
    minH: MIN_PROFILE_CARD_HEIGHT,
    maxH: Math.max(...all.map(c => c.maxH)),
  };
}

/** Clamps w/h independently into the freeform envelope — no ratio lock,
 * unlike clampCardSize (kept below, still used by anything that still
 * reasons in terms of a specific format). This is what the freeform
 * resize-drag clamps against. */
export function clampFreeformCardSize(w: number, h: number): { w: number; h: number } {
  const b = getFreeformCardBounds();
  return {
    w: Math.max(b.minW, Math.min(b.maxW, Math.round(w))),
    h: Math.max(b.minH, Math.min(b.maxH, Math.round(h))),
  };
}

/**
 * The ONE formula ProfileCard's position is ever derived from (Stage
 * 4.2-C.2.4) — a box of size w×h, centered within a canvas of size
 * canvasW×canvasH, never rendering above `topOffset`. Used identically by
 * the freeform resize-drag (useDragDrop.ts, computed synchronously in the
 * same state update as the new w/h — never a separate effect chasing a
 * moving target), content-driven growth (ProfileCard.tsx's growth effect,
 * which persists the recentered y in the SAME updateProfile call as the
 * new h), and initial placement (addProfile in CanvasBoard.tsx). Having a
 * single shared, pure function — rather than two independent
 * recentering calculations that can disagree mid-gesture — is what the
 * fix actually is: previously, a standalone recentering effect (reacting
 * to card.h a render cycle after the drag's own direct state update) and
 * the resize-drag's own "preserve whatever center the card already had"
 * logic could both write position for the same element during the same
 * gesture, which is what produced the reported jump/drift.
 */
export function centerCardPosition(
  canvasW: number, canvasH: number, w: number, h: number, topOffset: number,
): { x: number; y: number } {
  return {
    x: Math.round((canvasW - w) / 2),
    y: Math.max(topOffset, Math.round((canvasH - h) / 2)),
  };
}

/** Resolves the ratio (w/h) that should apply for a given format + current size. */
export function getCardAspectRatio(format: CardFormat | undefined, w: number, h: number): number {
  const c = getCardConstraints(format);
  if (c.ratioKind === "fixed") return c.ratio!;
  const [rMin, rMax] = c.ratioRange!;
  const current = h > 0 ? w / h : rMin;
  return Math.max(rMin, Math.min(rMax, current));
}

/**
 * Clamps w/h into a format's box (min/max) AND its ratio constraint. Two-pass:
 * ratio first (drives one dimension from the other), then box (may reopen the
 * ratio slightly at extreme corners — acceptable for a UI-driven size, not a
 * precision solver). Used both by the size slider and by resize-drag.
 */
export function clampCardSize(format: CardFormat | undefined, w: number, h: number): { w: number; h: number } {
  const c = getCardConstraints(format);
  let nw = w, nh = h;

  if (c.ratioKind === "fixed") {
    nw = Math.max(c.minW, Math.min(c.maxW, nw));
    nh = Math.round(nw / c.ratio!);
    if (nh < c.minH || nh > c.maxH) {
      nh = Math.max(c.minH, Math.min(c.maxH, nh));
      nw = Math.round(nh * c.ratio!);
    }
  } else {
    const [rMin, rMax] = c.ratioRange!;
    const r = nh > 0 ? nw / nh : rMin;
    if (r < rMin) nh = Math.round(nw / rMin);
    else if (r > rMax) nh = Math.round(nw / rMax);
  }

  nw = Math.max(c.minW, Math.min(c.maxW, nw));
  nh = Math.max(c.minH, Math.min(c.maxH, nh));
  return { w: nw, h: nh };
}

/**
 * sizeScale (0-1) -> resolved {w, h}. Interpolates width between the format's
 * min/max, then derives height from the format's ratio (fixed) or from the
 * current w/h's ratio clamped into range (so nudging the slider doesn't
 * silently reshape a card the user already shaped via resize-drag).
 */
export function resolveCardSize(
  format: CardFormat | undefined,
  sizeScale: number,
  currentW?: number,
  currentH?: number,
): { w: number; h: number } {
  const c = getCardConstraints(format);
  const t = Math.max(0, Math.min(1, sizeScale));
  const w = Math.round(c.minW + (c.maxW - c.minW) * t);

  if (c.ratioKind === "fixed") {
    return clampCardSize(format, w, Math.round(w / c.ratio!));
  }
  const ratio = getCardAspectRatio(format, currentW ?? w, currentH ?? Math.round(w / ((c.ratioRange![0] + c.ratioRange![1]) / 2)));
  return clampCardSize(format, w, Math.round(w / ratio));
}

/** Approximate inverse of resolveCardSize — where does this w/h fall between min/max width, for the slider to reflect a manually resized card. */
export function sizeScaleFromDimensions(format: CardFormat | undefined, w: number): number {
  const c = getCardConstraints(format);
  if (c.maxW === c.minW) return 0.5;
  return Math.max(0, Math.min(1, (w - c.minW) / (c.maxW - c.minW)));
}

// ── PFP size (Stage 3B.2-B) ──────────────────────────────────────────────────
// Legacy preset diameters (sm/md/lg), kept as the fallback for any card that
// has never touched the new continuous slider — see resolvePfpSize below.
export const PFP_PHOTO_SIZES: Record<"sm" | "md" | "lg", number> = { sm: 52, md: 80, lg: 112 };
export const PFP_SIZE_MIN = 32;
export const PFP_SIZE_MAX = 160;

/** Card content padding — depends only on variant. Single source of truth
 * shared by ProfileCard.tsx's render and ProfileConfigMenu.tsx's size-slider
 * bounds, so they can't independently drift apart. */
export function getCardPadding(variant: string | undefined): number {
  return variant === "minimal" ? 14 : 20;
}

/**
 * Hard ceiling so the avatar never exceeds the card's own box, regardless of
 * what's persisted or what a variant nudge (see ProfileCard.tsx) asks for —
 * the diameter plus padding on both sides must fit the shorter axis.
 */
export function getPfpSizeBounds(boxW: number, boxH: number, padding: number): { min: number; max: number } {
  const hardMax = Math.max(PFP_SIZE_MIN, Math.min(PFP_SIZE_MAX, Math.min(boxW, boxH) - 2 * padding));
  return { min: PFP_SIZE_MIN, max: hardMax };
}

/**
 * Resolves the avatar's diameter: the continuous px override if the user has
 * set one via the size slider, else the legacy sm/md/lg preset — either way,
 * clamped into the card's current bounds. Single source of truth for "how
 * big is the pfp", shared by ProfileCard.tsx's render and the slider's live
 * value/range, so they can never independently disagree (see the 3B.2-A/B
 * PFP-anchor postmortem for why two call sites deriving "the same" number
 * separately is exactly how that bug happened).
 */
export function resolvePfpSize(
  photoSize: "sm" | "md" | "lg" | undefined,
  pfpSizePx: number | undefined,
  boxW: number,
  boxH: number,
  padding: number,
): number {
  const base = pfpSizePx ?? PFP_PHOTO_SIZES[photoSize ?? "md"];
  const { min, max } = getPfpSizeBounds(boxW, boxH, padding);
  return Math.max(min, Math.min(max, base));
}

// ── Vertical growth (Stage 4.2-A, generalized in 4.2-C.1) ────────────────────
// Pure, higher-layer height math for internal blocks that need more room than
// the card currently has (e.g. Links, Music) — see CLAUDE.md's Etapa 4
// roadmap. Deliberately NOT part of computeComposition()/computeBlockLayout()
// (cardComposition.ts): those lay out content within a FIXED box and never
// touch w/h (see that file's header) — this is the layer above that decides
// the box itself, before composition runs. Wired into ProfileCard.tsx's
// render/growth effect as of Stage 4.2-B (Links) / 4.2-C.1 (+ Music).

export interface RequiredCardHeightInput {
  format: CardFormat | undefined;
  /** Current box height, px — the floor: this only grows the card, never
   * shrinks it. */
  currentH: number;
  /** Y (px, relative to the card's own box) where the currently-composed
   * content already ends — e.g. the lowest bottom edge among
   * computeBlockLayout()'s boxes. */
  contentBottom: number;
  /** Padding reserved below the last block — same contract as every other
   * block gap in this system (see blockConstraints.ts). */
  padding: number;
  /** Extra blocks stacked below the existing content, IN ORDER (e.g. Links
   * then Music) — each contributes its own gap + natural height, summed.
   * Stage 4.2-C.1 generalized this from a single `extraBlock` object (Links
   * only) to this array specifically so two-or-more blocks compose
   * correctly in ONE call: computing "room needed" for each block
   * separately and taking the max (rather than summing) would under-report
   * the required height whenever more than one block is actually present,
   * since each block sits below the previous one, not in the same slot.
   * Absent/empty = no growth: result === currentH exactly (see the
   * "no extra blocks" regression test in cardGeometry.test.ts). */
  extraBlocks?: { naturalHeight: number; gap: number }[];
}

/**
 * Minimum card height needed so every entry in `extraBlocks` (if any) fits
 * below the already-composed content, stacked in order, without invading it —
 * clamped into the format's own [minH, maxH] (getCardConstraints) and never
 * below `currentH` — the card only grows downward (y stays fixed; callers
 * apply the result to h only). Pure and cheap, but deliberately NOT meant to
 * be called every render/frame: only when content or enabled blocks
 * structurally change.
 */
export function computeRequiredCardHeight(input: RequiredCardHeightInput): number {
  const { format, currentH, contentBottom, padding, extraBlocks } = input;
  if (!extraBlocks || extraBlocks.length === 0) return currentH;
  const c = getCardConstraints(format);
  const stacked = extraBlocks.reduce((sum, b) => sum + b.gap + b.naturalHeight, 0);
  const required = contentBottom + stacked + padding;
  return Math.max(currentH, Math.min(c.maxH, Math.max(c.minH, required)));
}

/**
 * Maps the 0-100 continuous shape slider to a CSS border-radius percentage:
 * 0 = square corners (0%), 100 = a full circle (50%, the point at which
 * border-radius stops changing a square box's visual shape further).
 * Undefined defaults to 100 (circle) — every existing card's pfp keeps
 * rendering exactly as it did before this field existed.
 */
export function pfpRadiusToPercent(pfpRadius: number | undefined): number {
  const pct = Math.max(0, Math.min(100, pfpRadius ?? 100));
  return (pct / 100) * 50;
}
