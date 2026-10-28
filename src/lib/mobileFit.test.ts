import test from "node:test";
import assert from "node:assert/strict";
import type { CanvasState } from "@/types";
import { fitRoomToCard, cardViewRect, mobileView, rotatedBox, MOBILE_GUTTER, MOBILE_MAX_SCALE } from "./mobileFit";

const base = (over: Partial<CanvasState>): CanvasState => ({
  cards: [], images: [], texts: [], galleries: [], profiles: [], medias: [], guestbooks: [], socialCards: [],
  musicCards: [], linksCards: [], statsCards: [], bgColor: "#000", wallpaper: "", ...over,
}) as CanvasState;

const card = { id: "p", x: 800, y: 300, w: 300, h: 400, isPublic: true } as never;
const img = (id: string, x: number, y: number, w = 100, h = 100) =>
  ({ id, src: "https://x/y.png", x, y, w, h, rotation: 0, isPublic: true, zIndex: 1, layer: 1, depth: 0 }) as never;

test("phones show the card, and of the room only the images / texts touching it", () => {
  const t = { id: "t", x: 820, y: 400, content: "hola", size: 20, rotation: 0, isPublic: true } as never;
  const farText = { id: "far", x: 100, y: 100, content: "lejos", size: 20, rotation: 0, isPublic: true } as never;
  const m = { id: "m", x: 820, y: 720, w: 200, h: 64, isPublic: true } as never;
  const fit = fitRoomToCard(base({ profiles: [card], images: [img("frame", 780, 280, 340, 440)], texts: [t, farText], musicCards: [m] }))!;
  assert.equal(fit.state.profiles.length, 1);
  assert.deepEqual(fit.state.images.map(i => i.id), ["frame"]);
  assert.deepEqual(fit.state.texts.map(x => x.id), ["t"]);
  assert.equal(fit.state.musicCards.length, 0);
  assert.deepEqual(fit.card, { x: 800, y: 300, w: 300, h: 400 });
  assert.equal(fitRoomToCard(base({ profiles: [{ ...(card as object), isPublic: false } as never] })), null);
});

test("in front or behind, any size: kept whole; the view is still the card alone", () => {
  const c = { ...(card as object), zIndex: 5, layer: 1 } as never; // z 105
  const behind = { ...(img("behind", 700, 250, 600, 600) as object), zIndex: 1, layer: 0 } as never;
  const huge = { ...(img("huge", -2000, -2000, 5000, 5000) as object), zIndex: 9, layer: 2 } as never;
  const corner = { ...(img("corner", 1090, 690, 400, 400) as object), zIndex: 9, layer: 1 } as never; // barely touches
  const away = { ...(img("away", 1500, 900) as object), zIndex: 9, layer: 1 } as never;
  const hidden = { ...(img("hidden", 820, 320) as object), isPublic: false } as never;
  const fit = fitRoomToCard(base({ profiles: [c], images: [behind, huge, corner, away, hidden] }))!;
  assert.deepEqual(fit.state.images.map(i => i.id), ["behind", "huge", "corner"]);
  assert.deepEqual(fit.state.images.find(i => i.id === "huge"), huge, "drawn as stored");
  assert.deepEqual(fit.card, { x: 800, y: 300, w: 300, h: 400 });
});

test("adding images never moves the card on the phone", () => {
  const a = fitRoomToCard(base({ profiles: [card] }))!;
  const b = fitRoomToCard(base({ profiles: [card], images: [img("a", 1150, 300), img("b", 500, 900)] }))!;
  assert.deepEqual(mobileView(390, 700, a.card), mobileView(390, 700, b.card));
});

test("the source state is never mutated", () => {
  const s = base({ profiles: [card], images: [img("a", 0, 0)] });
  const before = JSON.stringify(s);
  fitRoomToCard(s);
  assert.equal(JSON.stringify(s), before);
});

test("the card fills the screen, centered, never past it; capped growth", () => {
  const vw = 390, vh = 700, aw = vw - 2 * MOBILE_GUTTER, ah = vh - 2 * MOBILE_GUTTER;
  const r = { x: 100, y: 100, w: 300, h: 500 };
  const v = mobileView(vw, vh, r);
  assert.equal(v.s, Math.min(aw / r.w, ah / r.h));
  assert.ok(r.w * v.s <= aw + 1e-9 && r.h * v.s <= ah + 1e-9);
  assert.ok(Math.abs(v.tx + (r.x + r.w / 2) * v.s - vw / 2) < 1e-9 && Math.abs(v.ty + (r.y + r.h / 2) * v.s - vh / 2) < 1e-9);
  assert.equal(mobileView(vw, vh, { x: 0, y: 0, w: 100, h: 100 }).s, MOBILE_MAX_SCALE);
});

test("stickers and the rendered height are part of what fits", () => {
  const withFrame = { ...(card as object), stickers: [{ id: "f", src: "https://x/f.png", x: -0.24, y: -0.24, w: 1.48, aspect: 1.2, front: true }] } as never;
  const fit = fitRoomToCard(base({ profiles: [withFrame] }))!;
  const left = 800 - 0.24 * 300, top = 300 - 0.24 * 400, right = left + 1.48 * 300, bottom = top + 1.48 * 300 * 1.2;
  assert.ok(fit.card.x <= left + 1e-9 && fit.card.y <= top + 1e-9, JSON.stringify(fit.card));
  assert.ok(fit.card.x + fit.card.w >= right - 1e-9 && fit.card.y + fit.card.h >= bottom - 1e-9, JSON.stringify(fit.card));
  // a card drawn taller than stored (content floor): the whole drawn card fits
  const tall = cardViewRect({ x: 0, y: 0, w: 300, h: 400 }, 560);
  assert.equal(tall.h, 560);
});

test("rotatedBox keeps the center", () => {
  const r = rotatedBox({ x: 0, y: 0, w: 100, h: 50 }, 90);
  assert.ok(Math.abs(r.w - 50) < 1e-9 && Math.abs(r.h - 100) < 1e-9 && Math.abs(r.x - 25) < 1e-9);
});
