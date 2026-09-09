import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anchorToRect, rectToAnchor, snapAxis, snappedPoint, resolveOverlap, resolveBlockPosition,
  axisAnchorToPixel, axisPixelToAnchor, centerAlignAnchor,
} from "./blockConstraints";

test("anchorToRect never leaves the padded box, for any anchor in [0,1]", () => {
  for (const a of [0, 0.1, 0.5, 0.874, 1]) {
    const r = anchorToRect(a, a, 60, 30, 300, 200, 20);
    assert.ok(r.x >= 20 - 1e-9 && r.x + r.w <= 280 + 1e-9, `x out of bounds: ${JSON.stringify(r)}`);
    assert.ok(r.y >= 20 - 1e-9 && r.y + r.h <= 180 + 1e-9, `y out of bounds: ${JSON.stringify(r)}`);
  }
});

test("anchorToRect hits the exact edges at anchor 0 and 1", () => {
  const atZero = anchorToRect(0, 0, 60, 30, 300, 200, 20);
  assert.equal(atZero.x, 20);
  assert.equal(atZero.y, 20);
  const atOne = anchorToRect(1, 1, 60, 30, 300, 200, 20);
  assert.equal(atOne.x, 300 - 20 - 60);
  assert.equal(atOne.y, 200 - 20 - 30);
});

test("rectToAnchor is the exact inverse of anchorToRect", () => {
  for (const [ax, ay] of [[0, 0], [0.25, 0.75], [0.5, 0.5], [1, 0]] as [number, number][]) {
    const rect = anchorToRect(ax, ay, 60, 30, 300, 200, 20);
    const back = rectToAnchor(rect, 60, 30, 300, 200, 20);
    assert.ok(Math.abs(back.x - ax) < 1e-9, `x round-trip: ${back.x} vs ${ax}`);
    assert.ok(Math.abs(back.y - ay) < 1e-9, `y round-trip: ${back.y} vs ${ay}`);
  }
});

test("rectToAnchor falls back to 0.5 when the block exactly fills its axis (no room to derive a meaningful anchor)", () => {
  const back = rectToAnchor({ x: 20, y: 20 }, 260, 160, 300, 200, 20);
  assert.equal(back.x, 0.5);
  assert.equal(back.y, 0.5);
});

// ── Magnetism / hysteresis ─────────────────────────────────────────────────

test("snapAxis pulls a raw value close to a magnetic point onto it", () => {
  assert.equal(snapAxis(0.02, undefined), 0);
  assert.equal(snapAxis(0.48, undefined), 0.5);
  assert.equal(snapAxis(0.97, undefined), 1);
});

test("snapAxis passes through values far from any magnetic point unchanged (continuous positioning)", () => {
  assert.equal(snapAxis(0.3, undefined), 0.3);
  assert.equal(snapAxis(0.7, undefined), 0.7);
});

test("snapAxis hysteresis: once snapped, a small drift away stays snapped; a large drift releases", () => {
  const snappedAt = snapAxis(0.5, undefined);
  assert.equal(snappedAt, 0.5);
  // Still within the wider release radius -> stays snapped.
  assert.equal(snapAxis(0.55, snappedPoint(snappedAt)), 0.5);
  assert.equal(snapAxis(0.6, snappedPoint(snappedAt)), 0.5);
  // Far enough to release -> continuous value passes through.
  assert.equal(snapAxis(0.7, snappedPoint(snappedAt)), 0.7);
});

test("snapAxis does not flap back and forth for a slow monotonic drag through a magnetic point", () => {
  const steps = [0.40, 0.43, 0.46, 0.49, 0.50, 0.51, 0.54, 0.57, 0.60];
  let snapped: number | undefined;
  const results: number[] = [];
  for (const raw of steps) {
    const v = snapAxis(raw, snapped);
    snapped = snappedPoint(v);
    results.push(v);
  }
  // Once it snaps to 0.5, it must stay 0.5 for the remainder of this short
  // sweep (all within the release radius) — never bounce back to a raw value
  // and then re-snap mid-sweep.
  const firstSnapIdx = results.findIndex(v => v === 0.5);
  assert.ok(firstSnapIdx >= 0, "should snap to 0.5 at some point in the sweep");
  for (let i = firstSnapIdx; i < results.length; i++) {
    assert.equal(results[i], 0.5, `flapped at step ${i} (raw=${steps[i]})`);
  }
});

// ── Anti-overlap ─────────────────────────────────────────────────────────────

test("resolveOverlap leaves a non-overlapping rect untouched", () => {
  const rect = { x: 200, y: 20, w: 60, h: 30 };
  const obstacle = { x: 20, y: 20, w: 60, h: 60 };
  const result = resolveOverlap(rect, [obstacle], 300, 200, 20, 8);
  assert.deepEqual(result, rect);
});

test("resolveOverlap nudges a rect just enough to clear an obstacle, with the minGap respected", () => {
  const rect = { x: 40, y: 20, w: 60, h: 30 }; // overlaps the obstacle below
  const obstacle = { x: 20, y: 20, w: 60, h: 60 };
  const result = resolveOverlap(rect, [obstacle], 300, 200, 20, 8);
  const overlapX = Math.min(result.x + result.w, obstacle.x + obstacle.w) - Math.max(result.x, obstacle.x);
  const overlapY = Math.min(result.y + result.h, obstacle.y + obstacle.h) - Math.max(result.y, obstacle.y);
  assert.ok(overlapX <= 0 || overlapY <= 0, `still overlapping: ${JSON.stringify(result)}`);
});

test("resolveOverlap never pushes a rect outside the box even when nudged near an edge", () => {
  const rect = { x: 22, y: 20, w: 60, h: 30 }; // near the left edge
  const obstacle = { x: 20, y: 20, w: 60, h: 60 }; // pushing further left would exit the box
  const result = resolveOverlap(rect, [obstacle], 300, 200, 20, 8);
  assert.ok(result.x >= 20 - 1e-9, `pushed outside left edge: ${JSON.stringify(result)}`);
  assert.ok(result.x + result.w <= 280 + 1e-9, `pushed outside right edge: ${JSON.stringify(result)}`);
});

test("resolveOverlap clears overlap against multiple obstacles simultaneously", () => {
  const rect = { x: 100, y: 20, w: 40, h: 30 };
  const obstacles = [
    { x: 90, y: 15, w: 30, h: 20 },
    { x: 120, y: 25, w: 30, h: 20 },
  ];
  const result = resolveOverlap(rect, obstacles, 400, 200, 20, 4);
  for (const o of obstacles) {
    const overlapX = Math.min(result.x + result.w, o.x + o.w) - Math.max(result.x, o.x);
    const overlapY = Math.min(result.y + result.h, o.y + o.h) - Math.max(result.y, o.y);
    assert.ok(overlapX <= 0.5 || overlapY <= 0.5, `still overlapping ${JSON.stringify(o)}: result=${JSON.stringify(result)}`);
  }
});

test("resolveBlockPosition composes anchor resolution and overlap resolution", () => {
  // Anchor points the block straight at the pfp's position; it must end up
  // displaced, in-bounds, and (mostly) clear of it.
  const pfp = { x: 20, y: 20, w: 80, h: 80 };
  const result = resolveBlockPosition(0, 0, 60, 30, [pfp], 300, 200, 20, 8);
  assert.ok(result.x >= 20 && result.y >= 20);
  assert.ok(result.x + result.w <= 280 + 1e-9 && result.y + result.h <= 180 + 1e-9);
});

// ── Stage 3B.4: generalized snapAxis/snappedPoint (custom points) ────────────
// Whole-card centering (item 1) and PFP-center block alignment (item 2) both
// reuse snapAxis/snappedPoint with a different candidate list instead of a
// second hysteresis system — these tests cover that generalization, plus a
// regression check that the default {0,0.5,1} grid is byte-identical to 3B.3.

test("snapAxis with a single custom point only pulls toward that point, never toward 0/1", () => {
  assert.equal(snapAxis(0.52, undefined, [0.5]), 0.5);
  // Close to 0 but 0 is not in the candidate list — passes through unchanged.
  assert.equal(snapAxis(0.02, undefined, [0.5]), 0.02);
  assert.equal(snapAxis(0.98, undefined, [0.5]), 0.98);
});

test("snapAxis custom-points hysteresis: escape works the same as the default grid", () => {
  const snappedAt = snapAxis(0.5, undefined, [0.5]);
  assert.equal(snappedAt, 0.5);
  assert.equal(snapAxis(0.58, snappedPoint(snappedAt, [0.5]), [0.5]), 0.5); // within release radius -> stays
  assert.equal(snapAxis(0.7, snappedPoint(snappedAt, [0.5]), [0.5]), 0.7); // released -> continuous
});

test("snapAxis/snappedPoint default parameter is unchanged from the pre-3B.4 {0,0.5,1} grid", () => {
  assert.equal(snapAxis(0.02, undefined), 0);
  assert.equal(snapAxis(0.48, undefined), 0.5);
  assert.equal(snapAxis(0.97, undefined), 1);
  assert.equal(snappedPoint(0.5), 0.5);
  assert.equal(snappedPoint(0.3), undefined);
});

test("snapAxis merges the default grid with an extra alignment candidate (identity-to-pfp use case)", () => {
  const points = [0, 0.5, 1, 0.73];
  assert.equal(snapAxis(0.74, undefined, points), 0.73, "should pull toward the extra candidate, not just the grid");
  assert.equal(snapAxis(0.02, undefined, points), 0, "grid points must still work alongside the extra candidate");
});

// ── Stage 3B.4: 1-D anchor <-> pixel (whole-card centering) ──────────────────

test("axisAnchorToPixel/axisPixelToAnchor are exact inverses across the available range", () => {
  const available = 240;
  for (const a of [0, 0.25, 0.5, 0.75, 1]) {
    const px = axisAnchorToPixel(a, available);
    assert.ok(Math.abs(axisPixelToAnchor(px, available) - a) < 1e-9);
  }
});

test("axisAnchorToPixel clamps anchor into [0,1] and never returns a negative available", () => {
  assert.equal(axisAnchorToPixel(-0.5, 240), 0);
  assert.equal(axisAnchorToPixel(1.5, 240), 240);
  assert.equal(axisAnchorToPixel(0.5, -10), 0);
});

test("axisPixelToAnchor clamps out-of-range pixels and falls back to 0.5 with no room", () => {
  assert.equal(axisPixelToAnchor(-40, 240), 0);
  assert.equal(axisPixelToAnchor(400, 240), 1);
  assert.equal(axisPixelToAnchor(120, 0), 0.5);
});

test("axisAnchorToPixel(0.5, ...) is exact horizontal centering: x + w/2 == available/2 + w/2", () => {
  const canvasW = 800, cardW = 320;
  const available = canvasW - cardW;
  const x = axisAnchorToPixel(0.5, available);
  assert.equal(x, (canvasW - cardW) / 2, "anchor 0.5 must be the exact centered x");
});

// ── Stage 3B.4: centerAlignAnchor (PFP-center block alignment) ───────────────

test("centerAlignAnchor recreates a target center exactly (round-trip through anchorToRect)", () => {
  const boxW = 300, padding = 20, blockW = 60;
  const targetCenterPx = 150;
  const available = boxW - 2 * padding - blockW;
  const a = centerAlignAnchor(targetCenterPx, blockW, available, padding);
  assert.ok(a != null, "expected a reachable alignment anchor");
  const rect = anchorToRect(a!, 0, blockW, 10, boxW, 100, padding);
  assert.ok(Math.abs((rect.x + blockW / 2) - targetCenterPx) < 1e-9, `center mismatch: ${rect.x + blockW / 2} vs ${targetCenterPx}`);
});

test("centerAlignAnchor returns undefined when there's no room on the axis", () => {
  assert.equal(centerAlignAnchor(150, 60, 0, 20), undefined);
  assert.equal(centerAlignAnchor(150, 60, -5, 20), undefined);
});

test("centerAlignAnchor returns undefined when the aligned anchor would fall outside [0,1]", () => {
  // Target center far to the left of the box: aligning would need a negative anchor.
  assert.equal(centerAlignAnchor(-500, 60, 200, 20), undefined);
  // Target center far to the right: would need anchor > 1.
  assert.equal(centerAlignAnchor(5000, 60, 200, 20), undefined);
});
