/**
 * The room is one screen, never a scrolling page (decision of 2026-10-27).
 * Its area is ROOM_W × ROOM_H centered on the card — large enough for what a
 * 1440p monitor shows around it, so nothing that was visible on a big screen
 * goes. Anything entirely outside it is the old scroll's leftovers (rooms
 * from when the canvas was a 3000px-tall document): it is not drawn on the
 * public page and the editor drops it on load. Pure, so it's tested.
 */
import type { CanvasElement, CanvasState } from "@/types";

export const ROOM_W = 2560;
export const ROOM_H = 1440;

export type Rect = { x: number; y: number; w: number; h: number };

/** The axis-aligned box of a rect rotated around its center. */
export function rotatedBox(r: Rect, deg = 0): Rect {
  if (!deg) return r;
  const a = (deg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = r.w * c + r.h * s, h = r.w * s + r.h * c;
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
}

type Boxed = { x: number; y: number; w?: number; h?: number; rotation?: number };
/** Free text has no stored box: estimated from its content and size. */
export function textBox(t: { x: number; y: number; content?: unknown; size?: number; rotation?: number }): Rect {
  const plain = String(t.content ?? "").replace(/<[^>]*>/g, "");
  const lines = plain.split(/\n/);
  const longest = Math.max(1, ...lines.map(l => l.length));
  const size = t.size || 16;
  return rotatedBox({ x: t.x, y: t.y, w: longest * size * 0.6, h: lines.length * size * 1.3 }, t.rotation ?? 0);
}
export function boxOf(e: Boxed & { content?: unknown; size?: number }, isText = false): Rect {
  return isText ? textBox(e) : rotatedBox({ x: e.x, y: e.y, w: e.w ?? 200, h: e.h ?? 200 }, e.rotation ?? 0);
}

/** The room's area around a card. */
export function roomBox(card: { x: number; y: number; w: number; h: number }): Rect {
  return { x: card.x + card.w / 2 - ROOM_W / 2, y: card.y + card.h / 2 - ROOM_H / 2, w: ROOM_W, h: ROOM_H };
}

const touches = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Editor: the elements without the ones entirely outside the room (the card always stays). */
export function dropOutsideRoomElements(elements: CanvasElement[]): CanvasElement[] {
  const card = elements.find(e => e.elementType === "profile");
  if (!card) return elements;
  const room = roomBox(card);
  return elements.filter(e => e.elementType === "profile" || touches(boxOf(e as never, e.elementType === "text"), room));
}

/** Public page: the same, on a saved state (its first public card decides). */
export function dropOutsideRoom(state: CanvasState): CanvasState {
  const card = (state.profiles ?? []).find(p => p.isPublic) ?? (state.profiles ?? [])[0];
  if (!card) return state;
  const room = roomBox(card);
  const keep = <T extends Boxed>(xs: T[] | undefined, text = false) => (xs ?? []).filter(e => touches(boxOf(e as never, text), room));
  return {
    ...state,
    cards: keep(state.cards), images: keep(state.images), texts: keep(state.texts, true), galleries: keep(state.galleries),
    medias: keep(state.medias), guestbooks: keep(state.guestbooks), socialCards: keep(state.socialCards),
    musicCards: keep(state.musicCards), linksCards: keep(state.linksCards), statsCards: keep(state.statsCards),
  };
}

/**
 * Desktop public view: the card centered in the screen (below the 44px
 * bar), at real size unless it doesn't fit; the rest of the room around it,
 * as the owner placed it, cut by the screen's edges — never a scroll.
 */
export function desktopViewFit(vw: number, vh: number, card: Rect | null, topBar = 44, margin = 24): { s: number; tx: number; ty: number } {
  if (!card) return { s: 1, tx: 0, ty: 0 };
  const availH = vh - topBar - 2 * margin, availW = vw - 2 * margin;
  const s = Math.min(1, availW / card.w, availH / card.h);
  return { s, tx: vw / 2 - (card.x + card.w / 2) * s, ty: topBar + (vh - topBar) / 2 - (card.y + card.h / 2) * s };
}
