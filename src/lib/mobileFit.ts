/**
 * Mobile public view (2026-10-26): phones see the profile CARD, not the whole
 * 1920-wide room. The room is cropped around the card — the card plus a halo
 * around it, keeping what touches that halo (frames, stickers, decorations
 * stuck to the card); the rest of the room is left out. Music is functional,
 * so one outside the halo is docked under the card instead of dropped.
 *
 * Pure: the public page hands the fitted state to the same CanvasBoard the
 * desktop viewer uses (same ProfileCard, effects and images), with the crop.
 * Nothing here is ever written back — the viewer never persists.
 *
 * No scroll (2026-10-27): the phone shows one screen — mobileView() fits the
 * whole crop when the card stays legible, else the card fills the screen and
 * what sticks out is cut; centered either way.
 */
import type { CanvasState } from "@/types";
import { stickersBounds } from "./stickerGeometry";
import { rotatedBox, textBox as roomTextBox } from "./roomBounds";
export { rotatedBox };

export type Rect = { x: number; y: number; w: number; h: number };

export interface MobileFit {
  state: CanvasState;
  /** The part of the room the phone shows, in room coordinates. */
  crop: Rect;
  /** The card (what stays centered and legible). */
  card: Rect;
}

/** Space kept around the card: what touches it belongs to the card. */
export function haloMargin(card: Rect): number {
  return Math.round(24 + 0.2 * card.w);
}
/** How far past the card the crop may reach (a huge image behind the card
 * is clipped, it never zooms the card out). */
const REACH = 0.6;
const MUSIC_GAP = 24;

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
function clampTo(r: Rect, bounds: Rect): Rect {
  const x = Math.max(r.x, bounds.x), y = Math.max(r.y, bounds.y);
  return { x, y, w: Math.min(r.x + r.w, bounds.x + bounds.w) - x, h: Math.min(r.y + r.h, bounds.y + bounds.h) - y };
}

type Boxed = { x: number; y: number; w?: number; h?: number; rotation?: number; isPublic?: boolean };
const boxOf = (e: Boxed): Rect => rotatedBox({ x: e.x, y: e.y, w: e.w ?? 200, h: e.h ?? 200 }, e.rotation ?? 0);
const textBox = (t: CanvasState["texts"][number]): Rect => roomTextBox(t);

/** Crop the public room around its card (see the file comment). */
export function fitRoomToCard(state: CanvasState): MobileFit {
  const pub = <T extends { isPublic?: boolean }>(xs: T[] | undefined) => (xs ?? []).filter(e => e.isPublic);
  const card = pub(state.profiles)[0];

  const decorative = {
    images: pub(state.images), texts: pub(state.texts), cards: pub(state.cards), galleries: pub(state.galleries),
    medias: pub(state.medias), guestbooks: pub(state.guestbooks), socialCards: pub(state.socialCards),
    linksCards: pub(state.linksCards), statsCards: pub(state.statsCards),
  };
  const music = pub(state.musicCards);

  if (!card) {
    // No public card: show everything public (nothing to center on).
    const boxes = [
      ...Object.values(decorative).flatMap(xs => (xs as Boxed[]).map(e => ("content" in e ? textBox(e as never) : boxOf(e)))),
      ...music.map(boxOf),
    ];
    const crop = boxes.length ? boxes.reduce(union) : { x: 0, y: 0, w: 390, h: 600 };
    return { state, crop, card: crop };
  }

  const cardRect: Rect = { x: card.x, y: card.y, w: card.w, h: card.h };
  const m = haloMargin(cardRect);
  const halo: Rect = { x: cardRect.x - m, y: cardRect.y - m, w: cardRect.w + 2 * m, h: cardRect.h + 2 * m };
  const reach: Rect = {
    x: cardRect.x - cardRect.w * REACH, y: cardRect.y - cardRect.h * REACH,
    w: cardRect.w * (1 + 2 * REACH), h: cardRect.h * (1 + 2 * REACH),
  };

  // The halo itself is part of the view: the card keeps air around it (and
  // its shadow / glow are never clipped).
  let crop = clampTo(halo, reach);
  // Bottom of what is actually drawn there (the card and what it keeps).
  let contentBottom = cardRect.y + cardRect.h;
  // The card's stickers (frames) are part of it: always fully in view.
  const stuck = stickersBounds(card);
  if (stuck) {
    crop = union(crop, stuck);
    contentBottom = Math.max(contentBottom, stuck.y + stuck.h);
  }
  const keep = <T extends Boxed>(xs: T[], box: (e: T) => Rect = boxOf): T[] =>
    xs.filter(e => {
      const b = box(e);
      if (!intersects(b, halo)) return false;
      const shown = clampTo(b, reach);
      crop = union(crop, shown);
      contentBottom = Math.max(contentBottom, shown.y + shown.h);
      return true;
    });

  const images = keep(decorative.images);
  const texts = keep(decorative.texts, textBox);
  const kept = {
    cards: keep(decorative.cards), galleries: keep(decorative.galleries), medias: keep(decorative.medias),
    guestbooks: keep(decorative.guestbooks), socialCards: keep(decorative.socialCards),
    linksCards: keep(decorative.linksCards), statsCards: keep(decorative.statsCards),
  };

  const focusX = cardRect.x + cardRect.w / 2;
  const near = keep(music);
  // Music away from the card: docked under it, centered, one under another.
  let y = contentBottom + MUSIC_GAP;
  const docked = music.filter(mc => !near.includes(mc)).map(mc => {
    const placed = { ...mc, x: Math.round(focusX - mc.w / 2), y: Math.round(y), rotation: 0 };
    y += mc.h + MUSIC_GAP;
    crop = union(crop, { x: placed.x, y: placed.y, w: placed.w, h: placed.h });
    return placed;
  });

  return {
    state: { ...state, profiles: [card], images, texts, ...kept, musicCards: [...near, ...docked] },
    crop,
    // Its stickers are part of the card: when the card fills the screen they fit too.
    card: stuck ? union(cardRect, stuck) : cardRect,
  };
}

/** Phone side gutter (px on screen). */
export const MOBILE_GUTTER = 16;
/** A small card may grow a bit to use the screen; never more than this. */
export const MOBILE_MAX_SCALE = 1.3;

/**
 * How the phone shows the crop, without scroll: the whole crop when the card
 * keeps at least LEGIBLE of the size it would have filling the screen;
 * otherwise the card fills the screen (what sticks out is cut). Centered on
 * what is shown. Never bigger than MOBILE_MAX_SCALE.
 */
export const LEGIBLE = 0.8;
export function mobileView(vw: number, vh: number, fit: Pick<MobileFit, "crop" | "card">): { s: number; tx: number; ty: number } {
  const aw = Math.max(1, vw - 2 * MOBILE_GUTTER), ah = Math.max(1, vh - 2 * MOBILE_GUTTER);
  const fitCrop = Math.min(aw / fit.crop.w, ah / fit.crop.h);
  const fitCard = Math.min(aw / fit.card.w, ah / fit.card.h);
  const whole = fitCrop >= fitCard * LEGIBLE;
  const s = Math.min(MOBILE_MAX_SCALE, whole ? fitCrop : fitCard);
  const focus = whole ? fit.crop : fit.card;
  return { s, tx: vw / 2 - (focus.x + focus.w / 2) * s, ty: vh / 2 - (focus.y + focus.h / 2) * s };
}
