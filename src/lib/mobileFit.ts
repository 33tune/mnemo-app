/**
 * Mobile public view: phones show ONLY the profile card and its stickers
 * (decision of 2026-10-27) — no images, free text, Music or old widgets of
 * the room, except what's behind a see-through card, clipped to it
 * (2026-10-28). The card (with its stickers) fills the screen, centered,
 * without scroll and without cropping anything of it.
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
type Stacked = { zIndex?: number; layer?: number };
const stackZ = (e: Stacked) => (e.zIndex ?? 0) + (e.layer ?? 0) * 100;

/** The phone's state: the public card alone (see the file comment) — plus,
 * since 2026-10-28, the images and free texts BEHIND the card that it covers:
 * a see-through card (transparent color, glass) shows them as on a computer.
 * They're drawn clipped to the card's shape (cardClipPath), never around it. */
export function fitRoomToCard(state: CanvasState): MobileFit | null {
  const card = (state.profiles ?? []).find(p => p.isPublic);
  if (!card) return null;
  const cardBox = rotatedBox({ x: card.x, y: card.y, w: card.w, h: card.h }, card.rotation);
  const behind = <T extends Stacked>(e: T, box: Rect) => stackZ(e) < stackZ(card) && overlaps(box, cardBox);
  return {
    state: {
      ...state, profiles: [card],
      images: (state.images ?? []).filter(i => i.isPublic && behind(i, rotatedBox(i, i.rotation))),
      texts: (state.texts ?? []).filter(t => t.isPublic && behind(t, textBox(t))),
      cards: [], galleries: [], medias: [], guestbooks: [],
      socialCards: [], musicCards: [], linksCards: [], statsCards: [],
    },
    card: cardViewRect(card),
  };
}

/** CSS clip-path (canvas coordinates) of the card's own shape: its rounded
 * rectangle `h` tall, rotated like the card. What's behind it shows only there. */
export function cardClipPath(card: Pick<ProfileCardData, "x" | "y" | "w" | "rotation">, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, card.w / 2, h / 2));
  const pts: [number, number][] = [];
  const corner = (cx: number, cy: number, from: number) => {
    for (let k = 0; k <= 6; k++) {
      const a = ((from + k * 15) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  corner(card.x + card.w - r, card.y + r, 270);
  corner(card.x + card.w - r, card.y + h - r, 0);
  corner(card.x + r, card.y + h - r, 90);
  corner(card.x + r, card.y + r, 180);
  const deg = card.rotation ?? 0;
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const ox = card.x + card.w / 2, oy = card.y + h / 2;
  const fmt = (n: number) => `${Math.round(n * 10) / 10}px`;
  return `polygon(${pts.map(([x, y]) => {
    const dx = x - ox, dy = y - oy;
    return deg ? `${fmt(ox + dx * cos - dy * sin)} ${fmt(oy + dx * sin + dy * cos)}` : `${fmt(x)} ${fmt(y)}`;
  }).join(", ")})`;
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
