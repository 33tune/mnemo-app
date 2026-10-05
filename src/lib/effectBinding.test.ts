// Menu redesign Phase 1: effectBinding.ts must reproduce EXACTLY the switch
// semantics the four menus wired by hand before (ProfileEffectsMenu,
// MusicCardWidget, ProfileTypographyMenu, ProfileIdentityMenu). Each
// `legacy*` helper below is the pre-Phase-1 expression, verbatim — the
// equivalence tests pin "UI idéntica" for the refactor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CardEffects, ProfileCardVariant } from "@/types";
import {
  bindEffect, displayDefaultsFor, effectActions, effectState, patchEffectGroup, setEffectEnabled, setGlowFlag, setHoverGlow,
  type EffectOwner, type SwitchPath,
} from "./effectBinding";
import { getPaused, mergePatch, pauseEffect, removeEffect, resumeEffect, resumeWithIntensity, toggleEffect } from "./effectPause";
import { neutralGlowPatch, withNeutralGlowOnCreate, GLOW_NEUTRAL_COLOR } from "./neutralGlow";
import { EFFECT_ON_DEFAULTS, GRADIENT_DEFAULT, glowFlagPatch, pfpVariantShadowOn } from "./effectEditorDefaults";
import { getMusicCardEffects, getProfileCardEffects, MUSIC_DEFAULT_RADIUS } from "./profileCardEffects";

// ── Pre-Phase-1 wiring, verbatim ────────────────────────────────────────────
const legacyShadow = (raw: CardEffects | undefined, on: boolean) =>
  on ? resumeWithIntensity(raw, "shadow") : pauseEffect(raw, "shadow");
const legacyGlowFlag = (raw: CardEffects | undefined, eff: CardEffects, flag: "outer" | "inner", on: boolean) =>
  ({ ...raw, glow: mergePatch(raw?.glow, { ...glowFlagPatch(eff.glow, flag, on), ...(on ? neutralGlowPatch(eff) : {}) }) });
const legacyHoverGlow = (raw: CardEffects | undefined, eff: CardEffects, on: boolean) => {
  const colorPatch = on ? neutralGlowPatch(eff) : {};
  return {
    ...raw,
    interactions: mergePatch(raw?.interactions, { hoverGlow: on }),
    ...(colorPatch.color ? { glow: mergePatch(raw?.glow, colorPatch) } : {}),
  };
};
const legacyGlowPath = (e: CardEffects | undefined, path: "text.glow" | "pfp.glow", on: boolean) =>
  on ? withNeutralGlowOnCreate(e, path, resumeWithIntensity(e, path)) : pauseEffect(e, path);
const legacyPfpShadow = (effects: CardEffects | undefined, variant: ProfileCardVariant | undefined, on: boolean) => {
  const variantDefault = pfpVariantShadowOn(variant);
  if (!on) return pauseEffect(effects, "pfp.shadow", variantDefault ? { intensity: 0 } : undefined);
  const hasPaused = getPaused(effects, "pfp.shadow") !== undefined;
  if (!hasPaused && variantDefault) return removeEffect(effects, "pfp.shadow");
  return resumeWithIntensity(effects, "pfp.shadow");
};

const FIXTURES: Array<CardEffects | undefined> = [
  undefined,
  {},
  { shadow: { intensity: 0.4, color: "#ff0000", blur: 9 } },
  { shadow: { intensity: 0 } },
  { paused: { shadow: { intensity: 0.7, offsetY: 3 } } },
  { glow: { outer: true, intensity: 0.5 } },
  { glow: { color: "#00ff00", inner: true, intensity: 0 } },
  { glow: { outer: true, intensity: 0.3 }, interactions: { hoverGlow: true } },
  { gradient: { from: "#111111", to: "#222222", angle: 45, opacity: 0.3 } },
  { paused: { gradient: { from: "#333333", to: "#444444", angle: 10, opacity: 1 } } },
  { interactions: { hoverScale: 1.1 } },
  { interactions: { hoverScale: 1 } },
  { text: { shadow: { blur: 3 }, glow: { intensity: 0.2 }, stroke: { width: 2 } } },
  { text: { glow: { intensity: 0 } }, paused: { text: { stroke: { width: 3, color: "#000000" } } } },
  { pfp: { shadow: { intensity: 0.6 }, glow: { intensity: 0.4, color: "#123456" } } },
  { pfp: { shadow: { intensity: 0 } }, paused: { pfp: { shadow: { intensity: 0.9 }, glow: { intensity: 0.3 } } } },
  { textRoles: { name: { gradient: { colors: ["#ff0000", "#0000ff"], angle: 30 } } } },
  { paused: { textRoles: { bio: { shimmer: { speed: 2 } } } } },
];
const VARIANTS: Array<ProfileCardVariant | undefined> = [undefined, "classic", "minimal", "guns", "poster", "glass"];

test("shadow switch == legacy resumeWithIntensity/pauseEffect (card and Music)", () => {
  for (const raw of FIXTURES) for (const on of [true, false]) {
    assert.deepEqual(setEffectEnabled(raw, "shadow", on), legacyShadow(raw, on), JSON.stringify({ raw, on }));
  }
});

test("glow flags == legacy glowFlagPatch + O3 neutral (ProfileCard and Music effective trees)", () => {
  for (const raw of FIXTURES) for (const flag of ["outer", "inner"] as const) for (const on of [true, false]) {
    const profileEff = getProfileCardEffects({ bgColor: "", bgImage: "", borderRadius: 14, opacity: 1, effects: raw, glowIntensity: 0.4 });
    const musicEff = getMusicCardEffects({ effects: raw });
    for (const eff of [profileEff, musicEff]) {
      assert.deepEqual(setGlowFlag(raw, eff, flag, on), legacyGlowFlag(raw, eff, flag, on));
    }
  }
});

test("hover glow == legacy (neutral color only when no glow is visible)", () => {
  for (const raw of FIXTURES) for (const on of [true, false]) {
    const eff = getMusicCardEffects({ effects: raw });
    assert.deepEqual(setHoverGlow(raw, eff, on), legacyHoverGlow(raw, eff, on));
  }
});

test("text.glow / pfp.glow == legacy withNeutralGlowOnCreate(resumeWithIntensity) / pause", () => {
  for (const raw of FIXTURES) for (const path of ["text.glow", "pfp.glow"] as const) for (const on of [true, false]) {
    assert.deepEqual(setEffectEnabled(raw, path, on), legacyGlowPath(raw, path, on), JSON.stringify({ raw, path, on }));
  }
});

test("pfp.shadow == legacy variant-aware sentinel logic, for every variant", () => {
  for (const raw of FIXTURES) for (const variant of VARIANTS) for (const on of [true, false]) {
    assert.deepEqual(setEffectEnabled(raw, "pfp.shadow", on, variant), legacyPfpShadow(raw, variant, on), JSON.stringify({ raw, variant, on }));
  }
});

test("presence switches == legacy toggleEffect with the old inline fallbacks", () => {
  const cases: Array<[SwitchPath, unknown]> = [
    ["gradient", GRADIENT_DEFAULT],
    ["interactions.hoverScale", 1.05],
    ["text.shadow", {}],
    ["text.stroke", { width: 1 }],
  ];
  for (const raw of FIXTURES) for (const [path, fallback] of cases) for (const on of [true, false]) {
    assert.deepEqual(setEffectEnabled(raw, path, on), toggleEffect(raw, path, on, { fallback }), JSON.stringify({ raw, path, on }));
  }
});

test("per-role switches == legacy resumeEffect(default) / pauseEffect", () => {
  const cases: Array<[SwitchPath, unknown]> = [
    ["textRoles.name.gradient", { colors: ["#ffffff", "#8a8a96"], angle: 90 }],
    ["textRoles.bio.shimmer", { intensity: 0.45, speed: 1 }],
    ["textRoles.name.letterAnimation", { amplitude: 4, speed: 1, stagger: 0.05 }],
  ];
  for (const raw of FIXTURES) for (const [path, v] of cases) {
    assert.deepEqual(setEffectEnabled(raw, path, true), resumeEffect(raw, path as never, v));
    assert.deepEqual(setEffectEnabled(raw, path, false), pauseEffect(raw, path as never));
  }
});

test("'on' defaults are fresh copies, never the shared constant", () => {
  const a = setEffectEnabled(undefined, "textRoles.name.gradient", true);
  const g = a.textRoles!.name!.gradient!;
  assert.notEqual(g.colors, EFFECT_ON_DEFAULTS.textGradient.colors);
  assert.notEqual(setEffectEnabled(undefined, "gradient", true).gradient, GRADIENT_DEFAULT);
});

test("pure: never mutates its input", () => {
  for (const raw of FIXTURES) {
    const snapshot = JSON.stringify(raw);
    setEffectEnabled(raw, "shadow", true); setEffectEnabled(raw, "shadow", false);
    setEffectEnabled(raw, "pfp.shadow", false, "guns"); setEffectEnabled(raw, "text.glow", true);
    setGlowFlag(raw, getMusicCardEffects({ effects: raw }), "outer", true);
    setHoverGlow(raw, getMusicCardEffects({ effects: raw }), true);
    patchEffectGroup(raw, "border", { width: undefined });
    assert.equal(JSON.stringify(raw), snapshot);
  }
});

test("effectState: on = visible (effective), paused = stashed (raw), off = nothing to restore", () => {
  assert.equal(effectState({ shadow: { intensity: 0.3 } }, { shadow: { intensity: 0.3 } }, "shadow").status, "on");
  assert.equal(effectState({ shadow: { intensity: 0 } }, { shadow: { intensity: 0 } }, "shadow").status, "off");
  const paused = pauseEffect({ shadow: { intensity: 0.3 } }, "shadow");
  assert.deepEqual(effectState(paused, paused, "shadow"), { status: "paused", modified: false });
  assert.equal(effectState({ interactions: { hoverScale: 1 } }, { interactions: { hoverScale: 1 } }, "interactions.hoverScale").status, "off");
  // Legacy glow (Music default outer:true + legacy intensity) reads "on"
  // from the EFFECTIVE tree even though raw has no glow at all.
  const music = getMusicCardEffects({ glowIntensity: 0.5 });
  assert.deepEqual(effectState(undefined, music, "glow"), { status: "on", modified: false });
  // PFP shadow: guns renders a variant default with nothing stored.
  assert.equal(effectState(undefined, {}, "pfp.shadow", "guns").status, "on");
  assert.equal(effectState(undefined, {}, "pfp.shadow", "classic").status, "off");
});

test("off -> on round-trips the exact config for every switch path", () => {
  const raw: CardEffects = {
    shadow: { intensity: 0.4, blur: 7 }, gradient: { from: "#010101", to: "#020202", angle: 5, opacity: 0.2 },
    interactions: { hoverScale: 1.08 }, text: { shadow: { blur: 2 }, glow: { intensity: 0.3, color: "#abcdef" }, stroke: { width: 2 } },
    pfp: { shadow: { intensity: 0.5 }, glow: { intensity: 0.6, color: "#fedcba" } },
    textRoles: { name: { gradient: { colors: ["#000000", "#ffffff"], angle: 12 }, shimmer: { speed: 2 }, letterAnimation: { amplitude: 7 } } },
  };
  const paths: SwitchPath[] = ["shadow", "gradient", "interactions.hoverScale", "text.shadow", "text.glow", "text.stroke",
    "pfp.shadow", "pfp.glow", "textRoles.name.gradient", "textRoles.name.shimmer", "textRoles.name.letterAnimation"];
  for (const path of paths) {
    const back = setEffectEnabled(setEffectEnabled(raw, path, false, "classic"), path, true, "classic");
    assert.deepEqual(back, raw, path);
  }
});

test("bindEffect / effectActions write through the owner, read effective", () => {
  const writes: CardEffects[] = [];
  const raw: CardEffects = { shadow: { intensity: 0.2 } };
  const owner: EffectOwner = { kind: "music", raw, effective: getMusicCardEffects({ effects: raw }), write: n => writes.push(n) };
  const b = bindEffect<{ intensity: number }>(owner, "shadow");
  assert.equal(b.state.status, "on");
  assert.equal(b.value?.intensity, 0.2);
  b.setEnabled(false);
  assert.deepEqual(writes.at(-1), { paused: { shadow: { intensity: 0.2 } } });
  b.remove();
  assert.deepEqual(writes.at(-1), {});
  effectActions(owner).patch("border", { width: 3 });
  assert.deepEqual(writes.at(-1), { shadow: { intensity: 0.2 }, border: { width: 3 } });
  effectActions(owner).setGlowFlag("outer", true);
  assert.equal(writes.at(-1)?.glow?.color, GLOW_NEUTRAL_COLOR);
});

test("patchEffectGroup: clear deletes the key (legacy value shows the same after reload)", () => {
  assert.deepEqual(patchEffectGroup({ border: { color: "#ff0000", width: 2 } }, "border", { color: undefined }), { border: { width: 2 } });
});

test("setEffectEnabled refuses the card glow (it has two flags, not one switch)", () => {
  assert.throws(() => setEffectEnabled({}, "glow", true));
});

test("O4: each owner gets its own display defaults (Music: radius 10, tilt 5)", () => {
  assert.equal(displayDefaultsFor("music").radius, MUSIC_DEFAULT_RADIUS);
  assert.equal(getMusicCardEffects({}).border?.radius, displayDefaultsFor("music").radius);
  // useCardInteractions.ts: `tiltIntensity ?? (isProfileCard ? 10 : 5)`.
  const hook = readFileSync(join(process.cwd(), "src/hooks/useCardInteractions.ts"), "utf8");
  assert.ok(hook.includes(`tiltIntensity ?? (isProfileCard ? ${displayDefaultsFor("profile").tilt} : ${displayDefaultsFor("music").tilt})`));
});
