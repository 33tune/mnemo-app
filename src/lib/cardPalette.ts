// Liquid glass (Menus v4, L1): the "Tu tarjeta" ribbon of the color rows —
// up to five colors the card already uses, so the same color can be reused
// with one tap (design Editor.dc.html `palette(v)`). READ-ONLY: it derives
// the list from what the card renders; it never writes anything.
import type { ProfileCardData, CardEffects } from "@/types";
import { cardBaseColor } from "./cardColors";
import { getProfileCardEffects } from "./profileCardEffects";

/** "#rgb" / "#rrggbb(aa)" / "rgb(a)(…)" -> [r, g, b], or null. */
export function parseRgb(c: string | undefined | null): [number, number, number] | null {
  if (!c) return null;
  const s = c.trim();
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (!h) return null;
  const x = h[1].length === 3 ? h[1].split("").map(d => d + d).join("") : h[1].slice(0, 6);
  const n = parseInt(x, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (r: [number, number, number]) => "#" + r.map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Dedupe colors that look the same (sum of channel deltas < 36) and keep
 * the first `max`, as uppercase "#RRGGBB" (alpha dropped: the ribbon offers
 * hues, the alpha of the row stays). */
export function dedupePalette(colors: Array<string | undefined | null | false>, max = 5): string[] {
  const out: Array<[number, number, number]> = [];
  for (const c of colors) {
    const rgb = c ? parseRgb(c) : null;
    if (!rgb) continue;
    if (out.some(o => Math.abs(o[0] - rgb[0]) + Math.abs(o[1] - rgb[1]) + Math.abs(o[2] - rgb[2]) < 36)) continue;
    out.push(rgb);
    if (out.length >= max) break;
  }
  return out.map(toHex);
}

/** The card's own colors, in the design's order: background, base text,
 * role colors, name gradient, background gradient, photo glow, card glow,
 * border, shadow, photo border, link icons. */
export function cardPalette(card: ProfileCardData, effective: CardEffects = getProfileCardEffects(card)): string[] {
  const fx = effective;
  const nameGrad = fx.textRoles?.name?.gradient;
  return dedupePalette([
    fx.bg?.color,
    cardBaseColor(card, fx),
    card.nameColor, card.handleColor, card.descriptorColor, card.bioColor,
    ...(nameGrad?.colors ?? []),
    fx.gradient?.from, fx.gradient?.to,
    fx.pfp?.glow?.color,
    fx.glow?.color,
    fx.border?.color,
    fx.shadow?.color,
    fx.pfp?.border?.color,
    card.linksIconColor,
  ]);
}
