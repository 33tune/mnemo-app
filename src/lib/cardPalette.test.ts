import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupePalette, parseRgb, cardPalette } from "./cardPalette";
import type { ProfileCardData } from "@/types";

test("parseRgb reads hex (3/6/8) and rgb()/rgba()", () => {
  assert.deepEqual(parseRgb("#fff"), [255, 255, 255]);
  assert.deepEqual(parseRgb("#FF4F94"), [255, 79, 148]);
  assert.deepEqual(parseRgb("#FF4F9480"), [255, 79, 148]);
  assert.deepEqual(parseRgb("rgba(255,255,255,0.055)"), [255, 255, 255]);
  assert.equal(parseRgb("transparent"), null);
  assert.equal(parseRgb(undefined), null);
});

test("dedupePalette drops near-duplicates, keeps order, caps at 5, uppercase hex", () => {
  assert.deepEqual(dedupePalette(["#ff4f94", "#FF5095", "#7c5cff", null, "", "#000", "#fff", "#123456", "#abcdef", "#00ff00"]),
    ["#FF4F94", "#7C5CFF", "#000000", "#FFFFFF", "#123456"]);
});

test("cardPalette derives the card's own colors and never writes", () => {
  const card = {
    id: "c", nameColor: "#FF4F94", bgColor: "#000000",
    effects: { bg: { color: "#FFF7FB" }, glow: { color: "#7C5CFF", outer: true, intensity: 0.5 } },
  } as unknown as ProfileCardData;
  const before = JSON.stringify(card);
  const p = cardPalette(card);
  assert.equal(p[0], "#FFF7FB");
  assert.ok(p.includes("#FF4F94") && p.includes("#7C5CFF"));
  assert.ok(p.length <= 5);
  assert.equal(JSON.stringify(card), before);
});
