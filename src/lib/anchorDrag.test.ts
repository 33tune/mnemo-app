import { test } from "node:test";
import assert from "node:assert/strict";
import { nextAnchorAxis } from "./anchorDrag";

test("nextAnchorAxis maps mouse delta proportionally when there is real room", () => {
  // rawAvail=200: moving the mouse by the full range should hit the anchor's
  // extremes exactly, and half the range should land at the midpoint.
  assert.equal(nextAnchorAxis(0.5, 0, 200), 0.5);
  assert.equal(nextAnchorAxis(0.5, 100, 200), 1);
  assert.equal(nextAnchorAxis(0.5, -100, 200), 0);
  assert.ok(Math.abs(nextAnchorAxis(0, 50, 200) - 0.25) < 1e-9);
});

test("nextAnchorAxis clamps to [0,1] even when the mouse overshoots the available range", () => {
  assert.equal(nextAnchorAxis(0.5, 10_000, 200), 1);
  assert.equal(nextAnchorAxis(0.5, -10_000, 200), 0);
});

// Regression: a horizontal-format card at its own minimum height with the
// default "md" photo size collapses rawAvail to exactly 0 (120 - 2*20 - 80).
// Before the fix, the caller floored this to 1, making the stored anchor
// swing across its full 0-1 range from a single pixel of incidental mouse
// jitter — invisible in the render at the time (which pins to a fixed point
// in the same regime) but able to resurface as an unexplained jump if the
// card was later resized larger. See 3B.2-A investigation notes.
test("nextAnchorAxis freezes the axis (returns start unchanged) when rawAvail is exactly zero", () => {
  assert.equal(nextAnchorAxis(0.5, 1, 0), 0.5);
  assert.equal(nextAnchorAxis(0.5, -1, 0), 0.5);
  assert.equal(nextAnchorAxis(0.5, 500, 0), 0.5);
});

test("nextAnchorAxis freezes the axis when rawAvail is negative (avatar bigger than the padded box)", () => {
  assert.equal(nextAnchorAxis(0.3, 1, -12), 0.3);
  assert.equal(nextAnchorAxis(0.3, -1, -12), 0.3);
});

test("nextAnchorAxis never lets a degenerate axis drift away from whatever value it already held", () => {
  // A whole sequence of mousemoves on a degenerate axis must all no-op,
  // not just the first one.
  let y = 0.5;
  for (const delta of [1, -3, 40, -500, 2]) {
    y = nextAnchorAxis(y, delta, 0);
  }
  assert.equal(y, 0.5);
});
