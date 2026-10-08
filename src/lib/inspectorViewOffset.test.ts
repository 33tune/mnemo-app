// Menu redesign Phase 2 — the docked inspector's VIEW offset (pure math).
// Editor v3 Phase B: the right overlay became a bottom sheet (below).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inspectorLayout, inspectorViewOffset, inspectorSheetHeight, inspectorSheetOffset, freezeViewOffset, shouldFreezeOnPointerDown,
  INSPECTOR_GUTTER, SHEET_MAX_SHARE, SHEET_MIN_PX, SHEET_MIN_SHARE, SHEET_OPENER_RESERVE,
} from "./inspectorViewOffset";
import { centerCardPosition, getFreeformCardBounds } from "./cardGeometry";
import { T } from "@/ui/tokens";

const W = T.ui.size.inspectorW;
const BP = T.ui.breakpoint.inspectorSheet;
const TOP = 44;

test("layout: docked at/above the breakpoint, a full-width bottom sheet below it", () => {
  assert.deepEqual(inspectorLayout({ viewportW: 1440, inspectorW: W, sheetBreakpoint: BP }), { mode: "dock", width: W });
  assert.deepEqual(inspectorLayout({ viewportW: BP, inspectorW: W, sheetBreakpoint: BP }), { mode: "dock", width: W });
  assert.deepEqual(inspectorLayout({ viewportW: BP - 1, inspectorW: W, sheetBreakpoint: BP }), { mode: "sheet", width: BP - 1 });
  assert.deepEqual(inspectorLayout({ viewportW: 390, inspectorW: W, sheetBreakpoint: BP }), { mode: "sheet", width: 390 });
});

test("the card is CENTERED in the visible area (viewport − inspector), not pushed against the inspector", () => {
  for (const [vw, w] of [[1920, 320], [1440, 600], [1200, 400], [BP, 640]] as const) {
    const { x } = centerCardPosition(vw, 1080, w, 300, 44);
    const { dx, covered } = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x, w } });
    assert.equal(covered, false, `vw=${vw} w=${w}`);
    assert.equal(x + w / 2 - dx, (vw - W) / 2, "card center = visible-area center");
  }
});

test("for the always-centered ProfileCard the offset is a constant inspectorW / 2 — resizing it does not move the view", () => {
  const vw = 1440;
  const dxs = [240, 400, 640].map(w => inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x: centerCardPosition(vw, 900, w, 300, 44).x, w } }).dx);
  assert.deepEqual(dxs, [W / 2, W / 2, W / 2]);
});

test("above the breakpoint the widest centered card always fits beside the inspector", () => {
  const { maxW } = getFreeformCardBounds();
  for (const vw of [BP, BP + 1, 1280, 1440, 2560]) {
    const { x } = centerCardPosition(vw, 900, maxW, 400, 44);
    const r = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x, w: maxW } });
    assert.equal(r.covered, false, `vw=${vw}`);
    assert.ok(x - r.dx >= INSPECTOR_GUTTER, "left edge stays on screen");
  }
});

test("a box too wide to fit: the left edge never leaves the screen and `covered` says so", () => {
  const r = inspectorViewOffset({ viewportW: 1000, inspectorW: W, box: { x: 40, w: 900 } });
  assert.equal(r.dx, 40 - INSPECTOR_GUTTER);
  assert.equal(r.covered, true);
});

// ── Phase B: bottom sheet (narrow viewport) ──────────────────────────────

test("sheet height: the room under the element, within [max(200px, 40%), 60%] of the viewport", () => {
  const vh = 844;
  const max = Math.round(vh * SHEET_MAX_SHARE), min = Math.max(SHEET_MIN_PX, Math.round(vh * SHEET_MIN_SHARE));
  assert.equal(inspectorSheetHeight({ viewportH: vh, topOffset: TOP, boxH: 300 }), Math.min(max, vh - TOP - SHEET_OPENER_RESERVE - 300 - 2 * INSPECTOR_GUTTER));
  assert.equal(inspectorSheetHeight({ viewportH: vh, topOffset: TOP, boxH: 220 }), max, "a short card: capped at 60%");
  assert.equal(inspectorSheetHeight({ viewportH: vh, topOffset: TOP, boxH: 700 }), min, "a tall card: never under the minimum");
  assert.equal(inspectorSheetHeight({ viewportH: 400, topOffset: TOP, boxH: 300 }), SHEET_MIN_PX, "tiny viewport: the 200px floor (still <= 60%)");
});

test("sheet: the element sits ABOVE the sheet, centered between the topbar and the sheet — never over it when it fits", () => {
  for (const [vh, h] of [[844, 220], [844, 360], [700, 260], [900, 300]] as const) {
    const { y } = centerCardPosition(390, vh, 300, h, TOP);
    const sheetH = inspectorSheetHeight({ viewportH: vh, topOffset: TOP, boxH: h });
    const r = inspectorSheetOffset({ viewportH: vh, topOffset: TOP, sheetH, box: { y, h } });
    assert.equal(r.covered, false, `vh=${vh} h=${h}`);
    assert.ok(y - r.dy >= TOP + SHEET_OPENER_RESERVE + INSPECTOR_GUTTER - 0.5, "top (and its Editar opener, 38px above) never under the topbar");
    assert.ok(y - r.dy - SHEET_OPENER_RESERVE >= TOP, "B-UX-2: Editar stays below the topbar");
    assert.ok(y + h - r.dy <= vh - sheetH, "bottom above the sheet");
  }
});

test("sheet: an element taller than the room is partly covered (reported) and never pushed under the topbar", () => {
  const vh = 700, h = 520;
  const { y } = centerCardPosition(390, vh, 300, h, TOP);
  const sheetH = inspectorSheetHeight({ viewportH: vh, topOffset: TOP, boxH: h });
  const r = inspectorSheetOffset({ viewportH: vh, topOffset: TOP, sheetH, box: { y, h } });
  assert.equal(r.covered, true);
  assert.equal(r.dy, Math.max(0, y - TOP - SHEET_OPENER_RESERVE - INSPECTOR_GUTTER));
});

test("sheet: the offset is never negative (never pushes the canvas down)", () => {
  for (const y of [0, 44, 60]) {
    assert.ok(inspectorSheetOffset({ viewportH: 844, topOffset: TOP, sheetH: 400, box: { y, h: 200 } }).dy >= 0);
  }
});

test("freeze works on the whole view object (offset + sheet height)", () => {
  const applied = { dx: 0, dy: 120, sheetH: 380, covered: false };
  const computed = { dx: 0, dy: 90, sheetH: 420, covered: false };
  assert.equal(freezeViewOffset(applied, computed, true), applied, "a resize mid-gesture neither slides the canvas nor resizes the sheet");
  assert.equal(freezeViewOffset(applied, computed, false), computed);
});

test("the offset is never negative (never pushes the canvas right)", () => {
  for (const x of [-50, 0, 100, 400]) {
    assert.ok(inspectorViewOffset({ viewportW: 1300, inspectorW: W, box: { x, w: 300 } }).dx >= 0);
  }
});

test("freeze: during a pointer gesture the applied offset never changes", () => {
  assert.equal(freezeViewOffset(120, 0, true), 120, "inspector closed mid-marquee: keep 120 until release");
  assert.equal(freezeViewOffset(120, 160, true), 120, "card resized mid-gesture: keep 120");
  assert.equal(freezeViewOffset(120, 0, false), 0, "released: recompute");
  assert.equal(freezeViewOffset(0, 80, false), 80);
});

test("r2: a gesture freezes the view whenever an inspector is open — also when it starts at dx = 0", () => {
  assert.equal(shouldFreezeOnPointerDown(true, 0), true);
  assert.equal(shouldFreezeOnPointerDown(false, 160), true, "closing gesture keeps the applied offset until release");
  assert.equal(shouldFreezeOnPointerDown(false, 0), false);
  // dx = 0 → a resize that widens the card mid-drag: the computed offset
  // jumps, the applied one must not move until pointerup.
  const vw = 1100;
  const before = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x: 200, w: 100 } }).dx;
  const during = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x: 200, w: 600 } }).dx;
  assert.equal(before, 0, "the gesture starts with no offset applied");
  assert.notEqual(before, during);
  const frozen = shouldFreezeOnPointerDown(true, before);
  assert.equal(freezeViewOffset(before, during, frozen), before);
  assert.equal(freezeViewOffset(before, during, false), during, "recomputed after release");
});
