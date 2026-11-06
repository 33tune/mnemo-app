/**
 * 2026-11-06 (decisión del usuario): the phone draws EVERY public image /
 * free text that falls inside what its screen shows (`onPhoneScreen`), like
 * the computer but zoomed on the card — not only what touches the card (a
 * frame around the note box was lost). What is wholly off screen is not
 * drawn, so it is never downloaded. The text below describes the earlier
 * rule; the zoom (card + stickers, centered) is unchanged.
 *
 * Mobile public view: phones show ONLY the profile card and its stickers
 * (decision of 2026-10-27) — no Music or old widgets of the room, and of its
 * images and free texts only the ones touching the card, in front or behind,
 * drawn whole as on a computer (2026-10-28). The card (with its stickers)
 * fills the screen, centered, without scroll and without cropping anything of
 * it; those images never change that view: what doesn't fit is cut by the
 * screen's edge.
 *
 * Pure: the public page hands the card-only state to the same CanvasBoard the
 * desktop viewer uses (same ProfileCard, effects and stickers). The card's
 * height is measured on the phone after mount (its content may need more than
 * the stored h), so cardViewRect() takes the rendered height.
 * Nothing here is ever written back — the viewer never persists.
 */
import type { CanvasState, ProfileCardData } from "@/types";
import { stickersBounds } from "./stickerGeometry";
import { rotatedBox, textBox } from "./roomBounds";
export { rotatedBox };

export type Rect = { x: number; y: number; w: number; h: number };

export interface MobileFit {
  state: CanvasState;
  /** The card and its stickers, with the stored height. */
  card: Rect;
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

type CardLike = Pick<ProfileCardData, "x" | "y" | "w" | "h" | "stickers">;
/** The card ∪ its visible stickers, for a card drawn `h` tall. */
export function cardViewRect(card: CardLike, h = card.h): Rect {
  const rect: Rect = { x: card.x, y: card.y, w: card.w, h };
  const stuck = stickersBounds({ ...card, h });
  return stuck ? union(rect, stuck) : rect;
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The phone's state: the public card plus every public image and free text
 * (the client draws only those on screen, `onPhoneScreen`); no widgets.
 * `card` (the view) is still the card and its stickers alone. */
export function fitRoomToCard(state: CanvasState): MobileFit | null {
  const card = (state.profiles ?? []).find(p => p.isPublic);
  if (!card) return null;
  return {
    state: {
      ...state, profiles: [card],
      images: (state.images ?? []).filter(i => i.isPublic),
      texts: (state.texts ?? []).filter(t => t.isPublic),
      cards: [], galleries: [], medias: [], guestbooks: [],
      socialCards: [], musicCards: [], linksCards: [], statsCards: [],
    },
    card: cardViewRect(card),
  };
}

/** The room area a phone screen shows for a view (s, tx, ty). */
export function phoneScreenRect(vw: number, vh: number, v: { s: number; tx: number; ty: number }): Rect {
  return { x: -v.tx / v.s, y: -v.ty / v.s, w: vw / v.s, h: vh / v.s };
}

/** An image / free text is drawn on the phone when any part of it is inside
 * `area` (the screen; before the view is measured, the card). */
export function onPhoneScreen(el: { x: number; y: number; w?: number; h?: number; rotation?: number; content?: unknown; size?: number }, area: Rect, isText = false): boolean {
  const box = isText ? textBox(el as Parameters<typeof textBox>[0]) : rotatedBox({ x: el.x, y: el.y, w: el.w ?? 200, h: el.h ?? 200 }, el.rotation ?? 0);
  return overlaps(box, area);
}

/** Phone side gutter (px on screen). */
export const MOBILE_GUTTER = 16;
/** A small card may grow to use the screen; never more than this. */
export const MOBILE_MAX_SCALE = 1.6;

/** The card (with its stickers) as big as the screen allows, centered. */
export function mobileView(vw: number, vh: number, card: Rect): { s: number; tx: number; ty: number } {
  const aw = Math.max(1, vw - 2 * MOBILE_GUTTER), ah = Math.max(1, vh - 2 * MOBILE_GUTTER);
  const s = Math.min(MOBILE_MAX_SCALE, aw / card.w, ah / card.h);
  return { s, tx: vw / 2 - (card.x + card.w / 2) * s, ty: vh / 2 - (card.y + card.h / 2) * s };
}
