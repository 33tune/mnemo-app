/**
 * MYLAND Editor v3 — Phase C (D3): global undo / redo.
 *
 * Rules (plan §5 "Deshacer/Rehacer global"):
 * - ONE editing gesture = ONE entry. Live preview still applies every
 *   onChange; only the history coalesces.
 * - Each entry keeps, per touched target, the state BEFORE the gesture and
 *   AFTER it — whole objects, so undo can remove keys the gesture added
 *   (written as `undefined`, the same way a reset clears a key today).
 * - Undo / redo are written back through the EXISTING ops (add_* / update_*
 *   / delete_* / set_*), so persistence, the "pending" Publish state and
 *   the public view keep working unchanged.
 *
 * Where a gesture ends (the caller drives these boundaries):
 * - pointer gesture (slider drag, color drag, canvas drag/resize/rotate,
 *   a click on a toggle / button): pointerdown … end of the pointerup task;
 * - keyboard / typing (slider arrows, text fields, hex): ~500ms without
 *   writes, or focus moving elsewhere;
 * - discrete canvas actions (Delete, paste, duplicate): closed explicitly.
 *
 * This module is pure (no React, no DOM, injectable timers) — CanvasBoard
 * feeds it from enqueueOp and applies what undo/redo return.
 */

/** A target's state: an element by id ("el:<id>") or a room setting
 * ("room:<key>"). `present: false` = the element does not exist. */
export interface Snap { present: boolean; value?: unknown }
export const ABSENT: Snap = { present: false };
export const snap = (value: unknown): Snap => ({ present: true, value });

export interface Change { before: Snap; after: Snap }
export interface HistoryEntry { changes: Map<string, Change> }

export const HISTORY_MAX = 50;
/** Keyboard pause that ends a gesture (plan: slider arrows "~500ms sin teclas"). */
export const HISTORY_IDLE_MS = 500;
/** Typing in a text field: a longer pause ("blur o pausa") so a sentence is
 * not split into several steps (review C-4). */
export const HISTORY_TEXT_IDLE_MS = 1200;

// ── Equality / diff ─────────────────────────────────────────────────────────

/** Structural equality where an `undefined` key equals a missing key (that
 * is how applyOp's `{ ...e, ...patch }` and JSON persistence behave). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => sameValue(v, bb[i]));
  }
  const ao = a as Record<string, unknown>, bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) if (!sameValue(ao[k], bo[k])) return false;
  return true;
}

export function sameSnap(a: Snap, b: Snap): boolean {
  return a.present === b.present && (!a.present || sameValue(a.value, b.value));
}

/** Top-level keys whose value differs between two objects. */
export function changedKeys(a: unknown, b: unknown): string[] {
  const ao = (a ?? {}) as Record<string, unknown>, bo = (b ?? {}) as Record<string, unknown>;
  return [...new Set([...Object.keys(ao), ...Object.keys(bo)])].filter(k => !sameValue(ao[k], bo[k]));
}

/** The patch that turns an object back into `to` — but ONLY for the keys
 * the entry itself changed (`keys`), so a concurrent, unrelated write (the
 * card's centering effect, another object's edit) is never clobbered.
 * Missing keys are written as `undefined` (= cleared, like a reset). */
export function restorePatch(to: unknown, keys: string[]): Record<string, unknown> {
  const t = (to ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of keys) patch[k] = t[k];
  return patch;
}

// ── History ────────────────────────────────────────────────────────────────

export interface HistoryTimers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}

export interface EditorHistory {
  /** Records one write: `before` is used only the first time the target is
   * touched in the open entry; `after` always replaces the entry's after.
   * `idleMs` overrides the pause that ends a keyboard gesture (text fields
   * use a longer one: "blur o pausa"). */
  record(target: string, before: Snap, after: Snap, idleMs?: number): void;
  /** The current "after" of a target inside the open entry (so several
   * writes to the same target in one task chain correctly). */
  pendingAfter(target: string): Snap | undefined;
  /** Ends the open entry (no-op entries are dropped) — unless a hold is
   * active (an open color popover), which ends it on release. */
  close(): void;
  isOpen(): boolean;
  /** A pointer gesture starts: closes what was open; until pointerUp, no
   * idle timer ends the entry. */
  pointerDown(): void;
  pointerUp(): void;
  isPointerActive(): boolean;
  /** Focus moved: ends a keyboard / typing gesture. */
  focusChanged(): void;
  /** Keeps ONE entry open across several pointer / keyboard gestures (the
   * color popover: "cerrar o confirmar"). Returns the release function;
   * the entry ends when the last hold is released. */
  hold(): () => void;
  /** A finished upload replaces a temporary value (blob: URL) in EVERY
   * stored snapshot of that target, so undo / redo never write it back. */
  rebase(target: string, patch: Record<string, unknown>): void;
  /** Drops a target from every entry (an upload that failed: its add and
   * automatic removal are not user steps). */
  forget(target: string): void;
  /** Pops the last entry (closing the open one first). The caller writes
   * each change's `before` back; returns null when there is nothing. */
  undo(): HistoryEntry | null;
  /** Re-applies the last undone entry (the caller writes each `after`). */
  redo(): HistoryEntry | null;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  size(): { undo: number; redo: number };
}

export function createEditorHistory(opts: { max?: number; idleMs?: number; timers?: HistoryTimers } = {}): EditorHistory {
  const max = opts.max ?? HISTORY_MAX;
  const idleMs = opts.idleMs ?? HISTORY_IDLE_MS;
  const timers: HistoryTimers = opts.timers ?? {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: h => clearTimeout(h as ReturnType<typeof setTimeout>),
  };
  const undoStack: HistoryEntry[] = [];
  let redoStack: HistoryEntry[] = [];
  let open: HistoryEntry | null = null;
  let pointer = false;
  let holds = 0;
  let idle: unknown = null;

  const stopIdle = () => { if (idle != null) { timers.clear(idle); idle = null; } };

  function commit() {
    stopIdle();
    if (!open) return;
    const entry = open;
    open = null;
    for (const [k, c] of entry.changes) if (sameSnap(c.before, c.after)) entry.changes.delete(k);
    if (!entry.changes.size) return;
    undoStack.push(entry);
    if (undoStack.length > max) undoStack.shift();
    redoStack = [];
  }
  const close = () => { if (!holds) commit(); };
  const allEntries = () => [...undoStack, ...redoStack, ...(open ? [open] : [])];

  return {
    record(target, before, after, ms) {
      if (!open) open = { changes: new Map() };
      const prev = open.changes.get(target);
      open.changes.set(target, { before: prev ? prev.before : before, after });
      if (!pointer && !holds) { stopIdle(); idle = timers.set(close, ms ?? idleMs); }
    },
    pendingAfter: target => open?.changes.get(target)?.after,
    close,
    isOpen: () => !!open,
    pointerDown() { close(); pointer = true; },
    pointerUp() { pointer = false; close(); },
    isPointerActive: () => pointer,
    focusChanged() { if (!pointer) close(); },
    hold() {
      holds++;
      stopIdle();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holds = Math.max(0, holds - 1);
        // The popover closes (often on the pointerdown of the NEXT gesture):
        // its step ends now, before that gesture writes anything.
        if (!holds) commit();
      };
    },
    rebase(target, patch) {
      const fix = (s: Snap): Snap => (s.present ? { present: true, value: { ...(s.value as object), ...patch } } : s);
      for (const e of allEntries()) {
        const c = e.changes.get(target);
        if (c) e.changes.set(target, { before: fix(c.before), after: fix(c.after) });
      }
    },
    forget(target) {
      for (const e of allEntries()) e.changes.delete(target);
      for (const stack of [undoStack, redoStack]) {
        for (let i = stack.length - 1; i >= 0; i--) if (!stack[i].changes.size) stack.splice(i, 1);
      }
    },
    undo() {
      commit();
      const e = undoStack.pop();
      if (!e) return null;
      redoStack.push(e);
      return e;
    },
    redo() {
      commit();
      const e = redoStack.pop();
      if (!e) return null;
      undoStack.push(e);
      return e;
    },
    canUndo: () => undoStack.length > 0 || (!!open && open.changes.size > 0),
    canRedo: () => redoStack.length > 0,
    clear() { stopIdle(); open = null; holds = 0; undoStack.length = 0; redoStack = []; },
    size: () => ({ undo: undoStack.length, redo: redoStack.length }),
  };
}

// ── Bridge for components outside CanvasBoard ──────────────────────────────
// The editor has one history per page (CanvasBoard owns it). Controls that
// define their own gesture — the color popover (open → close) and uploads
// (an async write that must be its own step, not join whatever gesture is
// open when it lands) — reach it through this bridge; without an editor
// mounted (tests, public views) they are no-ops.

let activeHistory: EditorHistory | null = null;

/** CanvasBoard binds its history while the editor is mounted. */
export function bindEditorHistory(h: EditorHistory | null): void { activeHistory = h; }

/** Keeps one history entry open until the returned function is called. */
export function holdHistoryStep(): () => void {
  return activeHistory ? activeHistory.hold() : () => {};
}

/** Runs a write as its OWN history step (closes what is open before and
 * after). For async writes such as uploads. */
export function ownHistoryStep(fn: () => void): void {
  activeHistory?.close();
  ownStep = true;
  try { fn(); } finally { ownStep = false; }
  activeHistory?.close();
}

let ownStep = false;
/** True while an ownHistoryStep write runs: if it lands in the middle of a
 * pointer gesture, the gesture's baseline moves past it (like a blur
 * commit), so undoing the gesture never reverts the upload too. */
export function inOwnHistoryStep(): boolean { return ownStep; }

// ── System writes ──────────────────────────────────────────────────────────

/** Keys ProfileCard's own growth / centering effect writes (centerCardPosition
 * + computeRequiredCardHeight). */
const LAYOUT_KEYS = new Set(["x", "y", "h"]);

/** A write the user did not make — ProfileCard re-centering / growing on
 * load, on a viewport resize or right after an undo — must not become an
 * undo step (Ctrl+Z would "undo" a centering the effect immediately redoes,
 * and a recorded write after an undo would wipe the redo stack). It is
 * recognised by its shape (ONLY x/y/h of the profile: every user write of
 * the card size also carries `w` — resize drag, Ctrl+arrows, Medidas) AND
 * by happening outside a gesture: inside one (a resize, or growth right
 * after adding a link) it joins that gesture's entry. */
export function isSystemLayoutWrite(
  op: { type: string; patch?: unknown },
  ctx: { pointerActive: boolean; entryOpen: boolean },
): boolean {
  if (op.type !== "update_profile") return false;
  const keys = Object.keys((op.patch ?? {}) as object);
  if (!keys.length || !keys.every(k => LAYOUT_KEYS.has(k))) return false;
  return !ctx.pointerActive && !ctx.entryOpen;
}

// ── Shortcuts ──────────────────────────────────────────────────────────────

/** Minimal structural element shape (tests pass plain objects). */
export interface UndoFocusElement {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}

const NON_TEXT_INPUTS = new Set(["range", "checkbox", "radio", "button", "submit", "reset", "color", "file", "image"]);

/** A field where Ctrl/⌘+Z belongs to the browser's own text undo. */
export function isTextEntry(el: UndoFocusElement | null | undefined): boolean {
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag === "input") return !NON_TEXT_INPUTS.has((el.type ?? "text").toLowerCase());
  return !!el.isContentEditable;
}

/** Who handles Ctrl/⌘+Z (and redo): the browser inside text fields
 * ("native"); the editor history with focus on the canvas or on an editor
 * surface — inspector, popover, menus, canvas chrome ("history"); nobody
 * with focus on <body> or outside the editor ("ignore", Iteration 0: a
 * shortcut never acts on a focus nobody can see). */
export function undoShortcutOwner(
  target: UndoFocusElement | null | undefined,
  active: UndoFocusElement | null | undefined,
): "native" | "history" | "ignore" {
  if (isTextEntry(target) || isTextEntry(active)) return "native";
  const el = active ?? target;
  if (!el || typeof el.closest !== "function") return "ignore";
  return el.closest("[data-mnemo-canvas], [data-mnemo-editor], [data-mnemo-ui]") != null ? "history" : "ignore";
}

/** Ctrl/⌘+Z = undo; Ctrl/⌘+Shift+Z or Ctrl+Y = redo. Falls back to the
 * physical key (`code`) on layouts whose letters aren't Latin (review C-7). */
export function historyShortcut(e: { key: string; code?: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): "undo" | "redo" | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const latin = /^[a-z]$/i.test(e.key);
  const k = latin ? e.key.toLowerCase() : e.code === "KeyZ" ? "z" : e.code === "KeyY" ? "y" : e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  if (k === "y" && e.ctrlKey && !e.shiftKey) return "redo";
  return null;
}

// ── Persistence queue ──────────────────────────────────────────────────────

/** Consecutive update patches of the same object (same op type, id and
 * canvas) merge into one queued op — a slider drag that queued while a
 * flush was in flight inserts one row, not dozens. Order is preserved and
 * nothing is dropped: only ADJACENT updates merge (an add/delete/other op
 * in between keeps them apart). */
export function mergeQueuedPatches<Q extends { op: { type: string; id?: string; patch?: unknown }; canvas_type: string }>(batch: Q[]): Q[] {
  const out: Q[] = [];
  for (const q of batch) {
    const last = out[out.length - 1];
    if (
      last && q.op.type.startsWith("update_") && last.op.type === q.op.type &&
      last.op.id !== undefined && last.op.id === q.op.id && last.canvas_type === q.canvas_type &&
      last.op.patch && q.op.patch
    ) {
      out[out.length - 1] = { ...last, op: { ...last.op, patch: { ...(last.op.patch as object), ...(q.op.patch as object) } } };
    } else {
      out.push(q);
    }
  }
  return out;
}
