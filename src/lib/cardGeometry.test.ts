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
  centerCardPosition,
  MIN_PROFILE_CARD_WIDTH,
  MIN_PROFILE_CARD_HEIGHT,
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

// ── Freeform width/height (Stage 4.2-C.2.4 — explicit product minimums) ──────
// MIN_PROFILE_CARD_WIDTH/HEIGHT replaced two prior attempts at deriving the
// floor from CARD_FORMATS (first Math.min across all 5, landing on
// horizontal's 120 and breaking composition; then Math.max across
// ratioKind:"range" formats, landing on vertical's 190) — both were still
// an indirect, format-shaped number, not a real product decision. These
// tests assert the explicit constants directly, not a derivation.

test("MIN_PROFILE_CARD_WIDTH is exactly 240, MIN_PROFILE_CARD_HEIGHT is exactly 220", () => {
  assert.equal(MIN_PROFILE_CARD_WIDTH, 240);
  assert.equal(MIN_PROFILE_CARD_HEIGHT, 220);
});

test("getFreeformCardBounds: minW/minH are the explicit constants, never derived from CARD_FORMATS", () => {
  const b = getFreeformCardBounds();
  assert.equal(b.minW, MIN_PROFILE_CARD_WIDTH);
  assert.equal(b.minH, MIN_PROFILE_CARD_HEIGHT);
});

test("getFreeformCardBounds: maxW/maxH still derive from CARD_FORMATS (unchanged — only the floor became explicit)", () => {
  const b = getFreeformCardBounds();
  const all = FORMATS.map(f => getCardConstraints(f));
  assert.equal(b.maxW, Math.max(...all.map(c => c.maxW)));
  assert.equal(b.maxH, Math.max(...all.map(c => c.maxH)));
});

test("regression: a 140x120 card (the historical unsafe minimum) is never a valid clamped state", () => {
  const r = clampFreeformCardSize(140, 120);
  assert.notEqual(r.w, 140);
  assert.notEqual(r.h, 120);
  assert.equal(r.w, MIN_PROFILE_CARD_WIDTH);
  assert.equal(r.h, MIN_PROFILE_CARD_HEIGHT);
});

test("regression: clamped width/height can never land on any historical format-derived floor (120 or 140)", () => {
  for (const w of [1, 50, 100, 139, 140, 141]) {
    assert.notEqual(clampFreeformCardSize(w, 300).w, 120);
    assert.notEqual(clampFreeformCardSize(w, 300).w, 140);
  }
  for (const h of [1, 50, 100, 119, 120, 121]) {
    assert.notEqual(clampFreeformCardSize(600, h).h, 120);
  }
});

test("continuous resize: shrinking height from 360 toward the floor passes through every intermediate value with no jump, landing exactly on 220", () => {
  const heights = [360, 350, 340, 330, 320, 310, 300, 290, 280, 270, 260, 250, 240, 230, 220, 210, 200];
  const results = heights.map(h => clampFreeformCardSize(600, h).h);
  for (let i = 0; i < heights.length; i++) {
    assert.equal(results[i], Math.max(MIN_PROFILE_CARD_HEIGHT, heights[i]), `at input height ${heights[i]}`);
  }
  assert.equal(results[results.length - 1], MIN_PROFILE_CARD_HEIGHT, "the lowest input (200, below the floor) must clamp exactly to 220, not below");
});

test("continuous resize: shrinking width toward the floor passes through every intermediate value with no jump, landing exactly on 240", () => {
  const widths = [600, 500, 400, 300, 260, 250, 240, 230, 200];
  for (const w of widths) {
    assert.equal(clampFreeformCardSize(w, 300).w, Math.max(MIN_PROFILE_CARD_WIDTH, w), `at input width ${w}`);
  }
});

test("no ratio lock: width and height clamp fully independently of each other", () => {
  // A height-only shrink never touches width, and vice versa — even at the
  // extreme where both land exactly on their own floor simultaneously.
  assert.equal(clampFreeformCardSize(600, 50).w, 600);
  assert.equal(clampFreeformCardSize(50, 600).h, 600);
  const both = clampFreeformCardSize(1, 1);
  assert.equal(both.w, MIN_PROFILE_CARD_WIDTH);
  assert.equal(both.h, MIN_PROFILE_CARD_HEIGHT);
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

// ── Centering (Stage 4.2-C.2.4) ───────────────────────────────────────────────
// centerCardPosition is the ONE formula both the resize-drag (useDragDrop.ts)
// and content-driven growth (ProfileCard.tsx's growth effect) use — these
// tests are what guarantee "single source of truth" actually holds.

test("centerCardPosition: centers a box within the canvas on both axes", () => {
  const { x, y } = centerCardPosition(1200, 800, 600, 360, 44);
  assert.equal(x, (1200 - 600) / 2);
  assert.equal(y, (800 - 360) / 2);
});

test("centerCardPosition: horizontal-only resize keeps the same vertical center", () => {
  const before = centerCardPosition(1200, 800, 600, 320, 44);
  const after  = centerCardPosition(1200, 800, 500, 320, 44);
  assert.equal(after.y, before.y);
  assert.notEqual(after.x, before.x);
});

test("centerCardPosition: vertical-only resize keeps the same horizontal center", () => {
  const before = centerCardPosition(1200, 800, 600, 360, 44);
  const after  = centerCardPosition(1200, 800, 600, 320, 44);
  assert.equal(after.x, before.x);
  assert.notEqual(after.y, before.y);
});

test("centerCardPosition: diagonal resize recenters both axes to the true canvas center", () => {
  const { x, y } = centerCardPosition(1200, 800, 400, 260, 44);
  assert.equal(x, (1200 - 400) / 2);
  assert.equal(y, Math.max(44, (800 - 260) / 2));
});

test("centerCardPosition: never renders above topOffset even if the arithmetic center would be higher", () => {
  const { y } = centerCardPosition(800, 200, 400, 220, 44);
  // (200-220)/2 is negative — must clamp to topOffset instead.
  assert.equal(y, 44);
});

test("centerCardPosition: content-driven growth (width unchanged, height increases) keeps the same horizontal center", () => {
  const before = centerCardPosition(1200, 800, 600, 300, 44);
  const afterGrowth = centerCardPosition(1200, 800, 600, 420, 44);
  assert.equal(afterGrowth.x, before.x, "growth never changes width, so x must stay identical");
});

test("centerCardPosition: deterministic", () => {
  assert.deepEqual(centerCardPosition(1200, 800, 600, 360, 44), centerCardPosition(1200, 800, 600, 360, 44));
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
