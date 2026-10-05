import { test } from "node:test";
import assert from "node:assert/strict";
import { neutralGlowPatch, withNeutralGlowOnCreate, GLOW_NEUTRAL_COLOR } from "./neutralGlow";
import { resumeWithIntensity, pauseEffect } from "./effectPause";
import { PFP_GLOW_DEFAULT_COLOR, TEXT_GLOW_DEFAULT_COLOR, glowFlagPatch, isIntensityEffectVisible, isCardGlowFlagVisible, EFFECT_DISPLAY_DEFAULTS, CARD_EFFECT_ON_INTENSITY, CARD_GLOW_DEFAULT_COLOR } from "./effectEditorDefaults";

test("GLOW_NEUTRAL_COLOR: 6-digit hex (CardLayers appends alpha suffixes) and the PFP/text render default", () => {
  assert.match(GLOW_NEUTRAL_COLOR, /^#[0-9a-f]{6}$/i);
  assert.equal(PFP_GLOW_DEFAULT_COLOR, GLOW_NEUTRAL_COLOR);
  assert.equal(TEXT_GLOW_DEFAULT_COLOR, GLOW_NEUTRAL_COLOR);
  assert.equal(CARD_GLOW_DEFAULT_COLOR, "#a855f7", "render fallback unchanged (no migration)");
});

test("neutralGlowPatch: new glow with no color anywhere -> explicit neutral", () => {
  assert.deepEqual(neutralGlowPatch(undefined), { color: GLOW_NEUTRAL_COLOR });
  assert.deepEqual(neutralGlowPatch({ glow: { outer: true, intensity: 0 } }), { color: GLOW_NEUTRAL_COLOR }, "Music default outer:true, invisible");
});

test("neutralGlowPatch: never recolors — stored/legacy color, or a visible violet-fallback glow / hover glow", () => {
  assert.deepEqual(neutralGlowPatch({ glow: { color: "#ff0000" } }), {});
  assert.deepEqual(neutralGlowPatch({ glow: { outer: true, intensity: 0.4 } }), {}, "static glow visible in violet");
  assert.deepEqual(neutralGlowPatch({ interactions: { hoverGlow: true } }), {}, "hover glow already violet");
});

test("withNeutralGlowOnCreate: only for a NEW pfp/text glow; a resumed config is restored untouched", () => {
  const created = withNeutralGlowOnCreate(undefined, "pfp.glow", resumeWithIntensity(undefined, "pfp.glow"));
  assert.equal(created.pfp?.glow?.color, GLOW_NEUTRAL_COLOR);
  const paused = pauseEffect({ text: { glow: { intensity: 0.3 } } }, "text.glow");
  const resumed = withNeutralGlowOnCreate(paused, "text.glow", resumeWithIntensity(paused, "text.glow"));
  assert.equal(resumed.text?.glow?.color, undefined, "user's paused config: no color invented");
  assert.equal(resumed.text?.glow?.intensity, 0.3);
});

test("glowFlagPatch: off writes false explicitly; on over an invisible glow bumps intensity and turns off the other invisible flag", () => {
  assert.deepEqual(glowFlagPatch({ outer: true, intensity: 0.5 }, "outer", false), { outer: false });
  assert.deepEqual(glowFlagPatch({ outer: true }, "inner", true), { inner: true, intensity: CARD_EFFECT_ON_INTENSITY, outer: false });
  assert.deepEqual(glowFlagPatch({ outer: true, intensity: 0.4 }, "inner", true), { inner: true });
});

test("visible = intensity > 0 (the rule every switch shows)", () => {
  assert.equal(isIntensityEffectVisible({ intensity: 0 }), false);
  assert.equal(isIntensityEffectVisible({}), false);
  assert.equal(isIntensityEffectVisible({ intensity: 0.01 }), true);
  assert.equal(isCardGlowFlagVisible({ outer: true }, "outer"), false, "Music legacy outer:true with no intensity renders nothing");
  assert.equal(isCardGlowFlagVisible({ outer: true, intensity: 0.2 }, "outer"), true);
});

test("EFFECT_DISPLAY_DEFAULTS.music: Music's own defaults (radius 10, tilt 5 — not ProfileCard's 10 / the old menu's 6)", () => {
  assert.equal(EFFECT_DISPLAY_DEFAULTS.music.radius, 10);
  assert.equal(EFFECT_DISPLAY_DEFAULTS.music.tilt, 5);
  assert.equal(EFFECT_DISPLAY_DEFAULTS.card.tilt, 10);
  assert.equal(EFFECT_DISPLAY_DEFAULTS.music.spotlightSize, 65);
});
