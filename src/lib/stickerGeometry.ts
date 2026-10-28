/**
 * Card stickers (2026-10-27): images / GIFs stuck to the ProfileCard — frames
 * above all. Pure geometry and ordering (tested); ProfileCard draws them and
 * edits them, Tarjeta › Stickers lists them by layer.
 *
 * Geometry is RELATIVE TO THE CARD: x / y = the top-left as a fraction of the
 * card's width / height, w = width as a fraction of the card's width, aspect
 * = height / width (never distorted) — all measured when the card was
 * refW × refH. When the card's size changes, the sticker's CENTER keeps its
 * place in the card and its size scales by the SMALLER of the two changes
 * (a card made only wider leaves it as is — before 2026-10-27 it scaled with
 * the width alone and could balloon). It may stick out of the card, but only
 * so far: STICKER_REACH of the card's size per side — the drawn sticker is
 * always kept inside that area.
 */
import type { CardSticker } from "@/types";

export const STICKER_MAX = 10;
/** How far past the card a sticker may go, as a fraction of its size per side. */
export const STICKER_REACH = 0.25;
/** Smallest sticker side, px. */
export const STICKER_MIN_PX = 16;

export type Rect = { x: number; y: number; w: number; h: number };

/** The sticker in px, relative to the card's top-left (always inside the area). */
export function stickerRect(st: CardSticker, cardW: number, cardH: number): Rect {
  const refW = st.refW && st.refW > 0 ? st.refW : cardW;
  const refH = st.refH && st.refH > 0 ? st.refH : cardH;
  const aspect = st.aspect > 0 ? st.aspect : 1;
  const w0 = st.w * refW, h0 = w0 * aspect;
  // The center keeps its place in the card.
  const cx = ((st.x * refW + w0 / 2) / refW) * cardW;
  const cy = ((st.y * refH + h0 / 2) / refH) * cardH;
  // Size: the smaller of the two changes, never past the area.
  const s = Math.min(cardW / refW, cardH / refH);
  const area = stickerArea(cardW, cardH);
  const size = clampSize(w0 * s, aspect, area);
  return clampIntoArea({ x: cx - size.w / 2, y: cy - size.h / 2, w: size.w, h: size.h }, area);
}

/** A px rect (card-relative) back into the stored fractions (measured now). */
export function rectToSticker(r: Rect, cardW: number, cardH: number): Pick<CardSticker, "x" | "y" | "w" | "aspect" | "refW" | "refH"> {
  return { x: r.x / cardW, y: r.y / cardH, w: r.w / cardW, aspect: r.w > 0 ? r.h / r.w : 1, refW: cardW, refH: cardH };
}

/** Where stickers may be: the card plus STICKER_REACH of its size per side. */
export function stickerArea(cardW: number, cardH: number): Rect {
  const mx = cardW * STICKER_REACH, my = cardH * STICKER_REACH;
  return { x: -mx, y: -my, w: cardW + 2 * mx, h: cardH + 2 * my };
}

/** Keep a rect inside the area (a rect larger than it is centered on it). */
export function clampIntoArea(r: Rect, area: Rect): Rect {
  const fit = (pos: number, size: number, start: number, len: number) =>
    size >= len ? start + (len - size) / 2 : Math.min(Math.max(pos, start), start + len - size);
  return { ...r, x: fit(r.x, r.w, area.x, area.w), y: fit(r.y, r.h, area.y, area.h) };
}

/** Largest size (same aspect) that still fits the area, and not below the minimum. */
export function clampSize(w: number, aspect: number, area: Rect): { w: number; h: number } {
  const a = aspect > 0 ? aspect : 1;
  let ww = Math.min(w, area.w, area.h / a);
  ww = Math.max(ww, STICKER_MIN_PX, STICKER_MIN_PX / a);
  return { w: ww, h: ww * a };
}

/** A new sticker for an image of natural size nw × nh: 60 % of the card's
 * width (or less, to fit its height), centered, in front of the card. */
export function newSticker(id: string, src: string, nw: number, nh: number, cardW: number, cardH: number): CardSticker {
  const aspect = nw > 0 && nh > 0 ? nh / nw : 1;
  const area = stickerArea(cardW, cardH);
  const size = clampSize(Math.min(cardW * 0.6, (cardH * 0.6) / aspect), aspect, area);
  const r = { x: (cardW - size.w) / 2, y: (cardH - size.h) / 2, w: size.w, h: size.h };
  return { id, src, ...rectToSticker(r, cardW, cardH), front: true };
}

// ── Layers: the list shows front stickers (top first), the card, then the
// stickers behind it (top first). The stored array is paint order (first =
// bottom): every back sticker, then every front sticker.

export const CARD_ROW = "__card__";

/** The list's rows, top → bottom, with CARD_ROW where the card sits. */
export function stickerRows(stickers: readonly CardSticker[]): string[] {
  const front = stickers.filter(s => s.front).map(s => s.id).reverse();
  const back = stickers.filter(s => !s.front).map(s => s.id).reverse();
  return [...front, CARD_ROW, ...back];
}

/** Stickers in the order the rows say (rows top → bottom, CARD_ROW included). */
export function stickersFromRows(stickers: readonly CardSticker[], rows: readonly string[]): CardSticker[] {
  const byId = new Map(stickers.map(s => [s.id, s]));
  const cardAt = rows.indexOf(CARD_ROW);
  const out: CardSticker[] = [];
  // Paint order is bottom first: walk the rows from the bottom up.
  for (let i = rows.length - 1; i >= 0; i--) {
    const st = byId.get(rows[i]);
    if (!st) continue;
    const front = cardAt >= 0 && i < cardAt;
    out.push(front === !!st.front ? st : { ...st, front });
  }
  // Never lose a sticker the rows missed.
  for (const s of stickers) if (!rows.includes(s.id)) out.push(s);
  return out;
}

/** Move a row (sticker or the card) to position `to` in the list. */
export function moveRow(stickers: readonly CardSticker[], id: string, to: number): CardSticker[] {
  const rows = stickerRows(stickers);
  const from = rows.indexOf(id);
  if (from === -1) return [...stickers];
  const next = rows.slice();
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
  return stickersFromRows(stickers, next);
}

/** The space the visible stickers take, in ROOM coordinates (rotation
 * included) — the phone view fits it (mobileFit.ts). */
export function stickersBounds(card: { x: number; y: number; w: number; h: number; stickers?: CardSticker[] }): Rect | null {
  let out: Rect | null = null;
  for (const st of card.stickers ?? []) {
    if (st.hidden) continue;
    const r = stickerRect(st, card.w, card.h);
    const deg = st.rotation ?? 0;
    const a = (deg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const w = r.w * c + r.h * s, h = r.w * s + r.h * c;
    const box = { x: card.x + r.x + r.w / 2 - w / 2, y: card.y + r.y + r.h / 2 - h / 2, w, h };
    out = out
      ? { x: Math.min(out.x, box.x), y: Math.min(out.y, box.y), w: Math.max(out.x + out.w, box.x + box.w) - Math.min(out.x, box.x), h: Math.max(out.y + out.h, box.y + box.h) - Math.min(out.y, box.y) }
      : box;
  }
  return out;
}
