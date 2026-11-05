import { test } from "node:test";
import assert from "node:assert/strict";
import { storyView, STORY_VIEW_W, STORY_VIEW_H, STORY_DPR, STORY_W, STORY_H } from "./storyRender";
import { mobileView, MOBILE_GUTTER } from "@/lib/mobileFit";

test("the story is the phone view: same scale and place as mobileView", () => {
  for (const card of [{ x: 1000, y: 500, w: 320, h: 440 }, { x: 80, y: 60, w: 600, h: 900 }, { x: 0, y: 0, w: 240, h: 220 }]) {
    const v = storyView(card), m = mobileView(STORY_VIEW_W, STORY_VIEW_H, card);
    assert.equal(v.s, m.s);
    // The region is what the phone screen shows, at full story resolution.
    assert.ok(Math.abs(v.region.w * v.ratio - STORY_W) < 1e-6 && Math.abs(v.region.h * v.ratio - STORY_H) < 1e-6);
    // The card lands where the phone draws it, inside the gutter.
    const left = (card.x - v.region.x) * v.s;
    assert.ok(left >= MOBILE_GUTTER - 1e-6 && left + card.w * v.s <= STORY_VIEW_W - MOBILE_GUTTER + 1e-6);
  }
  assert.ok(Math.abs(STORY_VIEW_W / STORY_VIEW_H - 9 / 16) < 1e-9);
  assert.ok(Math.abs(STORY_DPR * STORY_VIEW_W - STORY_W) < 1e-9);
});

import { splitShadowList, parseShadow } from "./cardSnapshot";
test("box-shadow parsing: outer vs inset, color with commas", () => {
  const parts = splitShadowList("rgba(255, 255, 255, 0.5) 0px 0px 24px 0px, rgb(0, 0, 0) 2px 4px 10px 3px inset");
  assert.equal(parts.length, 2);
  assert.deepEqual(parseShadow(parts[0]), { color: "rgba(255, 255, 255, 0.5)", x: 0, y: 0, blur: 24, spread: 0, inset: false });
  assert.deepEqual(parseShadow(parts[1]), { color: "rgb(0, 0, 0)", x: 2, y: 4, blur: 10, spread: 3, inset: true });
});

import { frameAt } from "./stillMedia";
test("animated pictures: the frame for the video's time, looping", () => {
  const f = { ends: [100, 200, 350], total: 350 };
  assert.equal(frameAt(f, 0), 0);
  assert.equal(frameAt(f, 0.099), 0);
  assert.equal(frameAt(f, 0.1), 1);
  assert.equal(frameAt(f, 0.3), 2);
  assert.equal(frameAt(f, 0.36), 0, "loops");
  assert.equal(frameAt({ ends: [1], total: 1 }, 3), 0);
});

import { withoutParallax } from "./cardSnapshot";
test("capture: the mouse parallax goes, the rotation stays", () => {
  assert.equal(withoutParallax("translate(12.4px, -10.9px) rotate(3deg)"), "rotate(3deg)");
  assert.equal(withoutParallax("translate(0px, 0px) rotate(0deg)"), "rotate(0deg)");
  assert.equal(withoutParallax("rotate(5deg)"), "rotate(5deg)");
});
