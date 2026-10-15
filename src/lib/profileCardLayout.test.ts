// The ProfileCard's free layout (user decisions 2026-10-15): the user
// composes, the engine only resolves real collisions (the photo never moves
// for another block), texts wrap instead of disappearing, and the card can
// only shrink until its blocks are packed together.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProfileCardData } from "@/types";
import {
  profileLayout, profileCardMinSize, clampProfileCardSize, positionsPatch, formatViewCount, graphemes,
  type DragState, type BlockKey, type Rect,
} from "./profileCardLayout";
import { getFreeformCardBounds } from "./cardGeometry";

const CARD = {
  id: "p", x: 0, y: 0, w: 320, h: 560, zIndex: 0, layer: 1, rotation: 0,
  name: "Mara Ibáñez", handle: "mara", status: "diseñadora · dj de madrugada", location: "La Plata, Buenos Aires",
  bio: "Hago fanzines, mezclo vinilos y junto plantas raras.", showViews: true, textAlign: "center",
  contactLinks: [{ id: "1", url: "instagram.com/a" }, { id: "2", url: "soundcloud.com/b" }, { id: "3", url: "mara.land" }],
  linkButtons: [{ id: "a", label: "Mi último set", url: "a.com" }, { id: "b", label: "Fanzine #7", url: "b.com" }, { id: "c", label: "Streams", url: "c.com" }],
} as unknown as ProfileCardData;

const overlap = (a: Rect, b: Rect) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
function assertClean(rects: Partial<Record<BlockKey, Rect>>, W: number, H: number, pad = 20, tag = "") {
  const all = Object.entries(rects) as [BlockKey, Rect][];
  for (const [k, r] of all) {
    assert.ok(r.x >= pad - 0.5 && r.y >= pad - 0.5 && r.x + r.w <= W - pad + 0.5 && r.y + r.h <= H - pad + 0.5, `${tag} ${k} inside`);
  }
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    assert.ok(!overlap(all[i][1], all[j][1]), `${tag} ${all[i][0]} / ${all[j][0]} overlap`);
  }
}

/** Drags `key` along `path` (0..1) in `steps` frames, like the editor does. */
function drag(card: ProfileCardData, key: BlockKey, to: (t: number) => { x: number; y: number }, steps: number) {
  const base = profileLayout(card).rects;
  let prev: Partial<Record<BlockKey, Rect>> | undefined;
  const frames = [];
  for (let s = 0; s <= steps; s++) {
    const p = to(s / steps);
    const l = profileLayout(card, { drag: { key, x: p.x, y: p.y, base } as DragState, prev });
    frames.push(l);
    prev = l.rects;
  }
  return { base, frames };
}

test("starting arrangement: every block in the card, none overlapping", () => {
  const l = profileLayout(CARD);
  assert.ok(l.fits);
  assertClean(l.rects, 320, 560);
});

test("moving a block where nothing is: every other block keeps its exact position", () => {
  const base = profileLayout(CARD).rects;
  const l = profileLayout(CARD, { drag: { key: "views", x: 20, y: 500, base } as DragState });
  for (const k of ["pfp", "identity", "location", "links", "buttons"] as BlockKey[]) assert.deepEqual(l.rects[k], base[k], k);
  assert.deepEqual({ x: l.rects.views!.x, y: l.rects.views!.y }, { x: 20, y: 500 });
});

test("the photo reaches the four corners exactly, the rest makes room", () => {
  const start = profileLayout(CARD).rects.pfp!;
  for (const c of [{ x: 20, y: 20 }, { x: 220, y: 20 }, { x: 20, y: 460 }, { x: 220, y: 460 }]) {
    const { frames } = drag(CARD, "pfp", t => ({ x: start.x + (c.x - start.x) * t, y: start.y + (c.y - start.y) * t }), 120);
    frames.forEach((f, i) => assertClean(f.rects, 320, Math.max(560, f.neededH), 20, `corner ${c.x},${c.y} frame ${i}`));
    assert.deepEqual({ x: frames.at(-1)!.rects.pfp!.x, y: frames.at(-1)!.rects.pfp!.y }, c);
  }
});

test("dragging the photo over the texts: they make room, never overlap, and move as a group (order kept)", () => {
  const start = profileLayout(CARD).rects.pfp!;
  const { frames } = drag(CARD, "pfp", t => ({ x: start.x, y: start.y + 120 * t }), 120);
  for (const [i, f] of frames.entries()) {
    assertClean(f.rects, 320, Math.max(560, f.neededH), 20, `frame ${i}`);
    const r = f.rects;
    if (r.identity!.y > r.pfp!.y) {
      assert.ok(r.location!.y > r.identity!.y && r.views!.y > r.location!.y && r.links!.y > r.views!.y && r.buttons!.y > r.links!.y, `order kept at frame ${i}`);
    }
  }
});

test("a block dragged onto the photo slides around it; the photo never moves", () => {
  const base = profileLayout(CARD).rects;
  const p = base.pfp!;
  for (let dy = 0; dy <= 120; dy += 4) {
    const l = profileLayout(CARD, { drag: { key: "identity", x: base.identity!.x, y: base.identity!.y - dy, base } as DragState });
    assert.deepEqual(l.rects.pfp, p);
    assert.ok(!overlap(l.rects.identity!, l.rects.pfp!));
  }
});

test("save then reload gives exactly the same layout (and no drift on repeated loads)", () => {
  const base = profileLayout(CARD).rects;
  const done = profileLayout(CARD, { drag: { key: "pfp", x: 20, y: 20, base } as DragState });
  const h = Math.max(CARD.h, done.neededH);
  let card = { ...CARD, ...positionsPatch(CARD, done, CARD.w, h), h } as ProfileCardData;
  for (let n = 0; n < 3; n++) {
    const again = profileLayout(card);
    for (const k of Object.keys(done.rects) as BlockKey[]) {
      assert.ok(Math.abs(again.rects[k]!.x - done.rects[k]!.x) < 0.01 && Math.abs(again.rects[k]!.y - done.rects[k]!.y) < 0.01, `${k} on load ${n}`);
    }
    card = { ...card, ...positionsPatch(card, again, card.w, card.h) } as ProfileCardData;
  }
});

test("resizing back and forth accumulates nothing: the original size gives the original layout", () => {
  const base = profileLayout(CARD).rects;
  const done = profileLayout(CARD, { drag: { key: "views", x: 30, y: 480, base } as DragState });
  const card = { ...CARD, ...positionsPatch(CARD, done, 320, 560) } as ProfileCardData;
  const before = profileLayout(card).rects;
  for (const [w, h] of [[400, 600], [260, 520], [480, 636], [320, 560]]) profileLayout({ ...card, w, h } as ProfileCardData);
  assert.deepEqual(profileLayout(card).rects, before);
});

test("the buttons follow the card's width: never wider than the card, narrower cards = narrower buttons", () => {
  for (const w of [240, 300, 420, 640]) {
    const l = profileLayout({ ...CARD, w, h: 636 } as ProfileCardData);
    assert.ok(l.rects.buttons!.w <= w - 40 + 0.5, `w=${w}`);
    assert.ok(l.rects.buttons!.w >= w - 40 - 0.5, `full width by default at w=${w}`);
  }
});

test("shrinking stops where the blocks are packed: everything fits at the minimum, nothing is hidden", () => {
  const min = profileCardMinSize(CARD, 320);
  const l = profileLayout({ ...CARD, h: min.h } as ProfileCardData);
  assert.ok(l.fits);
  assertClean(l.rects, 320, min.h);
  assert.equal(clampProfileCardSize(CARD, 320, 100).h, min.h, "the resize stops at the floor");
  assert.equal(clampProfileCardSize(CARD, 320, min.h + 40).h, min.h + 40, "above it: free");
});

test("narrower card: texts take more lines (taller), never disappear", () => {
  const wide = profileLayout({ ...CARD, w: 420, h: 636 } as ProfileCardData);
  const narrow = profileLayout({ ...CARD, w: 240, h: 636 } as ProfileCardData);
  assert.ok(narrow.rows.bio!.lines > wide.rows.bio!.lines);
  assert.ok(narrow.rects.identity!.h > wide.rects.identity!.h);
  for (const role of ["name", "handle", "descriptor", "bio", "location", "views"] as const) assert.ok(narrow.rows[role], role);
});

test("more content raises the floor; less content lowers it", () => {
  const plain = profileCardMinSize(CARD, 320).h;
  const more = profileCardMinSize({ ...CARD, linkButtons: [...(CARD.linkButtons ?? []), { id: "d", label: "Otro", url: "d.com" }] } as ProfileCardData, 320).h;
  const less = profileCardMinSize({ ...CARD, bio: undefined, linkButtons: [] } as ProfileCardData, 320).h;
  assert.ok(more > plain && less < plain);
  const b = getFreeformCardBounds();
  assert.ok(less >= b.minH);
});

test("measured text drives the sizes (real fonts)", () => {
  const measure = { width: (t: string) => t.length * 9 };
  const est = profileLayout(CARD);
  const real = profileLayout(CARD, { measure });
  assert.notEqual(real.rects.identity!.h, est.rects.identity!.h);
});

test("a word with no spaces (handle, pasted link, emotes) breaks into more lines: never wider than the card", () => {
  const long = "x".repeat(80);
  const emotes = "🌸✨🖤👨‍👩‍👧🇦🇷👍🏽".repeat(12);
  const cases: Partial<ProfileCardData>[] = [
    { name: long }, { handle: long }, { status: long }, { location: long }, { bio: long }, { bio: emotes },
  ];
  for (const c of cases) {
    const card = { ...CARD, ...c, w: 240, h: 636 } as ProfileCardData;
    const l = profileLayout(card);
    assert.ok(l.fits, JSON.stringify(Object.keys(c)));
    assertClean(l.rects, 240, 636, 20, Object.keys(c)[0]);
    assert.equal(profileCardMinSize(card, 240).w, 240, `${Object.keys(c)[0]}: the width floor is not the word`);
  }
  const bio = profileLayout({ ...CARD, bio: long, w: 240, h: 636 } as ProfileCardData).rows.bio!;
  assert.ok(bio.lines > 1, "the long word takes more lines");
});

test("stretch for a long word, then shrink back: the card is not locked wide", () => {
  const card = { ...CARD, bio: "a".repeat(120), w: 600, h: 400 } as ProfileCardData;
  const back = clampProfileCardSize(card, 240, 400);
  assert.equal(back.w, 240);
  const l = profileLayout({ ...card, ...back } as ProfileCardData);
  assert.ok(l.fits);
  assertClean(l.rects, back.w, back.h);
});

test("an emoji built from several code points is one piece (never split)", () => {
  assert.deepEqual(graphemes("👨‍👩‍👧🇦🇷👍🏽a"), ["👨‍👩‍👧", "🇦🇷", "👍🏽", "a"]);
});

test("views counter format", () => {
  assert.equal(formatViewCount(12), "12");
  assert.equal(formatViewCount(12_345), "12.3K");
  assert.equal(formatViewCount(2_500_000), "2.5M");
});
