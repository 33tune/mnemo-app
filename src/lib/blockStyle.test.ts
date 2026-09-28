import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBlockStyle } from "./blockStyle";

test("resolveBlockStyle: absent blockStyle inherits — bg/textColor/iconColor undefined, radius is the block's own pre-existing default", () => {
  assert.deepEqual(resolveBlockStyle({}, "identity"), { bg: undefined, textColor: undefined, iconColor: undefined, radius: 2 });
  assert.deepEqual(resolveBlockStyle({}, "location"), { bg: undefined, textColor: undefined, iconColor: undefined, radius: 2 });
  assert.deepEqual(resolveBlockStyle({}, "views"), { bg: undefined, textColor: undefined, iconColor: undefined, radius: 2 });
  assert.deepEqual(resolveBlockStyle({}, "links"), { bg: undefined, textColor: undefined, iconColor: undefined, radius: 2 });
  assert.deepEqual(resolveBlockStyle({}, "music"), { bg: undefined, textColor: undefined, iconColor: undefined, radius: 6 });
});

test("resolveBlockStyle: override for one block never affects another", () => {
  const card = { blockStyle: { music: { bg: "#111111" } } };
  assert.equal(resolveBlockStyle(card, "music").bg, "#111111");
  assert.equal(resolveBlockStyle(card, "location").bg, undefined);
});

test("resolveBlockStyle: partial override only replaces the given fields, radius keeps its block default", () => {
  const card = { blockStyle: { location: { textColor: "#ff0000" } } };
  const resolved = resolveBlockStyle(card, "location");
  assert.equal(resolved.textColor, "#ff0000");
  assert.equal(resolved.bg, undefined);
  assert.equal(resolved.radius, 2);
});

test("resolveBlockStyle: explicit radius override wins over the block default", () => {
  const card = { blockStyle: { music: { radius: 12 } } };
  assert.equal(resolveBlockStyle(card, "music").radius, 12);
});
