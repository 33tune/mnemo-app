import test from "node:test";
import assert from "node:assert/strict";
import type { CardSticker } from "@/types";
import {
  stickerRect, rectToSticker, stickerArea, clampIntoArea, clampSize, newSticker,
  stickerRows, stickersFromRows, moveRow, stickersBounds, CARD_ROW, STICKER_REACH, STICKER_MIN_PX,
} from "./stickerGeometry";

const st = (id: string, front: boolean, extra: Partial<CardSticker> = {}): CardSticker =>
  ({ id, src: `https://x/${id}.png`, x: 0, y: 0, w: 0.5, aspect: 1, front, ...extra });

test("geometry is relative to the card and follows its size, never distorted", () => {
  const s = st("a", true, { x: 0.1, y: 0.2, w: 0.5, aspect: 0.5 });
  assert.deepEqual(stickerRect(s, 300, 400), { x: 30, y: 80, w: 150, h: 75 });
  assert.deepEqual(stickerRect(s, 600, 400), { x: 60, y: 80, w: 300, h: 150 }); // card twice as wide
  const back = rectToSticker({ x: 30, y: 80, w: 150, h: 75 }, 300, 400);
  assert.deepEqual(back, { x: 0.1, y: 0.2, w: 0.5, aspect: 0.5 });
});

test("stickers may stick out of the card, but only STICKER_REACH of its size per side", () => {
  const area = stickerArea(300, 400);
  assert.deepEqual(area, { x: -300 * STICKER_REACH, y: -400 * STICKER_REACH, w: 300 * 1.5, h: 400 * 1.5 });
  assert.deepEqual(clampIntoArea({ x: -500, y: 900, w: 100, h: 100 }, area), { x: -75, y: 400, w: 100, h: 100 });
  // bigger than the area: centered on it
  assert.deepEqual(clampIntoArea({ x: 0, y: 0, w: 650, h: 100 }, area).x, -75 + (450 - 650) / 2);
  // size: never larger than the area, never below the minimum, same aspect
  assert.deepEqual(clampSize(10_000, 0.5, area), { w: 450, h: 225 });
  assert.deepEqual(clampSize(2, 1, area), { w: STICKER_MIN_PX, h: STICKER_MIN_PX });
});

test("a new sticker is centered, in front, 60% of the card (or what fits its height)", () => {
  const s = newSticker("n", "https://x/n.png", 200, 100, 300, 400);
  const r = stickerRect(s, 300, 400);
  assert.equal(s.front, true);
  assert.equal(Math.round(r.w), 180);
  assert.equal(Math.round(r.x + r.w / 2), 150);
  assert.equal(Math.round(r.y + r.h / 2), 200);
  const tall = stickerRect(newSticker("t", "u", 100, 1000, 300, 400), 300, 400);
  assert.ok(tall.h <= 400 * 1.5 + 1e-9);
});

test("rows: front stickers on top (topmost first), the card, then the ones behind", () => {
  const list = [st("b1", false), st("b2", false), st("f1", true), st("f2", true)]; // paint order
  assert.deepEqual(stickerRows(list), ["f2", "f1", CARD_ROW, "b2", "b1"]);
  assert.deepEqual(stickersFromRows(list, stickerRows(list)).map(s => s.id), ["b1", "b2", "f1", "f2"]);
});

test("dragging a row across the card row moves the sticker behind / in front", () => {
  const list = [st("b1", false), st("f1", true), st("f2", true)];
  const moved = moveRow(list, "f2", 3); // to the bottom of the list
  assert.deepEqual(stickerRows(moved), ["f1", CARD_ROW, "b1", "f2"]);
  assert.equal(moved.find(s => s.id === "f2")!.front, false);
  const up = moveRow(moved, "b1", 0);
  assert.deepEqual(stickerRows(up), ["b1", "f1", CARD_ROW, "f2"]);
  assert.equal(up.find(s => s.id === "b1")!.front, true);
  // moving the card row changes which stickers are in front
  const card = moveRow(list, CARD_ROW, 0);
  assert.ok(card.every(s => !s.front));
  // unknown id: unchanged
  assert.deepEqual(moveRow(list, "nope", 0), list);
});

test("bounds in room coordinates (rotation included), hidden ones ignored", () => {
  const card = { x: 100, y: 50, w: 200, h: 300, stickers: [st("a", true, { x: -0.1, y: -0.1, w: 0.5, aspect: 1 }), st("h", true, { hidden: true, x: 2 })] };
  assert.deepEqual(stickersBounds(card), { x: 80, y: 20, w: 100, h: 100 });
  const rot = stickersBounds({ ...card, stickers: [st("r", true, { x: 0, y: 0, w: 0.5, aspect: 1, rotation: 45 })] })!;
  assert.ok(rot.w > 100 && Math.abs(rot.w - rot.h) < 1e-9);
  assert.equal(stickersBounds({ ...card, stickers: [] }), null);
});
