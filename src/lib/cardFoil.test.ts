import { test } from "node:test";
import assert from "node:assert/strict";
import {
  holoOn, glareOn, lightEffectsOn, holoSheetStyle, glareStyle, entranceAnimation, entranceShineAnimation,
  entranceDuration, holoGradient, HOLO_PALETTES, HOLO_STYLES, ENTRANCE_STYLES,
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
    const st = holoSheetStyle({ holo: { enabled: true, style: s.id } });
    assert.equal(st.inset, "-50%");
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
  assert.match(String(st.transform), /var\(--lx/);
  assert.match(String(st.animation), /mnemo-holo-idle/);
  assert.equal(holoSheetStyle({ holo: { enabled: true, idle: false } }).animation, undefined);
  assert.match(String(glareStyle({ glare: { enabled: true } }).backgroundImage), /var\(--lx/);
});

test("entrance duration is clamped; the sweep comes after the entrance", () => {
  assert.equal(entranceDuration({ entrance: { duration: 10 } }), 3);
  assert.equal(entranceDuration({ entrance: { duration: 0 } }), 0.3);
  const s = entranceShineAnimation({ entrance: { enabled: true, shine: true, duration: 1 } }, 100);
  assert.match(String(s), /mnemo-entrance-shine 1\.1s .* 800ms both/);
});
