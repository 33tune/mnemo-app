import test from "node:test";
import assert from "node:assert/strict";
import type { CanvasState } from "@/types";
import { fitRoomToCard, haloMargin, mobileView, rotatedBox, MOBILE_GUTTER, MOBILE_MAX_SCALE, LEGIBLE } from "./mobileFit";

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
  assert.deepEqual(fit.card, { x: 800, y: 300, w: 300, h: 400 });
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

test("no scroll: the whole crop when the card stays legible, else the card fills the screen; centered", () => {
  const vw = 390, vh = 700, aw = vw - 2 * MOBILE_GUTTER, ah = vh - 2 * MOBILE_GUTTER;
  const card = { x: 100, y: 100, w: 300, h: 500 };
  // crop a bit bigger than the card: all of it fits, centered on it
  const crop = { x: 80, y: 80, w: 340, h: 540 };
  const a = mobileView(vw, vh, { crop, card });
  assert.equal(a.s, Math.min(aw / crop.w, ah / crop.h));
  assert.ok(Math.abs(a.tx + (crop.x + crop.w / 2) * a.s - vw / 2) < 1e-9 && Math.abs(a.ty + (crop.y + crop.h / 2) * a.s - vh / 2) < 1e-9);
  assert.ok(crop.h * a.s <= ah + 1e-9 && crop.w * a.s <= aw + 1e-9, "never taller or wider than the screen");
  // a crop much bigger than the card: the card fills the screen, centered on the card
  const huge = { x: -500, y: -500, w: 1400, h: 1600 };
  const b = mobileView(vw, vh, { crop: huge, card });
  assert.equal(b.s, Math.min(aw / card.w, ah / card.h));
  assert.ok(Math.min(aw / huge.w, ah / huge.h) < b.s * LEGIBLE);
  assert.ok(Math.abs(b.ty + (card.y + card.h / 2) * b.s - vh / 2) < 1e-9);
  // a tiny card never grows past the cap
  assert.equal(mobileView(vw, vh, { crop: { x: 0, y: 0, w: 100, h: 100 }, card: { x: 0, y: 0, w: 100, h: 100 } }).s, MOBILE_MAX_SCALE);
});

test("rotatedBox keeps the center", () => {
  const r = rotatedBox({ x: 0, y: 0, w: 100, h: 50 }, 90);
  assert.ok(Math.abs(r.w - 50) < 1e-9 && Math.abs(r.h - 100) < 1e-9 && Math.abs(r.x - 25) < 1e-9);
});

test("the card's stickers are always fully in the crop", () => {
  const withFrame = { ...(card as object), stickers: [{ id: "f", src: "https://x/f.png", x: -0.24, y: -0.24, w: 1.48, aspect: 1.2, front: true }] } as never;
  const fit = fitRoomToCard(base({ profiles: [withFrame] }));
  const left = 800 - 0.24 * 300, top = 300 - 0.24 * 400, right = left + 1.48 * 300, bottom = top + 1.48 * 300 * 1.2;
  assert.ok(fit.crop.x <= left && fit.crop.y <= top, JSON.stringify(fit.crop));
  assert.ok(fit.crop.x + fit.crop.w >= right - 1e-9 && fit.crop.y + fit.crop.h >= bottom - 1e-9, JSON.stringify(fit.crop));
  // when the card fills the screen, its stickers fit with it
  assert.ok(fit.card.x <= left + 1e-9 && fit.card.y <= top + 1e-9, JSON.stringify(fit.card));
});
