import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTextEffectStyle } from "./textEffects";

test("resolveTextEffectStyle: undefined input returns empty style (no visual change)", () => {
  assert.deepEqual(resolveTextEffectStyle(undefined), {});
});

test("resolveTextEffectStyle: empty object returns empty style", () => {
  assert.deepEqual(resolveTextEffectStyle({}), {});
});

test("resolveTextEffectStyle: shadow with no params reproduces the pre-existing rgba(0,0,0,0.5) look", () => {
  const style = resolveTextEffectStyle({ shadow: {} });
  assert.equal(style.textShadow, "0px 2px 4px rgba(0,0,0,0.5)");
});

test("resolveTextEffectStyle: shadow with explicit color uses full opacity by default", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#ff0000" } });
  assert.equal(style.textShadow, "0px 2px 4px rgba(255,0,0,1)");
});

test("resolveTextEffectStyle: shadow independent offsetX/offsetY/blur/opacity", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#00ff00", offsetX: 3, offsetY: -1, blur: 10, opacity: 0.3 } });
  assert.equal(style.textShadow, "3px -1px 10px rgba(0,255,0,0.3)");
});

test("resolveTextEffectStyle: glow with zero intensity produces no layer", () => {
  const style = resolveTextEffectStyle({ glow: { intensity: 0 } });
  assert.equal(style.textShadow, undefined);
});

test("resolveTextEffectStyle: glow with intensity and explicit radius", () => {
  const style = resolveTextEffectStyle({ glow: { intensity: 0.5, radius: 12, color: "#ffffff" } });
  assert.equal(style.textShadow, "0 0 12px rgba(255,255,255,0.5)");
});

test("resolveTextEffectStyle: shadow and glow combine as two layers", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#000000", opacity: 0.6 }, glow: { intensity: 0.4, radius: 8, color: "#00ffff" } });
  assert.equal(style.textShadow, "0px 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,255,255,0.4)");
});

test("resolveTextEffectStyle: stroke applies WebkitTextStroke", () => {
  const style = resolveTextEffectStyle({ stroke: { width: 1, color: "#0000ff" } });
  assert.equal(style.WebkitTextStroke, "1px #0000ff");
});

test("resolveTextEffectStyle: stroke with width 0 is a no-op", () => {
  const style = resolveTextEffectStyle({ stroke: { width: 0 } });
  assert.equal(style.WebkitTextStroke, undefined);
});

test("resolveTextEffectStyle (FASE 3): blur applies filter, independent of everything else", () => {
  const style = resolveTextEffectStyle({ blur: 2, shadow: { color: "#000000" } });
  assert.equal(style.filter, "blur(2px)");
  assert.ok(style.textShadow); // shadow still applies — no coupling
});

test("resolveTextEffectStyle: gradient (roleEffect param) sets backgroundClip + transparent color, no shimmer", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { colors: ["#ff0000", "#0000ff"], angle: 90 } });
  assert.equal(style.backgroundImage, "linear-gradient(90deg, #ff0000, #0000ff)");
  assert.equal(style.backgroundClip, "text");
  assert.equal(style.WebkitBackgroundClip, "text");
  assert.equal(style.color, "transparent");
  assert.equal(style.animation, undefined);
});

test("resolveTextEffectStyle (Product closeout): multicolor gradient with 4 stops", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"], angle: 45 } });
  assert.equal(style.backgroundImage, "linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)");
});

test("resolveTextEffectStyle (Product closeout): defensive fallback reads legacy {from,to} data with no `colors` array, angle defaults to 90", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { from: "#111111", to: "#eeeeee" } as never });
  assert.equal(style.backgroundImage, "linear-gradient(90deg, #111111, #eeeeee)");
});

test("resolveTextEffectStyle (Product closeout — shimmer fix): shimmer now works WITHOUT an explicit gradient, using the resolved solid color", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.5 } }, "#ff8800");
  assert.ok(String(style.backgroundImage).includes("#ff8800"));
  assert.equal(style.backgroundClip, "text");
  assert.equal(style.color, "transparent");
  assert.ok(String(style.animation).includes("mnemo-text-shimmer"));
});

test("resolveTextEffectStyle (Product closeout — shimmer fix): shimmer without gradient and without a resolvedColor still renders (falls back to white)", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.5 } });
  assert.ok(style.backgroundImage);
  assert.equal(style.backgroundClip, "text");
});

test("resolveTextEffectStyle (bug fix — real gradient flow): gradient + shimmer scrolls the gradient's own colors, not a static highlight over a frozen gradient", () => {
  const style = resolveTextEffectStyle(undefined, {
    gradient: { colors: ["#ff0000", "#0000ff"], angle: 45 },
    shimmer: { intensity: 0.5, speed: 1 },
  });
  // Single animated layer — the stop list duplicated back-to-back so a
  // 0%->100% background-position sweep loops seamlessly (see
  // resolveGradientFlowCss's header).
  assert.equal(style.backgroundImage, "linear-gradient(45deg, #ff0000, #0000ff, #ff0000, #0000ff)");
  assert.equal(style.backgroundSize, "200% 100%");
  assert.equal(style.backgroundPosition, "0% 0");
  assert.ok(String(style.animation).includes("mnemo-text-gradient-flow"));
  assert.ok(!String(style.animation).includes("mnemo-text-shimmer"));
  assert.equal(style.color, "transparent");
});

test("resolveTextEffectStyle (bug fix — real gradient flow): works for 3+ stop / rainbow-style gradients, duplicating the full stop list", () => {
  const style = resolveTextEffectStyle(undefined, {
    gradient: { colors: ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#8b00ff"], angle: 90 },
    shimmer: {},
  });
  assert.equal(
    style.backgroundImage,
    "linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)",
  );
  assert.equal(style.backgroundSize, "200% 100%");
});

test("resolveTextEffectStyle (bug fix — real gradient flow): speed maps through to the flow animation's duration, same contract as plain shimmer", () => {
  const slow = resolveTextEffectStyle(undefined, { gradient: { colors: ["#fff", "#000"], angle: 0 }, shimmer: { speed: 0.5 } });
  const fast = resolveTextEffectStyle(undefined, { gradient: { colors: ["#fff", "#000"], angle: 0 }, shimmer: { speed: 2 } });
  const slowDuration = parseFloat(String(slow.animation).split(" ")[1]);
  const fastDuration = parseFloat(String(fast.animation).split(" ")[1]);
  assert.ok(fastDuration < slowDuration, `expected faster speed to produce a shorter duration: ${fastDuration} vs ${slowDuration}`);
});

test("resolveTextEffectStyle (bug fix — real gradient flow): no explicit gradient + shimmer still uses the original static-surface highlight sweep, unchanged", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.5 } }, "#ff8800");
  assert.ok(String(style.backgroundImage).includes("#ff8800"));
  assert.equal(style.backgroundSize, "250% 100%, 100% 100%");
  assert.ok(String(style.animation).includes("mnemo-text-shimmer"));
  assert.ok(!String(style.animation).includes("mnemo-text-gradient-flow"));
});

test("resolveTextEffectStyle: shadow/glow/stroke (effect param) still work combined with gradient (roleEffect param) — no CSS-level conflict", () => {
  const style = resolveTextEffectStyle(
    { shadow: { color: "#000000" }, stroke: { width: 1, color: "#111111" } },
    { gradient: { colors: ["#ffffff", "#000000"], angle: 0 } },
  );
  assert.equal(style.color, "transparent");
  assert.ok(style.textShadow);
  assert.equal(style.WebkitTextStroke, "1px #111111");
});

test("resolveTextEffectStyle: gradient/shimmer are per-role — a role with no roleEffect never renders them even if `effect` is set", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#000000" } }, undefined);
  assert.equal(style.backgroundImage, undefined);
  assert.equal(style.color, undefined);
});
