import { test } from "node:test";
import assert from "node:assert/strict";
import { storyFrameParams, storyCardScale, STORY_CARD_BOX, STORY_SECONDS, STILL_T, STORY_FRAMES, STORY_FPS } from "./storyRender";

test("the card comes in, then turns gently; frames are deterministic", () => {
  const a = storyFrameParams(0), b = storyFrameParams(0.8), c = storyFrameParams(3);
  assert.equal(a.intro, 0);
  assert.equal(b.intro, 1);
  assert.equal(a.rotY, 0, "no turn while entering");
  assert.ok(Math.abs(c.rotY) <= 11 && Math.abs(c.rotX) <= 4);
  assert.deepEqual(storyFrameParams(2.3), storyFrameParams(2.3));
  for (let i = 0; i <= 60; i++) {
    const f = storyFrameParams(i / 10);
    assert.ok(f.lx >= 0 && f.lx <= 1 && f.ly >= 0 && f.ly <= 1, `light inside the card at ${i / 10}s`);
  }
});

test("one light sweep, after the entrance", () => {
  assert.equal(storyFrameParams(0.5).sweep, -1);
  assert.ok(storyFrameParams(1.4).sweep > 0);
  assert.equal(storyFrameParams(3).sweep, -1);
});

test("the card fits the story box; the still is inside the video", () => {
  for (const [w, h] of [[240, 220], [400, 600], [640, 900], [300, 1200]]) {
    const s = storyCardScale(w, h);
    assert.ok(w * s <= STORY_CARD_BOX.w + 1e-6 && h * s <= STORY_CARD_BOX.h + 1e-6);
  }
  assert.ok(STILL_T > 0 && STILL_T < STORY_SECONDS);
  assert.equal(STORY_FRAMES, STORY_FPS * STORY_SECONDS);
});
