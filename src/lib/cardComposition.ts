/**
 * Pure, React/DOM-independent composition engine for the Presentation Card.
 * Text size comes from the caller's measurements when it has them
 * (ProfileCard measures the real fonts, see textMeasure.ts) and otherwise
 * from the char-width estimates in cardTypography.ts. Same architectural
 * family as cardGeometry.ts: constants + pure functions, no state.
 *
 * MODEL (engine rewrite, 2026-10-15). The previous engine generated 5
 * topologies on every call and kept the best-SCORED one. Scores moved with
 * the card size, so resizing flipped the topology (everything jumped), grew
 * the line spacing with the card height ("centered" used 6% of the height
 * between rows), dropped texts while GROWING, and compressed rows (text cut
 * in half) when content did not fit. Audit with the 450-configuration sweep:
 * docs/ux/menu-redesign/liquid-glass-plan.md, "Motor de la tarjeta".
 *
 * - Two shapes. "stack": photo above the texts (column) or below them
 *   (column-reverse). "side": photo beside the texts (row: photo left,
 *   row-reverse: photo right). Where the user put the photo picks the shape
 *   (dragged to a side → side, otherwise stack) and its direction. The other
 *   shape is only used when a text would not fit across the preferred one
 *   (a narrow card) — never because of the HEIGHT, so resizing the card
 *   vertically never switches the shape and nothing jumps.
 * - Group anchoring. The anchor positions the whole GROUP — photo, texts and
 *   the icons / buttons flowing under them — not the photo alone: a centered
 *   anchor centers the profile in the card instead of leaving half of it
 *   empty. It is still a pure function of the anchor (never a scoring
 *   compromise — the 3B.2-A/B lesson), and the photo drag maps the mouse 1:1
 *   through the same `travel` this engine returns.
 * - Fixed spacing: CONTENT_ROW_GAP between rows, pfpContentGap(photo size)
 *   between photo and texts, FLOW_GAP before the icons and the buttons. No
 *   gap depends on the card size.
 * - textAlign aligns every item of the group (photo, rows, icons) to the
 *   left / center / right of the group.
 * - Nothing is ever compressed: a row keeps its full height or is dropped.
 * - computeCardMinSize(): the smallest card where everything fits — the
 *   resize floor (user decision 2026-10-15: you cannot shrink the card past
 *   its content; remove content to go smaller).
 *
 * computeBlockLayout() (bottom) adds the independently draggable blocks
 * (identity / location / views / icons / music / buttons) on top, with the
 * same fixed priority cascade as before (blockConstraints.ts).
 */
import type { CardFormat } from "@/types";
import { anchorToRect, resolveBlockPosition, resolveOverlap, type Rect } from "./blockConstraints";
import { TYPOGRAPHY_METRICS as TEXT_METRICS, resolveTypographyMetrics } from "./cardTypography";

// ── Public types ─────────────────────────────────────────────────────────────

/** "centered" is kept in the union for persisted / test data only — the
 * engine no longer produces it (its flanking metadata jumped beside / under
 * the photo as the card was resized). */
export type CompositionStrategy = "row" | "row-reverse" | "column" | "column-reverse" | "centered";
export type TextAlign = "left" | "center" | "right";

export interface PfpInput {
  /** 0-1, continuous: where the GROUP sits within the card's padded area. */
  anchorX: number;
  anchorY: number;
  /** Resolved px size (diameter) of the avatar. */
  size: number;
}

export interface ContentFieldInput {
  present: boolean;
  /** Approx character length, for the width estimate. Ignored if !present. */
  length?: number;
  /** Measured natural single-line width, px (letter-spacing included), when
   * the caller can measure the real font. Absent → the char-width estimate. */
  width?: number;
}

export interface BioFieldInput extends ContentFieldInput {
  /** Measured line count when wrapped at `availWidth` (real font, real
   * words, explicit line breaks). Absent → the char-width estimate. */
  linesAt?: (availWidth: number) => number;
}

export interface CompositionContentInput {
  name: ContentFieldInput;
  handle: ContentFieldInput;
  bio: BioFieldInput;
  descriptor: ContentFieldInput;
  location: ContentFieldInput;
  views: ContentFieldInput;
}

export interface CompositionTypographyInput {
  nameFontSize: number;
  bioFontSize: number;
  // Optional per-role measurement overrides, each defaulting to
  // cardTypography.ts's TYPOGRAPHY_METRICS (the source render reads too).
  nameLetterSpacing?: number;
  nameLineHeight?: number;
  handleFontSize?: number;
  handleLetterSpacing?: number;
  descriptorFontSize?: number;
  descriptorLetterSpacing?: number;
  locationFontSize?: number;
  locationLetterSpacing?: number;
  bioLineHeight?: number;
  viewsFontSize?: number;
  monoLineHeight?: number;
}

/** A block that flows under the texts (icons row, link buttons). */
export interface FlowBlockInput {
  width: number;
  height: number;
}

export interface CompositionInput {
  /** Kept for data compatibility; the shapes no longer depend on it. */
  format: CardFormat;
  boxW: number;
  boxH: number;
  padding: number;
  pfp: PfpInput;
  content: CompositionContentInput;
  typography: CompositionTypographyInput;
  /** @deprecated ignored — the choice is deterministic (no hysteresis), so
   * the editor and the public page always agree. */
  incumbent?: CompositionStrategy;
  /** Alignment of every item of the group. Defaults to "left". */
  textAlign?: TextAlign;
  /** Blocks stacked under the texts, in this order. computeBlockLayout fills
   * it with the icons / buttons that were never dragged. */
  flow?: { links?: FlowBlockInput; buttons?: FlowBlockInput };
  /** Text rows taken OUT of the stack because the user dragged them
   * elsewhere (computeBlockLayout); the rest closes up. Their natural size is
   * returned in `detachedSizes`. */
  detached?: Array<"location" | "views">;
}

export type ElementRole = "pfp" | "name" | "handle" | "bio" | "descriptor" | "location" | "views" | "links" | "music" | "buttons";

export interface ElementBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bio only: how many lines it was given (less than natural only when the
   * card is below its minimum size). */
  lines?: number;
}

export interface CompositionResult {
  strategy: CompositionStrategy;
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  /** 1 = everything fits as is, 0 = something had to give. */
  score: number;
  /** 1 = that shape fits everything at this size, 0 = it does not; the
   * shapes not considered ("centered") are -1. */
  candidateScores: Record<CompositionStrategy, number>;
  /** px the group can travel on each axis — the photo drag's denominator
   * (anchorDrag.ts's nextAnchorAxis). <= 0: that axis is frozen. */
  travel: { x: number; y: number };
  /** Everything (texts and flow blocks) fits without dropping, clamping or
   * truncating anything. */
  fits: boolean;
  /** Natural size of each detached row (see CompositionInput.detached). */
  detachedSizes: Partial<Record<"location" | "views", { w: number; h: number }>>;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Between the rows of the text stack. Never depends on the card size. */
export const CONTENT_ROW_GAP = 10;
/** Before each flow block (texts → icons → buttons). */
export const FLOW_GAP = 14;
/** Between the photo and the texts: proportional to the photo, never to the card. */
export function pfpContentGap(pfpSize: number): number {
  return Math.round(Math.max(10, Math.min(18, pfpSize * 0.18)));
}

// Width estimates err on the wide side: a too-wide box wastes a few px, a
// too-narrow one truncates a word.
const SAFETY_MARGIN_PX = 3;

/** Photo dragged this far toward a side → the texts go beside it. */
const SIDE_THRESHOLD = 0.3;
/** Photo dragged this far down → the texts go above it. */
const REVERSE_THRESHOLD = 0.7;

// Below the minimum size only (a card saved before this engine, or the
// public page of one): least essential first, then bio lines, then — last
// resort, never the name — bio and handle.
const METADATA_DROP_ORDER = ["views", "location", "descriptor"] as const;
const LAST_RESORT_DROP_ORDER = ["bio", "handle"] as const;

type TextRole = "name" | "handle" | "descriptor" | "location" | "bio" | "views";
const STACK_ORDER: TextRole[] = ["name", "handle", "descriptor", "location", "bio", "views"];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ── Text measurement ─────────────────────────────────────────────────────────

function estimateLineWidth(length: number, fontSize: number, charW: number, letterSpacingPx = 0): number {
  if (length <= 0) return 0;
  return length * fontSize * charW + Math.max(0, length - 1) * letterSpacingPx + SAFETY_MARGIN_PX;
}

/** Lines needed to fit `length` chars of bio in `availWidth` (estimate). */
function estimateBioLines(length: number, fontSize: number, availWidth: number): number {
  if (length <= 0) return 0;
  const lineWidth = estimateLineWidth(length, fontSize, TEXT_METRICS.bioCharW);
  return Math.max(1, Math.ceil(lineWidth / Math.max(1, availWidth)));
}

/** Natural single-line width (px) of a role. */
function naturalWidth(role: TextRole, input: Pick<CompositionInput, "content" | "typography">): number {
  const field = input.content[role];
  if (field.width != null) return field.width + SAFETY_MARGIN_PX;
  const t = input.typography;
  const m = resolveTypographyMetrics(t);
  const len = field.length ?? 0;
  switch (role) {
    case "name": return estimateLineWidth(len, t.nameFontSize, m.nameCharW, m.nameLetterSpacing);
    case "handle": return estimateLineWidth(len, m.handleFontSize, m.monoCharW, m.handleLetterSpacing);
    case "descriptor": return estimateLineWidth(len, m.descriptorFontSize, m.monoCharW, m.descriptorLetterSpacing);
    case "location": return estimateLineWidth(len, m.locationFontSize, m.monoCharW, m.locationLetterSpacing);
    case "bio": return estimateLineWidth(len, t.bioFontSize, m.bioCharW);
    case "views": return m.viewsWidthPx;
  }
}

function bioLinesAt(input: Pick<CompositionInput, "content" | "typography">, availWidth: number): number {
  const bio = input.content.bio;
  if (!bio.present) return 0;
  if (bio.linesAt) return Math.max(1, bio.linesAt(Math.max(1, availWidth)));
  return estimateBioLines(bio.length ?? 0, input.typography.bioFontSize, Math.max(1, availWidth));
}

function rowHeight(role: TextRole, input: Pick<CompositionInput, "typography">, bioLines: number): number {
  const t = input.typography;
  const m = resolveTypographyMetrics(t);
  switch (role) {
    case "name": return t.nameFontSize * m.nameLineH;
    case "handle": return m.handleFontSize * m.monoLineH;
    case "descriptor": return m.descriptorFontSize * m.monoLineH;
    case "location": return m.locationFontSize * m.monoLineH;
    case "bio": return bioLines * t.bioFontSize * m.bioLineH;
    case "views": return m.viewsFontSize * m.monoLineH;
  }
}

function alignWithin(itemW: number, x0: number, groupW: number, align: TextAlign): number {
  if (align === "center") return x0 + (groupW - itemW) / 2;
  if (align === "right") return x0 + groupW - itemW;
  return x0;
}

// ── Text stack ───────────────────────────────────────────────────────────────

interface TextStack {
  /** Relative to the stack's own top-left. */
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  bioClamped: number;
  width: number;
  height: number;
  /** Every single-line row fits `availWidth` (nothing truncated). */
  widthFits: boolean;
  /** Widest natural single-line row — what the card minimum width needs. */
  maxSingleWidth: number;
  detachedSizes: CompositionResult["detachedSizes"];
}

/**
 * The texts as one vertical stack within `availWidth`. With a finite
 * `availHeight` (only below the card's minimum size) the degradation ladder
 * runs until it fits; otherwise every present row is kept as is.
 */
function resolveTextStack(input: CompositionInput, availWidth: number, availHeight: number): TextStack {
  const detached = new Set(input.detached ?? []);
  const active = new Set<TextRole>(STACK_ORDER.filter(r => input.content[r].present && !detached.has(r as "location" | "views")));
  const naturalBio = bioLinesAt(input, availWidth);
  let bioLines = naturalBio;
  const dropped: ElementRole[] = [];

  const measure = () => {
    const rows = STACK_ORDER.filter(r => active.has(r)).map(role => {
      const natural = naturalWidth(role, input);
      const w = role === "bio" && bioLines > 1 ? availWidth : Math.min(availWidth, natural);
      return { role, h: rowHeight(role, input, bioLines), w };
    });
    const height = rows.reduce((s, r) => s + r.h, 0) + Math.max(0, rows.length - 1) * CONTENT_ROW_GAP;
    return { rows, height };
  };

  let m = measure();
  if (m.height > availHeight) {
    for (const role of METADATA_DROP_ORDER) {
      if (m.height <= availHeight) break;
      if (active.delete(role)) { dropped.push(role); m = measure(); }
    }
    while (m.height > availHeight && bioLines > 1) { bioLines -= 1; m = measure(); }
    for (const role of LAST_RESORT_DROP_ORDER) {
      if (m.height <= availHeight) break;
      if (active.delete(role)) { dropped.push(role); m = measure(); }
    }
  }

  const singleRoles = STACK_ORDER.filter(r => input.content[r].present && r !== "bio");
  const maxSingleWidth = singleRoles.reduce((mx, r) => Math.max(mx, naturalWidth(r, input)), 0);
  const widthFits = [...active].every(r => r === "bio" || naturalWidth(r, input) <= availWidth + 0.5);

  const width = m.rows.length ? Math.max(...m.rows.map(r => r.w)) : 0;
  const align = input.textAlign ?? "left";
  const boxes: Partial<Record<ElementRole, ElementBox>> = {};
  let y = 0;
  for (const row of m.rows) {
    boxes[row.role] = {
      x: alignWithin(row.w, 0, width, align), y, w: row.w, h: row.h,
      ...(row.role === "bio" ? { lines: bioLines } : {}),
    };
    y += row.h + CONTENT_ROW_GAP;
  }

  const detachedSizes: TextStack["detachedSizes"] = {};
  for (const role of detached) {
    if (input.content[role].present) {
      detachedSizes[role] = { w: Math.min(availWidth, naturalWidth(role, input)), h: rowHeight(role, input, 0) };
    }
  }

  return {
    boxes, dropped, bioClamped: Math.max(0, naturalBio - bioLines), width, height: m.height,
    widthFits, maxSingleWidth, detachedSizes,
  };
}

// ── Shapes ───────────────────────────────────────────────────────────────────

interface ShapeLayout {
  strategy: CompositionStrategy;
  boxes: Partial<Record<ElementRole, ElementBox>>;
  dropped: ElementRole[];
  bioClamped: number;
  widthFits: boolean;
  heightFits: boolean;
  /** Height of the whole group (photo + texts + flow). */
  groupH: number;
  /** Width the card needs for this shape with nothing truncated. */
  minWidth: number;
  travel: { x: number; y: number };
  detachedSizes: CompositionResult["detachedSizes"];
}

const isSide = (s: CompositionStrategy) => s === "row" || s === "row-reverse";

/** [preferred, fallback] — from where the user put the photo. */
function shapePreference(anchorX: number, anchorY: number): [CompositionStrategy, CompositionStrategy] {
  const stack: CompositionStrategy = anchorY > REVERSE_THRESHOLD ? "column-reverse" : "column";
  const side: CompositionStrategy = anchorX > 0.5 ? "row-reverse" : "row";
  return anchorX < SIDE_THRESHOLD || anchorX > 1 - SIDE_THRESHOLD ? [side, stack] : [stack, side];
}

function flowItems(input: CompositionInput): Array<["links" | "buttons", FlowBlockInput]> {
  const out: Array<["links" | "buttons", FlowBlockInput]> = [];
  const f = input.flow;
  if (f?.links && f.links.width > 0 && f.links.height > 0) out.push(["links", f.links]);
  if (f?.buttons && f.buttons.width > 0 && f.buttons.height > 0) out.push(["buttons", f.buttons]);
  return out;
}

/** One shape, laid out. `degrade` = run the ladder against the card height
 * (only when no shape fits as is). */
function layoutShape(strategy: CompositionStrategy, input: CompositionInput, degrade: boolean): ShapeLayout {
  const { boxW, boxH, padding: pad, pfp } = input;
  const align = input.textAlign ?? "left";
  const availW = Math.max(0, boxW - 2 * pad);
  const availH = Math.max(0, boxH - 2 * pad);
  const gap = pfpContentGap(pfp.size);
  const side = isSide(strategy);
  const flow = flowItems(input);
  const flowH = flow.reduce((s, [, b]) => s + FLOW_GAP + b.height, 0);

  // Texts outrank the flow blocks: when degrading, the texts get the room
  // next to / under the photo and the icons / buttons only what is left.
  const textW = side ? Math.max(0, availW - pfp.size - gap) : availW;
  const textBudget = !degrade ? Infinity : side ? availH : Math.max(0, availH - pfp.size - gap);
  const text = resolveTextStack(input, textW, textBudget);
  const hasText = text.height > 0;

  const headW = side ? pfp.size + (hasText ? gap + text.width : 0) : Math.max(pfp.size, text.width);
  const headH = side ? Math.max(pfp.size, text.height) : pfp.size + (hasText ? gap + text.height : 0);
  const groupH = headH + flowH;
  const travel = { x: availW - headW, y: availH - groupH };
  const x0 = pad + clamp01(pfp.anchorX) * Math.max(0, travel.x);
  const y0 = pad + clamp01(pfp.anchorY) * Math.max(0, travel.y);

  const boxes: Partial<Record<ElementRole, ElementBox>> = {};
  let textX: number, textY: number;
  if (side) {
    const pfpX = strategy === "row" ? x0 : x0 + headW - pfp.size;
    boxes.pfp = { x: pfpX, y: y0 + (headH - pfp.size) / 2, w: pfp.size, h: pfp.size };
    textX = strategy === "row" ? x0 + pfp.size + gap : x0;
    textY = y0 + (headH - text.height) / 2;
  } else {
    const pfpY = strategy === "column" ? y0 : y0 + (hasText ? text.height + gap : 0);
    boxes.pfp = { x: alignWithin(pfp.size, x0, headW, align), y: pfpY, w: pfp.size, h: pfp.size };
    textX = alignWithin(text.width, x0, headW, align);
    textY = strategy === "column" ? y0 + pfp.size + gap : y0;
  }
  for (const [role, b] of Object.entries(text.boxes) as [ElementRole, ElementBox][]) {
    boxes[role] = { ...b, x: b.x + textX, y: b.y + textY };
  }

  let fy = y0 + headH;
  for (const [key, b] of flow) {
    fy += FLOW_GAP;
    const x = Math.max(pad, Math.min(boxW - pad - b.width, alignWithin(b.width, x0, headW, align)));
    boxes[key] = { x, y: fy, w: b.width, h: b.height };
    fy += b.height;
  }

  const minTextW = text.maxSingleWidth;
  const minWidth = side
    ? 2 * pad + pfp.size + (minTextW > 0 ? gap + minTextW : 0)
    : 2 * pad + Math.max(pfp.size, minTextW);

  return {
    strategy, boxes, dropped: text.dropped, bioClamped: text.bioClamped,
    widthFits: text.widthFits && pfp.size <= availW + 0.5 && (!side || !hasText || textW > 0),
    heightFits: groupH <= availH + 0.5,
    groupH, minWidth, travel, detachedSizes: text.detachedSizes,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** The shape used at this width: the preferred one (from where the photo
 * is) unless a text would not fit across it; then the other one if that
 * avoids it. Never chosen by HEIGHT — so resizing the card vertically never
 * switches the shape (the content would jump). */
function chooseShape(input: CompositionInput): ShapeLayout {
  const [pref, other] = shapePreference(input.pfp.anchorX, input.pfp.anchorY).map(s => layoutShape(s, input, false));
  return pref.widthFits || !other.widthFits ? pref : other;
}

export function computeComposition(input: CompositionInput): CompositionResult {
  const natural = chooseShape(input);
  // Below the minimum height only (computeCardMinSize — a card saved before
  // this engine, or its public page): degrade instead of overflowing.
  const chosen = natural.heightFits ? natural : layoutShape(natural.strategy, input, true);
  const fits = chosen.heightFits && chosen.widthFits && chosen.dropped.length === 0 && chosen.bioClamped === 0;
  const candidateScores: Record<CompositionStrategy, number> = { row: -1, "row-reverse": -1, column: -1, "column-reverse": -1, centered: -1 };
  candidateScores[chosen.strategy] = fits ? 1 : 0;
  return {
    strategy: chosen.strategy, boxes: chosen.boxes, dropped: chosen.dropped,
    score: fits ? 1 : 0, candidateScores, travel: chosen.travel, fits,
    detachedSizes: chosen.detachedSizes,
  };
}

/**
 * The smallest card (px) where everything fits — texts, icons, buttons and
 * detached rows, nothing dropped, clamped or truncated. Same arguments as
 * computeBlockLayout (`boxH` is ignored; the height is for `boxW`, since the
 * texts wrap with the width). The caller also applies the product floor
 * (cardGeometry.ts's MIN_PROFILE_CARD_*).
 *
 * Height: what the shape used at this width needs. Width: the narrower of
 * the two shapes' needs (below the preferred one's, the other one is used).
 */
export function computeCardMinSize(input: CompositionInput, overrides?: BlockOverrides, links?: LinksBlockInput, buttons?: ButtonsBlockInput): { w: number; h: number } {
  const full = withFlow(input, overrides, links, buttons);
  const shapes = shapePreference(full.pfp.anchorX, full.pfp.anchorY).map(s => layoutShape(s, full, false));
  const chosen = shapes[0].widthFits || !shapes[1].widthFits ? shapes[0] : shapes[1];
  let h = 2 * full.padding + chosen.groupH;
  let w = Math.min(...shapes.map(l => l.minWidth));
  const pinned: Array<{ width: number; height: number } | undefined> = [
    ...Object.values(chosen.detachedSizes).map(d => d && { width: d.w, height: d.h }),
    links && !full.flow?.links ? links.size : undefined,
    buttons && !full.flow?.buttons ? buttons.size : undefined,
  ];
  for (const size of pinned) {
    if (!size) continue;
    w = Math.max(w, size.width + 2 * full.padding);
    h = Math.max(h, size.height + 2 * full.padding);
  }
  return { w: Math.ceil(w), h: Math.ceil(h) };
}

// ── Constrained freeform block layout (Stage 3B.3) ────────────────────────────

/** One optional normalized anchor override per independently-positionable
 * block. Absent = "use the automatic placement for this block". */
export interface BlockOverrides {
  identity?: { x: number; y: number };
  location?: { x: number; y: number };
  views?: { x: number; y: number };
  /** The icons row (Contact Links). */
  links?: { x: number; y: number };
  /** Legacy in-card Music block — no caller since Music became a canvas element. */
  music?: { x: number; y: number };
  /** The link buttons (Linktree-style). */
  buttons?: { x: number; y: number };
}

/** Natural size (px) of the icons row (Contact Links). Without a drag
 * override and without `defaultAnchor` it flows under the texts. */
export interface LinksBlockInput {
  size: { width: number; height: number };
  /** Pins the block to a normalized anchor instead of the flow. */
  defaultAnchor?: { x: number; y: number };
}

/** Legacy in-card Music block — always anchored (default bottom-center). */
export interface MusicBlockInput {
  size: { width: number; height: number };
  defaultAnchor?: { x: number; y: number };
}

/** Natural size (px) of the link buttons (linkButtons.ts). Without a drag
 * override and without `defaultAnchor` they flow under the icons. */
export interface ButtonsBlockInput {
  size: { width: number; height: number };
  defaultAnchor?: { x: number; y: number };
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
 * -> re-validate the automatic rect against obstacles. */
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

export interface BlockLayoutResult extends CompositionResult {
  /** Bounding box of the identity group (name+handle+descriptor+bio) in its
   * FINAL position — the group's drag hit-area. Undefined when none of them
   * is present. */
  identityRect?: ElementBox;
}

/**
 * computeComposition() plus the independently draggable blocks, in a fixed
 * priority order: pfp → identity → location → views → icons → music →
 * buttons. A dragged block only ever displaces a LOWER-priority one.
 *
 * Blocks that were never dragged stay in the automatic layout: location and
 * views inside the text stack, the icons and the buttons flowing under the
 * texts (so the whole profile reads top to bottom and is anchored as one
 * group). A dragged location / views leaves the stack (the rest closes up);
 * dragged icons / buttons leave the flow.
 */
/** The input with the never-dragged icons / buttons in the flow and the
 * dragged location / views out of the text stack. */
function withFlow(input: CompositionInput, overrides?: BlockOverrides, links?: LinksBlockInput, buttons?: ButtonsBlockInput): CompositionInput {
  const linksFlow = links && !overrides?.links && !links.defaultAnchor ? links.size : undefined;
  const buttonsFlow = buttons && !overrides?.buttons && !buttons.defaultAnchor ? buttons.size : undefined;
  const detached = (["location", "views"] as const).filter(r => overrides?.[r] && input.content[r].present);
  return { ...input, flow: { links: linksFlow, buttons: buttonsFlow }, detached };
}

export function computeBlockLayout(input: CompositionInput, overrides?: BlockOverrides, links?: LinksBlockInput, music?: MusicBlockInput, buttons?: ButtonsBlockInput): BlockLayoutResult {
  const { boxW, boxH, padding } = input;
  const base = computeComposition(withFlow(input, overrides, links, buttons));
  const identityBase = unionBox(
    IDENTITY_ROLES.map(role => base.boxes[role]).filter((b): b is ElementBox => b != null),
  );
  const boxes = { ...base.boxes };
  delete boxes.links; delete boxes.buttons;
  const flowRects = { links: base.boxes.links, buttons: base.boxes.buttons };
  let identityRect = identityBase;
  const textMoved = !!(overrides?.identity || overrides?.location || overrides?.views);

  if (textMoved) {
    const obstacles: Rect[] = boxes.pfp ? [boxes.pfp] : [];

    // Identity group (name/handle/descriptor/bio) — moved as one block.
    if (identityBase && identityBase.w > 0 && identityBase.h > 0) {
      const resolved = resolveBlock(identityBase, overrides?.identity, obstacles, boxW, boxH, padding);
      const dx = resolved.x - identityBase.x, dy = resolved.y - identityBase.y;
      if (dx !== 0 || dy !== 0) {
        for (const role of IDENTITY_ROLES) {
          const b = boxes[role];
          if (b) boxes[role] = { ...b, x: b.x + dx, y: b.y + dy };
        }
      }
      identityRect = { ...identityBase, x: resolved.x, y: resolved.y };
      obstacles.push(resolved);
    }

    // Location / views — independent blocks.
    for (const role of ["location", "views"] as const) {
      const size = base.detachedSizes[role];
      const override = overrides?.[role];
      if (override && size) {
        const r = resolveBlockPosition(override.x, override.y, size.w, size.h, obstacles, boxW, boxH, padding, BLOCK_MIN_GAP);
        boxes[role] = { x: r.x, y: r.y, w: size.w, h: size.h };
        obstacles.push(r);
      } else if (boxes[role]) {
        const r = resolveBlock(boxes[role]!, undefined, obstacles, boxW, boxH, padding);
        boxes[role] = { ...boxes[role]!, x: r.x, y: r.y };
        obstacles.push(r);
      }
    }
  }

  const higher = (): Rect[] => [boxes.pfp, identityRect, boxes.location, boxes.views].filter((b): b is ElementBox => !!b);
  // A flow block is already clear of everything above it; it only needs
  // re-validating when a text block was dragged onto its spot.
  const place = (key: "links" | "music" | "buttons", size: { width: number; height: number }, defaultAnchor: { x: number; y: number } | undefined, obstacles: Rect[]) => {
    const flowRect = key !== "music" ? flowRects[key] : undefined;
    const override = overrides?.[key];
    if (flowRect && !override && !textMoved) { boxes[key] = flowRect; return; }
    const a = defaultAnchor ?? { x: 0.5, y: 1 };
    const baseRect = flowRect ?? anchorToRect(a.x, a.y, size.width, size.height, boxW, boxH, padding);
    const r = resolveBlock(baseRect, override, obstacles, boxW, boxH, padding);
    boxes[key] = { x: r.x, y: r.y, w: size.width, h: size.height };
  };

  if (links) place("links", links.size, links.defaultAnchor, higher());
  if (music) place("music", music.size, music.defaultAnchor, [...higher(), ...(boxes.links ? [boxes.links] : [])]);
  if (buttons) place("buttons", buttons.size, buttons.defaultAnchor, [...higher(), ...(boxes.links ? [boxes.links] : []), ...(boxes.music ? [boxes.music] : [])]);

  return { ...base, boxes, identityRect };
}
