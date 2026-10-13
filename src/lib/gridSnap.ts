/**
 * MYLAND Editor v3 — Phase I: snapping to the editor grid.
 *
 * Pure functions applied where positions are ALREADY written (drag, resize,
 * keyboard nudge). They never change a formula: they only adjust the INPUT
 * delta, so that the existing writers (applyGroupDragDelta, computeResize,
 * nudgeMove / nudgeResize) produce a value that lands on a grid line:
 * - drag:   the dragged element's top-left lands on the grid (a group keeps
 *           its relative offsets — every member moves by the same delta);
 * - resize: the edge(s) the handle moves land on the grid (an image keeps its
 *           ratio: computeResize derives the other side from the snapped one);
 * - nudge:  an arrow goes to the NEXT grid line in that direction (moving the
 *           element, or growing / shrinking its right / bottom edge).
 * Not snapped: the ProfileCard (always centered — centerCardPosition), a free
 * text's font size, group resize, rotation and typed Medidas values.
 * Holding Shift during a drag / resize turns snapping off for that move;
 * Shift + arrows keeps its free 10px step.
 * The grid is the one CanvasGrid draws: lines every GRID_STEP canvas px from
 * the canvas origin (inside the wrapper, so the view offset never matters).
 */
import type { ResizeHandle } from "./resizeMath";

export function snapValue(v: number, step: number): number {
  if (!(step > 0) || !Number.isFinite(v)) return v;
  return Math.round(v / step) * step;
}

/** Drag: the delta that puts the lead element's start + delta on the grid. */
export function snapDragDelta(start: { x: number; y: number }, dx: number, dy: number, step: number): { dx: number; dy: number } {
  if (!(step > 0)) return { dx, dy };
  return { dx: snapValue(start.x + dx, step) - start.x, dy: snapValue(start.y + dy, step) - start.y };
}

/** Resize: the delta that puts the moving edge(s) of `handle` on the grid.
 * `start` = the element's box when the gesture began (what computeResize
 * receives). For an image (ratio kept) only the DRIVING axis is snapped —
 * width for corners and e/w, height for n/s — exactly the axis computeResize
 * reads. */
export function snapResizeDelta(
  handle: ResizeHandle, dx: number, dy: number,
  start: { x: number; y: number; w: number; h: number }, step: number, keepsRatio: boolean,
): { dx: number; dy: number } {
  if (!(step > 0)) return { dx, dy };
  const right = handle === "e" || handle === "se" || handle === "ne";
  const left = handle === "w" || handle === "sw" || handle === "nw";
  const bottom = handle === "s" || handle === "se" || handle === "sw";
  const top = handle === "n" || handle === "ne" || handle === "nw";
  let ndx = dx, ndy = dy;
  if (right) ndx = snapValue(start.x + start.w + dx, step) - (start.x + start.w);
  if (left) ndx = snapValue(start.x + dx, step) - start.x;
  const heightDrives = !keepsRatio || handle === "n" || handle === "s";
  if (heightDrives) {
    if (bottom) ndy = snapValue(start.y + start.h + dy, step) - (start.y + start.h);
    if (top) ndy = snapValue(start.y + dy, step) - start.y;
  }
  return { dx: ndx, dy: ndy };
}

/** Nudge: from `pos`, the delta to the next grid line in `dir` (±1). A value
 * already on a line moves a whole cell. */
export function snapNudgeDelta(pos: number, dir: number, step: number): number {
  if (!(step > 0) || dir === 0 || !Number.isFinite(pos)) return dir;
  const target = dir > 0 ? (Math.floor(pos / step + 1e-9) + 1) * step : (Math.ceil(pos / step - 1e-9) - 1) * step;
  return target - pos;
}
