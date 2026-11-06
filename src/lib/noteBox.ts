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
/** Gap between the box and the card's top edge (room for the card's own
 * motion — floating, hover scale — without touching the box). */
export const NOTE_BOX_GAP = 28;
/** Separación the owner can choose (not too far: the phone view keeps the card big). */
export const NOTE_GAP = { min: 8, max: 48 } as const;
/** The box keeps ONE size whatever it says (or when it says nothing), so a
 * decoration placed around it always fits: room for 3 lines + the meta row. */
export const NOTE_LINES = 3;
export const NOTE_PAD_Y = 10;
export const NOTE_META_H = 18;
export const NOTE_SCALE = { min: 0.9, max: 1.15 } as const;
/** Ancho / Alto of the box: small changes only. */
export const NOTE_SIZE = { min: 0.85, max: 1.15 } as const;
export const NOTE_OPACITY = { min: 0.2, max: 1 } as const;
export const NOTE_RADIUS = { min: 0, max: 28 } as const;
export const NOTE_FONT_SIZE = { min: 12, max: 19 } as const;
/** x-height share all fonts are brought to (CSS font-size-adjust), so every
 * font reads the same size in the box and in the shortcuts bar. */
export const NOTE_FONT_ADJUST = 0.52;

export const NOTE_DEFAULTS: Required<NoteBoxStyle> = {
  scale: 1, w: 1, h: 1, gap: 28, bg: "#ffffff", opacity: 1, radius: 16, font: "DM Sans", fontSize: 15, color: "#141418", showViews: false,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function resolveNoteBox(s?: NoteBoxStyle): Required<NoteBoxStyle> {
  const d = NOTE_DEFAULTS;
  return {
    scale: clamp(s?.scale ?? d.scale, NOTE_SCALE.min, NOTE_SCALE.max),
    w: clamp(s?.w ?? d.w, NOTE_SIZE.min, NOTE_SIZE.max),
    gap: clamp(s?.gap ?? d.gap, NOTE_GAP.min, NOTE_GAP.max),
    h: clamp(s?.h ?? d.h, NOTE_SIZE.min, NOTE_SIZE.max),
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

/** The gap for this card: the owner's Separación, plus the floating height
 * when it floats (its motion never reaches the box). */
export function noteGap(card: { noteBox?: NoteBoxStyle; effects?: { animations?: { floating?: boolean; floatHeight?: number } } }): number {
  const a = card.effects?.animations;
  const gap = clamp(card.noteBox?.gap ?? NOTE_BOX_GAP, NOTE_GAP.min, NOTE_GAP.max);
  return gap + (a?.floating ? Math.max(0, a.floatHeight ?? 8) : 0);
}

/** What the view fits with the note: the card stays the CENTER, and the
 * room it needs above the card's top edge (the note) is mirrored below.
 * `view` is the card's view rect (already centered on the card, stickers
 * included); a sticker reaching up past the note needs no extra room. */
export function withNoteRoom<R extends { x: number; y: number; w: number; h: number }>(view: R, cardH: number, reserve: number): R {
  if (!reserve) return view;
  const cy = view.y + view.h / 2;
  const half = Math.max(view.h / 2, cardH / 2 + reserve);
  return { ...view, y: cy - half, h: 2 * half };
}

/** The box's height (unscaled): fixed for a given style. */
export function noteBoxHeight(st: Required<NoteBoxStyle>): number {
  return Math.round((NOTE_PAD_Y * 2 + NOTE_LINES * st.fontSize * 1.3 + NOTE_META_H) * st.h);
}

/** The box's width. */
export function noteBoxWidth(st: Required<NoteBoxStyle>): number {
  return Math.round(NOTE_BOX_W * st.w);
}

/** Room the box takes above the card (box + gap) — the views fit
 * keeps it on screen. */
export function noteReserve(st: Required<NoteBoxStyle>, gap = NOTE_BOX_GAP): number {
  return noteBoxHeight(st) + gap;
}

/** The profile shows the box with an active note, or (empty) when the owner
 * styled it — a decoration around it must not lose what it frames. */
export function noteBoxVisible(hasNote: boolean, style: NoteBoxStyle | undefined): boolean {
  return hasNote || (!!style && Object.keys(style).length > 0);
}

/** Keeps at most NOTE_MAX characters as a person counts them, on one line. */
export function clipNote(s: string): string {
  return Array.from(s.replace(/[\r\n]+/g, " ")).slice(0, NOTE_MAX).join("");
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
