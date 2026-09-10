import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldImageIgnorePointerEvents, nextIdInHitCycle, resolveImageMouseDownTarget } from "./hitStack";

// ── shouldImageIgnorePointerEvents (view/public mode ghosting) ───────────────

test("shouldImageIgnorePointerEvents: view mode, no link -> true (complete ghost)", () => {
  assert.equal(shouldImageIgnorePointerEvents(false, false), true);
});

test("shouldImageIgnorePointerEvents: view mode, with link -> false (interactive as a link)", () => {
  assert.equal(shouldImageIgnorePointerEvents(false, true), false);
});

test("shouldImageIgnorePointerEvents: editor mode is always interactive, with or without a link", () => {
  assert.equal(shouldImageIgnorePointerEvents(true, false), false);
  assert.equal(shouldImageIgnorePointerEvents(true, true), false);
});

// ── nextIdInHitCycle (topmost -> next -> next -> wraps around) ──────────────

test("nextIdInHitCycle cycles through a stack of images and a ProfileCard, wrapping around", () => {
  const hits = [{ id: "imageA" }, { id: "imageB" }, { id: "profile" }, { id: "social" }];
  assert.equal(nextIdInHitCycle(hits, "imageA"), "imageB");
  assert.equal(nextIdInHitCycle(hits, "imageB"), "profile");
  assert.equal(nextIdInHitCycle(hits, "profile"), "social");
  assert.equal(nextIdInHitCycle(hits, "social"), "imageA", "must wrap back to the first element");
});

test("nextIdInHitCycle returns undefined when the id isn't in the stack or the stack has fewer than 2 elements", () => {
  assert.equal(nextIdInHitCycle([{ id: "imageA" }], "imageA"), undefined, "nothing else to cycle to");
  assert.equal(nextIdInHitCycle([{ id: "imageA" }, { id: "profile" }], "not-here"), undefined);
  assert.equal(nextIdInHitCycle([], "imageA"), undefined);
});

// ── resolveImageMouseDownTarget (Mechanism B priority) ──────────────────────

test("resolveImageMouseDownTarget: a linked image always wins, even over a hot control", () => {
  assert.equal(resolveImageMouseDownTarget(true, false, true), "image");
  assert.equal(resolveImageMouseDownTarget(true, true, true), "image");
});

test("resolveImageMouseDownTarget: an already-selected image always wins, even over a hot control", () => {
  assert.equal(resolveImageMouseDownTarget(false, true, true), "image");
});

test("resolveImageMouseDownTarget: unselected, unlinked image over a hot control -> the control wins", () => {
  assert.equal(resolveImageMouseDownTarget(false, false, true), "hot-control");
});

test("resolveImageMouseDownTarget: unselected, unlinked image with no hot control underneath -> the image wins (normal topmost/cycling)", () => {
  assert.equal(resolveImageMouseDownTarget(false, false, false), "image");
});
