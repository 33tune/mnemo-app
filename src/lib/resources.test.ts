import { test } from "node:test";
import assert from "node:assert/strict";
import { resourcesOf, visibleResources, downloadName, isResourceKey, statsFromRow } from "./resources";
import type { CanvasImage, CardSticker } from "@/types";

const st = (id: string, src: string, extra: Partial<CardSticker> = {}): CardSticker => ({ id, src, x: 0, y: 0, w: 0.2, aspect: 2, ...extra });
const im = (id: string, src: string, extra: Partial<CanvasImage> = {}): CanvasImage =>
  ({ id, src, x: 0, y: 0, w: 200, h: 100, naturalW: 200, naturalH: 100, isTransparent: false, zIndex: 1, layer: 1, depth: 0, rotation: 0, ...extra });

test("lists stickers then public images, skipping hidden, private, local and repeated files", () => {
    const r = resourcesOf(
      [st("a", "https://x/a.png"), st("b", "https://x/b.png", { hidden: true }), st("c", "blob:abc")],
      [im("i1", "https://x/i1.webp"), im("i2", "https://x/i2.webp", { isPublic: false }), im("i3", "https://x/a.png"), im("bad id", "https://x/z.png")],
    );
    assert.deepEqual(r.map(x => x.key), ["st:a", "im:i1"]);
    assert.equal(r[0].aspect, 2);
    assert.equal(r[1].aspect, 2);
  });
test("tolerates missing lists", () => { assert.deepEqual(resourcesOf(undefined, undefined), []); });

  const list = resourcesOf([st("a", "https://x/a.png"), st("b", "https://x/b.png")], [im("c", "https://x/c.png")]);
  const stats = new Map([
    ["st:a", statsFromRow({ rkey: "st:a", hidden: true })],
    ["im:c", statsFromRow({ rkey: "im:c", removed: true })],
  ]);
test("hides hidden ones from visitors and removed ones from everybody", () => {
    assert.deepEqual(visibleResources(list, stats, false).map(r => r.key), ["st:b"]);
    assert.deepEqual(visibleResources(list, stats, true).map(r => r.key), ["st:a", "st:b"]);
  });

test("validates keys", () => {
    assert.equal(isResourceKey("st:abc-1"), true);
    assert.equal(isResourceKey("im:"), false);
    assert.equal(isResourceKey("xx:abc"), false);
  });
test("names downloads", () => {
    assert.equal(downloadName("https://x/u/9f3a-gif.webp?v=2", "nico", "st:9f3a1234-aa"), "myland-nico-9f3a1234.webp");
    assert.equal(downloadName("https://x/u/file", "", "im:abc"), "myland-recurso-abc.png");
  });
test("reads stats rows", () => {
    const s = statsFromRow({ rkey: "st:a", likes: "3", reposts: 2, comments: null, liked: true, no_download: true });
    assert.deepEqual({ key: s.key, likes: s.likes, reposts: s.reposts, comments: s.comments, liked: s.liked, noDownload: s.noDownload, hidden: s.hidden }, { key: "st:a", likes: 3, reposts: 2, comments: 0, liked: true, noDownload: true, hidden: false });
  });
