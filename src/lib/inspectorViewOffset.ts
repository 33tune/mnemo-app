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
 * Editor v3 Phase B (D2): below the breakpoint the inspector is a BOTTOM
 * SHEET instead of the Phase 2 right overlay — "below the selected element,
 * never over it". The sheet is as tall as the space left under the element
 * allows (within a min/max share of the viewport), and the canvas is
 * translated UP by `dy` (same pure view transform, same rules) to center the
 * element in the area above the sheet.
 *
 * The offset is computed from the card's DATA (x/w), never from the DOM,
 * and is FROZEN for the whole pointer gesture (freezeViewOffset): it is only
 * recomputed — and animated — after the pointer is released, so the canvas
 * never slides under a pressed pointer (marquee, drag, resize, selecting
 * another element).
 */

import { OPENER_SIZE } from "./openerPlacement";

export const INSPECTOR_GUTTER = 16;
/** Review B-UX-2: room kept ABOVE the element in sheet mode for its
 * "Editar" opener (resolveOpenerSpot puts it 38px above the top edge), so
 * the upward offset never pushes it under the topbar. */
export const SHEET_OPENER_RESERVE = OPENER_SIZE + 14;

export interface InspectorLayoutInput {
  viewportW: number;
  inspectorW: number;
  /** Viewport width below which the inspector is a bottom sheet instead of
   * docking to the right. */
  sheetBreakpoint: number;
}

export type InspectorMode = "dock" | "sheet";

export interface InspectorLayout {
  mode: InspectorMode;
  /** Rendered width of the inspector (sheet: the whole viewport). */
  width: number;
}

export function inspectorLayout({ viewportW, inspectorW, sheetBreakpoint }: InspectorLayoutInput): InspectorLayout {
  return viewportW < sheetBreakpoint ? { mode: "sheet", width: viewportW } : { mode: "dock", width: inspectorW };
}

/** The sheet never takes less / more than this share of the viewport. The
 * design (screen 10 "Angosto") shows it at ~55%. */
export const SHEET_MIN_SHARE = 0.4;
export const SHEET_MAX_SHARE = 0.6;
/** …and never less than this (header + chips + one control). */
export const SHEET_MIN_PX = 200;

export interface SheetHeightInput {
  viewportH: number;
  /** The fixed topbar (CANVAS_TOP_OFFSET): the element is never moved under it. */
  topOffset: number;
  /** Height of the selected element. */
  boxH: number;
  gutter?: number;
}

/** As tall as the space under the element allows once it sits just below
 * the topbar — clamped to [max(SHEET_MIN_PX, 40%), 60%] of the viewport. A
 * taller element than that leaves room for is partly covered (`covered`),
 * and the sheet collapses when focus returns to the canvas (2.4.11). */
export function inspectorSheetHeight({ viewportH, topOffset, boxH, gutter = INSPECTOR_GUTTER }: SheetHeightInput): number {
  const max = Math.round(viewportH * SHEET_MAX_SHARE);
  const min = Math.min(max, Math.max(SHEET_MIN_PX, Math.round(viewportH * SHEET_MIN_SHARE)));
  const room = Math.round(viewportH - topOffset - SHEET_OPENER_RESERVE - boxH - 2 * gutter);
  return Math.min(max, Math.max(min, room));
}

export interface SheetOffsetInput {
  viewportH: number;
  topOffset: number;
  sheetH: number;
  box: { y: number; h: number };
  gutter?: number;
}

export interface SheetOffset {
  /** How far (px) the canvas is translated UP. Always >= 0. */
  dy: number;
  /** The sheet still covers part of the box after the offset. */
  covered: boolean;
}

export function inspectorSheetOffset({ viewportH, topOffset, sheetH, box, gutter = INSPECTOR_GUTTER }: SheetOffsetInput): SheetOffset {
  const visibleBottom = viewportH - sheetH;
  // Center the box in the band between the topbar and the sheet…
  const center = box.y + box.h / 2;
  const want = center - (topOffset + visibleBottom) / 2;
  // …but its top (and the "Editar" opener above it) never goes under the topbar.
  const max = Math.max(0, box.y - topOffset - SHEET_OPENER_RESERVE - gutter);
  const dy = Math.min(Math.max(0, want), max);
  return { dy, covered: box.y + box.h - dy + gutter > visibleBottom };
}

export interface ViewOffsetInput {
  viewportW: number;
  inspectorW: number;
  box: { x: number; w: number };
  gutter?: number;
}

export interface ViewOffset {
  /** How far (px) the canvas is translated LEFT. Always >= 0. */
  dx: number;
  /** The inspector still covers part of the box after the offset (a box too
   * wide to fit beside the docked inspector). */
  covered: boolean;
}

/** Docked mode (horizontal). */
export function inspectorViewOffset({ viewportW, inspectorW, box, gutter = INSPECTOR_GUTTER }: ViewOffsetInput): ViewOffset {
  // Review r2: CENTER the box in the area the inspector leaves visible
  // (instead of hugging the inspector's edge). ProfileCard is always
  // centered on the canvas (centerCardPosition), so for it this is a
  // constant inspectorW / 2 — it does not change while the card is resized.
  const visibleW = viewportW - inspectorW;
  const center = box.x + box.w / 2;
  // The box's left edge never leaves the screen.
  const max = Math.max(0, box.x - gutter);
  const dx = Math.min(Math.max(0, center - visibleW / 2), max);
  return { dx, covered: box.x + box.w - dx + gutter > visibleW };
}

/** Review r2: whether a pointer gesture freezes the view offset. ALWAYS
 * while an inspector is open — including a gesture that starts at dx = 0
 * (a resize that widens the card past the threshold would otherwise slide
 * the canvas mid-drag) — and while an offset is still applied (a gesture
 * that closes the inspector keeps the canvas still until release). */
export function shouldFreezeOnPointerDown(inspectorOpen: boolean, appliedDx: number): boolean {
  return inspectorOpen || appliedDx !== 0;
}

/** While a pointer gesture is active the applied view (offset, and in sheet
 * mode the sheet height) does not change. */
export function freezeViewOffset<V>(applied: V, computed: V, gestureActive: boolean): V {
  return gestureActive ? applied : computed;
}
