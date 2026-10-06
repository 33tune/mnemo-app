/**
 * Menu redesign Phase 2 — the docked inspector's VIEW offset.
 *
 * The inspector is docked to the right edge of the viewport. When it would
 * cover the selected ProfileCard, the editor canvas is translated left by
 * `dx` — a pure VIEW transform on CanvasBoard's canvas wrapper:
 * - card.x/card.y are never written, centerCardPosition() keeps receiving
 *   the real viewport width (an approach that shrank/padded the canvas would
 *   make the growth effect re-center and WRITE card.x — Stage 4.2-C.2.4);
 * - every pointer→canvas conversion (toCanvasCoords, getElementsAtPoint,
 *   drop, paste, rotate) reads the wrapper's getBoundingClientRect(), which
 *   already includes the transform; drag/resize work on clientX deltas,
 *   which a translation does not change.
 * Elements with x < dx are out of view while the inspector is open
 * (expected — the inspector is about the card).
 *
 * The offset is computed from the card's DATA (x/w), never from the DOM,
 * and is FROZEN for the whole pointer gesture (freezeViewOffset): it is only
 * recomputed — and animated — after the pointer is released, so the canvas
 * never slides under a pressed pointer (marquee, drag, resize, selecting
 * another element).
 */

export const INSPECTOR_GUTTER = 16;

export interface InspectorLayoutInput {
  viewportW: number;
  inspectorW: number;
  /** Viewport width below which the inspector overlays instead of docking. */
  overlayBreakpoint: number;
}

export interface InspectorLayout {
  overlay: boolean;
  /** Rendered width of the aside (overlay: never wider than the viewport
   * minus a 16px gutter on each side). */
  width: number;
}

export function inspectorLayout({ viewportW, inspectorW, overlayBreakpoint }: InspectorLayoutInput): InspectorLayout {
  const overlay = viewportW < overlayBreakpoint;
  return { overlay, width: overlay ? Math.max(0, Math.min(inspectorW, viewportW - 2 * INSPECTOR_GUTTER)) : inspectorW };
}

export interface ViewOffsetInput {
  viewportW: number;
  inspectorW: number;
  box: { x: number; w: number };
  overlay: boolean;
  gutter?: number;
}

export interface ViewOffset {
  /** How far (px) the canvas is translated LEFT. Always >= 0. */
  dx: number;
  /** The inspector still covers part of the box after the offset (overlay
   * mode, or a box too wide to fit beside the inspector). */
  covered: boolean;
}

export function inspectorViewOffset({ viewportW, inspectorW, box, overlay, gutter = INSPECTOR_GUTTER }: ViewOffsetInput): ViewOffset {
  // Review r2: CENTER the box in the area the inspector leaves visible
  // (instead of hugging the inspector's edge). ProfileCard is always
  // centered on the canvas (centerCardPosition), so for it this is a
  // constant inspectorW / 2 — it does not change while the card is resized.
  const visibleW = viewportW - inspectorW;
  const center = box.x + box.w / 2;
  // The box's left edge never leaves the screen.
  const max = Math.max(0, box.x - gutter);
  const dx = Math.min(Math.max(0, center - visibleW / 2), max);
  const coveredAfter = box.x + box.w - dx + gutter > visibleW;
  // Overlay (narrow viewport): offset only when that uncovers the box;
  // otherwise leave the canvas alone (the overlay collapses to a tab when
  // focus returns to the canvas — 2.4.11).
  if (overlay && coveredAfter) return { dx: 0, covered: box.x + box.w > visibleW };
  return { dx, covered: coveredAfter };
}

/** Review r2: whether a pointer gesture freezes the view offset. ALWAYS
 * while an inspector is open — including a gesture that starts at dx = 0
 * (a resize that widens the card past the threshold would otherwise slide
 * the canvas mid-drag) — and while an offset is still applied (a gesture
 * that closes the inspector keeps the canvas still until release). */
export function shouldFreezeOnPointerDown(inspectorOpen: boolean, appliedDx: number): boolean {
  return inspectorOpen || appliedDx !== 0;
}

/** While a pointer gesture is active the applied offset does not change. */
export function freezeViewOffset(applied: number, computed: number, gestureActive: boolean): number {
  return gestureActive ? applied : computed;
}
