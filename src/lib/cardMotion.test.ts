import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveShimmerAnimation, resolveGlowPulseAnimation, resolveLetterBounceAnimation,
  resolveLetterShimmerPulseAnimation, resolveFlickerAnimation, resolveGradientFlowAnimation,
  SHIMMER_ANIMATION_NAME, GLOW_PULSE_ANIMATION_NAME, LETTER_BOUNCE_ANIMATION_NAME,
  LETTER_SHIMMER_PULSE_ANIMATION_NAME, FLICKER_ANIMATION_NAME, GRADIENT_FLOW_ANIMATION_NAME,
} from "./cardMotion";

test("resolveShimmerAnimation: default speed produces the base duration", () => {
  const anim = resolveShimmerAnimation();
  assert.equal(anim, `${SHIMMER_ANIMATION_NAME} 3.20s ease-in-out infinite`);
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

test("resolveLetterBounceAnimation: default speed/delay", () => {
  const anim = resolveLetterBounceAnimation();
  assert.equal(anim, `${LETTER_BOUNCE_ANIMATION_NAME} 1.20s ease-in-out 0.000s infinite`);
});

test("resolveLetterBounceAnimation: delay is included verbatim for staggering", () => {
  const anim = resolveLetterBounceAnimation(1, 0.25);
  assert.ok(anim.includes("0.250s"));
});

test("resolveLetterBounceAnimation: higher speed means shorter duration", () => {
  const slow = resolveLetterBounceAnimation(0.5);
  const fast = resolveLetterBounceAnimation(2);
  const slowDuration = Number(slow.match(/([\d.]+)s/)![1]);
  const fastDuration = Number(fast.match(/([\d.]+)s/)![1]);
  assert.ok(fastDuration < slowDuration);
});

test("resolveLetterShimmerPulseAnimation: uses its own animation name and respects delay", () => {
  const anim = resolveLetterShimmerPulseAnimation(1, 0.1);
  assert.ok(anim.startsWith(LETTER_SHIMMER_PULSE_ANIMATION_NAME));
  assert.ok(anim.includes("0.100s"));
});

test("resolveFlickerAnimation: default speed produces the base duration", () => {
  const anim = resolveFlickerAnimation();
  assert.equal(anim, `${FLICKER_ANIMATION_NAME} 4.00s steps(1, end) infinite`);
});

test("resolveFlickerAnimation: higher speed means shorter duration", () => {
  const slow = resolveFlickerAnimation(0.5);
  const fast = resolveFlickerAnimation(2);
  const slowDuration = Number(slow.match(/([\d.]+)s/)![1]);
  const fastDuration = Number(fast.match(/([\d.]+)s/)![1]);
  assert.ok(fastDuration < slowDuration);
});

test("resolveGradientFlowAnimation: default speed produces the base duration, linear easing (constant speed, no seam stutter)", () => {
  const anim = resolveGradientFlowAnimation();
  assert.equal(anim, `${GRADIENT_FLOW_ANIMATION_NAME} 6.00s linear infinite`);
});

test("resolveGradientFlowAnimation: higher speed means shorter duration", () => {
  const slow = resolveGradientFlowAnimation(0.5);
  const fast = resolveGradientFlowAnimation(2);
  const slowDuration = Number(slow.match(/([\d.]+)s/)![1]);
  const fastDuration = Number(fast.match(/([\d.]+)s/)![1]);
  assert.ok(fastDuration < slowDuration);
});

test("resolveGradientFlowAnimation: duration is clamped to a sane range", () => {
  const extreme = resolveGradientFlowAnimation(1000);
  const duration = Number(extreme.match(/([\d.]+)s/)![1]);
  assert.ok(duration >= 0.4);
});
