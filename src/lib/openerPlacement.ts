/**
 * Iteration 0: where the canvas chrome of a selected element goes ("Editar"
 * opener, lock/rotate, the image/text toolbars, the image LINK chip),
 * relative to the element's own box (canvas coordinates, origin = the
 * element's top-left corner).
 *
 * Constraints (A11y / Interaction / Critic / Visual reviews):
 * - clear of all 8 resize handles: each is a 9px dot, so by WCAG 2.5.8's
 *   spacing rule the 24px circle centered on it (radius 12) must not
 *   intersect the control;
 * - never under the fixed 44px topbar (z 800);
 * - inside the canvas (the wrapper clips with overflow:hidden) — review r2:
 *   lock/rotate at a fixed right:-40 were clipped for an element at the
 *   right edge, so a locked element there could not be unlocked.
 *
 * Every resolver tries candidates in order and returns the first that
 * satisfies all three; if none does, the last candidate (inside the
 * element) — always visible, as a last resort.
 */
export const OPENER_SIZE = 24;
export const HANDLE_TARGET_RADIUS = 12;

export interface ChromeBox { x: number; y: number; w: number; h: number }
export interface ChromeCanvas { w: number; h: number; topOffset: number }
export type ChromeSpot = { top: number; left: number; where: string };

/** Distance from the closest point of a rect (element-relative) to the
 * nearest of the element's 8 resize-handle centers. */
export function clearanceFromHandles(r: { top: number; left: number; w: number; h: number }, el: { w: number; h: number }): number {
  const pts = [
    [0, 0], [el.w / 2, 0], [el.w, 0], [el.w, el.h / 2],
    [el.w, el.h], [el.w / 2, el.h], [0, el.h], [0, el.h / 2],
  ];
  let min = Infinity;
  for (const [px, py] of pts) {
    const cx = Math.max(r.left, Math.min(px, r.left + r.w));
    const cy = Math.max(r.top, Math.min(py, r.top + r.h));
    min = Math.min(min, Math.hypot(px - cx, py - cy));
  }
  return min;
}

/** Is the rect (element-relative) fully on the visible canvas, below the
 * topbar? `checkX: false` for horizontally centered toolbars whose width
 * isn't known here. */
export function isOnCanvas(r: { top: number; left: number; w: number; h: number }, el: ChromeBox, canvas: ChromeCanvas, checkX = true): boolean {
  const ax = el.x + r.left, ay = el.y + r.top;
  if (ay < canvas.topOffset || ay + r.h > canvas.h) return false;
  if (checkX && (ax < 0 || ax + r.w > canvas.w)) return false;
  return true;
}

function pick(cands: ChromeSpot[], size: { w: number; h: number }, el: ChromeBox, canvas: ChromeCanvas, checkX = true): ChromeSpot {
  for (const c of cands) {
    const r = { top: c.top, left: c.left, w: size.w, h: size.h };
    if (isOnCanvas(r, el, canvas, checkX) && clearanceFromHandles(r, el) > HANDLE_TARGET_RADIUS) return c;
  }
  return cands[cands.length - 1];
}

/** "Editar": above the top-left corner → left of it → below-left → inside
 * the corner (last resort; it may cover content such as Music's play). */
export function resolveOpenerSpot(el: ChromeBox, canvas: ChromeCanvas): ChromeSpot {
  return pick([
    { top: -38, left: 0, where: "above" },
    { top: 0, left: -40, where: "left" },
    { top: el.h + 14, left: 0, where: "below" },
    { top: 14, left: 14, where: "inside" },
  ], { w: OPENER_SIZE, h: OPENER_SIZE }, el, canvas);
}

/** Lock (slot 1) / rotate (slot 0): a fixed column outside the right edge →
 * outside the left edge → inside the top-right corner. Slots are fixed so
 * the lock never jumps when toggled (review r2, Visual-6). */
export function resolveSideSpot(el: ChromeBox, canvas: ChromeCanvas, slot: 0 | 1): ChromeSpot {
  const dy = slot * 30;
  return pick([
    { top: dy, left: el.w + 16, where: "right" },
    { top: dy, left: -40, where: "left" },
    { top: el.h + 14, left: el.w - OPENER_SIZE - slot * 30, where: "below" },
    { top: 14, left: el.w - 14 - OPENER_SIZE - slot * 30, where: "inside" },
  ], { w: OPENER_SIZE, h: OPENER_SIZE }, el, canvas);
}

/** Image/text toolbar (height ~32, horizontally centered or left-aligned):
 * above → inside the top edge. (Below is taken by the image LINK chip and
 * the text-format panel.) */
export const TOOLBAR_HEIGHT = 32;
export function resolveToolbarTop(el: ChromeBox, canvas: ChromeCanvas): ChromeSpot {
  return pick([
    { top: -46, left: 0, where: "above" },
    { top: 14, left: 0, where: "inside" },
  ], { w: 0, h: TOOLBAR_HEIGHT }, { ...el, w: Math.max(el.w, 1) }, canvas, false);
}

/** Image LINK chip (height 24, centered): below the bottom edge, clear of
 * the s handle → inside the bottom edge. */
export function resolveLinkChipTop(el: ChromeBox, canvas: ChromeCanvas): ChromeSpot {
  return pick([
    { top: el.h + 14, left: 0, where: "below" },
    { top: el.h - 14 - OPENER_SIZE, left: 0, where: "inside" },
  ], { w: 0, h: OPENER_SIZE }, el, canvas, false);
}

// ── Back-compat (opener used by ProfileCard/Music before review r2) ──────────
export type OpenerPlacement = { top: number; left: number; where: string };
export function resolveOpenerPlacement(el: ChromeBox, canvas: ChromeCanvas): OpenerPlacement {
  return resolveOpenerSpot(el, canvas);
}
