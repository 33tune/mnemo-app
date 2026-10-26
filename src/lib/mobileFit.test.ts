import test from "node:test";
import assert from "node:assert/strict";
import type { CanvasState } from "@/types";
import { fitRoomToCard, haloMargin, mobileFitScale, rotatedBox, MOBILE_GUTTER, MOBILE_MAX_SCALE } from "./mobileFit";

const base = (over: Partial<CanvasState>): CanvasState => ({
  cards: [], images: [], texts: [], galleries: [], profiles: [], medias: [], guestbooks: [], socialCards: [],
  musicCards: [], linksCards: [], statsCards: [], bgColor: "#000", wallpaper: "", ...over,
}) as CanvasState;

const card = { id: "p", x: 800, y: 300, w: 300, h: 400, isPublic: true } as never;
const img = (id: string, x: number, y: number, w = 100, h = 100, extra = {}) =>
  ({ id, src: "https://x/y.png", x, y, w, h, rotation: 0, isPublic: true, zIndex: 1, layer: 1, depth: 0, ...extra }) as never;

test("keeps the card and what touches its halo; drops the rest of the room", () => {
  const m = haloMargin({ x: 0, y: 0, w: 300, h: 400 });
  const s = base({
    profiles: [card],
    images: [
      img("frame", 780, 280, 340, 440),              // a frame over the card
      img("near", 800 + 300 + m - 10, 400),          // just inside the halo
      img("far", 100, 100),                          // the other side of the room
      img("private", 820, 320, 50, 50, { isPublic: false }),
    ],
  });
  const fit = fitRoomToCard(s);
  assert.deepEqual(fit.state.images.map((i: { id: string }) => i.id), ["frame", "near"]);
  assert.equal(fit.focusX, 950);
  assert.equal(fit.cardW, 300);
  assert.ok(fit.crop.x <= 780 && fit.crop.x + fit.crop.w >= 1100 + m - 10);
});

test("a huge image behind the card is clipped to the reach, it never zooms the card out", () => {
  const fit = fitRoomToCard(base({ profiles: [card], images: [img("bg", 0, 0, 1920, 1080)] }));
  assert.equal(fit.state.images.length, 1);
  assert.equal(fit.crop.x, 800 - 300 * 0.6);
  assert.equal(fit.crop.w, 300 * 2.2);
});

test("Music away from the card is docked under it, centered; near Music stays where it is", () => {
  const far = { id: "m1", x: 50, y: 50, w: 260, h: 64, rotation: 8, isPublic: true } as never;
  const near = { id: "m2", x: 820, y: 720, w: 200, h: 64, rotation: 0, isPublic: true } as never;
  const fit = fitRoomToCard(base({ profiles: [card], musicCards: [far, near] }));
  const [kept, docked] = fit.state.musicCards as { id: string; x: number; y: number; rotation: number }[];
  assert.equal(kept.id, "m2");
  assert.equal(docked.id, "m1");
  assert.equal(docked.x, 950 - 130);
  assert.ok(docked.y >= 784 + 24, "under the near Music");
  assert.equal(docked.rotation, 0);
  assert.ok(fit.crop.y + fit.crop.h >= docked.y + 64);
});

test("free text is boxed from its content; private card falls back to everything public", () => {
  const t = { id: "t", x: 760, y: 260, content: "hola", size: 20, rotation: 0, isPublic: true } as never;
  assert.equal(fitRoomToCard(base({ profiles: [card], texts: [t] })).state.texts.length, 1);
  const fit = fitRoomToCard(base({ profiles: [{ ...(card as object), isPublic: false } as never], images: [img("a", 10, 10)] }));
  assert.deepEqual(fit.crop, { x: 10, y: 10, w: 100, h: 100 });
});

test("the source state is never mutated", () => {
  const s = base({ profiles: [card], musicCards: [{ id: "m", x: 0, y: 0, w: 100, h: 64, isPublic: true } as never] });
  const before = JSON.stringify(s);
  fitRoomToCard(s);
  assert.equal(JSON.stringify(s), before);
});

test("scale: fits the crop, never shrinks the card below the screen, small cards grow up to the cap", () => {
  const vw = 390, avail = vw - 2 * MOBILE_GUTTER;
  // crop wider than the screen but the card fits: the card at its real size.
  assert.equal(mobileFitScale(vw, { x: 0, y: 0, w: 600, h: 500 }, 340), 1);
  // a big card: it fits the screen (smaller than 1).
  assert.equal(mobileFitScale(vw, { x: 0, y: 0, w: 640, h: 500 }, 640), avail / 640);
  // a small card and crop: grows, capped.
  assert.equal(mobileFitScale(vw, { x: 0, y: 0, w: 200, h: 300 }, 200), MOBILE_MAX_SCALE);
  // a small card inside a wider crop: the whole crop fits.
  assert.equal(mobileFitScale(vw, { x: 0, y: 0, w: 320, h: 300 }, 240), avail / 320);
});

test("rotatedBox keeps the center", () => {
  const r = rotatedBox({ x: 0, y: 0, w: 100, h: 50 }, 90);
  assert.ok(Math.abs(r.w - 50) < 1e-9 && Math.abs(r.h - 100) < 1e-9 && Math.abs(r.x - 25) < 1e-9);
});
