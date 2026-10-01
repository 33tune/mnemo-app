import { test } from "node:test";
import assert from "node:assert/strict";
import { luminance, withOpacity, resolveCardColors, interpolateMulticolor, colorForLetterIndex, toHexInputValue, keepAlphaOf, colorAlpha } from "./cardColors";

test("withOpacity: converts hex to rgba with given alpha", () => {
  assert.equal(withOpacity("#ffffff", 0.5), "rgba(255,255,255,0.5)");
  assert.equal(withOpacity("#000000", 0.42), "rgba(0,0,0,0.42)");
});

test("withOpacity: passes through non-hex strings unchanged", () => {
  assert.equal(withOpacity("rgba(0,0,0,0.5)", 0.9), "rgba(0,0,0,0.5)");
});

test("luminance: white is bright, black is dark", () => {
  assert.ok(luminance("#ffffff") > 0.9);
  assert.ok(luminance("#000000") < 0.1);
});

test("luminance: invalid input returns 0", () => {
  assert.equal(luminance(""), 0);
  assert.equal(luminance("notahex"), 0);
});

test("resolveCardColors: no overrides matches ProfileCard.tsx's pre-existing hardcoded opacities", () => {
  const c = resolveCardColors("#ffffff");
  assert.equal(c.name, withOpacity("#ffffff", 0.95));
  assert.equal(c.handle, withOpacity("#ffffff", 0.45));
  assert.equal(c.descriptor, withOpacity("#ffffff", 0.72));
  assert.equal(c.location, withOpacity("#ffffff", 0.45));
  assert.equal(c.bio, withOpacity("#ffffff", 0.42));
  assert.equal(c.views, withOpacity("#ffffff", 0.45));
  assert.equal(c.linksIcon, withOpacity("#ffffff", 0.45));
});

test("resolveCardColors: partial override only changes that role", () => {
  const c = resolveCardColors("#ffffff", { name: "#ff0000" });
  assert.equal(c.name, "#ff0000");
  assert.equal(c.handle, withOpacity("#ffffff", 0.45));
});

test("resolveCardColors: full override matches every given hex exactly", () => {
  const overrides = {
    name: "#111111", handle: "#222222", descriptor: "#333333",
    location: "#444444", bio: "#555555", views: "#666666", linksIcon: "#777777",
  };
  const c = resolveCardColors("#ffffff", overrides);
  assert.deepEqual(c, overrides);
});

test("interpolateMulticolor: t=0 returns the first color, t=1 returns the last", () => {
  assert.equal(interpolateMulticolor(["#ff0000", "#00ff00", "#0000ff"], 0), "rgb(255,0,0)");
  assert.equal(interpolateMulticolor(["#ff0000", "#00ff00", "#0000ff"], 1), "rgb(0,0,255)");
});

test("interpolateMulticolor: t=0.5 across 3 colors lands exactly on the middle stop", () => {
  assert.equal(interpolateMulticolor(["#ff0000", "#00ff00", "#0000ff"], 0.5), "rgb(0,255,0)");
});

test("interpolateMulticolor: single color returns that color regardless of t", () => {
  assert.equal(interpolateMulticolor(["#123456"], 0.7), "#123456");
});

test("interpolateMulticolor: out-of-range t is clamped", () => {
  assert.equal(interpolateMulticolor(["#ff0000", "#0000ff"], -1), interpolateMulticolor(["#ff0000", "#0000ff"], 0));
  assert.equal(interpolateMulticolor(["#ff0000", "#0000ff"], 2), interpolateMulticolor(["#ff0000", "#0000ff"], 1));
});

test("colorForLetterIndex: first and last character map to the first and last stop", () => {
  const colors = ["#ff0000", "#00ff00", "#0000ff"];
  assert.equal(colorForLetterIndex(colors, 0, 5), interpolateMulticolor(colors, 0));
  assert.equal(colorForLetterIndex(colors, 4, 5), interpolateMulticolor(colors, 1));
});

test("colorForLetterIndex: a single-character string returns the first stop", () => {
  assert.equal(colorForLetterIndex(["#ff0000", "#0000ff"], 0, 1), "#ff0000");
});

test("toHexInputValue: normalizes every renderer color format to #rrggbb for <input type=color>", () => {
  assert.equal(toHexInputValue("#ABCDEF"), "#abcdef");
  assert.equal(toHexInputValue("#fff"), "#ffffff");
  assert.equal(toHexInputValue("#11223344"), "#112233");
  assert.equal(toHexInputValue("rgba(255,255,255,0.45)"), "#ffffff");
  assert.equal(toHexInputValue("rgb(15, 15, 15)"), "#0f0f0f");
  assert.equal(toHexInputValue(withOpacity("#a855f7", 0.3)), "#a855f7");
  assert.equal(toHexInputValue("red"), undefined);
  assert.equal(toHexInputValue(undefined), undefined);
});

test("keepAlphaOf: preserves a translucent previous alpha, passes opaque through", () => {
  assert.equal(keepAlphaOf("#ff0000", "rgba(255,255,255,0.08)"), "rgba(255,0,0,0.08)");
  assert.equal(keepAlphaOf("#ff0000", "#ffffff"), "#ff0000");
  assert.equal(keepAlphaOf("#ff0000", undefined), "#ff0000");
  assert.equal(keepAlphaOf("#00ff00", "#ffffff80"), "rgba(0,255,0,0.502)");
  assert.equal(colorAlpha("rgba(1,2,3,0.055)"), 0.055);
  assert.equal(colorAlpha("rgb(1,2,3)"), 1);
});
