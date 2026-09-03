/**
 * Pure, React/DOM-independent composition engine for the Presentation Card.
 * No measurements from the browser — text size is estimated heuristically
 * (see TEXT_METRICS) and CSS truncation (line-clamp) is the real safety net
 * for whatever the estimate gets wrong. Same architectural family as
 * cardGeometry.ts and mobileMerge.ts: constants + pure functions, no state.
 *
 * MODEL (see Stage 2 design discussion for the full reasoning):
 * - format/geometry (cardGeometry.ts) decide the box. This file never touches w/h.
 * - 5 fixed structural PRIMITIVES ("row" | "row-reverse" | "column" |
 *   "column-reverse" | "centered") are internal topologies, never exposed to
 *   the user as presets/positions.
 * - Everything else — gap, alignment, offsets, how much of the content block
 *   fits — is computed continuously from anchorX/anchorY (0-1, where the user
 *   dragged the PFP) and the actual content present.
 * - Candidates are generated for all 5 primitives on every call, scored, and
 *   the highest score wins. "anchorDistance" (see resolveAxis) is the key
 *   term: it measures how much a given topology had to pull the PFP away
 *   from the literal anchor point to keep content readable in that order —
 *   this is *why* row loses to row-reverse as the anchor drags right, with
 *   no hardcoded left/right rule anywhere.
 */
import type { CardFormat } from "@/types";

// ── Public types ─────────────────────────────────────────────────────────────

export type CompositionStrategy = "row" | "row-reverse" | "column" | "column-reverse" | "centered";

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
const TEXT_METRICS = {
  nameCharW: 0.55, nameLineH: 1.3,
  monoCharW: 0.6,  monoLineH: 1.4,   // handle/descriptor/location/views (Space Mono is fixed-width-ish)
  bioCharW: 0.55,  bioLineH: 1.5,
  monoFontSize: 9,                   // handle/descriptor size is fixed today, not user-configurable
  locationFontSize: 8,
  viewsFontSize: 9,
  viewsWidthPx: 70,                  // "1.2K views" — not length-dependent
};

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
  anchorDistance: 0.4,    // per px of compromise between raw anchor and achievable position
  edgeViolation: 500,     // defensive
  density: 300,
  proximity: 100,
  balance: 3,
  alignment: 2,
  incumbent: 35,
};

// ── Text estimation (pure, heuristic — see file header) ──────────────────────

function estimateLineWidth(length: number, fontSize: number, charW: number): number {
  return length * fontSize * charW;
}

/** Lines needed to fit `length` chars of bio in `availWidth`, unbounded (degradation clamps later). */
function estimateBioLines(length: number, fontSize: number, availWidth: number): number {
  if (length <= 0) return 0;
  const lineWidth = estimateLineWidth(length, fontSize, TEXT_METRICS.bioCharW);
  return Math.max(1, Math.ceil(lineWidth / Math.max(1, availWidth)));
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
    if (active.name) rows.push({ role: "name", h: typography.nameFontSize * TEXT_METRICS.nameLineH, w: Math.min(availWidth, estimateLineWidth(content.name.length ?? 0, typography.nameFontSize, TEXT_METRICS.nameCharW)) });
    if (active.handle) rows.push({ role: "handle", h: TEXT_METRICS.monoFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, estimateLineWidth(content.handle.length ?? 0, TEXT_METRICS.monoFontSize, TEXT_METRICS.monoCharW)) });
    if (active.descriptor) rows.push({ role: "descriptor", h: TEXT_METRICS.monoFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, estimateLineWidth(content.descriptor.length ?? 0, TEXT_METRICS.monoFontSize, TEXT_METRICS.monoCharW)) });
    if (active.location) rows.push({ role: "location", h: TEXT_METRICS.locationFontSize * TEXT_METRICS.monoLineH, w: Math.min(availWidth, estimateLineWidth(content.location.length ?? 0, TEXT_METRICS.locationFontSize, TEXT_METRICS.monoCharW)) });
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

  // Stack the surviving rows top-to-bottom, left-aligned within availWidth.
  const boxes: Partial<Record<ElementRole, ElementBox>> = {};
  let y = 0;
  for (const row of m.rows) {
    const h = row.h * squeeze;
    boxes[row.role] = { x: 0, y, w: row.w, h, ...(row.role === "bio" ? { lines: bioLines } : {}) };
    y += h + gap * squeeze;
  }
  const width = m.rows.length > 0 ? Math.max(...m.rows.map(r => r.w)) : 0;
  return { boxes, dropped, width, height: Math.min(m.height, availHeight) };
}

// ── Axis-aligned topologies (row, row-reverse, column, column-reverse) ───────

interface AxisResolution {
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  anchorDistance: number;
  contentWidth: number;
  contentHeight: number;
}

/**
 * Generic resolver for the 4 non-centered primitives. mainAxis is the axis
 * PFP and content are ordered along; `reverse` flips which comes first.
 * anchorDistance = how far the achievable PFP position had to move from the
 * literal anchor to keep content readable in that order — see file header.
 */
function resolveAxis(
  mainAxis: "x" | "y",
  reverse: boolean,
  input: CompositionInput,
): AxisResolution {
  const { boxW, boxH, padding, pfp, content, typography } = input;
  const boxMain = mainAxis === "x" ? boxW : boxH;
  const boxCross = mainAxis === "x" ? boxH : boxW;
  const anchorMain = mainAxis === "x" ? pfp.anchorX : pfp.anchorY;
  const anchorCross = mainAxis === "x" ? pfp.anchorY : pfp.anchorX;

  const availMain = Math.max(0, boxMain - 2 * padding);
  const availCross = Math.max(0, boxCross - 2 * padding);
  const gap = Math.max(GAP_MIN, Math.min(GAP_MAX, availMain * 0.06));

  // Content's dimension along mainAxis is negotiated (tight); along cross is generous.
  // row-like (mainAxis=x): content width negotiated, content height generous (=boxCross avail).
  // column-like (mainAxis=y): content height negotiated, content width generous (=boxCross avail).
  const negotiatedMainSpace = Math.max(0, availMain - pfp.size - gap);
  const contentAvailWidth  = mainAxis === "x" ? negotiatedMainSpace : availCross;
  const contentAvailHeight = mainAxis === "x" ? availCross : negotiatedMainSpace;

  const resolved = resolveContentBlock(content, typography, contentAvailWidth, contentAvailHeight, Math.min(gap, 10));
  const contentMain = mainAxis === "x" ? resolved.width : resolved.height;
  const contentCross = mainAxis === "x" ? resolved.height : resolved.width;

  const rawPfpMain = padding + anchorMain * Math.max(0, availMain - pfp.size);
  let actualPfpMain: number;
  let contentMainStart: number;
  if (!reverse) {
    // [PFP][gap][CONTENT]
    const maxPfpMain = boxMain - padding - pfp.size - gap - contentMain;
    actualPfpMain = Math.max(padding, Math.min(rawPfpMain, Math.max(padding, maxPfpMain)));
    contentMainStart = actualPfpMain + pfp.size + gap;
  } else {
    // [CONTENT][gap][PFP] — content hugs wherever the pfp actually lands (mirrors
    // the !reverse branch above), instead of being pinned to the padding edge.
    // Previously content stayed glued to `padding` regardless of the pfp's
    // resolved position: whenever content was narrow and the box was wide, that
    // left a large, arbitrary gap between pfp and content that the proximity
    // score term correctly penalized — which made row-reverse/column-reverse
    // score far worse than the anchor fidelity alone would justify, effectively
    // stopping the pfp from ever reaching that side. See Stage 3B-fix notes.
    const minPfpMain = padding + contentMain + gap;
    actualPfpMain = Math.min(boxMain - padding - pfp.size, Math.max(rawPfpMain, Math.min(minPfpMain, boxMain - padding - pfp.size)));
    contentMainStart = actualPfpMain - gap - contentMain;
  }
  const anchorDistanceMain = Math.abs(rawPfpMain - actualPfpMain);

  const rawPfpCross = padding + anchorCross * Math.max(0, availCross - pfp.size);
  const actualPfpCross = Math.max(padding, Math.min(rawPfpCross, Math.max(padding, boxCross - padding - pfp.size)));
  const pfpCrossCenter = actualPfpCross + pfp.size / 2;
  const contentCrossStart = Math.max(padding, Math.min(pfpCrossCenter - contentCross / 2, Math.max(padding, boxCross - padding - contentCross)));
  const anchorDistanceCross = Math.abs(rawPfpCross - actualPfpCross);

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
    anchorDistance: anchorDistanceMain + anchorDistanceCross,
    contentWidth: mainAxis === "x" ? contentMain : contentCross,
    contentHeight: mainAxis === "x" ? contentCross : contentMain,
  };
}

// ── Centered topology ──────────────────────────────────────────────────────

function resolveCentered(input: CompositionInput): AxisResolution {
  const { boxW, boxH, padding, pfp, content, typography } = input;
  const availW = Math.max(0, boxW - 2 * padding);
  const availH = Math.max(0, boxH - 2 * padding);

  const rawX = padding + pfp.anchorX * Math.max(0, availW - pfp.size);
  const rawY = padding + pfp.anchorY * Math.max(0, availH - pfp.size);
  const actualX = Math.max(padding, Math.min(rawX, Math.max(padding, boxW - padding - pfp.size)));
  const actualY = Math.max(padding, Math.min(rawY, Math.max(padding, boxH - padding - pfp.size)));
  const anchorDistance = Math.abs(rawX - actualX) + Math.abs(rawY - actualY);

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

  const resolvedBelow = resolveContentBlock(belowContent, typography, availW, belowSpace, gap);
  dropped.push(...resolvedBelow.dropped);
  const belowY = actualY + pfp.size + gap;
  for (const [role, box] of Object.entries(resolvedBelow.boxes) as [ElementRole, ElementBox][]) {
    // Centered horizontally within the box, not left-aligned.
    const centeredX = padding + Math.max(0, (availW - box.w) / 2);
    boxes[role] = { ...box, x: centeredX, y: box.y + belowY };
  }

  return {
    boxes,
    dropped,
    anchorDistance,
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
  res: { boxes: Partial<Record<ElementRole, ElementBox>>; dropped: ElementRole[]; anchorDistance: number },
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

  score -= res.anchorDistance * W.anchorDistance;

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

  // Alignment: variance along each strategy's own reference line — left edge for
  // row/column (left-aligned stacks), horizontal center for "centered" (each row
  // is deliberately centered on its own width, so left edges legitimately differ
  // there; the thing that should line up is the center line, not the edge).
  const contentRoles: ElementRole[] = ["name", "handle", "bio", "descriptor", "location", "views"];
  const alignmentCoords = contentRoles
    .map(r => boxes[r])
    .filter((b): b is ElementBox => b != null)
    .map(b => strategy === "centered" ? b.x + b.w / 2 : b.x);
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
