import { test } from "node:test";
import assert from "node:assert/strict";
import { parseColor, parseHexInput, rgbToHsv, hsvToRgb, rgbToHex, formatColor, toHsva } from "./colorModel";

test("parseColor: hex forms", () => {
  assert.deepEqual(parseColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor("#FF0000"), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseColor("#00ff0080"), { r: 0, g: 255, b: 0, a: 0.502 });
  assert.deepEqual(parseColor("#0008"), { r: 0, g: 0, b: 0, a: 0.533 });
});

test("parseColor: rgb()/rgba() (withOpacity's shape)", () => {
  assert.deepEqual(parseColor("rgba(255,255,255,0.14)"), { r: 255, g: 255, b: 255, a: 0.14 });
  assert.deepEqual(parseColor("rgb(10, 20, 30)"), { r: 10, g: 20, b: 30, a: 1 });
  assert.deepEqual(parseColor("rgba(300,0,0,2)"), { r: 255, g: 0, b: 0, a: 1 });
});

test("parseColor: rejects unparseable input", () => {
  assert.equal(parseColor(""), null);
  assert.equal(parseColor(undefined), null);
  assert.equal(parseColor("red"), null);
  assert.equal(parseColor("#12345"), null);
  assert.equal(parseColor("linear-gradient(red, blue)"), null);
});

test("parseHexInput: alpha only when typed", () => {
  assert.deepEqual(parseHexInput("ff0000"), { r: 255, g: 0, b: 0 });
  assert.deepEqual(parseHexInput("#abc"), { r: 170, g: 187, b: 204 });
  assert.equal(parseHexInput("#ff000080")?.a, 0.502);
  assert.equal(parseHexInput("zzz"), null);
  assert.equal(parseHexInput("#12345"), null);
});

test("rgb <-> hsv round trip on primaries and greys", () => {
  for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#808080", "#8a8a96", "#a855f7", "#141416"]) {
    const rgb = parseColor(hex)!;
    assert.equal(rgbToHex(hsvToRgb(rgbToHsv(rgb))), hex, hex);
  }
});

test("rgbToHsv: known values", () => {
  const red = rgbToHsv({ r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual([red.h, red.s, red.v], [0, 1, 1]);
  const blue = rgbToHsv({ r: 0, g: 0, b: 255, a: 0.5 });
  assert.deepEqual([blue.h, blue.s, blue.v, blue.a], [240, 1, 1, 0.5]);
  const grey = rgbToHsv({ r: 128, g: 128, b: 128, a: 1 });
  assert.equal(grey.s, 0);
});

test("hsvToRgb: hue wraps", () => {
  assert.deepEqual(hsvToRgb({ h: 360, s: 1, v: 1, a: 1 }), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(hsvToRgb({ h: -120, s: 1, v: 1, a: 1 }), { r: 0, g: 0, b: 255, a: 1 });
});

test("formatColor: hex when opaque, rgba() when translucent, hex when alpha disallowed", () => {
  assert.equal(formatColor({ r: 255, g: 0, b: 0, a: 1 }), "#ff0000");
  assert.equal(formatColor({ r: 255, g: 0, b: 0, a: 0.25 }), "rgba(255,0,0,0.25)");
  assert.equal(formatColor({ r: 255, g: 0, b: 0, a: 0.33333 }), "rgba(255,0,0,0.333)");
  assert.equal(formatColor({ r: 255, g: 0, b: 0, a: 0.25 }, false), "#ff0000");
});

test("formatColor(parseColor(x)) is stable for the stored shapes", () => {
  for (const s of ["#a855f7", "rgba(255,255,255,0.14)", "rgba(0,0,0,0.5)"]) {
    assert.equal(formatColor(parseColor(s)!), s);
  }
});

test("toHsva: unparseable falls back to opaque white", () => {
  const w = toHsva("not-a-color");
  assert.deepEqual([w.s, w.v, w.a], [0, 1, 1]);
});
