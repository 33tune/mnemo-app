import test from "node:test";
import assert from "node:assert/strict";
import { planCleanup, CLEANUP_GRACE_MS } from "./cleanupPlan";

const now = Date.parse("2026-10-27T12:00:00Z");
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();
const U = "user-1";

test("deletes only unused files older than the grace period, in the user's folder", () => {
  const plan = planCleanup({
    userId: U, now, queue: [],
    used: new Set(["canvas-assets/user-1/in-use.png"]),
    files: [
      { path: "user-1/in-use.png", created_at: ago(100) },   // used → kept
      { path: "user-1/orphan.png", created_at: ago(30) },    // unused, old → deleted
      { path: "user-1/fresh.png", created_at: ago(2) },      // unused but fresh → kept
      { path: "user-2/other.png", created_at: ago(100) },    // someone else's → never
      { path: "user-1/../x.png", created_at: ago(100) },     // climbs out → never
      { path: "user-1/nodate.png", created_at: null },       // unknown age → kept
    ],
  });
  assert.deepEqual(plan.remove, ["user-1/orphan.png"]);
});

test("queue: old unused entries are deleted, used ones just leave the queue, fresh ones wait", () => {
  const plan = planCleanup({
    userId: U, now, files: [],
    used: new Set(["canvas-assets/kept.png"]),
    queue: [
      { id: "a", path: "canvas-assets/gone.png", created_at: ago(48) },
      { id: "b", path: "canvas-assets/kept.png", created_at: ago(48) },
      { id: "c", path: "canvas-assets/new.png", created_at: ago(1) },
      { id: "d", path: "other-bucket/x.png", created_at: ago(48) },
      { id: "e", path: "canvas-assets/user-2/theirs.png", created_at: ago(48) },
    ],
  });
  assert.deepEqual(plan.remove, []);
  assert.deepEqual(plan.legacy, ["gone.png"]);
  assert.deepEqual(plan.dropQueueIds.sort(), ["a", "b", "d", "e"]); // user-2's file is never touched
});

test("a queued file in the user's folder is a folder removal, not legacy", () => {
  const plan = planCleanup({
    userId: U, now, used: new Set(), files: [{ path: "user-1/a.png", created_at: ago(30) }],
    queue: [{ id: "q", path: "canvas-assets/user-1/a.png", created_at: ago(30) }],
  });
  assert.deepEqual(plan.remove, ["user-1/a.png"]);
  assert.deepEqual(plan.legacy, []);
});

test("the grace period is a day", () => assert.equal(CLEANUP_GRACE_MS, 86_400_000));
