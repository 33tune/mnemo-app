/**
 * Iteration 0 — O1 (WCAG 2.1.1 / 2.5.7): keyboard move/resize of the canvas
 * selection. Pure math only; CanvasBoard.tsx owns the key handling, the
 * local state update and persistence (the SAME persistDragResult path the
 * mouse drag uses on mouseup).
 *
 * Every writer here is one the mouse drag already uses:
 * - move:   applyGroupDragDelta (canvasSelectionGuards.ts) — clamps to the
 *           canvas bounds and never moves the ProfileCard;
 * - resize: profile → clampFreeformCardSize + centerCardPosition
 *           (cardGeometry.ts), text → the same 10..300 size clamp,
 *           everything else → computeResize + resizeMinimums (resizeMath.ts),
 *           images keeping their aspect ratio exactly like a side handle.
 */
import { applyGroupDragDelta } from "./canvasSelectionGuards";
import { clampFreeformCardSize, centerCardPosition } from "./cardGeometry";
import { computeResize, resizeMinimums } from "./resizeMath";

export interface NudgeBounds { w: number; h: number; topOffset: number }

export interface NudgeKeyInput {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export type NudgeAction = { kind: "move" | "resize"; dx: number; dy: number };

export const NUDGE_STEP = 1;
export const NUDGE_STEP_BIG = 10;

/** Arrow keys → move; Ctrl+arrows (Windows/Linux) or ⌘+arrows (Mac) →
 * resize; Shift multiplies the step ×10. Alt (and the "wrong" modifier for
 * the platform, e.g. Ctrl on Mac, which switches Spaces) is never used. */
export function resolveNudgeKey(e: NudgeKeyInput, isMac: boolean): NudgeAction | null {
  let ux = 0, uy = 0;
  switch (e.key) {
    case "ArrowLeft":  ux = -1; break;
    case "ArrowRight": ux = 1;  break;
    case "ArrowUp":    uy = -1; break;
    case "ArrowDown":  uy = 1;  break;
    default: return null;
  }
  if (e.altKey) return null;
  const resizeMod = isMac ? !!e.metaKey : !!e.ctrlKey;
  const otherMod  = isMac ? !!e.ctrlKey : !!e.metaKey;
  if (otherMod) return null;
  const step = e.shiftKey ? NUDGE_STEP_BIG : NUDGE_STEP;
  return { kind: resizeMod ? "resize" : "move", dx: ux * step, dy: uy * step };
}

type NudgeEl = {
  id: string; elementType: string; x: number; y: number;
  w?: number; h?: number; locked?: boolean; size?: number;
  naturalW?: number; naturalH?: number;
};

/** Moves every selected, unlocked element by (dx, dy) — same function and
 * clamps as a group drag; the ProfileCard is never moved (it is always
 * centered). Returns the input array unchanged when nothing can move. */
export function nudgeMove<T extends NudgeEl>(elements: T[], ids: Set<string>, dx: number, dy: number, bounds: NudgeBounds): T[] {
  const start: Record<string, { x: number; y: number }> = {};
  for (const el of elements) {
    if (ids.has(el.id) && !el.locked && el.elementType !== "profile") start[el.id] = { x: el.x, y: el.y };
  }
  if (Object.keys(start).length === 0) return elements;
  return applyGroupDragDelta(elements, start, dx, dy, bounds);
}

export type NudgeResizeResult =
  | { kind: "box"; x: number; y: number; w: number; h: number }
  | { kind: "text"; size: number };

/**
 * Keyboard resize of ONE element: +dx grows the width (left edge fixed),
 * +dy grows the height (top edge fixed) — a right/bottom side handle.
 * ProfileCard: freeform clamp + re-centered via centerCardPosition, i.e.
 * exactly what the resize drag writes. No content-height floor is needed:
 * ProfileCard's growth effect has extraBlocks = [] (Stage 4.2-C.2.6), so
 * computeRequiredCardHeight returns the current h and growth never writes
 * h — there is no second writer to race with (the C.2.5 problem). If a
 * structural block ever feeds extraBlocks again, the keyboard/Medidas
 * resize must clamp to that required height (or set isResizing) too.
 */
export function nudgeResize(el: NudgeEl, dx: number, dy: number, bounds: NudgeBounds): NudgeResizeResult | null {
  if (el.locked) return null;
  if (el.elementType === "text") {
    const sz = Number.isFinite(el.size) && (el.size ?? 0) > 0 ? (el.size as number) : 16;
    const delta = dx !== 0 ? dx : dy;
    return { kind: "text", size: Math.max(10, Math.min(300, Math.round(sz + delta))) };
  }
  const w = Number.isFinite(el.w) && (el.w ?? 0) > 0 ? (el.w as number) : 80;
  const h = Number.isFinite(el.h) && (el.h ?? 0) > 0 ? (el.h as number) : 60;
  if (el.elementType === "profile") {
    const c = clampFreeformCardSize(w + dx, h + dy);
    const { x, y } = centerCardPosition(bounds.w, bounds.h, c.w, c.h, bounds.topOffset);
    return { kind: "box", x, y, w: c.w, h: c.h };
  }
  const isImage = el.elementType === "image";
  const ratio = isImage
    ? ((el.naturalW ?? 0) > 0 && (el.naturalH ?? 0) > 0 ? (el.naturalH as number) / (el.naturalW as number) : h / w)
    : 0;
  const { minW, minH } = resizeMinimums(el.elementType);
  const handle = dx !== 0 ? "e" : "s";
  const r = computeResize(handle, dx, dy, w, h, el.x, el.y, ratio, isImage, minW, minH);
  return { kind: "box", x: r.nx, y: r.ny, w: r.nw, h: r.nh };
}

/** `]` / `[` keyboard selection: next/previous element in z-order (the
 * paint order list the caller passes, bottom → top), wrapping around.
 * With nothing selected, `]` starts at the bottom and `[` at the top. */
export function cycleSelection(orderedIds: string[], currentId: string | null, dir: 1 | -1): string | null {
  const n = orderedIds.length;
  if (n === 0) return null;
  const i = currentId ? orderedIds.indexOf(currentId) : -1;
  if (i === -1) return dir === 1 ? orderedIds[0] : orderedIds[n - 1];
  return orderedIds[(i + dir + n) % n];
}

/** Mac → ⌘ is the resize modifier; everything else → Ctrl. */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
}
