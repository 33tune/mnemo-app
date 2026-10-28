import test from "node:test";
import assert from "node:assert/strict";
import { checkUpload, uploadKind, UPLOAD_LIMITS } from "./uploadRules";

const MB = 1024 * 1024;

test("images, MP3s and fonts are accepted within their limits", () => {
  assert.equal(checkUpload({ name: "a.png", type: "image/png", size: 2 * MB }), null);
  assert.equal(checkUpload({ name: "a.gif", type: "image/gif", size: 7.9 * MB }), null);
  assert.match(checkUpload({ name: "a.gif", type: "image/gif", size: 9 * MB })!, /GIF pesa más de 8 MB/);
  assert.equal(checkUpload({ name: "a.png", type: "image/png", size: 14 * MB }), null, "other pictures keep 15 MB");
  assert.equal(checkUpload({ name: "s.mp3", type: "audio/mpeg", size: 19 * MB }), null);
  assert.equal(checkUpload({ name: "f.woff2", type: "", size: MB }), null);
  assert.equal(checkUpload({ name: "f.ttf", type: "application/octet-stream", size: MB }), null);
  assert.equal(uploadKind({ name: "x.webp", type: "" }), "image");
});

test("anything else, or too big, is refused with a reason", () => {
  for (const f of [{ name: "x.html", type: "text/html" }, { name: "x.exe", type: "application/x-msdownload" }, { name: "x.js", type: "text/javascript" }]) {
    assert.match(checkUpload({ ...f, size: 10 }) ?? "", /no se puede subir/);
  }
  assert.match(checkUpload({ name: "a.png", type: "image/png", size: (UPLOAD_LIMITS.image + 1) * MB }) ?? "", /15 MB/);
  assert.match(checkUpload({ name: "s.mp3", type: "audio/mpeg", size: (UPLOAD_LIMITS.audio + 1) * MB }) ?? "", /20 MB/);
});

test("stored content type and picture shrinking", async () => {
  const { contentTypeFor, shrinkSize, shouldShrink, IMAGE_MAX_SIDE } = await import("./uploadRules");
  assert.equal(contentTypeFor({ name: "a.mp3", type: "" }), "audio/mpeg");
  assert.equal(contentTypeFor({ name: "a.TTF", type: "" }), "font/ttf");
  assert.equal(contentTypeFor({ name: "a.png", type: "" }), "image/png");
  assert.equal(contentTypeFor({ name: "a.jpg", type: "image/jpeg" }), "image/jpeg");
  assert.deepEqual(shrinkSize(6000, 4000), { w: IMAGE_MAX_SIDE, h: Math.round(4000 * IMAGE_MAX_SIDE / 6000) });
  assert.deepEqual(shrinkSize(800, 600), { w: 800, h: 600 });
  assert.equal(shrinkSize(0, 10), null);
  assert.equal(shouldShrink({ name: "a.gif", type: "image/gif" }), false);
  assert.equal(shouldShrink({ name: "a.svg", type: "" }), false);
  assert.equal(shouldShrink({ name: "a.png", type: "image/png" }), true);
  assert.equal(shouldShrink({ name: "a.mp3", type: "audio/mpeg" }), false);
});
