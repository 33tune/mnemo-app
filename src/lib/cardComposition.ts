/**
 * Pure, React/DOM-independent composition engine for the Presentation Card.
 * No measurements from the browser — text size is estimated heuristically
 * (see TEXT_METRICS) and CSS truncation (line-clamp) is the real safety net
 * for whatever the estimate gets wrong. Same architectural family as
 * cardGeometry.ts and mobileMerge.ts: constants + pure functions, no state.
 *
 * MODEL (see Stage 2 design discussion for the full reasoning; PFP-authority
 * model revised in Stage 3B.2-B — see below):
 * - format/geometry (cardGeometry.ts) decide the box. This file never touches w/h.
 * - 5 fixed structural PRIMITIVES ("row" | "row-reverse" | "column" |
 *   "column-reverse" | "centered") are internal topologies, never exposed to
 *   the user as presets/positions.
 * - The PFP is AUTHORITATIVE: its box is always the literal anchorX/anchorY
 *   position (padding + anchor*(avail-size)), for every topology, with no
 *   exception and no compromise — never clamped or nudged to make content
 *   fit. This was NOT always true: through Stage 3B.2-A, row/row-reverse/
 *   column/column-reverse could silently reposition the PFP away from the
 *   anchor when content needed the room (scored via a now-removed
 *   "anchorDistance" term), which is what let the persisted anchor and the
 *   rendered position disagree — see the 3B.2-A/B PFP-anchor-drag postmortem.
 *   The content block is what negotiates for whatever room is left once the
 *   PFP's position is fixed — never the other way around.
 * - Content alignment (textAlign, resolveContentBlock) and content POSITION
 *   (which topology, i.e. anchor-driven placement) are independent: textAlign
 *   only affects how rows sit within the content block's own bounding width;
 *   it never changes where that block sits in the card.
 * - Candidates are generated for all 5 primitives on every call, scored, and
 *   the highest score wins — purely on visual-quality terms now (density,
 *   proximity, balance, alignment, how much had to be dropped): with the PFP
 *   fixed, whichever topology leaves the most usable room for content
 *   naturally tends to win, with no anchor-fidelity term needed to steer it.
 *
 * STAGE 3B.3 — constrained freeform (see computeBlockLayout at the bottom):
 * computeComposition() above is unchanged and IS the "base composition" —
 * the automatic, anchor-free-for-content layout used whenever a block has no
 * override. computeBlockLayout() wraps it: PFP stays exactly as
 * computeComposition produced it (still the only authoritative anchor system
 * — no second one introduced here), while Name+Handle+Descriptor+Bio (one
 * group, "identity"), Location, and Views may each additionally have an
 * independent normalized-anchor override. An overridden block is resolved
 * through blockConstraints.ts's generic anchor->rect->anti-overlap pipeline
 * instead of the base composition's position; a block with no override keeps
 * its base-composition position untouched (byte-identical output — see the
 * "no overrides" regression test). Blocks are resolved in a fixed priority
 * order (pfp, then identity, then location, then views) so a moved block
 * only ever displaces a LOWER-priority one, never a higher one.
 */
import type { CardFormat } from "@/types";
import { resolveBlockPosition, resolveOverlap, type Rect } from "./blockConstraints";

// ── Public types ─────────────────────────────────────────────────────────────

export type CompositionStrategy = "row" | "row-reverse" | "column" | "column-reverse" | "centered";
export type TextAlign = "left" | "center" | "right";

export interface PfpInput {
  /** 0-1, continuous, normalized within the card's padded content area. */
  anchorX: number;
  anchorY: number;
  /** Resolved px size (diameter) of the avatar — caller resolves from whatever size config exists. */
  size: number;
}

export interface ContentFieldInput {
  present: boolean;
  /** Approx character length, used for width/wrap estimation. Ignored if !present. */
  length?: number;
}

export interface CompositionContentInput {
  name: ContentFieldInput;
  handle: ContentFieldInput;
  bio: ContentFieldInput;
  descriptor: ContentFieldInput;
  location: ContentFieldInput;
  views: ContentFieldInput;
}

export interface CompositionTypographyInput {
  nameFontSize: number;
  bioFontSize: number;
}

export interface CompositionInput {
  /** Soft tiebreaker only — see FORMAT_BIAS. Never a hard branch. */
  format: CardFormat;
  boxW: number;
  boxH: number;
  padding: number;
  pfp: PfpInput;
  content: CompositionContentInput;
  typography: CompositionTypographyInput;
  /** Strategy that won last tick, for hysteresis. Omit on a cold call (page load). */
  incumbent?: CompositionStrategy;
  /** Text alignment within the content block — independent of WHERE the
   * composition engine places that block (anchor-driven). Defaults to "left". */
  textAlign?: TextAlign;
}

export type ElementRole = "pfp" | "name" | "handle" | "bio" | "descriptor" | "location" | "views";

export interface ElementBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bio only: how many lines it was actually given (may be less than its natural estimate). */
  lines?: number;
}

export interface CompositionResult {
  strategy: CompositionStrategy;
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  score: number;
  candidateScores: Record<CompositionStrategy, number>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STRATEGIES: CompositionStrategy[] = ["row", "row-reverse", "column", "column-reverse", "centered"];

// Small, deliberately weak nudge — see cardComposition's header comment and
// the Stage 2 discussion. Must never be large enough to beat a real anchor signal.
const FORMAT_BIAS: Record<CardFormat, Partial<Record<CompositionStrategy, number>>> = {
  vertical:   { column: 20, "column-reverse": 20 },
  horizontal: { row: 20, "row-reverse": 20 },
  square:     { centered: 20 },
  phone:      { column: 20 },
  card:       { row: 10, column: 10 },
};

// Heuristic text metrics — average proportional-font char width as a fraction
// of font size, and line-height factors. Approximate by design (see file header).
//
// letterSpacing* mirrors the CSS letter-spacing actually applied to each role
// in ProfileCard.tsx (HandleLine/DescriptorLine/LocationLine/ViewsLine) — the
// estimator used to omit this entirely, which under-measured every mono-font
// role by (charCount-1)*letterSpacing px. For a 13-char descriptor at 0.5px
// spacing that's only ~6px, but combined with an already-tight charW average
// it was consistently enough to push real rendered text past the box the
// engine allocated for it, triggering the CSS ellipsis fallback on content
// that should have fit (see Stage 3B.2-B QA: "CEO OF MYLAND" -> "CEO OF MYLA...").
// SAFETY_MARGIN_PX is deliberately asymmetric: a slightly-too-wide box just
// wastes a few px of card whitespace (invisible); a slightly-too-narrow one
// truncates a word (very visible) — so estimates are biased to over- rather
// than under-shoot.
const TEXT_METRICS = {
  nameCharW: 0.58, nameLineH: 1.3, nameLetterSpacing: 0,
  monoCharW: 0.6,  monoLineH: 1.4,   // handle/descriptor/location/views (Space Mono is fixed-width-ish)
  handleLetterSpacing: 0.4, descriptorLetterSpacing: 0.5, locationLetterSpacing: 0.3,
  bioCharW: 0.55,  bioLineH: 1.5,
  monoFontSize: 9,                   // handle/descriptor size is fixed today, not user-configurable
  locationFontSize: 8,
  viewsFontSize: 9,
  viewsWidthPx: 84,                  // "12.3K views" @ letterSpacing 1.5 + uppercase — not length-dependent
};
const SAFETY_MARGIN_PX = 3;

const GAP_MIN = 8, GAP_MAX = 32;
// Natural PFP-content gap band, as a fraction of PFP size — used by the proximity score term.
const PROXIMITY_BAND: [number, number] = [0.15, 0.4];
const DENSITY_BAND: [number, number] = [0.35, 0.55];
// Side margin needed around a centered PFP before metadata is allowed to flank it
// instead of stacking below — see resolveCentered.
const CENTER_FLANK_MIN_MARGIN = 60;

// Drop order when content doesn't fit: least essential to identity first.
const METADATA_DROP_ORDER: ElementRole[] = ["views", "location", "descriptor"];

const W = {
  overflow: 50,          // defensive; cardGeometry's minimums should make this unreachable in practice
  dropped: 30,            // per fully-dropped optional role
  bioClampLine: 8,        // per line cut below bio's natural estimate
  edgeViolation: 500,     // defensive
  density: 300,
  proximity: 100,
  balance: 3,
  alignment: 2,
  incumbent: 35,
};

// ── Text estimation (pure, heuristic — see file header) ──────────────────────

// letterSpacingPx: the (charCount-1) gaps a real rendered line actually has —
// see TEXT_METRICS's header comment for why this used to be omitted and what
// that cost. SAFETY_MARGIN_PX is added to every non-empty estimate, biasing
// the box the engine allocates to be slightly generous rather than tight.
function estimateLineWidth(length: number, fontSize: number, charW: number, letterSpacingPx = 0): number {
  if (length <= 0) return 0;
  return length * fontSize * charW + Math.max(0, length - 1) * letterSpacingPx + SAFETY_MARGIN_PX;
}

/** Lines needed to fit `length` chars of bio in `availWidth`, unbounded (degradation clamps later). */
function estimateBioLines(length: number, fontSize: number, availWidth: number): number {
  if (length <= 0) return 0;
  const lineWidth = estimateLineWidth(length, fontSize, TEXT_METRICS.bioCharW);
  return Math.max(1, Math.ceil(lineWidth / Math.max(1, availWidth)));
}

/** x offset for a row of width `rowW` within a block of width `blockWidth`. */
function alignRowX(rowW: number, blockWidth: number, align: TextAlign): number {
  if (align === "center") return Math.max(0, (blockWidth - rowW) / 2);
  if (align === "right") return Math.max(0, blockWidth - rowW);
  return 0;
}

// ── Content block resolution (always a vertical stack) ────────────────────────

interface ResolvedContent {
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  width: number;
  height: number;
}

/**
 * Lays out name/handle/bio/descriptor/location/views as a vertical stack
 * within `availWidth`, dropping the least-essential optional roles (in
 * METADATA_DROP_ORDER, then clamping bio down to 1 line) until the stack's
 * height fits `availHeight`. Used identically by row-like (tight width,
 * generous height) and column-like (generous width, tight height) topologies
 * — only which axis is under pressure differs.
 */
function resolveContentBlock(
  content: CompositionContentInput,
  typography: CompositionTypographyInput,
  availWidth: number,
  availHeight: number,
  gap: number,
  textAlign: TextAlign = "left",
): ResolvedContent {
  const dropped: ElementRole[] = [];
  const active = {
    name: content.name.present,
    handle: content.handle.present,
    bio: content.bio.present,
    descriptor: content.descriptor.present,
    location: content.location.present,
    views: content.views.present,
  };
  let bioLines = content.bio.present
    ? estimateBioLines(content.bio.length ?? 0, typography.bioFontSize, Math.max(1, availWidth))
    : 0;

  function measure(): { height: number; rows: { role: ElementRole; h: number; w: number }[] } {
    const rows: { role: ElementRole; h: number; w: number }[] = [];
    if (active.name) rows.push({ role: "name", h: typography.nameFontSize * TEXT_METRICS.nameLineH, w: Math.min(availWidth, estimateLineWidth(content.name.length ?? 0, typography.nameFontSize, TEXT_METRICS.nameCharW, TEXT_METRICS.nameLetterSpacing)) });
    if (active.handle) rows.push({ role: "handle", h: TEXT_METRICS.monoFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, estimateLineWidth(content.handle.length ?? 0, TEXT_METRICS.monoFontSize, TEXT_METRICS.monoCharW, TEXT_METRICS.handleLetterSpacing)) });
    if (active.descriptor) rows.push({ role: "descriptor", h: TEXT_METRICS.monoFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, estimateLineWidth(content.descriptor.length ?? 0, TEXT_METRICS.monoFontSize, TEXT_METRICS.monoCharW, TEXT_METRICS.descriptorLetterSpacing)) });
    if (active.location) rows.push({ role: "location", h: TEXT_METRICS.locationFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, estimateLineWidth(content.location.length ?? 0, TEXT_METRICS.locationFontSize, TEXT_METRICS.monoCharW, TEXT_METRICS.locationLetterSpacing)) });
    if (active.bio && bioLines > 0) rows.push({ role: "bio", h: bioLines * typography.bioFontSize * TEXT_METRICS.bioLineH, w: availWidth });
    if (active.views) rows.push({ role: "views", h: TEXT_METRICS.viewsFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, TEXT_METRICS.viewsWidthPx) });
    const height = rows.reduce((sum, r) => sum + r.h, 0) + Math.max(0, rows.length - 1) * gap;
    return { height, rows };
  }

  // Degradation ladder: drop least-essential metadata, then clamp bio, until it fits.
  let m = measure();
  for (const role of METADATA_DROP_ORDER) {
    if (m.height <= availHeight) break;
    if (active[role as "views" | "location" | "descriptor"]) {
      active[role as "views" | "location" | "descriptor"] = false;
      dropped.push(role);
      m = measure();
    }
  }
  while (m.height > availHeight && bioLines > 1) {
    bioLines -= 1;
    m = measure();
  }
  // Absolute floor reached (everything droppable dropped, bio at 1 line) and it
  // still doesn't fit: compress proportionally rather than let the block invade
  // whatever sits next to it (the PFP). This is the rare last resort — CSS
  // truncation is the real safety net for what this compression visually implies.
  const squeeze = m.height > availHeight && m.height > 0 ? availHeight / m.height : 1;

  // Stack the surviving rows top-to-bottom, each aligned per `textAlign`
  // within the block's own width (the widest row) — independent of WHERE
  // this whole block ends up in the card (that's the topology's job, done
  // by the caller via contentMainStart/contentCrossStart/blockOffsetX).
  const width = m.rows.length > 0 ? Math.max(...m.rows.map(r => r.w)) : 0;
  const boxes: Partial<Record<ElementRole, ElementBox>> = {};
  let y = 0;
  for (const row of m.rows) {
    const h = row.h * squeeze;
    boxes[row.role] = { x: alignRowX(row.w, width, textAlign), y, w: row.w, h, ...(row.role === "bio" ? { lines: bioLines } : {}) };
    y += h + gap * squeeze;
  }
  return { boxes, dropped, width, height: Math.min(m.height, availHeight) };
}

// ── Axis-aligned topologies (row, row-reverse, column, column-reverse) ───────

interface AxisResolution {
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  contentWidth: number;
  contentHeight: number;
}

/**
 * Generic resolver for the 4 non-centered primitives. mainAxis is the axis
 * PFP and content are ordered along; `reverse` flips which comes first.
 *
 * PFP-authoritative (Stage 3B.2-B): the pfp's position on both axes is always
 * the literal anchor-derived value, computed FIRST and never adjusted — see
 * file header. Content then negotiates for whatever room is actually left
 * once the pfp's position is fixed (as opposed to the pre-3B.2-B order, which
 * sized content against a pfp-position-independent budget and only THEN
 * clamped the pfp to make room for it if that budget turned out wrong — that
 * two-way negotiation is what let the pfp silently end up somewhere other
 * than the anchor).
 */
function resolveAxis(
  mainAxis: "x" | "y",
  reverse: boolean,
  input: CompositionInput,
): AxisResolution {
  const { boxW, boxH, padding, pfp, content, typography, textAlign } = input;
  const boxMain = mainAxis === "x" ? boxW : boxH;
  const boxCross = mainAxis === "x" ? boxH : boxW;
  const anchorMain = mainAxis === "x" ? pfp.anchorX : pfp.anchorY;
  const anchorCross = mainAxis === "x" ? pfp.anchorY : pfp.anchorX;

  const availMain = Math.max(0, boxMain - 2 * padding);
  const availCross = Math.max(0, boxCross - 2 * padding);
  const gap = Math.max(GAP_MIN, Math.min(GAP_MAX, availMain * 0.06));

  // Authoritative pfp position on both axes — always in-bounds by
  // construction (anchor∈[0,1], avail-pfp.size floored at 0), so no clamp is
  // needed or applied.
  const actualPfpMain = padding + anchorMain * Math.max(0, availMain - pfp.size);
  const actualPfpCross = padding + anchorCross * Math.max(0, availCross - pfp.size);

  // Content's dimension along mainAxis is negotiated against whatever room
  // the now-fixed pfp position actually leaves; along cross it's generous
  // (=availCross), same as before.
  let contentMainStart: number;
  let negotiatedMainSpace: number;
  if (!reverse) {
    // [PFP][gap][CONTENT] — content starts right after the pfp, however far
    // right that turned out to be; whatever's left to the box edge is its budget.
    contentMainStart = actualPfpMain + pfp.size + gap;
    negotiatedMainSpace = Math.max(0, (boxMain - padding) - contentMainStart);
  } else {
    // [CONTENT][gap][PFP] — budget is whatever sits between the padding edge
    // and the pfp; content still hugs the pfp (computed below, once its own
    // resolved width is known) rather than pinning to the padding edge.
    negotiatedMainSpace = Math.max(0, actualPfpMain - gap - padding);
    contentMainStart = padding; // placeholder, overwritten below once contentMain is known
  }

  const contentAvailWidth  = mainAxis === "x" ? negotiatedMainSpace : availCross;
  const contentAvailHeight = mainAxis === "x" ? availCross : negotiatedMainSpace;

  const resolved = resolveContentBlock(content, typography, contentAvailWidth, contentAvailHeight, Math.min(gap, 10), textAlign);
  const contentMain = mainAxis === "x" ? resolved.width : resolved.height;
  const contentCross = mainAxis === "x" ? resolved.height : resolved.width;

  if (reverse) contentMainStart = actualPfpMain - gap - contentMain; // hug the pfp

  const pfpCrossCenter = actualPfpCross + pfp.size / 2;
  const contentCrossStart = Math.max(padding, Math.min(pfpCrossCenter - contentCross / 2, Math.max(padding, boxCross - padding - contentCross)));

  const pfpBox: ElementBox = mainAxis === "x"
    ? { x: actualPfpMain, y: actualPfpCross, w: pfp.size, h: pfp.size }
    : { x: actualPfpCross, y: actualPfpMain, w: pfp.size, h: pfp.size };

  const boxes: Partial<Record<ElementRole, ElementBox>> = { pfp: pfpBox };
  for (const [role, box] of Object.entries(resolved.boxes) as [ElementRole, ElementBox][]) {
    boxes[role] = mainAxis === "x"
      ? { ...box, x: box.x + contentMainStart, y: box.y + contentCrossStart }
      : { ...box, x: box.x + contentCrossStart, y: box.y + contentMainStart };
  }

  return {
    boxes,
    dropped: resolved.dropped,
    contentWidth: mainAxis === "x" ? contentMain : contentCross,
    contentHeight: mainAxis === "x" ? contentCross : contentMain,
  };
}

// ── Centered topology ──────────────────────────────────────────────────────

function resolveCentered(input: CompositionInput): AxisResolution {
  const { boxW, boxH, padding, pfp, content, typography, textAlign } = input;
  const availW = Math.max(0, boxW - 2 * padding);
  const availH = Math.max(0, boxH - 2 * padding);

  // Authoritative pfp position — always in-bounds by construction (anchor∈[0,1]),
  // same as resolveAxis. This was already effectively true before Stage 3B.2-B
  // (the clamp below was already a no-op for any anchor∈[0,1] — hence this
  // strategy's pre-existing "anchorDistance-free by construction" test), now
  // made explicit by dropping the dead clamp/anchorDistance computation.
  const actualX = padding + pfp.anchorX * Math.max(0, availW - pfp.size);
  const actualY = padding + pfp.anchorY * Math.max(0, availH - pfp.size);

  const leftMargin = actualX - padding;
  const rightMargin = boxW - padding - (actualX + pfp.size);
  const belowSpace = Math.max(0, boxH - padding - (actualY + pfp.size));
  const gap = Math.max(GAP_MIN, Math.min(GAP_MAX, availH * 0.06));

  const canFlank = leftMargin >= CENTER_FLANK_MIN_MARGIN || rightMargin >= CENTER_FLANK_MIN_MARGIN;
  const dropped: ElementRole[] = [];
  const boxes: Partial<Record<ElementRole, ElementBox>> = {
    pfp: { x: actualX, y: actualY, w: pfp.size, h: pfp.size },
  };

  // "Radiate": descriptor/location flank the PFP if there's real margin for them;
  // name/handle/bio/views always stack below, centered — see file header for
  // why this counts as one primitive's internal richness, not a 6th strategy.
  const belowContent: CompositionContentInput = canFlank
    ? { ...content, descriptor: { present: false }, location: { present: false } }
    : content;

  if (canFlank && content.descriptor.present) {
    const side = rightMargin >= leftMargin ? "right" : "left";
    const w = Math.min(side === "right" ? rightMargin - 8 : leftMargin - 8, 120);
    if (w > 20) {
      const x = side === "right" ? actualX + pfp.size + 8 : actualX - 8 - w;
      boxes.descriptor = { x, y: actualY, w, h: TEXT_METRICS.monoFontSize * TEXT_METRICS.monoLineH };
    } else dropped.push("descriptor");
  } else if (content.descriptor.present) dropped.push("descriptor");

  if (canFlank && content.location.present) {
    const side = leftMargin >= rightMargin ? "left" : "right";
    const w = Math.min(side === "right" ? rightMargin - 8 : leftMargin - 8, 120);
    if (w > 20) {
      const x = side === "right" ? actualX + pfp.size + 8 : actualX - 8 - w;
      boxes.location = { x, y: actualY + pfp.size - TEXT_METRICS.locationFontSize * TEXT_METRICS.monoLineH, w, h: TEXT_METRICS.locationFontSize * TEXT_METRICS.monoLineH };
    } else dropped.push("location");
  } else if (content.location.present) dropped.push("location");

  const resolvedBelow = resolveContentBlock(belowContent, typography, availW, belowSpace, gap, textAlign);
  dropped.push(...resolvedBelow.dropped);
  const belowY = actualY + pfp.size + gap;
  // Position of the BLOCK as a whole (centered under the pfp) — a topology
  // concern — is independent of textAlign, which only governs how rows sit
  // WITHIN that block (already baked into resolvedBelow.boxes[role].x by
  // resolveContentBlock). Previously this force-centered every row
  // individually against the full card width, which both ignored textAlign
  // and threw away resolveContentBlock's own (left-by-default) row alignment.
  const blockOffsetX = padding + Math.max(0, (availW - resolvedBelow.width) / 2);
  for (const [role, box] of Object.entries(resolvedBelow.boxes) as [ElementRole, ElementBox][]) {
    boxes[role] = { ...box, x: box.x + blockOffsetX, y: box.y + belowY };
  }

  return {
    boxes,
    dropped,
    contentWidth: availW,
    contentHeight: resolvedBelow.height + gap + pfp.size,
  };
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function bandPenalty(value: number, band: [number, number]): number {
  if (value < band[0]) return (band[0] - value) ** 2;
  if (value > band[1]) return (value - band[1]) ** 2;
  return 0;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function scoreResolution(
  strategy: CompositionStrategy,
  res: { boxes: Partial<Record<ElementRole, ElementBox>>; dropped: ElementRole[] },
  input: CompositionInput,
): number {
  const { boxW, boxH, padding, pfp, format } = input;
  const boxes = res.boxes;
  const entries = Object.values(boxes) as ElementBox[];

  let score = 1000;

  // Overflow / edge safety (defensive — should be ~unreachable given cardGeometry minimums).
  for (const b of entries) {
    const overW = Math.max(0, b.x + b.w - (boxW - padding)) + Math.max(0, padding - b.x);
    const overH = Math.max(0, b.y + b.h - (boxH - padding)) + Math.max(0, padding - b.y);
    if (overW > 1 || overH > 1) score -= W.edgeViolation;
    score -= (overW + overH) * W.overflow * 0.01;
  }

  // Overlap between pfp and any content box — should be structurally impossible
  // after resolveContentBlock's proportional squeeze, but scored explicitly too
  // (defense in depth, and it's what actually caught the squeeze bug in testing).
  const pfpBox0 = boxes.pfp;
  if (pfpBox0) {
    for (const b of entries) {
      if (b === pfpBox0) continue;
      const overlapX = Math.max(0, Math.min(pfpBox0.x + pfpBox0.w, b.x + b.w) - Math.max(pfpBox0.x, b.x));
      const overlapY = Math.max(0, Math.min(pfpBox0.y + pfpBox0.h, b.y + b.h) - Math.max(pfpBox0.y, b.y));
      if (overlapX > 0 && overlapY > 0) score -= overlapX * overlapY * 5;
    }
  }

  score -= res.dropped.filter(r => r !== "bio").length * W.dropped;
  const bioBox = boxes.bio;
  if (bioBox?.lines != null) {
    const natural = estimateBioLines(input.content.bio.length ?? 0, input.typography.bioFontSize, bioBox.w || 1);
    score -= Math.max(0, natural - bioBox.lines) * W.bioClampLine;
  }

  const totalArea = entries.reduce((sum, b) => sum + b.w * b.h, 0);
  const boxArea = Math.max(1, boxW * boxH);
  const density = totalArea / boxArea;
  score -= bandPenalty(density, DENSITY_BAND) * W.density;

  const pfpBox = boxes.pfp;
  if (pfpBox) {
    const others = entries.filter(b => b !== pfpBox);
    if (others.length > 0) {
      const pfpCx = pfpBox.x + pfpBox.w / 2, pfpCy = pfpBox.y + pfpBox.h / 2;
      let minGapDist = Infinity;
      for (const b of others) {
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const d = Math.hypot(cx - pfpCx, cy - pfpCy) - (pfpBox.w / 2);
        minGapDist = Math.min(minGapDist, Math.max(0, d));
      }
      const normalized = minGapDist / Math.max(1, pfp.size);
      score -= bandPenalty(normalized, PROXIMITY_BAND) * W.proximity;
    }

    // Balance: variance of the 4 edge margins (pfp+content bounding box vs card edges).
    const minX = Math.min(...entries.map(b => b.x));
    const maxX = Math.max(...entries.map(b => b.x + b.w));
    const minY = Math.min(...entries.map(b => b.y));
    const maxY = Math.max(...entries.map(b => b.y + b.h));
    const margins = [minX - padding, (boxW - padding) - maxX, minY - padding, (boxH - padding) - maxY].map(m => Math.max(0, m));
    score -= stddev(margins) * W.balance;
  }

  // Alignment: variance along the reference line that actually matches
  // input.textAlign — left edge, right edge, or center line. This must track
  // textAlign (not the strategy) so choosing "right"/"center" text alignment
  // never itself biases which topology wins: a topology-selection decision
  // driven by textAlign would violate the "these are two independent things"
  // contract (see file header) just as surely as the pre-3B.2-B anchor
  // compromise did for position.
  const contentRoles: ElementRole[] = ["name", "handle", "bio", "descriptor", "location", "views"];
  const align = input.textAlign ?? "left";
  const alignmentCoords = contentRoles
    .map(r => boxes[r])
    .filter((b): b is ElementBox => b != null)
    .map(b => align === "center" ? b.x + b.w / 2 : align === "right" ? b.x + b.w : b.x);
  score -= stddev(alignmentCoords) * W.alignment;

  score += FORMAT_BIAS[format]?.[strategy] ?? 0;
  if (input.incumbent === strategy) score += W.incumbent;

  return score;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function computeComposition(input: CompositionInput): CompositionResult {
  const candidateScores = {} as Record<CompositionStrategy, number>;
  const resolutions: Record<CompositionStrategy, { boxes: Partial<Record<ElementRole, ElementBox>>; dropped: ElementRole[] }> = {} as never;

  for (const strategy of STRATEGIES) {
    const res = strategy === "centered"
      ? resolveCentered(input)
      : strategy === "row" ? resolveAxis("x", false, input)
      : strategy === "row-reverse" ? resolveAxis("x", true, input)
      : strategy === "column" ? resolveAxis("y", false, input)
      : resolveAxis("y", true, input);
    resolutions[strategy] = res;
    candidateScores[strategy] = scoreResolution(strategy, res, input);
  }

  let winner: CompositionStrategy = STRATEGIES[0];
  for (const s of STRATEGIES) {
    if (candidateScores[s] > candidateScores[winner]) winner = s;
  }

  return {
    strategy: winner,
    boxes: resolutions[winner].boxes,
    dropped: resolutions[winner].dropped,
    score: candidateScores[winner],
    candidateScores,
  };
}

// ── Constrained freeform block layout (Stage 3B.3) ────────────────────────────

/** One optional normalized anchor override per independently-positionable
 * block. Absent = "use the base composition's own placement for this block". */
export interface BlockOverrides {
  identity?: { x: number; y: number };
  location?: { x: number; y: number };
  views?: { x: number; y: number };
}

const IDENTITY_ROLES: ElementRole[] = ["name", "handle", "descriptor", "bio"];
const BLOCK_MIN_GAP = 8;

function unionBox(boxes: ElementBox[]): ElementBox | undefined {
  if (boxes.length === 0) return undefined;
  const minX = Math.min(...boxes.map(b => b.x));
  const minY = Math.min(...boxes.map(b => b.y));
  const maxX = Math.max(...boxes.map(b => b.x + b.w));
  const maxY = Math.max(...boxes.map(b => b.y + b.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** override -> resolve via the anchor pipeline (user dragged it); no override
 * -> just re-validate the base composition's own rect against obstacles
 * (exact no-op when nothing upstream moved — no anchor round-trip needed
 * since we already have the pixel rect). */
function resolveBlock(
  baseRect: ElementBox,
  override: { x: number; y: number } | undefined,
  obstacles: Rect[],
  boxW: number,
  boxH: number,
  padding: number,
): Rect {
  return override
    ? resolveBlockPosition(override.x, override.y, baseRect.w, baseRect.h, obstacles, boxW, boxH, padding, BLOCK_MIN_GAP)
    : resolveOverlap(baseRect, obstacles, boxW, boxH, padding, BLOCK_MIN_GAP);
}

/**
 * Wraps computeComposition() with independent, overridable positioning for
 * the identity group (name+handle+descriptor+bio, moved as one block),
 * location, and views — see the file header's Stage 3B.3 section. Same
 * CompositionResult shape as computeComposition(); with no overrides at all
 * the output is identical to calling computeComposition() directly (see the
 * "no overrides" regression test in cardComposition.test.ts).
 *
 * Resolution order is fixed priority, not arbitrary: pfp (untouched, already
 * authoritative) -> identity -> location -> views. Each later block treats
 * every earlier one as an obstacle, so a moved block only ever displaces a
 * LOWER-priority block, never a higher one — moving identity can push
 * location or views out of the way, but never the pfp, and moving location
 * never pushes identity.
 */
export interface BlockLayoutResult extends CompositionResult {
  /** Bounding box of the identity group (name+handle+descriptor+bio) in its
   * FINAL position — i.e. boxes.name/handle/descriptor/bio's union after any
   * override/overlap resolution. Exposed so callers (the drag UI) have a
   * single rect to use as the group's hit-area and drag-start reference,
   * without re-deriving the union themselves (see 3B.3-B). Undefined only if
   * none of name/handle/descriptor/bio are present at all. */
  identityRect?: ElementBox;
}

export function computeBlockLayout(input: CompositionInput, overrides?: BlockOverrides): BlockLayoutResult {
  const base = computeComposition(input);
  const identityBase = unionBox(
    IDENTITY_ROLES.map(role => base.boxes[role]).filter((b): b is ElementBox => b != null),
  );

  // No overrides at all: return the base composition completely untouched.
  // Re-running it through the anti-overlap pipeline below would NOT
  // necessarily be a no-op — that pipeline enforces BLOCK_MIN_GAP (a
  // deliberate breathing-room minimum for freeform dragging), while the base
  // composition itself only guarantees zero literal overlap, not any
  // particular gap. Skipping entirely here is what keeps "no overrides yet"
  // byte-identical to calling computeComposition() directly (see the
  // regression test), which is the actual compatibility contract (existing
  // cards have none of these fields and must render unchanged).
  if (!overrides?.identity && !overrides?.location && !overrides?.views) {
    return { ...base, identityRect: identityBase };
  }

  const { boxW, boxH, padding } = input;
  const boxes = { ...base.boxes };
  const obstacles: Rect[] = boxes.pfp ? [boxes.pfp] : [];
  let identityRect = identityBase;

  // ── Identity group (name/handle/descriptor/bio) — moved as one block ──────
  if (identityBase && identityBase.w > 0 && identityBase.h > 0) {
    const identityEntries = IDENTITY_ROLES
      .map(role => [role, boxes[role]] as const)
      .filter((e): e is [ElementRole, ElementBox] => e[1] != null);
    const resolved = resolveBlock(identityBase, overrides?.identity, obstacles, boxW, boxH, padding);
    const dx = resolved.x - identityBase.x, dy = resolved.y - identityBase.y;
    if (dx !== 0 || dy !== 0) {
      for (const [role, b] of identityEntries) boxes[role] = { ...b, x: b.x + dx, y: b.y + dy };
    }
    identityRect = { ...identityBase, x: resolved.x, y: resolved.y };
    obstacles.push(resolved);
  }

  // ── Location — independent block ───────────────────────────────────────────
  if (boxes.location) {
    const resolved = resolveBlock(boxes.location, overrides?.location, obstacles, boxW, boxH, padding);
    boxes.location = { ...boxes.location, x: resolved.x, y: resolved.y };
    obstacles.push(resolved);
  }

  // ── Views — independent block ──────────────────────────────────────────────
  if (boxes.views) {
    const resolved = resolveBlock(boxes.views, overrides?.views, obstacles, boxW, boxH, padding);
    boxes.views = { ...boxes.views, x: resolved.x, y: resolved.y };
  }

  return { ...base, boxes, identityRect };
}
