/**
 * Pure anchor-drag math for the Presentation Card's PFP (see ProfileCard.tsx's
 * startAnchorDrag). Extracted so the degenerate-avail behavior fixed in
 * 3B.2-A has a real regression test.
 */

/**
 * Maps a mouse-delta (in px) on one axis to the next anchor value (0-1) on
 * that axis, given the starting anchor and the raw geometric room available
 * (NOT floored to a minimum by the caller).
 *
 * When `rawAvail <= 0` (the avatar doesn't fit within the padded box on that
 * axis — reachable e.g. at a horizontal format's own minimum height with the
 * default "md" photo size, 120 - 2*20 - 80 = 0), there is no meaningful
 * position to express on that axis: computeComposition's own clamp
 * (resolveAxis/resolveCentered in cardComposition.ts) pins the pfp to a
 * single point regardless of anchor value in that same regime. Returning the
 * unchanged start value there — instead of dividing by an arbitrary floor —
 * avoids silently locking in a near-random anchor that could resurface as an
 * unexplained jump if the card is later resized larger.
 */
export function nextAnchorAxis(start: number, deltaPx: number, rawAvail: number): number {
  if (rawAvail <= 0) return start;
  return Math.max(0, Math.min(1, start + deltaPx / rawAvail));
}
