/**
 * Pure utilities for cross-view (Desktop ↔ Mobile) element operations.
 * No React. No Supabase. No side effects. No state mutations.
 * All functions take values and return new values — callers handle insertion.
 */
import type { CanvasElement, CanvasState, ElementType } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Logical width of the Mobile canvas in pixels. */
export const MOBILE_CANVAS_WIDTH = 390;

/** Vertical gap added between stacked elements during smart placement. */
export const MOBILE_STACK_GAP = 24;

/** Starting Y offset when the Mobile canvas is empty. */
export const MOBILE_INITIAL_Y = 24;

/**
 * Fields that describe WHERE an element lives in a specific canvas.
 * Never transferred when copying an element between views.
 */
export const PLACEMENT_KEYS = [
  "x", "y", "w", "h", "zIndex", "layer", "depth", "rotation",
] as const;

export type PlacementKey = (typeof PLACEMENT_KEYS)[number];

/**
 * Default dimensions for each element type when placed in the Mobile canvas.
 * Text elements have no fixed bounding box.
 */
export const MOBILE_DEFAULT_DIMS: Readonly<Record<ElementType, { w: number; h: number }>> = {
  profile:   { w: 350, h: 220 },
  social:    { w: 350, h: 110 },
  music:     { w: 350, h: 130 },
  links:     { w: 350, h: 160 },
  stats:     { w: 350, h: 160 },
  guestbook: { w: 350, h: 320 },
  card:      { w: 310, h: 200 },
  image:     { w: 310, h: 220 },
  gallery:   { w: 350, h: 240 },
  media:     { w: 350, h: 240 },
  text:      { w: 0,   h: 0   },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ElementPlacement = {
  x:        number;
  y:        number;
  w?:       number;
  h?:       number;
  zIndex:   number;
  layer:    0 | 1 | 2;
  depth:    number;
  rotation: number;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the lowest bottom edge (y + h) across all elements in the canvas.
 * Uses font size as a proxy for text element height.
 */
export function computeCanvasBottom(state: CanvasState): number {
  const withH = [
    ...state.cards,      ...state.images,    ...state.galleries,
    ...state.profiles,   ...state.medias,    ...state.guestbooks,
    ...state.socialCards, ...state.musicCards, ...state.linksCards,
    ...state.statsCards,
  ];
  let max = 0;
  for (const e of withH)  max = Math.max(max, e.y + e.h);
  for (const t of state.texts) max = Math.max(max, t.y + t.size);
  return max;
}

/** Returns the highest zIndex currently in use across all elements. */
export function computeCanvasMaxZIndex(state: CanvasState): number {
  const all = [
    ...state.cards,      ...state.images,    ...state.texts,
    ...state.galleries,  ...state.profiles,  ...state.medias,
    ...state.guestbooks, ...state.socialCards, ...state.musicCards,
    ...state.linksCards, ...state.statsCards,
  ];
  return all.reduce((m, e) => Math.max(m, e.zIndex), 0);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns only the placement fields of an element (x, y, w, h, zIndex, …).
 */
export function extractPlacement(element: Record<string, unknown>): Partial<ElementPlacement> {
  const result: Partial<ElementPlacement> = {};
  for (const key of PLACEMENT_KEYS) {
    if (key in element) {
      (result as Record<string, unknown>)[key] = element[key];
    }
  }
  return result;
}

/**
 * Returns all non-placement fields — the portable Config of an element.
 * This is the part that is safe to transfer across canvases and views.
 */
export function extractConfig<T extends Record<string, unknown>>(
  element: T,
): Omit<T, PlacementKey> {
  const result = { ...element };
  for (const key of PLACEMENT_KEYS) {
    delete (result as Record<string, unknown>)[key];
  }
  return result as Omit<T, PlacementKey>;
}

/**
 * Creates a copy of any element with a fresh ID.
 * All fields are preserved; optionally override placement fields.
 */
export function duplicateElement<T extends { id: string }>(
  element: T,
  overridePlacement?: Partial<ElementPlacement>,
): T {
  return { ...element, id: crypto.randomUUID(), ...overridePlacement };
}

/**
 * Computes a smart initial placement for a new element arriving in the Mobile canvas.
 *
 * Strategy: stack vertically below all existing content, centered in MOBILE_CANVAS_WIDTH.
 * The caller can pass overrideDims to use custom dimensions instead of MOBILE_DEFAULT_DIMS.
 */
export function computeMobilePlacement(
  mobileState:  CanvasState,
  elementType:  ElementType,
  overrideDims?: { w: number; h: number },
): ElementPlacement {
  const nextZIndex = computeCanvasMaxZIndex(mobileState) + 1;
  const maxBottom  = computeCanvasBottom(mobileState);
  const nextY      = maxBottom > 0 ? maxBottom + MOBILE_STACK_GAP : MOBILE_INITIAL_Y;

  // Text elements have no fixed bounding box — place at left margin
  if (elementType === "text") {
    return {
      x:        MOBILE_INITIAL_Y,
      y:        nextY,
      zIndex:   nextZIndex,
      layer:    0,
      depth:    0,
      rotation: 0,
    };
  }

  const dims = overrideDims ?? MOBILE_DEFAULT_DIMS[elementType];
  const x    = Math.max(0, Math.round((MOBILE_CANVAS_WIDTH - dims.w) / 2));

  return {
    x,
    y:        nextY,
    w:        dims.w,
    h:        dims.h,
    zIndex:   nextZIndex,
    layer:    0,
    depth:    0,
    rotation: 0,
  };
}

/**
 * Produces a new CanvasElement ready to insert into the Mobile canvas.
 *
 * - Copies all Config (content, styles, effects, animations, links, etc.) from source.
 * - Strips all Desktop placement (x, y, w, h, zIndex, rotation, layer, depth).
 * - Assigns a fresh ID and a smart Mobile placement.
 * - Clears Desktop-only layout fields (stackId, isStackAnchor).
 *
 * Does NOT modify any state — the caller is responsible for inserting the result
 * into the Mobile canvas via the appropriate op or state update.
 */
export function copyToMobile(
  source:       CanvasElement,
  mobileState:  CanvasState,
  overrideDims?: { w: number; h: number },
): CanvasElement {
  const { elementType } = source;
  const config    = extractConfig(source as Record<string, unknown>) as Record<string, unknown>;
  const placement = computeMobilePlacement(mobileState, elementType, overrideDims);

  // stackId and isStackAnchor describe Desktop canvas layout — not portable to Mobile
  delete config.stackId;
  delete config.isStackAnchor;

  return {
    ...config,
    ...placement,
    id: crypto.randomUUID(),
    elementType,
  } as CanvasElement;
}
