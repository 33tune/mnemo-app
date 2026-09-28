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
