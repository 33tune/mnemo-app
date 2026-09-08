/**
 * Generic, pure geometry for "constrained freeform" block positioning (Stage
 * 3B.3). No React, no DOM, no knowledge of ProfileCard's specific fields —
 * this is reusable anchor/magnetism/overlap math; cardComposition.ts's
 * computeBlockLayout() is what wires it to Name/Handle/Descriptor/Bio/
 * Location/Views specifically.
 *
 * MODEL:
 * - A block's position is a normalized anchor (x,y ∈ [0,1]) resolved into a
 *   pixel rect via anchorToRect — the EXACT same formula ProfileCard's PFP
 *   anchor already uses (padding + anchor*(avail-size)), just generalized to
 *   any block size. This is deliberate: it's the same authoritative-anchor
 *   contract as the PFP, not a second positioning system (see the 3B.2-A/B
 *   PFP-anchor-drag postmortem for why introducing a second one is risky).
 * - Magnetism (snapAxis) pulls a raw anchor toward {0, 0.5, 1} (edge/center/
 *   edge on that axis) within an attract radius, with a wider release radius
 *   once snapped — that gap is the hysteresis band that stops a slow drag
 *   from flapping between "snapped" and "not snapped" near the boundary.
 *   This produces continuous positioning almost everywhere, with just enough
 *   "pull" near the classic 9-point layout to make those feel deliberate.
 * - Anti-overlap (resolveOverlap) nudges a rect the minimum distance needed
 *   to clear already-placed obstacles, then re-clamps into bounds. It never
 *   moves the obstacles — callers resolve blocks in priority order (PFP
 *   first and immovable, then whichever block is "more authoritative") so
 *   only the lower-priority block yields.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Anchor -> pixel rect (shared contract with the PFP anchor) ───────────────

/**
 * Resolves a normalized anchor into an authoritative pixel rect within a
 * box's padded content area. Always in-bounds by construction for any
 * anchor ∈ [0,1] — no clamp needed on the output, same guarantee the PFP
 * anchor formula already relies on.
 */
export function anchorToRect(
  anchorX: number,
  anchorY: number,
  w: number,
  h: number,
  boxW: number,
  boxH: number,
  padding: number,
): Rect {
  const availW = Math.max(0, boxW - 2 * padding - w);
  const availH = Math.max(0, boxH - 2 * padding - h);
  return {
    x: padding + Math.max(0, Math.min(1, anchorX)) * availW,
    y: padding + Math.max(0, Math.min(1, anchorY)) * availH,
    w, h,
  };
}

/** Inverse of anchorToRect — recovers the anchor that would reproduce `rect`
 * (given the same w/h/box/padding). Used to derive a default anchor for a
 * block from wherever the automatic base composition already placed it, so
 * "no override yet" behaves as "anchor = the base composition's own choice". */
export function rectToAnchor(
  rect: Pick<Rect, "x" | "y">,
  w: number,
  h: number,
  boxW: number,
  boxH: number,
  padding: number,
): { x: number; y: number } {
  const availW = Math.max(0, boxW - 2 * padding - w);
  const availH = Math.max(0, boxH - 2 * padding - h);
  return {
    x: availW > 0 ? Math.max(0, Math.min(1, (rect.x - padding) / availW)) : 0.5,
    y: availH > 0 ? Math.max(0, Math.min(1, (rect.y - padding) / availH)) : 0.5,
  };
}

// ── Magnetism / snapping (with hysteresis) ────────────────────────────────────

const MAGNETIC_POINTS = [0, 0.5, 1];
const ATTRACT_RADIUS = 0.06; // pulls toward a magnetic point once this close
const RELEASE_RADIUS = 0.12; // must drift this far from a snapped point to let go

/**
 * Pulls a raw 0-1 axis value toward the nearest magnetic point (edge/center/
 * edge) when close enough, otherwise passes it through unchanged (continuous
 * positioning). `snappedTo` is the magnetic point this axis was snapped to
 * on the PREVIOUS call (undefined if it wasn't) — passing it back in is what
 * creates the hysteresis band: already-snapped uses the wider RELEASE_RADIUS
 * before letting go, unsnapped uses the narrower ATTRACT_RADIUS before
 * grabbing on. Without this a slow drag right at the boundary would flap
 * between snapped/unsnapped every frame.
 */
export function snapAxis(raw: number, snappedTo: number | undefined): number {
  const radius = snappedTo != null ? RELEASE_RADIUS : ATTRACT_RADIUS;
  let nearest = MAGNETIC_POINTS[0];
  let nearestDist = Infinity;
  for (const p of MAGNETIC_POINTS) {
    const d = Math.abs(raw - p);
    if (d < nearestDist) { nearest = p; nearestDist = d; }
  }
  // Once snapped, keep snapping to THAT point specifically (not just "the
  // nearest") until it's outside the release radius — otherwise near the
  // midpoint between two magnetic points, "nearest" could flip between them
  // every call even inside what should be a single stable hysteresis band.
  if (snappedTo != null) {
    if (Math.abs(raw - snappedTo) <= RELEASE_RADIUS) return snappedTo;
    return nearestDist <= ATTRACT_RADIUS ? nearest : raw;
  }
  return nearestDist <= radius ? nearest : raw;
}

/** Which magnetic point (if any) `value` is currently snapped to — feed the
 * result back into the next snapAxis call as `snappedTo` for hysteresis. */
export function snappedPoint(value: number): number | undefined {
  return MAGNETIC_POINTS.includes(value) ? value : undefined;
}

// ── Anti-overlap ─────────────────────────────────────────────────────────────

function overlaps(a: Rect, b: Rect, minGap: number): boolean {
  return (
    a.x < b.x + b.w + minGap && a.x + a.w + minGap > b.x &&
    a.y < b.y + b.h + minGap && a.y + a.h + minGap > b.y
  );
}

/**
 * Escapes `rect` out of the "forbidden zone" its top-left corner can't sit in
 * without overlapping `obstacle` by less than `minGap` — i.e. the obstacle's
 * footprint expanded by minGap on every side, then by rect's own w/h (a
 * standard AABB Minkowski-sum expansion, since it's `rect`'s corner, not its
 * center, being tested). Of the (up to 4) directions that clear the zone AND
 * stay within the box, picks whichever needs the least movement — checking
 * all 4 up front is what correctly handles a block too big to slide out
 * sideways (not enough width) that CAN still clear vertically, or vice versa;
 * a "try one axis, then the other" heuristic can miss that a supposedly
 * cheaper axis is actually infeasible once bounds are considered.
 */
function escapeRect(
  rect: Rect,
  obstacle: Rect,
  mustAlsoClear: Rect[],
  minGap: number,
  boxW: number,
  boxH: number,
  padding: number,
): Rect {
  const zoneX0 = obstacle.x - rect.w - minGap, zoneX1 = obstacle.x + obstacle.w + minGap;
  const zoneY0 = obstacle.y - rect.h - minGap, zoneY1 = obstacle.y + obstacle.h + minGap;
  const boundMinX = padding, boundMaxX = boxW - padding - rect.w;
  const boundMinY = padding, boundMaxY = boxH - padding - rect.h;

  const candidates: { x: number; y: number; cost: number }[] = [];
  if (zoneX0 >= boundMinX) candidates.push({ x: zoneX0, y: rect.y, cost: rect.x - zoneX0 });
  if (zoneX1 <= boundMaxX) candidates.push({ x: zoneX1, y: rect.y, cost: zoneX1 - rect.x });
  if (zoneY0 >= boundMinY) candidates.push({ x: rect.x, y: zoneY0, cost: rect.y - zoneY0 });
  if (zoneY1 <= boundMaxY) candidates.push({ x: rect.x, y: zoneY1, cost: zoneY1 - rect.y });

  if (candidates.length === 0) {
    // Genuinely no escape direction fits in the box (the block is larger
    // than the room left around the obstacle on every side) — clamp into
    // bounds as the least-bad fallback. Should be unreachable given
    // cardGeometry's size minimums; if it ever isn't, this still guarantees
    // in-bounds output, just not necessarily overlap-free.
    return {
      ...rect,
      x: Math.max(boundMinX, Math.min(boundMaxX, rect.x)),
      y: Math.max(boundMinY, Math.min(boundMaxY, rect.y)),
    };
  }
  candidates.sort((a, b) => a.cost - b.cost);
  // Prefer the cheapest candidate that ALSO doesn't reopen overlap with an
  // obstacle already cleared earlier in this resolution — without this, a
  // 2-obstacle case can oscillate forever: escaping obstacle B's cheapest
  // direction lands right back inside obstacle A's forbidden zone, escaping
  // A lands back inside B's, repeat (see the 3B.3 multi-obstacle postmortem —
  // this is exactly the failure a naive "escape whichever is overlapping
  // right now" loop hits). Falls back to the cheapest candidate regardless
  // if none of the 4 manage to satisfy every already-cleared obstacle too.
  for (const c of candidates) {
    const candidateRect = { ...rect, x: c.x, y: c.y };
    if (mustAlsoClear.every(o => !overlaps(candidateRect, o, minGap))) return candidateRect;
  }
  return { ...rect, x: candidates[0].x, y: candidates[0].y };
}

/**
 * Nudges `rect` clear of every rect in `obstacles`, processed in order as a
 * single forward pass: each obstacle's escape also respects every obstacle
 * already cleared earlier in the same call (see escapeRect), which is what
 * makes a single pass sufficient — no separate multi-pass re-checking loop
 * needed, and no risk of the two-obstacle oscillation that approach could hit.
 * `obstacles` are never moved.
 */
export function resolveOverlap(
  rect: Rect,
  obstacles: Rect[],
  boxW: number,
  boxH: number,
  padding: number,
  minGap: number,
): Rect {
  let r = {
    ...rect,
    x: Math.max(padding, Math.min(boxW - padding - rect.w, rect.x)),
    y: Math.max(padding, Math.min(boxH - padding - rect.h, rect.y)),
  };
  const cleared: Rect[] = [];
  for (const o of obstacles) {
    if (overlaps(r, o, minGap)) r = escapeRect(r, o, cleared, minGap, boxW, boxH, padding);
    cleared.push(o);
  }
  return r;
}

/** Full per-block pipeline: normalized anchor -> authoritative rect -> nudged
 * clear of already-placed obstacles. `obstacles` should already be final
 * (resolved) rects for every higher-priority block. */
export function resolveBlockPosition(
  anchorX: number,
  anchorY: number,
  w: number,
  h: number,
  obstacles: Rect[],
  boxW: number,
  boxH: number,
  padding: number,
  minGap = 8,
): Rect {
  const raw = anchorToRect(anchorX, anchorY, w, h, boxW, boxH, padding);
  return resolveOverlap(raw, obstacles, boxW, boxH, padding, minGap);
}
