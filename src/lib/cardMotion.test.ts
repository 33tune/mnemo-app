import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveShimmerAnimation, resolveGlowPulseAnimation, SHIMMER_ANIMATION_NAME, GLOW_PULSE_ANIMATION_NAME } from "./cardMotion";

test("resolveShimmerAnimation: default speed produces the base duration", () => {
  const anim = resolveShimmerAnimation();
  assert.equal(anim, `${SHIMMER_ANIMATION_NAME} 3.00s linear infinite`);
});

test("resolveShimmerAnimation: higher speed means shorter duration", () => {
  const slow = resolveShimmerAnimation(0.5);
  const fast = resolveShimmerAnimation(2);
  const slowDuration = Number(slow.match(/([\d.]+)s/)![1]);
  const fastDuration = Number(fast.match(/([\d.]+)s/)![1]);
  assert.ok(fastDuration < slowDuration);
});

test("resolveShimmerAnimation: duration is clamped to a sane range", () => {
  const extreme = resolveShimmerAnimation(1000);
  const duration = Number(extreme.match(/([\d.]+)s/)![1]);
  assert.ok(duration >= 0.4);
});

test("resolveGlowPulseAnimation: default speed produces the base duration", () => {
  const anim = resolveGlowPulseAnimation();
  assert.equal(anim, `${GLOW_PULSE_ANIMATION_NAME} 2.50s ease-in-out infinite`);
});

test("resolveGlowPulseAnimation: higher speed means shorter duration", () => {
  const slow = resolveGlowPulseAnimation(0.5);
  const fast = resolveGlowPulseAnimation(3);
  const slowDuration = Number(slow.match(/([\d.]+)s/)![1]);
  const fastDuration = Number(fast.match(/([\d.]+)s/)![1]);
  assert.ok(fastDuration < slowDuration);
});

test("resolveGlowPulseAnimation: never produces a negative or zero duration regardless of speed", () => {
  const anim = resolveGlowPulseAnimation(0);
  const duration = Number(anim.match(/([\d.]+)s/)![1]);
  assert.ok(duration > 0);
});
