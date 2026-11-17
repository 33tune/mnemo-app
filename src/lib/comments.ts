/**
 * Comentarios (2026-11-17) — PURE: limits, the panel's resolved look and the
 * "hace 3 h" label. The data lives in Supabase (`comments`, see
 * supabase/migrations/20261117000000_comments.sql).
 */
import type { CommentsBoxStyle } from "@/types";

export const COMMENT_MAX = 150;
export const COMMENTS_PAGE = 30;

export interface CommentItem {
  id: string;
  authorId: string;
  body: string;
  ownerLiked: boolean;
  createdAt: string;
  handle: string;
  name: string;
  photo: string | null;
  pfpRadius: string;
}

export const COMMENTS_OPACITY = { min: 0.3, max: 1 } as const;
export const COMMENTS_RADIUS = { min: 0, max: 32 } as const;
export const COMMENTS_DEFAULTS = { bg: "#121216", opacity: 0.86, radius: 20, color: "#f4f2f7", accent: "#ff4d6d" } as const;

export interface ResolvedCommentsBox { bg: string; opacity: number; radius: number; color: string; accent: string }

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Every default applied; only 6-digit hex reaches the CSS. */
export function resolveCommentsBox(s?: CommentsBoxStyle): ResolvedCommentsBox {
  const hex = (v: string | undefined, d: string) => (v && HEX.test(v) ? v : d);
  return {
    bg: hex(s?.bg, COMMENTS_DEFAULTS.bg),
    opacity: clamp(typeof s?.opacity === "number" ? s.opacity : COMMENTS_DEFAULTS.opacity, COMMENTS_OPACITY.min, COMMENTS_OPACITY.max),
    radius: clamp(typeof s?.radius === "number" ? s.radius : COMMENTS_DEFAULTS.radius, COMMENTS_RADIUS.min, COMMENTS_RADIUS.max),
    color: hex(s?.color, COMMENTS_DEFAULTS.color),
    accent: hex(s?.accent, COMMENTS_DEFAULTS.accent),
  };
}

/** "#rrggbb" + alpha → rgba(). */
export function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(a * 1000) / 1000})`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return "recién";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  if (d < 365) return `${Math.floor(d / 7)} sem`;
  return `${Math.floor(d / 365)} a`;
}

/** Error code from post_comment → what the person reads. */
export function commentError(msg: string | undefined): string {
  if (!msg) return "No se pudo enviar.";
  if (msg.includes("too_fast")) return "Más despacio: probá en un ratito.";
  if (msg.includes("comments_off")) return "Los comentarios están apagados.";
  if (msg.includes("not_signed_in")) return "Iniciá sesión para comentar.";
  if (msg.includes("bad_length")) return `Hasta ${COMMENT_MAX} caracteres.`;
  return "No se pudo enviar.";
}
