import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeMusicNaturalSize, MUSIC_BLOCK_HEIGHT, MUSIC_BLOCK_GAP,
  MUSIC_BLOCK_WIDTH_MIN, MUSIC_BLOCK_WIDTH_DEFAULT,
} from "./musicBlockSizing";

test("computeMusicNaturalSize: width undefined -> MUSIC_BLOCK_WIDTH_DEFAULT", () => {
  const size = computeMusicNaturalSize({ availableWidth: 400 });
  assert.equal(size.width, MUSIC_BLOCK_WIDTH_DEFAULT);
});

test("computeMusicNaturalSize: width below the minimum clamps to MUSIC_BLOCK_WIDTH_MIN", () => {
  const size = computeMusicNaturalSize({ availableWidth: 400, width: 50 });
  assert.equal(size.width, MUSIC_BLOCK_WIDTH_MIN);
});

test("computeMusicNaturalSize: width inside the valid range is preserved exactly", () => {
  const size = computeMusicNaturalSize({ availableWidth: 400, width: 250 });
  assert.equal(size.width, 250);
});

test("computeMusicNaturalSize: width above availableWidth clamps to availableWidth", () => {
  const size = computeMusicNaturalSize({ availableWidth: 300, width: 500 });
  assert.equal(size.width, 300);
});

test("computeMusicNaturalSize: availableWidth below MUSIC_BLOCK_WIDTH_MIN still never exceeds availableWidth (same contract as every other block)", () => {
  const size = computeMusicNaturalSize({ availableWidth: 50, width: 250 });
  assert.equal(size.width, 50);
  const withDefault = computeMusicNaturalSize({ availableWidth: 50 });
  assert.equal(withDefault.width, 50);
});

test("computeMusicNaturalSize: height is always MUSIC_BLOCK_HEIGHT, regardless of width", () => {
  assert.equal(computeMusicNaturalSize({ availableWidth: 400 }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 400, width: MUSIC_BLOCK_WIDTH_MIN }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 400, width: 400 }).height, MUSIC_BLOCK_HEIGHT);
  assert.equal(computeMusicNaturalSize({ availableWidth: 0 }).height, MUSIC_BLOCK_HEIGHT);
});

test("computeMusicNaturalSize: height never changes as width changes across the full valid range", () => {
  const heights = [MUSIC_BLOCK_WIDTH_MIN, 150, 200, MUSIC_BLOCK_WIDTH_DEFAULT, 300, 500]
    .map(width => computeMusicNaturalSize({ availableWidth: 600, width }).height);
  assert.ok(heights.every(h => h === MUSIC_BLOCK_HEIGHT));
});

test("computeMusicNaturalSize: never reports a negative width for a negative availableWidth", () => {
  const size = computeMusicNaturalSize({ availableWidth: -50, width: 200 });
  assert.equal(size.width, 0);
});

test("computeMusicNaturalSize: deterministic — same input always yields the same output", () => {
  assert.deepEqual(
    computeMusicNaturalSize({ availableWidth: 400, width: 220 }),
    computeMusicNaturalSize({ availableWidth: 400, width: 220 }),
  );
});

test("MUSIC_BLOCK_HEIGHT, MUSIC_BLOCK_GAP and the width bounds are positive constants", () => {
  assert.ok(MUSIC_BLOCK_HEIGHT > 0);
  assert.ok(MUSIC_BLOCK_GAP >= 0);
  assert.ok(MUSIC_BLOCK_WIDTH_MIN > 0);
  assert.ok(MUSIC_BLOCK_WIDTH_DEFAULT >= MUSIC_BLOCK_WIDTH_MIN, "the default must itself be a valid width");
});
