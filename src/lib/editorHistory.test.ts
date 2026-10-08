// Editor v3 Phase C (D3) — global undo / redo: one gesture = one entry,
// undo → redo, grouping, add / delete without regression, publication
// order, nothing lost in the queue.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEditorHistory, snap, ABSENT, sameValue, changedKeys, restorePatch, isSystemLayoutWrite,
  mergeQueuedPatches, undoShortcutOwner, historyShortcut, isTextEntry, HISTORY_MAX, type HistoryTimers,
} from "./editorHistory";
import { historyOps, elementOps } from "./objectControllers";
import type { CanvasElement } from "@/types";

/** Manual timers: `fire()` runs the pending idle callback. */
function fakeTimers() {
  let fn: (() => void) | null = null;
  const timers: HistoryTimers = { set: f => { fn = f; return 1; }, clear: () => { fn = null; } };
  return { timers, fire: () => { const f = fn; fn = null; f?.(); }, pending: () => fn != null };
}

/** Minimal op replay (same semantics as CanvasBoard's applyOp / reduceOp). */
type Op = { type: string; id?: string; patch?: Record<string, unknown>; [k: string]: unknown };
function apply(els: CanvasElement[], op: Op): CanvasElement[] {
  if (op.type.startsWith("add_")) { const el = op[op.type.slice(4)] as CanvasElement; return els.some(e => e.id === el.id) ? els : [...els, el]; }
  if (op.type.startsWith("update_")) return els.map(e => e.id === op.id ? { ...e, ...op.patch } as CanvasElement : e);
  if (op.type.startsWith("delete_")) return els.filter(e => e.id !== op.id);
  return els;
}

const card = (over: Record<string, unknown> = {}) =>
  ({ id: "p", elementType: "profile", x: 10, y: 44, w: 300, h: 300, name: "Mara", ...over }) as unknown as CanvasElement;

// ── One gesture = one entry ────────────────────────────────────────────────

test("a slider drag (pointer gesture) with many onChange writes = ONE entry; the live value is not recorded per tick", () => {
  const t = fakeTimers();
  const h = createEditorHistory({ timers: t.timers });
  const before = card({ nameFontSize: 15 });
  h.pointerDown();
  let after = before;
  for (const v of [16, 18, 22, 30, 28]) {
    const next = { ...after, nameFontSize: v } as CanvasElement;
    h.record("el:p", snap(before), snap(next));
    after = next;
  }
  assert.equal(t.pending(), false, "no idle timer ends a pointer gesture");
  h.pointerUp();
  assert.deepEqual(h.size(), { undo: 1, redo: 0 });
  const e = h.undo()!;
  assert.deepEqual((e.changes.get("el:p")!.before.value as Record<string, unknown>).nameFontSize, 15);
  assert.deepEqual((e.changes.get("el:p")!.after.value as Record<string, unknown>).nameFontSize, 28);
});

test("keyboard / typing: writes coalesce until ~500ms without writes (or a focus change)", () => {
  const t = fakeTimers();
  const h = createEditorHistory({ timers: t.timers });
  h.record("el:p", snap(card({ name: "M" })), snap(card({ name: "Ma" })));
  h.record("el:p", snap(card({ name: "Ma" })), snap(card({ name: "Mar" })));
  assert.equal(h.size().undo, 0, "still open while typing");
  t.fire();
  assert.equal(h.size().undo, 1, "the pause ends the gesture");
  h.record("el:p", snap(card({ name: "Mar" })), snap(card({ name: "Mara" })));
  h.focusChanged();
  assert.equal(h.size().undo, 2, "blur / focus change ends it too");
  const last = h.undo()!;
  assert.equal((last.changes.get("el:p")!.before.value as { name: string }).name, "Mar");
});

test("a focus change during a pointer gesture does not split it", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  h.pointerDown();
  h.record("el:p", snap(card()), snap(card({ w: 320 })));
  h.focusChanged();
  h.record("el:p", snap(card()), snap(card({ w: 340 })));
  h.pointerUp();
  assert.equal(h.size().undo, 1);
});

test("a no-op gesture (value back where it started) leaves no entry", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  h.pointerDown();
  h.record("el:p", snap(card()), snap(card({ w: 320 })));
  h.record("el:p", snap(card()), snap(card()));
  h.pointerUp();
  assert.equal(h.canUndo(), false);
});

// ── Undo → redo ────────────────────────────────────────────────────────────

test("undo → redo round-trips the exact state; a new edit after undo clears redo", () => {
  const t = fakeTimers();
  const h = createEditorHistory({ timers: t.timers });
  let els = [card()];
  const before = els[0];
  const after = card({ name: "Nico", effects: { glow: { intensity: 0.4 } } });
  h.record("el:p", snap(before), snap(after)); h.close();
  els = [after];

  const u = historyOps(h.undo()!, "undo", id => els.find(e => e.id === id));
  for (const op of u.ops) els = apply(els, op);
  assert.ok(sameValue(els[0], before), "undo restores the before object (the added `effects` key is cleared)");
  assert.deepEqual([u.addedIds, u.removedIds], [[], []], "a property change never touches the selection (review C-1)");

  const r = historyOps(h.redo()!, "redo", id => els.find(e => e.id === id));
  for (const op of r.ops) els = apply(els, op);
  assert.ok(sameValue(els[0], after));

  h.undo();
  h.record("el:p", snap(before), snap(card({ name: "Otro" }))); h.close();
  assert.equal(h.canRedo(), false, "redo is cleared by a new entry");
});

test("undo writes ONLY the keys the entry changed — a concurrent unrelated write survives", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  h.record("el:p", snap(card()), snap(card({ name: "Nico" }))); h.close();
  // Meanwhile the centering effect moved the card (not recorded).
  const live = card({ name: "Nico", x: 99 });
  const { ops } = historyOps(h.undo()!, "undo", () => live);
  assert.deepEqual(ops, [{ type: "update_profile", id: "p", patch: { name: "Mara" } }]);
});

// ── Grouping ───────────────────────────────────────────────────────────────

test("several targets in one gesture (group move, multi-delete, paste) = one entry, undone together", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  const a = { id: "a", elementType: "image", x: 0, y: 0 } as unknown as CanvasElement;
  const b = { id: "b", elementType: "text", x: 5, y: 5 } as unknown as CanvasElement;
  h.pointerDown();
  h.record("el:a", snap(a), snap({ ...a, x: 50 }));
  h.record("el:b", snap(b), snap({ ...b, x: 55 }));
  h.pointerUp();
  assert.equal(h.size().undo, 1);
  const { ops } = historyOps(h.undo()!, "undo", id => (id === "a" ? { ...a, x: 50 } : { ...b, x: 55 }) as CanvasElement);
  assert.deepEqual(ops.map(o => o.type), ["update_image", "update_text"]);
});

test("close() separates discrete actions (Delete then paste = two entries)", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  const a = { id: "a", elementType: "image" } as unknown as CanvasElement;
  h.record("el:a", snap(a), ABSENT); h.close();
  h.record("el:c", ABSENT, snap({ id: "c", elementType: "card" })); h.close();
  assert.equal(h.size().undo, 2);
});

test("history is capped at 50 entries (the old stack's MAX_UNDO)", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  for (let i = 0; i < 60; i++) { h.record("el:p", snap(card({ w: i })), snap(card({ w: i + 1 }))); h.close(); }
  assert.equal(h.size().undo, HISTORY_MAX);
});

// ── Add / delete (migration of the old stack, no regression) ───────────────

test("delete → undo re-adds the whole element (selected) → redo deletes it again", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  const img = { id: "i", elementType: "image", x: 1, y: 2, src: "u", storage_path: "s" } as unknown as CanvasElement;
  let els: CanvasElement[] = [img];
  h.record("el:i", snap(img), ABSENT); h.close();
  els = [];
  const u = historyOps(h.undo()!, "undo", id => els.find(e => e.id === id));
  assert.deepEqual(u.ops, [elementOps.add(img)]);
  assert.deepEqual(u.addedIds, ["i"], "the re-added element is selected, like the old undo");
  for (const op of u.ops) els = apply(els, op);
  const r = historyOps(h.redo()!, "redo", id => els.find(e => e.id === id));
  assert.deepEqual(r.ops, [{ type: "delete_image", id: "i" }]);
  assert.deepEqual(r.removedIds, ["i"]);
});

test("add (paste / + menu) → undo deletes it and leaves nothing selected", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  const t = { id: "t", elementType: "text", x: 0, y: 0 } as unknown as CanvasElement;
  h.record("el:t", ABSENT, snap(t)); h.close();
  const u = historyOps(h.undo()!, "undo", () => t);
  assert.deepEqual(u.ops, [{ type: "delete_text", id: "t" }]);
  assert.deepEqual(u.removedIds, ["t"], "only the removed id leaves the selection");
  assert.deepEqual(u.addedIds, []);
});

test("room settings (MyLand background) restore through their set_* op", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  h.record("room:set_bg", snap("#000000"), snap("#ff00ff")); h.close();
  const u = historyOps(h.undo()!, "undo", () => undefined);
  assert.deepEqual(u.ops, [{ type: "set_bg", value: "#000000" }]);
  assert.deepEqual([u.addedIds, u.removedIds], [[], []], "selection untouched");
});

// ── System writes ──────────────────────────────────────────────────────────

test("ProfileCard re-centering (x/y/h only, outside a gesture) is not an undo step; inside one it joins it", () => {
  const recenter = { type: "update_profile", patch: { x: 120, y: 60 } };
  assert.equal(isSystemLayoutWrite(recenter, { pointerActive: false, entryOpen: false }), true);
  assert.equal(isSystemLayoutWrite(recenter, { pointerActive: true, entryOpen: false }), false, "card resize drag");
  assert.equal(isSystemLayoutWrite(recenter, { pointerActive: false, entryOpen: true }), false, "growth right after an edit");
  assert.equal(isSystemLayoutWrite({ type: "update_profile", patch: { w: 300, h: 300, x: 1, y: 2 } }, { pointerActive: false, entryOpen: false }), false,
    "every user size write carries w (Medidas, Ctrl+arrows)");
  assert.equal(isSystemLayoutWrite({ type: "update_image", patch: { x: 1 } }, { pointerActive: false, entryOpen: false }), false);
});

// ── Diff helpers ───────────────────────────────────────────────────────────

test("an `undefined` key equals a missing key; a cleared key is restored as undefined", () => {
  assert.ok(sameValue({ a: 1, b: undefined }, { a: 1 }));
  assert.deepEqual(changedKeys({ a: 1, c: 3 }, { a: 2, b: 1, c: 3 }).sort(), ["a", "b"]);
  assert.deepEqual(restorePatch({ a: 1 }, ["a", "b"]), { a: 1, b: undefined });
});

// ── Persistence queue: order kept, nothing lost ────────────────────────────

test("queue: consecutive patches of the same object merge; order and final state are preserved", () => {
  const q = (op: Op, canvas_type = "space") => ({ op, canvas_type });
  const batch = [
    q({ type: "update_profile", id: "p", patch: { nameFontSize: 16 } }),
    q({ type: "update_profile", id: "p", patch: { nameFontSize: 18 } }),
    q({ type: "update_profile", id: "p", patch: { name: "X" } }),
    q({ type: "update_image", id: "i", patch: { x: 1 } }),
    q({ type: "update_profile", id: "p", patch: { nameFontSize: 20 } }),
    q({ type: "delete_image", id: "i" }),
    q({ type: "update_profile", id: "p", patch: { bio: undefined } }),
    q({ type: "update_profile", id: "p", patch: { bio: "b" } }, "space_mobile"),
  ];
  const merged = mergeQueuedPatches(batch);
  assert.deepEqual(merged.map(m => m.op.type), ["update_profile", "update_image", "update_profile", "delete_image", "update_profile", "update_profile"]);
  assert.deepEqual(merged[0].op.patch, { nameFontSize: 18, name: "X" });
  // Replaying merged == replaying the original (publication order intact).
  const start = [card(), { id: "i", elementType: "image", x: 0 } as unknown as CanvasElement];
  const replay = (b: typeof batch) => b.reduce((els, { op }) => apply(els, op), start);
  assert.ok(sameValue(replay(merged), replay(batch)));
  assert.equal(mergeQueuedPatches([]).length, 0);
});

// ── Shortcuts ──────────────────────────────────────────────────────────────

test("Ctrl/⌘+Z undoes, Shift+Ctrl/⌘+Z and Ctrl+Y redo; text fields keep the native undo; <body> never acts", () => {
  const k = (key: string, o: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) =>
    historyShortcut({ key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...o });
  assert.equal(k("z", { ctrlKey: true }), "undo");
  assert.equal(k("z", { metaKey: true }), "undo");
  assert.equal(k("Z", { ctrlKey: true, shiftKey: true }), "redo");
  assert.equal(k("y", { ctrlKey: true }), "redo");
  assert.equal(k("z"), null);
  assert.equal(k("z", { ctrlKey: true, altKey: true }), null);

  const el = (tagName: string, inside: string | null, type?: string) =>
    ({ tagName, type, closest: (sel: string) => (inside && sel.includes(inside) ? {} : null) });
  assert.equal(undoShortcutOwner(el("INPUT", "data-mnemo-editor", "text"), el("INPUT", "data-mnemo-editor", "text")), "native");
  assert.equal(undoShortcutOwner(el("TEXTAREA", "data-mnemo-editor"), el("TEXTAREA", "data-mnemo-editor")), "native");
  assert.equal(undoShortcutOwner(el("INPUT", "data-mnemo-editor", "range"), el("INPUT", "data-mnemo-editor", "range")), "history", "a slider in the inspector");
  assert.equal(undoShortcutOwner(el("BUTTON", "data-mnemo-editor"), el("BUTTON", "data-mnemo-editor")), "history");
  assert.equal(undoShortcutOwner(el("DIV", "data-mnemo-canvas"), el("DIV", "data-mnemo-canvas")), "history", "the canvas");
  assert.equal(undoShortcutOwner(el("BODY", null), el("BODY", null)), "ignore", "focus on <body>");
  assert.equal(isTextEntry({ tagName: "INPUT" }), true, "input without type = text");
  assert.equal(isTextEntry({ tagName: "DIV", isContentEditable: true }), true);
});

// ── Review round (Phase C) ─────────────────────────────────────────────────

test("color popover: a hold keeps every drag / typed value in ONE step until it closes", () => {
  const t = fakeTimers();
  const h = createEditorHistory({ timers: t.timers });
  const release = h.hold();
  h.pointerDown(); h.record("el:p", snap(card()), snap(card({ nameColor: "#111" }))); h.pointerUp();
  h.pointerDown(); h.record("el:p", snap(card()), snap(card({ nameColor: "#222" }))); h.pointerUp();
  h.record("el:p", snap(card()), snap(card({ nameColor: "#333" }))); t.fire(); h.focusChanged();
  assert.equal(h.size().undo, 0, "still one open step");
  h.pointerDown(); // the outside pointerdown that closes the popover…
  release();       // …ends its step before that gesture writes anything
  assert.equal(h.size().undo, 1);
  assert.equal((h.undo()!.changes.get("el:p")!.after.value as { nameColor: string }).nameColor, "#333");
});

test("an upload that finishes rewrites every stored copy (no blob: URL ever written back); a failed one is forgotten", () => {
  const h = createEditorHistory({ timers: fakeTimers().timers });
  const blob = { id: "i", elementType: "image", src: "blob:x", isLocal: true } as unknown as CanvasElement;
  h.record("el:i", ABSENT, snap(blob)); h.close();
  h.record("el:i", snap(blob), snap({ ...blob, x: 9 })); h.close();
  h.rebase("el:i", { src: "https://cdn/i.png", isLocal: false, storage_path: "p" });
  const moved = h.undo()!;
  assert.equal((moved.changes.get("el:i")!.before.value as { src: string }).src, "https://cdn/i.png");
  const added = h.undo()!;
  const { ops } = historyOps(added, "redo", () => undefined);
  assert.equal((ops[0].image as { src: string }).src, "https://cdn/i.png", "redo re-adds the stored file");
  h.redo(); h.redo();
  h.forget("el:i");
  assert.equal(h.canUndo(), false, "entries left empty are dropped");
});

test("text fields pause longer (record idle override); Ctrl+Z works on non-Latin layouts via the key code", () => {
  const set: number[] = [];
  const h = createEditorHistory({ timers: { set: (_f, ms) => { set.push(ms); return 1; }, clear: () => {} } });
  h.record("el:p", snap(card()), snap(card({ bio: "a" })), 1200);
  assert.deepEqual(set, [1200]);
  assert.equal(historyShortcut({ key: "я", code: "KeyZ", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }), "undo");
  assert.equal(historyShortcut({ key: "н", code: "KeyY", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }), "redo");
});
