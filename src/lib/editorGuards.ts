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
