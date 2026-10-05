/**
 * Block 1 (editor safety): pure guards shared by CanvasBoard.tsx's global
 * keyboard shortcuts and the cards that portal an editor panel inside
 * their own React tree (ProfileCard.tsx).
 *
 * Keyboard: CanvasBoard's window-level keydown handler deletes the
 * selection on Backspace/Delete (including the ProfileCard itself, which
 * a solo selection is allowed to delete) and pops the undo stack on
 * Ctrl+Z. Before this, the only guard was "focus is in an input/textarea/
 * select/contenteditable" — a focused <button>, Toggle, swatch or the bare
 * panel inside a config menu didn't count, so pressing Backspace right
 * after clicking a menu control deleted the card being edited. Now ANY
 * event whose target (or the focused element) sits inside an element
 * marked `data-mnemo-editor` (MenuPanel's root) is ignored by canvas
 * shortcuts.
 *
 * Pointer: React synthetic events bubble through portals along the fiber
 * tree, not the DOM tree — see isEventFromNode below.
 */

/** Attribute every editor panel root carries (MenuPanel.tsx). */
export const EDITOR_ATTR = "data-mnemo-editor";
/** Block 2 review: styling scope for editor-like UI that is NOT a panel
 * root (the "+" menu and the MyLand settings submenu in CanvasBoard). For
 * KEYBOARD shortcuts it is editor territory too — a focused color well or
 * button there must not let Backspace delete the selected canvas element —
 * but it deliberately does NOT count for isEditorOpen(): an open "+" menu
 * isn't an editor, and gating every Delete on it would change the canvas'
 * behavior while that menu is merely open. */
export const EDITOR_UI_ATTR = "data-mnemo-ui";

/** Minimal structural shape of a DOM element these guards need — lets the
 * tests pass plain objects instead of requiring a DOM. */
export interface GuardElement {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
  hasAttribute?: (name: string) => boolean;
}

/** Text-entry elements, where single-key shortcuts must never fire. */
export function isEditableElement(el: GuardElement | null | undefined): boolean {
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return !!el.isContentEditable;
}

/** True when `el` is (inside) an editor panel root or editor-styled UI. */
export function isInsideEditor(el: GuardElement | null | undefined): boolean {
  if (!el || typeof el.closest !== "function") return false;
  return el.closest(`[${EDITOR_ATTR}], [${EDITOR_UI_ATTR}]`) != null;
}

/**
 * Should a global canvas shortcut (Delete/Backspace, Ctrl+Z/C/V/D,
 * Escape, paste) be skipped? Checks both the event target and the
 * currently focused element — for keydown they're usually the same, but
 * paste/keyboard events dispatched while focus is on <body> after a click
 * inside a non-focusable panel area would otherwise slip through (MenuPanel
 * is focusable for exactly that reason, see its tabIndex).
 */
export function shouldSkipCanvasShortcut(
  target: GuardElement | null | undefined,
  active: GuardElement | null | undefined,
): boolean {
  return isEditableElement(target) || isEditableElement(active)
    || isInsideEditor(target) || isInsideEditor(active);
}

/**
 * Whether a (React) event really originated inside `node`'s DOM subtree.
 * A panel portaled to document.body from INSIDE a card's JSX is a fiber
 * descendant of that card, so its mousemove/mouseover bubble to the card's
 * React handlers even though, in the DOM, the panel isn't inside the card
 * at all — this is what tells the two apart.
 */
export function isEventFromNode(
  node: { contains: (other: never) => boolean } | null | undefined,
  target: unknown,
): boolean {
  if (!node || target == null) return false;
  return node.contains(target as never);
}

/**
 * Is any editor panel mounted right now? Destructive canvas shortcuts
 * (Delete/Backspace, Ctrl/Cmd+Z) are skipped whenever one is, regardless of
 * focus: opening a menu from the gear (a non-focusable div) or tabbing out
 * of the panel leaves focus on <body>, where the target/focus checks above
 * can't tell a menu is open — and Backspace would delete the card being
 * edited. Escape and copy/paste are NOT gated by this (Escape must keep
 * working to close things).
 */
export function isEditorOpen(root: { querySelector: (selector: string) => unknown } | null | undefined): boolean {
  if (!root) return false;
  return root.querySelector(`[${EDITOR_ATTR}]`) != null;
}

// ── Iteration 0 (menu design refinement): POSITIVE canvas guard ─────────────

/** Attribute on the editor canvas wrapper (CanvasBoard.tsx). Clicking the
 * canvas focuses it (mousedown capture), so "focus is on the canvas" is a
 * real, observable state instead of an ambiguous <body>. */
export const CANVAS_ATTR = "data-mnemo-canvas";
/** Review r2: canvas chrome buttons ("Editar", lock, rotate, toolbar
 * buttons, LINK). A POINTER press on one returns focus to the canvas
 * wrapper (so Delete/arrows/Ctrl+Z keep working after clicking "FR" or the
 * lock); keyboard activation keeps focus on the button. */
export const CHROME_ATTR = "data-mnemo-chrome";

/** True when `el` is the canvas wrapper or sits inside it. */
export function isInsideCanvas(el: GuardElement | null | undefined): boolean {
  if (!el || typeof el.closest !== "function") return false;
  return el.closest(`[${CANVAS_ATTR}]`) != null;
}

/**
 * May a canvas shortcut that edits/destroys the selection (Delete/Backspace,
 * Ctrl/⌘+Z/C/V/D, arrow nudge/resize, `[`/`]`/Enter selection keys) run?
 *
 * POSITIVE guard: only when focus is ON THE CANVAS WRAPPER ITSELF (the
 * element carrying data-mnemo-canvas) and the event targets it. Review r2
 * (A11y-2 / Critic-5): a focused interactive child of the canvas — a
 * Contact Link <a>, the Music play/mute buttons, an "Editar"/lock button —
 * keeps its own keys (Enter activates the link, Space plays, arrows are
 * native); the canvas never steals them. Focus on <body> NEVER allows: it
 * is what's left after a panel/popover closes or a focused button unmounts
 * itself. Unlike isEditorOpen(), this does not depend on what is MOUNTED —
 * an always-mounted docked inspector (Iteration 1) doesn't change the
 * answer; only where focus is does.
 */
export function isCanvasRoot(el: GuardElement | null | undefined): boolean {
  return !!el && typeof el.hasAttribute === "function" && el.hasAttribute(CANVAS_ATTR);
}

export function canvasShortcutAllowed(
  target: GuardElement | null | undefined,
  active: GuardElement | null | undefined,
): boolean {
  if (!target || !active) return false;
  return isCanvasRoot(active) && isCanvasRoot(target);
}

/** Should a mousedown at `target` move focus to the canvas wrapper? No for
 * text-entry targets (the free text being edited keeps its caret) and for
 * editor / editor-UI surfaces (an opener button keeps its own focus). The
 * caller also checks DOM containment (isEventFromNode) — React propagates
 * capture events from portaled panels through the card's fiber tree. */
export function shouldFocusCanvasOnMouseDown(target: GuardElement | null | undefined): boolean {
  if (!target) return false;
  return !isEditableElement(target) && !isInsideEditor(target);
}
