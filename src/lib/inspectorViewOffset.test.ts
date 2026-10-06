// Menu redesign Phase 2 — the docked inspector's VIEW offset (pure math).
import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectorLayout, inspectorViewOffset, freezeViewOffset, shouldFreezeOnPointerDown, INSPECTOR_GUTTER } from "./inspectorViewOffset";
import { centerCardPosition, getFreeformCardBounds } from "./cardGeometry";
import { T } from "@/ui/tokens";

const W = T.ui.size.inspectorW;
const BP = T.ui.breakpoint.inspectorOverlay;

test("layout: docked at/above the breakpoint, overlay below it (never wider than the viewport − gutters)", () => {
  assert.deepEqual(inspectorLayout({ viewportW: 1440, inspectorW: W, overlayBreakpoint: BP }), { overlay: false, width: W });
  assert.deepEqual(inspectorLayout({ viewportW: BP, inspectorW: W, overlayBreakpoint: BP }), { overlay: false, width: W });
  assert.deepEqual(inspectorLayout({ viewportW: BP - 1, inspectorW: W, overlayBreakpoint: BP }), { overlay: true, width: W });
  assert.deepEqual(inspectorLayout({ viewportW: 300, inspectorW: W, overlayBreakpoint: BP }), { overlay: true, width: 300 - 2 * INSPECTOR_GUTTER });
});

test("the card is CENTERED in the visible area (viewport − inspector), not pushed against the inspector", () => {
  for (const [vw, w] of [[1920, 320], [1440, 600], [1200, 400], [BP, 640]] as const) {
    const { x } = centerCardPosition(vw, 1080, w, 300, 44);
    const { dx, covered } = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x, w }, overlay: false });
    assert.equal(covered, false, `vw=${vw} w=${w}`);
    assert.equal(x + w / 2 - dx, (vw - W) / 2, "card center = visible-area center");
  }
});

test("for the always-centered ProfileCard the offset is a constant inspectorW / 2 — resizing it does not move the view", () => {
  const vw = 1440;
  const dxs = [240, 400, 640].map(w => inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x: centerCardPosition(vw, 900, w, 300, 44).x, w }, overlay: false }).dx);
  assert.deepEqual(dxs, [W / 2, W / 2, W / 2]);
});

test("above the breakpoint the widest centered card always fits beside the inspector", () => {
  const { maxW } = getFreeformCardBounds();
  for (const vw of [BP, BP + 1, 1280, 1440, 2560]) {
    const { x } = centerCardPosition(vw, 900, maxW, 400, 44);
    const r = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x, w: maxW }, overlay: false });
    assert.equal(r.covered, false, `vw=${vw}`);
    assert.ok(x - r.dx >= INSPECTOR_GUTTER, "left edge stays on screen");
  }
});

test("a box too wide to fit: the left edge never leaves the screen and `covered` says so", () => {
  const r = inspectorViewOffset({ viewportW: 1000, inspectorW: W, box: { x: 40, w: 900 }, overlay: false });
  assert.equal(r.dx, 40 - INSPECTOR_GUTTER);
  assert.equal(r.covered, true);
});

test("overlay (narrow viewport): offset when it uncovers the card, 0 only when it can't", () => {
  // 900px, 240px card centered (x = 330): moving it 160px left uncovers it.
  const fits = inspectorViewOffset({ viewportW: 900, inspectorW: W, box: { x: 330, w: 240 }, overlay: true });
  assert.equal(fits.covered, false);
  assert.equal(330 + 120 - fits.dx, (900 - W) / 2);
  // 700px, 500px card: nothing uncovers it → no offset, reported covered.
  assert.deepEqual(inspectorViewOffset({ viewportW: 700, inspectorW: W, box: { x: 100, w: 500 }, overlay: true }), { dx: 0, covered: true });
});

test("the offset is never negative (never pushes the canvas right)", () => {
  for (const x of [-50, 0, 100, 400]) {
    assert.ok(inspectorViewOffset({ viewportW: 1300, inspectorW: W, box: { x, w: 300 }, overlay: false }).dx >= 0);
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
  const before = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x: 200, w: 100 }, overlay: false }).dx;
  const during = inspectorViewOffset({ viewportW: vw, inspectorW: W, box: { x: 200, w: 600 }, overlay: false }).dx;
  assert.equal(before, 0, "the gesture starts with no offset applied");
  assert.notEqual(before, during);
  const frozen = shouldFreezeOnPointerDown(true, before);
  assert.equal(freezeViewOffset(before, during, frozen), before);
  assert.equal(freezeViewOffset(before, during, false), during, "recomputed after release");
});
