import test from "node:test";
import assert from "node:assert/strict";
import { checkUpload, uploadKind, UPLOAD_LIMITS } from "./uploadRules";

const MB = 1024 * 1024;

test("images, MP3s and fonts are accepted within their limits", () => {
  assert.equal(checkUpload({ name: "a.png", type: "image/png", size: 2 * MB }), null);
  assert.equal(checkUpload({ name: "a.gif", type: "image/gif", size: 14 * MB }), null);
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
