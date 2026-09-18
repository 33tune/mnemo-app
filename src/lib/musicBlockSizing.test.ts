import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMusicNaturalSize, MUSIC_BLOCK_HEIGHT, MUSIC_BLOCK_GAP,
  MUSIC_BLOCK_WIDTH_COMPACT, MUSIC_BLOCK_WIDTH_FULL,
} from "./musicBlockSizing";

test("computeMusicNaturalSize: without text, width is the compact target when there's room", () => {
  const size = computeMusicNaturalSize({ availableWidth: 400, hasText: false });
  assert.equal(size.width, MUSIC_BLOCK_WIDTH_COMPACT);
});

test("computeMusicNaturalSize: with text, width is the full target when there's room", () => {
  const size = computeMusicNaturalSize({ availableWidth: 400, hasText: true });
  assert.equal(size.width, MUSIC_BLOCK_WIDTH_FULL);
});

test("computeMusicNaturalSize: never claims more than availableWidth, regardless of hasText", () => {
  assert.equal(computeMusicNaturalSize({ availableWidth: 100, hasText: false }).width, 100);
  assert.equal(computeMusicNaturalSize({ availableWidth: 100, hasText: true }).width, 100);
});

test("computeMusicNaturalSize: never spans the full card width when there's plenty of room (regression — Stage 4.2-C.2.2)", () => {
  const size = computeMusicNaturalSize({ availableWidth: 2000, hasText: true });
  assert.ok(size.width < 2000, "must stay content-sized, not claim the whole available width");
  assert.equal(size.width, MUSIC_BLOCK_WIDTH_FULL);
});

test("computeMusicNaturalSize: height is the fixed compact height regardless of width or hasText", () => {
  assert.equal(computeMusicNaturalSize({ availableWidth: 100, hasText: false }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 400, hasText: true }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 0, hasText: false }).height, MUSIC_BLOCK_HEIGHT);
});

test("computeMusicNaturalSize: never reports a negative width for a negative availableWidth", () => {
  const size = computeMusicNaturalSize({ availableWidth: -50, hasText: true });
  assert.equal(size.width, 0);
});

test("computeMusicNaturalSize: zero availableWidth claims zero width but still has a natural height", () => {
  const size = computeMusicNaturalSize({ availableWidth: 0, hasText: true });
  assert.equal(size.width, 0);
  assert.equal(size.height, MUSIC_BLOCK_HEIGHT);
});

test("MUSIC_BLOCK_HEIGHT, MUSIC_BLOCK_GAP and the width targets are positive constants", () => {
  assert.ok(MUSIC_BLOCK_HEIGHT > 0);
  assert.ok(MUSIC_BLOCK_GAP >= 0);
  assert.ok(MUSIC_BLOCK_WIDTH_COMPACT > 0);
  assert.ok(MUSIC_BLOCK_WIDTH_FULL > MUSIC_BLOCK_WIDTH_COMPACT, "a title/artist line needs more room than bare controls");
});
