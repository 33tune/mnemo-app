import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMusicNaturalSize, MUSIC_BLOCK_HEIGHT, MUSIC_BLOCK_GAP } from "./musicBlockSizing";

test("computeMusicNaturalSize: spans the full available width", () => {
  const size = computeMusicNaturalSize({ availableWidth: 240 });
  assert.equal(size.width, 240);
});

test("computeMusicNaturalSize: height is the fixed placeholder height regardless of width", () => {
  assert.equal(computeMusicNaturalSize({ availableWidth: 100 }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 400 }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 0 }).height, MUSIC_BLOCK_HEIGHT);
});

test("computeMusicNaturalSize: never reports a negative width for a negative availableWidth", () => {
  const size = computeMusicNaturalSize({ availableWidth: -50 });
  assert.equal(size.width, 0);
});

test("computeMusicNaturalSize: zero availableWidth claims zero width but still has a natural height", () => {
  const size = computeMusicNaturalSize({ availableWidth: 0 });
  assert.equal(size.width, 0);
  assert.equal(size.height, MUSIC_BLOCK_HEIGHT);
});

test("MUSIC_BLOCK_HEIGHT and MUSIC_BLOCK_GAP are positive constants", () => {
  assert.ok(MUSIC_BLOCK_HEIGHT > 0);
  assert.ok(MUSIC_BLOCK_GAP >= 0);
});
