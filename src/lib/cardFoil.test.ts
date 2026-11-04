import type React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  holoOn, glareOn, lightEffectsOn, holoSheetStyle, glareStyle, entranceAnimation, entranceShineAnimation,
  entranceDuration, holoGradient, HOLO_PALETTES, HOLO_STYLES, ENTRANCE_STYLES, lightIdleOn, holoStyleOf, holoScopeOf,
  borderStrips, strassPoints, glitterSparkles, withEmboss, embossLight, embossFilterId,
} from "./cardFoil";

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

test("every foil and entrance has a palette / label", () => {
  for (const s of HOLO_STYLES) {
    assert.ok(HOLO_PALETTES[s.id].length >= 3);
    assert.match(holoGradient(s.id), /^repeating-linear-gradient\(115deg/);
    const st = holoSheetStyle({ holo: { enabled: true, style: s.id } }, false, { w: 300, h: 400, ox: 10, oy: 20 });
    assert.equal(st.width, 300);
    assert.equal(st.left, -10);
    assert.ok(String(st.backgroundImage).length > 20);
    assert.match(String(st.opacity), /var\(--la/);
  }
  for (const e of ENTRANCE_STYLES) {
    const a = entranceAnimation({ entrance: { enabled: true, style: e.id } }, 80);
    assert.ok(a?.startsWith(`mnemo-enter-${e.id} 0.9s`), a);
    assert.ok(a?.endsWith("80ms backwards"));
  }
});

test("foil follows the light vars; idle can be turned off", () => {
  const st = holoSheetStyle({ holo: { enabled: true } });
  assert.match(String(st.backgroundPosition), /var\(--lx/);
  assert.match(String(st.maskImage), /var\(--lx/);
  assert.equal(lightIdleOn({ holo: { enabled: true } }), true);
  assert.equal(lightIdleOn({ holo: { enabled: true, idle: false } }), false);
  assert.match(String(glareStyle({ glare: { enabled: true } }).backgroundImage), /var\(--lx/);
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

test("border ring: 4 strips covering the edge, inside the card", () => {
  const s = borderStrips(300, 400, 20);
  assert.equal(s.length, 4);
  for (const r of s) assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 300 && r.y + r.h <= 400);
  const area = s.reduce((a, r) => a + r.w * r.h, 0);
  assert.equal(area, 300 * 400 - 260 * 360);
});

test("strass: stones all around the border, inside the card", () => {
  const pts = strassPoints(300, 400, 24, 9, 0.5);
  assert.ok(pts.length >= 30);
  for (const p of pts) assert.ok(p.x > 0 && p.x < 300 && p.y > 0 && p.y < 400, JSON.stringify(p));
  assert.ok(pts.some(p => p.y < 20) && pts.some(p => p.y > 380) && pts.some(p => p.x < 20) && pts.some(p => p.x > 280));
  assert.ok(strassPoints(300, 400, 24, 9, 1).length < pts.length, "more gap = fewer stones");
});

test("relief: a lighting filter on the texts, lit from the light point", () => {
  const st = withEmboss({ filter: "blur(1px)" }, { emboss: { enabled: true } }, "c 1");
  assert.equal(st.filter, `blur(1px) url(#${embossFilterId("c 1")})`);
  assert.equal(embossFilterId("c 1"), "mnemo-emboss-c1");
  assert.deepEqual(withEmboss({}, {}, "c"), {});
  const right = embossLight(1, 0.5), top = embossLight(0.5, 0);
  assert.equal(Math.round(right.azimuth), 0);
  assert.equal(Math.round(top.azimuth), -90);
  assert.ok(embossLight(0.5, 0.5).elevation > right.elevation, "light overhead = higher");
});

test("glitter: small sparkles, same ones every render, never huge", () => {
  const fx = { glitter: { enabled: true, size: 1 } };
  const a = glitterSparkles(200, 30, fx, 3), b = glitterSparkles(200, 30, fx, 3);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 4 && a.length <= 30);
  assert.ok(a.every(s => s.size <= 11), "max size stays small");
});
