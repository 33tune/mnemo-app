import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCommentsBox, hexAlpha, timeAgo, commentError, COMMENTS_DEFAULTS, COMMENT_MAX } from "./comments";
import { statsRowWidth } from "./profileCardLayout";

test("comments: defaults, clamps and only hex colors", () => {
  assert.deepEqual(resolveCommentsBox(undefined), { ...COMMENTS_DEFAULTS });
  const r = resolveCommentsBox({ opacity: 5, radius: -3, bg: "red", color: "#abcdef", accent: "url(x)" });
  assert.equal(r.opacity, 1);
  assert.equal(r.radius, 0);
  assert.equal(r.bg, COMMENTS_DEFAULTS.bg);
  assert.equal(r.color, "#abcdef");
  assert.equal(r.accent, COMMENTS_DEFAULTS.accent);
});

test("comments: hexAlpha and timeAgo", () => {
  assert.equal(hexAlpha("#ff0080", 0.5), "rgba(255,0,128,0.5)");
  const now = Date.parse("2026-11-17T12:00:00Z");
  assert.equal(timeAgo("2026-11-17T11:59:40Z", now), "recién");
  assert.equal(timeAgo("2026-11-17T11:15:00Z", now), "45 min");
  assert.equal(timeAgo("2026-11-17T07:00:00Z", now), "5 h");
  assert.equal(timeAgo("2026-11-14T12:00:00Z", now), "3 d");
});

test("comments: errors in Spanish", () => {
  assert.match(commentError("too_fast"), /despacio/);
  assert.match(commentError("comments_off"), /apagados/);
  assert.match(commentError("bad_length"), new RegExp(String(COMMENT_MAX)));
});

test("stats row: the comments group adds its width only when given", () => {
  const w = (s: string) => s.length * 6;
  const two = statsRowWidth("12", "3", 10, w);
  const three = statsRowWidth("12", "3", 10, w, "7");
  assert.ok(three > two);
  assert.equal(three - two, 6 + 10 * (1.15 + 0.35 + 0.9));
});
