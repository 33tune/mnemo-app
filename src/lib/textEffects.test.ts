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

test("resolveTextEffectStyle (FASE 3): gradient (roleEffect param) sets backgroundClip + transparent color, no shimmer", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { from: "#ff0000", to: "#0000ff", angle: 90 } });
  assert.equal(style.backgroundImage, "linear-gradient(90deg, #ff0000, #0000ff)");
  assert.equal(style.backgroundClip, "text");
  assert.equal(style.WebkitBackgroundClip, "text");
  assert.equal(style.color, "transparent");
  assert.equal(style.animation, undefined);
});

test("resolveTextEffectStyle (FASE 3): shimmer without gradient is inert (no backgroundImage, no animation)", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.8 } });
  assert.equal(style.backgroundImage, undefined);
  assert.equal(style.animation, undefined);
  assert.equal(style.color, undefined);
});

test("resolveTextEffectStyle (FASE 3): gradient + shimmer combine into a two-layer background with animation", () => {
  const style = resolveTextEffectStyle(undefined, {
    gradient: { from: "#ff0000", to: "#0000ff", angle: 45 },
    shimmer: { intensity: 0.5, speed: 1 },
  });
  assert.ok(String(style.backgroundImage).includes("linear-gradient(45deg, #ff0000, #0000ff)"));
  assert.ok(String(style.backgroundImage).startsWith("linear-gradient(100deg,"));
  assert.equal(style.backgroundSize, "250% 100%, 100% 100%");
  assert.ok(String(style.animation).includes("mnemo-text-shimmer"));
  assert.equal(style.color, "transparent");
});

test("resolveTextEffectStyle (FASE 3): shadow/glow/stroke (effect param) still work combined with gradient (roleEffect param) — no CSS-level conflict", () => {
  const style = resolveTextEffectStyle(
    { shadow: { color: "#000000" }, stroke: { width: 1, color: "#111111" } },
    { gradient: { from: "#ffffff", to: "#000000", angle: 0 } },
  );
  assert.equal(style.color, "transparent");
  assert.ok(style.textShadow);
  assert.equal(style.WebkitTextStroke, "1px #111111");
});

test("resolveTextEffectStyle (FASE 3): gradient/shimmer are per-role — a role with no roleEffect never renders them even if `effect` is set", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#000000" } }, undefined);
  assert.equal(style.backgroundImage, undefined);
  assert.equal(style.color, undefined);
});
