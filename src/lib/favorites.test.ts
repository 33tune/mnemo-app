import { test } from "node:test";
import assert from "node:assert/strict";
import { sortShortcuts, barShortcuts, type Shortcut } from "./shortcuts";
import { statsRowWidth } from "./profileCardLayout";

const s = (handle: string, o: Partial<Shortcut> = {}): Shortcut => ({
  userId: handle, handle, name: handle, photo: null, pfpRadius: "50%", bg: "#000", nameColor: "#fff",
  pinned: false, hidden: false, visits: 0, favoritedAt: "2026-11-01T00:00:00Z", ...o,
});

test("shortcuts: pinned, then visits, then newest favorite; hidden out of the bar", () => {
  const list = [
    s("a", { visits: 9 }), s("b", { pinned: true }), s("c", { visits: 5 }), s("d", { visits: 3 }),
    s("e", { favoritedAt: "2026-11-05T00:00:00Z" }), s("f", { hidden: true, pinned: true }),
  ];
  assert.deepEqual(sortShortcuts(list).map(x => x.handle), ["b", "f", "a", "c", "d", "e"]);
  assert.deepEqual(barShortcuts(list).map(x => x.handle), ["b", "a", "c", "d", "e"]);
});

test("visitas y favoritos: the row reserves both icons and gaps", () => {
  const w = statsRowWidth("12", "3", 10, t => t.length * 6);
  assert.ok(w > 3 * 6 + 2 * 10, "text plus two icons");
});

