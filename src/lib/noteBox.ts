/**
 * Notas (2026-11-06): the note box above the card — its look, with the
 * product's limits (the size changes only a little; the box never fully
 * disappears; below full opacity it turns to frosted glass). Pure: used by
 * the canvas (NoteBox), the shortcuts bar (same look, fixed size) and the
 * phone / desktop view fit (the space the box takes above the card).
 */
import type { CSSProperties } from "react";
import type { NoteBoxStyle } from "@/types";
import { getFontStyle } from "./fontList";

export const NOTE_MAX = 60;
export const NOTE_BOX_W = 232;
/** Gap between the box and the card's top edge. */
export const NOTE_BOX_GAP = 12;
/** Height the views fit reserves for the box (3 lines at the largest size). */
export const NOTE_BOX_RESERVE = 96;
export const NOTE_SCALE = { min: 0.9, max: 1.15 } as const;
export const NOTE_OPACITY = { min: 0.2, max: 1 } as const;
export const NOTE_RADIUS = { min: 0, max: 28 } as const;
export const NOTE_FONT_SIZE = { min: 12, max: 19 } as const;
/** x-height share all fonts are brought to (CSS font-size-adjust), so every
 * font reads the same size in the box and in the shortcuts bar. */
export const NOTE_FONT_ADJUST = 0.52;

export const NOTE_DEFAULTS: Required<NoteBoxStyle> = {
  scale: 1, bg: "#ffffff", opacity: 1, radius: 16, font: "DM Sans", fontSize: 15, color: "#141418", showViews: false,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function resolveNoteBox(s?: NoteBoxStyle): Required<NoteBoxStyle> {
  const d = NOTE_DEFAULTS;
  return {
    scale: clamp(s?.scale ?? d.scale, NOTE_SCALE.min, NOTE_SCALE.max),
    bg: s?.bg || d.bg,
    opacity: clamp(s?.opacity ?? d.opacity, NOTE_OPACITY.min, NOTE_OPACITY.max),
    radius: clamp(s?.radius ?? d.radius, NOTE_RADIUS.min, NOTE_RADIUS.max),
    font: s?.font || d.font,
    fontSize: clamp(s?.fontSize ?? d.fontSize, NOTE_FONT_SIZE.min, NOTE_FONT_SIZE.max),
    color: s?.color || d.color,
    showViews: !!s?.showViews,
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The box's surface: solid at full opacity; below it, the color thins
 * and the blur of what is behind grows (frosted glass), with a light edge
 * so it never vanishes. The text is never faded (opacity only on the bg). */
export function noteSurface(st: Required<NoteBoxStyle>): CSSProperties {
  const rgb = hexToRgb(st.bg) ?? [255, 255, 255];
  const glass = 1 - st.opacity;                    // 0 = solid … 0.8 = most glass
  const blur = Math.round(4 + glass * 22);
  return {
    background: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${st.opacity.toFixed(3)})`,
    ...(glass > 0.01 ? {
      backdropFilter: `blur(${blur}px) saturate(1.5)`,
      WebkitBackdropFilter: `blur(${blur}px) saturate(1.5)`,
      boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.18 + glass * 0.22).toFixed(3)}), 0 6px 20px rgba(0,0,0,0.16)`,
    } : { boxShadow: "0 6px 20px rgba(0,0,0,0.16)" }),
    borderRadius: st.radius,
  };
}

/** The note's text style (font normalized: every font reads the same size). */
export function noteText(st: Required<NoteBoxStyle>, size = st.fontSize): CSSProperties {
  return {
    fontFamily: `${getFontStyle(st.font)}, system-ui, sans-serif`,
    fontSize: size,
    fontSizeAdjust: NOTE_FONT_ADJUST,
    color: st.color,
    lineHeight: 1.3,
    overflowWrap: "anywhere",
  } as CSSProperties;
}

/** "hace 3 h" / "quedan 14 h". */
export function hoursAgo(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}
export function hoursLeft(expiresIso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((Date.parse(expiresIso) - now) / 60000));
  if (m < 60) return `queda${m === 1 ? "" : "n"} ${m} min`;
  const h = Math.floor(m / 60);
  return `queda${h === 1 ? "" : "n"} ${h} h`;
}

/** Characters as a person counts them (an emoji = 1), like the database's
 * char_length counts code points: the stricter of the two is used. */
export function noteLength(s: string): number {
  return Array.from(s.trim()).length;
}
