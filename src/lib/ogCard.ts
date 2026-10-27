/**
 * Link previews (2026-10-27): what /[handle]/opengraph-image draws — the
 * published card, simplified (photo, name, @handle, phrase, its colors and
 * background) on the room's color. Pure, so it's tested; animated effects
 * don't exist in a still image.
 */
import type { CanvasState, ProfileCardData } from "@/types";
import { getProfileCardEffects } from "./profileCardEffects";
import { cardBaseColor } from "./cardColors";

export interface OgCard {
  name: string;
  handle: string;
  phrase: string;
  photo: string | null;
  pfpRadius: string;
  bg: string;
  bgImage: string | null;
  radius: number;
  textColor: string;
  nameColor: string;
  handleColor: string;
  roomBg: string;
  roomImage: string | null;
}

/** Only http(s) images in a format the image renderer reads. */
export function drawableImage(url: unknown): string | null {
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) return null;
  return /\.(svg)(\?|$)/i.test(url) ? null : url;
}

export function ogCardOf(state: CanvasState, fallbackHandle: string): OgCard | null {
  const card = (state.profiles ?? []).find(p => p.isPublic) ?? (state.profiles ?? [])[0];
  if (!card) return null;
  const fx = getProfileCardEffects(card as ProfileCardData);
  const base = cardBaseColor(card as ProfileCardData, fx);
  const c = card as ProfileCardData & { nameColor?: string; handleColor?: string };
  const handle = (card.handle || fallbackHandle || "").replace(/^@/, "");
  return {
    name: (card.name || handle).slice(0, 60),
    handle,
    phrase: (card.status || "").slice(0, 90),
    photo: drawableImage(card.photo),
    pfpRadius: `${Math.max(0, Math.min(100, card.pfpRadius ?? 100)) / 2}%`,
    bg: (fx.bg?.color as string) || "#17151c",
    bgImage: drawableImage(fx.bg?.image),
    radius: Math.max(0, Math.min(60, (fx.border?.radius as number | undefined) ?? 18)),
    textColor: base,
    nameColor: c.nameColor || base,
    handleColor: c.handleColor || base,
    roomBg: state.bgColor || "#0e0c12",
    roomImage: drawableImage(state.wallpaper),
  };
}
