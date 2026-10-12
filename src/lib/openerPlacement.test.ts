import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveOpenerSpot, resolveSideSpot, resolveToolbarTop, resolveLinkChipTop,
  clearanceFromHandles, isOnCanvas, OPENER_SIZE, TOOLBAR_HEIGHT, HANDLE_TARGET_RADIUS,
} from "./openerPlacement";

const C = { w: 1000, h: 800, topOffset: 44 };
const sq = (top: number, left: number) => ({ top, left, w: OPENER_SIZE, h: OPENER_SIZE });

// Elements in every awkward spot: centered, at each edge, each corner, tiny.
const BOXES = [
  { x: 400, y: 300, w: 220, h: 64 },
  { x: 0, y: 44, w: 220, h: 64 },          // top-left corner, under the topbar line
  { x: 780, y: 44, w: 220, h: 64 },        // top-right
  { x: 780, y: 736, w: 220, h: 64 },       // bottom-right
  { x: 0, y: 736, w: 220, h: 64 },         // bottom-left
  { x: 952, y: 400, w: 48, h: 20 },        // tiny at the right edge
  { x: 300, y: 44, w: 400, h: 700 },       // tall card
];

test("opener: above when there is room under the topbar; never under it", () => {
  assert.equal(resolveOpenerSpot({ x: 300, y: 200, w: 300, h: 300 }, C).where, "above");
  assert.equal(resolveOpenerSpot({ x: 300, y: 44, w: 300, h: 300 }, C).where, "left");
  assert.equal(resolveOpenerSpot({ x: 0, y: 44, w: 300, h: 300 }, C).where, "below", "below-left before covering content");
});

for (const el of BOXES) {
  test(`chrome stays on canvas, below the topbar and >12px from every resize handle (${JSON.stringify(el)})`, () => {
    const spots = [
      ["opener", resolveOpenerSpot(el, C)],
      ["rotate", resolveSideSpot(el, C, 0)],
      ["lock", resolveSideSpot(el, C, 1)],
    ] as const;
    for (const [name, s] of spots) {
      const r = sq(s.top, s.left);
      if (s.where !== "inside") {
        assert.ok(isOnCanvas(r, el, C), `${name} ${s.where} off-canvas`);
        assert.ok(clearanceFromHandles(r, el) > HANDLE_TARGET_RADIUS, `${name} ${s.where} clearance ${clearanceFromHandles(r, el)}`);
      }
    }
    const tb = resolveToolbarTop(el, C);
    assert.ok(el.y + tb.top >= C.topOffset, "toolbar never under the topbar");
    assert.ok(el.y + tb.top + TOOLBAR_HEIGHT <= C.h);
    const chip = resolveLinkChipTop(el, C);
    assert.ok(el.y + chip.top + OPENER_SIZE <= C.h, "LINK chip on canvas");
  });
}

test("lock keeps its slot when toggled (fixed position per slot)", () => {
  const el = { x: 400, y: 300, w: 220, h: 64 };
  const a = resolveSideSpot(el, C, 1), b = resolveSideSpot(el, C, 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(resolveSideSpot(el, C, 0), a, "rotate and lock never overlap");
});

test("a locked element at the right edge keeps its unlock button visible (review r2 regression)", () => {
  const el = { x: 780, y: 300, w: 220, h: 64 };
  const lock = resolveSideSpot(el, C, 1);
  assert.equal(lock.where, "left");
  assert.ok(isOnCanvas(sq(lock.top, lock.left), el, C));
});

test("LINK chip below the image clears the s handle (>12px), inside when no room below", () => {
  const el = { x: 400, y: 300, w: 220, h: 100 };
  const chip = resolveLinkChipTop(el, C);
  assert.equal(chip.where, "below");
  assert.equal(chip.top - el.h, 14);
  assert.equal(resolveLinkChipTop({ x: 400, y: 700, w: 220, h: 100 }, C).where, "inside");
});

test("Phase D review: the chrome clears the editor's 60px topbar and the 64px rail", () => {
  const E = { w: 1000, h: 800, topOffset: 60, left: 64 };
  const el = { x: 40, y: 70, w: 200, h: 100 };
  // "left" of an element at x=40 would land under the rail; "above" under the topbar.
  assert.equal(isOnCanvas(sq(-40, -40), el, E), false);
  assert.equal(isOnCanvas(sq(-38, 0), el, E), false);
  for (const s of [resolveOpenerSpot(el, E), resolveSideSpot(el, E, 0), resolveSideSpot(el, E, 1)]) {
    assert.ok(el.y + s.top >= 60, `${s.where}: clear of the topbar`);
    if (s.where !== "inside") assert.ok(el.x + s.left >= 64, `${s.where}: clear of the rail`);
  }
  assert.ok(el.y + resolveToolbarTop(el, E).top >= 60, "toolbar clear of the topbar");
  // Without `left` nothing changes (classic bar, visitors).
  assert.equal(isOnCanvas(sq(0, -40), { x: 40, y: 300, w: 200, h: 100 }, C), true);
});
