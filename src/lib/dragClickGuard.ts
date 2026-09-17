/**
 * Pure decision logic for distinguishing a real click from the trailing
 * click a browser fires on the same element right after a drag gesture ends
 * on it (mousedown -> move -> mouseup -> click). Shared by useDragDrop.ts
 * (top-level canvas elements, incl. ProfileCard's own click handler in
 * CanvasBoard.tsx) and ProfileCard.tsx's startBlockDrag (internal blocks,
 * e.g. Contact Links) — both track a "did this gesture move" flag the same
 * way (reset false at mousedown, set true on the first move) and need the
 * exact same consume-and-clear read, so the fix lives in one place instead
 * of two copies of the same bug.
 *
 * Stage 4.2-C.2.1: previously the flag was only ever read, never cleared —
 * a shared `didDrag` ref that stayed `true` after being consumed once could
 * leak into and permanently suppress an unrelated future click on a
 * DIFFERENT element (ProfileCard has no mousedown handler that resets it,
 * so any decorative-image drag left it unselectable until a page reload).
 * Consuming the flag on every read closes that leak: a real drag's click is
 * still swallowed exactly once, and every click after that starts clean.
 */
export function resolveClickAfterDrag(didDrag: boolean): { suppress: boolean; nextDidDrag: boolean } {
  return { suppress: didDrag, nextDidDrag: false };
}
