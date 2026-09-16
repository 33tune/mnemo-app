import { test } from "node:test";
import assert from "node:assert/strict";
import { clampVolume, effectiveVolume, formatDuration } from "./musicPlayerFormat";

test("clampVolume: passes through values already in [0,1]", () => {
  assert.equal(clampVolume(0), 0);
  assert.equal(clampVolume(0.5), 0.5);
  assert.equal(clampVolume(1), 1);
});

test("clampVolume: clamps out-of-range values", () => {
  assert.equal(clampVolume(-0.5), 0);
  assert.equal(clampVolume(1.5), 1);
});

test("clampVolume: undefined and NaN fall back to full volume (1), matching <audio>'s own default", () => {
  assert.equal(clampVolume(undefined), 1);
  assert.equal(clampVolume(NaN), 1);
});

test("effectiveVolume: muted always yields 0 regardless of the slider's own value", () => {
  assert.equal(effectiveVolume(0.7, true), 0);
  assert.equal(effectiveVolume(1, true), 0);
  assert.equal(effectiveVolume(0, true), 0);
});

test("effectiveVolume: unmuted returns the clamped volume", () => {
  assert.equal(effectiveVolume(0.5, false), 0.5);
  assert.equal(effectiveVolume(1.5, false), 1, "still clamps even when unmuted");
});

test("formatDuration: renders m:ss for sub-hour durations", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(5), "0:05");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(599), "9:59");
  assert.equal(formatDuration(600), "10:00");
});

test("formatDuration: renders h:mm:ss past one hour", () => {
  assert.equal(formatDuration(3600), "1:00:00");
  assert.equal(formatDuration(3661), "1:01:01");
  assert.equal(formatDuration(7325), "2:02:05");
});

test("formatDuration: truncates fractional seconds rather than rounding up", () => {
  assert.equal(formatDuration(65.9), "1:05");
});

test("formatDuration: non-finite or negative input never crashes or shows NaN", () => {
  assert.equal(formatDuration(NaN), "0:00");
  assert.equal(formatDuration(Infinity), "0:00");
  assert.equal(formatDuration(-Infinity), "0:00");
  assert.equal(formatDuration(-5), "0:00");
});
