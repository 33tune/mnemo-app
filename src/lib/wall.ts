/**
 * Muro (2026-11-25) — PURE: post shape, the per-post style (font, colors, size),
 * limits and messages. Data: `comments` + `comment_likes` (supabase/migrations/
 * 20261125000000_wall.sql). A post lives on someone's wall (the back of their
 * card) and carries the style its AUTHOR picked when writing it.
 */
import { CANVAS_FONTS, getFontStyle } from "@/lib/fontList";

export const POST_MAX = 280;
export const WALL_PAGE = 20;

export interface PostStyle { font?: string; color?: string; bg?: string; size?: 12 | 15 | 18 }
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
}
export interface ActivityItem { kind: "wall" | "reply" | "like"; postId: string; wallHandle: string; body: string; at: string; actor: PostAuthor }

/** Fonts offered when writing (a short, legible set; any card font is accepted). */
export const POST_FONTS = ["DM Sans", "Poppins", "Space Mono", "Playfair Display", "Comic Sans MS", "Dancing Script", "Bebas Neue", "Pacifico", "Courier New", "Impact", "Great Vibes", "Quicksand"]
  .filter(k => CANVAS_FONTS.some(f => f.key === k));
export const POST_COLORS = ["#ffffff", "#111114", "#ff4f94", "#ff3b30", "#ff9f0a", "#ffd60a", "#c6ff3a", "#34c759", "#5ac8fa", "#3d5afe", "#af52de", "#8e8e93"];
export const POST_BGS = ["#16141c", "#000000", "#ffffff", "#ffe1ee", "#3a0a1a", "#3b0000", "#3a2600", "#13300f", "#0a2a3a", "#0d1440", "#2a0a3a", "#2c2c2e"];
export const POST_SIZES = [12, 15, 18] as const;
export const DEFAULT_POST_STYLE: Required<PostStyle> = { font: "DM Sans", color: "#ffffff", bg: "#16141c", size: 15 };

const HEX = /^#[0-9a-f]{6}$/i;
/** Only what the database accepts (same rules as clean_post_style). */
export function cleanPostStyle(s?: PostStyle | null): PostStyle {
  const out: PostStyle = {};
  if (s?.font && /^[A-Za-z0-9 ]{1,40}$/.test(s.font)) out.font = s.font;
  if (s?.color && HEX.test(s.color)) out.color = s.color;
  if (s?.bg && HEX.test(s.bg)) out.bg = s.bg;
  if (s?.size === 12 || s?.size === 15 || s?.size === 18) out.size = s.size;
  return out;
}
/** A post's look: its own style, else what the author's card suggests, else defaults. */
export function resolvePostStyle(s: PostStyle | null | undefined, author?: Pick<PostAuthor, "bg" | "nameColor">): Required<PostStyle> {
  const c = cleanPostStyle(s);
  return {
    font: c.font ?? DEFAULT_POST_STYLE.font,
    color: c.color ?? (author?.nameColor && HEX.test(author.nameColor) ? author.nameColor : DEFAULT_POST_STYLE.color),
    bg: c.bg ?? (author?.bg && HEX.test(author.bg) ? author.bg : DEFAULT_POST_STYLE.bg),
    size: c.size ?? DEFAULT_POST_STYLE.size,
  };
}
export function postFontFamily(font: string): string { return getFontStyle(font); }
export function sameStyle(a: PostStyle, b: PostStyle): boolean {
  const x = cleanPostStyle(a), y = cleanPostStyle(b);
  return x.font === y.font && x.color === y.color && x.bg === y.bg && x.size === y.size;
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
import type { ProfileCardData } from "@/types";
import { getProfileCardEffects } from "@/lib/profileCardEffects";
import { cardBaseColor } from "@/lib/cardColors";
import { COMMENTS_DEFAULTS, COMMENTS_OPACITY, COMMENTS_RADIUS } from "@/lib/comments";

export interface WallLook { bg: string; opacity: number; radius: number; color: string; accent: string; bgImage: string | null }

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

/** The owner's choices (card.commentsBox) first, else what the card itself looks like. */
export function resolveWallLook(card: ProfileCardData): WallLook {
  const s = card.commentsBox;
  const fx = getProfileCardEffects(card);
  const cardBg = toHex(fx.bg?.color);
  const cardRad = typeof fx.border?.radius === "number" ? fx.border.radius : card.borderRadius;
  const img = typeof fx.bg?.image === "string" && /^https?:\/\//.test(fx.bg.image) ? fx.bg.image : null;
  return {
    bg: (s?.bg && HEX.test(s.bg) ? s.bg : null) ?? cardBg ?? COMMENTS_DEFAULTS.bg,
    opacity: clampN(typeof s?.opacity === "number" ? s.opacity : 0.94, COMMENTS_OPACITY.min, COMMENTS_OPACITY.max),
    radius: clampN(typeof s?.radius === "number" ? s.radius : typeof cardRad === "number" ? cardRad : COMMENTS_DEFAULTS.radius, COMMENTS_RADIUS.min, COMMENTS_RADIUS.max),
    color: (s?.color && HEX.test(s.color) ? s.color : null) ?? toHex(cardBaseColor(card, fx)) ?? COMMENTS_DEFAULTS.color,
    accent: (s?.accent && HEX.test(s.accent) ? s.accent : null) ?? COMMENTS_DEFAULTS.accent,
    bgImage: s?.bg ? null : img,
  };
}
export const wallShown = (card?: ProfileCardData | null): boolean => !!card && !card.commentsBox?.hidden;
