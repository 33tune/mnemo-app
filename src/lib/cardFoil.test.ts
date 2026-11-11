import type React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  holoOn, glareOn, lightEffectsOn, lightGyroOn, holoLayers, holoGroupStyle, holoColors, glareLayers, glareGroupStyle, entranceAnimation,
  entranceShineAnimation, entranceDuration, holoSwatch, HOLO_PALETTES, HOLO_STYLES, ENTRANCE_STYLES, lightIdleOn, holoStyleOf, holoScopeOf,
  ringMask, strassPoints, strassColors, glitterSparkles, glitterColors,
} from "./cardFoil";
import { lightTransform, lm } from "./lightLayers";
import { fxColors, cleanColors, loopColors, FX_PALETTES, mixHex } from "./fxPalette";
import {
  motionAnimations, sweepKeyframes, borderRunSpec, auraSpec, dustLayers, edgeSpec, sealSpec, sealText, sparkleField, depthLm, jellyFrames,
  fxKeyframesOn, TWINKLE_LAYERS,
} from "./cardFx";

test("absent / disabled = off (no existing card changes)", () => {
  assert.equal(lightEffectsOn(undefined), false);
  assert.equal(lightEffectsOn({}), false);
  assert.equal(holoOn({ holo: { enabled: false, intensity: 1 } }), false);
  assert.equal(holoOn({ holo: { enabled: true, intensity: 0 } }), false);
  assert.equal(glareOn({ glare: { enabled: true } }), true);
  assert.equal(entranceAnimation(undefined), undefined);
  assert.equal(entranceAnimation({ entrance: { style: "pop" } }), undefined, "needs enabled");
  assert.equal(entranceShineAnimation({ entrance: { shine: true } }), undefined);
});

const BOX = { w: 300, h: 400 };

test("every foil and entrance has a palette / label", () => {
  for (const s of HOLO_STYLES) {
    assert.ok(HOLO_PALETTES[s.id].length >= 3);
    assert.match(holoSwatch(s.id), /^linear-gradient\(115deg/);
    const layers = holoLayers({ holo: { enabled: true, style: s.id } }, BOX);
    assert.ok(layers.length >= 3, s.id);
    assert.equal(layers[layers.length - 1].key, "falloff");
    assert.match(String(holoGroupStyle({ holo: { enabled: true, style: s.id } }).opacity), /var\(--la/);
  }
  for (const e of ENTRANCE_STYLES) {
    const a = entranceAnimation({ entrance: { enabled: true, style: e.id } }, 80);
    assert.ok(a?.startsWith(`mnemo-enter-${e.id} 0.9s`), a);
    assert.ok(a?.endsWith("80ms backwards"));
  }
});

test("performance contract: no layer reads a CSS variable — the light only moves them (transform)", () => {
  for (const s of HOLO_STYLES) {
    for (const light of [false, true]) {
      const layers = holoLayers({ holo: { enabled: true, style: s.id, palette: "neon", scale: 1.5, angle: 30 } }, BOX, light);
      for (const l of layers) {
        assert.ok(!JSON.stringify(l.style).includes("var(--"), `${s.id}/${l.key} repaints with the light`);
        // What moves is on its own compositor layer and says how it moves.
        if (l.lm) assert.equal(l.style.willChange, "transform", `${s.id}/${l.key}`);
      }
      assert.ok(layers.filter(l => l.lm).length >= 2, `${s.id}: colors and falloff follow the light`);
    }
  }
  for (const l of glareLayers({ glare: { enabled: true } }, BOX)) {
    assert.ok(!JSON.stringify(l.style).includes("var(--") && !!l.lm, l.key);
  }
  for (const l of edgeSpec({ edge: { enabled: true } }, BOX)!.layers) assert.ok(!JSON.stringify(l.style).includes("var(--"));
  // Only the "held" brightness is a variable, and it changes on enter / leave.
  assert.match(String(glareGroupStyle({ glare: { enabled: true } }).opacity), /var\(--la/);
});

test("light layers: periodic bands wrap (small bleed), followers sit on the light", () => {
  const spec = lm.shift(90, 2, 0, 100);
  // A full period of travel lands on the same picture.
  assert.equal(lightTransform(spec, { x: 0.5, y: 0.5, px: 0, py: 0 }), "translate(0px, 0px)");
  assert.equal(lightTransform(spec, { x: 1, y: 0.5, px: 0, py: 0 }), lightTransform(spec, { x: 0.5, y: 0.5, px: 0, py: 0 }));
  const m = /translate\((-?[\d.]+)px/.exec(lightTransform(spec, { x: 0.62, y: 0.5, px: 0, py: 0 }))!;
  assert.ok(Math.abs(Number(m[1])) <= 50, "never past half a period");
  assert.equal(lightTransform(lm.follow(300, 400), { x: 0.5, y: 0.25, px: 0, py: 0 }), "translate(150px, 100px)");
  assert.equal(lightTransform(lm.counter(300, 400), { x: 0.5, y: 0.25, px: 0, py: 0 }), "translate(-150px, -100px)");
  assert.match(lightTransform(lm.rot(0, 90, 0), { x: 1, y: 0.5, px: 0, py: 0 }), /^rotate\(45deg\)$/);
  // The photo's depth follows the pointer, not the (possibly drifting) light.
  assert.equal(lightTransform(lm.par(10, 1.1), { x: 0.9, y: 0.9, px: 0, py: 0 }), "translate(0px, 0px) scale(1.1)");
  assert.equal(lightTransform(lm.par(10, 1.1), { x: 0.5, y: 0.5, px: 1, py: -1 }), "translate(-10px, 10px) scale(1.1)");
  assert.equal(lightTransform("nonsense", { x: 0, y: 0, px: 0, py: 0 }), "none");
});

test("palettes: absent = the effect's own look (saved cards unchanged); custom is cleaned", () => {
  assert.deepEqual(fxColors(undefined, ["#111111", "#222222"]), ["#111111", "#222222"]);
  assert.deepEqual(fxColors({ palette: "fire" }, ["#111111"]), FX_PALETTES.fire);
  assert.deepEqual(fxColors({ palette: "custom", colors: ["#abc", "red", "url(x)", "#123456"] }, []), ["#abc", "#123456"]);
  assert.equal(fxColors({ palette: "custom", colors: [] }, []).length, 2);
  assert.deepEqual(fxColors({ palette: "card" }, ["#111111", "#222222"], ["#ff0000", "#00ff00"]), ["#ff0000", "#00ff00"]);
  assert.deepEqual(fxColors({ palette: "card" }, ["#111111", "#222222"], []), ["#111111", "#222222"], "a card with no colors falls back");
  assert.deepEqual(cleanColors(["#fff", "javascript:1", 3, "#12345678"]), ["#fff", "#12345678"]);
  assert.deepEqual(loopColors(["#a00000", "#00b000"]), ["#a00000", "#00b000", "#a00000"]);
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
  // Holo: no palette = the finish's own colors, exactly.
  assert.deepEqual(holoColors({ holo: { enabled: true, style: "rays" } }), HOLO_PALETTES.rays);
  assert.deepEqual(glitterColors({ glitter: { enabled: true } }), ["#ffffff", "#f1f4ff"]);
  assert.deepEqual(strassColors({ strass: { enabled: true, color: "gold" } }), ["#f2c14e"]);
  assert.equal(strassColors({ strass: { enabled: true, palette: "ice" } }).length, FX_PALETTES.ice.length);
});

test("foil follows the light; idle can be turned off; glitter alone does not ask for the gyroscope", () => {
  assert.equal(lightIdleOn({ holo: { enabled: true } }), true);
  assert.equal(lightIdleOn({ holo: { enabled: true, idle: false } }), false);
  assert.equal(lightEffectsOn({ glitter: { enabled: true } }), true);
  assert.equal(lightGyroOn({ glitter: { enabled: true } }), false);
  assert.equal(lightGyroOn({ depth: { enabled: true } }), true);
  assert.equal(lightIdleOn({ depth: { enabled: true } }), false, "the photo never drifts by itself");
});

test("entrance duration is clamped; the sweep comes after the entrance", () => {
  assert.equal(entranceDuration({ entrance: { duration: 10 } }), 3);
  assert.equal(entranceDuration({ entrance: { duration: 0 } }), 0.3);
  const s = entranceShineAnimation({ entrance: { enabled: true, shine: true, duration: 1 } }, 100);
  assert.match(String(s), /mnemo-entrance-shine 1\.1s .* 800ms both/);
});

test("old finishes map to the closest real one; scopes default to the whole card", () => {
  assert.equal(holoStyleOf({ holo: { enabled: true, style: "galaxy" } }), "mojo");
  assert.equal(holoStyleOf({ holo: { enabled: true, style: "glitter" } }), "cracked");
  assert.equal(holoStyleOf({ holo: { enabled: true, style: "metal" } }), "refractor");
  assert.equal(holoStyleOf({ holo: { enabled: true, style: "gold" } }), "gold");
  assert.equal(holoStyleOf(undefined), "rainbow");
  assert.equal(holoScopeOf({ holo: { enabled: true } }), "card");
  assert.equal(holoScopeOf({ holo: { enabled: true, scope: "border" } }), "border");
});

test("border ring: a static mask, padding = the ring's width", () => {
  const m = ringMask(12) as Record<string, unknown>;
  assert.equal(m.padding, 12);
  assert.equal(m.maskComposite, "exclude");
  assert.equal(m.WebkitMaskComposite, "xor");
});

test("strass: stones all around the border, inside the card", () => {
  const pts = strassPoints(300, 400, 24, 9, 0.5);
  assert.ok(pts.length >= 30);
  for (const p of pts) assert.ok(p.x > 0 && p.x < 300 && p.y > 0 && p.y < 400, JSON.stringify(p));
  assert.ok(pts.some(p => p.y < 20) && pts.some(p => p.y > 380) && pts.some(p => p.x < 20) && pts.some(p => p.x > 280));
  assert.ok(strassPoints(300, 400, 24, 9, 1).length < pts.length, "more gap = fewer stones");
});

test("glitter: small sparkles, same ones every render, never huge", () => {
  const fx = { glitter: { enabled: true, size: 1 } };
  const a = glitterSparkles(200, 30, fx, 3), b = glitterSparkles(200, 30, fx, 3);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 4 && a.length <= 30);
  assert.ok(a.every(s => s.size <= 11), "max size stays small");
});

test("new effects: absent = nothing is drawn or animated", () => {
  assert.equal(fxKeyframesOn(undefined), false);
  assert.equal(fxKeyframesOn({ holo: { enabled: true } }), false);
  assert.deepEqual(motionAnimations(undefined), { outer: [], inner: [], vars: {} });
  assert.deepEqual(motionAnimations({ motion: { breathe: { enabled: false, amount: 1 } } }), { outer: [], inner: [], vars: {} });
  assert.equal(sweepKeyframes("c", {}), null);
  assert.equal(borderRunSpec({}, BOX), null);
  assert.equal(auraSpec({}, BOX), null);
  assert.deepEqual(dustLayers({}, BOX), []);
  assert.equal(edgeSpec({}, BOX), null);
  assert.equal(sealSpec({}, BOX), null);
  assert.equal(depthLm({}, 100), undefined);
});

test("card animations: only transform / opacity properties, on the right wrapper", () => {
  const m = motionAnimations({ motion: { breathe: { enabled: true }, sway: { enabled: true, speed: 2 }, heartbeat: { enabled: true } } });
  assert.equal(m.outer.length, 2, "Respirar and Balanceo ride with Flotar (scale / rotate, not transform)");
  assert.equal(m.inner.length, 1, "Latido on the hover-scale wrapper");
  assert.match(m.outer[1], /^mnemo-sway 2\.50s/);
  assert.ok(Number(m.vars["--mo-breathe"]) > 1 && Number(m.vars["--mo-breathe"]) < 1.06);
  const sw = sweepKeyframes("abc", { motion: { sweep: { enabled: true, interval: 4 } } })!;
  assert.match(sw.css, /@keyframes mnemo-sweep-abc\{0%\{translate:-130% 0/);
  assert.match(sw.css, /prefers-reduced-motion/);
  assert.match(sw.animation, /^mnemo-sweep-abc 4\.00s/);
  assert.equal(sweepKeyframes("abc", { motion: { sweep: { enabled: true, interval: 0.1 } } })!.animation.includes(" 2.00s "), true, "interval clamped");
  for (const f of jellyFrames({ motion: { jelly: { enabled: true, amount: 1 } } })) assert.match(String(f.transform), /^scale\(/);
});

test("seal text is at most 3 characters; sparkle field is split in twinkling sheets", () => {
  assert.equal(sealText({ seal: { enabled: true, text: "ABCDE" } }), "ABC");
  assert.equal(sealText({ seal: { enabled: true, text: "  " } }), "★");
  const f = sparkleField({ glitter: { enabled: true, amount: 1 } }, BOX, "card");
  assert.equal(f.layers.length, TWINKLE_LAYERS);
  for (const l of f.layers) assert.match(l.animation, /^mnemo-twinkle /);
  assert.ok(f.lit.startsWith('url("data:image/svg+xml,'));
  assert.deepEqual(sparkleField({ glitter: { enabled: true } }, BOX, "border"), sparkleField({ glitter: { enabled: true } }, BOX, "border"), "deterministic");
});
