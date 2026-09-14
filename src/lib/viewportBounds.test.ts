import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPositionToBounds, normalizeElementsToBounds } from "./viewportBounds";

const bounds = { w: 1000, h: 800, topOffset: 44 };

// ── clampPositionToBounds ────────────────────────────────────────────────

test("clampPositionToBounds: element fully inside bounds is untouched (same reference)", () => {
  const el = { x: 100, y: 100, w: 200, h: 150 };
  assert.equal(clampPositionToBounds(el, bounds), el);
});

test("clampPositionToBounds: pulls y up when y+h exceeds bounds.h", () => {
  const el = { x: 100, y: 780, w: 200, h: 150 };
  const out = clampPositionToBounds(el, bounds);
  assert.equal(out.y, bounds.h - el.h);
  assert.equal(out.x, 100, "x must not change when only y is invalid");
});

test("clampPositionToBounds: pulls y down to topOffset when above it", () => {
  const el = { x: 10, y: 0, w: 50, h: 50 };
  const out = clampPositionToBounds(el, bounds);
  assert.equal(out.y, bounds.topOffset);
});

test("clampPositionToBounds: clamps x when it overflows on either side", () => {
  const overRight = clampPositionToBounds({ x: 950, y: 100, w: 200, h: 50 }, bounds);
  assert.equal(overRight.x, bounds.w - 200);
  const overLeft = clampPositionToBounds({ x: -40, y: 100, w: 200, h: 50 }, bounds);
  assert.equal(overLeft.x, 0);
});

test("clampPositionToBounds: text-like elements (no w/h, only `size`) never move on x", () => {
  const el = { x: 5000, y: 780, size: 24 };
  const out = clampPositionToBounds(el, bounds);
  assert.equal(out.x, 5000, "no width to validate x against — x is left alone");
  assert.equal(out.y, bounds.h - 24);
});

test("clampPositionToBounds: element taller than the usable area is pinned to topOffset (best effort, may still overflow the bottom)", () => {
  const el = { x: 0, y: 500, w: 100, h: 900 };
  const out = clampPositionToBounds(el, bounds);
  assert.equal(out.y, bounds.topOffset);
});

// ── normalizeElementsToBounds ────────────────────────────────────────────

test("normalizeElementsToBounds: leaves valid elements untouched and fixes only the invalid one", () => {
  const valid   = { id: "a", x: 10, y: 100, w: 50, h: 50 };
  const invalid = { id: "b", x: 10, y: 2264, w: 456, h: 528 };
  const out = normalizeElementsToBounds([valid, invalid], bounds);
  assert.equal(out[0], valid);
  assert.equal(out[1].y, bounds.h - 528);
  assert.equal(out[1].x, 10);
});

test("normalizeElementsToBounds: never removes elements", () => {
  const els = [
    { id: "a", x: 0, y: 3000, w: 10, h: 10 },
    { id: "b", x: 0, y: -100, w: 10, h: 10 },
  ];
  const out = normalizeElementsToBounds(els, bounds);
  assert.equal(out.length, 2);
});
