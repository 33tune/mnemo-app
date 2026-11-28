import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnStorageUrl, thumbify, thumbUrl, liteEffects, phonePictures, originalSrc, animThumbUrl } from "./thumbImages";
import { resourcesOf } from "./resources";

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

test("phonePictures: own pictures become animated thumbs at about their shown size", () => {
  const own = `${SB}/storage/v1/object/public/canvas-assets/u/a-gif.webp`;
  const state = {
    wallpaper: "",
    images: [{ id: "i1", src: own, w: 100, h: 100, isPublic: true }],
    profiles: [{
      w: 602, h: 629, photo: own, pfpSizePx: 136,
      logo: { url: own, w: 124, h: 200 },
      stickers: [{ id: "s1", src: own, w: 0.16, aspect: 0.84 }, { id: "s2", src: "/editor/stickers/spine.webp", w: 0.3, aspect: 2 }],
      commentsBox: { button: { image: own, size: 54 } },
      effects: { bg: { image: own } },
    }],
  };
  const out = phonePictures(state, SB);
  const p = out.profiles[0] as Record<string, any>;
  // 602 wide on a 430 phone → 0.66× zoom, 2× pixels: a 96 px sticker → 160.
  assert.equal(p.stickers[0].src, animThumbUrl(own, 160));
  assert.match(p.stickers[0].src, /anim=1&w=160/);
  assert.equal(p.stickers[1].src, "/editor/stickers/spine.webp");
  assert.match(p.logo.url, /w=400/);
  assert.match(p.commentsBox.button.image, /w=160/);
  assert.match(p.photo, /w=240/);
  assert.match(String(out.images[0].src), /anim=1/);
  assert.equal(out.wallpaper, "");
  assert.equal(originalSrc(p.stickers[0].src), own);
  assert.equal(originalSrc("https://x/y.png"), "https://x/y.png");
  // Resources still name the owner's file.
  const res = resourcesOf(p.stickers, out.images as never);
  assert.equal(res[0].src, own);
  assert.equal(res.length, 1); // same file once (s1 and i1 share it); the local sticker is not http
});
