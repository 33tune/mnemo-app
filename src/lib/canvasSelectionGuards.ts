/**
 * Guards around the singleton Presentation Card's interaction contract. Pure,
 * no React — see 3B.2-A/3B.2-B.
 *
 * Two families:
 * - Multi-element guards (applyGroupDragDelta, filterTrashDeletion,
 *   resolveBulkDeleteIds, isMarqueeSelectable): keep the card out of generic,
 *   multi-element operations (group drag, drag-to-trash, bulk keyboard
 *   delete, marquee/rectangle selection) that were never designed with a
 *   "this element can never move / be bulk-deleted / drag-selected"
 *   exception in mind. The card can still be selected directly (a click on
 *   it, or added via shift-click) — isMarqueeSelectable only excludes the
 *   drag-a-rectangle path; the other guards then stop it from moving or
 *   getting swept away as a passenger if it ends up in a multi-selection
 *   formed some other way.
 * - Single-element guard (isPfpAnchorDraggable): governs the card's OWN PFP
 *   drag — requires the card to be individually selected first.
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

/**
 * Whether an element type may be picked up by a marquee/rectangle selection
 * (Stage 3B.4-A) — only the Presentation Card is excluded, so a drag-select
 * rectangle that visually crosses it never adds it to the resulting
 * selection, even fully enclosing it. Direct selection (a click on the card)
 * is a completely separate path in CanvasBoard.tsx and is untouched by this.
 */
export function isMarqueeSelectable(elementType: string): boolean {
  return elementType !== "profile";
}

/**
 * Whether the Presentation Card's PFP anchor-drag can start at all (Stage
 * 3B.2-B) — requires the card to be interactable, in a composed (non-legacy
 * "free") layout, AND currently selected. Before this guard, a bare
 * click-and-drag on the avatar of an UNselected card would move it — no
 * deliberate "you're now interacting with this card" gesture was required.
 * Used identically by both the PFP's onMouseDown wiring and startAnchorDrag's
 * own internal guard in ProfileCard.tsx, so the two can never independently
 * disagree about whether a drag is actually allowed to proceed.
 */
export function isPfpAnchorDraggable(
  canInteract: boolean | undefined,
  layout: "vertical" | "horizontal" | "free",
  isSel: boolean,
): boolean {
  return !!canInteract && layout !== "free" && isSel;
}
