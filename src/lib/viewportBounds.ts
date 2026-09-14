/**
 * Pure helpers for keeping canvas elements inside the editor's viewport-
 * bound area (Stage 3B.4-C). No React, no DOM — mirrors the CanvasBoundsLike
 * shape in canvasSelectionGuards.ts, generalized to elements that have no
 * w/h (text, which only carries a font `size`).
 */

export interface ViewportBounds {
  w: number;
  h: number;
  topOffset: number;
}

export interface PositionedLike {
  x: number;
  y: number;
  w?: number;
  h?: number;
  size?: number;
}

/**
 * Clamps a single element's x/y into `bounds`, moving it the minimum amount
 * necessary. Elements with no measurable width (text) are never moved on x.
 * Height falls back to `size` (text's font size, a single-line proxy) when
 * `h` isn't present. Returns the same reference when already inside bounds.
 */
export function clampPositionToBounds<T extends PositionedLike>(el: T, bounds: ViewportBounds): T {
  const w = el.w ?? 0;
  const h = el.h ?? el.size ?? 0;
  const nx = w > 0 ? Math.max(0, Math.min(bounds.w - w, el.x)) : el.x;
  const ny = Math.max(bounds.topOffset, Math.min(bounds.h - h, el.y));
  if (nx === el.x && ny === el.y) return el;
  return { ...el, x: nx, y: ny };
}

/**
 * Normalizes every element in `elements` into `bounds` — run once when a
 * canvas loads, to bring legacy content (positioned under the old, much
 * taller CANVAS_H model) back inside the new viewport-bound editor. Never
 * removes elements, only repositions the ones that fall outside.
 */
export function normalizeElementsToBounds<T extends PositionedLike>(elements: T[], bounds: ViewportBounds): T[] {
  return elements.map(el => clampPositionToBounds(el, bounds));
}
