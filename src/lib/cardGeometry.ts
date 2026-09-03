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
