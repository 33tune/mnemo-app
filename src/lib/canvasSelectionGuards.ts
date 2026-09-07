/**
 * Guards that keep the singleton Presentation Card out of generic,
 * multi-element operations (group drag, drag-to-trash, bulk keyboard delete)
 * that were never designed with a "this element can never move / be
 * bulk-deleted" exception in mind. Pure, no React — see 3B.2-A.
 *
 * The card can still legitimately end up in a multi-selection (the marquee
 * doesn't exclude it, by design — it stays selectable and resizeable). These
 * guards are what actually stop it from moving or getting swept away as a
 * passenger once that selection is dragged, trashed, or bulk-deleted.
 */

export interface DraggableLike {
  id: string;
  elementType: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface CanvasBoundsLike {
  w: number;
  h: number;
  topOffset: number;
}

/**
 * Applies a group-drag delta to every element with a recorded start
 * position, except the Presentation Card — mirrors handleDragMove's
 * `dragging` branch in useDragDrop.ts.
 */
export function applyGroupDragDelta<T extends DraggableLike>(
  elements: T[],
  dragStartPos: Record<string, { x: number; y: number }>,
  dx: number,
  dy: number,
  canvasBounds?: CanvasBoundsLike,
): T[] {
  return elements.map(el => {
    const sp = dragStartPos[el.id];
    if (!sp || el.elementType === "profile") return el;
    const rawX = sp.x + dx, rawY = sp.y + dy;
    if (canvasBounds) {
      const elW = el.w ?? 0, elH = el.h ?? 0;
      return {
        ...el,
        x: Math.max(0, Math.min(canvasBounds.w - elW, rawX)),
        y: Math.max(canvasBounds.topOffset, Math.min(canvasBounds.h - elH, rawY)),
      };
    }
    return { ...el, x: rawX, y: rawY };
  });
}

/**
 * Filters a drag-to-trash deletion so the Presentation Card is never
 * removed, even if it was a passenger in the dragged selection — mirrors
 * handleDragUp's trash branch in useDragDrop.ts.
 */
export function filterTrashDeletion<T extends { id: string; elementType: string }>(
  elements: T[],
  selectedIds: Set<string>,
): T[] {
  return elements.filter(el => !selectedIds.has(el.id) || el.elementType === "profile");
}

/**
 * Resolves which ids a bulk keyboard Delete/Backspace should actually
 * remove: a deliberate solo selection can still delete the Presentation
 * Card (the only way to remove one today), but a multi-select bulk delete
 * must never sweep it up as a passenger — mirrors the DELETE/BACKSPACE
 * handler in CanvasBoard.tsx.
 */
export function resolveBulkDeleteIds<T extends { id: string; elementType: string }>(
  selectedIds: Set<string>,
  elements: T[],
): Set<string> {
  if (selectedIds.size <= 1) return selectedIds;
  const byId = new Map(elements.map(el => [el.id, el]));
  return new Set([...selectedIds].filter(id => byId.get(id)?.elementType !== "profile"));
}
