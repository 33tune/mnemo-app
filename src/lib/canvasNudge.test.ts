import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveNudgeKey, nudgeMove, nudgeResize, cycleSelection, NUDGE_STEP_BIG } from "./canvasNudge";
import { clampFreeformCardSize, centerCardPosition, getFreeformCardBounds } from "./cardGeometry";
import { computeResize } from "./resizeMath";

const B = { w: 1000, h: 800, topOffset: 44 };

test("resolveNudgeKey: arrows move 1px, Shift x10", () => {
  assert.deepEqual(resolveNudgeKey({ key: "ArrowLeft" }, false), { kind: "move", dx: -1, dy: 0 });
  assert.deepEqual(resolveNudgeKey({ key: "ArrowDown", shiftKey: true }, false), { kind: "move", dx: 0, dy: NUDGE_STEP_BIG });
  assert.equal(resolveNudgeKey({ key: "a" }, false), null);
});

test("resolveNudgeKey: Ctrl+arrows resize on Windows/Linux, ⌘+arrows on Mac; Alt never; wrong modifier ignored", () => {
  assert.deepEqual(resolveNudgeKey({ key: "ArrowRight", ctrlKey: true }, false), { kind: "resize", dx: 1, dy: 0 });
  assert.deepEqual(resolveNudgeKey({ key: "ArrowUp", metaKey: true, shiftKey: true }, true), { kind: "resize", dx: 0, dy: -10 });
  assert.equal(resolveNudgeKey({ key: "ArrowLeft", altKey: true }, false), null, "Alt+Left is browser Back on Windows");
  assert.equal(resolveNudgeKey({ key: "ArrowLeft", ctrlKey: true }, true), null, "Ctrl+arrows switch Spaces on Mac");
  assert.equal(resolveNudgeKey({ key: "ArrowLeft", metaKey: true }, false), null);
});

const music = { id: "m", elementType: "music", x: 100, y: 100, w: 220, h: 64 };
const prof  = { id: "p", elementType: "profile", x: 300, y: 200, w: 400, h: 400 };

test("nudgeMove: same writer as the drag (applyGroupDragDelta) — moves, clamps to bounds, never the ProfileCard", () => {
  const out = nudgeMove([music, prof], new Set(["m", "p"]), 5, -3, B);
  assert.deepEqual([out[0].x, out[0].y], [105, 97]);
  assert.deepEqual([out[1].x, out[1].y], [300, 200], "profile untouched");
  const clamped = nudgeMove([music], new Set(["m"]), -500, -500, B);
  assert.deepEqual([clamped[0].x, clamped[0].y], [0, 44], "clamped to x>=0, y>=topOffset");
});

test("nudgeMove: locked or profile-only selections return the input unchanged", () => {
  const els = [{ ...music, locked: true }, prof];
  assert.equal(nudgeMove(els, new Set(["m"]), 1, 0, B), els);
  assert.equal(nudgeMove(els, new Set(["p"]), 1, 0, B), els);
});

test("nudgeResize: ProfileCard = clampFreeformCardSize + centerCardPosition (exactly the resize drag's writers)", () => {
  const r = nudgeResize(prof, 10, 0, B);
  const c = clampFreeformCardSize(410, 400);
  assert.deepEqual(r, { kind: "box", ...centerCardPosition(B.w, B.h, c.w, c.h, B.topOffset), w: c.w, h: c.h });
  const tiny = nudgeResize({ ...prof, w: 240, h: 220 }, -10, 0, B);
  assert.equal(tiny && tiny.kind === "box" && tiny.w, getFreeformCardBounds().minW, "never below the freeform minimum");
});

test("nudgeResize: modules use computeResize + the drag's per-type minimums", () => {
  const r = nudgeResize(music, 10, 0, B);
  const e = computeResize("e", 10, 0, 220, 64, 100, 100, 0, false, 48, 20);
  assert.deepEqual(r, { kind: "box", x: e.nx, y: e.ny, w: e.nw, h: e.nh });
  const min = nudgeResize({ ...music, h: 21 }, 0, -10, B);
  assert.equal(min && min.kind === "box" && min.h, 20);
});

test("nudgeResize: images keep their aspect ratio (like a side handle)", () => {
  const img = { id: "i", elementType: "image", x: 0, y: 0, w: 200, h: 100, naturalW: 400, naturalH: 200 };
  const r = nudgeResize(img, 20, 0, B);
  assert.deepEqual(r && r.kind === "box" && [r.w, r.h], [220, 110]);
});

test("nudgeResize: text changes size with the same 10..300 clamp; locked -> null", () => {
  assert.deepEqual(nudgeResize({ id: "t", elementType: "text", x: 0, y: 0, size: 16 }, 1, 0, B), { kind: "text", size: 17 });
  assert.deepEqual(nudgeResize({ id: "t", elementType: "text", x: 0, y: 0, size: 10 }, 0, -10, B), { kind: "text", size: 10 });
  assert.equal(nudgeResize({ ...music, locked: true }, 1, 0, B), null);
});

test("cycleSelection: ] / [ walk z-order and wrap; empty start picks bottom/top", () => {
  const ids = ["a", "b", "c"];
  assert.equal(cycleSelection(ids, null, 1), "a");
  assert.equal(cycleSelection(ids, null, -1), "c");
  assert.equal(cycleSelection(ids, "c", 1), "a");
  assert.equal(cycleSelection(ids, "a", -1), "c");
  assert.equal(cycleSelection([], null, 1), null);
});
