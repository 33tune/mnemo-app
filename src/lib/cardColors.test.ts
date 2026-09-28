import { test } from "node:test";
import assert from "node:assert/strict";
import { luminance, withOpacity, resolveCardColors } from "./cardColors";

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
