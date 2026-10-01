import { test } from "node:test";
import assert from "node:assert/strict";
import type { CardEffects } from "@/types";
import { pauseEffect, resumeEffect, removeEffect, toggleEffect, getActive, getPaused, resumeWithIntensity, mergePatch, RESUME_MIN_INTENSITY } from "./effectPause";

test("pauseEffect: moves the active sub-object into paused at the same path", () => {
  const fx: CardEffects = { shadow: { intensity: 0.7, color: "#ff0000", blur: 30 } };
  const next = pauseEffect(fx, "shadow");
  assert.equal(next.shadow, undefined);
  assert.deepEqual(next.paused?.shadow, { intensity: 0.7, color: "#ff0000", blur: 30 });
});

test("pause -> resume round-trips the exact previous config", () => {
  const fx: CardEffects = { text: { shadow: { color: "#123456", blur: 9, offsetX: 3 }, stroke: { width: 2 } } };
  const back = resumeEffect(pauseEffect(fx, "text.shadow"), "text.shadow", { blur: 4 });
  assert.deepEqual(back, fx);
});

test("never in both: after pause the active slot is gone, after resume the paused slot is gone", () => {
  const fx: CardEffects = { textRoles: { name: { gradient: { colors: ["#fff", "#000"], angle: 45 }, shimmer: { speed: 2 } } } };
  const paused = pauseEffect(fx, "textRoles.name.gradient");
  assert.equal(getActive(paused, "textRoles.name.gradient"), undefined);
  assert.ok(getPaused(paused, "textRoles.name.gradient"));
  // sibling untouched
  assert.deepEqual(paused.textRoles?.name?.shimmer, { speed: 2 });
  const resumed = resumeEffect(paused, "textRoles.name.gradient");
  assert.ok(getActive(resumed, "textRoles.name.gradient"));
  assert.equal(getPaused(resumed, "textRoles.name.gradient"), undefined);
  assert.equal(resumed.paused, undefined, "empty paused stash is pruned entirely");
});

test("resumeEffect: nothing paused -> uses the fallback", () => {
  const next = resumeEffect({}, "pfp.glow", { intensity: 0.5 });
  assert.deepEqual(next, { pfp: { glow: { intensity: 0.5 } } });
});

test("resumeEffect: nothing paused and no fallback keeps the active value (never a silent delete)", () => {
  const fx: CardEffects = { shadow: { intensity: 0.3 } };
  assert.deepEqual(resumeEffect(fx, "shadow"), fx);
});

test("pauseEffect: empty parents are pruned, the root never is", () => {
  const next = pauseEffect({ text: { glow: { intensity: 0.5 } } }, "text.glow");
  assert.equal("text" in next, false);
  assert.deepEqual(next, { paused: { text: { glow: { intensity: 0.5 } } } });
  assert.deepEqual(pauseEffect(undefined, "shadow"), {});
});

test("pauseEffect: nothing active keeps an older paused value", () => {
  const fx: CardEffects = { paused: { shadow: { intensity: 0.9 } } };
  assert.deepEqual(pauseEffect(fx, "shadow"), fx);
});

test("pauseEffect: offValue writes an explicit off sentinel to the active slot", () => {
  const fx: CardEffects = { pfp: { shadow: { intensity: 0.6, color: "#00ff00" } } };
  const next = pauseEffect(fx, "pfp.shadow", { intensity: 0 });
  assert.deepEqual(next.pfp?.shadow, { intensity: 0 });
  assert.deepEqual(next.paused?.pfp?.shadow, { intensity: 0.6, color: "#00ff00" });
  // resume overwrites the sentinel with the stashed config
  assert.deepEqual(resumeEffect(next, "pfp.shadow").pfp?.shadow, { intensity: 0.6, color: "#00ff00" });
});

test("scalar paths work too (interactions.hoverScale)", () => {
  const fx: CardEffects = { interactions: { tilt3d: true, hoverScale: 1.1 } };
  const off = pauseEffect(fx, "interactions.hoverScale");
  assert.deepEqual(off.interactions, { tilt3d: true });
  assert.equal(off.paused?.interactions?.hoverScale, 1.1);
  assert.equal(resumeEffect(off, "interactions.hoverScale", 1.05).interactions?.hoverScale, 1.1);
});

test("removeEffect: deletes both active and paused", () => {
  const fx: CardEffects = { gradient: { from: "#000", to: "#fff", angle: 10, opacity: 1 }, paused: { gradient: { from: "#111", to: "#222", angle: 0, opacity: 0.5 } } };
  assert.deepEqual(removeEffect(fx, "gradient"), {});
});

test("toggleEffect: dispatches to pause/resume and never mutates its input", () => {
  const fx: CardEffects = { glow: { color: "#abcdef", intensity: 0.4, outer: true } };
  const snapshot = structuredClone(fx);
  const off = toggleEffect(fx, "glow", false);
  const on = toggleEffect(off, "glow", true);
  assert.deepEqual(on, fx);
  assert.deepEqual(fx, snapshot);
});

test("unrelated keys survive pause/resume untouched", () => {
  const fx: CardEffects = { bg: { color: "#000" }, retro: { scanlines: { enabled: true } }, shadow: { intensity: 0.5 } };
  const off = pauseEffect(fx, "shadow");
  assert.deepEqual(off.bg, fx.bg);
  assert.deepEqual(off.retro, fx.retro);
});

test("resumeWithIntensity: a paused/stored intensity of 0 comes back visible", () => {
  const paused: CardEffects = { paused: { text: { glow: { intensity: 0, color: "#f0f" } } } };
  assert.deepEqual(resumeWithIntensity(paused, "text.glow").text?.glow, { intensity: RESUME_MIN_INTENSITY, color: "#f0f" });
  const legacyOff: CardEffects = { shadow: { intensity: 0, color: "#123456" } };
  assert.deepEqual(resumeWithIntensity(legacyOff, "shadow").shadow, { intensity: RESUME_MIN_INTENSITY, color: "#123456" });
  assert.deepEqual(resumeWithIntensity({}, "pfp.glow").pfp?.glow, { intensity: RESUME_MIN_INTENSITY });
  assert.deepEqual(resumeWithIntensity({ paused: { shadow: { intensity: 0.8 } } }, "shadow").shadow, { intensity: 0.8 });
});

test("mergePatch: undefined deletes the key instead of storing it", () => {
  const out = mergePatch<{ color?: string; width?: number }>({ color: "#fff", width: 2 }, { color: undefined, width: 3 });
  assert.deepEqual(out, { width: 3 });
  assert.equal("color" in out, false);
});
