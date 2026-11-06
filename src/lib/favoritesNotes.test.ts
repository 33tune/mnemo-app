import { test } from "node:test";
import assert from "node:assert/strict";
import { sortShortcuts, barShortcuts, type Shortcut } from "./shortcuts";
import { resolveNoteBox, noteSurface, hoursAgo, hoursLeft, noteLength, NOTE_SCALE, NOTE_OPACITY } from "./noteBox";
import { statsRowWidth } from "./profileCardLayout";

const s = (handle: string, o: Partial<Shortcut> = {}): Shortcut => ({
  userId: handle, handle, name: handle, photo: null, pfpRadius: "50%", bg: "#000", nameColor: "#fff",
  pinned: false, hidden: false, visits: 0, favoritedAt: "2026-11-01T00:00:00Z", note: null, noteSeen: false, ...o,
});
const note = { id: "n", body: "hola", created_at: "2026-11-06T00:00:00Z", expires_at: "2026-11-07T00:00:00Z" };

test("shortcuts: pinned, then an unseen note, then visits, then newest favorite; hidden out of the bar", () => {
  const list = [
    s("a", { visits: 9 }), s("b", { pinned: true }), s("c", { note, noteSeen: false }), s("d", { note, noteSeen: true, visits: 3 }),
    s("e", { favoritedAt: "2026-11-05T00:00:00Z" }), s("f", { hidden: true, pinned: true }),
  ];
  assert.deepEqual(sortShortcuts(list).map(x => x.handle), ["b", "f", "c", "a", "d", "e"]);
  assert.deepEqual(barShortcuts(list).map(x => x.handle), ["b", "c", "a", "d", "e"]);
});

test("note box: size only a little, never invisible, glass below 100 %", () => {
  assert.equal(resolveNoteBox({ scale: 3 }).scale, NOTE_SCALE.max);
  assert.equal(resolveNoteBox({ scale: 0.1 }).scale, NOTE_SCALE.min);
  assert.equal(resolveNoteBox({ opacity: 0 }).opacity, NOTE_OPACITY.min);
  const solid = noteSurface(resolveNoteBox({ opacity: 1 }));
  const glass = noteSurface(resolveNoteBox({ opacity: 0.4 }));
  assert.equal(solid.backdropFilter, undefined);
  assert.match(String(glass.backdropFilter), /blur\(\d+px\)/);
  assert.match(String(glass.background), /rgba\(255,255,255,0\.400\)/);
});

test("note times and length", () => {
  const now = Date.parse("2026-11-06T03:30:00Z");
  assert.equal(hoursAgo("2026-11-06T00:00:00Z", now), "hace 3 h");
  assert.equal(hoursAgo("2026-11-06T03:29:40Z", now), "recién");
  assert.equal(hoursLeft("2026-11-07T00:00:00Z", now), "quedan 20 h");
  assert.equal(hoursLeft("2026-11-06T04:30:00Z", now), "queda 1 h");
  assert.equal(noteLength(" hola ✨ "), 6);
});

test("visitas y favoritos: the row reserves both icons and gaps", () => {
  const w = statsRowWidth("12", "3", 10, t => t.length * 6);
  assert.ok(w > 3 * 6 + 2 * 10, "text plus two icons");
});

test("note box v2: one fixed size per style, shown empty only when styled, input clipped to one line of 60", async () => {
  const { noteBoxHeight, noteReserve, noteBoxVisible, clipNote, resolveNoteBox: r, NOTE_BOX_GAP } = await import("./noteBox");
  const st = r(undefined);
  assert.equal(noteBoxHeight(st), noteBoxHeight(r({})), "the note's text never changes the size");
  assert.ok(noteBoxHeight(r({ fontSize: 19 })) > noteBoxHeight(st));
  assert.equal(noteReserve(r({ h: 1.1 })), noteBoxHeight(r({ h: 1.1 })) + NOTE_BOX_GAP);
  assert.ok(noteBoxHeight(r({ h: 1.15 })) > noteBoxHeight(st) && noteBoxHeight(r({ h: 9 })) === noteBoxHeight(r({ h: 1.15 })));
  assert.equal(noteBoxVisible(false, undefined), false);
  assert.equal(noteBoxVisible(false, {}), false);
  assert.equal(noteBoxVisible(false, { bg: "#000000" }), true);
  assert.equal(noteBoxVisible(true, undefined), true);
  assert.equal(clipNote("a\nb"), "a b");
  assert.equal(Array.from(clipNote("😀".repeat(70))).length, 60);
});

test("note box: Separación 8–48 (floating adds on top); the card stays centered and is not shrunk by stickers above", async () => {
  const { noteGap, withNoteRoom, NOTE_GAP } = await import("./noteBox");
  assert.equal(noteGap({}), 28);
  assert.equal(noteGap({ noteBox: { gap: 4 } }), NOTE_GAP.min);
  assert.equal(noteGap({ noteBox: { gap: 99 } }), NOTE_GAP.max);
  assert.equal(noteGap({ noteBox: { gap: 20 }, effects: { animations: { floating: true, floatHeight: 10 } } }), 30);
  // a 400 tall card: the note's 120 px of room are mirrored below, centered on the card
  const r = withNoteRoom({ x: 0, y: 100, w: 300, h: 400 }, 400, 120);
  assert.deepEqual([r.y, r.h], [-20, 640]);
  // stickers already reaching 150 px above and below: no extra room needed
  const s = withNoteRoom({ x: 0, y: -50, w: 300, h: 700 }, 400, 120);
  assert.deepEqual([s.y, s.h], [-50, 700]);
});
