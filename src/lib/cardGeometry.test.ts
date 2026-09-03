import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CARD_FORMATS,
  getCardConstraints,
  getCardAspectRatio,
  clampCardSize,
  resolveCardSize,
  sizeScaleFromDimensions,
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
