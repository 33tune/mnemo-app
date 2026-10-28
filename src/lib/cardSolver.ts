/**
 * Free layout engine of the ProfileCard (user decisions 2026-10-15).
 *
 * The user composes; the engine only steps in on a real geometric conflict.
 * Every block — photo, text group (name + @user + phrase + bio), location,
 * views, icons, buttons — has a DESIRED rect (where the user left it). The
 * RESOLVED rects are computed from scratch, every time, from the desired
 * ones (so nothing accumulates and nothing loops):
 *
 * - Blocks are placed in priority order. The photo is the core: it is placed
 *   first and nothing ever moves it. During a drag the dragged block comes
 *   right after it (it follows the cursor; only the photo outranks it).
 * - A block whose desired rect is free stays exactly there.
 * - A block that collides is moved to the nearest free spot (its center,
 *   from its desired center) — never to an arbitrary place. Elastic blocks
 *   (texts, icons, buttons) may also get narrower to fit beside something
 *   (the texts take more lines). The chain reaction is implicit: each block
 *   yields to every block already placed.
 * - Relations are kept: a block resting right under another one (stacked,
 *   overlapping horizontally, a small gap apart) follows it when the engine
 *   pushes that one — the photo pushing the texts carries the location,
 *   views, icons and buttons stacked under them along, in order. A block
 *   the USER moves carries nothing (moving one thing never drags the rest).
 * - `prev` (the last frame of the same gesture) makes a block keep the side
 *   it already took instead of flipping between two equally close spots.
 * - When nothing is free (the card is too small) the block takes the least
 *   overlapping spot and `fits` is false; the card's minimum size
 *   (solveMinSize) is exactly the smallest card where `fits` holds — blocks
 *   packed together, none overlapping, none hidden.
 *
 * Pure: sizes come from BlockSpec (the caller measures the real text).
 */

export type BlockKey = "pfp" | "identity" | "location" | "views" | "about" | "links" | "buttons";

export interface Rect { x: number; y: number; w: number; h: number }

/** One block's size model: any width in [minW, natW]; height follows. */
export interface BlockSpec {
  minW: number;
  /** Natural (preferred, widest useful) width. */
  natW: number;
  heightAt(w: number): number;
}

/** Desired top-left and width (px, card coordinates). */
export interface Desired { x: number; y: number; w: number }

export interface SolveInput {
  boxW: number;
  boxH: number;
  pad: number;
  specs: Partial<Record<BlockKey, BlockSpec>>;
  desired: Partial<Record<BlockKey, Desired>>;
  /** Priority: the first block never moves (except to stay inside the card). */
  order: BlockKey[];
  /** Last frame of the same gesture — continuity. */
  prev?: Partial<Record<BlockKey, Rect>>;
  /** The block the user is dragging (its displacement is intent: blocks
   * resting on it do not follow). */
  dragged?: BlockKey;
  /** How far the dragged block has moved from where it started: a block it
   * pushes prefers to go that way (pushing down sends things down). */
  push?: { dx: number; dy: number };
  /** At rest (no drag): when the desired rects collide (the card was made
   * smaller, or a text grew), pack them vertically, keeping the user's
   * composition (same x, same order) — the card's minimum is where they are
   * packed together. Only when even that fails do blocks get re-arranged. */
  compact?: boolean;
  /** With `compact`: never re-arrange — when packing fails, report it
   * (the card's minimum is where the composition still fits as is). */
  keepComposition?: boolean;
  /** The card may grow downward (up to this height) instead of sending a
   * block far away; each px of growth costs GROW_COST. Absent: no growth. */
  growTo?: number;
}

export interface SolveResult {
  rects: Partial<Record<BlockKey, Rect>>;
  /** Every block inside the card (without growing), none overlapping. */
  fits: boolean;
  /** Card height the blocks need (>= boxH when something went below). */
  neededH: number;
}

/** Minimum space kept between two blocks. */
export const BLOCK_GAP = 8;
/** Cost of each px a block is made narrower (vs. each px it is moved). */
const NARROW_COST = 0.5;
/** Cost of each px away from the previous frame's spot (continuity). */
const CONTINUITY_COST = 0.6;
/** Cost of each px the card grows (vs. each px a block is moved): pushing a
 * block down grows the card rather than throwing it to the other end. */
const GROW_COST = 1.5;
/** Cost of each px a pushed block goes AGAINST the push direction. */
const AGAINST_PUSH_COST = 0.5;
const EPS = 0.5;
/** Max vertical gap for "resting right under" (stacked blocks). */
const REST_GAP = 24;

export const PRIORITY: BlockKey[] = ["pfp", "identity", "location", "views", "about", "links", "buttons"];

/** Priority with `dragged` right after the photo. */
export function priorityFor(dragged?: BlockKey): BlockKey[] {
  if (!dragged || dragged === "pfp") return PRIORITY;
  return ["pfp", dragged, ...PRIORITY.filter(k => k !== "pfp" && k !== dragged)];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** How much two blocks conflict: 0 when they are at least `gap` apart on
 * some axis, else a positive measure of how deep they intrude. */
function overlapArea(a: Rect, b: Rect, gap: number): number {
  const sepX = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w));
  const sepY = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
  return sepX < gap - EPS && sepY < gap - EPS ? (gap - sepX) * (gap - sepY) : 0;
}

function inside(r: Rect, i: SolveInput): boolean {
  return r.x >= i.pad - EPS && r.y >= i.pad - EPS && r.x + r.w <= i.boxW - i.pad + EPS && r.y + r.h <= i.boxH - i.pad + EPS;
}

/** The width a block wants: its desired width within its range and the card. */
function wantedWidth(spec: BlockSpec, d: Desired | undefined, availW: number): number {
  const w = d?.w ?? spec.natW;
  return Math.max(spec.minW, Math.min(w, spec.natW, availW));
}

function widthOptions(spec: BlockSpec, w0: number, placed: Rect[], i: SolveInput): number[] {
  const opts = new Set<number>([w0]);
  if (spec.minW < w0 - EPS) {
    for (const o of placed) {
      opts.add(o.x - BLOCK_GAP - i.pad);
      opts.add(i.boxW - i.pad - (o.x + o.w + BLOCK_GAP));
    }
    opts.add(w0 * 0.75); opts.add(w0 * 0.5); opts.add(spec.minW);
  }
  return [...opts].map(w => Math.round(w * 10) / 10).filter(w => w >= spec.minW - EPS && w <= w0 + EPS).sort((a, b) => b - a);
}

export function solveLayout(i: SolveInput): SolveResult {
  if (i.compact) {
    const packed = compactVertical(i);
    if (packed) return { rects: packed, fits: true, neededH: i.boxH };
    if (i.keepComposition) return { ...solveGreedy(i), fits: false };
  }
  return solveGreedy(i);
}

function solveGreedy(i: SolveInput): SolveResult {
  const availW = Math.max(0, i.boxW - 2 * i.pad);
  const placed: Rect[] = [];
  const rects: SolveResult["rects"] = {};
  let fits = true;
  const parents = restingOn(i);
  const pushLen = i.push ? Math.hypot(i.push.dx, i.push.dy) : 0;
  const pushDir = pushLen > EPS ? { x: i.push!.dx / pushLen, y: i.push!.dy / pushLen } : undefined;

  for (const key of i.order) {
    const spec = i.specs[key];
    if (!spec) continue;
    let d = i.desired[key];
    // Follow the block this one rests on, when the engine pushed it.
    const parent = parents[key];
    const pd = parent ? i.desired[parent] : undefined, pr = parent ? rects[parent] : undefined;
    if (d && pd && pr && parent !== i.dragged) {
      const dx = pr.x - pd.x, dy = pr.y - pd.y;
      if (Math.abs(dx) > EPS || Math.abs(dy) > EPS) d = { ...d, x: d.x + dx, y: d.y + dy };
    }
    const w0 = wantedWidth(spec, d, availW);
    const h0 = spec.heightAt(w0);
    const bottom = (i.growTo ?? i.boxH) - i.pad;
    const want: Rect = {
      x: clamp(d?.x ?? i.pad, i.pad, Math.max(i.pad, i.boxW - i.pad - w0)),
      y: clamp(d?.y ?? i.pad, i.pad, Math.max(i.pad, bottom - h0)),
      w: w0, h: h0,
    };
    const free = (r: Rect) => placed.every(o => overlapArea(r, o, BLOCK_GAP) === 0);

    let best: Rect | undefined;
    if (free(want) && inside(want, i)) {
      best = want;
    } else {
      const cx = want.x + w0 / 2, cy = want.y + h0 / 2;
      const prev = i.prev?.[key];
      let bestCost = Infinity;
      let fallback: Rect | undefined, fallbackOverlap = Infinity, fallbackCost = Infinity;
      for (const w of widthOptions(spec, w0, placed, i)) {
        const h = spec.heightAt(w);
        const maxX = i.boxW - i.pad - w, maxY = bottom - h;
        const xs = new Set<number>([clamp(want.x, i.pad, maxX), i.pad, maxX]);
        const ys = new Set<number>([clamp(want.y, i.pad, maxY), i.pad, maxY]);
        if (prev) { xs.add(clamp(prev.x, i.pad, maxX)); ys.add(clamp(prev.y, i.pad, maxY)); }
        for (const o of placed) {
          for (const x of [o.x - BLOCK_GAP - w, o.x + o.w + BLOCK_GAP, o.x, o.x + o.w - w, o.x + (o.w - w) / 2]) xs.add(x);
          for (const y of [o.y - BLOCK_GAP - h, o.y + o.h + BLOCK_GAP, o.y, o.y + o.h - h]) ys.add(y);
        }
        for (const x of xs) for (const y of ys) {
          const r = { x, y, w, h };
          if (x < i.pad - EPS || y < i.pad - EPS || x > maxX + EPS || y > maxY + EPS) continue;
          let cost = Math.hypot(x + w / 2 - cx, y + h / 2 - cy) + NARROW_COST * (w0 - w)
            + GROW_COST * Math.max(0, y + h - (i.boxH - i.pad));
          if (prev) cost += CONTINUITY_COST * Math.hypot(x - prev.x, y - prev.y);
          if (pushDir) cost += AGAINST_PUSH_COST * Math.max(0, -((x + w / 2 - cx) * pushDir.x + (y + h / 2 - cy) * pushDir.y));
          const ov = placed.reduce((s, o) => s + overlapArea(r, o, BLOCK_GAP), 0);
          if (ov === 0) {
            if (cost < bestCost - 1e-6 || (Math.abs(cost - bestCost) <= 1e-6 && best && (y < best.y || (y === best.y && x < best.x)))) {
              best = r; bestCost = cost;
            }
          } else if (ov < fallbackOverlap - 1e-6 || (Math.abs(ov - fallbackOverlap) <= 1e-6 && cost < fallbackCost)) {
            fallback = r; fallbackOverlap = ov; fallbackCost = cost;
          }
        }
      }
      if (!best) {
        fits = false;
        best = fallback ?? want;
      }
    }
    if (!inside(best, i)) fits = false;
    rects[key] = best;
    placed.push(best);
  }
  const neededH = Math.max(i.boxH, ...placed.map(r => r.y + r.h + i.pad));
  return { rects, fits, neededH };
}

/**
 * The desired rects packed vertically: same x, same order, blocks that
 * share a column kept BLOCK_GAP apart, everything inside the card. Two
 * passes (down from the top, then up from the bottom) — each block as close
 * to its desired y as the ones above and below it allow. Undefined when
 * even packed they do not fit (the card is below its minimum).
 */
function compactVertical(i: SolveInput): Partial<Record<BlockKey, Rect>> | undefined {
  const availW = Math.max(0, i.boxW - 2 * i.pad);
  const items = i.order.flatMap(k => {
    const s = i.specs[k], d = i.desired[k];
    if (!s || !d) return [];
    const w = wantedWidth(s, d, availW);
    return [{ k, r: { x: clamp(d.x, i.pad, Math.max(i.pad, i.boxW - i.pad - w)), y: d.y, w, h: s.heightAt(w) } as Rect }];
  }).sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x);
  // Side by side but a few px closer than the gap (a text measured a little
  // wider on another device): slide sideways to the gap instead of dropping
  // the block below — a near-touch never re-arranges the card (2026-10-28).
  const rowsOverlap = (a: Rect, b: Rect) => Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)) < BLOCK_GAP - EPS;
  for (let n = 0; n < items.length; n++) {
    const r = items[n].r;
    for (let m = 0; m < n; m++) {
      const o = items[m].r;
      if (!rowsOverlap(r, o)) continue;
      const right = r.x + r.w / 2 >= o.x + o.w / 2;
      const sep = right ? r.x - (o.x + o.w) : o.x - (r.x + r.w);
      if (sep < -EPS || sep >= BLOCK_GAP - EPS) continue;
      const x = right ? o.x + o.w + BLOCK_GAP : o.x - BLOCK_GAP - r.w;
      if (x < i.pad - EPS || x + r.w > i.boxW - i.pad + EPS) continue;
      const moved = { ...r, x };
      if (items.slice(0, n).some(it => overlapArea(moved, it.r, BLOCK_GAP) > 0)) continue;
      r.x = x;
    }
  }
  const shareColumn = (a: Rect, b: Rect) => Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)) < BLOCK_GAP - EPS;
  for (let n = 0; n < items.length; n++) {
    const r = items[n].r;
    r.y = Math.max(r.y, i.pad);
    for (let m = 0; m < n; m++) if (shareColumn(r, items[m].r)) r.y = Math.max(r.y, items[m].r.y + items[m].r.h + BLOCK_GAP);
  }
  for (let n = items.length - 1; n >= 0; n--) {
    const r = items[n].r;
    r.y = Math.min(r.y, i.boxH - i.pad - r.h);
    for (let m = n + 1; m < items.length; m++) if (shareColumn(r, items[m].r)) r.y = Math.min(r.y, items[m].r.y - BLOCK_GAP - r.h);
  }
  if (items.some(({ r }) => r.y < i.pad - EPS)) return undefined;
  for (let n = 0; n < items.length; n++) for (let m = n + 1; m < items.length; m++) {
    if (overlapArea(items[n].r, items[m].r, BLOCK_GAP) > 0) return undefined;
  }
  const out: Partial<Record<BlockKey, Rect>> = {};
  for (const { k, r } of items) out[k] = r;
  return out;
}

/** For each block, the earlier-placed block it rests right under (in the
 * desired positions), if any. */
function restingOn(i: SolveInput): Partial<Record<BlockKey, BlockKey>> {
  const out: Partial<Record<BlockKey, BlockKey>> = {};
  const availW = Math.max(0, i.boxW - 2 * i.pad);
  const rectOf = (k: BlockKey): Rect | undefined => {
    const s = i.specs[k], d = i.desired[k];
    if (!s || !d) return undefined;
    const w = wantedWidth(s, d, availW);
    return { x: d.x, y: d.y, w, h: s.heightAt(w) };
  };
  i.order.forEach((child, ci) => {
    const c = rectOf(child);
    if (!c) return;
    let best: { key: BlockKey; gap: number } | undefined;
    for (const parent of i.order.slice(0, ci)) {
      if (parent === i.dragged) continue;
      const p = rectOf(parent);
      if (!p) continue;
      const gap = c.y - (p.y + p.h);
      const hOverlap = Math.min(c.x + c.w, p.x + p.w) - Math.max(c.x, p.x);
      if (gap >= -EPS && gap <= REST_GAP && hOverlap > EPS && (!best || gap < best.gap)) best = { key: parent, gap };
    }
    if (best) out[child] = best.key;
  });
  return out;
}

/**
 * The smallest card height where everything fits at width `boxW`
 * (`build(H)` gives the solve input for a card of height H — the desired
 * rects scale with the card). Between `lo` and `hi`; `hi` when even that
 * does not fit.
 */
export function solveMinHeight(build: (h: number) => SolveInput, lo: number, hi: number): number {
  if (!solveLayout(build(hi)).fits) return hi;
  if (solveLayout(build(lo)).fits) return lo;
  let a = lo, b = hi;
  while (b - a > 1) {
    const m = Math.floor((a + b) / 2);
    if (solveLayout(build(m)).fits) b = m; else a = m;
  }
  return b;
}

// ── Magnetism (px) ───────────────────────────────────────────────────────────

/** Snap lines: card padding edges and center, and every other block's
 * edges and center. */
export interface SnapGuides { xs: number[]; ys: number[] }

export interface SnapState { x?: number; y?: number }

export interface SnapResult { x: number; y: number; lineX?: number; lineY?: number; state: SnapState }

const SNAP_ATTRACT = 6;
const SNAP_RELEASE = 10;

function snapAxis(pos: number, size: number, lines: number[], prevLine: number | undefined): { pos: number; line?: number } {
  const offsets = [0, size / 2, size]; // left / center / right edge on the line
  let best: { pos: number; line: number; d: number } | undefined;
  for (const line of lines) for (const off of offsets) {
    const p = line - off;
    const d = Math.abs(p - pos);
    const radius = prevLine != null && Math.abs(line - prevLine) < 0.01 ? SNAP_RELEASE : SNAP_ATTRACT;
    if (d <= radius && (!best || d < best.d)) best = { pos: p, line, d };
  }
  return best ? { pos: best.pos, line: best.line } : { pos };
}

/** Pulls a dragged rect onto the nearest guide (edges / centers) within a
 * few px, with a wider release radius once snapped — it helps, it never
 * blocks: dragging on lets go. */
export function snapRect(r: Rect, guides: SnapGuides, prev: SnapState): SnapResult {
  const sx = snapAxis(r.x, r.w, guides.xs, prev.x);
  const sy = snapAxis(r.y, r.h, guides.ys, prev.y);
  return { x: sx.pos, y: sy.pos, lineX: sx.line, lineY: sy.line, state: { x: sx.line, y: sy.line } };
}

export function guidesFor(boxW: number, boxH: number, pad: number, others: Rect[]): SnapGuides {
  const xs = [pad, boxW / 2, boxW - pad];
  const ys = [pad, boxH / 2, boxH - pad];
  for (const o of others) {
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  return { xs, ys };
}
