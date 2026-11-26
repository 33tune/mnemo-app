import { test } from "node:test";
import assert from "node:assert/strict";
import { isFinished, contentScore, careScore, rankExplore, hasCollectionFx, hash01, MIN_CARE, isExploreTab, type ExploreCandidate } from "./explore";
import type { CanvasState, ProfileCardData } from "@/types";

const base = { photo: "https://x/p.webp", name: "Ana", contactLinks: [{ id: "1", url: "https://instagram.com/ana" }] } as unknown as ProfileCardData;
const room = (extra: Partial<CanvasState> = {}) => ({ images: [], texts: [], profiles: [], wallpaper: "", ...extra }) as unknown as CanvasState;
const sig = (o: Partial<ExploreCandidate["signals"]> = {}) => ({ views14: 0, favs: 0, favs14: 0, posts14: 0, editMinutes: 0, edits: 0, ...o });
const cand = (id: string, card: ProfileCardData, o: Partial<ExploreCandidate> = {}): ExploreCandidate =>
  ({ userId: id, handle: id, createdAt: "2026-10-01T00:00:00Z", card, state: room(), signals: sig(), ...o });

test("finished = a face + real content (no single field required)", () => {
  const rich = { ...base, status: "hola", bio: "bio", effects: { holo: { enabled: true }, bg: { color: "#000" } } } as unknown as ProfileCardData;
  assert.equal(isFinished(rich, room()), true);
  assert.equal(isFinished({ ...rich, name: "", photo: "" } as ProfileCardData, room()), false);
  assert.equal(isFinished({ ...rich, name: "", photo: "", logo: { url: "https://l" } } as unknown as ProfileCardData, room()), true);
  assert.equal(isFinished(base, room()), false); // a photo, a name and one link: too little
});

test("content score grows with what the owner customized", () => {
  const plain = contentScore(base, room());
  const rich = contentScore({ ...base, status: "hola", bio: "bio", stickers: [{}, {}], effects: { holo: { enabled: true }, glare: {}, bg: { color: "#000" } }, nameFont: "Syne" } as unknown as ProfileCardData,
    room({ wallpaper: "https://w", images: [{}, {}] as never }));
  assert.ok(rich > plain + 6, `${rich} vs ${plain}`);
});

test("care adds editing time and changes, capped", () => {
  const c = cand("a", base);
  const lazy = careScore(c);
  const busy = careScore({ ...c, signals: sig({ editMinutes: 45, edits: 200 }) });
  const crazy = careScore({ ...c, signals: sig({ editMinutes: 9999, edits: 99999 }) });
  assert.ok(busy > lazy + 7);
  assert.ok(crazy <= lazy + 18.01);
});

test("low-effort and unfinished cards never show; the viewer's own neither", () => {
  const rich = { ...base, status: "hola", bio: "bio", effects: { holo: { enabled: true }, bg: { color: "#000" } } } as unknown as ProfileCardData;
  const good = cand("good", rich, { signals: sig({ editMinutes: 40, edits: 150 }) });
  const lazy = cand("lazy", base);
  const unfinished = cand("unf", base, { signals: sig({ editMinutes: 60, edits: 300 }) });
  const me = cand("me", rich, { signals: sig({ editMinutes: 60, edits: 300 }) });
  assert.ok(careScore(lazy) < MIN_CARE);
  const out = rankExplore([good, lazy, unfinished, me], { tab: "para", now: Date.parse("2026-11-26"), seed: "x", excludeUserId: "me" }).map(c => c.userId);
  assert.deepEqual(out, ["good"]);
});

test("Para vos changes with the seed (not always the same order)", () => {
  const rich2 = { ...base, status: "a", bio: "b", effects: { holo: { enabled: true }, bg: { color: "#000" } } } as unknown as ProfileCardData;
  const list = Array.from({ length: 12 }, (_, i) => cand(`u${i}`, rich2, { signals: sig({ editMinutes: 40, edits: 150 }) }));
  const a = rankExplore(list, { tab: "para", now: Date.parse("2026-11-26"), seed: "2026-11-26:x" }).map(c => c.userId).join();
  const b = rankExplore(list, { tab: "para", now: Date.parse("2026-11-26"), seed: "2026-11-27:x" }).map(c => c.userId).join();
  assert.notEqual(a, b);
});

test("tabs: nuevas by date, visitadas by views, holo filters", () => {
  const busy = sig({ editMinutes: 40, edits: 150 });
  const rich3 = { ...base, status: "a", bio: "b", effects: { bg: { color: "#000" }, gradient: {} } } as unknown as ProfileCardData;
  const old = cand("old", rich3, { createdAt: "2026-09-01T00:00:00Z", signals: { ...busy, views14: 90 } });
  const fresh = cand("fresh", { ...rich3, effects: { bg: { color: "#000" }, holo: { enabled: true } } } as unknown as ProfileCardData, { createdAt: "2026-11-25T00:00:00Z", signals: busy });
  const now = Date.parse("2026-11-26");
  assert.deepEqual(rankExplore([old, fresh], { tab: "nuevas", now, seed: "s" }).map(c => c.userId), ["fresh", "old"]);
  assert.deepEqual(rankExplore([old, fresh], { tab: "visitadas", now, seed: "s" }).map(c => c.userId), ["old", "fresh"]);
  assert.deepEqual(rankExplore([old, fresh], { tab: "holo", now, seed: "s" }).map(c => c.userId), ["fresh"]);
});

test("helpers", () => {
  assert.equal(hasCollectionFx({ ...base, effects: { glitter: { enabled: false } } } as unknown as ProfileCardData), false);
  assert.equal(hasCollectionFx({ ...base, effects: { strass: {} } } as unknown as ProfileCardData), true);
  const h = hash01("abc"); assert.ok(h >= 0 && h < 1); assert.equal(h, hash01("abc"));
  assert.equal(isExploreTab("holo"), true); assert.equal(isExploreTab("x"), false);
});
