// The ProfileCard's content floor (engine rewrite, user decision 2026-10-15):
// the card cannot be resized smaller than what it holds; more content needs
// a bigger card.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProfileCardData } from "@/types";
import { clampProfileCardSize, profileCardMinSize, profileLayout, formatViewCount } from "./profileCardLayout";
import { getFreeformCardBounds } from "./cardGeometry";

const BASE = {
  id: "p", x: 0, y: 0, w: 320, h: 400, zIndex: 0, layer: 1, rotation: 0,
  name: "Mara Ibáñez", handle: "mara", status: "diseñadora · dj", location: "La Plata", bio: "Hago fanzines y mezclo vinilos.",
  showViews: true, pfpAnchorX: 0.5, pfpAnchorY: 0, textAlign: "center",
} as unknown as ProfileCardData;

test("the resize stops at the content: never shorter than what the card holds", () => {
  const min = profileCardMinSize(BASE, 320);
  const c = clampProfileCardSize(BASE, 320, 100);
  assert.equal(c.h, min.h);
  assert.ok(profileLayout({ ...BASE, h: c.h }).fits, "everything fits at the floor");
  assert.equal(clampProfileCardSize(BASE, 320, min.h + 50).h, min.h + 50, "above the floor: free");
});

test("more content raises the floor; less content lowers it", () => {
  const plain = profileCardMinSize(BASE, 320).h;
  const withButtons = profileCardMinSize({ ...BASE, linkButtons: [{ id: "a", label: "Uno", url: "a.com" }, { id: "b", label: "Dos", url: "b.com" }] }, 320).h;
  const withLinks = profileCardMinSize({ ...BASE, contactLinks: [{ id: "l", url: "instagram.com/x" }] }, 320).h;
  assert.ok(withButtons > plain + 60);
  assert.ok(withLinks > plain);
  const short = profileCardMinSize({ ...BASE, bio: undefined, location: undefined, status: undefined, showViews: false }, 320).h;
  assert.ok(short < plain);
});

test("the floor never goes below the product minimum or above the maximum", () => {
  const b = getFreeformCardBounds();
  const tiny = profileCardMinSize({ ...BASE, bio: undefined, location: undefined, status: undefined, showViews: false, handle: undefined }, 320);
  assert.equal(tiny.h, b.minH);
  assert.ok(tiny.w >= b.minW);
  const huge = profileCardMinSize({ ...BASE, bio: "x ".repeat(3000) }, 320);
  assert.equal(huge.h, b.maxH);
});

test("the width floor: a long name sets it; a card already narrower is not pushed wider", () => {
  const long = { ...BASE, name: "Una persona con un nombre larguísimo de verdad" };
  const min = profileCardMinSize(long, 900);
  assert.ok(min.w > 320);
  assert.equal(clampProfileCardSize(long, 200, 900).w, min.w);
  assert.equal(clampProfileCardSize(long, 200, 900, { startW: 320 }).w, 320, "started narrower: keeps its width");
});

test("measured text drives the floor (real fonts)", () => {
  const measure = { width: (t: string) => t.length * 20, lines: () => 6 };
  const est = profileCardMinSize(BASE, 320);
  const real = profileCardMinSize(BASE, 320, { measure });
  assert.ok(real.h > est.h, "6 bio lines need more height");
  assert.ok(real.w > est.w, "wider glyphs need more width");
});

test("views counter format", () => {
  assert.equal(formatViewCount(12), "12");
  assert.equal(formatViewCount(12_345), "12.3K");
  assert.equal(formatViewCount(2_500_000), "2.5M");
});
