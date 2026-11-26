import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnStorageUrl, thumbify, thumbUrl, liteEffects } from "./thumbImages";

const SB = "https://abc.supabase.co";
const U = (p: string) => `${SB}/storage/v1/object/public/canvas-assets/${p}`;

test("only our storage counts", () => {
  assert.equal(isOwnStorageUrl(U("a/b.gif"), SB), true);
  assert.equal(isOwnStorageUrl("https://evil.com/storage/v1/object/public/x.png", SB), false);
  assert.equal(isOwnStorageUrl(`${SB}/rest/v1/profiles`, SB), false);
  assert.equal(isOwnStorageUrl(`http://abc.supabase.co/storage/v1/object/public/x.png`, SB), false);
  assert.equal(isOwnStorageUrl("not a url", SB), false);
  assert.equal(isOwnStorageUrl(U("x.png"), ""), false);
});

test("thumbify rewrites nested pictures and nothing else", () => {
  const card = { photo: U("p.webp"), name: "nico", stickers: [{ src: U("s.gif"), w: 0.2 }], effects: { bg: { image: U("bg.gif"), color: "#000" } }, link: "https://x.com" };
  const out = thumbify(card, 400, SB);
  assert.equal(out.photo, thumbUrl(U("p.webp"), 400));
  assert.equal(out.stickers[0].src, thumbUrl(U("s.gif"), 400));
  assert.equal(out.effects.bg.image, thumbUrl(U("bg.gif"), 400));
  assert.equal(out.name, "nico");
  assert.equal(out.link, "https://x.com");
  assert.equal(card.photo, U("p.webp"));
});

test("liteEffects keeps the look, drops the heavy layers", () => {
  const fx = { border: { width: 2 }, glow: { enabled: true, animation: { enabled: true } }, holo: { enabled: true, idle: true }, glitter: { enabled: true }, strass: { enabled: true }, retro: { scanlines: true }, bg: { color: "#000", glass: true, blur: 20 } };
  const out = liteEffects(fx as Record<string, unknown>) as Record<string, any>;
  assert.deepEqual(Object.keys(out).sort(), ["bg", "border", "glow", "holo"]);
  assert.equal(out.glow.animation, undefined);
  assert.equal(out.holo.idle, false);
  assert.equal(out.bg.glass, false);
  assert.equal(out.bg.blur, 0);
  assert.equal(liteEffects(undefined), undefined);
});
