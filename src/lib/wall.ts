/**
 * Muro (2026-11-25) — PURE: post shape, the per-post style (font, colors, size),
 * limits and messages. Data: `comments` + `comment_likes` (supabase/migrations/
 * 20261125000000_wall.sql). A post lives on someone's wall (the back of their
 * card) and carries the style its AUTHOR picked when writing it.
 */
import { CANVAS_FONTS, getFontStyle } from "@/lib/fontList";

export const POST_MAX = 280;
export const WALL_PAGE = 20;

/** Text animations a post can have (names stored as is; same list as clean_post_style). */
export type PostFx = "glow" | "shimmer" | "rainbow" | "bounce" | "wave" | "shake";
export const POST_FX: readonly PostFx[] = ["glow", "shimmer", "rainbow", "bounce", "wave", "shake"];
export interface PostStyle { font?: string; color?: string; bg?: string; size?: 12 | 15 | 18; fx?: PostFx }
export interface PostAuthor { id: string; handle: string; name: string; photo: string | null; pfpRadius: string; bg: string; nameColor: string }
export interface WallPost {
  id: string;
  wallOwner: string;
  wallHandle?: string;
  parentId: string | null;
  body: string;
  style: PostStyle | null;
  createdAt: string;
  author: PostAuthor;
  likes: number;
  replies: number;
  liked: boolean;
  pinned?: boolean;
}
export interface ActivityItem {
  kind: "wall" | "reply" | "like" | "favorite"; postId: string; wallHandle: string; body: string; at: string; actor: PostAuthor;
  /** "favorite" (2026-11-26): I already gave them a favorite back. */
  mutual?: boolean;
}

/** Fonts offered when writing (a short, legible set; any card font is accepted). */
export const POST_FONTS = ["DM Sans", "Poppins", "Space Mono", "Playfair Display", "Comic Sans MS", "Dancing Script", "Bebas Neue", "Pacifico", "Courier New", "Impact", "Great Vibes", "Quicksand"]
  .filter(k => CANVAS_FONTS.some(f => f.key === k));
export const POST_COLORS = ["#ffffff", "#111114", "#ff4f94", "#ff3b30", "#ff9f0a", "#ffd60a", "#c6ff3a", "#34c759", "#5ac8fa", "#3d5afe", "#af52de", "#8e8e93"];
export const POST_BGS = ["#16141c", "#000000", "#ffffff", "#ffe1ee", "#3a0a1a", "#3b0000", "#3a2600", "#13300f", "#0a2a3a", "#0d1440", "#2a0a3a", "#2c2c2e"];
export const POST_SIZES = [12, 15, 18] as const;
export const DEFAULT_POST_STYLE: Required<Omit<PostStyle, "fx">> = { font: "DM Sans", color: "#ffffff", bg: "#16141c", size: 15 };
export type ResolvedPostStyle = Required<Omit<PostStyle, "fx">> & { fx?: PostFx };

const HEX = /^#[0-9a-f]{6}$/i;
/** Only what the database accepts (same rules as clean_post_style). */
export function cleanPostStyle(s?: PostStyle | null): PostStyle {
  const out: PostStyle = {};
  if (s?.font && /^[A-Za-z0-9 ]{1,40}$/.test(s.font)) out.font = s.font;
  if (s?.color && HEX.test(s.color)) out.color = s.color;
  if (s?.bg && HEX.test(s.bg)) out.bg = s.bg;
  if (s?.size === 12 || s?.size === 15 || s?.size === 18) out.size = s.size;
  if (s?.fx && (POST_FX as readonly string[]).includes(s.fx)) out.fx = s.fx;
  return out;
}
/** A post's look: its own style, else what the author's card suggests, else defaults. */
export function resolvePostStyle(s: PostStyle | null | undefined, author?: Pick<PostAuthor, "bg" | "nameColor">): ResolvedPostStyle {
  const c = cleanPostStyle(s);
  const bg = c.bg ?? (author?.bg && HEX.test(author.bg) ? author.bg : DEFAULT_POST_STYLE.bg);
  const color = c.color ?? (author?.nameColor && HEX.test(author.nameColor) ? author.nameColor : DEFAULT_POST_STYLE.color);
  return {
    font: c.font ?? DEFAULT_POST_STYLE.font,
    // Contraste automático: text that would not read on its bubble turns black or white.
    color: readableOn(color, bg),
    bg,
    size: c.size ?? DEFAULT_POST_STYLE.size,
    ...(c.fx ? { fx: c.fx } : {}),
  };
}

// ── Contrast (WCAG relative luminance) ───────────────────────────────────────
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) return 21;
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** The color itself when it reads on `bg` (≥ 3:1), else black or white — whichever reads better. */
export function readableOn(color: string, bg: string): string {
  if (contrast(color, bg) >= 3) return color;
  return contrast("#ffffff", bg) >= contrast("#111114", bg) ? "#ffffff" : "#111114";
}
/** A bubble that melts into the wall gets a thin outline. */
export function bubbleNeedsEdge(bubble: string, wall: string): boolean {
  return contrast(bubble, wall) < 1.35;
}
export function postFontFamily(font: string): string { return getFontStyle(font); }
export function sameStyle(a: PostStyle, b: PostStyle): boolean {
  const x = cleanPostStyle(a), y = cleanPostStyle(b);
  return x.font === y.font && x.color === y.color && x.bg === y.bg && x.size === y.size && x.fx === y.fx;
}
/** Readable text on a color (for icons over a post's bubble). */
export function inkOn(hex: string): string {
  if (!HEX.test(hex)) return "#fff";
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111114" : "#ffffff";
}
export function postLength(s: string): number { return Array.from(s.trim()).length; }

/** Error code from post_wall → what the person reads (short). */
export function wallError(msg: string | undefined): string {
  if (!msg) return "No se pudo enviar.";
  if (msg.includes("too_fast")) return "Más despacio: probá en un ratito.";
  if (msg.includes("comments_off")) return "Este muro está cerrado.";
  if (msg.includes("blocked")) return "No podés escribir en este muro.";
  if (msg.includes("not_signed_in")) return "Iniciá sesión para escribir.";
  if (msg.includes("bad_length")) return `Hasta ${POST_MAX} caracteres.`;
  return "No se pudo enviar.";
}

// ── The wall's look (the back of the card) ───────────────────────────────────
import type { CardEffects, ProfileCardData } from "@/types";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { cardBaseColor } from "@/lib/cardColors";
import { COMMENTS_DEFAULTS, COMMENTS_RADIUS } from "@/lib/comments";

export type WallBgMode = "card" | "own";
export type WallFxMode = "card" | "none" | "own";
export interface WallLook {
  bgMode: WallBgMode; fxMode: WallFxMode;
  /** The back's background color (for contrast: texts and bubbles). */
  bg: string; bgImage: string | null;
  radius: number; color: string; accent: string; font: string;
}
/** The wall's fixed size (design px): the same for every card, small or wide. */
export const WALL_W = 380;
export const WALL_H = 600;

const toHex = (c: unknown): string | null => {
  if (typeof c !== "string") return null;
  if (HEX.test(c)) return c;
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?/i.exec(c);
  if (!m) return null;
  // A see-through card (glass, 5 % white…) says nothing about a solid wall.
  if (m[4] !== undefined && parseFloat(m[4]) < 0.5) return null;
  return "#" + [m[1], m[2], m[3]].map(v => Math.max(0, Math.min(255, +v)).toString(16).padStart(2, "0")).join("");
};
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const httpImg = (v: unknown) => (typeof v === "string" && /^https?:\/\//.test(v) ? v : null);

/** The modes, also reading what the first wall (2026-11-25) stored. */
export function wallModes(card: ProfileCardData): { bgMode: WallBgMode; fxMode: WallFxMode } {
  const s = card.commentsBox;
  return {
    bgMode: s?.bgMode ?? (s?.bg || s?.bgImage ? "own" : "card"),
    fxMode: s?.fxMode ?? (s?.fx === false ? "none" : "card"),
  };
}

/** The back's own background (wallEffects), with the first wall's fields underneath. */
export function wallOwnBg(card: ProfileCardData): Pick<CardEffects, "bg" | "gradient"> {
  const own = card.wallEffects, s = card.commentsBox;
  return {
    bg: { ...(s?.bg ? { color: s.bg } : {}), ...(s?.bgImage ? { image: s.bgImage, imageMode: "cover" as const } : {}),
      ...(typeof s?.opacity === "number" ? { opacity: s.opacity } : {}), ...own?.bg },
    gradient: own?.gradient,
  };
}

/** What the back renders: the card's effects, none, or its own — and the card's background or its own. */
export function wallBackEffects(card: ProfileCardData, o: { lite?: boolean } = {}): CardEffects {
  const { bgMode, fxMode } = wallModes(card);
  const cardFx = getProfileCardEffects(card);
  const { bg: _b, gradient: _g, entrance: _e, ...ownRest } = card.wallEffects ?? {};
  const base: CardEffects = fxMode === "card" ? { ...cardFx } : fxMode === "own" ? { ...ownRest } : { border: { width: 0 } };
  const bgPart = bgMode === "own" ? wallOwnBg(card) : { bg: cardFx.bg, gradient: cardFx.gradient };
  const look = resolveWallLook(card);
  // Phones (lite): the same look without the heavy layers (holo, glitter,
  // strass, dust, aura, retro, motion, floating, tilt) — iPhones reload the
  // page when a second full set of them is drawn next to the card.
  const kept: CardEffects = o.lite
    ? { border: base.border, shadow: base.shadow, glow: base.glow ? { ...base.glow, animation: undefined } : undefined, edge: base.edge }
    : base;
  return {
    ...kept,
    bg: { ...bgPart.bg, ...(bgPart.bg?.image ? { imageMode: "cover" as const } : {}), ...(o.lite ? { blur: 0, glass: false } : {}) },
    gradient: bgPart.gradient,
    border: { ...kept.border, radius: look.radius },
    entrance: undefined,
  };
}

/** The owner's choices first, else what the card itself looks like. */
export function resolveWallLook(card: ProfileCardData): WallLook {
  const s = card.commentsBox;
  const { bgMode, fxMode } = wallModes(card);
  const fx = getProfileCardEffects(card);
  const bgSrc = bgMode === "own" ? wallOwnBg(card) : { bg: fx.bg, gradient: fx.gradient };
  const gradFirst = bgSrc.gradient?.from;
  const cardRad = typeof fx.border?.radius === "number" ? fx.border.radius : card.borderRadius;
  return {
    bgMode, fxMode,
    font: s?.font && /^[A-Za-z0-9 ]{1,40}$/.test(s.font) ? s.font : "DM Sans",
    bg: toHex(bgSrc.bg?.color) ?? toHex(gradFirst) ?? (bgMode === "card" ? toHex(fx.bg?.color) : null) ?? COMMENTS_DEFAULTS.bg,
    bgImage: httpImg(bgSrc.bg?.image),
    radius: clampN(typeof s?.radius === "number" ? s.radius : typeof cardRad === "number" ? cardRad : COMMENTS_DEFAULTS.radius, COMMENTS_RADIUS.min, COMMENTS_RADIUS.max),
    color: (s?.color && HEX.test(s.color) ? s.color : null) ?? toHex(cardBaseColor(card, fx)) ?? COMMENTS_DEFAULTS.color,
    accent: (s?.accent && HEX.test(s.accent) ? s.accent : null) ?? COMMENTS_DEFAULTS.accent,
  };
}
export const wallShown = (card?: ProfileCardData | null): boolean => !!card && !card.commentsBox?.hidden;
