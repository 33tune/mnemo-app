// Editor v3 Phase B (D1) — the single selection / inspector-target store.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  editorSelectionReducer as reduce, INITIAL_EDITOR_SELECTION, createSelectionMemory, profileTargetId, targetId,
  profileInspectorId, profileEditButtonId, type EditorSelectionState,
} from "./editorSelection";

const sel = (...ids: string[]): EditorSelectionState => ({ selectedIds: new Set(ids), target: null });
const openCard = (s: EditorSelectionState, id: string) =>
  reduce(s, { type: "open", target: { kind: "profile", id, objectId: "name" } });

test("select keeps the old useState contract: value or updater; same Set = same state", () => {
  const s0 = INITIAL_EDITOR_SELECTION;
  const s1 = reduce(s0, { type: "select", ids: new Set(["a"]) });
  assert.deepEqual([...s1.selectedIds], ["a"]);
  const s2 = reduce(s1, { type: "select", ids: prev => { const n = new Set(prev); n.add("b"); return n; } });
  assert.deepEqual([...s2.selectedIds], ["a", "b"]);
  assert.equal(reduce(s2, { type: "select", ids: prev => prev }), s2, "no-op updater: no new state (no re-render)");
});

test("the inspector opens only for a selected element, and closes IN THE SAME UPDATE when it leaves the selection", () => {
  assert.equal(openCard(sel(), "card").target, null, "nothing selected: does not open");
  const open = openCard(sel("card"), "card");
  assert.equal(profileTargetId(open.target), "card");
  // Deselect / select something else / delete: closed with the selection change itself.
  assert.equal(reduce(open, { type: "select", ids: new Set() }).target, null);
  assert.equal(reduce(open, { type: "select", ids: new Set(["img"]) }).target, null);
  // Still selected (e.g. shift-adding another element): stays open.
  assert.equal(profileTargetId(reduce(open, { type: "select", ids: new Set(["card", "img"]) }).target), "card");
});

test("close, and setObject only on an open ProfileCard target with a known object", () => {
  const open = openCard(sel("card"), "card");
  const fx = reduce(open, { type: "setObject", objectId: "cardFx" });
  assert.deepEqual(fx.target, { kind: "profile", id: "card", objectId: "cardFx" });
  assert.equal(reduce(fx, { type: "setObject", objectId: "cardFx" }), fx, "same object: same state");
  assert.equal(reduce(fx, { type: "setObject", objectId: "nope" as never }), fx, "unknown object ignored");
  assert.equal(reduce(sel("card"), { type: "setObject", objectId: "bio" }).target, null, "closed: ignored");
  const closed = reduce(fx, { type: "close" });
  assert.equal(closed.target, null);
  assert.equal(reduce(closed, { type: "close" }), closed);
  assert.equal(closed.selectedIds, fx.selectedIds, "closing never touches the selection (Esc layering: close, then deselect)");
});

test("'room' (Tu sala, Phase D) is valid only with an empty selection", () => {
  const room = reduce(sel(), { type: "open", target: { kind: "room" } });
  assert.deepEqual(room.target, { kind: "room" });
  assert.equal(targetId(room.target), null);
  assert.equal(reduce(room, { type: "select", ids: new Set(["a"]) }).target, null);
  assert.equal(reduce(sel("a"), { type: "open", target: { kind: "room" } }).target, null);
});

test("open/close never produce element writes: the state has no elements at all (card.x/y untouched)", () => {
  const open = openCard(sel("card"), "card");
  assert.deepEqual(Object.keys(open).sort(), ["selectedIds", "target"]);
});

test("session memory (absorbs inspectorSession): last object and scroll per card", () => {
  const m = createSelectionMemory();
  assert.equal(m.activeObject("a"), "name");
  m.setActiveObject("a", "cardFx");
  m.setScroll("a", "cardFx", 240.4);
  m.setScroll("a", "name", -5);
  assert.equal(m.activeObject("a"), "cardFx");
  assert.equal(m.activeObject("b"), "name", "per card");
  assert.equal(m.scrollOf("a", "cardFx"), 240);
  assert.equal(m.scrollOf("a", "name"), 0);
});

test("stable ids for the inspector and its 'Editar' opener", () => {
  assert.equal(profileInspectorId("x"), "mnemo-profile-editor-x");
  assert.equal(profileEditButtonId("x"), "mnemo-profile-edit-x");
});
