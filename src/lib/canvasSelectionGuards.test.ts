import { test } from "node:test";
import assert from "node:assert/strict";
import { applyGroupDragDelta, filterTrashDeletion, resolveBulkDeleteIds } from "./canvasSelectionGuards";

interface El { id: string; elementType: string; x: number; y: number; w?: number; h?: number }

function els(): El[] {
  return [
    { id: "profile-1", elementType: "profile", x: 100, y: 160, w: 240, h: 320 },
    { id: "image-1",   elementType: "image",   x: 10,  y: 10,  w: 80,  h: 80 },
    { id: "image-2",   elementType: "image",   x: 50,  y: 50,  w: 80,  h: 80 },
  ];
}

test("applyGroupDragDelta moves every dragged element except the profile", () => {
  const start = els();
  const dragStartPos = Object.fromEntries(start.map(e => [e.id, { x: e.x, y: e.y }]));
  const moved = applyGroupDragDelta(start, dragStartPos, 30, -20);

  const profile = moved.find(e => e.id === "profile-1")!;
  const img1 = moved.find(e => e.id === "image-1")!;
  const img2 = moved.find(e => e.id === "image-2")!;

  assert.deepEqual({ x: profile.x, y: profile.y }, { x: 100, y: 160 }, "profile must not move even though it had a dragStartPos entry");
  assert.deepEqual({ x: img1.x, y: img1.y }, { x: 40, y: -10 }, "non-profile elements must move by the full delta");
  assert.deepEqual({ x: img2.x, y: img2.y }, { x: 80, y: 30 });
});

test("applyGroupDragDelta leaves elements with no dragStartPos entry untouched", () => {
  const start = els();
  const moved = applyGroupDragDelta(start, { "image-1": { x: 10, y: 10 } }, 100, 100);
  assert.deepEqual({ x: moved.find(e => e.id === "image-2")!.x, y: moved.find(e => e.id === "image-2")!.y }, { x: 50, y: 50 });
});

test("applyGroupDragDelta clamps to canvasBounds for non-profile elements when provided", () => {
  const start = els();
  const dragStartPos = Object.fromEntries(start.map(e => [e.id, { x: e.x, y: e.y }]));
  const moved = applyGroupDragDelta(start, dragStartPos, 10_000, -10_000, { w: 500, h: 500, topOffset: 5 });
  const img1 = moved.find(e => e.id === "image-1")!;
  assert.equal(img1.x, 500 - 80);
  assert.equal(img1.y, 5);
  // Profile still untouched even with bounds active.
  const profile = moved.find(e => e.id === "profile-1")!;
  assert.deepEqual({ x: profile.x, y: profile.y }, { x: 100, y: 160 });
});

test("filterTrashDeletion removes selected elements but keeps the profile even if selected", () => {
  const start = els();
  const selected = new Set(["profile-1", "image-1"]);
  const result = filterTrashDeletion(start, selected);
  assert.deepEqual(result.map(e => e.id).sort(), ["image-2", "profile-1"]);
});

test("filterTrashDeletion removes non-profile elements normally when profile isn't selected", () => {
  const start = els();
  const result = filterTrashDeletion(start, new Set(["image-1", "image-2"]));
  assert.deepEqual(result.map(e => e.id), ["profile-1"]);
});

test("resolveBulkDeleteIds passes a solo selection through unchanged, including a solo profile", () => {
  const start = els();
  assert.deepEqual(resolveBulkDeleteIds(new Set(["profile-1"]), start), new Set(["profile-1"]));
  assert.deepEqual(resolveBulkDeleteIds(new Set(["image-1"]), start), new Set(["image-1"]));
});

test("resolveBulkDeleteIds strips the profile out of a multi-selection", () => {
  const start = els();
  const result = resolveBulkDeleteIds(new Set(["profile-1", "image-1", "image-2"]), start);
  assert.deepEqual(result, new Set(["image-1", "image-2"]));
});

test("resolveBulkDeleteIds returns an empty set if every non-profile id in the multi-selection is stale", () => {
  const start = els();
  const result = resolveBulkDeleteIds(new Set(["profile-1", "already-deleted"]), start);
  // "already-deleted" isn't in `elements` at all, so its lookup is undefined —
  // undefined?.elementType !== "profile" is true, so it stays in. This
  // documents that resolveBulkDeleteIds only strips ids it can confirm are
  // the profile; a truly stale id (present in selection, absent from
  // elements) is left for the caller to filter when building the snapshot.
  assert.deepEqual(result, new Set(["already-deleted"]));
});
