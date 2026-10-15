/**
 * The ProfileCard's layout, built from the card data in ONE place (free
 * layout engine, 2026-10-15): block sizes (from the real text when a
 * TextMeasurer is given), desired positions, the collision solver
 * (cardSolver.ts) and the card's minimum size. ProfileCard renders with it;
 * the resize handles, Ctrl/⌘+arrows and Medidas clamp with the same
 * minimum, so the floor the user hits is exactly where the blocks are
 * packed together without overlapping.
 *
 * Desired positions:
 * - `blockLayout: 2` cards (any block was ever dragged under this engine):
 *   every block's saved anchor (anchorToRect, normalized to the card) and,
 *   for a block the engine made narrower, its saved width. A block added
 *   later (no anchor yet) goes under the rest.
 * - Older cards: a starting arrangement (photo, texts, location, views,
 *   icons, buttons stacked, centered). A card positioned with the previous
 *   engine (any block anchor, or a photo moved off center) keeps those
 *   positions, the rest stacked under the photo.
 * The first drop saves every block's position (`blockLayout: 2`), so from
 * then on nothing moves unless something collides.
 */
import type { ProfileCardData, ProfileCardVariant } from "@/types";
import {
  solveLayout, solveMinHeight, priorityFor, BLOCK_GAP,
  type BlockKey, type BlockSpec, type Desired, type Rect, type SolveInput,
} from "./cardSolver";
import { anchorToRect, rectToAnchor } from "./blockConstraints";
import { getCardPadding, getFreeformCardBounds, PFP_PHOTO_SIZES, resolvePfpSize } from "./cardGeometry";
import { CONTACT_LINK_ICON_SIZE, CONTACT_LINK_GAP } from "./contactLinksBlock";
import { linkButtonHeight, resolveLinkButtonStyle } from "./linkButtons";
import { resolveCardTypography, resolveTypographyMetrics, TYPOGRAPHY_METRICS } from "./cardTypography";
import { getFontStyle } from "./fontList";

export type { BlockKey, Rect };

/** The CSS font of one text role, as the card renders it. */
export interface MeasureFont {
  family: string;
  size: number;
  weight: number;
  letterSpacing: number;
  uppercase?: boolean;
}

/** Real text measurement (textMeasure.ts). */
export interface TextMeasurer {
  /** Natural single-line width, px, letter-spacing included. */
  width(text: string, font: MeasureFont): number;
}

const SANS = "'DM Sans', sans-serif";
const MONO = "'Space Mono', monospace";
/** Between rows inside the text group. */
export const ROW_GAP = 10;
/** Starting arrangement: before the icons and the buttons. */
const FLOW_GAP = 14;
/** Width estimates err on the wide side (a narrow box wraps a word early). */
const SAFETY = 3;
/** Buttons never get narrower than this (or their natural width if smaller). */
export const BUTTONS_MIN_W = 112;

export type TextRole = "name" | "handle" | "descriptor" | "bio" | "location" | "views";
export const IDENTITY_ROWS = ["name", "handle", "descriptor", "bio"] as const;

/** "12.3K" — the views counter, as rendered. */
export function formatViewCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function profileVariant(card: ProfileCardData): ProfileCardVariant {
  return (card.variant as ProfileCardVariant) ?? "classic";
}

export function profileNameFontSize(card: ProfileCardData): number {
  const v = profileVariant(card);
  return card.nameFontSize ?? (v === "guns" || v === "poster" ? 17 : 15);
}

/** The photo size before the card's own clamp, with the variant nudge. */
export function profilePfpBase(card: ProfileCardData): number {
  const v = profileVariant(card);
  const base = card.pfpSizePx ?? PFP_PHOTO_SIZES[card.photoSize ?? "md"];
  return v === "guns" || v === "poster" ? Math.max(base, 88) : v === "minimal" ? Math.min(base, 56) : base;
}

export function profileAvatarSize(card: ProfileCardData, w: number, h: number): number {
  return resolvePfpSize(card.photoSize ?? "md", profilePfpBase(card), w, h, getCardPadding(profileVariant(card)));
}

// ── Text ─────────────────────────────────────────────────────────────────────

/** One text row: how wide it wants to be, its narrowest (widest word), and
 * how many lines it takes at a width. Rows wrap (more lines) instead of
 * being cut. */
export interface TextRowSpec {
  text: string;
  lineH: number;
  natW: number;
  minW: number;
  linesAt(w: number): number;
}

/** The visible characters of a string: an emoji with modifiers, a flag or a
 * family (ZWJ) is ONE piece, exactly where the browser can break a word. */
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : undefined;
export function graphemes(s: string): string[] {
  return segmenter ? Array.from(segmenter.segment(s), g => g.segment) : Array.from(s);
}

/**
 * A text row. It wraps like the card renders it (`overflow-wrap: anywhere`):
 * a word that does not fit goes to the next line, and a word longer than a
 * whole line (no spaces: a handle, a pasted link, emotes one after the
 * other) breaks between its characters. So the narrowest a row can be is
 * its widest character, never its longest word (bug 2026-10-15: a long
 * word made the block wider than the card and locked the card's width).
 */
function makeRow(text: string, lineH: number, widthOf: (s: string) => number, explicitBreaks: boolean): TextRowSpec {
  const paragraphs = explicitBreaks ? text.split("\n") : [text.replace(/\n/g, " ")];
  const words = paragraphs.map(p => p.split(" ").map(w => ({ w: widthOf(w), text: w })));
  const natW = Math.max(...paragraphs.map(p => widthOf(p))) + SAFETY;
  const pieces = new Map<string, number[]>();
  const piecesOf = (word: string) => {
    let hit = pieces.get(word);
    if (!hit) { hit = graphemes(word).map(g => widthOf(g)); pieces.set(word, hit); }
    return hit;
  };
  const widestChar = Math.max(0, ...words.flat().flatMap(w => piecesOf(w.text)));
  const minW = widestChar + SAFETY;
  const space = widthOf(" ");
  const cache = new Map<number, number>();
  return {
    text, lineH, natW, minW,
    linesAt(w: number) {
      const key = Math.round(w);
      const hit = cache.get(key);
      if (hit != null) return hit;
      const avail = Math.max(widestChar, w - SAFETY);
      let lines = 0;
      for (const p of words) {
        let lineW = 0, count = 1, empty = true;
        for (const word of p) {
          const need = empty ? word.w : lineW + space + word.w;
          if (need <= avail) { lineW = need; empty = false; continue; }
          if (!empty) { count++; lineW = 0; empty = true; }
          if (word.w <= avail) { lineW = word.w; empty = false; continue; }
          // Longer than a whole line: break between characters.
          for (const g of piecesOf(word.text)) {
            if (!empty && lineW + g > avail) { count++; lineW = 0; }
            lineW += g; empty = false;
          }
        }
        lines += count;
      }
      const n = Math.max(1, lines);
      cache.set(key, n);
      return n;
    },
  };
}

export interface ProfileTextRows {
  rows: Partial<Record<TextRole, TextRowSpec>>;
  fonts: Record<TextRole, MeasureFont>;
}

/** Every present text role as a row spec (real widths with `measure`). */
export function profileTextRows(card: ProfileCardData, o: { measure?: TextMeasurer; viewCount?: number } = {}): ProfileTextRows {
  const nameFontSize = profileNameFontSize(card);
  const typo = resolveCardTypography(card, nameFontSize);
  const metrics = resolveTypographyMetrics({
    nameFontSize, bioFontSize: card.bioFontSize ?? 8, nameLineHeight: card.nameLineHeight,
    bioLineHeight: card.bioLineHeight, monoLineHeight: card.monoLineHeight,
  });
  const font = (family: string, t: { fontSize: number; letterSpacing?: number; fontWeight?: number }, uppercase?: boolean): MeasureFont =>
    ({ family, size: t.fontSize, weight: t.fontWeight ?? 400, letterSpacing: t.letterSpacing ?? 0, uppercase });
  const fonts: Record<TextRole, MeasureFont> = {
    name: font(getFontStyle(card.nameFont ?? card.font ?? "DM Sans", SANS), typo.name),
    handle: font(getFontStyle(card.handleFont, MONO), typo.handle),
    descriptor: font(getFontStyle(card.statusFont, MONO), typo.descriptor),
    location: font(getFontStyle(card.locationFont, MONO), typo.location),
    bio: font(getFontStyle(card.bioFont, MONO), typo.bio),
    views: font(getFontStyle(card.viewsFont, MONO), typo.views, true),
  };
  const charW: Record<TextRole, number> = {
    name: TYPOGRAPHY_METRICS.nameCharW, bio: TYPOGRAPHY_METRICS.bioCharW,
    handle: TYPOGRAPHY_METRICS.monoCharW, descriptor: TYPOGRAPHY_METRICS.monoCharW,
    location: TYPOGRAPHY_METRICS.monoCharW, views: TYPOGRAPHY_METRICS.monoCharW,
  };
  const widthOf = (role: TextRole) => (s: string) => {
    const f = fonts[role];
    if (o.measure) return o.measure.width(s, f);
    return s.length * f.size * charW[role] + s.length * f.letterSpacing;
  };
  const lineH: Record<TextRole, number> = {
    name: nameFontSize * metrics.nameLineH,
    handle: typo.handle.fontSize * metrics.monoLineH,
    descriptor: typo.descriptor.fontSize * metrics.monoLineH,
    location: typo.location.fontSize * metrics.monoLineH,
    bio: typo.bio.fontSize * metrics.bioLineH,
    views: typo.views.fontSize * metrics.monoLineH,
  };
  const texts: Record<TextRole, string | undefined> = {
    name: card.name || undefined,
    handle: card.handle ? `@${card.handle}` : undefined,
    descriptor: card.status || undefined,
    location: card.location ? `● ${card.location}` : undefined,
    bio: card.bio || undefined,
    views: card.showViews ? `${formatViewCount(o.viewCount ?? 0)} views` : undefined,
  };
  const rows: ProfileTextRows["rows"] = {};
  for (const role of Object.keys(texts) as TextRole[]) {
    const t = texts[role];
    if (t) rows[role] = makeRow(t, lineH[role], widthOf(role), role === "bio");
  }
  return { rows, fonts };
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export type TextAlign = "left" | "center" | "right";

/** Rows of a text block laid out at width `w` (relative to the block). */
export interface RowBox { x: number; y: number; w: number; h: number; lines: number }

export function layoutRows(rows: TextRowSpec[], w: number, align: TextAlign): { boxes: RowBox[]; height: number } {
  const boxes: RowBox[] = [];
  let y = 0;
  for (const r of rows) {
    const lines = r.natW <= w + 0.5 ? 1 : r.linesAt(w);
    const rw = lines > 1 ? w : Math.min(r.natW, w);
    const x = align === "center" ? (w - rw) / 2 : align === "right" ? w - rw : 0;
    boxes.push({ x, y, w: rw, h: lines * r.lineH, lines });
    y += lines * r.lineH + ROW_GAP;
  }
  return { boxes, height: Math.max(0, y - ROW_GAP) };
}

function textBlock(rows: TextRowSpec[], align: TextAlign): BlockSpec | undefined {
  if (!rows.length) return undefined;
  return {
    natW: Math.max(...rows.map(r => r.natW)),
    minW: Math.max(...rows.map(r => r.minW)),
    heightAt: w => layoutRows(rows, w, align).height,
  };
}

export interface ProfileBlocks {
  specs: Partial<Record<BlockKey, BlockSpec>>;
  text: ProfileTextRows;
  identityRows: TextRowSpec[];
  identityRoles: TextRole[];
  pad: number;
  avatarSize: number;
  align: TextAlign;
}

export interface ProfileLayoutOptions {
  /** Card size (defaults: card.w / card.h). */
  w?: number;
  h?: number;
  measure?: TextMeasurer;
  viewCount?: number;
}

/** Every present block's size model at card width `w`. */
export function profileBlocks(card: ProfileCardData, o: ProfileLayoutOptions = {}): ProfileBlocks {
  const w = o.w ?? card.w;
  const h = o.h ?? card.h;
  const pad = getCardPadding(profileVariant(card));
  const availW = Math.max(0, w - 2 * pad);
  const avatarSize = profileAvatarSize(card, w, h);
  const align = (card.textAlign ?? "left") as TextAlign;
  const text = profileTextRows(card, o);
  const identityRoles = IDENTITY_ROWS.filter(r => text.rows[r]) as TextRole[];
  const identityRows = identityRoles.map(r => text.rows[r]!);
  const specs: ProfileBlocks["specs"] = {
    pfp: { natW: avatarSize, minW: avatarSize, heightAt: () => avatarSize },
  };
  const identity = textBlock(identityRows, align);
  if (identity) specs.identity = identity;
  if (text.rows.location) specs.location = textBlock([text.rows.location], align);
  if (text.rows.views) specs.views = textBlock([text.rows.views], align);

  const linkCount = (card.contactLinks ?? []).length;
  if (linkCount > 0) {
    const icon = card.linksIconSize ?? CONTACT_LINK_ICON_SIZE;
    const gap = CONTACT_LINK_GAP;
    specs.links = {
      natW: linkCount * icon + (linkCount - 1) * gap,
      minW: icon,
      heightAt: bw => {
        const perRow = Math.max(1, Math.floor((bw + gap) / (icon + gap)));
        const rows = Math.ceil(linkCount / perRow);
        return rows * icon + (rows - 1) * gap;
      },
    };
  }

  const buttons = (card.linkButtons ?? []).filter(b => b.url);
  if (buttons.length > 0) {
    const style = resolveLinkButtonStyle(card.linkButtonStyle, "#ffffff");
    const bh = linkButtonHeight(style.fontSize);
    const labelW = (label: string) => (o.measure
      ? o.measure.width(label, { family: getFontStyle(style.font, SANS), size: style.fontSize, weight: style.fontWeight, letterSpacing: -0.01 * style.fontSize })
      : label.length * style.fontSize * 0.56);
    const fitW = Math.max(...buttons.map(b => labelW(b.label || b.url))) + 2 * Math.round(style.fontSize * 1.2)
      + (style.showIcon ? Math.round(style.fontSize * 1.15) + Math.round(style.fontSize * 0.55) : 0) + SAFETY;
    const natW = style.width === "full" ? Math.max(availW, Math.min(fitW, availW)) : fitW;
    specs.buttons = {
      natW,
      minW: Math.min(natW, BUTTONS_MIN_W),
      heightAt: () => buttons.length * bh + (buttons.length - 1) * style.gap,
    };
  }
  return { specs, text, identityRows, identityRoles, pad, avatarSize, align };
}

// ── Desired positions ────────────────────────────────────────────────────────

type AnchorKeys = { x: keyof ProfileCardData; y: keyof ProfileCardData };
export const ANCHOR_FIELDS: Record<BlockKey, AnchorKeys> = {
  pfp: { x: "pfpAnchorX", y: "pfpAnchorY" },
  identity: { x: "identityAnchorX", y: "identityAnchorY" },
  location: { x: "locationAnchorX", y: "locationAnchorY" },
  views: { x: "viewsAnchorX", y: "viewsAnchorY" },
  links: { x: "linksAnchorX", y: "linksAnchorY" },
  buttons: { x: "buttonsAnchorX", y: "buttonsAnchorY" },
};
const STACK: BlockKey[] = ["pfp", "identity", "location", "views", "links", "buttons"];

function anchorOf(card: ProfileCardData, key: BlockKey): { x: number; y: number } | undefined {
  const f = ANCHOR_FIELDS[key];
  const x = card[f.x] as number | undefined, y = card[f.y] as number | undefined;
  return x != null && y != null ? { x, y } : undefined;
}

/** Positioned by the previous engine (a block anchor, or the photo moved). */
function legacyPositioned(card: ProfileCardData): boolean {
  if (STACK.some(k => k !== "pfp" && anchorOf(card, k))) return true;
  const p = anchorOf(card, "pfp");
  return !!p && (Math.abs(p.x - 0.5) > 0.001 || Math.abs(p.y - 0.5) > 0.001);
}

function gapBefore(key: BlockKey, prev: BlockKey | undefined, b: ProfileBlocks): number {
  if (!prev) return 0;
  if (key === "links" || key === "buttons") return FLOW_GAP;
  if (prev === "pfp") return Math.round(Math.max(10, Math.min(18, b.avatarSize * 0.18)));
  return ROW_GAP;
}

function alignX(w: number, x0: number, span: number, align: TextAlign): number {
  return align === "center" ? x0 + (span - w) / 2 : align === "right" ? x0 + span - w : x0;
}

/** Desired rects (px) for a card of size W×H. */
export function desiredRects(card: ProfileCardData, b: ProfileBlocks, W: number, H: number): Partial<Record<BlockKey, Desired>> {
  const { specs, pad, align } = b;
  const availW = Math.max(0, W - 2 * pad), availH = Math.max(0, H - 2 * pad);
  const width = (k: BlockKey) => {
    const s = specs[k]!;
    const saved = card.blockWidths?.[k as keyof NonNullable<ProfileCardData["blockWidths"]>];
    return Math.max(s.minW, Math.min(saved ?? s.natW, s.natW, availW));
  };
  const present = STACK.filter(k => specs[k]);
  const out: Partial<Record<BlockKey, Desired>> = {};
  const fromAnchor = (k: BlockKey) => {
    const a = anchorOf(card, k);
    if (!a) return false;
    const w = width(k);
    const r = anchorToRect(a.x, a.y, w, specs[k]!.heightAt(w), W, H, pad);
    out[k] = { x: r.x, y: r.y, w };
    return true;
  };

  const saved = card.blockLayout === 2;
  if (!saved && !legacyPositioned(card)) {
    // Starting arrangement: everything stacked and centered.
    let total = 0, prev: BlockKey | undefined;
    for (const k of present) { const w = width(k); total += gapBefore(k, prev, b) + specs[k]!.heightAt(w); prev = k; }
    let y = pad + Math.max(0, (availH - total) / 2);
    prev = undefined;
    for (const k of present) {
      const w = width(k);
      y += gapBefore(k, prev, b);
      out[k] = { x: alignX(w, pad, availW, align), y, w };
      y += specs[k]!.heightAt(w);
      prev = k;
    }
    return out;
  }

  // Saved (or previous-engine) positions; a block without one goes under
  // the rest (under the photo for a previous-engine card).
  for (const k of present) fromAnchor(k);
  if (!out.pfp) {
    const w = width("pfp");
    out.pfp = { x: alignX(w, pad, availW, align), y: pad, w };
  }
  let y = saved
    ? Math.max(...present.filter(k => out[k]).map(k => out[k]!.y + specs[k]!.heightAt(out[k]!.w)))
    : out.pfp.y + specs.pfp!.heightAt(out.pfp.w);
  let prev: BlockKey | undefined = saved ? undefined : "pfp";
  for (const k of present) {
    if (out[k]) continue;
    const w = width(k);
    y += saved ? FLOW_GAP : gapBefore(k, prev, b);
    const x = saved ? alignX(w, pad, availW, align) : alignX(w, out.pfp.x, out.pfp.w, align);
    out[k] = { x: Math.max(pad, Math.min(x, W - pad - w)), y, w };
    y += specs[k]!.heightAt(w);
    prev = k;
  }
  return out;
}

// ── Layout ───────────────────────────────────────────────────────────────────

/** A live drag: the dragged block's target rect, over the positions every
 * block had when the drag started. */
export interface DragState {
  key: BlockKey;
  /** Target top-left of the dragged block (px). */
  x: number;
  y: number;
  /** Every block's rect when the drag started. */
  base: Partial<Record<BlockKey, Rect>>;
}

export interface ProfileLayout {
  rects: Partial<Record<BlockKey, Rect>>;
  fits: boolean;
  /** Card height these rects need (> the card's when a drag pushed a block
   * below it: the card grows downward while dragging). */
  neededH: number;
  /** Rows of each text block, relative to its rect. */
  rows: Partial<Record<TextRole, RowBox>>;
  blocks: ProfileBlocks;
}

function solveInput(card: ProfileCardData, b: ProfileBlocks, W: number, H: number, drag?: DragState, prev?: Partial<Record<BlockKey, Rect>>, growTo?: number): SolveInput {
  let desired: Partial<Record<BlockKey, Desired>>;
  if (drag) {
    desired = {};
    for (const [k, r] of Object.entries(drag.base) as [BlockKey, Rect][]) desired[k] = { x: r.x, y: r.y, w: r.w };
    const fresh = desiredRects(card, b, W, H);
    for (const k of Object.keys(b.specs) as BlockKey[]) if (!desired[k]) desired[k] = fresh[k];
    // The dragged block asks for its natural width again: moved to where
    // there is room, a block the engine had made narrower widens back.
    desired[drag.key] = { x: drag.x, y: drag.y, w: b.specs[drag.key]!.natW };
  } else {
    desired = desiredRects(card, b, W, H);
  }
  const from = drag ? drag.base[drag.key] : undefined;
  return {
    boxW: W, boxH: H, pad: b.pad, specs: b.specs, desired, order: priorityFor(drag?.key), dragged: drag?.key, prev, growTo,
    push: drag && from ? { dx: drag.x - from.x, dy: drag.y - from.y } : undefined,
    compact: !drag,
  };
}

export function profileLayout(card: ProfileCardData, o: ProfileLayoutOptions & { drag?: DragState; prev?: Partial<Record<BlockKey, Rect>> } = {}): ProfileLayout {
  const W = o.w ?? card.w, H = o.h ?? card.h;
  const b = profileBlocks(card, { ...o, w: W, h: H });
  // Growing is allowed while dragging (the card follows the push downward);
  // at rest the card is already at least its minimum, so nothing grows.
  const solved = solveLayout(solveInput(card, b, W, H, o.drag, o.prev, o.drag ? getFreeformCardBounds().maxH : undefined));
  const rows: ProfileLayout["rows"] = {};
  const place = (key: BlockKey, roles: TextRole[]) => {
    const r = solved.rects[key];
    if (!r || !roles.length) return;
    const { boxes } = layoutRows(roles.map(role => b.text.rows[role]!), r.w, b.align);
    roles.forEach((role, i) => { rows[role] = boxes[i]; });
  };
  place("identity", b.identityRoles);
  if (b.text.rows.location) place("location", ["location"]);
  if (b.text.rows.views) place("views", ["views"]);
  return { rects: solved.rects, fits: solved.fits, neededH: solved.neededH, rows, blocks: b };
}

// ── Minimum size ─────────────────────────────────────────────────────────────

/**
 * The smallest card height at width `w` where every block fits without
 * overlapping (user decision 2026-10-15: shrinking stops when the blocks
 * are packed together — nothing is ever hidden). With `drag`, for the
 * positions of a live drag. `w` in the result: the narrowest width where
 * that is possible at all.
 */
export function profileCardMinSize(
  card: ProfileCardData, w: number,
  o: Pick<ProfileLayoutOptions, "measure" | "viewCount"> & { drag?: DragState } = {},
): { w: number; h: number } {
  const bounds = getFreeformCardBounds();
  // The floor keeps the user's composition: packed in its own order, never
  // re-arranged (that is only a fallback for a card at its maximum size).
  const minHAt = (W: number) => solveMinHeight(H => {
    const b = profileBlocks(card, { ...o, w: W, h: H });
    return { ...solveInput(card, b, W, H, o.drag), keepComposition: !o.drag };
  }, bounds.minH, bounds.maxH);
  // Width floor: no block narrower than it can be, and some height fits.
  const b = profileBlocks(card, { ...o, w: bounds.maxW, h: bounds.maxH });
  const widest = Math.max(...Object.values(b.specs).map(s => s!.minW));
  let minW = Math.max(bounds.minW, Math.ceil(widest + 2 * b.pad));
  while (minW < bounds.maxW && !fitsAt(card, minW, bounds.maxH, o)) minW += 8;
  minW = Math.min(minW, bounds.maxW);
  return { w: minW, h: minHAt(Math.max(w, minW)) };
}

function fitsAt(card: ProfileCardData, W: number, H: number, o: Pick<ProfileLayoutOptions, "measure" | "viewCount"> & { drag?: DragState }): boolean {
  const b = profileBlocks(card, { ...o, w: W, h: H });
  return solveLayout({ ...solveInput(card, b, W, H, o.drag), keepComposition: !o.drag }).fits;
}

/**
 * Clamps a requested card size to the product bounds AND the content floor
 * (resize handles, Ctrl/⌘+arrows, Medidas). `startW` keeps a card already
 * narrower than its floor (saved before it existed) from jumping wider.
 */
export function clampProfileCardSize(
  card: ProfileCardData, w: number, h: number,
  o: Pick<ProfileLayoutOptions, "measure" | "viewCount"> & { startW?: number } = {},
): { w: number; h: number } {
  const bounds = getFreeformCardBounds();
  const floor = profileCardMinSize(card, Math.round(w), o);
  const minW = Math.min(floor.w, o.startW ?? Infinity);
  const nw = Math.max(bounds.minW, minW, Math.min(bounds.maxW, Math.round(w)));
  const minH = nw === Math.round(w) ? floor.h : profileCardMinSize(card, nw, o).h;
  return { w: nw, h: Math.max(minH, Math.min(bounds.maxH, Math.round(h))) };
}

// ── Saving positions ─────────────────────────────────────────────────────────

/**
 * The patch that saves every block's resolved position (and the width of a
 * block the engine made narrower) — written ONCE, when a drag ends. From
 * then on (`blockLayout: 2`) these are the desired positions.
 */
export function positionsPatch(card: ProfileCardData, l: ProfileLayout, W: number, H: number): Partial<ProfileCardData> {
  const patch: Partial<ProfileCardData> = { blockLayout: 2 };
  const widths: NonNullable<ProfileCardData["blockWidths"]> = {};
  for (const [k, r] of Object.entries(l.rects) as [BlockKey, Rect][]) {
    const a = rectToAnchor(r, r.w, r.h, W, H, l.blocks.pad);
    (patch as Record<string, number>)[ANCHOR_FIELDS[k].x as string] = a.x;
    (patch as Record<string, number>)[ANCHOR_FIELDS[k].y as string] = a.y;
    const spec = l.blocks.specs[k];
    if (k !== "pfp" && spec && r.w < Math.min(spec.natW, W - 2 * l.blocks.pad) - 0.5) {
      widths[k as keyof typeof widths] = Math.round(r.w * 10) / 10;
    }
  }
  patch.blockWidths = Object.keys(widths).length ? widths : undefined;
  return patch;
}

export { BLOCK_GAP };
