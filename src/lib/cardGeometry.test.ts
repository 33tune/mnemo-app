import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CARD_FORMATS,
  getCardConstraints,
  getCardAspectRatio,
  clampCardSize,
  resolveCardSize,
  sizeScaleFromDimensions,
  getFreeformCardBounds,
  clampFreeformCardSize,
  getPfpSizeBounds,
  resolvePfpSize,
  pfpRadiusToPercent,
  computeRequiredCardHeight,
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

// ── Freeform width/height (Stage 4.2-C.2.2, minH fix in 4.2-C.2.3) ───────────

test("getFreeformCardBounds: minW/maxW/maxH still cover every format's own bounds", () => {
  const b = getFreeformCardBounds();
  for (const f of FORMATS) {
    const c = getCardConstraints(f);
    assert.ok(b.minW <= c.minW, `${f}: freeform minW ${b.minW} should be <= its own minW ${c.minW}`);
    assert.ok(b.maxW >= c.maxW, `${f}: freeform maxW ${b.maxW} should be >= its own maxW ${c.maxW}`);
    assert.ok(b.maxH >= c.maxH, `${f}: freeform maxH ${b.maxH} should be >= its own maxH ${c.maxH}`);
  }
});

test("getFreeformCardBounds: minH is the tallest minH among ratioKind:\"range\" formats (vertical/horizontal/card), derived from CARD_FORMATS — not hardcoded", () => {
  const b = getFreeformCardBounds();
  const rangeMinHs = FORMATS
    .map(f => getCardConstraints(f))
    .filter(c => c.ratioKind === "range")
    .map(c => c.minH);
  assert.equal(b.minH, Math.max(...rangeMinHs));
  // Sanity: this excludes the two ratioKind:"fixed" formats (square, phone)
  // entirely — their minH is a byproduct of a locked ratio, not a content
  // floor (see getFreeformCardBounds' doc comment).
  assert.notEqual(b.minH, getCardConstraints("square").minH);
  assert.notEqual(b.minH, getCardConstraints("phone").minH);
});

test("regression: minH is no longer horizontal's unsafe 120px floor (the reported resize-jump bug)", () => {
  const b = getFreeformCardBounds();
  assert.ok(b.minH > 120, `minH ${b.minH} must be safely above the old unsafe floor of 120`);
});

test("regression: shrinking a ~600x380 card's height toward its extreme never collapses near 600x120", () => {
  // Simulates dragging the height-only ("s") handle all the way down —
  // width must stay completely untouched (independent axes), and the
  // clamped height must land on the new safe floor, not the old one.
  const { w, h } = clampFreeformCardSize(600, 50);
  assert.equal(w, 600, "width must be untouched by a height-only resize");
  assert.equal(h, getFreeformCardBounds().minH);
  assert.ok(h > 120, `clamped height ${h} must not collapse to the old unsafe 120px floor`);
});

test("clampFreeformCardSize: clamps into the unified envelope, independently per axis (no ratio lock)", () => {
  const b = getFreeformCardBounds();
  const tiny = clampFreeformCardSize(1, 1);
  assert.equal(tiny.w, b.minW);
  assert.equal(tiny.h, b.minH);
  const huge = clampFreeformCardSize(100_000, 100_000);
  assert.equal(huge.w, b.maxW);
  assert.equal(huge.h, b.maxH);
});

test("clampFreeformCardSize: a value already inside bounds passes through unchanged (each axis independent)", () => {
  const b = getFreeformCardBounds();
  // Deliberately off-ratio for every existing format — must NOT be reprojected
  // into any ratio, unlike clampCardSize.
  const w = b.minW + 5, h = b.maxH - 5;
  const { w: nw, h: nh } = clampFreeformCardSize(w, h);
  assert.equal(nw, w);
  assert.equal(nh, h);
});

test("getFreeformCardBounds/clampFreeformCardSize: deterministic — same input always yields the same output", () => {
  assert.deepEqual(getFreeformCardBounds(), getFreeformCardBounds());
  assert.deepEqual(clampFreeformCardSize(600, 320), clampFreeformCardSize(600, 320));
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

// ── Vertical growth (Stage 4.2-A, generalized to extraBlocks[] in 4.2-C.1) ────

test("computeRequiredCardHeight: no extraBlocks -> currentH unchanged, for every format (regression)", () => {
  for (const f of FORMATS) {
    const currentH = getCardConstraints(f).minH + 10;
    const h = computeRequiredCardHeight({ format: f, currentH, contentBottom: currentH - 5, padding: 20 });
    assert.equal(h, currentH);
  }
});

test("computeRequiredCardHeight: an empty extraBlocks array behaves exactly like an absent one", () => {
  const currentH = 250;
  const h = computeRequiredCardHeight({ format: "vertical", currentH, contentBottom: 100, padding: 20, extraBlocks: [] });
  assert.equal(h, currentH);
});

// Single-block cases: stand-ins for "Contact Links only" and "Music only" —
// a single-entry extraBlocks array is the exact shape contactLinksBlock.ts's
// requiredCardHeightForContactLinks (and ProfileCard.tsx's growth effect,
// Music-only case) build.

test("computeRequiredCardHeight: grows when a single extra block (e.g. Contact Links alone) needs more room than currentH allows", () => {
  const c = getCardConstraints("vertical");
  const currentH = c.minH + 5;
  const h = computeRequiredCardHeight({
    format: "vertical", currentH, contentBottom: currentH - 20, padding: 20,
    extraBlocks: [{ naturalHeight: 100, gap: 10 }],
  });
  assert.ok(h > currentH, `expected growth: ${h} should exceed currentH ${currentH}`);
  const required = (currentH - 20) + 10 + 100 + 20;
  assert.equal(h, Math.min(c.maxH, required));
});

test("computeRequiredCardHeight: grows when a single extra block (e.g. Music alone) needs more room than currentH allows", () => {
  const c = getCardConstraints("vertical");
  const currentH = c.minH + 5;
  const h = computeRequiredCardHeight({
    format: "vertical", currentH, contentBottom: currentH - 20, padding: 20,
    extraBlocks: [{ naturalHeight: 56, gap: 10 }], // Music's placeholder height (musicBlockSizing.ts)
  });
  assert.ok(h > currentH, `expected growth: ${h} should exceed currentH ${currentH}`);
  const required = (currentH - 20) + 10 + 56 + 20;
  assert.equal(h, Math.min(c.maxH, required));
});

// Stacking: Contact Links + Music together must SUM (not max) — this is the
// whole reason extraBlock became extraBlocks[]. See cardGeometry.ts's doc
// comment for why two separate calls (one per block) would under-report.

test("computeRequiredCardHeight: Contact Links + Music stack additively, not as a max", () => {
  const c = getCardConstraints("vertical");
  const currentH = c.minH;
  const contentBottom = currentH - 40;
  const linksBlock = { naturalHeight: 24, gap: 10 };
  const musicBlock = { naturalHeight: 56, gap: 10 };

  const linksOnly = computeRequiredCardHeight({ format: "vertical", currentH, contentBottom, padding: 20, extraBlocks: [linksBlock] });
  const musicOnly = computeRequiredCardHeight({ format: "vertical", currentH, contentBottom, padding: 20, extraBlocks: [musicBlock] });
  const both = computeRequiredCardHeight({ format: "vertical", currentH, contentBottom, padding: 20, extraBlocks: [linksBlock, musicBlock] });

  assert.ok(both > linksOnly, "stacked height should exceed links-only height");
  assert.ok(both > musicOnly, "stacked height should exceed music-only height");
  const requiredStacked = contentBottom + linksBlock.gap + linksBlock.naturalHeight + musicBlock.gap + musicBlock.naturalHeight + 20;
  assert.equal(both, Math.min(c.maxH, requiredStacked), "stacked result should equal the SUM of both blocks' room, clamped");
});

test("computeRequiredCardHeight: order of extraBlocks doesn't change the total (commutative sum)", () => {
  const linksBlock = { naturalHeight: 24, gap: 10 };
  const musicBlock = { naturalHeight: 56, gap: 10 };
  const a = computeRequiredCardHeight({ format: "vertical", currentH: 100, contentBottom: 80, padding: 20, extraBlocks: [linksBlock, musicBlock] });
  const b = computeRequiredCardHeight({ format: "vertical", currentH: 100, contentBottom: 80, padding: 20, extraBlocks: [musicBlock, linksBlock] });
  assert.equal(a, b);
});

test("computeRequiredCardHeight: never shrinks below currentH even if the extra blocks need less room", () => {
  const currentH = 400;
  const h = computeRequiredCardHeight({
    format: "vertical", currentH, contentBottom: 50, padding: 20,
    extraBlocks: [{ naturalHeight: 10, gap: 4 }],
  });
  assert.equal(h, currentH);
});

test("computeRequiredCardHeight: never exceeds the format's maxH, even with Contact Links + Music both present", () => {
  for (const f of FORMATS) {
    const c = getCardConstraints(f);
    const h = computeRequiredCardHeight({
      format: f, currentH: c.minH, contentBottom: c.minH, padding: 20,
      extraBlocks: [{ naturalHeight: 10_000, gap: 10 }, { naturalHeight: 10_000, gap: 10 }],
    });
    assert.ok(h <= c.maxH, `${f}: ${h} exceeds maxH ${c.maxH}`);
  }
});

test("computeRequiredCardHeight: never goes below the format's minH", () => {
  for (const f of FORMATS) {
    const c = getCardConstraints(f);
    const h = computeRequiredCardHeight({
      format: f, currentH: c.minH, contentBottom: 0, padding: 0,
      extraBlocks: [{ naturalHeight: 1, gap: 0 }],
    });
    assert.ok(h >= c.minH, `${f}: ${h} below minH ${c.minH}`);
  }
});

test("computeRequiredCardHeight: growth is a pure function of its inputs (same inputs -> same output)", () => {
  const inputA = { format: "card" as const, currentH: 200, contentBottom: 150, padding: 20, extraBlocks: [{ naturalHeight: 60, gap: 10 }] };
  const inputB = { ...inputA };
  assert.equal(computeRequiredCardHeight(inputA), computeRequiredCardHeight(inputB));
});

test("computeRequiredCardHeight: only ever returns a height number — the growth contract never touches x/y", () => {
  const h = computeRequiredCardHeight({
    format: "vertical", currentH: 200, contentBottom: 150, padding: 20,
    extraBlocks: [{ naturalHeight: 24, gap: 10 }, { naturalHeight: 56, gap: 10 }],
  });
  assert.equal(typeof h, "number");
});
