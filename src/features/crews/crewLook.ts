/**
 * Pure: how crews look. The members' mini-cards (the same simplification as
 * the link preview, ogCard.ts, plus the name's own font) and the Google Fonts
 * a crew page needs — loaded with a <link> right on the page, so a crew's
 * font and its members' name fonts always show.
 */
import type { CanvasState } from "@/types";
import { ogCardOf, type OgCard } from "@/lib/ogCard";
import { CANVAS_FONTS, getFontStyle } from "@/lib/fontList";
import { NAME_FONT_DEFAULT } from "@/lib/effectEditorDefaults";

export interface MiniCard extends OgCard {
  nameFont: string;
}

export function miniCardOf(card: Record<string, unknown> | null, handle: string, displayName: string | null): MiniCard {
  const og = card ? ogCardOf({ profiles: [card] } as unknown as CanvasState, handle) : null;
  const base: OgCard = og ?? {
    name: (displayName || handle).slice(0, 60), handle, phrase: "", photo: null, pfpRadius: "50%",
    bg: "#17151c", bgImage: null, radius: 18, textColor: "#f6f3f8", nameColor: "#f6f3f8", handleColor: "#f6f3f8",
    roomBg: "#0e0c12", roomImage: null,
  };
  const font = (card?.nameFont ?? card?.font ?? NAME_FONT_DEFAULT) as string;
  return { ...base, nameFont: getFontStyle(font) };
}

/** Fonts the crews pages can pick (the card's own list + the site's display face). */
export const CREW_FONTS: string[] = ["Unbounded", ...CANVAS_FONTS.map(f => f.key)];

export { crewFontStyle } from "@/lib/crewChip";

/** Fonts served by Google (the rest are device fonts). */
const GOOGLE: Record<string, string> = {
  "Unbounded": "Unbounded:wght@500;700;800", "Anton": "Anton", "Bebas Neue": "Bebas+Neue", "Cabin": "Cabin:wght@400;700",
  "Comfortaa": "Comfortaa:wght@400;700", "DM Sans": "DM+Sans:wght@400;500;700", "Dancing Script": "Dancing+Script:wght@400;700",
  "Fira Code": "Fira+Code:wght@400;700", "Great Vibes": "Great+Vibes", "Inter": "Inter:wght@400;700",
  "JetBrains Mono": "JetBrains+Mono:wght@400;700", "Josefin Sans": "Josefin+Sans:wght@400;700", "Lato": "Lato:wght@400;700",
  "Montserrat": "Montserrat:wght@400;700", "Mulish": "Mulish:wght@400;700", "Nunito": "Nunito:wght@400;700",
  "Open Sans": "Open+Sans:wght@400;700", "Oswald": "Oswald:wght@400;600", "Pacifico": "Pacifico",
  "Playfair Display": "Playfair+Display:wght@400;700", "Poppins": "Poppins:wght@400;700", "Quicksand": "Quicksand:wght@400;700",
  "Raleway": "Raleway:wght@400;700", "Roboto": "Roboto:wght@400;700", "Space Mono": "Space+Mono:wght@400;700",
  "Syne": "Syne:wght@400;700;800", "Ubuntu": "Ubuntu:wght@400;700",
};

/** One stylesheet URL for every Google font among `fonts` (null if none). */
export function googleFontsHref(fonts: (string | null | undefined)[]): string | null {
  const fams = [...new Set(fonts.filter((f): f is string => !!f && f in GOOGLE))].sort().map(f => `family=${GOOGLE[f]}`);
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap` : null;
}

/** The raw font key a card's name uses (for googleFontsHref). */
export const nameFontKey = (card: Record<string, unknown> | null) =>
  ((card?.nameFont ?? card?.font ?? NAME_FONT_DEFAULT) as string);

/** "Fundado el 29/10/2026". */
export function foundedText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `Fundado el ${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
