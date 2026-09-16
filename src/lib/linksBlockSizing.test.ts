import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLinksNaturalSize } from "./linksBlockSizing";

test("computeLinksNaturalSize: zero or negative count claims no room", () => {
  assert.deepEqual(computeLinksNaturalSize({ count: 0, iconSize: 24, gap: 8, availableWidth: 200 }), { width: 0, height: 0 });
  assert.deepEqual(computeLinksNaturalSize({ count: -3, iconSize: 24, gap: 8, availableWidth: 200 }), { width: 0, height: 0 });
});

test("computeLinksNaturalSize: non-positive icon size claims no room", () => {
  assert.deepEqual(computeLinksNaturalSize({ count: 5, iconSize: 0, gap: 8, availableWidth: 200 }), { width: 0, height: 0 });
});

test("computeLinksNaturalSize: everything fits on one row when availableWidth is generous", () => {
  const r = computeLinksNaturalSize({ count: 4, iconSize: 24, gap: 8, availableWidth: 400 });
  assert.equal(r.width, 4 * 24 + 3 * 8);
  assert.equal(r.height, 24);
});

test("computeLinksNaturalSize: wraps to a second row when availableWidth can't fit everyone", () => {
  // 3 icons of 24px + 8px gap fit in ~88px; 4th must wrap.
  const r = computeLinksNaturalSize({ count: 4, iconSize: 24, gap: 8, availableWidth: 90 });
  assert.equal(r.width, 3 * 24 + 2 * 8, "row width should reflect the 3 that actually fit per row");
  assert.equal(r.height, 2 * 24 + 8, "two rows");
});

test("computeLinksNaturalSize: a single icon never exceeds its own size regardless of availableWidth", () => {
  const r = computeLinksNaturalSize({ count: 1, iconSize: 24, gap: 8, availableWidth: 500 });
  assert.deepEqual(r, { width: 24, height: 24 });
});

test("computeLinksNaturalSize: availableWidth narrower than one icon still places one icon per row (never zero)", () => {
  const r = computeLinksNaturalSize({ count: 3, iconSize: 24, gap: 8, availableWidth: 5 });
  assert.equal(r.width, 24, "one column");
  assert.equal(r.height, 3 * 24 + 2 * 8, "three rows, one icon each");
});

test("computeLinksNaturalSize: height grows monotonically with count for a fixed availableWidth", () => {
  let prevHeight = 0;
  for (const count of [1, 3, 6, 10, 20]) {
    const r = computeLinksNaturalSize({ count, iconSize: 24, gap: 8, availableWidth: 120 });
    assert.ok(r.height >= prevHeight, `height should not shrink as count grows: ${prevHeight} -> ${r.height} at count=${count}`);
    prevHeight = r.height;
  }
});

test("computeLinksNaturalSize: never reports a width wider than availableWidth when at least 2 columns fit", () => {
  const r = computeLinksNaturalSize({ count: 20, iconSize: 24, gap: 8, availableWidth: 200 });
  assert.ok(r.width <= 200 + 0.001, `width ${r.width} exceeds availableWidth 200`);
});
