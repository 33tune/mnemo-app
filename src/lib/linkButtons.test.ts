// Link buttons (2026-10-14): sizing / style resolution (pure).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLinkButtonStyle, linkButtonsBlockSize, linkButtonCss, linkButtonHeight, contrastInk, linkButtonHref, stackedLinksAnchorY,
  LINK_BUTTON_FONT_SIZE,
} from "./linkButtons";

test("defaults: a card with no style gets pill, solid buttons in its own text color with readable ink", () => {
  const r = resolveLinkButtonStyle(undefined, "#2A1630");
  assert.equal(r.shape, "pill"); assert.equal(r.fill, "solid"); assert.equal(r.color, "#2A1630");
  assert.equal(r.textColor, "#FFFFFF", "white on a dark button");
  assert.equal(resolveLinkButtonStyle(undefined, "#F5F5F5").textColor, "#111111", "black on a light button");
  assert.equal(r.fontSize, LINK_BUTTON_FONT_SIZE.default);
  assert.equal(r.height, linkButtonHeight(r.fontSize));
  assert.equal(r.radius, Math.ceil(r.height / 2));
  assert.ok(r.showIcon && r.hover.lift && !r.hover.glow && !r.hover.invert);
  assert.equal(resolveLinkButtonStyle({ fill: "outline" }, "#2A1630").textColor, "#2A1630", "outline: label in the button color");
});

test("ranges are clamped; sizes stack the buttons with their gap", () => {
  assert.equal(resolveLinkButtonStyle({ fontSize: 99, gap: -3 }, "#000").fontSize, LINK_BUTTON_FONT_SIZE.max);
  const r = resolveLinkButtonStyle({ fontSize: 14, gap: 10 }, "#000");
  assert.deepEqual(linkButtonsBlockSize(3, r, 280), { width: 280, height: 3 * r.height + 2 * 10 });
  assert.deepEqual(linkButtonsBlockSize(0, r, 280), { width: 0, height: 0 });
});

test("css: solid / outline / glass, hover lift / glow / invert", () => {
  const solid = resolveLinkButtonStyle({ color: "#ff0000", textColor: "#ffffff" }, "#000");
  assert.equal(linkButtonCss(solid, "X").background, "#ff0000");
  assert.equal(linkButtonCss(solid, "X", true).transform, "translateY(-2px)");
  const inv = resolveLinkButtonStyle({ color: "#ff0000", textColor: "#ffffff", hover: { invert: true, lift: false } }, "#000");
  const h = linkButtonCss(inv, "X", true);
  assert.equal(h.background, "#ffffff"); assert.equal(h.color, "#ff0000"); assert.equal(h.transform, undefined);
  const outline = linkButtonCss(resolveLinkButtonStyle({ fill: "outline", color: "#00ff00" }, "#000"), "X");
  assert.equal(outline.background, "transparent");
  assert.match(String(outline.boxShadow), /inset 0 0 0 1\.5px #00ff00/);
  assert.equal(linkButtonCss(resolveLinkButtonStyle({ width: "fit" }, "#000"), "X").width, "auto");
});

test("helpers", () => {
  assert.equal(contrastInk("#000000"), "#FFFFFF");
  assert.equal(linkButtonHref("mara.land"), "https://mara.land");
  assert.equal(linkButtonHref("http://a.b"), "http://a.b");
  assert.equal(stackedLinksAnchorY({ boxH: 100, padding: 10, linksH: 200, buttonsH: 20 }), 1, "no room: bottom");
  const y = stackedLinksAnchorY({ boxH: 500, padding: 20, linksH: 24, buttonsH: 130 });
  // links bottom = 500 - 20 - 130 - 10 = 340 → top 316 → (316-20)/(460-24)
  assert.ok(Math.abs(y - 296 / 436) < 1e-9);
});
