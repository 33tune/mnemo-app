import test from "node:test";
import assert from "node:assert/strict";
import { imageSlots, withinImageLimit, MAX_CANVAS_IMAGES } from "./canvasLimits";

test("up to 10 images: new ones only fill the free slots", () => {
  assert.equal(MAX_CANVAS_IMAGES, 10);
  assert.equal(imageSlots(0, 3), 3);
  assert.equal(imageSlots(8, 5), 2);
  assert.equal(imageSlots(10, 1), 0);
  assert.equal(imageSlots(12, 1), 0, "a room already over the limit keeps them but adds none");
});

test("pasting keeps texts and the images that fit", () => {
  const items = [{ elementType: "image", id: "a" }, { elementType: "text", id: "t" }, { elementType: "image", id: "b" }];
  const r = withinImageLimit(items, 9);
  assert.deepEqual(r.kept.map(i => i.id), ["a", "t"]);
  assert.equal(r.dropped, 1);
});
