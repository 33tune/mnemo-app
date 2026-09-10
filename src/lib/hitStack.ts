// Pure decision logic for layered hit-testing on the canvas (Stage 3B.4-B).
// No React, no DOM — the DOM-touching parts (elementFromPoint peeking,
// dispatching a synthetic mousedown) stay as small glue in CanvasBoard.tsx
// and call into these functions for the actual decisions, so the decisions
// themselves can be unit tested without a browser.

/**
 * Whether a decorative canvas image should ignore pointer events entirely.
 * True only in view/public mode (`canInteract` false) for an image with no
 * link — a complete ghost for hit-testing, per Stage 3B.4-B's view-mode
 * rule. In the editor, images are always DOM-interactive regardless of what
 * they visually overlap — see resolveImageMouseDownTarget for how overlap
 * ambiguity is resolved there instead of via pointer-events.
 */
export function shouldImageIgnorePointerEvents(canInteract: boolean, hasLink: boolean): boolean {
  return !hasLink && !canInteract;
}

/**
 * Given the z-sorted hit list at a point (from CanvasBoard's
 * getElementsAtPoint) and the currently selected id (which the caller has
 * already confirmed is the ONLY selected id), returns the id to cycle to
 * next — or undefined if cycling isn't possible (id not present in the
 * stack, or fewer than two things stacked there). Extracted from
 * clickThrough's inline calculation so the "topmost → next → next → wraps
 * around" stack-cycling rule can be unit tested without a DOM; behavior is
 * unchanged from before the extraction.
 */
export function nextIdInHitCycle(hits: { id: string }[], currentId: string): string | undefined {
  const idx = hits.findIndex(h => h.id === currentId);
  if (idx === -1 || hits.length < 2) return undefined;
  return hits[(idx + 1) % hits.length].id;
}

/**
 * Resolves what an image's mousedown should actually target (Stage 3B.4-B,
 * "Mechanism B"). Pure decision table — the caller does the DOM work (a
 * cheap overlap pre-filter, then an elementFromPoint peek with the image's
 * own pointer-events momentarily suspended) and passes in only whether that
 * peek found an element marked `data-canvas-hot`.
 *
 * Priority, matching the product spec exactly:
 * 1. A link always wins — a linked image is its own interactive citizen and
 *    is never redirected, regardless of what it overlaps.
 * 2. An already-selected image always wins — mid-drag/already-selected must
 *    never redirect out from under the user (so click-to-select then
 *    click-and-drag on the same image always moves the image, never
 *    whatever is underneath it).
 * 3. Otherwise, a hot control found underneath wins (the "no debe bloquear
 *    un control real" exception).
 * 4. Otherwise, the image itself is the target — normal topmost/cycling
 *    flow (getElementsAtPoint + clickThrough) takes it from there.
 */
export function resolveImageMouseDownTarget(
  hasLink: boolean,
  isSelected: boolean,
  hotControlFound: boolean,
): "image" | "hot-control" {
  if (hasLink || isSelected) return "image";
  return hotControlFound ? "hot-control" : "image";
}
