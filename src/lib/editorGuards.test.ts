import { test } from "node:test";
import assert from "node:assert/strict";
import { isEditableElement, isInsideEditor, shouldSkipCanvasShortcut, isEventFromNode, isEditorOpen, EDITOR_ATTR, type GuardElement } from "./editorGuards";

function el(tagName: string, opts: { editable?: boolean; inEditor?: boolean } = {}): GuardElement {
  return {
    tagName,
    isContentEditable: !!opts.editable,
    closest: (sel: string) => (opts.inEditor && sel === `[${EDITOR_ATTR}]` ? {} : null),
  };
}

test("isEditableElement: inputs, textareas, selects and contenteditable", () => {
  assert.equal(isEditableElement(el("INPUT")), true);
  assert.equal(isEditableElement(el("textarea")), true);
  assert.equal(isEditableElement(el("SELECT")), true);
  assert.equal(isEditableElement(el("DIV", { editable: true })), true);
  assert.equal(isEditableElement(el("BUTTON")), false);
  assert.equal(isEditableElement(null), false);
});

test("isInsideEditor: anything under a data-mnemo-editor root", () => {
  assert.equal(isInsideEditor(el("BUTTON", { inEditor: true })), true);
  assert.equal(isInsideEditor(el("DIV", { inEditor: true })), true);
  assert.equal(isInsideEditor(el("BUTTON")), false);
  assert.equal(isInsideEditor({}), false, "no closest() (e.g. window/document) is not an editor");
});

test("shouldSkipCanvasShortcut: a focused <button> inside a menu panel blocks Delete/Ctrl+Z (the P0 bug)", () => {
  const btn = el("BUTTON", { inEditor: true });
  assert.equal(shouldSkipCanvasShortcut(btn, btn), true);
});

test("shouldSkipCanvasShortcut: panel focused, body target (or vice versa) still skips", () => {
  const body = el("BODY");
  const panel = el("DIV", { inEditor: true });
  assert.equal(shouldSkipCanvasShortcut(body, panel), true);
  assert.equal(shouldSkipCanvasShortcut(panel, body), true);
});

test("shouldSkipCanvasShortcut: plain canvas focus lets shortcuts run", () => {
  const body = el("BODY");
  assert.equal(shouldSkipCanvasShortcut(body, body), false);
  assert.equal(shouldSkipCanvasShortcut(el("BUTTON"), el("BUTTON")), false);
  assert.equal(shouldSkipCanvasShortcut(null, null), false);
});

test("shouldSkipCanvasShortcut: text inputs anywhere still skip (pre-existing behavior)", () => {
  assert.equal(shouldSkipCanvasShortcut(el("INPUT"), el("INPUT")), true);
});

test("isEventFromNode: only targets inside the node's DOM subtree count", () => {
  const inside = { id: "inside" };
  const portaled = { id: "portaled-panel" };
  const node = { contains: (o: unknown) => o === inside };
  assert.equal(isEventFromNode(node, inside), true);
  assert.equal(isEventFromNode(node, portaled), false);
  assert.equal(isEventFromNode(null, inside), false);
  assert.equal(isEventFromNode(node, null), false);
});

test("isEditorOpen: any mounted data-mnemo-editor root counts, regardless of focus", () => {
  assert.equal(isEditorOpen({ querySelector: (s: string) => (s === `[${EDITOR_ATTR}]` ? {} : null) }), true);
  assert.equal(isEditorOpen({ querySelector: () => null }), false);
  assert.equal(isEditorOpen(null), false);
});
