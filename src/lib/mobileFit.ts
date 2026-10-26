/**
 * Mobile public view: phones show ONLY the profile card and its stickers
 * (decision of 2026-10-27) — no images, free text, Music or old widgets of
 * the room. The card (with its stickers) fills the screen, centered, without
 * scroll and without cropping anything of it.
 *
 * Pure: the public page hands the card-only state to the same CanvasBoard the
 * desktop viewer uses (same ProfileCard, effects and stickers). The card's
 * height is measured on the phone after mount (its content may need more than
 * the stored h), so cardViewRect() takes the rendered height.
 * Nothing here is ever written back — the viewer never persists.
 */
import type { CanvasState, ProfileCardData } from "@/types";
import { stickersBounds } from "./stickerGeometry";
import { rotatedBox } from "./roomBounds";
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

/** The phone's state: the public card alone (see the file comment). */
export function fitRoomToCard(state: CanvasState): MobileFit | null {
  const card = (state.profiles ?? []).find(p => p.isPublic);
  if (!card) return null;
  return {
    state: {
      ...state, profiles: [card],
      images: [], texts: [], cards: [], galleries: [], medias: [], guestbooks: [],
      socialCards: [], musicCards: [], linksCards: [], statsCards: [],
    },
    card: cardViewRect(card),
  };
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
