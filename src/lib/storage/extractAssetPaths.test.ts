import test from "node:test";
import assert from "node:assert/strict";
import { collectStoragePaths, extractAssetPaths, toStoragePath } from "./extractAssetPaths";

const U = (p: string) => `https://abc.supabase.co/storage/v1/object/public/canvas-assets/${p}`;

test("finds a Storage URL in any field, at any depth (logo, music, fonts, cursors, buttons…)", () => {
  const state = {
    images: [{ src: U("u1/a.png") }],
    profiles: [{ photo: U("b.jpg?t=1"), logo: { url: U("u1/logo.png") }, linkButtons: [{ icon: U("u1/ic.svg") }] }],
    musicCards: [{ audioUrl: U("u1/song.mp3") }],
    spaceMusic: { url: U("u1/room.mp3") }, spaceFont: { url: U("u1/f.woff2") }, spaceCursor: { url: U("u1/c.png") },
    wallpaper: U("u1/w.gif"),
    cards: [{ bgImage: `url("${U("u1/bg.png")}")` }],
    texts: [{ content: "no urls here" }],
    published: { images: [{ src: U("u1/old.png") }] },
  };
  assert.deepEqual(new Set(extractAssetPaths(state)), new Set([
    "canvas-assets/u1/a.png", "canvas-assets/b.jpg", "canvas-assets/u1/logo.png", "canvas-assets/u1/ic.svg",
    "canvas-assets/u1/song.mp3", "canvas-assets/u1/room.mp3", "canvas-assets/u1/f.woff2", "canvas-assets/u1/c.png",
    "canvas-assets/u1/w.gif", "canvas-assets/u1/bg.png", "canvas-assets/u1/old.png",
  ]));
});

test("external, blob and data URLs are never Storage paths", () => {
  for (const u of ["https://i.imgur.com/x.png", "blob:http://x/1", "data:image/png;base64,AAA", "", null, 3]) assert.equal(toStoragePath(u), null);
  assert.equal(toStoragePath(U("a%20b.png")), "canvas-assets/a b.png");
});

test("a string with several URLs yields each; cycles do not loop", () => {
  const s = new Set<string>();
  collectStoragePaths(`a ${U("x.png")} b ${U("y.png")}`, s);
  assert.deepEqual([...s].sort(), ["canvas-assets/x.png", "canvas-assets/y.png"]);
  const o: Record<string, unknown> = { src: U("z.png") }; o.self = o;
  assert.deepEqual(extractAssetPaths(o), ["canvas-assets/z.png"]);
});
