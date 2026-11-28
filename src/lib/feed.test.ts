import { test } from "node:test";
import assert from "node:assert/strict";
import { groupFeed, withSuggested, type FeedItem, type SuggestedPost } from "./feed";
import type { PostAuthor, WallPost } from "./wall";

const who = (id: string): PostAuthor => ({ id, handle: id, name: id, photo: null, pfpRadius: "50%", bg: "#000", nameColor: "#fff" });
const T0 = Date.parse("2026-11-28T12:00:00Z");
const at = (min: number) => new Date(T0 - min * 60_000).toISOString();
const rr = (actor: string, min: number, key: string): FeedItem => ({ kind: "repost_resource", at: at(min), actor: who(actor), resource: { ownerId: "o", ownerHandle: "o", key, src: `https://x/${key}.png` } });
const post = (id: string, actor: string, min: number): FeedItem => ({ kind: "post", at: at(min), actor: who(actor), post: { id } as WallPost });

test("groups a person's picture reposts made close together, even with others in between", () => {
  const e = groupFeed([rr("luna", 0, "a"), post("p1", "kiro", 2), rr("luna", 5, "b"), rr("luna", 20, "c"), rr("luna", 90, "d"), rr("kiro", 91, "e")]);
  assert.deepEqual(e.map(x => x.type), ["group", "item", "group", "group"]);
  const first = e[0]; assert.ok(first.type === "group" && first.resources.length === 3);
  const late = e[2]; assert.ok(late.type === "group" && late.resources.length === 1 && late.actor.id === "luna");
});

test("sprinkles suggestions every 6 entries, never one already in the feed", () => {
  const items = Array.from({ length: 13 }, (_, i) => post(`p${i}`, "kiro", i));
  const s = (id: string): SuggestedPost => ({ post: { id } as WallPost, likedByFavs: 0 });
  const out = withSuggested(groupFeed(items), [s("p3"), s("x1"), s("x2")]);
  assert.deepEqual(out.filter(e => e.type === "suggested").map(e => e.key), ["s:x1", "s:x2"]);
  assert.equal(out[6].type, "suggested");
  assert.equal(withSuggested(groupFeed(items.slice(0, 3)), [s("x1")])[2].type, "suggested");
  assert.deepEqual(withSuggested([], [s("x1"), s("x2")]).map(e => e.key), ["s:x1", "s:x2"]);
});
