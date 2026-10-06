import { test } from "node:test";
import assert from "node:assert/strict";
import { isEditableElement, isInsideEditor, shouldSkipCanvasShortcut, isEventFromNode, isEditorOpen, EDITOR_ATTR, EDITOR_UI_ATTR, type GuardElement } from "./editorGuards";

function el(tagName: string, opts: { editable?: boolean; inEditor?: boolean } = {}): GuardElement {
  return {
    tagName,
    isContentEditable: !!opts.editable,
    closest: (sel: string) => (opts.inEditor && sel.split(",").map(x => x.trim()).includes(`[${EDITOR_ATTR}]`) ? {} : null),
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

test("Block 2 review: [data-mnemo-ui] (MyLand / + menu) is editor territory for shortcuts, not for isEditorOpen", () => {
  const inUi: GuardElement = {
    tagName: "BUTTON",
    closest: (sel: string) => (sel.split(",").map(x => x.trim()).includes(`[${EDITOR_UI_ATTR}]`) ? {} : null),
  };
  assert.equal(isInsideEditor(inUi), true);
  assert.equal(shouldSkipCanvasShortcut(inUi, null), true, "a focused well/button in MyLand must not let Backspace delete");
  assert.equal(shouldSkipCanvasShortcut(null, inUi), true);
  // isEditorOpen keeps looking for panel roots only.
  assert.equal(isEditorOpen({ querySelector: (s: string) => (s === `[${EDITOR_UI_ATTR}]` ? {} : null) }), false);
});

// ── Iteration 0: positive canvas guard ──────────────────────────────────────
import { canvasShortcutAllowed, shouldFocusCanvasOnMouseDown, isInsideCanvas, isCanvasRoot, CANVAS_ATTR } from "./editorGuards";

function node(tagName: string, where: { root?: boolean; canvas?: boolean; editor?: boolean; ui?: boolean; editable?: boolean } = {}): GuardElement {
  return {
    tagName,
    isContentEditable: !!where.editable,
    hasAttribute: (n: string) => !!where.root && n === CANVAS_ATTR,
    closest: (sel: string) => {
      const parts = sel.split(",").map(x => x.trim());
      if ((where.canvas || where.root) && parts.includes(`[${CANVAS_ATTR}]`)) return {};
      if (where.editor && parts.includes(`[${EDITOR_ATTR}]`)) return {};
      if (where.ui && parts.includes(`[${EDITOR_UI_ATTR}]`)) return {};
      return null;
    },
  };
}

test("canvasShortcutAllowed: focus on the canvas wrapper itself allows", () => {
  const wrapper = node("DIV", { root: true });
  assert.equal(canvasShortcutAllowed(wrapper, wrapper), true);
  assert.equal(isCanvasRoot(wrapper), true);
  assert.equal(isInsideCanvas(wrapper), true);
});

test("canvasShortcutAllowed (review r2): a focused interactive CHILD of the canvas keeps its keys", () => {
  const link = node("A", { canvas: true });
  assert.equal(canvasShortcutAllowed(link, link), false, "Enter on a Contact Link must open it, not select the card");
  const play = node("BUTTON", { canvas: true });
  assert.equal(canvasShortcutAllowed(play, play), false, "Space/Enter on Music play, Backspace must not delete");
  const editBtn = node("BUTTON", { canvas: true, ui: true });
  assert.equal(canvasShortcutAllowed(editBtn, editBtn), false, "Esc -> focus on Editar -> Backspace must not delete the card");
});

test("canvasShortcutAllowed: <body> NEVER allows (closed panel / self-unmounting button / fresh page)", () => {
  const body = node("BODY");
  const wrapper = node("DIV", { root: true });
  assert.equal(canvasShortcutAllowed(body, body), false);
  assert.equal(canvasShortcutAllowed(null, null), false);
  assert.equal(canvasShortcutAllowed(body, wrapper), false, "target on body");
  assert.equal(canvasShortcutAllowed(wrapper, null), false, "nothing focused");
});

test("canvasShortcutAllowed: editor panels, [data-mnemo-ui] (+ / MyLand) and text fields block", () => {
  const panelBtn = node("BUTTON", { editor: true });
  assert.equal(canvasShortcutAllowed(panelBtn, panelBtn), false);
  const myland = node("DIV", { ui: true });
  assert.equal(canvasShortcutAllowed(myland, myland), false);
  const editingText = node("DIV", { canvas: true, editable: true });
  assert.equal(canvasShortcutAllowed(editingText, editingText), false);
  const input = node("INPUT", { canvas: true });
  assert.equal(canvasShortcutAllowed(input, input), false);
});

test("shouldFocusCanvasOnMouseDown: skips text entry and editor/ui surfaces", () => {
  assert.equal(shouldFocusCanvasOnMouseDown(node("DIV", { canvas: true })), true);
  assert.equal(shouldFocusCanvasOnMouseDown(node("IMG", { canvas: true })), true);
  assert.equal(shouldFocusCanvasOnMouseDown(node("DIV", { canvas: true, editable: true })), false);
  assert.equal(shouldFocusCanvasOnMouseDown(node("BUTTON", { canvas: true, ui: true })), false);
  assert.equal(shouldFocusCanvasOnMouseDown(node("DIV", { editor: true })), false);
  assert.equal(shouldFocusCanvasOnMouseDown(null), false);
});

// ── Menu redesign Phase 2: the always-mounted docked inspector ─────────────

test("Phase 2: Backspace / Ctrl+Z inside the inspector aside or the ColorPopover never reach the canvas", () => {
  // Both are [data-mnemo-editor] roots (InspectorShell / ColorPopover), outside the canvas DOM.
  for (const tag of ["BUTTON", "DIV", "H2", "ASIDE"]) {
    const inAside = node(tag, { editor: true });
    assert.equal(canvasShortcutAllowed(inAside, inAside), false, `${tag} in the aside`);
    assert.equal(shouldSkipCanvasShortcut(inAside, inAside), true, `${tag} in the aside (negative guard: Esc)`);
  }
  // Focus in the aside, event dispatched at <body> (or the reverse): still blocked.
  const body = node("BODY");
  const aside = node("ASIDE", { editor: true });
  assert.equal(canvasShortcutAllowed(body, aside), false);
  assert.equal(canvasShortcutAllowed(aside, body), false);
});

test("Phase 2: an open inspector never blocks the canvas — the guard depends on focus, not on what is mounted", () => {
  const wrapper = node("DIV", { root: true });
  // Same answer whatever is mounted elsewhere: canvasShortcutAllowed takes no DOM root.
  assert.equal(canvasShortcutAllowed.length, 2);
  assert.equal(canvasShortcutAllowed(wrapper, wrapper), true, "inspector open, focus on the canvas: Delete/arrows work");
});
