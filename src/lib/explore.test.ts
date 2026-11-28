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

test("nuevas: the last day's cards rotate on top; en vivo = who is here, newest moment first", () => {
  const busy = sig({ editMinutes: 40, edits: 150 });
  const rich4 = { ...base, status: "a", bio: "b", effects: { bg: { color: "#000" }, gradient: {} } } as unknown as ProfileCardData;
  const now = Date.parse("2026-11-26T12:00:00Z");
  const young = Array.from({ length: 10 }, (_, i) => cand(`y${i}`, rich4, { createdAt: new Date(now - (i + 1) * 3600000).toISOString(), signals: busy }));
  const older = cand("older", rich4, { createdAt: "2026-11-20T00:00:00Z", signals: busy });
  const orders = new Set(["a", "b", "c", "d"].map(seed => rankExplore([...young, older], { tab: "nuevas", now, seed }).map(c => c.userId).join()));
  assert.ok(orders.size > 1, "rotates with the seed");
  for (const seed of ["a", "b"]) assert.equal(rankExplore([...young, older], { tab: "nuevas", now, seed }).at(-1)?.userId, "older");
  const live = new Map([["y3", now - 1000], ["y7", now - 60000]]);
  assert.deepEqual(rankExplore([...young, older], { tab: "vivo", now, seed: "a", live }).map(c => c.userId), ["y3", "y7"]);
  assert.equal(isExploreTab("vivo"), true);
});

test("helpers", () => {
  assert.equal(hasCollectionFx({ ...base, effects: { glitter: { enabled: false } } } as unknown as ProfileCardData), false);
  assert.equal(hasCollectionFx({ ...base, effects: { strass: {} } } as unknown as ProfileCardData), true);
  const h = hash01("abc"); assert.ok(h >= 0 && h < 1); assert.equal(h, hash01("abc"));
  assert.equal(isExploreTab("holo"), true); assert.equal(isExploreTab("x"), false);
});

test("Para vos leaves out the viewer's favorites and favors better-made cards without fixing the order", () => {
  const now = Date.parse("2026-11-26");
  const plain = { ...base, status: "a", bio: "b", effects: { holo: { enabled: true }, bg: { color: "#000" } } } as unknown as ProfileCardData;
  const great = { ...plain, aboutText: "x", location: "y", stickers: [{}, {}, {}, {}], nameFont: "Syne", handleFont: "Syne",
    effects: { holo: { enabled: true }, glare: {}, glitter: {}, strass: {}, aura: {}, bg: { color: "#000" } } } as unknown as ProfileCardData;
  const list = [
    ...Array.from({ length: 10 }, (_, i) => cand(`p${i}`, plain, { signals: sig({ editMinutes: 10, edits: 20 }) })),
    cand("top", great, { signals: sig({ editMinutes: 90, edits: 400 }), updatedAt: "2026-11-25T20:00:00Z" }),
    cand("fav", great, { signals: sig({ editMinutes: 90, edits: 400 }) }),
  ];
  let topFirst3 = 0;
  const firsts = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const out = rankExplore(list, { tab: "para", now, seed: `s${i}`, excludeIds: new Set(["fav"]) }).map(c => c.userId);
    assert.ok(!out.includes("fav"));
    assert.equal(out.length, 11);
    if (out.slice(0, 3).includes("top")) topFirst3++;
    firsts.add(out[0]);
  }
  assert.ok(topFirst3 > 110, `top in the first 3: ${topFirst3}/200`);
  assert.ok(firsts.size >= 6, `different first cards: ${firsts.size}`);
  // Other tabs still show favorites.
  assert.ok(rankExplore(list, { tab: "nuevas", now, seed: "s", excludeIds: new Set(["fav"]) }).some(c => c.userId === "fav"));
});
