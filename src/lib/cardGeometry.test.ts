import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CARD_FORMATS,
  getCardConstraints,
  getCardAspectRatio,
  clampCardSize,
  resolveCardSize,
  sizeScaleFromDimensions,
  getPfpSizeBounds,
  resolvePfpSize,
  pfpRadiusToPercent,
  PFP_SIZE_MIN,
  PFP_SIZE_MAX,
} from "./cardGeometry";
import type { CardFormat } from "@/types";

const FORMATS: CardFormat[] = ["vertical", "horizontal", "square", "phone", "card"];

test("getCardConstraints falls back to vertical for undefined format", () => {
  assert.deepEqual(getCardConstraints(undefined), CARD_FORMATS.vertical);
});

test("getCardAspectRatio clamps into range for range-kind formats", () => {
  const c = CARD_FORMATS.vertical;
  assert.ok(c.ratioKind === "range");
  // way outside range on both sides
  assert.equal(getCardAspectRatio("vertical", 1000, 10), c.ratioRange![1]);
  assert.equal(getCardAspectRatio("vertical", 10, 1000), c.ratioRange![0]);
  // inside range passes through unchanged
  const mid = (c.ratioRange![0] + c.ratioRange![1]) / 2;
  const h = 300;
  assert.ok(Math.abs(getCardAspectRatio("vertical", mid * h, h) - mid) < 1e-9);
});

test("getCardAspectRatio returns the fixed ratio regardless of w/h for fixed-kind formats", () => {
  assert.equal(getCardAspectRatio("square", 999, 1), CARD_FORMATS.square.ratio);
  assert.equal(getCardAspectRatio("phone", 1, 999), CARD_FORMATS.phone.ratio);
});

test("clampCardSize respects min/max bounds for every format", () => {
  for (const f of FORMATS) {
    const c = getCardConstraints(f);
    const tiny = clampCardSize(f, 1, 1);
    assert.ok(tiny.w >= c.minW && tiny.w <= c.maxW, `${f} tiny.w out of bounds: ${tiny.w}`);
    assert.ok(tiny.h >= c.minH && tiny.h <= c.maxH, `${f} tiny.h out of bounds: ${tiny.h}`);
    const huge = clampCardSize(f, 100_000, 100_000);
    assert.ok(huge.w >= c.minW && huge.w <= c.maxW, `${f} huge.w out of bounds: ${huge.w}`);
    assert.ok(huge.h >= c.minH && huge.h <= c.maxH, `${f} huge.h out of bounds: ${huge.h}`);
  }
});

test("clampCardSize converges to the exact ratio for fixed-kind formats", () => {
  for (const f of ["square", "phone"] as CardFormat[]) {
    const c = getCardConstraints(f);
    const { w, h } = clampCardSize(f, 250, 90); // deliberately off-ratio input
    assert.ok(Math.abs(w / h - c.ratio!) < 0.02, `${f}: ${w}/${h} = ${w / h}, expected ~${c.ratio}`);
  }
});

test("clampCardSize preserves an already-valid width/ratio for range-kind formats", () => {
  const c = CARD_FORMATS.horizontal;
  const w = 300, h = Math.round(w / ((c.ratioRange![0] + c.ratioRange![1]) / 2));
  const { w: nw, h: nh } = clampCardSize("horizontal", w, h);
  assert.equal(nw, w);
  assert.equal(nh, h);
});

test("resolveCardSize: sizeScale 0 and 1 hit the format's width bounds", () => {
  for (const f of FORMATS) {
    const c = getCardConstraints(f);
    assert.equal(resolveCardSize(f, 0).w, c.minW);
    assert.equal(resolveCardSize(f, 1).w, c.maxW);
  }
});

test("sizeScaleFromDimensions is the approximate inverse of resolveCardSize's width mapping", () => {
  for (const f of FORMATS) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const { w } = resolveCardSize(f, t);
      const back = sizeScaleFromDimensions(f, w);
      assert.ok(Math.abs(back - t) < 0.02, `${f} t=${t}: round-trip gave ${back}`);
    }
  }
});

// ── PFP size (Stage 3B.2-B) ──────────────────────────────────────────────────

test("getPfpSizeBounds never exceeds the card's shorter axis minus padding on both sides", () => {
  for (const [boxW, boxH, padding] of [[400, 300, 20], [140, 249, 14], [80, 80, 20]] as [number, number, number][]) {
    const { min, max } = getPfpSizeBounds(boxW, boxH, padding);
    assert.ok(max <= Math.min(boxW, boxH) - 2 * padding + 0.001, `max=${max} exceeds the box`);
    assert.ok(min <= max, `min=${min} > max=${max}`);
  }
});

test("resolvePfpSize clamps a custom override into the card's bounds", () => {
  // Tiny card: even a huge requested override must clamp down to what fits.
  const clamped = resolvePfpSize("md", 500, 100, 100, 20);
  const { max } = getPfpSizeBounds(100, 100, 20);
  assert.equal(clamped, max);
  assert.ok(clamped <= PFP_SIZE_MAX && clamped >= PFP_SIZE_MIN);
});

test("resolvePfpSize falls back to the legacy sm/md/lg preset when no override is set", () => {
  assert.equal(resolvePfpSize("sm", undefined, 400, 400, 20), 52);
  assert.equal(resolvePfpSize("md", undefined, 400, 400, 20), 80);
  assert.equal(resolvePfpSize("lg", undefined, 400, 400, 20), 112);
  assert.equal(resolvePfpSize(undefined, undefined, 400, 400, 20), 80, "undefined photoSize defaults to md");
});

// ── PFP radius (Stage 3B.2-B) ─────────────────────────────────────────────────

test("pfpRadiusToPercent: 0 is square, 100 is a full circle, undefined defaults to circle", () => {
  assert.equal(pfpRadiusToPercent(0), 0);
  assert.equal(pfpRadiusToPercent(100), 50);
  assert.equal(pfpRadiusToPercent(undefined), 50);
  assert.equal(pfpRadiusToPercent(50), 25);
});

test("pfpRadiusToPercent clamps out-of-range input", () => {
  assert.equal(pfpRadiusToPercent(-20), 0);
  assert.equal(pfpRadiusToPercent(150), 50);
});
