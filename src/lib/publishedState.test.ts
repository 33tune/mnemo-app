import test from "node:test";
import assert from "node:assert/strict";
import { publicStateOf, withPublished, stripPublished, hasUnpublishedChanges } from "./publishedState";

const S = (bg: string, extra = {}): Record<string, unknown> => ({ bgColor: bg, wallpaper: "", images: [], ...extra });
const C = (v: unknown) => v as never;

test("visitors see the published snapshot, never the working copy", () => {
  const row = { ...S("#draft"), published: S("#pub") };
  assert.equal(publicStateOf(row).bgColor, "#pub");
  assert.equal("published" in publicStateOf(row), false);
});

test("rows from before published snapshots still show their data", () => {
  assert.equal(publicStateOf(S("#old")).bgColor, "#old");
  assert.deepEqual(publicStateOf(null), {});
});

test("saving keeps the published snapshot; publishing sets it", () => {
  const saved = withPublished(C(S("#draft2")), C(S("#pub"))) as never as { bgColor: string; published: { bgColor: string } };
  assert.equal(saved.bgColor, "#draft2");
  assert.equal(saved.published.bgColor, "#pub");
  // never nests snapshots
  const nested = withPublished(C({ ...S("#a"), published: S("#x") }), C({ ...S("#b"), published: S("#y") })) as never as Record<string, Record<string, unknown>>;
  assert.equal("published" in nested.published, false);
  assert.equal("published" in stripPublished(withPublished(C(S("#a")), null)), false);
});

test("unpublished changes: no snapshot, pending ops, or a different working copy", () => {
  assert.equal(hasUnpublishedChanges(S("#a"), 0), true);
  assert.equal(hasUnpublishedChanges({ ...S("#a"), published: S("#a") }, 0), false);
  assert.equal(hasUnpublishedChanges({ ...S("#a"), published: S("#a") }, 3), true);
  assert.equal(hasUnpublishedChanges({ ...S("#b"), published: S("#a") }, 0), true);
  // key order and undefined fields do not count as changes
  assert.equal(hasUnpublishedChanges({ wallpaper: "", images: [], bgColor: "#a", x: undefined, published: S("#a") }, 0), false);
});
