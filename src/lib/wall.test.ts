import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPostStyle, resolvePostStyle, sameStyle, postLength, wallError, resolveWallLook, wallShown, POST_MAX, DEFAULT_POST_STYLE } from "./wall";
import type { ProfileCardData } from "@/types";

test("cleanPostStyle keeps only what the database accepts", () => {
  assert.deepEqual(cleanPostStyle({ font: "DM Sans", color: "#ff0000", bg: "#000000", size: 18 }), { font: "DM Sans", color: "#ff0000", bg: "#000000", size: 18 });
  assert.deepEqual(cleanPostStyle({ font: "x;}<script>", color: "red", bg: "#12", size: 99 as 12 }), {});
  assert.deepEqual(cleanPostStyle(null), {});
});

test("resolvePostStyle: own style, else the author's card, else defaults", () => {
  assert.deepEqual(resolvePostStyle(null), DEFAULT_POST_STYLE);
  assert.equal(resolvePostStyle(null, { bg: "#112233", nameColor: "#eeeeee" }).bg, "#112233");
  assert.equal(resolvePostStyle({ bg: "#ffffff" }, { bg: "#112233", nameColor: "#eeeeee" }).bg, "#ffffff");
});

test("sameStyle compares cleaned styles", () => {
  assert.ok(sameStyle({ font: "DM Sans", size: 15 }, { size: 15, font: "DM Sans" }));
  assert.ok(!sameStyle({ size: 12 }, { size: 15 }));
});

test("postLength counts characters, not UTF-16 units", () => {
  assert.equal(postLength("  hola  "), 4);
  assert.equal(postLength("ñ".repeat(POST_MAX)), POST_MAX);
});

test("wallError maps codes", () => {
  assert.match(wallError("too_fast"), /despacio/);
  assert.match(wallError("comments_off"), /cerrado/);
  assert.match(wallError("blocked"), /No podés/);
  assert.match(wallError("bad_length"), new RegExp(String(POST_MAX)));
});

test("resolveWallLook follows the card unless the owner picked", () => {
  const card = { id: "c", effects: { bg: { color: "rgba(10, 20, 30, 1)" }, border: { radius: 24 } } } as unknown as ProfileCardData;
  const look = resolveWallLook(card);
  assert.equal(look.bg, "#0a141e");
  assert.equal(look.radius, 24);
  const own = resolveWallLook({ ...card, commentsBox: { bg: "#ffffff", radius: 8 } } as ProfileCardData);
  assert.equal(own.bg, "#ffffff");
  assert.equal(own.radius, 8);
  assert.ok(wallShown(card));
  assert.ok(!wallShown({ ...card, commentsBox: { hidden: true } } as ProfileCardData));
});

test("a see-through card background does not paint the wall", () => {
  const card = { id: "c", effects: { bg: { color: "rgba(255,255,255,0.055)" } } } as unknown as ProfileCardData;
  assert.notEqual(resolveWallLook(card).bg, "#ffffff");
});
