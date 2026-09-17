import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveClickAfterDrag } from "./dragClickGuard";

test("resolveClickAfterDrag: no drag happened -> click passes through, flag stays clear", () => {
  const result = resolveClickAfterDrag(false);
  assert.equal(result.suppress, false);
  assert.equal(result.nextDidDrag, false);
});

test("resolveClickAfterDrag: a drag happened -> this click is suppressed", () => {
  const result = resolveClickAfterDrag(true);
  assert.equal(result.suppress, true);
});

test("resolveClickAfterDrag: consumes the flag — it never comes back true after being read", () => {
  const result = resolveClickAfterDrag(true);
  assert.equal(result.nextDidDrag, false);
});

test("resolveClickAfterDrag: regression — a swallowed drag-click must not leak into the NEXT unrelated click (the ProfileCard lockup bug)", () => {
  // Simulates: drag an image (didDrag -> true) -> click the image that ends the
  // drag (consumed here) -> click ProfileCard next, which never resets the flag
  // itself. Applying `nextDidDrag` back onto the ref after every read must leave
  // that second, unrelated click able to proceed.
  let didDrag = true;
  const first = resolveClickAfterDrag(didDrag);
  didDrag = first.nextDidDrag;
  assert.equal(first.suppress, true, "the click ending the drag itself is swallowed");

  const second = resolveClickAfterDrag(didDrag);
  assert.equal(second.suppress, false, "an unrelated later click must not be suppressed");
});
