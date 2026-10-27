import test from "node:test";
import assert from "node:assert/strict";
import type { CanvasState } from "@/types";
import { ogCardOf, drawableImage } from "./ogCard";

const state = (card: object, over: Partial<CanvasState> = {}) =>
  ({ profiles: [{ id: "p", isPublic: true, bgColor: "#ffffff", bgImage: "", borderRadius: 24, opacity: 1, ...card }], bgColor: "#123456", wallpaper: "", ...over }) as unknown as CanvasState;

test("the preview takes the public card's texts, photo and colors", () => {
  const og = ogCardOf(state({ name: "Mara", handle: "mara", status: "diseñadora", photo: "https://x/p.webp", pfpRadius: 40, nameColor: "#ff0000" }), "fallback")!;
  assert.equal(og.name, "Mara");
  assert.equal(og.handle, "mara");
  assert.equal(og.phrase, "diseñadora");
  assert.equal(og.photo, "https://x/p.webp");
  assert.equal(og.pfpRadius, "20%");
  assert.equal(og.bg, "#ffffff");
  assert.equal(og.radius, 24);
  assert.equal(og.nameColor, "#ff0000");
  assert.equal(og.roomBg, "#123456");
});

test("missing pieces fall back; blob/data/svg images are not drawn", () => {
  const og = ogCardOf(state({ name: "", handle: "", status: "", photo: "blob:abc" }), "nico")!;
  assert.equal(og.name, "nico");
  assert.equal(og.handle, "nico");
  assert.equal(og.photo, null);
  assert.equal(drawableImage("data:image/png;base64,xx"), null);
  assert.equal(drawableImage("https://x/a.svg"), null);
  assert.equal(ogCardOf({ profiles: [] } as unknown as CanvasState, "x"), null);
});
