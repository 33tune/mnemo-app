import test from "node:test";
import assert from "node:assert/strict";
import type { CanvasElement, CanvasState } from "@/types";
import { dropOutsideRoom, dropOutsideRoomElements, roomBox, desktopViewFit, ROOM_W, ROOM_H } from "./roomBounds";

const card = { id: "p", x: 810, y: 260, w: 300, h: 560, isPublic: true };
const img = (id: string, x: number, y: number, w = 100, h = 100) => ({ id, x, y, w, h, src: "https://x/y.png", isPublic: true, rotation: 0 });

test("the room is ROOM_W × ROOM_H centered on the card", () => {
  const r = roomBox(card);
  assert.deepEqual(r, { x: 960 - ROOM_W / 2, y: 540 - ROOM_H / 2, w: ROOM_W, h: ROOM_H });
});

test("public page: the old scroll's leftovers are not drawn; everything near the card is", () => {
  const s = {
    profiles: [card], texts: [{ id: "t", x: 400, y: 2400, content: "abajo de todo", size: 30, rotation: 0, isPublic: true }],
    images: [img("near", 100, 100), img("edge", 2150, 1150), img("scroll", 300, 1900), img("far-right", 2500, 400)],
    musicCards: [{ id: "m", x: 900, y: 2800, w: 240, h: 76, isPublic: true }],
    cards: [], galleries: [], medias: [], guestbooks: [], socialCards: [], linksCards: [], statsCards: [], bgColor: "", wallpaper: "",
  } as unknown as CanvasState;
  const out = dropOutsideRoom(s);
  assert.deepEqual(out.images.map(i => i.id), ["near", "edge"]);
  assert.equal(out.texts.length, 0);
  assert.equal(out.musicCards.length, 0);
  assert.equal(out.profiles.length, 1);
  // no card: nothing is dropped
  assert.equal(dropOutsideRoom({ ...s, profiles: [] }).images.length, 4);
});

test("editor: same rule on the loaded elements; the card always stays", () => {
  const els = [
    { ...card, elementType: "profile" }, { ...img("a", 900, 900), elementType: "image" }, { ...img("b", 900, 2700), elementType: "image" },
  ] as unknown as CanvasElement[];
  assert.deepEqual(dropOutsideRoomElements(els).map(e => e.id), ["p", "a"]);
});

test("desktop view: card centered under the bar at real size; scaled down only if it doesn't fit", () => {
  const big = desktopViewFit(1920, 1080, card);
  assert.equal(big.s, 1);
  assert.equal(big.tx + (card.x + card.w / 2), 960);
  assert.equal(big.ty + (card.y + card.h / 2), 44 + (1080 - 44) / 2);
  const small = desktopViewFit(1280, 600, card);
  assert.ok(small.s < 1 && Math.abs(card.h * small.s - (600 - 44 - 48)) < 1e-9);
});
